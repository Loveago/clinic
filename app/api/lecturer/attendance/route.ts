import { NextRequest, NextResponse } from 'next/server';
import { AttendanceStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import {
  authorizeLecturer,
  verifyLecturerCourseAccess,
  logAcademicAudit,
} from '@/lib/portal-auth';

const VALID_STATUSES = new Set<AttendanceStatus>(['PRESENT', 'LATE', 'ABSENT', 'EXCUSED']);

function normalizeAttendanceStatus(status: unknown): AttendanceStatus {
  const upper = String(status || 'PRESENT').toUpperCase() as AttendanceStatus;
  return VALID_STATUSES.has(upper) ? upper : 'PRESENT';
}

export async function GET(req: NextRequest) {
  try {
    const auth = await authorizeLecturer();
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 403 });
    }

    const { searchParams } = new URL(req.url);
    const courseId = searchParams.get('courseId');
    const cohortId = searchParams.get('cohortId');
    const thresholdParam = Number(searchParams.get('threshold'));
    const threshold = !Number.isNaN(thresholdParam) && thresholdParam > 0 ? thresholdParam : 75;

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
    const sessionWhere: Record<string, unknown> = {};
    if (courseId) {
      sessionWhere.courseId = courseId;
    } else if (!isAdmin) {
      sessionWhere.course = {
        OR: [
          { lecturerId: auth.userId! },
          {
            courseLecturers: {
              some: { lecturerId: auth.userId!, isActive: true },
            },
          },
        ],
      };
    }

    const sessions = await prisma.attendanceSession.findMany({
      where: sessionWhere,
      include: {
        course: true,
        records: {
          include: {
            student: {
              include: {
                user: { select: { id: true, name: true, email: true } },
                cohort: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    });

    if (!courseId) {
      return NextResponse.json({
        sessions,
        enrolledStudents: [],
        studentSummary: [],
        threshold,
      });
    }

    const registrations = await prisma.courseRegistration.findMany({
      where: {
        courseId,
        status: 'APPROVED',
        ...(cohortId ? { student: { cohortId } } : {}),
      },
      include: {
        student: {
          include: {
            user: { select: { id: true, name: true, email: true } },
            cohort: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { registeredAt: 'asc' },
    });

    const totalSessions = sessions.length;
    const enrolledStudents = registrations.map((r) => r.student);

    const studentSummary = enrolledStudents.map((student) => {
      let presentCount = 0;
      let lateCount = 0;
      let absentCount = 0;
      let excusedCount = 0;

      for (const session of sessions) {
        const rec = session.records.find((r) => r.studentId === student.id);
        if (!rec) continue;
        if (rec.status === 'PRESENT') presentCount++;
        else if (rec.status === 'LATE') lateCount++;
        else if (rec.status === 'EXCUSED') excusedCount++;
        else if (rec.status === 'ABSENT') absentCount++;
      }

      const attendedCount = presentCount + lateCount + excusedCount;
      const attendancePercent =
        totalSessions > 0 ? Math.round((attendedCount / totalSessions) * 1000) / 10 : 100;

      return {
        studentId: student.id,
        studentNumber: student.studentId,
        name: student.user.name,
        email: student.user.email,
        cohort: student.cohort,
        totalSessions,
        presentCount,
        lateCount,
        absentCount,
        excusedCount,
        attendancePercent,
        belowThreshold: totalSessions > 0 && attendancePercent < threshold,
      };
    });

    return NextResponse.json({
      sessions,
      enrolledStudents,
      studentSummary,
      threshold,
    });
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
    const { courseId, title, sessionType = 'Lecture', date, venue, semesterId, records } = body;

    if (!courseId || !title) {
      return NextResponse.json(
        { error: 'Course and session title are required' },
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

    const sessionDate = date || new Date().toISOString().split('T')[0];
    const trimmedTitle = String(title).trim();

    // Prevent duplicate attendance session for the same course, date, title, and type
    const existingSession = await prisma.attendanceSession.findFirst({
      where: {
        courseId,
        date: sessionDate,
        title: trimmedTitle,
        sessionType,
      },
      select: { id: true },
    });

    if (existingSession) {
      return NextResponse.json(
        {
          error:
            'An attendance session with this course, date, title, and session type already exists.',
        },
        { status: 409 }
      );
    }

    const session = await prisma.attendanceSession.create({
      data: {
        courseId,
        lecturerId: auth.userId!,
        title: trimmedTitle,
        sessionType,
        date: sessionDate,
        venue: venue || null,
        semesterId: semesterId || null,
      },
    });

    // Deduplicate student records by studentId before writing
    const uniqueRecords = new Map<
      string,
      { studentId: string; status: AttendanceStatus; notes: string | null }
    >();
    if (Array.isArray(records)) {
      for (const rec of records) {
        if (rec?.studentId) {
          uniqueRecords.set(rec.studentId, {
            studentId: rec.studentId,
            status: normalizeAttendanceStatus(rec.status),
            notes: rec.notes || null,
          });
        }
      }
    }

    for (const rec of uniqueRecords.values()) {
      await prisma.attendanceRecord.upsert({
        where: {
          sessionId_studentId: {
            sessionId: session.id,
            studentId: rec.studentId,
          },
        },
        update: {
          status: rec.status,
          notes: rec.notes,
        },
        create: {
          sessionId: session.id,
          studentId: rec.studentId,
          status: rec.status,
          notes: rec.notes,
        },
      });
    }

    const completeSession = await prisma.attendanceSession.findUnique({
      where: { id: session.id },
      include: {
        course: true,
        records: {
          include: {
            student: {
              include: { user: { select: { id: true, name: true, email: true } } },
            },
          },
        },
      },
    });

    await logAcademicAudit({
      actorId: auth.userId,
      actorName: auth.name,
      actorRole: auth.role,
      action: 'ATTENDANCE_SESSION_CREATED',
      entityType: 'AttendanceSession',
      entityId: session.id,
      details: {
        courseId,
        date: sessionDate,
        title: trimmedTitle,
        sessionType,
        recordCount: uniqueRecords.size,
      },
    });

    return NextResponse.json({ status: true, session: completeSession }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await authorizeLecturer();
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 403 });
    }

    const body = await req.json();
    const { sessionId, title, date, sessionType, venue, isLocked, records } = body;

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }

    const existing = await prisma.attendanceSession.findUnique({
      where: { id: sessionId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Attendance session not found' }, { status: 404 });
    }

    const hasAccess = await verifyLecturerCourseAccess(auth.userId!, auth.role!, existing.courseId);
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Forbidden: You are not assigned to this course.' },
        { status: 403 }
      );
    }

    if (existing.isLocked && isLocked !== false) {
      return NextResponse.json(
        { error: 'Attendance session is locked and cannot be edited.' },
        { status: 400 }
      );
    }

    await prisma.attendanceSession.update({
      where: { id: sessionId },
      data: {
        ...(title !== undefined ? { title: String(title).trim() } : {}),
        ...(date !== undefined ? { date } : {}),
        ...(sessionType !== undefined ? { sessionType } : {}),
        ...(venue !== undefined ? { venue } : {}),
        ...(typeof isLocked === 'boolean' ? { isLocked } : {}),
      },
    });

    const uniqueRecords = new Map<
      string,
      { studentId: string; status: AttendanceStatus; notes: string | null }
    >();
    if (Array.isArray(records)) {
      for (const rec of records) {
        if (rec?.studentId) {
          uniqueRecords.set(rec.studentId, {
            studentId: rec.studentId,
            status: normalizeAttendanceStatus(rec.status),
            notes: rec.notes || null,
          });
        }
      }
    }

    for (const rec of uniqueRecords.values()) {
      await prisma.attendanceRecord.upsert({
        where: {
          sessionId_studentId: {
            sessionId,
            studentId: rec.studentId,
          },
        },
        update: {
          status: rec.status,
          notes: rec.notes,
        },
        create: {
          sessionId,
          studentId: rec.studentId,
          status: rec.status,
          notes: rec.notes,
        },
      });
    }

    const updatedSession = await prisma.attendanceSession.findUnique({
      where: { id: sessionId },
      include: {
        course: true,
        records: {
          include: {
            student: {
              include: { user: { select: { id: true, name: true, email: true } } },
            },
          },
        },
      },
    });

    await logAcademicAudit({
      actorId: auth.userId,
      actorName: auth.name,
      actorRole: auth.role,
      action: 'ATTENDANCE_RECORD_UPDATED',
      entityType: 'AttendanceSession',
      entityId: sessionId,
      details: {
        courseId: existing.courseId,
        updatedRecords: uniqueRecords.size,
        isLocked: typeof isLocked === 'boolean' ? isLocked : existing.isLocked,
      },
    });

    return NextResponse.json({ status: true, session: updatedSession });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
