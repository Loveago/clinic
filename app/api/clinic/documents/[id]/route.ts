import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { prisma } from '@/lib/prisma';
import { authorizeClinicStaff, CLINIC_ALL_STAFF_ROLES } from '@/lib/clinic-auth';
import { getCurrentUser } from '@/lib/auth';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const doc = await prisma.patientDocument.findUnique({
      where: { id },
      include: { patient: { select: { userId: true } } },
    });
    if (!doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    const user = await getCurrentUser();
    if (user) {
      const isPatientOwner = doc.patient?.userId && doc.patient.userId === user.id;
      if (!isPatientOwner) {
        const auth = await authorizeClinicStaff(CLINIC_ALL_STAFF_ROLES);
        if (!auth.authorized) {
          return NextResponse.json({ error: auth.error }, { status: 403 });
        }
      }
    } else {
      const auth = await authorizeClinicStaff(CLINIC_ALL_STAFF_ROLES);
      if (!auth.authorized) {
        return NextResponse.json({ error: auth.error }, { status: 403 });
      }
    }

    const fullPath = path.join(process.cwd(), doc.storagePath);
    const bytes = await fs.readFile(fullPath);

    return new NextResponse(bytes, {
      status: 200,
      headers: {
        'Content-Type': doc.mimeType,
        'Content-Disposition': `inline; filename="${encodeURIComponent(doc.fileName)}"`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (error) {
    console.error('GET patient document download error:', error);
    return NextResponse.json({ error: 'Failed to retrieve patient document' }, { status: 500 });
  }
}
