import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  authorizeClinicStaff,
  CLINIC_ADMIN_ROLES,
  CLINIC_BILLING_ROLES,
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

    const [providers, claims] = await Promise.all([
      prisma.insuranceProvider.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } }),
      prisma.insuranceClaim.findMany({
        where: patientId ? { patientId } : {},
        include: {
          patient: { select: { id: true, patientNumber: true, fullName: true } },
          provider: true,
          items: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 60,
      }),
    ]);

    return NextResponse.json({ providers, claims });
  } catch (error) {
    console.error('GET clinic insurance error:', error);
    return NextResponse.json({ error: 'Failed to load insurance data' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    if (action === 'create_provider') {
      const auth = await authorizeClinicStaff(CLINIC_ADMIN_ROLES);
      if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: auth.status || 403 });

      const provider = await prisma.insuranceProvider.create({
        data: {
          code: String(body.code || '').trim().toUpperCase(),
          name: String(body.name || '').trim(),
          providerType: body.providerType || 'PRIVATE',
          contactPhone: body.contactPhone || null,
          contactEmail: body.contactEmail || null,
        },
      });
      return NextResponse.json({ provider }, { status: 201 });
    }

    if (action === 'create_claim') {
      const auth = await authorizeClinicStaff(CLINIC_BILLING_ROLES);
      if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: auth.status || 403 });

      const items = Array.isArray(body.items) ? body.items : [];
      const totalClaimedGHS = Number(
        items.reduce((s: number, i: { amountGHS: number }) => s + Math.max(0, Number(i.amountGHS) || 0), 0).toFixed(2)
      );

      const count = await prisma.insuranceClaim.count();
      const claimNumber = `CLM-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

      const claim = await prisma.insuranceClaim.create({
        data: {
          claimNumber,
          patientId: body.patientId,
          providerId: body.providerId,
          invoiceId: body.invoiceId || null,
          totalClaimedGHS,
          coPayGHS: Math.max(0, Number(body.coPayGHS) || 0),
          status: body.submitNow ? 'SUBMITTED' : 'DRAFT',
          submittedAt: body.submitNow ? new Date() : null,
          items: {
            create: items.map((i: { description: string; amountGHS: number }) => ({
              description: String(i.description || 'Covered Service'),
              amountGHS: Math.max(0, Number(i.amountGHS) || 0),
            })),
          },
        },
        include: { provider: true, items: true },
      });

      await logClinicAudit({
        actorId: auth.userId,
        actorName: auth.name,
        actorRole: auth.clinicRole,
        action: 'INSURANCE_CLAIM_CREATED',
        entityType: 'InsuranceClaim',
        entityId: claim.id,
        details: { claimNumber, totalClaimedGHS, patientId: body.patientId },
      });

      return NextResponse.json({ claim }, { status: 201 });
    }

    if (action === 'update_claim_status') {
      const auth = await authorizeClinicStaff(CLINIC_BILLING_ROLES);
      if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: auth.status || 403 });

      const claim = await prisma.insuranceClaim.update({
        where: { id: body.claimId },
        data: {
          status: body.status,
          approvedGHS: body.approvedGHS !== undefined ? Number(body.approvedGHS) : undefined,
          rejectionReason: body.rejectionReason !== undefined ? body.rejectionReason : undefined,
          submittedAt: body.status === 'SUBMITTED' ? new Date() : undefined,
          settledAt: body.status === 'PAID' ? new Date() : undefined,
        },
      });
      return NextResponse.json({ claim });
    }

    return NextResponse.json({ error: 'Unsupported insurance action' }, { status: 400 });
  } catch (error) {
    console.error('POST clinic insurance error:', error);
    return NextResponse.json({ error: 'Failed to process insurance action' }, { status: 500 });
  }
}
