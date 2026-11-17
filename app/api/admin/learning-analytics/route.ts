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
    const courseId = searchParams.get('courseId') || undefined;
    const level = searchParams.get('level') || undefined;
    const format = searchParams.get('format') || 'json';

    const [
      materials,
      jobs,
      topics,
      questions,
      assessments,
      attempts,
      masteries,
      students,
    ] = await Promise.all([
      prisma.learningMaterial.findMany({
        where: { fileType: 'PDF', ...(courseId ? { courseId } : {}) },
        select: { id: true, status: true, processingStatus: true },
      }),
      prisma.pDFProcessingJob.findMany({
        orderBy: { createdAt: 'desc' },
        take: 25,
        include: { material: { select: { id: true, title: true } } },
      }),
      prisma.extractedTopic.findMany({
        where: { ...(courseId ? { courseId } : {}) },
        include: {
          masteries: true,
          questions: { select: { id: true, status: true } },
        },
      }),
      prisma.topicQuestion.findMany({
        where: { ...(courseId ? { courseId } : {}) },
        select: { id: true, status: true, difficulty: true },
      }),
      prisma.topicAssessment.findMany({
        where: { ...(courseId ? { courseId } : {}) },
        select: { id: true, title: true, status: true },
      }),
      prisma.topicAssessmentAttempt.findMany({
        where: {
          status: { in: ['SUBMITTED', 'NEEDS_MANUAL_GRADING', 'GRADED'] },
          ...(courseId ? { assessment: { courseId } } : {}),
        },
        include: {
          assessment: { select: { id: true, title: true, topicId: true, courseId: true } },
        },
        orderBy: { submittedAt: 'desc' },
      }),
      prisma.studentTopicMastery.findMany({
        include: { topic: { select: { id: true, title: true, courseId: true } } },
      }),
      prisma.student.findMany({
        where: { ...(level ? { level } : {}) },
        include: {
          user: { select: { name: true, email: true } },
          programme: { select: { name: true } },
          enrollments: { select: { courseId: true } },
        },
      }),
    ]);

    const overview = {
      totalMaterials: materials.length,
      processedMaterials: materials.filter((m) => m.processingStatus === 'COMPLETED').length,
      processingNow: materials.filter((m) =>
        ['QUEUED', 'PROCESSING', 'EXTRACTING_TEXT', 'IDENTIFYING_TOPICS'].includes(m.processingStatus)
      ).length,
      failedMaterials: materials.filter((m) => m.processingStatus === 'FAILED').length,
      awaitingReview: materials.filter((m) => m.processingStatus === 'REQUIRES_REVIEW').length,
      publishedMaterials: materials.filter((m) => m.status === 'PUBLISHED').length,
      totalTopics: topics.length,
      approvedTopics: topics.filter((t) => ['APPROVED', 'PUBLISHED'].includes(t.status)).length,
      totalQuestions: questions.length,
      approvedQuestions: questions.filter((q) => ['APPROVED', 'PUBLISHED'].includes(q.status)).length,
      totalAssessments: assessments.length,
    };

    const activeLearnerIds = new Set(masteries.filter((m) => m.opened).map((m) => m.studentId));
    const completedTopicsCount = masteries.filter((m) =>
      ['COMPLETED', 'MASTERED'].includes(m.masteryStatus)
    ).length;

    const avgScore =
      attempts.length > 0
        ? Math.round(attempts.reduce((s, a) => s + a.percentage, 0) / attempts.length)
        : 0;
    const passRate =
      attempts.length > 0
        ? Math.round((attempts.filter((a) => a.passed).length / attempts.length) * 100)
        : 0;

    // Topic-level performance analytics
    const topicAnalytics = topics.map((t) => {
      const tMasteries = t.masteries;
      const tAttempts = attempts.filter((a) => a.assessment?.topicId === t.id);
      const accessedCount = tMasteries.filter((m) => m.opened).length;
      const completedCount = tMasteries.filter((m) =>
        ['COMPLETED', 'MASTERED'].includes(m.masteryStatus)
      ).length;
      const tAvg =
        tAttempts.length > 0
          ? Math.round(tAttempts.reduce((s, a) => s + a.percentage, 0) / tAttempts.length)
          : 0;
      const tPass =
        tAttempts.length > 0
          ? Math.round((tAttempts.filter((a) => a.passed).length / tAttempts.length) * 100)
          : 0;

      return {
        id: t.id,
        title: t.title,
        accessedCount,
        completionRate: accessedCount > 0 ? Math.round((completedCount / accessedCount) * 100) : 0,
        quizAttempts: tAttempts.length,
        avgScore: tAvg,
        passRate: tPass,
        needsRevisionCount: tMasteries.filter((m) => m.masteryStatus === 'NEEDS_REVISION').length,
      };
    });

    // Student-level learning reports
    const studentReports = students.map((st) => {
      const stMasteries = masteries.filter((m) => m.studentId === st.id);
      const stAttempts = attempts.filter((a) => a.studentId === st.id);
      const completed = stMasteries.filter((m) =>
        ['COMPLETED', 'MASTERED'].includes(m.masteryStatus)
      ).length;
      const weakTopics = stMasteries
        .filter((m) => m.masteryStatus === 'NEEDS_REVISION')
        .map((m) => m.topic.title);
      const stAvg =
        stAttempts.length > 0
          ? Math.round(stAttempts.reduce((s, a) => s + a.percentage, 0) / stAttempts.length)
          : 0;

      return {
        id: st.id,
        studentRegNo: st.studentId,
        name: st.user.name,
        email: st.user.email,
        programme: st.programme?.name || 'Nursing',
        level: st.level,
        enrolledCourses: st.enrollments.length,
        topicsOpened: stMasteries.filter((m) => m.opened).length,
        topicsCompleted: completed,
        quizAttempts: stAttempts.length,
        averageScore: stAvg,
        weakTopics,
      };
    });

    if (format === 'csv') {
      const header = 'Student ID,Name,Programme,Level,Enrolled Courses,Topics Completed,Quiz Attempts,Average Score (%),Weak Topics\n';
      const rows = studentReports
        .map(
          (r) =>
            `"${r.studentRegNo}","${r.name}","${r.programme}","${r.level}",${r.enrolledCourses},${r.topicsCompleted},${r.quizAttempts},${r.averageScore},"${r.weakTopics.join('; ')}"`
        )
        .join('\n');
      return new NextResponse(header + rows, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="student-learning-analytics.csv"',
        },
      });
    }

    return NextResponse.json({
      overview,
      engagement: {
        totalStudents: students.length,
        activeLearners: activeLearnerIds.size,
        notStarted: Math.max(0, students.length - activeLearnerIds.size),
        topicsCompleted: completedTopicsCount,
        quizAttempts: attempts.length,
        averageScore: avgScore,
        passRate,
      },
      processingHistory: jobs,
      topicAnalytics,
      studentReports,
    });
  } catch (error) {
    console.error('GET learning-analytics error:', error);
    return NextResponse.json({ error: 'Failed to load learning analytics' }, { status: 500 });
  }
}

