import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import {
  authorizeClinicStaff,
  CLINIC_ADMIN_ROLES,
  normalizeGhanaPhone,
  logClinicAudit,
} from '@/lib/clinic-auth';

export async function GET() {
  try {
    const auth = await authorizeClinicStaff();
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 403 });
    }

    const [departments, services, staff, diagnosisCatalog, labCatalog] = await Promise.all([
      prisma.clinicDepartment.findMany({
        orderBy: { name: 'asc' },
        include: { _count: { select: { services: true, staff: true } } },
      }),
      prisma.clinicService.findMany({
        orderBy: { title: 'asc' },
        include: { department: true },
      }),
      prisma.clinicStaffProfile.findMany({
        include: {
          user: { select: { id: true, name: true, email: true, phone: true, role: true, staffId: true, title: true } },
          department: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.diagnosisCatalog.findMany({
        where: { isActive: true },
        orderBy: { name: 'asc' },
      }),
      prisma.labTestCatalog.findMany({
        orderBy: { name: 'asc' },
      }),
    ]);

    return NextResponse.json({ departments, services, staff, diagnosisCatalog, labCatalog });
  } catch (error) {
    console.error('GET clinic catalog error:', error);
    return NextResponse.json({ error: 'Failed to load clinic catalog' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authorizeClinicStaff(CLINIC_ADMIN_ROLES);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 403 });
    }

    const body = await req.json();
    const { entity } = body;

    if (entity === 'department') {
      const name = String(body.name || '').trim();
      if (!name) return NextResponse.json({ error: 'Department name is required' }, { status: 400 });
      const dept = await prisma.clinicDepartment.create({
        data: {
          name,
          description: String(body.description || `${name} clinical unit`),
          headDoctor: String(body.headDoctor || 'Assigned Clinician'),
          room: String(body.room || 'Block A'),
          iconName: String(body.iconName || 'Stethoscope'),
          isActive: body.isActive !== false,
        },
      });
      await logClinicAudit({
        actorId: auth.userId,
        actorName: auth.name,
        actorRole: auth.clinicRole,
        action: 'CLINIC_DEPARTMENT_CREATED',
        entityType: 'ClinicDepartment',
        entityId: dept.id,
        details: { name: dept.name },
      });
      return NextResponse.json({ department: dept }, { status: 201 });
    }

    if (entity === 'service') {
      const title = String(body.title || '').trim();
      if (!title) return NextResponse.json({ error: 'Service title is required' }, { status: 400 });
      const service = await prisma.clinicService.create({
        data: {
          title,
          category: String(body.category || 'General Consultation'),
          description: String(body.description || `${title} service`),
          iconName: String(body.iconName || 'HeartPulse'),
          duration: body.duration ? String(body.duration) : '30 mins',
          feeGHS: Number(body.feeGHS) || 100,
          departmentId: body.departmentId || null,
          isActive: body.isActive !== false,
        },
        include: { department: true },
      });
      await logClinicAudit({
        actorId: auth.userId,
        actorName: auth.name,
        actorRole: auth.clinicRole,
        action: 'CLINIC_SERVICE_CREATED',
        entityType: 'ClinicService',
        entityId: service.id,
        details: { title: service.title, feeGHS: service.feeGHS },
      });
      return NextResponse.json({ service }, { status: 201 });
    }

    if (entity === 'staff') {
      const email = String(body.email || '').trim().toLowerCase();
      const name = String(body.name || '').trim();
      const clinicRole = String(body.clinicRole || 'DOCTOR').trim().toUpperCase();
      if (!email || !name) {
        return NextResponse.json({ error: 'Staff name and email are required' }, { status: 400 });
      }

      // Reuse existing User identity if email already exists
      let user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        const passwordHash = await bcrypt.hash(String(body.password || 'Clinic@2026'), 10);
        const count = await prisma.user.count();
        user = await prisma.user.create({
          data: {
            email,
            name,
            passwordHash,
            role: clinicRole as never,
            phone: body.phone ? normalizeGhanaPhone(String(body.phone)) : null,
            title: body.title || null,
            staffId: `WMC-STF-${new Date().getFullYear()}-${String(count + 1).padStart(3, '0')}`,
          },
        });
      }

      const existingProfile = await prisma.clinicStaffProfile.findUnique({ where: { userId: user.id } });
      if (existingProfile) {
        return NextResponse.json({ error: 'Staff member already has a clinic profile' }, { status: 409 });
      }

      const staffProfile = await prisma.clinicStaffProfile.create({
        data: {
          userId: user.id,
          clinicRole,
          departmentId: body.departmentId || null,
          specialty: body.specialty || null,
          licenseNumber: body.licenseNumber || null,
          scheduleDays: body.scheduleDays || 'Mon,Tue,Wed,Thu,Fri',
          isActive: true,
        },
        include: {
          user: { select: { id: true, name: true, email: true, phone: true, role: true, staffId: true, title: true } },
          department: true,
        },
      });

      await logClinicAudit({
        actorId: auth.userId,
        actorName: auth.name,
        actorRole: auth.clinicRole,
        action: 'CLINIC_STAFF_ASSIGNED',
        entityType: 'ClinicStaffProfile',
        entityId: staffProfile.id,
        details: { email, clinicRole },
      });

      return NextResponse.json({ staff: staffProfile }, { status: 201 });
    }

    if (entity === 'diagnosisCatalog') {
      const code = String(body.code || '').trim().toUpperCase();
      const name = String(body.name || '').trim();
      if (!code || !name) return NextResponse.json({ error: 'Code and name required' }, { status: 400 });
      const entry = await prisma.diagnosisCatalog.create({
        data: { code, name, category: body.category || 'General', description: body.description || null },
      });
      return NextResponse.json({ diagnosisCatalog: entry }, { status: 201 });
    }

    return NextResponse.json({ error: 'Unknown entity type' }, { status: 400 });
  } catch (error) {
    console.error('POST clinic catalog error:', error);
    return NextResponse.json({ error: 'Failed to save clinic catalog item' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await authorizeClinicStaff(CLINIC_ADMIN_ROLES);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 403 });
    }

    const body = await req.json();
    const { entity, id } = body;
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    if (entity === 'department') {
      const updated = await prisma.clinicDepartment.update({
        where: { id },
        data: {
          ...(body.name !== undefined ? { name: body.name } : {}),
          ...(body.headDoctor !== undefined ? { headDoctor: body.headDoctor } : {}),
          ...(body.room !== undefined ? { room: body.room } : {}),
          ...(body.isActive !== undefined ? { isActive: Boolean(body.isActive) } : {}),
        },
      });
      return NextResponse.json({ department: updated });
    }

    if (entity === 'service') {
      const updated = await prisma.clinicService.update({
        where: { id },
        data: {
          ...(body.title !== undefined ? { title: body.title } : {}),
          ...(body.feeGHS !== undefined ? { feeGHS: Number(body.feeGHS) } : {}),
          ...(body.departmentId !== undefined ? { departmentId: body.departmentId || null } : {}),
          ...(body.isActive !== undefined ? { isActive: Boolean(body.isActive) } : {}),
        },
        include: { department: true },
      });
      return NextResponse.json({ service: updated });
    }

    if (entity === 'staff') {
      const updated = await prisma.clinicStaffProfile.update({
        where: { id },
        data: {
          ...(body.clinicRole !== undefined ? { clinicRole: String(body.clinicRole).toUpperCase() } : {}),
          ...(body.departmentId !== undefined ? { departmentId: body.departmentId || null } : {}),
          ...(body.specialty !== undefined ? { specialty: body.specialty } : {}),
          ...(body.scheduleDays !== undefined ? { scheduleDays: body.scheduleDays } : {}),
          ...(body.isActive !== undefined ? { isActive: Boolean(body.isActive) } : {}),
        },
        include: {
          user: { select: { id: true, name: true, email: true, phone: true, role: true, staffId: true } },
          department: true,
        },
      });
      await logClinicAudit({
        actorId: auth.userId,
        actorName: auth.name,
        actorRole: auth.clinicRole,
        action: 'CLINIC_STAFF_UPDATED',
        entityType: 'ClinicStaffProfile',
        entityId: updated.id,
        details: { clinicRole: updated.clinicRole, isActive: updated.isActive },
      });
      return NextResponse.json({ staff: updated });
    }

    return NextResponse.json({ error: 'Unknown entity type' }, { status: 400 });
  } catch (error) {
    console.error('PATCH clinic catalog error:', error);
    return NextResponse.json({ error: 'Failed to update clinic catalog item' }, { status: 500 });
  }
}
