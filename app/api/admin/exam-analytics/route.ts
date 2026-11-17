import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ACADEMIC_ADMIN_ROLES, authorizeRole } from '@/lib/portal-auth';

const EXAM_ADMIN_ROLES = [...ACADEMIC_ADMIN_ROLES, 'EXAM_OFFICER', 'LECTURER'];

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
  const auth = await authorizeRole(EXAM_ADMIN_ROLES);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status || 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const periodId = searchParams.get('periodId')?.trim() || undefined;
    const programmeId = searchParams.get('programmeId')?.trim() || undefined;
    const courseId = searchParams.get('courseId')?.trim() || undefined;
    const level = searchParams.get('level')?.trim() || undefined;
    const format = searchParams.get('format')?.trim().toLowerCase();
    const section = searchParams.get('section')?.trim().toLowerCase() || 'exams';

    const examWhere: any = {};
    if (periodId) examWhere.periodId = periodId;
    if (courseId) examWhere.courseId = courseId;
    if (programmeId || level) {
      examWhere.course = {
        ...(programmeId ? { programmeId } : {}),
        ...(level ? { level } : {}),
      };
    }

    const exams = await prisma.examination.findMany({
      where: examWhere,
      include: {
        course: {
          include: {
            programme: { select: { id: true, code: true, name: true } },
            registrations: { where: { status: 'APPROVED' }, select: { studentId: true } },
          },
        },
        period: { select: { id: true, title: true } },
        questions: {
          include: {
            answers: {
              select: {
                id: true,
                answerText: true,
                selectedOption: true,
                isCorrect: true,
                marksAwarded: true,
                maxMarks: true,
              },
            },
          },
          orderBy: { orderIndex: 'asc' },
        },
        attempts: {
          where: { status: { not: 'IN_PROGRESS' } },
          select: {
            id: true,
            studentId: true,
            score: true,
            percentage: true,
            evaluationStatus: true,
          },
        },
      },
      orderBy: { scheduledDate: 'desc' },
    });

    const buckets = [
      { label: '0-39%', min: 0, max: 39, count: 0 },
      { label: '40-49%', min: 40, max: 49, count: 0 },
      { label: '50-59%', min: 50, max: 59, count: 0 },
      { label: '60-69%', min: 60, max: 69, count: 0 },
      { label: '70-79%', min: 70, max: 79, count: 0 },
      { label: '80-100%', min: 80, max: 100, count: 0 },
    ];

    const examStats = exams.map((ex) => {
      const validAttempts = ex.attempts.filter((a) => a.evaluationStatus !== 'FAILED');
      const totalEligible = ex.course.registrations.length;
      const uniqueParticipants = new Set(ex.attempts.map((a) => a.studentId)).size;
      const participationRate =
        totalEligible > 0
          ? Number(Math.min(100, (uniqueParticipants / totalEligible) * 100).toFixed(1))
          : 0;

      const scores = validAttempts.map((a) => a.percentage);
      const passCount = scores.filter((p) => p >= ex.passMark).length;
      const failCount = scores.length - passCount;
      const passRate =
        scores.length > 0 ? Number(((passCount / scores.length) * 100).toFixed(1)) : 0;
      const failRate = scores.length > 0 ? Number((100 - passRate).toFixed(1)) : 0;
      const avgScore =
        scores.length > 0
          ? Number((scores.reduce((s, p) => s + p, 0) / scores.length).toFixed(1))
          : 0;
      const highestScore = scores.length > 0 ? Math.max(...scores) : 0;
      const lowestScore = scores.length > 0 ? Math.min(...scores) : 0;

      for (const p of scores) {
        const b = buckets.find((bk) => p >= bk.min && p <= bk.max);
        if (b) b.count += 1;
      }

      return {
        examId: ex.id,
        title: ex.title,
        examType: ex.examType,
        periodTitle: ex.period?.title || null,
        courseId: ex.courseId,
        courseCode: ex.course.code,
        courseTitle: ex.course.title,
        level: ex.course.level,
        programmeId: ex.course.programmeId,
        programmeCode: ex.course.programme?.code || '',
        programmeName: ex.course.programme?.name || '',
        passMark: ex.passMark,
        attemptsCount: ex.attempts.length,
        gradedCount: validAttempts.length,
        eligibleStudents: totalEligible,
        participationRate,
        passCount,
        failCount,
        passRate,
        failRate,
        avgScore,
        highestScore,
        lowestScore,
      };
    });

    // Course & Programme comparisons
    const courseMap = new Map<
      string,
      { courseCode: string; courseTitle: string; examsCount: number; attempts: number; passed: number; sumPct: number }
    >();
    const progMap = new Map<
      string,
      { programmeCode: string; programmeName: string; examsCount: number; attempts: number; passed: number; sumPct: number }
    >();

    for (const es of examStats) {
      const cEntry = courseMap.get(es.courseId) || {
        courseCode: es.courseCode,
        courseTitle: es.courseTitle,
        examsCount: 0,
        attempts: 0,
        passed: 0,
        sumPct: 0,
      };
      cEntry.examsCount += 1;
      cEntry.attempts += es.gradedCount;
      cEntry.passed += es.passCount;
      cEntry.sumPct += es.avgScore * es.gradedCount;
      courseMap.set(es.courseId, cEntry);

      if (es.programmeId) {
        const pEntry = progMap.get(es.programmeId) || {
          programmeCode: es.programmeCode,
          programmeName: es.programmeName,
          examsCount: 0,
          attempts: 0,
          passed: 0,
          sumPct: 0,
        };
        pEntry.examsCount += 1;
        pEntry.attempts += es.gradedCount;
        pEntry.passed += es.passCount;
        pEntry.sumPct += es.avgScore * es.gradedCount;
        progMap.set(es.programmeId, pEntry);
      }
    }

    const courseComparisons = Array.from(courseMap.values()).map((c) => ({
      ...c,
      avgScore: c.attempts > 0 ? Number((c.sumPct / c.attempts).toFixed(1)) : 0,
      passRate: c.attempts > 0 ? Number(((c.passed / c.attempts) * 100).toFixed(1)) : 0,
    }));

    const programmeComparisons = Array.from(progMap.values()).map((p) => ({
      ...p,
      avgScore: p.attempts > 0 ? Number((p.sumPct / p.attempts).toFixed(1)) : 0,
      passRate: p.attempts > 0 ? Number(((p.passed / p.attempts) * 100).toFixed(1)) : 0,
    }));

    // Question Performance Analytics (read-only, zero mutation)
    const questionAnalytics = exams.flatMap((ex) =>
      ex.questions.map((q) => {
        const answeredCount = q.answers.length;
        const correctCount = q.answers.filter(
          (a) => a.isCorrect === true || (a.marksAwarded !== null && a.marksAwarded >= q.marks * 0.5)
        ).length;
        const incorrectCount = answeredCount - correctCount;
        const correctPct =
          answeredCount > 0 ? Number(((correctCount / answeredCount) * 100).toFixed(1)) : 0;
        const incorrectPct =
          answeredCount > 0 ? Number((100 - correctPct).toFixed(1)) : 0;
        const avgMarks =
          answeredCount > 0
            ? Number(
                (
                  q.answers.reduce((sum, a) => sum + (a.marksAwarded || 0), 0) / answeredCount
                ).toFixed(2)
              )
            : 0;

        const difficultyIndicator =
          answeredCount === 0
            ? 'UNASSESSED'
            : correctPct >= 80
            ? 'EASY'
            : correctPct >= 40
            ? 'MEDIUM'
            : 'HARD';

        const wrongCounts = new Map<string, number>();
        for (const a of q.answers) {
          const isWrong =
            a.isCorrect === false || (a.marksAwarded !== null && a.marksAwarded < q.marks * 0.5);
          if (isWrong) {
            const val = (a.selectedOption || a.answerText || '').trim();
            if (val) {
              wrongCounts.set(val, (wrongCounts.get(val) || 0) + 1);
            }
          }
        }
        const frequentWrongOptions = Array.from(wrongCounts.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([option, count]) => ({ option, count }));

        const topWrongCount = frequentWrongOptions[0]?.count || 0;
        const ambiguityFlag =
          answeredCount >= 3 &&
          (correctPct < 30 || topWrongCount / answeredCount >= 0.4);

        return {
          questionId: q.id,
          examId: ex.id,
          examTitle: ex.title,
          courseCode: ex.course.code,
          questionType: q.questionType,
          questionText: q.text,
          maxMarks: q.marks,
          answeredCount,
          correctPct,
          incorrectPct,
          avgMarks,
          difficultyIndicator,
          frequentWrongOptions,
          ambiguityFlag,
        };
      })
    );

    if (format === 'csv') {
      const csv =
        section === 'questions'
          ? toCsv(
              [
                'Exam',
                'Course',
                'Type',
                'Question',
                'Max Marks',
                'Answered',
                'Correct %',
                'Incorrect %',
                'Avg Marks',
                'Difficulty',
                'Ambiguity Flag',
              ],
              questionAnalytics.map((q) => [
                q.examTitle,
                q.courseCode,
                q.questionType,
                q.questionText,
                q.maxMarks,
                q.answeredCount,
                q.correctPct,
                q.incorrectPct,
                q.avgMarks,
                q.difficultyIndicator,
                q.ambiguityFlag ? 'FLAGGED' : 'OK',
              ])
            )
          : toCsv(
              [
                'Exam',
                'Type',
                'Course',
                'Programme',
                'Attempts',
                'Participation %',
                'Pass %',
                'Fail %',
                'Avg Score %',
                'Highest %',
                'Lowest %',
              ],
              examStats.map((e) => [
                e.title,
                e.examType,
                e.courseCode,
                e.programmeCode,
                e.attemptsCount,
                e.participationRate,
                e.passRate,
                e.failRate,
                e.avgScore,
                e.highestScore,
                e.lowestScore,
              ])
            );

      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="exam-analytics-${section}.csv"`,
        },
      });
    }

    return NextResponse.json({
      examStats,
      scoreDistribution: buckets.map(({ label, count }) => ({ label, count })),
      courseComparisons,
      programmeComparisons,
      questionAnalytics,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
