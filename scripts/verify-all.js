const http = require('http');

const BASE_URL = 'http://localhost:3000';

function fetchUrl(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const reqOptions = {
      method: options.method || 'GET',
      headers: options.headers || {},
    };

    const req = http.request(url, reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: data,
        });
      });
    });

    req.on('error', reject);
    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

async function runFullVerification() {
  console.log('====================================================');
  console.log('🚀 RUNNING COMPREHENSIVE SITE & WORKFLOW VERIFICATION');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  async function check(name, testFn) {
    try {
      await testFn();
      console.log(`  ✅ [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ [FAIL] ${name}: ${err.message}`);
      failed++;
    }
  }

  // 1. PUBLIC CLINIC PAGES
  console.log('--- 1. Testing Public Clinic Pages ---');
  const clinicPages = [
    '/',
    '/clinic/services',
    '/clinic/departments',
    '/clinic/doctors',
    '/clinic/facilities',
    '/clinic/news',
    '/clinic/contact',
    '/clinic/about',
    '/clinic/privacy',
    '/clinic/terms',
  ];

  for (const page of clinicPages) {
    await check(`Page: ${page}`, async () => {
      const res = await fetchUrl(page);
      if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
      if (!res.body || res.body.length < 500) throw new Error('Response body too short or empty');
    });
  }

  // 2. PUBLIC SCHOOL PAGES
  console.log('\n--- 2. Testing Public Nursing School Pages ---');
  const schoolPages = [
    '/school',
    '/school/programs',
    '/school/admissions',
    '/school/apply',
    '/school/track',
    '/school/management',
    '/school/faq',
    '/school/contact',
    '/school/about',
    '/school/privacy',
    '/school/terms',
  ];

  for (const page of schoolPages) {
    await check(`Page: ${page}`, async () => {
      const res = await fetchUrl(page);
      if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
      if (!res.body || res.body.length < 500) throw new Error('Response body too short or empty');
    });
  }

  // 3. STUDENT PORTAL PAGES
  console.log('\n--- 3. Testing Student E-Learning Portal Pages ---');
  const studentPages = [
    '/portal/student/dashboard',
    '/portal/student/courses',
    '/portal/student/materials',
    '/portal/student/exams',
    '/portal/student/exams/start',
    '/portal/student/results',
    '/portal/student/attendance',
    '/portal/student/calendar',
    '/portal/student/announcements',
    '/portal/student/support',
    '/portal/student/payments',
    '/portal/student/profile',
    '/portal/student/settings',
  ];

  for (const page of studentPages) {
    await check(`Page: ${page}`, async () => {
      const res = await fetchUrl(page);
      if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
      if (!res.body || res.body.length < 500) throw new Error('Response body too short or empty');
    });
  }

  // 4. LECTURER & ADMIN PORTALS
  console.log('\n--- 4. Testing Lecturer & Admin Portals ---');
  const adminPages = [
    '/portal/lecturer',
    '/portal/lecturer/attendance',
    '/portal/lecturer/grading',
    '/portal/admin',
    '/auth/login',
  ];

  for (const page of adminPages) {
    await check(`Page: ${page}`, async () => {
      const res = await fetchUrl(page);
      if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
      if (!res.body || res.body.length < 500) throw new Error('Response body too short or empty');
    });
  }

  // 5. API ENDPOINTS & LIVE FUNCTIONALITY
  console.log('\n--- 5. Testing API Endpoints & Real Transactions ---');

  // Clinic Services API
  await check('API: GET /api/clinic/services', async () => {
    const res = await fetchUrl('/api/clinic/services');
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    const json = JSON.parse(res.body);
    if (!json.services || json.services.length === 0) throw new Error('No services returned');
  });

  // Clinic Doctors API
  await check('API: GET /api/clinic/doctors', async () => {
    const res = await fetchUrl('/api/clinic/doctors');
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    const json = JSON.parse(res.body);
    if (!json.doctors || json.doctors.length === 0) throw new Error('No doctors returned');
  });

  // Submit Appointment Booking
  let createdAppointmentId = null;
  await check('API: POST /api/clinic/appointments (Real Booking)', async () => {
    const payload = JSON.stringify({
      patientName: 'Kelechi Amadi',
      patientPhone: '+234 803 999 8877',
      patientEmail: 'kelechi@example.com',
      preferredDate: '2025-08-15',
      preferredTime: '11:00 AM',
      message: 'Routine health screening',
    });
    const res = await fetchUrl('/api/clinic/appointments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
    });
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    const json = JSON.parse(res.body);
    if (!json.success || !json.appointment?.id) throw new Error('Appointment creation failed');
    createdAppointmentId = json.appointment.id;
  });

  // Admin Appointment Update
  if (createdAppointmentId) {
    await check('API: PATCH /api/admin/appointments/[id] (Confirm Appointment)', async () => {
      const res = await fetchUrl(`/api/admin/appointments/${createdAppointmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'CONFIRMED' }),
      });
      if (res.status !== 200) throw new Error(`Status ${res.status}`);
      const json = JSON.parse(res.body);
      if (json.appointment?.status !== 'CONFIRMED') throw new Error('Status not updated to CONFIRMED');
    });
  }

  // School Programs API
  let selectedProgId = null;
  await check('API: GET /api/school/programs', async () => {
    const res = await fetchUrl('/api/school/programs');
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    const json = JSON.parse(res.body);
    if (!json.programs || json.programs.length === 0) throw new Error('No programs returned');
    selectedProgId = json.programs[0].id;
  });

  // Submit Online Admission Application
  let submittedAppRef = null;
  let submittedAppId = null;
  await check('API: POST /api/school/apply (Real Admission Application)', async () => {
    const payload = JSON.stringify({
      applicantName: 'Ngozi Okonkwo',
      applicantEmail: 'ngozi.okonkwo@example.com',
      applicantPhone: '+234 812 345 6789',
      programmeId: selectedProgId,
      dateOfBirth: '2004-10-12',
      gender: 'Female',
      nationality: 'Nigerian',
      address: 'Enugu, Nigeria',
      previousSchool: 'Queen of the Rosary College',
      examGrades: 'WAEC: Eng(A1), Bio(A1), Chem(B2), Math(B3)',
    });
    const res = await fetchUrl('/api/school/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
    });
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    const json = JSON.parse(res.body);
    if (!json.success || !json.referenceNumber) throw new Error('Application failed to generate reference number');
    submittedAppRef = json.referenceNumber;
    submittedAppId = json.application.id;
  });

  // Lookup Application by Reference
  if (submittedAppRef) {
    await check(`API: GET /api/school/track?ref=${submittedAppRef}`, async () => {
      const res = await fetchUrl(`/api/school/track?ref=${submittedAppRef}`);
      if (res.status !== 200) throw new Error(`Status ${res.status}`);
      const json = JSON.parse(res.body);
      if (json.application?.referenceNumber !== submittedAppRef) throw new Error('Track lookup failed');
    });
  }

  // Admin Application Enrolment
  if (submittedAppId) {
    await check('API: PATCH /api/admin/applications/[id] (Enroll as Student)', async () => {
      const res = await fetchUrl(`/api/admin/applications/${submittedAppId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'ENROLLED' }),
      });
      if (res.status !== 200) throw new Error(`Status ${res.status}`);
      const json = JSON.parse(res.body);
      if (json.application?.status !== 'ENROLLED') throw new Error('Application not enrolled');
    });
  }

  // Student Dashboard API (Mockup Data Verification)
  await check('API: GET /api/student/dashboard (Verify Mockup Stats)', async () => {
    const res = await fetchUrl('/api/student/dashboard');
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    const json = JSON.parse(res.body);
    if (!json.student?.name) throw new Error('Missing student profile');
    const coursesCount = json.stats?.enrolledCoursesCount || json.stats?.enrolledCourses;
    if (coursesCount !== 3) throw new Error(`Expected 3 courses, got ${coursesCount}`);
    const resultPercent = json.stats?.latestScorePercent || json.stats?.latestResult;
    if (!resultPercent) throw new Error('Expected latest score result');
  });

  // Student Courses & LMS API
  let sampleTopicId = null;
  await check('API: GET /api/student/courses (Curriculum & Topics)', async () => {
    const res = await fetchUrl('/api/student/courses');
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    const json = JSON.parse(res.body);
    if (!json.courses || json.courses.length === 0) throw new Error('No courses returned');
    sampleTopicId = json.courses[0].modules?.[0]?.topics?.[0]?.id;
  });

  // Topic Completion Toggle
  if (sampleTopicId) {
    await check(`API: POST /api/student/topics/${sampleTopicId}/complete (Toggle Progress)`, async () => {
      const res = await fetchUrl(`/api/student/topics/${sampleTopicId}/complete`, { method: 'POST' });
      if (res.status !== 200) throw new Error(`Status ${res.status}`);
      const json = JSON.parse(res.body);
      if (json.success !== true) throw new Error('Topic progress toggle failed');
    });
  }

  // CBT Exam Submission & Auto-Grading Engine
  await check('API: POST /api/student/exams/[id]/submit (CBT Engine Auto-Grading)', async () => {
    const dashRes = await fetchUrl('/api/student/dashboard');
    const dashJson = JSON.parse(dashRes.body);
    const examId = dashJson.upcomingExams?.[0]?.id || dashJson.latestAttempt?.examId;
    if (!examId) throw new Error('No exam ID found');

    const submitRes = await fetchUrl(`/api/student/exams/${examId}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers: {} }),
    });
    if (submitRes.status !== 200) throw new Error(`Status ${submitRes.status}`);
    const submitJson = JSON.parse(submitRes.body);
    if (submitJson.success !== true || typeof submitJson.score !== 'number') {
      throw new Error('CBT Auto-grading engine failed');
    }
  });

  // Admin Overview API
  await check('API: GET /api/admin/overview (Total Counts & Revenue)', async () => {
    const res = await fetchUrl('/api/admin/overview');
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    const json = JSON.parse(res.body);
    if (!json.stats || typeof json.stats.totalStudents !== 'number') {
      throw new Error('Admin stats not populated');
    }
  });

  // Demo Login API for each role
  await check('API: POST /api/auth/demo-login (Student Role)', async () => {
    const res = await fetchUrl('/api/auth/demo-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'student' }),
    });
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    const json = JSON.parse(res.body);
    if (json.user?.role !== 'STUDENT') throw new Error('Role mismatch');
  });

  await check('API: POST /api/auth/demo-login (Lecturer Role)', async () => {
    const res = await fetchUrl('/api/auth/demo-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'lecturer' }),
    });
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    const json = JSON.parse(res.body);
    if (json.user?.role !== 'LECTURER') throw new Error('Role mismatch');
  });

  await check('API: POST /api/auth/demo-login (Admin Role)', async () => {
    const res = await fetchUrl('/api/auth/demo-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'admin' }),
    });
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    const json = JSON.parse(res.body);
    if (json.user?.role !== 'SUPER_ADMIN') throw new Error('Role mismatch');
  });

  console.log('\n====================================================');
  console.log(`📊 FINAL RESULT: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runFullVerification().catch((err) => {
  console.error('Verification script crashed:', err);
  process.exit(1);
});

