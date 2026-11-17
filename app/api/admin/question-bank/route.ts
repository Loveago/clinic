import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizeAdminOrLecturer } from '@/lib/portal-auth';
import { generateRubricOnce } from '@/lib/auto-grader';

const SUBJECTIVE_TYPES = new Set(['SHORT_ANSWER', 'ESSAY', 'SCENARIO']);

export async function GET(req: NextRequest) {
  try {
    const auth = await authorizeAdminOrLecturer();
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 403 });
    }

    const { searchParams } = new URL(req.url);
    const courseId = searchParams.get('courseId') || undefined;
    const topicId = searchParams.get('topicId') || undefined;
    const difficulty = searchParams.get('difficulty') || undefined;
    const questionType = searchParams.get('questionType') || undefined;
    const status = searchParams.get('status') || undefined;
    const search = searchParams.get('search')?.trim().toLowerCase() || '';

    const questions = await prisma.topicQuestion.findMany({
      where: {
        ...(courseId ? { courseId } : {}),
        ...(topicId ? { topicId } : {}),
        ...(difficulty ? { difficulty } : {}),
        ...(questionType ? { questionType } : {}),
        ...(status ? { status } : {}),
      },
      include: {
        topic: { select: { id: true, title: true, materialId: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const filtered = search
      ? questions.filter(
          (q) =>
            q.questionText.toLowerCase().includes(search) ||
            q.topic.title.toLowerCase().includes(search)
        )
      : questions;

    return NextResponse.json({ questions: filtered });
  } catch (error) {
    console.error('GET question-bank error:', error);
    return NextResponse.json({ error: 'Failed to load question bank' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authorizeAdminOrLecturer();
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 403 });
    }

    const body = await req.json();

    // Bulk status update action
    if (body.action === 'bulk_status' && Array.isArray(body.questionIds) && body.status) {
      await prisma.topicQuestion.updateMany({
        where: { id: { in: body.questionIds } },
        data: { status: body.status },
      });
      return NextResponse.json({ updated: body.questionIds.length });
    }

    const {
      topicId,
      questionType,
      difficulty,
      questionText,
      options,
      optionsJson,
      correctAnswer,
      acceptedAlternatives,
      acceptedAlternativesJson,
      caseSensitive,
      partialCredit,
      negativeMarks,
      markingGuide,
      rubricJson,
      expectedAnswer,
      requiredConceptsJson,
      criticalErrorsJson,
      explanation,
      marks,
      pageRef,
      status,
    } = body;

    if (!topicId || !questionText) {
      return NextResponse.json(
        { error: 'topicId and questionText are required.' },
        { status: 400 }
      );
    }

    const qType = String(questionType || 'MCQ').toUpperCase();
    if (!SUBJECTIVE_TYPES.has(qType) && !correctAnswer) {
      return NextResponse.json(
        { error: 'correctAnswer is required for objective questions.' },
        { status: 400 }
      );
    }

    const topic = await prisma.extractedTopic.findUnique({
      where: { id: topicId },
      select: { id: true, courseId: true, title: true, summary: true },
    });
    if (!topic) {
      return NextResponse.json({ error: 'Topic not found' }, { status: 404 });
    }

    const maxMarks = Math.max(1, Number(marks) || 2);
    let finalRubricJson = rubricJson
      ? typeof rubricJson === 'string'
        ? rubricJson
        : JSON.stringify(rubricJson)
      : null;
    let finalExpectedAnswer = expectedAnswer || null;
    let finalRequiredConceptsJson = requiredConceptsJson
      ? typeof requiredConceptsJson === 'string'
        ? requiredConceptsJson
        : JSON.stringify(requiredConceptsJson)
      : null;
    let finalCriticalErrorsJson = criticalErrorsJson
      ? typeof criticalErrorsJson === 'string'
        ? criticalErrorsJson
        : JSON.stringify(criticalErrorsJson)
      : null;
    let finalExplanation = explanation || null;
    let finalAcceptedAlternativesJson = acceptedAlternativesJson
      ? typeof acceptedAlternativesJson === 'string'
        ? acceptedAlternativesJson
        : JSON.stringify(acceptedAlternativesJson)
      : Array.isArray(acceptedAlternatives)
      ? JSON.stringify(acceptedAlternatives)
      : null;

    if (SUBJECTIVE_TYPES.has(qType) || !finalRubricJson) {
      if (SUBJECTIVE_TYPES.has(qType) || !finalExplanation) {
        const generated = await generateRubricOnce({
          promptText: String(questionText).trim(),
          questionType: qType,
          maxMarks,
          correctAnswer: correctAnswer ? String(correctAnswer) : null,
          courseContext: `${topic.title}: ${topic.summary || ''}`,
        });
        if (!finalRubricJson) finalRubricJson = JSON.stringify(generated.rubric);
        if (!finalExpectedAnswer) finalExpectedAnswer = generated.expectedAnswer;
        if (!finalRequiredConceptsJson) {
          finalRequiredConceptsJson = JSON.stringify(generated.requiredConcepts);
        }
        if (!finalCriticalErrorsJson) {
          finalCriticalErrorsJson = JSON.stringify(generated.criticalErrors);
        }
        if (!finalExplanation) finalExplanation = generated.explanation;
        if (!finalAcceptedAlternativesJson && generated.acceptedAlternatives.length > 0) {
          finalAcceptedAlternativesJson = JSON.stringify(generated.acceptedAlternatives);
        }
      }
    }

    const created = await prisma.topicQuestion.create({
      data: {
        topicId,
        courseId: topic.courseId,
        questionType: qType,
        difficulty: difficulty || 'MEDIUM',
        questionText: String(questionText).trim(),
        optionsJson: optionsJson
          ? typeof optionsJson === 'string'
            ? optionsJson
            : JSON.stringify(optionsJson)
          : options
          ? JSON.stringify(options)
          : null,
        correctAnswer: String(correctAnswer ?? finalExpectedAnswer ?? ''),
        acceptedAlternativesJson: finalAcceptedAlternativesJson,
        caseSensitive: Boolean(caseSensitive),
        partialCredit: partialCredit !== undefined ? Boolean(partialCredit) : true,
        negativeMarks: Number(negativeMarks) || 0,
        markingGuide: markingGuide || null,
        rubricJson: finalRubricJson,
        expectedAnswer: finalExpectedAnswer,
        requiredConceptsJson: finalRequiredConceptsJson,
        criticalErrorsJson: finalCriticalErrorsJson,
        explanation: finalExplanation,
        marks: maxMarks,
        pageRef: pageRef || null,
        status: status || 'DRAFT',
        isAiGenerated: false,
      },
    });

    return NextResponse.json({ question: created }, { status: 201 });
  } catch (error) {
    console.error('POST question-bank error:', error);
    return NextResponse.json({ error: 'Failed to create question' }, { status: 500 });
  }
}
