import { NextRequest, NextResponse } from 'next/server';
import { authorizeAdminOrLecturer } from '@/lib/portal-auth';
import {
  generateQuestionsForTopic,
  type QuestionType,
  type QuestionDifficulty,
} from '@/lib/question-generator';

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authorizeAdminOrLecturer();
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 403 });
    }

    const { id: topicId } = await context.params;
    const body = await req.json();

    const count = Math.max(1, Math.min(30, Number(body.count) || 5));
    const questionTypes: QuestionType[] = Array.isArray(body.questionTypes) && body.questionTypes.length > 0
      ? body.questionTypes
      : ['MCQ', 'TRUE_FALSE', 'SHORT_ANSWER', 'FILL_BLANK', 'SCENARIO'];
    const difficulty: QuestionDifficulty = ['EASY', 'MEDIUM', 'DIFFICULT'].includes(body.difficulty)
      ? body.difficulty
      : 'MEDIUM';
    const includeExplanations = body.includeExplanations !== false;
    const includePageReferences = body.includePageReferences !== false;

    const result = await generateQuestionsForTopic({
      topicId,
      count,
      questionTypes,
      difficulty,
      includeExplanations,
      includePageReferences,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('POST generate-questions error:', error);
    const msg = error instanceof Error ? error.message : 'Failed to generate topic questions';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

