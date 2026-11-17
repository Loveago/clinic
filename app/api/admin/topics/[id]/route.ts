import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizeAdminOrLecturer } from '@/lib/portal-auth';

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authorizeAdminOrLecturer();
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 403 });
    }

    const { id } = await context.params;
    const topic = await prisma.extractedTopic.findUnique({
      where: { id },
      include: {
        material: true,
        subtopics: { orderBy: { orderIndex: 'asc' } },
        questions: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!topic) {
      return NextResponse.json({ error: 'Topic not found' }, { status: 404 });
    }
    return NextResponse.json({ topic });
  } catch (error) {
    console.error('GET admin/topics/[id] error:', error);
    return NextResponse.json({ error: 'Failed to load topic' }, { status: 500 });
  }
}

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
    const existing = await prisma.extractedTopic.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Topic not found' }, { status: 404 });
    }

    const body = await req.json();
    const {
      action,
      splitTitle,
      title,
      description,
      summary,
      contentJson,
      rawText,
      pageStart,
      pageEnd,
      orderIndex,
      status,
      needsReview,
      reviewNotes,
    } = body;

    if (action === 'split') {
      const text = existing.rawText || existing.description || '';
      const midpoint = Math.floor(text.length / 2);
      const splitIdx = text.indexOf('\n', midpoint) > 0 ? text.indexOf('\n', midpoint) : midpoint;
      const firstHalf = text.slice(0, splitIdx).trim();
      const secondHalf = text.slice(splitIdx).trim();

      const [updatedFirst, createdSecond] = await prisma.$transaction([
        prisma.extractedTopic.update({
          where: { id },
          data: {
            rawText: firstHalf,
            pageEnd: Math.max(existing.pageStart, Math.floor((existing.pageStart + existing.pageEnd) / 2)),
            needsReview: false,
          },
        }),
        prisma.extractedTopic.create({
          data: {
            materialId: existing.materialId,
            courseId: existing.courseId,
            programmeId: existing.programmeId,
            level: existing.level,
            semester: existing.semester,
            title: (splitTitle || `${existing.title} (Part 2)`).trim(),
            description: secondHalf.slice(0, 220),
            summary: secondHalf.slice(0, 300),
            rawText: secondHalf,
            pageStart: Math.max(existing.pageStart, Math.ceil((existing.pageStart + existing.pageEnd) / 2)),
            pageEnd: existing.pageEnd,
            orderIndex: existing.orderIndex + 1,
            status: 'DRAFT',
            needsReview: true,
            reviewNotes: 'Split from previous topic; please review content structure.',
          },
        }),
      ]);

      return NextResponse.json({ topic: updatedFirst, splitTopic: createdSecond });
    }

    const updated = await prisma.extractedTopic.update({
      where: { id },
      data: {
        ...(title !== undefined ? { title: title.trim() } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(summary !== undefined ? { summary } : {}),
        ...(contentJson !== undefined
          ? { contentJson: typeof contentJson === 'string' ? contentJson : JSON.stringify(contentJson) }
          : {}),
        ...(rawText !== undefined ? { rawText } : {}),
        ...(pageStart !== undefined ? { pageStart: Number(pageStart) } : {}),
        ...(pageEnd !== undefined ? { pageEnd: Number(pageEnd) } : {}),
        ...(orderIndex !== undefined ? { orderIndex: Number(orderIndex) } : {}),
        ...(status !== undefined ? { status } : {}),
        ...(needsReview !== undefined ? { needsReview: Boolean(needsReview) } : {}),
        ...(reviewNotes !== undefined ? { reviewNotes } : {}),
      },
    });

    return NextResponse.json({ topic: updated });
  } catch (error) {
    console.error('PATCH admin/topics/[id] error:', error);
    return NextResponse.json({ error: 'Failed to update topic' }, { status: 500 });
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
    await prisma.extractedTopic.delete({ where: { id } });
    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error('DELETE admin/topics/[id] error:', error);
    return NextResponse.json({ error: 'Failed to delete topic' }, { status: 500 });
  }
}

