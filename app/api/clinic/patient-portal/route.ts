import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizeClinicPatient, normalizeGhanaPhone } from '@/lib/clinic-auth';

export async function GET() {
  try {
    const auth = await authorizeClinicPatient();
    if (!auth.authorized || !auth.patient) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 403 });
    }

    const patientId = auth.patient.id;

    const [patient, appointments, consultations, prescriptions, labRequests, invoices, payments, services] =
      await Promise.all([
        prisma.patient.findUnique({
          where: { id: patientId },
          select: {
            id: true,
            patientNumber: true,
            fullName: true,
            dateOfBirth: true,
            gender: true,
            phone: true,
            email: true,
            address: true,
            bloodGroup: true,
            allergies: true,
            emergencyName: true,
            emergencyPhone: true,
            emergencyRelation: true,
          },
        }),
        prisma.appointment.findMany({
          where: { patientId },
          include: { service: true, department: true, staff: { include: { user: { select: { name: true, title: true } } } } },
          orderBy: { preferredDate: 'desc' },
        }),
        prisma.consultation.findMany({
          where: { patientId, status: 'COMPLETED' },
          select: {
            id: true,
            consultationNumber: true,
            chiefComplaint: true,
            treatmentPlan: true,
            followUpDate: true,
            followUpNotes: true,
            completedAt: true,
            vitals: true,
            diagnoses: { select: { id: true, title: true, code: true, diagnosedAt: true } },
            staff: { select: { user: { select: { name: true, title: true } } } },
            // Explicitly omit internalNotes from patient portal
          },
          orderBy: { completedAt: 'desc' },
        }),
        prisma.prescription.findMany({
          where: { patientId, status: { not: 'DRAFT' } },
          include: {
            items: true,
            staff: { select: { user: { select: { name: true, title: true } } } },
          },
          orderBy: { issuedAt: 'desc' },
        }),
        prisma.labRequest.findMany({
          where: { patientId, result: { isReleased: true } },
          include: { test: true, result: true },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.clinicInvoice.findMany({
          where: { patientId, status: { not: 'DRAFT' } },
          include: { items: true, payments: true },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.payment.findMany({
          where: { patientId },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.clinicService.findMany({
          where: { isActive: true },
          orderBy: { title: 'asc' },
        }),
      ]);

    return NextResponse.json({
      patient,
      appointments,
      consultations,
      prescriptions,
      labResults: labRequests,
      invoices,
      payments,
      services,
    });
  } catch (error) {
    console.error('GET patient portal error:', error);
    return NextResponse.json({ error: 'Failed to load patient portal' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authorizeClinicPatient();
    if (!auth.authorized || !auth.patient) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 403 });
    }

    const body = await req.json();
    const { serviceId, preferredDate, preferredTime, reason } = body;
    if (!preferredDate || !preferredTime) {
      return NextResponse.json({ error: 'Preferred date and time are required.' }, { status: 400 });
    }

    const appointment = await prisma.appointment.create({
      data: {
        patientId: auth.patient.id,
        patientName: auth.patient.fullName,
        patientPhone: auth.patient.phone,
        patientEmail: auth.patient.email,
        serviceId: serviceId || null,
        preferredDate,
        preferredTime,
        reason: reason || null,
        message: reason || null,
        status: 'PENDING',
      },
      include: { service: true },
    });

    return NextResponse.json({ appointment }, { status: 201 });
  } catch (error) {
    console.error('POST patient portal appointment error:', error);
    return NextResponse.json({ error: 'Failed to request appointment' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await authorizeClinicPatient();
    if (!auth.authorized || !auth.patient) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 403 });
    }

    const body = await req.json();
    // Only permitted contact fields can be updated by patient
    const updated = await prisma.patient.update({
      where: { id: auth.patient.id },
      data: {
        ...(body.phone ? { phone: normalizeGhanaPhone(String(body.phone)) } : {}),
        ...(body.address !== undefined ? { address: body.address || null } : {}),
        ...(body.emergencyName !== undefined ? { emergencyName: body.emergencyName || null } : {}),
        ...(body.emergencyPhone !== undefined
          ? { emergencyPhone: body.emergencyPhone ? normalizeGhanaPhone(String(body.emergencyPhone)) : null }
          : {}),
        ...(body.emergencyRelation !== undefined ? { emergencyRelation: body.emergencyRelation || null } : {}),
      },
      select: {
        id: true,
        patientNumber: true,
        fullName: true,
        phone: true,
        address: true,
        emergencyName: true,
        emergencyPhone: true,
        emergencyRelation: true,
      },
    });

    return NextResponse.json({ patient: updated });
  } catch (error) {
    console.error('PATCH patient portal error:', error);
    return NextResponse.json({ error: 'Failed to update contact details' }, { status: 500 });
  }
}
