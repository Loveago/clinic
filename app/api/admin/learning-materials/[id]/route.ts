import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { authorizeAdminOrLecturer } from '@/lib/portal-auth';
import { validatePdfBuffer, processLearningMaterialPdf } from '@/lib/pdf-processor';

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authorizeAdminOrLecturer();
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 403 });
    }

    const { id } = await context.params;
    const material = await prisma.learningMaterial.findUnique({
      where: { id },
      include: {
        course: { include: { programme: true } },
        processingJobs: { orderBy: { createdAt: 'desc' }, take: 5 },
        extractedTopics: {
          orderBy: { orderIndex: 'asc' },
          include: {
            subtopics: { orderBy: { orderIndex: 'asc' } },
            _count: { select: { questions: true } },
          },
        },
      },
    });

    if (!material) {
      return NextResponse.json({ error: 'Learning material not found' }, { status: 404 });
    }

    return NextResponse.json({
      material: {
        ...material,
        fileUrl: `/api/admin/learning-materials/${material.id}/pdf`,
      },
    });
  } catch (error) {
    console.error('GET learning-material detail error:', error);
    return NextResponse.json({ error: 'Failed to load learning material' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authorizeAdminOrLecturer();
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 403 });
    }

    const { id } = await context.params;
    const existing = await prisma.learningMaterial.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Learning material not found' }, { status: 404 });
    }

    const contentType = req.headers.get('content-type') || '';

    // Handle PDF replacement via multipart/form-data
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;
      if (!file) {
        return NextResponse.json({ error: 'Replacement PDF file is required.' }, { status: 400 });
      }
      const buffer = Buffer.from(await file.arrayBuffer());
      const validation = validatePdfBuffer(buffer);
      if (!validation.valid) {
        return NextResponse.json({ error: validation.error }, { status: 400 });
      }

      const storageDir = path.join(process.cwd(), 'storage', 'pdfs');
      await fs.mkdir(storageDir, { recursive: true });
      const filename = `${crypto.randomUUID()}.pdf`;
      const relativePath = path.join('storage', 'pdfs', filename);
      await fs.writeFile(path.join(process.cwd(), relativePath), buffer);

      const contentHash = crypto.createHash('sha256').update(buffer).digest('hex');
      const fileSizeStr =
        buffer.length < 1024 * 1024
          ? `${Math.max(1, Math.round(buffer.length / 1024))} KB`
          : `${(buffer.length / (1024 * 1024)).toFixed(2)} MB`;

      await prisma.learningMaterial.update({
        where: { id },
        data: {
          fileName: file.name || 'document.pdf',
          filePath: relativePath,
          fileSize: fileSizeStr,
          pdfVersion: { increment: 1 },
          contentHash,
          processingStatus: 'PENDING',
        },
      });

      const result = await processLearningMaterialPdf(id);
      const updated = await prisma.learningMaterial.findUnique({
        where: { id },
        include: { processingJobs: { orderBy: { createdAt: 'desc' }, take: 1 } },
      });
      return NextResponse.json({ material: updated, processingResult: result });
    }

    const body = await req.json();
    const { action, title, description, status, level, semester, academicYear, category, scope, confirmed } = body;

    if (action === 'reprocess' || action === 'retry') {
      const result = await processLearningMaterialPdf(id, {
        forceRetry: action === 'retry',
      });
      const updated = await prisma.learningMaterial.findUnique({
        where: { id },
        include: {
          processingJobs: { orderBy: { createdAt: 'desc' }, take: 1 },
          extractedTopics: { orderBy: { orderIndex: 'asc' } },
        },
      });
      return NextResponse.json({ material: updated, processingResult: result });
    }

    if (action === 'regenerate') {
      if (confirmed !== true) {
        return NextResponse.json(
          { error: 'Explicit confirmation (confirmed: true) is required before regenerating AI content.' },
          { status: 400 }
        );
      }
      const validScopes = ['TOPICS', 'NOTES', 'QUESTIONS', 'ALL'];
      const targetScope = validScopes.includes(scope) ? scope : 'ALL';
      const result = await processLearningMaterialPdf(id, {
        isRegeneration: true,
        scope: targetScope,
        confirmed: true,
      });
      const updated = await prisma.learningMaterial.findUnique({
        where: { id },
        include: {
          processingJobs: { orderBy: { createdAt: 'desc' }, take: 1 },
          extractedTopics: { orderBy: { orderIndex: 'asc' } },
        },
      });
      return NextResponse.json({ material: updated, processingResult: result });
    }

    if (status === 'PUBLISHED') {
      const approvedCount = await prisma.extractedTopic.count({
        where: { materialId: id, status: { in: ['APPROVED', 'PUBLISHED'] } },
      });
      if (approvedCount === 0) {
        return NextResponse.json(
          { error: 'Approve at least one extracted topic before publishing this learning material.' },
          { status: 400 }
        );
      }
      // Publish approved topics alongside the material
      await prisma.extractedTopic.updateMany({
        where: { materialId: id, status: 'APPROVED' },
        data: { status: 'PUBLISHED' },
      });
    }

    const updated = await prisma.learningMaterial.update({
      where: { id },
      data: {
        ...(title !== undefined ? { title } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(status !== undefined ? { status } : {}),
        ...(level !== undefined ? { level } : {}),
        ...(semester !== undefined ? { semester } : {}),
        ...(academicYear !== undefined ? { academicYear } : {}),
        ...(category !== undefined ? { category } : {}),
      },
    });

    return NextResponse.json({ material: updated });
  } catch (error) {
    console.error('PATCH learning-material error:', error);
    return NextResponse.json({ error: 'Failed to update learning material' }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authorizeAdminOrLecturer();
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 403 });
    }

    const { id } = await context.params;
    const material = await prisma.learningMaterial.findUnique({ where: { id } });
    if (!material) {
      return NextResponse.json({ error: 'Learning material not found' }, { status: 404 });
    }

    if (material.filePath) {
      const absPath = path.isAbsolute(material.filePath)
        ? material.filePath
        : path.join(process.cwd(), material.filePath);
      await fs.unlink(absPath).catch(() => {});
    }

    await prisma.learningMaterial.delete({ where: { id } });
    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error('DELETE learning-material error:', error);
    return NextResponse.json({ error: 'Failed to delete learning material' }, { status: 500 });
  }
}

