import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  authorizeLecturer,
  verifyLecturerCourseAccess,
  logAcademicAudit,
} from '@/lib/portal-auth';
import { recalculateContinuousAssessment } from '@/lib/auto-grader';

async function lookupGradeScale(
  totalScore: number
): Promise<{ grade: string; gpaPoint: number; remark?: string }> {
  const scales = await prisma.gradeScale.findMany({
    orderBy: [{ isDefault: 'desc' }, { minScore: 'desc' }],
  });

  if (scales.length > 0) {
    const match = scales.find((s) => totalScore >= s.minScore && totalScore <= s.maxScore);
    if (match) {
      return {
        grade: match.gradeLetter,
        gpaPoint: match.gradePoint,
        remark: match.remark || undefined,
      };
    }
  }

  // Fallback Ghana standard scale if GradeScale table is empty
  if (totalScore >= 80) return { grade: 'A', gpaPoint: 4.0 };
  if (totalScore >= 75) return { grade: 'B+', gpaPoint: 3.5 };
  if (totalScore >= 70) return { grade: 'B', gpaPoint: 3.0 };
  if (totalScore >= 65) return { grade: 'C+', gpaPoint: 2.5 };
  if (totalScore >= 60) return { grade: 'C', gpaPoint: 2.0 };
  if (totalScore >= 50) return { grade: 'D', gpaPoint: 1.0 };
  return { grade: 'F', gpaPoint: 0.0 };
}

async function autoRecalculateCourse(courseId: string, semesterId?: string | null) {
  const registrations = await prisma.courseRegistration.findMany({
    where: { courseId, status: 'APPROVED' },
    select: { studentId: true },
  });

  const recalculated = [];
  for (const reg of registrations) {
    const res = await recalculateContinuousAssessment(reg.studentId, courseId, semesterId || null);
    if (res) recalculated.push(res);
  }
  return recalculated;
}

