import { prisma } from '@/lib/prisma';
import { logAcademicAudit } from '@/lib/portal-auth';
import { checkTrackExamCompatibility } from '@/lib/study-tracks';
import {
  gradeObjectiveAnswer,
  evaluateSubjectiveWithAI,
  buildRevisionRecommendations,
  recalculateContinuousAssessment,
} from '@/lib/auto-grader';

export const OBJECTIVE_TYPES = new Set(['MCQ', 'TRUE_FALSE', 'FILL_BLANK', 'MATCHING']);

export interface AssignedPaperQuestion {
  questionId: string;
  sectionId: string | null;
  sectionTitle: string | null;
  sectionType?: string | null;
  orderIndex: number;
  optionsOrder?: string[]; // shuffled option labels if randomizeOptions is true
}

export interface AssignedPaper {
  sections: Array<{
    id: string | null;
    title: string;
    sectionType?: string;
    instructions: string | null;
    marksAllocated: number;
    questionIds: string[];
  }>;
  questions: AssignedPaperQuestion[];
}

export function safeJsonParse<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function shuffleArray<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export async function checkExamEligibility(params: {
  student: {
    id: string;
    status: string;
    cohortId?: string | null;
    level?: string | null;
    studyTrack?: string | null;
  };
  exam: {
    id: string;
    courseId: string;
    cohortId?: string | null;
    studyTrack?: string | null;
    examType?: string | null;
    isLocked?: boolean;
    isPublished: boolean;
    status: string;
    startTime?: Date | null;
    endTime?: Date | null;
    requireFinancialClearance: boolean;
    maxRetakes: number;
  };
  attempts?: Array<{ id: string; status: string }>;
}): Promise<{
  eligible: boolean;
  reasons: string[];
  attemptsUsed: number;
  activeAttemptId: string | null;
}> {
  const { student, exam } = params;
  const reasons: string[] = [];

  if (student.status !== 'ACTIVE') {
    reasons.push(`Student account is ${student.status}; only ACTIVE students may take examinations.`);
  }

  if (!exam.isPublished || exam.status === 'CANCELLED') {
    reasons.push('This examination is not currently open.');
  }

  if (exam.isLocked) {
    reasons.push('This examination is currently locked by the Administrator.');
  }

  if (exam.cohortId && student.cohortId && exam.cohortId !== student.cohortId) {
    reasons.push('This examination is restricted to a different cohort.');
  }

  const trackCheck = checkTrackExamCompatibility({
    studentTrack: student.studyTrack,
    examTrack: exam.studyTrack,
    examType: exam.examType,
  });
  if (!trackCheck.compatible && trackCheck.reason) {
    reasons.push(trackCheck.reason);
  }

  const registration = await prisma.courseRegistration.findFirst({
    where: {
      studentId: student.id,
      courseId: exam.courseId,
      status: { not: 'DROPPED' },
    },
    select: { id: true, status: true },
  });

  if (!registration) {
    reasons.push('You are not registered for this course.');
  }

  const attempts =
    params.attempts ??
    (await prisma.examAttempt.findMany({
      where: { examId: exam.id, studentId: student.id },
      select: { id: true, status: true },
    }));

  const activeAttempt = attempts.find((a) => a.status === 'IN_PROGRESS') || null;
  const submittedCount = attempts.filter((a) => a.status !== 'IN_PROGRESS').length;

  const now = new Date();
  if (exam.startTime && now < new Date(exam.startTime)) {
    reasons.push(`Examination opens on ${new Date(exam.startTime).toLocaleString()}.`);
  }
  if (exam.endTime && now > new Date(exam.endTime) && !activeAttempt) {
    reasons.push(`Examination window closed on ${new Date(exam.endTime).toLocaleString()}.`);
  }

  if (exam.requireFinancialClearance) {
    const unpaidInvoices = await prisma.invoice.findMany({
      where: {
        studentId: student.id,
        balance: { gt: 0 },
        status: { notIn: ['PAID', 'CANCELLED'] },
      },
      select: { balance: true },
    });
    const totalOwing = unpaidInvoices.reduce((sum, inv) => sum + (Number(inv.balance) || 0), 0);
    if (totalOwing > 0.01) {
      reasons.push(
        `Financial clearance required: outstanding balance of GH₵${totalOwing.toFixed(2)}.`
      );
    }
  }

  const maxRetakes = Math.max(1, Number(exam.maxRetakes) || 1);
  if (!activeAttempt && submittedCount >= maxRetakes) {
    reasons.push(`Maximum attempts (${maxRetakes}) reached.`);
  }

  return {
    eligible: reasons.length === 0,
    reasons,
    attemptsUsed: submittedCount,
    activeAttemptId: activeAttempt?.id || null,
  };
}

