import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { status, internalNotes } = body;

    const updated = await prisma.appointment.update({
      where: { id },
      data: {
        ...(status && { status }),
        ...(internalNotes !== undefined && { internalNotes }),
      },
    });

    return NextResponse.json({ success: true, appointment: updated });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update appointment' }, { status: 500 });
  }
}

