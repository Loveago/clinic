import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveStudentRecord } from '@/lib/portal-auth';
import {
  checkExamEligibility,
  isResultPublished,
  safeJsonParse,
} from '@/lib/exam-lifecycle';

export async function GET() {
  try {
    const student = await resolveStudentRecord();
    if (!student) {
      return NextResponse.json({ error: 'Student profile not found' }, { status: 404 });
    }

    const registrations = await prisma.courseRegistration.findMany({
      where: { studentId: student.id, status: { not: 'DROPPED' } },
      select: { courseId: true },
    });
    const registeredCourseIds = Array.from(new Set(registrations.map((r) => r.courseId)));

    const exams = await prisma.examination.findMany({
      where: {
        isPublished: true,
        ...(registeredCourseIds.length > 0 ? { courseId: { in: registeredCourseIds } } : {}),
      },
      include: {
        course: { select: { id: true, code: true, title: true } },
        period: {
          select: { id: true, title: true, status: true, resultsPublishedAt: true },
        },
        sections: {
          orderBy: { orderIndex: 'asc' },
          select: { id: true, title: true, marksAllocated: true, questionCount: true },
        },
        _count: { select: { questions: true } },
        attempts: {
          where: { studentId: student.id },
          orderBy: { startedAt: 'desc' },
        },
      },
      orderBy: [{ scheduledDate: 'asc' }, { createdAt: 'desc' }],
    });

    const unpaidInvoices = await prisma.invoice.findMany({
      where: {
        studentId: student.id,
        balance: { gt: 0 },
        status: { notIn: ['PAID', 'CANCELLED'] },
      },
      select: { balance: true },
    });
    const outstandingBalance = unpaidInvoices.reduce(
      (sum, inv) => sum + (Number(inv.balance) || 0),
      0
    );

    const formatted = [];
    for (const exam of exams) {
      const eligibility = await checkExamEligibility({
        student,
        exam,
        attempts: exam.attempts,
      });

      const activeAttempt = exam.attempts.find((a) => a.status === 'IN_PROGRESS') || null;
      const submittedAttempts = exam.attempts.filter((a) => a.status !== 'IN_PROGRESS');
      const latestSubmitted = submittedAttempts[0] || null;
      const resultPublished = isResultPublished(exam, latestSubmitted);

      const now = new Date();
      const answerKeyReleased =
        !exam.answerKeyReleaseAt || now >= new Date(exam.answerKeyReleaseAt);

      formatted.push({
        id: exam.id,
        title: exam.title,
        examType: exam.examType,
        mode: exam.mode,
        courseId: exam.courseId,
        courseCode: exam.course.code,
        courseName: exam.course.title,
        periodTitle: exam.period?.title || null,
        periodStatus: exam.period?.status || null,
        venue: exam.venue,
        instructions: exam.instructions,
        scheduledDate: exam.scheduledDate,
        scheduledTime: exam.scheduledTime,
        startTime: exam.startTime,
        endTime: exam.endTime,
        durationMinutes: exam.durationMinutes,
        totalMarks: exam.totalMarks,
        passMark: exam.passMark,
        questionCount: exam._count.questions,
        sectionsCount: exam.sections.length,
        status: exam.status,
        maxRetakes: exam.maxRetakes,
        requireFinancialClearance: exam.requireFinancialClearance,
        publicationMode: exam.publicationMode,
        publishAt: exam.publishAt,
        eligibility,
        activeAttempt: activeAttempt
          ? {
              id: activeAttempt.id,
              attemptNumber: activeAttempt.attemptNumber,
              startedAt: activeAttempt.startedAt,
              expiresAt: activeAttempt.expiresAt,
              remainingSeconds: activeAttempt.expiresAt
                ? Math.max(
                    0,
                    Math.floor((new Date(activeAttempt.expiresAt).getTime() - now.getTime()) / 1000)
                  )
                : exam.durationMinutes * 60,
            }
          : null,
        latestAttempt: latestSubmitted
          ? {
              id: latestSubmitted.id,
              attemptNumber: latestSubmitted.attemptNumber,
              status: latestSubmitted.status,
              evaluationStatus: latestSubmitted.evaluationStatus,
              submittedAt: latestSubmitted.submittedAt,
              resultPublished,
              score: resultPublished ? latestSubmitted.score : null,
              percentage: resultPublished ? latestSubmitted.percentage : null,
              passed: resultPublished ? latestSubmitted.percentage >= exam.passMark : null,
              correctCount: resultPublished ? latestSubmitted.correctCount : null,
              totalQuestions: latestSubmitted.totalQuestions,
              answerKeyReleased,
              revisionRecommendations: resultPublished
                ? safeJsonParse(latestSubmitted.revisionRecommendationsJson, [])
                : [],
            }
          : null,
      });
    }

    return NextResponse.json({
      student: {
        id: student.id,
        studentId: student.studentId,
        name: student.user?.name || 'Student',
        status: student.status,
        outstandingBalance,
      },
      exams: formatted,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to load examinations' },
      { status: 500 }
    );
  }
}
