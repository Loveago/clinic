import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import {
  ACADEMIC_ADMIN_ROLES,
  authorizeRole,
  logAcademicAudit,
} from '@/lib/portal-auth';

async function generateStaffId(format?: string): Promise<string> {
  const year = String(new Date().getFullYear());
  const template = format?.trim() || 'WLS-LEC-{YYYY}-{XXX}';
  const existingCount = await prisma.user.count({ where: { role: 'LECTURER' } });
  let seq = existingCount + 1;

  for (let attempt = 0; attempt < 25; attempt++) {
    const padded = String(seq).padStart(3, '0');
    let candidate = template
      .replace(/\{YYYY\}|YYYY/g, year)
      .replace(/\{XXX\}|XXX/g, padded);

    if (candidate === template) {
      candidate = `WLS-LEC-${year}-${padded}`;
    }

    const [userExists, profileExists] = await Promise.all([
      prisma.user.findUnique({ where: { staffId: candidate }, select: { id: true } }),
      prisma.lecturerProfile.findUnique({ where: { staffId: candidate }, select: { id: true } }),
    ]);

    if (!userExists && !profileExists) {
      return candidate;
    }
    seq += 1;
  }

  return `WLS-LEC-${year}-${Date.now().toString().slice(-4)}`;
}

export async function GET(req: NextRequest) {
  const auth = await authorizeRole([...ACADEMIC_ADMIN_ROLES, 'LECTURER']);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status || 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search')?.trim();
    const departmentId = searchParams.get('departmentId')?.trim();
    const employmentStatus = searchParams.get('employmentStatus')?.trim();
    const lecturerId = searchParams.get('lecturerId')?.trim();
    const includeInactive = searchParams.get('includeInactive') === 'true';

    const where: any = { role: 'LECTURER' };
    if (lecturerId) {
      where.id = lecturerId;
    }
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
        { staffId: { contains: search } },
        { department: { contains: search } },
      ];
    }
    if (departmentId || employmentStatus) {
      where.lecturerProfile = {
        ...(departmentId ? { departmentId } : {}),
        ...(employmentStatus ? { employmentStatus } : {}),
      };
    }

    const [lecturers, departments, auditLogs] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          staffId: true,
          department: true,
          title: true,
          avatar: true,
          createdAt: true,
          lecturerProfile: {
            include: {
              department: { select: { id: true, code: true, name: true } },
            },
          },
          lecturerCourses: {
            select: {
              id: true,
              code: true,
              title: true,
              creditHours: true,
              level: true,
              semester: true,
              status: true,
            },
          },
          courseAssignments: {
            where: includeInactive ? undefined : { isActive: true },
            include: {
              course: {
                select: {
                  id: true,
                  code: true,
                  title: true,
                  creditHours: true,
                  level: true,
                  semester: true,
                },
              },
            },
            orderBy: { assignedAt: 'desc' },
          },
          teachingSchedules: {
            select: {
              id: true,
              courseId: true,
              dayOfWeek: true,
              startTime: true,
              endTime: true,
              venue: true,
            },
          },
        },
        orderBy: { name: 'asc' },
      }),
      prisma.department.findMany({ orderBy: { name: 'asc' } }),
      lecturerId
        ? prisma.auditLog.findMany({
            where: {
              OR: [
                { entityId: lecturerId },
                { detailsJson: { contains: lecturerId } },
              ],
            },
            orderBy: { createdAt: 'desc' },
            take: 30,
          })
        : Promise.resolve([]),
    ]);

    return NextResponse.json({
      lecturers,
      departments,
      ...(lecturerId ? { auditLogs } : {}),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await authorizeRole(ACADEMIC_ADMIN_ROLES);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status || 403 });
  }

  try {
    const body = await req.json();
    const action = body.action || 'create_lecturer';

    if (action === 'assign_course') {
      const {
        courseId,
        lecturerId,
        semesterId,
        academicYearId,
        cohortId,
        role = 'PRIMARY',
        setAsPrimaryOnCourse,
      } = body;

      if (!courseId || !lecturerId) {
        return NextResponse.json(
          { error: 'courseId and lecturerId are required' },
          { status: 400 }
        );
      }

      const [course, lecturer] = await Promise.all([
        prisma.course.findUnique({ where: { id: courseId }, select: { id: true, code: true, title: true } }),
        prisma.user.findUnique({ where: { id: lecturerId }, select: { id: true, name: true, role: true } }),
      ]);

      if (!course) {
        return NextResponse.json({ error: 'Course not found' }, { status: 404 });
      }
      if (!lecturer || lecturer.role !== 'LECTURER') {
        return NextResponse.json({ error: 'Lecturer not found' }, { status: 404 });
      }

      const normalizedSemesterId = semesterId || null;
      const existing = await prisma.courseLecturer.findFirst({
        where: {
          courseId,
          lecturerId,
          semesterId: normalizedSemesterId,
        },
      });

      if (existing && existing.isActive) {
        return NextResponse.json(
          { error: 'Lecturer is already assigned to this course for the selected semester.' },
          { status: 409 }
        );
      }

      const assignment = existing
        ? await prisma.courseLecturer.update({
            where: { id: existing.id },
            data: {
              isActive: true,
              role,
              academicYearId: academicYearId || null,
              cohortId: cohortId || null,
              assignedAt: new Date(),
            },
            include: {
              course: { select: { id: true, code: true, title: true, creditHours: true } },
              lecturer: { select: { id: true, name: true, email: true, staffId: true } },
            },
          })
        : await prisma.courseLecturer.create({
            data: {
              courseId,
              lecturerId,
              semesterId: normalizedSemesterId,
              academicYearId: academicYearId || null,
              cohortId: cohortId || null,
              role,
              isActive: true,
            },
            include: {
              course: { select: { id: true, code: true, title: true, creditHours: true } },
              lecturer: { select: { id: true, name: true, email: true, staffId: true } },
            },
          });

      if (role === 'PRIMARY' || setAsPrimaryOnCourse) {
        await prisma.course.update({
          where: { id: courseId },
          data: { lecturerId },
        });
      }

      await logAcademicAudit({
        actorId: auth.userId,
        actorName: auth.name,
        actorRole: auth.role,
        action: 'ASSIGN_COURSE_LECTURER',
        entityType: 'CourseLecturer',
        entityId: assignment.id,
        details: {
          courseId,
          courseCode: course.code,
          lecturerId,
          lecturerName: lecturer.name,
          semesterId: normalizedSemesterId,
          academicYearId: academicYearId || null,
          cohortId: cohortId || null,
          role,
        },
      });

      return NextResponse.json({ status: true, assignment }, { status: 201 });
    }

    // Create lecturer (default action)
    const {
      name,
      email,
      phone,
      staffId,
      staffIdFormat,
      department,
      departmentId,
      title,
      password,
      qualifications,
      specialization,
      employmentStatus,
      dateEmployed,
      bio,
      officeLocation,
      photoUrl,
      assignedCourseIds,
    } = body;

    if (!name || !email) {
      return NextResponse.json({ error: 'Name and email are required' }, { status: 400 });
    }

    const existingEmail = await prisma.user.findUnique({
      where: { email: String(email).trim().toLowerCase() },
      select: { id: true },
    });
    if (existingEmail) {
      return NextResponse.json(
        { error: 'A user with this email already exists.' },
        { status: 409 }
      );
    }

    let resolvedDeptName = department || 'General Nursing';
    if (departmentId) {
      const deptRecord = await prisma.department.findUnique({
        where: { id: departmentId },
        select: { name: true },
      });
      if (deptRecord?.name && !department) {
        resolvedDeptName = deptRecord.name;
      }
    }

    const resolvedStaffId = staffId?.trim() || (await generateStaffId(staffIdFormat));
    const passwordHash = await bcrypt.hash(password || 'lecturer123', 10);

    const result = await prisma.$transaction(async (tx) => {
      const lecturer = await tx.user.create({
        data: {
          name: String(name).trim(),
          email: String(email).trim().toLowerCase(),
          phone: phone || '+233 20 000 0000',
          staffId: resolvedStaffId,
          department: resolvedDeptName,
          title: title || null,
          avatar: photoUrl || null,
          role: 'LECTURER',
          passwordHash,
        },
      });

      const profile = await tx.lecturerProfile.create({
        data: {
          userId: lecturer.id,
          staffId: resolvedStaffId,
          departmentId: departmentId || null,
          qualifications: qualifications || null,
          specialization: specialization || null,
          employmentStatus: employmentStatus || 'ACTIVE',
          dateEmployed: dateEmployed || new Date().toISOString().slice(0, 10),
          bio: bio || null,
          officeLocation: officeLocation || null,
          phone: phone || '+233 20 000 0000',
          photoUrl: photoUrl || null,
        },
      });

      if (Array.isArray(assignedCourseIds) && assignedCourseIds.length > 0) {
        for (const courseId of assignedCourseIds) {
          await tx.course.update({
            where: { id: courseId },
            data: { lecturerId: lecturer.id },
          });
          await tx.courseLecturer.create({
            data: {
              courseId,
              lecturerId: lecturer.id,
              role: 'PRIMARY',
              isActive: true,
            },
          });
        }
      }

      return { lecturer, profile };
    });

    await logAcademicAudit({
      actorId: auth.userId,
      actorName: auth.name,
      actorRole: auth.role,
      action: 'CREATE_LECTURER',
      entityType: 'Lecturer',
      entityId: result.lecturer.id,
      details: {
        name: result.lecturer.name,
        email: result.lecturer.email,
        staffId: resolvedStaffId,
        departmentId: departmentId || null,
        assignedCourseIds: assignedCourseIds || [],
      },
    });

    const { passwordHash: _removed, ...safeLecturer } = result.lecturer;
    return NextResponse.json(
      { status: true, lecturer: safeLecturer, profile: result.profile },
      { status: 201 }
    );
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return NextResponse.json(
        { error: 'Duplicate email or staff ID detected.' },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await authorizeRole(ACADEMIC_ADMIN_ROLES);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status || 403 });
  }

  try {
    const body = await req.json();
    const action = body.action || 'update_profile';

    if (action === 'update_assignment' || action === 'deactivate_assignment') {
      const assignmentId = body.assignmentId || body.id;
      if (!assignmentId) {
        return NextResponse.json({ error: 'assignmentId is required' }, { status: 400 });
      }

      const updated = await prisma.courseLecturer.update({
        where: { id: assignmentId },
        data: {
          ...(body.role !== undefined ? { role: body.role } : {}),
          ...(body.cohortId !== undefined ? { cohortId: body.cohortId || null } : {}),
          ...(body.semesterId !== undefined ? { semesterId: body.semesterId || null } : {}),
          ...(body.academicYearId !== undefined
            ? { academicYearId: body.academicYearId || null }
            : {}),
          isActive:
            action === 'deactivate_assignment'
              ? false
              : body.isActive !== undefined
              ? Boolean(body.isActive)
              : undefined,
        },
        include: {
          course: { select: { id: true, code: true, title: true } },
          lecturer: { select: { id: true, name: true } },
        },
      });

      await logAcademicAudit({
        actorId: auth.userId,
        actorName: auth.name,
        actorRole: auth.role,
        action:
          action === 'deactivate_assignment'
            ? 'DEACTIVATE_COURSE_LECTURER'
            : 'UPDATE_COURSE_LECTURER',
        entityType: 'CourseLecturer',
        entityId: updated.id,
        details: {
          courseId: updated.courseId,
          lecturerId: updated.lecturerId,
          role: updated.role,
          isActive: updated.isActive,
        },
      });

      return NextResponse.json({ status: true, assignment: updated });
    }

    const lecturerId = body.lecturerId || body.id;
    if (!lecturerId) {
      return NextResponse.json({ error: 'lecturerId is required' }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({
      where: { id: lecturerId },
      include: { lecturerProfile: true },
    });
    if (!existing || existing.role !== 'LECTURER') {
      return NextResponse.json({ error: 'Lecturer not found' }, { status: 404 });
    }

    if (action === 'reset_password') {
      const newPassword = body.newPassword || body.password || 'lecturer123';
      const passwordHash = await bcrypt.hash(newPassword, 10);
      await prisma.user.update({
        where: { id: lecturerId },
        data: { passwordHash },
      });

      await logAcademicAudit({
        actorId: auth.userId,
        actorName: auth.name,
        actorRole: auth.role,
        action: 'RESET_LECTURER_PASSWORD',
        entityType: 'Lecturer',
        entityId: lecturerId,
        details: { email: existing.email },
      });

      return NextResponse.json({
        status: true,
        message: 'Lecturer password has been reset.',
      });
    }

    if (
      action === 'set_status' ||
      action === 'activate' ||
      action === 'deactivate' ||
      action === 'suspend'
    ) {
      const statusMap: Record<string, string> = {
        activate: 'ACTIVE',
        deactivate: 'INACTIVE',
        suspend: 'SUSPENDED',
      };
      const nextStatus = (
        body.employmentStatus ||
        body.status ||
        statusMap[action] ||
        'ACTIVE'
      ).toUpperCase();

      const validStatuses = new Set(['ACTIVE', 'INACTIVE', 'SUSPENDED']);
      if (!validStatuses.has(nextStatus)) {
        return NextResponse.json(
          { error: 'Invalid status. Must be ACTIVE, INACTIVE, or SUSPENDED.' },
          { status: 400 }
        );
      }

      const profile = await prisma.lecturerProfile.upsert({
        where: { userId: lecturerId },
        update: { employmentStatus: nextStatus },
        create: {
          userId: lecturerId,
          staffId: existing.staffId || (await generateStaffId()),
          employmentStatus: nextStatus,
          phone: existing.phone,
        },
      });

      await logAcademicAudit({
        actorId: auth.userId,
        actorName: auth.name,
        actorRole: auth.role,
        action: 'UPDATE_LECTURER_STATUS',
        entityType: 'Lecturer',
        entityId: lecturerId,
        details: {
          previousStatus: existing.lecturerProfile?.employmentStatus || 'ACTIVE',
          newStatus: nextStatus,
          reason: body.reason || null,
        },
      });

      return NextResponse.json({ status: true, profile });
    }

    // Default: update_profile
    const {
      name,
      email,
      phone,
      title,
      department,
      departmentId,
      staffId,
      qualifications,
      specialization,
      employmentStatus,
      dateEmployed,
      bio,
      officeLocation,
      photoUrl,
    } = body;

    let resolvedDeptName = department;
    if (departmentId && !resolvedDeptName) {
      const dept = await prisma.department.findUnique({
        where: { id: departmentId },
        select: { name: true },
      });
      resolvedDeptName = dept?.name;
    }

    const updated = await prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id: lecturerId },
        data: {
          ...(name !== undefined ? { name: String(name).trim() } : {}),
          ...(email !== undefined ? { email: String(email).trim().toLowerCase() } : {}),
          ...(phone !== undefined ? { phone } : {}),
          ...(title !== undefined ? { title } : {}),
          ...(resolvedDeptName !== undefined ? { department: resolvedDeptName } : {}),
          ...(staffId !== undefined ? { staffId } : {}),
          ...(photoUrl !== undefined ? { avatar: photoUrl } : {}),
        },
      });

      const profile = await tx.lecturerProfile.upsert({
        where: { userId: lecturerId },
        update: {
          ...(staffId !== undefined ? { staffId } : {}),
          ...(departmentId !== undefined ? { departmentId: departmentId || null } : {}),
          ...(qualifications !== undefined ? { qualifications } : {}),
          ...(specialization !== undefined ? { specialization } : {}),
          ...(employmentStatus !== undefined ? { employmentStatus } : {}),
          ...(dateEmployed !== undefined ? { dateEmployed } : {}),
          ...(bio !== undefined ? { bio } : {}),
          ...(officeLocation !== undefined ? { officeLocation } : {}),
          ...(phone !== undefined ? { phone } : {}),
          ...(photoUrl !== undefined ? { photoUrl } : {}),
        },
        create: {
          userId: lecturerId,
          staffId: staffId || existing.staffId || (await generateStaffId()),
          departmentId: departmentId || null,
          qualifications: qualifications || null,
          specialization: specialization || null,
          employmentStatus: employmentStatus || 'ACTIVE',
          dateEmployed: dateEmployed || null,
          bio: bio || null,
          officeLocation: officeLocation || null,
          phone: phone || existing.phone || null,
          photoUrl: photoUrl || null,
        },
      });

      return { user, profile };
    });

    await logAcademicAudit({
      actorId: auth.userId,
      actorName: auth.name,
      actorRole: auth.role,
      action: 'UPDATE_LECTURER_PROFILE',
      entityType: 'Lecturer',
      entityId: lecturerId,
      details: {
        updatedFields: Object.keys(body).filter((k) => k !== 'action' && k !== 'lecturerId' && k !== 'id'),
      },
    });

    const { passwordHash: _removed, ...safeUser } = updated.user;
    return NextResponse.json({ status: true, lecturer: safeUser, profile: updated.profile });
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return NextResponse.json(
        { error: 'Duplicate email or staff ID detected.' },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await authorizeRole(ACADEMIC_ADMIN_ROLES);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status || 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      // Allow query-param only DELETE
    }

    const assignmentId = searchParams.get('assignmentId') || body.assignmentId;
    const lecturerId = searchParams.get('lecturerId') || searchParams.get('id') || body.lecturerId || body.id;
    const hard = searchParams.get('hard') === 'true' || body.hard === true;

    if (assignmentId) {
      if (hard) {
        await prisma.courseLecturer.delete({ where: { id: assignmentId } });
      } else {
        await prisma.courseLecturer.update({
          where: { id: assignmentId },
          data: { isActive: false },
        });
      }

      await logAcademicAudit({
        actorId: auth.userId,
        actorName: auth.name,
        actorRole: auth.role,
        action: hard ? 'DELETE_COURSE_LECTURER' : 'DEACTIVATE_COURSE_LECTURER',
        entityType: 'CourseLecturer',
        entityId: assignmentId,
        details: { hard },
      });

      return NextResponse.json({ status: true, assignmentId, hard });
    }

    if (!lecturerId) {
      return NextResponse.json(
        { error: 'lecturerId or assignmentId is required' },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({
      where: { id: lecturerId },
      select: { id: true, name: true, email: true, role: true, staffId: true },
    });
    if (!existing || existing.role !== 'LECTURER') {
      return NextResponse.json({ error: 'Lecturer not found' }, { status: 404 });
    }

    if (hard) {
      await prisma.user.delete({ where: { id: lecturerId } });
    } else {
      await prisma.lecturerProfile.upsert({
        where: { userId: lecturerId },
        update: { employmentStatus: 'INACTIVE' },
        create: {
          userId: lecturerId,
          staffId: existing.staffId || (await generateStaffId()),
          employmentStatus: 'INACTIVE',
        },
      });
    }

    await logAcademicAudit({
      actorId: auth.userId,
      actorName: auth.name,
      actorRole: auth.role,
      action: hard ? 'DELETE_LECTURER' : 'DEACTIVATE_LECTURER',
      entityType: 'Lecturer',
      entityId: lecturerId,
      details: { name: existing.name, email: existing.email, hard },
    });

    return NextResponse.json({ status: true, lecturerId, hard });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
