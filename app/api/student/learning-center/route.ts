import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveStudentRecord } from '@/lib/portal-auth';

export async function GET() {
  try {
    const student = await resolveStudentRecord();
    if (!student) {
      return NextResponse.json({ error: 'Student record not found' }, { status: 404 });
    }

    const [enrollments, registrations] = await Promise.all([
      prisma.courseEnrollment.findMany({
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
      }),
      prisma.courseRegistration.findMany({
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
      }),
    ]);

    const courseMap = new Map<string, (typeof enrollments)[number]>();
    for (const e of enrollments) {
      courseMap.set(e.courseId, e);
    }
    for (const r of registrations) {
      if (!courseMap.has(r.courseId)) {
        courseMap.set(r.courseId, {
          id: r.id,
          studentId: r.studentId,
          courseId: r.courseId,
          enrolledAt: r.registeredAt,
          course: r.course,
        } as (typeof enrollments)[number]);
      }
    }

    // Fallback: if student has no explicit enrollments/registrations yet, load their programme courses
    if (courseMap.size === 0 && student.programmeId) {
      const progCourses = await prisma.course.findMany({
        where: { programmeId: student.programmeId },
        include: {
          lecturer: { select: { name: true } },
          materials: {
            where: { status: 'PUBLISHED', fileType: 'PDF' },
            orderBy: { createdAt: 'desc' },
          },
        },
      });
      for (const c of progCourses) {
        courseMap.set(c.id, {
          id: c.id,
          studentId: student.id,
          courseId: c.id,
          enrolledAt: new Date(),
          course: c,
        } as (typeof enrollments)[number]);
      }
    }

    const mergedEnrollments = Array.from(courseMap.values());
    const courseIds = mergedEnrollments.map((e) => e.courseId);

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

    const extractModuleNum = (title: string, fallback: number) => {
      const m = title.match(/module\s*(\d+)/i);
      return m ? Number(m[1]) : 1000 + fallback;
    };

    const masteryMap = new Map(masteries.map((m) => [m.topicId, m]));

    const topicsWithProgress = topics
      .map((t) => {
        const m = masteryMap.get(t.id);
        const topicQuizzes = assessments.filter((a) => a.topicId === t.id);
        const courseObj = mergedEnrollments.find((e) => e.courseId === t.courseId)?.course;
        return {
          id: t.id,
          courseId: t.courseId,
          courseCode: courseObj?.code || '',
          courseTitle: courseObj?.title || '',
          materialId: t.materialId,
          materialTitle: t.material.title,
          moduleNumber: extractModuleNum(t.title, t.orderIndex),
          title: t.title,
          description: t.description,
          summary: t.summary,
          pageStart: t.pageStart,
          pageEnd: t.pageEnd,
          orderIndex: t.orderIndex,
          subtopicsCount: t.subtopics.length,
          quizzesCount: topicQuizzes.length,
          primaryQuizId: topicQuizzes[0]?.id || null,
          fileUrl: `/api/admin/learning-materials/${t.materialId}/pdf`,
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
      })
      .sort((a, b) => a.moduleNumber - b.moduleNumber || a.orderIndex - b.orderIndex);

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
        enrolledCourses: mergedEnrollments.length,
        availableMaterials: mergedEnrollments.reduce((s, e) => s + e.course.materials.length, 0),
        totalTopics,
        topicsCompleted,
        topicsInProgress,
        topicsNeedsRevision,
        topicsMastered,
        pendingQuizzes: pendingQuizzes.length,
        completedQuizzes: attemptedAssessmentIds.size,
        averageScore: avgScore,
      },
      courses: mergedEnrollments.map((e) => {
        const courseTopics = topicsWithProgress.filter((t) => t.courseId === e.courseId);
        const doneCount = courseTopics.filter((t) =>
          ['COMPLETED', 'MASTERED'].includes(t.mastery.masteryStatus)
        ).length;
        const progress =
          courseTopics.length > 0
            ? Math.round((doneCount / courseTopics.length) * 100)
            : e.progressPercent ?? 0;

        return {
          id: e.course.id,
          code: e.course.code,
          title: e.course.title,
          description: e.course.description,
          semester: e.course.semester,
          level: e.course.level,
          lecturerName: e.course.lecturer?.name || 'Department Faculty',
          progressPercent: progress,
          materials: [...e.course.materials]
            .sort((a, b) => extractModuleNum(a.title, 999) - extractModuleNum(b.title, 999))
            .map((m) => ({
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
      orderedModules: topicsWithProgress,
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

