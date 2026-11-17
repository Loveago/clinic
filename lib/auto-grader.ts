import fs from 'fs/promises';
import path from 'path';
import { prisma } from '@/lib/prisma';
import { callOpenAICompatibleJson, resolveActiveAIProvider } from '@/lib/ai-provider';
import { extractPagesFromPdf } from '@/lib/pdf-processor';

const DEFAULT_GRADE_BANDS = [
  { minScore: 80, maxScore: 100, gradeLetter: 'A', gradePoint: 4.0 },
  { minScore: 75, maxScore: 79.99, gradeLetter: 'B+', gradePoint: 3.5 },
  { minScore: 70, maxScore: 74.99, gradeLetter: 'B', gradePoint: 3.0 },
  { minScore: 65, maxScore: 69.99, gradeLetter: 'C+', gradePoint: 2.5 },
  { minScore: 60, maxScore: 64.99, gradeLetter: 'C', gradePoint: 2.0 },
  { minScore: 55, maxScore: 59.99, gradeLetter: 'D+', gradePoint: 1.5 },
  { minScore: 50, maxScore: 54.99, gradeLetter: 'D', gradePoint: 1.0 },
  { minScore: 0, maxScore: 49.99, gradeLetter: 'F', gradePoint: 0.0 },
];

function safeParseJson<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function normalizeText(value: string, caseSensitive: boolean): string {
  const trimmed = value.trim().replace(/\s+/g, ' ');
  return caseSensitive ? trimmed : trimmed.toLowerCase();
}

export function gradeObjectiveAnswer(
  params: {
    questionType: string;
    correctAnswer: string;
    acceptedAlternativesJson?: string | null;
    caseSensitive?: boolean;
    partialCredit?: boolean;
    negativeMarks?: number;
    marks: number;
    optionsJson?: string | null;
  },
  studentAnswer: string
): { isCorrect: boolean; isPartial: boolean; marksAwarded: number; feedback: string } {
  const maxMarks = Math.max(0, Number(params.marks) || 0);
  const caseSensitive = Boolean(params.caseSensitive);
  const partialCredit = params.partialCredit !== false;
  const negativeMarks = Math.max(0, Number(params.negativeMarks) || 0);
  const qType = (params.questionType || 'MCQ').toUpperCase();
  const submitted = (studentAnswer ?? '').trim();

  if (!submitted) {
    return {
      isCorrect: false,
      isPartial: false,
      marksAwarded: 0,
      feedback: 'No answer was submitted.',
    };
  }

  const alternatives = safeParseJson<string[]>(params.acceptedAlternativesJson, []);
  const validAnswers = [params.correctAnswer, ...alternatives]
    .filter((a) => typeof a === 'string' && a.trim().length > 0)
    .map((a) => normalizeText(a, caseSensitive));

  if (qType === 'MATCHING') {
    const expectedRaw = safeParseJson<Array<{ left: string; right: string }> | Record<string, string>>(
      params.correctAnswer,
      []
    );
    const expectedPairs: Array<{ left: string; right: string }> = Array.isArray(expectedRaw)
      ? expectedRaw
      : Object.entries(expectedRaw).map(([left, right]) => ({ left, right }));

    const submittedRaw = safeParseJson<Record<string, string> | Array<{ left: string; right: string }>>(
      submitted,
      {}
    );
    const submittedMap: Record<string, string> = Array.isArray(submittedRaw)
      ? Object.fromEntries(submittedRaw.map((p) => [p.left, p.right]))
      : submittedRaw;

    if (expectedPairs.length === 0) {
      return { isCorrect: false, isPartial: false, marksAwarded: 0, feedback: 'Invalid matching key.' };
    }

    let matched = 0;
    for (const pair of expectedPairs) {
      const subVal = submittedMap[pair.left];
      if (subVal && normalizeText(subVal, caseSensitive) === normalizeText(pair.right, caseSensitive)) {
        matched += 1;
      }
    }

    if (matched === expectedPairs.length) {
      return {
        isCorrect: true,
        isPartial: false,
        marksAwarded: maxMarks,
        feedback: `All ${matched}/${expectedPairs.length} pairs matched correctly.`,
      };
    }

    if (matched > 0 && partialCredit) {
      const awarded = Math.round((matched / expectedPairs.length) * maxMarks * 100) / 100;
      return {
        isCorrect: false,
        isPartial: true,
        marksAwarded: awarded,
        feedback: `Partial credit: ${matched}/${expectedPairs.length} pairs matched correctly.`,
      };
    }

    return {
      isCorrect: false,
      isPartial: false,
      marksAwarded: negativeMarks > 0 ? -negativeMarks : 0,
      feedback: `0/${expectedPairs.length} pairs matched.`,
    };
  }

  if (qType === 'FILL_BLANK') {
    const expectedList = safeParseJson<string[]>(params.correctAnswer, []);
    const submittedList = safeParseJson<string[]>(submitted, []);
    if (Array.isArray(expectedList) && expectedList.length > 1 && Array.isArray(submittedList)) {
      let matched = 0;
      for (let i = 0; i < expectedList.length; i++) {
        const exp = normalizeText(String(expectedList[i] ?? ''), caseSensitive);
        const sub = normalizeText(String(submittedList[i] ?? ''), caseSensitive);
        if (exp && sub === exp) matched += 1;
      }
      if (matched === expectedList.length) {
        return {
          isCorrect: true,
          isPartial: false,
          marksAwarded: maxMarks,
          feedback: 'All blanks filled correctly.',
        };
      }
      if (matched > 0 && partialCredit) {
        const awarded = Math.round((matched / expectedList.length) * maxMarks * 100) / 100;
        return {
          isCorrect: false,
          isPartial: true,
          marksAwarded: awarded,
          feedback: `Partial credit: ${matched}/${expectedList.length} blanks correct.`,
        };
      }
    }
  }

  const normalizedSub = normalizeText(submitted, caseSensitive);
  const isCorrect = validAnswers.includes(normalizedSub);

  if (isCorrect) {
    return {
      isCorrect: true,
      isPartial: false,
      marksAwarded: maxMarks,
      feedback: 'Correct answer.',
    };
  }

  return {
    isCorrect: false,
    isPartial: false,
    marksAwarded: negativeMarks > 0 ? -negativeMarks : 0,
    feedback: `Incorrect. Expected: ${params.correctAnswer}.`,
  };
}

