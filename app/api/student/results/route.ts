import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveStudentRecord } from '@/lib/portal-auth';

const DEFAULT_GRADE_SCALE = [
  { minScore: 80, maxScore: 100, gradeLetter: 'A', gradePoint: 4.0, remark: 'Excellent' },
  { minScore: 75, maxScore: 79.99, gradeLetter: 'B+', gradePoint: 3.5, remark: 'Very Good' },
  { minScore: 70, maxScore: 74.99, gradeLetter: 'B', gradePoint: 3.0, remark: 'Good' },
  { minScore: 65, maxScore: 69.99, gradeLetter: 'C+', gradePoint: 2.5, remark: 'Credit' },
  { minScore: 60, maxScore: 64.99, gradeLetter: 'C', gradePoint: 2.0, remark: 'Pass' },
  { minScore: 50, maxScore: 59.99, gradeLetter: 'D', gradePoint: 1.0, remark: 'Marginal Pass' },
  { minScore: 0, maxScore: 49.99, gradeLetter: 'F', gradePoint: 0.0, remark: 'Fail' },
];

function resolveGradeFromScale(
  totalScore: number,
  scales: Array<{ minScore: number; maxScore: number; gradeLetter: string; gradePoint: number }>
) {
  const match = scales.find((s) => totalScore >= s.minScore && totalScore <= s.maxScore);
  if (match) return { grade: match.gradeLetter, gpaPoint: match.gradePoint };
  const fallback = DEFAULT_GRADE_SCALE.find((s) => totalScore >= s.minScore);
  return fallback
    ? { grade: fallback.gradeLetter, gpaPoint: fallback.gradePoint }
    : { grade: 'F', gpaPoint: 0.0 };
}

function getClassStanding(cgpa: number): string {
  if (cgpa >= 3.6) return 'First Class Honours';
  if (cgpa >= 3.0) return 'Second Class Upper';
  if (cgpa >= 2.5) return 'Second Class Lower';
  if (cgpa >= 2.0) return 'Third Class';
  if (cgpa >= 1.0) return 'Pass';
  return 'Probation';
}

export async function GET() {
  try {
    const student = await resolveStudentRecord();
    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    const [caResults, examAttempts, gradeScales] = await Promise.all([
      prisma.continuousAssessment.findMany({
        where: {
          studentId: student.id,
          isPublished: true,
          status: { notIn: ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'RETURNED'] },
        },
        include: { course: true },
        orderBy: [{ academicYear: 'desc' }, { semester: 'asc' }, { course: { code: 'asc' } }],
      }),
      prisma.examAttempt.findMany({
        where: { studentId: student.id },
        include: { exam: { include: { course: true } } },
        orderBy: { submittedAt: 'desc' },
      }),
      prisma.gradeScale.findMany({
        orderBy: { minScore: 'desc' },
      }),
    ]);

    const activeScale = gradeScales.length > 0 ? gradeScales : DEFAULT_GRADE_SCALE;

    let totalQualityPoints = 0;
    let totalCredits = 0;
    const semesterMap = new Map<
      string,
      { academicYear: string; semester: string; totalCredits: number; totalQualityPoints: number }
    >();

    const courseGrades = caResults.map((r) => {
      const credits = r.course.creditHours || 3;
      const computed = resolveGradeFromScale(r.totalScore, activeScale);
      const grade = r.grade || computed.grade;
      const gpaPoint = typeof r.gpaPoint === 'number' ? r.gpaPoint : computed.gpaPoint;

      totalCredits += credits;
      totalQualityPoints += gpaPoint * credits;

      const semKey = `${r.academicYear}::${r.semester}`;
      if (!semesterMap.has(semKey)) {
        semesterMap.set(semKey, {
          academicYear: r.academicYear,
          semester: r.semester,
          totalCredits: 0,
          totalQualityPoints: 0,
        });
      }
      const semEntry = semesterMap.get(semKey)!;
      semEntry.totalCredits += credits;
      semEntry.totalQualityPoints += gpaPoint * credits;

      return {
        id: r.id,
        courseId: r.courseId,
        courseCode: r.course.code,
        courseTitle: r.course.title,
        credits,
        caScore: r.caScore,
        examScore: r.examScore,
        totalScore: r.totalScore,
        grade,
        gpaPoint,
        semester: r.semester,
        academicYear: r.academicYear,
        publishedAt: r.publishedAt,
      };
    });

    const cgpa = totalCredits > 0 ? Number((totalQualityPoints / totalCredits).toFixed(2)) : 0;

    const semesterBreakdown = Array.from(semesterMap.values()).map((s) => ({
      academicYear: s.academicYear,
      semester: s.semester,
      totalCredits: s.totalCredits,
      totalQualityPoints: Number(s.totalQualityPoints.toFixed(2)),
      gpa: s.totalCredits > 0 ? Number((s.totalQualityPoints / s.totalCredits).toFixed(2)) : 0,
    }));

    const currentSemStats = semesterBreakdown.find(
      (s) => s.academicYear === student.academicYear && s.semester === student.currentSemester
    );
    const currentGpa = currentSemStats ? currentSemStats.gpa : cgpa;

    return NextResponse.json({
      student: {
        id: student.id,
        studentId: student.studentId,
        name: student.user.name,
        programme: student.programme.name,
        level: student.level,
        currentSemester: student.currentSemester,
        academicYear: student.academicYear,
      },
      summary: {
        totalCredits,
        totalQualityPoints: Number(totalQualityPoints.toFixed(2)),
        gpa: currentGpa,
        cgpa,
        classStanding: getClassStanding(cgpa),
      },
      semesterBreakdown,
      results: courseGrades,
      examAttempts: examAttempts.map((ea) => ({
        id: ea.id,
        examTitle: ea.exam.title,
        courseCode: ea.exam.course.code,
        score: ea.score,
        totalQuestions: ea.totalQuestions,
        correctCount: ea.correctCount,
        percentage: ea.percentage,
        submittedAt: ea.submittedAt,
      })),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
