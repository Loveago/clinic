const { PDFDocument, StandardFonts } = require('pdf-lib');

const BASE = 'http://localhost:3000';

async function createSampleNursingPdf() {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const pagesContent = [
    {
      heading: '1. Introduction to Nursing',
      lines: [
        'Nursing is defined as the autonomous and collaborative care of individuals of all ages and families.',
        'Registered nurses promote health, prevent illness, and care for ill, disabled, and dying patients.',
        'Clinical Competence requires lifelong learning, ethical accountability, and compassionate bedside practice.',
        'At WellLife Medical Center in Accra, nursing students integrate classroom theory with ward care.',
      ],
    },
    {
      heading: '2. Infection Prevention and Control',
      lines: [
        'Hand Hygiene is the single most effective measure to prevent healthcare-associated infections.',
        'Standard Precautions apply to all patients regardless of suspected or confirmed diagnosis.',
        'Personal Protective Equipment includes gloves, masks, eye protection, and sterile gowns.',
        'Sterile Instruments must be autoclaved and stored in sealed packs before surgical procedures.',
      ],
    },
    {
      heading: '3. Vital Signs and Patient Assessment',
      lines: [
        'Vital Signs measure essential physiological functions including temperature, pulse, respiration, and blood pressure.',
        'Normal Adult Blood Pressure is approximately 120/80 mmHg measured at rest.',
        'Tachycardia refers to an elevated resting heart rate above 100 beats per minute in adults.',
        'Accurate documentation of vital signs enables early detection of clinical deterioration.',
      ],
    },
  ];

  for (const p of pagesContent) {
    const page = pdfDoc.addPage([595, 842]);
    page.drawText(p.heading, { x: 50, y: 760, size: 16, font: bold });
    let y = 720;
    for (const line of p.lines) {
      page.drawText(line, { x: 50, y, size: 11, font });
      y -= 24;
    }
  }

  return Buffer.from(await pdfDoc.save());
}

