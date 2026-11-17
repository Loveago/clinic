import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  ACADEMIC_ADMIN_ROLES,
  authorizeRole,
  logAcademicAudit,
} from '@/lib/portal-auth';
import {
  evaluateSubjectiveWithAI,
  generateRubricOnce,
  gradeObjectiveAnswer,
  recalculateContinuousAssessment,
} from '@/lib/auto-grader';
import { sendNotificationOnce } from '@/lib/school-admin';

const SUBJECTIVE_TYPES = new Set(['SHORT_ANSWER', 'ESSAY', 'SCENARIO']);
const EXAM_ADMIN_ROLES = [...ACADEMIC_ADMIN_ROLES, 'EXAM_OFFICER'];

function safeParseJson<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function detectExamScheduleConflicts(params: {
  excludeExamId?: string;
  courseId: string;
  cohortId?: string | null;
  startTime?: Date | null;
  endTime?: Date | null;
}) {
  if (!params.startTime || !params.endTime) return [];

  const candidates = await prisma.examination.findMany({
    where: {
      ...(params.excludeExamId ? { id: { not: params.excludeExamId } } : {}),
      status: { not: 'CANCELLED' },
      startTime: { not: null },
      endTime: { not: null },
      OR: [
        { courseId: params.courseId },
        ...(params.cohortId ? [{ cohortId: params.cohortId }] : []),
      ],
    },
    include: {
      course: { select: { code: true, title: true } },
    },
  });

  const s1 = params.startTime.getTime();
  const e1 = params.endTime.getTime();

  return candidates
    .filter((ex) => {
      if (!ex.startTime || !ex.endTime) return false;
      const s2 = ex.startTime.getTime();
      const e2 = ex.endTime.getTime();
      return s1 < e2 && s2 < e1;
    })
    .map((ex) => ({
      examId: ex.id,
      title: ex.title,
      courseCode: ex.course.code,
      courseId: ex.courseId,
      cohortId: ex.cohortId,
      startTime: ex.startTime,
      endTime: ex.endTime,
    }));
}

async function prepareQuestionData(q: any, orderIndex: number, courseContext?: string | null) {
  const qType = String(q.questionType || 'MCQ').toUpperCase();
  const maxMarks = Math.max(1, Number(q.marks) || 4);
  const needsRubric = SUBJECTIVE_TYPES.has(qType) || !q.rubricJson;

  let rubricJson = q.rubricJson
    ? typeof q.rubricJson === 'string'
      ? q.rubricJson
      : JSON.stringify(q.rubricJson)
    : null;
  let expectedAnswer = q.expectedAnswer || null;
  let requiredConceptsJson = q.requiredConceptsJson
    ? typeof q.requiredConceptsJson === 'string'
      ? q.requiredConceptsJson
      : JSON.stringify(q.requiredConceptsJson)
    : null;
  let criticalErrorsJson = q.criticalErrorsJson
    ? typeof q.criticalErrorsJson === 'string'
      ? q.criticalErrorsJson
      : JSON.stringify(q.criticalErrorsJson)
    : null;
  let explanation = q.explanation || null;
  let acceptedAlternativesJson = q.acceptedAlternativesJson
    ? typeof q.acceptedAlternativesJson === 'string'
      ? q.acceptedAlternativesJson
      : JSON.stringify(q.acceptedAlternativesJson)
    : Array.isArray(q.acceptedAlternatives)
    ? JSON.stringify(q.acceptedAlternatives)
    : null;

  if (needsRubric && (SUBJECTIVE_TYPES.has(qType) || !explanation)) {
    const generated = await generateRubricOnce({
      promptText: String(q.text || ''),
      questionType: qType,
      maxMarks,
      correctAnswer: q.correctAnswer ? String(q.correctAnswer) : null,
      courseContext,
    });
    if (!rubricJson) rubricJson = JSON.stringify(generated.rubric);
    if (!expectedAnswer) expectedAnswer = generated.expectedAnswer;
    if (!requiredConceptsJson) requiredConceptsJson = JSON.stringify(generated.requiredConcepts);
    if (!criticalErrorsJson) criticalErrorsJson = JSON.stringify(generated.criticalErrors);
    if (!explanation) explanation = generated.explanation;
    if (!acceptedAlternativesJson && generated.acceptedAlternatives.length > 0) {
      acceptedAlternativesJson = JSON.stringify(generated.acceptedAlternatives);
    }
  }

  return {
    sectionId: q.sectionId || null,
    topicQuestionId: q.topicQuestionId || null,
    orderIndex: Number(q.orderIndex) || orderIndex,
    questionType: qType,
    difficulty: String(q.difficulty || 'MEDIUM').toUpperCase(),
    topicTitle: q.topicTitle || null,
    text: String(q.text || ''),
    optionsJson:
      typeof q.optionsJson === 'string'
        ? q.optionsJson
        : JSON.stringify(Array.isArray(q.options) ? q.options : []),
    correctAnswer: String(q.correctAnswer ?? expectedAnswer ?? ''),
    acceptedAlternativesJson,
    caseSensitive: Boolean(q.caseSensitive),
    partialCredit: q.partialCredit !== undefined ? Boolean(q.partialCredit) : true,
    negativeMarks: Number(q.negativeMarks) || 0,
    rubricJson,
    expectedAnswer,
    requiredConceptsJson,
    criticalErrorsJson,
    explanation,
    marks: maxMarks,
  };
}

