const http = require('http');
const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');

const BASE = process.env.BASE_URL || 'http://127.0.0.1:3000';
const prisma = new PrismaClient();

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

function encryptApiKey(plainKey) {
  const secret = process.env.JWT_SECRET || 'welllife-production-secure-jwt-key-2025';
  const key = crypto.createHash('sha256').update(secret).digest();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plainKey.trim(), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  const payload = `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
  const trimmed = plainKey.trim();
  const keyLast4 = trimmed.length >= 4 ? trimmed.slice(-4) : trimmed;
  return { encryptedApiKey: payload, keyLast4 };
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

function startMockAiServer() {
  const state = { aiCallCount: 0 };

  const server = http.createServer((req, res) => {
    if (req.method !== 'POST' || !req.url.includes('/chat/completions')) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found' }));
      return;
    }

    let rawBody = '';
    req.on('data', (chunk) => {
      rawBody += chunk;
    });
    req.on('end', () => {
      state.aiCallCount++;
      let userContent = '';
      try {
        const parsed = JSON.parse(rawBody);
        userContent = (parsed.messages || []).map((m) => m.content || '').join('\n');
      } catch {
        userContent = rawBody;
      }

      const isRubricGen =
        userContent.includes('Generate a structured marking rubric') ||
        (userContent.includes('rubric') && userContent.includes('acceptedAlternatives'));
      const maxMarksMatch =
        userContent.match(/maxMarks["']?\s*[:=]\s*(\d+(?:\.\d+)?)/i) ||
        userContent.match(/out of (\d+(?:\.\d+)?)/i);
      const maxMarks = maxMarksMatch ? Number(maxMarksMatch[1]) : 6;

      const jsonPayload = isRubricGen
        ? {
            rubric: [
              { criterion: 'Clinical accuracy', maxMarks, description: 'Core nursing care rationale' },
            ],
            expectedAnswer: 'Monitor vital signs, maintain airway patency, and escalate promptly.',
            requiredConcepts: ['vital signs', 'airway'],
            criticalErrors: ['ignoring hypoxia'],
            explanation: 'ABCs are always the first priority.',
            acceptedAlternatives: [],
          }
        : {
            awardedMarks: Number((maxMarks * 0.85).toFixed(2)),
            maxMarks,
            confidence: 0.9,
            reasoning: 'Good clinical response.',
            conceptsCorrect: ['vital signs'],
            conceptsMissing: ['airway'],
            criticalErrorsFound: [],
            needsVerification: false,
            feedback: 'Solid answer. Remember to explicitly mention airway patency.',
          };

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          id: `mock-exam-${state.aiCallCount}`,
          object: 'chat.completion',
          choices: [{ index: 0, message: { role: 'assistant', content: JSON.stringify(jsonPayload) }, finish_reason: 'stop' }],
          usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 },
        })
      );
    });
  });

  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      resolve({ server, port: addr.port, state });
    });
  });
}

async function run() {
  console.log('--- EXECUTING ADVANCED EXAMINATION SYSTEM E2E VERIFICATION ---');
  const uniqueTag = Date.now();
  const { server, port, state } = await startMockAiServer();

  // 1. UI Page HTTP 200 checks
  for (const path of [
    '/portal/admin/examinations',
    '/portal/student/exams',
    '/portal/student/exams/start',
  ]) {
    const r = await fetch(`${BASE}${path}`);
    assert(r.status === 200, `GET ${path} returns HTTP 200`, `got ${r.status}`);
  }

  const previousDefaults = await prisma.aIProviderConfig.findMany({
    where: { isDefault: true },
    select: { id: true },
  });

  let mockProviderId = null;
  let createdCourseId = null;
  let createdPeriodId = null;
  let createdInvoiceId = null;
  const createdExamIds = [];

  try {
    const { encryptedApiKey, keyLast4 } = encryptApiKey('sk-mock-exam-sys-1234');
    await prisma.aIProviderConfig.updateMany({
      where: { isDefault: true },
      data: { isDefault: false },
    });
    const mockProvider = await prisma.aIProviderConfig.create({
      data: {
        displayName: 'Mock Exam System AI',
        apiBaseUrl: `http://127.0.0.1:${port}`,
        apiEndpoint: '/v1/chat/completions',
        encryptedApiKey,
        keyLast4,
        modelName: 'mock-gpt-4o-mini',
        isActive: true,
        isDefault: true,
        supportsJsonMode: true,
        temperature: 0.1,
        maxOutputTokens: 1024,
        timeoutMs: 10000,
      },
    });
    mockProviderId = mockProvider.id;

    const [adminCookie, studentCookie] = await Promise.all([
      loginWithDemo('SUPER_ADMIN'),
      loginWithDemo('STUDENT'),
    ]);
    assert(Boolean(adminCookie), 'Obtained SUPER_ADMIN session cookie');
    assert(Boolean(studentCookie), 'Obtained STUDENT session cookie');

    const [acadRes, stuRegInfo] = await Promise.all([
      api('/api/admin/academics', { cookie: adminCookie }),
      api('/api/student/registration', { cookie: studentCookie }),
    ]);
    const studentId = stuRegInfo.data?.student?.id;
    const studentProgName = stuRegInfo.data?.student?.programme;
    const programmeId =
      acadRes.data?.programmes?.find((p) => p.name === studentProgName)?.id ||
      acadRes.data?.programmes?.[0]?.id;
    const semesterId = acadRes.data?.semesters?.[0]?.id || null;
    assert(Boolean(studentId) && Boolean(programmeId), 'Resolved studentId and programmeId');

    // Create dedicated test course & enroll student
    const courseRes = await api('/api/admin/academics', {
      method: 'POST',
      cookie: adminCookie,
      body: {
        type: 'course',
        data: {
          code: `EXM${String(uniqueTag).slice(-4)}`,
          title: `Advanced Exam Nursing ${uniqueTag}`,
          description: 'End-to-end online examination test course.',
          creditHours: 3,
          level: '100',
          semester: 'Semester 1',
          programmeId,
        },
      },
    });
    createdCourseId = courseRes.data?.course?.id || courseRes.data?.id;
    assert(Boolean(createdCourseId), 'Created test course');

    await prisma.courseEnrollment.create({
      data: { studentId, courseId: createdCourseId, progressPercent: 0 },
    });
    if (semesterId) {
      await prisma.courseRegistration.create({
        data: { studentId, courseId: createdCourseId, semesterId, status: 'APPROVED' },
      });
    }

    // Create approved ExtractedTopic + TopicQuestion in bank
    const topic = await prisma.extractedTopic.create({
      data: {
        courseId: createdCourseId,
        title: 'Patient Safety & Vital Signs',
        summary: 'Core clinical monitoring.',
        orderIndex: 1,
        status: 'APPROVED',
        material: {
          create: {
            courseId: createdCourseId,
            title: `Exam Guide ${uniqueTag}`,
            fileType: 'PDF',
            fileUrl: '/uploads/mock-exam-guide.pdf',
            fileSize: '64 KB',
          },
        },
      },
    });
    const bankQ = await prisma.topicQuestion.create({
      data: {
        topicId: topic.id,
        courseId: createdCourseId,
        questionType: 'MCQ',
        difficulty: 'MEDIUM',
        questionText: 'Which cuff width is appropriate for adult blood pressure measurement?',
        optionsJson: JSON.stringify(['40% of arm circumference', '10% of arm circumference', '90% of arm circumference', '5 cm fixed']),
        correctAnswer: '40% of arm circumference',
        explanation: 'AHA guidelines recommend bladder width 40% of arm circumference.',
        marks: 4,
        status: 'APPROVED',
      },
    });
    assert(Boolean(bankQ.id), 'Created approved TopicQuestion in question bank');

    // 2. Create ExaminationPeriod
    const now = new Date();
    const periodRes = await api('/api/admin/examinations', {
      method: 'POST',
      cookie: adminCookie,
      body: {
        action: 'create_period',
        data: {
          title: `End of Semester Period ${uniqueTag}`,
          semesterId,
          programmeId,
          startDate: new Date(now.getTime() - 86400_000).toISOString(),
          endDate: new Date(now.getTime() + 7 * 86400_000).toISOString(),
          status: 'ACTIVE',
        },
      },
    });
    assert(periodRes.status === 201 && periodRes.data?.period?.id, 'Created ExaminationPeriod');
    createdPeriodId = periodRes.data.period.id;

    // 3. Create Examination with Sections, randomization, AFTER_PERIOD publication, and financial clearance
    const startWindow = new Date(now.getTime() - 3600_000).toISOString();
    const endWindow = new Date(now.getTime() + 7200_000).toISOString();
    const examRes = await api('/api/admin/examinations', {
      method: 'POST',
      cookie: adminCookie,
      body: {
        action: 'create_exam',
        examData: {
          courseId: createdCourseId,
          periodId: createdPeriodId,
          title: `Final Clinical CBT ${uniqueTag}`,
          examType: 'END_OF_SEMESTER',
          durationMinutes: 60,
          totalMarks: 10,
          passMark: 50,
          scheduledDate: now.toISOString().slice(0, 10),
          scheduledTime: '09:00',
          startTime: startWindow,
          endTime: endWindow,
          mode: 'ONLINE',
          randomizeQuestions: true,
          randomizeOptions: true,
          publicationMode: 'AFTER_PERIOD',
          requireFinancialClearance: true,
          maxRetakes: 1,
          status: 'ACTIVE',
          isPublished: true,
          sections: [
            { title: 'Section A: Objective', orderIndex: 1, marksAllocated: 4, questionCount: 1 },
            { title: 'Section B: Clinical Short Answer', orderIndex: 2, marksAllocated: 6, questionCount: 1 },
          ],
        },
      },
    });
    assert(examRes.status === 200 || examRes.status === 201, 'Created Examination with Sections');
    const examId = examRes.data?.exam?.id;
    createdExamIds.push(examId);
    const sections = examRes.data?.sections || examRes.data?.exam?.sections || [];
    const secA = sections.find((s) => s.title.includes('Section A'));
    const secB = sections.find((s) => s.title.includes('Section B'));
    assert(Boolean(secA) && Boolean(secB), 'Sections A & B persisted on Examination');

    // Import approved TopicQuestion into Section A (0 AI calls)
    state.aiCallCount = 0;
    const importRes = await api('/api/admin/examinations', {
      method: 'POST',
      cookie: adminCookie,
      body: {
        action: 'import_bank_questions',
        examId,
        sectionId: secA.id,
        questionIds: [bankQ.id],
      },
    });
    assert(importRes.status === 201, 'Imported approved TopicQuestion into Section A');
    assert(state.aiCallCount === 0, 'Importing bank question made 0 AI calls');

    // Add SHORT_ANSWER question into Section B (1 AI call for rubric)
    const addQRes = await api('/api/admin/examinations', {
      method: 'POST',
      cookie: adminCookie,
      body: {
        action: 'add_question',
        examId,
        question: {
          sectionId: secB.id,
          questionType: 'SHORT_ANSWER',
          text: 'Outline priority nursing actions for acute hypoxia.',
          marks: 6,
        },
      },
    });
    assert(addQRes.status === 201, 'Added SHORT_ANSWER question to Section B');

    // 4. Overlapping schedule conflict detection (409)
    const exam2Res = await api('/api/admin/examinations', {
      method: 'POST',
      cookie: adminCookie,
      body: {
        action: 'create_exam',
        examData: {
          courseId: createdCourseId,
          periodId: createdPeriodId,
          title: `Conflict Check Exam ${uniqueTag}`,
          scheduledDate: now.toISOString().slice(0, 10),
          scheduledTime: '14:00',
          durationMinutes: 45,
        },
      },
    });
    const exam2Id = exam2Res.data?.exam?.id;
    createdExamIds.push(exam2Id);

    const conflictRes = await api('/api/admin/examinations', {
      method: 'POST',
      cookie: adminCookie,
      body: {
        action: 'schedule_exam',
        examId: exam2Id,
        startTime: startWindow,
        endTime: endWindow,
      },
    });
    assert(conflictRes.status === 409, 'Overlapping schedule_exam rejected with 409', `got ${conflictRes.status}`);

    // 5. Financial Clearance Eligibility Gate (seeded demo student has unpaid balance -> 403)
    const dirBlocked = await api('/api/student/exams', { cookie: studentCookie });
    const dirExamBlocked = dirBlocked.data?.exams?.find((e) => e.id === examId);
    assert(
      dirExamBlocked?.eligibility?.eligible === false,
      'GET /api/student/exams marks student ineligible when financial clearance fails'
    );

    const startBlocked = await api(`/api/student/exams/${examId}`, {
      method: 'POST',
      cookie: studentCookie,
    });
    assert(startBlocked.status === 403, 'POST /api/student/exams/[id] rejects unpaid student with 403', `got ${startBlocked.status}`);

    // Disable financial clearance gate for this exam so student becomes eligible
    const toggleClearanceRes = await api('/api/admin/examinations', {
      method: 'PATCH',
      cookie: adminCookie,
      body: { action: 'update_exam', examId, data: { requireFinancialClearance: false } },
    });
    assert(toggleClearanceRes.status === 200, 'Admin updated exam requireFinancialClearance=false');

    // 6. Start & Resume Examination Session
    const startRes = await api(`/api/student/exams/${examId}`, {
      method: 'POST',
      cookie: studentCookie,
    });
    assert(startRes.status === 201 && startRes.data?.attempt?.id, 'Eligible student started exam session', JSON.stringify(startRes.data));
    const attemptId = startRes.data.attempt.id;
    const strippedKeys = (startRes.data.questions || []).every(
      (q) => q.correctAnswer === undefined && q.expectedAnswer === undefined
    );
    assert(strippedKeys, 'Started exam payload strips correctAnswer & expectedAnswer');

    const resumeRes = await api(`/api/student/exams/${examId}`, {
      method: 'POST',
      cookie: studentCookie,
    });
    assert(
      resumeRes.status === 200 && resumeRes.data?.resumed === true && resumeRes.data?.attempt?.id === attemptId,
      'Re-calling POST /api/student/exams/[id] resumes same IN_PROGRESS attempt'
    );

    // 7. Real-Time Autosave, Flagging & Integrity Activity Log
    const q1 = startRes.data.questions.find((q) => q.questionType === 'MCQ');
    const q2 = startRes.data.questions.find((q) => q.questionType === 'SHORT_ANSWER');

    const autosaveRes = await api(`/api/student/exams/${examId}`, {
      method: 'PATCH',
      cookie: studentCookie,
      body: {
        attemptId,
        answers: { [q1.id]: '40% of arm circumference' },
        flaggedQuestions: [q2.id],
        integrityEvent: { eventType: 'TAB_SWITCH', details: { source: 'verify-exam-system' } },
      },
    });
    assert(
      autosaveRes.status === 200 && autosaveRes.data?.saved === true && autosaveRes.data?.integrityEventsCount >= 1,
      'PATCH autosave saved answer, flagged question, and logged TAB_SWITCH without disqualifying'
    );

    const getRestored = await api(`/api/student/exams/${examId}`, { cookie: studentCookie });
    assert(
      getRestored.data?.activeAttempt?.savedAnswers?.[q1.id] === '40% of arm circumference' &&
        getRestored.data?.activeAttempt?.flaggedQuestions?.includes(q2.id),
      'GET /api/student/exams/[id] restores autosaved answers and flagged questions'
    );

    // 8. Submission, Publication Mode Gating & Idempotency
    state.aiCallCount = 0;
    const idemKey = `idem-exm-sys-${uniqueTag}`;
    const submitRes = await api(`/api/student/exams/${examId}/submit`, {
      method: 'POST',
      cookie: studentCookie,
      body: {
        attemptId,
        answers: {
          [q1.id]: '40% of arm circumference',
          [q2.id]: 'Monitor vital signs and SpO2, maintain airway patency, and escalate promptly.',
        },
        idempotencyKey: idemKey,
      },
    });
    assert(submitRes.status === 200 && submitRes.data?.evaluationStatus === 'COMPLETED', 'Exam submitted and auto-graded');
    assert(state.aiCallCount === 1, 'Automated grading called AI ONLY for the 1 subjective question', `got ${state.aiCallCount}`);
    assert(submitRes.data?.resultPublished === false, 'AFTER_PERIOD publication mode hides score until period is published');

    const replayRes = await api(`/api/student/exams/${examId}/submit`, {
      method: 'POST',
      cookie: studentCookie,
      body: { attemptId, answers: {}, idempotencyKey: idemKey },
    });
    assert(replayRes.status === 200 && replayRes.data?.cached === true && state.aiCallCount === 1, 'Idempotent replay returns cached 200 with 0 extra AI calls');

    const dupRes = await api(`/api/student/exams/${examId}/submit`, {
      method: 'POST',
      cookie: studentCookie,
      body: { answers: { [q1.id]: '40% of arm circumference' } },
    });
    assert(dupRes.status === 409, 'Duplicate submission without idempotencyKey returns 409', `got ${dupRes.status}`);

    // Publish Period Results -> reveals result slip
    const pubPeriodRes = await api('/api/admin/examinations', {
      method: 'PATCH',
      cookie: adminCookie,
      body: { action: 'publish_period_results', periodId: createdPeriodId },
    });
    assert(pubPeriodRes.status === 200, 'Admin published ExaminationPeriod results');

    const afterPubGet = await api(`/api/student/exams/${examId}`, { cookie: studentCookie });
    assert(
      afterPubGet.data?.latestAttempt?.resultPublished === true &&
        Number(afterPubGet.data?.latestAttempt?.percentage) > 0,
      'Student now sees published score & result slip after period publication'
    );

    // 9. Period Delete Protection (409 when attempts exist)
    const delPeriodRes = await api('/api/admin/examinations', {
      method: 'POST',
      cookie: adminCookie,
      body: { action: 'delete_period', periodId: createdPeriodId },
    });
    assert(delPeriodRes.status === 409, 'Deleting ExaminationPeriod with attempts returns 409', `got ${delPeriodRes.status}`);

    // 10. Exam & Question Analytics (Admin + Lecturer)
    const [adminAnalytics, lecExams] = await Promise.all([
      api(`/api/admin/exam-analytics?periodId=${createdPeriodId}`, { cookie: adminCookie }),
      api('/api/lecturer/examinations', { cookie: adminCookie }),
    ]);
    assert(
      adminAnalytics.status === 200 && adminAnalytics.data?.questionAnalytics?.length >= 2,
      'GET /api/admin/exam-analytics returns question performance analytics'
    );
    assert(lecExams.status === 200 && Array.isArray(lecExams.data?.examinations), 'GET /api/lecturer/examinations returns 200');

    // 11. Exam Cancellation
    const cancelRes = await api('/api/admin/examinations', {
      method: 'POST',
      cookie: adminCookie,
      body: { action: 'cancel_exam', examId: exam2Id },
    });
    assert(cancelRes.status === 200 && cancelRes.data?.exam?.status === 'CANCELLED', 'cancel_exam sets status=CANCELLED');
  } finally {
    try {
      if (createdInvoiceId) {
        await prisma.invoice.delete({ where: { id: createdInvoiceId } }).catch(() => {});
      }
      if (createdExamIds.length > 0) {
        const attempts = await prisma.examAttempt.findMany({ where: { examId: { in: createdExamIds } }, select: { id: true } });
        const attemptIds = attempts.map((a) => a.id);
        if (attemptIds.length > 0) {
          await prisma.examinationActivityLog.deleteMany({ where: { attemptId: { in: attemptIds } } });
          await prisma.examAnswer.deleteMany({ where: { attemptId: { in: attemptIds } } });
          await prisma.examAttempt.deleteMany({ where: { id: { in: attemptIds } } });
        }
        await prisma.question.deleteMany({ where: { examId: { in: createdExamIds } } });
        await prisma.examinationSection.deleteMany({ where: { examId: { in: createdExamIds } } });
        await prisma.examination.deleteMany({ where: { id: { in: createdExamIds } } });
      }
      if (createdPeriodId) {
        await prisma.examinationPeriod.delete({ where: { id: createdPeriodId } }).catch(() => {});
      }
      if (createdCourseId) {
        await prisma.continuousAssessment.deleteMany({ where: { courseId: createdCourseId } });
        await prisma.courseRegistration.deleteMany({ where: { courseId: createdCourseId } });
        await prisma.courseEnrollment.deleteMany({ where: { courseId: createdCourseId } });
        await prisma.topicQuestion.deleteMany({ where: { courseId: createdCourseId } });
        await prisma.extractedTopic.deleteMany({ where: { courseId: createdCourseId } });
        await prisma.learningMaterial.deleteMany({ where: { courseId: createdCourseId } });
        await prisma.course.delete({ where: { id: createdCourseId } }).catch(() => {});
      }
      if (mockProviderId) {
        await prisma.aIProviderConfig.delete({ where: { id: mockProviderId } }).catch(() => {});
      }
      if (previousDefaults.length > 0) {
        await prisma.aIProviderConfig.updateMany({
          where: { id: { in: previousDefaults.map((p) => p.id) } },
          data: { isDefault: true },
        });
      }
    } catch (e) {
      console.warn('Cleanup warning in verify-exam-system.js:', e.message);
    } finally {
      server.close();
      await prisma.$disconnect();
    }
  }

  console.log(`\n=== SUMMARY: ${passed} passed, ${failed} failed ===`);
  if (failed > 0) process.exit(1);
}

run().catch((err) => {
  console.error('Fatal error in verify-exam-system.js:', err);
  process.exit(1);
});
