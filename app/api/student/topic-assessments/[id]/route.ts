import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveStudentRecord } from '@/lib/portal-auth';
import {
  gradeObjectiveAnswer,
  evaluateSubjectiveWithAI,
  buildRevisionRecommendations,
  recalculateContinuousAssessment,
} from '@/lib/auto-grader';

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const student = await resolveStudentRecord();
    if (!student) {
      return NextResponse.json({ error: 'Student record not found' }, { status: 404 });
    }

    const { id } = await context.params;
    const assessment = await prisma.topicAssessment.findUnique({
      where: { id },
      include: {
        topic: { select: { id: true, title: true } },
        questions: {
          include: { question: true },
          orderBy: { orderIndex: 'asc' },
        },
        attempts: {
          where: { studentId: student.id },
          include: { answers: true },
          orderBy: { attemptNumber: 'desc' },
        },
      },
    });

    if (!assessment || assessment.status !== 'PUBLISHED') {
      return NextResponse.json({ error: 'Assessment not found or not published' }, { status: 404 });
    }

    const [enrollment, registration, courseRecord] = await Promise.all([
      prisma.courseEnrollment.findUnique({
        where: { studentId_courseId: { studentId: student.id, courseId: assessment.courseId } },
        include: { course: { select: { id: true, code: true, title: true } } },
      }),
      prisma.courseRegistration.findFirst({
        where: { studentId: student.id, courseId: assessment.courseId },
        include: { course: { select: { id: true, code: true, title: true } } },
      }),
      prisma.course.findUnique({
        where: { id: assessment.courseId },
        select: { id: true, code: true, title: true, programmeId: true },
      }),
    ]);

    const resolvedCourse =
      enrollment?.course ||
      registration?.course ||
      (courseRecord && courseRecord.programmeId === student.programmeId
        ? { id: courseRecord.id, code: courseRecord.code, title: courseRecord.title }
        : null);

    if (!resolvedCourse) {
      return NextResponse.json(
        { error: 'Access denied: You are not enrolled in this course.' },
        { status: 403 }
      );
    }

    const activeAttempt = assessment.attempts.find((a) => a.status === 'IN_PROGRESS') || null;

    // Strip answers & explanations before submission
    const sanitizedQuestions = assessment.questions.map((aq) => {
      const q = aq.question;
      let parsedOptions: unknown = q.optionsJson ? JSON.parse(q.optionsJson) : null;
      if (q.questionType === 'MATCHING' && Array.isArray(parsedOptions)) {
        // Send left items and shuffled right items separately so student can match without seeing answer pairs
        const leftItems = parsedOptions.map((p: { left: string }) => p.left);
        const rightItems = parsedOptions
          .map((p: { right: string }) => p.right)
          .sort(() => Math.random() - 0.5);
        parsedOptions = { leftItems, rightItems };
      }

      return {
        id: q.id,
        questionType: q.questionType,
        difficulty: q.difficulty,
        questionText: q.questionText,
        options: parsedOptions,
        marks: aq.marksOverride ?? q.marks,
        pageRef: q.pageRef,
      };
    });

    // Sanitize past attempt reviews according to assessment settings & answerKeyReleaseAt
    const answerKeyReleased =
      !assessment.answerKeyReleaseAt || new Date() >= new Date(assessment.answerKeyReleaseAt);

    const pastAttempts = assessment.attempts
      .filter((a) => a.status !== 'IN_PROGRESS')
      .map((att) => ({
        id: att.id,
        attemptNumber: att.attemptNumber,
        status: att.status,
        evaluationStatus: att.evaluationStatus,
        errorMessage: att.errorMessage,
        totalScore: att.totalScore,
        maxScore: att.maxScore,
        percentage: att.percentage,
        passed: att.passed,
        submittedAt: att.submittedAt,
        durationSeconds: att.durationSeconds,
        answerKeyReleased,
        revisionRecommendations: att.revisionRecommendationsJson
          ? JSON.parse(att.revisionRecommendationsJson)
          : [],
        review: assessment.allowReview
          ? att.answers.map((ans) => {
              const q = assessment.questions.find((aq) => aq.questionId === ans.questionId)?.question;
              const details = ans.evaluationDetailsJson ? JSON.parse(ans.evaluationDetailsJson) : null;
              return {
                questionId: ans.questionId,
                questionText: q?.questionText || '',
                questionType: q?.questionType || 'MCQ',
                selectedOption: ans.selectedOption,
                answerText: ans.answerText,
                isCorrect: ans.isCorrect,
                marksAwarded: ans.marksAwarded,
                maxMarks: ans.maxMarks,
                needsManualReview: ans.needsManualReview,
                evaluationStatus: ans.evaluationStatus,
                graderFeedback: ans.graderFeedback,
                evaluationDetails: details,
                correctAnswer: answerKeyReleased ? q?.correctAnswer : undefined,
                expectedAnswer: answerKeyReleased ? q?.expectedAnswer : undefined,
                explanation: assessment.showExplanations && answerKeyReleased ? q?.explanation : null,
              };
            })
          : null,
      }));

    return NextResponse.json({
      assessment: {
        id: assessment.id,
        title: assessment.title,
        assessmentType: assessment.assessmentType,
        instructions: assessment.instructions,
        durationMinutes: assessment.durationMinutes,
        totalMarks: assessment.totalMarks,
        passMark: assessment.passMark,
        maxAttempts: assessment.maxAttempts,
        allowReview: assessment.allowReview,
        showExplanations: assessment.showExplanations,
        topic: assessment.topic,
        course: resolvedCourse,
      },
      questions: sanitizedQuestions,
      activeAttempt,
      pastAttempts,
    });
  } catch (error) {
    console.error('GET student/topic-assessments/[id] error:', error);
    return NextResponse.json({ error: 'Failed to load assessment' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const student = await resolveStudentRecord();
    if (!student) {
      return NextResponse.json({ error: 'Student record not found' }, { status: 404 });
    }

    const { id } = await context.params;
    const body = await req.json();
    const { action, attemptId, answers } = body;

    const assessment = await prisma.topicAssessment.findUnique({
      where: { id },
      include: {
        questions: { include: { question: true }, orderBy: { orderIndex: 'asc' } },
      },
    });

    if (!assessment || assessment.status !== 'PUBLISHED') {
      return NextResponse.json({ error: 'Assessment not found or not published' }, { status: 404 });
    }

    const [enrollment, registration, courseRecord] = await Promise.all([
      prisma.courseEnrollment.findUnique({
        where: { studentId_courseId: { studentId: student.id, courseId: assessment.courseId } },
      }),
      prisma.courseRegistration.findFirst({
        where: { studentId: student.id, courseId: assessment.courseId },
      }),
      prisma.course.findUnique({
        where: { id: assessment.courseId },
        select: { id: true, programmeId: true },
      }),
    ]);
    if (!enrollment && !registration && courseRecord?.programmeId !== student.programmeId) {
      return NextResponse.json({ error: 'Access denied: Not enrolled in course' }, { status: 403 });
    }

    if (action === 'start') {
      const existingActive = await prisma.topicAssessmentAttempt.findFirst({
        where: { assessmentId: id, studentId: student.id, status: 'IN_PROGRESS' },
      });
      if (existingActive) {
        return NextResponse.json({ attempt: existingActive });
      }

      const completedCount = await prisma.topicAssessmentAttempt.count({
        where: { assessmentId: id, studentId: student.id, status: { not: 'IN_PROGRESS' } },
      });

      if (completedCount >= assessment.maxAttempts) {
        return NextResponse.json(
          { error: `Maximum attempts (${assessment.maxAttempts}) reached for this assessment.` },
          { status: 400 }
        );
      }

      const expiresAt = new Date(Date.now() + assessment.durationMinutes * 60 * 1000);
      const maxScore = assessment.questions.reduce(
        (sum, aq) => sum + (aq.marksOverride ?? aq.question.marks),
        0
      );

      const attempt = await prisma.topicAssessmentAttempt.create({
        data: {
          assessmentId: id,
          studentId: student.id,
          attemptNumber: completedCount + 1,
          status: 'IN_PROGRESS',
          expiresAt,
          maxScore,
        },
      });

      await prisma.studentLearningActivity.create({
        data: {
          studentId: student.id,
          courseId: assessment.courseId,
          topicId: assessment.topicId,
          assessmentId: id,
          activityType: 'STARTED_QUIZ',
          details: `Started "${assessment.title}" (Attempt #${attempt.attemptNumber})`,
        },
      });

      return NextResponse.json({ attempt }, { status: 201 });
    }

    // Save or Submit requires attemptId
    const attempt = await prisma.topicAssessmentAttempt.findUnique({
      where: { id: attemptId },
    });

    if (!attempt || attempt.studentId !== student.id || attempt.assessmentId !== id) {
      return NextResponse.json({ error: 'Valid attempt not found.' }, { status: 404 });
    }

    if (attempt.status !== 'IN_PROGRESS') {
      return NextResponse.json(
        { error: 'This assessment attempt has already been submitted.' },
        { status: 400 }
      );
    }

    // Check backend timer expiry (allow 15 seconds network grace)
    const now = new Date();
    const isExpired = attempt.expiresAt && now.getTime() > attempt.expiresAt.getTime() + 15000;

    if (action === 'save' && !isExpired) {
      const answerMap: Record<string, string> = answers || {};
      await prisma.$transaction(
        assessment.questions.map((aq) => {
          const val = answerMap[aq.questionId];
          return prisma.studentTopicAnswer.upsert({
            where: {
              attemptId_questionId: { attemptId: attempt.id, questionId: aq.questionId },
            },
            update: {
              selectedOption: val ?? null,
              answerText: val ?? null,
            },
            create: {
              attemptId: attempt.id,
              questionId: aq.questionId,
              selectedOption: val ?? null,
              answerText: val ?? null,
              maxMarks: aq.marksOverride ?? aq.question.marks,
            },
          });
        })
      );
      return NextResponse.json({ saved: true });
    }

    // SUBMIT & 100% AUTOMATED GRADING
    const answerMap: Record<string, string> = answers || {};
    const objectiveTypes = new Set(['MCQ', 'TRUE_FALSE', 'FILL_BLANK', 'MATCHING']);
    const hasSubjective = assessment.questions.some(
      (aq) => !objectiveTypes.has((aq.question.questionType || 'MCQ').toUpperCase())
    );

    let courseContext = '';
    if (hasSubjective) {
      const ctxTopics = await prisma.extractedTopic.findMany({
        where: { courseId: assessment.courseId, status: { in: ['APPROVED', 'PUBLISHED'] } },
        select: { title: true, summary: true },
        take: 6,
      });
      courseContext = ctxTopics.map((t) => `${t.title}: ${t.summary || ''}`).join('\n');
    }

    let autoScore = 0;
    let maxScore = 0;
    let anyAiFailed = false;
    let maxRetryUsed = 0;
    let failureMsg = '';

    const gradedRecords: Array<{
      questionId: string;
      selectedOption: string | null;
      answerText: string;
      isCorrect: boolean | null;
      marksAwarded: number;
      maxMarks: number;
      needsManualReview: boolean;
      evaluationStatus: string;
      graderFeedback: string;
      evaluationDetailsJson: string | null;
      retryCount: number;
      errorMessage: string | null;
    }> = [];

    for (const aq of assessment.questions) {
      const q = aq.question;
      const qType = (q.questionType || 'MCQ').toUpperCase();
      const maxMarks = aq.marksOverride ?? q.marks;
      maxScore += maxMarks;
      const submittedRaw = (answerMap[q.id] ?? '').trim();

      if (objectiveTypes.has(qType)) {
        const res = gradeObjectiveAnswer(
          {
            questionType: qType,
            correctAnswer: q.correctAnswer,
            acceptedAlternativesJson: q.acceptedAlternativesJson,
            caseSensitive: q.caseSensitive,
            partialCredit: q.partialCredit,
            negativeMarks: q.negativeMarks,
            marks: maxMarks,
            optionsJson: q.optionsJson,
          },
          submittedRaw
        );
        autoScore += res.marksAwarded;
        gradedRecords.push({
          questionId: q.id,
          selectedOption: submittedRaw,
          answerText: submittedRaw,
          isCorrect: res.isCorrect,
          marksAwarded: res.marksAwarded,
          maxMarks,
          needsManualReview: false,
          evaluationStatus: 'COMPLETED',
          graderFeedback: res.feedback,
          evaluationDetailsJson: JSON.stringify(res),
          retryCount: 0,
          errorMessage: null,
        });
      } else {
        const aiRes = await evaluateSubjectiveWithAI({
          questionText: q.questionText,
          questionType: qType,
          maxMarks,
          expectedAnswer: q.expectedAnswer || q.correctAnswer,
          acceptedAlternativesJson: q.acceptedAlternativesJson,
          rubricJson: q.rubricJson,
          requiredConceptsJson: q.requiredConceptsJson,
          criticalErrorsJson: q.criticalErrorsJson,
          courseContext,
          studentAnswer: submittedRaw,
        });

        maxRetryUsed = Math.max(maxRetryUsed, aiRes.retryCount);
        if (aiRes.status === 'FAILED') {
          anyAiFailed = true;
          failureMsg = aiRes.errorMessage || 'AI subjective grading failed.';
        } else {
          autoScore += aiRes.awardedMarks;
        }

        gradedRecords.push({
          questionId: q.id,
          selectedOption: null,
          answerText: submittedRaw,
          isCorrect: aiRes.status === 'COMPLETED' ? aiRes.awardedMarks >= maxMarks * 0.5 : null,
          marksAwarded: aiRes.awardedMarks,
          maxMarks,
          needsManualReview: aiRes.status === 'FAILED',
          evaluationStatus: aiRes.status,
          graderFeedback: aiRes.feedback,
          evaluationDetailsJson: JSON.stringify(aiRes),
          retryCount: aiRes.retryCount,
          errorMessage: aiRes.errorMessage || null,
        });
      }
    }

    const totalScore = Math.max(0, Math.round(autoScore * 100) / 100);
    const percentage = maxScore > 0 ? Math.min(100, Math.round((totalScore / maxScore) * 100)) : 0;
    const passed = !anyAiFailed && !assessment.requireVerificationBeforePublish && percentage >= assessment.passMark;
    const durationSeconds = Math.max(
      1,
      Math.round((now.getTime() - attempt.startedAt.getTime()) / 1000)
    );
    const evaluationStatus = anyAiFailed
      ? 'FAILED'
      : assessment.requireVerificationBeforePublish
      ? 'NEEDS_VERIFICATION'
      : 'COMPLETED';
    const finalStatus = anyAiFailed
      ? 'GRADING_PENDING'
      : assessment.requireVerificationBeforePublish
      ? 'NEEDS_VERIFICATION'
      : 'GRADED';

    const revisionRecommendations =
      !anyAiFailed && percentage < 80
        ? await buildRevisionRecommendations(
            assessment.courseId,
            assessment.topicId ? [assessment.topicId] : undefined
          )
        : [];
    const answerKeyReleased =
      !assessment.answerKeyReleaseAt || now >= new Date(assessment.answerKeyReleaseAt);

    await prisma.$transaction(async (tx) => {
      for (const rec of gradedRecords) {
        await tx.studentTopicAnswer.upsert({
          where: { attemptId_questionId: { attemptId: attempt.id, questionId: rec.questionId } },
          update: {
            selectedOption: rec.selectedOption,
            answerText: rec.answerText,
            isCorrect: rec.isCorrect,
            marksAwarded: rec.marksAwarded,
            maxMarks: rec.maxMarks,
            needsManualReview: rec.needsManualReview,
            evaluationStatus: rec.evaluationStatus,
            graderFeedback: rec.graderFeedback,
            evaluationDetailsJson: rec.evaluationDetailsJson,
            retryCount: rec.retryCount,
            errorMessage: rec.errorMessage,
            autoGradedAt: rec.evaluationStatus === 'COMPLETED' ? now : null,
            gradedAt: rec.evaluationStatus === 'COMPLETED' ? now : null,
          },
          create: {
            attemptId: attempt.id,
            questionId: rec.questionId,
            selectedOption: rec.selectedOption,
            answerText: rec.answerText,
            isCorrect: rec.isCorrect,
            marksAwarded: rec.marksAwarded,
            maxMarks: rec.maxMarks,
            needsManualReview: rec.needsManualReview,
            evaluationStatus: rec.evaluationStatus,
            graderFeedback: rec.graderFeedback,
            evaluationDetailsJson: rec.evaluationDetailsJson,
            retryCount: rec.retryCount,
            errorMessage: rec.errorMessage,
            autoGradedAt: rec.evaluationStatus === 'COMPLETED' ? now : null,
            gradedAt: rec.evaluationStatus === 'COMPLETED' ? now : null,
          },
        });
      }

      await tx.topicAssessmentAttempt.update({
        where: { id: attempt.id },
        data: {
          status: finalStatus,
          evaluationStatus,
          retryCount: maxRetryUsed,
          errorMessage: anyAiFailed ? failureMsg : null,
          submittedAt: now,
          autoGradedAt: anyAiFailed ? null : now,
          durationSeconds,
          autoScore: anyAiFailed ? 0 : totalScore,
          totalScore: anyAiFailed ? 0 : totalScore,
          maxScore,
          percentage: anyAiFailed ? 0 : percentage,
          passed,
          revisionRecommendationsJson: JSON.stringify(revisionRecommendations),
        },
      });

      if (assessment.topicId) {
        const allTopicAttempts = await tx.topicAssessmentAttempt.findMany({
          where: {
            studentId: student.id,
            assessment: { topicId: assessment.topicId },
            status: { in: ['SUBMITTED', 'NEEDS_MANUAL_GRADING', 'GRADED'] },
          },
          select: { percentage: true },
        });
        const bestScore = Math.max(percentage, ...allTopicAttempts.map((a) => a.percentage));
        const avgScore = Math.round(
          allTopicAttempts.reduce((s, a) => s + a.percentage, 0) / Math.max(1, allTopicAttempts.length)
        );
        const masteryStatus =
          bestScore >= 80 ? 'MASTERED' : bestScore < 50 ? 'NEEDS_REVISION' : 'COMPLETED';

        await tx.studentTopicMastery.upsert({
          where: { studentId_topicId: { studentId: student.id, topicId: assessment.topicId } },
          update: {
            opened: true,
            completed: true,
            completedAt: now,
            attemptsCount: allTopicAttempts.length,
            bestScore,
            latestScore: percentage,
            averageScore: avgScore,
            masteryStatus,
            lastActivityAt: now,
          },
          create: {
            studentId: student.id,
            topicId: assessment.topicId,
            opened: true,
            completed: true,
            completedAt: now,
            attemptsCount: allTopicAttempts.length,
            bestScore,
            latestScore: percentage,
            averageScore: avgScore,
            masteryStatus,
          },
        });
      }

      await tx.studentLearningActivity.create({
        data: {
          studentId: student.id,
          courseId: assessment.courseId,
          topicId: assessment.topicId,
          assessmentId: id,
          activityType: 'SUBMITTED_QUIZ',
          details: `Submitted "${assessment.title}" — ${percentage}% (${finalStatus})`,
        },
      });
    });

    if (!anyAiFailed) {
      await recalculateContinuousAssessment(student.id, assessment.courseId);
    }

    return NextResponse.json({
      result: {
        attemptId: attempt.id,
        status: finalStatus,
        evaluationStatus,
        expiredSubmission: Boolean(isExpired),
        totalScore: anyAiFailed ? 0 : totalScore,
        maxScore,
        percentage: anyAiFailed ? 0 : percentage,
        passed,
        needsManualGrading: anyAiFailed,
        durationSeconds,
        answerKeyReleased,
        revisionRecommendations,
        review: assessment.allowReview
          ? gradedRecords.map((rec) => {
              const q = assessment.questions.find((aq) => aq.questionId === rec.questionId)?.question;
              return {
                ...rec,
                questionText: q?.questionText,
                questionType: q?.questionType,
                correctAnswer: answerKeyReleased ? q?.correctAnswer : undefined,
                expectedAnswer: answerKeyReleased ? q?.expectedAnswer : undefined,
                explanation: assessment.showExplanations && answerKeyReleased ? q?.explanation : null,
              };
            })
          : null,
      },
    });
  } catch (error) {
    console.error('POST student/topic-assessments/[id] error:', error);
    return NextResponse.json({ error: 'Failed to submit assessment' }, { status: 500 });
  }
}

