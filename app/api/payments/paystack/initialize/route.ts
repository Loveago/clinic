import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { initializePaystackPayment } from '@/lib/paystack';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const body = await req.json();
    const { invoiceId, clinicInvoiceId, amount, callbackUrl } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Valid payment amount in GHS is required' }, { status: 400 });
    }

    let student = null;
    let email = user?.email || 'applicant@welllife.org';
    let invoice = null;
    let clinicInvoice = null;

    if (user) {
      student = await prisma.student.findUnique({
        where: { userId: user.id },
      });
      email = user.email;
    }

    if (clinicInvoiceId) {
      clinicInvoice = await prisma.clinicInvoice.findUnique({
        where: { id: clinicInvoiceId },
        include: { patient: true },
      });
      if (!clinicInvoice) {
        return NextResponse.json({ error: 'Clinic invoice not found' }, { status: 404 });
      }
      if (clinicInvoice.status === 'CANCELLED' || clinicInvoice.status === 'REFUNDED') {
        return NextResponse.json({ error: 'Cannot pay a cancelled or refunded clinic invoice.' }, { status: 400 });
      }
      if (clinicInvoice.balance <= 0 || clinicInvoice.status === 'PAID') {
        return NextResponse.json({ error: 'This clinic invoice is already fully paid.' }, { status: 400 });
      }
      if (Number(amount) > clinicInvoice.balance + 0.01) {
        return NextResponse.json(
          { error: `Amount (GH₵${Number(amount).toFixed(2)}) exceeds outstanding clinic balance (GH₵${clinicInvoice.balance.toFixed(2)}).` },
          { status: 400 }
        );
      }
      if (clinicInvoice.patient?.email) {
        email = clinicInvoice.patient.email;
      }
    }

    if (invoiceId) {
      invoice = await prisma.invoice.findUnique({
        where: { id: invoiceId },
        include: { student: { include: { user: true } } },
      });
      if (!invoice) {
        return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
      }
      if (invoice.status === 'CANCELLED') {
        return NextResponse.json({ error: 'Cannot pay a cancelled invoice.' }, { status: 400 });
      }
      if (invoice.balance <= 0 || invoice.status === 'PAID') {
        return NextResponse.json({ error: 'This invoice is already fully paid.' }, { status: 400 });
      }
      if (Number(amount) > invoice.balance + 0.01) {
        return NextResponse.json(
          { error: `Amount (GH₵${Number(amount).toFixed(2)}) exceeds outstanding invoice balance (GH₵${invoice.balance.toFixed(2)}).` },
          { status: 400 }
        );
      }
      if (invoice?.student?.user?.email) {
        email = invoice.student.user.email;
      }
    }

    const reference = `WLS-GH-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    // Create pending payment in database
    await prisma.payment.create({
      data: {
        reference,
        studentId: student?.id || invoice?.studentId || null,
        invoiceId: invoice?.id || null,
        clinicInvoiceId: clinicInvoice?.id || null,
        patientId: clinicInvoice?.patientId || null,
        title: invoice ? invoice.title : clinicInvoice ? clinicInvoice.title : 'Action Health Educational & Clinical Fee (Ghana)',
        amount: Number(amount),
        currency: 'GHS',
        method: 'Paystack Ghana (MoMo / Card)',
        channel: 'paystack',
        status: 'PENDING',
        receiptNumber: `PENDING-${reference}`,
      },
    });

    const initResult = await initializePaystackPayment({
      email,
      amountInGHS: Number(amount),
      reference,
      callbackUrl,
      metadata: {
        invoiceId: invoice?.id,
        studentId: student?.id,
        platform: 'Action Health Ghana Portal',
      },
    });

    if (!initResult.status) {
      return NextResponse.json({ error: initResult.message || 'Payment initialization failed' }, { status: 400 });
    }

    return NextResponse.json({
      status: true,
      authorizationUrl: initResult.data?.authorization_url,
      reference,
      accessCode: initResult.data?.access_code,
    });
  } catch (error: any) {
    console.error('Paystack initialization API error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

