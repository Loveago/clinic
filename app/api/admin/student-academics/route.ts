import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizeRole, RESULTS_ADMIN_ROLES } from '@/lib/portal-auth';

export async function GET(req: NextRequest) {
  const auth = await authorizeRole([...RESULTS_ADMIN_ROLES, 'SCHOOL_ADMIN']);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status || 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get('studentId') || undefined;
    const track = searchParams.get('track') || undefined;
    const search = searchParams.get('search')?.trim() || '';

    if (studentId) {
      const [student, topicAssessmentAttempts, topicMasteries] = await Promise.all([
        prisma.student.findUnique({
          where: { id: studentId },
          include: {
            user: { select: { name: true, email: true, phone: true } },
            programme: { select: { code: true, name: true } },
            registrations: {
              include: { course: { select: { id: true, code: true, title: true, creditHours: true } } },
            },
            examAttempts: {
              include: {
                exam: {
                  select: {
                    id: true,
                    title: true,
                    examType: true,
                    studyTrack: true,
                    passMark: true,
                    totalMarks: true,
                    course: { select: { code: true, title: true } },
                  },
                },
              },
              orderBy: { startedAt: 'desc' },
            },
            caResults: {
              include: {
                course: { select: { code: true, title: true, creditHours: true } },
              },
              orderBy: { updatedAt: 'desc' },
            },
          },
        }),
        prisma.topicAssessmentAttempt.findMany({
          where: { studentId },
          include: {
            assessment: {
              select: {
                id: true,
                title: true,
                passMark: true,
                totalMarks: true,
                courseId: true,
                topic: { select: { id: true, title: true } },
              },
            },
          },
          orderBy: { startedAt: 'desc' },
        }),
        prisma.studentTopicMastery.findMany({
          where: { studentId },
          include: {
            topic: {
              select: {
                id: true,
                title: true,
                orderIndex: true,
                courseId: true,
              },
            },
          },
        }),
      ]);

      if (!student) {
        return NextResponse.json({ error: 'Student not found' }, { status: 404 });
      }

      return NextResponse.json({
        student: {
          ...student,
          topicAssessmentAttempts,
          topicMasteries,
          assessments: student.caResults,
        },
      });
    }

    const [students, allQuizAttempts, allMasteries] = await Promise.all([
      prisma.student.findMany({
        where: {
          ...(track ? { studyTrack: track } : {}),
          ...(search
            ? {
                OR: [
                  { studentId: { contains: search, mode: 'insensitive' } },
                  { user: { name: { contains: search, mode: 'insensitive' } } },
                  { user: { email: { contains: search, mode: 'insensitive' } } },
                ],
              }
            : {}),
        },
        include: {
          user: { select: { name: true, email: true } },
          programme: { select: { code: true, name: true } },
          examAttempts: {
            where: { status: { not: 'IN_PROGRESS' } },
            select: { percentage: true },
          },
          caResults: {
            select: { gpaPoint: true },
          },
        },
        orderBy: { admissionDate: 'desc' },
        take: 100,
      }),
      prisma.topicAssessmentAttempt.findMany({
        where: { status: { not: 'IN_PROGRESS' } },
        select: { studentId: true, percentage: true },
      }),
      prisma.studentTopicMastery.findMany({
        select: { studentId: true, masteryStatus: true },
      }),
    ]);

    const summaries = students.map((s) => {
      const examsTaken = s.examAttempts.length;
      const avgExamPct =
        examsTaken > 0
          ? Number((s.examAttempts.reduce((acc, a) => acc + (a.percentage || 0), 0) / examsTaken).toFixed(1))
          : 0;
      const myQuizzes = allQuizAttempts.filter((q) => q.studentId === s.id);
      const quizzesTaken = myQuizzes.length;
      const avgQuizPct =
        quizzesTaken > 0
          ? Number((myQuizzes.reduce((acc, a) => acc + (a.percentage || 0), 0) / quizzesTaken).toFixed(1))
          : 0;
      const myMasteries = allMasteries.filter((m) => m.studentId === s.id);
      const modulesCompleted = myMasteries.filter((m) =>
        ['COMPLETED', 'MASTERED'].includes(m.masteryStatus)
      ).length;
      const gpa =
        s.caResults.length > 0
          ? Number((s.caResults.reduce((acc, a) => acc + (a.gpaPoint || 0), 0) / s.caResults.length).toFixed(2))
          : 0;

      return {
        id: s.id,
        studentId: s.studentId,
        name: s.user?.name || 'Student',
        email: s.user?.email || '',
        programme: s.programme?.name || '—',
        studyTrack: s.studyTrack,
        level: s.level,
        status: s.status,
        examsTaken,
        avgExamPct,
        quizzesTaken,
        avgQuizPct,
        modulesCompleted,
        gpa,
      };
    });

    return NextResponse.json({ students: summaries });
  } catch (error) {
    console.error('GET admin student-academics error:', error);
    return NextResponse.json({ error: 'Failed to load student academics' }, { status: 500 });
  }
}