export function isResultPublished(
  exam: {
    publicationMode?: string | null;
    publishAt?: Date | null;
    period?: { status?: string | null; resultsPublishedAt?: Date | null } | null;
  },
  attempt: {
    status: string;
    evaluationStatus: string;
  } | null
): boolean {
  if (!attempt || attempt.status === 'IN_PROGRESS') return false;
  if (attempt.evaluationStatus === 'FAILED' || attempt.evaluationStatus === 'NEEDS_VERIFICATION') {
    return false;
  }
  const mode = (exam.publicationMode || 'IMMEDIATE').toUpperCase();
  if (mode === 'SCHEDULED') {
    return exam.publishAt ? new Date() >= new Date(exam.publishAt) : true;
  }
  if (mode === 'AFTER_PERIOD') {
    if (!exam.period) return true;
    return exam.period.status === 'PUBLISHED' || Boolean(exam.period.resultsPublishedAt);
  }
  return true;
}

export function buildAssignedPaper(exam: {
  randomizeQuestions?: boolean;
  randomizeOptions?: boolean;
  selectionMode?: string;
  sections?: Array<{
    id: string;
    title: string;
    sectionType?: string | null;
    instructions: string | null;
    orderIndex: number;
    marksAllocated: number;
    questionCount: number;
    selectionRule: string;
  }>;
  questions: Array<{
    id: string;
    sectionId: string | null;
    orderIndex: number;
    questionType: string;
    optionsJson: string;
  }>;
}): AssignedPaper {
  const sections = [...(exam.sections || [])].sort((a, b) => a.orderIndex - b.orderIndex);
  const allQuestions = [...exam.questions].sort((a, b) => a.orderIndex - b.orderIndex);

  const assignQuestion = (
    q: (typeof allQuestions)[number],
    sectionId: string | null,
    sectionTitle: string | null,
    sectionType: string | null,
    idx: number
  ): AssignedPaperQuestion => {
    const parsedOptions = safeJsonParse<string[]>(q.optionsJson, []);
    const qType = (q.questionType || 'MCQ').toUpperCase();
    const shouldShuffleOptions =
      Boolean(exam.randomizeOptions) && qType === 'MCQ' && Array.isArray(parsedOptions) && parsedOptions.length > 1;
    return {
      questionId: q.id,
      sectionId,
      sectionTitle,
      sectionType,
      orderIndex: idx,
      ...(shouldShuffleOptions ? { optionsOrder: shuffleArray(parsedOptions) } : {}),
    };
  };

  if (sections.length === 0) {
    const ordered = exam.randomizeQuestions ? shuffleArray(allQuestions) : allQuestions;
    const assignedQs = ordered.map((q, i) => assignQuestion(q, null, null, null, i + 1));
    return {
      sections: [
        {
          id: null,
          title: 'General Examination',
          sectionType: 'OBJECTIVE',
          instructions: null,
          marksAllocated: 0,
          questionIds: assignedQs.map((q) => q.questionId),
        },
      ],
      questions: assignedQs,
    };
  }

  const assignedQs: AssignedPaperQuestion[] = [];
  const assignedSections: AssignedPaper['sections'] = [];
  const usedIds = new Set<string>();
  let globalIndex = 1;

  for (const sec of sections) {
    let secQs = allQuestions.filter((q) => q.sectionId === sec.id);
    const useRandom =
      sec.selectionRule === 'RANDOM' ||
      exam.selectionMode === 'RANDOM_BANK' ||
      exam.randomizeQuestions;
    if (useRandom) {
      secQs = shuffleArray(secQs);
    }
    if (sec.questionCount > 0 && secQs.length > sec.questionCount) {
      secQs = secQs.slice(0, sec.questionCount);
    }
    const secType = sec.sectionType || 'OBJECTIVE';
    const qIds: string[] = [];
    for (const q of secQs) {
      usedIds.add(q.id);
      qIds.push(q.id);
      assignedQs.push(assignQuestion(q, sec.id, sec.title, secType, globalIndex++));
    }
    assignedSections.push({
      id: sec.id,
      title: sec.title,
      sectionType: secType,
      instructions: sec.instructions,
      marksAllocated: sec.marksAllocated,
      questionIds: qIds,
    });
  }

  // Include any unsectioned questions at the end so none are silently dropped
  const unsectioned = allQuestions.filter((q) => !usedIds.has(q.id));
  if (unsectioned.length > 0) {
    const orderedUnsectioned = exam.randomizeQuestions ? shuffleArray(unsectioned) : unsectioned;
    const qIds: string[] = [];
    for (const q of orderedUnsectioned) {
      qIds.push(q.id);
      assignedQs.push(assignQuestion(q, null, 'Additional Questions', 'OBJECTIVE', globalIndex++));
    }
    assignedSections.push({
      id: null,
      title: 'Additional Questions',
      sectionType: 'OBJECTIVE',
      instructions: null,
      marksAllocated: 0,
      questionIds: qIds,
    });
  }

  return { sections: assignedSections, questions: assignedQs };
}

