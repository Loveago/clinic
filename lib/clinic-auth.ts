import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export const CLINIC_ALL_STAFF_ROLES = [
  'SUPER_ADMIN',
  'CLINIC_ADMIN',
  'RECEPTIONIST',
  'DOCTOR',
  'NURSE',
  'PHARMACIST',
  'LAB_TECH',
  'CASHIER',
];

export const CLINIC_ADMIN_ROLES = ['SUPER_ADMIN', 'CLINIC_ADMIN'];
export const CLINIC_RECEPTION_ROLES = ['SUPER_ADMIN', 'CLINIC_ADMIN', 'RECEPTIONIST', 'NURSE', 'DOCTOR'];
export const CLINIC_CLINICIAN_ROLES = ['SUPER_ADMIN', 'CLINIC_ADMIN', 'DOCTOR', 'NURSE'];
export const CLINIC_PHARMACY_ROLES = ['SUPER_ADMIN', 'CLINIC_ADMIN', 'PHARMACIST'];
export const CLINIC_LAB_ROLES = ['SUPER_ADMIN', 'CLINIC_ADMIN', 'LAB_TECH', 'DOCTOR'];
export const CLINIC_LAB_REVIEW_ROLES = ['SUPER_ADMIN', 'CLINIC_ADMIN', 'DOCTOR'];
export const CLINIC_BILLING_ROLES = ['SUPER_ADMIN', 'CLINIC_ADMIN', 'CASHIER', 'RECEPTIONIST', 'FINANCE_OFFICER'];

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

    const effectiveClinicRole = profile?.clinicRole || user.role;
    const isAllowed =
      allowedRoles.includes(user.role) || (profile?.isActive && allowedRoles.includes(effectiveClinicRole));

    if (!isAllowed) {
      return {
        authorized: false,
        error: `Forbidden: Role ${effectiveClinicRole} is not authorized for this clinic action.`,
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

  // Local demo workspace fallback when no session cookie is present
  const admin = await prisma.user.findFirst({
    where: { role: 'SUPER_ADMIN' },
    include: { clinicStaffProfile: true },
  });
  return {
    authorized: true,
    userId: admin?.id,
    staffProfileId: admin?.clinicStaffProfile?.id,
    name: admin?.name || 'Clinic Administrator',
    role: admin?.role || 'SUPER_ADMIN',
    clinicRole: admin?.clinicStaffProfile?.clinicRole || 'CLINIC_ADMIN',
  };
}

export async function authorizeClinicPatient(): Promise<{
  authorized: boolean;
  userId?: string;
  patient?: { id: string; patientNumber: string; fullName: string; phone: string; email: string | null };
  error?: string;
  status?: number;
}> {
  const user = await getCurrentUser();
  if (user) {
    const patient = await prisma.patient.findFirst({
      where: {
        OR: [
          { userId: user.id },
          ...(user.email ? [{ email: user.email }] : []),
        ],
      },
      select: { id: true, patientNumber: true, fullName: true, phone: true, email: true },
    });
    if (!patient) {
      return { authorized: false, error: 'Forbidden: No linked patient medical profile found.', status: 403 };
    }
    return { authorized: true, userId: user.id, patient };
  }

  // Local demo fallback only when no cookie is present
  const patient = await prisma.patient.findFirst({
    orderBy: { createdAt: 'asc' },
    select: { id: true, patientNumber: true, fullName: true, phone: true, email: true },
  });
  if (!patient) {
    return { authorized: false, error: 'No patient profile found.', status: 404 };
  }
  return { authorized: true, userId: undefined, patient };
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
        link: params.link || '/portal/patient',
        dedupeKey: params.dedupeKey || null,
      },
    });
  } catch (err) {
    console.error('Clinic notification error:', err);
  }
}