export async function GET(req: NextRequest) {
  try {
    const auth = await authorizeLecturer();
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 403 });
    }

    const { searchParams } = new URL(req.url);
    const courseId = searchParams.get('courseId');
    const semesterId = searchParams.get('semesterId');

    if (courseId) {
      const hasAccess = await verifyLecturerCourseAccess(auth.userId!, auth.role!, courseId);
      if (!hasAccess) {
        return NextResponse.json(
          { error: 'Forbidden: You are not assigned to this course.' },
          { status: 403 }
        );
      }

      // Auto-sync computed component scores & ContinuousAssessment if autoSync components exist
      const autoComponentsCount = await prisma.assessmentComponent.count({
        where: { courseId, autoSync: true, sourceType: { not: null } },
      });
      if (autoComponentsCount > 0) {
        await autoRecalculateCourse(courseId, semesterId);
      }
    }

    const isAdmin = auth.role === 'SUPER_ADMIN' || auth.role === 'SCHOOL_ADMIN';
    const courseFilter: Record<string, unknown> = {};
    if (courseId) {
      courseFilter.courseId = courseId;
    } else if (!isAdmin) {
      courseFilter.course = {
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
    if (semesterId) {
      courseFilter.semesterId = semesterId;
    }

    const [results, components, gradeScales, registrations] = await Promise.all([
      prisma.continuousAssessment.findMany({
        where: courseFilter,
        include: {
          student: {
            include: { user: { select: { id: true, name: true, email: true } } },
          },
          course: true,
        },
        orderBy: { updatedAt: 'desc' },
      }),
      prisma.assessmentComponent.findMany({
        where: courseFilter,
        include: {
          scores: true,
        },
        orderBy: { orderIndex: 'asc' },
      }),
      prisma.gradeScale.findMany({
        orderBy: [{ isDefault: 'desc' }, { minScore: 'desc' }],
      }),
      courseId
        ? prisma.courseRegistration.findMany({
            where: { courseId, status: 'APPROVED' },
            include: {
              student: {
                include: {
                  user: { select: { id: true, name: true, email: true } },
                  cohort: { select: { id: true, name: true } },
                },
              },
            },
          })
        : Promise.resolve([]),
    ]);

    return NextResponse.json({
      results,
      components,
      gradeScales,
      enrolledStudents: registrations.map((r) => r.student),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function handleGradingMutation(req: NextRequest) {
  const auth = await authorizeLecturer();
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status || 403 });
  }

  const body = await req.json();
  const { action } = body;

  // 0. Automatic recalculation from completed Exams, Assignments & Topic Assessments
  if (action === 'auto_recalculate') {
    const { courseId, semesterId } = body;
    if (!courseId) {
      return NextResponse.json({ error: 'courseId is required' }, { status: 400 });
    }

    const hasAccess = await verifyLecturerCourseAccess(auth.userId!, auth.role!, courseId);
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Forbidden: You are not assigned to this course.' },
        { status: 403 }
      );
    }

    const results = await autoRecalculateCourse(courseId, semesterId);

    await logAcademicAudit({
      actorId: auth.userId,
      actorName: auth.name,
      actorRole: auth.role,
      action: 'GRADEBOOK_AUTO_RECALCULATED',
      entityType: 'ContinuousAssessment',
      entityId: courseId,
      details: { courseId, semesterId, recalculatedCount: results.length },
    });

    return NextResponse.json({
      status: true,
      recalculatedCount: results.length,
      results,
    });
  }

  // 1. Create AssessmentComponent
  if (action === 'createComponent') {
    const {
      courseId,
      semesterId,
      name,
      componentType,
      weightPercent,
      maxMarks,
      orderIndex,
      sourceType,
      sourceId,
      autoSync,
    } = body;
    if (!courseId || !name || !componentType || weightPercent === undefined) {
      return NextResponse.json(
        { error: 'courseId, name, componentType, and weightPercent are required' },
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

    const weight = Number(weightPercent);
    const max = Number(maxMarks) || 100;
    if (Number.isNaN(weight) || weight <= 0 || weight > 100 || Number.isNaN(max) || max <= 0) {
      return NextResponse.json(
        { error: 'weightPercent must be between 0 and 100, and maxMarks must be positive.' },
        { status: 400 }
      );
    }

    const existingComponents = await prisma.assessmentComponent.findMany({
      where: { courseId, semesterId: semesterId || null },
    });
    const currentSum = existingComponents.reduce((sum, c) => sum + c.weightPercent, 0);
    if (currentSum + weight > 100.001) {
      return NextResponse.json(
        {
          error: `Total assessment component weight cannot exceed 100% (current: ${currentSum}%, adding: ${weight}%).`,
        },
        { status: 400 }
      );
    }

    const component = await prisma.assessmentComponent.create({
      data: {
        courseId,
        semesterId: semesterId || null,
        name: String(name).trim(),
        componentType: String(componentType).toUpperCase(),
        weightPercent: weight,
        maxMarks: max,
        orderIndex: Number(orderIndex) || existingComponents.length + 1,
        sourceType: sourceType ? String(sourceType).toUpperCase() : null,
        sourceId: sourceId || null,
        autoSync: typeof autoSync === 'boolean' ? autoSync : true,
      },
    });

    await logAcademicAudit({
      actorId: auth.userId,
      actorName: auth.name,
      actorRole: auth.role,
      action: 'ASSESSMENT_COMPONENT_CREATED',
      entityType: 'AssessmentComponent',
      entityId: component.id,
      details: {
        courseId,
        semesterId,
        name: component.name,
        weightPercent: weight,
        sourceType: component.sourceType,
        autoSync: component.autoSync,
      },
    });

    return NextResponse.json({ status: true, component }, { status: 201 });
  }

  // 2. Update AssessmentComponent
  if (action === 'updateComponent') {
    const {
      componentId,
      name,
      componentType,
      weightPercent,
      maxMarks,
      orderIndex,
      sourceType,
      sourceId,
      autoSync,
    } = body;
    if (!componentId) {
      return NextResponse.json({ error: 'componentId is required' }, { status: 400 });
    }

    const existing = await prisma.assessmentComponent.findUnique({
      where: { id: componentId },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Assessment component not found' }, { status: 404 });
    }

    const hasAccess = await verifyLecturerCourseAccess(auth.userId!, auth.role!, existing.courseId);
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Forbidden: You are not assigned to this course.' },
        { status: 403 }
      );
    }

    const nextWeight =
      weightPercent !== undefined ? Number(weightPercent) : existing.weightPercent;
    if (Number.isNaN(nextWeight) || nextWeight <= 0 || nextWeight > 100) {
      return NextResponse.json(
        { error: 'weightPercent must be between 0 and 100.' },
        { status: 400 }
      );
    }

    const siblingComponents = await prisma.assessmentComponent.findMany({
      where: {
        courseId: existing.courseId,
        semesterId: existing.semesterId,
        id: { not: componentId },
      },
    });
    const otherSum = siblingComponents.reduce((sum, c) => sum + c.weightPercent, 0);
    if (otherSum + nextWeight > 100.001) {
      return NextResponse.json(
        {
          error: `Total assessment component weight cannot exceed 100% (other components: ${otherSum}%, new weight: ${nextWeight}%).`,
        },
        { status: 400 }
      );
    }

    const component = await prisma.assessmentComponent.update({
      where: { id: componentId },
      data: {
        ...(name !== undefined ? { name: String(name).trim() } : {}),
        ...(componentType !== undefined
          ? { componentType: String(componentType).toUpperCase() }
          : {}),
        weightPercent: nextWeight,
        ...(maxMarks !== undefined ? { maxMarks: Number(maxMarks) } : {}),
        ...(orderIndex !== undefined ? { orderIndex: Number(orderIndex) } : {}),
        ...(sourceType !== undefined
          ? { sourceType: sourceType ? String(sourceType).toUpperCase() : null }
          : {}),
        ...(sourceId !== undefined ? { sourceId: sourceId || null } : {}),
        ...(typeof autoSync === 'boolean' ? { autoSync } : {}),
      },
    });

    await logAcademicAudit({
      actorId: auth.userId,
      actorName: auth.name,
      actorRole: auth.role,
      action: 'ASSESSMENT_COMPONENT_UPDATED',
      entityType: 'AssessmentComponent',
      entityId: component.id,
      details: { courseId: existing.courseId, weightPercent: nextWeight },
    });

    return NextResponse.json({ status: true, component });
  }

  // 3. Delete AssessmentComponent
  if (action === 'deleteComponent') {
    const { componentId } = body;
    if (!componentId) {
      return NextResponse.json({ error: 'componentId is required' }, { status: 400 });
    }

    const existing = await prisma.assessmentComponent.findUnique({
      where: { id: componentId },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Assessment component not found' }, { status: 404 });
    }

    const hasAccess = await verifyLecturerCourseAccess(auth.userId!, auth.role!, existing.courseId);
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Forbidden: You are not assigned to this course.' },
        { status: 403 }
      );
    }

    await prisma.assessmentComponent.delete({ where: { id: componentId } });

    await logAcademicAudit({
      actorId: auth.userId,
      actorName: auth.name,
      actorRole: auth.role,
      action: 'ASSESSMENT_COMPONENT_DELETED',
      entityType: 'AssessmentComponent',
      entityId: componentId,
      details: { courseId: existing.courseId, name: existing.name },
    });

    return NextResponse.json({ status: true, deletedId: componentId });
  }

  // 4. Save GradebookComponentScores and recompute weighted ContinuousAssessment
  if (action === 'saveComponentScores' || Array.isArray(body.scores)) {
    const { courseId, semesterId, semester, academicYear, scores, submit } = body;
    if (!courseId || !Array.isArray(scores) || scores.length === 0) {
      return NextResponse.json(
        { error: 'courseId and a non-empty scores array are required' },
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

    const components = await prisma.assessmentComponent.findMany({
      where: {
        courseId,
        ...(semesterId ? { semesterId } : {}),
      },
    });
    const componentMap = new Map(components.map((c) => [c.id, c]));

    if (submit) {
      const weightSum = components.reduce((sum, c) => sum + c.weightPercent, 0);
      if (Math.abs(weightSum - 100) > 0.01) {
        return NextResponse.json(
          {
            error: `Assessment component weights must equal 100% before submitting (currently ${weightSum}%).`,
          },
          { status: 400 }
        );
      }
    }

    const affectedStudentIds = new Set<string>();
    for (const item of scores) {
      const comp = componentMap.get(item.componentId);
      if (!comp || !item.studentId) continue;

      const numericScore = Number(item.score);
      if (Number.isNaN(numericScore) || numericScore < 0 || numericScore > comp.maxMarks) {
        return NextResponse.json(
          {
            error: `Score for component "${comp.name}" must be between 0 and ${comp.maxMarks}.`,
          },
          { status: 400 }
        );
      }

      await prisma.gradebookComponentScore.upsert({
        where: {
          componentId_studentId: {
            componentId: comp.id,
            studentId: item.studentId,
          },
        },
        update: {
          score: numericScore,
          remarks: item.remarks || null,
          enteredById: auth.userId!,
        },
        create: {
          componentId: comp.id,
          studentId: item.studentId,
          score: numericScore,
          remarks: item.remarks || null,
          enteredById: auth.userId!,
        },
      });
      affectedStudentIds.add(item.studentId);
    }

    const updatedResults = [];
    for (const studentId of affectedStudentIds) {
      const studentScores = await prisma.gradebookComponentScore.findMany({
        where: {
          studentId,
          componentId: { in: components.map((c) => c.id) },
        },
      });
      const scoreByComp = new Map(studentScores.map((s) => [s.componentId, s.score]));

      let caScore = 0;
      let examScore = 0;
      for (const comp of components) {
        const raw = scoreByComp.get(comp.id) ?? 0;
        const weighted = (raw / comp.maxMarks) * comp.weightPercent;
        if (comp.componentType === 'FINAL_EXAM') {
          examScore += weighted;
        } else {
          caScore += weighted;
        }
      }

      caScore = Math.round(caScore * 100) / 100;
      examScore = Math.round(examScore * 100) / 100;
      const totalScore = Math.min(100, Math.max(0, Math.round((caScore + examScore) * 100) / 100));
      const { grade, gpaPoint } = await lookupGradeScale(totalScore);

      const nextStatus = submit ? 'SUBMITTED' : 'DRAFT';
      const record = await prisma.continuousAssessment.upsert({
        where: {
          studentId_courseId: { studentId, courseId },
        },
        update: {
          semesterId: semesterId || null,
          caScore,
          examScore,
          totalScore,
          grade,
          gpaPoint,
          status: nextStatus,
          isApproved: false,
          isPublished: false,
          ...(submit ? { submittedById: auth.userId!, submittedAt: new Date() } : {}),
          semester: semester || 'First Semester',
          academicYear: academicYear || '2025/2026',
        },
        create: {
          studentId,
          courseId,
          semesterId: semesterId || null,
          caScore,
          examScore,
          totalScore,
          grade,
          gpaPoint,
          status: nextStatus,
          isApproved: false,
          isPublished: false,
          ...(submit ? { submittedById: auth.userId!, submittedAt: new Date() } : {}),
          semester: semester || 'First Semester',
          academicYear: academicYear || '2025/2026',
        },
        include: {
          student: { include: { user: { select: { id: true, name: true, email: true } } } },
          course: true,
        },
      });

      updatedResults.push(record);
    }

    await logAcademicAudit({
      actorId: auth.userId,
      actorName: auth.name,
      actorRole: auth.role,
      action: submit ? 'GRADES_SUBMITTED_FOR_APPROVAL' : 'GRADEBOOK_SCORES_SAVED',
      entityType: 'ContinuousAssessment',
      entityId: courseId,
      details: {
        courseId,
        semesterId,
        studentCount: affectedStudentIds.size,
        status: submit ? 'SUBMITTED' : 'DRAFT',
      },
    });

    return NextResponse.json({ status: true, results: updatedResults });
  }

  // 5. Submit existing course grades for admin approval
  if (action === 'submit') {
    const { courseId, semesterId, studentIds } = body;
    if (!courseId) {
      return NextResponse.json({ error: 'courseId is required' }, { status: 400 });
    }

    const hasAccess = await verifyLecturerCourseAccess(auth.userId!, auth.role!, courseId);
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Forbidden: You are not assigned to this course.' },
        { status: 403 }
      );
    }

    const components = await prisma.assessmentComponent.findMany({
      where: {
        courseId,
        ...(semesterId ? { semesterId } : {}),
      },
    });

    if (components.length > 0) {
      const weightSum = components.reduce((sum, c) => sum + c.weightPercent, 0);
      if (Math.abs(weightSum - 100) > 0.01) {
        return NextResponse.json(
          {
            error: `Assessment component weights must equal 100% before submitting (currently ${weightSum}%).`,
          },
          { status: 400 }
        );
      }
    }

    const updated = await prisma.continuousAssessment.updateMany({
      where: {
        courseId,
        ...(Array.isArray(studentIds) && studentIds.length > 0
          ? { studentId: { in: studentIds } }
          : {}),
        status: { in: ['DRAFT', 'RETURNED'] },
      },
      data: {
        status: 'SUBMITTED',
        isApproved: false,
        isPublished: false,
        submittedById: auth.userId!,
        submittedAt: new Date(),
      },
    });

    await logAcademicAudit({
      actorId: auth.userId,
      actorName: auth.name,
      actorRole: auth.role,
      action: 'GRADES_SUBMITTED_FOR_APPROVAL',
      entityType: 'ContinuousAssessment',
      entityId: courseId,
      details: { courseId, semesterId, submittedCount: updated.count },
    });

    return NextResponse.json({ status: true, submittedCount: updated.count });
  }

  // 6. Direct CA + Exam score save (backward-compatible, never auto-publishes)
  const { studentId, courseId, caScore, examScore, semester, academicYear, semesterId, submit } =
    body;
  if (!studentId || !courseId) {
    return NextResponse.json(
      { error: 'Student ID and Course ID are required' },
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

  const ca = Number(caScore) || 0;
  const exam = Number(examScore) || 0;
  const totalScore = Math.min(100, Math.max(0, ca + exam));
  const { grade, gpaPoint } = await lookupGradeScale(totalScore);
  const nextStatus = submit ? 'SUBMITTED' : 'DRAFT';

  const record = await prisma.continuousAssessment.upsert({
    where: {
      studentId_courseId: {
        studentId,
        courseId,
      },
    },
    update: {
      semesterId: semesterId || null,
      caScore: ca,
      examScore: exam,
      totalScore,
      grade,
      gpaPoint,
      status: nextStatus,
      isApproved: false,
      isPublished: false,
      ...(submit ? { submittedById: auth.userId!, submittedAt: new Date() } : {}),
      semester: semester || 'First Semester',
      academicYear: academicYear || '2025/2026',
    },
    create: {
      studentId,
      courseId,
      semesterId: semesterId || null,
      caScore: ca,
      examScore: exam,
      totalScore,
      grade,
      gpaPoint,
      status: nextStatus,
      isApproved: false,
      isPublished: false,
      ...(submit ? { submittedById: auth.userId!, submittedAt: new Date() } : {}),
      semester: semester || 'First Semester',
      academicYear: academicYear || '2025/2026',
    },
    include: {
      student: { include: { user: { select: { id: true, name: true, email: true } } } },
      course: true,
    },
  });

  await logAcademicAudit({
    actorId: auth.userId,
    actorName: auth.name,
    actorRole: auth.role,
    action: submit ? 'GRADES_SUBMITTED_FOR_APPROVAL' : 'GRADE_SCORE_SAVED',
    entityType: 'ContinuousAssessment',
    entityId: record.id,
    details: { studentId, courseId, caScore: ca, examScore: exam, totalScore, status: nextStatus },
  });

  return NextResponse.json({ status: true, result: record });
}

export async function POST(req: NextRequest) {
  try {
    return await handleGradingMutation(req);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    return await handleGradingMutation(req);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