export async function GET(req: NextRequest) {
  const auth = await authorizeRole([...EXAM_ADMIN_ROLES, 'LECTURER']);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status || 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const academicYearId = searchParams.get('academicYearId')?.trim() || undefined;
    const semesterId = searchParams.get('semesterId')?.trim() || undefined;
    const programmeId = searchParams.get('programmeId')?.trim() || undefined;
    const courseId = searchParams.get('courseId')?.trim() || undefined;
    const examType = searchParams.get('examType')?.trim() || undefined;
    const status = searchParams.get('status')?.trim() || undefined;
    const periodId = searchParams.get('periodId')?.trim() || undefined;

    const examWhere: any = {};
    if (academicYearId) examWhere.academicYearId = academicYearId;
    if (semesterId) examWhere.semesterId = semesterId;
    if (courseId) examWhere.courseId = courseId;
    if (examType) examWhere.examType = examType;
    if (status) examWhere.status = status;
    if (periodId) examWhere.periodId = periodId;
    if (programmeId) examWhere.course = { programmeId };

    const [
      examinations,
      periods,
      courses,
      cohorts,
      programmes,
      academicYears,
      semesters,
      questionBank,
      caResults,
    ] = await Promise.all([
      prisma.examination.findMany({
        where: examWhere,
        include: {
          course: {
            include: { lecturer: { select: { id: true, name: true } }, programme: true },
          },
          period: true,
          sections: { orderBy: { orderIndex: 'asc' } },
          questions: { orderBy: { orderIndex: 'asc' } },
          attempts: {
            include: {
              student: {
                include: { user: { select: { id: true, name: true, email: true } } },
              },
            },
            orderBy: { submittedAt: 'desc' },
          },
          _count: { select: { attempts: true, questions: true } },
        },
        orderBy: { scheduledDate: 'desc' },
      }),
      prisma.examinationPeriod.findMany({
        include: { _count: { select: { examinations: true } } },
        orderBy: { startDate: 'desc' },
      }),
      prisma.course.findMany({
        include: { programme: { select: { id: true, code: true, name: true } } },
        orderBy: { code: 'asc' },
      }),
      prisma.cohort.findMany({
        include: { programme: { select: { id: true, code: true, name: true } } },
        orderBy: { name: 'asc' },
      }),
      prisma.programme.findMany({ orderBy: { code: 'asc' } }),
      prisma.academicYear.findMany({ orderBy: { name: 'desc' } }),
      prisma.semester.findMany({ include: { academicYear: true }, orderBy: { startDate: 'desc' } }),
      prisma.topicQuestion.findMany({
        where: { status: { in: ['APPROVED', 'PUBLISHED'] } },
        include: { topic: { select: { id: true, title: true } } },
        orderBy: { createdAt: 'desc' },
        take: 250,
      }),
      prisma.continuousAssessment.findMany({
        include: {
          student: { include: { user: true, programme: true } },
          course: true,
        },
        orderBy: { updatedAt: 'desc' },
        take: 100,
      }),
    ]);

    const filteredCourseIds = Array.from(new Set(examinations.map((e) => e.courseId)));
    const registeredStudentRows =
      filteredCourseIds.length > 0
        ? await prisma.courseRegistration.findMany({
            where: { courseId: { in: filteredCourseIds }, status: 'APPROVED' },
            select: { studentId: true },
          })
        : [];

    const studentsScheduledSet = new Set(registeredStudentRows.map((r) => r.studentId));
    const allAttempts = examinations.flatMap((e) => e.attempts);
    const completedAttempts = allAttempts.filter((a) => a.status !== 'IN_PROGRESS');
    const studentsCompletedSet = new Set(completedAttempts.map((a) => a.studentId));

    const gradedAttempts = completedAttempts.filter((a) => a.evaluationStatus !== 'FAILED');
    const avgScore =
      gradedAttempts.length > 0
        ? Number(
            (
              gradedAttempts.reduce((sum, a) => sum + a.percentage, 0) / gradedAttempts.length
            ).toFixed(1)
          )
        : 0;

    let passedCount = 0;
    for (const ex of examinations) {
      for (const att of ex.attempts) {
        if (att.status !== 'IN_PROGRESS' && att.evaluationStatus !== 'FAILED') {
          if (att.percentage >= ex.passMark) passedCount += 1;
        }
      }
    }
    const passRate =
      gradedAttempts.length > 0
        ? Number(((passedCount / gradedAttempts.length) * 100).toFixed(1))
        : 0;
    const failRate = gradedAttempts.length > 0 ? Number((100 - passRate).toFixed(1)) : 0;

    const kpis = {
      total: examinations.length,
      upcoming: examinations.filter((e) => e.status === 'UPCOMING').length,
      ongoing: examinations.filter((e) => e.status === 'ACTIVE').length,
      completed: examinations.filter((e) => e.status === 'CONCLUDED' || e.status === 'COMPLETED')
        .length,
      cancelled: examinations.filter((e) => e.status === 'CANCELLED').length,
      studentsScheduled: studentsScheduledSet.size,
      studentsCompleted: studentsCompletedSet.size,
      studentsNotStarted: Math.max(0, studentsScheduledSet.size - studentsCompletedSet.size),
      avgScore,
      passRate,
      failRate,
    };

    return NextResponse.json({
      kpis,
      periods,
      examinations: examinations.map((e) => ({
        ...e,
        attemptsCount: e._count.attempts,
      })),
      courses,
      cohorts,
      programmes,
      academicYears,
      semesters,
      questionBank,
      caResults,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await authorizeRole(EXAM_ADMIN_ROLES);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status || 403 });
  }

  try {
    const body = await req.json();
    const { action, caResultId, examData, examId, question, questions } = body;

    if (action === 'approve_result' && caResultId) {
      const updated = await prisma.continuousAssessment.update({
        where: { id: caResultId },
        data: { isApproved: true, isPublished: true, status: 'PUBLISHED', publishedAt: new Date() },
      });
      return NextResponse.json({ status: true, result: updated });
    }

    if (action === 'create_period') {
      const { title, academicYearId, semesterId, programmeId, startDate, endDate, instructions, status } =
        body.data || body;
      if (!title || !startDate || !endDate) {
        return NextResponse.json(
          { error: 'title, startDate, and endDate are required' },
          { status: 400 }
        );
      }
      const period = await prisma.examinationPeriod.create({
        data: {
          title: String(title).trim(),
          academicYearId: academicYearId || null,
          semesterId: semesterId || null,
          programmeId: programmeId || null,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          instructions: instructions || null,
          status: status || 'DRAFT',
        },
      });
      await logAcademicAudit({
        actorId: auth.userId,
        actorName: auth.name,
        actorRole: auth.role,
        action: 'CREATE_EXAM_PERIOD',
        entityType: 'ExaminationPeriod',
        entityId: period.id,
        details: period,
      });
      return NextResponse.json({ status: true, period }, { status: 201 });
    }

    if (action === 'update_period') {
      const id = body.periodId || body.id || body.data?.id;
      const d = body.data || body;
      if (!id) return NextResponse.json({ error: 'periodId is required' }, { status: 400 });

      const period = await prisma.examinationPeriod.update({
        where: { id },
        data: {
          ...(d.title !== undefined ? { title: String(d.title).trim() } : {}),
          ...(d.academicYearId !== undefined ? { academicYearId: d.academicYearId || null } : {}),
          ...(d.semesterId !== undefined ? { semesterId: d.semesterId || null } : {}),
          ...(d.programmeId !== undefined ? { programmeId: d.programmeId || null } : {}),
          ...(d.startDate !== undefined ? { startDate: new Date(d.startDate) } : {}),
          ...(d.endDate !== undefined ? { endDate: new Date(d.endDate) } : {}),
          ...(d.instructions !== undefined ? { instructions: d.instructions || null } : {}),
          ...(d.status !== undefined ? { status: d.status } : {}),
        },
      });
      await logAcademicAudit({
        actorId: auth.userId,
        actorName: auth.name,
        actorRole: auth.role,
        action: 'UPDATE_EXAM_PERIOD',
        entityType: 'ExaminationPeriod',
        entityId: id,
        details: d,
      });
      return NextResponse.json({ status: true, period });
    }

    if (action === 'delete_period') {
      const id = body.periodId || body.id;
      if (!id) return NextResponse.json({ error: 'periodId is required' }, { status: 400 });

      const linkedExams = await prisma.examination.findMany({
        where: { periodId: id },
        include: { _count: { select: { attempts: true } } },
      });

      const blocked = linkedExams.some(
        (ex) =>
          ex.status === 'CONCLUDED' ||
          ex.status === 'COMPLETED' ||
          ex._count.attempts > 0
      );
      if (blocked) {
        return NextResponse.json(
          {
            error:
              'Cannot delete examination period with concluded/completed exams or existing student attempts.',
          },
          { status: 409 }
        );
      }

      await prisma.examinationPeriod.delete({ where: { id } });
      await logAcademicAudit({
        actorId: auth.userId,
        actorName: auth.name,
        actorRole: auth.role,
        action: 'DELETE_EXAM_PERIOD',
        entityType: 'ExaminationPeriod',
        entityId: id,
      });
      return NextResponse.json({ status: true, id });
    }

    if (action === 'add_section' && examId) {
      const d = body.section || body.data || body;
      if (!d.title) {
        return NextResponse.json({ error: 'Section title is required' }, { status: 400 });
      }
      const existingCount = await prisma.examinationSection.count({ where: { examId } });
      const section = await prisma.examinationSection.create({
        data: {
          examId,
          title: String(d.title).trim(),
          instructions: d.instructions || null,
          orderIndex: Number(d.orderIndex) || existingCount + 1,
          marksAllocated: Number(d.marksAllocated) || 0,
          questionCount: Number(d.questionCount) || 0,
          selectionRule: d.selectionRule || 'FIXED',
        },
      });
      await logAcademicAudit({
        actorId: auth.userId,
        actorName: auth.name,
        actorRole: auth.role,
        action: 'ADD_EXAM_SECTION',
        entityType: 'ExaminationSection',
        entityId: section.id,
        details: section,
      });
      return NextResponse.json({ status: true, section }, { status: 201 });
    }

    if (action === 'add_question' && examId) {
      const exam = await prisma.examination.findUnique({
        where: { id: examId },
        include: {
          course: { select: { title: true, description: true } },
          questions: { select: { id: true } },
        },
      });
      if (!exam) {
        return NextResponse.json({ error: 'Examination not found' }, { status: 404 });
      }
      const list = Array.isArray(questions) ? questions : question ? [question] : [];
      if (list.length === 0) {
        return NextResponse.json({ error: 'question or questions is required' }, { status: 400 });
      }

      const courseContext = `${exam.course.title}: ${exam.course.description}`;
      const created = [];
      let nextOrder = exam.questions.length + 1;
      for (const q of list) {
        const prepared = await prepareQuestionData(q, nextOrder++, courseContext);
        const row = await prisma.question.create({
          data: { examId, ...prepared },
        });
        created.push(row);
      }

      await logAcademicAudit({
        actorId: auth.userId,
        actorName: auth.name,
        actorRole: auth.role,
        action: 'ADD_EXAM_QUESTIONS',
        entityType: 'Examination',
        entityId: examId,
        details: { count: created.length },
      });

      return NextResponse.json({ status: true, questions: created }, { status: 201 });
    }

    if (action === 'import_bank_questions' && examId) {
      const { questionIds, sectionId, marksOverride } = body;
      if (!Array.isArray(questionIds) || questionIds.length === 0) {
        return NextResponse.json({ error: 'questionIds array is required' }, { status: 400 });
      }

      const [exam, section, bankQuestions] = await Promise.all([
        prisma.examination.findUnique({
          where: { id: examId },
          include: { questions: { select: { id: true, marks: true, sectionId: true } } },
        }),
        sectionId
          ? prisma.examinationSection.findUnique({ where: { id: sectionId } })
          : Promise.resolve(null),
        prisma.topicQuestion.findMany({
          where: {
            id: { in: questionIds },
            status: { in: ['APPROVED', 'PUBLISHED'] },
          },
          include: { topic: { select: { title: true } } },
        }),
      ]);

      if (!exam) {
        return NextResponse.json({ error: 'Examination not found' }, { status: 404 });
      }
      if (bankQuestions.length === 0) {
        return NextResponse.json(
          { error: 'No approved/published TopicQuestions found for provided IDs.' },
          { status: 400 }
        );
      }

      const addedMarks = bankQuestions.reduce(
        (sum, q) => sum + (marksOverride ? Number(marksOverride) : q.marks),
        0
      );

      if (section && section.marksAllocated > 0) {
        const currentSectionMarks = exam.questions
          .filter((q) => q.sectionId === section.id)
          .reduce((sum, q) => sum + q.marks, 0);
        if (currentSectionMarks + addedMarks > section.marksAllocated) {
          return NextResponse.json(
            {
              error: `Importing ${addedMarks} marks exceeds section allocated marks (${currentSectionMarks}/${section.marksAllocated}).`,
            },
            { status: 400 }
          );
        }
      } else if (exam.totalMarks > 0) {
        const currentTotalMarks = exam.questions.reduce((sum, q) => sum + q.marks, 0);
        if (currentTotalMarks + addedMarks > exam.totalMarks) {
          return NextResponse.json(
            {
              error: `Importing ${addedMarks} marks exceeds exam totalMarks (${currentTotalMarks}/${exam.totalMarks}).`,
            },
            { status: 400 }
          );
        }
      }

      // Copy directly reusing stored rubricJson/expectedAnswer with 0 AI calls
      let nextOrder = exam.questions.length + 1;
      const imported = [];
      for (const tq of bankQuestions) {
        const created = await prisma.question.create({
          data: {
            examId,
            sectionId: sectionId || null,
            topicQuestionId: tq.id,
            orderIndex: nextOrder++,
            questionType: tq.questionType,
            difficulty: tq.difficulty,
            topicTitle: tq.topic?.title || null,
            text: tq.questionText,
            optionsJson: tq.optionsJson || '[]',
            correctAnswer: tq.correctAnswer,
            acceptedAlternativesJson: tq.acceptedAlternativesJson,
            caseSensitive: tq.caseSensitive,
            partialCredit: tq.partialCredit,
            negativeMarks: tq.negativeMarks,
            rubricJson: tq.rubricJson,
            expectedAnswer: tq.expectedAnswer || tq.markingGuide || null,
            requiredConceptsJson: tq.requiredConceptsJson,
            criticalErrorsJson: tq.criticalErrorsJson,
            explanation: tq.explanation,
            marks: marksOverride ? Number(marksOverride) : tq.marks,
          },
        });
        imported.push(created);
      }

      await logAcademicAudit({
        actorId: auth.userId,
        actorName: auth.name,
        actorRole: auth.role,
        action: 'IMPORT_BANK_QUESTIONS',
        entityType: 'Examination',
        entityId: examId,
        details: { importedCount: imported.length, sectionId: sectionId || null },
      });

      return NextResponse.json({ status: true, importedCount: imported.length, questions: imported }, { status: 201 });
    }

    if (action === 'schedule_exam' && examId) {
      const d = body.data || body;
      const exam = await prisma.examination.findUnique({ where: { id: examId } });
      if (!exam) return NextResponse.json({ error: 'Examination not found' }, { status: 404 });

      const startTime = d.startTime ? new Date(d.startTime) : exam.startTime;
      const endTime = d.endTime ? new Date(d.endTime) : exam.endTime;
      const cohortId = d.cohortId !== undefined ? d.cohortId || null : exam.cohortId;

      if (startTime && endTime && endTime <= startTime) {
        return NextResponse.json({ error: 'endTime must be after startTime' }, { status: 400 });
      }

      const conflicts = await detectExamScheduleConflicts({
        excludeExamId: examId,
        courseId: exam.courseId,
        cohortId,
        startTime,
        endTime,
      });

      if (conflicts.length > 0 && !d.overrideConflict) {
        return NextResponse.json(
          { error: 'Examination schedule conflict detected.', conflicts },
          { status: 409 }
        );
      }

      const updated = await prisma.examination.update({
        where: { id: examId },
        data: {
          ...(d.scheduledDate !== undefined ? { scheduledDate: d.scheduledDate } : {}),
          ...(d.scheduledTime !== undefined ? { scheduledTime: d.scheduledTime } : {}),
          ...(d.venue !== undefined ? { venue: d.venue } : {}),
          ...(d.mode !== undefined ? { mode: d.mode } : {}),
          cohortId,
          startTime,
          endTime,
        },
      });

      await logAcademicAudit({
        actorId: auth.userId,
        actorName: auth.name,
        actorRole: auth.role,
        action: 'SCHEDULE_EXAMINATION',
        entityType: 'Examination',
        entityId: examId,
        details: { scheduledDate: updated.scheduledDate, startTime, endTime, conflictsCount: conflicts.length },
      });

      return NextResponse.json({ status: true, exam: updated, conflicts });
    }

    if (action === 'cancel_exam' && examId) {
      const exam = await prisma.examination.findUnique({
        where: { id: examId },
        include: { course: { select: { code: true, title: true } } },
      });
      if (!exam) return NextResponse.json({ error: 'Examination not found' }, { status: 404 });

      const updated = await prisma.examination.update({
        where: { id: examId },
        data: { status: 'CANCELLED', isPublished: false },
      });

      const regs = await prisma.courseRegistration.findMany({
        where: { courseId: exam.courseId, status: 'APPROVED' },
        include: { student: { select: { userId: true } } },
      });
      for (const r of regs) {
        if (r.student?.userId) {
          await sendNotificationOnce({
            userId: r.student.userId,
            title: `Examination Cancelled: ${exam.course.code}`,
            message: `${exam.title} (${exam.course.code}) scheduled for ${exam.scheduledDate} has been cancelled.`,
            type: 'exam',
            link: '/portal/student/exams',
            dedupeKey: `exam-cancelled-${exam.id}-${r.student.userId}`,
          });
        }
      }

      await logAcademicAudit({
        actorId: auth.userId,
        actorName: auth.name,
        actorRole: auth.role,
        action: 'CANCEL_EXAMINATION',
        entityType: 'Examination',
        entityId: examId,
        details: { notifiedCount: regs.length, reason: body.reason || null },
      });

      return NextResponse.json({ status: true, exam: updated, notifiedCount: regs.length });
    }

    if (action === 'create_exam' && examData) {
      const startTime = examData.startTime ? new Date(examData.startTime) : null;
      const endTime = examData.endTime ? new Date(examData.endTime) : null;

      if (startTime && endTime && endTime <= startTime) {
        return NextResponse.json({ error: 'endTime must be after startTime' }, { status: 400 });
      }

      const conflicts = await detectExamScheduleConflicts({
        courseId: examData.courseId,
        cohortId: examData.cohortId || null,
        startTime,
        endTime,
      });

      if (conflicts.length > 0 && !examData.overrideConflict) {
        return NextResponse.json(
          { error: 'Examination schedule conflict detected.', conflicts },
          { status: 409 }
        );
      }

      const course = await prisma.course.findUnique({
        where: { id: examData.courseId },
        select: { title: true, description: true },
      });
      const courseContext = course ? `${course.title}: ${course.description}` : null;

      const exam = await prisma.examination.create({
        data: {
          courseId: examData.courseId,
          periodId: examData.periodId || null,
          title: examData.title,
          examType: examData.examType || 'END_OF_SEMESTER',
          academicYearId: examData.academicYearId || null,
          semesterId: examData.semesterId || null,
          cohortId: examData.cohortId || null,
          instructions: examData.instructions || 'Answer all questions. Calculators allowed.',
          venue: examData.venue || 'CBT Lab & Online Portal',
          durationMinutes: Number(examData.durationMinutes) || 45,
          totalMarks: Number(examData.totalMarks) || 100,
          passMark: Number(examData.passMark) || 50,
          scheduledDate: examData.scheduledDate || new Date().toISOString().slice(0, 10),
          scheduledTime: examData.scheduledTime || '09:00 AM',
          startTime,
          endTime,
          mode: examData.mode || 'ONLINE',
          randomizeQuestions: Boolean(examData.randomizeQuestions),
          randomizeOptions: Boolean(examData.randomizeOptions),
          selectionMode: examData.selectionMode || 'FIXED',
          publicationMode: examData.publicationMode || 'IMMEDIATE',
          publishAt: examData.publishAt ? new Date(examData.publishAt) : null,
          requireFinancialClearance: Boolean(examData.requireFinancialClearance),
          integrityPolicyJson: examData.integrityPolicyJson
            ? typeof examData.integrityPolicyJson === 'string'
              ? examData.integrityPolicyJson
              : JSON.stringify(examData.integrityPolicyJson)
            : null,
          maxRetakes: Number(examData.maxRetakes) || 1,
          status: examData.status || 'UPCOMING',
          isPublished: examData.isPublished !== undefined ? Boolean(examData.isPublished) : true,
          allowReview: examData.allowReview !== undefined ? Boolean(examData.allowReview) : true,
          showExplanations:
            examData.showExplanations !== undefined ? Boolean(examData.showExplanations) : true,
          answerKeyReleaseAt: examData.answerKeyReleaseAt
            ? new Date(examData.answerKeyReleaseAt)
            : null,
          requireVerificationBeforePublish: Boolean(examData.requireVerificationBeforePublish),
        },
      });

      const createdSections = [];
      if (Array.isArray(examData.sections) && examData.sections.length > 0) {
        let sIdx = 1;
        for (const sec of examData.sections) {
          const createdSec = await prisma.examinationSection.create({
            data: {
              examId: exam.id,
              title: String(sec.title || `Section ${sIdx}`),
              instructions: sec.instructions || null,
              orderIndex: Number(sec.orderIndex) || sIdx++,
              marksAllocated: Number(sec.marksAllocated) || 0,
              questionCount: Number(sec.questionCount) || 0,
              selectionRule: sec.selectionRule || 'FIXED',
            },
          });
          createdSections.push(createdSec);
        }
      }

      const createdQuestions = [];
      if (Array.isArray(examData.questions) && examData.questions.length > 0) {
        let idx = 1;
        for (const q of examData.questions) {
          const prepared = await prepareQuestionData(q, idx++, courseContext);
          const createdQ = await prisma.question.create({
            data: { examId: exam.id, ...prepared },
          });
          createdQuestions.push(createdQ);
        }
      }

      await logAcademicAudit({
        actorId: auth.userId,
        actorName: auth.name,
        actorRole: auth.role,
        action: 'CREATE_EXAMINATION',
        entityType: 'Examination',
        entityId: exam.id,
        details: {
          title: exam.title,
          sectionsCount: createdSections.length,
          questionsCount: createdQuestions.length,
        },
      });

      return NextResponse.json(
        { status: true, exam, sections: createdSections, questions: createdQuestions, conflicts },
        { status: 201 }
      );
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await authorizeRole(EXAM_ADMIN_ROLES);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status || 403 });
  }

  try {
    const body = await req.json();
    const { action, examId, periodId, attemptIds, examData } = body;

    if (action === 'update_exam' && examId) {
      const d = examData || body.data || body;
      const updated = await prisma.examination.update({
        where: { id: examId },
        data: {
          ...(d.title !== undefined ? { title: d.title } : {}),
          ...(d.examType !== undefined ? { examType: d.examType } : {}),
          ...(d.instructions !== undefined ? { instructions: d.instructions } : {}),
          ...(d.venue !== undefined ? { venue: d.venue } : {}),
          ...(d.durationMinutes !== undefined ? { durationMinutes: Number(d.durationMinutes) } : {}),
          ...(d.totalMarks !== undefined ? { totalMarks: Number(d.totalMarks) } : {}),
          ...(d.passMark !== undefined ? { passMark: Number(d.passMark) } : {}),
          ...(d.status !== undefined ? { status: d.status } : {}),
          ...(d.mode !== undefined ? { mode: d.mode } : {}),
          ...(d.isPublished !== undefined ? { isPublished: Boolean(d.isPublished) } : {}),
          ...(d.randomizeQuestions !== undefined
            ? { randomizeQuestions: Boolean(d.randomizeQuestions) }
            : {}),
          ...(d.randomizeOptions !== undefined
            ? { randomizeOptions: Boolean(d.randomizeOptions) }
            : {}),
          ...(d.selectionMode !== undefined ? { selectionMode: d.selectionMode } : {}),
          ...(d.publicationMode !== undefined ? { publicationMode: d.publicationMode } : {}),
          ...(d.publishAt !== undefined
            ? { publishAt: d.publishAt ? new Date(d.publishAt) : null }
            : {}),
          ...(d.requireFinancialClearance !== undefined
            ? { requireFinancialClearance: Boolean(d.requireFinancialClearance) }
            : {}),
          ...(d.maxRetakes !== undefined ? { maxRetakes: Number(d.maxRetakes) } : {}),
          ...(d.allowReview !== undefined ? { allowReview: Boolean(d.allowReview) } : {}),
          ...(d.showExplanations !== undefined
            ? { showExplanations: Boolean(d.showExplanations) }
            : {}),
          ...(d.answerKeyReleaseAt !== undefined
            ? { answerKeyReleaseAt: d.answerKeyReleaseAt ? new Date(d.answerKeyReleaseAt) : null }
            : {}),
          ...(d.requireVerificationBeforePublish !== undefined
            ? { requireVerificationBeforePublish: Boolean(d.requireVerificationBeforePublish) }
            : {}),
        },
      });
      await logAcademicAudit({
        actorId: auth.userId,
        actorName: auth.name,
        actorRole: auth.role,
        action: 'UPDATE_EXAMINATION',
        entityType: 'Examination',
        entityId: examId,
        details: d,
      });
      return NextResponse.json({ status: true, exam: updated });
    }

    if (action === 'publish_exam_results' && examId) {
      const now = new Date();
      const exam = await prisma.examination.update({
        where: { id: examId },
        data: {
          isPublished: true,
          publicationMode: 'IMMEDIATE',
          publishAt: now,
        },
      });

      const attempts = await prisma.examAttempt.findMany({
        where: { examId, evaluationStatus: 'NEEDS_VERIFICATION' },
        include: { student: { include: { user: { select: { id: true } } } } },
      });

      for (const att of attempts) {
        await prisma.examAttempt.update({
          where: { id: att.id },
          data: { evaluationStatus: 'COMPLETED', status: 'GRADED', autoGradedAt: att.autoGradedAt || now },
        });
        await recalculateContinuousAssessment(att.studentId, exam.courseId);
        if (att.student?.user?.id) {
          await sendNotificationOnce({
            userId: att.student.user.id,
            title: `Exam Result Published: ${exam.title}`,
            message: `Your score (${att.percentage}%) for ${exam.title} is now available.`,
            type: 'exam',
            link: '/portal/student/exams',
            dedupeKey: `exam-published-${att.id}`,
          });
        }
      }

      await logAcademicAudit({
        actorId: auth.userId,
        actorName: auth.name,
        actorRole: auth.role,
        action: 'PUBLISH_EXAM_RESULTS',
        entityType: 'Examination',
        entityId: examId,
        details: { promotedAttempts: attempts.length },
      });

      return NextResponse.json({ status: true, exam, publishedCount: attempts.length });
    }

    if (action === 'publish_period_results' && periodId) {
      const now = new Date();
      const period = await prisma.examinationPeriod.update({
        where: { id: periodId },
        data: { status: 'PUBLISHED', resultsPublishedAt: now },
      });

      const exams = await prisma.examination.findMany({
        where: { periodId },
        select: { id: true, title: true, courseId: true },
      });
      const examIds = exams.map((e) => e.id);

      await prisma.examination.updateMany({
        where: { periodId },
        data: { isPublished: true, publishAt: now },
      });

      const attempts =
        examIds.length > 0
          ? await prisma.examAttempt.findMany({
              where: { examId: { in: examIds }, evaluationStatus: 'NEEDS_VERIFICATION' },
              include: {
                exam: { select: { title: true, courseId: true } },
                student: { include: { user: { select: { id: true } } } },
              },
            })
          : [];

      for (const att of attempts) {
        await prisma.examAttempt.update({
          where: { id: att.id },
          data: { evaluationStatus: 'COMPLETED', status: 'GRADED', autoGradedAt: att.autoGradedAt || now },
        });
        await recalculateContinuousAssessment(att.studentId, att.exam.courseId);
        if (att.student?.user?.id) {
          await sendNotificationOnce({
            userId: att.student.user.id,
            title: `Exam Result Published: ${att.exam.title}`,
            message: `Results for ${period.title} have been published (${att.percentage}%).`,
            type: 'exam',
            link: '/portal/student/exams',
            dedupeKey: `exam-published-${att.id}`,
          });
        }
      }

      await logAcademicAudit({
        actorId: auth.userId,
        actorName: auth.name,
        actorRole: auth.role,
        action: 'PUBLISH_PERIOD_RESULTS',
        entityType: 'ExaminationPeriod',
        entityId: periodId,
        details: { examsCount: exams.length, promotedAttempts: attempts.length },
      });

      return NextResponse.json({ status: true, period, publishedCount: attempts.length });
    }

    if (action === 'retry_failed_grading') {
      const where: any = { evaluationStatus: 'FAILED' };
      if (examId) where.examId = examId;
      if (Array.isArray(attemptIds) && attemptIds.length > 0) {
        where.id = { in: attemptIds };
      }

      const attempts = await prisma.examAttempt.findMany({
        where,
        include: {
          exam: {
            include: {
              course: { select: { id: true, title: true, description: true } },
              questions: { orderBy: { orderIndex: 'asc' } },
            },
          },
        },
      });

      if (attempts.length === 0) {
        return NextResponse.json({ status: true, retriedCount: 0, attempts: [] });
      }

      const updatedAttempts = [];
      for (const attempt of attempts) {
        const answersMap = safeParseJson<Record<string, string>>(attempt.answersJson, {});
        const questions = attempt.exam.questions;
        const courseContext = `${attempt.exam.course.title}: ${attempt.exam.course.description}`;

        let totalAwarded = 0;
        let totalPossible = 0;
        let correctCount = 0;
        let anyFailed = false;
        const details: any[] = [];

        for (const q of questions) {
          totalPossible += q.marks;
          const studentAnswer = String(answersMap[q.id] ?? '');

          if (SUBJECTIVE_TYPES.has(q.questionType.toUpperCase())) {
            const evalRes = await evaluateSubjectiveWithAI({
              questionText: q.text,
              questionType: q.questionType,
              maxMarks: q.marks,
              expectedAnswer: q.expectedAnswer || q.correctAnswer,
              acceptedAlternativesJson: q.acceptedAlternativesJson,
              rubricJson: q.rubricJson,
              requiredConceptsJson: q.requiredConceptsJson,
              criticalErrorsJson: q.criticalErrorsJson,
              courseContext,
              studentAnswer,
            });
            if (evalRes.status === 'FAILED') {
              anyFailed = true;
            }
            totalAwarded += evalRes.awardedMarks;
            if (evalRes.awardedMarks >= q.marks * 0.5) correctCount += 1;
            details.push({
              questionId: q.id,
              questionType: q.questionType,
              maxMarks: q.marks,
              awardedMarks: evalRes.awardedMarks,
              feedback: evalRes.explanation,
              conceptsCorrect: evalRes.conceptsCorrect,
              conceptsMissing: evalRes.conceptsMissing,
              criticalErrors: evalRes.incorrectClaims,
              status: evalRes.status,
            });
          } else {
            const objRes = gradeObjectiveAnswer(q, studentAnswer);
            totalAwarded += objRes.marksAwarded;
            if (objRes.isCorrect) correctCount += 1;
            details.push({
              questionId: q.id,
              questionType: q.questionType,
              maxMarks: q.marks,
              awardedMarks: objRes.marksAwarded,
              isCorrect: objRes.isCorrect,
              isPartial: objRes.isPartial,
              feedback: objRes.feedback,
              status: 'COMPLETED',
            });
          }
        }

        const clampedScore = Math.max(0, Math.round(totalAwarded));
        const percentage =
          totalPossible > 0
            ? Math.max(0, Math.min(100, Math.round((totalAwarded / totalPossible) * 100)))
            : 0;

        const nextEvalStatus = anyFailed
          ? 'FAILED'
          : attempt.exam.requireVerificationBeforePublish
          ? 'NEEDS_VERIFICATION'
          : 'COMPLETED';

        const updated = await prisma.examAttempt.update({
          where: { id: attempt.id },
          data: {
            score: clampedScore,
            correctCount,
            percentage,
            status: anyFailed ? 'SUBMITTED' : 'GRADED',
            evaluationStatus: nextEvalStatus,
            evaluationDetailsJson: JSON.stringify(details),
            autoGradedAt: anyFailed ? null : new Date(),
            errorMessage: anyFailed ? 'One or more subjective questions failed AI evaluation.' : null,
            retryCount: { increment: 1 },
          },
        });
        updatedAttempts.push(updated);

        if (nextEvalStatus === 'COMPLETED') {
          await recalculateContinuousAssessment(attempt.studentId, attempt.exam.courseId);
        }
      }

      await logAcademicAudit({
        actorId: auth.userId,
        actorName: auth.name,
        actorRole: auth.role,
        action: 'RETRY_FAILED_EXAM_GRADING',
        entityType: 'ExamAttempt',
        entityId: updatedAttempts.map((a) => a.id).join(','),
        details: { retriedCount: updatedAttempts.length },
      });

      return NextResponse.json({
        status: true,
        retriedCount: updatedAttempts.length,
        attempts: updatedAttempts,
      });
    }

    if (action === 'publish_verified_results') {
      const where: any = { evaluationStatus: 'NEEDS_VERIFICATION' };
      if (examId) where.examId = examId;
      if (Array.isArray(attemptIds) && attemptIds.length > 0) {
        where.id = { in: attemptIds };
      }

      const attempts = await prisma.examAttempt.findMany({
        where,
        include: {
          exam: { select: { id: true, title: true, courseId: true } },
          student: { include: { user: { select: { id: true } } } },
        },
      });

      const published = [];
      for (const attempt of attempts) {
        const updated = await prisma.examAttempt.update({
          where: { id: attempt.id },
          data: {
            evaluationStatus: 'COMPLETED',
            status: 'GRADED',
            autoGradedAt: attempt.autoGradedAt || new Date(),
          },
        });
        published.push(updated);
        await recalculateContinuousAssessment(attempt.studentId, attempt.exam.courseId);

        if (attempt.student?.user?.id) {
          await sendNotificationOnce({
            userId: attempt.student.user.id,
            title: `Exam Result Published: ${attempt.exam.title}`,
            message: `Your verified examination score (${attempt.percentage}%) for ${attempt.exam.title} has been published.`,
            type: 'exam',
            link: '/portal/student/results',
            dedupeKey: `exam-published-${attempt.id}`,
          });
        }
      }

      await logAcademicAudit({
        actorId: auth.userId,
        actorName: auth.name,
        actorRole: auth.role,
        action: 'PUBLISH_VERIFIED_EXAM_RESULTS',
        entityType: 'ExamAttempt',
        entityId: published.map((a) => a.id).join(','),
        details: { publishedCount: published.length },
      });

      return NextResponse.json({
        status: true,
        publishedCount: published.length,
        attempts: published,
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
