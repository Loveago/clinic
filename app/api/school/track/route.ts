import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const ref = searchParams.get('ref');

    if (!ref) {
      return NextResponse.json({ error: 'Reference number is required' }, { status: 400 });
    }

    const application = await prisma.application.findUnique({
      where: { referenceNumber: ref.trim().toUpperCase() },
      include: {
        programme: true,
        admissionPeriod: true,
        payments: {
          select: {
            id: true,
            reference: true,
            title: true,
            amount: true,
            currency: true,
            status: true,
            receiptNumber: true,
            createdAt: true,
          },
        },
        documents: {
          select: {
            id: true,
            title: true,
            category: true,
            fileType: true,
            verificationStatus: true,
            notes: true,
            uploadedAt: true,
          },
          orderBy: { uploadedAt: 'desc' },
        },
        reviews: {
          select: {
            id: true,
            previousStatus: true,
            newStatus: true,
            action: true,
            reason: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'asc' },
        },
        offer: true,
      },
    });

    if (!application) {
      return NextResponse.json(
        { error: 'Application reference not found. Please check and try again.' },
        { status: 404 }
      );
    }

    // Never expose private internal reviewNotes on the public tracker
    const { reviewNotes: _hiddenNotes, assignedReviewerId: _hiddenId, ...publicApplication } = application;

    return NextResponse.json({ application: publicApplication });
  } catch (error) {
    console.error('Track lookup error:', error);
    return NextResponse.json({ error: 'Failed to look up application' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { referenceNumber, applicantEmail, action, fileUrl, fileName, fileType, fileSize, title } = body;

    if (!referenceNumber) {
      return NextResponse.json({ error: 'Reference number is required' }, { status: 400 });
    }

    const app = await prisma.application.findUnique({
      where: { referenceNumber: String(referenceNumber).trim().toUpperCase() },
      include: { offer: true, programme: true },
    });

    if (!app) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    if (applicantEmail && app.applicantEmail.toLowerCase() !== String(applicantEmail).trim().toLowerCase()) {
      return NextResponse.json({ error: 'Email verification failed for this reference number.' }, { status: 403 });
    }

    if (action === 'accept_offer' || action === 'decline_offer') {
      if (!app.offer) {
        return NextResponse.json({ error: 'No admission offer has been issued yet.' }, { status: 400 });
      }
      if (app.offer.status === 'ACCEPTED' && action === 'accept_offer') {
        return NextResponse.json({ offer: app.offer, status: app.status });
      }

      const nextOfferStatus = action === 'accept_offer' ? 'ACCEPTED' : 'DECLINED';
      const nextAppStatus = action === 'accept_offer' ? 'ADMISSION_ACCEPTED' : 'REJECTED';

      const result = await prisma.$transaction(async (tx) => {
        const offer = await tx.admissionOffer.update({
          where: { id: app.offer!.id },
          data: { status: nextOfferStatus, respondedAt: new Date() },
        });
        const updatedApp = await tx.application.update({
          where: { id: app.id },
          data: { status: nextAppStatus },
        });
        await tx.applicationReview.create({
          data: {
            applicationId: app.id,
            previousStatus: app.status,
            newStatus: nextAppStatus,
            reviewerName: app.applicantName,
            action: 'STATUS_CHANGE',
            reason:
              action === 'accept_offer'
                ? `Applicant accepted admission offer (${offer.admissionReference}).`
                : `Applicant declined admission offer (${offer.admissionReference}).`,
          },
        });
        return { offer, updatedApp };
      });

      return NextResponse.json({
        success: true,
        offer: result.offer,
        status: result.updatedApp.status,
      });
    }

    if (action === 'upload_document') {
      if (!fileUrl || !title) {
        return NextResponse.json({ error: 'Document title and uploaded file URL are required.' }, { status: 400 });
      }
      const doc = await prisma.$transaction(async (tx) => {
        const created = await tx.applicationDocument.create({
          data: {
            applicationId: app.id,
            title,
            category: 'REQUESTED',
            fileUrl,
            fileName: fileName || null,
            fileType: fileType || 'PDF',
            fileSize: fileSize ? Number(fileSize) : null,
            verificationStatus: 'PENDING',
          },
        });
        if (app.status === 'AWAITING_DOCUMENTS') {
          await tx.application.update({
            where: { id: app.id },
            data: { status: 'UNDER_REVIEW' },
          });
          await tx.applicationReview.create({
            data: {
              applicationId: app.id,
              previousStatus: 'AWAITING_DOCUMENTS',
              newStatus: 'UNDER_REVIEW',
              reviewerName: app.applicantName,
              action: 'STATUS_CHANGE',
              reason: `Applicant uploaded requested document: ${title}`,
            },
          });
        }
        return created;
      });
      return NextResponse.json({ success: true, document: doc });
    }

    return NextResponse.json({ error: 'Unsupported applicant action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Action failed' }, { status: 500 });
  }
}
