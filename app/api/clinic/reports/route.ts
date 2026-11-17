import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizeClinicStaff, CLINIC_ADMIN_ROLES, getAccraDateString } from '@/lib/clinic-auth';

export async function GET(req: NextRequest) {
  try {
    const auth = await authorizeClinicStaff();
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 403 });
    }

    const { searchParams } = new URL(req.url);
    const from = searchParams.get('from') || getAccraDateString(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
    const to = searchParams.get('to') || getAccraDateString();
    const format = searchParams.get('format') || 'json';
    const section = searchParams.get('section') || 'financial';

    const fromDate = new Date(`${from}T00:00:00.000Z`);
    const toDate = new Date(`${to}T23:59:59.999Z`);
    const today = getAccraDateString();

    const [
      totalPatients,
      newPatientsInRange,
      appointments,
      payments,
      outstandingInvoices,
      refunds,
      medicines,
      movements,
      labRequests,
    ] = await Promise.all([
      prisma.patient.count(),
      prisma.patient.count({ where: { createdAt: { gte: fromDate, lte: toDate } } }),
      prisma.appointment.findMany({
        where: { preferredDate: { gte: from, lte: to } },
        select: { status: true, preferredDate: true },
      }),
      prisma.payment.findMany({
        where: { clinicInvoiceId: { not: null }, status: 'SUCCESSFUL', createdAt: { gte: fromDate, lte: toDate } },
        select: { amount: true, method: true, createdAt: true, receiptNumber: true },
      }),
      prisma.clinicInvoice.findMany({
        where: { status: { in: ['UNPAID', 'PARTIALLY_PAID'] } },
        include: { patient: { select: { patientNumber: true, fullName: true } } },
      }),
      prisma.clinicRefund.findMany({
        where: { createdAt: { gte: fromDate, lte: toDate } },
      }),
      prisma.medicine.findMany({
        include: { batches: true },
      }),
      prisma.stockMovement.findMany({
        where: { createdAt: { gte: fromDate, lte: toDate } },
        include: { medicine: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
      prisma.labRequest.findMany({
        where: { createdAt: { gte: fromDate, lte: toDate } },
        select: { status: true, priority: true },
      }),
    ]);

    const isAdmin =
      CLINIC_ADMIN_ROLES.includes(auth.clinicRole || '') || auth.role === 'SUPER_ADMIN';
    const auditLogs = isAdmin
      ? await prisma.auditLog.findMany({
          where: {
            entityType: {
              in: [
                'Patient',
                'Appointment',
                'ClinicQueue',
                'Consultation',
                'Prescription',
                'Medicine',
                'LabRequest',
                'LabResult',
                'ClinicInvoice',
                'ClinicPayment',
                'ClinicRefund',
                'ClinicStaffProfile',
              ],
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 50,
        })
      : [];

    const totalRevenueGHS = Number(payments.reduce((s, p) => s + p.amount, 0).toFixed(2));
    const totalRefundsGHS = Number(refunds.reduce((s, r) => s + r.amount, 0).toFixed(2));
    const outstandingTotalGHS = Number(outstandingInvoices.reduce((s, i) => s + i.balance, 0).toFixed(2));

    const byMethod: Record<string, number> = {};
    for (const p of payments) {
      byMethod[p.method] = Number(((byMethod[p.method] || 0) + p.amount).toFixed(2));
    }

    const lowStock = medicines
      .map((m) => ({
        id: m.id,
        name: m.name,
        reorderLevel: m.reorderLevel,
        available: m.batches.filter((b) => b.expiryDate >= today).reduce((s, b) => s + b.quantityAvailable, 0),
      }))
      .filter((m) => m.available <= m.reorderLevel);

    const expiredBatches = medicines.flatMap((m) =>
      m.batches
        .filter((b) => b.quantityAvailable > 0 && b.expiryDate < today)
        .map((b) => ({ medicineName: m.name, batchNumber: b.batchNumber, expiryDate: b.expiryDate, quantity: b.quantityAvailable }))
    );

    if (format === 'csv') {
      let rows: string[] = [];
      if (section === 'pharmacy') {
        rows = [
          'Medicine,AvailableStock,ReorderLevel,Status',
          ...medicines.map((m) => {
            const avail = m.batches.filter((b) => b.expiryDate >= today).reduce((s, b) => s + b.quantityAvailable, 0);
            return `"${m.name}",${avail},${m.reorderLevel},${avail <= m.reorderLevel ? 'LOW_STOCK' : 'OK'}`;
          }),
        ];
      } else {
        rows = [
          'ReceiptNumber,AmountGHS,Method,Date',
          ...payments.map((p) => `"${p.receiptNumber}",${p.amount.toFixed(2)},"${p.method}","${p.createdAt.toISOString()}"`),
        ];
      }
      return new NextResponse(rows.join('\n'), {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="clinic-${section}-report-${from}-to-${to}.csv"`,
        },
      });
    }

    return NextResponse.json({
      range: { from, to },
      currency: 'GHS',
      patientReport: { totalPatients, newPatientsInRange },
      appointmentReport: {
        total: appointments.length,
        completed: appointments.filter((a) => a.status === 'COMPLETED').length,
        cancelled: appointments.filter((a) => a.status === 'CANCELLED' || a.status === 'DECLINED').length,
        noShow: appointments.filter((a) => a.status === 'NO_SHOW').length,
      },
      financialReport: {
        totalRevenueGHS,
        totalRefundsGHS,
        netRevenueGHS: Number((totalRevenueGHS - totalRefundsGHS).toFixed(2)),
        outstandingTotalGHS,
        outstandingCount: outstandingInvoices.length,
        byMethod,
      },
      pharmacyReport: {
        totalMedicines: medicines.length,
        lowStockCount: lowStock.length,
        lowStock,
        expiredBatchesCount: expiredBatches.length,
        expiredBatches,
        recentMovementsCount: movements.length,
      },
      labReport: {
        totalRequests: labRequests.length,
        completed: labRequests.filter((r) => r.status === 'COMPLETED' || r.status === 'REVIEWED').length,
        pending: labRequests.filter((r) => ['REQUESTED', 'SAMPLE_COLLECTED', 'PROCESSING'].includes(r.status)).length,
      },
      auditLogs,
    });
  } catch (error) {
    console.error('GET clinic reports error:', error);
    return NextResponse.json({ error: 'Failed to generate clinic reports' }, { status: 500 });
  }
}
