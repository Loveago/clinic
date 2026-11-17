import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizeAdminOrLecturer } from '@/lib/portal-auth';

export async function GET(req: NextRequest) {
  try {
    const auth = await authorizeAdminOrLecturer();
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 403 });
    }

    const { searchParams } = new URL(req.url);
    const courseId = searchParams.get('courseId') || undefined;
    const topicId = searchParams.get('topicId') || undefined;

    const assessments = await prisma.topicAssessment.findMany({
      where: {
        ...(courseId ? { courseId } : {}),
        ...(topicId ? { topicId } : {}),
      },
      include: {
        topic: { select: { id: true, title: true } },
        questions: {
          include: { question: true },
          orderBy: { orderIndex: 'asc' },
        },
        attempts: {
          include: {
            answers: {
              include: { question: true },
            },
          },
          orderBy: { startedAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Enrich with course & student names
    const courses = await prisma.course.findMany({
      select: { id: true, code: true, title: true },
    });
    const courseMap = new Map(courses.map((c) => [c.id, c]));

    const students = await prisma.student.findMany({
      include: { user: { select: { name: true } } },
    });
    const studentMap = new Map(students.map((s) => [s.id, s]));

    const formatted = assessments.map((a) => {
      const course = courseMap.get(a.courseId);
      const submittedAttempts = a.attempts.filter((att) => att.status !== 'IN_PROGRESS');
      const avgPercentage =
        submittedAttempts.length > 0
          ? Math.round(
              submittedAttempts.reduce((sum, att) => sum + att.percentage, 0) /
                submittedAttempts.length
            )
          : 0;
      const passRate =
        submittedAttempts.length > 0
          ? Math.round(
              (submittedAttempts.filter((att) => att.passed).length /
                submittedAttempts.length) *
                100
            )
          : 0;

      return {
        ...a,
        courseCode: course?.code || 'COURSE',
        courseTitle: course?.title || 'Course',
        questionsCount: a.questions.length,
        attemptsCount: a.attempts.length,
        submittedCount: submittedAttempts.length,
        avgPercentage,
        passRate,
        attempts: a.attempts.map((att) => {
          const st = studentMap.get(att.studentId);
          return {
            ...att,
            studentName: st?.user?.name || 'Student',
            studentRegNo: st?.studentId || att.studentId,
          };
        }),
      };
    });

    return NextResponse.json({ assessments: formatted });
  } catch (error) {
    console.error('GET admin/topic-assessments error:', error);
    return NextResponse.json({ error: 'Failed to load topic assessments' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authorizeAdminOrLecturer();
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 403 });
    }

    const body = await req.json();
    const {
      courseId,
      topicId,
      topicIds,
      title,
      assessmentType,
      instructions,
      startDate,
      endDate,
      durationMinutes,
      passMark,
      maxAttempts,
      randomizeQuestions,
      randomizeOptions,
      allowReview,
      showExplanations,
      status,
      questionIds,
      randomCount,
    } = body;

    if (!courseId || !title) {
      return NextResponse.json({ error: 'courseId and title are required.' }, { status: 400 });
    }

    let selectedIds: string[] = Array.isArray(questionIds) ? questionIds : [];
    const includedTopics: string[] = Array.isArray(topicIds)
      ? topicIds
      : topicId
      ? [topicId]
      : [];

    if (selectedIds.length === 0) {
      const pool = await prisma.topicQuestion.findMany({
        where: {
          courseId,
          ...(includedTopics.length > 0 ? { topicId: { in: includedTopics } } : {}),
          status: { in: ['APPROVED', 'PUBLISHED'] },
        },
        select: { id: true, marks: true },
      });

      if (pool.length === 0) {
        return NextResponse.json(
          {
            error:
              'No approved or published questions found for the selected topic/course. Approve questions first before creating an assessment.',
          },
          { status: 400 }
        );
      }

      const desiredCount = Math.min(pool.length, Number(randomCount) || pool.length);
      const shuffled = [...pool].sort(() => Math.random() - 0.5);
      selectedIds = shuffled.slice(0, desiredCount).map((q) => q.id);
    }

    const questionsData = await prisma.topicQuestion.findMany({
      where: { id: { in: selectedIds }, status: { in: ['APPROVED', 'PUBLISHED'] } },
      select: { id: true, marks: true },
    });

    if (questionsData.length === 0) {
      return NextResponse.json(
        { error: 'At least one approved or published question is required to create an assessment.' },
        { status: 400 }
      );
    }

    const totalMarks = questionsData.reduce((sum, q) => sum + q.marks, 0);

    const created = await prisma.$transaction(async (tx) => {
      const assessment = await tx.topicAssessment.create({
        data: {
          courseId,
          topicId: topicId || includedTopics[0] || null,
          topicIdsJson: includedTopics.length > 0 ? JSON.stringify(includedTopics) : null,
          title: title.trim(),
          assessmentType: assessmentType || 'TOPIC_QUIZ',
          instructions: instructions || 'Answer all questions carefully. Ensure stable submission before time expires.',
          startDate: startDate || null,
          endDate: endDate || null,
          durationMinutes: Number(durationMinutes) || 20,
          totalMarks,
          passMark: Number(passMark) || 50,
          maxAttempts: Number(maxAttempts) || 3,
          randomizeQuestions: randomizeQuestions !== false,
          randomizeOptions: randomizeOptions !== false,
          allowReview: allowReview !== false,
          showExplanations: showExplanations !== false,
          status: status === 'PUBLISHED' ? 'PUBLISHED' : 'DRAFT',
        },
      });

      await tx.topicAssessmentQuestion.createMany({
        data: questionsData.map((q, idx) => ({
          assessmentId: assessment.id,
          questionId: q.id,
          orderIndex: idx + 1,
        })),
      });

      if (assessment.status === 'PUBLISHED') {
        await tx.topicQuestion.updateMany({
          where: { id: { in: questionsData.map((q) => q.id) }, status: 'APPROVED' },
          data: { status: 'PUBLISHED' },
        });
      }

      return assessment;
    });

    return NextResponse.json({ assessment: created }, { status: 201 });
  } catch (error) {
    console.error('POST admin/topic-assessments error:', error);
    return NextResponse.json({ error: 'Failed to create topic assessment' }, { status: 500 });
  }
}

