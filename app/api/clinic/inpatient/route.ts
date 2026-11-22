import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  authorizeClinicStaff,
  CLINIC_ADMIN_ROLES,
  CLINIC_CLINICIAN_ROLES,
  logClinicAudit,
} from '@/lib/clinic-auth';

export async function GET() {
  try {
    const auth = await authorizeClinicStaff();
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 403 });
    }

    const [wards, admissions] = await Promise.all([
      prisma.ward.findMany({
        include: { beds: { orderBy: { bedNumber: 'asc' } } },
        orderBy: { name: 'asc' },
      }),
      prisma.inpatientAdmission.findMany({
        include: {
          patient: { select: { id: true, patientNumber: true, fullName: true, phone: true } },
          ward: true,
          bed: true,
        },
        orderBy: { admittedAt: 'desc' },
        take: 60,
      }),
    ]);

    return NextResponse.json({ wards, admissions });
  } catch (error) {
    console.error('GET clinic inpatient error:', error);
    return NextResponse.json({ error: 'Failed to load inpatient data' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    if (action === 'create_ward') {
      const auth = await authorizeClinicStaff(CLINIC_ADMIN_ROLES);
      if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: auth.status || 403 });

      const capacity = Math.max(1, Number(body.capacity) || 4);
      const ward = await prisma.ward.create({
        data: {
          name: String(body.name || '').trim(),
          wardType: body.wardType || 'GENERAL',
          capacity,
          beds: {
            create: Array.from({ length: capacity }, (_, i) => ({
              bedNumber: `B-${String(i + 1).padStart(2, '0')}`,
              status: 'AVAILABLE',
            })),
          },
        },
        include: { beds: true },
      });
      return NextResponse.json({ ward }, { status: 201 });
    }

    if (action === 'admit_patient') {
      const auth = await authorizeClinicStaff(CLINIC_CLINICIAN_ROLES);
      if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: auth.status || 403 });

      const count = await prisma.inpatientAdmission.count();
      const admissionNumber = `ADM-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

      const admission = await prisma.$transaction(async (tx) => {
        if (body.bedId) {
          await tx.bed.update({
            where: { id: body.bedId },
            data: { status: 'OCCUPIED' },
          });
        }
        return tx.inpatientAdmission.create({
          data: {
            admissionNumber,
            patientId: body.patientId,
            wardId: body.wardId,
            bedId: body.bedId || null,
            admissionDiagnosis: String(body.admissionDiagnosis || '').trim(),
            admittingDoctor: auth.name || 'Doctor',
          },
          include: {
            patient: { select: { id: true, patientNumber: true, fullName: true } },
            ward: true,
            bed: true,
          },
        });
      });

      await logClinicAudit({
        actorId: auth.userId,
        actorName: auth.name,
        actorRole: auth.clinicRole,
        action: 'INPATIENT_ADMITTED',
        entityType: 'InpatientAdmission',
        entityId: admission.id,
        details: { admissionNumber, patientId: body.patientId, wardId: body.wardId },
      });

      return NextResponse.json({ admission }, { status: 201 });
    }

    if (action === 'discharge_patient') {
      const auth = await authorizeClinicStaff(CLINIC_CLINICIAN_ROLES);
      if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: auth.status || 403 });

      const existing = await prisma.inpatientAdmission.findUnique({ where: { id: body.admissionId } });
      if (!existing) return NextResponse.json({ error: 'Admission not found' }, { status: 404 });

      const updated = await prisma.$transaction(async (tx) => {
        if (existing.bedId) {
          await tx.bed.update({
            where: { id: existing.bedId },
            data: { status: 'AVAILABLE' },
          });
        }
        return tx.inpatientAdmission.update({
          where: { id: existing.id },
          data: {
            status: 'DISCHARGED',
            dischargedAt: new Date(),
            dischargeSummary: body.dischargeSummary || null,
          },
        });
      });

      await logClinicAudit({
        actorId: auth.userId,
        actorName: auth.name,
        actorRole: auth.clinicRole,
        action: 'INPATIENT_DISCHARGED',
        entityType: 'InpatientAdmission',
        entityId: updated.id,
        details: { patientId: existing.patientId },
      });

      return NextResponse.json({ admission: updated });
    }

    return NextResponse.json({ error: 'Unsupported inpatient action' }, { status: 400 });
  } catch (error) {
    console.error('POST clinic inpatient error:', error);
    return NextResponse.json({ error: 'Failed to process inpatient action' }, { status: 500 });
  }
}
