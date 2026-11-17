import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

function detectFileType(buf: Buffer): { ext: string; mime: string; label: string } | null {
  if (buf.length >= 4 && buf.subarray(0, 4).toString('utf8') === '%PDF') {
    return { ext: 'pdf', mime: 'application/pdf', label: 'PDF' };
  }
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return { ext: 'jpg', mime: 'image/jpeg', label: 'JPG' };
  }
  if (buf.length >= 4 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
    return { ext: 'png', mime: 'image/png', label: 'PNG' };
  }
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'No file provided.' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    if (buffer.length === 0 || buffer.length > MAX_BYTES) {
      return NextResponse.json(
        { error: 'File must be between 1 byte and 10 MB.' },
        { status: 400 }
      );
    }

    const detected = detectFileType(buffer);
    if (!detected) {
      return NextResponse.json(
        { error: 'Invalid file format. Only PDF, JPG, and PNG documents are accepted.' },
        { status: 400 }
      );
    }

    const dir = path.join(process.cwd(), 'storage', 'admissions');
    await fs.mkdir(dir, { recursive: true });
    const filename = `${crypto.randomUUID()}.${detected.ext}`;
    await fs.writeFile(path.join(dir, filename), buffer);

    return NextResponse.json({
      fileUrl: `/api/school/documents/${filename}`,
      fileName: file.name,
      fileType: detected.label,
      fileSize: buffer.length,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Upload failed' }, { status: 500 });
  }
}

