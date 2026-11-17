import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  authorizeClinicStaff,
  CLINIC_RECEPTION_ROLES,
  getAccraDateString,
  logClinicAudit,
} from '@/lib/clinic-auth';

export async function GET(req: NextRequest) {
  try {
    const auth = await authorizeClinicStaff();
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 403 });
    }

    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date') || getAccraDateString();
    const status = searchParams.get('status') || undefined;
    const departmentId = searchParams.get('departmentId') || undefined;

    const entries = await prisma.clinicQueue.findMany({
      where: {
        queueDate: date,
        ...(status ? { status } : {}),
        ...(departmentId ? { departmentId } : {}),
      },
      include: {
        patient: { select: { id: true, patientNumber: true, fullName: true, phone: true, gender: true, allergies: true } },
        department: true,
        staff: { include: { user: { select: { name: true, title: true } } } },
        appointment: { select: { id: true, preferredTime: true, reason: true } },
        consultation: { select: { id: true, status: true, consultationNumber: true } },
      },
      orderBy: [{ checkedInAt: 'asc' }],
    });

    // Order EMERGENCY -> URGENT -> NORMAL among waiting/called
    const weight: Record<string, number> = { EMERGENCY: 0, URGENT: 1, NORMAL: 2 };
    entries.sort((a, b) => {
      const wa = weight[a.priority] ?? 2;
      const wb = weight[b.priority] ?? 2;
      if (wa !== wb) return wa - wb;
      return new Date(a.checkedInAt).getTime() - new Date(b.checkedInAt).getTime();
    });

    return NextResponse.json({ queueDate: date, entries });
  } catch (error) {
    console.error('GET clinic queue error:', error);
    return NextResponse.json({ error: 'Failed to load clinic queue' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authorizeClinicStaff(CLINIC_RECEPTION_ROLES);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 403 });
    }

    const body = await req.json();
    const { patientId, appointmentId, departmentId, staffId, priority, priorityNotes } = body;

    if (!patientId) {
      return NextResponse.json({ error: 'patientId is required to check in.' }, { status: 400 });
    }

    const queueDate = getAccraDateString();

    if (appointmentId) {
      const existingByAppt = await prisma.clinicQueue.findUnique({ where: { appointmentId } });
      if (existingByAppt) {
        return NextResponse.json({ error: 'This appointment is already checked into the queue.', entry: existingByAppt }, { status: 409 });
      }
    }

    const existingCount = await prisma.clinicQueue.count({ where: { queueDate } });
    const queueNumber = `Q-${String(existingCount + 1).padStart(3, '0')}`;

    const entry = await prisma.$transaction(async (tx) => {
      const created = await tx.clinicQueue.create({
        data: {
          queueNumber,
          queueDate,
          patientId,
          appointmentId: appointmentId || null,
          departmentId: departmentId || null,
          staffId: staffId || null,
          priority: ['NORMAL', 'URGENT', 'EMERGENCY'].includes(priority) ? priority : 'NORMAL',
          priorityNotes: priorityNotes || null,
          status: 'WAITING',
        },
        include: {
          patient: { select: { id: true, patientNumber: true, fullName: true, phone: true } },
          department: true,
          staff: { include: { user: { select: { name: true } } } },
        },
      });

      if (appointmentId) {
        await tx.appointment.update({
          where: { id: appointmentId },
          data: { status: 'CHECKED_IN' },
        });
      }

      return created;
    });

    await logClinicAudit({
      actorId: auth.userId,
      actorName: auth.name,
      actorRole: auth.clinicRole,
      action: 'PATIENT_CHECKED_IN',
      entityType: 'ClinicQueue',
      entityId: entry.id,
      details: { queueNumber, queueDate, priority: entry.priority, patientId },
    });

    return NextResponse.json({ entry }, { status: 201 });
  } catch (error) {
    console.error('POST clinic queue error:', error);
    return NextResponse.json({ error: 'Failed to check in patient' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await authorizeClinicStaff(CLINIC_RECEPTION_ROLES);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 403 });
    }

    const body = await req.json();
    const { id, action, priority, priorityNotes, staffId, departmentId } = body;
    if (!id) {
      return NextResponse.json({ error: 'Queue entry id is required' }, { status: 400 });
    }

    const existing = await prisma.clinicQueue.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Queue entry not found' }, { status: 404 });
    }

    const now = new Date();
    const data: Record<string, unknown> = {};
    if (priority && ['NORMAL', 'URGENT', 'EMERGENCY'].includes(priority)) {
      data.priority = priority;
      data.priorityNotes = priorityNotes || existing.priorityNotes;
    }
    if (staffId !== undefined) data.staffId = staffId || null;
    if (departmentId !== undefined) data.departmentId = departmentId || null;

    if (action === 'call') {
      data.status = 'CALLED';
      data.calledAt = now;
    } else if (action === 'start_consultation') {
      data.status = 'IN_CONSULTATION';
      data.startedAt = now;
    } else if (action === 'complete') {
      data.status = 'COMPLETED';
      data.completedAt = now;
    } else if (action === 'cancel') {
      data.status = 'CANCELLED';
    }

    const updated = await prisma.$transaction(async (tx) => {
      const q = await tx.clinicQueue.update({
        where: { id },
        data,
        include: {
          patient: { select: { id: true, patientNumber: true, fullName: true } },
          department: true,
          staff: { include: { user: { select: { name: true } } } },
        },
      });

      if (q.appointmentId) {
        if (action === 'start_consultation') {
          await tx.appointment.update({ where: { id: q.appointmentId }, data: { status: 'IN_PROGRESS' } });
        } else if (action === 'complete') {
          await tx.appointment.update({ where: { id: q.appointmentId }, data: { status: 'COMPLETED' } });
        } else if (action === 'cancel') {
          await tx.appointment.update({ where: { id: q.appointmentId }, data: { status: 'CANCELLED' } });
        }
      }
      return q;
    });

    await logClinicAudit({
      actorId: auth.userId,
      actorName: auth.name,
      actorRole: auth.clinicRole,
      action: action ? `QUEUE_${String(action).toUpperCase()}` : 'QUEUE_UPDATED',
      entityType: 'ClinicQueue',
      entityId: updated.id,
      details: { queueNumber: updated.queueNumber, status: updated.status, priority: updated.priority },
    });

    return NextResponse.json({ entry: updated });
  } catch (error) {
    console.error('PATCH clinic queue error:', error);
    return NextResponse.json({ error: 'Failed to update queue entry' }, { status: 500 });
  }
}