export async function gradeAndFinalizeExamAttempt(params: {
  exam: any;
  student: { id: string; userId?: string };
  existingAttempt?: any | null;
  answersInput: Record<string, string>;
  idempotencyKey?: string;
  autoSubmitted?: boolean;
}) {
  const { exam, student, existingAttempt, answersInput, idempotencyKey, autoSubmitted } = params;

  // Merge saved ExamAnswer records (if any) with submitted answers
  const mergedAnswers: Record<string, string> = {};
  if (existingAttempt?.answersJson) {
    const prev = safeJsonParse<Record<string, string>>(existingAttempt.answersJson, {});
    Object.assign(mergedAnswers, prev);
  }
  if (existingAttempt?.id) {
    const savedRows = await prisma.examAnswer.findMany({
      where: { attemptId: existingAttempt.id },
    });
    for (const row of savedRows) {
      const val = row.selectedOption ?? row.answerText;
      if (val !== null && val !== undefined && val !== '') {
        mergedAnswers[row.questionId] = val;
      }
    }
  }
  for (const [qId, val] of Object.entries(answersInput || {})) {
    if (val !== undefined && val !== null) {
      mergedAnswers[qId] = String(val);
    }
  }

  // Determine which questions belong to this student's assigned paper
  const assignedPaper = existingAttempt?.assignedPaperJson
    ? safeJsonParse<AssignedPaper | null>(existingAttempt.assignedPaperJson, null)
    : null;
  const questionById = new Map<string, any>(exam.questions.map((q: any) => [q.id, q]));
  const targetQuestions: any[] =
    assignedPaper && assignedPaper.questions.length > 0
      ? assignedPaper.questions
          .map((pq) => questionById.get(pq.questionId))
          .filter(Boolean)
      : exam.questions;

  const hasSubjective = targetQuestions.some(
    (q) => !OBJECTIVE_TYPES.has((q.questionType || 'MCQ').toUpperCase())
  );
  let courseContext = '';
  if (hasSubjective) {
    const topics = await prisma.extractedTopic.findMany({
      where: { courseId: exam.courseId, status: { in: ['APPROVED', 'PUBLISHED'] } },
      select: { title: true, summary: true },
      take: 8,
    });
    courseContext = topics.map((t) => `${t.title}: ${t.summary || ''}`).join('\n');
  }

  const totalQuestions = targetQuestions.length;
  let totalMarksPossible = 0;
  let totalMarksEarned = 0;
  let correctCount = 0;
  let anyAiFailed = false;
  let maxRetryUsed = 0;
  let failureMessage = '';

  const now = new Date();
  const answerKeyReleased =
    !exam.answerKeyReleaseAt || now >= new Date(exam.answerKeyReleaseAt);

  const questionReview: any[] = [];
  const answerUpserts: Array<{
    questionId: string;
    answerText: string | null;
    selectedOption: string | null;
    isCorrect: boolean | null;
    marksAwarded: number | null;
    maxMarks: number;
    evaluationStatus: string;
    feedback: string;
  }> = [];

  for (const q of targetQuestions) {
    const qType = (q.questionType || 'MCQ').toUpperCase();
    const qMarks = Math.max(1, Number(q.marks) || 4);
    totalMarksPossible += qMarks;
    const studentAnswer = String(mergedAnswers[q.id] ?? '').trim();
    const parsedOptions = safeJsonParse<unknown[]>(q.optionsJson, []);

    if (OBJECTIVE_TYPES.has(qType)) {
      const res = gradeObjectiveAnswer(
        {
          questionType: qType,
          correctAnswer: q.correctAnswer,
          acceptedAlternativesJson: q.acceptedAlternativesJson,
          caseSensitive: q.caseSensitive,
          partialCredit: q.partialCredit,
          negativeMarks: q.negativeMarks,
          marks: qMarks,
          optionsJson: q.optionsJson,
        },
        studentAnswer
      );

      if (res.isCorrect) correctCount += 1;
      totalMarksEarned += res.marksAwarded;

      questionReview.push({
        id: q.id,
        orderIndex: q.orderIndex,
        questionType: qType,
        text: q.text,
        options: parsedOptions,
        studentAnswer,
        correctAnswer: exam.allowReview && answerKeyReleased ? q.correctAnswer : undefined,
        isCorrect: res.isCorrect,
        isPartial: res.isPartial,
        marksAwarded: res.marksAwarded,
        maxMarks: qMarks,
        feedback: res.feedback,
        explanation: exam.showExplanations && answerKeyReleased ? q.explanation : undefined,
        evaluationStatus: 'COMPLETED',
      });

      answerUpserts.push({
        questionId: q.id,
        answerText: qType === 'FILL_BLANK' || qType === 'MATCHING' ? studentAnswer : null,
        selectedOption: qType === 'MCQ' || qType === 'TRUE_FALSE' ? studentAnswer : null,
        isCorrect: res.isCorrect,
        marksAwarded: res.marksAwarded,
        maxMarks: qMarks,
        evaluationStatus: 'COMPLETED',
        feedback: res.feedback,
      });
    } else {
      const aiRes = await evaluateSubjectiveWithAI({
        questionText: q.text,
        questionType: qType,
        maxMarks: qMarks,
        expectedAnswer: q.expectedAnswer || q.correctAnswer,
        acceptedAlternativesJson: q.acceptedAlternativesJson,
        rubricJson: q.rubricJson,
        requiredConceptsJson: q.requiredConceptsJson,
        criticalErrorsJson: q.criticalErrorsJson,
        courseContext,
        studentAnswer,
      });

      maxRetryUsed = Math.max(maxRetryUsed, aiRes.retryCount);
      if (aiRes.status === 'FAILED') {
        anyAiFailed = true;
        failureMessage = aiRes.errorMessage || 'AI subjective grading failed.';
      } else {
        if (aiRes.awardedMarks >= qMarks * 0.5) correctCount += 1;
        totalMarksEarned += aiRes.awardedMarks;
      }

      questionReview.push({
        id: q.id,
        orderIndex: q.orderIndex,
        questionType: qType,
        text: q.text,
        options: parsedOptions,
        studentAnswer,
        expectedAnswer:
          exam.allowReview && answerKeyReleased ? q.expectedAnswer || q.correctAnswer : undefined,
        isCorrect: aiRes.status === 'COMPLETED' ? aiRes.awardedMarks >= qMarks * 0.5 : null,
        marksAwarded: aiRes.awardedMarks,
        maxMarks: qMarks,
        conceptsCorrect: aiRes.conceptsCorrect,
        conceptsMissing: aiRes.conceptsMissing,
        incorrectClaims: aiRes.incorrectClaims,
        feedback: aiRes.feedback,
        explanation:
          exam.showExplanations && answerKeyReleased
            ? aiRes.explanation || q.explanation
            : undefined,
        evaluationStatus: aiRes.status,
        errorMessage: aiRes.errorMessage,
      });

      answerUpserts.push({
        questionId: q.id,
        answerText: studentAnswer,
        selectedOption: null,
        isCorrect: aiRes.status === 'COMPLETED' ? aiRes.awardedMarks >= qMarks * 0.5 : null,
        marksAwarded: aiRes.awardedMarks,
        maxMarks: qMarks,
        evaluationStatus: aiRes.status,
        feedback: aiRes.feedback,
      });
    }
  }

  const clampedEarned = Math.max(0, Math.round(totalMarksEarned * 100) / 100);
  const percentage =
    totalMarksPossible > 0
      ? Math.min(100, Math.round((clampedEarned / totalMarksPossible) * 100))
      : 0;
  const score = anyAiFailed ? 0 : percentage;

  const evaluationStatus = anyAiFailed
    ? 'FAILED'
    : exam.requireVerificationBeforePublish
    ? 'NEEDS_VERIFICATION'
    : 'COMPLETED';
  const attemptStatus = anyAiFailed
    ? 'GRADING_PENDING'
    : exam.requireVerificationBeforePublish
    ? 'NEEDS_VERIFICATION'
    : 'GRADED';

  const revisionRecommendations =
    !anyAiFailed && percentage < 80
      ? await buildRevisionRecommendations(exam.courseId)
      : [];

  let savedAttempt;
  if (existingAttempt?.id) {
    savedAttempt = await prisma.examAttempt.update({
      where: { id: existingAttempt.id },
      data: {
        score,
        totalQuestions,
        correctCount,
        percentage,
        status: attemptStatus,
        answersJson: JSON.stringify(mergedAnswers),
        evaluationStatus,
        retryCount: maxRetryUsed,
        errorMessage: anyAiFailed ? failureMessage : null,
        ...(idempotencyKey ? { idempotencyKey } : {}),
        evaluationDetailsJson: JSON.stringify(questionReview),
        revisionRecommendationsJson: JSON.stringify(revisionRecommendations),
        autoGradedAt: anyAiFailed ? null : now,
        submittedAt: now,
      },
    });
  } else {
    const priorCount = await prisma.examAttempt.count({
      where: { examId: exam.id, studentId: student.id },
    });
    savedAttempt = await prisma.examAttempt.create({
      data: {
        examId: exam.id,
        studentId: student.id,
        attemptNumber: priorCount + 1,
        score,
        totalQuestions,
        correctCount,
        percentage,
        status: attemptStatus,
        answersJson: JSON.stringify(mergedAnswers),
        evaluationStatus,
        retryCount: maxRetryUsed,
        errorMessage: anyAiFailed ? failureMessage : null,
        idempotencyKey: idempotencyKey || null,
        evaluationDetailsJson: JSON.stringify(questionReview),
        revisionRecommendationsJson: JSON.stringify(revisionRecommendations),
        autoGradedAt: anyAiFailed ? null : now,
        submittedAt: now,
      },
    });
  }

  // Persist normalized ExamAnswer records
  for (const ans of answerUpserts) {
    await prisma.examAnswer.upsert({
      where: {
        attemptId_questionId: {
          attemptId: savedAttempt.id,
          questionId: ans.questionId,
        },
      },
      update: {
        answerText: ans.answerText,
        selectedOption: ans.selectedOption,
        isCorrect: ans.isCorrect,
        marksAwarded: ans.marksAwarded,
        maxMarks: ans.maxMarks,
        evaluationStatus: ans.evaluationStatus,
        feedback: ans.feedback,
        savedAt: now,
      },
      create: {
        attemptId: savedAttempt.id,
        questionId: ans.questionId,
        answerText: ans.answerText,
        selectedOption: ans.selectedOption,
        isCorrect: ans.isCorrect,
        marksAwarded: ans.marksAwarded,
        maxMarks: ans.maxMarks,
        evaluationStatus: ans.evaluationStatus,
        feedback: ans.feedback,
        savedAt: now,
      },
    });
  }

  await prisma.examinationActivityLog.create({
    data: {
      attemptId: savedAttempt.id,
      eventType: autoSubmitted ? 'AUTO_EXPIRED' : 'EXAM_SUBMITTED',
      detailsJson: JSON.stringify({
        score,
        percentage,
        evaluationStatus,
        autoSubmitted: Boolean(autoSubmitted),
      }),
    },
  });

  if (anyAiFailed) {
    const admins = await prisma.user.findMany({
      where: { role: { in: ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'REGISTRAR', 'EXAM_OFFICER'] } },
      select: { id: true },
      take: 5,
    });
    for (const adm of admins) {
      await prisma.notification.upsert({
        where: { dedupeKey: `exam-grading-failed-${savedAttempt.id}-${adm.id}` },
        update: {},
        create: {
          userId: adm.id,
          title: `Auto-Grading Failed: ${exam.title}`,
          message: `Attempt ${savedAttempt.id} could not complete AI subjective grading (${failureMessage}). Please retry from Examinations.`,
          type: 'alert',
          dedupeKey: `exam-grading-failed-${savedAttempt.id}-${adm.id}`,
          link: '/portal/admin/examinations',
        },
      });
    }
  } else if (!exam.requireVerificationBeforePublish) {
    await recalculateContinuousAssessment(student.id, exam.courseId);
  }

  await logAcademicAudit({
    actorId: student.userId || student.id,
    actorName: 'Student',
    actorRole: 'STUDENT',
    action: autoSubmitted ? 'EXAM_AUTO_SUBMITTED' : 'EXAM_SUBMITTED_AUTO_GRADED',
    entityType: 'ExamAttempt',
    entityId: savedAttempt.id,
    details: { examId: exam.id, score, percentage, evaluationStatus },
  });

  const published = isResultPublished(exam, savedAttempt);

  return {
    attempt: savedAttempt,
    score,
    percentage,
    totalMarksEarned: clampedEarned,
    totalMarksPossible,
    totalQuestions,
    correctCount,
    evaluationStatus,
    published,
    questionReview: published ? questionReview : [],
    revisionRecommendations: published ? revisionRecommendations : [],
  };
}
