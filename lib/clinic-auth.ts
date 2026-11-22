import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export const CLINIC_ALL_STAFF_ROLES = [
  'CLINIC_SUPER_ADMIN',
  'CLINIC_ADMIN',
  'RECEPTIONIST',
  'DOCTOR',
  'NURSE',
  'MIDWIFE',
  'PHARMACIST',
  'LAB_TECH',
  'RADIOLOGY_STAFF',
  'CASHIER',
  'RECORDS_OFFICER',
];

export const CLINIC_SUPER_ADMIN_ROLES = ['CLINIC_SUPER_ADMIN'];
export const CLINIC_ADMIN_ROLES = ['CLINIC_SUPER_ADMIN', 'CLINIC_ADMIN'];
export const CLINIC_RECEPTION_ROLES = [
  'CLINIC_SUPER_ADMIN',
  'CLINIC_ADMIN',
  'RECEPTIONIST',
  'NURSE',
  'MIDWIFE',
  'DOCTOR',
  'RECORDS_OFFICER',
];
export const CLINIC_NURSING_ROLES = ['CLINIC_SUPER_ADMIN', 'CLINIC_ADMIN', 'NURSE', 'MIDWIFE', 'DOCTOR'];
export const CLINIC_CLINICIAN_ROLES = ['CLINIC_SUPER_ADMIN', 'CLINIC_ADMIN', 'DOCTOR', 'NURSE', 'MIDWIFE'];
export const CLINIC_DOCTOR_ROLES = ['CLINIC_SUPER_ADMIN', 'CLINIC_ADMIN', 'DOCTOR'];
export const CLINIC_PHARMACY_ROLES = ['CLINIC_SUPER_ADMIN', 'CLINIC_ADMIN', 'PHARMACIST'];
export const CLINIC_LAB_ROLES = ['CLINIC_SUPER_ADMIN', 'CLINIC_ADMIN', 'LAB_TECH', 'DOCTOR'];
export const CLINIC_LAB_REVIEW_ROLES = ['CLINIC_SUPER_ADMIN', 'CLINIC_ADMIN', 'DOCTOR'];
export const CLINIC_IMAGING_ROLES = ['CLINIC_SUPER_ADMIN', 'CLINIC_ADMIN', 'RADIOLOGY_STAFF', 'DOCTOR'];
export const CLINIC_BILLING_ROLES = ['CLINIC_SUPER_ADMIN', 'CLINIC_ADMIN', 'CASHIER', 'RECEPTIONIST'];
export const CLINIC_RECORDS_ROLES = ['CLINIC_SUPER_ADMIN', 'CLINIC_ADMIN', 'RECORDS_OFFICER', 'RECEPTIONIST', 'DOCTOR', 'NURSE', 'MIDWIFE'];

export async function authorizeClinicStaff(allowedRoles: string[] = CLINIC_ALL_STAFF_ROLES): Promise<{
  authorized: boolean;
  userId?: string;
  staffProfileId?: string;
  name?: string;
  role?: string;
  clinicRole?: string;
  error?: string;
  status?: number;
}> {
  const user = await getCurrentUser();
  if (user) {
    const profile = await prisma.clinicStaffProfile.findUnique({
      where: { userId: user.id },
      select: { id: true, clinicRole: true, isActive: true },
    });

    if (profile && !profile.isActive) {
      return { authorized: false, error: 'Forbidden: Clinic staff access is deactivated.', status: 403 };
    }

    // Strict separation: School roles (SUPER_ADMIN, SCHOOL_SUPER_ADMIN, SCHOOL_ADMIN, LECTURER, etc.)
    // do NOT gain clinic access unless they have an explicit active ClinicStaffProfile.
    const isDirectClinicUserRole = CLINIC_ALL_STAFF_ROLES.includes(user.role);
    const hasExplicitClinicProfile = Boolean(profile && profile.isActive);

    if (!isDirectClinicUserRole && !hasExplicitClinicProfile) {
      return {
        authorized: false,
        error: `Forbidden: Role ${user.role} does not have clinic access.`,
        status: 403,
      };
    }

    const effectiveClinicRole = profile?.clinicRole || user.role;
    const isAllowed =
      (isDirectClinicUserRole && allowedRoles.includes(user.role)) ||
      (hasExplicitClinicProfile && allowedRoles.includes(effectiveClinicRole));

    if (!isAllowed) {
      return {
        authorized: false,
        error: `Forbidden: Clinic role ${effectiveClinicRole} is not authorized for this action.`,
        status: 403,
      };
    }

    return {
      authorized: true,
      userId: user.id,
      staffProfileId: profile?.id,
      name: user.name,
      role: user.role,
      clinicRole: effectiveClinicRole,
    };
  }

  return {
    authorized: false,
    error: 'Unauthorized: Please sign in with a clinic staff account.',
    status: 401,
  };
}

export function getAccraDateString(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Accra',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export function normalizeGhanaPhone(raw: string): string {
  const digits = raw.replace(/[^\d+]/g, '');
  if (digits.startsWith('+233')) return digits;
  if (digits.startsWith('233') && digits.length >= 12) return `+${digits}`;
  if (digits.startsWith('0') && digits.length === 10) return `+233${digits.slice(1)}`;
  return digits;
}

export function calculateBmi(weightKg?: number | null, heightCm?: number | null): number | null {
  if (!weightKg || !heightCm || weightKg <= 0 || heightCm <= 0) return null;
  const heightM = heightCm / 100;
  const bmi = weightKg / (heightM * heightM);
  return Number(bmi.toFixed(1));
}

export async function logClinicAudit(params: {
  actorId?: string | null;
  actorName?: string | null;
  actorRole?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  details?: Record<string, unknown>;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: params.actorId || null,
        actorName: params.actorName || 'Clinic Staff',
        actorRole: params.actorRole || 'CLINIC_STAFF',
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId || null,
        detailsJson: params.details ? JSON.stringify(params.details) : null,
      },
    });
  } catch (err) {
    console.error('Clinic audit log error:', err);
  }
}

export async function sendClinicNotification(params: {
  userId?: string | null;
  title: string;
  message: string;
  type?: string;
  link?: string;
  dedupeKey?: string;
}) {
  try {
    if (!params.userId) return;
    if (params.dedupeKey) {
      const existing = await prisma.notification.findUnique({ where: { dedupeKey: params.dedupeKey } });
      if (existing) return;
    }
    await prisma.notification.create({
      data: {
        userId: params.userId,
        title: params.title,
        message: params.message,
        type: params.type || 'CLINIC',
        link: params.link || '/portal/clinic',
        dedupeKey: params.dedupeKey || null,
      },
    });
  } catch (err) {
    console.error('Clinic notification error:', err);
  }
}
