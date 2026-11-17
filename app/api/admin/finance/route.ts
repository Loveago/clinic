import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizeRole, FINANCE_ROLES, SCHOOL_STAFF_ROLES } from '@/lib/portal-auth';
import { recordAuditLog, sendNotificationOnce } from '@/lib/school-admin';

export async function GET(req: NextRequest) {
  try {
    const auth = await authorizeRole(SCHOOL_STAFF_ROLES);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 403 });
    }

    const { searchParams } = new URL(req.url);
    const format = searchParams.get('format');
    const report = searchParams.get('report') || 'reconciliation';

    const [invoices, payments, feeTemplates, discounts, paymentPlans, feeStructures] = await Promise.all([
      prisma.invoice.findMany({
        include: {
          student: {
            include: {
              user: { select: { id: true, name: true, email: true, phone: true } },
              programme: { select: { id: true, name: true, code: true } },
            },
          },
          items: { include: { feeCategory: true } },
          payments: true,
          discounts: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.payment.findMany({
        include: {
          student: {
            include: { user: { select: { name: true, email: true } }, programme: { select: { name: true, code: true } } },
          },
          invoice: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.studentFee.findMany({
        include: { student: { include: { user: true } } },
      }),
      prisma.feeDiscount.findMany({
        include: {
          student: { include: { user: { select: { name: true, email: true } }, programme: true } },
          invoice: { select: { invoiceNumber: true, title: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.paymentPlan.findMany({
        include: {
          student: { include: { user: { select: { name: true } } } },
          invoice: { select: { invoiceNumber: true, title: true, balance: true } },
          installments: { orderBy: { installmentNo: 'asc' } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.feeStructure.findMany({
        where: { isActive: true },
        include: { programme: true, items: { include: { feeCategory: true } } },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const activeInvoices = invoices.filter((i) => i.status !== 'CANCELLED');
    const successfulPayments = payments.filter((p) => p.status === 'SUCCESSFUL');
    const failedPayments = payments.filter((p) => p.status === 'FAILED' || p.status === 'ABANDONED');

    const totalCollected = successfulPayments.reduce((sum, p) => sum + p.amount, 0);
    const totalInvoiced = activeInvoices.reduce((sum, i) => sum + i.amount, 0);
    const totalDiscounts = activeInvoices.reduce((sum, i) => sum + (i.discountAmount || 0), 0);
    const totalOutstanding = activeInvoices.reduce((sum, i) => sum + Math.max(0, i.balance), 0);
    const collectionRate = totalInvoiced > 0 ? Math.round((totalCollected / totalInvoiced) * 100) : 0;

    // Breakdowns
    const byProgrammeMap = new Map<string, { programme: string; invoiced: number; collected: number; outstanding: number }>();
    for (const inv of activeInvoices) {
      const key = inv.student?.programme?.name || 'General';
      const cur = byProgrammeMap.get(key) || { programme: key, invoiced: 0, collected: 0, outstanding: 0 };
      cur.invoiced += inv.amount;
      cur.collected += inv.amountPaid;
      cur.outstanding += inv.balance;
      byProgrammeMap.set(key, cur);
    }

    const byMethodMap = new Map<string, { method: string; count: number; total: number }>();
    for (const p of successfulPayments) {
      const cur = byMethodMap.get(p.method) || { method: p.method, count: 0, total: 0 };
      cur.count += 1;
      cur.total += p.amount;
      byMethodMap.set(p.method, cur);
    }

    const byCategoryMap = new Map<string, { category: string; total: number }>();
    for (const inv of activeInvoices) {
      for (const it of inv.items || []) {
        const key = it.feeCategory?.name || it.title;
        const cur = byCategoryMap.get(key) || { category: key, total: 0 };
        cur.total += it.amount;
        byCategoryMap.set(key, cur);
      }
    }

    if (format === 'csv') {
      let csv = '';
      if (report === 'outstanding') {
        csv = 'Invoice No,Student ID,Student Name,Programme,Title,Total (GHS),Paid (GHS),Balance (GHS),Due Date,Status\n';
        csv += activeInvoices
          .filter((i) => i.balance > 0)
          .map(
            (i) =>
              `"${i.invoiceNumber}","${i.student.studentId}","${i.student.user.name}","${i.student.programme.name}","${i.title}",${i.amount.toFixed(2)},${i.amountPaid.toFixed(2)},${i.balance.toFixed(2)},"${i.dueDate}","${i.status}"`
          )
          .join('\n');
      } else {
        csv = 'Receipt No,Reference,Student,Method,Channel,Amount (GHS),Currency,Status,Verified At\n';
        csv += payments
          .map(
            (p) =>
              `"${p.receiptNumber}","${p.reference}","${p.student?.user?.name || 'Applicant'}","${p.method}","${p.channel}",${p.amount.toFixed(2)},"${p.currency}","${p.status}","${p.verifiedAt ? new Date(p.verifiedAt).toISOString() : ''}"`
          )
          .join('\n');
      }
      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="welllife-finance-${report}.csv"`,
        },
      });
    }

    return NextResponse.json({
      currency: 'GHS',
      currencySymbol: 'GH₵',
      stats: {
        totalInvoiced,
        totalCollected,
        totalOutstanding,
        totalDiscounts,
        collectionRate,
        paidCount: activeInvoices.filter((i) => i.status === 'PAID').length,
        partialCount: activeInvoices.filter((i) => i.status === 'PARTIAL').length,
        unpaidCount: activeInvoices.filter((i) => i.status === 'UNPAID' || i.status === 'ISSUED').length,
        overdueCount: activeInvoices.filter((i) => i.status === 'OVERDUE').length,
        successfulTxCount: successfulPayments.length,
        failedTxCount: failedPayments.length,
      },
      breakdowns: {
        byProgramme: Array.from(byProgrammeMap.values()),
        byMethod: Array.from(byMethodMap.values()),
        byCategory: Array.from(byCategoryMap.values()),
      },
      invoices,
      payments,
      feeTemplates,
      discounts,
      paymentPlans,
      feeStructures,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authorizeRole(FINANCE_ROLES);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 403 });
    }

    const body = await req.json();
    const { action } = body;

    // 1. Record approved offline cash / bank draft payment in GHS
    if (action === 'record_offline_payment') {
      const { invoiceId, amount, method } = body;
      if (!invoiceId || !amount || Number(amount) <= 0) {
        return NextResponse.json({ error: 'Invoice ID and positive Amount in GHS are required' }, { status: 400 });
      }

      const invoice = await prisma.invoice.findUnique({
        where: { id: invoiceId },
        include: { student: { include: { user: true } } },
      });

      if (!invoice) {
        return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
      }
      if (invoice.status === 'CANCELLED') {
        return NextResponse.json({ error: 'Cannot record payment against a cancelled invoice.' }, { status: 400 });
      }

      const payAmount = Number(amount);
      if (payAmount > invoice.balance + 0.01) {
        return NextResponse.json(
          { error: `Payment (GH₵${payAmount.toFixed(2)}) exceeds outstanding balance (GH₵${invoice.balance.toFixed(2)}).` },
          { status: 400 }
        );
      }

      const receiptNumber = `RCP-GH-OFFLINE-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
      const reference = `OFFLINE-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;

      const { payment, updatedInvoice } = await prisma.$transaction(async (tx) => {
        const createdPayment = await tx.payment.create({
          data: {
            reference,
            studentId: invoice.studentId,
            invoiceId: invoice.id,
            title: `Offline Verified Payment - ${invoice.title}`,
            amount: payAmount,
            currency: 'GHS',
            method: method || 'Offline Bank Deposit / Cashier Receipt',
            channel: 'offline',
            status: 'SUCCESSFUL',
            receiptNumber,
            recordedByStaff: auth.name || 'Finance Officer',
            verifiedAt: new Date(),
            receiptPdfUrl: `/portal/student/receipts/${reference}`,
          },
        });

        await tx.paymentAllocation.create({
          data: {
            paymentId: createdPayment.id,
            invoiceId: invoice.id,
            amount: payAmount,
          },
        });

        const newPaid = invoice.amountPaid + payAmount;
        const newBalance = Math.max(0, invoice.amount - (invoice.discountAmount || 0) - newPaid);
        const newStatus = newBalance <= 0.01 ? 'PAID' : 'PARTIAL';

        const updatedInv = await tx.invoice.update({
          where: { id: invoice.id },
          data: {
            amountPaid: newPaid,
            balance: Math.max(0, newBalance),
            status: newStatus,
            isLocked: true,
          },
        });

        return { payment: createdPayment, updatedInvoice: updatedInv };
      });

      if (invoice.student?.userId) {
        await sendNotificationOnce({
          userId: invoice.student.userId,
          title: 'Payment Receipt Issued',
          message: `Offline payment of GH₵${payAmount.toFixed(2)} confirmed for ${invoice.invoiceNumber}. Receipt #${receiptNumber}.`,
          type: 'payment',
          link: `/portal/student/receipts/${reference}`,
          dedupeKey: `offline-pay-${payment.id}`,
        });
      }

      await recordAuditLog({
        actorId: auth.userId,
        actorName: auth.name || 'Finance Officer',
        actorRole: auth.role || 'FINANCE_OFFICER',
        action: 'RECORD_OFFLINE_PAYMENT',
        entityType: 'Invoice',
        entityId: invoice.id,
        details: { amount: payAmount, reference, receiptNumber },
      });

      return NextResponse.json({
        status: true,
        payment,
        invoice: updatedInvoice,
        message: 'Offline payment recorded in GHS and receipt issued!',
      });
    }

    // 2. Generate invoices (single student, selected students, or entire programme/level from FeeStructure)
    if (action === 'generate_invoices') {
      const { feeStructureId, studentIds, programmeId, level, dueDate, title, amount, academicYear, semester } = body;

      let targetStudents: any[] = [];
      if (Array.isArray(studentIds) && studentIds.length > 0) {
        targetStudents = await prisma.student.findMany({
          where: { id: { in: studentIds }, status: { in: ['ACTIVE', 'ADMITTED', 'REGISTRATION_PENDING'] } },
          include: { user: true, programme: true },
        });
      } else if (body.studentId) {
        const st = await prisma.student.findUnique({
          where: { id: body.studentId },
          include: { user: true, programme: true },
        });
        if (st) targetStudents = [st];
      } else if (programmeId) {
        targetStudents = await prisma.student.findMany({
          where: {
            programmeId,
            ...(level ? { level } : {}),
            status: { in: ['ACTIVE', 'ADMITTED', 'REGISTRATION_PENDING'] },
          },
          include: { user: true, programme: true },
        });
      }

      if (targetStudents.length === 0) {
        return NextResponse.json({ error: 'No eligible active students matched for invoicing.' }, { status: 400 });
      }

      const structure = feeStructureId
        ? await prisma.feeStructure.findUnique({
            where: { id: feeStructureId },
            include: { items: true },
          })
        : null;

      const totalFromStructure = structure
        ? structure.items.reduce((sum, it) => sum + it.amount, 0)
        : Number(amount || 0);

      if (totalFromStructure <= 0) {
        return NextResponse.json({ error: 'Invoice amount must be greater than GH₵0.00.' }, { status: 400 });
      }

      const createdInvoices = await prisma.$transaction(async (tx) => {
        const list = [];
        for (const st of targetStudents) {
          const invNum = `INV-GH-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 899999)}`;
          const inv = await tx.invoice.create({
            data: {
              invoiceNumber: invNum,
              studentId: st.id,
              feeStructureId: structure?.id || null,
              title: title || structure?.name || `${st.level} ${st.currentSemester} Fees`,
              amount: totalFromStructure,
              balance: totalFromStructure,
              academicYear: academicYear || structure?.academicYear || st.academicYear,
              semester: semester || structure?.semester || st.currentSemester,
              dueDate: dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
              status: 'ISSUED',
              ...(structure?.items?.length
                ? {
                    items: {
                      create: structure.items.map((it) => ({
                        feeCategoryId: it.feeCategoryId,
                        title: it.title,
                        amount: it.amount,
                      })),
                    },
                  }
                : {}),
            },
          });
          list.push({ inv, userId: st.userId });
        }
        return list;
      });

      for (const item of createdInvoices) {
        await sendNotificationOnce({
          userId: item.userId,
          title: 'New Fee Invoice Issued',
          message: `Invoice ${item.inv.invoiceNumber} (${item.inv.title}) for GH₵${item.inv.amount.toFixed(2)} is due on ${item.inv.dueDate}.`,
          type: 'invoice',
          link: '/portal/student/payments',
          dedupeKey: `invoice-issued-${item.inv.id}`,
        });
      }

      await recordAuditLog({
        actorId: auth.userId,
        actorName: auth.name || 'Finance Officer',
        actorRole: auth.role || 'FINANCE_OFFICER',
        action: 'GENERATE_INVOICES',
        entityType: 'Invoice',
        entityId: createdInvoices.map((c) => c.inv.id).join(','),
        details: { count: createdInvoices.length, totalPerStudent: totalFromStructure },
      });

      return NextResponse.json({
        status: true,
        count: createdInvoices.length,
        invoices: createdInvoices.map((c) => c.inv),
      }, { status: 201 });
    }

    // 3. Cancel invoice (protected if payments already received)
    if (action === 'cancel_invoice') {
      const { invoiceId } = body;
      const inv = await prisma.invoice.findUnique({ where: { id: invoiceId } });
      if (!inv) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
      if (inv.amountPaid > 0 || inv.isLocked) {
        return NextResponse.json(
          { error: 'Cannot cancel an invoice that has already received verified payments.' },
          { status: 400 }
        );
      }
      const updated = await prisma.invoice.update({
        where: { id: invoiceId },
        data: { status: 'CANCELLED', balance: 0 },
      });
      return NextResponse.json({ status: true, invoice: updated });
    }

    // 4. Scholarships, Bursaries & Discounts (Phase 11)
    if (action === 'create_discount') {
      const { studentId, invoiceId, type, title, adjustmentAmount, reason, autoApprove } = body;
      if (!studentId || !title || !adjustmentAmount || !reason) {
        return NextResponse.json({ error: 'Student, title, amount, and reason are required.' }, { status: 400 });
      }
      const adj = Number(adjustmentAmount);
      const inv = invoiceId ? await prisma.invoice.findUnique({ where: { id: invoiceId } }) : null;
      const canAutoApprove = Boolean(autoApprove) && (auth.role === 'SUPER_ADMIN' || adj <= 1000);

      const discount = await prisma.$transaction(async (tx) => {
        const created = await tx.feeDiscount.create({
          data: {
            studentId,
            invoiceId: invoiceId || null,
            type: type || 'DISCOUNT',
            title,
            originalAmount: inv?.amount || 0,
            adjustmentAmount: adj,
            reason,
            approvalStatus: canAutoApprove ? 'APPROVED' : 'PENDING',
            requestedBy: auth.name || 'Finance Officer',
            approvedBy: canAutoApprove ? auth.name || 'Super Admin' : null,
            approvedAt: canAutoApprove ? new Date() : null,
          },
        });

        if (canAutoApprove && inv && inv.status !== 'CANCELLED') {
          const nextDiscount = (inv.discountAmount || 0) + adj;
          const nextBalance = Math.max(0, inv.amount - nextDiscount - inv.amountPaid);
          await tx.invoice.update({
            where: { id: inv.id },
            data: {
              discountAmount: nextDiscount,
              balance: nextBalance,
              status: nextBalance <= 0.01 ? 'PAID' : inv.amountPaid > 0 ? 'PARTIAL' : inv.status,
            },
          });
        }
        return created;
      });

      return NextResponse.json({ status: true, discount }, { status: 201 });
    }

    if (action === 'approve_discount' || action === 'reject_discount') {
      const { discountId } = body;
      const existing = await prisma.feeDiscount.findUnique({ where: { id: discountId } });
      if (!existing) return NextResponse.json({ error: 'Adjustment not found' }, { status: 404 });
      if (existing.approvalStatus !== 'PENDING') {
        return NextResponse.json({ error: 'Adjustment has already been processed.' }, { status: 400 });
      }

      if (existing.adjustmentAmount > 1000 && !['SUPER_ADMIN', 'SCHOOL_ADMIN'].includes(auth.role || '')) {
        return NextResponse.json(
          { error: 'High-value adjustments above GH₵1,000 require Super Admin or School Admin approval.' },
          { status: 403 }
        );
      }

      const nextStatus = action === 'approve_discount' ? 'APPROVED' : 'REJECTED';
      const updated = await prisma.$transaction(async (tx) => {
        const d = await tx.feeDiscount.update({
          where: { id: discountId },
          data: {
            approvalStatus: nextStatus,
            approvedBy: auth.name || 'Administrator',
            approvedAt: new Date(),
          },
        });
        if (nextStatus === 'APPROVED' && d.invoiceId) {
          const inv = await tx.invoice.findUnique({ where: { id: d.invoiceId } });
          if (inv && inv.status !== 'CANCELLED') {
            const nextDiscount = (inv.discountAmount || 0) + d.adjustmentAmount;
            const nextBalance = Math.max(0, inv.amount - nextDiscount - inv.amountPaid);
            await tx.invoice.update({
              where: { id: inv.id },
              data: {
                discountAmount: nextDiscount,
                balance: nextBalance,
                status: nextBalance <= 0.01 ? 'PAID' : inv.amountPaid > 0 ? 'PARTIAL' : inv.status,
              },
            });
          }
        }
        return d;
      });

      return NextResponse.json({ status: true, discount: updated });
    }

    // 5. Create Payment Plan / Instalment Schedule
    if (action === 'create_payment_plan') {
      const { invoiceId, title, installments } = body;
      const inv = await prisma.invoice.findUnique({ where: { id: invoiceId } });
      if (!inv) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
      if (!Array.isArray(installments) || installments.length === 0) {
        return NextResponse.json({ error: 'At least one instalment is required.' }, { status: 400 });
      }

      const plan = await prisma.paymentPlan.create({
        data: {
          studentId: inv.studentId,
          invoiceId: inv.id,
          title: title || `Instalment Plan - ${inv.invoiceNumber}`,
          totalAmount: inv.balance,
          createdBy: auth.name || 'Finance Officer',
          installments: {
            create: installments.map((inst: any, idx: number) => ({
              installmentNo: idx + 1,
              amount: Number(inst.amount),
              dueDate: inst.dueDate,
              status: 'PENDING',
            })),
          },
        },
        include: { installments: true },
      });

      return NextResponse.json({ status: true, paymentPlan: plan }, { status: 201 });
    }

    return NextResponse.json({ error: 'Unsupported finance action' }, { status: 400 });
  } catch (error: any) {
    console.error('Finance API error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
