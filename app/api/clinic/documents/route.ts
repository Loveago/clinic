import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { authorizeClinicStaff, CLINIC_ALL_STAFF_ROLES, logClinicAudit } from '@/lib/clinic-auth';

const ALLOWED_MIME = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'text/plain',
]);
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export async function GET(req: NextRequest) {
  try {
    const auth = await authorizeClinicStaff(CLINIC_ALL_STAFF_ROLES);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 403 });
    }

    const { searchParams } = new URL(req.url);
    const patientId = searchParams.get('patientId') || undefined;

    const documents = await prisma.patientDocument.findMany({
      where: { ...(patientId ? { patientId } : {}) },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ documents });
  } catch (error) {
    console.error('GET patient documents error:', error);
    return NextResponse.json({ error: 'Failed to load documents' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authorizeClinicStaff(CLINIC_ALL_STAFF_ROLES);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 403 });
    }

    const formData = await req.formData();
    const patientId = String(formData.get('patientId') || '').trim();
    const title = String(formData.get('title') || '').trim();
    const category = String(formData.get('category') || 'MEDICAL_REPORT').trim();
    const file = formData.get('file') as File | null;

    if (!patientId || !file) {
      return NextResponse.json({ error: 'patientId and file are required' }, { status: 400 });
    }

    if (!ALLOWED_MIME.has(file.type)) {
      return NextResponse.json(
        { error: `Unsupported file type (${file.type}). Allowed: PDF, JPEG, PNG, WEBP, TXT.` },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    if (buffer.length > MAX_SIZE_BYTES) {
      return NextResponse.json({ error: 'File exceeds 10 MB limit.' }, { status: 400 });
    }

    const dir = path.join(process.cwd(), 'storage', 'clinic-documents');
    await fs.mkdir(dir, { recursive: true });
    const ext = path.extname(file.name) || '.bin';
    const safeName = `${crypto.randomUUID()}${ext}`;
    const relPath = path.join('storage', 'clinic-documents', safeName);
    await fs.writeFile(path.join(process.cwd(), relPath), buffer);

    const doc = await prisma.patientDocument.create({
      data: {
        patientId,
        title: title || file.name,
        category,
        fileName: file.name,
        mimeType: file.type,
        fileSizeBytes: buffer.length,
        storagePath: relPath,
        uploadedById: auth.userId || null,
        uploadedByName: auth.name || 'Clinic Staff',
      },
    });

    await logClinicAudit({
      actorId: auth.userId,
      actorName: auth.name,
      actorRole: auth.clinicRole,
      action: 'PATIENT_DOCUMENT_UPLOADED',
      entityType: 'PatientDocument',
      entityId: doc.id,
      details: { patientId, fileName: doc.fileName, category },
    });

    return NextResponse.json({ document: doc }, { status: 201 });
  } catch (error) {
    console.error('POST patient document error:', error);
    return NextResponse.json({ error: 'Failed to upload patient document' }, { status: 500 });
  }
}
