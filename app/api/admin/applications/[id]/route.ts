import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { status, reviewNotes } = body;

    const application = await prisma.application.findUnique({
      where: { id },
      include: { programme: true },
    });

    if (!application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    // If enrolling the student
    if (status === 'ENROLLED' && application.status !== 'ENROLLED') {
      const studentCount = await prisma.student.count();
      const studentNumber = `WNS/GH/2025/${String(studentCount + 1).padStart(3, '0')}`;
      const defaultPassword = await bcrypt.hash('student123', 10);

      // Check if user already exists
      let user = await prisma.user.findUnique({
        where: { email: application.applicantEmail.toLowerCase() },
      });

      if (!user) {
        user = await prisma.user.create({
          data: {
            email: application.applicantEmail.toLowerCase(),
            passwordHash: defaultPassword,
            name: application.applicantName,
            role: 'STUDENT',
            phone: application.applicantPhone,
            avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
          },
        });
      }

      await prisma.student.upsert({
        where: { userId: user.id },
        update: {
          status: 'ACTIVE',
          programmeId: application.programmeId,
        },
        create: {
          studentId: studentNumber,
          userId: user.id,
          programmeId: application.programmeId,
          intake: '2025/2026 Academic Session',
          currentSemester: 'First Semester',
          status: 'ACTIVE',
        },
      });
    }

    const updated = await prisma.application.update({
      where: { id },
      data: {
        ...(status ? { status } : {}),
        ...(reviewNotes ? { reviewNotes } : {}),
        decisionDate: new Date(),
      },
      include: {
        programme: true,
      },
    });

    return NextResponse.json({
      success: true,
      application: updated,
      message: `Application status updated to ${status}`,
    });
  } catch (error: any) {
    console.error('Update application status error:', error);
    return NextResponse.json({ error: error.message || 'Failed to update application status' }, { status: 500 });
  }
}
