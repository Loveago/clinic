import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { prisma } from '@/lib/prisma';
import { callOpenAICompatibleJson, resolveActiveAIProvider } from '@/lib/ai-provider';
import { generateQuestionsWithAiIfConfigured, type QuestionType } from '@/lib/question-generator';

const execFileAsync = promisify(execFile);

export interface PageText {
  page: number;
  text: string;
}

export interface StructuredTopicContent {
  introduction: string;
  learningObjectives: string[];
  mainExplanation: string;
  keyConcepts: string[];
  definitions: Array<{ term: string; definition: string }>;
  keyPoints: string[];
  summary: string;
  revisionNotes: string;
}

export interface ExtractedTopicCandidate {
  title: string;
  description: string;
  summary: string;
  rawText: string;
  pageStart: number;
  pageEnd: number;
  orderIndex: number;
  confidence: number;
  needsReview: boolean;
  reviewNotes: string | null;
  isDuplicate: boolean;
  subtopics: Array<{ title: string; summary: string; pageStart: number; pageEnd: number }>;
  structuredContent: StructuredTopicContent;
}

/**
 * Validates a PDF buffer by checking magic bytes and size.
 */
export function validatePdfBuffer(buffer: Buffer, maxSizeBytes = 25 * 1024 * 1024): { valid: boolean; error?: string } {
  if (!buffer || buffer.length < 16) {
    return { valid: false, error: 'Uploaded file is empty or too small to be a valid PDF.' };
  }
  if (buffer.length > maxSizeBytes) {
    return { valid: false, error: `PDF exceeds maximum allowed size of ${Math.round(maxSizeBytes / (1024 * 1024))} MB.` };
  }
  const header = buffer.subarray(0, 5).toString('ascii');
  if (header !== '%PDF-') {
    return { valid: false, error: 'Invalid file format. The uploaded file does not have a valid PDF signature (%PDF-).' };
  }
  return { valid: true };
}

/**
 * Extracts text page-by-page using an isolated Node PDF worker process.
 */
export async function extractPagesFromPdf(pdfAbsPath: string): Promise<{
  pages: PageText[];
  totalPages: number;
  isScannedPdf: boolean;
}> {
  const workerPath = path.join(process.cwd(), 'scripts', 'extract-pdf-pages.cjs');
  const { stdout } = await execFileAsync(process.execPath, [workerPath, pdfAbsPath], {
    maxBuffer: 50 * 1024 * 1024,
  });
  return JSON.parse(stdout);
}

const HEADING_PATTERNS = [
  /^(?:chapter|unit|module|topic|section|lesson)\s+\d+[\s:.\-]+(.{3,100})$/i,
  /^(\d{1,2}(?:\.\d{1,2})?)\s+([A-Z][A-Za-z0-9\s,&\-:/()]{3,90})$/,
  /^([A-Z][A-Z0-9\s,&\-:/()]{4,80})$/,
];

function isLikelyHeading(line: string): string | null {
  const trimmed = line.trim();
  if (trimmed.length < 4 || trimmed.length > 100) return null;
  if (/[.!?;]$/.test(trimmed)) return null; // Sentences ending in punctuation are not headings
  if (/^\d+$/.test(trimmed)) return null; // Page number alone

  for (const regex of HEADING_PATTERNS) {
    const match = trimmed.match(regex);
    if (match) {
      // Avoid matching all-caps acronyms or short noise
      const candidate = match[2] ? `${match[1]} ${match[2]}` : trimmed;
      if (candidate.split(/\s+/).length >= 2 || candidate.length >= 8) {
        return candidate.replace(/\s+/g, ' ').trim();
      }
    }
  }
  return null;
}

