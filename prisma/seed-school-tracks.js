/* eslint-disable @typescript-eslint/no-require-imports */
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

function safeJson(raw, fallback) {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function extractCleanSentences(text) {
  return String(text || '')
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 35 && s.length <= 260 && !/^page\s+\d+/i.test(s));
}

function pickKeyTerm(sentence, keyConcepts) {
  for (const concept of keyConcepts || []) {
    if (concept.length >= 4 && sentence.toLowerCase().includes(concept.toLowerCase())) {
      return concept;
    }
  }
  const words = sentence.match(/\b[A-Za-z]{5,18}\b/g) || [];
  const stop = new Set([
    'these', 'those', 'which', 'where', 'there', 'their', 'about', 'after',
    'before', 'should', 'would', 'could', 'other', 'every', 'first', 'while',
    'during', 'between', 'through', 'because', 'within', 'without', 'under',
    'patient', 'patients', 'caregiver', 'caregivers', 'module', 'section',
  ]);
  return words.find((w) => !stop.has(w.toLowerCase())) || null;
}

function deterministicShuffle(items, seedOffset = 0) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = (i + seedOffset + 1) % (i + 1);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function buildMcqDistractors(correct, pool, topicTitle) {
  const distractors = [];
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

async function ensureExamWithSectionsFromTopics({
  course,
  title,
  examType,
  studyTrack,
  topics,
  objectiveCount = 10,
  writtenCount = 3,
  objectiveMarks = 2,
  writtenMarks = 10,
  durationMinutes = 90,
}) {
  const existing = await prisma.examination.findFirst({
    where: { courseId: course.id, title },
    include: {
      sections: true,
      questions: true,
    },
  });

  if (existing && existing.sections.length >= 2 && existing.questions.length >= objectiveCount + writtenCount) {
    if (!existing.unlockedAt && !existing.isLocked) {
      await prisma.examination.update({
        where: { id: existing.id },
        data: { isLocked: true },
      });
    }
    console.log(`  [skip] Exam already seeded with sections: ${title}`);
    return existing;
  }

  const docs = topics.map((t) => {
    const structured = safeJson(t.contentJson, null);
    const rawText = [
      t.rawText || '',
      structured?.mainExplanation || '',
      structured?.introduction || '',
      structured?.summary || '',
    ]
      .filter(Boolean)
      .join('\n');
    return {
      id: t.id,
      title: t.title,
      rawText: rawText || t.summary || t.title,
      pageStart: t.pageStart || 1,
      pageEnd: t.pageEnd || 1,
      keyConcepts: structured?.keyConcepts || [],
      learningObjectives: structured?.learningObjectives || [],
      summary: t.summary || structured?.summary || t.title,
      questions: t.questions || [],
    };
  });

  if (docs.length === 0) {
    docs.push({
      id: null,
      title: course.title,
      rawText: course.description || course.title,
      pageStart: 1,
      pageEnd: 5,
      keyConcepts: ['Patient Safety', 'Clinical Documentation', 'Vital Signs', 'Infection Control'],
      learningObjectives: [`Demonstrate core competency in ${course.title}.`],
      summary: course.description || course.title,
      questions: [],
    });
  }

  const objectiveDrafts = [];
  const writtenDrafts = [];
  const seen = new Set();

  // Pull existing MCQ/TRUE_FALSE TopicQuestions first
  for (const doc of docs) {
    for (const q of doc.questions) {
      if (objectiveDrafts.length >= objectiveCount) break;
      if (!['MCQ', 'TRUE_FALSE'].includes(String(q.questionType).toUpperCase())) continue;
      const norm = q.questionText.trim().toLowerCase();
      if (seen.has(norm)) continue;
      seen.add(norm);
      const options = safeJson(q.optionsJson, []);
      objectiveDrafts.push({
        questionType: q.questionType.toUpperCase() === 'TRUE_FALSE' ? 'TRUE_FALSE' : 'MCQ',
        difficulty: q.difficulty || 'MEDIUM',
        topicTitle: doc.title,
        topicQuestionId: q.id,
        text: q.questionText,
        options: options.length >= 2 ? options : ['True', 'False'],
        correctAnswer: q.correctAnswer,
        expectedAnswer: q.expectedAnswer || q.correctAnswer,
        requiredConcepts: safeJson(q.requiredConceptsJson, []),
        explanation: q.explanation || `From ${doc.title} (${q.pageRef || 'course PDF'}).`,
        marks: objectiveMarks,
      });
    }
  }

  const allConcepts = Array.from(
    new Set(docs.flatMap((d) => d.keyConcepts).filter((c) => c && c.length >= 4))
  );

  let cursor = 0;
  let safety = 0;
  while (objectiveDrafts.length < objectiveCount && safety < objectiveCount * 10) {
    safety++;
    const doc = docs[cursor % docs.length];
    const sentences = extractCleanSentences(doc.rawText);
    const sentence =
      sentences[(cursor + safety) % Math.max(1, sentences.length)] ||
      `${doc.title} requires strict adherence to clinical safety and documentation standards.`;
    cursor++;

    const term = pickKeyTerm(sentence, [...doc.keyConcepts, ...allConcepts]);
    if (!term) continue;

    const blanked = sentence.replace(new RegExp(`\\b${term}\\b`, 'i'), '________');
    if (blanked === sentence) continue;

    const text = `[${doc.title}] Which term accurately completes this statement: "${blanked}"`;
    const norm = text.trim().toLowerCase();
    if (seen.has(norm)) continue;
    seen.add(norm);

    const distractors = buildMcqDistractors(term, allConcepts, doc.title);
    const options = deterministicShuffle([term, ...distractors], safety);

    objectiveDrafts.push({
      questionType: 'MCQ',
      difficulty: 'MEDIUM',
      topicTitle: doc.title,
      topicQuestionId: null,
      text,
      options,
      correctAnswer: term,
      expectedAnswer: term,
      requiredConcepts: [term],
      explanation: `PDF Reference (${doc.title}, pp. ${doc.pageStart}–${doc.pageEnd}): ${sentence}`,
      marks: objectiveMarks,
    });
  }

  for (let i = 0; i < writtenCount; i++) {
    const doc = docs[i % docs.length];
    const sentences = extractCleanSentences(doc.rawText);
    const keyConcepts = doc.keyConcepts.slice(0, 4);
    const focusConcepts = keyConcepts.length > 0 ? keyConcepts.join(', ') : doc.title;
    const modelSummary = sentences.slice(0, 3).join(' ') || doc.summary;
    const essayPrompt =
      i % 2 === 0
        ? `Essay (${doc.title}): Discuss the core principles, clinical responsibilities, and standard protocols covered in "${doc.title}" (pp. ${doc.pageStart}–${doc.pageEnd}). Address ${focusConcepts} and explain how they support safe patient care.`
        : `Written Case Response (${doc.title}): Describe the step-by-step clinical procedure and patient safety considerations for ${focusConcepts} as taught in "${doc.title}".`;

    const rubric = [
      {
        criterion: 'Core Knowledge & Clinical Accuracy',
        maxMarks: Math.round(writtenMarks * 0.4),
        description: `Accurately explains ${focusConcepts} based on ${doc.title}.`,
      },
      {
        criterion: 'Practical Application & Patient Safety',
        maxMarks: Math.round(writtenMarks * 0.4),
        description: 'Demonstrates safe, step-by-step clinical or caregiving practice.',
      },
      {
        criterion: 'Structure & Clinical Terminology',
        maxMarks: writtenMarks - Math.round(writtenMarks * 0.4) * 2,
        description: 'Clear logical presentation using standard healthcare terminology.',
      },
    ];

    writtenDrafts.push({
      questionType: 'ESSAY',
      difficulty: 'DIFFICULT',
      topicTitle: doc.title,
      text: essayPrompt,
      correctAnswer: modelSummary,
      expectedAnswer: modelSummary,
      requiredConcepts: keyConcepts.length > 0 ? keyConcepts : [doc.title],
      rubric,
      explanation: `Source PDF (${doc.title}, pp. ${doc.pageStart}–${doc.pageEnd}): ${modelSummary}`,
      marks: writtenMarks,
    });
  }

  const totalObjMarks = objectiveDrafts.reduce((s, q) => s + q.marks, 0);
  const totalWriMarks = writtenDrafts.reduce((s, q) => s + q.marks, 0);
  const totalMarks = totalObjMarks + totalWriMarks;

  return prisma.$transaction(async (tx) => {
    let examRecord;
    if (existing) {
      await tx.question.deleteMany({ where: { examId: existing.id } });
      await tx.examinationSection.deleteMany({ where: { examId: existing.id } });
      examRecord = await tx.examination.update({
        where: { id: existing.id },
        data: {
          examType,
          studyTrack,
          totalMarks,
          durationMinutes,
          status: 'ACTIVE',
          isLocked: existing.unlockedAt ? existing.isLocked : true,
          isPublished: true,
        },
      });
    } else {
      examRecord = await tx.examination.create({
        data: {
          courseId: course.id,
          title,
          examType,
          studyTrack,
          instructions: `Answer ALL questions in Section A (Objective) and ALL questions in Section B (Written / Essay). Total Marks: ${totalMarks}.`,
          venue: 'CBT Lab & Online Examination Portal',
          durationMinutes,
          totalMarks,
          passMark: 50,
          scheduledDate: new Date().toISOString().slice(0, 10),
          scheduledTime: '09:00 AM',
          mode: 'ONLINE',
          status: 'ACTIVE',
          isLocked: true,
          isPublished: true,
          allowReview: true,
          showExplanations: true,
        },
      });
    }

    const secA = await tx.examinationSection.create({
      data: {
        examId: examRecord.id,
        title: 'Section A: Objective (Multiple Choice)',
        sectionType: 'OBJECTIVE',
        instructions: `Select the single best answer for each question. (${objectiveDrafts.length} questions, ${totalObjMarks} marks)`,
        orderIndex: 1,
        marksAllocated: totalObjMarks,
        questionCount: objectiveDrafts.length,
        selectionRule: 'FIXED',
      },
    });

    const secB = await tx.examinationSection.create({
      data: {
        examId: examRecord.id,
        title: 'Section B: Written / Essay',
        sectionType: 'WRITTEN',
        instructions: `Write structured clinical responses grounded in your PDF module materials. (${writtenDrafts.length} questions, ${totalWriMarks} marks)`,
        orderIndex: 2,
        marksAllocated: totalWriMarks,
        questionCount: writtenDrafts.length,
        selectionRule: 'FIXED',
      },
    });

    let orderIndex = 1;
    const questionRows = [
      ...objectiveDrafts.map((q) => ({
        examId: examRecord.id,
        sectionId: secA.id,
        topicQuestionId: q.topicQuestionId,
        orderIndex: orderIndex++,
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
        sectionId: secB.id,
        orderIndex: orderIndex++,
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

    console.log(
      `  [seeded] ${title} (${studyTrack || 'ALL'} | ${examType}): ${objectiveDrafts.length} Objective (${totalObjMarks}m) + ${writtenDrafts.length} Written/Essay (${totalWriMarks}m)`
    );
    return examRecord;
  }, { timeout: 30000 });
}

async function main() {
  console.log('--- Seeding 6-Month & 12-Month Study Tracks + PDF-Based Examinations ---');

  // 1. Update Second Semester courses for 12-Month Track clarity
  const secondSemCodes = ['CGV 103', 'NAS 103', 'NAS 104', 'PHE 103'];
  await prisma.course.updateMany({
    where: { code: { in: secondSemCodes } },
    data: { semester: 'Second Semester' },
  });

  // 2. Ensure students have studyTrack set & are registered for their programme courses
  const students = await prisma.student.findMany({
    include: {
      user: { select: { email: true, name: true } },
    },
  });

  for (let i = 0; i < students.length; i++) {
    const st = students[i];
    // Assign one test student to 6_MONTH and others to 12_MONTH if not already set
    const desiredTrack =
      st.studentId.includes('TEST') || i % 2 === 1 ? '6_MONTH' : '12_MONTH';
    if (!st.studyTrack) {
      await prisma.student.update({
        where: { id: st.id },
        data: { studyTrack: desiredTrack },
      });
    }

    const progCourses = await prisma.course.findMany({
      where: { programmeId: st.programmeId, status: 'ACTIVE' },
      select: { id: true },
    });

    for (const c of progCourses) {
      await prisma.courseRegistration.upsert({
        where: {
          studentId_courseId: { studentId: st.id, courseId: c.id },
        },
        update: {},
        create: {
          studentId: st.id,
          courseId: c.id,
          status: 'APPROVED',
          approvalStatus: 'APPROVED',
        },
      });
    }
  }

  // 3. Load ExtractedTopics grouped by courseId
  const allExtractedTopics = await prisma.extractedTopic.findMany({
    include: {
      questions: true,
    },
    orderBy: [{ orderIndex: 'asc' }, { createdAt: 'asc' }],
  });

  const topicsByCourse = new Map();
  for (const t of allExtractedTopics) {
    if (!topicsByCourse.has(t.courseId)) topicsByCourse.set(t.courseId, []);
    topicsByCourse.get(t.courseId).push(t);
  }

  // 4. Seed End-of-Semester (12-Month) and Final (6-Month & 12-Month) Exams from PDFs
  const cgv101 = await prisma.course.findUnique({ where: { code: 'CGV 101' } });
  const cgv102 = await prisma.course.findUnique({ where: { code: 'CGV 102' } });
  const cgv103 = await prisma.course.findUnique({ where: { code: 'CGV 103' } });

  if (cgv101) {
    await ensureExamWithSectionsFromTopics({
      course: cgv101,
      title: 'CGV 101: End-of-Semester Examination (12-Month Track — Sem 1)',
      examType: 'END_OF_SEMESTER',
      studyTrack: '12_MONTH',
      topics: topicsByCourse.get(cgv101.id) || [],
      objectiveCount: 15,
      writtenCount: 3,
      objectiveMarks: 2,
      writtenMarks: 10,
      durationMinutes: 90,
    });
  }

  if (cgv102) {
    await ensureExamWithSectionsFromTopics({
      course: cgv102,
      title: 'CGV 102: End-of-Semester Examination (12-Month Track — Sem 1)',
      examType: 'END_OF_SEMESTER',
      studyTrack: '12_MONTH',
      topics: topicsByCourse.get(cgv102.id) || [],
      objectiveCount: 12,
      writtenCount: 3,
      objectiveMarks: 2,
      writtenMarks: 10,
      durationMinutes: 90,
    });
  }

  if (cgv103) {
    // 6-Month Track Final Comprehensive Examination (Modules 1-13)
    await ensureExamWithSectionsFromTopics({
      course: cgv103,
      title: 'Diploma in Care Giving — Final Comprehensive Examination (6-Month Track, Modules 1–13)',
      examType: 'FINAL',
      studyTrack: '6_MONTH',
      topics: allExtractedTopics, // All 13 modules
      objectiveCount: 20,
      writtenCount: 4,
      objectiveMarks: 2,
      writtenMarks: 15,
      durationMinutes: 120,
    });

    // 12-Month Track Final Comprehensive Examination (Semester 2, Modules 1-13)
    await ensureExamWithSectionsFromTopics({
      course: cgv103,
      title: 'Diploma in Care Giving — Final Examination (12-Month Track — Sem 2)',
      examType: 'FINAL',
      studyTrack: '12_MONTH',
      topics: allExtractedTopics,
      objectiveCount: 15,
      writtenCount: 3,
      objectiveMarks: 2,
      writtenMarks: 10,
      durationMinutes: 90,
    });
  }

  // Also ensure NAS and PHE have sample End-of-Semester and Final exams
  const nas101 = await prisma.course.findUnique({ where: { code: 'NAS 101' } });
  const nas104 = await prisma.course.findUnique({ where: { code: 'NAS 104' } });
  if (nas101) {
    await ensureExamWithSectionsFromTopics({
      course: nas101,
      title: 'NAS 101: End-of-Semester Examination (12-Month Track)',
      examType: 'END_OF_SEMESTER',
      studyTrack: '12_MONTH',
      topics: allExtractedTopics.slice(0, 6),
      objectiveCount: 10,
      writtenCount: 2,
      objectiveMarks: 2,
      writtenMarks: 10,
      durationMinutes: 75,
    });
  }
  if (nas104) {
    await ensureExamWithSectionsFromTopics({
      course: nas104,
      title: 'NAS 104: Final Clinical & Theory Examination (6-Month & 12-Month)',
      examType: 'FINAL',
      studyTrack: null,
      topics: allExtractedTopics.slice(6, 13),
      objectiveCount: 15,
      writtenCount: 3,
      objectiveMarks: 2,
      writtenMarks: 10,
      durationMinutes: 90,
    });
  }

  // 5. Seed TopicAssessments (Module Tests) for every ExtractedTopic (Modules 1-13)
  let moduleTestsSeeded = 0;
  for (const topic of allExtractedTopics) {
    const existingAssessment = await prisma.topicAssessment.findFirst({
      where: { topicId: topic.id, assessmentType: 'TOPIC_QUIZ' },
    });
    if (existingAssessment) continue;

    const topicQuestions = (topic.questions || []).slice(0, 10);
    if (topicQuestions.length === 0) continue;

    const totalMarks = topicQuestions.reduce((sum, q) => sum + (Number(q.marks) || 2), 0);
    const createdAssessment = await prisma.topicAssessment.create({
      data: {
        courseId: topic.courseId,
        topicId: topic.id,
        topicIdsJson: JSON.stringify([topic.id]),
        title: `Module Test: ${topic.title}`,
        assessmentType: 'TOPIC_QUIZ',
        instructions: `Complete this module assessment for "${topic.title}" to verify mastery before advancing.`,
        durationMinutes: 20,
        totalMarks,
        passMark: 50,
        maxAttempts: 3,
        randomizeQuestions: true,
        randomizeOptions: true,
        allowReview: true,
        showExplanations: true,
        status: 'PUBLISHED',
      },
    });

    await prisma.topicAssessmentQuestion.createMany({
      data: topicQuestions.map((q, idx) => ({
        assessmentId: createdAssessment.id,
        questionId: q.id,
        orderIndex: idx + 1,
      })),
    });
    moduleTestsSeeded++;
  }
  console.log(`  [module-tests] Seeded ${moduleTestsSeeded} new Module Tests across ${allExtractedTopics.length} topics.`);

  console.log('--- Done seeding school tracks & PDF examinations ---');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
