import { prisma } from '@/lib/prisma';
import type { StructuredTopicContent } from './pdf-processor';
import { callOpenAICompatibleJson, resolveActiveAIProvider, type ResolvedProvider } from './ai-provider';

export type QuestionType =
  | 'MCQ'
  | 'TRUE_FALSE'
  | 'SHORT_ANSWER'
  | 'FILL_BLANK'
  | 'MATCHING'
  | 'SCENARIO';

export type QuestionDifficulty = 'EASY' | 'MEDIUM' | 'DIFFICULT';

export interface GenerateQuestionsConfig {
  topicId: string;
  count: number;
  questionTypes: QuestionType[];
  difficulty: QuestionDifficulty;
  includeExplanations: boolean;
  includePageReferences: boolean;
  useAi?: boolean;
  providerOverride?: ResolvedProvider | null;
}

interface GeneratedQuestionDraft {
  questionType: QuestionType;
  difficulty: QuestionDifficulty;
  questionText: string;
  optionsJson: string | null;
  correctAnswer: string;
  markingGuide: string | null;
  explanation: string | null;
  marks: number;
  pageRef: string | null;
}

function extractSentences(text: string): string[] {
  return text
    .replace(/\n+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 28 && s.length <= 260);
}

function pickKeyTerm(sentence: string, fallbackTerms: string[]): string | null {
  for (const term of fallbackTerms) {
    if (term.length >= 4 && sentence.toLowerCase().includes(term.toLowerCase())) {
      return term;
    }
  }
  const words: string[] = sentence.match(/\b[A-Za-z]{5,18}\b/g) || [];
  const stopWords = new Set([
    'these', 'those', 'which', 'where', 'there', 'their', 'about', 'after',
    'before', 'should', 'would', 'could', 'other', 'every', 'first', 'while',
    'during', 'between', 'through', 'because', 'within', 'without', 'under',
  ]);
  const candidate = words.find((w) => !stopWords.has(w.toLowerCase()));
  return candidate || null;
}