function buildStructuredContent(title: string, rawText: string, pageStart: number, pageEnd: number): StructuredTopicContent {
  const cleanText = rawText.replace(/\n{3,}/g, '\n\n').trim();
  const sentences = cleanText
    .replace(/\n+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 20);

  const introduction =
    sentences.slice(0, 2).join(' ') ||
    `This section covers ${title} based on pages ${pageStart}–${pageEnd} of the uploaded course material.`;

  // Extract definitions grounded in source sentences
  const definitions: Array<{ term: string; definition: string }> = [];
  for (const s of sentences) {
    const defMatch = s.match(/^([A-Z][A-Za-z0-9\s\-]{2,45}?)\s+(?:is defined as|refers to|means|is the)\s+(.{15,220})/i);
    if (defMatch && definitions.length < 5) {
      definitions.push({
        term: defMatch[1].trim(),
        definition: s,
      });
    }
  }

  // Extract key concepts (capitalized multi-word phrases or frequent domain words)
  const conceptSet = new Set<string>();
  const words = cleanText.match(/\b[A-Z][a-z]{3,}(?:\s+[A-Z][a-z]{3,}){0,2}\b/g) || [];
  for (const w of words) {
    if (w.length > 4 && !['This', 'That', 'These', 'Those', 'When', 'Where', 'Which', 'After', 'Before'].includes(w)) {
      conceptSet.add(w);
    }
    if (conceptSet.size >= 8) break;
  }
  const keyConcepts = Array.from(conceptSet);

  const keyPoints = sentences
    .filter((s) => s.length >= 35 && s.length <= 220)
    .slice(0, 5);

  const learningObjectives = [
    `Explain the core principles of ${title} as presented in the source material (pp. ${pageStart}–${pageEnd}).`,
    ...(keyConcepts.slice(0, 2).map((c) => `Identify and apply key clinical/academic concepts related to ${c}.`)),
    `Demonstrate comprehension of ${title} through topic-specific assessment questions.`,
  ];

  const summary =
    sentences.slice(-2).join(' ') ||
    `Summary of ${title} (Source PDF pages ${pageStart}–${pageEnd}).`;

  const revisionNotes = `Source Reference: Pages ${pageStart}–${pageEnd}. Focus on ${
    keyConcepts.length > 0 ? keyConcepts.slice(0, 4).join(', ') : title
  }. Review definitions and key points carefully before attempting the topic quiz.`;

  return {
    introduction,
    learningObjectives,
    mainExplanation: cleanText.slice(0, 4000),
    keyConcepts,
    definitions,
    keyPoints: keyPoints.length > 0 ? keyPoints : [introduction],
    summary,
    revisionNotes,
  };
}

/**
 * Intelligently segments extracted PDF pages into structured topics with page ranges.
 */
export function extractTopicsFromPages(pages: PageText[]): ExtractedTopicCandidate[] {
  const segments: Array<{
    title: string;
    lines: string[];
    pageStart: number;
    pageEnd: number;
    confidence: number;
    needsReview: boolean;
    reviewNotes: string | null;
  }> = [];

  let currentSegment: {
    title: string;
    lines: string[];
    pageStart: number;
    pageEnd: number;
    confidence: number;
    needsReview: boolean;
    reviewNotes: string | null;
  } | null = null;

  for (const p of pages) {
    const lines = p.text.split('\n').map((l) => l.trim()).filter(Boolean);
    for (const line of lines) {
      const heading = isLikelyHeading(line);
      if (heading) {
        if (currentSegment && currentSegment.lines.join(' ').length > 80) {
          segments.push(currentSegment);
        } else if (currentSegment && currentSegment.lines.length > 0) {
          // Merge tiny orphan segment into next or keep lines
          currentSegment.title = heading;
          currentSegment.pageEnd = p.page;
          continue;
        }
        currentSegment = {
          title: heading,
          lines: [],
          pageStart: p.page,
          pageEnd: p.page,
          confidence: 0.92,
          needsReview: false,
          reviewNotes: null,
        };
      } else {
        if (!currentSegment) {
          currentSegment = {
            title: `Section ${segments.length + 1} (Page ${p.page})`,
            lines: [],
            pageStart: p.page,
            pageEnd: p.page,
            confidence: 0.72,
            needsReview: true,
            reviewNotes: 'No explicit heading detected at the start of this section; please verify topic title.',
          };
        }
        currentSegment.lines.push(line);
        currentSegment.pageEnd = p.page;
      }
    }
  }

  if (currentSegment && currentSegment.lines.length > 0) {
    segments.push(currentSegment);
  }

  // Fallback if document had no clear heading boundaries (e.g., long prose): group every 2-3 pages
  if (segments.length <= 1 && pages.length > 2) {
    const chunked: typeof segments = [];
    const chunkSize = Math.max(1, Math.ceil(pages.length / Math.min(6, pages.length)));
    for (let i = 0; i < pages.length; i += chunkSize) {
      const slice = pages.slice(i, i + chunkSize);
      const firstLine = slice[0].text.split('\n').find((l) => l.trim().length > 4)?.trim() || `Topic ${chunked.length + 1}`;
      chunked.push({
        title: firstLine.slice(0, 75),
        lines: slice.map((s) => s.text),
        pageStart: slice[0].page,
        pageEnd: slice[slice.length - 1].page,
        confidence: 0.78,
        needsReview: true,
        reviewNotes: 'Document lacked explicit numbered headings; auto-segmented by page sections for admin review.',
      });
    }
    segments.splice(0, segments.length, ...chunked);
  }

  const seenTitles = new Set<string>();
  return segments.map((seg, idx) => {
    const normalized = seg.title.toLowerCase().replace(/[^a-z0-9]/g, '');
    const isDuplicate = seenTitles.has(normalized);
    seenTitles.add(normalized);

    const rawText = seg.lines.join('\n').trim();
    const structuredContent = buildStructuredContent(seg.title, rawText, seg.pageStart, seg.pageEnd);

    // Detect subtopics from bullet or sub-numbered lines
    const subtopics: Array<{ title: string; summary: string; pageStart: number; pageEnd: number }> = [];
    for (const line of seg.lines) {
      const subMatch = line.match(/^(?:\d+\.\d+(?:\.\d+)?|[a-z]\)|•|-)\s+([A-Z][A-Za-z0-9\s,\-]{4,70})/);
      if (subMatch && subtopics.length < 5) {
        subtopics.push({
          title: subMatch[1].trim(),
          summary: line.slice(0, 180),
          pageStart: seg.pageStart,
          pageEnd: seg.pageEnd,
        });
      }
    }

    return {
      title: seg.title,
      description: structuredContent.introduction.slice(0, 240),
      summary: structuredContent.summary.slice(0, 320),
      rawText,
      pageStart: seg.pageStart,
      pageEnd: seg.pageEnd,
      orderIndex: idx + 1,
      confidence: isDuplicate ? Math.min(seg.confidence, 0.7) : seg.confidence,
      needsReview: seg.needsReview || isDuplicate,
      reviewNotes: isDuplicate
        ? 'Potential duplicate or overlapping topic title detected. Consider merging or renaming.'
        : seg.reviewNotes,
      isDuplicate,
      subtopics,
      structuredContent,
    };
  });
}

