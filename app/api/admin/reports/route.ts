import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || 'students';

    if (type === 'students') {
      const students = await prisma.student.findMany({
        include: { user: true, programme: true },
      });

      const csvRows = [
        ['Student ID', 'Full Name', 'Email', 'Phone', 'Programme', 'Level', 'Status', 'CGPA'].join(','),
        ...students.map((s) =>
          [
            `"${s.studentId}"`,
            `"${s.user.name}"`,
            `"${s.user.email}"`,
            `"${s.user.phone || ''}"`,
            `"${s.programme.name}"`,
            `"${s.level}"`,
            `"${s.status}"`,
            `"${s.cgpa}"`,
          ].join(',')
        ),
      ].join('\n');

      return new NextResponse(csvRows, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="welllife_ghana_students.csv"',
        },
      });
    }

    if (type === 'finance') {
      const payments = await prisma.payment.findMany({
        include: { student: { include: { user: true } }, invoice: true },
      });

      const csvRows = [
        ['Receipt No', 'Reference', 'Student Name', 'Amount (GHS)', 'Method', 'Channel', 'Status', 'Date'].join(','),
        ...payments.map((p) =>
          [
            `"${p.receiptNumber}"`,
            `"${p.reference}"`,
            `"${p.student?.user?.name || 'Applicant/Student'}"`,
            `"${p.amount.toFixed(2)}"`,
            `"${p.method}"`,
            `"${p.channel}"`,
            `"${p.status}"`,
            `"${new Date(p.createdAt).toISOString()}"`,
          ].join(',')
        ),
      ].join('\n');

      return new NextResponse(csvRows, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="welllife_ghana_financial_report.csv"',
        },
      });
    }

    if (type === 'admissions') {
      const applications = await prisma.application.findMany({
        include: { programme: true },
      });

      const csvRows = [
        ['Application Ref', 'Applicant Name', 'Email', 'Phone', 'Programme', 'Status', 'Decision Date'].join(','),
        ...applications.map((a) =>
          [
            `"${a.referenceNumber}"`,
            `"${a.applicantName}"`,
            `"${a.applicantEmail}"`,
            `"${a.applicantPhone}"`,
            `"${a.programme.name}"`,
            `"${a.status}"`,
            `"${a.decisionDate ? new Date(a.decisionDate).toLocaleDateString('en-GH') : 'Pending'}"`,
          ].join(',')
        ),
      ].join('\n');

      return new NextResponse(csvRows, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="welllife_ghana_admissions.csv"',
        },
      });
    }

    return NextResponse.json({ error: 'Unknown report type' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

