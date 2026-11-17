import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizeRole, REGISTRAR_ROLES, SCHOOL_STAFF_ROLES } from '@/lib/portal-auth';
import { recordAuditLog } from '@/lib/school-admin';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await authorizeRole([...SCHOOL_STAFF_ROLES, 'LECTURER']);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 403 });
    }

    const { id } = await params;

    const student = await prisma.student.findUnique({
      where: { id },
      include: {
        user: true,
        programme: { include: { department: true } },
        cohort: true,
        guardians: true,
        statusHistory: { orderBy: { createdAt: 'desc' } },
        documents: { orderBy: { uploadedAt: 'desc' } },
        registrations: {
          include: {
            course: {
              include: { lecturer: { select: { name: true, email: true } } },
            },
          },
        },
        attendanceRecords: {
          include: { session: { include: { course: true } } },
        },
        caResults: { include: { course: true } },
        invoices: {
          include: { payments: true, items: true },
          orderBy: { createdAt: 'desc' },
        },
        payments: { orderBy: { createdAt: 'desc' } },
        discounts: { orderBy: { createdAt: 'desc' } },
        paymentPlans: { include: { installments: true } },
        supportTickets: true,
        assignments: {
          include: { assignment: { include: { course: true } } },
        },
      },
    });

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    return NextResponse.json({ student });
  } catch (error: any) {
    console.error('Student detail error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await authorizeRole(REGISTRAR_ROLES);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const {
      action,
      reason,
      status,
      level,
      currentSemester,
      academicYear,
      programmeId,
      cohortId,
      dateOfBirth,
      gender,
      nationality,
      residentialAddress,
      ghanaPostGps,
      emergencyContact,
      emergencyPhone,
      cgpa,
      name,
      phone,
      guardian,
      guardianId,
      document,
      documentId,
      verificationStatus,
      checklist,
    } = body;

    const existing = await prisma.student.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    if (action === 'add_guardian' && guardian) {
      const created = await prisma.studentGuardian.create({
        data: {
          studentId: id,
          name: guardian.name,
          relationship: guardian.relationship || 'Parent / Guardian',
          phone: guardian.phone,
          email: guardian.email || null,
          address: guardian.address || null,
          isEmergency: guardian.isEmergency !== false,
        },
      });
      return NextResponse.json({ status: true, guardian: created });
    }

    if (action === 'remove_guardian' && guardianId) {
      await prisma.studentGuardian.delete({ where: { id: guardianId } });
      return NextResponse.json({ status: true });
    }

    if (action === 'upload_document' && document) {
      const created = await prisma.studentDocument.create({
        data: {
          studentId: id,
          title: document.title,
          category: document.category || 'ACADEMIC',
          fileUrl: document.fileUrl,
          fileType: document.fileType || 'PDF',
          expiryDate: document.expiryDate || null,
          verificationStatus: 'PENDING',
        },
      });
      return NextResponse.json({ status: true, document: created });
    }

    if (action === 'verify_document' && documentId) {
      const updated = await prisma.studentDocument.update({
        where: { id: documentId },
        data: {
          verificationStatus: verificationStatus || 'VERIFIED',
          verifiedBy: auth.name || 'Registrar',
          verifiedAt: new Date(),
          notes: reason || null,
        },
      });
      return NextResponse.json({ status: true, document: updated });
    }

    if (action === 'update_checklist' && Array.isArray(checklist)) {
      const allRequiredDone = checklist.every((c: any) => !c.required || c.completed);
      const updated = await prisma.student.update({
        where: { id },
        data: {
          registrationChecklistJson: JSON.stringify(checklist),
          registrationCompletedAt: allRequiredDone ? new Date() : null,
        },
      });
      return NextResponse.json({ status: true, student: updated });
    }

    const studentUpdateData: any = {};
    if (status !== undefined) studentUpdateData.status = status;
    if (level !== undefined) studentUpdateData.level = level;
    if (currentSemester !== undefined) studentUpdateData.currentSemester = currentSemester;
    if (academicYear !== undefined) studentUpdateData.academicYear = academicYear;
    if (programmeId !== undefined) studentUpdateData.programmeId = programmeId;
    if (cohortId !== undefined) studentUpdateData.cohortId = cohortId || null;
    if (dateOfBirth !== undefined) studentUpdateData.dateOfBirth = dateOfBirth;
    if (gender !== undefined) studentUpdateData.gender = gender;
    if (nationality !== undefined) studentUpdateData.nationality = nationality;
    if (residentialAddress !== undefined) studentUpdateData.residentialAddress = residentialAddress;
    if (ghanaPostGps !== undefined) studentUpdateData.ghanaPostGps = ghanaPostGps;
    if (emergencyContact !== undefined) studentUpdateData.emergencyContact = emergencyContact;
    if (emergencyPhone !== undefined) studentUpdateData.emergencyPhone = emergencyPhone;
    if (cgpa !== undefined) studentUpdateData.cgpa = Number(cgpa);

    const student = await prisma.$transaction(async (tx) => {
      const updated = await tx.student.update({
        where: { id },
        data: studentUpdateData,
        include: { user: true, programme: true, cohort: true },
      });

      if (name || phone) {
        await tx.user.update({
          where: { id: updated.userId },
          data: {
            ...(name ? { name } : {}),
            ...(phone ? { phone } : {}),
          },
        });
      }

      if (status && status !== existing.status) {
        await tx.studentStatusHistory.create({
          data: {
            studentId: id,
            previousStatus: existing.status,
            newStatus: status,
            reason: reason || `Status updated to ${status}`,
            changedBy: auth.name || 'Registrar',
          },
        });
      } else if (programmeId && programmeId !== existing.programmeId) {
        await tx.studentStatusHistory.create({
          data: {
            studentId: id,
            previousStatus: existing.status,
            newStatus: existing.status,
            reason: reason || 'Academic programme transfer',
            changedBy: auth.name || 'Registrar',
          },
        });
      } else if (level && level !== existing.level) {
        await tx.studentStatusHistory.create({
          data: {
            studentId: id,
            previousStatus: existing.status,
            newStatus: existing.status,
            reason: reason || `Level updated from ${existing.level} to ${level}`,
            changedBy: auth.name || 'Registrar',
          },
        });
      }

      return updated;
    });

    await recordAuditLog({
      actorId: auth.userId,
      actorName: auth.name || 'Registrar',
      actorRole: auth.role || 'REGISTRAR',
      action: 'UPDATE_STUDENT_RECORD',
      entityType: 'Student',
      entityId: id,
      details: { status, level, programmeId, reason },
    });

    return NextResponse.json({ status: true, student });
  } catch (error: any) {
    console.error('Update student error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
