import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  authorizeClinicStaff,
  CLINIC_RECEPTION_ROLES,
  normalizeGhanaPhone,
  logClinicAudit,
  sendClinicNotification,
} from '@/lib/clinic-auth';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date') || undefined;
    const from = searchParams.get('from') || undefined;
    const to = searchParams.get('to') || undefined;
    const status = searchParams.get('status') || undefined;
    const staffId = searchParams.get('staffId') || undefined;
    const patientId = searchParams.get('patientId') || undefined;
    const search = searchParams.get('search')?.trim().toLowerCase() || '';

    const appointments = await prisma.appointment.findMany({
      where: {
        ...(date ? { preferredDate: date } : {}),
        ...(from && to ? { preferredDate: { gte: from, lte: to } } : {}),
        ...(status ? { status: status as never } : {}),
        ...(staffId ? { staffId } : {}),
        ...(patientId ? { patientId } : {}),
      },
      include: {
        service: true,
        department: true,
        patient: { select: { id: true, patientNumber: true, fullName: true, phone: true } },
        staff: { include: { user: { select: { id: true, name: true, title: true } } } },
        queueEntry: { select: { id: true, queueNumber: true, status: true } },
      },
      orderBy: [{ preferredDate: 'asc' }, { preferredTime: 'asc' }, { createdAt: 'desc' }],
    });

    const filtered = search
      ? appointments.filter(
          (a) =>
            a.patientName.toLowerCase().includes(search) ||
            a.patientPhone.toLowerCase().includes(search) ||
            (a.patient?.patientNumber || '').toLowerCase().includes(search)
        )
      : appointments;

    return NextResponse.json({ appointments: filtered });
  } catch (error) {
    console.error('GET clinic appointments error:', error);
    return NextResponse.json({ error: 'Failed to fetch appointments' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      patientId,
      patientName,
      patientPhone,
      patientEmail,
      serviceId,
      departmentId,
      departmentName,
      staffId,
      preferredDate,
      preferredTime,
      endTime,
      reason,
      message,
      internalNotes,
      status,
      overrideConflict,
    } = body;

    let resolvedName = String(patientName || '').trim();
    let resolvedPhone = String(patientPhone || '').trim();
    let resolvedEmail = patientEmail ? String(patientEmail).trim().toLowerCase() : null;
    let resolvedPatientUserId: string | null = null;

    if (patientId) {
      const p = await prisma.patient.findUnique({ where: { id: patientId } });
      if (!p) {
        return NextResponse.json({ error: 'Selected patient not found' }, { status: 404 });
      }
      resolvedName = resolvedName || p.fullName;
      resolvedPhone = resolvedPhone || p.phone;
      resolvedEmail = resolvedEmail || p.email;
      resolvedPatientUserId = p.userId;
    }

    if (!resolvedName || !resolvedPhone || !preferredDate || !preferredTime) {
      return NextResponse.json(
        { error: 'Please provide patient name, phone number, date and time.' },
        { status: 400 }
      );
    }

    const normalizedPhone = normalizeGhanaPhone(resolvedPhone);

    // Conflict detection for assigned healthcare professional
    if (staffId && !overrideConflict) {
      const conflict = await prisma.appointment.findFirst({
        where: {
          staffId,
          preferredDate,
          preferredTime,
          status: { notIn: ['CANCELLED', 'DECLINED', 'NO_SHOW', 'COMPLETED'] },
        },
        select: { id: true, patientName: true, preferredTime: true },
      });
      if (conflict) {
        return NextResponse.json(
          {
            error: `Schedule conflict: Selected clinician already has an appointment with ${conflict.patientName} at ${conflict.preferredTime} on ${preferredDate}.`,
            conflict,
          },
          { status: 409 }
        );
      }
    }

    let resolvedDeptName = departmentName || null;
    if (departmentId && !resolvedDeptName) {
      const dept = await prisma.clinicDepartment.findUnique({ where: { id: departmentId } });
      resolvedDeptName = dept?.name || null;
    }

    const isStaffBooking = Boolean(patientId || staffId || status === 'SCHEDULED' || status === 'CONFIRMED');
    let actorName = 'Public Booking';
    let actorId: string | undefined;
    if (isStaffBooking) {
      const auth = await authorizeClinicStaff(CLINIC_RECEPTION_ROLES);
      if (auth.authorized) {
        actorName = auth.name || actorName;
        actorId = auth.userId;
      }
    }

    const appointment = await prisma.appointment.create({
      data: {
        patientId: patientId || null,
        patientName: resolvedName,
        patientPhone: normalizedPhone,
        patientEmail: resolvedEmail,
        serviceId: serviceId || null,
        departmentId: departmentId || null,
        departmentName: resolvedDeptName,
        staffId: staffId || null,
        preferredDate,
        preferredTime,
        endTime: endTime || null,
        reason: reason || null,
        message: message || reason || null,
        internalNotes: internalNotes || null,
        status: (status || 'PENDING') as never,
      },
      include: {
        service: true,
        department: true,
        patient: { select: { id: true, patientNumber: true, fullName: true } },
        staff: { include: { user: { select: { name: true } } } },
      },
    });

    await logClinicAudit({
      actorId,
      actorName,
      action: 'APPOINTMENT_CREATED',
      entityType: 'Appointment',
      entityId: appointment.id,
      details: { patientName: resolvedName, preferredDate, preferredTime, status: appointment.status },
    });

    if (resolvedPatientUserId) {
      await sendClinicNotification({
        userId: resolvedPatientUserId,
        title: 'Clinic Appointment Scheduled',
        message: `Your appointment is scheduled for ${preferredDate} at ${preferredTime}.`,
        type: 'APPOINTMENT',
        link: '/portal/patient',
      });
    }

    return NextResponse.json({
      success: true,
      appointment,
      message: 'Your appointment request has been submitted successfully. Our team will contact you shortly to confirm.',
    });
  } catch (error) {
    console.error('Appointment booking error:', error);
    return NextResponse.json({ error: 'Failed to submit appointment request' }, { status: 500 });
  }
}
