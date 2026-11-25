import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveStudentRecord } from '@/lib/portal-auth';

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const student = await resolveStudentRecord();
    if (!student) {
      return NextResponse.json({ error: 'Student record not found' }, { status: 404 });
    }

    const { id } = await context.params;
    const topic = await prisma.extractedTopic.findUnique({
      where: { id },
      include: {
        material: {
          select: { id: true, title: true, pageCount: true, status: true },
        },
        subtopics: { orderBy: { orderIndex: 'asc' } },
      },
    });

    if (!topic || topic.status !== 'PUBLISHED' || topic.material.status !== 'PUBLISHED') {
      return NextResponse.json({ error: 'Topic not found or not published' }, { status: 404 });
    }

    // Verify student is enrolled or registered in this course (or belongs to its programme)
    const [enrollment, registration, courseRecord] = await Promise.all([
      prisma.courseEnrollment.findUnique({
        where: { studentId_courseId: { studentId: student.id, courseId: topic.courseId } },
        include: { course: { select: { id: true, code: true, title: true } } },
      }),
      prisma.courseRegistration.findFirst({
        where: { studentId: student.id, courseId: topic.courseId },
        include: { course: { select: { id: true, code: true, title: true } } },
      }),
      prisma.course.findUnique({
        where: { id: topic.courseId },
        select: { id: true, code: true, title: true, programmeId: true },
      }),
    ]);

    const resolvedCourse =
      enrollment?.course ||
      registration?.course ||
      (courseRecord && courseRecord.programmeId === student.programmeId
        ? { id: courseRecord.id, code: courseRecord.code, title: courseRecord.title }
        : null);

    if (!resolvedCourse) {
      return NextResponse.json(
        { error: 'Access denied: You are not enrolled in this course.' },
        { status: 403 }
      );
    }

    // Record topic open in StudentTopicMastery (without marking as MASTERED)
    const existingMastery = await prisma.studentTopicMastery.findUnique({
      where: { studentId_topicId: { studentId: student.id, topicId: topic.id } },
    });

    const mastery = await prisma.studentTopicMastery.upsert({
      where: { studentId_topicId: { studentId: student.id, topicId: topic.id } },
      update: {
        opened: true,
        masteryStatus:
          existingMastery?.masteryStatus === 'NOT_STARTED' || !existingMastery
            ? 'IN_PROGRESS'
            : existingMastery.masteryStatus,
        lastActivityAt: new Date(),
      },
      create: {
        studentId: student.id,
        topicId: topic.id,
        opened: true,
        masteryStatus: 'IN_PROGRESS',
      },
    });

    if (!existingMastery?.opened) {
      await prisma.studentLearningActivity.create({
        data: {
          studentId: student.id,
          courseId: topic.courseId,
          topicId: topic.id,
          activityType: 'OPENED_TOPIC',
          details: `Opened topic "${topic.title}"`,
        },
      });
    }

    const [quizzes, siblingTopics] = await Promise.all([
      prisma.topicAssessment.findMany({
        where: { topicId: topic.id, status: 'PUBLISHED' },
        include: {
          _count: { select: { questions: true } },
          attempts: {
            where: { studentId: student.id },
            orderBy: { attemptNumber: 'desc' },
          },
        },
      }),
      prisma.extractedTopic.findMany({
        where: { materialId: topic.materialId, status: 'PUBLISHED' },
        orderBy: { orderIndex: 'asc' },
        select: { id: true, title: true, orderIndex: true },
      }),
    ]);

    const currentIdx = siblingTopics.findIndex((t) => t.id === topic.id);
    const prevTopic = currentIdx > 0 ? siblingTopics[currentIdx - 1] : null;
    const nextTopic =
      currentIdx >= 0 && currentIdx < siblingTopics.length - 1
        ? siblingTopics[currentIdx + 1]
        : null;

    return NextResponse.json({
      topic: {
        ...topic,
        structuredContent: topic.contentJson ? JSON.parse(topic.contentJson) : null,
        pdfUrl: `/api/admin/learning-materials/${topic.materialId}/pdf`,
      },
      course: resolvedCourse,
      mastery,
      quizzes,
      prevTopic,
      nextTopic,
    });
  } catch (error) {
    console.error('GET student/learning-topics/[id] error:', error);
    return NextResponse.json({ error: 'Failed to load topic' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const student = await resolveStudentRecord();
    if (!student) {
      return NextResponse.json({ error: 'Student record not found' }, { status: 404 });
    }

    const { id } = await context.params;
    const body = await req.json();
    const completed = body.completed !== false;

    const topic = await prisma.extractedTopic.findUnique({ where: { id } });
    if (!topic || topic.status !== 'PUBLISHED') {
      return NextResponse.json({ error: 'Topic not found' }, { status: 404 });
    }

    const existing = await prisma.studentTopicMastery.findUnique({
      where: { studentId_topicId: { studentId: student.id, topicId: id } },
    });

    // Preserve MASTERED or NEEDS_REVISION if quiz already evaluated; otherwise COMPLETED / IN_PROGRESS
    let nextStatus = completed ? 'COMPLETED' : 'IN_PROGRESS';
    if (existing?.masteryStatus === 'MASTERED' || existing?.masteryStatus === 'NEEDS_REVISION') {
      nextStatus = existing.masteryStatus;
    }

    const mastery = await prisma.studentTopicMastery.upsert({
      where: { studentId_topicId: { studentId: student.id, topicId: id } },
      update: {
        opened: true,
        completed,
        completedAt: completed ? new Date() : null,
        masteryStatus: nextStatus,
        lastActivityAt: new Date(),
      },
      create: {
        studentId: student.id,
        topicId: id,
        opened: true,
        completed,
        completedAt: completed ? new Date() : null,
        masteryStatus: nextStatus,
      },
    });

    if (completed) {
      await prisma.studentLearningActivity.create({
        data: {
          studentId: student.id,
          courseId: topic.courseId,
          topicId: topic.id,
          activityType: 'COMPLETED_TOPIC',
          details: `Marked topic "${topic.title}" as completed`,
        },
      });
    }

    return NextResponse.json({ mastery });
  } catch (error) {
    console.error('POST student/learning-topics/[id] error:', error);
    return NextResponse.json({ error: 'Failed to update topic progress' }, { status: 500 });
  }
}

