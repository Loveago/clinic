import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  authorizeClinicStaff,
  CLINIC_SUPER_ADMIN_ROLES,
  logClinicAudit,
} from '@/lib/clinic-auth';

export async function GET() {
  try {
    const auth = await authorizeClinicStaff();
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 403 });
    }

    let config = await prisma.clinicConfiguration.findUnique({ where: { id: 'default' } });
    if (!config) {
      config = await prisma.clinicConfiguration.create({
        data: { id: 'default' },
      });
    }

    return NextResponse.json({ config });
  } catch (error) {
    console.error('GET clinic config error:', error);
    return NextResponse.json({ error: 'Failed to load clinic configuration' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await authorizeClinicStaff(CLINIC_SUPER_ADMIN_ROLES);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 403 });
    }

    const body = await req.json();
    const allowedFields = [
      'clinicName',
      'tagline',
      'logoUrl',
      'phone',
      'email',
      'address',
      'operatingHours',
      'appointmentDurationMin',
      'invoicePrefix',
      'invoiceFooterNote',
      'triageCategoriesJson',
      'workflowStagesJson',
      'nhisEnabled',
      'enableImaging',
      'enableEmergency',
      'enableInpatient',
    ] as const;

    const updateData: Record<string, unknown> = {};
    for (const key of allowedFields) {
      if (body[key] !== undefined) {
        updateData[key] = body[key];
      }
    }

    const config = await prisma.clinicConfiguration.upsert({
      where: { id: 'default' },
      update: updateData,
      create: { id: 'default', ...updateData },
    });

    await logClinicAudit({
      actorId: auth.userId,
      actorName: auth.name,
      actorRole: auth.clinicRole,
      action: 'CLINIC_CONFIG_UPDATED',
      entityType: 'ClinicConfiguration',
      entityId: config.id,
      details: { updatedKeys: Object.keys(updateData) },
    });

    return NextResponse.json({ config });
  } catch (error) {
    console.error('PATCH clinic config error:', error);
    return NextResponse.json({ error: 'Failed to update clinic configuration' }, { status: 500 });
  }
}
