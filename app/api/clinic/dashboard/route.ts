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
    const departmentId = searchParams.get('departmentId') || undefined;
    const startOfDay = new Date(`${dateParam}T00:00:00.000Z`);
    const endOfDay = new Date(`${dateParam}T23:59:59.999Z`);
    const monthPrefix = dateParam.slice(0, 7);
    const startOfMonth = new Date(`${monthPrefix}-01T00:00:00.000Z`);

    const thirtyDaysLater = getAccraDateString(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));

    const [
      totalPatients,
      activePatients,
      newPatientsToday,
      newPatientsThisMonth,
      todaysAppointments,
      cancelledAppointments,
      noShowAppointments,
      waitingCount,
      consultingCount,
      completedConsultations,
      unpaidInvoices,
      partialPaymentsCount,
      todaysPayments,
      monthlyPayments,
      refundsCount,
      medicines,
      expiringBatches,
      expiredBatches,
      pendingLabRequests,
      resultsAwaitingReview,
      prescriptionsAwaitingDispensing,
      pendingReferrals,
      upcomingAppointments,
      queueOverview,
      recentActivities,
    ] = await Promise.all([
      prisma.patient.count({ where: { status: { notIn: ['ARCHIVED', 'MERGED'] } } }),
      prisma.patient.count({ where: { status: 'ACTIVE' } }),
      prisma.patient.count({ where: { createdAt: { gte: startOfDay, lte: endOfDay } } }),
      prisma.patient.count({ where: { createdAt: { gte: startOfMonth, lte: endOfDay } } }),
      prisma.appointment.count({
        where: {
          preferredDate: dateParam,
          status: { notIn: ['CANCELLED', 'DECLINED'] },
          ...(departmentId ? { departmentId } : {}),
        },
      }),
      prisma.appointment.count({
        where: {
          preferredDate: dateParam,
          status: { in: ['CANCELLED', 'DECLINED'] },
          ...(departmentId ? { departmentId } : {}),
        },
      }),
      prisma.appointment.count({
        where: {
          preferredDate: dateParam,
          status: 'NO_SHOW',
          ...(departmentId ? { departmentId } : {}),
        },
      }),
      prisma.clinicQueue.count({
        where: {
          queueDate: dateParam,
          status: { in: ['WAITING', 'CALLED'] },
          ...(departmentId ? { departmentId } : {}),
        },
      }),
      prisma.clinicQueue.count({
        where: {
          queueDate: dateParam,
          status: 'IN_CONSULTATION',
          ...(departmentId ? { departmentId } : {}),
        },
      }),
      prisma.consultation.count({
        where: { status: { in: ['COMPLETED', 'SIGNED'] }, completedAt: { gte: startOfDay, lte: endOfDay } },
      }),
      prisma.clinicInvoice.aggregate({
        where: { status: { in: ['UNPAID', 'PARTIALLY_PAID'] } },
        _sum: { balance: true },
        _count: { id: true },
      }),
      prisma.clinicInvoice.count({ where: { status: 'PARTIALLY_PAID' } }),
      prisma.payment.aggregate({
        where: {
          clinicInvoiceId: { not: null },
          status: 'SUCCESSFUL',
          createdAt: { gte: startOfDay, lte: endOfDay },
        },
        _sum: { amount: true },
      }),
      prisma.payment.aggregate({
        where: {
          clinicInvoiceId: { not: null },
          status: 'SUCCESSFUL',
          createdAt: { gte: startOfMonth, lte: endOfDay },
        },
        _sum: { amount: true },
      }),
      prisma.clinicRefund.count({ where: { createdAt: { gte: startOfMonth, lte: endOfDay } } }),
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
        where: { status: { in: ['REQUESTED', 'SAMPLE_COLLECTED', 'PROCESSING'] } },
      }),
      prisma.labRequest.count({
        where: { status: 'COMPLETED' },
      }),
      prisma.prescription.count({
        where: { status: { in: ['ISSUED', 'PARTIALLY_DISPENSED'] } },
      }),
      prisma.referral.count({
        where: { status: { in: ['SENT', 'ACCEPTED'] } },
      }),
      prisma.appointment.findMany({
        where: {
          preferredDate: { gte: dateParam },
          status: { in: ['PENDING', 'SCHEDULED', 'CONFIRMED'] },
          ...(departmentId ? { departmentId } : {}),
        },
        include: {
          patient: { select: { id: true, patientNumber: true, fullName: true } },
          department: { select: { name: true } },
          service: { select: { title: true } },
        },
        orderBy: [{ preferredDate: 'asc' }, { preferredTime: 'asc' }],
        take: 8,
      }),
      prisma.clinicQueue.findMany({
        where: {
          queueDate: dateParam,
          status: { in: ['WAITING', 'CALLED', 'IN_CONSULTATION'] },
          ...(departmentId ? { departmentId } : {}),
        },
        include: {
          patient: { select: { id: true, patientNumber: true, fullName: true } },
          department: { select: { name: true } },
        },
        orderBy: [{ priority: 'asc' }, { checkedInAt: 'asc' }],
        take: 10,
      }),
      prisma.auditLog.findMany({
        where: {
          entityType: {
            in: [
              'Patient',
              'PatientAllergy',
              'PatientConsent',
              'TriageRecord',
              'Appointment',
              'ClinicQueue',
              'Consultation',
              'Prescription',
              'Medicine',
              'LabRequest',
              'LabResult',
              'ImagingRequest',
              'ProcedureRecord',
              'Referral',
              'ClinicInvoice',
              'ClinicPayment',
              'ClinicRefund',
              'ClinicStaffProfile',
              'ClinicConfiguration',
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
        activePatients,
        newPatientsToday,
        newPatientsThisMonth,
        todaysAppointments,
        waitingCount,
        consultingCount,
        completedConsultations,
        cancelledAppointments,
        noShowAppointments,
        outstandingBillsCount: unpaidInvoices._count.id || 0,
        outstandingBillsGHS: Number((unpaidInvoices._sum.balance || 0).toFixed(2)),
        partialPaymentsCount,
        todaysRevenueGHS: Number((todaysPayments._sum.amount || 0).toFixed(2)),
        monthlyRevenueGHS: Number((monthlyPayments._sum.amount || 0).toFixed(2)),
        refundsCount,
        totalMedicineItems: medicines.length,
        lowStockCount: lowStockMedicines.length,
        expiringSoonCount: expiringBatches,
        expiredCount: expiredBatches,
        pendingLabRequests,
        resultsAwaitingReview,
        prescriptionsAwaitingDispensing,
        pendingReferrals,
      },
      lowStockMedicines: lowStockMedicines.slice(0, 8).map((m) => ({
        id: m.id,
        name: m.name,
        reorderLevel: m.reorderLevel,
        available: m.batches.reduce((s, b) => s + b.quantityAvailable, 0),
      })),
      upcomingAppointments,
      queueOverview,
      recentActivities,
    });
  } catch (error) {
    console.error('GET clinic dashboard error:', error);
    return NextResponse.json({ error: 'Failed to load clinic dashboard' }, { status: 500 });
  }
}
