import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizeClinicStaff, CLINIC_CLINICIAN_ROLES } from '@/lib/clinic-auth';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authorizeClinicStaff();
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 403 });
    }

    const { id } = await params;
    const isClinician =
      CLINIC_CLINICIAN_ROLES.includes(auth.clinicRole || '') ||
      CLINIC_CLINICIAN_ROLES.includes(auth.role || '');

    const patient = await prisma.patient.findUnique({
      where: { id },
      include: {
        appointments: {
          include: { service: true, department: true, staff: { include: { user: { select: { name: true } } } } },
          orderBy: { preferredDate: 'desc' },
        },
        consultations: {
          include: {
            vitals: true,
            diagnoses: true,
            staff: { include: { user: { select: { name: true, title: true } } } },
            amendments: { orderBy: { createdAt: 'desc' } },
          },
          orderBy: { startedAt: 'desc' },
        },
        prescriptions: {
          include: {
            items: { include: { dispensingRecords: true } },
            staff: { include: { user: { select: { name: true } } } },
          },
          orderBy: { issuedAt: 'desc' },
        },
        labRequests: {
          include: { test: true, result: true },
          orderBy: { createdAt: 'desc' },
        },
        invoices: {
          include: { items: true, refunds: true },
          orderBy: { createdAt: 'desc' },
        },
        payments: {
          orderBy: { createdAt: 'desc' },
        },
        documents: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!patient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    // Restrict internal clinician notes from non-clinician staff (e.g. cashier/receptionist)
    const sanitizedConsultations = patient.consultations.map((c) => ({
      ...c,
      internalNotes: isClinician ? c.internalNotes : null,
    }));

    return NextResponse.json({
      patient: {
        ...patient,
        consultations: sanitizedConsultations,
      },
    });
  } catch (error) {
    console.error('GET patient detail error:', error);
    return NextResponse.json({ error: 'Failed to load patient profile' }, { status: 500 });
  }
}
