import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  authorizeLecturer,
  verifyLecturerCourseAccess,
  logAcademicAudit,
} from '@/lib/portal-auth';
import {
  generateRubricOnce,
  evaluateSubjectiveWithAI,
  extractSubmissionText,
  recalculateContinuousAssessment,
} from '@/lib/auto-grader';

const VALID_ASSIGNMENT_STATUSES = new Set(['DRAFT', 'PUBLISHED', 'CLOSED']);
const VALID_SUBMISSION_GRADE_STATUSES = new Set(['GRADED', 'RETURNED_FOR_RESUBMISSION']);

async function getCourseContext(courseId: string): Promise<string | null> {
  const topics = await prisma.extractedTopic.findMany({
    where: { courseId, status: { in: ['APPROVED', 'PUBLISHED'] } },
    select: { title: true, summary: true },
    orderBy: { orderIndex: 'asc' },
    take: 4,
  });
  if (topics.length === 0) return null;
  return topics.map((t) => `${t.title}: ${t.summary || ''}`).join('\n');
}

async function gradeSubmission(
  auth: { userId?: string; name?: string; role?: string },
  body: Record<string, unknown>
) {
  const submissionId = body.submissionId as string | undefined;
  if (!submissionId) {
    return NextResponse.json({ error: 'Submission ID is required' }, { status: 400 });
  }

  const existing = await prisma.assignmentSubmission.findUnique({
    where: { id: submissionId },
    include: {
      assignment: {
        include: { course: { select: { id: true, code: true, title: true } } },
      },
      student: {
        include: { user: { select: { id: true, name: true } } },
      },
    },
  });

  if (!existing) {
    return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
  }

  const hasAccess = await verifyLecturerCourseAccess(
    auth.userId!,
    auth.role!,
    existing.assignment.courseId
  );
  if (!hasAccess) {
    return NextResponse.json(
      { error: 'Forbidden: You are not assigned to this course.' },
      { status: 403 }
    );
  }

  const rawMarks = body.marks ?? body.score;
  const numericScore = Number(rawMarks);
  if (
    rawMarks === undefined ||
    rawMarks === null ||
    Number.isNaN(numericScore) ||
    numericScore < 0 ||
    numericScore > existing.assignment.maxMarks
  ) {
    return NextResponse.json(
      {
        error: `Marks must be between 0 and ${existing.assignment.maxMarks}.`,
      },
      { status: 400 }
    );
  }

  const requestedStatus = String(body.status || 'GRADED').toUpperCase();
  const targetStatus = VALID_SUBMISSION_GRADE_STATUSES.has(requestedStatus)
    ? requestedStatus
    : 'GRADED';

  const feedback =
    body.feedback !== undefined
      ? String(body.feedback)
      : existing.feedback || 'Graded by lecturer.';

  const rubricJson =
    body.rubricJson !== undefined
      ? typeof body.rubricJson === 'string'
        ? body.rubricJson
        : JSON.stringify(body.rubricJson)
      : existing.rubricJson;

  const submission = await prisma.assignmentSubmission.update({
    where: { id: submissionId },
    data: {
      score: numericScore,
      feedback,
      rubricJson,
      status: targetStatus,
      evaluationStatus: 'COMPLETED',
      isGraded: targetStatus === 'GRADED',
      gradedById: auth.userId!,
      gradedAt: new Date(),
    },
    include: {
      student: { include: { user: { select: { id: true, name: true, email: true } } } },
    },
  });

  await recalculateContinuousAssessment(existing.studentId, existing.assignment.courseId);

  const dedupeKey = `assignment-grade-${submission.id}-${targetStatus}-${numericScore}`;
  const notifTitle =
    targetStatus === 'RETURNED_FOR_RESUBMISSION'
      ? `Resubmission Requested: ${existing.assignment.title}`
      : `Assignment Graded: ${existing.assignment.title}`;
  const notifMessage =
    targetStatus === 'RETURNED_FOR_RESUBMISSION'
      ? `${existing.assignment.course.code} assignment "${existing.assignment.title}" was returned for resubmission. Feedback: ${feedback}`
      : `You scored ${numericScore}/${existing.assignment.maxMarks} on ${existing.assignment.course.code} "${existing.assignment.title}".`;

  await prisma.notification.upsert({
    where: { dedupeKey },
    update: {},
    create: {
      userId: existing.student.userId,
      title: notifTitle,
      message: notifMessage,
      type: targetStatus === 'RETURNED_FOR_RESUBMISSION' ? 'alert' : 'result',
      dedupeKey,
      link: '/portal/student/courses',
    },
  });

  await logAcademicAudit({
    actorId: auth.userId,
    actorName: auth.name,
    actorRole: auth.role,
    action:
      targetStatus === 'RETURNED_FOR_RESUBMISSION'
        ? 'SUBMISSION_RETURNED_FOR_RESUBMISSION'
        : 'SUBMISSION_GRADED',
    entityType: 'AssignmentSubmission',
    entityId: submission.id,
    details: {
      assignmentId: existing.assignmentId,
      courseId: existing.assignment.courseId,
      studentId: existing.studentId,
      score: numericScore,
      status: targetStatus,
    },
  });

  return NextResponse.json({ status: true, submission });
}

