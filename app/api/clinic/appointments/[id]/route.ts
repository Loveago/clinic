import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  authorizeClinicStaff,
  CLINIC_RECEPTION_ROLES,
  logClinicAudit,
  sendClinicNotification,
} from '@/lib/clinic-auth';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authorizeClinicStaff(CLINIC_RECEPTION_ROLES);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 403 });
    }

    const { id } = await params;
    const existing = await prisma.appointment.findUnique({
      where: { id },
      include: { patient: { select: { userId: true } } },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
    }

    const body = await req.json();
    const {
      status,
      preferredDate,
      preferredTime,
      endTime,
      staffId,
      departmentId,
      internalNotes,
      reason,
      overrideConflict,
    } = body;

    const targetDate = preferredDate || existing.preferredDate;
    const targetTime = preferredTime || existing.preferredTime;
    const targetStaffId = staffId !== undefined ? staffId : existing.staffId;

    if ((preferredDate || preferredTime || staffId) && targetStaffId && !overrideConflict) {
      const conflict = await prisma.appointment.findFirst({
        where: {
          id: { not: id },
          staffId: targetStaffId,
          preferredDate: targetDate,
          preferredTime: targetTime,
          status: { notIn: ['CANCELLED', 'DECLINED', 'NO_SHOW', 'COMPLETED'] },
        },
      });
      if (conflict) {
        return NextResponse.json(
          { error: `Schedule conflict with ${conflict.patientName} at ${targetTime} on ${targetDate}.` },
          { status: 409 }
        );
      }
    }

    const nextStatus =
      status || (preferredDate || preferredTime ? 'RESCHEDULED' : existing.status);

    const updated = await prisma.appointment.update({
      where: { id },
      data: {
        status: nextStatus as never,
        ...(preferredDate ? { preferredDate } : {}),
        ...(preferredTime ? { preferredTime } : {}),
        ...(endTime !== undefined ? { endTime: endTime || null } : {}),
        ...(staffId !== undefined ? { staffId: staffId || null } : {}),
        ...(departmentId !== undefined ? { departmentId: departmentId || null } : {}),
        ...(internalNotes !== undefined ? { internalNotes } : {}),
        ...(reason !== undefined ? { reason } : {}),
      },
      include: {
        service: true,
        department: true,
        patient: { select: { id: true, patientNumber: true, fullName: true, userId: true } },
        staff: { include: { user: { select: { name: true } } } },
      },
    });

    await logClinicAudit({
      actorId: auth.userId,
      actorName: auth.name,
      actorRole: auth.clinicRole,
      action: `APPOINTMENT_${nextStatus}`,
      entityType: 'Appointment',
      entityId: updated.id,
      details: { previousStatus: existing.status, nextStatus, preferredDate: updated.preferredDate, preferredTime: updated.preferredTime },
    });

    if (existing.patient?.userId) {
      await sendClinicNotification({
        userId: existing.patient.userId,
        title: `Appointment ${nextStatus.replace(/_/g, ' ')}`,
        message: `Your appointment on ${updated.preferredDate} at ${updated.preferredTime} is now ${nextStatus.replace(/_/g, ' ')}.`,
        type: 'APPOINTMENT',
        link: '/portal/clinic',
      });
    }

    return NextResponse.json({ success: true, appointment: updated });
  } catch (error) {
    console.error('PATCH clinic appointment error:', error);
    return NextResponse.json({ error: 'Failed to update appointment' }, { status: 500 });
  }
}
