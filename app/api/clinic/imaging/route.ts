import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  authorizeClinicStaff,
  CLINIC_ADMIN_ROLES,
  CLINIC_CLINICIAN_ROLES,
  CLINIC_IMAGING_ROLES,
  CLINIC_LAB_REVIEW_ROLES,
  logClinicAudit,
} from '@/lib/clinic-auth';

export async function GET(req: NextRequest) {
  try {
    const auth = await authorizeClinicStaff();
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 403 });
    }

    const { searchParams } = new URL(req.url);
    const patientId = searchParams.get('patientId') || undefined;
    const status = searchParams.get('status') || undefined;

    const [catalog, requests] = await Promise.all([
      prisma.imagingCatalog.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } }),
      prisma.imagingRequest.findMany({
        where: {
          ...(patientId ? { patientId } : {}),
          ...(status ? { status } : {}),
        },
        include: {
          patient: { select: { id: true, patientNumber: true, fullName: true } },
          imaging: true,
          result: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 60,
      }),
    ]);

    return NextResponse.json({ catalog, requests });
  } catch (error) {
    console.error('GET clinic imaging error:', error);
    return NextResponse.json({ error: 'Failed to load imaging records' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    if (action === 'create_catalog') {
      const auth = await authorizeClinicStaff(CLINIC_ADMIN_ROLES);
      if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: auth.status || 403 });

      const item = await prisma.imagingCatalog.create({
        data: {
          code: String(body.code || '').trim().toUpperCase(),
          name: String(body.name || '').trim(),
          modality: body.modality || 'X-Ray',
          description: body.description || null,
          preparationNotes: body.preparationNotes || null,
          priceGHS: Math.max(0, Number(body.priceGHS) || 120),
          turnaroundHours: Math.max(1, Number(body.turnaroundHours) || 24),
        },
      });
      return NextResponse.json({ item }, { status: 201 });
    }

    if (action === 'create_request') {
      const auth = await authorizeClinicStaff(CLINIC_CLINICIAN_ROLES);
      if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: auth.status || 403 });

      const count = await prisma.imagingRequest.count();
      const requestNumber = `IMG-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

      const request = await prisma.imagingRequest.create({
        data: {
          requestNumber,
          patientId: body.patientId,
          consultationId: body.consultationId || null,
          imagingId: body.imagingId,
          clinicalNotes: body.clinicalNotes || null,
          priority: body.priority || 'ROUTINE',
          orderedByName: auth.name || 'Clinician',
        },
        include: {
          patient: { select: { id: true, patientNumber: true, fullName: true } },
          imaging: true,
        },
      });

      await logClinicAudit({
        actorId: auth.userId,
        actorName: auth.name,
        actorRole: auth.clinicRole,
        action: 'IMAGING_REQUESTED',
        entityType: 'ImagingRequest',
        entityId: request.id,
        details: { requestNumber, patientId: body.patientId },
      });

      return NextResponse.json({ request }, { status: 201 });
    }

    if (action === 'enter_result') {
      const auth = await authorizeClinicStaff(CLINIC_IMAGING_ROLES);
      if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: auth.status || 403 });

      const result = await prisma.$transaction(async (tx) => {
        const res = await tx.imagingResult.upsert({
          where: { imagingRequestId: body.imagingRequestId },
          update: {
            findings: String(body.findings || '').trim(),
            impression: body.impression || null,
            attachmentUrl: body.attachmentUrl || null,
            reportedByName: auth.name || 'Radiology Staff',
          },
          create: {
            imagingRequestId: body.imagingRequestId,
            findings: String(body.findings || '').trim(),
            impression: body.impression || null,
            attachmentUrl: body.attachmentUrl || null,
            reportedByName: auth.name || 'Radiology Staff',
          },
        });
        await tx.imagingRequest.update({
          where: { id: body.imagingRequestId },
          data: { status: 'COMPLETED' },
        });
        return res;
      });
      return NextResponse.json({ result });
    }

    if (action === 'review_result') {
      const auth = await authorizeClinicStaff(CLINIC_LAB_REVIEW_ROLES);
      if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: auth.status || 403 });

      const result = await prisma.$transaction(async (tx) => {
        const res = await tx.imagingResult.update({
          where: { imagingRequestId: body.imagingRequestId },
          data: {
            isReleased: true,
            reviewedByName: auth.name || 'Doctor',
            reviewedAt: new Date(),
          },
        });
        await tx.imagingRequest.update({
          where: { id: body.imagingRequestId },
          data: { status: 'REVIEWED' },
        });
        return res;
      });
      return NextResponse.json({ result });
    }

    return NextResponse.json({ error: 'Unsupported imaging action' }, { status: 400 });
  } catch (error) {
    console.error('POST clinic imaging error:', error);
    return NextResponse.json({ error: 'Failed to process imaging action' }, { status: 500 });
  }
}
