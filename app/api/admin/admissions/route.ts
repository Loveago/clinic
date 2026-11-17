import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizeRole, ADMISSIONS_ROLES, REGISTRAR_ROLES } from '@/lib/portal-auth';
import { ensureDefaultSchoolSetup, recordAuditLog, sendNotificationOnce } from '@/lib/school-admin';

export async function GET(req: NextRequest) {
  try {
    const auth = await authorizeRole([...new Set([...ADMISSIONS_ROLES, ...REGISTRAR_ROLES])]);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 403 });
    }

    await ensureDefaultSchoolSetup();

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const programmeId = searchParams.get('programmeId');
    const admissionPeriodId = searchParams.get('admissionPeriodId');
    const search = searchParams.get('search');

    const where: any = {};
    if (status) where.status = status;
    if (programmeId) where.programmeId = programmeId;
    if (admissionPeriodId) where.admissionPeriodId = admissionPeriodId;
    if (search) {
      where.OR = [
        { referenceNumber: { contains: search } },
        { applicantName: { contains: search } },
        { applicantEmail: { contains: search } },
        { applicantPhone: { contains: search } },
      ];
    }

    const [applications, allApps, periods, programmes, reviewers] = await Promise.all([
      prisma.application.findMany({
        where,
        include: {
          programme: true,
          admissionPeriod: true,
          payments: true,
          offer: true,
          _count: { select: { documents: true, reviews: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.application.findMany({
        select: {
          id: true,
          status: true,
          programmeId: true,
          admissionPeriodId: true,
          createdAt: true,
          programme: { select: { name: true, code: true } },
          admissionPeriod: { select: { name: true } },
        },
      }),
      prisma.admissionPeriod.findMany({ orderBy: { createdAt: 'desc' } }),
      prisma.programme.findMany({ orderBy: { name: 'asc' } }),
      prisma.user.findMany({
        where: { role: { in: ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMISSIONS_OFFICER', 'REGISTRAR'] } },
        select: { id: true, name: true, email: true, role: true },
      }),
    ]);

    const countBy = (statuses: string[]) =>
      allApps.filter((a) => statuses.includes(a.status)).length;

    const kpis = {
      total: allApps.length,
      newSubmitted: countBy(['SUBMITTED', 'PAYMENT_PENDING']),
      underReview: countBy(['UNDER_REVIEW']),
      awaitingDocuments: countBy(['AWAITING_DOCUMENTS']),
      accepted: countBy(['ACCEPTED', 'APPROVED']),
      rejected: countBy(['REJECTED']),
      waitlisted: countBy(['WAITLISTED']),
      admissionAccepted: countBy(['ADMISSION_ACCEPTED', 'REGISTRATION_PENDING']),
      registered: countBy(['REGISTERED', 'ENROLLED']),
    };

    const byProgrammeMap = new Map<string, { programmeId: string; code: string; name: string; count: number }>();
    for (const a of allApps) {
      const cur = byProgrammeMap.get(a.programmeId) || {
        programmeId: a.programmeId,
        code: a.programme?.code || 'PRG',
        name: a.programme?.name || 'Programme',
        count: 0,
      };
      cur.count += 1;
      byProgrammeMap.set(a.programmeId, cur);
    }

    const byPeriodMap = new Map<string, { periodName: string; count: number }>();
    for (const a of allApps) {
      const key = a.admissionPeriodId || 'unassigned';
      const cur = byPeriodMap.get(key) || {
        periodName: a.admissionPeriod?.name || 'General Intake',
        count: 0,
      };
      cur.count += 1;
      byPeriodMap.set(key, cur);
    }

    const needsAttention = applications
      .filter((a) => ['SUBMITTED', 'UNDER_REVIEW', 'AWAITING_DOCUMENTS', 'ADMISSION_ACCEPTED'].includes(a.status))
      .slice(0, 8);

    return NextResponse.json({
      kpis,
      byProgramme: Array.from(byProgrammeMap.values()),
      byPeriod: Array.from(byPeriodMap.values()),
      needsAttention,
      applications,
      periods,
      programmes,
      reviewers,
    });
  } catch (error: any) {
    console.error('Admissions list error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authorizeRole(ADMISSIONS_ROLES);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 403 });
    }

    const body = await req.json();
    const { action, applicationIds, reviewerId, reviewerName, status, reason, title, message } = body;

    if (!Array.isArray(applicationIds) || applicationIds.length === 0) {
      return NextResponse.json({ error: 'Select at least one application.' }, { status: 400 });
    }

    if (action === 'assign_reviewer') {
      await prisma.application.updateMany({
        where: { id: { in: applicationIds } },
        data: {
          assignedReviewerId: reviewerId || auth.userId || null,
          assignedReviewerName: reviewerName || auth.name || 'Admissions Officer',
        },
      });
      for (const appId of applicationIds) {
        await prisma.applicationReview.create({
          data: {
            applicationId: appId,
            newStatus: 'ASSIGNED',
            reviewerId: auth.userId || null,
            reviewerName: auth.name || 'Admissions Officer',
            action: 'ASSIGN_REVIEWER',
            reason: `Assigned to ${reviewerName || 'Admissions Officer'}`,
          },
        });
      }
      return NextResponse.json({ success: true, updated: applicationIds.length });
    }

    if (action === 'bulk_status') {
      const allowedBulk = ['UNDER_REVIEW', 'AWAITING_DOCUMENTS', 'WAITLISTED'];
      if (!allowedBulk.includes(status) && !body.confirmed) {
        return NextResponse.json(
          { error: 'Consequential bulk status changes require explicit confirmation.' },
          { status: 400 }
        );
      }

      const targets = await prisma.application.findMany({ where: { id: { in: applicationIds } } });
      await prisma.$transaction(async (tx) => {
        for (const app of targets) {
          await tx.application.update({
            where: { id: app.id },
            data: { status, decisionDate: new Date() },
          });
          await tx.applicationReview.create({
            data: {
              applicationId: app.id,
              previousStatus: app.status,
              newStatus: status,
              reviewerId: auth.userId || null,
              reviewerName: auth.name || 'Admissions Officer',
              action: 'STATUS_CHANGE',
              reason: reason || `Bulk status update to ${status}`,
            },
          });
        }
      });

      await recordAuditLog({
        actorId: auth.userId,
        actorName: auth.name || 'Admissions Officer',
        actorRole: auth.role || 'ADMISSIONS_OFFICER',
        action: 'BULK_APPLICATION_STATUS',
        entityType: 'Application',
        entityId: applicationIds.join(','),
        details: { status, count: applicationIds.length },
      });

      return NextResponse.json({ success: true, updated: targets.length });
    }

    if (action === 'send_notification') {
      const targets = await prisma.application.findMany({
        where: { id: { in: applicationIds } },
        select: { id: true, applicantEmail: true, referenceNumber: true },
      });
      let sent = 0;
      for (const app of targets) {
        const user = await prisma.user.findUnique({ where: { email: app.applicantEmail.toLowerCase() } });
        if (user) {
          await sendNotificationOnce({
            userId: user.id,
            title: title || 'Admissions Update',
            message: message || `Update regarding your application ${app.referenceNumber}.`,
            type: 'admission',
            link: `/school/track?ref=${app.referenceNumber}`,
          });
          sent += 1;
        }
      }
      return NextResponse.json({ success: true, notified: sent });
    }

    return NextResponse.json({ error: 'Invalid bulk operation' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Bulk action failed' }, { status: 500 });
  }
}
