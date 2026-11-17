import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizeRole, REGISTRAR_ROLES, SCHOOL_STAFF_ROLES } from '@/lib/portal-auth';
import { ensureDefaultSchoolSetup, recordAuditLog } from '@/lib/school-admin';

export async function GET() {
  try {
    const auth = await authorizeRole(SCHOOL_STAFF_ROLES);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 403 });
    }

    const settings = await ensureDefaultSchoolSetup();
    return NextResponse.json({ settings });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to load settings' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await authorizeRole(['SUPER_ADMIN', 'SCHOOL_ADMIN', ...REGISTRAR_ROLES]);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 403 });
    }

    await ensureDefaultSchoolSetup();
    const body = await req.json();
    const {
      institutionName,
      institutionAddress,
      institutionPhone,
      institutionEmail,
      studentIdFormat,
      registrationChecklist,
    } = body;

    const updated = await prisma.schoolSettings.update({
      where: { id: 'default' },
      data: {
        ...(institutionName !== undefined ? { institutionName } : {}),
        ...(institutionAddress !== undefined ? { institutionAddress } : {}),
        ...(institutionPhone !== undefined ? { institutionPhone } : {}),
        ...(institutionEmail !== undefined ? { institutionEmail } : {}),
        ...(studentIdFormat !== undefined ? { studentIdFormat } : {}),
        ...(Array.isArray(registrationChecklist)
          ? { registrationChecklistJson: JSON.stringify(registrationChecklist) }
          : {}),
      },
    });

    await recordAuditLog({
      actorId: auth.userId,
      actorName: auth.name || 'Administrator',
      actorRole: auth.role || 'SUPER_ADMIN',
      action: 'UPDATE_SCHOOL_SETTINGS',
      entityType: 'SchoolSettings',
      entityId: 'default',
    });

    return NextResponse.json({ settings: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update settings' }, { status: 500 });
  }
}

