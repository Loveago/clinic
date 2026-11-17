import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveStudentRecord } from '@/lib/portal-auth';

const ATTENDANCE_THRESHOLD = 75;

export async function GET() {
  try {
    const student = await resolveStudentRecord();
    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    const [records, registrations] = await Promise.all([
      prisma.attendanceRecord.findMany({
        where: { studentId: student.id },
        include: {
          session: {
            include: {
              course: true,
              lecturer: { select: { name: true } },
            },
          },
        },
        orderBy: { session: { date: 'desc' } },
      }),
      prisma.courseRegistration.findMany({
        where: {
          studentId: student.id,
          status: { not: 'DROPPED' },
        },
        include: {
          course: { select: { id: true, code: true, title: true } },
        },
      }),
    ]);

    const totalSessions = records.length;
    const presentCount = records.filter((r) => r.status === 'PRESENT').length;
    const lateCount = records.filter((r) => r.status === 'LATE').length;
    const absentCount = records.filter((r) => r.status === 'ABSENT').length;
    const excusedCount = records.filter((r) => r.status === 'EXCUSED').length;
    const attendedCount = presentCount + lateCount;
    const overallRate = totalSessions > 0 ? Math.round((attendedCount / totalSessions) * 100) : 0;
    const belowThreshold = totalSessions > 0 && overallRate < ATTENDANCE_THRESHOLD;

    // Group by course
    const courseStatsMap = new Map<
      string,
      {
        courseId: string;
        courseCode: string;
        courseTitle: string;
        totalSessions: number;
        presentCount: number;
        lateCount: number;
        absentCount: number;
        excusedCount: number;
      }
    >();

    for (const reg of registrations) {
      courseStatsMap.set(reg.courseId, {
        courseId: reg.course.id,
        courseCode: reg.course.code,
        courseTitle: reg.course.title,
        totalSessions: 0,
        presentCount: 0,
        lateCount: 0,
        absentCount: 0,
        excusedCount: 0,
      });
    }

    for (const r of records) {
      const cId = r.session.courseId;
      if (!courseStatsMap.has(cId)) {
        courseStatsMap.set(cId, {
          courseId: cId,
          courseCode: r.session.course.code,
          courseTitle: r.session.course.title,
          totalSessions: 0,
          presentCount: 0,
          lateCount: 0,
          absentCount: 0,
          excusedCount: 0,
        });
      }
      const stat = courseStatsMap.get(cId)!;
      stat.totalSessions += 1;
      if (r.status === 'PRESENT') stat.presentCount += 1;
      else if (r.status === 'LATE') stat.lateCount += 1;
      else if (r.status === 'ABSENT') stat.absentCount += 1;
      else if (r.status === 'EXCUSED') stat.excusedCount += 1;
    }

    const courseBreakdown = Array.from(courseStatsMap.values()).map((c) => {
      const rate =
        c.totalSessions > 0
          ? Math.round(((c.presentCount + c.lateCount) / c.totalSessions) * 100)
          : 0;
      return {
        ...c,
        attendanceRate: rate,
        belowThreshold: c.totalSessions > 0 && rate < ATTENDANCE_THRESHOLD,
      };
    });

    return NextResponse.json({
      summary: {
        totalSessions,
        presentCount,
        lateCount,
        absentCount,
        excusedCount,
        overallRate,
        thresholdPercent: ATTENDANCE_THRESHOLD,
        belowThreshold,
      },
      courseBreakdown,
      records: records.map((r) => ({
        id: r.id,
        courseId: r.session.courseId,
        date: r.session.date,
        sessionTitle: r.session.title,
        sessionType: r.session.sessionType,
        courseCode: r.session.course.code,
        courseTitle: r.session.course.title,
        lecturer: r.session.lecturer.name,
        status: r.status,
        notes: r.notes,
      })),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
