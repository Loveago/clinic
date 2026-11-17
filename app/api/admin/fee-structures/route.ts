import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizeRole, FINANCE_ROLES, SCHOOL_STAFF_ROLES } from '@/lib/portal-auth';
import { ensureDefaultSchoolSetup, recordAuditLog } from '@/lib/school-admin';

export async function GET() {
  try {
    const auth = await authorizeRole(SCHOOL_STAFF_ROLES);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 403 });
    }

    await ensureDefaultSchoolSetup();

    const [categories, structures, programmes] = await Promise.all([
      prisma.feeCategory.findMany({ orderBy: { code: 'asc' } }),
      prisma.feeStructure.findMany({
        include: {
          programme: { select: { id: true, code: true, name: true } },
          admissionPeriod: { select: { id: true, name: true } },
          items: { include: { feeCategory: true } },
          _count: { select: { invoices: true } },
        },
        orderBy: [{ createdAt: 'desc' }],
      }),
      prisma.programme.findMany({ orderBy: { name: 'asc' } }),
    ]);

    return NextResponse.json({ categories, structures, programmes });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch fee structures' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authorizeRole(FINANCE_ROLES);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 403 });
    }

    const body = await req.json();

    if (body.action === 'create_category') {
      const { code, name, description } = body;
      if (!code || !name) {
        return NextResponse.json({ error: 'Category code and name are required.' }, { status: 400 });
      }
      const category = await prisma.feeCategory.create({
        data: {
          code: String(code).trim().toUpperCase(),
          name: String(name).trim(),
          description: description || null,
        },
      });
      return NextResponse.json({ category }, { status: 201 });
    }

    const {
      name,
      programmeId,
      academicYear = '2025/2026',
      semester = 'First Semester',
      level = 'Level 100',
      studentCategory = 'ALL',
      admissionPeriodId,
      effectiveDate,
      items,
    } = body;

    if (!name || !programmeId || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Structure name, programme, and at least one fee item in GHS are required.' },
        { status: 400 }
      );
    }

    const structure = await prisma.feeStructure.create({
      data: {
        name,
        programmeId,
        academicYear,
        semester,
        level,
        studentCategory,
        admissionPeriodId: admissionPeriodId || null,
        effectiveDate: effectiveDate || new Date().toISOString().slice(0, 10),
        version: 1,
        isActive: true,
        items: {
          create: items.map((it: any) => ({
            feeCategoryId: it.feeCategoryId,
            title: it.title,
            amount: Number(it.amount),
            isOptional: Boolean(it.isOptional),
          })),
        },
      },
      include: {
        programme: true,
        items: { include: { feeCategory: true } },
        _count: { select: { invoices: true } },
      },
    });

    await recordAuditLog({
      actorId: auth.userId,
      actorName: auth.name || 'Finance Officer',
      actorRole: auth.role || 'FINANCE_OFFICER',
      action: 'CREATE_FEE_STRUCTURE',
      entityType: 'FeeStructure',
      entityId: structure.id,
      details: { name, programmeId, academicYear, level },
    });

    return NextResponse.json({ structure }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to save fee structure' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await authorizeRole(FINANCE_ROLES);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 403 });
    }

    const body = await req.json();
    const { id, name, items, effectiveDate, isActive } = body;
    if (!id) {
      return NextResponse.json({ error: 'Fee structure ID is required.' }, { status: 400 });
    }

    const existing = await prisma.feeStructure.findUnique({
      where: { id },
      include: { items: true, _count: { select: { invoices: true } } },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Fee structure not found.' }, { status: 404 });
    }

    // Versioning: if invoices already reference this structure, create a new version instead of mutating history
    if (existing._count.invoices > 0 && Array.isArray(items)) {
      const nextStructure = await prisma.$transaction(async (tx) => {
        await tx.feeStructure.update({
          where: { id },
          data: { isActive: false },
        });
        return tx.feeStructure.create({
          data: {
            name: name || existing.name,
            programmeId: existing.programmeId,
            academicYear: existing.academicYear,
            semester: existing.semester,
            level: existing.level,
            studentCategory: existing.studentCategory,
            admissionPeriodId: existing.admissionPeriodId,
            version: existing.version + 1,
            effectiveDate: effectiveDate || new Date().toISOString().slice(0, 10),
            isActive: true,
            items: {
              create: items.map((it: any) => ({
                feeCategoryId: it.feeCategoryId,
                title: it.title,
                amount: Number(it.amount),
                isOptional: Boolean(it.isOptional),
              })),
            },
          },
          include: {
            programme: true,
            items: { include: { feeCategory: true } },
            _count: { select: { invoices: true } },
          },
        });
      });

      return NextResponse.json({
        structure: nextStructure,
        versioned: true,
        message: `Existing invoices preserved. Created Version ${nextStructure.version}.`,
      });
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (Array.isArray(items)) {
        await tx.feeStructureItem.deleteMany({ where: { feeStructureId: id } });
        await tx.feeStructureItem.createMany({
          data: items.map((it: any) => ({
            feeStructureId: id,
            feeCategoryId: it.feeCategoryId,
            title: it.title,
            amount: Number(it.amount),
            isOptional: Boolean(it.isOptional),
          })),
        });
      }
      return tx.feeStructure.update({
        where: { id },
        data: {
          ...(name !== undefined ? { name } : {}),
          ...(effectiveDate !== undefined ? { effectiveDate } : {}),
          ...(isActive !== undefined ? { isActive: Boolean(isActive) } : {}),
        },
        include: {
          programme: true,
          items: { include: { feeCategory: true } },
          _count: { select: { invoices: true } },
        },
      });
    });

    return NextResponse.json({ structure: updated, versioned: false });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update fee structure' }, { status: 500 });
  }
}

