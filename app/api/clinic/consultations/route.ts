import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  authorizeClinicStaff,
  CLINIC_CLINICIAN_ROLES,
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
    const status = searchParams.get('status') || undefined;
    const isClinician =
      CLINIC_CLINICIAN_ROLES.includes(auth.clinicRole || '') ||
      CLINIC_CLINICIAN_ROLES.includes(auth.role || '');

    const consultations = await prisma.consultation.findMany({
      where: {
        ...(patientId ? { patientId } : {}),
        ...(status ? { status } : {}),
      },
      include: {
        patient: {
          select: {
            id: true,
            patientNumber: true,
            fullName: true,
            gender: true,
            dateOfBirth: true,
            phone: true,
            bloodGroup: true,
            allergies: true,
            chronicConditions: true,
            maritalStatus: true,
            occupation: true,
            ghanaCardNumber: true,
            insurances: { include: { provider: true } },
            identifiers: true,
            triageRecords: { orderBy: { triagedAt: 'desc' }, take: 1 },
          },
        },
        staff: { include: { user: { select: { id: true, name: true, title: true } } } },
        vitals: true,
        diagnoses: true,
        prescriptions: { include: { items: true } },
        labRequests: { include: { test: true, result: true } },
        amendments: { orderBy: { createdAt: 'desc' } },
      },
      orderBy: { startedAt: 'desc' },
      take: 50,
    });

    return NextResponse.json({
      consultations: consultations.map((c) => ({
        ...c,
        internalNotes: isClinician ? c.internalNotes : null,
      })),
    });
  } catch (error) {
    console.error('GET clinic consultations error:', error);
    return NextResponse.json({ error: 'Failed to load consultations' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authorizeClinicStaff(CLINIC_CLINICIAN_ROLES);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 403 });
    }

    const body = await req.json();
    const {
      patientId,
      queueId,
      chiefComplaint,
      hpi,
      medicalHistory,
      currentMedications,
      allergies,
      clinicalNotes,
      examFindings,
      treatmentPlan,
      followUpDate,
      followUpNotes,
      internalNotes,
      vitals,
      diagnoses,
      completeNow,
    } = body;

    if (!patientId || !chiefComplaint) {
      return NextResponse.json(
        { error: 'patientId and chiefComplaint are required.' },
        { status: 400 }
      );
    }

    const count = await prisma.consultation.count();
    const consultationNumber = `CNS-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    const bmi = vitals ? calculateBmi(Number(vitals.weightKg), Number(vitals.heightCm)) : null;

    const consultation = await prisma.$transaction(async (tx) => {
      const created = await tx.consultation.create({
        data: {
          consultationNumber,
          patientId,
          queueId: queueId || null,
          staffId: auth.staffProfileId || null,
          chiefComplaint: String(chiefComplaint).trim(),
          hpi: hpi || null,
          medicalHistory: medicalHistory || null,
          currentMedications: currentMedications || null,
          allergies: allergies || null,
          clinicalNotes: clinicalNotes || null,
          examFindings: examFindings || null,
          treatmentPlan: treatmentPlan || null,
          followUpDate: followUpDate || null,
          followUpNotes: followUpNotes || null,
          internalNotes: internalNotes || null,
          status: completeNow ? 'COMPLETED' : 'DRAFT',
          completedAt: completeNow ? new Date() : null,
        },
      });

      if (vitals) {
        await tx.vitalSign.create({
          data: {
            consultationId: created.id,
            bpSystolic: vitals.bpSystolic ? Number(vitals.bpSystolic) : null,
            bpDiastolic: vitals.bpDiastolic ? Number(vitals.bpDiastolic) : null,
            temperatureC: vitals.temperatureC ? Number(vitals.temperatureC) : null,
            pulseBpm: vitals.pulseBpm ? Number(vitals.pulseBpm) : null,
            respiratoryRate: vitals.respiratoryRate ? Number(vitals.respiratoryRate) : null,
            spo2Percent: vitals.spo2Percent ? Number(vitals.spo2Percent) : null,
            weightKg: vitals.weightKg ? Number(vitals.weightKg) : null,
            heightCm: vitals.heightCm ? Number(vitals.heightCm) : null,
            bmi,
            recordedById: auth.userId || null,
          },
        });
      }

      if (Array.isArray(diagnoses) && diagnoses.length > 0) {
        for (const d of diagnoses) {
          if (!d.title) continue;
          await tx.diagnosis.create({
            data: {
              consultationId: created.id,
              patientId,
              catalogId: d.catalogId || null,
              code: d.code || null,
              title: String(d.title).trim(),
              notes: d.notes || null,
              isPrimary: Boolean(d.isPrimary),
            },
          });
        }
      }

      if (queueId) {
        await tx.clinicQueue.update({
          where: { id: queueId },
          data: completeNow
            ? { status: 'COMPLETED', completedAt: new Date() }
            : { status: 'IN_CONSULTATION', startedAt: new Date() },
        });
      }

      return tx.consultation.findUnique({
        where: { id: created.id },
        include: {
          patient: true,
          vitals: true,
          diagnoses: true,
          staff: { include: { user: { select: { name: true, title: true } } } },
        },
      });
    }, { timeout: 20000 });

    await logClinicAudit({
      actorId: auth.userId,
      actorName: auth.name,
      actorRole: auth.clinicRole,
      action: completeNow ? 'CONSULTATION_COMPLETED' : 'CONSULTATION_STARTED',
      entityType: 'Consultation',
      entityId: consultation?.id,
      details: { consultationNumber, patientId },
    });

    return NextResponse.json({ consultation }, { status: 201 });
  } catch (error) {
    console.error('POST clinic consultation error:', error);
    return NextResponse.json({ error: 'Failed to save consultation' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await authorizeClinicStaff(CLINIC_CLINICIAN_ROLES);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 403 });
    }

    const body = await req.json();
    const { id, action, reason, vitals, diagnoses, ...fields } = body;
    if (!id) {
      return NextResponse.json({ error: 'Consultation id is required' }, { status: 400 });
    }

    const existing = await prisma.consultation.findUnique({
      where: { id },
      include: { vitals: true, diagnoses: true },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Consultation not found' }, { status: 404 });
    }

    // Completed consultations cannot be silently overwritten
    if (existing.status === 'COMPLETED' && action !== 'amend') {
      return NextResponse.json(
        {
          error:
            'Completed consultations cannot be silently overwritten. Submit an authorized amendment with action="amend" and a reason.',
        },
        { status: 409 }
      );
    }

    if (action === 'amend' && !String(reason || '').trim()) {
      return NextResponse.json(
        { error: 'An amendment reason is required to amend a completed consultation.' },
        { status: 400 }
      );
    }

    const isCompleting = action === 'complete' || fields.status === 'COMPLETED';
    const nextStatus = existing.status === 'COMPLETED' ? 'COMPLETED' : isCompleting ? 'COMPLETED' : 'DRAFT';

    const updated = await prisma.$transaction(async (tx) => {
      const c = await tx.consultation.update({
        where: { id },
        data: {
          ...(fields.chiefComplaint !== undefined ? { chiefComplaint: fields.chiefComplaint } : {}),
          ...(fields.hpi !== undefined ? { hpi: fields.hpi } : {}),
          ...(fields.medicalHistory !== undefined ? { medicalHistory: fields.medicalHistory } : {}),
          ...(fields.currentMedications !== undefined ? { currentMedications: fields.currentMedications } : {}),
          ...(fields.allergies !== undefined ? { allergies: fields.allergies } : {}),
          ...(fields.clinicalNotes !== undefined ? { clinicalNotes: fields.clinicalNotes } : {}),
          ...(fields.examFindings !== undefined ? { examFindings: fields.examFindings } : {}),
          ...(fields.treatmentPlan !== undefined ? { treatmentPlan: fields.treatmentPlan } : {}),
          ...(fields.followUpDate !== undefined ? { followUpDate: fields.followUpDate } : {}),
          ...(fields.followUpNotes !== undefined ? { followUpNotes: fields.followUpNotes } : {}),
          ...(fields.internalNotes !== undefined ? { internalNotes: fields.internalNotes } : {}),
          status: nextStatus,
          ...(isCompleting && !existing.completedAt ? { completedAt: new Date() } : {}),
        },
      });

      if (vitals) {
        const bmi = calculateBmi(Number(vitals.weightKg), Number(vitals.heightCm));
        await tx.vitalSign.upsert({
          where: { consultationId: id },
          update: {
            bpSystolic: vitals.bpSystolic !== undefined ? Number(vitals.bpSystolic) : undefined,
            bpDiastolic: vitals.bpDiastolic !== undefined ? Number(vitals.bpDiastolic) : undefined,
            temperatureC: vitals.temperatureC !== undefined ? Number(vitals.temperatureC) : undefined,
            pulseBpm: vitals.pulseBpm !== undefined ? Number(vitals.pulseBpm) : undefined,
            respiratoryRate: vitals.respiratoryRate !== undefined ? Number(vitals.respiratoryRate) : undefined,
            spo2Percent: vitals.spo2Percent !== undefined ? Number(vitals.spo2Percent) : undefined,
            weightKg: vitals.weightKg !== undefined ? Number(vitals.weightKg) : undefined,
            heightCm: vitals.heightCm !== undefined ? Number(vitals.heightCm) : undefined,
            bmi,
          },
          create: {
            consultationId: id,
            bpSystolic: vitals.bpSystolic ? Number(vitals.bpSystolic) : null,
            bpDiastolic: vitals.bpDiastolic ? Number(vitals.bpDiastolic) : null,
            temperatureC: vitals.temperatureC ? Number(vitals.temperatureC) : null,
            pulseBpm: vitals.pulseBpm ? Number(vitals.pulseBpm) : null,
            respiratoryRate: vitals.respiratoryRate ? Number(vitals.respiratoryRate) : null,
            spo2Percent: vitals.spo2Percent ? Number(vitals.spo2Percent) : null,
            weightKg: vitals.weightKg ? Number(vitals.weightKg) : null,
            heightCm: vitals.heightCm ? Number(vitals.heightCm) : null,
            bmi,
            recordedById: auth.userId || null,
          },
        });
      }

      if (Array.isArray(diagnoses)) {
        for (const d of diagnoses) {
          if (!d.title) continue;
          await tx.diagnosis.create({
            data: {
              consultationId: id,
              patientId: existing.patientId,
              catalogId: d.catalogId || null,
              code: d.code || null,
              title: String(d.title).trim(),
              notes: d.notes || null,
              isPrimary: Boolean(d.isPrimary),
            },
          });
        }
      }

      if (action === 'amend') {
        await tx.consultationAmendment.create({
          data: {
            consultationId: id,
            amendedById: auth.userId || 'system',
            amendedByName: auth.name || 'Clinician',
            reason: String(reason).trim(),
            changesJson: JSON.stringify({ fields, vitals, diagnoses }),
          },
        });
      }

      if (isCompleting && existing.queueId) {
        await tx.clinicQueue.update({
          where: { id: existing.queueId },
          data: { status: 'COMPLETED', completedAt: new Date() },
        });
      }

      return tx.consultation.findUnique({
        where: { id },
        include: {
          patient: true,
          vitals: true,
          diagnoses: true,
          amendments: { orderBy: { createdAt: 'desc' } },
          prescriptions: { include: { items: true } },
          labRequests: { include: { test: true, result: true } },
        },
      });
    }, { timeout: 20000 });

    await logClinicAudit({
      actorId: auth.userId,
      actorName: auth.name,
      actorRole: auth.clinicRole,
      action: action === 'amend' ? 'CONSULTATION_AMENDED' : isCompleting ? 'CONSULTATION_COMPLETED' : 'CONSULTATION_UPDATED',
      entityType: 'Consultation',
      entityId: id,
      details: { reason: reason || null, status: nextStatus },
    });

    return NextResponse.json({ consultation: updated });
  } catch (error) {
    console.error('PATCH clinic consultation error:', error);
    return NextResponse.json({ error: 'Failed to update consultation' }, { status: 500 });
  }
}
