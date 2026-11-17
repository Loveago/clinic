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
  const state = {
    aiCallCount: 0,
    failMode: false,
    lastPrompts: [],
  };

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
      state.lastPrompts.push(rawBody);

      if (state.failMode) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: { message: 'Simulated AI provider 500 outage' } }));
        return;
      }

      let userContent = '';
      try {
        const parsed = JSON.parse(rawBody);
        userContent = (parsed.messages || []).map((m) => m.content || '').join('\n');
      } catch {
        userContent = rawBody;
      }

      const isRubricGen =
        userContent.includes('Generate a structured marking rubric') ||
        userContent.includes('rubric') && userContent.includes('acceptedAlternatives');

      // Extract maxMarks if present in prompt
      const maxMarksMatch = userContent.match(/maxMarks["']?\s*[:=]\s*(\d+(?:\.\d+)?)/i) ||
        userContent.match(/out of (\d+(?:\.\d+)?)/i);
      const maxMarks = maxMarksMatch ? Number(maxMarksMatch[1]) : 6;

      let jsonPayload;
      if (isRubricGen) {
        jsonPayload = {
          rubric: [
            { criterion: 'Core clinical accuracy', maxMarks: Math.max(1, Math.round(maxMarks * 0.6)), description: 'Identifies primary pathophysiology and nursing intervention' },
            { criterion: 'Patient safety & rationale', maxMarks: Math.max(1, maxMarks - Math.round(maxMarks * 0.6)), description: 'Explains monitoring and safety precautions' },
          ],
          expectedAnswer: 'Monitor vital signs, maintain airway/oxygenation, and escalate abnormal findings promptly.',
          requiredConcepts: ['vital signs', 'airway', 'escalation'],
          criticalErrors: ['ignoring hypoxia', 'incorrect medication route'],
          explanation: 'Clinical assessment prioritizes ABCs (Airway, Breathing, Circulation) and timely escalation.',
          acceptedAlternatives: [],
        };
      } else {
        const awarded = Number((maxMarks * 0.85).toFixed(2));
        jsonPayload = {
          awardedMarks: awarded,
          maxMarks,
          confidence: 0.92,
          reasoning: 'Student demonstrated strong understanding of vital signs monitoring and escalation.',
          conceptsCorrect: ['vital signs', 'escalation'],
          conceptsMissing: ['airway'],
          criticalErrorsFound: [],
          needsVerification: false,
          feedback: 'Well-structured clinical response. Review airway prioritization for full marks.',
        };
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          id: `mock-cmpl-${state.aiCallCount}`,
          object: 'chat.completion',
          choices: [
            {
              index: 0,
              message: {
                role: 'assistant',
                content: JSON.stringify(jsonPayload),
              },
              finish_reason: 'stop',
            },
          ],
          usage: {
            prompt_tokens: 120,
            completion_tokens: 60,
            total_tokens: 180,
          },
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
  console.log('--- EXECUTING 100% AUTOMATED ASSESSMENT & GRADING E2E VERIFICATION ---');
  const uniqueTag = Date.now();
  const { server, port, state } = await startMockAiServer();
  console.log(`Mock OpenAI-compatible server listening on http://127.0.0.1:${port}`);

  // Backup existing AIProviderConfig state and activate mock provider
  const previousDefaults = await prisma.aIProviderConfig.findMany({
    where: { isDefault: true },
    select: { id: true },
  });
  let mockProviderId = null;
  let createdCourseId = null;

  try {
    const { encryptedApiKey, keyLast4 } = encryptApiKey('sk-mock-auto-grader-1234');
    await prisma.aIProviderConfig.updateMany({
      where: { isDefault: true },
      data: { isDefault: false },
    });
    const mockProvider = await prisma.aIProviderConfig.create({
      data: {
        displayName: 'Mock Auto-Grader AI',
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

    // Login as SUPER_ADMIN and STUDENT
    const [adminCookie, studentCookie] = await Promise.all([
      loginWithDemo('SUPER_ADMIN'),
      loginWithDemo('STUDENT'),
    ]);
    assert(Boolean(adminCookie), 'Obtained SUPER_ADMIN session cookie');
    assert(Boolean(studentCookie), 'Obtained STUDENT session cookie');

    // Resolve student record & programme/semester
    const [acadRes, stuRegInfo] = await Promise.all([
      api('/api/admin/academics', { cookie: adminCookie }),
      api('/api/student/registration', { cookie: studentCookie }),
    ]);
    assert(acadRes.status === 200, 'GET /api/admin/academics returns 200');
    const studentId = stuRegInfo.data?.student?.id;
    const studentProgName = stuRegInfo.data?.student?.programme;
    const programmeId =
      acadRes.data?.programmes?.find((p) => p.name === studentProgName)?.id ||
      acadRes.data?.programmes?.[0]?.id;
    const semesterId = acadRes.data?.semesters?.[0]?.id || null;
    assert(Boolean(studentId) && Boolean(programmeId), 'Resolved studentId and programmeId');

    // Create a dedicated test course & enroll student + create an ExtractedTopic
    const courseRes = await api('/api/admin/academics', {
      method: 'POST',
      cookie: adminCookie,
      body: {
        type: 'course',
        data: {
          code: `AUTO${String(uniqueTag).slice(-4)}`,
          title: `Automated Assessment Nursing ${uniqueTag}`,
          description: 'Clinical nursing assessment with automated grading.',
          creditHours: 3,
          level: '100',
          semester: 'Semester 1',
          programmeId,
        },
      },
    });
    assert(courseRes.status === 201 || courseRes.status === 200, 'Created test course');
    const courseId = courseRes.data?.course?.id || courseRes.data?.id;
    createdCourseId = courseId || null;
    assert(Boolean(courseId), 'Resolved test courseId');

    await prisma.courseEnrollment.create({
      data: { studentId, courseId, progressPercent: 0 },
    });
    if (semesterId) {
      await prisma.courseRegistration.create({
        data: {
          studentId,
          courseId,
          semesterId,
          status: 'APPROVED',
        },
      });
    }

    const topic = await prisma.extractedTopic.create({
      data: {
        courseId,
        title: 'Airway & Vital Signs Stabilization',
        summary: 'ABC assessment, vital signs monitoring, and escalation protocols.',
        orderIndex: 1,
        status: 'APPROVED',
        material: {
          create: {
            courseId,
            title: `Clinical Stabilization Guide ${uniqueTag}`,
            fileType: 'PDF',
            fileUrl: '/uploads/mock-clinical-guide.pdf',
            fileSize: '128 KB',
          },
        },
      },
    });
    assert(Boolean(topic.id), 'Created approved ExtractedTopic for revision recommendations');

    // =========================================================================
    // 1. ONE-TIME RUBRIC GENERATION
    // =========================================================================
    state.aiCallCount = 0;
    const futureRelease = new Date(Date.now() + 3600_000).toISOString();
    const createExamRes = await api('/api/admin/examinations', {
      method: 'POST',
      cookie: adminCookie,
      body: {
        action: 'create_exam',
        examData: {
          courseId,
          title: `Auto-Graded Clinical Exam ${uniqueTag}`,
          durationMinutes: 60,
          totalMarks: 20,
          passMark: 10,
          scheduledDate: new Date().toISOString().slice(0, 10),
          scheduledTime: '09:00',
          status: 'ONGOING',
          isPublished: true,
          allowReview: true,
          showExplanations: true,
          answerKeyReleaseAt: futureRelease,
          questions: [
            {
              questionType: 'MCQ',
              text: 'Which vital sign is assessed first in acute respiratory distress?',
              options: ['Respiratory rate & SpO2', 'Height', 'Weight', 'Grip strength'],
              correctAnswer: 'Respiratory rate & SpO2',
              explanation: 'Oxygenation and respiratory rate are immediate ABC priorities.',
              marks: 4,
            },
            {
              questionType: 'FILL_BLANK',
              text: 'The standard abbreviation for Blood Pressure is ____.',
              correctAnswer: 'Blood Pressure',
              acceptedAlternativesJson: JSON.stringify(['BP', 'Blood Pressure']),
              caseSensitive: false,
              explanation: 'BP stands for Blood Pressure.',
              marks: 4,
            },
            {
              questionType: 'SHORT_ANSWER',
              text: 'Explain two priority nursing actions when a post-op patient develops tachycardia.',
              marks: 6,
            },
            {
              questionType: 'SCENARIO',
              text: 'A 68-year-old patient has SpO2 88% and confusion. Outline your immediate nursing response.',
              marks: 6,
            },
          ],
        },
      },
    });
    assert(createExamRes.status === 200 || createExamRes.status === 201, 'Admin created mixed-type exam', JSON.stringify(createExamRes.data));
    const examId = createExamRes.data?.exam?.id || createExamRes.data?.id;
    assert(Boolean(examId), 'Resolved created examId');

    const rubricCallsAtCreation = state.aiCallCount;
    assert(rubricCallsAtCreation === 2, 'Rubric generated ONCE per subjective question at creation (expected 2 AI calls)', `got ${rubricCallsAtCreation}`);

    const dbQuestions = await prisma.question.findMany({
      where: { examId },
      orderBy: { orderIndex: 'asc' },
    });
    const subjectiveQs = dbQuestions.filter((q) => q.questionType === 'SHORT_ANSWER' || q.questionType === 'SCENARIO');
    assert(
      subjectiveQs.length === 2 && subjectiveQs.every((q) => Boolean(q.rubricJson) && Boolean(q.expectedAnswer)),
      'Subjective questions persisted rubricJson and expectedAnswer in DB'
    );

    // =========================================================================
    // 2. ANSWER-KEY GATING & ZERO AI CALLS ON FETCH
    // =========================================================================
    state.aiCallCount = 0;
    const studentExamGet = await api(`/api/student/exams/${examId}`, { cookie: studentCookie });
    assert(studentExamGet.status === 200, 'GET /api/student/exams/[id] returns 200');
    assert(state.aiCallCount === 0, 'GET /api/student/exams/[id] triggers 0 AI calls', `got ${state.aiCallCount}`);

    const fetchedQuestions = studentExamGet.data?.questions || studentExamGet.data?.exam?.questions || [];
    assert(fetchedQuestions.length === 4, 'Student exam fetch returned all 4 questions');
    const leakedKeys = fetchedQuestions.some(
      (q) => q.correctAnswer !== undefined || q.expectedAnswer !== undefined || q.explanation !== undefined
    );
    assert(!leakedKeys, 'GET /api/student/exams/[id] does NOT expose correctAnswer/expectedAnswer/explanation before submission');

    // =========================================================================
    // 3. AUTOMATIC EXAM GRADING (OBJECTIVE + SUBJECTIVE + IDEMPOTENCY + REVISION)
    // =========================================================================
    state.aiCallCount = 0;
    const answersMap = {};
    for (const q of dbQuestions) {
      if (q.questionType === 'MCQ') answersMap[q.id] = 'Respiratory rate & SpO2';
      else if (q.questionType === 'FILL_BLANK') answersMap[q.id] = 'bp'; // lowercase alt
      else if (q.questionType === 'SHORT_ANSWER') answersMap[q.id] = 'Check vital signs, assess for bleeding or pain, and escalate to the physician.';
      else if (q.questionType === 'SCENARIO') answersMap[q.id] = 'Assess airway and breathing, apply supplemental oxygen, monitor vital signs, and escalate immediately.';
    }

    const idempotencyKey = `idem-exam-${uniqueTag}`;
    const submitExamRes = await api(`/api/student/exams/${examId}/submit`, {
      method: 'POST',
      cookie: studentCookie,
      body: { answers: answersMap, idempotencyKey },
    });
    assert(submitExamRes.status === 200, 'POST /api/student/exams/[id]/submit returns 200', JSON.stringify(submitExamRes.data));
    assert(state.aiCallCount === 2, 'Exam grading called AI ONLY for the 2 subjective questions (0 for MCQ/FILL_BLANK)', `got ${state.aiCallCount}`);
    assert(submitExamRes.data?.evaluationStatus === 'COMPLETED', 'Exam evaluationStatus is COMPLETED', `got ${submitExamRes.data?.evaluationStatus}`);
    assert(Number(submitExamRes.data?.score) > 8, 'Exam score includes objective (8) + subjective marks', `got ${submitExamRes.data?.score}`);
    assert(Array.isArray(submitExamRes.data?.revisionRecommendations), 'Exam submit returned revisionRecommendations array');

    // Check answer-key gating after submission while answerKeyReleaseAt is in the future
    const postSubmitGet = await api(`/api/student/exams/${examId}`, { cookie: studentCookie });
    const evalDetails = postSubmitGet.data?.latestAttempt?.evaluationDetails || [];
    const leakedAfterSubmit = evalDetails.some(
      (d) => d.correctAnswer !== undefined && d.correctAnswer !== null
    );
    assert(!leakedAfterSubmit, 'Answer keys remain gated before answerKeyReleaseAt even after submission');

    // Idempotency replay: same idempotencyKey -> 0 additional AI calls
    const beforeReplayCalls = state.aiCallCount;
    const replayRes = await api(`/api/student/exams/${examId}/submit`, {
      method: 'POST',
      cookie: studentCookie,
      body: { answers: answersMap, idempotencyKey },
    });
    assert(replayRes.status === 200, 'Idempotent re-submit returns cached 200');
    assert(state.aiCallCount === beforeReplayCalls, 'Idempotent re-submit makes 0 additional AI calls');

    // Duplicate submission without idempotencyKey -> 409
    const dupRes = await api(`/api/student/exams/${examId}/submit`, {
      method: 'POST',
      cookie: studentCookie,
      body: { answers: answersMap },
    });
    assert(dupRes.status === 409, 'Duplicate exam submission without idempotencyKey returns 409', `got ${dupRes.status}`);

    // =========================================================================
    // 4. AI FAILURE SAFETY (NO SILENT ZERO) & RETRY
    // =========================================================================
    state.aiCallCount = 0;
    const createAssignRes = await api('/api/lecturer/assignments', {
      method: 'POST',
      cookie: adminCookie,
      body: {
        title: `Auto-Graded Care Plan ${uniqueTag}`,
        description: 'Write a nursing care plan for acute hypoxia including vital signs monitoring and escalation.',
        courseId,
        dueDate: new Date(Date.now() + 7 * 86400_000).toISOString(),
        maxMarks: 20,
        status: 'PUBLISHED',
      },
    });
    assert(createAssignRes.status === 200 || createAssignRes.status === 201, 'Created assignment with one-time rubric', JSON.stringify(createAssignRes.data));
    const assignmentId = createAssignRes.data?.assignment?.id || createAssignRes.data?.id;
    assert(Boolean(assignmentId), 'Resolved assignmentId');

    // Simulate AI 500 outage
    state.failMode = true;
    const failSubmitRes = await api('/api/student/assignments', {
      method: 'POST',
      cookie: studentCookie,
      body: {
        assignmentId,
        notes: 'Assess airway, monitor vital signs and SpO2 continuously, administer prescribed oxygen, and escalate.',
        idempotencyKey: `idem-assign-fail-${uniqueTag}`,
      },
    });
    assert(
      failSubmitRes.status === 200 || failSubmitRes.status === 201 || failSubmitRes.status === 202,
      'Student assignment submit preserved submission even during AI outage',
      `got ${failSubmitRes.status}`
    );
    const failedSub = failSubmitRes.data?.submission;
    assert(
      failedSub?.evaluationStatus === 'FAILED' && failedSub?.score === null,
      'AI failure sets evaluationStatus=FAILED and score=null (NO silent 0)',
      `got status=${failedSub?.evaluationStatus}, score=${failedSub?.score}`
    );

    // Recover AI and trigger retry_auto_grading
    state.failMode = false;
    const retryRes = await api('/api/lecturer/assignments', {
      method: 'PATCH',
      cookie: adminCookie,
      body: {
        action: 'retry_auto_grading',
        assignmentId,
      },
    });
    assert(retryRes.status === 200, 'PATCH /api/lecturer/assignments retry_auto_grading returns 200', JSON.stringify(retryRes.data));

    const retriedSub = await prisma.assignmentSubmission.findUnique({
      where: { id: failedSub.id },
    });
    assert(
      retriedSub?.evaluationStatus === 'COMPLETED' && typeof retriedSub?.score === 'number' && retriedSub.score > 0,
      'Retry auto-grading recovered FAILED submission to COMPLETED with positive score',
      `got status=${retriedSub?.evaluationStatus}, score=${retriedSub?.score}`
    );

    // =========================================================================
    // 5. FILE FORMAT VALIDATION & VALID FILE AUTO-GRADING
    // =========================================================================
    // Create a second assignment to test invalid .exe rejection + valid base64 text file auto-grading
    const createAssign2Res = await api('/api/lecturer/assignments', {
      method: 'POST',
      cookie: adminCookie,
      body: {
        title: `Text File Care Plan ${uniqueTag}`,
        description: 'Submit a structured clinical escalation note.',
        courseId,
        dueDate: new Date(Date.now() + 7 * 86400_000).toISOString(),
        maxMarks: 10,
        status: 'PUBLISHED',
      },
    });
    const assignment2Id = createAssign2Res.data?.assignment?.id || createAssign2Res.data?.id;

    const badFileRes = await api('/api/student/assignments', {
      method: 'POST',
      cookie: studentCookie,
      body: {
        assignmentId: assignment2Id,
        fileUrl: 'https://example.com/unsafe-payload.exe',
      },
    });
    assert(badFileRes.status === 400, 'Invalid .exe fileUrl is rejected with HTTP 400', `got ${badFileRes.status}`);

    const validTxtDataUrl =
      'data:text/plain;base64,' +
      Buffer.from('Monitor vital signs every 15 minutes, check airway patency, and escalate abnormalities to the medical officer.').toString('base64');

    const validFileRes = await api('/api/student/assignments', {
      method: 'POST',
      cookie: studentCookie,
      body: {
        assignmentId: assignment2Id,
        fileUrl: validTxtDataUrl,
        idempotencyKey: `idem-assign-txt-${uniqueTag}`,
      },
    });
    assert(validFileRes.status === 200 || validFileRes.status === 201, 'Valid data:text/plain submission succeeded');
    assert(
      validFileRes.data?.submission?.evaluationStatus === 'COMPLETED' &&
        Number(validFileRes.data?.submission?.score) > 0,
      'Valid text file submission auto-graded with positive score'
    );

    // =========================================================================
    // 6. AUTOMATIC CA WEIGHTING & CGPA RECALCULATION
    // =========================================================================
    const comp1Res = await api('/api/admin/academics', {
      method: 'POST',
      cookie: adminCookie,
      body: {
        type: 'assessmentComponent',
        data: {
          courseId,
          semesterId,
          name: 'Clinical Exam',
          componentType: 'EXAM',
          sourceType: 'EXAM',
          sourceId: examId,
          weightPercent: 60,
          maxMarks: 20,
          autoSync: true,
        },
      },
    });
    const comp2Res = await api('/api/admin/academics', {
      method: 'POST',
      cookie: adminCookie,
      body: {
        type: 'assessmentComponent',
        data: {
          courseId,
          semesterId,
          name: 'Care Plan Assignment',
          componentType: 'ASSIGNMENT',
          sourceType: 'ASSIGNMENT',
          sourceId: assignmentId,
          weightPercent: 40,
          maxMarks: 20,
          autoSync: true,
        },
      },
    });
    assert(comp1Res.status === 200 || comp1Res.status === 201, 'Created 60% EXAM AssessmentComponent');
    assert(comp2Res.status === 200 || comp2Res.status === 201, 'Created 40% ASSIGNMENT AssessmentComponent');

    const recalcRes = await api('/api/admin/results', {
      method: 'PATCH',
      cookie: adminCookie,
      body: {
        action: 'auto_recalculate',
        courseId,
        semesterId,
      },
    });
    assert(
      recalcRes.status === 200 && recalcRes.data?.recalculatedCount >= 1,
      'PATCH /api/admin/results auto_recalculate updated ContinuousAssessment automatically',
      JSON.stringify(recalcRes.data)
    );

    const caRecord = await prisma.continuousAssessment.findFirst({
      where: { studentId, courseId },
    });
    assert(
      Boolean(caRecord) && caRecord.totalScore > 0 && Boolean(caRecord.grade),
      'ContinuousAssessment has auto-calculated totalScore and grade with 0 manual mark entry',
      caRecord ? `totalScore=${caRecord.totalScore}, grade=${caRecord.grade}` : 'not found'
    );
  } finally {
    // Clean up temporary test course & all child records so demo student state stays clean
    if (createdCourseId) {
      try {
        const exams = await prisma.examination.findMany({ where: { courseId: createdCourseId }, select: { id: true } });
        const examIds = exams.map((e) => e.id);
        if (examIds.length > 0) {
          await prisma.examAttempt.deleteMany({ where: { examId: { in: examIds } } });
          await prisma.question.deleteMany({ where: { examId: { in: examIds } } });
          await prisma.examination.deleteMany({ where: { id: { in: examIds } } });
        }
        const assignments = await prisma.assignment.findMany({ where: { courseId: createdCourseId }, select: { id: true } });
        const assignmentIds = assignments.map((a) => a.id);
        if (assignmentIds.length > 0) {
          await prisma.assignmentSubmission.deleteMany({ where: { assignmentId: { in: assignmentIds } } });
          await prisma.assignment.deleteMany({ where: { id: { in: assignmentIds } } });
        }
        await prisma.assessmentComponent.deleteMany({ where: { courseId: createdCourseId } });
        await prisma.continuousAssessment.deleteMany({ where: { courseId: createdCourseId } });
        await prisma.courseRegistration.deleteMany({ where: { courseId: createdCourseId } });
        await prisma.courseEnrollment.deleteMany({ where: { courseId: createdCourseId } });
        await prisma.extractedTopic.deleteMany({ where: { courseId: createdCourseId } });
        await prisma.learningMaterial.deleteMany({ where: { courseId: createdCourseId } });
        await prisma.course.delete({ where: { id: createdCourseId } }).catch(() => {});
      } catch (cleanupErr) {
        console.warn('Cleanup warning in verify-auto-grading.js:', cleanupErr.message);
      }
    }
    // Restore AIProviderConfig state
    if (mockProviderId) {
      await prisma.aIProviderConfig.delete({ where: { id: mockProviderId } }).catch(() => {});
    }
    if (previousDefaults.length > 0) {
      await prisma.aIProviderConfig.updateMany({
        where: { id: { in: previousDefaults.map((p) => p.id) } },
        data: { isDefault: true },
      });
    }
    server.close();
    await prisma.$disconnect();
  }

  console.log(`\n=== SUMMARY: ${passed} passed, ${failed} failed ===`);
  if (failed > 0) process.exit(1);
}

run().catch((err) => {
  console.error('Fatal error in verify-auto-grading.js:', err);
  process.exit(1);
});
