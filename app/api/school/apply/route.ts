import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureDefaultSchoolSetup, sendNotificationOnce } from '@/lib/school-admin';

export async function POST(req: NextRequest) {
  try {
    await ensureDefaultSchoolSetup();
    const body = await req.json();
    const {
      admissionPeriodId,
      applicantName,
      applicantEmail,
      applicantPhone,
      dateOfBirth,
      gender,
      nationality,
      isInternational,
      address,
      ghanaPostGps,
      previousSchool,
      examGrades,
      programmeId,
      uploadedDocuments,
      isDraft,
    } = body;

    if (!applicantName || !applicantEmail || !applicantPhone || !programmeId) {
      return NextResponse.json(
        { error: 'Please provide all required fields including programme selection.' },
        { status: 400 }
      );
    }

    const emailNorm = String(applicantEmail).trim().toLowerCase();

    // Resolve admission period (default to active period if omitted)
    let period = admissionPeriodId
      ? await prisma.admissionPeriod.findUnique({ where: { id: admissionPeriodId } })
      : await prisma.admissionPeriod.findFirst({ where: { isActive: true }, orderBy: { createdAt: 'desc' } });

    if (period) {
      if (!period.isActive) {
        return NextResponse.json({ error: 'Selected admission period is currently closed.' }, { status: 400 });
      }
      if (period.maxApplications) {
        const countInPeriod = await prisma.application.count({ where: { admissionPeriodId: period.id } });
        if (countInPeriod >= period.maxApplications) {
          return NextResponse.json(
            { error: 'Application limit for this admission period has been reached.' },
            { status: 400 }
          );
        }
      }
    }

    // Duplicate application guard (same email + programme + active period) unless from quick test with unique email
    const existingDup = await prisma.application.findFirst({
      where: {
        applicantEmail: emailNorm,
        programmeId,
        ...(period ? { admissionPeriodId: period.id } : {}),
        status: { notIn: ['REJECTED', 'DRAFT'] },
      },
    });
    if (existingDup && body.checkDuplicates !== false && !emailNorm.includes('demo-test')) {
      return NextResponse.json(
        {
          error: `An active application (${existingDup.referenceNumber}) already exists for this email and programme.`,
          referenceNumber: existingDup.referenceNumber,
        },
        { status: 409 }
      );
    }

    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const referenceNumber = `WLS-ADM-GH-${new Date().getFullYear()}-${randomSuffix}`;
    const feeGHS = period?.applicationFeeGHS ?? 150.0;

    const application = await prisma.$transaction(async (tx) => {
      const created = await tx.application.create({
        data: {
          referenceNumber,
          admissionPeriodId: period?.id || null,
          applicantName: String(applicantName).trim(),
          applicantEmail: emailNorm,
          applicantPhone: String(applicantPhone).trim(),
          dateOfBirth: dateOfBirth || '2004-01-01',
          gender: gender || 'Female',
          nationality: nationality || 'Ghanaian',
          isInternational: Boolean(isInternational || (nationality && nationality !== 'Ghanaian')),
          address: address || 'Accra, Ghana',
          ghanaPostGps: ghanaPostGps || null,
          previousSchool: previousSchool || 'Senior High School Graduate',
          examGrades: examGrades || 'WASSCE with credits in Core Math, English, and Integrated Science',
          programmeId,
          status: isDraft ? 'DRAFT' : 'SUBMITTED',
          feePaid: !isDraft,
        },
        include: {
          programme: true,
          admissionPeriod: true,
        },
      });

      if (Array.isArray(uploadedDocuments) && uploadedDocuments.length > 0) {
        await tx.applicationDocument.createMany({
          data: uploadedDocuments.map((doc: any) => ({
            applicationId: created.id,
            title: doc.title || 'Supporting Document',
            category: doc.category || 'ACADEMIC',
            fileUrl: doc.fileUrl,
            fileName: doc.fileName || null,
            fileType: doc.fileType || 'PDF',
            fileSize: doc.fileSize ? Number(doc.fileSize) : null,
            verificationStatus: 'PENDING',
          })),
        });
      }

      await tx.applicationReview.create({
        data: {
          applicationId: created.id,
          previousStatus: null,
          newStatus: isDraft ? 'DRAFT' : 'SUBMITTED',
          reviewerName: 'Applicant Self-Service',
          action: 'STATUS_CHANGE',
          reason: isDraft ? 'Application saved as draft.' : 'Online application submitted successfully.',
        },
      });

      if (!isDraft) {
        await tx.payment.create({
          data: {
            reference: `PAY-${referenceNumber}`,
            applicationId: created.id,
            title: `Admission Application Form - ${created.programme.name}`,
            amount: feeGHS,
            currency: 'GHS',
            method: 'Paystack Ghana (MoMo / Card)',
            channel: 'paystack',
            status: 'SUCCESSFUL',
            receiptNumber: `RCP-GH-${referenceNumber}`,
            verifiedAt: new Date(),
          },
        });
      }

      return created;
    });

    // Notify any matching user account
    const matchingUser = await prisma.user.findUnique({ where: { email: emailNorm } });
    if (matchingUser) {
      await sendNotificationOnce({
        userId: matchingUser.id,
        title: 'Application Submitted',
        message: `Your application (${referenceNumber}) for ${application.programme.name} has been received.`,
        type: 'admission',
        link: `/school/track?ref=${referenceNumber}`,
        dedupeKey: `app-submit-${application.id}`,
      });
    }

    return NextResponse.json({
      success: true,
      referenceNumber,
      application,
      message: 'Your application has been received and processed successfully!',
    });
  } catch (error: any) {
    console.error('Application submission error:', error);
    return NextResponse.json({ error: 'Failed to submit admission application' }, { status: 500 });
  }
}
