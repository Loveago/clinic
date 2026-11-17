import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  authorizeClinicStaff,
  CLINIC_CLINICIAN_ROLES,
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

    const prescriptions = await prisma.prescription.findMany({
      where: {
        ...(patientId ? { patientId } : {}),
        ...(status ? { status } : {}),
      },
      include: {
        patient: { select: { id: true, patientNumber: true, fullName: true, phone: true } },
        consultation: { select: { id: true, consultationNumber: true } },
        staff: { include: { user: { select: { name: true, title: true } } } },
        items: {
          include: {
            medicine: { select: { id: true, name: true, strength: true, dosageForm: true, sellingPrice: true } },
            dispensingRecords: true,
          },
        },
      },
      orderBy: { issuedAt: 'desc' },
      take: 60,
    });

    return NextResponse.json({ prescriptions });
  } catch (error) {
    console.error('GET clinic prescriptions error:', error);
    return NextResponse.json({ error: 'Failed to load prescriptions' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authorizeClinicStaff(CLINIC_CLINICIAN_ROLES);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 403 });
    }

    const body = await req.json();
    const { consultationId, patientId, notes, items, status } = body;

    if (!consultationId || !patientId || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'consultationId, patientId, and at least one medicine item are required.' },
        { status: 400 }
      );
    }

    const count = await prisma.prescription.count();
    const prescriptionNumber = `RX-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    const prescription = await prisma.prescription.create({
      data: {
        prescriptionNumber,
        consultationId,
        patientId,
        staffId: auth.staffProfileId || null,
        notes: notes || null,
        status: status === 'DRAFT' ? 'DRAFT' : 'ISSUED',
        items: {
          create: items.map((item: {
            medicineId?: string;
            medicineName: string;
            dosage: string;
            frequency: string;
            duration: string;
            quantityPrescribed: number;
            instructions?: string;
          }) => ({
            medicineId: item.medicineId || null,
            medicineName: String(item.medicineName).trim(),
            dosage: String(item.dosage || '1 tablet'),
            frequency: String(item.frequency || 'BD'),
            duration: String(item.duration || '5 days'),
            quantityPrescribed: Math.max(1, Number(item.quantityPrescribed) || 1),
            instructions: item.instructions || null,
          })),
        },
      },
      include: {
        patient: { select: { id: true, patientNumber: true, fullName: true } },
        items: { include: { medicine: true } },
      },
    });

    await logClinicAudit({
      actorId: auth.userId,
      actorName: auth.name,
      actorRole: auth.clinicRole,
      action: 'PRESCRIPTION_ISSUED',
      entityType: 'Prescription',
      entityId: prescription.id,
      details: { prescriptionNumber, patientId, itemCount: prescription.items.length },
    });

    return NextResponse.json({ prescription }, { status: 201 });
  } catch (error) {
    console.error('POST clinic prescription error:', error);
    return NextResponse.json({ error: 'Failed to create prescription' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await authorizeClinicStaff(CLINIC_CLINICIAN_ROLES);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 403 });
    }

    const body = await req.json();
    const { id, status, notes } = body;
    if (!id) return NextResponse.json({ error: 'Prescription id is required' }, { status: 400 });

    const updated = await prisma.prescription.update({
      where: { id },
      data: {
        ...(status ? { status } : {}),
        ...(notes !== undefined ? { notes } : {}),
      },
      include: { items: true },
    });

    await logClinicAudit({
      actorId: auth.userId,
      actorName: auth.name,
      actorRole: auth.clinicRole,
      action: 'PRESCRIPTION_UPDATED',
      entityType: 'Prescription',
      entityId: updated.id,
      details: { status: updated.status },
    });

    return NextResponse.json({ prescription: updated });
  } catch (error) {
    console.error('PATCH clinic prescription error:', error);
    return NextResponse.json({ error: 'Failed to update prescription' }, { status: 500 });
  }
}
