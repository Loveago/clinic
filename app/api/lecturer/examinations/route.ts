import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  authorizeLecturer,
  verifyLecturerCourseAccess,
  logAcademicAudit,
} from '@/lib/portal-auth';
import { generateRubricOnce } from '@/lib/auto-grader';
import { generateExaminationFromPdfMaterials } from '@/lib/pdf-exam-generator';
import { normalizeStudyTrack } from '@/lib/study-tracks';

export async function GET(req: NextRequest) {
  try {
    const auth = await authorizeLecturer();
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 403 });
    }

    const { searchParams } = new URL(req.url);
    const courseId = searchParams.get('courseId');
    const examId = searchParams.get('examId');

    if (courseId) {
      const hasAccess = await verifyLecturerCourseAccess(auth.userId!, auth.role!, courseId);
      if (!hasAccess) {
        return NextResponse.json(
          { error: 'Forbidden: You are not assigned to this course.' },
          { status: 403 }
        );
      }
    }

    const isAdmin = auth.role === 'SUPER_ADMIN' || auth.role === 'SCHOOL_ADMIN';
    const where: Record<string, unknown> = {};
    if (examId) where.id = examId;
    if (courseId) {
      where.courseId = courseId;
    } else if (!isAdmin) {
      where.course = {
        OR: [
          { lecturerId: auth.userId! },
          {
            courseLecturers: {
              some: { lecturerId: auth.userId!, isActive: true },
            },
          },
        ],
      };
    }

    const exams = await prisma.examination.findMany({
      where,
      include: {
        course: { select: { id: true, code: true, title: true } },
        period: { select: { id: true, title: true, status: true } },
        sections: { orderBy: { orderIndex: 'asc' } },
        questions: {
          include: {
            answers: {
              select: {
                isCorrect: true,
                marksAwarded: true,
                selectedOption: true,
                answerText: true,
              },
            },
          },
          orderBy: { orderIndex: 'asc' },
        },
        attempts: {
          select: {
            id: true,
            status: true,
            evaluationStatus: true,
            percentage: true,
            score: true,
            submittedAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const examinations = exams.map((exam) => {
      const completedCount = exam.attempts.filter(
        (a) => a.evaluationStatus === 'COMPLETED'
      ).length;
      const failedCount = exam.attempts.filter((a) => a.evaluationStatus === 'FAILED').length;
      const needsVerificationCount = exam.attempts.filter(
        (a) =>
          a.status === 'NEEDS_VERIFICATION' || a.evaluationStatus === 'NEEDS_VERIFICATION'
      ).length;
      const inProgressCount = exam.attempts.filter((a) => a.status === 'IN_PROGRESS').length;

      const questionInsights = exam.questions.map((q) => {
        const answeredCount = q.answers.length;
        const correctCount = q.answers.filter((a) => a.isCorrect === true).length;
        const correctPct =
          answeredCount > 0 ? Math.round((correctCount / answeredCount) * 1000) / 10 : 0;
        const avgMarks =
          answeredCount > 0
            ? Math.round(
                (q.answers.reduce((sum, a) => sum + (a.marksAwarded ?? 0), 0) / answeredCount) *
                  100
              ) / 100
            : 0;

        let difficultyIndicator: 'EASY' | 'MODERATE' | 'HARD' | 'NO_DATA' = 'NO_DATA';
        if (answeredCount > 0) {
          difficultyIndicator =
            correctPct >= 75 ? 'EASY' : correctPct >= 45 ? 'MODERATE' : 'HARD';
        }

        const wrongCounts = new Map<string, number>();
        for (const ans of q.answers) {
          if (ans.isCorrect === false) {
            const val = (ans.selectedOption || ans.answerText || '').trim();
            if (val) {
              wrongCounts.set(val, (wrongCounts.get(val) || 0) + 1);
            }
          }
        }
        const frequentWrongOptions = Array.from(wrongCounts.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([option, count]) => ({ option, count }));

        return {
          id: q.id,
          orderIndex: q.orderIndex,
          questionType: q.questionType,
          difficulty: q.difficulty,
          topicTitle: q.topicTitle,
          text: q.text,
          marks: q.marks,
          answeredCount,
          correctPct,
          avgMarks,
          difficultyIndicator,
          frequentWrongOptions,
        };
      });

      return {
        id: exam.id,
        courseId: exam.courseId,
        course: exam.course,
        period: exam.period,
        title: exam.title,
        examType: exam.examType,
        venue: exam.venue,
        mode: exam.mode,
        durationMinutes: exam.durationMinutes,
        totalMarks: exam.totalMarks,
        passMark: exam.passMark,
        scheduledDate: exam.scheduledDate,
        scheduledTime: exam.scheduledTime,
        status: exam.status,
        publicationMode: exam.publicationMode,
        sections: exam.sections,
        gradingSummary: {
          totalAttempts: exam.attempts.length,
          completedCount,
          failedCount,
          needsVerificationCount,
          inProgressCount,
        },
        questionCount: exam.questions.length,
        questionInsights,
      };
    });

    return NextResponse.json({ examinations });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authorizeLecturer();
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 403 });
    }

    const body = await req.json();

    if (body.action === 'generate_from_pdf') {
      const d = body.data || body;
      const targetCourseId = d.courseId || body.courseId;
      if (!targetCourseId) {
        return NextResponse.json({ error: 'courseId is required' }, { status: 400 });
      }
      const hasAccess = await verifyLecturerCourseAccess(auth.userId!, auth.role!, targetCourseId);
      if (!hasAccess) {
        return NextResponse.json(
          { error: 'Forbidden: You are not assigned to this course.' },
          { status: 403 }
        );
      }
      const generated = await generateExaminationFromPdfMaterials({
        courseId: targetCourseId,
        examId: body.examId || d.examId,
        materialIds: Array.isArray(d.materialIds) ? d.materialIds : undefined,
        topicIds: Array.isArray(d.topicIds) ? d.topicIds : undefined,
        title: d.title,
        examType: d.examType || 'END_OF_SEMESTER',
        studyTrack: d.studyTrack ? normalizeStudyTrack(d.studyTrack) : null,
        objectiveCount: d.objectiveCount,
        writtenCount: d.writtenCount,
        objectiveMarks: d.objectiveMarks,
        writtenMarks: d.writtenMarks,
        durationMinutes: d.durationMinutes,
        passMark: d.passMark,
        scheduledDate: d.scheduledDate,
        scheduledTime: d.scheduledTime,
        venue: d.venue,
        instructions: d.instructions,
        isPublished: d.isPublished,
        status: d.status,
      });
      await logAcademicAudit({
        actorId: auth.userId,
        actorName: auth.name,
        actorRole: auth.role,
        action: 'LECTURER_GENERATE_EXAM_FROM_PDF',
        entityType: 'Examination',
        entityId: generated.exam?.id || targetCourseId,
        details: generated.summary,
      });
      return NextResponse.json({ status: true, ...generated }, { status: 201 });
    }

    const {
      examId,
      sectionId,
      questionType = 'MCQ',
      difficulty = 'MEDIUM',
      topicTitle,
      text,
      options,
      optionsJson,
      correctAnswer = '',
      acceptedAlternatives,
      acceptedAlternativesJson,
      caseSensitive = false,
      partialCredit = true,
      negativeMarks = 0,
      marks = 4,
      expectedAnswer,
      rubricJson,
      requiredConceptsJson,
      criticalErrorsJson,
      explanation,
    } = body;

    if (!examId || !text) {
      return NextResponse.json({ error: 'examId and question text are required' }, { status: 400 });
    }

    const exam = await prisma.examination.findUnique({
      where: { id: examId },
      select: { id: true, courseId: true },
    });

    if (!exam) {
      return NextResponse.json({ error: 'Examination not found' }, { status: 404 });
    }

    const hasAccess = await verifyLecturerCourseAccess(auth.userId!, auth.role!, exam.courseId);
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Forbidden: You are not assigned to this course.' },
        { status: 403 }
      );
    }

    const qType = String(questionType).toUpperCase();
    const numericMarks = Math.max(1, Number(marks) || 4);

    const existingCount = await prisma.question.count({ where: { examId } });

    const finalOptionsJson =
      optionsJson !== undefined
        ? typeof optionsJson === 'string'
          ? optionsJson
          : JSON.stringify(optionsJson)
        : Array.isArray(options)
          ? JSON.stringify(options)
          : '[]';

    let finalExpectedAnswer = expectedAnswer || correctAnswer || null;
    let finalRubricJson =
      rubricJson !== undefined
        ? typeof rubricJson === 'string'
          ? rubricJson
          : JSON.stringify(rubricJson)
        : null;
    let finalRequiredConceptsJson =
      requiredConceptsJson !== undefined
        ? typeof requiredConceptsJson === 'string'
          ? requiredConceptsJson
          : JSON.stringify(requiredConceptsJson)
        : null;
    let finalCriticalErrorsJson =
      criticalErrorsJson !== undefined
        ? typeof criticalErrorsJson === 'string'
          ? criticalErrorsJson
          : JSON.stringify(criticalErrorsJson)
        : null;
    let finalExplanation = explanation || null;

    if (!finalRubricJson || !finalExpectedAnswer) {
      const topics = await prisma.extractedTopic.findMany({
        where: { courseId: exam.courseId, status: { in: ['APPROVED', 'PUBLISHED'] } },
        select: { title: true, summary: true },
        orderBy: { orderIndex: 'asc' },
        take: 3,
      });
      const courseContext =
        topics.length > 0
          ? topics.map((t) => `${t.title}: ${t.summary || ''}`).join('\n')
          : null;

      const generated = await generateRubricOnce({
        promptText: String(text).trim(),
        questionType: qType,
        maxMarks: numericMarks,
        correctAnswer: finalExpectedAnswer,
        courseContext,
      });

      finalExpectedAnswer = finalExpectedAnswer || generated.expectedAnswer;
      finalRubricJson = finalRubricJson || JSON.stringify(generated.rubric);
      finalRequiredConceptsJson =
        finalRequiredConceptsJson || JSON.stringify(generated.requiredConcepts);
      finalCriticalErrorsJson =
        finalCriticalErrorsJson || JSON.stringify(generated.criticalErrors);
      finalExplanation = finalExplanation || generated.explanation;
    }

    const finalAcceptedAlts =
      acceptedAlternativesJson !== undefined
        ? typeof acceptedAlternativesJson === 'string'
          ? acceptedAlternativesJson
          : JSON.stringify(acceptedAlternativesJson)
        : Array.isArray(acceptedAlternatives)
          ? JSON.stringify(acceptedAlternatives)
          : null;

    const question = await prisma.question.create({
      data: {
        examId,
        sectionId: sectionId || null,
        orderIndex: existingCount + 1,
        questionType: qType,
        difficulty: String(difficulty).toUpperCase(),
        topicTitle: topicTitle || null,
        text: String(text).trim(),
        optionsJson: finalOptionsJson,
        correctAnswer: String(correctAnswer || finalExpectedAnswer || ''),
        acceptedAlternativesJson: finalAcceptedAlts,
        caseSensitive: Boolean(caseSensitive),
        partialCredit: Boolean(partialCredit),
        negativeMarks: Math.max(0, Number(negativeMarks) || 0),
        rubricJson: finalRubricJson,
        expectedAnswer: finalExpectedAnswer,
        requiredConceptsJson: finalRequiredConceptsJson,
        criticalErrorsJson: finalCriticalErrorsJson,
        explanation: finalExplanation,
        marks: numericMarks,
      },
    });

    await logAcademicAudit({
      actorId: auth.userId,
      actorName: auth.name,
      actorRole: auth.role,
      action: 'LECTURER_EXAM_QUESTION_ADDED',
      entityType: 'Question',
      entityId: question.id,
      details: { examId, courseId: exam.courseId, questionType: qType, marks: numericMarks },
    });

    return NextResponse.json({ status: true, question }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
