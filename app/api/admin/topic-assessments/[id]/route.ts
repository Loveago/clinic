import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizeAdminOrLecturer } from '@/lib/portal-auth';

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authorizeAdminOrLecturer();
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 403 });
    }

    const { id } = await context.params;
    const body = await req.json();

    // Manual grading of a student attempt's subjective answers
    if (body.action === 'grade_attempt' && body.attemptId && Array.isArray(body.grades)) {
      const attempt = await prisma.topicAssessmentAttempt.findUnique({
        where: { id: body.attemptId },
        include: { assessment: true, answers: true },
      });
      if (!attempt || attempt.assessmentId !== id) {
        return NextResponse.json({ error: 'Attempt not found for this assessment.' }, { status: 404 });
      }

      await prisma.$transaction(async (tx) => {
        for (const g of body.grades as Array<{ answerId: string; marksAwarded: number; feedback?: string }>) {
          const ans = attempt.answers.find((a) => a.id === g.answerId);
          if (!ans) continue;
          const clamped = Math.max(0, Math.min(ans.maxMarks, Number(g.marksAwarded) || 0));
          await tx.studentTopicAnswer.update({
            where: { id: ans.id },
            data: {
              marksAwarded: clamped,
              isCorrect: clamped >= ans.maxMarks * 0.5,
              needsManualReview: false,
              graderFeedback: g.feedback || null,
              gradedAt: new Date(),
            },
          });
        }

        const refreshedAnswers = await tx.studentTopicAnswer.findMany({
          where: { attemptId: attempt.id },
        });
        const totalScore = refreshedAnswers.reduce((sum, a) => sum + a.marksAwarded, 0);
        const manualScore = refreshedAnswers
          .filter((a) => a.gradedAt !== null)
          .reduce((sum, a) => sum + a.marksAwarded, 0);
        const autoScore = totalScore - manualScore;
        const maxScore = Math.max(1, attempt.maxScore);
        const percentage = Math.round((totalScore / maxScore) * 100);
        const passed = percentage >= attempt.assessment.passMark;
        const stillPending = refreshedAnswers.some((a) => a.needsManualReview);

        await tx.topicAssessmentAttempt.update({
          where: { id: attempt.id },
          data: {
            autoScore,
            manualScore,
            totalScore,
            percentage,
            passed,
            status: stillPending ? 'NEEDS_MANUAL_GRADING' : 'GRADED',
          },
        });

        // Update TopicMastery if this assessment is linked to a topic
        if (attempt.assessment.topicId) {
          const allTopicAttempts = await tx.topicAssessmentAttempt.findMany({
            where: {
              studentId: attempt.studentId,
              assessment: { topicId: attempt.assessment.topicId },
              status: { in: ['SUBMITTED', 'GRADED'] },
            },
            select: { percentage: true },
          });
          if (allTopicAttempts.length > 0) {
            const bestScore = Math.max(...allTopicAttempts.map((a) => a.percentage));
            const avgScore = Math.round(
              allTopicAttempts.reduce((s, a) => s + a.percentage, 0) / allTopicAttempts.length
            );
            const masteryStatus =
              bestScore >= 80 ? 'MASTERED' : bestScore < 50 ? 'NEEDS_REVISION' : 'COMPLETED';

            await tx.studentTopicMastery.upsert({
              where: {
                studentId_topicId: {
                  studentId: attempt.studentId,
                  topicId: attempt.assessment.topicId,
                },
              },
              update: {
                bestScore,
                latestScore: percentage,
                averageScore: avgScore,
                masteryStatus,
                lastActivityAt: new Date(),
              },
              create: {
                studentId: attempt.studentId,
                topicId: attempt.assessment.topicId,
                opened: true,
                completed: true,
                attemptsCount: allTopicAttempts.length,
                bestScore,
                latestScore: percentage,
                averageScore: avgScore,
                masteryStatus,
              },
            });
          }
        }
      });

      return NextResponse.json({ graded: true });
    }

    if (body.action === 'duplicate') {
      const source = await prisma.topicAssessment.findUnique({
        where: { id },
        include: { questions: true },
      });
      if (!source) {
        return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });
      }
      const copy = await prisma.$transaction(async (tx) => {
        const created = await tx.topicAssessment.create({
          data: {
            courseId: source.courseId,
            topicId: source.topicId,
            topicIdsJson: source.topicIdsJson,
            title: `${source.title} (Copy)`,
            assessmentType: source.assessmentType,
            instructions: source.instructions,
            durationMinutes: source.durationMinutes,
            totalMarks: source.totalMarks,
            passMark: source.passMark,
            maxAttempts: source.maxAttempts,
            randomizeQuestions: source.randomizeQuestions,
            randomizeOptions: source.randomizeOptions,
            allowReview: source.allowReview,
            showExplanations: source.showExplanations,
            status: 'DRAFT',
          },
        });
        if (source.questions.length > 0) {
          await tx.topicAssessmentQuestion.createMany({
            data: source.questions.map((q) => ({
              assessmentId: created.id,
              questionId: q.questionId,
              orderIndex: q.orderIndex,
              marksOverride: q.marksOverride,
            })),
          });
        }
        return created;
      });
      return NextResponse.json({ assessment: copy }, { status: 201 });
    }

    const updated = await prisma.topicAssessment.update({
      where: { id },
      data: {
        ...(body.title !== undefined ? { title: body.title } : {}),
        ...(body.status !== undefined ? { status: body.status } : {}),
        ...(body.allowReview !== undefined ? { allowReview: Boolean(body.allowReview) } : {}),
        ...(body.showExplanations !== undefined ? { showExplanations: Boolean(body.showExplanations) } : {}),
        ...(body.durationMinutes !== undefined ? { durationMinutes: Number(body.durationMinutes) } : {}),
        ...(body.passMark !== undefined ? { passMark: Number(body.passMark) } : {}),
      },
    });

    return NextResponse.json({ assessment: updated });
  } catch (error) {
    console.error('PATCH admin/topic-assessments/[id] error:', error);
    return NextResponse.json({ error: 'Failed to update assessment' }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authorizeAdminOrLecturer();
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 403 });
    }

    const { id } = await context.params;
    await prisma.topicAssessment.delete({ where: { id } });
    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error('DELETE admin/topic-assessments/[id] error:', error);
    return NextResponse.json({ error: 'Failed to delete assessment' }, { status: 500 });
  }
}

