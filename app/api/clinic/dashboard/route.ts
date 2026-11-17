import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizeClinicStaff, getAccraDateString } from '@/lib/clinic-auth';

export async function GET(req: NextRequest) {
  try {
    const auth = await authorizeClinicStaff();
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 403 });
    }

    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get('date') || getAccraDateString();
    const startOfDay = new Date(`${dateParam}T00:00:00.000Z`);
    const endOfDay = new Date(`${dateParam}T23:59:59.999Z`);

    const thirtyDaysLater = getAccraDateString(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));

    const [
      totalPatients,
      newPatientsToday,
      todaysAppointments,
      cancelledAppointments,
      waitingCount,
      consultingCount,
      completedConsultations,
      unpaidInvoices,
      todaysPayments,
      medicines,
      expiringBatches,
      expiredBatches,
      pendingLabRequests,
      recentActivities,
    ] = await Promise.all([
      prisma.patient.count({ where: { status: { not: 'ARCHIVED' } } }),
      prisma.patient.count({
        where: { createdAt: { gte: startOfDay, lte: endOfDay } },
      }),
      prisma.appointment.count({
        where: { preferredDate: dateParam, status: { notIn: ['CANCELLED', 'DECLINED'] } },
      }),
      prisma.appointment.count({
        where: { preferredDate: dateParam, status: { in: ['CANCELLED', 'DECLINED'] } },
      }),
      prisma.clinicQueue.count({
        where: { queueDate: dateParam, status: { in: ['WAITING', 'CALLED'] } },
      }),
      prisma.clinicQueue.count({
        where: { queueDate: dateParam, status: 'IN_CONSULTATION' },
      }),
      prisma.consultation.count({
        where: { status: 'COMPLETED', completedAt: { gte: startOfDay, lte: endOfDay } },
      }),
      prisma.clinicInvoice.aggregate({
        where: { status: { in: ['UNPAID', 'PARTIALLY_PAID'] } },
        _sum: { balance: true },
        _count: { id: true },
      }),
      prisma.payment.aggregate({
        where: {
          clinicInvoiceId: { not: null },
          status: 'SUCCESSFUL',
          createdAt: { gte: startOfDay, lte: endOfDay },
        },
        _sum: { amount: true },
      }),
      prisma.medicine.findMany({
        where: { isActive: true },
        include: {
          batches: {
            where: { quantityAvailable: { gt: 0 }, expiryDate: { gte: dateParam } },
            select: { quantityAvailable: true },
          },
        },
      }),
      prisma.medicineBatch.count({
        where: {
          quantityAvailable: { gt: 0 },
          expiryDate: { gte: dateParam, lte: thirtyDaysLater },
        },
      }),
      prisma.medicineBatch.count({
        where: {
          quantityAvailable: { gt: 0 },
          expiryDate: { lt: dateParam },
        },
      }),
      prisma.labRequest.count({
        where: { status: { in: ['REQUESTED', 'SAMPLE_COLLECTED', 'PROCESSING', 'COMPLETED'] } },
      }),
      prisma.auditLog.findMany({
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
        take: 15,
      }),
    ]);

    const lowStockMedicines = medicines.filter((m) => {
      const avail = m.batches.reduce((sum, b) => sum + b.quantityAvailable, 0);
      return avail <= m.reorderLevel;
    });

    return NextResponse.json({
      date: dateParam,
      timezone: 'Africa/Accra',
      currency: 'GHS',
      kpis: {
        totalPatients,
        newPatientsToday,
        todaysAppointments,
        waitingCount,
        consultingCount,
        completedConsultations,
        cancelledAppointments,
        outstandingBillsCount: unpaidInvoices._count.id || 0,
        outstandingBillsGHS: Number((unpaidInvoices._sum.balance || 0).toFixed(2)),
        todaysRevenueGHS: Number((todaysPayments._sum.amount || 0).toFixed(2)),
        lowStockCount: lowStockMedicines.length,
        expiringSoonCount: expiringBatches,
        expiredCount: expiredBatches,
        pendingLabRequests,
      },
      lowStockMedicines: lowStockMedicines.slice(0, 8).map((m) => ({
        id: m.id,
        name: m.name,
        reorderLevel: m.reorderLevel,
        available: m.batches.reduce((s, b) => s + b.quantityAvailable, 0),
      })),
      recentActivities,
    });
  } catch (error) {
    console.error('GET clinic dashboard error:', error);
    return NextResponse.json({ error: 'Failed to load clinic dashboard' }, { status: 500 });
  }
}
