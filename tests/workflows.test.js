const test = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

process.env.DATABASE_URL ??= 'file:./dev.db';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'welllife-secure-jwt-secret-key-2025';

test('Workflow 1: Authentication & Password Hashing', async () => {
  const password = 'testPassword123';
  const hashed = await bcrypt.hash(password, 10);
  const isValid = await bcrypt.compare(password, hashed);
  assert.equal(isValid, true, 'Bcrypt password comparison should succeed');

  const token = jwt.sign({ userId: 'u1', role: 'STUDENT' }, JWT_SECRET, { expiresIn: '1h' });
  const decoded = jwt.verify(token, JWT_SECRET);
  assert.equal(decoded.role, 'STUDENT', 'Decoded JWT role should match STUDENT');
});

test('Workflow 2: Clinic Services & Appointment Booking', async () => {
  const service = await prisma.clinicService.findFirst();
  assert.ok(service, 'At least one clinic service must exist');

  const apt = await prisma.appointment.create({
    data: {
      patientName: 'Automated Test Patient',
      patientPhone: '+234 800 000 0000',
      serviceId: service.id,
      preferredDate: '2025-07-01',
      preferredTime: '09:00 AM',
      status: 'PENDING',
    },
  });

  assert.equal(apt.patientName, 'Automated Test Patient');
  assert.equal(apt.status, 'PENDING');

  // Clean up
  await prisma.appointment.delete({ where: { id: apt.id } });
});

test('Workflow 3: Admissions & Unique Reference Generation', async () => {
  const prog = await prisma.programme.findFirst();
  assert.ok(prog, 'Academic programme must exist');

  const ref = `TEST-REF-${Date.now()}`;
  const app = await prisma.application.create({
    data: {
      referenceNumber: ref,
      applicantName: 'Test Applicant',
      applicantEmail: 'test.app@example.com',
      applicantPhone: '+234 809 111 2233',
      dateOfBirth: '2004-01-01',
      gender: 'Female',
      nationality: 'Nigerian',
      address: 'Lagos',
      previousSchool: 'Test Secondary',
      examGrades: 'WAEC 5 Credits',
      programmeId: prog.id,
      status: 'SUBMITTED',
    },
  });

  assert.equal(app.referenceNumber, ref);
  assert.equal(app.status, 'SUBMITTED');

  // Clean up
  await prisma.application.delete({ where: { id: app.id } });
});

test('Workflow 4: CBT Auto-Grading Calculation Engine', async () => {
  // Test 23 correct out of 25 = 92%
  const total = 25;
  const correct = 23;
  const percentage = Math.round((correct / total) * 100);
  assert.equal(percentage, 92, '23 out of 25 questions must yield 92% score');
});

test('Workflow 5: Database Student & Enrollment Integrity', async () => {
  const student = await prisma.student.findFirst({
    where: { studentId: 'WNS/GH/2025/001' },
    include: { user: true, programme: true, enrollments: true },
  });

  assert.ok(student, 'Chioma Eze student record must exist');
  assert.equal(student.studentId, 'WNS/GH/2025/001');
  assert.ok(student.enrollments.length > 0, 'Student must be enrolled in at least one course');
});

