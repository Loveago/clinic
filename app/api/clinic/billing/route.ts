import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  authorizeClinicStaff,
  CLINIC_BILLING_ROLES,
  CLINIC_ADMIN_ROLES,
  logClinicAudit,
  sendClinicNotification,
} from '@/lib/clinic-auth';

export async function GET(req: NextRequest) {
  try {
    const auth = await authorizeClinicStaff();
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 403 });
    }

    const { searchParams } = new URL(req.url);
    const unbilledForPatientId = searchParams.get('unbilledForPatientId');

    if (unbilledForPatientId) {
      const [prescriptions, labRequests, imagingRequests, procedureRecords, existingInvoices] =
        await Promise.all([
          prisma.prescription.findMany({
            where: {
              patientId: unbilledForPatientId,
              status: { in: ['ISSUED', 'PARTIALLY_DISPENSED', 'DISPENSED'] },
            },
            include: { items: { include: { medicine: true } } },
            orderBy: { issuedAt: 'desc' },
            take: 15,
          }),
          prisma.labRequest.findMany({
            where: { patientId: unbilledForPatientId, status: { not: 'CANCELLED' } },
            include: { test: true },
            orderBy: { createdAt: 'desc' },
            take: 25,
          }),
          prisma.imagingRequest.findMany({
            where: { patientId: unbilledForPatientId, status: { not: 'CANCELLED' } },
            include: { imaging: true },
            orderBy: { createdAt: 'desc' },
            take: 20,
          }),
          prisma.procedureRecord.findMany({
            where: { patientId: unbilledForPatientId, status: { not: 'CANCELLED' } },
            include: { procedure: true },
            orderBy: { procedureDate: 'desc' },
            take: 20,
          }),
          prisma.clinicInvoice.findMany({
            where: { patientId: unbilledForPatientId, status: { not: 'CANCELLED' } },
            select: { items: { select: { referenceId: true } } },
          }),
        ]);

      const invoicedRefs = new Set(
        existingInvoices.flatMap((inv) => inv.items.map((it) => it.referenceId).filter(Boolean))
      );

      const unbilledItems: Array<{
        itemType: string;
        referenceId: string;
        description: string;
        quantity: number;
        unitPrice: number;
        sourceLabel: string;
        createdAt: string;
        alreadyInvoiced: boolean;
      }> = [];

      for (const rx of prescriptions) {
        for (const item of rx.items) {
          const price = item.medicine?.sellingPrice ?? 0;
          unbilledItems.push({
            itemType: 'MEDICINE',
            referenceId: item.id,
            description: `${item.medicineName} (${item.dosage}, ${item.frequency} x ${item.duration})`,
            quantity: Math.max(1, item.quantityPrescribed || 1),
            unitPrice: Number(price.toFixed(2)),
            sourceLabel: `Rx ${rx.prescriptionNumber}`,
            createdAt: rx.issuedAt.toISOString(),
            alreadyInvoiced: invoicedRefs.has(item.id),
          });
        }
      }

      for (const lab of labRequests) {
        unbilledItems.push({
          itemType: 'LAB_TEST',
          referenceId: lab.id,
          description: `${lab.test.name} (${lab.test.code})`,
          quantity: 1,
          unitPrice: Number((lab.test.priceGHS || 0).toFixed(2)),
          sourceLabel: `Lab ${lab.requestNumber}`,
          createdAt: lab.createdAt.toISOString(),
          alreadyInvoiced: invoicedRefs.has(lab.id),
        });
      }

      for (const img of imagingRequests) {
        unbilledItems.push({
          itemType: 'IMAGING',
          referenceId: img.id,
          description: `${img.imaging.name} (${img.imaging.modality})`,
          quantity: 1,
          unitPrice: Number((img.imaging.priceGHS || 0).toFixed(2)),
          sourceLabel: `Img ${img.requestNumber}`,
          createdAt: img.createdAt.toISOString(),
          alreadyInvoiced: invoicedRefs.has(img.id),
        });
      }

      for (const proc of procedureRecords) {
        unbilledItems.push({
          itemType: 'PROCEDURE',
          referenceId: proc.id,
          description: `${proc.procedure.name} (${proc.procedure.category})`,
          quantity: 1,
          unitPrice: Number((proc.chargeGHS || proc.procedure.priceGHS || 0).toFixed(2)),
          sourceLabel: `Proc ${proc.procedureNumber}`,
          createdAt: proc.createdAt.toISOString(),
          alreadyInvoiced: invoicedRefs.has(proc.id),
        });
      }

      return NextResponse.json({ unbilledItems });
    }

    const patientId = searchParams.get('patientId') || undefined;
    const status = searchParams.get('status') || undefined;
    const search = searchParams.get('search')?.trim() || '';

    const invoices = await prisma.clinicInvoice.findMany({
      where: {
        ...(patientId ? { patientId } : {}),
        ...(status ? { status } : {}),
        ...(search
          ? {
              OR: [
                { invoiceNumber: { contains: search } },
                { title: { contains: search } },
                { patient: { fullName: { contains: search } } },
                { patient: { patientNumber: { contains: search } } },
              ],
            }
          : {}),
      },
      include: {
        patient: {
          select: {
            id: true,
            patientNumber: true,
            fullName: true,
            phone: true,
            email: true,
            ghanaCardNumber: true,
            address: true,
          },
        },
        items: true,
        payments: { orderBy: { createdAt: 'desc' } },
        refunds: { orderBy: { createdAt: 'desc' } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return NextResponse.json({ invoices });
  } catch (error) {
    console.error('GET clinic billing error:', error);
    return NextResponse.json({ error: 'Failed to load clinic invoices' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authorizeClinicStaff(CLINIC_BILLING_ROLES);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 403 });
    }

    const body = await req.json();
    const { patientId, consultationId, title, items, discountAmount, adjustmentNote, notes, isDraft } = body;

    if (!patientId || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'patientId and at least one invoice item are required.' },
        { status: 400 }
      );
    }

    const computedItems = items.map((i: {
      itemType?: string;
      referenceId?: string;
      description: string;
      quantity?: number;
      unitPrice: number;
    }) => {
      const qty = Math.max(1, Number(i.quantity) || 1);
      const unit = Math.max(0, Number(i.unitPrice) || 0);
      return {
        itemType: i.itemType || 'SERVICE',
        referenceId: i.referenceId || null,
        description: String(i.description || 'Clinic Service').trim(),
        quantity: qty,
        unitPrice: unit,
        totalPrice: Number((qty * unit).toFixed(2)),
      };
    });

    const subtotal = Number(computedItems.reduce((s, i) => s + i.totalPrice, 0).toFixed(2));
    const discount = Math.min(subtotal, Math.max(0, Number(discountAmount) || 0));
    const totalAmount = Number((subtotal - discount).toFixed(2));

    const count = await prisma.clinicInvoice.count();
    const invoiceNumber = `WMC-INV-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}-${Math.floor(10 + Math.random() * 89)}`;

    const invoice = await prisma.clinicInvoice.create({
      data: {
        invoiceNumber,
        patientId,
        consultationId: consultationId || null,
        title: String(title || 'Clinic Visit & Services Bill'),
        subtotal,
        discountAmount: discount,
        adjustmentNote: adjustmentNote || null,
        totalAmount,
        amountPaid: 0,
        balance: totalAmount,
        status: isDraft ? 'DRAFT' : 'UNPAID',
        notes: notes || null,
        createdById: auth.userId || null,
        items: { create: computedItems },
      },
      include: {
        items: true,
        payments: true,
        refunds: true,
        patient: {
          select: {
            id: true,
            patientNumber: true,
            fullName: true,
            phone: true,
            email: true,
            ghanaCardNumber: true,
            address: true,
          },
        },
      },
    });

    await logClinicAudit({
      actorId: auth.userId,
      actorName: auth.name,
      actorRole: auth.clinicRole,
      action: 'CLINIC_INVOICE_CREATED',
      entityType: 'ClinicInvoice',
      entityId: invoice.id,
      details: { invoiceNumber, totalAmount, patientId },
    });

    return NextResponse.json({ invoice }, { status: 201 });
  } catch (error) {
    console.error('POST clinic billing error:', error);
    return NextResponse.json({ error: 'Failed to create clinic invoice' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await authorizeClinicStaff(CLINIC_BILLING_ROLES);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 403 });
    }

    const body = await req.json();
    const { action, invoiceId } = body;
    if (!invoiceId) return NextResponse.json({ error: 'invoiceId is required' }, { status: 400 });

    const existing = await prisma.clinicInvoice.findUnique({
      where: { id: invoiceId },
      include: { patient: { select: { id: true, userId: true, fullName: true } } },
    });
    if (!existing) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });

    if (action === 'record_payment') {
      const amount = Number(body.amount);
      const method = String(body.method || 'Cash').trim();
      const reference = body.reference
        ? String(body.reference).trim()
        : `WMC-CASH-${Date.now()}-${Math.floor(100 + Math.random() * 899)}`;

      if (!Number.isFinite(amount) || amount <= 0) {
        return NextResponse.json({ error: 'Valid positive payment amount in GHS is required.' }, { status: 400 });
      }
      if (existing.status === 'CANCELLED' || existing.status === 'REFUNDED') {
        return NextResponse.json({ error: `Cannot record payment on ${existing.status} invoice.` }, { status: 400 });
      }
      if (amount > existing.balance + 0.01) {
        return NextResponse.json(
          { error: `Payment (GH₵${amount.toFixed(2)}) exceeds outstanding balance (GH₵${existing.balance.toFixed(2)}).` },
          { status: 400 }
        );
      }

      const dup = await prisma.payment.findUnique({ where: { reference } });
      if (dup) {
        return NextResponse.json({ error: `Duplicate payment reference: ${reference}` }, { status: 409 });
      }

      const receiptNumber = `WMC-RCP-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;

      const result = await prisma.$transaction(async (tx) => {
        const payment = await tx.payment.create({
          data: {
            reference,
            clinicInvoiceId: existing.id,
            patientId: existing.patientId,
            title: existing.title,
            amount,
            currency: 'GHS',
            method,
            channel: 'offline',
            status: 'SUCCESSFUL',
            receiptNumber,
            verifiedAt: new Date(),
            recordedByStaff: auth.name || 'Cashier',
          },
        });

        const newPaid = Number((existing.amountPaid + amount).toFixed(2));
        const newBalance = Math.max(0, Number((existing.totalAmount - newPaid).toFixed(2)));
        const nextStatus = newBalance <= 0.01 ? 'PAID' : 'PARTIALLY_PAID';

        const invoice = await tx.clinicInvoice.update({
          where: { id: existing.id },
          data: {
            amountPaid: newPaid,
            balance: newBalance,
            status: nextStatus,
          },
          include: {
            items: true,
            payments: { orderBy: { createdAt: 'desc' } },
            refunds: { orderBy: { createdAt: 'desc' } },
            patient: {
              select: {
                id: true,
                patientNumber: true,
                fullName: true,
                phone: true,
                email: true,
                ghanaCardNumber: true,
                address: true,
              },
            },
          },
        });

        return { payment, invoice };
      }, { timeout: 20000 });

      await logClinicAudit({
        actorId: auth.userId,
        actorName: auth.name,
        actorRole: auth.clinicRole,
        action: 'CLINIC_PAYMENT_RECORDED',
        entityType: 'ClinicPayment',
        entityId: result.payment.id,
        details: { invoiceNumber: existing.invoiceNumber, amount, method, reference },
      });

      if (existing.patient?.userId) {
        await sendClinicNotification({
          userId: existing.patient.userId,
          title: 'Clinic Payment Confirmed',
          message: `Payment of GH₵${amount.toFixed(2)} for ${existing.invoiceNumber} confirmed (Receipt: ${receiptNumber}).`,
          type: 'PAYMENT',
          link: '/portal/clinic',
        });
      }

      return NextResponse.json(result);
    }

    if (action === 'refund') {
      const isAdmin =
        CLINIC_ADMIN_ROLES.includes(auth.clinicRole || '') || auth.role === 'SUPER_ADMIN';
      if (!isAdmin) {
        return NextResponse.json(
          { error: 'Forbidden: Only Clinic Administrators can authorize refunds.' },
          { status: 403 }
        );
      }

      const amount = Number(body.amount);
      const reason = String(body.reason || '').trim();
      if (!Number.isFinite(amount) || amount <= 0 || !reason) {
        return NextResponse.json({ error: 'Positive refund amount and reason are required.' }, { status: 400 });
      }
      if (amount > existing.amountPaid + 0.01) {
        return NextResponse.json({ error: 'Refund exceeds amount paid.' }, { status: 400 });
      }

      const result = await prisma.$transaction(async (tx) => {
        const refund = await tx.clinicRefund.create({
          data: {
            invoiceId: existing.id,
            paymentId: body.paymentId || null,
            amount,
            reason,
            approvedById: auth.userId || 'admin',
            approvedByName: auth.name || 'Clinic Admin',
          },
        });
        const newPaid = Math.max(0, Number((existing.amountPaid - amount).toFixed(2)));
        const newBalance = Number((existing.totalAmount - newPaid).toFixed(2));
        const nextStatus = newPaid <= 0 ? 'REFUNDED' : 'PARTIALLY_PAID';
        const invoice = await tx.clinicInvoice.update({
          where: { id: existing.id },
          data: { amountPaid: newPaid, balance: newBalance, status: nextStatus },
          include: {
            items: true,
            payments: { orderBy: { createdAt: 'desc' } },
            refunds: { orderBy: { createdAt: 'desc' } },
            patient: {
              select: {
                id: true,
                patientNumber: true,
                fullName: true,
                phone: true,
                email: true,
                ghanaCardNumber: true,
                address: true,
              },
            },
          },
        });
        return { refund, invoice };
      }, { timeout: 20000 });

      await logClinicAudit({
        actorId: auth.userId,
        actorName: auth.name,
        actorRole: auth.clinicRole,
        action: 'CLINIC_REFUND_ISSUED',
        entityType: 'ClinicRefund',
        entityId: result.refund.id,
        details: { invoiceNumber: existing.invoiceNumber, amount, reason },
      });

      return NextResponse.json(result);
    }

    if (action === 'issue_draft') {
      if (existing.status !== 'DRAFT') {
        return NextResponse.json({ error: 'Only DRAFT invoices can be finalized.' }, { status: 400 });
      }
      const updated = await prisma.clinicInvoice.update({
        where: { id: existing.id },
        data: { status: existing.balance <= 0.01 ? 'PAID' : 'UNPAID' },
        include: { items: true, payments: true, refunds: true, patient: { select: { id: true, patientNumber: true, fullName: true, phone: true, email: true, ghanaCardNumber: true, address: true } } },
      });
      return NextResponse.json({ invoice: updated });
    }

    if (action === 'cancel') {
      if (existing.amountPaid > 0) {
        return NextResponse.json(
          { error: 'Cannot cancel an invoice with recorded payments. Issue a refund instead.' },
          { status: 400 }
        );
      }
      const updated = await prisma.clinicInvoice.update({
        where: { id: existing.id },
        data: { status: 'CANCELLED', balance: 0 },
        include: { items: true, payments: true, refunds: true, patient: { select: { id: true, patientNumber: true, fullName: true, phone: true, email: true, ghanaCardNumber: true, address: true } } },
      });
      await logClinicAudit({
        actorId: auth.userId,
        actorName: auth.name,
        actorRole: auth.clinicRole,
        action: 'CLINIC_INVOICE_CANCELLED',
        entityType: 'ClinicInvoice',
        entityId: updated.id,
      });
      return NextResponse.json({ invoice: updated });
    }

    if (action === 'apply_discount') {
      if (existing.status === 'PAID') {
        return NextResponse.json(
          { error: 'Paid invoices cannot be altered directly without an authorized refund.' },
          { status: 403 }
        );
      }
      const discount = Math.min(existing.subtotal, Math.max(0, Number(body.discountAmount) || 0));
      const totalAmount = Number((existing.subtotal - discount).toFixed(2));
      const balance = Math.max(0, Number((totalAmount - existing.amountPaid).toFixed(2)));
      const updated = await prisma.clinicInvoice.update({
        where: { id: existing.id },
        data: {
          discountAmount: discount,
          adjustmentNote: String(body.reason || 'Authorized adjustment'),
          totalAmount,
          balance,
          status: balance <= 0.01 ? 'PAID' : existing.amountPaid > 0 ? 'PARTIALLY_PAID' : 'UNPAID',
        },
        include: {
          items: true,
          payments: { orderBy: { createdAt: 'desc' } },
          refunds: { orderBy: { createdAt: 'desc' } },
          patient: {
            select: {
              id: true,
              patientNumber: true,
              fullName: true,
              phone: true,
              email: true,
              ghanaCardNumber: true,
              address: true,
            },
          },
        },
      });
      await logClinicAudit({
        actorId: auth.userId,
        actorName: auth.name,
        actorRole: auth.clinicRole,
        action: 'CLINIC_INVOICE_ADJUSTED',
        entityType: 'ClinicInvoice',
        entityId: updated.id,
        details: { discountAmount: discount, reason: body.reason },
      });
      return NextResponse.json({ invoice: updated });
    }

    return NextResponse.json({ error: 'Unknown billing action' }, { status: 400 });
  } catch (error) {
    console.error('PATCH clinic billing error:', error);
    return NextResponse.json({ error: 'Billing operation failed' }, { status: 500 });
  }
}
