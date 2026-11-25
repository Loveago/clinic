import path from 'path';
import fs from 'fs/promises';
import { prisma } from '@/lib/prisma';
import { extractPagesFromPdf, type StructuredTopicContent } from '@/lib/pdf-processor';
import { generateRubricOnce } from '@/lib/auto-grader';
import type { StudyTrackCode } from '@/lib/study-tracks';

export interface GeneratePdfExamInput {
  courseId: string;
  examId?: string;
  materialIds?: string[];
  topicIds?: string[];
  title?: string;
  examType?: 'END_OF_SEMESTER' | 'FINAL' | 'MID_SEMESTER' | 'QUIZ';
  studyTrack?: StudyTrackCode | null;
  objectiveCount?: number;
  writtenCount?: number;
  objectiveMarks?: number;
  writtenMarks?: number;
  durationMinutes?: number;
  passMark?: number;
  scheduledDate?: string;
  scheduledTime?: string;
  venue?: string;
  instructions?: string;
  includeAllProgrammeModules?: boolean;
  isLocked?: boolean;
  isPublished?: boolean;
  status?: string;
}

interface DraftExamQuestion {
  sectionType: 'OBJECTIVE' | 'WRITTEN';
  questionType: 'MCQ' | 'TRUE_FALSE' | 'ESSAY' | 'SHORT_ANSWER';
  difficulty: 'EASY' | 'MEDIUM' | 'DIFFICULT';
  topicTitle: string;
  topicQuestionId?: string | null;
  text: string;
  options: string[];
  correctAnswer: string;
  expectedAnswer: string;
  requiredConcepts: string[];
  rubric: Array<{ criterion: string; maxMarks: number; description: string }>;
  explanation: string;
  marks: number;
}

function safeJson<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function extractCleanSentences(text: string): string[] {
  return text
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 35 && s.length <= 260 && !/^page\s+\d+/i.test(s));
}

function pickKeyTerm(sentence: string, keyConcepts: string[]): string | null {
  for (const concept of keyConcepts) {
    if (concept.length >= 4 && sentence.toLowerCase().includes(concept.toLowerCase())) {
      return concept;
    }
  }
  const words: string[] = sentence.match(/\b[A-Za-z]{5,18}\b/g) || [];
  const stop = new Set([
    'these', 'those', 'which', 'where', 'there', 'their', 'about', 'after',
    'before', 'should', 'would', 'could', 'other', 'every', 'first', 'while',
    'during', 'between', 'through', 'because', 'within', 'without', 'under',
    'patient', 'patients', 'caregiver', 'caregivers', 'module', 'section',
  ]);
  return words.find((w: string) => !stop.has(w.toLowerCase())) || null;
}

function deterministicShuffle<T>(items: T[], seedOffset = 0): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = (i + seedOffset + 1) % (i + 1);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function buildMcqDistractors(correct: string, pool: string[], topicTitle: string): string[] {
  const distractors: string[] = [];
  const lower = correct.toLowerCase();
  for (const item of pool) {
    if (item && item.toLowerCase() !== lower && !distractors.includes(item)) {
      distractors.push(item);
    }
    if (distractors.length === 3) break;
  }
  const fallbacks = [
    `Unverified ${topicTitle} assumption`,
    'Delayed clinical documentation',
    'Routine administrative filing',
    'Non-standard observation step',
  ];
  for (const fb of fallbacks) {
    if (distractors.length >= 3) break;
    if (fb.toLowerCase() !== lower && !distractors.includes(fb)) {
      distractors.push(fb);
    }
  }
  return distractors.slice(0, 3);
}

/**
 * Deterministically generates an Examination with both Objective (Section A) and
 * Written/Essay (Section B) questions directly from uploaded PDF LearningMaterials
 * and ExtractedTopics in the database. No external paid AI API required.
 */
