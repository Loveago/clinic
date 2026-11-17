import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizeAdminOrLecturer } from '@/lib/portal-auth';

export async function GET(req: NextRequest) {
  try {
    const auth = await authorizeAdminOrLecturer();
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 403 });
    }

    const { searchParams } = new URL(req.url);
    const materialId = searchParams.get('materialId') || undefined;
    const courseId = searchParams.get('courseId') || undefined;
    const status = searchParams.get('status') || undefined;

    const topics = await prisma.extractedTopic.findMany({
      where: {
        ...(materialId ? { materialId } : {}),
        ...(courseId ? { courseId } : {}),
        ...(status ? { status } : {}),
      },
      include: {
        material: { select: { id: true, title: true, status: true, pageCount: true } },
        subtopics: { orderBy: { orderIndex: 'asc' } },
        questions: {
          select: { id: true, status: true, questionType: true, difficulty: true },
        },
      },
      orderBy: [{ materialId: 'asc' }, { orderIndex: 'asc' }],
    });

    return NextResponse.json({ topics });
  } catch (error) {
    console.error('GET admin/topics error:', error);
    return NextResponse.json({ error: 'Failed to load extracted topics' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authorizeAdminOrLecturer();
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 403 });
    }

    const body = await req.json();
    const { action, materialId, title, description, summary, contentJson, pageStart, pageEnd, primaryTopicId, secondaryTopicId, orderedTopicIds } = body;

    if (action === 'approve_all' && materialId) {
      await prisma.extractedTopic.updateMany({
        where: { materialId, status: 'DRAFT' },
        data: { status: 'APPROVED', needsReview: false },
      });
      return NextResponse.json({ updated: true });
    }

    if (action === 'publish_all' && materialId) {
      await prisma.$transaction([
        prisma.extractedTopic.updateMany({
          where: { materialId, status: { in: ['DRAFT', 'APPROVED'] } },
          data: { status: 'PUBLISHED', needsReview: false },
        }),
        prisma.learningMaterial.update({
          where: { id: materialId },
          data: { status: 'PUBLISHED' },
        }),
      ]);
      return NextResponse.json({ published: true });
    }

    if (action === 'merge' && primaryTopicId && secondaryTopicId) {
      const [primary, secondary] = await Promise.all([
        prisma.extractedTopic.findUnique({ where: { id: primaryTopicId } }),
        prisma.extractedTopic.findUnique({ where: { id: secondaryTopicId } }),
      ]);
      if (!primary || !secondary) {
        return NextResponse.json({ error: 'Both topics must exist to merge.' }, { status: 404 });
      }
      const mergedRaw = [primary.rawText || '', secondary.rawText || ''].filter(Boolean).join('\n\n');
      await prisma.$transaction([
        prisma.topicQuestion.updateMany({
          where: { topicId: secondary.id },
          data: { topicId: primary.id },
        }),
        prisma.topicSubtopic.updateMany({
          where: { topicId: secondary.id },
          data: { topicId: primary.id },
        }),
        prisma.extractedTopic.update({
          where: { id: primary.id },
          data: {
            rawText: mergedRaw,
            pageStart: Math.min(primary.pageStart, secondary.pageStart),
            pageEnd: Math.max(primary.pageEnd, secondary.pageEnd),
            isDuplicate: false,
            needsReview: false,
            reviewNotes: `Merged with "${secondary.title}"`,
          },
        }),
        prisma.extractedTopic.delete({ where: { id: secondary.id } }),
      ]);
      return NextResponse.json({ merged: true });
    }

    if (action === 'reorder' && Array.isArray(orderedTopicIds)) {
      await prisma.$transaction(
        orderedTopicIds.map((id: string, idx: number) =>
          prisma.extractedTopic.update({
            where: { id },
            data: { orderIndex: idx + 1 },
          })
        )
      );
      return NextResponse.json({ reordered: true });
    }

    // Default: Create a manual topic for a LearningMaterial
    if (!materialId || !title) {
      return NextResponse.json({ error: 'materialId and title are required' }, { status: 400 });
    }
    const material = await prisma.learningMaterial.findUnique({ where: { id: materialId } });
    if (!material) {
      return NextResponse.json({ error: 'Learning material not found' }, { status: 404 });
    }
    const count = await prisma.extractedTopic.count({ where: { materialId } });
    const topic = await prisma.extractedTopic.create({
      data: {
        materialId,
        courseId: material.courseId,
        programmeId: material.programmeId,
        level: material.level || 'Level 100',
        semester: material.semester || 'First Semester',
        title: title.trim(),
        description: description?.trim() || '',
        summary: summary?.trim() || '',
        contentJson: contentJson ? JSON.stringify(contentJson) : null,
        pageStart: Number(pageStart) || 1,
        pageEnd: Number(pageEnd) || 1,
        orderIndex: count + 1,
        status: 'DRAFT',
      },
    });

    return NextResponse.json({ topic }, { status: 201 });
  } catch (error) {
    console.error('POST admin/topics error:', error);
    return NextResponse.json({ error: 'Failed to process topic action' }, { status: 500 });
  }
}

