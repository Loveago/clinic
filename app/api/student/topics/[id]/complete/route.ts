import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: topicId } = await params;
    const user = await getCurrentUser();
    let studentId = user?.studentProfile?.id;

    if (!studentId) {
      const defaultStudent = await prisma.student.findFirst({
        where: {
          OR: [{ studentId: 'WNS/GH/2025/001' }, { studentId: 'WNS/2025/001' }],
        },
      });
      studentId = defaultStudent?.id || (await prisma.student.findFirst())?.id;
    }

    if (!studentId) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    // Check existing progress
    const existing = await prisma.topicProgress.findUnique({
      where: {
        studentId_topicId: {
          studentId,
          topicId,
        },
      },
    });

    let newStatus = true;
    if (existing) {
      newStatus = !existing.completed;
      await prisma.topicProgress.update({
        where: { id: existing.id },
        data: {
          completed: newStatus,
          completedAt: newStatus ? new Date() : null,
        },
      });
    } else {
      await prisma.topicProgress.create({
        data: {
          studentId,
          topicId,
          completed: true,
          completedAt: new Date(),
        },
      });
    }

    // Recalculate course enrollment progress
    const topic = await prisma.courseTopic.findUnique({
      where: { id: topicId },
      include: {
        module: {
          include: {
            course: {
              include: {
                modules: {
                  include: {
                    topics: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (topic?.module?.course) {
      const course = topic.module.course;
      const allCourseTopics = course.modules.flatMap((m) => m.topics);
      const totalTopics = allCourseTopics.length;

      if (totalTopics > 0) {
        const topicIds = allCourseTopics.map((t) => t.id);
        const completedCount = await prisma.topicProgress.count({
          where: {
            studentId,
            topicId: { in: topicIds },
            completed: true,
          },
        });

        const progressPercent = Math.round((completedCount / totalTopics) * 100);

        await prisma.courseEnrollment.upsert({
          where: {
            studentId_courseId: {
              studentId,
              courseId: course.id,
            },
          },
          update: { progressPercent },
          create: {
            studentId,
            courseId: course.id,
            progressPercent,
          },
        });
      }
    }

    return NextResponse.json({ success: true, completed: newStatus });
  } catch (error) {
    console.error('Topic progress error:', error);
    return NextResponse.json({ error: 'Failed to update topic progress' }, { status: 500 });
  }
}

