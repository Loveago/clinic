import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  authorizeClinicStaff,
  CLINIC_NURSING_ROLES,
  calculateBmi,
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

    const [triageRecords, nursingNotes, medicationAdmins] = await Promise.all([
      prisma.triageRecord.findMany({
        where: patientId ? { patientId } : {},
        include: {
          patient: { select: { id: true, patientNumber: true, fullName: true, gender: true, dateOfBirth: true } },
          queue: { select: { id: true, queueNumber: true, status: true, stage: true, priority: true } },
        },
        orderBy: { triagedAt: 'desc' },
        take: 60,
      }),
      prisma.nursingNote.findMany({
        where: patientId ? { patientId } : {},
        include: {
          patient: { select: { id: true, patientNumber: true, fullName: true } },
        },
        orderBy: { recordedAt: 'desc' },
        take: 60,
      }),
      prisma.medicationAdministration.findMany({
        where: patientId ? { patientId } : {},
        include: {
          patient: { select: { id: true, patientNumber: true, fullName: true } },
        },
        orderBy: { administeredAt: 'desc' },
        take: 60,
      }),
    ]);

    return NextResponse.json({ triageRecords, nursingNotes, medicationAdmins });
  } catch (error) {
    console.error('GET clinic triage error:', error);
    return NextResponse.json({ error: 'Failed to load triage & nursing records' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authorizeClinicStaff(CLINIC_NURSING_ROLES);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 403 });
    }

    const body = await req.json();
    const { action, patientId } = body;
    if (!patientId) {
      return NextResponse.json({ error: 'patientId is required' }, { status: 400 });
    }

    if (action === 'record_triage') {
      const weightKg = body.weightKg ? Number(body.weightKg) : null;
      const heightCm = body.heightCm ? Number(body.heightCm) : null;
      const bmi = calculateBmi(weightKg, heightCm);

      const triage = await prisma.$transaction(async (tx) => {
        const created = await tx.triageRecord.create({
          data: {
            patientId,
            visitId: body.visitId || null,
            queueId: body.queueId || null,
            triageCategory: body.triageCategory || 'NON_URGENT',
            chiefComplaint: String(body.chiefComplaint || 'General assessment').trim(),
            presentingSymptoms: body.presentingSymptoms || null,
            painScore: body.painScore !== undefined && body.painScore !== '' ? Number(body.painScore) : null,
            bpSystolic: body.bpSystolic ? Number(body.bpSystolic) : null,
            bpDiastolic: body.bpDiastolic ? Number(body.bpDiastolic) : null,
            temperatureC: body.temperatureC ? Number(body.temperatureC) : null,
            pulseBpm: body.pulseBpm ? Number(body.pulseBpm) : null,
            respiratoryRate: body.respiratoryRate ? Number(body.respiratoryRate) : null,
            spo2Percent: body.spo2Percent ? Number(body.spo2Percent) : null,
            weightKg,
            heightCm,
            bmi,
            bloodGlucose: body.bloodGlucose ? Number(body.bloodGlucose) : null,
            allergiesReviewed: Boolean(body.allergiesReviewed),
            riskFlags: body.riskFlags || null,
            notes: body.notes || null,
            nurseId: auth.staffProfileId || null,
            nurseName: auth.name || 'Triage Nurse',
          },
          include: {
            patient: { select: { id: true, patientNumber: true, fullName: true } },
          },
        });

        if (body.queueId) {
          const priorityMap: Record<string, string> = {
            EMERGENCY: 'EMERGENCY',
            URGENT: 'URGENT',
            SEMI_URGENT: 'NORMAL',
            NON_URGENT: 'NORMAL',
          };
          await tx.clinicQueue.update({
            where: { id: body.queueId },
            data: {
              stage: 'CONSULTATION',
              priority: priorityMap[created.triageCategory] || 'NORMAL',
            },
          });
        }

        return created;
      });

      await logClinicAudit({
        actorId: auth.userId,
        actorName: auth.name,
        actorRole: auth.clinicRole,
        action: 'TRIAGE_RECORDED',
        entityType: 'TriageRecord',
        entityId: triage.id,
        details: { patientId, triageCategory: triage.triageCategory, bmi },
      });

      return NextResponse.json({ triage }, { status: 201 });
    }

    if (action === 'add_nursing_note') {
      if (!body.content || !String(body.content).trim()) {
        return NextResponse.json({ error: 'Nursing note content is required' }, { status: 400 });
      }
      const note = await prisma.nursingNote.create({
        data: {
          patientId,
          visitId: body.visitId || null,
          noteType: body.noteType || 'OBSERVATION',
          content: String(body.content).trim(),
          nurseId: auth.staffProfileId || null,
          nurseName: auth.name || 'Nurse',
        },
      });
      await logClinicAudit({
        actorId: auth.userId,
        actorName: auth.name,
        actorRole: auth.clinicRole,
        action: 'NURSING_NOTE_CREATED',
        entityType: 'NursingNote',
        entityId: note.id,
        details: { patientId, noteType: note.noteType },
      });
      return NextResponse.json({ note }, { status: 201 });
    }

    if (action === 'record_mar') {
      const mar = await prisma.medicationAdministration.create({
        data: {
          patientId,
          visitId: body.visitId || null,
          prescriptionItemId: body.prescriptionItemId || null,
          medicationName: String(body.medicationName || '').trim(),
          dose: String(body.dose || '').trim(),
          route: body.route || 'Oral',
          administeredQty: Math.max(1, Number(body.administeredQty) || 1),
          status: body.status || 'ADMINISTERED',
          omissionReason: body.omissionReason || null,
          administeredById: auth.userId || null,
          administeredByName: auth.name || 'Nurse',
        },
      });
      return NextResponse.json({ mar }, { status: 201 });
    }

    return NextResponse.json({ error: 'Unsupported triage/nursing action' }, { status: 400 });
  } catch (error) {
    console.error('POST clinic triage error:', error);
    return NextResponse.json({ error: 'Failed to save triage/nursing record' }, { status: 500 });
  }
}