export async function generateRubricOnce(params: {
  promptText: string;
  questionType: string;
  maxMarks: number;
  correctAnswer?: string | null;
  courseContext?: string | null;
}): Promise<{
  expectedAnswer: string;
  acceptedAlternatives: string[];
  requiredConcepts: string[];
  criticalErrors: string[];
  rubric: {
    criteria: Array<{ name: string; marks: number; description: string }>;
    partialCreditRules: string;
  };
  explanation: string;
}> {
  const maxMarks = Math.max(1, Number(params.maxMarks) || 10);
  const fallbackExpected =
    params.correctAnswer?.trim() ||
    `Accurate clinical and theoretical response addressing: ${params.promptText.slice(0, 140)}`;

  const fallback = {
    expectedAnswer: fallbackExpected,
    acceptedAlternatives: [],
    requiredConcepts: ['Core clinical principle', 'Accurate terminology', 'Patient safety rationale'],
    criticalErrors: ['Contradictory clinical action', 'Unsafe dosage or infection-control breach'],
    rubric: {
      criteria: [
        {
          name: 'Concept Accuracy',
          marks: Math.round(maxMarks * 0.6 * 10) / 10,
          description: 'Demonstrates accurate understanding of core nursing/clinical concepts.',
        },
        {
          name: 'Clinical Reasoning & Clarity',
          marks: Math.round(maxMarks * 0.4 * 10) / 10,
          description: 'Applies concepts logically with clear professional terminology.',
        },
      ],
      partialCreditRules: 'Award proportional marks for each required concept accurately explained.',
    },
    explanation: fallbackExpected,
  };

  const provider = await resolveActiveAIProvider();
  if (!provider) {
    return fallback;
  }

  const systemPrompt = `You are a Ghana Nursing & Midwifery academic assessment designer.
Generate a concise, structured marking rubric JSON for a ${params.questionType} question worth ${maxMarks} marks.
Return ONLY valid JSON with keys:
{
  "expectedAnswer": string,
  "acceptedAlternatives": string[],
  "requiredConcepts": string[],
  "criticalErrors": string[],
  "rubric": {
    "criteria": [{ "name": string, "marks": number, "description": string }],
    "partialCreditRules": string
  },
  "explanation": string
}`;

  const userPrompt = `Prompt: ${params.promptText}
${params.correctAnswer ? `Reference Answer: ${params.correctAnswer}` : ''}
${params.courseContext ? `Course Context:\n${params.courseContext.slice(0, 2000)}` : ''}`;

  const result = await callOpenAICompatibleJson<typeof fallback>(systemPrompt, userPrompt, provider, 1);
  if (!result.ok || !result.data) {
    return fallback;
  }

  return {
    expectedAnswer: result.data.expectedAnswer || fallback.expectedAnswer,
    acceptedAlternatives: Array.isArray(result.data.acceptedAlternatives) ? result.data.acceptedAlternatives : [],
    requiredConcepts: Array.isArray(result.data.requiredConcepts) ? result.data.requiredConcepts : fallback.requiredConcepts,
    criticalErrors: Array.isArray(result.data.criticalErrors) ? result.data.criticalErrors : fallback.criticalErrors,
    rubric: result.data.rubric?.criteria?.length ? result.data.rubric : fallback.rubric,
    explanation: result.data.explanation || fallback.explanation,
  };
}