async function run() {
  let passed = 0;
  let failed = 0;

  function assert(cond, label, extra = '') {
    if (cond) {
      console.log(`✅ [PASS] ${label}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${label} ${extra}`);
      failed++;
    }
  }

  console.log('--- EXECUTING PDF LEARNING & TOPIC ASSESSMENT VERIFICATION ---');

  // 1. Check pages return 200
  for (const p of ['/portal/admin/learning', '/portal/student/materials']) {
    const res = await fetch(`${BASE}${p}`);
    assert(res.status === 200, `GET ${p} returns 200`, `got ${res.status}`);
  }

  // 2. Get a valid courseId from academics
  const acadRes = await fetch(`${BASE}/api/admin/academics`);
  const acad = await acadRes.json();
  const course = acad.courses?.[0];
  assert(Boolean(course?.id), 'Found seeded course for PDF upload');

  // 3. Test invalid PDF upload rejection
  const invalidForm = new FormData();
  invalidForm.append('file', new Blob(['NOT A REAL PDF'], { type: 'application/pdf' }), 'fake.pdf');
  invalidForm.append('title', 'Invalid File Test');
  invalidForm.append('courseId', course.id);
  const badRes = await fetch(`${BASE}/api/admin/learning-materials`, {
    method: 'POST',
    body: invalidForm,
  });
  assert(badRes.status === 400, 'Invalid PDF signature rejected with 400');

  // 4. Upload valid multi-page Nursing PDF
  const pdfBuffer = await createSampleNursingPdf();
  const validForm = new FormData();
  validForm.append('file', new Blob([pdfBuffer], { type: 'application/pdf' }), 'nursing-fundamentals.pdf');
  validForm.append('title', 'Fundamentals of Nursing — Automated Test PDF');
  validForm.append('description', 'Official Ridge Accra nursing course handout');
  validForm.append('courseId', course.id);
  validForm.append('level', course.level || 'Level 100');
  validForm.append('processMode', 'sync');

  const upRes = await fetch(`${BASE}/api/admin/learning-materials`, {
    method: 'POST',
    body: validForm,
  });
  const upData = await upRes.json();
  assert(upRes.status === 201 && upData.processingResult?.success, 'Valid PDF uploaded & processed synchronously');
  const materialId = upData.material?.id;
  assert(upData.processingResult?.topicsCount >= 3, `Extracted >= 3 topics (got ${upData.processingResult?.topicsCount})`);

  // 5. Verify PDF streaming endpoint
  const pdfStreamRes = await fetch(`${BASE}/api/admin/learning-materials/${materialId}/pdf`);
  assert(
    pdfStreamRes.status === 200 && pdfStreamRes.headers.get('content-type')?.includes('application/pdf'),
    'Original PDF streams as application/pdf'
  );

  // 6. Inspect extracted topics
  const detailRes = await fetch(`${BASE}/api/admin/learning-materials/${materialId}`);
  const detail = await detailRes.json();
  const topics = detail.material?.extractedTopics || [];
  assert(topics.length >= 3, 'Material detail returns extracted topics');
  const firstTopic = topics[0];
  assert(firstTopic.status === 'DRAFT', 'Extracted topics start as DRAFT (not auto-published)');

  // 7. Approve all & publish material
  const pubRes = await fetch(`${BASE}/api/admin/topics`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'publish_all', materialId }),
  });
  assert(pubRes.status === 200, 'Approve all & publish material succeeded');

  // 8. Generate questions for an individual topic
  const genRes = await fetch(`${BASE}/api/admin/topics/${firstTopic.id}/generate-questions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      count: 6,
      difficulty: 'MEDIUM',
      questionTypes: ['MCQ', 'TRUE_FALSE', 'SHORT_ANSWER', 'FILL_BLANK', 'MATCHING', 'SCENARIO'],
      includeExplanations: true,
      includePageReferences: true,
    }),
  });
  const genData = await genRes.json();
  assert(genRes.status === 201 && genData.createdCount >= 4, `Generated ${genData.createdCount} draft questions for topic`);
  assert(genData.questions.every((q) => q.status === 'DRAFT'), 'Generated questions saved as DRAFT');

  // 9. Approve generated questions
  const qIds = genData.questions.map((q) => q.id);
  const approveQRes = await fetch(`${BASE}/api/admin/question-bank`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'bulk_status', questionIds: qIds, status: 'APPROVED' }),
  });
  assert(approveQRes.status === 200, 'Bulk-approved topic questions');

  // 10. Create Topic Assessment
  const assessRes = await fetch(`${BASE}/api/admin/topic-assessments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: `Quiz: ${firstTopic.title}`,
      courseId: course.id,
      topicId: firstTopic.id,
      assessmentType: 'TOPIC_QUIZ',
      durationMinutes: 15,
      passMark: 50,
      maxAttempts: 3,
      questionIds: qIds,
      status: 'PUBLISHED',
    }),
  });
  const assessData = await assessRes.json();
  assert(assessRes.status === 201 && assessData.assessment?.id, 'Created & published topic assessment');
  const assessmentId = assessData.assessment.id;

  // 11. Test Student Role Access Control (must block admin mutations)
  const stuLoginRes = await fetch(`${BASE}/api/auth/demo-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role: 'STUDENT' }),
  });
  const stuCookie = stuLoginRes.headers.get('set-cookie')?.split(';')[0] || '';
  const blockedRes = await fetch(`${BASE}/api/admin/question-bank`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: stuCookie },
    body: JSON.stringify({ topicId: firstTopic.id, questionText: 'Hack?', correctAnswer: 'No' }),
  });
  assert(blockedRes.status === 403, 'Student blocked (403) from creating admin question bank items');

  // 12. Student Learning Centre & Topic Reader
  const lcRes = await fetch(`${BASE}/api/student/learning-center`, {
    headers: { Cookie: stuCookie },
  });
  const lcData = await lcRes.json();
  assert(lcRes.status === 200 && lcData.stats?.totalTopics >= 3, 'Student Learning Centre returns published topics');

  const topicReadRes = await fetch(`${BASE}/api/student/learning-topics/${firstTopic.id}`, {
    headers: { Cookie: stuCookie },
  });
  const topicReadData = await topicReadRes.json();
  assert(topicReadRes.status === 200 && topicReadData.topic?.structuredContent, 'Student Topic Reader returns structured content');

  const markCompleteRes = await fetch(`${BASE}/api/student/learning-topics/${firstTopic.id}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: stuCookie },
    body: JSON.stringify({ completed: true }),
  });
  const markCompleteData = await markCompleteRes.json();
  assert(
    markCompleteRes.status === 200 && markCompleteData.mastery?.masteryStatus === 'COMPLETED',
    'Marking topic read sets COMPLETED (never auto-MASTERED without quiz)'
  );

  // 13. Student Quiz: Load (verify no correctAnswer leaked), Start, Submit, Duplicate Submit Guard
  const quizLoadRes = await fetch(`${BASE}/api/student/topic-assessments/${assessmentId}`, {
    headers: { Cookie: stuCookie },
  });
  const quizLoadData = await quizLoadRes.json();
  assert(
    quizLoadRes.status === 200 && quizLoadData.questions?.every((q) => q.correctAnswer === undefined),
    'Student quiz payload strips correctAnswer before submission'
  );

  const startRes = await fetch(`${BASE}/api/student/topic-assessments/${assessmentId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: stuCookie },
    body: JSON.stringify({ action: 'start' }),
  });
  const startData = await startRes.json();
  assert(startRes.status === 201 && startData.attempt?.id, 'Student started timed attempt');
  const attemptId = startData.attempt.id;

  const ansMap = {};
  for (const q of quizLoadData.questions) {
    ansMap[q.id] = q.questionType === 'SHORT_ANSWER' ? 'Nursing provides compassionate care.' : 'True';
  }
  const submitRes = await fetch(`${BASE}/api/student/topic-assessments/${assessmentId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: stuCookie },
    body: JSON.stringify({ action: 'submit', attemptId, answers: ansMap }),
  });
  const submitData = await submitRes.json();
  assert(submitRes.status === 200 && submitData.result?.attemptId === attemptId, 'Student submitted quiz successfully');

  // Duplicate submission guard
  const dupSubmitRes = await fetch(`${BASE}/api/student/topic-assessments/${assessmentId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: stuCookie },
    body: JSON.stringify({ action: 'submit', attemptId, answers: ansMap }),
  });
  assert(dupSubmitRes.status === 400, 'Duplicate submission rejected with 400');

  // 13b. Revision Centre page, Admin Learning Analytics + CSV, Assessment Duplicate, Lecturer API
  const revPageRes = await fetch(`${BASE}/portal/student/revision`, { headers: { Cookie: stuCookie } });
  assert(revPageRes.status === 200, 'Student Revision Centre page renders HTTP 200');

  const analyticsRes = await fetch(`${BASE}/api/admin/learning-analytics`);
  const analyticsData = await analyticsRes.json();
  assert(
    analyticsRes.status === 200 && analyticsData.overview && Array.isArray(analyticsData.topicAnalytics),
    'Admin Learning Analytics API returns overview & topic analytics'
  );

  const csvRes = await fetch(`${BASE}/api/admin/learning-analytics?format=csv`);
  const csvText = await csvRes.text();
  assert(
    csvRes.status === 200 &&
      (csvRes.headers.get('content-type') || '').includes('text/csv') &&
      csvText.includes('Student ID,Name,Programme'),
    'Admin Learning Analytics CSV export returns text/csv'
  );

  const dupAssRes = await fetch(`${BASE}/api/admin/topic-assessments/${assessmentId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'duplicate' }),
  });
  const dupAssData = await dupAssRes.json();
  assert(
    dupAssRes.status === 201 && dupAssData.assessment?.status === 'DRAFT' && dupAssData.assessment?.id !== assessmentId,
    'Admin can duplicate topic assessment as DRAFT'
  );
  if (dupAssData.assessment?.id) {
    await fetch(`${BASE}/api/admin/topic-assessments/${dupAssData.assessment.id}`, { method: 'DELETE' });
  }

  const lecCoursesRes = await fetch(`${BASE}/api/lecturer/courses`);
  const lecCoursesData = await lecCoursesRes.json();
  assert(lecCoursesRes.status === 200 && Array.isArray(lecCoursesData.courses), 'Lecturer courses API returns courses');

  // 14. Cleanup test material so seed DB stays clean
  await fetch(`${BASE}/api/admin/learning-materials/${materialId}`, { method: 'DELETE' });

  console.log(`\n--- SUMMARY: ${passed} PASSED, ${failed} FAILED (TOTAL: ${passed + failed}) ---`);
  process.exit(failed > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

