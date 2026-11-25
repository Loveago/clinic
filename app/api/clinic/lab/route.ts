import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  authorizeClinicStaff,
  CLINIC_ADMIN_ROLES,
  CLINIC_CLINICIAN_ROLES,
  CLINIC_LAB_ROLES,
  CLINIC_LAB_REVIEW_ROLES,
  logClinicAudit,
  sendClinicNotification,
} from '@/lib/clinic-auth';

export async function GET(req: NextRequest) {
  try {
    const auth = await authorizeClinicStaff();
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 403 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || undefined;
    const patientId = searchParams.get('patientId') || undefined;

    const [catalog, requests] = await Promise.all([
      prisma.labTestCatalog.findMany({ orderBy: { name: 'asc' } }),
      prisma.labRequest.findMany({
        where: {
          ...(status ? { status } : {}),
          ...(patientId ? { patientId } : {}),
        },
        include: {
          patient: { select: { id: true, patientNumber: true, fullName: true, gender: true, dateOfBirth: true, phone: true } },
          test: true,
          requestedBy: { include: { user: { select: { name: true, title: true } } } },
          consultation: { select: { id: true, consultationNumber: true } },
          result: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 60,
      }),
    ]);

    return NextResponse.json({ catalog, requests });
  } catch (error) {
    console.error('GET clinic lab error:', error);
    return NextResponse.json({ error: 'Failed to load laboratory data' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    if (action === 'create_test') {
      const auth = await authorizeClinicStaff(CLINIC_ADMIN_ROLES);
      if (!auth.authorized) {
        return NextResponse.json({ error: auth.error }, { status: auth.status || 403 });
      }
      const code = String(body.code || '').trim().toUpperCase();
      const name = String(body.name || '').trim();
      if (!code || !name) {
        return NextResponse.json({ error: 'Test code and name are required' }, { status: 400 });
      }
      const test = await prisma.labTestCatalog.create({
        data: {
          code,
          name,
          category: body.category || 'Hematology',
          description: body.description || null,
          priceGHS: Number(body.priceGHS) || 50,
          sampleType: body.sampleType || 'Blood',
          preparationNotes: body.preparationNotes || null,
          turnaroundHours: Number(body.turnaroundHours) || 24,
          referenceRangeText: body.referenceRangeText || null,
          unit: body.unit || null,
        },
      });
      return NextResponse.json({ test }, { status: 201 });
    }

    // Request laboratory test (clinician)
    const auth = await authorizeClinicStaff(CLINIC_CLINICIAN_ROLES);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 403 });
    }

    const { patientId, consultationId, testId, clinicalNotes, priority } = body;
    if (!patientId || !testId) {
      return NextResponse.json({ error: 'patientId and testId are required.' }, { status: 400 });
    }

    const count = await prisma.labRequest.count();
    const requestNumber = `LAB-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    const request = await prisma.labRequest.create({
      data: {
        requestNumber,
        patientId,
        consultationId: consultationId || null,
        testId,
        requestedById: auth.staffProfileId || null,
        clinicalNotes: clinicalNotes || null,
        priority: priority === 'URGENT' ? 'URGENT' : 'ROUTINE',
        status: 'REQUESTED',
      },
      include: { test: true, patient: { select: { id: true, patientNumber: true, fullName: true } } },
    });

    await logClinicAudit({
      actorId: auth.userId,
      actorName: auth.name,
      actorRole: auth.clinicRole,
      action: 'LAB_TEST_REQUESTED',
      entityType: 'LabRequest',
      entityId: request.id,
      details: { requestNumber, patientId, testName: request.test.name },
    });

    return NextResponse.json({ request }, { status: 201 });
  } catch (error) {
    console.error('POST clinic lab error:', error);
    return NextResponse.json({ error: 'Failed to create lab record' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, action } = body;
    if (!id) return NextResponse.json({ error: 'Lab request id is required' }, { status: 400 });

    const existing = await prisma.labRequest.findUnique({
      where: { id },
      include: { test: true, patient: { select: { userId: true, fullName: true } }, result: true },
    });
    if (!existing) return NextResponse.json({ error: 'Lab request not found' }, { status: 404 });

    if (action === 'review_result') {
      const auth = await authorizeClinicStaff(CLINIC_LAB_REVIEW_ROLES);
      if (!auth.authorized) {
        return NextResponse.json(
          { error: 'Forbidden: Only authorized Doctors or Clinic Administrators may review and release lab results.' },
          { status: 403 }
        );
      }
      if (!existing.result) {
        return NextResponse.json({ error: 'No lab result entered yet to review.' }, { status: 400 });
      }

      const [updatedReq] = await prisma.$transaction([
        prisma.labRequest.update({
          where: { id },
          data: {
            status: 'REVIEWED',
            reviewedAt: new Date(),
            reviewedByName: auth.name || 'Reviewer',
          },
          include: { result: true, test: true, patient: { select: { id: true, patientNumber: true, fullName: true } } },
        }),
        prisma.labResult.update({
          where: { labRequestId: id },
          data: {
            reviewedById: auth.userId || null,
            reviewedByName: auth.name || 'Reviewer',
            reviewedAt: new Date(),
            isReleased: body.releaseToPatient !== false,
          },
        }),
      ]);

      await logClinicAudit({
        actorId: auth.userId,
        actorName: auth.name,
        actorRole: auth.clinicRole,
        action: 'LAB_RESULT_REVIEWED',
        entityType: 'LabResult',
        entityId: existing.result.id,
        details: { requestNumber: existing.requestNumber, released: body.releaseToPatient !== false },
      });

      if (existing.patient?.userId && body.releaseToPatient !== false) {
        await sendClinicNotification({
          userId: existing.patient.userId,
          title: 'Laboratory Result Released',
          message: `Your ${existing.test.name} result (${existing.requestNumber}) has been reviewed and released.`,
          type: 'LAB_RESULT',
          link: '/portal/clinic',
          dedupeKey: `lab-release-${id}`,
        });
      }

      return NextResponse.json({ request: updatedReq });
    }

    const auth = await authorizeClinicStaff([...CLINIC_LAB_ROLES, 'NURSE', 'MIDWIFE']);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 403 });
    }

    if (action === 'enter_result') {
      if (existing.status === 'REVIEWED') {
        return NextResponse.json(
          { error: 'Reviewed laboratory results cannot be altered by lab staff.' },
          { status: 403 }
        );
      }
      const resultValue = String(body.resultValue || '').trim();
      if (!resultValue) {
        return NextResponse.json({ error: 'resultValue is required' }, { status: 400 });
      }

      const [updatedReq] = await prisma.$transaction([
        prisma.labRequest.update({
          where: { id },
          data: { status: 'COMPLETED', completedAt: new Date() },
          include: { test: true, patient: { select: { id: true, patientNumber: true, fullName: true } } },
        }),
        prisma.labResult.upsert({
          where: { labRequestId: id },
          update: {
            resultValue,
            unit: body.unit ?? existing.test.unit ?? null,
            referenceRange: body.referenceRange ?? existing.test.referenceRangeText ?? null,
            flag: body.flag || 'NORMAL',
            observations: body.observations || null,
            attachmentUrl: body.attachmentUrl || null,
            enteredById: auth.userId || null,
            enteredByName: auth.name || 'Lab Technician',
            enteredAt: new Date(),
          },
          create: {
            labRequestId: id,
            resultValue,
            unit: body.unit ?? existing.test.unit ?? null,
            referenceRange: body.referenceRange ?? existing.test.referenceRangeText ?? null,
            flag: body.flag || 'NORMAL',
            observations: body.observations || null,
            attachmentUrl: body.attachmentUrl || null,
            enteredById: auth.userId || null,
            enteredByName: auth.name || 'Lab Technician',
          },
        }),
      ]);

      await logClinicAudit({
        actorId: auth.userId,
        actorName: auth.name,
        actorRole: auth.clinicRole,
        action: 'LAB_RESULT_ENTERED',
        entityType: 'LabRequest',
        entityId: id,
        details: { requestNumber: existing.requestNumber, flag: body.flag || 'NORMAL' },
      });

      const refreshed = await prisma.labRequest.findUnique({
        where: { id },
        include: { test: true, result: true, patient: { select: { id: true, patientNumber: true, fullName: true } } },
      });

      return NextResponse.json({ request: refreshed || updatedReq });
    }

    // Workflow status updates
    const nextStatus = String(body.status || '').toUpperCase();
    const validStatuses = ['REQUESTED', 'SAMPLE_COLLECTED', 'PROCESSING', 'CANCELLED'];
    if (!validStatuses.includes(nextStatus)) {
      return NextResponse.json({ error: 'Invalid status transition' }, { status: 400 });
    }

    const updated = await prisma.labRequest.update({
      where: { id },
      data: {
        status: nextStatus,
        ...(nextStatus === 'SAMPLE_COLLECTED'
          ? {
              sampleStatus: 'COLLECTED',
              sampleId: existing.sampleId || `SMP-${existing.requestNumber}`,
              ...(existing.sampleCollectedAt ? {} : { sampleCollectedAt: new Date() }),
            }
          : {}),
      },
      include: { test: true, result: true, patient: { select: { id: true, patientNumber: true, fullName: true, gender: true, dateOfBirth: true, phone: true } } },
    });

    return NextResponse.json({ request: updated });
  } catch (error) {
    console.error('PATCH clinic lab error:', error);
    return NextResponse.json({ error: 'Failed to update laboratory request' }, { status: 500 });
  }
}
