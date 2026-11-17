import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizeRole, REGISTRAR_ROLES, SCHOOL_STAFF_ROLES } from '@/lib/portal-auth';
import { recordAuditLog } from '@/lib/school-admin';

export async function GET() {
  try {
    const auth = await authorizeRole(SCHOOL_STAFF_ROLES);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 403 });
    }

    const [cohorts, programmes, academicYears] = await Promise.all([
      prisma.cohort.findMany({
        include: {
          programme: { select: { id: true, code: true, name: true } },
          _count: { select: { students: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.programme.findMany({ orderBy: { name: 'asc' } }),
      prisma.academicYear.findMany({ include: { semesters: true }, orderBy: { name: 'desc' } }),
    ]);

    return NextResponse.json({ cohorts, programmes, academicYears });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to load cohorts' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authorizeRole(REGISTRAR_ROLES);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 403 });
    }

    const body = await req.json();
    const { name, programmeId, academicYear, semester, level, capacity } = body;

    if (!name || !programmeId || !academicYear) {
      return NextResponse.json(
        { error: 'Cohort name, programme, and academic year are required.' },
        { status: 400 }
      );
    }

    const cohort = await prisma.cohort.create({
      data: {
        name,
        programmeId,
        academicYear,
        semester: semester || 'First Semester',
        level: level || 'Level 100',
        capacity: capacity ? Number(capacity) : null,
      },
      include: { programme: true },
    });

    await recordAuditLog({
      actorId: auth.userId,
      actorName: auth.name || 'Registrar',
      actorRole: auth.role || 'REGISTRAR',
      action: 'CREATE_COHORT',
      entityType: 'Cohort',
      entityId: cohort.id,
      details: { name, programmeId, academicYear },
    });

    return NextResponse.json({ cohort }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to create cohort' }, { status: 500 });
  }
}

