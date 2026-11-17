import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveStudentRecord } from '@/lib/portal-auth';

export async function GET() {
  try {
    const student = await resolveStudentRecord();
    if (!student) {
      return NextResponse.json({ error: 'Student record not found' }, { status: 404 });
    }

    const enrollments = await prisma.courseEnrollment.findMany({
      where: { studentId: student.id },
      include: {
        course: {
          include: {
            lecturer: { select: { name: true } },
            materials: {
              where: { status: 'PUBLISHED', fileType: 'PDF' },
              orderBy: { createdAt: 'desc' },
            },
          },
        },
      },
    });

    const courseIds = enrollments.map((e) => e.courseId);

    const [topics, assessments, masteries, attempts, activities] = await Promise.all([
      prisma.extractedTopic.findMany({
        where: { courseId: { in: courseIds }, status: 'PUBLISHED' },
        include: {
          material: { select: { id: true, title: true, pageCount: true } },
          subtopics: { orderBy: { orderIndex: 'asc' } },
        },
        orderBy: [{ courseId: 'asc' }, { orderIndex: 'asc' }],
      }),
      prisma.topicAssessment.findMany({
        where: { courseId: { in: courseIds }, status: 'PUBLISHED' },
        include: {
          _count: { select: { questions: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.studentTopicMastery.findMany({
        where: { studentId: student.id },
      }),
      prisma.topicAssessmentAttempt.findMany({
        where: { studentId: student.id, status: { in: ['SUBMITTED', 'NEEDS_MANUAL_GRADING', 'GRADED'] } },
        include: { assessment: { select: { id: true, title: true, topicId: true, courseId: true } } },
        orderBy: { submittedAt: 'desc' },
      }),
      prisma.studentLearningActivity.findMany({
        where: { studentId: student.id },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ]);

    const masteryMap = new Map(masteries.map((m) => [m.topicId, m]));

    const topicsWithProgress = topics.map((t) => {
      const m = masteryMap.get(t.id);
      const topicQuizzes = assessments.filter((a) => a.topicId === t.id);
      return {
        id: t.id,
        courseId: t.courseId,
        materialId: t.materialId,
        materialTitle: t.material.title,
        title: t.title,
        description: t.description,
        summary: t.summary,
        pageStart: t.pageStart,
        pageEnd: t.pageEnd,
        orderIndex: t.orderIndex,
        subtopicsCount: t.subtopics.length,
        quizzesCount: topicQuizzes.length,
        primaryQuizId: topicQuizzes[0]?.id || null,
        mastery: m || {
          opened: false,
          completed: false,
          attemptsCount: 0,
          bestScore: 0,
          latestScore: 0,
          averageScore: 0,
          masteryStatus: 'NOT_STARTED',
        },
      };
    });

    const totalTopics = topicsWithProgress.length;
    const topicsCompleted = topicsWithProgress.filter((t) =>
      ['COMPLETED', 'MASTERED'].includes(t.mastery.masteryStatus)
    ).length;
    const topicsInProgress = topicsWithProgress.filter(
      (t) => t.mastery.masteryStatus === 'IN_PROGRESS'
    ).length;
    const topicsNeedsRevision = topicsWithProgress.filter(
      (t) => t.mastery.masteryStatus === 'NEEDS_REVISION'
    ).length;
    const topicsMastered = topicsWithProgress.filter(
      (t) => t.mastery.masteryStatus === 'MASTERED'
    ).length;

    const attemptedAssessmentIds = new Set(attempts.map((a) => a.assessmentId));
    const pendingQuizzes = assessments.filter((a) => !attemptedAssessmentIds.has(a.id));
    const avgScore =
      attempts.length > 0
        ? Math.round(attempts.reduce((s, a) => s + a.percentage, 0) / attempts.length)
        : 0;

    return NextResponse.json({
      student: {
        id: student.id,
        name: student.user.name,
        studentId: student.studentId,
        level: student.level,
        programme: student.programme?.name,
      },
      stats: {
        enrolledCourses: enrollments.length,
        availableMaterials: enrollments.reduce((s, e) => s + e.course.materials.length, 0),
        totalTopics,
        topicsCompleted,
        topicsInProgress,
        topicsNeedsRevision,
        topicsMastered,
        pendingQuizzes: pendingQuizzes.length,
        completedQuizzes: attemptedAssessmentIds.size,
        averageScore: avgScore,
      },
      courses: enrollments.map((e) => {
        const courseTopics = topicsWithProgress.filter((t) => t.courseId === e.courseId);
        const doneCount = courseTopics.filter((t) =>
          ['COMPLETED', 'MASTERED'].includes(t.mastery.masteryStatus)
        ).length;
        const progress =
          courseTopics.length > 0
            ? Math.round((doneCount / courseTopics.length) * 100)
            : e.progressPercent;

        return {
          id: e.course.id,
          code: e.course.code,
          title: e.course.title,
          description: e.course.description,
          semester: e.course.semester,
          level: e.course.level,
          lecturerName: e.course.lecturer?.name || 'Department Faculty',
          progressPercent: progress,
          materials: e.course.materials.map((m) => ({
            id: m.id,
            title: m.title,
            description: m.description,
            fileSize: m.fileSize,
            pageCount: m.pageCount,
            fileUrl: `/api/admin/learning-materials/${m.id}/pdf`,
          })),
          topics: courseTopics,
          assessments: assessments.filter((a) => a.courseId === e.courseId),
        };
      }),
      recentAttempts: attempts.slice(0, 8),
      recentActivities: activities,
      revisionTopics: topicsWithProgress.filter(
        (t) => t.mastery.masteryStatus === 'NEEDS_REVISION'
      ),
    });
  } catch (error) {
    console.error('GET student/learning-center error:', error);
    return NextResponse.json({ error: 'Failed to load learning center' }, { status: 500 });
  }
}

