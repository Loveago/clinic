import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  ACADEMIC_ADMIN_ROLES,
  authorizeRole,
  logAcademicAudit,
} from '@/lib/portal-auth';

function parseTimeToMinutes(timeStr?: string | null): number | null {
  if (!timeStr) return null;
  const cleaned = timeStr.trim().toUpperCase();

  // 12-hour format e.g. "08:00 AM", "2:30 PM"
  const ampmMatch = cleaned.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/);
  if (ampmMatch) {
    let hours = Number(ampmMatch[1]);
    const minutes = Number(ampmMatch[2]);
    const period = ampmMatch[3];
    if (hours < 1 || hours > 12 || minutes < 0 || minutes > 59) return null;
    if (period === 'AM' && hours === 12) hours = 0;
    if (period === 'PM' && hours !== 12) hours += 12;
    return hours * 60 + minutes;
  }

  // 24-hour format e.g. "08:00", "14:30"
  const h24Match = cleaned.match(/^(\d{1,2}):(\d{2})$/);
  if (h24Match) {
    const hours = Number(h24Match[1]);
    const minutes = Number(h24Match[2]);
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
    return hours * 60 + minutes;
  }

  return null;
}

function timesOverlap(
  startA: string,
  endA: string,
  startB: string,
  endB: string
): boolean {
  const sA = parseTimeToMinutes(startA);
  const eA = parseTimeToMinutes(endA);
  const sB = parseTimeToMinutes(startB);
  const eB = parseTimeToMinutes(endB);

  if (sA === null || eA === null || sB === null || eB === null) {
    return startA.trim().toLowerCase() === startB.trim().toLowerCase();
  }
  return sA < eB && sB < eA;
}

async function detectScheduleConflicts(params: {
  excludeId?: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  venue: string;
  room?: string | null;
  lecturerId?: string | null;
  semesterId?: string | null;
}) {
  const sameDay = await prisma.classSchedule.findMany({
    where: {
      dayOfWeek: params.dayOfWeek,
      ...(params.excludeId ? { id: { not: params.excludeId } } : {}),
      ...(params.semesterId
        ? { OR: [{ semesterId: params.semesterId }, { semesterId: null }] }
        : {}),
    },
    include: {
      course: { select: { id: true, code: true, title: true } },
      lecturer: { select: { id: true, name: true } },
    },
  });

  const conflicts: Array<{
    type: 'LECTURER_CONFLICT' | 'VENUE_CONFLICT';
    scheduleId: string;
    courseCode: string;
    courseTitle: string;
    dayOfWeek: string;
    startTime: string;
    endTime: string;
    venue: string;
    lecturerName?: string | null;
  }> = [];

  const targetVenue = params.venue.trim().toLowerCase();
  const targetRoom = params.room?.trim().toLowerCase() || '';

  for (const s of sameDay) {
    if (!timesOverlap(params.startTime, params.endTime, s.startTime, s.endTime)) {
      continue;
    }

    if (params.lecturerId && s.lecturerId && params.lecturerId === s.lecturerId) {
      conflicts.push({
        type: 'LECTURER_CONFLICT',
        scheduleId: s.id,
        courseCode: s.course.code,
        courseTitle: s.course.title,
        dayOfWeek: s.dayOfWeek,
        startTime: s.startTime,
        endTime: s.endTime,
        venue: s.venue,
        lecturerName: s.lecturer?.name || null,
      });
    }

    const existingVenue = s.venue.trim().toLowerCase();
    const existingRoom = s.room?.trim().toLowerCase() || '';
    const sameVenue = existingVenue === targetVenue;
    const sameRoom = !targetRoom || !existingRoom || targetRoom === existingRoom;

    if (sameVenue && sameRoom) {
      conflicts.push({
        type: 'VENUE_CONFLICT',
        scheduleId: s.id,
        courseCode: s.course.code,
        courseTitle: s.course.title,
        dayOfWeek: s.dayOfWeek,
        startTime: s.startTime,
        endTime: s.endTime,
        venue: s.venue,
        lecturerName: s.lecturer?.name || null,
      });
    }
  }

  return conflicts;
}

