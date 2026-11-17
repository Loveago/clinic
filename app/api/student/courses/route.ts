import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveStudentRecord } from '@/lib/portal-auth';

export async function GET() {
  try {
    const student = await resolveStudentRecord();

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    const registrations = await prisma.courseRegistration.findMany({
      where: {
        studentId: student.id,
        status: { not: 'DROPPED' },
      },
      select: { courseId: true },
    });

    const registeredCourseIds = registrations.map((r) => r.courseId);

    const courses = await prisma.course.findMany({
      where:
        registeredCourseIds.length > 0
          ? { id: { in: registeredCourseIds } }
          : { programmeId: student.programmeId, status: 'ACTIVE' },
      include: {
        lecturer: {
          select: { id: true, name: true, email: true, title: true, department: true },
        },
        courseLecturers: {
          where: { isActive: true },
          include: {
            lecturer: {
              select: { id: true, name: true, email: true, title: true, department: true },
            },
          },
        },
        schedules: true,
        materials: {
          where: { status: 'PUBLISHED' },
          include: {
            extractedTopics: {
              where: { status: { in: ['APPROVED', 'PUBLISHED'] } },
              orderBy: { orderIndex: 'asc' },
              select: {
                id: true,
                title: true,
                description: true,
                summary: true,
                pageStart: true,
                pageEnd: true,
                orderIndex: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        modules: {
          include: {
            topics: {
              include: {
                progress: {
                  where: { studentId: student.id },
                },
                materials: {
                  where: { status: 'PUBLISHED' },
                },
              },
              orderBy: { orderIndex: 'asc' },
            },
          },
          orderBy: { orderIndex: 'asc' },
        },
        enrollments: {
          where: { studentId: student.id },
        },
        assignments: {
          where: { status: 'PUBLISHED' },
          include: {
            submissions: {
              where: { studentId: student.id },
            },
          },
        },
        assessmentComponents: {
          orderBy: { orderIndex: 'asc' },
        },
        announcements: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
      orderBy: { code: 'asc' },
    });

    const enrichedCourses = courses.map((course) => {
      const lecturerMap = new Map<string, any>();
      if (course.lecturer) {
        lecturerMap.set(course.lecturer.id, { ...course.lecturer, role: 'PRIMARY' });
      }
      for (const cl of course.courseLecturers) {
        if (cl.lecturer && !lecturerMap.has(cl.lecturer.id)) {
          lecturerMap.set(cl.lecturer.id, { ...cl.lecturer, role: cl.role });
        }
      }

      const totalAssignments = course.assignments.length;
      const submittedAssignments = course.assignments.filter((a) => a.submissions.length > 0).length;
      const gradedAssignments = course.assignments.filter((a) => a.submissions[0]?.isGraded).length;

      return {
        ...course,
        lecturers: Array.from(lecturerMap.values()),
        timetable: course.schedules,
        assignmentSummary: {
          total: totalAssignments,
          submitted: submittedAssignments,
          graded: gradedAssignments,
          pending: Math.max(0, totalAssignments - submittedAssignments),
        },
      };
    });

    return NextResponse.json({ courses: enrichedCourses });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch courses' }, { status: 500 });
  }
}
