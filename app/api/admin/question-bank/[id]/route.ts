import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizeAdminOrLecturer } from '@/lib/portal-auth';

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authorizeAdminOrLecturer();
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 403 });
    }

    const { id } = await context.params;
    const existing = await prisma.topicQuestion.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 });
    }

    const body = await req.json();

    if (body.action === 'duplicate') {
      const copy = await prisma.topicQuestion.create({
        data: {
          topicId: existing.topicId,
          courseId: existing.courseId,
          questionType: existing.questionType,
          difficulty: existing.difficulty,
          questionText: `${existing.questionText} (Copy)`,
          optionsJson: existing.optionsJson,
          correctAnswer: existing.correctAnswer,
          markingGuide: existing.markingGuide,
          explanation: existing.explanation,
          marks: existing.marks,
          pageRef: existing.pageRef,
          status: 'DRAFT',
          isAiGenerated: false,
        },
      });
      return NextResponse.json({ question: copy }, { status: 201 });
    }

    const updated = await prisma.topicQuestion.update({
      where: { id },
      data: {
        ...(body.questionText !== undefined ? { questionText: body.questionText } : {}),
        ...(body.questionType !== undefined ? { questionType: body.questionType } : {}),
        ...(body.difficulty !== undefined ? { difficulty: body.difficulty } : {}),
        ...(body.options !== undefined ? { optionsJson: JSON.stringify(body.options) } : {}),
        ...(body.optionsJson !== undefined ? { optionsJson: body.optionsJson } : {}),
        ...(body.correctAnswer !== undefined ? { correctAnswer: String(body.correctAnswer) } : {}),
        ...(body.markingGuide !== undefined ? { markingGuide: body.markingGuide } : {}),
        ...(body.explanation !== undefined ? { explanation: body.explanation } : {}),
        ...(body.marks !== undefined ? { marks: Number(body.marks) } : {}),
        ...(body.pageRef !== undefined ? { pageRef: body.pageRef } : {}),
        ...(body.status !== undefined ? { status: body.status } : {}),
      },
    });

    return NextResponse.json({ question: updated });
  } catch (error) {
    console.error('PATCH question-bank/[id] error:', error);
    return NextResponse.json({ error: 'Failed to update question' }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authorizeAdminOrLecturer();
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 403 });
    }

    const { id } = await context.params;
    await prisma.topicQuestion.delete({ where: { id } });
    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error('DELETE question-bank/[id] error:', error);
    return NextResponse.json({ error: 'Failed to delete question' }, { status: 500 });
  }
}

