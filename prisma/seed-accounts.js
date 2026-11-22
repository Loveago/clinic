/**
 * Non-destructive, idempotent seed script to create/update live test accounts
 * (Admin, Lecturer, and Student) without wiping existing database records.
 *
 * Usage:
 *   npm run db:seed:accounts
 *
 * Optional environment variable overrides:
 *   SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD
 *   SEED_LECTURER_EMAIL, SEED_LECTURER_PASSWORD
 *   SEED_STUDENT_EMAIL, SEED_STUDENT_PASSWORD
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

process.env.DATABASE_URL ??= 'file:./dev.db';

const prisma = new PrismaClient();

async function main() {
  const adminEmail = (process.env.SEED_ADMIN_EMAIL || 'admin@actionhealth.edu.gh').trim().toLowerCase();
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'Admin@2026!';

  const lecturerEmail = (process.env.SEED_LECTURER_EMAIL || 'lecturer@actionhealth.edu.gh').trim().toLowerCase();
  const lecturerPassword = process.env.SEED_LECTURER_PASSWORD || 'Lecturer@2026!';

  const studentEmail = (process.env.SEED_STUDENT_EMAIL || 'student@actionhealth.edu.gh').trim().toLowerCase();
  const studentPassword = process.env.SEED_STUDENT_PASSWORD || 'Student@2026!';

  const [adminHash, lecturerHash, studentHash] = await Promise.all([
    bcrypt.hash(adminPassword, 10),
    bcrypt.hash(lecturerPassword, 10),
    bcrypt.hash(studentPassword, 10),
  ]);

  // 1. Ensure a default Department & Programme exist for Lecturer & Student relations
  const department = await prisma.department.upsert({
    where: { code: 'CGV' },
    update: {},
    create: {
      code: 'CGV',
      name: 'Department of Caregiving & Allied Health',
      description: 'Practical caregiving, home health, and clinical support training at Action Health College.',
    },
  });

  const programme = await prisma.programme.upsert({
    where: { code: 'DCG' },
    update: {},
    create: {
      code: 'DCG',
      name: 'Diploma in Care Giving',
      description: 'Comprehensive 2-year diploma preparing professional caregivers for clinical and home care.',
      duration: '2 Years',
      qualification: 'Diploma',
      fee: 3500,
      requirements: 'WASSCE / SSSCE or mature applicant assessment',
      departmentId: department.id,
      status: 'Active',
    },
  });

  // 2. Super Admin User
  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      passwordHash: adminHash,
      role: 'SUPER_ADMIN',
    },
    create: {
      email: adminEmail,
      passwordHash: adminHash,
      name: 'Dr. Kwame Boateng',
      role: 'SUPER_ADMIN',
      phone: '+233 24 412 3456',
      staffId: 'AHC-ADM-TEST-001',
      department: 'Executive Management',
      title: 'Dr.',
    },
  });

  // 3. Lecturer User + LecturerProfile
  const lecturerUser = await prisma.user.upsert({
    where: { email: lecturerEmail },
    update: {
      passwordHash: lecturerHash,
      role: 'LECTURER',
    },
    create: {
      email: lecturerEmail,
      passwordHash: lecturerHash,
      name: 'Dr. Abena Osei',
      role: 'LECTURER',
      phone: '+233 24 567 8901',
      staffId: 'AHC-LEC-TEST-001',
      department: department.name,
      title: 'Dr.',
    },
  });

  await prisma.lecturerProfile.upsert({
    where: { userId: lecturerUser.id },
    update: {
      departmentId: department.id,
      employmentStatus: 'ACTIVE',
    },
    create: {
      userId: lecturerUser.id,
      staffId: lecturerUser.staffId || 'AHC-LEC-TEST-001',
      departmentId: department.id,
      qualifications: 'MSc Nursing, BSc Nursing',
      specialization: 'Clinical Caregiving & Patient Safety',
      employmentStatus: 'ACTIVE',
      phone: '+233 24 567 8901',
    },
  });

  // 4. Student User + Student Profile
  const studentUser = await prisma.user.upsert({
    where: { email: studentEmail },
    update: {
      passwordHash: studentHash,
      role: 'STUDENT',
    },
    create: {
      email: studentEmail,
      passwordHash: studentHash,
      name: 'Ama Serwaa Mensah',
      role: 'STUDENT',
      phone: '+233 24 890 1234',
    },
  });

  await prisma.student.upsert({
    where: { userId: studentUser.id },
    update: {
      programmeId: programme.id,
      status: 'ACTIVE',
    },
    create: {
      studentId: 'AHC/2026/TEST001',
      userId: studentUser.id,
      programmeId: programme.id,
      level: 'Level 100',
      intake: '2025/2026 Cohort',
      academicYear: '2025/2026',
      currentSemester: 'First Semester',
      status: 'ACTIVE',
      nationality: 'Ghanaian',
    },
  });

  const clinicAdminEmail = (process.env.SEED_CLINIC_ADMIN_EMAIL || 'clinic.admin@actionhealth.edu.gh').trim().toLowerCase();
  const clinicAdminPassword = process.env.SEED_CLINIC_ADMIN_PASSWORD || 'ClinicAdmin@2026!';
  const clinicAdminHash = await bcrypt.hash(clinicAdminPassword, 10);

  const clinicAdminUser = await prisma.user.upsert({
    where: { email: clinicAdminEmail },
    update: {
      passwordHash: clinicAdminHash,
      role: 'CLINIC_SUPER_ADMIN',
    },
    create: {
      email: clinicAdminEmail,
      passwordHash: clinicAdminHash,
      name: 'Dr. Efua Mansa',
      role: 'CLINIC_SUPER_ADMIN',
      phone: '+233 24 777 8899',
      staffId: 'ABMC-ADM-001',
      department: 'Clinic Administration',
      title: 'Dr.',
    },
  });

  await prisma.clinicStaffProfile.upsert({
    where: { userId: clinicAdminUser.id },
    update: {
      clinicRole: 'CLINIC_SUPER_ADMIN',
      isActive: true,
    },
    create: {
      userId: clinicAdminUser.id,
      clinicRole: 'CLINIC_SUPER_ADMIN',
      staffNumber: 'ABMC-ADM-001',
      specialty: 'Medical Administration',
      phone: '+233 24 777 8899',
      employmentStatus: 'ACTIVE',
      canOverrideSchedule: true,
      isActive: true,
    },
  });

  await prisma.clinicConfiguration.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      clinicName: 'Action Boat Medical Centre',
      tagline: 'Comprehensive Outpatient, Diagnostic & Family Healthcare',
      phone: '+233 30 000 0000',
      email: 'clinic@actionhealth.edu.gh',
      address: 'Accra, Ghana',
    },
  });

  await prisma.insuranceProvider.upsert({
    where: { code: 'NHIS' },
    update: {},
    create: {
      code: 'NHIS',
      name: 'National Health Insurance Scheme (NHIS)',
      providerType: 'PUBLIC',
      isActive: true,
    },
  });

  console.log('\nLive test accounts ready:');
  console.log('------------------------------------------------------------');
  console.log(`School Admin (${adminUser.role}):        ${adminEmail} / ${adminPassword}`);
  console.log(`Clinic Admin (${clinicAdminUser.role}): ${clinicAdminEmail} / ${clinicAdminPassword}`);
  console.log(`Lecturer     (${lecturerUser.role}):           ${lecturerEmail} / ${lecturerPassword}`);
  console.log(`Student      (${studentUser.role}):            ${studentEmail} / ${studentPassword}`);
  console.log('------------------------------------------------------------\n');
}

main()
  .catch((err) => {
    console.error('Failed to seed test accounts:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
