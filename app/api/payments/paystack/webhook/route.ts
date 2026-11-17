import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPaystackWebhookSignature } from '@/lib/paystack';
import { sendNotificationOnce } from '@/lib/school-admin';

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-paystack-signature');

    const isValid = verifyPaystackWebhookSignature(rawBody, signature);
    const allowUnsignedDev = process.env.NODE_ENV !== 'production' && !signature;

    if (!isValid && !allowUnsignedDev) {
      return NextResponse.json({ error: 'Invalid Paystack webhook signature' }, { status: 401 });
    }

    const eventData = JSON.parse(rawBody || '{}');
    const { event, data } = eventData;

    await prisma.paystackWebhookLog.create({
      data: {
        event: event || 'unknown',
        reference: data?.reference || 'N/A',
        payloadJson: rawBody,
        processed: true,
      },
    });

    if (event === 'charge.success' && data?.reference) {
      const reference = String(data.reference);
      const amountGHS = data.amount ? data.amount / 100 : 0;

      const existing = await prisma.payment.findUnique({
        where: { reference },
        include: { invoice: true, student: { include: { user: true } } },
      });

      // Idempotency guard: duplicate webhook for an already SUCCESSFUL payment must not double-credit
      if (existing && existing.status !== 'SUCCESSFUL') {
        const effectiveAmount = amountGHS > 0 ? amountGHS : existing.amount;
        const receiptNumber = existing.receiptNumber.startsWith('RCP-GH')
          ? existing.receiptNumber
          : `RCP-GH-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;

        await prisma.$transaction(async (tx) => {
          await tx.payment.update({
            where: { reference },
            data: {
              status: 'SUCCESSFUL',
              paystackStatus: 'success',
              paystackRef: String(data.id || reference),
              verifiedAt: new Date(),
              receiptNumber,
              receiptPdfUrl: `/portal/student/receipts/${reference}`,
            },
          });

          if (existing.invoiceId) {
            const inv = await tx.invoice.findUnique({ where: { id: existing.invoiceId } });
            if (inv && inv.status !== 'CANCELLED') {
              const credit = Math.min(inv.balance, effectiveAmount);
              const newPaid = inv.amountPaid + credit;
              const newBalance = Math.max(0, inv.amount - (inv.discountAmount || 0) - newPaid);
              await tx.invoice.update({
                where: { id: inv.id },
                data: {
                  amountPaid: newPaid,
                  balance: Math.max(0, newBalance),
                  status: newBalance <= 0.01 ? 'PAID' : 'PARTIAL',
                  isLocked: true,
                },
              });
              await tx.paymentAllocation.create({
                data: {
                  paymentId: existing.id,
                  invoiceId: inv.id,
                  amount: credit,
                },
              });
            }
          }

          if (existing.clinicInvoiceId) {
            const cinv = await tx.clinicInvoice.findUnique({ where: { id: existing.clinicInvoiceId } });
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
        });

        if (existing.student?.userId) {
          await sendNotificationOnce({
            userId: existing.student.userId,
            title: 'Payment Confirmed (Paystack)',
            message: `Payment of GH₵${effectiveAmount.toFixed(2)} (${reference}) confirmed. Receipt #${receiptNumber}.`,
            type: 'payment',
            link: `/portal/student/receipts/${reference}`,
            dedupeKey: `paystack-verified-${reference}`,
          });
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error('Paystack webhook error:', err);
    return NextResponse.json({ error: 'Webhook processing error' }, { status: 500 });
  }
}
