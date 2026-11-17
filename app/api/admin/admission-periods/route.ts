import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizeRole, ADMISSIONS_ROLES } from '@/lib/portal-auth';
import { ensureDefaultSchoolSetup, recordAuditLog } from '@/lib/school-admin';

export async function GET() {
  try {
    await ensureDefaultSchoolSetup();
    const [periods, programmes] = await Promise.all([
      prisma.admissionPeriod.findMany({
        include: {
          programmeAdmissions: { include: { programme: true } },
          _count: { select: { applications: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.programme.findMany({ orderBy: { name: 'asc' } }),
    ]);

    return NextResponse.json({ periods, programmes });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch admission periods' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authorizeRole(ADMISSIONS_ROLES);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 403 });
    }

    const body = await req.json();
    const {
      name,
      academicYear,
      semester,
      openDate,
      closeDate,
      applicationFeeGHS,
      maxApplications,
      isActive,
      requiredDocs,
      instructions,
      programmeIds,
    } = body;

    if (!name || !academicYear || !openDate || !closeDate) {
      return NextResponse.json(
        { error: 'Period name, academic year, open date, and close date are required.' },
        { status: 400 }
      );
    }

    const period = await prisma.admissionPeriod.create({
      data: {
        name,
        academicYear,
        semester: semester || 'First Semester',
        openDate,
        closeDate,
        applicationFeeGHS: Number(applicationFeeGHS ?? 150),
        maxApplications: maxApplications ? Number(maxApplications) : null,
        isActive: isActive !== false,
        requiredDocsJson: JSON.stringify(
          Array.isArray(requiredDocs) && requiredDocs.length > 0
            ? requiredDocs
            : ['WASSCE / SSSCE Results Slip', 'Birth Certificate / Ghana Card', 'Passport Photograph']
        ),
        instructions: instructions || null,
      },
    });

    const targetProgrammes =
      Array.isArray(programmeIds) && programmeIds.length > 0
        ? await prisma.programme.findMany({ where: { id: { in: programmeIds } } })
        : await prisma.programme.findMany();

    for (const prog of targetProgrammes) {
      await prisma.programmeAdmission.create({
        data: {
          admissionPeriodId: period.id,
          programmeId: prog.id,
          isOpen: true,
          entryRequirements: prog.requirements,
        },
      });
    }

    await recordAuditLog({
      actorId: auth.userId,
      actorName: auth.name || 'Admissions Officer',
      actorRole: auth.role || 'ADMISSIONS_OFFICER',
      action: 'CREATE_ADMISSION_PERIOD',
      entityType: 'AdmissionPeriod',
      entityId: period.id,
      details: { name, academicYear },
    });

    return NextResponse.json({ period }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to create admission period' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await authorizeRole(ADMISSIONS_ROLES);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 403 });
    }

    const body = await req.json();
    const { id, isActive, openDate, closeDate, applicationFeeGHS, maxApplications, requiredDocs, programmeConfig } = body;

    if (!id) {
      return NextResponse.json({ error: 'Admission period ID is required' }, { status: 400 });
    }

    if (programmeConfig && programmeConfig.programmeId) {
      await prisma.programmeAdmission.upsert({
        where: {
          admissionPeriodId_programmeId: {
            admissionPeriodId: id,
            programmeId: programmeConfig.programmeId,
          },
        },
        update: {
          isOpen: programmeConfig.isOpen ?? true,
          quota: programmeConfig.quota ? Number(programmeConfig.quota) : null,
          entryRequirements: programmeConfig.entryRequirements ?? undefined,
          feeOverrideGHS: programmeConfig.feeOverrideGHS ? Number(programmeConfig.feeOverrideGHS) : null,
        },
        create: {
          admissionPeriodId: id,
          programmeId: programmeConfig.programmeId,
          isOpen: programmeConfig.isOpen ?? true,
          quota: programmeConfig.quota ? Number(programmeConfig.quota) : null,
          entryRequirements: programmeConfig.entryRequirements || null,
          feeOverrideGHS: programmeConfig.feeOverrideGHS ? Number(programmeConfig.feeOverrideGHS) : null,
        },
      });
    }

    const updated = await prisma.admissionPeriod.update({
      where: { id },
      data: {
        ...(isActive !== undefined ? { isActive: Boolean(isActive) } : {}),
        ...(openDate !== undefined ? { openDate } : {}),
        ...(closeDate !== undefined ? { closeDate } : {}),
        ...(applicationFeeGHS !== undefined ? { applicationFeeGHS: Number(applicationFeeGHS) } : {}),
        ...(maxApplications !== undefined ? { maxApplications: maxApplications ? Number(maxApplications) : null } : {}),
        ...(Array.isArray(requiredDocs) ? { requiredDocsJson: JSON.stringify(requiredDocs) } : {}),
      },
      include: {
        programmeAdmissions: { include: { programme: true } },
        _count: { select: { applications: true } },
      },
    });

    await recordAuditLog({
      actorId: auth.userId,
      actorName: auth.name || 'Admissions Officer',
      actorRole: auth.role || 'ADMISSIONS_OFFICER',
      action: 'UPDATE_ADMISSION_PERIOD',
      entityType: 'AdmissionPeriod',
      entityId: id,
    });

    return NextResponse.json({ period: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update admission period' }, { status: 500 });
  }
}

