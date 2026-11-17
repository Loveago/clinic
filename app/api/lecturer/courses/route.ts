import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizeLecturer } from '@/lib/portal-auth';

export async function GET(req: NextRequest) {
  try {
    const auth = await authorizeLecturer();
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 403 });
    }

    const { searchParams } = new URL(req.url);
    const requestedLecturerId = searchParams.get('lecturerId');
    const isAdmin = auth.role === 'SUPER_ADMIN' || auth.role === 'SCHOOL_ADMIN';
    const lecturerId = isAdmin && requestedLecturerId ? requestedLecturerId : auth.userId!;

    const lecturer = await prisma.user.findUnique({
      where: { id: lecturerId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        lecturerProfile: {
          include: {
            department: true,
          },
        },
      },
    });

    const courseWhere =
      isAdmin && !requestedLecturerId
        ? {}
        : {
            OR: [
              { lecturerId },
              {
                courseLecturers: {
                  some: {
                    lecturerId,
                    isActive: true,
                  },
                },
              },
            ],
          };

    const courses = await prisma.course.findMany({
      where: courseWhere,
      include: {
        programme: true,
        department: true,
        semesterRel: true,
        schedules: true,
        courseLecturers: {
          where: { isActive: true },
          include: {
            lecturer: {
              select: { id: true, name: true, email: true },
            },
          },
        },
        registrations: {
          where: { status: 'APPROVED' },
          include: {
            student: {
              include: {
                user: { select: { id: true, name: true, email: true, phone: true } },
                cohort: { select: { id: true, name: true } },
                programme: { select: { id: true, name: true, code: true } },
              },
            },
          },
        },
        assignments: {
          include: { submissions: true },
          orderBy: { createdAt: 'desc' },
        },
        caResults: {
          include: {
            student: {
              include: { user: { select: { id: true, name: true, email: true } } },
            },
          },
        },
        attendance: {
          include: { records: true },
          orderBy: { createdAt: 'desc' },
        },
        materials: {
          where: {
            status: { in: ['PUBLISHED', 'APPROVED'] },
          },
          include: {
            extractedTopics: {
              where: {
                status: { in: ['APPROVED', 'PUBLISHED'] },
              },
              select: {
                id: true,
                title: true,
                summary: true,
                description: true,
                status: true,
                pageStart: true,
                pageEnd: true,
                orderIndex: true,
                confidence: true,
                subtopics: {
                  orderBy: { orderIndex: 'asc' },
                },
              },
              orderBy: { orderIndex: 'asc' },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { code: 'asc' },
    });

    const assignedCourseIds = courses.map((c) => c.id);

    const timetable = await prisma.classSchedule.findMany({
      where:
        isAdmin && !requestedLecturerId
          ? { courseId: { in: assignedCourseIds } }
          : {
              OR: [
                { lecturerId },
                ...(assignedCourseIds.length > 0 ? [{ courseId: { in: assignedCourseIds } }] : []),
              ],
            },
      include: {
        course: {
          select: {
            id: true,
            code: true,
            title: true,
            level: true,
            semester: true,
          },
        },
      },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });

    const totalStudentsTaught = new Set(
      courses.flatMap((c) => c.registrations.map((r) => r.studentId))
    ).size;

    const totalAssessmentsPending = courses
      .flatMap((c) => c.assignments)
      .flatMap((a) => a.submissions)
      .filter((s) => !s.isGraded).length;

    const pendingGradesCount = courses
      .flatMap((c) => c.caResults)
      .filter((r) => r.status === 'DRAFT' || r.status === 'RETURNED').length;

    return NextResponse.json({
      lecturerId,
      lecturer,
      courses,
      timetable,
      stats: {
        assignedCoursesCount: courses.length,
        totalStudentsTaught,
        totalAssessmentsPending,
        pendingGradesCount,
        totalSessionsCount: courses.reduce((sum, c) => sum + c.attendance.length, 0),
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
