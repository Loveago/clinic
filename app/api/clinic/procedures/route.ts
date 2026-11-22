import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  authorizeClinicStaff,
  CLINIC_ADMIN_ROLES,
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

    const [catalog, records] = await Promise.all([
      prisma.procedureCatalog.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } }),
      prisma.procedureRecord.findMany({
        where: patientId ? { patientId } : {},
        include: {
          patient: { select: { id: true, patientNumber: true, fullName: true } },
          procedure: true,
        },
        orderBy: { procedureDate: 'desc' },
        take: 60,
      }),
    ]);

    return NextResponse.json({ catalog, records });
  } catch (error) {
    console.error('GET clinic procedures error:', error);
    return NextResponse.json({ error: 'Failed to load procedures' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    if (action === 'create_catalog') {
      const auth = await authorizeClinicStaff(CLINIC_ADMIN_ROLES);
      if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: auth.status || 403 });

      const item = await prisma.procedureCatalog.create({
        data: {
          code: String(body.code || '').trim().toUpperCase(),
          name: String(body.name || '').trim(),
          category: body.category || 'Minor Procedure',
          description: body.description || null,
          priceGHS: Math.max(0, Number(body.priceGHS) || 80),
        },
      });
      return NextResponse.json({ item }, { status: 201 });
    }

    if (action === 'record_procedure') {
      const auth = await authorizeClinicStaff(CLINIC_CLINICIAN_ROLES);
      if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: auth.status || 403 });

      const procDef = await prisma.procedureCatalog.findUnique({ where: { id: body.procedureId } });
      if (!procDef) return NextResponse.json({ error: 'Procedure not found in catalog' }, { status: 404 });

      const count = await prisma.procedureRecord.count();
      const procedureNumber = `PROC-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

      const record = await prisma.procedureRecord.create({
        data: {
          procedureNumber,
          patientId: body.patientId,
          consultationId: body.consultationId || null,
          procedureId: body.procedureId,
          performedByName: auth.name || 'Clinician',
          materialsUsed: body.materialsUsed || null,
          procedureNotes: body.procedureNotes || null,
          outcome: body.outcome || null,
          followUpInstructions: body.followUpInstructions || null,
          status: body.status || 'COMPLETED',
          chargeGHS: body.chargeGHS !== undefined ? Number(body.chargeGHS) : procDef.priceGHS,
        },
        include: {
          patient: { select: { id: true, patientNumber: true, fullName: true } },
          procedure: true,
        },
      });

      await logClinicAudit({
        actorId: auth.userId,
        actorName: auth.name,
        actorRole: auth.clinicRole,
        action: 'PROCEDURE_RECORDED',
        entityType: 'ProcedureRecord',
        entityId: record.id,
        details: { procedureNumber, patientId: body.patientId, procedure: procDef.name },
      });

      return NextResponse.json({ record }, { status: 201 });
    }

    return NextResponse.json({ error: 'Unsupported procedure action' }, { status: 400 });
  } catch (error) {
    console.error('POST clinic procedures error:', error);
    return NextResponse.json({ error: 'Failed to process procedure action' }, { status: 500 });
  }
}
