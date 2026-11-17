import { prisma } from '@/lib/prisma';

export const DEFAULT_REGISTRATION_CHECKLIST = [
  { key: 'offer_accepted', label: 'Admission offer accepted', required: true },
  { key: 'documents_submitted', label: 'Required documents submitted & verified', required: true },
  { key: 'identity_verified', label: 'Identity verification completed', required: true },
  { key: 'initial_fees', label: 'Initial fee requirements satisfied', required: true },
  { key: 'info_confirmed', label: 'Student personal & guardian info confirmed', required: true },
  { key: 'programme_assigned', label: 'Programme & academic level assigned', required: true },
  { key: 'account_activated', label: 'Student portal account activated', required: true },
];

export async function ensureDefaultSchoolSetup() {
  let settings = await prisma.schoolSettings.findUnique({ where: { id: 'default' } });
  if (!settings) {
    settings = await prisma.schoolSettings.create({
      data: {
        id: 'default',
        registrationChecklistJson: JSON.stringify(DEFAULT_REGISTRATION_CHECKLIST),
      },
    });
  }

  const periodCount = await prisma.admissionPeriod.count();
  if (periodCount === 0) {
    const period = await prisma.admissionPeriod.create({
      data: {
        name: '2025/2026 Main Academic Intake',
        academicYear: '2025/2026',
        semester: 'First Semester',
        openDate: '2025-01-15',
        closeDate: '2026-12-31',
        applicationFeeGHS: 150,
        isActive: true,
        requiredDocsJson: JSON.stringify([
          'WASSCE / SSSCE Results Slip',
          'Birth Certificate / Ghana Card',
          'Passport Photograph',
        ]),
        instructions: 'Upload clear PDF, JPG, or PNG copies of your academic transcripts and Ghana Card.',
      },
    });

    const programmes = await prisma.programme.findMany();
    for (const prog of programmes) {
      await prisma.programmeAdmission.upsert({
        where: {
          admissionPeriodId_programmeId: {
            admissionPeriodId: period.id,
            programmeId: prog.id,
          },
        },
        update: {},
        create: {
          admissionPeriodId: period.id,
          programmeId: prog.id,
          isOpen: true,
          entryRequirements: prog.requirements,
        },
      });
    }
  }

  const catCount = await prisma.feeCategory.count();
  if (catCount === 0) {
    const defaults = [
      { code: 'TUITION', name: 'Tuition Fees', description: 'Core academic programme tuition' },
      { code: 'REG', name: 'Registration Fees', description: 'Semester registration & student ID' },
      { code: 'EXAM', name: 'Examination Fees', description: 'End-of-semester & N&MC indexing fees' },
      { code: 'LAB', name: 'Laboratory Fees', description: 'Anatomy & nursing skills lab consumables' },
      { code: 'CLINICAL', name: 'Clinical / Practical Fees', description: 'Hospital rotation & clinical supervision' },
      { code: 'LIBRARY', name: 'Library & ICT Fees', description: 'Digital library & LMS access' },
      { code: 'ACCOM', name: 'Accommodation Fees', description: 'Campus hostel boarding charges' },
    ];
    for (const c of defaults) {
      await prisma.feeCategory.upsert({
        where: { code: c.code },
        update: {},
        create: c,
      });
    }
  }

  return settings;
}

export async function generateNextStudentId(tx: any = prisma): Promise<string> {
  let settings = await tx.schoolSettings.findUnique({ where: { id: 'default' } });
  if (!settings) {
    settings = await tx.schoolSettings.create({
      data: {
        id: 'default',
        registrationChecklistJson: JSON.stringify(DEFAULT_REGISTRATION_CHECKLIST),
      },
    });
  }

  const nextSeq = (settings.studentIdSeq || 100) + 1;
  await tx.schoolSettings.update({
    where: { id: 'default' },
    data: { studentIdSeq: nextSeq },
  });

  const year = String(new Date().getFullYear());
  const padded = String(nextSeq).padStart(4, '0');
  const format = settings.studentIdFormat || 'WNS/GH/{YEAR}/{SEQ}';
  let candidate = format.replace('{YEAR}', year).replace('{SEQ}', padded);

  const exists = await tx.student.findUnique({ where: { studentId: candidate } });
  if (exists) {
    candidate = `${candidate}-${Math.floor(10 + Math.random() * 90)}`;
  }
  return candidate;
}

export async function recordAuditLog(params: {
  actorId?: string | null;
  actorName: string;
  actorRole: string;
  action: string;
  entityType: string;
  entityId: string;
  details?: Record<string, any>;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: params.actorId || null,
        actorName: params.actorName,
        actorRole: params.actorRole,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        detailsJson: params.details ? JSON.stringify(params.details) : null,
      },
    });
  } catch (e) {
    console.error('AuditLog write error:', e);
  }
}

export async function sendNotificationOnce(params: {
  userId: string;
  title: string;
  message: string;
  type?: string;
  link?: string;
  dedupeKey?: string;
}) {
  try {
    if (params.dedupeKey) {
      const existing = await prisma.notification.findUnique({
        where: { dedupeKey: params.dedupeKey },
      });
      if (existing) return existing;
    }

    return await prisma.notification.create({
      data: {
        userId: params.userId,
        title: params.title,
        message: params.message,
        type: params.type || 'info',
        link: params.link || null,
        dedupeKey: params.dedupeKey || null,
      },
    });
  } catch (e: any) {
    // Ignore unique constraint race on dedupeKey
    if (e?.code === 'P2002') return null;
    console.error('Notification error:', e);
    return null;
  }
}

