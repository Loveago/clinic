import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { authorizeAdminOrLecturer } from '@/lib/portal-auth';
import { validatePdfBuffer, processLearningMaterialPdf } from '@/lib/pdf-processor';

export async function GET(req: NextRequest) {
  try {
    const auth = await authorizeAdminOrLecturer();
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 403 });
    }

    const { searchParams } = new URL(req.url);
    const courseId = searchParams.get('courseId') || undefined;
    const status = searchParams.get('status') || undefined;
    const processingStatus = searchParams.get('processingStatus') || undefined;
    const search = searchParams.get('search')?.trim().toLowerCase() || '';

    const materials = await prisma.learningMaterial.findMany({
      where: {
        fileType: 'PDF',
        ...(courseId ? { courseId } : {}),
        ...(status ? { status } : {}),
        ...(processingStatus ? { processingStatus } : {}),
      },
      include: {
        course: { include: { programme: true } },
        processingJobs: { orderBy: { createdAt: 'desc' }, take: 1 },
        extractedTopics: {
          select: {
            id: true,
            status: true,
            _count: { select: { questions: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const formatted = materials
      .filter((m) => {
        if (!search) return true;
        return (
          m.title.toLowerCase().includes(search) ||
          m.course.title.toLowerCase().includes(search) ||
          m.course.code.toLowerCase().includes(search)
        );
      })
      .map((m) => {
        const topicsCount = m.extractedTopics.length;
        const questionsCount = m.extractedTopics.reduce(
          (sum, t) => sum + (t._count?.questions || 0),
          0
        );
        return {
          id: m.id,
          title: m.title,
          description: m.description,
          courseId: m.courseId,
          courseCode: m.course.code,
          courseTitle: m.course.title,
          programmeId: m.programmeId || m.course.programmeId,
          programmeName: m.course.programme?.name || 'Nursing Programme',
          academicYear: m.academicYear || '2025/2026',
          semester: m.semester || m.course.semester,
          level: m.level || m.course.level,
          category: m.category,
          fileName: m.fileName,
          fileSize: m.fileSize,
          pageCount: m.pageCount,
          pdfVersion: m.pdfVersion,
          contentHash: m.contentHash,
          processedAt: m.processedAt,
          fileUrl: `/api/admin/learning-materials/${m.id}/pdf`,
          processingStatus: m.processingStatus,
          latestJob: m.processingJobs[0] || null,
          status: m.status,
          topicsCount,
          questionsCount,
          createdAt: m.createdAt,
        };
      });

    return NextResponse.json({ materials: formatted });
  } catch (error) {
    console.error('GET learning-materials error:', error);
    return NextResponse.json({ error: 'Failed to load learning materials' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authorizeAdminOrLecturer();
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 403 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const title = (formData.get('title') as string | null)?.trim();
    const description = (formData.get('description') as string | null)?.trim() || null;
    const courseId = (formData.get('courseId') as string | null)?.trim();
    const programmeId = (formData.get('programmeId') as string | null)?.trim() || null;
    const academicYear = (formData.get('academicYear') as string | null)?.trim() || '2025/2026';
    const semester = (formData.get('semester') as string | null)?.trim() || 'First Semester';
    const level = (formData.get('level') as string | null)?.trim() || 'Level 100';
    const category = (formData.get('category') as string | null)?.trim() || 'Core Study Material';
    const processMode = (formData.get('processMode') as string | null) || 'background';

    if (!file) {
      return NextResponse.json({ error: 'A PDF file is required.' }, { status: 400 });
    }
    if (!title || !courseId) {
      return NextResponse.json({ error: 'Document title and course are required.' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
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
    const fileSizeMb = (buffer.length / (1024 * 1024)).toFixed(2);
    const fileSizeStr = buffer.length < 1024 * 1024
      ? `${Math.max(1, Math.round(buffer.length / 1024))} KB`
      : `${fileSizeMb} MB`;

    const material = await prisma.learningMaterial.create({
      data: {
        title,
        description,
        courseId,
        programmeId,
        academicYear,
        semester,
        level,
        category,
        fileType: 'PDF',
        fileName: file.name || 'document.pdf',
        filePath: relativePath,
        fileUrl: '/api/admin/learning-materials/pending/pdf',
        fileSize: fileSizeStr,
        pdfVersion: 1,
        contentHash,
        processingStatus: 'PENDING',
        status: 'DRAFT',
        uploadedById: auth.userId || null,
      },
    });

    await prisma.learningMaterial.update({
      where: { id: material.id },
      data: { fileUrl: `/api/admin/learning-materials/${material.id}/pdf` },
    });

    if (processMode === 'sync') {
      const result = await processLearningMaterialPdf(material.id);
      const updated = await prisma.learningMaterial.findUnique({
        where: { id: material.id },
        include: { processingJobs: { orderBy: { createdAt: 'desc' }, take: 1 } },
      });
      return NextResponse.json({ material: updated, processingResult: result }, { status: 201 });
    }

    // Trigger asynchronous background processing without blocking the upload response
    setImmediate(() => {
      processLearningMaterialPdf(material.id).catch((err) => {
        console.error('Background PDF processing failed:', err);
      });
    });

    return NextResponse.json(
      {
        material: {
          ...material,
          fileUrl: `/api/admin/learning-materials/${material.id}/pdf`,
        },
        message: 'PDF uploaded and queued for topic extraction.',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('POST learning-materials error:', error);
    return NextResponse.json({ error: 'Failed to upload PDF material' }, { status: 500 });
  }
}

