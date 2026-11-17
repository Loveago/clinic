import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveStudentRecord, logAcademicAudit } from '@/lib/portal-auth';
import {
  extractSubmissionText,
  evaluateSubjectiveWithAI,
  buildRevisionRecommendations,
  recalculateContinuousAssessment,
} from '@/lib/auto-grader';

function isDeadlinePassed(deadline: string | null | undefined): boolean {
  if (!deadline) return false;
  const parsed = deadline.includes('T') ? new Date(deadline) : new Date(`${deadline}T23:59:59`);
  if (Number.isNaN(parsed.getTime())) return false;
  return new Date() > parsed;
}

function safeJsonParse(raw: string | null | undefined, fallback: any = null) {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export async function GET() {
  try {
    const student = await resolveStudentRecord();
    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    const registrations = await prisma.courseRegistration.findMany({
      where: {
        studentId: student.id,
        status: { not: 'DROPPED' },
      },
      select: { courseId: true },
    });

    const registeredCourseIds = registrations.map((r) => r.courseId);

    const assignments = await prisma.assignment.findMany({
      where: {
        status: 'PUBLISHED',
        ...(registeredCourseIds.length > 0
          ? { courseId: { in: registeredCourseIds } }
          : { course: { programmeId: student.programmeId } }),
      },
      include: {
        course: true,
        lecturer: { select: { name: true, email: true } },
        submissions: {
          where: { studentId: student.id },
        },
      },
      orderBy: { deadline: 'asc' },
    });

    const now = new Date();

    return NextResponse.json({
      assignments: assignments.map((a) => {
        const sub = a.submissions[0] || null;
        const pastDeadline = isDeadlinePassed(a.deadline);
        const answerKeyReleased = !a.answerKeyReleaseAt || now >= new Date(a.answerKeyReleaseAt);

        let submissionStatus = 'NOT_SUBMITTED';
        if (sub) {
          if (sub.evaluationStatus === 'FAILED') {
            submissionStatus = 'GRADING_PENDING';
          } else if (sub.status === 'RETURNED_FOR_RESUBMISSION' || sub.status === 'RETURNED') {
            submissionStatus = 'RETURNED_FOR_RESUBMISSION';
          } else if (sub.isGraded || sub.status === 'GRADED') {
            submissionStatus = 'GRADED';
          } else if (sub.status === 'UNDER_REVIEW') {
            submissionStatus = 'UNDER_REVIEW';
          } else if (sub.isLate) {
            submissionStatus = 'LATE';
          } else {
            submissionStatus = 'SUBMITTED';
          }
        }

        const canSubmit = !pastDeadline || a.allowLate;
        const canEdit =
          submissionStatus === 'RETURNED_FOR_RESUBMISSION' ||
          submissionStatus === 'GRADING_PENDING' ||
          (sub !== null &&
            submissionStatus !== 'GRADED' &&
            (!pastDeadline || a.allowResubmission));

        return {
          id: a.id,
          courseId: a.courseId,
          title: a.title,
          description: a.description,
          courseCode: a.course.code,
          courseTitle: a.course.title,
          lecturer: a.lecturer.name,
          deadline: a.deadline,
          maxMarks: a.maxMarks,
          weighting: a.weighting,
          status: a.status,
          allowLate: a.allowLate,
          allowResubmission: a.allowResubmission,
          allowedFormats: a.allowedFormats,
          attachmentUrl: a.attachmentUrl || a.fileUrl,
          answerKeyReleased,
          expectedAnswer: sub && answerKeyReleased ? a.expectedAnswer : undefined,
          isPastDeadline: pastDeadline,
          isSubmitted: Boolean(sub),
          submissionStatus,
          canSubmit,
          canEdit,
          submission: sub
            ? {
                ...sub,
                evaluationDetails: safeJsonParse(sub.evaluationDetailsJson, null),
                revisionRecommendations: safeJsonParse(sub.revisionRecommendationsJson, []),
              }
            : null,
        };
      }),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

async function handleSubmitOrUpdate(req: NextRequest) {
  try {
    const student = await resolveStudentRecord();
    if (!student) {
      return NextResponse.json({ error: 'Student profile not found' }, { status: 404 });
    }

    const body = await req.json();
    const { assignmentId, notes, fileUrl, idempotencyKey } = body;

    if (!assignmentId) {
      return NextResponse.json({ error: 'Assignment ID is required' }, { status: 400 });
    }

    if (idempotencyKey) {
      const cached = await prisma.assignmentSubmission.findUnique({
        where: { idempotencyKey },
      });
      if (cached) {
        return NextResponse.json({
          status: true,
          cached: true,
          submission: {
            ...cached,
            evaluationDetails: safeJsonParse(cached.evaluationDetailsJson, null),
            revisionRecommendations: safeJsonParse(cached.revisionRecommendationsJson, []),
          },
        });
      }
    }

    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
    });

    if (!assignment || assignment.status !== 'PUBLISHED') {
      return NextResponse.json(
        { error: 'Assignment not found or not open for submissions.' },
        { status: 404 }
      );
    }

    const registration = await prisma.courseRegistration.findFirst({
      where: {
        studentId: student.id,
        courseId: assignment.courseId,
        status: { not: 'DROPPED' },
      },
    });

    if (!registration) {
      return NextResponse.json(
        { error: 'You must be registered in this course to submit assignments.' },
        { status: 403 }
      );
    }

    const pastDeadline = isDeadlinePassed(assignment.deadline);
    if (pastDeadline && !assignment.allowLate) {
      return NextResponse.json(
        { error: 'Submission deadline has passed and late submissions are not allowed.' },
        { status: 400 }
      );
    }

    const existing = await prisma.assignmentSubmission.findUnique({
      where: {
        assignmentId_studentId: {
          assignmentId,
          studentId: student.id,
        },
      },
    });

    if (existing) {
      const isReturned =
        existing.status === 'RETURNED_FOR_RESUBMISSION' ||
        existing.status === 'RETURNED' ||
        existing.evaluationStatus === 'FAILED';
      if ((existing.isGraded || existing.status === 'GRADED') && !isReturned) {
        return NextResponse.json(
          { error: 'Graded submissions cannot be edited unless returned for resubmission.' },
          { status: 403 }
        );
      }
      if (pastDeadline && !assignment.allowResubmission && !isReturned) {
        return NextResponse.json(
          { error: 'Resubmission after the deadline is not permitted for this assignment.' },
          { status: 400 }
        );
      }
    }

    const resolvedFileUrl = fileUrl || existing?.fileUrl || '/uploads/assignments/student_submission.pdf';
    const resolvedNotes = notes ?? existing?.notes ?? '';

    const extraction = await extractSubmissionText({
      fileUrl: resolvedFileUrl,
      notes: resolvedNotes,
      allowedFormats: assignment.allowedFormats,
    });

    if (!extraction.ok) {
      return NextResponse.json({ error: extraction.error || 'Unreadable submission.' }, { status: 400 });
    }

    // Load approved course context for AI grading
    const ctxTopics = await prisma.extractedTopic.findMany({
      where: { courseId: assignment.courseId, status: { in: ['APPROVED', 'PUBLISHED'] } },
      select: { title: true, summary: true },
      take: 6,
    });
    const courseContext = ctxTopics.map((t) => `${t.title}: ${t.summary || ''}`).join('\n');

    const aiEval = await evaluateSubjectiveWithAI({
      questionText: `${assignment.title}\n${assignment.description}`,
      questionType: 'ASSIGNMENT',
      maxMarks: assignment.maxMarks,
      expectedAnswer: assignment.expectedAnswer,
      rubricJson: assignment.rubricJson,
      requiredConceptsJson: assignment.requiredConceptsJson,
      criticalErrorsJson: assignment.criticalErrorsJson,
      courseContext,
      studentAnswer: extraction.text,
    });

    const now = new Date();
    const isCompleted = aiEval.status === 'COMPLETED';
    const pct = assignment.maxMarks > 0 ? (aiEval.awardedMarks / assignment.maxMarks) * 100 : 0;
    const revisionRecommendations =
      isCompleted && pct < 80
        ? await buildRevisionRecommendations(
            assignment.courseId,
            assignment.topicId ? [assignment.topicId] : undefined
          )
        : [];

    const submission = await prisma.assignmentSubmission.upsert({
      where: {
        assignmentId_studentId: {
          assignmentId,
          studentId: student.id,
        },
      },
      update: {
        fileUrl: resolvedFileUrl,
        notes: resolvedNotes || 'Submitted via Action Health Ghana Student Portal',
        isLate: pastDeadline,
        status: isCompleted ? 'GRADED' : 'SUBMITTED',
        isGraded: isCompleted,
        score: isCompleted ? aiEval.awardedMarks : null,
        feedback: aiEval.feedback,
        evaluationStatus: aiEval.status,
        retryCount: aiEval.retryCount,
        errorMessage: aiEval.errorMessage || null,
        idempotencyKey: idempotencyKey || `asg:${assignmentId}:stu:${student.id}:${Date.now()}`,
        evaluationDetailsJson: JSON.stringify(aiEval),
        revisionRecommendationsJson: JSON.stringify(revisionRecommendations),
        autoGradedAt: isCompleted ? now : null,
        gradedAt: isCompleted ? now : null,
        submittedAt: now,
      },
      create: {
        assignmentId,
        studentId: student.id,
        fileUrl: resolvedFileUrl,
        notes: resolvedNotes || 'Submitted via Action Health Ghana Student Portal',
        isLate: pastDeadline,
        status: isCompleted ? 'GRADED' : 'SUBMITTED',
        isGraded: isCompleted,
        score: isCompleted ? aiEval.awardedMarks : null,
        feedback: aiEval.feedback,
        evaluationStatus: aiEval.status,
        retryCount: aiEval.retryCount,
        errorMessage: aiEval.errorMessage || null,
        idempotencyKey: idempotencyKey || `asg:${assignmentId}:stu:${student.id}:${Date.now()}`,
        evaluationDetailsJson: JSON.stringify(aiEval),
        revisionRecommendationsJson: JSON.stringify(revisionRecommendations),
        autoGradedAt: isCompleted ? now : null,
        gradedAt: isCompleted ? now : null,
        submittedAt: now,
      },
    });

    if (isCompleted) {
      await recalculateContinuousAssessment(student.id, assignment.courseId);

      if (student.userId) {
        await prisma.notification.upsert({
          where: { dedupeKey: `asg-autograded:${submission.id}:${now.getTime()}` },
          update: {},
          create: {
            userId: student.userId,
            title: `Assignment Graded: ${assignment.title}`,
            message: `Automated score: ${aiEval.awardedMarks}/${assignment.maxMarks}. ${aiEval.feedback}`,
            type: 'result',
            dedupeKey: `asg-autograded:${submission.id}:${now.getTime()}`,
            link: `/portal/student/courses/${assignment.courseId}`,
          },
        });
      }
    } else if (assignment.lecturerId) {
      await prisma.notification.upsert({
        where: { dedupeKey: `asg-eval-failed:${submission.id}` },
        update: {},
        create: {
          userId: assignment.lecturerId,
          title: `Auto-Grading Failed: ${assignment.title}`,
          message: `AI grading failed for a student submission (${aiEval.errorMessage || 'Retry needed'}).`,
          type: 'alert',
          dedupeKey: `asg-eval-failed:${submission.id}`,
          link: '/portal/lecturer',
        },
      });
    }

    await logAcademicAudit({
      actorId: student.userId,
      actorName: student.user?.name,
      actorRole: 'STUDENT',
      action: isCompleted ? 'ASSIGNMENT_AUTO_GRADED' : 'ASSIGNMENT_AUTO_GRADE_FAILED',
      entityType: 'AssignmentSubmission',
      entityId: submission.id,
      details: {
        assignmentId,
        studentId: student.id,
        evaluationStatus: aiEval.status,
        score: isCompleted ? aiEval.awardedMarks : null,
      },
    });

    return NextResponse.json({
      status: true,
      submission: {
        ...submission,
        evaluationDetails: aiEval,
        revisionRecommendations,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  return handleSubmitOrUpdate(req);
}

export async function PATCH(req: NextRequest) {
  return handleSubmitOrUpdate(req);
}
