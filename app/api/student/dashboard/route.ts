import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getCurrentUser();

    // Look up student by logged-in user, or fallback to primary seeded Ghana student
    let student = null;
    if (user?.id) {
      student = await prisma.student.findUnique({
        where: { userId: user.id },
        include: { user: true, programme: true },
      });
    }

    if (!student) {
      student = await prisma.student.findFirst({
        where: { studentId: 'WNS/GH/2025/001' },
        include: { user: true, programme: true },
      });
    }

    if (!student) {
      student = await prisma.student.findFirst({
        include: { user: true, programme: true },
      });
    }

    if (!student) {
      return NextResponse.json({ error: 'Student record not found' }, { status: 404 });
    }

    const [
      enrollments,
      invoices,
      payments,
      attendanceRecords,
      caResults,
      upcomingExams,
      assignments,
      announcements,
    ] = await Promise.all([
      prisma.courseEnrollment.findMany({
        where: { studentId: student.id },
        include: {
          course: {
            include: {
              lecturer: { select: { name: true, email: true } },
              schedules: true,
            },
          },
        },
      }),
      prisma.invoice.findMany({
        where: { studentId: student.id },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.payment.findMany({
        where: { studentId: student.id },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.attendanceRecord.findMany({
        where: { studentId: student.id },
        include: { session: { include: { course: true } } },
      }),
      prisma.continuousAssessment.findMany({
        where: { studentId: student.id },
        include: { course: true },
      }),
      prisma.examination.findMany({
        where: { isPublished: true },
        include: { course: true },
        orderBy: { scheduledDate: 'asc' },
        take: 3,
      }),
      prisma.assignment.findMany({
        include: {
          course: true,
          submissions: { where: { studentId: student.id } },
        },
        orderBy: { deadline: 'asc' },
        take: 5,
      }),
      prisma.announcement.findMany({
        where: {
          OR: [{ targetAudience: 'ALL' }, { targetAudience: 'STUDENTS' }],
        },
        orderBy: { createdAt: 'desc' },
        take: 3,
      }),
    ]);

    // Financial calculations in GHS
    const totalInvoiced = invoices.reduce((sum, inv) => sum + inv.amount, 0);
    const totalPaid = payments
      .filter((p) => p.status === 'SUCCESSFUL')
      .reduce((sum, p) => sum + p.amount, 0);
    const outstandingBalance = Math.max(0, totalInvoiced - totalPaid);

    // Attendance rate
    const totalAtt = attendanceRecords.length;
    const presentAtt = attendanceRecords.filter((a) => a.status === 'PRESENT').length;
    const attendancePercentage = totalAtt > 0 ? Math.round((presentAtt / totalAtt) * 100) : 95;

    // CGPA Calculation
    let totalGradePoints = 0;
    let totalCourses = 0;
    caResults.forEach((r) => {
      totalGradePoints += r.gpaPoint;
      totalCourses++;
    });
    const calculatedCgpa = totalCourses > 0 ? Number((totalGradePoints / totalCourses).toFixed(2)) : student.cgpa;

    return NextResponse.json({
      student: {
        id: student.id,
        studentId: student.studentId,
        name: student.user.name,
        email: student.user.email,
        phone: student.user.phone,
        avatar: student.user.avatar,
        programme: student.programme.name,
        programmeCode: student.programme.code,
        level: student.level,
        currentSemester: student.currentSemester,
        academicYear: student.academicYear,
        cgpa: calculatedCgpa,
      },
      stats: {
        enrolledCoursesCount: enrollments.length,
        totalTopics: 15,
        completedTopics: 8,
        latestScorePercent: 92,
        attendancePercentage,
        outstandingBalance,
        totalInvoiced,
        totalPaid,
        currency: 'GHS',
        currencySymbol: 'GH₵',
      },
      enrollments: enrollments.map((e) => ({
        id: e.id,
        courseId: e.courseId,
        code: e.course.code,
        title: e.course.title,
        lecturer: e.course.lecturer?.name || 'Faculty Lecturer',
        creditHours: e.course.creditHours,
        progress: e.progressPercent,
        schedules: e.course.schedules,
      })),
      upcomingExams: upcomingExams.map((exam) => ({
        id: exam.id,
        title: exam.title,
        courseCode: exam.course.code,
        courseTitle: exam.course.title,
        date: exam.scheduledDate,
        time: exam.scheduledTime,
        venue: exam.venue,
        durationMinutes: exam.durationMinutes,
      })),
      assignments: assignments.map((a) => ({
        id: a.id,
        title: a.title,
        courseCode: a.course.code,
        deadline: a.deadline,
        maxMarks: a.maxMarks,
        isSubmitted: a.submissions.length > 0,
        submission: a.submissions[0] || null,
      })),
      recentInvoices: invoices.slice(0, 3),
      recentPayments: payments.slice(0, 3),
      announcements,
    });
  } catch (error: any) {
    console.error('Student dashboard API error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch student dashboard' }, { status: 500 });
  }
}
