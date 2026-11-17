import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getCurrentUser();
    let student = null;
    let userId = user?.id;

    if (userId) {
      student = await prisma.student.findUnique({ where: { userId } });
    }
    if (!student) {
      student = await prisma.student.findFirst({ where: { studentId: 'WNS/GH/2025/001' } });
      userId = student?.userId;
    }

    if (!userId) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    const tickets = await prisma.supportTicket.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ tickets });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const body = await req.json();
    const { subject, category = 'Academic', message } = body;

    let student = null;
    let userId = user?.id;

    if (userId) {
      student = await prisma.student.findUnique({ where: { userId } });
    }
    if (!student) {
      student = await prisma.student.findFirst({ where: { studentId: 'WNS/GH/2025/001' } });
      userId = student?.userId;
    }

    if (!userId) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    if (!subject || !message) {
      return NextResponse.json({ error: 'Subject and message are required' }, { status: 400 });
    }

    const ticket = await prisma.supportTicket.create({
      data: {
        userId,
        studentId: student?.id,
        subject,
        category,
        message,
        status: 'OPEN',
      },
    });

    return NextResponse.json({ status: true, ticket }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

