import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  authorizeClinicStaff,
  CLINIC_RECEPTION_ROLES,
  CLINIC_ADMIN_ROLES,
  normalizeGhanaPhone,
  logClinicAudit,
} from '@/lib/clinic-auth';

export async function GET(req: NextRequest) {
  try {
    const auth = await authorizeClinicStaff();
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 403 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search')?.trim() || '';
    const status = searchParams.get('status') || '';
    const page = Math.max(1, Number(searchParams.get('page') || 1));
    const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') || 25)));

    const where = {
      ...(status ? { status } : { status: { not: 'ARCHIVED' } }),
      ...(search
        ? {
            OR: [
              { fullName: { contains: search } },
              { patientNumber: { contains: search } },
              { phone: { contains: search } },
              { email: { contains: search } },
            ],
          }
        : {}),
    };

    const [total, patients] = await Promise.all([
      prisma.patient.count({ where }),
      prisma.patient.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          _count: {
            select: {
              appointments: true,
              consultations: true,
              invoices: true,
            },
          },
        },
      }),
    ]);

    return NextResponse.json({
      patients,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('GET clinic patients error:', error);
    return NextResponse.json({ error: 'Failed to load patients' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authorizeClinicStaff(CLINIC_RECEPTION_ROLES);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 403 });
    }

    const body = await req.json();
    const fullName = String(body.fullName || '').trim();
    const rawPhone = String(body.phone || '').trim();
    if (!fullName || !rawPhone) {
      return NextResponse.json(
        { error: 'Full name and Ghanaian phone number (+233...) are required.' },
        { status: 400 }
      );
    }

    const phone = normalizeGhanaPhone(rawPhone);
    const dateOfBirth = body.dateOfBirth ? String(body.dateOfBirth).trim() : null;

    if (!body.allowDuplicate) {
      const duplicate = await prisma.patient.findFirst({
        where: {
          OR: [
            { phone },
            ...(dateOfBirth ? [{ fullName, dateOfBirth }] : []),
          ],
          status: { not: 'ARCHIVED' },
        },
        select: { id: true, patientNumber: true, fullName: true, phone: true },
      });
      if (duplicate) {
        return NextResponse.json(
          {
            error: `Potential duplicate patient found: ${duplicate.fullName} (${duplicate.patientNumber}, ${duplicate.phone}). Pass allowDuplicate=true to register anyway.`,
            duplicate,
          },
          { status: 409 }
        );
      }
    }

    const year = new Date().getFullYear();
    const count = await prisma.patient.count();
    const patientNumber = `WMC-PT-${year}-${String(count + 1).padStart(4, '0')}-${Math.floor(10 + Math.random() * 89)}`;

    const patient = await prisma.patient.create({
      data: {
        patientNumber,
        fullName,
        dateOfBirth,
        gender: String(body.gender || 'Female'),
        phone,
        email: body.email ? String(body.email).trim().toLowerCase() : null,
        address: body.address ? String(body.address).trim() : null,
        bloodGroup: body.bloodGroup ? String(body.bloodGroup).trim() : null,
        allergies: body.allergies ? String(body.allergies).trim() : null,
        chronicConditions: body.chronicConditions ? String(body.chronicConditions).trim() : null,
        emergencyName: body.emergencyName ? String(body.emergencyName).trim() : null,
        emergencyPhone: body.emergencyPhone ? normalizeGhanaPhone(String(body.emergencyPhone)) : null,
        emergencyRelation: body.emergencyRelation ? String(body.emergencyRelation).trim() : null,
        status: 'ACTIVE',
        registeredById: auth.userId || null,
      },
    });

    await logClinicAudit({
      actorId: auth.userId,
      actorName: auth.name,
      actorRole: auth.clinicRole,
      action: 'PATIENT_REGISTERED',
      entityType: 'Patient',
      entityId: patient.id,
      details: { patientNumber: patient.patientNumber, fullName: patient.fullName },
    });

    return NextResponse.json({ patient }, { status: 201 });
  } catch (error) {
    console.error('POST clinic patient error:', error);
    return NextResponse.json({ error: 'Failed to register patient' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await authorizeClinicStaff(CLINIC_RECEPTION_ROLES);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 403 });
    }

    const body = await req.json();
    const { id } = body;
    if (!id) {
      return NextResponse.json({ error: 'Patient id is required' }, { status: 400 });
    }

    if (body.status === 'ARCHIVED' && !CLINIC_ADMIN_ROLES.includes(auth.clinicRole || '') && auth.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Only Clinic Administrators can archive patient records.' }, { status: 403 });
    }

    const updated = await prisma.patient.update({
      where: { id },
      data: {
        ...(body.fullName !== undefined ? { fullName: String(body.fullName).trim() } : {}),
        ...(body.dateOfBirth !== undefined ? { dateOfBirth: body.dateOfBirth || null } : {}),
        ...(body.gender !== undefined ? { gender: String(body.gender) } : {}),
        ...(body.phone !== undefined ? { phone: normalizeGhanaPhone(String(body.phone)) } : {}),
        ...(body.email !== undefined ? { email: body.email ? String(body.email).trim().toLowerCase() : null } : {}),
        ...(body.address !== undefined ? { address: body.address || null } : {}),
        ...(body.bloodGroup !== undefined ? { bloodGroup: body.bloodGroup || null } : {}),
        ...(body.allergies !== undefined ? { allergies: body.allergies || null } : {}),
        ...(body.chronicConditions !== undefined ? { chronicConditions: body.chronicConditions || null } : {}),
        ...(body.emergencyName !== undefined ? { emergencyName: body.emergencyName || null } : {}),
        ...(body.emergencyPhone !== undefined
          ? { emergencyPhone: body.emergencyPhone ? normalizeGhanaPhone(String(body.emergencyPhone)) : null }
          : {}),
        ...(body.emergencyRelation !== undefined ? { emergencyRelation: body.emergencyRelation || null } : {}),
        ...(body.status !== undefined ? { status: String(body.status) } : {}),
      },
    });

    await logClinicAudit({
      actorId: auth.userId,
      actorName: auth.name,
      actorRole: auth.clinicRole,
      action: 'PATIENT_UPDATED',
      entityType: 'Patient',
      entityId: updated.id,
      details: { patientNumber: updated.patientNumber, status: updated.status },
    });

    return NextResponse.json({ patient: updated });
  } catch (error) {
    console.error('PATCH clinic patient error:', error);
    return NextResponse.json({ error: 'Failed to update patient' }, { status: 500 });
  }
}
