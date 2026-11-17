import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  authorizeLecturer,
  verifyLecturerCourseAccess,
  logAcademicAudit,
} from '@/lib/portal-auth';

const VALID_PRIORITIES = new Set(['LOW', 'NORMAL', 'HIGH', 'URGENT']);

export async function GET(req: NextRequest) {
  try {
    const auth = await authorizeLecturer();
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 403 });
    }

    const { searchParams } = new URL(req.url);
    const courseId = searchParams.get('courseId');
    const cohortId = searchParams.get('cohortId');

    if (courseId) {
      const hasAccess = await verifyLecturerCourseAccess(auth.userId!, auth.role!, courseId);
      if (!hasAccess) {
        return NextResponse.json(
          { error: 'Forbidden: You are not assigned to this course.' },
          { status: 403 }
        );
      }
    }

    const isAdmin = auth.role === 'SUPER_ADMIN' || auth.role === 'SCHOOL_ADMIN';
    const where: Record<string, unknown> = {};

    if (courseId) {
      where.courseId = courseId;
    } else if (!isAdmin) {
      where.OR = [
        { authorId: auth.userId! },
        {
          course: {
            OR: [
              { lecturerId: auth.userId! },
              {
                courseLecturers: {
                  some: { lecturerId: auth.userId!, isActive: true },
                },
              },
            ],
          },
        },
      ];
    }

    if (cohortId) {
      where.cohortId = cohortId;
    }

    const announcements = await prisma.announcement.findMany({
      where,
      include: {
        course: {
          select: { id: true, code: true, title: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ announcements });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authorizeLecturer();
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 403 });
    }

    const body = await req.json();
    const { courseId, cohortId, semesterId, title, content, priority = 'NORMAL' } = body;

    if (!courseId || !title || !content) {
      return NextResponse.json(
        { error: 'courseId, title, and content are required' },
        { status: 400 }
      );
    }

    const hasAccess = await verifyLecturerCourseAccess(auth.userId!, auth.role!, courseId);
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Forbidden: You are not assigned to this course.' },
        { status: 403 }
      );
    }

    const upperPriority = String(priority).toUpperCase();
    const normalizedPriority = VALID_PRIORITIES.has(upperPriority) ? upperPriority : 'NORMAL';

    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true, code: true, title: true },
    });

    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    const announcement = await prisma.announcement.create({
      data: {
        title: String(title).trim(),
        content: String(content).trim(),
        targetAudience: 'STUDENTS',
        priority: normalizedPriority,
        courseId,
        cohortId: cohortId || null,
        semesterId: semesterId || null,
        authorId: auth.userId!,
      },
      include: {
        course: { select: { id: true, code: true, title: true } },
      },
    });

    const registrations = await prisma.courseRegistration.findMany({
      where: {
        courseId,
        status: 'APPROVED',
        ...(cohortId ? { student: { cohortId } } : {}),
      },
      select: {
        student: {
          select: { userId: true },
        },
      },
    });

    const uniqueUserIds = Array.from(new Set(registrations.map((r) => r.student.userId)));

    for (const userId of uniqueUserIds) {
      const dedupeKey = `announcement-${announcement.id}-${userId}`;
      await prisma.notification.upsert({
        where: { dedupeKey },
        update: {},
        create: {
          userId,
          title: `${course.code}: ${announcement.title}`,
          message: announcement.content.slice(0, 200),
          type:
            normalizedPriority === 'URGENT' || normalizedPriority === 'HIGH' ? 'alert' : 'info',
          dedupeKey,
          link: '/portal/student/courses',
        },
      });
    }

    await logAcademicAudit({
      actorId: auth.userId,
      actorName: auth.name,
      actorRole: auth.role,
      action: 'ANNOUNCEMENT_PUBLISHED',
      entityType: 'Announcement',
      entityId: announcement.id,
      details: {
        courseId,
        cohortId: cohortId || null,
        priority: normalizedPriority,
        notifiedCount: uniqueUserIds.length,
      },
    });

    return NextResponse.json(
      { status: true, announcement, notifiedCount: uniqueUserIds.length },
      { status: 201 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
