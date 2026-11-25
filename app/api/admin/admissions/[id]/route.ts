import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { authorizeRole, ADMISSIONS_ROLES, REGISTRAR_ROLES } from '@/lib/portal-auth';
import {
  DEFAULT_REGISTRATION_CHECKLIST,
  generateNextStudentId,
  recordAuditLog,
  sendNotificationOnce,
} from '@/lib/school-admin';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await authorizeRole([...new Set([...ADMISSIONS_ROLES, ...REGISTRAR_ROLES])]);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 403 });
    }

    const { id } = await params;
    const application = await prisma.application.findUnique({
      where: { id },
      include: {
        programme: true,
        admissionPeriod: true,
        payments: true,
        documents: { orderBy: { uploadedAt: 'desc' } },
        reviews: { orderBy: { createdAt: 'desc' } },
        offer: true,
      },
    });

    if (!application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    return NextResponse.json({ application });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const {
      action,
      status,
      reviewNotes,
      reason,
      internalNote,
      reviewerId,
      reviewerName,
      documentId,
      verificationStatus,
      requestedDocTitle,
      conditions,
      acceptanceDeadline,
      convertToStudent,
      cohortId,
      level,
      generateInvoice,
    } = body;

    const requiredRoles =
      action === 'enrol_student' || convertToStudent || status === 'ENROLLED' || status === 'REGISTERED'
        ? [...new Set([...ADMISSIONS_ROLES, ...REGISTRAR_ROLES])]
        : ADMISSIONS_ROLES;

    const auth = await authorizeRole(requiredRoles);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 403 });
    }

    const application = await prisma.application.findUnique({
      where: { id },
      include: { programme: true, admissionPeriod: true, documents: true, offer: true },
    });

    if (!application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    // 1. Verify / reject a single uploaded document
    if (action === 'verify_document' && documentId) {
      const updatedDoc = await prisma.applicationDocument.update({
        where: { id: documentId },
        data: {
          verificationStatus: verificationStatus || 'VERIFIED',
          verifiedBy: auth.name || 'Admissions Officer',
          notes: reason || null,
        },
      });
      await prisma.applicationReview.create({
        data: {
          applicationId: id,
          previousStatus: application.status,
          newStatus: application.status,
          reviewerId: auth.userId || null,
          reviewerName: auth.name || 'Admissions Officer',
          action: 'VERIFY_DOCUMENT',
          reason: `Document "${updatedDoc.title}" marked ${updatedDoc.verificationStatus}`,
        },
      });
      return NextResponse.json({ document: updatedDoc });
    }

    // 2. Request additional documents
    if (action === 'request_documents') {
      await prisma.$transaction(async (tx) => {
        await tx.application.update({
          where: { id },
          data: { status: 'AWAITING_DOCUMENTS' },
        });
        await tx.applicationReview.create({
          data: {
            applicationId: id,
            previousStatus: application.status,
            newStatus: 'AWAITING_DOCUMENTS',
            reviewerId: auth.userId || null,
            reviewerName: auth.name || 'Admissions Officer',
            action: 'REQUEST_DOCUMENTS',
            reason: requestedDocTitle
              ? `Requested additional document: ${requestedDocTitle}. ${reason || ''}`.trim()
              : reason || 'Additional supporting documents requested.',
            internalNote: internalNote || null,
          },
        });
      });

      const user = await prisma.user.findUnique({ where: { email: application.applicantEmail.toLowerCase() } });
      if (user) {
        await sendNotificationOnce({
          userId: user.id,
          title: 'Additional Documents Requested',
          message: `Please upload ${requestedDocTitle || 'the requested documents'} for application ${application.referenceNumber}.`,
          type: 'admission',
          link: `/school/track?ref=${application.referenceNumber}`,
        });
      }

      const refreshed = await prisma.application.findUnique({
        where: { id },
        include: { programme: true, documents: true, reviews: { orderBy: { createdAt: 'desc' } }, offer: true },
      });
      return NextResponse.json({ application: refreshed });
    }

    // 3. Assign reviewer or add internal note
    if (action === 'assign_reviewer' || action === 'add_note') {
      await prisma.$transaction(async (tx) => {
        if (action === 'assign_reviewer') {
          await tx.application.update({
            where: { id },
            data: {
              assignedReviewerId: reviewerId || auth.userId || null,
              assignedReviewerName: reviewerName || auth.name || 'Admissions Officer',
            },
          });
        }
        if (reviewNotes !== undefined) {
          await tx.application.update({
            where: { id },
            data: { reviewNotes },
          });
        }
        await tx.applicationReview.create({
          data: {
            applicationId: id,
            previousStatus: application.status,
            newStatus: application.status,
            reviewerId: auth.userId || null,
            reviewerName: auth.name || 'Admissions Officer',
            action: action === 'assign_reviewer' ? 'ASSIGN_REVIEWER' : 'NOTE',
            reason:
              action === 'assign_reviewer'
                ? `Assigned reviewer: ${reviewerName || auth.name}`
                : 'Internal review note added',
            internalNote: internalNote || reviewNotes || null,
          },
        });
      });

      const refreshed = await prisma.application.findUnique({
        where: { id },
        include: { programme: true, documents: true, reviews: { orderBy: { createdAt: 'desc' } }, offer: true },
      });
      return NextResponse.json({ application: refreshed });
    }

    // 4. Issue Admission Offer / Accept Application (Phase 4)
    if (action === 'issue_offer' || status === 'ACCEPTED' || status === 'APPROVED') {
      const year = new Date().getFullYear();
      const admissionRef =
        application.offer?.admissionReference ||
        `ADM-OFF-${year}-${Math.floor(1000 + Math.random() * 9000)}`;
      const deadline =
        acceptanceDeadline ||
        new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

      const nextStatus = status === 'APPROVED' ? 'APPROVED' : 'ACCEPTED';

      await prisma.$transaction(async (tx) => {
        await tx.application.update({
          where: { id },
          data: {
            status: nextStatus,
            decisionDate: new Date(),
            admissionLetter: `/school/offer/${application.referenceNumber}`,
            ...(reviewNotes ? { reviewNotes } : {}),
          },
        });

        await tx.admissionOffer.upsert({
          where: { applicationId: id },
          update: {
            conditions: conditions || 'Satisfactory verification of original WASSCE/academic certificates and medical fitness.',
            acceptanceDeadline: deadline,
            status: 'ISSUED',
            issuedBy: auth.name || 'Admissions Officer',
          },
          create: {
            applicationId: id,
            admissionReference: admissionRef,
            programmeId: application.programmeId,
            academicYear: application.admissionPeriod?.academicYear || '2025/2026',
            semester: application.admissionPeriod?.semester || 'First Semester',
            conditions: conditions || 'Satisfactory verification of original WASSCE/academic certificates and medical fitness.',
            acceptanceDeadline: deadline,
            status: 'ISSUED',
            issuedBy: auth.name || 'Admissions Officer',
          },
        });

        await tx.applicationReview.create({
          data: {
            applicationId: id,
            previousStatus: application.status,
            newStatus: nextStatus,
            reviewerId: auth.userId || null,
            reviewerName: auth.name || 'Admissions Officer',
            action: 'STATUS_CHANGE',
            reason: reason || `Admission offer issued (${admissionRef}).`,
            internalNote: internalNote || null,
          },
        });
      });

      const user = await prisma.user.findUnique({ where: { email: application.applicantEmail.toLowerCase() } });
      if (user) {
        await sendNotificationOnce({
          userId: user.id,
          title: 'Admission Offer Issued',
          message: `Congratulations! An admission offer (${admissionRef}) has been issued for ${application.programme.name}.`,
          type: 'admission',
          link: `/school/offer/${application.referenceNumber}`,
          dedupeKey: `offer-issued-${id}-${admissionRef}`,
        });
      }

      await recordAuditLog({
        actorId: auth.userId,
        actorName: auth.name || 'Admissions Officer',
        actorRole: auth.role || 'ADMISSIONS_OFFICER',
        action: 'ISSUE_ADMISSION_OFFER',
        entityType: 'Application',
        entityId: id,
        details: { admissionRef, nextStatus },
      });

      const refreshed = await prisma.application.findUnique({
        where: { id },
        include: { programme: true, documents: true, reviews: { orderBy: { createdAt: 'desc' } }, offer: true },
      });
      return NextResponse.json({ application: refreshed });
    }

    // 5. Enrol / Register Student from Accepted Offer (Phase 5)
    if (action === 'enrol_student' || convertToStudent || status === 'ENROLLED' || status === 'REGISTERED') {
      const targetAppStatus = status === 'ENROLLED' ? 'ENROLLED' : 'REGISTERED';
      const result = await prisma.$transaction(async (tx) => {
        const emailNorm = application.applicantEmail.trim().toLowerCase();
        let existingUser = await tx.user.findUnique({ where: { email: emailNorm } });
        let userId = existingUser?.id;

        if (!existingUser) {
          const passwordHash = await bcrypt.hash('student123', 10);
          const createdUser = await tx.user.create({
            data: {
              email: emailNorm,
              name: application.applicantName,
              phone: application.applicantPhone,
              role: 'STUDENT',
              passwordHash,
            },
          });
          userId = createdUser.id;
        }

        let student = await tx.student.findUnique({ where: { userId: userId! } });
        if (!student) {
          const generatedStudentId = await generateNextStudentId(tx);
          const checklist = DEFAULT_REGISTRATION_CHECKLIST.map((item) => ({
            ...item,
            completed: true,
            completedAt: new Date().toISOString(),
          }));

          student = await tx.student.create({
            data: {
              studentId: generatedStudentId,
              userId: userId!,
              programmeId: application.programmeId,
              studyTrack: application.studyTrack || '12_MONTH',
              cohortId: cohortId || null,
              level: level || 'Level 100',
              academicYear: application.admissionPeriod?.academicYear || '2025/2026',
              currentSemester: application.admissionPeriod?.semester || 'First Semester',
              status: 'ACTIVE',
              admissionReference: application.offer?.admissionReference || application.referenceNumber,
              dateOfBirth: application.dateOfBirth,
              gender: application.gender,
              nationality: application.nationality,
              residentialAddress: application.address,
              ghanaPostGps: application.ghanaPostGps,
              emergencyPhone: application.applicantPhone,
              emergencyContact: application.applicantPhone,
              registrationChecklistJson: JSON.stringify(checklist),
              registrationCompletedAt: new Date(),
            },
          });

          await tx.studentStatusHistory.create({
            data: {
              studentId: student.id,
              previousStatus: 'ADMITTED',
              newStatus: 'ACTIVE',
              reason: `Enrolled from admission application ${application.referenceNumber}`,
              changedBy: auth.name || 'Registrar',
            },
          });

          if (application.documents.length > 0) {
            await tx.studentDocument.createMany({
              data: application.documents.map((doc) => ({
                studentId: student!.id,
                title: doc.title,
                category: doc.category,
                fileUrl: doc.fileUrl,
                fileType: doc.fileType,
                verificationStatus: doc.verificationStatus,
                verifiedBy: doc.verifiedBy,
              })),
            });
          }

          if (generateInvoice !== false) {
            const invNum = `INV-GH-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 89999)}`;
            await tx.invoice.create({
              data: {
                invoiceNumber: invNum,
                studentId: student.id,
                title: `${level || 'Level 100'} ${application.admissionPeriod?.semester || 'First Semester'} Tuition - ${application.programme.name}`,
                amount: application.programme.fee,
                balance: application.programme.fee,
                academicYear: application.admissionPeriod?.academicYear || '2025/2026',
                semester: application.admissionPeriod?.semester || 'First Semester',
                dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
                status: 'ISSUED',
              },
            });
          }
        }

        const updatedApp = await tx.application.update({
          where: { id },
          data: { status: targetAppStatus, decisionDate: new Date() },
          include: { programme: true, offer: true, documents: true, reviews: { orderBy: { createdAt: 'desc' } } },
        });

        if (application.offer) {
          await tx.admissionOffer.update({
            where: { id: application.offer.id },
            data: { status: 'ACCEPTED', studentId: student.id, respondedAt: application.offer.respondedAt || new Date() },
          });
        }

        await tx.applicationReview.create({
          data: {
            applicationId: id,
            previousStatus: application.status,
            newStatus: targetAppStatus,
            reviewerId: auth.userId || null,
            reviewerName: auth.name || 'Registrar',
            action: 'STATUS_CHANGE',
            reason: `Applicant registered as Student (${student.studentId}).`,
          },
        });

        return { updatedApp, student, userId: userId! };
      }, { timeout: 20000 });

      await sendNotificationOnce({
        userId: result.userId,
        title: 'Student Enrolment Complete',
        message: `Welcome to Action Health! Your Student ID is ${result.student.studentId}.`,
        type: 'admission',
        link: '/portal/student/dashboard',
        dedupeKey: `enrolled-${result.student.id}`,
      });

      await recordAuditLog({
        actorId: auth.userId,
        actorName: auth.name || 'Registrar',
        actorRole: auth.role || 'REGISTRAR',
        action: 'ENROL_STUDENT',
        entityType: 'Student',
        entityId: result.student.id,
        details: { studentId: result.student.studentId, applicationId: id },
      });

      return NextResponse.json({
        application: result.updatedApp,
        student: result.student,
      });
    }

    // 6. Standard status transition (UNDER_REVIEW, WAITLISTED, REJECTED, etc.)
    const nextStatus = status || application.status;
    await prisma.$transaction(async (tx) => {
      await tx.application.update({
        where: { id },
        data: {
          status: nextStatus,
          ...(reviewNotes !== undefined ? { reviewNotes } : {}),
          decisionDate: new Date(),
        },
      });
      await tx.applicationReview.create({
        data: {
          applicationId: id,
          previousStatus: application.status,
          newStatus: nextStatus,
          reviewerId: auth.userId || null,
          reviewerName: auth.name || 'Admissions Officer',
          action: 'STATUS_CHANGE',
          reason: reason || `Status updated to ${nextStatus}`,
          internalNote: internalNote || null,
        },
      });
    });

    await recordAuditLog({
      actorId: auth.userId,
      actorName: auth.name || 'Admissions Officer',
      actorRole: auth.role || 'ADMISSIONS_OFFICER',
      action: 'UPDATE_APPLICATION_STATUS',
      entityType: 'Application',
      entityId: id,
      details: { previousStatus: application.status, newStatus: nextStatus, reason },
    });

    const refreshed = await prisma.application.findUnique({
      where: { id },
      include: { programme: true, documents: true, reviews: { orderBy: { createdAt: 'desc' } }, offer: true },
    });
    return NextResponse.json({ application: refreshed });
  } catch (error: any) {
    console.error('Application PATCH error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
