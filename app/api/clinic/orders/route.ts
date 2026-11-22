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
    const orderType = searchParams.get('orderType') || undefined;
    const status = searchParams.get('status') || undefined;

    const orders = await prisma.clinicalOrder.findMany({
      where: {
        ...(patientId ? { patientId } : {}),
        ...(orderType ? { orderType } : {}),
        ...(status ? { status } : {}),
      },
      include: {
        patient: { select: { id: true, patientNumber: true, fullName: true } },
        department: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 80,
    });

    return NextResponse.json({ orders });
  } catch (error) {
    console.error('GET clinical orders error:', error);
    return NextResponse.json({ error: 'Failed to load clinical orders' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authorizeClinicStaff(CLINIC_CLINICIAN_ROLES);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 403 });
    }

    const body = await req.json();
    const { patientId, consultationId, visitId, orderType, priority, instructions, departmentId, referenceId } = body;

    if (!patientId || !orderType) {
      return NextResponse.json({ error: 'patientId and orderType are required' }, { status: 400 });
    }

    const count = await prisma.clinicalOrder.count();
    const orderNumber = `ORD-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    const order = await prisma.clinicalOrder.create({
      data: {
        orderNumber,
        patientId,
        consultationId: consultationId || null,
        visitId: visitId || null,
        orderType: String(orderType).toUpperCase(),
        priority: priority || 'ROUTINE',
        instructions: instructions || null,
        status: 'ORDERED',
        departmentId: departmentId || null,
        orderedById: auth.userId || null,
        orderedByName: auth.name || 'Clinician',
        referenceId: referenceId || null,
      },
      include: {
        patient: { select: { id: true, patientNumber: true, fullName: true } },
      },
    });

    await logClinicAudit({
      actorId: auth.userId,
      actorName: auth.name,
      actorRole: auth.clinicRole,
      action: 'CLINICAL_ORDER_CREATED',
      entityType: 'ClinicalOrder',
      entityId: order.id,
      details: { orderNumber, orderType: order.orderType, patientId },
    });

    return NextResponse.json({ order }, { status: 201 });
  } catch (error) {
    console.error('POST clinical order error:', error);
    return NextResponse.json({ error: 'Failed to create clinical order' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await authorizeClinicStaff();
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 403 });
    }

    const body = await req.json();
    if (!body.id || !body.status) {
      return NextResponse.json({ error: 'id and status are required' }, { status: 400 });
    }

    const order = await prisma.clinicalOrder.update({
      where: { id: body.id },
      data: { status: body.status },
    });

    return NextResponse.json({ order });
  } catch (error) {
    console.error('PATCH clinical order error:', error);
    return NextResponse.json({ error: 'Failed to update clinical order' }, { status: 500 });
  }
}
