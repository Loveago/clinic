import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  RESULTS_ADMIN_ROLES,
  authorizeRole,
  logAcademicAudit,
} from '@/lib/portal-auth';
import { sendNotificationOnce } from '@/lib/school-admin';
import { recalculateContinuousAssessment } from '@/lib/auto-grader';

interface GradeBand {
  minScore: number;
  maxScore: number;
  gradeLetter: string;
  gradePoint: number;
  remark: string | null;
}

const DEFAULT_GRADE_BANDS: GradeBand[] = [
  { minScore: 80, maxScore: 100, gradeLetter: 'A', gradePoint: 4.0, remark: 'Distinction' },
  { minScore: 75, maxScore: 79.99, gradeLetter: 'B+', gradePoint: 3.5, remark: 'Very Good' },
  { minScore: 70, maxScore: 74.99, gradeLetter: 'B', gradePoint: 3.0, remark: 'Good' },
  { minScore: 65, maxScore: 69.99, gradeLetter: 'C+', gradePoint: 2.5, remark: 'Credit' },
  { minScore: 60, maxScore: 64.99, gradeLetter: 'C', gradePoint: 2.0, remark: 'Pass' },
  { minScore: 55, maxScore: 59.99, gradeLetter: 'D+', gradePoint: 1.5, remark: 'Marginal Pass' },
  { minScore: 50, maxScore: 54.99, gradeLetter: 'D', gradePoint: 1.0, remark: 'Pass' },
  { minScore: 0, maxScore: 49.99, gradeLetter: 'F', gradePoint: 0.0, remark: 'Fail' },
];

async function getActiveGradeBands(): Promise<GradeBand[]> {
  const scales = await prisma.gradeScale.findMany({
    orderBy: [{ isDefault: 'desc' }, { minScore: 'desc' }],
  });

  if (scales.length === 0) {
    return DEFAULT_GRADE_BANDS;
  }

  const defaultScales = scales.filter((s) => s.isDefault);
  const chosen = defaultScales.length > 0 ? defaultScales : scales;
  return chosen
    .map((s) => ({
      minScore: s.minScore,
      maxScore: s.maxScore,
      gradeLetter: s.gradeLetter,
      gradePoint: s.gradePoint,
      remark: s.remark,
    }))
    .sort((a, b) => b.minScore - a.minScore);
}

function resolveGradeFromScore(score: number, bands: GradeBand[]) {
  const clamped = Math.max(0, Math.min(100, Number(score) || 0));
  const match =
    bands.find((b) => clamped >= b.minScore && clamped <= b.maxScore) ||
    bands.find((b) => clamped >= b.minScore) ||
    bands[bands.length - 1];

  return {
    grade: match.gradeLetter,
    gpaPoint: match.gradePoint,
    remark: match.remark,
  };
}

function computeWeightedGpa(
  records: Array<{ totalScore: number; gpaPoint: number; course: { creditHours: number } }>,
  bands: GradeBand[]
) {
  let totalCredits = 0;
  let totalQualityPoints = 0;

  for (const r of records) {
    const credits = r.course?.creditHours || 3;
    const resolved = resolveGradeFromScore(r.totalScore, bands);
    const point = bands.length > 0 ? resolved.gpaPoint : r.gpaPoint;
    totalCredits += credits;
    totalQualityPoints += point * credits;
  }

  const gpa = totalCredits > 0 ? Number((totalQualityPoints / totalCredits).toFixed(2)) : 0;
  return { gpa, totalCredits, totalQualityPoints: Number(totalQualityPoints.toFixed(2)) };
}

