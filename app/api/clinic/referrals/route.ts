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
    const direction = searchParams.get('direction') || undefined;
    const status = searchParams.get('status') || undefined;

    const referrals = await prisma.referral.findMany({
      where: {
        ...(patientId ? { patientId } : {}),
        ...(direction ? { direction } : {}),
        ...(status ? { status } : {}),
      },
      include: {
        patient: { select: { id: true, patientNumber: true, fullName: true, phone: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 60,
    });

    return NextResponse.json({ referrals });
  } catch (error) {
    console.error('GET clinic referrals error:', error);
    return NextResponse.json({ error: 'Failed to load referrals' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authorizeClinicStaff(CLINIC_CLINICIAN_ROLES);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 403 });
    }

    const body = await req.json();
    if (!body.patientId || !body.reason) {
      return NextResponse.json({ error: 'patientId and reason are required' }, { status: 400 });
    }

    const count = await prisma.referral.count();
    const referralNumber = `REF-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    const referral = await prisma.referral.create({
      data: {
        referralNumber,
        patientId: body.patientId,
        consultationId: body.consultationId || null,
        direction: body.direction || 'INTERNAL',
        referringStaffName: auth.name || 'Clinician',
        receivingFacility: body.receivingFacility || null,
        receivingDepartment: body.receivingDepartment || null,
        reason: String(body.reason).trim(),
        clinicalSummary: body.clinicalSummary || null,
        urgency: body.urgency || 'ROUTINE',
        followUpDate: body.followUpDate || null,
      },
      include: {
        patient: { select: { id: true, patientNumber: true, fullName: true } },
      },
    });

    await logClinicAudit({
      actorId: auth.userId,
      actorName: auth.name,
      actorRole: auth.clinicRole,
      action: 'REFERRAL_CREATED',
      entityType: 'Referral',
      entityId: referral.id,
      details: { referralNumber, direction: referral.direction, patientId: body.patientId },
    });

    return NextResponse.json({ referral }, { status: 201 });
  } catch (error) {
    console.error('POST clinic referral error:', error);
    return NextResponse.json({ error: 'Failed to create referral' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await authorizeClinicStaff(CLINIC_CLINICIAN_ROLES);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 403 });
    }

    const body = await req.json();
    if (!body.id) return NextResponse.json({ error: 'Referral id is required' }, { status: 400 });

    const referral = await prisma.referral.update({
      where: { id: body.id },
      data: {
        ...(body.status ? { status: body.status } : {}),
        ...(body.outcome !== undefined ? { outcome: body.outcome } : {}),
        ...(body.followUpDate !== undefined ? { followUpDate: body.followUpDate } : {}),
      },
    });

    return NextResponse.json({ referral });
  } catch (error) {
    console.error('PATCH clinic referral error:', error);
    return NextResponse.json({ error: 'Failed to update referral' }, { status: 500 });
  }
}
