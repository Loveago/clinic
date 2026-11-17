import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { prisma } from '@/lib/prisma';

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const material = await prisma.learningMaterial.findUnique({ where: { id } });

    if (!material || !material.filePath) {
      return NextResponse.json({ error: 'PDF document not found' }, { status: 404 });
    }

    const absPath = path.isAbsolute(material.filePath)
      ? material.filePath
      : path.join(process.cwd(), material.filePath);

    const fileBuffer = await fs.readFile(absPath);

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${material.title.replace(/[^a-zA-Z0-9._-]/g, '_')}.pdf"`,
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch (error) {
    console.error('GET PDF stream error:', error);
    return NextResponse.json({ error: 'Unable to read PDF file' }, { status: 500 });
  }
}

