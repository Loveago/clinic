import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { authorizeRole, REGISTRAR_ROLES, SCHOOL_STAFF_ROLES } from '@/lib/portal-auth';
import { generateNextStudentId, recordAuditLog } from '@/lib/school-admin';

export async function GET(req: NextRequest) {
  try {
    const auth = await authorizeRole([...SCHOOL_STAFF_ROLES, 'LECTURER']);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 403 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const programmeId = searchParams.get('programmeId');
    const academicYear = searchParams.get('academicYear');
    const semester = searchParams.get('semester');
    const level = searchParams.get('level');
    const status = searchParams.get('status');
    const feeStatus = searchParams.get('feeStatus');
    const page = Math.max(1, Number(searchParams.get('page') || 1));
    const limit = Number(searchParams.get('limit') || 0);

    const where: any = {};
    if (programmeId) where.programmeId = programmeId;
    if (academicYear) where.academicYear = academicYear;
    if (semester) where.currentSemester = semester;
    if (level) where.level = level;
    if (status) where.status = status;

    if (search) {
      where.OR = [
        { studentId: { contains: search } },
        { user: { name: { contains: search } } },
        { user: { email: { contains: search } } },
        { user: { phone: { contains: search } } },
      ];
    }

    const allStudents = await prisma.student.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true, phone: true, avatar: true } },
        programme: { select: { id: true, name: true, code: true, fee: true } },
        cohort: true,
        invoices: true,
        registrations: { include: { course: true } },
      },
      orderBy: { admissionDate: 'desc' },
    });

    const filtered = allStudents.filter((s) => {
      if (!feeStatus) return true;
      const totalBalance = s.invoices
        .filter((i) => i.status !== 'CANCELLED')
        .reduce((sum, i) => sum + i.balance, 0);
      if (feeStatus === 'OWING') return totalBalance > 0;
      if (feeStatus === 'CLEARED') return s.invoices.length > 0 && totalBalance <= 0;
      if (feeStatus === 'NONE') return s.invoices.length === 0;
      return true;
    });

    const total = filtered.length;
    const students =
      limit > 0 ? filtered.slice((page - 1) * limit, page * limit) : filtered;

    return NextResponse.json({
      students,
      pagination: {
        total,
        page,
        limit: limit || total,
        totalPages: limit > 0 ? Math.max(1, Math.ceil(total / limit)) : 1,
      },
    });
  } catch (error: any) {
    console.error('Fetch students error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch students' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authorizeRole(REGISTRAR_ROLES);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 403 });
    }

    const body = await req.json();
    const {
      name,
      email,
      phone,
      programmeId,
      cohortId,
      studyTrack = '12_MONTH',
      level = 'Level 100',
      academicYear = '2025/2026',
      currentSemester = 'First Semester',
      dateOfBirth,
      gender,
      nationality = 'Ghanaian',
      residentialAddress,
      ghanaPostGps,
      emergencyContact,
      emergencyPhone,
    } = body;

    if (!name || !email || !programmeId) {
      return NextResponse.json({ error: 'Name, email, and programme are required' }, { status: 400 });
    }

    const emailNorm = String(email).trim().toLowerCase();
    const existingUser = await prisma.user.findUnique({ where: { email: emailNorm } });
    if (existingUser) {
      return NextResponse.json({ error: 'A user with this email already exists' }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash('student123', 10);
    const prog = await prisma.programme.findUnique({ where: { id: programmeId } });

    const student = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: String(name).trim(),
          email: emailNorm,
          phone: phone || '+233 24 000 0000',
          role: 'STUDENT',
          passwordHash,
        },
      });

      const studentId = await generateNextStudentId(tx);
      const created = await tx.student.create({
        data: {
          userId: user.id,
          studentId,
          programmeId,
          cohortId: cohortId || null,
          studyTrack: studyTrack === '6_MONTH' ? '6_MONTH' : '12_MONTH',
          level,
          academicYear,
          currentSemester,
          status: 'ACTIVE',
          dateOfBirth: dateOfBirth || null,
          gender: gender || null,
          nationality,
          residentialAddress: residentialAddress || null,
          ghanaPostGps: ghanaPostGps || null,
          emergencyContact: emergencyContact || null,
          emergencyPhone: emergencyPhone || phone || null,
          registrationCompletedAt: new Date(),
        },
        include: { user: true, programme: true, cohort: true },
      });

      await tx.studentStatusHistory.create({
        data: {
          studentId: created.id,
          previousStatus: null,
          newStatus: 'ACTIVE',
          reason: 'Direct student registration by Registrar',
          changedBy: auth.name || 'Registrar',
        },
      });

      if (prog) {
        await tx.invoice.create({
          data: {
            invoiceNumber: `INV-GH-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 89999)}`,
            studentId: created.id,
            title: `${level} ${currentSemester} Tuition - ${prog.name}`,
            amount: prog.fee,
            balance: prog.fee,
            academicYear,
            semester: currentSemester,
            dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
            status: 'ISSUED',
          },
        });
      }

      return created;
    });

    await recordAuditLog({
      actorId: auth.userId,
      actorName: auth.name || 'Registrar',
      actorRole: auth.role || 'REGISTRAR',
      action: 'CREATE_STUDENT',
      entityType: 'Student',
      entityId: student.id,
      details: { studentId: student.studentId, programmeId },
    });

    return NextResponse.json({ student }, { status: 201 });
  } catch (error: any) {
    console.error('Create student error:', error);
    return NextResponse.json({ error: error.message || 'Failed to create student' }, { status: 500 });
  }
}
