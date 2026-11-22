import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  authorizeClinicStaff,
  CLINIC_ADMIN_ROLES,
  CLINIC_CLINICIAN_ROLES,
  CLINIC_RECEPTION_ROLES,
  logClinicAudit,
} from '@/lib/clinic-auth';

export async function GET(req: NextRequest) {
  try {
    const auth = await authorizeClinicStaff();
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 403 });
    }

    const { searchParams } = new URL(req.url);
    const patientId = searchParams.get('patientId');
    if (!patientId) {
      return NextResponse.json({ error: 'patientId is required' }, { status: 400 });
    }

    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      include: {
        identifiers: { orderBy: { createdAt: 'desc' } },
        allergyRecords: { orderBy: { recordedAt: 'desc' } },
        medicalHistoryRecords: { orderBy: { createdAt: 'desc' } },
        medicationHistory: { orderBy: { createdAt: 'desc' } },
        immunizations: { orderBy: { administeredDate: 'desc' } },
        consents: { orderBy: { consentDate: 'desc' } },
        insurances: { include: { provider: true }, orderBy: { createdAt: 'desc' } },
        insuranceClaims: { include: { provider: true, items: true }, orderBy: { createdAt: 'desc' } },
        visits: {
          include: { department: true, staff: { include: { user: { select: { name: true, title: true } } } } },
          orderBy: { checkInAt: 'desc' },
          take: 30,
        },
        appointments: {
          include: { service: true, department: true, staff: { include: { user: { select: { name: true, title: true } } } } },
          orderBy: { preferredDate: 'desc' },
          take: 30,
        },
        queueEntries: {
          include: { department: true },
          orderBy: { checkedInAt: 'desc' },
          take: 20,
        },
        triageRecords: { orderBy: { triagedAt: 'desc' }, take: 20 },
        nursingNotes: { orderBy: { recordedAt: 'desc' }, take: 30 },
        medicationAdmins: { orderBy: { administeredAt: 'desc' }, take: 30 },
        consultations: {
          include: {
            vitals: true,
            diagnoses: true,
            prescriptions: { include: { items: true } },
            labRequests: { include: { test: true, result: true } },
            amendments: true,
            staff: { include: { user: { select: { name: true, title: true } } } },
          },
          orderBy: { startedAt: 'desc' },
          take: 30,
        },
        diagnoses: { orderBy: { diagnosedAt: 'desc' }, take: 40 },
        prescriptions: {
          include: {
            items: { include: { medicine: true, dispensingRecords: true } },
            staff: { include: { user: { select: { name: true, title: true } } } },
          },
          orderBy: { issuedAt: 'desc' },
          take: 30,
        },
        labRequests: {
          include: { test: true, result: true },
          orderBy: { createdAt: 'desc' },
          take: 30,
        },
        imagingRequests: {
          include: { imaging: true, result: true },
          orderBy: { createdAt: 'desc' },
          take: 30,
        },
        procedureRecords: {
          include: { procedure: true },
          orderBy: { procedureDate: 'desc' },
          take: 30,
        },
        referrals: { orderBy: { createdAt: 'desc' }, take: 20 },
        inpatientAdmissions: {
          include: { ward: true, bed: true },
          orderBy: { admittedAt: 'desc' },
          take: 15,
        },
        invoices: {
          include: { items: true, payments: true, refunds: true },
          orderBy: { createdAt: 'desc' },
          take: 30,
        },
        documents: { orderBy: { createdAt: 'desc' }, take: 30 },
      },
    });

    if (!patient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    // Build chronological clinical timeline
    const timeline: Array<{
      id: string;
      date: string;
      type: string;
      title: string;
      subtitle: string;
      status?: string;
    }> = [
      {
        id: `reg-${patient.id}`,
        date: patient.createdAt.toISOString(),
        type: 'REGISTRATION',
        title: `Patient Registered (${patient.patientNumber})`,
        subtitle: `${patient.fullName} • ${patient.gender}`,
        status: patient.status,
      },
      ...patient.visits.map((v) => ({
        id: `visit-${v.id}`,
        date: v.checkInAt.toISOString(),
        type: 'VISIT',
        title: `${v.visitType} Visit (${v.visitNumber})`,
        subtitle: v.department?.name || 'General Clinic',
        status: v.status,
      })),
      ...patient.triageRecords.map((t) => ({
        id: `triage-${t.id}`,
        date: t.triagedAt.toISOString(),
        type: 'TRIAGE',
        title: `Triage: ${t.triageCategory}`,
        subtitle: `${t.chiefComplaint}${t.bpSystolic ? ` • BP ${t.bpSystolic}/${t.bpDiastolic}` : ''}`,
      })),
      ...patient.consultations.map((c) => ({
        id: `consult-${c.id}`,
        date: c.startedAt.toISOString(),
        type: 'CONSULTATION',
        title: `${c.encounterType} Encounter (${c.consultationNumber})`,
        subtitle: `${c.chiefComplaint}${c.staff?.user?.name ? ` • ${c.staff.user.name}` : ''}`,
        status: c.status,
      })),
      ...patient.prescriptions.map((p) => ({
        id: `rx-${p.id}`,
        date: p.issuedAt.toISOString(),
        type: 'PRESCRIPTION',
        title: `Prescription ${p.prescriptionNumber}`,
        subtitle: `${p.items.length} item(s)`,
        status: p.status,
      })),
      ...patient.labRequests.map((l) => ({
        id: `lab-${l.id}`,
        date: l.createdAt.toISOString(),
        type: 'LAB',
        title: `Lab: ${l.test.name}`,
        subtitle: l.result ? `Result: ${l.result.resultValue} ${l.result.unit || ''} (${l.result.flag})` : l.requestNumber,
        status: l.status,
      })),
      ...patient.imagingRequests.map((img) => ({
        id: `img-${img.id}`,
        date: img.createdAt.toISOString(),
        type: 'IMAGING',
        title: `Imaging: ${img.imaging.name} (${img.imaging.modality})`,
        subtitle: img.result ? img.result.impression || img.result.findings : img.requestNumber,
        status: img.status,
      })),
      ...patient.procedureRecords.map((pr) => ({
        id: `proc-${pr.id}`,
        date: pr.procedureDate.toISOString(),
        type: 'PROCEDURE',
        title: `Procedure: ${pr.procedure.name}`,
        subtitle: pr.outcome || pr.procedureNotes || pr.procedureNumber,
        status: pr.status,
      })),
      ...patient.referrals.map((r) => ({
        id: `ref-${r.id}`,
        date: r.createdAt.toISOString(),
        type: 'REFERRAL',
        title: `${r.direction} Referral (${r.referralNumber})`,
        subtitle: r.receivingFacility || r.receivingDepartment || r.reason,
        status: r.status,
      })),
      ...patient.invoices.map((inv) => ({
        id: `inv-${inv.id}`,
        date: inv.createdAt.toISOString(),
        type: 'BILLING',
        title: `Invoice ${inv.invoiceNumber} — GH₵${inv.totalAmount.toFixed(2)}`,
        subtitle: `Paid: GH₵${inv.amountPaid.toFixed(2)} • Balance: GH₵${inv.balance.toFixed(2)}`,
        status: inv.status,
      })),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const auditLogs = await prisma.auditLog.findMany({
      where: {
        OR: [
          { entityId: patientId },
          { detailsJson: { contains: patientId } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 40,
    });

    return NextResponse.json({ patient, timeline, auditLogs });
  } catch (error) {
    console.error('GET clinic EMR error:', error);
    return NextResponse.json({ error: 'Failed to load patient EMR' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, patientId } = body;

    if (!action) {
      return NextResponse.json({ error: 'action is required' }, { status: 400 });
    }

    if (action === 'merge_patients') {
      const auth = await authorizeClinicStaff(CLINIC_ADMIN_ROLES);
      if (!auth.authorized) {
        return NextResponse.json({ error: auth.error }, { status: auth.status || 403 });
      }
      const { sourcePatientId, targetPatientId, reason } = body;
      if (!sourcePatientId || !targetPatientId || sourcePatientId === targetPatientId) {
        return NextResponse.json({ error: 'Distinct sourcePatientId and targetPatientId are required' }, { status: 400 });
      }

      await prisma.$transaction(async (tx) => {
        await tx.appointment.updateMany({ where: { patientId: sourcePatientId }, data: { patientId: targetPatientId } });
        await tx.clinicQueue.updateMany({ where: { patientId: sourcePatientId }, data: { patientId: targetPatientId } });
        await tx.patientVisit.updateMany({ where: { patientId: sourcePatientId }, data: { patientId: targetPatientId } });
        await tx.consultation.updateMany({ where: { patientId: sourcePatientId }, data: { patientId: targetPatientId } });
        await tx.diagnosis.updateMany({ where: { patientId: sourcePatientId }, data: { patientId: targetPatientId } });
        await tx.prescription.updateMany({ where: { patientId: sourcePatientId }, data: { patientId: targetPatientId } });
        await tx.labRequest.updateMany({ where: { patientId: sourcePatientId }, data: { patientId: targetPatientId } });
        await tx.imagingRequest.updateMany({ where: { patientId: sourcePatientId }, data: { patientId: targetPatientId } });
        await tx.procedureRecord.updateMany({ where: { patientId: sourcePatientId }, data: { patientId: targetPatientId } });
        await tx.referral.updateMany({ where: { patientId: sourcePatientId }, data: { patientId: targetPatientId } });
        await tx.clinicInvoice.updateMany({ where: { patientId: sourcePatientId }, data: { patientId: targetPatientId } });
        await tx.payment.updateMany({ where: { patientId: sourcePatientId }, data: { patientId: targetPatientId } });
        await tx.patientDocument.updateMany({ where: { patientId: sourcePatientId }, data: { patientId: targetPatientId } });
        await tx.patientAllergy.updateMany({ where: { patientId: sourcePatientId }, data: { patientId: targetPatientId } });
        await tx.patientMedicalHistory.updateMany({ where: { patientId: sourcePatientId }, data: { patientId: targetPatientId } });
        await tx.patientMedicationHistory.updateMany({ where: { patientId: sourcePatientId }, data: { patientId: targetPatientId } });
        await tx.patientImmunization.updateMany({ where: { patientId: sourcePatientId }, data: { patientId: targetPatientId } });
        await tx.patientConsent.updateMany({ where: { patientId: sourcePatientId }, data: { patientId: targetPatientId } });
        await tx.patientInsurance.updateMany({ where: { patientId: sourcePatientId }, data: { patientId: targetPatientId } });

        await tx.patient.update({
          where: { id: sourcePatientId },
          data: { status: 'MERGED', mergedIntoId: targetPatientId, mergedAt: new Date() },
        });
      });

      await logClinicAudit({
        actorId: auth.userId,
        actorName: auth.name,
        actorRole: auth.clinicRole,
        action: 'PATIENT_RECORDS_MERGED',
        entityType: 'Patient',
        entityId: targetPatientId,
        details: { sourcePatientId, targetPatientId, reason: reason || 'Duplicate record merge' },
      });

      return NextResponse.json({ success: true, mergedIntoId: targetPatientId });
    }

    if (!patientId) {
      return NextResponse.json({ error: 'patientId is required' }, { status: 400 });
    }

    if (['add_allergy', 'update_allergy', 'add_medical_history', 'add_medication_history', 'discontinue_medication', 'add_immunization'].includes(action)) {
      const auth = await authorizeClinicStaff(CLINIC_CLINICIAN_ROLES);
      if (!auth.authorized) {
        return NextResponse.json({ error: auth.error }, { status: auth.status || 403 });
      }

      if (action === 'add_allergy') {
        const record = await prisma.patientAllergy.create({
          data: {
            patientId,
            substance: String(body.substance || '').trim(),
            category: body.category || 'MEDICATION',
            reaction: body.reaction || null,
            severity: body.severity || 'MODERATE',
            status: body.status || 'ACTIVE',
            recordedById: auth.userId || null,
            recordedByName: auth.name || 'Clinician',
            notes: body.notes || null,
          },
        });
        await logClinicAudit({
          actorId: auth.userId,
          actorName: auth.name,
          actorRole: auth.clinicRole,
          action: 'PATIENT_ALLERGY_RECORDED',
          entityType: 'PatientAllergy',
          entityId: record.id,
          details: { patientId, substance: record.substance, severity: record.severity },
        });
        return NextResponse.json({ record }, { status: 201 });
      }

      if (action === 'update_allergy') {
        const record = await prisma.patientAllergy.update({
          where: { id: body.id },
          data: {
            status: body.status || 'RESOLVED',
            resolvedAt: body.status === 'RESOLVED' ? new Date() : null,
            notes: body.notes !== undefined ? body.notes : undefined,
          },
        });
        return NextResponse.json({ record });
      }

      if (action === 'add_medical_history') {
        const record = await prisma.patientMedicalHistory.create({
          data: {
            patientId,
            category: body.category || 'CHRONIC',
            condition: String(body.condition || '').trim(),
            diagnosedDate: body.diagnosedDate || null,
            status: body.status || 'ACTIVE',
            notes: body.notes || null,
            recordedByName: auth.name || 'Clinician',
          },
        });
        await logClinicAudit({
          actorId: auth.userId,
          actorName: auth.name,
          actorRole: auth.clinicRole,
          action: 'PATIENT_MEDICAL_HISTORY_ADDED',
          entityType: 'PatientMedicalHistory',
          entityId: record.id,
          details: { patientId, category: record.category, condition: record.condition },
        });
        return NextResponse.json({ record }, { status: 201 });
      }

      if (action === 'add_medication_history') {
        const record = await prisma.patientMedicationHistory.create({
          data: {
            patientId,
            medicationName: String(body.medicationName || '').trim(),
            dosage: body.dosage || null,
            frequency: body.frequency || null,
            route: body.route || 'Oral',
            startDate: body.startDate || null,
            endDate: body.endDate || null,
            prescriberName: body.prescriberName || auth.name || null,
            status: body.status || 'ACTIVE',
          },
        });
        return NextResponse.json({ record }, { status: 201 });
      }

      if (action === 'discontinue_medication') {
        const record = await prisma.patientMedicationHistory.update({
          where: { id: body.id },
          data: {
            status: 'DISCONTINUED',
            endDate: body.endDate || new Date().toISOString().slice(0, 10),
            discontinuationReason: body.reason || 'Discontinued by clinician',
          },
        });
        return NextResponse.json({ record });
      }

      if (action === 'add_immunization') {
        const record = await prisma.patientImmunization.create({
          data: {
            patientId,
            vaccineName: String(body.vaccineName || '').trim(),
            dose: body.dose || null,
            administeredDate: body.administeredDate || new Date().toISOString().slice(0, 10),
            batchNumber: body.batchNumber || null,
            administeredBy: auth.name || 'Clinician',
            nextScheduledDate: body.nextScheduledDate || null,
            notes: body.notes || null,
          },
        });
        return NextResponse.json({ record }, { status: 201 });
      }
    }

    if (['add_identifier', 'add_insurance', 'verify_insurance', 'record_consent', 'withdraw_consent'].includes(action)) {
      const auth = await authorizeClinicStaff(CLINIC_RECEPTION_ROLES);
      if (!auth.authorized) {
        return NextResponse.json({ error: auth.error }, { status: auth.status || 403 });
      }

      if (action === 'add_identifier') {
        const record = await prisma.patientIdentifier.create({
          data: {
            patientId,
            identifierType: body.identifierType || 'GHANA_CARD',
            identifierValue: String(body.identifierValue || '').trim(),
            isPrimary: Boolean(body.isPrimary),
            issuedBy: body.issuedBy || null,
          },
        });
        return NextResponse.json({ record }, { status: 201 });
      }

      if (action === 'add_insurance') {
        const record = await prisma.patientInsurance.create({
          data: {
            patientId,
            providerId: body.providerId,
            membershipNumber: String(body.membershipNumber || '').trim(),
            policyNumber: body.policyNumber || null,
            coverageType: body.coverageType || 'STANDARD',
            expiryDate: body.expiryDate || null,
            verificationStatus: body.verificationStatus || 'VERIFIED',
            isPrimary: body.isPrimary !== false,
          },
          include: { provider: true },
        });
        return NextResponse.json({ record }, { status: 201 });
      }

      if (action === 'verify_insurance') {
        const record = await prisma.patientInsurance.update({
          where: { id: body.id },
          data: { verificationStatus: body.verificationStatus || 'VERIFIED' },
        });
        return NextResponse.json({ record });
      }

      if (action === 'record_consent') {
        const record = await prisma.patientConsent.create({
          data: {
            patientId,
            consentType: body.consentType || 'GENERAL_TREATMENT',
            status: 'GRANTED',
            staffName: auth.name || 'Clinic Staff',
            notes: body.notes || null,
          },
        });
        await logClinicAudit({
          actorId: auth.userId,
          actorName: auth.name,
          actorRole: auth.clinicRole,
          action: 'PATIENT_CONSENT_RECORDED',
          entityType: 'PatientConsent',
          entityId: record.id,
          details: { patientId, consentType: record.consentType },
        });
        return NextResponse.json({ record }, { status: 201 });
      }

      if (action === 'withdraw_consent') {
        const record = await prisma.patientConsent.update({
          where: { id: body.id },
          data: { status: 'WITHDRAWN', withdrawnAt: new Date() },
        });
        return NextResponse.json({ record });
      }
    }

    return NextResponse.json({ error: 'Unsupported EMR action' }, { status: 400 });
  } catch (error) {
    console.error('POST clinic EMR error:', error);
    return NextResponse.json({ error: 'Failed to process EMR operation' }, { status: 500 });
  }
}
