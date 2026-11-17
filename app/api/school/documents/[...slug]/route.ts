import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  try {
    const { slug } = await params;
    const filename = path.basename(slug.join('/'));
    if (!filename || filename.includes('..')) {
      return NextResponse.json({ error: 'Invalid document path' }, { status: 400 });
    }

    const fullPath = path.join(process.cwd(), 'storage', 'admissions', filename);
    const buffer = await fs.readFile(fullPath);

    const ext = path.extname(filename).toLowerCase();
    const contentType =
      ext === '.pdf'
        ? 'application/pdf'
        : ext === '.png'
        ? 'image/png'
        : ext === '.jpg' || ext === '.jpeg'
        ? 'image/jpeg'
        : 'application/octet-stream';

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `inline; filename="${filename}"`,
      },
    });
  } catch {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 });
  }
}