export async function evaluateSubjectiveWithAI(params: {
  questionText: string;
  questionType: string;
  maxMarks: number;
  expectedAnswer?: string | null;
  acceptedAlternativesJson?: string | null;
  rubricJson?: string | null;
  requiredConceptsJson?: string | null;
  criticalErrorsJson?: string | null;
  courseContext?: string | null;
  studentAnswer: string;
  maxRetries?: number;
}): Promise<{
  status: 'COMPLETED' | 'FAILED';
  awardedMarks: number;
  maxMarks: number;
  conceptsCorrect: string[];
  conceptsMissing: string[];
  incorrectClaims: string[];
  explanation: string;
  feedback: string;
  retryCount: number;
  errorMessage?: string;
}> {
  const maxMarks = Math.max(0, Number(params.maxMarks) || 0);
  const submitted = (params.studentAnswer ?? '').trim();

  if (!submitted) {
    return {
      status: 'COMPLETED',
      awardedMarks: 0,
      maxMarks,
      conceptsCorrect: [],
      conceptsMissing: safeParseJson<string[]>(params.requiredConceptsJson, []),
      incorrectClaims: [],
      explanation: params.expectedAnswer || 'No response submitted.',
      feedback: 'No answer was provided.',
      retryCount: 0,
    };
  }

  // Deterministic exact/alternative match check (0 AI calls)
  const alternatives = safeParseJson<string[]>(params.acceptedAlternativesJson, []);
  const deterministicKeys = [params.expectedAnswer || '', ...alternatives]
    .filter((k) => k.trim().length > 0)
    .map((k) => normalizeText(k, false));

  if (deterministicKeys.includes(normalizeText(submitted, false))) {
    return {
      status: 'COMPLETED',
      awardedMarks: maxMarks,
      maxMarks,
      conceptsCorrect: safeParseJson<string[]>(params.requiredConceptsJson, ['Exact expected response']),
      conceptsMissing: [],
      incorrectClaims: [],
      explanation: params.expectedAnswer || 'Matches expected answer.',
      feedback: 'Accurate response matching the expected marking key.',
      retryCount: 0,
    };
  }

  const provider = await resolveActiveAIProvider();
  const maxRetries = params.maxRetries ?? 2;

  if (!provider) {
    return {
      status: 'FAILED',
      awardedMarks: 0,
      maxMarks,
      conceptsCorrect: [],
      conceptsMissing: [],
      incorrectClaims: [],
      explanation: params.expectedAnswer || '',
      feedback: 'Automated AI evaluation unavailable (no active AI provider configured). Pending retry.',
      retryCount: 0,
      errorMessage: 'No active AI provider configured.',
    };
  }

  const systemPrompt = `You are a strict, fair Ghana Nursing & Midwifery examiner.
Grade the student's ${params.questionType} response against the saved rubric and course context.
Award marks strictly between 0 and ${maxMarks}.
Return ONLY valid JSON:
{
  "awardedMarks": number,
  "conceptsCorrect": string[],
  "conceptsMissing": string[],
  "incorrectClaims": string[],
  "explanation": string,
  "feedback": string
}`;

  const userPrompt = `Question (${maxMarks} marks): ${params.questionText}
Expected Answer: ${params.expectedAnswer || 'See rubric'}
Rubric: ${params.rubricJson || 'Standard accuracy and clinical reasoning'}
Required Concepts: ${params.requiredConceptsJson || '[]'}
Critical Errors: ${params.criticalErrorsJson || '[]'}
${params.courseContext ? `Approved Course Context:\n${params.courseContext.slice(0, 2500)}` : ''}

Student Answer:
${submitted.slice(0, 4000)}`;

  let attempts = 0;
  let lastError = 'AI evaluation failed.';

  while (attempts <= maxRetries) {
    attempts += 1;
    const res = await callOpenAICompatibleJson<{
      awardedMarks: number;
      conceptsCorrect?: string[];
      conceptsMissing?: string[];
      incorrectClaims?: string[];
      explanation?: string;
      feedback?: string;
    }>(systemPrompt, userPrompt, provider, 0);

    if (res.ok && res.data && typeof res.data.awardedMarks === 'number' && !Number.isNaN(res.data.awardedMarks)) {
      const clamped = Math.max(0, Math.min(maxMarks, Math.round(res.data.awardedMarks * 100) / 100));
      return {
        status: 'COMPLETED',
        awardedMarks: clamped,
        maxMarks,
        conceptsCorrect: Array.isArray(res.data.conceptsCorrect) ? res.data.conceptsCorrect : [],
        conceptsMissing: Array.isArray(res.data.conceptsMissing) ? res.data.conceptsMissing : [],
        incorrectClaims: Array.isArray(res.data.incorrectClaims) ? res.data.incorrectClaims : [],
        explanation: res.data.explanation || params.expectedAnswer || '',
        feedback: res.data.feedback || 'Evaluated automatically against saved marking rubric.',
        retryCount: attempts - 1,
      };
    }

    lastError = res.error || 'Malformed AI grading response.';
  }

  return {
    status: 'FAILED',
    awardedMarks: 0,
    maxMarks,
    conceptsCorrect: [],
    conceptsMissing: [],
    incorrectClaims: [],
    explanation: params.expectedAnswer || '',
    feedback: 'Automated evaluation failed after retries. Pending retry or verification.',
    retryCount: maxRetries,
    errorMessage: lastError,
  };
}

