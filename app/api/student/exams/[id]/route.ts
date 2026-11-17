import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveStudentRecord } from '@/lib/portal-auth';
import {
  AssignedPaper,
  buildAssignedPaper,
  checkExamEligibility,
  gradeAndFinalizeExamAttempt,
  isResultPublished,
  safeJsonParse,
} from '@/lib/exam-lifecycle';

const INTEGRITY_VIOLATION_TYPES = new Set([
  'TAB_SWITCH',
  'BLUR',
  'FULLSCREEN_EXIT',
  'COPY_ATTEMPT',
  'FOCUS_LOST',
]);

function formatExamQuestionsForAttempt(
  exam: any,
  assignedPaper: AssignedPaper | null
): { sections: any[]; questions: any[] } {
  const questionById = new Map<string, any>(exam.questions.map((q: any) => [q.id, q]));

  if (assignedPaper && assignedPaper.questions.length > 0) {
    const questions = assignedPaper.questions
      .map((pq) => {
        const q = questionById.get(pq.questionId);
        if (!q) return null;
        const baseOptions = safeJsonParse<unknown[]>(q.optionsJson, []);
        return {
          id: q.id,
          sectionId: pq.sectionId,
          sectionTitle: pq.sectionTitle,
          orderIndex: pq.orderIndex,
          questionType: q.questionType || 'MCQ',
          text: q.text,
          options: pq.optionsOrder && pq.optionsOrder.length > 0 ? pq.optionsOrder : baseOptions,
          marks: q.marks,
        };
      })
      .filter(Boolean);

    return {
      sections: assignedPaper.sections || [],
      questions,
    };
  }

  const questions = exam.questions.map((q: any) => ({
    id: q.id,
    sectionId: q.sectionId || null,
    sectionTitle: null,
    orderIndex: q.orderIndex,
    questionType: q.questionType || 'MCQ',
    text: q.text,
    options: safeJsonParse<unknown[]>(q.optionsJson, []),
    marks: q.marks,
  }));

  const sections = (exam.sections || []).map((s: any) => ({
    id: s.id,
    title: s.title,
    instructions: s.instructions,
    marksAllocated: s.marksAllocated,
    questionIds: questions.filter((q: any) => q.sectionId === s.id).map((q: any) => q.id),
  }));

  return { sections, questions };
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const student = await resolveStudentRecord();

    const exam = await prisma.examination.findUnique({
      where: { id },
      include: {
        course: true,
        period: true,
        sections: { orderBy: { orderIndex: 'asc' } },
        questions: { orderBy: { orderIndex: 'asc' } },
        ...(student
          ? {
              attempts: {
                where: { studentId: student.id },
                orderBy: { startedAt: 'desc' },
              },
            }
          : {}),
      },
    });

    if (!exam) {
      return NextResponse.json({ error: 'Examination not found' }, { status: 404 });
    }

    const attempts: any[] = (exam as any).attempts || [];
    let activeAttempt = attempts.find((a) => a.status === 'IN_PROGRESS') || null;
    const now = new Date();

    // Auto-submit if active attempt has expired on server
    if (student && activeAttempt && activeAttempt.expiresAt && now > new Date(activeAttempt.expiresAt)) {
      await gradeAndFinalizeExamAttempt({
        exam,
        student,
        existingAttempt: activeAttempt,
        answersInput: {},
        autoSubmitted: true,
      });
      const refreshedAttempts = await prisma.examAttempt.findMany({
        where: { examId: exam.id, studentId: student.id },
        orderBy: { startedAt: 'desc' },
      });
      attempts.splice(0, attempts.length, ...refreshedAttempts);
      activeAttempt = null;
    }

    const eligibility = student
      ? await checkExamEligibility({ student, exam, attempts })
      : { eligible: true, reasons: [], attemptsUsed: 0, activeAttemptId: null };

    const assignedPaper = activeAttempt?.assignedPaperJson
      ? safeJsonParse<AssignedPaper | null>(activeAttempt.assignedPaperJson, null)
      : null;

    // Never expose correctAnswer, expectedAnswer, or explanation before submission
    const { sections, questions } = formatExamQuestionsForAttempt(exam, assignedPaper);

    // Restore saved ExamAnswer rows for active attempt
    let savedAnswers: Record<string, string> = {};
    let flaggedQuestions: string[] = [];
    if (activeAttempt) {
      savedAnswers = safeJsonParse<Record<string, string>>(activeAttempt.answersJson, {});
      flaggedQuestions = safeJsonParse<string[]>(activeAttempt.flaggedQuestionsJson, []);
      const answerRows = await prisma.examAnswer.findMany({
        where: { attemptId: activeAttempt.id },
      });
      for (const row of answerRows) {
        const val = row.selectedOption ?? row.answerText;
        if (val !== null && val !== undefined) {
          savedAnswers[row.questionId] = val;
        }
        if (row.isFlagged && !flaggedQuestions.includes(row.questionId)) {
          flaggedQuestions.push(row.questionId);
        }
      }
    }

    const latestSubmitted = attempts.find((a) => a.status !== 'IN_PROGRESS') || null;
    const resultPublished = isResultPublished(exam, latestSubmitted);
    const answerKeyReleased =
      !exam.answerKeyReleaseAt || now >= new Date(exam.answerKeyReleaseAt);

    let formattedAttempt = null;
    if (latestSubmitted) {
      let evaluationDetails = safeJsonParse<any[] | null>(
        latestSubmitted.evaluationDetailsJson,
        null
      );
      const revisionRecommendations = safeJsonParse<any[]>(
        latestSubmitted.revisionRecommendationsJson,
        []
      );

      // Gate answer keys if not released yet or review disabled
      if (Array.isArray(evaluationDetails) && (!exam.allowReview || !answerKeyReleased)) {
        evaluationDetails = evaluationDetails.map((item: any) => ({
          ...item,
          correctAnswer: undefined,
          expectedAnswer: undefined,
          explanation: exam.showExplanations && answerKeyReleased ? item.explanation : undefined,
        }));
      }

      formattedAttempt = {
        id: latestSubmitted.id,
        attemptNumber: latestSubmitted.attemptNumber,
        score: resultPublished ? latestSubmitted.score : null,
        totalQuestions: latestSubmitted.totalQuestions,
        correctCount: resultPublished ? latestSubmitted.correctCount : null,
        percentage: resultPublished ? latestSubmitted.percentage : null,
        passed: resultPublished ? latestSubmitted.percentage >= exam.passMark : null,
        status: latestSubmitted.status,
        evaluationStatus: latestSubmitted.evaluationStatus,
        errorMessage: latestSubmitted.errorMessage,
        submittedAt: latestSubmitted.submittedAt,
        autoGradedAt: latestSubmitted.autoGradedAt,
        resultPublished,
        publicationMode: exam.publicationMode,
        publishAt: exam.publishAt,
        answerKeyReleased,
        evaluationDetails: resultPublished ? evaluationDetails : null,
        revisionRecommendations: resultPublished ? revisionRecommendations : [],
      };
    }

    return NextResponse.json({
      exam: {
        id: exam.id,
        title: exam.title,
        examType: exam.examType,
        mode: exam.mode,
        courseId: exam.courseId,
        courseName: exam.course.title,
        courseCode: exam.course.code,
        instructions: exam.instructions,
        durationMinutes: exam.durationMinutes,
        totalMarks: exam.totalMarks,
        passMark: exam.passMark,
        maxRetakes: exam.maxRetakes,
        allowReview: exam.allowReview,
        showExplanations: exam.showExplanations,
        answerKeyReleaseAt: exam.answerKeyReleaseAt,
        requireVerificationBeforePublish: exam.requireVerificationBeforePublish,
        publicationMode: exam.publicationMode,
        publishAt: exam.publishAt,
        requireFinancialClearance: exam.requireFinancialClearance,
        integrityPolicy: safeJsonParse(exam.integrityPolicyJson, {
          detectTabSwitch: true,
          recommendFullscreen: true,
        }),
        sections,
        questions,
      },
      eligibility,
      activeAttempt: activeAttempt
        ? {
            id: activeAttempt.id,
            attemptNumber: activeAttempt.attemptNumber,
            startedAt: activeAttempt.startedAt,
            expiresAt: activeAttempt.expiresAt,
            lastSavedAt: activeAttempt.lastSavedAt,
            accessToken: activeAttempt.accessToken,
            integrityEventsCount: activeAttempt.integrityEventsCount,
            remainingSeconds: activeAttempt.expiresAt
              ? Math.max(
                  0,
                  Math.floor((new Date(activeAttempt.expiresAt).getTime() - now.getTime()) / 1000)
                )
              : exam.durationMinutes * 60,
            savedAnswers,
            flaggedQuestions,
          }
        : null,
      latestAttempt: formattedAttempt,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch exam details' }, { status: 500 });
  }
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: examId } = await params;
    const student = await resolveStudentRecord();
    if (!student) {
      return NextResponse.json({ error: 'Student profile not found' }, { status: 404 });
    }

    const exam = await prisma.examination.findUnique({
      where: { id: examId },
      include: {
        course: true,
        sections: { orderBy: { orderIndex: 'asc' } },
        questions: { orderBy: { orderIndex: 'asc' } },
        attempts: {
          where: { studentId: student.id },
          orderBy: { startedAt: 'desc' },
        },
      },
    });

    if (!exam) {
      return NextResponse.json({ error: 'Examination not found' }, { status: 404 });
    }

    const now = new Date();
    const attempts = exam.attempts || [];
    const activeAttempt = attempts.find((a) => a.status === 'IN_PROGRESS') || null;

    // If active attempt exists and has not expired, resume it cleanly
    if (activeAttempt) {
      if (activeAttempt.expiresAt && now > new Date(activeAttempt.expiresAt)) {
        const result = await gradeAndFinalizeExamAttempt({
          exam,
          student,
          existingAttempt: activeAttempt,
          answersInput: {},
          autoSubmitted: true,
        });
        return NextResponse.json({ expired: true, result }, { status: 409 });
      }

      const assignedPaper = safeJsonParse<AssignedPaper | null>(
        activeAttempt.assignedPaperJson,
        null
      );
      const { sections, questions } = formatExamQuestionsForAttempt(exam, assignedPaper);
      const savedAnswers = safeJsonParse<Record<string, string>>(activeAttempt.answersJson, {});
      const flaggedQuestions = safeJsonParse<string[]>(activeAttempt.flaggedQuestionsJson, []);

      return NextResponse.json({
        resumed: true,
        attempt: {
          id: activeAttempt.id,
          attemptNumber: activeAttempt.attemptNumber,
          startedAt: activeAttempt.startedAt,
          expiresAt: activeAttempt.expiresAt,
          accessToken: activeAttempt.accessToken,
          remainingSeconds: activeAttempt.expiresAt
            ? Math.max(
                0,
                Math.floor((new Date(activeAttempt.expiresAt).getTime() - now.getTime()) / 1000)
              )
            : exam.durationMinutes * 60,
          savedAnswers,
          flaggedQuestions,
        },
        sections,
        questions,
      });
    }

    const eligibility = await checkExamEligibility({ student, exam, attempts });
    if (!eligibility.eligible) {
      const status =
        eligibility.attemptsUsed >= Math.max(1, exam.maxRetakes || 1) ? 409 : 403;
      return NextResponse.json(
        {
          error: eligibility.reasons[0] || 'You are not eligible to start this examination.',
          eligibility,
        },
        { status }
      );
    }

    const assignedPaper = buildAssignedPaper(exam);
    const expiresAt = new Date(now.getTime() + Math.max(1, exam.durationMinutes || 45) * 60_000);
    const accessToken = crypto.randomBytes(16).toString('hex');

    const attempt = await prisma.examAttempt.create({
      data: {
        examId: exam.id,
        studentId: student.id,
        attemptNumber: eligibility.attemptsUsed + 1,
        status: 'IN_PROGRESS',
        evaluationStatus: 'PENDING',
        answersJson: '{}',
        assignedPaperJson: JSON.stringify(assignedPaper),
        flaggedQuestionsJson: '[]',
        accessToken,
        startedAt: now,
        expiresAt,
        lastSavedAt: now,
        submittedAt: null,
        totalQuestions: assignedPaper.questions.length,
      },
    });

    await prisma.examinationActivityLog.create({
      data: {
        attemptId: attempt.id,
        eventType: 'SESSION_STARTED',
        detailsJson: JSON.stringify({
          attemptNumber: attempt.attemptNumber,
          durationMinutes: exam.durationMinutes,
          questionCount: assignedPaper.questions.length,
        }),
      },
    });

    const { sections, questions } = formatExamQuestionsForAttempt(exam, assignedPaper);

    return NextResponse.json(
      {
        resumed: false,
        attempt: {
          id: attempt.id,
          attemptNumber: attempt.attemptNumber,
          startedAt: attempt.startedAt,
          expiresAt: attempt.expiresAt,
          accessToken: attempt.accessToken,
          remainingSeconds: exam.durationMinutes * 60,
          savedAnswers: {},
          flaggedQuestions: [],
        },
        sections,
        questions,
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to start examination session' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: examId } = await params;
    const student = await resolveStudentRecord();
    if (!student) {
      return NextResponse.json({ error: 'Student profile not found' }, { status: 404 });
    }

    const body = await req.json();
    const { attemptId, answers, flaggedQuestions, integrityEvent } = body;

    const attempt = attemptId
      ? await prisma.examAttempt.findFirst({
          where: { id: attemptId, examId, studentId: student.id },
        })
      : await prisma.examAttempt.findFirst({
          where: { examId, studentId: student.id, status: 'IN_PROGRESS' },
          orderBy: { startedAt: 'desc' },
        });

    if (!attempt) {
      return NextResponse.json({ error: 'Active exam attempt not found' }, { status: 404 });
    }

    if (attempt.status !== 'IN_PROGRESS') {
      return NextResponse.json(
        { error: 'This examination attempt has already been submitted.' },
        { status: 409 }
      );
    }

    const exam = await prisma.examination.findUnique({
      where: { id: examId },
      include: {
        period: true,
        questions: { orderBy: { orderIndex: 'asc' } },
      },
    });
    if (!exam) {
      return NextResponse.json({ error: 'Examination not found' }, { status: 404 });
    }

    const now = new Date();
    // Enforce server-side timer cutoff
    if (attempt.expiresAt && now > new Date(attempt.expiresAt)) {
      const result = await gradeAndFinalizeExamAttempt({
        exam,
        student,
        existingAttempt: attempt,
        answersInput: answers || {},
        autoSubmitted: true,
      });
      return NextResponse.json({ expired: true, result });
    }

    const existingAnswers = safeJsonParse<Record<string, string>>(attempt.answersJson, {});
    if (answers && typeof answers === 'object') {
      for (const [qId, val] of Object.entries(answers)) {
        if (val !== undefined && val !== null) {
          existingAnswers[qId] = String(val);
        }
      }
    }

    const existingFlagged = Array.isArray(flaggedQuestions)
      ? flaggedQuestions.map(String)
      : safeJsonParse<string[]>(attempt.flaggedQuestionsJson, []);
    const flaggedSet = new Set(existingFlagged);

    if (answers && typeof answers === 'object') {
      const questionMap = new Map(exam.questions.map((q) => [q.id, q]));
      for (const [qId, val] of Object.entries(answers)) {
        const q = questionMap.get(qId);
        if (!q) continue;
        const qType = (q.questionType || 'MCQ').toUpperCase();
        const strVal = String(val ?? '');
        const isObjChoice = qType === 'MCQ' || qType === 'TRUE_FALSE';
        await prisma.examAnswer.upsert({
          where: { attemptId_questionId: { attemptId: attempt.id, questionId: qId } },
          update: {
            selectedOption: isObjChoice ? strVal : null,
            answerText: isObjChoice ? null : strVal,
            isFlagged: flaggedSet.has(qId),
            maxMarks: q.marks,
            savedAt: now,
          },
          create: {
            attemptId: attempt.id,
            questionId: qId,
            selectedOption: isObjChoice ? strVal : null,
            answerText: isObjChoice ? null : strVal,
            isFlagged: flaggedSet.has(qId),
            maxMarks: q.marks,
            savedAt: now,
          },
        });
      }
    }

    let incrementIntegrity = 0;
    if (integrityEvent && integrityEvent.eventType) {
      const evType = String(integrityEvent.eventType).toUpperCase();
      if (INTEGRITY_VIOLATION_TYPES.has(evType)) {
        incrementIntegrity = 1;
      }
      await prisma.examinationActivityLog.create({
        data: {
          attemptId: attempt.id,
          eventType: evType,
          detailsJson: integrityEvent.details
            ? JSON.stringify(integrityEvent.details)
            : null,
        },
      });
    }

    const updated = await prisma.examAttempt.update({
      where: { id: attempt.id },
      data: {
        answersJson: JSON.stringify(existingAnswers),
        flaggedQuestionsJson: JSON.stringify(Array.from(flaggedSet)),
        lastSavedAt: now,
        ...(incrementIntegrity > 0
          ? { integrityEventsCount: { increment: incrementIntegrity } }
          : {}),
      },
    });

    return NextResponse.json({
      saved: true,
      lastSavedAt: updated.lastSavedAt,
      integrityEventsCount: updated.integrityEventsCount,
      remainingSeconds: updated.expiresAt
        ? Math.max(0, Math.floor((new Date(updated.expiresAt).getTime() - now.getTime()) / 1000))
        : exam.durationMinutes * 60,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to autosave examination state' },
      { status: 500 }
    );
  }
}
