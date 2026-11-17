import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const doctors = await prisma.medicalStaff.findMany({
      orderBy: { createdAt: 'asc' },
    });
    return NextResponse.json({ doctors });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch medical staff' }, { status: 500 });
  }
}