export async function extractSubmissionText(params: {
  fileUrl?: string | null;
  notes?: string | null;
  allowedFormats?: string | null;
}): Promise<{ ok: boolean; text: string; error?: string }> {
  const notes = (params.notes || '').trim();
  const fileUrl = (params.fileUrl || '').trim();

  if (!fileUrl) {
    if (!notes) {
      return { ok: false, text: '', error: 'No submission file or text provided.' };
    }
    return { ok: true, text: notes };
  }

  if (fileUrl.startsWith('data:text/plain;base64,')) {
    const b64 = fileUrl.slice('data:text/plain;base64,'.length);
    const decoded = Buffer.from(b64, 'base64').toString('utf8').trim();
    const combined = [decoded, notes].filter(Boolean).join('\n\n');
    if (!combined) {
      return { ok: false, text: '', error: 'Uploaded text data is empty.' };
    }
    return { ok: true, text: combined };
  }

  const ext = path.extname(fileUrl.split('?')[0]).toLowerCase().replace('.', '');
  const UNSAFE_EXTENSIONS = new Set(['exe', 'dll', 'bat', 'cmd', 'sh', 'msi', 'bin', 'app', 'dmg']);
  if (ext && UNSAFE_EXTENSIONS.has(ext)) {
    return {
      ok: false,
      text: '',
      error: `Unsupported or unsafe file format (.${ext}).`,
    };
  }
  if (params.allowedFormats) {
    const allowed = params.allowedFormats
      .split(',')
      .map((s) => s.trim().toLowerCase().replace('.', ''))
      .filter(Boolean);
    if (allowed.length > 0 && ext && !allowed.includes(ext)) {
      return {
        ok: false,
        text: '',
        error: `Unsupported file format (.${ext}). Allowed formats: ${allowed.join(', ')}`,
      };
    }
  }

  const cleanRel = fileUrl.replace(/^\/+/, '');
  const candidates = [
    path.join(process.cwd(), cleanRel),
    path.join(process.cwd(), 'public', cleanRel),
  ];

  let foundPath: string | null = null;
  for (const candidate of candidates) {
    try {
      const stat = await fs.stat(candidate);
      if (stat.isFile()) {
        foundPath = candidate;
        break;
      }
    } catch {
      // continue
    }
  }

  if (!foundPath) {
    if (notes) {
      return { ok: true, text: notes };
    }
    return { ok: true, text: `Submitted file reference: ${fileUrl}` };
  }

  try {
    if (ext === 'pdf') {
      const extracted = await extractPagesFromPdf(foundPath);
      const pdfText = extracted.pages.map((p) => p.text).join('\n').trim();
      const combined = [pdfText, notes].filter(Boolean).join('\n\n');
      if (!combined) {
        return { ok: false, text: '', error: 'Uploaded PDF contains no extractable text.' };
      }
      return { ok: true, text: combined };
    }

    if (['txt', 'md', 'csv', 'json'].includes(ext)) {
      const fileText = (await fs.readFile(foundPath, 'utf8')).trim();
      const combined = [fileText, notes].filter(Boolean).join('\n\n');
      return { ok: true, text: combined || notes };
    }

    if (notes) {
      return { ok: true, text: notes };
    }
    return { ok: false, text: '', error: `Unsupported readable document format (.${ext || 'unknown'}).` };
  } catch (err: any) {
    if (notes) {
      return { ok: true, text: notes };
    }
    return { ok: false, text: '', error: err?.message || 'Failed to read submission file.' };
  }
}

