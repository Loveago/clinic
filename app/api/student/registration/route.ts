import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveStudentRecord, logAcademicAudit } from '@/lib/portal-auth';

const MAX_SEMESTER_CREDITS = 24;

export async function GET() {
  try {
    const student = await resolveStudentRecord();

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    const [availableCourses, registered, passedAssessments] = await Promise.all([
      prisma.course.findMany({
        where: {
          programmeId: student.programmeId,
          status: 'ACTIVE',
        },
        include: {
          lecturer: { select: { id: true, name: true, title: true } },
          courseLecturers: {
            where: { isActive: true },
            include: { lecturer: { select: { id: true, name: true, title: true } } },
          },
          schedules: true,
          prerequisitesList: {
            include: {
              prerequisiteCourse: {
                select: { id: true, code: true, title: true },
              },
            },
          },
        },
        orderBy: { code: 'asc' },
      }),
      prisma.courseRegistration.findMany({
        where: {
          studentId: student.id,
          status: { not: 'DROPPED' },
        },
        include: {
          semester: true,
          course: {
            include: {
              lecturer: { select: { id: true, name: true, title: true } },
              schedules: true,
            },
          },
        },
      }),
      prisma.continuousAssessment.findMany({
        where: {
          studentId: student.id,
          isPublished: true,
          grade: { not: 'F' },
        },
        select: { courseId: true },
      }),
    ]);

    const registeredCourseIds = new Set(registered.map((r) => r.courseId));
    const passedCourseIds = new Set(passedAssessments.map((a) => a.courseId));

    const enrichedAvailable = availableCourses.map((c) => {
      const missingPrerequisites = c.prerequisitesList
        .filter((p) => !passedCourseIds.has(p.prerequisiteCourseId))
        .map((p) => ({
          id: p.prerequisiteCourse.id,
          code: p.prerequisiteCourse.code,
          title: p.prerequisiteCourse.title,
        }));

      const ineligibilityReasons: string[] = [];
      if (missingPrerequisites.length > 0) {
        ineligibilityReasons.push(
          `Missing prerequisite(s): ${missingPrerequisites.map((m) => m.code).join(', ')}`
        );
      }

      return {
        ...c,
        isRegistered: registeredCourseIds.has(c.id),
        prerequisitesMet: missingPrerequisites.length === 0,
        missingPrerequisites,
        isEligible: missingPrerequisites.length === 0,
        ineligibilityReasons,
      };
    });

    const totalRegisteredCredits = registered.reduce((sum, r) => sum + r.course.creditHours, 0);

    return NextResponse.json({
      student: {
        id: student.id,
        studentId: student.studentId,
        level: student.level,
        programme: student.programme.name,
        semester: student.currentSemester,
        academicYear: student.academicYear,
      },
      availableCourses: enrichedAvailable,
      registeredCourses: registered,
      totalRegisteredCredits,
      maxCreditLimit: MAX_SEMESTER_CREDITS,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const student = await resolveStudentRecord();
    if (!student) {
      return NextResponse.json({ error: 'Student profile not found' }, { status: 404 });
    }

    const body = await req.json();
    const { action, courseId } = body;

    if (!courseId) {
      return NextResponse.json({ error: 'Course ID is required' }, { status: 400 });
    }

    if (action === 'register') {
      const course = await prisma.course.findUnique({
        where: { id: courseId },
        include: {
          prerequisitesList: {
            include: {
              prerequisiteCourse: { select: { id: true, code: true, title: true } },
            },
          },
          _count: {
            select: {
              registrations: { where: { status: { not: 'DROPPED' } } },
            },
          },
        },
      });

      if (!course || course.status !== 'ACTIVE') {
        return NextResponse.json({ error: 'Course not found or inactive.' }, { status: 404 });
      }

      if (course.programmeId !== student.programmeId) {
        return NextResponse.json(
          { error: 'Course does not belong to your enrolled programme.' },
          { status: 400 }
        );
      }

      if (course.maxCapacity && course._count.registrations >= course.maxCapacity) {
        return NextResponse.json(
          { error: `Course ${course.code} has reached its maximum capacity (${course.maxCapacity}).` },
          { status: 400 }
        );
      }

      const existingReg = await prisma.courseRegistration.findUnique({
        where: {
          studentId_courseId: {
            studentId: student.id,
            courseId,
          },
        },
      });

      if (existingReg && existingReg.status !== 'DROPPED') {
        return NextResponse.json(
          { error: `Already registered for ${course.code}.` },
          { status: 409 }
        );
      }

      // Prerequisite check
      if (course.prerequisitesList.length > 0) {
        const prereqIds = course.prerequisitesList.map((p) => p.prerequisiteCourseId);
        const passed = await prisma.continuousAssessment.findMany({
          where: {
            studentId: student.id,
            courseId: { in: prereqIds },
            isPublished: true,
            grade: { not: 'F' },
          },
          select: { courseId: true },
        });
        const passedSet = new Set(passed.map((p) => p.courseId));
        const missing = course.prerequisitesList.filter((p) => !passedSet.has(p.prerequisiteCourseId));
        if (missing.length > 0) {
          return NextResponse.json(
            {
              error: `Prerequisite(s) not completed: ${missing
                .map((m) => m.prerequisiteCourse.code)
                .join(', ')}`,
            },
            { status: 400 }
          );
        }
      }

      // Credit limit check
      const currentRegs = await prisma.courseRegistration.findMany({
        where: { studentId: student.id, status: { not: 'DROPPED' } },
        include: { course: { select: { creditHours: true } } },
      });
      const currentCredits = currentRegs.reduce((sum, r) => sum + r.course.creditHours, 0);
      if (currentCredits + course.creditHours > MAX_SEMESTER_CREDITS) {
        return NextResponse.json(
          {
            error: `Credit limit exceeded (${currentCredits + course.creditHours}/${MAX_SEMESTER_CREDITS} credits). Drop a course first.`,
          },
          { status: 400 }
        );
      }

      const currentSemester = await prisma.semester.findFirst({
        where: { isCurrent: true },
        select: { id: true },
      });

      const reg = await prisma.courseRegistration.upsert({
        where: {
          studentId_courseId: {
            studentId: student.id,
            courseId,
          },
        },
        update: {
          status: 'APPROVED',
          approvalStatus: 'APPROVED',
          semesterId: currentSemester?.id || course.semesterId || null,
          registeredAt: new Date(),
        },
        create: {
          studentId: student.id,
          courseId,
          semesterId: currentSemester?.id || course.semesterId || null,
          status: 'APPROVED',
          approvalStatus: 'APPROVED',
        },
        include: { course: true },
      });

      await prisma.courseEnrollment.upsert({
        where: {
          studentId_courseId: {
            studentId: student.id,
            courseId,
          },
        },
        update: { status: 'ENROLLED' },
        create: {
          studentId: student.id,
          courseId,
          progressPercent: 0,
          status: 'ENROLLED',
        },
      });

      await logAcademicAudit({
        actorId: student.userId,
        actorName: student.user?.name,
        actorRole: 'STUDENT',
        action: 'COURSE_REGISTER',
        entityType: 'CourseRegistration',
        entityId: reg.id,
        details: { studentId: student.id, courseId, courseCode: course.code },
      });

      return NextResponse.json({ status: true, registration: reg });
    }

    if (action === 'drop') {
      const existingReg = await prisma.courseRegistration.findUnique({
        where: {
          studentId_courseId: {
            studentId: student.id,
            courseId,
          },
        },
      });

      if (!existingReg) {
        return NextResponse.json({ error: 'Course registration not found.' }, { status: 404 });
      }

      if (existingReg.approvalStatus === 'LOCKED' || existingReg.status === 'LOCKED') {
        return NextResponse.json(
          { error: 'Course registration is locked by administration and cannot be dropped.' },
          { status: 400 }
        );
      }

      await prisma.courseRegistration.deleteMany({
        where: {
          studentId: student.id,
          courseId,
        },
      });

      await logAcademicAudit({
        actorId: student.userId,
        actorName: student.user?.name,
        actorRole: 'STUDENT',
        action: 'COURSE_DROP',
        entityType: 'CourseRegistration',
        entityId: existingReg.id,
        details: { studentId: student.id, courseId },
      });

      return NextResponse.json({ status: true, message: 'Course successfully dropped' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
