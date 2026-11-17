import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const programs = await prisma.programme.findMany({
      orderBy: { fee: 'asc' },
    });
    return NextResponse.json({ programs });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch programmes' }, { status: 500 });
  }
}