async function retryFailedAutoGrading(
  auth: { userId?: string; name?: string; role?: string },
  body: Record<string, unknown>
) {
  const assignmentId = body.assignmentId as string | undefined;
  const submissionId = body.submissionId as string | undefined;

  if (!assignmentId && !submissionId) {
    return NextResponse.json(
      { error: 'assignmentId or submissionId is required' },
      { status: 400 }
    );
  }

  let targetAssignment = assignmentId
    ? await prisma.assignment.findUnique({
        where: { id: assignmentId },
        include: { course: { select: { id: true, code: true, title: true } } },
      })
    : null;

  if (!targetAssignment && submissionId) {
    const sub = await prisma.assignmentSubmission.findUnique({
      where: { id: submissionId },
      include: {
        assignment: { include: { course: { select: { id: true, code: true, title: true } } } },
      },
    });
    targetAssignment = sub?.assignment || null;
  }

  if (!targetAssignment) {
    return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
  }

  const hasAccess = await verifyLecturerCourseAccess(
    auth.userId!,
    auth.role!,
    targetAssignment.courseId
  );
  if (!hasAccess) {
    return NextResponse.json(
      { error: 'Forbidden: You are not assigned to this course.' },
      { status: 403 }
    );
  }

  const failedSubmissions = await prisma.assignmentSubmission.findMany({
    where: {
      assignmentId: targetAssignment.id,
      ...(submissionId ? { id: submissionId } : {}),
      evaluationStatus: 'FAILED',
    },
    include: {
      student: { include: { user: { select: { id: true, name: true } } } },
    },
  });

  const courseContext = await getCourseContext(targetAssignment.courseId);
  let completedCount = 0;
  let failedCount = 0;

  for (const sub of failedSubmissions) {
    const extracted = await extractSubmissionText({
      fileUrl: sub.fileUrl,
      notes: sub.notes,
      allowedFormats: targetAssignment.allowedFormats,
    });

    if (!extracted.ok) {
      failedCount += 1;
      await prisma.assignmentSubmission.update({
        where: { id: sub.id },
        data: {
          retryCount: { increment: 1 },
          errorMessage: extracted.error || 'Could not extract submission text.',
        },
      });
      continue;
    }

    const evalRes = await evaluateSubjectiveWithAI({
      questionText: `${targetAssignment.title}\n${targetAssignment.description}`,
      questionType: 'ESSAY',
      maxMarks: targetAssignment.maxMarks,
      expectedAnswer: targetAssignment.expectedAnswer,
      rubricJson: targetAssignment.rubricJson,
      requiredConceptsJson: targetAssignment.requiredConceptsJson,
      criticalErrorsJson: targetAssignment.criticalErrorsJson,
      courseContext,
      studentAnswer: extracted.text,
    });

    if (evalRes.status === 'COMPLETED') {
      completedCount += 1;
      const now = new Date();
      await prisma.assignmentSubmission.update({
        where: { id: sub.id },
        data: {
          score: evalRes.awardedMarks,
          feedback: evalRes.feedback,
          status: 'GRADED',
          evaluationStatus: 'COMPLETED',
          isGraded: true,
          autoGradedAt: now,
          gradedAt: now,
          errorMessage: null,
          retryCount: { increment: 1 },
          evaluationDetailsJson: JSON.stringify(evalRes),
        },
      });

      await recalculateContinuousAssessment(sub.studentId, targetAssignment.courseId);

      const dedupeKey = `assignment-autograde-${sub.id}-${evalRes.awardedMarks}`;
      await prisma.notification.upsert({
        where: { dedupeKey },
        update: {},
        create: {
          userId: sub.student.userId,
          title: `Assignment Auto-Graded: ${targetAssignment.title}`,
          message: `You scored ${evalRes.awardedMarks}/${targetAssignment.maxMarks} on ${targetAssignment.course.code} "${targetAssignment.title}".`,
          type: 'result',
          dedupeKey,
          link: `/portal/student/courses/${targetAssignment.courseId}`,
        },
      });
    } else {
      failedCount += 1;
      await prisma.assignmentSubmission.update({
        where: { id: sub.id },
        data: {
          retryCount: { increment: 1 },
          errorMessage: evalRes.errorMessage || 'Automated evaluation retry failed.',
        },
      });
    }
  }

  await logAcademicAudit({
    actorId: auth.userId,
    actorName: auth.name,
    actorRole: auth.role,
    action: 'ASSIGNMENT_AUTO_GRADING_RETRIED',
    entityType: 'Assignment',
    entityId: targetAssignment.id,
    details: {
      retriedCount: failedSubmissions.length,
      completedCount,
      failedCount,
    },
  });

  return NextResponse.json({
    status: true,
    retriedCount: failedSubmissions.length,
    completedCount,
    failedCount,
  });
}

