const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const BASE = process.env.BASE_URL || 'http://127.0.0.1:3000';

let passed = 0;
let failed = 0;

function assert(cond, label, detail = '') {
  if (cond) {
    console.log(`✅ [PASS] ${label}`);
    passed++;
  } else {
    console.error(`❌ [FAIL] ${label}${detail ? ' -> ' + detail : ''}`);
    failed++;
  }
}

async function api(path, { method = 'GET', body, cookie = '' } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (cookie) headers['Cookie'] = cookie;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let data = null;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }

  const setCookie = res.headers.get('set-cookie') || '';
  const tokenMatch = setCookie.match(/auth_token=([^;]+)/);
  const authCookie = tokenMatch ? `auth_token=${tokenMatch[1]}` : cookie;

  return { status: res.status, ok: res.ok, data, authCookie };
}

async function loginWithDemo(role) {
  const res = await api('/api/auth/demo-login', {
    method: 'POST',
    body: { role },
  });
  return res.authCookie;
}

async function run() {
  console.log('--- EXECUTING ACADEMIC & LECTURER PORTAL E2E VERIFICATION ---');
  const uniqueTag = Date.now();
  const createdCourseIds = [];
  let createdLecturerId = null;

  try {

  // 10. UI Page HTTP 200 checks
  const pages = [
    '/portal/admin/academics',
    '/portal/lecturer',
    '/portal/lecturer/attendance',
    '/portal/lecturer/grading',
    '/portal/student/courses',
    '/portal/student/attendance',
    '/portal/student/results',
  ];
  for (const path of pages) {
    const r = await fetch(`${BASE}${path}`);
    assert(r.status === 200, `GET ${path} returns HTTP 200`, `got ${r.status}`);
  }

  // Get admin, student, finance cookies for RBAC & workflows
  const [adminCookie, studentCookie, financeCookie] = await Promise.all([
    loginWithDemo('SUPER_ADMIN'),
    loginWithDemo('STUDENT'),
    loginWithDemo('FINANCE_OFFICER'),
  ]);
  assert(Boolean(adminCookie), 'Obtained SUPER_ADMIN session cookie');
  assert(Boolean(studentCookie), 'Obtained STUDENT session cookie');
  assert(Boolean(financeCookie), 'Obtained FINANCE_OFFICER session cookie');

  // 2. RBAC checks: STUDENT and FINANCE_OFFICER receive 403
  for (const [roleName, cookie] of [
    ['STUDENT', studentCookie],
    ['FINANCE_OFFICER', financeCookie],
  ]) {
    const r1 = await api('/api/admin/lecturers', {
      method: 'POST',
      cookie,
      body: { name: 'Blocked', email: `blocked.${uniqueTag}@welllife.edu.gh` },
    });
    assert(r1.status === 403, `${roleName} gets 403 on POST /api/admin/lecturers`, `got ${r1.status}`);

    const r2 = await api('/api/admin/academics', {
      method: 'POST',
      cookie,
      body: { type: 'department', data: { code: 'TST', name: 'Test' } },
    });
    assert(r2.status === 403, `${roleName} gets 403 on POST /api/admin/academics`, `got ${r2.status}`);

    const r3 = await api('/api/admin/results', {
      method: 'PATCH',
      cookie,
      body: { action: 'publish', resultIds: ['nonexistent'] },
    });
    assert(r3.status === 403, `${roleName} gets 403 on PATCH /api/admin/results`, `got ${r3.status}`);

    const r4 = await api('/api/lecturer/courses', { cookie });
    assert(r4.status === 403, `${roleName} gets 403 on GET /api/lecturer/courses`, `got ${r4.status}`);
  }

  // Fetch student's programme + academics so test course matches student's programme
  const [acadRes, stuRegInfo] = await Promise.all([
    api('/api/admin/academics', { cookie: adminCookie }),
    api('/api/student/registration', { cookie: studentCookie }),
  ]);
  assert(acadRes.status === 200 && Array.isArray(acadRes.data?.courses), 'GET /api/admin/academics returns courses');
  const studentProgName = stuRegInfo.data?.student?.programme;
  const programmeId =
    acadRes.data?.programmes?.find((p) => p.name === studentProgName)?.id ||
    acadRes.data?.programmes?.[0]?.id;
  const semesterId = acadRes.data?.semesters?.[0]?.id || null;
  assert(Boolean(programmeId), 'Found student programme');

  // Create a dedicated test course + prerequisite course (prefixed with Z so seeded NUR 101 remains first)
  const prereqCode = `ZPRQ${String(uniqueTag).slice(-4)}`;
  const courseCode = `ZNUR${String(uniqueTag).slice(-4)}`;

  const prereqRes = await api('/api/admin/academics', {
    method: 'POST',
    cookie: adminCookie,
    body: {
      type: 'course',
      data: {
        code: prereqCode,
        title: `Prerequisite Course ${uniqueTag}`,
        description: 'Prerequisite test course',
        creditHours: 2,
        programmeId,
        level: 'Level 100',
        semester: 'First Semester',
      },
    },
  });
  assert(prereqRes.status === 201 && prereqRes.data?.course?.id, 'Created prerequisite course');
  const prereqCourseId = prereqRes.data.course.id;
  createdCourseIds.push(prereqCourseId);

  const courseRes = await api('/api/admin/academics', {
    method: 'POST',
    cookie: adminCookie,
    body: {
      type: 'course',
      data: {
        code: courseCode,
        title: `Medical-Surgical Nursing ${uniqueTag}`,
        description: 'E2E test course',
        creditHours: 3,
        programmeId,
        level: 'Level 100',
        semester: 'First Semester',
      },
    },
  });
  assert(courseRes.status === 201 && courseRes.data?.course?.id, 'Created primary test course');
  const testCourseId = courseRes.data.course.id;
  createdCourseIds.push(testCourseId);

  // Also create a course with prerequisite for prerequisite check
  const gatedCode = `ZGAT${String(uniqueTag).slice(-4)}`;
  const gatedRes = await api('/api/admin/academics', {
    method: 'POST',
    cookie: adminCookie,
    body: {
      type: 'course',
      data: {
        code: gatedCode,
        title: `Gated Clinical Course ${uniqueTag}`,
        description: 'Requires prerequisite',
        creditHours: 3,
        programmeId,
        level: 'Level 100',
        semester: 'First Semester',
        prerequisiteCourseIds: [prereqCourseId],
      },
    },
  });
  assert(gatedRes.status === 201 && gatedRes.data?.course?.id, 'Created prerequisite-gated course');
  const gatedCourseId = gatedRes.data.course.id;
  createdCourseIds.push(gatedCourseId);

  // 1. Admin creates Lecturer, resets password, assigns Lecturer to Course, duplicate rejected (409)
  const lecEmail = `lecturer.${uniqueTag}@welllife.edu.gh`;
  const lecPassword = `LecPass!${String(uniqueTag).slice(-4)}`;
  const createLecRes = await api('/api/admin/lecturers', {
    method: 'POST',
    cookie: adminCookie,
    body: {
      name: `Dr. Kwame Boateng ${String(uniqueTag).slice(-3)}`,
      email: lecEmail,
      phone: '+233 24 000 1122',
      title: 'Dr.',
      qualifications: 'PhD Nursing',
      specialization: 'Medical-Surgical Nursing',
      password: lecPassword,
    },
  });
  assert(createLecRes.status === 201 && createLecRes.data?.lecturer?.id, 'Admin created Lecturer');
  const lecturerId = createLecRes.data.lecturer.id;
  createdLecturerId = lecturerId;

  const resetRes = await api('/api/admin/lecturers', {
    method: 'PATCH',
    cookie: adminCookie,
    body: { action: 'reset_password', lecturerId, newPassword: lecPassword },
  });
  assert(resetRes.status === 200, 'Admin reset Lecturer password');

  const assignRes = await api('/api/admin/lecturers', {
    method: 'POST',
    cookie: adminCookie,
    body: {
      action: 'assign_course',
      lecturerId,
      courseId: testCourseId,
      semesterId,
      role: 'PRIMARY',
    },
  });
  assert(assignRes.status === 201, 'Admin assigned Lecturer to Course');

  const dupAssignRes = await api('/api/admin/lecturers', {
    method: 'POST',
    cookie: adminCookie,
    body: {
      action: 'assign_course',
      lecturerId,
      courseId: testCourseId,
      semesterId,
      role: 'PRIMARY',
    },
  });
  assert(dupAssignRes.status === 409, 'Duplicate CourseLecturer assignment rejected with 409', `got ${dupAssignRes.status}`);

  // 3. Student Course Registration: prerequisite check, valid registration, duplicate rejected (409)
  const prereqFailReg = await api('/api/student/registration', {
    method: 'POST',
    cookie: studentCookie,
    body: { action: 'register', courseId: gatedCourseId },
  });
  assert(prereqFailReg.status === 400, 'Prerequisite-gated course registration rejected with 400', `got ${prereqFailReg.status}`);

  const validReg = await api('/api/student/registration', {
    method: 'POST',
    cookie: studentCookie,
    body: { action: 'register', courseId: testCourseId },
  });
  assert(validReg.status === 200 && validReg.data?.status, 'Student registered for test course');

  const dupReg = await api('/api/student/registration', {
    method: 'POST',
    cookie: studentCookie,
    body: { action: 'register', courseId: testCourseId },
  });
  assert(dupReg.status === 409, 'Duplicate student course registration rejected with 409', `got ${dupReg.status}`);

  // 4. Lecturer logs in with newly created email & password, sees assigned course & enrolled student
  const lecLoginRes = await api('/api/auth/login', {
    method: 'POST',
    body: { email: lecEmail, password: lecPassword },
  });
  assert(lecLoginRes.status === 200 && Boolean(lecLoginRes.authCookie), 'Newly created Lecturer logged in via /api/auth/login');
  const lecturerCookie = lecLoginRes.authCookie;

  const lecCoursesRes = await api('/api/lecturer/courses', { cookie: lecturerCookie });
  const assignedCourse = lecCoursesRes.data?.courses?.find((c) => c.id === testCourseId);
  assert(lecCoursesRes.status === 200 && Boolean(assignedCourse), 'Lecturer sees assigned course in GET /api/lecturer/courses');
  const enrolledStudentId = assignedCourse?.registrations?.[0]?.studentId;
  assert(Boolean(enrolledStudentId), 'Lecturer sees enrolled student on assigned course');

  // 5. Lecturer marks attendance, duplicate session rejected (409), student sees real attendance
  const sessionDate = '2026-11-13';
  const sessionTitle = `Ward Practicum ${uniqueTag}`;
  const attPost = await api('/api/lecturer/attendance', {
    method: 'POST',
    cookie: lecturerCookie,
    body: {
      courseId: testCourseId,
      title: sessionTitle,
      sessionType: 'Clinical Ward',
      date: sessionDate,
      records: [{ studentId: enrolledStudentId, status: 'PRESENT', notes: 'On time' }],
    },
  });
  assert(attPost.status === 201 && attPost.data?.session?.id, 'Lecturer marked attendance session');

  const dupAttPost = await api('/api/lecturer/attendance', {
    method: 'POST',
    cookie: lecturerCookie,
    body: {
      courseId: testCourseId,
      title: sessionTitle,
      sessionType: 'Clinical Ward',
      date: sessionDate,
      records: [{ studentId: enrolledStudentId, status: 'PRESENT' }],
    },
  });
  assert(dupAttPost.status === 409, 'Duplicate attendance session rejected with 409', `got ${dupAttPost.status}`);

  const stuAttRes = await api('/api/student/attendance', { cookie: studentCookie });
  const foundAtt = stuAttRes.data?.records?.some((r) => r.sessionTitle === sessionTitle);
  assert(stuAttRes.status === 200 && foundAtt, 'Student sees real attendance record in GET /api/student/attendance');

  // 6. Lecturer creates Assignment, student submits, lecturer grades, student sees grade & feedback
  const asgTitle = `Case Study ${uniqueTag}`;
  const asgPost = await api('/api/lecturer/assignments', {
    method: 'POST',
    cookie: lecturerCookie,
    body: {
      courseId: testCourseId,
      title: asgTitle,
      description: 'Submit patient care plan',
      deadline: '2026-12-31',
      maxMarks: 100,
      weighting: 20,
      status: 'PUBLISHED',
    },
  });
  assert(asgPost.status === 201 && asgPost.data?.assignment?.id, 'Lecturer created published assignment');
  const assignmentId = asgPost.data.assignment.id;

  const stuSubRes = await api('/api/student/assignments', {
    method: 'POST',
    cookie: studentCookie,
    body: {
      assignmentId,
      notes: 'Completed care plan attached',
      fileUrl: '/uploads/assignments/care_plan.pdf',
    },
  });
  assert(stuSubRes.status === 200 && stuSubRes.data?.submission?.id, 'Student submitted assignment');
  const submissionId = stuSubRes.data.submission.id;

  const gradeSubRes = await api('/api/lecturer/assignments', {
    method: 'PATCH',
    cookie: lecturerCookie,
    body: {
      action: 'grade',
      submissionId,
      score: 88,
      feedback: 'Well-structured clinical assessment.',
      status: 'GRADED',
    },
  });
  assert(gradeSubRes.status === 200 && gradeSubRes.data?.submission?.isGraded, 'Lecturer graded student submission');

  const stuAsgCheck = await api('/api/student/assignments', { cookie: studentCookie });
  const gradedAsg = stuAsgCheck.data?.assignments?.find((a) => a.id === assignmentId);
  assert(
    gradedAsg?.submissionStatus === 'GRADED' && gradedAsg?.submission?.score === 88,
    'Student sees graded assignment score and feedback'
  );

  // 7. Timetable conflict detection (overlapping ClassSchedule for same lecturer or venue returns 409)
  const sched1 = await api('/api/admin/academics', {
    method: 'POST',
    cookie: adminCookie,
    body: {
      type: 'schedule',
      data: {
        courseId: testCourseId,
        lecturerId,
        dayOfWeek: 'Friday',
        startTime: '09:00',
        endTime: '11:00',
        venue: `Skills Lab ${uniqueTag}`,
      },
    },
  });
  assert(sched1.status === 201, 'Created initial ClassSchedule');

  const schedConflict = await api('/api/admin/academics', {
    method: 'POST',
    cookie: adminCookie,
    body: {
      type: 'schedule',
      data: {
        courseId: prereqCourseId,
        lecturerId,
        dayOfWeek: 'Friday',
        startTime: '10:00',
        endTime: '12:00',
        venue: `Skills Lab ${uniqueTag}`,
      },
    },
  });
  assert(schedConflict.status === 409, 'Overlapping ClassSchedule rejected with 409', `got ${schedConflict.status}`);

  // 8. Continuous Assessment & Results Moderation
  const comp1 = await api('/api/lecturer/grading', {
    method: 'POST',
    cookie: lecturerCookie,
    body: {
      action: 'createComponent',
      courseId: testCourseId,
      name: 'Mid-Semester & Assignments',
      componentType: 'ASSIGNMENT',
      weightPercent: 40,
      maxMarks: 40,
    },
  });
  assert(comp1.status === 201 && comp1.data?.component?.id, 'Created 40% CA component');
  const comp1Id = comp1.data.component.id;

  const badComp = await api('/api/lecturer/grading', {
    method: 'POST',
    cookie: lecturerCookie,
    body: {
      action: 'createComponent',
      courseId: testCourseId,
      name: 'Overweight Exam',
      componentType: 'FINAL_EXAM',
      weightPercent: 70,
      maxMarks: 70,
    },
  });
  assert(badComp.status === 400, 'Component weights >100% rejected with 400', `got ${badComp.status}`);

  const comp2 = await api('/api/lecturer/grading', {
    method: 'POST',
    cookie: lecturerCookie,
    body: {
      action: 'createComponent',
      courseId: testCourseId,
      name: 'Final Exam',
      componentType: 'FINAL_EXAM',
      weightPercent: 60,
      maxMarks: 60,
    },
  });
  assert(comp2.status === 201 && comp2.data?.component?.id, 'Created 60% Final Exam component');
  const comp2Id = comp2.data.component.id;

  // Save draft scores & verify student CANNOT see DRAFT/SUBMITTED results
  const saveScores = await api('/api/lecturer/grading', {
    method: 'POST',
    cookie: lecturerCookie,
    body: {
      action: 'saveComponentScores',
      courseId: testCourseId,
      scores: [
        { componentId: comp1Id, studentId: enrolledStudentId, score: 34 },
        { componentId: comp2Id, studentId: enrolledStudentId, score: 52 },
      ],
      submit: true,
    },
  });
  assert(saveScores.status === 200, 'Lecturer saved component scores and submitted for approval');

  const stuResBefore = await api('/api/student/results', { cookie: studentCookie });
  const hiddenBefore = !stuResBefore.data?.results?.some((r) => r.courseId === testCourseId);
  assert(hiddenBefore, 'Student CANNOT see SUBMITTED (unpublished) result in GET /api/student/results');

  // Admin approves and publishes
  const adminResList = await api(`/api/admin/results?courseId=${testCourseId}`, { cookie: adminCookie });
  const caRecordId = adminResList.data?.results?.find((r) => r.studentId === enrolledStudentId)?.id;
  assert(Boolean(caRecordId), 'Admin sees submitted ContinuousAssessment record');

  const approveRes = await api('/api/admin/results', {
    method: 'PATCH',
    cookie: adminCookie,
    body: { action: 'approve', resultIds: [caRecordId] },
  });
  assert(approveRes.status === 200, 'Admin approved result');

  const publishRes = await api('/api/admin/results', {
    method: 'PATCH',
    cookie: adminCookie,
    body: { action: 'publish', resultIds: [caRecordId] },
  });
  assert(publishRes.status === 200, 'Admin published result');

  const stuResAfter = await api('/api/student/results', { cookie: studentCookie });
  const publishedAfter = stuResAfter.data?.results?.find((r) => r.courseId === testCourseId);
  assert(
    Boolean(publishedAfter) && publishedAfter.totalScore >= 85 && stuResAfter.data?.summary?.cgpa > 0,
    'Student NOW sees published result & GPA/CGPA'
  );

  // 9. Lecturer Course Announcement creates announcement & student notification
  const annRes = await api('/api/lecturer/announcements', {
    method: 'POST',
    cookie: lecturerCookie,
    body: {
      courseId: testCourseId,
      title: `Clinical Lab Briefing ${uniqueTag}`,
      content: 'Report to Skills Lab A at 08:00 AM.',
      priority: 'HIGH',
    },
  });
  assert(annRes.status === 201 && annRes.data?.announcement?.id, 'Lecturer posted course announcement');

  } finally {
    try {
      if (createdCourseIds.length > 0) {
        const sessions = await prisma.attendanceSession.findMany({ where: { courseId: { in: createdCourseIds } }, select: { id: true } });
        if (sessions.length > 0) {
          await prisma.attendanceRecord.deleteMany({ where: { sessionId: { in: sessions.map((s) => s.id) } } });
          await prisma.attendanceSession.deleteMany({ where: { id: { in: sessions.map((s) => s.id) } } });
        }
        const assignments = await prisma.assignment.findMany({ where: { courseId: { in: createdCourseIds } }, select: { id: true } });
        if (assignments.length > 0) {
          await prisma.assignmentSubmission.deleteMany({ where: { assignmentId: { in: assignments.map((a) => a.id) } } });
          await prisma.assignment.deleteMany({ where: { id: { in: assignments.map((a) => a.id) } } });
        }
        await prisma.assessmentComponent.deleteMany({ where: { courseId: { in: createdCourseIds } } });
        await prisma.continuousAssessment.deleteMany({ where: { courseId: { in: createdCourseIds } } });
        await prisma.classSchedule.deleteMany({ where: { courseId: { in: createdCourseIds } } });
        await prisma.announcement.deleteMany({ where: { courseId: { in: createdCourseIds } } });
        await prisma.courseLecturer.deleteMany({ where: { courseId: { in: createdCourseIds } } });
        await prisma.courseRegistration.deleteMany({ where: { courseId: { in: createdCourseIds } } });
        await prisma.courseEnrollment.deleteMany({ where: { courseId: { in: createdCourseIds } } });
        await prisma.coursePrerequisite.deleteMany({ where: { OR: [{ courseId: { in: createdCourseIds } }, { prerequisiteCourseId: { in: createdCourseIds } }] } });
        await prisma.course.deleteMany({ where: { id: { in: createdCourseIds } } });
      }
      if (createdLecturerId) {
        await prisma.user.delete({ where: { id: createdLecturerId } }).catch(() => {});
      }
    } catch (cleanupErr) {
      console.warn('Cleanup warning in verify-academic-portal.js:', cleanupErr.message);
    } finally {
      await prisma.$disconnect();
    }
  }

  console.log(`\n--- VERIFICATION SUMMARY: ${passed} passed, ${failed} failed ---`);
  process.exit(failed > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
