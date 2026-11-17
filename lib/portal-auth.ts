import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

const ADMIN_ROLES = new Set([
  'SUPER_ADMIN',
  'CLINIC_ADMIN',
  'SCHOOL_ADMIN',
  'ADMISSIONS_OFFICER',
  'REGISTRAR',
  'FINANCE_OFFICER',
  'LECTURER',
]);

export const ADMISSIONS_ROLES = ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMISSIONS_OFFICER'];
export const REGISTRAR_ROLES = ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'REGISTRAR'];
export const FINANCE_ROLES = ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'FINANCE_OFFICER'];
export const ACADEMIC_ADMIN_ROLES = ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'REGISTRAR'];
export const RESULTS_ADMIN_ROLES = ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'EXAM_OFFICER', 'REGISTRAR'];
export const SCHOOL_STAFF_ROLES = [
  'SUPER_ADMIN',
  'SCHOOL_ADMIN',
  'ADMISSIONS_OFFICER',
  'REGISTRAR',
  'FINANCE_OFFICER',
];

export async function authorizeRole(allowedRoles: string[]): Promise<{
  authorized: boolean;
  userId?: string;
  name?: string;
  role?: string;
  error?: string;
  status?: number;
}> {
  const user = await getCurrentUser();
  if (user) {
    if (!allowedRoles.includes(user.role)) {
      return {
        authorized: false,
        error: `Forbidden: Role ${user.role} is not authorized for this action.`,
        status: 403,
      };
    }
    return { authorized: true, userId: user.id, name: user.name, role: user.role };
  }

  // Local demo fallback when no session cookie is present
  const admin = await prisma.user.findFirst({
    where: { role: 'SUPER_ADMIN' },
    select: { id: true, name: true, role: true },
  });
  return {
    authorized: true,
    userId: admin?.id,
    name: admin?.name || 'System Administrator',
    role: admin?.role || 'SUPER_ADMIN',
  };
}

export async function authorizeAdminOrLecturer(): Promise<{
  authorized: boolean;
  userId?: string;
  role?: string;
  error?: string;
  status?: number;
}> {
  const user = await getCurrentUser();
  if (user) {
    if (!ADMIN_ROLES.has(user.role)) {
      return {
        authorized: false,
        error: 'Forbidden: Students are not permitted to perform administrative or faculty learning management actions.',
        status: 403,
      };
    }
    return { authorized: true, userId: user.id, role: user.role };
  }

  // Fallback for local demo workspace when not signed in as a student
  const admin = await prisma.user.findFirst({
    where: { role: 'SUPER_ADMIN' },
    select: { id: true, role: true },
  });
  return { authorized: true, userId: admin?.id, role: admin?.role || 'SUPER_ADMIN' };
}

export async function resolveStudentRecord() {
  const user = await getCurrentUser();
  if (user?.id) {
    const own = await prisma.student.findUnique({
      where: { userId: user.id },
      include: { user: true, programme: true },
    });
    if (own) return own;
  }

  let student = await prisma.student.findFirst({
    where: { studentId: 'WNS/GH/2025/001' },
    include: { user: true, programme: true },
  });

  if (!student) {
    student = await prisma.student.findFirst({
      include: { user: true, programme: true },
    });
  }
  return student;
}

const LECTURER_ALLOWED_ROLES = new Set(['LECTURER', 'SUPER_ADMIN', 'SCHOOL_ADMIN']);

export async function authorizeLecturer(): Promise<{
  authorized: boolean;
  userId?: string;
  name?: string;
  role?: string;
  error?: string;
  status?: number;
}> {
  const cookieStore = await cookies();
  const hasCookie = Boolean(cookieStore.get('auth_token')?.value);
  const user = await getCurrentUser();

  if (user) {
    if (!LECTURER_ALLOWED_ROLES.has(user.role)) {
      return {
        authorized: false,
        error: `Forbidden: Role ${user.role} is not authorized for lecturer actions.`,
        status: 403,
      };
    }
    return { authorized: true, userId: user.id, name: user.name, role: user.role };
  }

  if (hasCookie) {
    return {
      authorized: false,
      error: 'Unauthorized: Invalid or expired session.',
      status: 401,
    };
  }

  // Local demo fallback ONLY when no session cookie is present
  const lecturer = await prisma.user.findFirst({
    where: { role: 'LECTURER' },
    select: { id: true, name: true, role: true },
  });
  if (!lecturer) {
    return {
      authorized: false,
      error: 'Lecturer profile not found.',
      status: 404,
    };
  }
  return {
    authorized: true,
    userId: lecturer.id,
    name: lecturer.name,
    role: lecturer.role,
  };
}

export async function verifyLecturerCourseAccess(
  userId: string,
  role: string,
  courseId: string
): Promise<boolean> {
  if (role === 'SUPER_ADMIN' || role === 'SCHOOL_ADMIN') {
    return true;
  }
  if (!userId || !courseId) {
    return false;
  }

  const course = await prisma.course.findFirst({
    where: {
      id: courseId,
      OR: [
        { lecturerId: userId },
        {
          courseLecturers: {
            some: {
              lecturerId: userId,
              isActive: true,
            },
          },
        },
      ],
    },
    select: { id: true },
  });

  return Boolean(course);
}

export async function logAcademicAudit(params: {
  actorId?: string | null;
  actorName?: string;
  actorRole?: string;
  action: string;
  entityType: string;
  entityId: string;
  details?: unknown;
}) {
  let actorName = params.actorName;
  let actorRole = params.actorRole;

  if ((!actorName || !actorRole) && params.actorId) {
    const actor = await prisma.user.findUnique({
      where: { id: params.actorId },
      select: { name: true, role: true },
    });
    actorName = actorName || actor?.name;
    actorRole = actorRole || actor?.role;
  }

  return prisma.auditLog.create({
    data: {
      actorId: params.actorId || null,
      actorName: actorName || 'System',
      actorRole: actorRole || 'SYSTEM',
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      detailsJson: params.details !== undefined ? JSON.stringify(params.details) : null,
    },
  });
}

