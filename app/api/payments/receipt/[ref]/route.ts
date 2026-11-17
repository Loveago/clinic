import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest, { params }: { params: Promise<{ ref: string }> }) {
  try {
    const { ref } = await params;

    const payment = await prisma.payment.findFirst({
      where: {
        OR: [{ reference: ref }, { receiptNumber: ref }],
      },
      include: {
        student: {
          include: {
            user: true,
            programme: true,
          },
        },
        invoice: true,
      },
    });

    if (!payment) {
      return NextResponse.json({ error: 'Receipt not found' }, { status: 404 });
    }

    return NextResponse.json({
      institution: {
        name: 'Action Boat Medical Centre / Homeopathy & Action Health College',
        location: 'Tema Michel Camp (Gbetsile Pure Oil), Greater Accra, Ghana',
        phone: '+233 24 412 3456 / +233 30 212 3456',
        email: 'actiondoctor2019@gmail.com / actionhealthcollege@gmail.com',
        accreditation: 'Accredited by the Nursing & Midwifery Council (N&MC) of Ghana',
      },
      payment: {
        receiptNumber: payment.receiptNumber,
        reference: payment.reference,
        paystackRef: payment.paystackRef,
        amount: payment.amount,
        currency: 'GHS',
        currencySymbol: 'GH₵',
        paymentMethod: payment.method,
        channel: payment.channel,
        status: payment.status,
        date: payment.createdAt,
        verifiedAt: payment.verifiedAt,
      },
      student: payment.student
        ? {
            studentId: payment.student.studentId,
            name: payment.student.user.name,
            email: payment.student.user.email,
            programme: payment.student.programme.name,
            level: payment.student.level,
          }
        : null,
      invoice: payment.invoice
        ? {
            invoiceNumber: payment.invoice.invoiceNumber,
            title: payment.invoice.title,
            totalAmount: payment.invoice.amount,
            amountPaid: payment.invoice.amountPaid,
            balance: payment.invoice.balance,
          }
        : null,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