export type RegenerationScope = 'ALL' | 'TOPICS' | 'NOTES' | 'QUESTIONS';

export interface ProcessPdfOptions {
  isRegeneration?: boolean;
  scope?: RegenerationScope;
  confirmed?: boolean;
  forceRetry?: boolean;
}

const ACTIVE_JOB_STATUSES = [
  'PENDING',
  'EXTRACTING_PDF',
  'EXTRACTING_TOPICS',
  'GENERATING_NOTES',
  'GENERATING_QUESTIONS',
  'SAVING_RESULTS',
  'PROCESSING',
];

/**
 * Runs the one-time PDF processing pipeline (or an explicitly confirmed regeneration).
 * Enforces strict idempotency per (materialId, pdfVersion, contentHash) so student reads,
 * page refreshes, and worker restarts never trigger duplicate AI calls.
 */
export async function processLearningMaterialPdf(
  materialId: string,
  options: ProcessPdfOptions = {}
): Promise<{
  success: boolean;
  alreadyProcessed?: boolean;
  topicsCount: number;
  questionsCount?: number;
  error?: string;
}> {
  const isRegen = Boolean(options.isRegeneration);
  const scope: RegenerationScope = options.scope || 'ALL';

  if (isRegen && !options.confirmed) {
    return {
      success: false,
      topicsCount: 0,
      error: 'Explicit administrator confirmation is required before regenerating AI content.',
    };
  }

  const material = await prisma.learningMaterial.findUnique({ where: { id: materialId } });
  if (!material) {
    return { success: false, topicsCount: 0, error: 'Learning material not found.' };
  }

  if (!material.filePath) {
    return { success: false, topicsCount: 0, error: 'Source PDF file path is missing.' };
  }

  const absPath = path.isAbsolute(material.filePath)
    ? material.filePath
    : path.join(process.cwd(), material.filePath);
  const buffer = await fs.readFile(absPath);

  const computedHash = material.contentHash || crypto.createHash('sha256').update(buffer).digest('hex');
  if (!material.contentHash) {
    await prisma.learningMaterial.update({
      where: { id: materialId },
      data: { contentHash: computedHash },
    });
  }

  // 1. Lock check: prevent simultaneous jobs for the same PDF version
  const activeJob = await prisma.pDFProcessingJob.findFirst({
    where: {
      materialId,
      pdfVersion: material.pdfVersion,
      status: { in: ACTIVE_JOB_STATUSES },
    },
  });
  if (activeJob) {
    const existingTopicsCount = await prisma.extractedTopic.count({ where: { materialId } });
    return {
      success: true,
      alreadyProcessed: true,
      topicsCount: existingTopicsCount,
      error: 'A processing job for this PDF version is already in progress.',
    };
  }

  // 2. Idempotency check: never re-run initial processing if this PDF version+hash already COMPLETED
  const initialIdempotencyKey = `${materialId}:v${material.pdfVersion}:${computedHash}:initial`;
  if (!isRegen) {
    const completedJob = await prisma.pDFProcessingJob.findUnique({
      where: { idempotencyKey: initialIdempotencyKey },
    });
    if (completedJob && (completedJob.status === 'COMPLETED' || completedJob.status === 'REVIEW_REQUIRED')) {
      const [topicsCount, questionsCount] = await Promise.all([
        prisma.extractedTopic.count({ where: { materialId } }),
        prisma.topicQuestion.count({ where: { topic: { materialId } } }),
      ]);
      return {
        success: true,
        alreadyProcessed: true,
        topicsCount,
        questionsCount,
      };
    }
  }

  const provider = await resolveActiveAIProvider();
  const jobIdempotencyKey = isRegen
    ? `${materialId}:v${material.pdfVersion}:regen:${scope}:${Date.now()}`
    : initialIdempotencyKey;

  const job = await prisma.pDFProcessingJob.upsert({
    where: { idempotencyKey: jobIdempotencyKey },
    update: {
      status: 'PENDING',
      progress: 5,
      currentStage: 'Queued for one-time processing',
      errorMessage: null,
      attempts: { increment: 1 },
      startedAt: new Date(),
      completedAt: null,
    },
    create: {
      materialId,
      pdfVersion: material.pdfVersion,
      contentHash: computedHash,
      idempotencyKey: jobIdempotencyKey,
      status: 'PENDING',
      progress: 5,
      currentStage: 'Queued for one-time processing',
      isRegeneration: isRegen,
      regenerationScope: isRegen ? scope : null,
      providerId: provider?.id || null,
      providerName: provider?.displayName || 'Built-in NLP Engine',
      apiBaseUrl: provider?.apiBaseUrl || null,
      modelName: provider?.modelName || 'deterministic-nlp',
      startedAt: new Date(),
      attempts: 1,
    },
  });

  let inputTokens = 0;
  let outputTokens = 0;
  let totalTokens = 0;
  const completedStages: string[] = [];

  const updateJobStage = async (status: string, progress: number, currentStage: string) => {
    await prisma.pDFProcessingJob.update({
      where: { id: job.id },
      data: {
        status,
        progress,
        currentStage,
        completedStagesJson: JSON.stringify(completedStages),
        inputTokens,
        outputTokens,
        totalTokens,
      },
    });
    await prisma.learningMaterial.update({
      where: { id: materialId },
      data: { processingStatus: status },
    });
  };

  try {
    const validation = validatePdfBuffer(buffer);
    if (!validation.valid) {
      throw new Error(validation.error || 'Invalid PDF file.');
    }

    // STAGE 1: EXTRACTING_PDF
    let pages: PageText[] = [];
    let totalPages = material.pageCount || 0;

    if (material.extractedTextJson && isRegen && scope !== 'ALL') {
      pages = JSON.parse(material.extractedTextJson);
      totalPages = pages.length;
    } else {
      await updateJobStage('EXTRACTING_PDF', 20, 'Extracting text and page numbers from PDF');
      const extracted = await extractPagesFromPdf(absPath);
      pages = extracted.pages;
      totalPages = extracted.totalPages;

      if (extracted.isScannedPdf) {
        await prisma.pDFProcessingJob.update({
          where: { id: job.id },
          data: {
            status: 'REVIEW_REQUIRED',
            progress: 40,
            isScannedPdf: true,
            ocrUsed: false,
            totalPages,
            errorMessage:
              'Scanned/image-only PDF detected without selectable text. OCR is unavailable. Please upload a text-searchable PDF.',
            completedAt: new Date(),
          },
        });
        await prisma.learningMaterial.update({
          where: { id: materialId },
          data: { processingStatus: 'REVIEW_REQUIRED', pageCount: totalPages },
        });
        return {
          success: false,
          topicsCount: 0,
          error: 'Scanned PDF detected without selectable text; OCR is unavailable.',
        };
      }

      await prisma.learningMaterial.update({
        where: { id: materialId },
        data: { pageCount: totalPages, extractedTextJson: JSON.stringify(pages) },
      });
    }
    completedStages.push('EXTRACTING_PDF');

    // STAGE 2 & 3: EXTRACTING_TOPICS + GENERATING_NOTES (if initial, ALL, TOPICS, or NOTES)
    if (!isRegen || scope === 'ALL' || scope === 'TOPICS') {
      await updateJobStage('EXTRACTING_TOPICS', 45, 'Identifying curriculum topics and page ranges');
      const candidates = extractTopicsFromPages(pages);
      completedStages.push('EXTRACTING_TOPICS');

      await updateJobStage('GENERATING_NOTES', 65, 'Generating structured study notes grounded in PDF');
      if (provider) {
        for (const c of candidates) {
          const aiNotes = await callOpenAICompatibleJson<StructuredTopicContent>(
            'You are a nursing & clinical education curriculum writer. Return structured JSON study notes grounded strictly in the provided PDF text. Do not invent clinical facts.',
            `Create structured study notes for topic "${c.title}" (pp. ${c.pageStart}-${c.pageEnd}).\nReturn JSON with keys: introduction, learningObjectives (string[]), mainExplanation, keyConcepts (string[]), definitions ([{term,definition}]), keyPoints (string[]), summary, revisionNotes.\n\nSource:\n${c.rawText.slice(0, 5000)}`,
            provider,
            1
          );
          inputTokens += aiNotes.usage.inputTokens;
          outputTokens += aiNotes.usage.outputTokens;
          totalTokens += aiNotes.usage.totalTokens;
          if (aiNotes.ok && aiNotes.data?.introduction) {
            c.structuredContent = {
              introduction: aiNotes.data.introduction || c.structuredContent.introduction,
              learningObjectives: Array.isArray(aiNotes.data.learningObjectives) ? aiNotes.data.learningObjectives : c.structuredContent.learningObjectives,
              mainExplanation: aiNotes.data.mainExplanation || c.structuredContent.mainExplanation,
              keyConcepts: Array.isArray(aiNotes.data.keyConcepts) ? aiNotes.data.keyConcepts : c.structuredContent.keyConcepts,
              definitions: Array.isArray(aiNotes.data.definitions) ? aiNotes.data.definitions : c.structuredContent.definitions,
              keyPoints: Array.isArray(aiNotes.data.keyPoints) ? aiNotes.data.keyPoints : c.structuredContent.keyPoints,
              summary: aiNotes.data.summary || c.structuredContent.summary,
              revisionNotes: aiNotes.data.revisionNotes || c.structuredContent.revisionNotes,
            };
          }
        }
      }
      completedStages.push('GENERATING_NOTES');

      await updateJobStage('SAVING_RESULTS', 80, 'Saving extracted topics & study notes to database');
      await prisma.$transaction(async (tx) => {
        await tx.extractedTopic.deleteMany({
          where: { materialId, status: 'DRAFT' },
        });
        const existingCount = await tx.extractedTopic.count({ where: { materialId } });

        for (let i = 0; i < candidates.length; i++) {
          const c = candidates[i];
          const createdTopic = await tx.extractedTopic.create({
            data: {
              materialId,
              courseId: material.courseId,
              programmeId: material.programmeId,
              level: material.level || 'Level 100',
              semester: material.semester || 'First Semester',
              title: c.title,
              description: c.description,
              summary: c.summary,
              contentJson: JSON.stringify(c.structuredContent),
              rawText: c.rawText,
              pageStart: c.pageStart,
              pageEnd: c.pageEnd,
              orderIndex: existingCount + i + 1,
              confidence: c.confidence,
              needsReview: c.needsReview,
              reviewNotes: c.reviewNotes,
              isDuplicate: c.isDuplicate,
              status: 'DRAFT',
            },
          });

          if (c.subtopics.length > 0) {
            await tx.topicSubtopic.createMany({
              data: c.subtopics.map((sub, sIdx) => ({
                topicId: createdTopic.id,
                title: sub.title,
                summary: sub.summary,
                pageStart: sub.pageStart,
                pageEnd: sub.pageEnd,
                orderIndex: sIdx + 1,
              })),
            });
          }
        }
      });
    } else if (scope === 'NOTES') {
      await updateJobStage('GENERATING_NOTES', 65, 'Regenerating study notes for existing topics');
      const existingTopics = await prisma.extractedTopic.findMany({ where: { materialId } });
      for (const t of existingTopics) {
        let updatedContent = buildStructuredContent(t.title, t.rawText || t.summary || t.title, t.pageStart, t.pageEnd);
        if (provider) {
          const aiNotes = await callOpenAICompatibleJson<StructuredTopicContent>(
            'You are a nursing & clinical education curriculum writer. Return structured JSON study notes grounded strictly in the provided PDF text.',
            `Create structured study notes for topic "${t.title}" (pp. ${t.pageStart}-${t.pageEnd}).\nReturn JSON with keys: introduction, learningObjectives, mainExplanation, keyConcepts, definitions, keyPoints, summary, revisionNotes.\n\nSource:\n${(t.rawText || t.summary || '').slice(0, 5000)}`,
            provider,
            1
          );
          inputTokens += aiNotes.usage.inputTokens;
          outputTokens += aiNotes.usage.outputTokens;
          totalTokens += aiNotes.usage.totalTokens;
          if (aiNotes.ok && aiNotes.data?.introduction) {
            updatedContent = aiNotes.data;
          }
        }
        await prisma.extractedTopic.update({
          where: { id: t.id },
          data: { contentJson: JSON.stringify(updatedContent) },
        });
      }
      completedStages.push('GENERATING_NOTES');
    }

    // STAGE 4: GENERATING_QUESTIONS (if initial, ALL, or QUESTIONS)
    let questionsCreatedCount = 0;
    if (!isRegen || scope === 'ALL' || scope === 'QUESTIONS') {
      await updateJobStage('GENERATING_QUESTIONS', 88, 'Generating topic-specific assessment questions');
      const topicsForQuestions = await prisma.extractedTopic.findMany({
        where: { materialId },
        orderBy: { orderIndex: 'asc' },
      });

      const defaultTypes: QuestionType[] = ['MCQ', 'TRUE_FALSE', 'SHORT_ANSWER', 'FILL_BLANK', 'MATCHING', 'SCENARIO'];

      for (const topic of topicsForQuestions) {
        if (isRegen && scope === 'QUESTIONS') {
          // Only replace DRAFT questions; preserve APPROVED/PUBLISHED questions & student assessment history
          await prisma.topicQuestion.deleteMany({
            where: { topicId: topic.id, status: 'DRAFT' },
          });
        } else {
          const existingDrafts = await prisma.topicQuestion.count({ where: { topicId: topic.id } });
          if (existingDrafts > 0) continue; // Never duplicate questions on retry
        }

        const qRes = await generateQuestionsWithAiIfConfigured({
          topicId: topic.id,
          count: 6,
          questionTypes: defaultTypes,
          difficulty: 'MEDIUM',
          includeExplanations: true,
          includePageReferences: true,
          useAi: Boolean(provider),
          providerOverride: provider,
        });
        questionsCreatedCount += qRes.createdCount;
        inputTokens += qRes.usage.inputTokens;
        outputTokens += qRes.usage.outputTokens;
        totalTokens += qRes.usage.totalTokens;
      }
      completedStages.push('GENERATING_QUESTIONS');
    }

    const allTopics = await prisma.extractedTopic.findMany({ where: { materialId } });
    const hasReviewFlags = allTopics.some((c) => c.needsReview);
    const finalStatus = hasReviewFlags ? 'REVIEW_REQUIRED' : 'COMPLETED';

    await prisma.pDFProcessingJob.update({
      where: { id: job.id },
      data: {
        status: finalStatus,
        progress: 100,
        currentStage: `Completed (${allTopics.length} topics, ${questionsCreatedCount} questions saved)`,
        completedStagesJson: JSON.stringify(completedStages),
        pagesProcessed: totalPages,
        totalPages,
        inputTokens,
        outputTokens,
        totalTokens,
        completedAt: new Date(),
      },
    });

    await prisma.learningMaterial.update({
      where: { id: materialId },
      data: {
        processingStatus: finalStatus,
        processedAt: new Date(),
      },
    });

    return {
      success: true,
      topicsCount: allTopics.length,
      questionsCount: questionsCreatedCount,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'PDF processing failed unexpectedly.';
    await prisma.pDFProcessingJob.update({
      where: { id: job.id },
      data: {
        status: 'FAILED',
        errorMessage: message,
        completedStagesJson: JSON.stringify(completedStages),
        inputTokens,
        outputTokens,
        totalTokens,
        completedAt: new Date(),
      },
    });
    await prisma.learningMaterial.update({
      where: { id: materialId },
      data: { processingStatus: 'FAILED' },
    });
    return { success: false, topicsCount: 0, error: message };
  }
}