export async function buildRevisionRecommendations(
  courseId: string,
  weakTopicIds?: string[]
): Promise<Array<{ topicId: string; topicTitle: string; materialTitle: string; summary: string }>> {
  const topics = await prisma.extractedTopic.findMany({
    where: {
      courseId,
      status: { in: ['APPROVED', 'PUBLISHED'] },
      ...(weakTopicIds && weakTopicIds.length > 0 ? { id: { in: weakTopicIds } } : {}),
    },
    include: {
      material: { select: { title: true } },
    },
    orderBy: { orderIndex: 'asc' },
    take: 5,
  });

  return topics.map((t) => ({
    topicId: t.id,
    topicTitle: t.title,
    materialTitle: t.material?.title || 'Course Material',
    summary: t.summary || t.description || 'Review this topic in your Course Learning Centre.',
  }));
}

export async function recalculateContinuousAssessment(
  studentId: string,
  courseId: string,
  semesterId?: string | null
) {
  const [course, components, gradeScales] = await Promise.all([
    prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true, semester: true, semesterId: true },
    }),
    prisma.assessmentComponent.findMany({
      where: {
        courseId,
        ...(semesterId ? { semesterId } : {}),
      },
      include: {
        scores: { where: { studentId } },
      },
      orderBy: { orderIndex: 'asc' },
    }),
    prisma.gradeScale.findMany({
      orderBy: [{ isDefault: 'desc' }, { minScore: 'desc' }],
    }),
  ]);

  if (!course || components.length === 0) {
    return null;
  }

  let requireVerification = false;

  // Auto-sync component scores from completed assessments
  for (const comp of components) {
    if (!comp.autoSync || !comp.sourceType) continue;

    let syncedScore: number | null = null;

    if (comp.sourceType === 'ASSIGNMENT') {
      const sub = await prisma.assignmentSubmission.findFirst({
        where: {
          studentId,
          isGraded: true,
          evaluationStatus: { not: 'FAILED' },
          assignment: comp.sourceId ? { id: comp.sourceId } : { courseId },
        },
        include: { assignment: { select: { maxMarks: true } } },
        orderBy: { submittedAt: 'desc' },
      });
      if (sub && sub.score !== null && sub.assignment.maxMarks > 0) {
        syncedScore = Math.round((sub.score / sub.assignment.maxMarks) * comp.maxMarks * 100) / 100;
      }
    } else if (comp.sourceType === 'EXAM') {
      const examAttempt = await prisma.examAttempt.findFirst({
        where: {
          studentId,
          status: 'GRADED',
          evaluationStatus: { not: 'FAILED' },
          exam: comp.sourceId ? { id: comp.sourceId } : { courseId },
        },
        include: { exam: { select: { requireVerificationBeforePublish: true } } },
        orderBy: { submittedAt: 'desc' },
      });
      if (examAttempt) {
        if (examAttempt.exam.requireVerificationBeforePublish) requireVerification = true;
        syncedScore = Math.round((examAttempt.percentage / 100) * comp.maxMarks * 100) / 100;
      }
    } else if (comp.sourceType === 'TOPIC_ASSESSMENT') {
      const topicAttempt = await prisma.topicAssessmentAttempt.findFirst({
        where: {
          studentId,
          status: 'GRADED',
          evaluationStatus: { not: 'FAILED' },
          assessment: comp.sourceId ? { id: comp.sourceId } : { courseId },
        },
        include: { assessment: { select: { requireVerificationBeforePublish: true } } },
        orderBy: { percentage: 'desc' },
      });
      if (topicAttempt) {
        if (topicAttempt.assessment.requireVerificationBeforePublish) requireVerification = true;
        syncedScore = Math.round((topicAttempt.percentage / 100) * comp.maxMarks * 100) / 100;
      }
    }

    if (syncedScore !== null) {
      await prisma.gradebookComponentScore.upsert({
        where: {
          componentId_studentId: { componentId: comp.id, studentId },
        },
        update: {
          score: syncedScore,
          isAutoCalculated: true,
        },
        create: {
          componentId: comp.id,
          studentId,
          score: syncedScore,
          isAutoCalculated: true,
        },
      });
    }
  }

  // Re-read scores after sync
  const refreshedComponents = await prisma.assessmentComponent.findMany({
    where: { id: { in: components.map((c) => c.id) } },
    include: { scores: { where: { studentId } } },
  });

  let caScore = 0;
  let examScore = 0;

  for (const comp of refreshedComponents) {
    const rawScore = comp.scores[0]?.score ?? 0;
    const weighted = comp.maxMarks > 0 ? (rawScore / comp.maxMarks) * comp.weightPercent : 0;
    if (comp.componentType === 'FINAL_EXAM') {
      examScore += weighted;
    } else {
      caScore += weighted;
    }
  }

  caScore = Math.round(caScore * 100) / 100;
  examScore = Math.round(examScore * 100) / 100;
  const totalScore = Math.min(100, Math.round((caScore + examScore) * 100) / 100);

  const activeScale =
    gradeScales.length > 0
      ? gradeScales.map((s) => ({
          minScore: s.minScore,
          maxScore: s.maxScore,
          gradeLetter: s.gradeLetter,
          gradePoint: s.gradePoint,
        }))
      : DEFAULT_GRADE_BANDS;

  const band =
    activeScale.find((b) => totalScore >= b.minScore && totalScore <= b.maxScore) ||
    activeScale.find((b) => totalScore >= b.minScore) ||
    activeScale[activeScale.length - 1];

  const shouldPublish = !requireVerification;
  const now = new Date();

  const caRecord = await prisma.continuousAssessment.upsert({
    where: { studentId_courseId: { studentId, courseId } },
    update: {
      semesterId: semesterId || course.semesterId || null,
      caScore,
      examScore,
      totalScore,
      grade: band.gradeLetter,
      gpaPoint: band.gradePoint,
      status: shouldPublish ? 'PUBLISHED' : 'SUBMITTED',
      isApproved: shouldPublish,
      isPublished: shouldPublish,
      publishedAt: shouldPublish ? now : null,
    },
    create: {
      studentId,
      courseId,
      semesterId: semesterId || course.semesterId || null,
      caScore,
      examScore,
      totalScore,
      grade: band.gradeLetter,
      gpaPoint: band.gradePoint,
      status: shouldPublish ? 'PUBLISHED' : 'SUBMITTED',
      isApproved: shouldPublish,
      isPublished: shouldPublish,
      publishedAt: shouldPublish ? now : null,
      semester: course.semester || 'First Semester',
    },
  });

  // Update Student.cgpa from all published ContinuousAssessments
  const allPublished = await prisma.continuousAssessment.findMany({
    where: { studentId, isPublished: true },
    include: { course: { select: { creditHours: true } } },
  });

  let totalCredits = 0;
  let totalQualityPoints = 0;
  for (const rec of allPublished) {
    const credits = rec.course?.creditHours || 3;
    totalCredits += credits;
    totalQualityPoints += rec.gpaPoint * credits;
  }

  if (totalCredits > 0) {
    const cgpa = Math.round((totalQualityPoints / totalCredits) * 100) / 100;
    await prisma.student.update({
      where: { id: studentId },
      data: { cgpa },
    });
  }

  return caRecord;
}
