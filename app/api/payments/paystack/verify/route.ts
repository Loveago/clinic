import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPaystackPayment } from '@/lib/paystack';
import { sendNotificationOnce } from '@/lib/school-admin';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { reference } = body;

    if (!reference) {
      return NextResponse.json({ error: 'Transaction reference is required' }, { status: 400 });
    }

    const existingPayment = await prisma.payment.findUnique({
      where: { reference },
      include: { invoice: true, student: { include: { user: true } } },
    });

    // Idempotency guard: if already verified & successful, do NOT double-credit the invoice
    if (existingPayment?.status === 'SUCCESSFUL') {
      return NextResponse.json({
        status: true,
        alreadyVerified: true,
        message: 'Payment already verified and credited.',
        payment: existingPayment,
        receiptNumber: existingPayment.receiptNumber,
      });
    }

    const verifyResult = await verifyPaystackPayment(reference);

    if (!verifyResult.status || verifyResult.data?.status !== 'success') {
      if (existingPayment) {
        await prisma.payment.update({
          where: { reference },
          data: { status: 'FAILED', paystackStatus: verifyResult.data?.status || 'failed' },
        });
      }
      return NextResponse.json(
        {
          status: false,
          message: verifyResult.message || 'Payment verification failed at Paystack',
        },
        { status: 400 }
      );
    }

    const payData = verifyResult.data;
    if (payData.currency && payData.currency !== 'GHS') {
      return NextResponse.json(
        { status: false, message: `Invalid currency ${payData.currency}. Expected GHS.` },
        { status: 400 }
      );
    }

    const paidAmountGHS = payData.amount ? payData.amount / 100 : 0;
    const effectiveAmount =
      payData.domain === 'test' && existingPayment?.amount
        ? existingPayment.amount
        : paidAmountGHS > 0
        ? paidAmountGHS
        : existingPayment?.amount || 0;
    if (effectiveAmount <= 0) {
      return NextResponse.json({ status: false, message: 'Invalid payment amount.' }, { status: 400 });
    }

    const receiptNumber = existingPayment?.receiptNumber?.startsWith('RCP-GH')
      ? existingPayment.receiptNumber
      : `RCP-GH-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;

    const methodLabel =
      payData.channel === 'mobile_money' ? 'Mobile Money (MTN / Telecel)' : 'Card / Bank';

    const updatedPayment = await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.upsert({
        where: { reference },
        update: {
          status: 'SUCCESSFUL',
          amount: effectiveAmount,
          currency: 'GHS',
          paystackStatus: payData.status,
          paystackRef: String(payData.id || reference),
          verifiedAt: new Date(),
          receiptNumber,
          method: methodLabel,
          receiptPdfUrl: `/portal/student/receipts/${reference}`,
        },
        create: {
          reference,
          title: 'Action Health Ghana Educational Fee Payment',
          amount: effectiveAmount,
          currency: 'GHS',
          method: methodLabel,
          channel: 'paystack',
          status: 'SUCCESSFUL',
          paystackStatus: 'success',
          paystackRef: String(payData.id || reference),
          receiptNumber,
          verifiedAt: new Date(),
          receiptPdfUrl: `/portal/student/receipts/${reference}`,
        },
      });

      if (existingPayment?.invoiceId) {
        const inv = await tx.invoice.findUnique({ where: { id: existingPayment.invoiceId } });
        if (inv && inv.status !== 'CANCELLED') {
          const credit = Math.min(inv.balance, effectiveAmount);
          const newPaid = inv.amountPaid + credit;
          const newBalance = Math.max(0, inv.amount - (inv.discountAmount || 0) - newPaid);
          const newStatus = newBalance <= 0.01 ? 'PAID' : 'PARTIAL';

          await tx.invoice.update({
            where: { id: inv.id },
            data: {
              amountPaid: newPaid,
              balance: Math.max(0, newBalance),
              status: newStatus,
              isLocked: true,
            },
          });

          await tx.paymentAllocation.create({
            data: {
              paymentId: payment.id,
              invoiceId: inv.id,
              amount: credit,
            },
          });
        }
      }

      if (existingPayment?.clinicInvoiceId) {
        const cinv = await tx.clinicInvoice.findUnique({ where: { id: existingPayment.clinicInvoiceId } });
        if (cinv && cinv.status !== 'CANCELLED' && cinv.status !== 'REFUNDED') {
          const credit = Math.min(cinv.balance, effectiveAmount);
          const newPaid = Number((cinv.amountPaid + credit).toFixed(2));
          const newBalance = Math.max(0, Number((cinv.totalAmount - newPaid).toFixed(2)));
          await tx.clinicInvoice.update({
            where: { id: cinv.id },
            data: {
              amountPaid: newPaid,
              balance: newBalance,
              status: newBalance <= 0.01 ? 'PAID' : 'PARTIALLY_PAID',
            },
          });
        }
      }

      return payment;
    });

    if (existingPayment?.student?.userId) {
      await sendNotificationOnce({
        userId: existingPayment.student.userId,
        title: 'Payment Successful (Paystack Ghana)',
        message: `Your payment of GH₵${effectiveAmount.toFixed(2)} with reference ${reference} has been confirmed. Receipt #${receiptNumber} generated.`,
        type: 'payment',
        link: `/portal/student/receipts/${reference}`,
        dedupeKey: `paystack-verified-${reference}`,
      });
    }

    return NextResponse.json({
      status: true,
      message: 'Payment verified and credited successfully',
      payment: updatedPayment,
      receiptNumber,
    });
  } catch (error: any) {
    console.error('Paystack verify error:', error);
    return NextResponse.json({ error: error.message || 'Verification error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const reference = searchParams.get('reference');
  if (!reference) {
    return NextResponse.json({ error: 'Reference query parameter required' }, { status: 400 });
  }
  return POST(
    new NextRequest(req.url, {
      method: 'POST',
      body: JSON.stringify({ reference }),
      headers: { 'Content-Type': 'application/json' },
    })
  );
}