export async function GET(req: NextRequest) {
  try {
    const auth = await authorizeLecturer();
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 403 });
    }

    const { searchParams } = new URL(req.url);
    const courseId = searchParams.get('courseId');
    const assignmentId = searchParams.get('assignmentId');
    const status = searchParams.get('status');

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
    if (assignmentId) where.id = assignmentId;
    if (status) where.status = status;

    const assignments = await prisma.assignment.findMany({
      where,
      include: {
        course: true,
        submissions: {
          include: {
            student: {
              include: { user: { select: { id: true, name: true, email: true } } },
            },
          },
          orderBy: { submittedAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ assignments });
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
    if (body.action === 'grade') {
      return gradeSubmission(auth, body);
    }

    const {
      title,
      description,
      courseId,
      deadline,
      dueDate,
      maxMarks,
      weighting,
      status,
      allowLate,
      allowResubmission,
      allowedFormats,
      attachmentUrl,
      fileUrl,
      topicId,
      cohortId,
      expectedAnswer,
      rubricJson,
      requiredConceptsJson,
      criticalErrorsJson,
      answerKeyReleaseAt,
    } = body;

    const effectiveDeadline = dueDate || deadline;
    if (!title || !courseId || !effectiveDeadline) {
      return NextResponse.json(
        { error: 'Title, course, and due date/deadline are required' },
        { status: 400 }
      );
    }

    const hasAccess = await verifyLecturerCourseAccess(auth.userId!, auth.role!, courseId);
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Forbidden: You are not assigned to this course.' },
        { status: 403 }
      );
    }

    const requestedStatus = String(status || 'PUBLISHED').toUpperCase();
    const assignmentStatus = VALID_ASSIGNMENT_STATUSES.has(requestedStatus)
      ? requestedStatus
      : 'PUBLISHED';
    const numericMaxMarks = Number(maxMarks) || 100;

    // Generate marking rubric ONCE at assignment creation time if not explicitly supplied
    let finalExpectedAnswer = expectedAnswer || null;
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

    if (!finalRubricJson || !finalExpectedAnswer) {
      const courseContext = await getCourseContext(courseId);
      const generated = await generateRubricOnce({
        promptText: `${String(title).trim()}\n${description || ''}`,
        questionType: 'ESSAY',
        maxMarks: numericMaxMarks,
        correctAnswer: finalExpectedAnswer,
        courseContext,
      });

      finalExpectedAnswer = finalExpectedAnswer || generated.expectedAnswer;
      finalRubricJson = finalRubricJson || JSON.stringify(generated.rubric);
      finalRequiredConceptsJson =
        finalRequiredConceptsJson || JSON.stringify(generated.requiredConcepts);
      finalCriticalErrorsJson =
        finalCriticalErrorsJson || JSON.stringify(generated.criticalErrors);
    }

    const assignment = await prisma.assignment.create({
      data: {
        title: String(title).trim(),
        description: description || '',
        courseId,
        lecturerId: auth.userId!,
        deadline: String(effectiveDeadline),
        maxMarks: numericMaxMarks,
        weighting: Number(weighting) || 20,
        status: assignmentStatus,
        allowLate: typeof allowLate === 'boolean' ? allowLate : true,
        allowResubmission: typeof allowResubmission === 'boolean' ? allowResubmission : false,
        allowedFormats: allowedFormats || null,
        attachmentUrl: attachmentUrl || null,
        fileUrl: fileUrl || attachmentUrl || null,
        topicId: topicId || null,
        cohortId: cohortId || null,
        expectedAnswer: finalExpectedAnswer,
        rubricJson: finalRubricJson,
        requiredConceptsJson: finalRequiredConceptsJson,
        criticalErrorsJson: finalCriticalErrorsJson,
        answerKeyReleaseAt: answerKeyReleaseAt ? new Date(answerKeyReleaseAt) : null,
      },
      include: { course: true },
    });

    await logAcademicAudit({
      actorId: auth.userId,
      actorName: auth.name,
      actorRole: auth.role,
      action: 'ASSIGNMENT_CREATED',
      entityType: 'Assignment',
      entityId: assignment.id,
      details: {
        courseId,
        title: assignment.title,
        status: assignment.status,
        maxMarks: assignment.maxMarks,
        hasAutoRubric: Boolean(assignment.rubricJson),
      },
    });

    return NextResponse.json({ status: true, assignment }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await authorizeLecturer();
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 403 });
    }

    const body = await req.json();
    if (body.action === 'retry_auto_grading') {
      return retryFailedAutoGrading(auth, body);
    }
    if (body.action === 'grade' || body.submissionId) {
      return gradeSubmission(auth, body);
    }

    const assignmentId = body.assignmentId || body.id;
    if (!assignmentId) {
      return NextResponse.json({ error: 'Assignment ID is required' }, { status: 400 });
    }

    const existing = await prisma.assignment.findUnique({
      where: { id: assignmentId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }

    const hasAccess = await verifyLecturerCourseAccess(auth.userId!, auth.role!, existing.courseId);
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Forbidden: You are not assigned to this course.' },
        { status: 403 }
      );
    }

    const {
      title,
      description,
      deadline,
      dueDate,
      maxMarks,
      weighting,
      status,
      allowLate,
      allowResubmission,
      allowedFormats,
      attachmentUrl,
      fileUrl,
      topicId,
      cohortId,
      expectedAnswer,
      rubricJson,
    } = body;

    const nextStatus =
      status !== undefined && VALID_ASSIGNMENT_STATUSES.has(String(status).toUpperCase())
        ? String(status).toUpperCase()
        : undefined;

    const updated = await prisma.assignment.update({
      where: { id: assignmentId },
      data: {
        ...(title !== undefined ? { title: String(title).trim() } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(dueDate !== undefined || deadline !== undefined
          ? { deadline: String(dueDate || deadline) }
          : {}),
        ...(maxMarks !== undefined ? { maxMarks: Number(maxMarks) } : {}),
        ...(weighting !== undefined ? { weighting: Number(weighting) } : {}),
        ...(nextStatus !== undefined ? { status: nextStatus } : {}),
        ...(typeof allowLate === 'boolean' ? { allowLate } : {}),
        ...(typeof allowResubmission === 'boolean' ? { allowResubmission } : {}),
        ...(allowedFormats !== undefined ? { allowedFormats } : {}),
        ...(attachmentUrl !== undefined ? { attachmentUrl } : {}),
        ...(fileUrl !== undefined ? { fileUrl } : {}),
        ...(topicId !== undefined ? { topicId } : {}),
        ...(cohortId !== undefined ? { cohortId } : {}),
        ...(expectedAnswer !== undefined ? { expectedAnswer } : {}),
        ...(rubricJson !== undefined
          ? {
              rubricJson:
                typeof rubricJson === 'string' ? rubricJson : JSON.stringify(rubricJson),
            }
          : {}),
      },
      include: { course: true },
    });

    await logAcademicAudit({
      actorId: auth.userId,
      actorName: auth.name,
      actorRole: auth.role,
      action:
        nextStatus === 'CLOSED'
          ? 'ASSIGNMENT_CLOSED'
          : nextStatus === 'PUBLISHED' && existing.status !== 'PUBLISHED'
            ? 'ASSIGNMENT_PUBLISHED'
            : 'ASSIGNMENT_UPDATED',
      entityType: 'Assignment',
      entityId: updated.id,
      details: {
        courseId: existing.courseId,
        status: updated.status,
      },
    });

    return NextResponse.json({ status: true, assignment: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