export async function GET() {
  const auth = await authorizeRole([...ACADEMIC_ADMIN_ROLES, 'LECTURER']);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status || 403 });
  }

  try {
    const [
      academicYears,
      semesters,
      departments,
      programmes,
      cohorts,
      courses,
      schedules,
      gradeScales,
    ] = await Promise.all([
      prisma.academicYear.findMany({
        include: { semesters: { orderBy: { startDate: 'asc' } } },
        orderBy: { name: 'desc' },
      }),
      prisma.semester.findMany({
        include: { academicYear: true },
        orderBy: { startDate: 'desc' },
      }),
      prisma.department.findMany({
        include: {
          programmes: true,
          courses: true,
          lecturers: { include: { user: { select: { id: true, name: true, email: true } } } },
        },
        orderBy: { name: 'asc' },
      }),
      prisma.programme.findMany({
        include: { department: true, cohorts: true },
        orderBy: { code: 'asc' },
      }),
      prisma.cohort.findMany({
        include: {
          programme: { select: { id: true, code: true, name: true } },
          _count: { select: { students: true } },
        },
        orderBy: { name: 'asc' },
      }),
      prisma.course.findMany({
        include: {
          lecturer: { select: { id: true, name: true, email: true } },
          programme: true,
          department: true,
          semesterRel: true,
          schedules: true,
          prerequisitesList: {
            include: {
              prerequisiteCourse: { select: { id: true, code: true, title: true } },
            },
          },
          courseLecturers: {
            where: { isActive: true },
            include: { lecturer: { select: { id: true, name: true, email: true, staffId: true } } },
          },
        },
        orderBy: { code: 'asc' },
      }),
      prisma.classSchedule.findMany({
        include: {
          course: { select: { id: true, code: true, title: true, level: true, programmeId: true } },
          lecturer: { select: { id: true, name: true, email: true } },
        },
        orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
      }),
      prisma.gradeScale.findMany({
        orderBy: [{ minScore: 'desc' }],
      }),
    ]);

    return NextResponse.json({
      academicYears,
      semesters,
      departments,
      programmes,
      cohorts,
      courses,
      schedules,
      gradeScales,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await authorizeRole(ACADEMIC_ADMIN_ROLES);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status || 403 });
  }

  try {
    const body = await req.json();
    const { type, data } = body;

    if (!type || !data) {
      return NextResponse.json({ error: 'type and data are required' }, { status: 400 });
    }

    if (type === 'department') {
      if (!data.code || !data.name) {
        return NextResponse.json({ error: 'code and name are required' }, { status: 400 });
      }
      const department = await prisma.department.create({
        data: {
          code: String(data.code).trim().toUpperCase(),
          name: String(data.name).trim(),
          description: data.description || null,
        },
      });
      await logAcademicAudit({
        actorId: auth.userId,
        actorName: auth.name,
        actorRole: auth.role,
        action: 'CREATE_DEPARTMENT',
        entityType: 'Department',
        entityId: department.id,
        details: department,
      });
      return NextResponse.json({ status: true, department }, { status: 201 });
    }

    if (type === 'programme') {
      if (!data.code || !data.name) {
        return NextResponse.json({ error: 'code and name are required' }, { status: 400 });
      }
      const programme = await prisma.programme.create({
        data: {
          code: String(data.code).trim().toUpperCase(),
          name: String(data.name).trim(),
          description: data.description || '',
          duration: data.duration || '3 Years',
          qualification: data.qualification || 'Diploma',
          fee: Number(data.fee) || 0,
          requirements: data.requirements || 'WASSCE / SSSCE Credit Passes',
          departmentId: data.departmentId || null,
          status: data.status || 'Active',
        },
      });
      await logAcademicAudit({
        actorId: auth.userId,
        actorName: auth.name,
        actorRole: auth.role,
        action: 'CREATE_PROGRAMME',
        entityType: 'Programme',
        entityId: programme.id,
        details: { code: programme.code, name: programme.name },
      });
      return NextResponse.json({ status: true, programme }, { status: 201 });
    }

    if (type === 'academicYear') {
      if (!data.name || !data.startDate || !data.endDate) {
        return NextResponse.json(
          { error: 'name, startDate, and endDate are required' },
          { status: 400 }
        );
      }
      const isCurrent = Boolean(data.isCurrent);
      const year = await prisma.$transaction(async (tx) => {
        if (isCurrent) {
          await tx.academicYear.updateMany({ data: { isCurrent: false } });
        }
        return tx.academicYear.create({
          data: {
            name: String(data.name).trim(),
            startDate: data.startDate,
            endDate: data.endDate,
            isCurrent,
          },
        });
      });
      await logAcademicAudit({
        actorId: auth.userId,
        actorName: auth.name,
        actorRole: auth.role,
        action: 'CREATE_ACADEMIC_YEAR',
        entityType: 'AcademicYear',
        entityId: year.id,
        details: year,
      });
      return NextResponse.json({ status: true, year }, { status: 201 });
    }

    if (type === 'semester') {
      if (!data.academicYearId || !data.name || !data.startDate || !data.endDate) {
        return NextResponse.json(
          { error: 'academicYearId, name, startDate, and endDate are required' },
          { status: 400 }
        );
      }
      const isCurrent = Boolean(data.isCurrent);
      const semester = await prisma.$transaction(async (tx) => {
        if (isCurrent) {
          await tx.semester.updateMany({ data: { isCurrent: false } });
        }
        return tx.semester.create({
          data: {
            academicYearId: data.academicYearId,
            name: String(data.name).trim(),
            startDate: data.startDate,
            endDate: data.endDate,
            isCurrent,
          },
          include: { academicYear: true },
        });
      });
      await logAcademicAudit({
        actorId: auth.userId,
        actorName: auth.name,
        actorRole: auth.role,
        action: 'CREATE_SEMESTER',
        entityType: 'Semester',
        entityId: semester.id,
        details: { name: semester.name, academicYearId: semester.academicYearId, isCurrent },
      });
      return NextResponse.json({ status: true, semester }, { status: 201 });
    }

    if (type === 'cohort') {
      if (!data.name || !data.programmeId || !data.academicYear) {
        return NextResponse.json(
          { error: 'name, programmeId, and academicYear are required' },
          { status: 400 }
        );
      }
      const cohort = await prisma.cohort.create({
        data: {
          name: String(data.name).trim(),
          programmeId: data.programmeId,
          academicYear: data.academicYear,
          semester: data.semester || 'First Semester',
          level: data.level || 'Level 100',
          capacity: data.capacity !== undefined && data.capacity !== null && data.capacity !== ''
            ? Number(data.capacity)
            : null,
        },
        include: { programme: { select: { id: true, code: true, name: true } } },
      });
      await logAcademicAudit({
        actorId: auth.userId,
        actorName: auth.name,
        actorRole: auth.role,
        action: 'CREATE_COHORT',
        entityType: 'Cohort',
        entityId: cohort.id,
        details: cohort,
      });
      return NextResponse.json({ status: true, cohort }, { status: 201 });
    }

    if (type === 'course') {
      if (!data.code || !data.title || !data.programmeId) {
        return NextResponse.json(
          { error: 'code, title, and programmeId are required' },
          { status: 400 }
        );
      }

      const prereqIds: string[] = Array.isArray(data.prerequisiteCourseIds)
        ? data.prerequisiteCourseIds.filter(Boolean)
        : [];

      const course = await prisma.$transaction(async (tx) => {
        const created = await tx.course.create({
          data: {
            code: String(data.code).trim().toUpperCase(),
            title: String(data.title).trim(),
            description: data.description || '',
            creditHours: Number(data.creditHours) || 3,
            level: data.level || 'Level 100',
            semester: data.semester || 'First Semester',
            semesterId: data.semesterId || null,
            programmeId: data.programmeId,
            departmentId: data.departmentId || null,
            lecturerId: data.lecturerId || null,
            isElective: Boolean(data.isElective),
            status: data.status || 'ACTIVE',
            maxCapacity:
              data.maxCapacity !== undefined && data.maxCapacity !== null && data.maxCapacity !== ''
                ? Number(data.maxCapacity)
                : null,
            thumbnail: data.thumbnail || null,
            prerequisites: data.prerequisites || null,
          },
        });

        for (const prereqId of prereqIds) {
          if (prereqId !== created.id) {
            await tx.coursePrerequisite.create({
              data: {
                courseId: created.id,
                prerequisiteCourseId: prereqId,
              },
            });
          }
        }

        return created;
      });

      await logAcademicAudit({
        actorId: auth.userId,
        actorName: auth.name,
        actorRole: auth.role,
        action: 'CREATE_COURSE',
        entityType: 'Course',
        entityId: course.id,
        details: { code: course.code, title: course.title, prerequisiteCourseIds: prereqIds },
      });
      return NextResponse.json({ status: true, course }, { status: 201 });
    }

    if (type === 'schedule') {
      if (!data.courseId || !data.dayOfWeek || !data.startTime || !data.endTime || !data.venue) {
        return NextResponse.json(
          { error: 'courseId, dayOfWeek, startTime, endTime, and venue are required' },
          { status: 400 }
        );
      }

      const startMins = parseTimeToMinutes(data.startTime);
      const endMins = parseTimeToMinutes(data.endTime);
      if (startMins !== null && endMins !== null && endMins <= startMins) {
        return NextResponse.json(
          { error: 'endTime must be after startTime' },
          { status: 400 }
        );
      }

      const conflicts = await detectScheduleConflicts({
        dayOfWeek: data.dayOfWeek,
        startTime: data.startTime,
        endTime: data.endTime,
        venue: data.venue,
        room: data.room || null,
        lecturerId: data.lecturerId || null,
        semesterId: data.semesterId || null,
      });

      if (conflicts.length > 0 && !data.overrideConflict) {
        return NextResponse.json(
          {
            error: 'Timetable conflict detected for lecturer or venue.',
            conflicts,
          },
          { status: 409 }
        );
      }

      const schedule = await prisma.classSchedule.create({
        data: {
          courseId: data.courseId,
          lecturerId: data.lecturerId || null,
          semesterId: data.semesterId || null,
          cohortId: data.cohortId || null,
          sessionType: data.sessionType || 'LECTURE',
          dayOfWeek: data.dayOfWeek,
          startTime: data.startTime,
          endTime: data.endTime,
          venue: data.venue,
          room: data.room || null,
        },
        include: {
          course: { select: { id: true, code: true, title: true } },
          lecturer: { select: { id: true, name: true } },
        },
      });

      await logAcademicAudit({
        actorId: auth.userId,
        actorName: auth.name,
        actorRole: auth.role,
        action: 'CREATE_SCHEDULE',
        entityType: 'ClassSchedule',
        entityId: schedule.id,
        details: {
          ...schedule,
          overrideConflict: Boolean(data.overrideConflict),
          conflictsCount: conflicts.length,
        },
      });
      return NextResponse.json({ status: true, schedule, conflicts }, { status: 201 });
    }

    if (type === 'gradeScale') {
      if (
        !data.name ||
        data.minScore === undefined ||
        data.maxScore === undefined ||
        !data.gradeLetter ||
        data.gradePoint === undefined
      ) {
        return NextResponse.json(
          { error: 'name, minScore, maxScore, gradeLetter, and gradePoint are required' },
          { status: 400 }
        );
      }
      const gradeScale = await prisma.gradeScale.create({
        data: {
          name: String(data.name).trim(),
          minScore: Number(data.minScore),
          maxScore: Number(data.maxScore),
          gradeLetter: String(data.gradeLetter).trim().toUpperCase(),
          gradePoint: Number(data.gradePoint),
          remark: data.remark || null,
          isDefault: Boolean(data.isDefault),
        },
      });
      await logAcademicAudit({
        actorId: auth.userId,
        actorName: auth.name,
        actorRole: auth.role,
        action: 'CREATE_GRADE_SCALE',
        entityType: 'GradeScale',
        entityId: gradeScale.id,
        details: gradeScale,
      });
      return NextResponse.json({ status: true, gradeScale }, { status: 201 });
    }

    if (type === 'assessmentComponent') {
      if (!data.courseId || !data.name || !data.componentType || data.weightPercent === undefined) {
        return NextResponse.json(
          { error: 'courseId, name, componentType, and weightPercent are required' },
          { status: 400 }
        );
      }
      const weight = Number(data.weightPercent);
      const existing = await prisma.assessmentComponent.findMany({
        where: { courseId: data.courseId, semesterId: data.semesterId || null },
        select: { weightPercent: true },
      });
      const currentTotal = existing.reduce((sum, c) => sum + c.weightPercent, 0);
      if (currentTotal + weight > 100.01) {
        return NextResponse.json(
          { error: `Total assessment weight (${currentTotal + weight}%) exceeds 100%.` },
          { status: 400 }
        );
      }

      const component = await prisma.assessmentComponent.create({
        data: {
          courseId: data.courseId,
          semesterId: data.semesterId || null,
          name: String(data.name).trim(),
          componentType: String(data.componentType).trim().toUpperCase(),
          weightPercent: weight,
          maxMarks: Number(data.maxMarks) || 100,
          orderIndex: Number(data.orderIndex) || existing.length + 1,
          sourceType: data.sourceType ? String(data.sourceType).trim().toUpperCase() : null,
          sourceId: data.sourceId || null,
          autoSync: data.autoSync !== undefined ? Boolean(data.autoSync) : true,
        },
      });
      await logAcademicAudit({
        actorId: auth.userId,
        actorName: auth.name,
        actorRole: auth.role,
        action: 'CREATE_ASSESSMENT_COMPONENT',
        entityType: 'AssessmentComponent',
        entityId: component.id,
        details: component,
      });
      return NextResponse.json({ status: true, component }, { status: 201 });
    }

    return NextResponse.json({ error: 'Unsupported academic entity type' }, { status: 400 });
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return NextResponse.json(
        { error: 'A record with this unique code or name already exists.' },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await authorizeRole(ACADEMIC_ADMIN_ROLES);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status || 403 });
  }

  try {
    const body = await req.json();
    const { type, id, data } = body;

    if (!type || !id || !data) {
      return NextResponse.json({ error: 'type, id, and data are required' }, { status: 400 });
    }

    if (type === 'department') {
      const department = await prisma.department.update({
        where: { id },
        data: {
          ...(data.code !== undefined ? { code: String(data.code).trim().toUpperCase() } : {}),
          ...(data.name !== undefined ? { name: String(data.name).trim() } : {}),
          ...(data.description !== undefined ? { description: data.description } : {}),
        },
      });
      await logAcademicAudit({
        actorId: auth.userId,
        actorName: auth.name,
        actorRole: auth.role,
        action: 'UPDATE_DEPARTMENT',
        entityType: 'Department',
        entityId: id,
        details: data,
      });
      return NextResponse.json({ status: true, department });
    }

    if (type === 'programme') {
      const programme = await prisma.programme.update({
        where: { id },
        data: {
          ...(data.code !== undefined ? { code: String(data.code).trim().toUpperCase() } : {}),
          ...(data.name !== undefined ? { name: String(data.name).trim() } : {}),
          ...(data.description !== undefined ? { description: data.description } : {}),
          ...(data.duration !== undefined ? { duration: data.duration } : {}),
          ...(data.qualification !== undefined ? { qualification: data.qualification } : {}),
          ...(data.fee !== undefined ? { fee: Number(data.fee) } : {}),
          ...(data.requirements !== undefined ? { requirements: data.requirements } : {}),
          ...(data.departmentId !== undefined ? { departmentId: data.departmentId || null } : {}),
          ...(data.status !== undefined ? { status: data.status } : {}),
        },
      });
      await logAcademicAudit({
        actorId: auth.userId,
        actorName: auth.name,
        actorRole: auth.role,
        action: 'UPDATE_PROGRAMME',
        entityType: 'Programme',
        entityId: id,
        details: data,
      });
      return NextResponse.json({ status: true, programme });
    }

    if (type === 'academicYear') {
      const isCurrent = data.isCurrent !== undefined ? Boolean(data.isCurrent) : undefined;
      const year = await prisma.$transaction(async (tx) => {
        if (isCurrent === true) {
          await tx.academicYear.updateMany({
            where: { id: { not: id } },
            data: { isCurrent: false },
          });
        }
        return tx.academicYear.update({
          where: { id },
          data: {
            ...(data.name !== undefined ? { name: String(data.name).trim() } : {}),
            ...(data.startDate !== undefined ? { startDate: data.startDate } : {}),
            ...(data.endDate !== undefined ? { endDate: data.endDate } : {}),
            ...(isCurrent !== undefined ? { isCurrent } : {}),
          },
        });
      });
      await logAcademicAudit({
        actorId: auth.userId,
        actorName: auth.name,
        actorRole: auth.role,
        action: 'UPDATE_ACADEMIC_YEAR',
        entityType: 'AcademicYear',
        entityId: id,
        details: data,
      });
      return NextResponse.json({ status: true, year });
    }

    if (type === 'semester') {
      const isCurrent = data.isCurrent !== undefined ? Boolean(data.isCurrent) : undefined;
      const semester = await prisma.$transaction(async (tx) => {
        if (isCurrent === true) {
          await tx.semester.updateMany({
            where: { id: { not: id } },
            data: { isCurrent: false },
          });
        }
        return tx.semester.update({
          where: { id },
          data: {
            ...(data.academicYearId !== undefined ? { academicYearId: data.academicYearId } : {}),
            ...(data.name !== undefined ? { name: String(data.name).trim() } : {}),
            ...(data.startDate !== undefined ? { startDate: data.startDate } : {}),
            ...(data.endDate !== undefined ? { endDate: data.endDate } : {}),
            ...(isCurrent !== undefined ? { isCurrent } : {}),
          },
          include: { academicYear: true },
        });
      });
      await logAcademicAudit({
        actorId: auth.userId,
        actorName: auth.name,
        actorRole: auth.role,
        action: 'UPDATE_SEMESTER',
        entityType: 'Semester',
        entityId: id,
        details: data,
      });
      return NextResponse.json({ status: true, semester });
    }

    if (type === 'cohort') {
      const cohort = await prisma.cohort.update({
        where: { id },
        data: {
          ...(data.name !== undefined ? { name: String(data.name).trim() } : {}),
          ...(data.programmeId !== undefined ? { programmeId: data.programmeId } : {}),
          ...(data.academicYear !== undefined ? { academicYear: data.academicYear } : {}),
          ...(data.semester !== undefined ? { semester: data.semester } : {}),
          ...(data.level !== undefined ? { level: data.level } : {}),
          ...(data.capacity !== undefined
            ? { capacity: data.capacity === null || data.capacity === '' ? null : Number(data.capacity) }
            : {}),
        },
        include: { programme: { select: { id: true, code: true, name: true } } },
      });
      await logAcademicAudit({
        actorId: auth.userId,
        actorName: auth.name,
        actorRole: auth.role,
        action: 'UPDATE_COHORT',
        entityType: 'Cohort',
        entityId: id,
        details: data,
      });
      return NextResponse.json({ status: true, cohort });
    }

    if (type === 'course') {
      const prereqIds: string[] | undefined = Array.isArray(data.prerequisiteCourseIds)
        ? data.prerequisiteCourseIds.filter((pid: string) => pid && pid !== id)
        : undefined;

      const course = await prisma.$transaction(async (tx) => {
        const updated = await tx.course.update({
          where: { id },
          data: {
            ...(data.code !== undefined ? { code: String(data.code).trim().toUpperCase() } : {}),
            ...(data.title !== undefined ? { title: String(data.title).trim() } : {}),
            ...(data.description !== undefined ? { description: data.description } : {}),
            ...(data.creditHours !== undefined ? { creditHours: Number(data.creditHours) } : {}),
            ...(data.level !== undefined ? { level: data.level } : {}),
            ...(data.semester !== undefined ? { semester: data.semester } : {}),
            ...(data.semesterId !== undefined ? { semesterId: data.semesterId || null } : {}),
            ...(data.programmeId !== undefined ? { programmeId: data.programmeId } : {}),
            ...(data.departmentId !== undefined ? { departmentId: data.departmentId || null } : {}),
            ...(data.lecturerId !== undefined ? { lecturerId: data.lecturerId || null } : {}),
            ...(data.isElective !== undefined ? { isElective: Boolean(data.isElective) } : {}),
            ...(data.status !== undefined ? { status: data.status } : {}),
            ...(data.maxCapacity !== undefined
              ? {
                  maxCapacity:
                    data.maxCapacity === null || data.maxCapacity === ''
                      ? null
                      : Number(data.maxCapacity),
                }
              : {}),
            ...(data.thumbnail !== undefined ? { thumbnail: data.thumbnail || null } : {}),
            ...(data.prerequisites !== undefined ? { prerequisites: data.prerequisites || null } : {}),
          },
        });

        if (prereqIds !== undefined) {
          await tx.coursePrerequisite.deleteMany({ where: { courseId: id } });
          for (const prereqId of prereqIds) {
            await tx.coursePrerequisite.create({
              data: { courseId: id, prerequisiteCourseId: prereqId },
            });
          }
        }

        return updated;
      });

      await logAcademicAudit({
        actorId: auth.userId,
        actorName: auth.name,
        actorRole: auth.role,
        action: 'UPDATE_COURSE',
        entityType: 'Course',
        entityId: id,
        details: data,
      });
      return NextResponse.json({ status: true, course });
    }

    if (type === 'schedule') {
      const existing = await prisma.classSchedule.findUnique({ where: { id } });
      if (!existing) {
        return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
      }

      const dayOfWeek = data.dayOfWeek ?? existing.dayOfWeek;
      const startTime = data.startTime ?? existing.startTime;
      const endTime = data.endTime ?? existing.endTime;
      const venue = data.venue ?? existing.venue;
      const room = data.room !== undefined ? data.room : existing.room;
      const lecturerId = data.lecturerId !== undefined ? data.lecturerId : existing.lecturerId;
      const semesterId = data.semesterId !== undefined ? data.semesterId : existing.semesterId;

      const startMins = parseTimeToMinutes(startTime);
      const endMins = parseTimeToMinutes(endTime);
      if (startMins !== null && endMins !== null && endMins <= startMins) {
        return NextResponse.json({ error: 'endTime must be after startTime' }, { status: 400 });
      }

      const conflicts = await detectScheduleConflicts({
        excludeId: id,
        dayOfWeek,
        startTime,
        endTime,
        venue,
        room,
        lecturerId,
        semesterId,
      });

      if (conflicts.length > 0 && !data.overrideConflict) {
        return NextResponse.json(
          { error: 'Timetable conflict detected for lecturer or venue.', conflicts },
          { status: 409 }
        );
      }

      const schedule = await prisma.classSchedule.update({
        where: { id },
        data: {
          ...(data.courseId !== undefined ? { courseId: data.courseId } : {}),
          ...(data.lecturerId !== undefined ? { lecturerId: data.lecturerId || null } : {}),
          ...(data.semesterId !== undefined ? { semesterId: data.semesterId || null } : {}),
          ...(data.cohortId !== undefined ? { cohortId: data.cohortId || null } : {}),
          ...(data.sessionType !== undefined ? { sessionType: data.sessionType } : {}),
          dayOfWeek,
          startTime,
          endTime,
          venue,
          room: room || null,
        },
        include: {
          course: { select: { id: true, code: true, title: true } },
          lecturer: { select: { id: true, name: true } },
        },
      });

      await logAcademicAudit({
        actorId: auth.userId,
        actorName: auth.name,
        actorRole: auth.role,
        action: 'UPDATE_SCHEDULE',
        entityType: 'ClassSchedule',
        entityId: id,
        details: { ...data, conflictsCount: conflicts.length },
      });
      return NextResponse.json({ status: true, schedule, conflicts });
    }

    if (type === 'gradeScale') {
      const gradeScale = await prisma.gradeScale.update({
        where: { id },
        data: {
          ...(data.name !== undefined ? { name: String(data.name).trim() } : {}),
          ...(data.minScore !== undefined ? { minScore: Number(data.minScore) } : {}),
          ...(data.maxScore !== undefined ? { maxScore: Number(data.maxScore) } : {}),
          ...(data.gradeLetter !== undefined
            ? { gradeLetter: String(data.gradeLetter).trim().toUpperCase() }
            : {}),
          ...(data.gradePoint !== undefined ? { gradePoint: Number(data.gradePoint) } : {}),
          ...(data.remark !== undefined ? { remark: data.remark || null } : {}),
          ...(data.isDefault !== undefined ? { isDefault: Boolean(data.isDefault) } : {}),
        },
      });
      await logAcademicAudit({
        actorId: auth.userId,
        actorName: auth.name,
        actorRole: auth.role,
        action: 'UPDATE_GRADE_SCALE',
        entityType: 'GradeScale',
        entityId: id,
        details: data,
      });
      return NextResponse.json({ status: true, gradeScale });
    }

    if (type === 'assessmentComponent') {
      const existingComp = await prisma.assessmentComponent.findUnique({ where: { id } });
      if (!existingComp) {
        return NextResponse.json({ error: 'AssessmentComponent not found' }, { status: 404 });
      }
      if (data.weightPercent !== undefined) {
        const others = await prisma.assessmentComponent.findMany({
          where: {
            courseId: existingComp.courseId,
            semesterId: existingComp.semesterId,
            id: { not: id },
          },
          select: { weightPercent: true },
        });
        const newTotal = others.reduce((s, c) => s + c.weightPercent, 0) + Number(data.weightPercent);
        if (newTotal > 100.01) {
          return NextResponse.json(
            { error: `Total assessment weight (${newTotal}%) exceeds 100%.` },
            { status: 400 }
          );
        }
      }

      const component = await prisma.assessmentComponent.update({
        where: { id },
        data: {
          ...(data.name !== undefined ? { name: String(data.name).trim() } : {}),
          ...(data.componentType !== undefined
            ? { componentType: String(data.componentType).trim().toUpperCase() }
            : {}),
          ...(data.weightPercent !== undefined ? { weightPercent: Number(data.weightPercent) } : {}),
          ...(data.maxMarks !== undefined ? { maxMarks: Number(data.maxMarks) } : {}),
          ...(data.orderIndex !== undefined ? { orderIndex: Number(data.orderIndex) } : {}),
          ...(data.sourceType !== undefined
            ? { sourceType: data.sourceType ? String(data.sourceType).trim().toUpperCase() : null }
            : {}),
          ...(data.sourceId !== undefined ? { sourceId: data.sourceId || null } : {}),
          ...(data.autoSync !== undefined ? { autoSync: Boolean(data.autoSync) } : {}),
        },
      });
      await logAcademicAudit({
        actorId: auth.userId,
        actorName: auth.name,
        actorRole: auth.role,
        action: 'UPDATE_ASSESSMENT_COMPONENT',
        entityType: 'AssessmentComponent',
        entityId: id,
        details: data,
      });
      return NextResponse.json({ status: true, component });
    }

    return NextResponse.json({ error: 'Unsupported academic entity type' }, { status: 400 });
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return NextResponse.json(
        { error: 'A record with this unique code or name already exists.' },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await authorizeRole(ACADEMIC_ADMIN_ROLES);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status || 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      // Allow query-param only DELETE
    }

    const type = searchParams.get('type') || body.type;
    const id = searchParams.get('id') || body.id;

    if (!type || !id) {
      return NextResponse.json({ error: 'type and id are required' }, { status: 400 });
    }

    const modelMap: Record<string, () => Promise<any>> = {
      department: () => prisma.department.delete({ where: { id } }),
      programme: () => prisma.programme.delete({ where: { id } }),
      academicYear: () => prisma.academicYear.delete({ where: { id } }),
      semester: () => prisma.semester.delete({ where: { id } }),
      cohort: () => prisma.cohort.delete({ where: { id } }),
      course: () => prisma.course.delete({ where: { id } }),
      schedule: () => prisma.classSchedule.delete({ where: { id } }),
      gradeScale: () => prisma.gradeScale.delete({ where: { id } }),
      assessmentComponent: () => prisma.assessmentComponent.delete({ where: { id } }),
    };

    const deleter = modelMap[type];
    if (!deleter) {
      return NextResponse.json({ error: 'Unsupported academic entity type' }, { status: 400 });
    }

    await deleter();

    await logAcademicAudit({
      actorId: auth.userId,
      actorName: auth.name,
      actorRole: auth.role,
      action: `DELETE_${type.toUpperCase()}`,
      entityType: type,
      entityId: id,
    });

    return NextResponse.json({ status: true, type, id });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