export async function generateExaminationFromPdfMaterials(input: GeneratePdfExamInput) {
  const course = await prisma.course.findUnique({
    where: { id: input.courseId },
    include: { programme: true },
  });
  if (!course) {
    throw new Error('Course not found');
  }

  const objectiveCount = Math.max(1, Math.min(60, Number(input.objectiveCount) || 15));
  const writtenCount = Math.max(1, Math.min(15, Number(input.writtenCount) || 3));
  const objectiveMarks = Math.max(1, Number(input.objectiveMarks) || 2);
  const writtenMarks = Math.max(5, Number(input.writtenMarks) || 10);

  const useAllProgrammeModules =
    input.includeAllProgrammeModules === true ||
    (input.examType === 'FINAL' &&
      (!input.materialIds || input.materialIds.length === 0) &&
      (!input.topicIds || input.topicIds.length === 0));

  let programmeCourseIds: string[] = [course.id];
  if (useAllProgrammeModules) {
    const progCourses = await prisma.course.findMany({
      where: { programmeId: course.programmeId, status: 'ACTIVE' },
      select: { id: true },
    });
    if (progCourses.length > 0) {
      programmeCourseIds = progCourses.map((c) => c.id);
    }
  }

  // 1. Load ExtractedTopics for this course (or all programme modules 1-13)
  let topics = await prisma.extractedTopic.findMany({
    where: {
      ...(useAllProgrammeModules
        ? { courseId: { in: programmeCourseIds } }
        : { courseId: course.id }),
      ...(input.materialIds && input.materialIds.length > 0
        ? { materialId: { in: input.materialIds } }
        : {}),
      ...(input.topicIds && input.topicIds.length > 0
        ? { id: { in: input.topicIds } }
        : {}),
    },
    include: {
      material: {
        select: { id: true, title: true, filePath: true, pageCount: true },
      },
      questions: {
        where: { status: { in: ['APPROVED', 'PUBLISHED', 'DRAFT'] } },
        orderBy: { createdAt: 'asc' },
      },
    },
    orderBy: [{ orderIndex: 'asc' }, { createdAt: 'asc' }],
  });

  // Fallback: if no extracted topics for this course, check PDFs directly on LearningMaterial
  const rawMaterialDocs: Array<{
    title: string;
    rawText: string;
    pageStart: number;
    pageEnd: number;
    keyConcepts: string[];
    learningObjectives: string[];
    summary: string;
  }> = [];

  if (topics.length === 0) {
    const materials = await prisma.learningMaterial.findMany({
      where: {
        courseId: course.id,
        ...(input.materialIds && input.materialIds.length > 0
          ? { id: { in: input.materialIds } }
          : {}),
      },
      orderBy: { createdAt: 'asc' },
    });

    for (const mat of materials) {
      let text = '';
      let pageCount = mat.pageCount || 1;

      if (mat.extractedTextJson) {
        const parsed = safeJson<Array<{ page?: number; text?: string }>>(mat.extractedTextJson, []);
        text = parsed.map((p) => p.text || '').join('\n');
      } else if (mat.filePath) {
        const absPath = path.isAbsolute(mat.filePath)
          ? mat.filePath
          : path.join(process.cwd(), mat.filePath);
        try {
          await fs.access(absPath);
          const extracted = await extractPagesFromPdf(absPath);
          text = extracted.pages.map((p) => p.text).join('\n');
          pageCount = extracted.totalPages || 1;
        } catch {
          // ignore unreadable PDF path
        }
      }

      if (text.trim().length > 40) {
        rawMaterialDocs.push({
          title: mat.title,
          rawText: text,
          pageStart: 1,
          pageEnd: pageCount,
          keyConcepts: (text.match(/\b[A-Z][a-z]{4,}(?:\s+[A-Z][a-z]{4,}){0,1}\b/g) || []).slice(0, 10),
          learningObjectives: [`Demonstrate clinical understanding of ${mat.title}.`],
          summary: extractCleanSentences(text).slice(0, 2).join(' ') || mat.description || mat.title,
        });
      }
    }
  } else {
    for (const t of topics) {
      const structured = safeJson<StructuredTopicContent | null>(t.contentJson, null);
      let rawText = [
        t.rawText || '',
        structured?.mainExplanation || '',
        structured?.introduction || '',
        structured?.summary || '',
      ]
        .filter(Boolean)
        .join('\n');

      // If rawText is empty but PDF file exists on disk, extract directly from PDF
      if (rawText.trim().length < 50 && t.material?.filePath) {
        const absPath = path.isAbsolute(t.material.filePath)
          ? t.material.filePath
          : path.join(process.cwd(), t.material.filePath);
        try {
          await fs.access(absPath);
          const extracted = await extractPagesFromPdf(absPath);
          rawText = extracted.pages.map((p) => p.text).join('\n');
        } catch {
          // fallback to summary/description
          rawText = t.summary || t.description || t.title;
        }
      }

      rawMaterialDocs.push({
        title: t.title,
        rawText: rawText || t.summary || t.title,
        pageStart: t.pageStart || 1,
        pageEnd: t.pageEnd || 1,
        keyConcepts: structured?.keyConcepts || [],
        learningObjectives: structured?.learningObjectives || [],
        summary: t.summary || structured?.summary || t.title,
      });
    }
  }

  if (rawMaterialDocs.length === 0) {
    throw new Error(
      `No PDF learning materials or extracted topics found for course ${course.code}. Upload or seed course PDFs first.`
    );
  }

  const objectiveDrafts: DraftExamQuestion[] = [];
  const writtenDrafts: DraftExamQuestion[] = [];
  const seenPrompts = new Set<string>();

  // 2. Gather existing TopicQuestions for Objective section first
  const existingObjectivePool = topics.flatMap((t) =>
    t.questions
      .filter((q) => ['MCQ', 'TRUE_FALSE'].includes(q.questionType.toUpperCase()))
      .map((q) => ({ q, topicTitle: t.title }))
  );

  for (const { q, topicTitle } of existingObjectivePool) {
    if (objectiveDrafts.length >= objectiveCount) break;
    const norm = q.questionText.trim().toLowerCase();
    if (seenPrompts.has(norm)) continue;
    seenPrompts.add(norm);

    const options = safeJson<string[]>(q.optionsJson, []);
    objectiveDrafts.push({
      sectionType: 'OBJECTIVE',
      questionType: q.questionType.toUpperCase() === 'TRUE_FALSE' ? 'TRUE_FALSE' : 'MCQ',
      difficulty: (['EASY', 'MEDIUM', 'DIFFICULT'].includes(q.difficulty) ? q.difficulty : 'MEDIUM') as
        | 'EASY'
        | 'MEDIUM'
        | 'DIFFICULT',
      topicTitle,
      topicQuestionId: q.id,
      text: q.questionText,
      options: options.length >= 2 ? options : ['True', 'False'],
      correctAnswer: q.correctAnswer,
      expectedAnswer: q.expectedAnswer || q.correctAnswer,
      requiredConcepts: safeJson<string[]>(q.requiredConceptsJson, []),
      rubric: safeJson(q.rubricJson, []),
      explanation: q.explanation || `Derived from ${topicTitle} (${q.pageRef || 'course PDF'}).`,
      marks: objectiveMarks,
    });
  }

  // 3. Deterministically synthesize remaining Objective (MCQ) questions from PDF text
  const allConceptPool = Array.from(
    new Set(rawMaterialDocs.flatMap((d) => d.keyConcepts).filter((c) => c.length >= 4))
  );

  let docCursor = 0;
  let safety = 0;
  while (objectiveDrafts.length < objectiveCount && safety < objectiveCount * 8) {
    safety++;
    const doc = rawMaterialDocs[docCursor % rawMaterialDocs.length];
    const sentences = extractCleanSentences(doc.rawText);
    const sentence =
      sentences[(docCursor + safety) % Math.max(1, sentences.length)] ||
      `${doc.title} is an essential core competency for healthcare practice.`;
    docCursor++;

    const term = pickKeyTerm(sentence, [...doc.keyConcepts, ...allConceptPool]);
    if (!term) continue;

    const blanked = sentence.replace(new RegExp(`\\b${term}\\b`, 'i'), '________');
    if (blanked === sentence) continue;

    const prompt = `[${doc.title}] Which term accurately completes the following clinical statement: "${blanked}"`;
    const norm = prompt.trim().toLowerCase();
    if (seenPrompts.has(norm)) continue;
    seenPrompts.add(norm);

    const distractors = buildMcqDistractors(term, allConceptPool, doc.title);
    const options = deterministicShuffle([term, ...distractors], safety);

    objectiveDrafts.push({
      sectionType: 'OBJECTIVE',
      questionType: 'MCQ',
      difficulty: 'MEDIUM',
      topicTitle: doc.title,
      topicQuestionId: null,
      text: prompt,
      options,
      correctAnswer: term,
      expectedAnswer: term,
      requiredConcepts: [term],
      rubric: [],
      explanation: `PDF Reference (${doc.title}, pp. ${doc.pageStart}–${doc.pageEnd}): ${sentence}`,
      marks: objectiveMarks,
    });
  }

  // 4. Deterministically synthesize Written / Essay questions from PDF text & learning objectives
  for (let i = 0; i < writtenCount; i++) {
    const doc = rawMaterialDocs[i % rawMaterialDocs.length];
    const sentences = extractCleanSentences(doc.rawText);
    const keyConcepts = doc.keyConcepts.slice(0, 4);
    const focusConcepts = keyConcepts.length > 0 ? keyConcepts.join(', ') : doc.title;
    const objective =
      doc.learningObjectives[i % Math.max(1, doc.learningObjectives.length)] ||
      `Explain the principles and clinical application of ${doc.title}.`;

    const modelSummary = sentences.slice(0, 3).join(' ') || doc.summary;
    const essayPrompt =
      i % 2 === 0
        ? `Essay (${doc.title}): Discuss the core principles, clinical responsibilities, and standard protocols covered in "${doc.title}" (pp. ${doc.pageStart}–${doc.pageEnd}). In your response, address ${focusConcepts} and explain how they apply to safe patient care.`
        : `Written Case Analysis (${doc.title}): ${objective} Provide a structured written response referencing key concepts (${focusConcepts}) and practical steps a healthcare assistant or nurse must follow.`;

    const generatedRubric = await generateRubricOnce({
      promptText: essayPrompt,
      questionType: 'ESSAY',
      maxMarks: writtenMarks,
      correctAnswer: modelSummary,
      courseContext: `${course.code} - ${course.title}: ${doc.title}`,
    });

    const rubric = [
      {
        criterion: 'Core Knowledge & Clinical Accuracy',
        maxMarks: Math.round(writtenMarks * 0.4),
        description: `Accurately defines and explains ${focusConcepts} based on ${doc.title}.`,
      },
      {
        criterion: 'Practical Application & Patient Safety',
        maxMarks: Math.round(writtenMarks * 0.4),
        description: 'Demonstrates safe, step-by-step clinical or caregiving application.',
      },
      {
        criterion: 'Structure, Terminology & Clarity',
        maxMarks: writtenMarks - Math.round(writtenMarks * 0.4) * 2,
        description: 'Uses appropriate healthcare terminology and clear logical structure.',
      },
    ];

    writtenDrafts.push({
      sectionType: 'WRITTEN',
      questionType: 'ESSAY',
      difficulty: 'DIFFICULT',
      topicTitle: doc.title,
      topicQuestionId: null,
      text: essayPrompt,
      options: [],
      correctAnswer: modelSummary,
      expectedAnswer: modelSummary,
      requiredConcepts: keyConcepts.length > 0 ? keyConcepts : generatedRubric.requiredConcepts,
      rubric,
      explanation: `Source PDF (${doc.title}, pp. ${doc.pageStart}–${doc.pageEnd}): ${modelSummary}`,
      marks: writtenMarks,
    });
  }

  const totalObjectiveMarks = objectiveDrafts.reduce((sum, q) => sum + q.marks, 0);
  const totalWrittenMarks = writtenDrafts.reduce((sum, q) => sum + q.marks, 0);
  const totalMarks = totalObjectiveMarks + totalWrittenMarks;

  const examType = input.examType || 'END_OF_SEMESTER';
  const defaultTitle =
    input.title ||
    `${course.code}: ${
      examType === 'FINAL' ? 'Final Comprehensive Examination' : 'End-of-Semester Examination'
    }`;

  // 5. Persist Examination, Sections (OBJECTIVE + WRITTEN), and Questions
  const createdExam = await prisma.$transaction(async (tx) => {
    let examRecord;
    if (input.examId) {
      // Clear previous sections/questions if regenerating onto an existing exam
      await tx.question.deleteMany({ where: { examId: input.examId } });
      await tx.examinationSection.deleteMany({ where: { examId: input.examId } });
      examRecord = await tx.examination.update({
        where: { id: input.examId },
        data: {
          title: defaultTitle,
          examType,
          studyTrack: input.studyTrack ?? undefined,
          totalMarks,
          durationMinutes: Number(input.durationMinutes) || 90,
          passMark: Number(input.passMark) || 50,
        },
      });
    } else {
      examRecord = await tx.examination.create({
        data: {
          courseId: course.id,
          title: defaultTitle,
          examType,
          studyTrack: input.studyTrack ?? null,
          instructions:
            input.instructions ||
            `Answer ALL questions in Section A (Objective / Multiple Choice) and ALL questions in Section B (Written / Essay). Total Marks: ${totalMarks}.`,
          venue: input.venue || 'CBT Lab & Online Examination Portal',
          durationMinutes: Number(input.durationMinutes) || 90,
          totalMarks,
          passMark: Number(input.passMark) || 50,
          scheduledDate: input.scheduledDate || new Date().toISOString().slice(0, 10),
          scheduledTime: input.scheduledTime || '09:00 AM',
          mode: 'ONLINE',
          status: input.status || 'ACTIVE',
          isLocked: input.isLocked !== undefined ? Boolean(input.isLocked) : false,
          isPublished: input.isPublished !== false,
          allowReview: true,
          showExplanations: true,
        },
      });
    }

    const sectionA = await tx.examinationSection.create({
      data: {
        examId: examRecord.id,
        title: 'Section A: Objective (Multiple Choice)',
        sectionType: 'OBJECTIVE',
        instructions: `Select the single best answer for each objective question. (${objectiveDrafts.length} questions, ${totalObjectiveMarks} marks)`,
        orderIndex: 1,
        marksAllocated: totalObjectiveMarks,
        questionCount: objectiveDrafts.length,
        selectionRule: 'FIXED',
      },
    });

    const sectionB = await tx.examinationSection.create({
      data: {
        examId: examRecord.id,
        title: 'Section B: Written / Essay',
        sectionType: 'WRITTEN',
        instructions: `Write clear, structured clinical responses grounded in your module materials. (${writtenDrafts.length} questions, ${totalWrittenMarks} marks)`,
        orderIndex: 2,
        marksAllocated: totalWrittenMarks,
        questionCount: writtenDrafts.length,
        selectionRule: 'FIXED',
      },
    });

    let orderIdx = 1;
    const questionRows = [
      ...objectiveDrafts.map((q) => ({
        examId: examRecord.id,
        sectionId: sectionA.id,
        topicQuestionId: q.topicQuestionId || null,
        orderIndex: orderIdx++,
        questionType: q.questionType,
        difficulty: q.difficulty,
        topicTitle: q.topicTitle,
        text: q.text,
        optionsJson: JSON.stringify(q.options),
        correctAnswer: q.correctAnswer,
        expectedAnswer: q.expectedAnswer,
        requiredConceptsJson: JSON.stringify(q.requiredConcepts),
        explanation: q.explanation,
        marks: q.marks,
      })),
      ...writtenDrafts.map((q) => ({
        examId: examRecord.id,
        sectionId: sectionB.id,
        topicQuestionId: null,
        orderIndex: orderIdx++,
        questionType: q.questionType,
        difficulty: q.difficulty,
        topicTitle: q.topicTitle,
        text: q.text,
        optionsJson: JSON.stringify([]),
        correctAnswer: q.correctAnswer,
        expectedAnswer: q.expectedAnswer,
        requiredConceptsJson: JSON.stringify(q.requiredConcepts),
        rubricJson: JSON.stringify(q.rubric),
        explanation: q.explanation,
        marks: q.marks,
      })),
    ];

    if (questionRows.length > 0) {
      await tx.question.createMany({ data: questionRows });
    }

    return tx.examination.findUnique({
      where: { id: examRecord.id },
      include: {
        course: { select: { id: true, code: true, title: true } },
        sections: { orderBy: { orderIndex: 'asc' } },
        _count: { select: { questions: true } },
      },
    });
  }, { timeout: 30000 });

  return {
    exam: createdExam,
    summary: {
      objectiveCount: objectiveDrafts.length,
      objectiveMarks: totalObjectiveMarks,
      writtenCount: writtenDrafts.length,
      writtenMarks: totalWrittenMarks,
      totalMarks,
      sourceTopicsUsed: rawMaterialDocs.map((d) => d.title),
    },
  };
}
