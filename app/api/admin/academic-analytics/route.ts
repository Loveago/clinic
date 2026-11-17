import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ACADEMIC_ADMIN_ROLES, authorizeRole } from '@/lib/portal-auth';

function csvEscape(val: unknown): string {
  const str = val === null || val === undefined ? '' : String(val);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toCsv(headers: string[], rows: Array<Array<unknown>>): string {
  const lines = [headers.map(csvEscape).join(',')];
  for (const row of rows) {
    lines.push(row.map(csvEscape).join(','));
  }
  return lines.join('\n');
}

export async function GET(req: NextRequest) {
  const auth = await authorizeRole([...ACADEMIC_ADMIN_ROLES, 'EXAM_OFFICER', 'LECTURER']);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status || 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const academicYearId = searchParams.get('academicYearId')?.trim() || undefined;
    const semesterId = searchParams.get('semesterId')?.trim() || undefined;
    const programmeId = searchParams.get('programmeId')?.trim() || undefined;
    const departmentId = searchParams.get('departmentId')?.trim() || undefined;
    const format = searchParams.get('format')?.trim().toLowerCase();
    const section = searchParams.get('section')?.trim().toLowerCase() || 'at-risk';

    const [academicYear, semester] = await Promise.all([
      academicYearId
        ? prisma.academicYear.findUnique({ where: { id: academicYearId } })
        : Promise.resolve(null),
      semesterId
        ? prisma.semester.findUnique({ where: { id: semesterId } })
        : Promise.resolve(null),
    ]);

    const courseWhere: any = {};
    if (programmeId) courseWhere.programmeId = programmeId;
    if (departmentId) courseWhere.departmentId = departmentId;
    if (semesterId && semester) {
      courseWhere.OR = [{ semesterId }, { semester: semester.name }];
    }

    const studentWhere: any = {};
    if (programmeId) studentWhere.programmeId = programmeId;
    if (departmentId) studentWhere.programme = { departmentId };
    if (academicYear) studentWhere.academicYear = academicYear.name;

    const [
      programmes,
      departments,
      academicYears,
      semesters,
      courses,
      students,
    ] = await Promise.all([
      prisma.programme.findMany({
        where: departmentId ? { departmentId } : undefined,
        include: { department: { select: { id: true, code: true, name: true } } },
        orderBy: { code: 'asc' },
      }),
      prisma.department.findMany({ orderBy: { name: 'asc' } }),
      prisma.academicYear.findMany({ orderBy: { name: 'desc' } }),
      prisma.semester.findMany({
        where: academicYearId ? { academicYearId } : undefined,
        include: { academicYear: true },
        orderBy: { startDate: 'desc' },
      }),
      prisma.course.findMany({
        where: courseWhere,
        include: {
          programme: { select: { id: true, code: true, name: true } },
          department: { select: { id: true, code: true, name: true } },
          enrollments: { select: { studentId: true, status: true } },
        },
        orderBy: { code: 'asc' },
      }),
      prisma.student.findMany({
        where: studentWhere,
        include: {
          user: { select: { id: true, name: true, email: true } },
          programme: { select: { id: true, code: true, name: true, departmentId: true } },
        },
      }),
    ]);

    const courseIds = courses.map((c) => c.id);
    const studentIds = students.map((s) => s.id);

    const [
      registrationsCount,
      attendanceSessions,
      assignments,
      caRecords,
      lecturers,
    ] = await Promise.all([
      prisma.courseRegistration.count({
        where: {
          ...(courseIds.length > 0 ? { courseId: { in: courseIds } } : {}),
          ...(semesterId ? { semesterId } : {}),
        },
      }),
      prisma.attendanceSession.findMany({
        where: {
          ...(courseIds.length > 0 ? { courseId: { in: courseIds } } : { courseId: '__none__' }),
          ...(semesterId ? { semesterId } : {}),
        },
        include: {
          records: {
            where: studentIds.length > 0 ? { studentId: { in: studentIds } } : undefined,
            select: { studentId: true, status: true },
          },
        },
      }),
      prisma.assignment.findMany({
        where: {
          ...(courseIds.length > 0 ? { courseId: { in: courseIds } } : { courseId: '__none__' }),
          status: { not: 'DRAFT' },
        },
        include: {
          submissions: {
            where: studentIds.length > 0 ? { studentId: { in: studentIds } } : undefined,
            select: { studentId: true, score: true, isGraded: true, isLate: true },
          },
        },
      }),
      prisma.continuousAssessment.findMany({
        where: {
          ...(courseIds.length > 0 ? { courseId: { in: courseIds } } : {}),
          ...(studentIds.length > 0 ? { studentId: { in: studentIds } } : {}),
          ...(academicYear ? { academicYear: academicYear.name } : {}),
          ...(semester ? { semester: semester.name } : {}),
        },
        include: {
          course: { select: { id: true, code: true, title: true, creditHours: true } },
        },
      }),
      prisma.user.findMany({
        where: {
          role: 'LECTURER',
          ...(departmentId ? { lecturerProfile: { departmentId } } : {}),
        },
        include: {
          lecturerProfile: {
            include: { department: { select: { id: true, code: true, name: true } } },
          },
          lecturerCourses: {
            where: courseWhere,
            select: { id: true, code: true, title: true, creditHours: true },
          },
          courseAssignments: {
            where: {
              isActive: true,
              ...(semesterId ? { semesterId } : {}),
              ...(academicYearId ? { academicYearId } : {}),
              ...(courseIds.length > 0 ? { courseId: { in: courseIds } } : {}),
            },
            include: {
              course: { select: { id: true, code: true, title: true, creditHours: true } },
            },
          },
          teachingSchedules: {
            where: {
              ...(courseIds.length > 0 ? { courseId: { in: courseIds } } : {}),
              ...(semesterId ? { semesterId } : {}),
            },
            select: { id: true, courseId: true, dayOfWeek: true },
          },
        },
        orderBy: { name: 'asc' },
      }),
    ]);

    // 1. Enrolment breakdown
    const totalStudents = students.length;
    const activeStudents = students.filter((s) => s.status === 'ACTIVE').length;
    const totalEnrollments = courses.reduce((sum, c) => sum + c.enrollments.length, 0);

    const enrolmentByProgramme = programmes.map((p) => {
      const progStudents = students.filter((s) => s.programmeId === p.id);
      const progCourses = courses.filter((c) => c.programmeId === p.id);
      return {
        programmeId: p.id,
        code: p.code,
        name: p.name,
        department: p.department?.name || null,
        studentCount: progStudents.length,
        activeCount: progStudents.filter((s) => s.status === 'ACTIVE').length,
        courseCount: progCourses.length,
      };
    });

    const levelCounts = new Map<string, number>();
    for (const s of students) {
      levelCounts.set(s.level, (levelCounts.get(s.level) || 0) + 1);
    }
    const enrolmentByLevel = Array.from(levelCounts.entries())
      .map(([level, count]) => ({ level, count }))
      .sort((a, b) => a.level.localeCompare(b.level));

    // 2. Attendance %
    let totalAttendanceRecords = 0;
    let attendedCount = 0;
    const studentAttendance = new Map<string, { attended: number; total: number }>();

    for (const sess of attendanceSessions) {
      for (const rec of sess.records) {
        totalAttendanceRecords += 1;
        const isAttended =
          rec.status === 'PRESENT' || rec.status === 'LATE' || rec.status === 'EXCUSED';
        if (isAttended) attendedCount += 1;

        const cur = studentAttendance.get(rec.studentId) || { attended: 0, total: 0 };
        cur.total += 1;
        if (isAttended) cur.attended += 1;
        studentAttendance.set(rec.studentId, cur);
      }
    }

    const overallAttendanceRate =
      totalAttendanceRecords > 0
        ? Number(((attendedCount / totalAttendanceRecords) * 100).toFixed(1))
        : 0;

    // 3. Assignment Submission %
    const courseEnrollmentMap = new Map<string, Set<string>>();
    for (const c of courses) {
      courseEnrollmentMap.set(
        c.id,
        new Set(c.enrollments.map((e) => e.studentId))
      );
    }

    let expectedSubmissions = 0;
    let actualSubmissions = 0;
    let gradedSubmissions = 0;
    const studentAssignmentStats = new Map<string, { submitted: number; expected: number }>();

    for (const a of assignments) {
      const enrolledSet = courseEnrollmentMap.get(a.courseId) || new Set<string>();
      const enrolledInFilter = Array.from(enrolledSet).filter((sid) =>
        studentIds.includes(sid)
      );
      const cohortSize = enrolledInFilter.length || students.length;
      expectedSubmissions += cohortSize;
      actualSubmissions += a.submissions.length;
      gradedSubmissions += a.submissions.filter((sub) => sub.isGraded).length;

      const submittedSet = new Set(a.submissions.map((sub) => sub.studentId));
      for (const sid of enrolledInFilter) {
        const cur = studentAssignmentStats.get(sid) || { submitted: 0, expected: 0 };
        cur.expected += 1;
        if (submittedSet.has(sid)) cur.submitted += 1;
        studentAssignmentStats.set(sid, cur);
      }
    }

    const assignmentSubmissionRate =
      expectedSubmissions > 0
        ? Number(Math.min(100, (actualSubmissions / expectedSubmissions) * 100).toFixed(1))
        : 0;

    // 4. Pass Rate & Score Averages
    const totalAssessed = caRecords.length;
    const passedCount = caRecords.filter(
      (r) => r.totalScore >= 50 && r.grade.toUpperCase() !== 'F'
    ).length;
    const failedCount = totalAssessed - passedCount;
    const passRate =
      totalAssessed > 0 ? Number(((passedCount / totalAssessed) * 100).toFixed(1)) : 0;
    const averageScore =
      totalAssessed > 0
        ? Number(
            (caRecords.reduce((sum, r) => sum + r.totalScore, 0) / totalAssessed).toFixed(1)
          )
        : 0;

    const studentCaStats = new Map<
      string,
      { totalScoreSum: number; count: number; failedCourses: number }
    >();
    for (const r of caRecords) {
      const cur = studentCaStats.get(r.studentId) || {
        totalScoreSum: 0,
        count: 0,
        failedCourses: 0,
      };
      cur.totalScoreSum += r.totalScore;
      cur.count += 1;
      if (r.totalScore < 50 || r.grade.toUpperCase() === 'F') {
        cur.failedCourses += 1;
      }
      studentCaStats.set(r.studentId, cur);
    }

    // 5. Lecturer Teaching Load
    const lecturerTeachingLoad = lecturers.map((lec) => {
      const courseMap = new Map<
        string,
        { id: string; code: string; title: string; creditHours: number; role: string }
      >();

      for (const a of lec.courseAssignments) {
        courseMap.set(a.course.id, {
          id: a.course.id,
          code: a.course.code,
          title: a.course.title,
          creditHours: a.course.creditHours,
          role: a.role,
        });
      }
      for (const c of lec.lecturerCourses) {
        if (!courseMap.has(c.id)) {
          courseMap.set(c.id, {
            id: c.id,
            code: c.code,
            title: c.title,
            creditHours: c.creditHours,
            role: 'PRIMARY',
          });
        }
      }

      const assignedCourses = Array.from(courseMap.values());
      const totalCreditHours = assignedCourses.reduce((sum, c) => sum + (c.creditHours || 0), 0);

      return {
        id: lec.id,
        name: lec.name,
        email: lec.email,
        staffId: lec.lecturerProfile?.staffId || lec.staffId,
        department: lec.lecturerProfile?.department?.name || lec.department || 'Unassigned',
        employmentStatus: lec.lecturerProfile?.employmentStatus || 'ACTIVE',
        assignedCoursesCount: assignedCourses.length,
        totalCreditHours,
        scheduledSessionsCount: lec.teachingSchedules.length,
        courses: assignedCourses,
      };
    });

    // 6. At-Risk Students
    const atRiskStudents = students
      .map((s) => {
        const att = studentAttendance.get(s.id);
        const attendanceRate =
          att && att.total > 0 ? Number(((att.attended / att.total) * 100).toFixed(1)) : null;

        const asg = studentAssignmentStats.get(s.id);
        const submissionRate =
          asg && asg.expected > 0
            ? Number(((asg.submitted / asg.expected) * 100).toFixed(1))
            : null;

        const ca = studentCaStats.get(s.id);
        const avgScore =
          ca && ca.count > 0 ? Number((ca.totalScoreSum / ca.count).toFixed(1)) : null;
        const failedCourses = ca?.failedCourses || 0;

        const riskReasons: string[] = [];
        if (attendanceRate !== null && attendanceRate < 75) {
          riskReasons.push(`Low attendance (${attendanceRate}%)`);
        }
        if (s.cgpa < 2.0) {
          riskReasons.push(`Low CGPA (${s.cgpa.toFixed(2)})`);
        }
        if (avgScore !== null && avgScore < 50) {
          riskReasons.push(`Low average score (${avgScore}%)`);
        }
        if (failedCourses > 0) {
          riskReasons.push(`${failedCourses} failed course(s)`);
        }
        if (submissionRate !== null && submissionRate < 50) {
          riskReasons.push(`Low assignment submission (${submissionRate}%)`);
        }

        if (riskReasons.length === 0) return null;

        return {
          studentId: s.id,
          studentCode: s.studentId,
          name: s.user.name,
          email: s.user.email,
          programme: s.programme.name,
          programmeCode: s.programme.code,
          level: s.level,
          cgpa: s.cgpa,
          attendanceRate,
          submissionRate,
          averageScore: avgScore,
          failedCourses,
          riskReasons,
          riskLevel: riskReasons.length >= 2 || failedCourses >= 2 ? 'HIGH' : 'MEDIUM',
        };
      })
      .filter((x): x is NonNullable<typeof x> => Boolean(x));

    // CSV Export
    if (format === 'csv') {
      let csvContent = '';
      if (section === 'lecturers') {
        csvContent = toCsv(
          [
            'Staff ID',
            'Name',
            'Email',
            'Department',
            'Status',
            'Assigned Courses',
            'Total Credit Hours',
            'Scheduled Sessions',
          ],
          lecturerTeachingLoad.map((l) => [
            l.staffId || '',
            l.name,
            l.email,
            l.department,
            l.employmentStatus,
            l.assignedCoursesCount,
            l.totalCreditHours,
            l.scheduledSessionsCount,
          ])
        );
      } else if (section === 'enrolment') {
        csvContent = toCsv(
          ['Programme Code', 'Programme Name', 'Department', 'Total Students', 'Active Students', 'Courses'],
          enrolmentByProgramme.map((p) => [
            p.code,
            p.name,
            p.department || '',
            p.studentCount,
            p.activeCount,
            p.courseCount,
          ])
        );
      } else if (section === 'overview') {
        csvContent = toCsv(
          ['Metric', 'Value'],
          [
            ['Total Students', totalStudents],
            ['Active Students', activeStudents],
            ['Course Enrollments', totalEnrollments],
            ['Course Registrations', registrationsCount],
            ['Attendance Rate (%)', overallAttendanceRate],
            ['Assignment Submission Rate (%)', assignmentSubmissionRate],
            ['Pass Rate (%)', passRate],
            ['Average Score (%)', averageScore],
            ['At-Risk Students', atRiskStudents.length],
          ]
        );
      } else {
        csvContent = toCsv(
          [
            'Student ID',
            'Name',
            'Email',
            'Programme',
            'Level',
            'CGPA',
            'Attendance %',
            'Submission %',
            'Average Score',
            'Failed Courses',
            'Risk Level',
            'Risk Reasons',
          ],
          atRiskStudents.map((r) => [
            r.studentCode,
            r.name,
            r.email,
            r.programme,
            r.level,
            r.cgpa,
            r.attendanceRate ?? 'N/A',
            r.submissionRate ?? 'N/A',
            r.averageScore ?? 'N/A',
            r.failedCourses,
            r.riskLevel,
            r.riskReasons.join('; '),
          ])
        );
      }

      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="academic-analytics-${section}.csv"`,
        },
      });
    }

    return NextResponse.json({
      filters: {
        academicYearId: academicYearId || null,
        semesterId: semesterId || null,
        programmeId: programmeId || null,
        departmentId: departmentId || null,
      },
      filterOptions: {
        academicYears,
        semesters,
        programmes,
        departments,
      },
      summary: {
        totalStudents,
        activeStudents,
        totalCourses: courses.length,
        totalEnrollments,
        totalRegistrations: registrationsCount,
        attendanceRate: overallAttendanceRate,
        totalAttendanceSessions: attendanceSessions.length,
        totalAttendanceRecords,
        assignmentSubmissionRate,
        totalAssignments: assignments.length,
        totalSubmissions: actualSubmissions,
        gradedSubmissions,
        passRate,
        averageScore,
        totalAssessed,
        passedCount,
        failedCount,
        atRiskCount: atRiskStudents.length,
      },
      enrolmentByProgramme,
      enrolmentByLevel,
      lecturerTeachingLoad,
      atRiskStudents,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
