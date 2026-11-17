import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getCurrentUser();
    let student = null;
    if (user?.id) {
      student = await prisma.student.findUnique({
        where: { userId: user.id },
        include: { user: true, programme: true },
      });
    }
    if (!student) {
      student = await prisma.student.findFirst({
        where: { studentId: 'WNS/GH/2025/001' },
        include: { user: true, programme: true },
      });
    }

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    const [invoices, payments, discounts, paymentPlans] = await Promise.all([
      prisma.invoice.findMany({
        where: { studentId: student.id },
        include: { payments: true, items: true },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.payment.findMany({
        where: { studentId: student.id },
        include: { invoice: true },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.feeDiscount.findMany({
        where: { studentId: student.id, approvalStatus: 'APPROVED' },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.paymentPlan.findMany({
        where: { studentId: student.id },
        include: { installments: { orderBy: { installmentNo: 'asc' } } },
      }),
    ]);

    const activeInvoices = invoices.filter((inv) => inv.status !== 'CANCELLED');
    const totalInvoiced = activeInvoices.reduce((sum, inv) => sum + inv.amount, 0);
    const totalPaid = payments
      .filter((p) => p.status === 'SUCCESSFUL')
      .reduce((sum, p) => sum + p.amount, 0);
    const outstandingBalance = activeInvoices.reduce((sum, inv) => sum + Math.max(0, inv.balance), 0);

    return NextResponse.json({
      currency: 'GHS',
      currencySymbol: 'GH₵',
      student,
      summary: {
        totalInvoiced,
        totalPaid,
        outstandingBalance,
      },
      invoices,
      payments,
      discounts,
      paymentPlans,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