function buildDistractors(correctTerm: string, pool: string[], topicTitle: string): string[] {
  const distractors: string[] = [];
  const lowerCorrect = correctTerm.toLowerCase();

  for (const item of pool) {
    if (item.toLowerCase() !== lowerCorrect && !distractors.includes(item)) {
      distractors.push(item);
    }
    if (distractors.length === 3) break;
  }

  const genericFallbacks = [
    `Unrelated ${topicTitle} Protocol`,
    'Non-Standard Administrative Measure',
    'Delayed Observation Procedure',
    'Secondary Elective Intervention',
  ];

  for (const fb of genericFallbacks) {
    if (distractors.length >= 3) break;
    if (fb.toLowerCase() !== lowerCorrect && !distractors.includes(fb)) {
      distractors.push(fb);
    }
  }

  return distractors.slice(0, 3);
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function negateSentenceForFalse(sentence: string): string | null {
  if (/\bis\b/i.test(sentence)) return sentence.replace(/\bis\b/i, 'is never');
  if (/\bare\b/i.test(sentence)) return sentence.replace(/\bare\b/i, 'are never');
  if (/\bmust\b/i.test(sentence)) return sentence.replace(/\bmust\b/i, 'must not');
  if (/\bshould\b/i.test(sentence)) return sentence.replace(/\bshould\b/i, 'should not');
  if (/\brequires\b/i.test(sentence)) return sentence.replace(/\brequires\b/i, 'does not require');
  return null;
}

export async function generateQuestionsForTopic(config: GenerateQuestionsConfig): Promise<{
  createdCount: number;
  skippedDuplicates: number;
  questions: Array<{ id: string; questionType: string; questionText: string; status: string }>;
  usage: { inputTokens: number; outputTokens: number; totalTokens: number };
}> {
  const topic = await prisma.extractedTopic.findUnique({
    where: { id: config.topicId },
    include: { subtopics: true },
  });

  if (!topic) {
    throw new Error('Extracted topic not found.');
  }

  const structured: StructuredTopicContent | null = topic.contentJson
    ? JSON.parse(topic.contentJson)
    : null;

  const sourceText = [
    topic.rawText || '',
    structured?.mainExplanation || '',
    structured?.introduction || '',
    structured?.summary || '',
  ]
    .filter(Boolean)
    .join('\n');

  const sentences = extractSentences(sourceText);
  const keyConcepts = structured?.keyConcepts || [];
  const definitions = structured?.definitions || [];
  const pageRef = config.includePageReferences
    ? `pp. ${topic.pageStart}${topic.pageEnd > topic.pageStart ? `–${topic.pageEnd}` : ''}`
    : null;

  const existingQuestions = await prisma.topicQuestion.findMany({
    where: { topicId: topic.id },
    select: { questionText: true },
  });
  const seenTexts = new Set(existingQuestions.map((q) => q.questionText.trim().toLowerCase()));

  const drafts: GeneratedQuestionDraft[] = [];
  const types = config.questionTypes.length > 0 ? config.questionTypes : (['MCQ', 'TRUE_FALSE', 'SHORT_ANSWER'] as QuestionType[]);
  const targetCount = Math.max(1, Math.min(30, config.count));

  let cursor = 0;
  let safetyLoop = 0;

  while (drafts.length < targetCount && safetyLoop < targetCount * 6) {
    safetyLoop++;
    const qType = types[cursor % types.length];
    const sentence = sentences[cursor % Math.max(1, sentences.length)] || `${topic.title} is an essential component of this nursing module.`;
    cursor++;

    let draft: GeneratedQuestionDraft | null = null;
    const defaultMarks =
      config.difficulty === 'DIFFICULT' ? 4 : config.difficulty === 'MEDIUM' ? 2 : 1;

    if (qType === 'MCQ') {
      const term = pickKeyTerm(sentence, keyConcepts);
      if (term) {
        const blanked = sentence.replace(new RegExp(`\\b${term}\\b`, 'i'), '________');
        const distractors = buildDistractors(term, keyConcepts, topic.title);
        const options = shuffle([term, ...distractors]);
        draft = {
          questionType: 'MCQ',
          difficulty: config.difficulty,
          questionText: `In the context of "${topic.title}", which term accurately completes this statement: "${blanked}"`,
          optionsJson: JSON.stringify(options),
          correctAnswer: term,
          markingGuide: null,
          explanation: config.includeExplanations
            ? `According to the source material (${pageRef || 'course PDF'}): ${sentence}`
            : null,
          marks: defaultMarks,
          pageRef,
        };
      }
    } else if (qType === 'TRUE_FALSE') {
      const makeFalse = cursor % 2 === 0;
      const negated = makeFalse ? negateSentenceForFalse(sentence) : null;
      const statement = negated || sentence;
      const answer = negated ? 'False' : 'True';
      draft = {
        questionType: 'TRUE_FALSE',
        difficulty: config.difficulty,
        questionText: `True or False (${topic.title}): ${statement}`,
        optionsJson: JSON.stringify(['True', 'False']),
        correctAnswer: answer,
        markingGuide: null,
        explanation: config.includeExplanations
          ? `The source material (${pageRef || 'course PDF'}) states: "${sentence}"`
          : null,
        marks: 1,
        pageRef,
      };
    } else if (qType === 'FILL_BLANK') {
      const term = pickKeyTerm(sentence, keyConcepts);
      if (term) {
        const blanked = sentence.replace(new RegExp(`\\b${term}\\b`, 'i'), '________');
        draft = {
          questionType: 'FILL_BLANK',
          difficulty: config.difficulty,
          questionText: `Fill in the blank (${topic.title}): ${blanked}`,
          optionsJson: null,
          correctAnswer: term,
          markingGuide: `Accept exact term "${term}" or close clinical equivalent from ${topic.title}.`,
          explanation: config.includeExplanations
            ? `Complete statement from ${pageRef || 'source PDF'}: "${sentence}"`
            : null,
          marks: defaultMarks,
          pageRef,
        };
      }
    } else if (qType === 'SHORT_ANSWER') {
      const focusConcept = keyConcepts[cursor % Math.max(1, keyConcepts.length)] || topic.title;
      draft = {
        questionType: 'SHORT_ANSWER',
        difficulty: config.difficulty,
        questionText: `Based on "${topic.title}", explain the clinical significance and key principles of ${focusConcept}.`,
        optionsJson: null,
        correctAnswer: sentence,
        markingGuide: `Award full marks (${defaultMarks + 2}) if the student accurately explains ${focusConcept} using terminology from ${pageRef || 'the topic PDF'}: "${sentence.slice(0, 140)}..."`,
        explanation: config.includeExplanations
          ? `Model reference (${pageRef || 'course PDF'}): ${sentence}`
          : null,
        marks: defaultMarks + 2,
        pageRef,
      };
    } else if (qType === 'MATCHING') {
      const pairs = definitions.slice(0, 4).map((d) => ({
        left: d.term,
        right: d.definition.replace(new RegExp(`^${d.term}\\s+`, 'i'), '').slice(0, 110),
      }));
      if (pairs.length < 3 && keyConcepts.length >= 3) {
        for (let i = 0; i < 3; i++) {
          const concept = keyConcepts[i];
          const matchedSentence = sentences.find((s) => s.includes(concept)) || sentences[i] || topic.description || topic.title;
          pairs.push({
            left: concept,
            right: matchedSentence.slice(0, 110),
          });
        }
      }
      if (pairs.length >= 2) {
        draft = {
          questionType: 'MATCHING',
          difficulty: config.difficulty,
          questionText: `Match each key concept from "${topic.title}" with its accurate description from the source material.`,
          optionsJson: JSON.stringify(pairs),
          correctAnswer: JSON.stringify(pairs),
          markingGuide: '1 mark per accurately matched pair.',
          explanation: config.includeExplanations
            ? `All pairs are derived directly from ${topic.title} (${pageRef || 'course PDF'}).`
            : null,
          marks: pairs.length,
          pageRef,
        };
      }
    } else if (qType === 'SCENARIO') {
      const term = pickKeyTerm(sentence, keyConcepts) || topic.title;
      const distractors = buildDistractors(term, keyConcepts, topic.title);
      const options = shuffle([
        `Apply ${term} in accordance with ${topic.title} protocol`,
        ...distractors.map((d) => `Prioritize ${d} without assessing ${term}`),
      ]);
      draft = {
        questionType: 'SCENARIO',
        difficulty: config.difficulty,
        questionText: `Clinical Scenario (${topic.title}): During a supervised ward rotation at WellLife Medical Center, a nurse encounters a case involving ${topic.title}. Based on the principle that "${sentence}", what is the most appropriate evidence-based action?`,
        optionsJson: JSON.stringify(options),
        correctAnswer: options.find((o) => o.includes(term)) || options[0],
        markingGuide: null,
        explanation: config.includeExplanations
          ? `Grounded in ${topic.title} (${pageRef || 'course PDF'}): ${sentence}`
          : null,
        marks: defaultMarks + 1,
        pageRef,
      };
    }

    if (draft) {
      const norm = draft.questionText.trim().toLowerCase();
      if (!seenTexts.has(norm)) {
        seenTexts.add(norm);
        drafts.push(draft);
      }
    }
  }

  const created = await prisma.$transaction(
    drafts.map((d) =>
      prisma.topicQuestion.create({
        data: {
          topicId: topic.id,
          courseId: topic.courseId,
          questionType: d.questionType,
          difficulty: d.difficulty,
          questionText: d.questionText,
          optionsJson: d.optionsJson,
          correctAnswer: d.correctAnswer,
          markingGuide: d.markingGuide,
          explanation: d.explanation,
          marks: d.marks,
          pageRef: d.pageRef,
          status: 'DRAFT', // Never auto-published
          isAiGenerated: true,
        },
        select: {
          id: true,
          questionType: true,
          questionText: true,
          status: true,
        },
      })
    )
  );

  return {
    createdCount: created.length,
    skippedDuplicates: Math.max(0, targetCount - created.length),
    questions: created,
    usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
  };
}

export async function generateQuestionsWithAiIfConfigured(
  config: GenerateQuestionsConfig
): Promise<{
  createdCount: number;
  skippedDuplicates: number;
  questions: Array<{ id: string; questionType: string; questionText: string; status: string }>;
  usage: { inputTokens: number; outputTokens: number; totalTokens: number };
  aiError?: string;
}> {
  const provider = config.providerOverride ?? (await resolveActiveAIProvider());
  if (!provider || config.useAi === false) {
    return generateQuestionsForTopic(config);
  }

  const topic = await prisma.extractedTopic.findUnique({
    where: { id: config.topicId },
    include: { questions: { select: { questionText: true } } },
  });
  if (!topic) throw new Error('Extracted topic not found.');

  const sourceExcerpt = (topic.rawText || topic.summary || topic.title).slice(0, 6000);
  const pageRef = config.includePageReferences ? `pp. ${topic.pageStart}-${topic.pageEnd}` : null;
  const typesList = config.questionTypes.join(', ');

  const aiRes = await callOpenAICompatibleJson<{
    questions: Array<{
      questionType: QuestionType;
      difficulty?: QuestionDifficulty;
      questionText: string;
      options?: string[] | Array<{ left: string; right: string }>;
      correctAnswer: string;
      markingGuide?: string;
      explanation?: string;
      marks?: number;
    }>;
  }>(
    'You are a nursing & clinical education assessment author. Generate grounded, unambiguous questions strictly from the provided source text. Never invent clinical facts or medical advice.',
    `Generate ${config.count} ${config.difficulty} questions for topic "${topic.title}" (${pageRef || 'PDF'}).\nAllowed types: ${typesList}.\nReturn JSON: {"questions":[{"questionType":"MCQ|TRUE_FALSE|SHORT_ANSWER|FILL_BLANK|MATCHING|SCENARIO","questionText":"...","options":["..."],"correctAnswer":"...","markingGuide":"...","explanation":"...","marks":2}]}.\n\nSource text:\n${sourceExcerpt}`,
    provider,
    1
  );

  if (!aiRes.ok || !Array.isArray(aiRes.data?.questions) || aiRes.data.questions.length === 0) {
    // Fallback to deterministic generator, surfacing aiError so job can log it if needed
    const fallback = await generateQuestionsForTopic(config);
    return { ...fallback, aiError: aiRes.error, usage: aiRes.usage };
  }

  const seenTexts = new Set(topic.questions.map((q) => q.questionText.trim().toLowerCase()));
  const validDrafts = [];
  for (const q of aiRes.data.questions) {
    if (!q.questionText || !q.correctAnswer) continue;
    const norm = q.questionText.trim().toLowerCase();
    if (seenTexts.has(norm)) continue;
    seenTexts.add(norm);
    validDrafts.push({
      questionType: config.questionTypes.includes(q.questionType) ? q.questionType : config.questionTypes[0],
      difficulty: q.difficulty || config.difficulty,
      questionText: q.questionText.trim(),
      optionsJson: q.options ? JSON.stringify(q.options) : null,
      correctAnswer: typeof q.correctAnswer === 'string' ? q.correctAnswer : JSON.stringify(q.correctAnswer),
      markingGuide: q.markingGuide || null,
      explanation: config.includeExplanations ? q.explanation || null : null,
      marks: Number(q.marks || 2),
      pageRef,
    });
  }

  if (validDrafts.length === 0) {
    const fallback = await generateQuestionsForTopic(config);
    return { ...fallback, usage: aiRes.usage };
  }

  const created = await prisma.$transaction(
    validDrafts.map((d) =>
      prisma.topicQuestion.create({
        data: {
          topicId: topic.id,
          courseId: topic.courseId,
          questionType: d.questionType,
          difficulty: d.difficulty,
          questionText: d.questionText,
          optionsJson: d.optionsJson,
          correctAnswer: d.correctAnswer,
          markingGuide: d.markingGuide,
          explanation: d.explanation,
          marks: d.marks,
          pageRef: d.pageRef,
          status: 'DRAFT',
          isAiGenerated: true,
        },
        select: { id: true, questionType: true, questionText: true, status: true },
      })
    )
  );

  return {
    createdCount: created.length,
    skippedDuplicates: Math.max(0, config.count - created.length),
    questions: created,
    usage: aiRes.usage,
  };
}