export async function GET(req: NextRequest) {
  const auth = await authorizeRole([...RESULTS_ADMIN_ROLES, 'LECTURER']);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status || 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const programmeId = searchParams.get('programmeId')?.trim();
    const courseId = searchParams.get('courseId')?.trim();
    const level = searchParams.get('level')?.trim();
    const semester = searchParams.get('semester')?.trim();
    const semesterId = searchParams.get('semesterId')?.trim();
    const academicYear = searchParams.get('academicYear')?.trim();
    const status = searchParams.get('status')?.trim();
    const studentId = searchParams.get('studentId')?.trim();
    const search = searchParams.get('search')?.trim();

    const where: any = {};
    if (courseId) where.courseId = courseId;
    if (semester) where.semester = semester;
    if (semesterId) where.semesterId = semesterId;
    if (academicYear) where.academicYear = academicYear;
    if (status) where.status = status;
    if (studentId) where.studentId = studentId;

    if (programmeId || level) {
      where.course = {
        ...(programmeId ? { programmeId } : {}),
        ...(level ? { level } : {}),
      };
    }

    if (search) {
      where.OR = [
        { student: { studentId: { contains: search } } },
        { student: { user: { name: { contains: search } } } },
        { course: { code: { contains: search } } },
        { course: { title: { contains: search } } },
      ];
    }

    const [results, gradeScales, bands] = await Promise.all([
      prisma.continuousAssessment.findMany({
        where,
        include: {
          student: {
            include: {
              user: { select: { id: true, name: true, email: true } },
              programme: { select: { id: true, code: true, name: true } },
            },
          },
          course: {
            include: {
              programme: { select: { id: true, code: true, name: true } },
              department: { select: { id: true, code: true, name: true } },
            },
          },
        },
        orderBy: [{ updatedAt: 'desc' }],
      }),
      prisma.gradeScale.findMany({ orderBy: [{ minScore: 'desc' }] }),
      getActiveGradeBands(),
    ]);

    const studentIds = Array.from(new Set(results.map((r) => r.studentId)));
    const allStudentResults =
      studentIds.length > 0
        ? await prisma.continuousAssessment.findMany({
            where: { studentId: { in: studentIds } },
            include: { course: { select: { creditHours: true } } },
          })
        : [];

    const byStudent = new Map<string, typeof allStudentResults>();
    for (const r of allStudentResults) {
      const list = byStudent.get(r.studentId) || [];
      list.push(r);
      byStudent.set(r.studentId, list);
    }

    const studentSummaries = studentIds.map((sid) => {
      const filteredForStudent = results.filter((r) => r.studentId === sid);
      const allForStudent = byStudent.get(sid) || [];
      const firstRec = filteredForStudent[0];

      const semCalc = computeWeightedGpa(filteredForStudent, bands);
      const cgpaCalc = computeWeightedGpa(allForStudent, bands);

      return {
        studentId: sid,
        studentCode: firstRec?.student.studentId,
        studentName: firstRec?.student.user.name,
        programme: firstRec?.student.programme.name,
        level: firstRec?.student.level,
        semesterGPA: semCalc.gpa,
        semesterCredits: semCalc.totalCredits,
        cgpa: cgpaCalc.gpa,
        cumulativeCredits: cgpaCalc.totalCredits,
      };
    });

    const stats = {
      total: results.length,
      draft: results.filter((r) => r.status === 'DRAFT').length,
      submitted: results.filter((r) => r.status === 'SUBMITTED').length,
      underReview: results.filter((r) => r.status === 'UNDER_REVIEW').length,
      approved: results.filter((r) => r.status === 'APPROVED').length,
      published: results.filter((r) => r.status === 'PUBLISHED').length,
      returned: results.filter((r) => r.status === 'RETURNED').length,
      locked: results.filter((r) => r.status === 'LOCKED').length,
    };

    return NextResponse.json({
      results,
      gradeScales,
      studentSummaries,
      stats,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await authorizeRole(RESULTS_ADMIN_ROLES);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status || 403 });
  }

  try {
    const body = await req.json();
    const { action, resultIds, resultId, remarks, recalculateGrades, courseId, semesterId, studentIds } = body;

    if (action === 'auto_recalculate') {
      if (!courseId) {
        return NextResponse.json(
          { error: 'courseId is required for auto_recalculate' },
          { status: 400 }
        );
      }

      let targetStudentIds: string[] = Array.isArray(studentIds)
        ? studentIds.filter(Boolean)
        : [];

      if (targetStudentIds.length === 0) {
        const [regs, enrolls] = await Promise.all([
          prisma.courseRegistration.findMany({
            where: {
              courseId,
              status: 'APPROVED',
              ...(semesterId ? { semesterId } : {}),
            },
            select: { studentId: true },
          }),
          prisma.courseEnrollment.findMany({
            where: { courseId },
            select: { studentId: true },
          }),
        ]);
        targetStudentIds = Array.from(
          new Set([...regs.map((r) => r.studentId), ...enrolls.map((e) => e.studentId)])
        );
      }

      const recalculated = [];
      for (const sid of targetStudentIds) {
        const ca = await recalculateContinuousAssessment(sid, courseId, semesterId || null);
        if (ca) recalculated.push(ca);
      }

      await logAcademicAudit({
        actorId: auth.userId,
        actorName: auth.name,
        actorRole: auth.role,
        action: 'RESULTS_AUTO_RECALCULATE',
        entityType: 'ContinuousAssessment',
        entityId: courseId,
        details: {
          courseId,
          semesterId: semesterId || null,
          studentCount: targetStudentIds.length,
          recalculatedCount: recalculated.length,
        },
      });

      return NextResponse.json({
        status: true,
        action: 'auto_recalculate',
        recalculatedCount: recalculated.length,
        results: recalculated,
      });
    }

    const ids: string[] = Array.isArray(resultIds)
      ? resultIds.filter(Boolean)
      : resultId
      ? [resultId]
      : [];

    if (!action || ids.length === 0) {
      return NextResponse.json(
        { error: 'action and resultId/resultIds are required' },
        { status: 400 }
      );
    }

    const validActions = new Set([
      'approve',
      'return',
      'publish',
      'lock',
      'reopen',
      'recalculate',
    ]);
    if (!validActions.has(action)) {
      return NextResponse.json(
        { error: `Unsupported action "${action}". Allowed: approve, return, publish, lock, reopen, recalculate.` },
        { status: 400 }
      );
    }

    if (action === 'return' && !remarks?.trim()) {
      return NextResponse.json(
        { error: 'Remarks are required when returning results to a lecturer.' },
        { status: 400 }
      );
    }

    const existingRecords = await prisma.continuousAssessment.findMany({
      where: { id: { in: ids } },
      include: {
        student: { include: { user: { select: { id: true, name: true } } } },
        course: { select: { id: true, code: true, title: true, creditHours: true } },
      },
    });

    if (existingRecords.length === 0) {
      return NextResponse.json({ error: 'No matching assessment records found' }, { status: 404 });
    }

    const bands = await getActiveGradeBands();
    const now = new Date();
    const updatedResults = [];
    const affectedStudentIds = new Set<string>();

    for (const rec of existingRecords) {
      affectedStudentIds.add(rec.studentId);

      if (rec.status === 'LOCKED' && action !== 'reopen') {
        continue;
      }

      const totalScore = Number((rec.caScore + rec.examScore).toFixed(2));
      const computed = resolveGradeFromScore(totalScore, bands);
      const shouldRecalc = Boolean(recalculateGrades) || action === 'recalculate';

      const data: any = {};

      if (shouldRecalc) {
        data.totalScore = totalScore;
        data.grade = computed.grade;
        data.gpaPoint = computed.gpaPoint;
      }

      if (action === 'approve') {
        data.status = 'APPROVED';
        data.isApproved = true;
        data.approvedById = auth.userId || null;
        data.approvedAt = now;
        if (remarks !== undefined) data.remarks = remarks;
      } else if (action === 'return') {
        data.status = 'RETURNED';
        data.isApproved = false;
        data.isPublished = false;
        data.remarks = remarks.trim();
      } else if (action === 'publish') {
        data.status = 'PUBLISHED';
        data.isApproved = true;
        data.isPublished = true;
        data.approvedById = rec.approvedById || auth.userId || null;
        data.approvedAt = rec.approvedAt || now;
        data.publishedAt = now;
        if (remarks !== undefined) data.remarks = remarks;
      } else if (action === 'lock') {
        data.status = 'LOCKED';
      } else if (action === 'reopen') {
        data.status = 'UNDER_REVIEW';
        data.isApproved = false;
        data.isPublished = false;
        if (remarks !== undefined) data.remarks = remarks;
      }

      const updated = await prisma.continuousAssessment.update({
        where: { id: rec.id },
        data,
        include: {
          student: {
            include: { user: { select: { id: true, name: true, email: true } } },
          },
          course: { select: { id: true, code: true, title: true, creditHours: true } },
        },
      });
      updatedResults.push(updated);

      if (action === 'publish' && rec.student?.user?.id) {
        await sendNotificationOnce({
          userId: rec.student.user.id,
          title: `Result Published: ${rec.course.code}`,
          message: `Your ${rec.semester} (${rec.academicYear}) result for ${rec.course.code} — ${rec.course.title} has been published (${updated.grade}, ${updated.totalScore}%).`,
          type: 'result',
          link: '/portal/student/results',
          dedupeKey: `result-published-${rec.id}-${rec.semester}-${rec.academicYear}`,
        });
      }
    }

    // Recompute and persist Student.cgpa for affected students on publish or recalculate
    if (action === 'publish' || action === 'recalculate') {
      for (const sid of affectedStudentIds) {
        const studentRecords = await prisma.continuousAssessment.findMany({
          where: { studentId: sid, isPublished: true },
          include: { course: { select: { creditHours: true } } },
        });
        if (studentRecords.length > 0) {
          const { gpa } = computeWeightedGpa(studentRecords, bands);
          await prisma.student.update({
            where: { id: sid },
            data: { cgpa: gpa },
          });
        }
      }
    }

    await logAcademicAudit({
      actorId: auth.userId,
      actorName: auth.name,
      actorRole: auth.role,
      action: `RESULTS_${action.toUpperCase()}`,
      entityType: 'ContinuousAssessment',
      entityId: updatedResults.map((r) => r.id).join(','),
      details: {
        action,
        requestedCount: ids.length,
        updatedCount: updatedResults.length,
        remarks: remarks || null,
      },
    });

    return NextResponse.json({
      status: true,
      action,
      updatedCount: updatedResults.length,
      results: updatedResults,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
