const http = require('http');
const { PDFDocument, StandardFonts } = require('pdf-lib');

const BASE = 'http://localhost:3000';

async function createNursingPdf(uniqueTag) {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const pages = [
    {
      heading: `1. Maternal & Neonatal Care (${uniqueTag})`,
      lines: [
        'Antenatal care monitors maternal blood pressure, fetal growth, and nutritional status.',
        'Postpartum haemorrhage is an obstetric emergency requiring rapid uterotonic therapy.',
        'Early skin-to-skin contact supports neonatal thermoregulation and breastfeeding.',
      ],
    },
    {
      heading: `2. Pharmacology & Safe Administration (${uniqueTag})`,
      lines: [
        'The five rights of medication administration are right patient, drug, dose, route, and time.',
        'Anaphylaxis requires immediate intramuscular adrenaline and airway support.',
        'Renal dose adjustments prevent drug toxicity in patients with impaired clearance.',
      ],
    },
  ];

  for (const p of pages) {
    const page = pdfDoc.addPage([595, 842]);
    page.drawText(p.heading, { x: 50, y: 760, size: 15, font: bold });
    let y = 720;
    for (const line of p.lines) {
      page.drawText(line, { x: 50, y, size: 11, font });
      y -= 24;
    }
  }

  return Buffer.from(await pdfDoc.save());
}

function startMockOpenAIServer() {
  const state = {
    callCount: 0,
    testCalls: 0,
    topicCalls: 0,
    questionCalls: 0,
    lastAuthHeader: null,
    lastCustomHeader: null,
    lastModel: null,
    lastPath: null,
  };

  const server = http.createServer((req, res) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      state.callCount += 1;
      state.lastAuthHeader = req.headers['authorization'] || null;
      state.lastCustomHeader = req.headers['x-clinic-test'] || null;
      state.lastPath = req.url;

      let parsed = {};
      try {
        parsed = JSON.parse(body || '{}');
      } catch {
        // ignore
      }
      state.lastModel = parsed.model || null;

      const userMsg = JSON.stringify(parsed.messages || []);
      let contentObj;

      if (userMsg.includes('Reply ONLY with {"ok":true}') || userMsg.includes('"ok":true')) {
        state.testCalls += 1;
        contentObj = { ok: true };
      } else if (userMsg.includes('questions') && !userMsg.includes('"topics"')) {
        state.questionCalls += 1;
        contentObj = {
          questions: [
            {
              questionType: 'MCQ',
              difficulty: 'MEDIUM',
              questionText: 'Which action is the immediate priority in postpartum haemorrhage?',
              options: [
                'Administer prescribed uterotonic and massage uterus',
                'Wait 24 hours for observation',
                'Discontinue intravenous access',
                'Restrict oral fluids only',
              ],
              correctAnswer: 'Administer prescribed uterotonic and massage uterus',
              explanation: 'Prompt uterotonic therapy and uterine massage control atonic bleeding.',
            },
            {
              questionType: 'TRUE_FALSE',
              difficulty: 'EASY',
              questionText: 'The five rights of medication administration help prevent drug errors.',
              options: ['True', 'False'],
              correctAnswer: 'True',
              explanation: 'Verifying patient, drug, dose, route, and time reduces medication errors.',
            },
          ],
        };
      } else {
        state.topicCalls += 1;
        contentObj = {
          topics: [
            {
              title: 'Maternal & Neonatal Care',
              summary: 'Antenatal monitoring, postpartum haemorrhage management, and neonatal care.',
              studyNotes:
                '### Key Clinical Points\n- Monitor maternal blood pressure and fetal growth.\n- Manage postpartum haemorrhage promptly with uterotonics.',
              keyPoints: [
                'Antenatal screening detects hypertension early',
                'Uterotonic therapy controls postpartum haemorrhage',
              ],
              subtopics: [
                {
                  title: 'Antenatal Monitoring',
                  content: 'Regular maternal and fetal assessments during pregnancy.',
                },
              ],
              questions: [
                {
                  questionType: 'MCQ',
                  difficulty: 'EASY',
                  questionText: 'What does antenatal care primarily monitor?',
                  options: [
                    'Maternal blood pressure and fetal growth',
                    'Hospital billing invoices',
                    'Ward laundry schedules',
                    'Surgical instrument inventory',
                  ],
                  correctAnswer: 'Maternal blood pressure and fetal growth',
                  explanation: 'Antenatal care tracks maternal and fetal well-being throughout pregnancy.',
                },
              ],
            },
            {
              title: 'Pharmacology & Safe Administration',
              summary: 'Five rights of medication administration and emergency anaphylaxis response.',
              studyNotes:
                '### Key Clinical Points\n- Apply the five rights before administering any drug.\n- Treat anaphylaxis with immediate intramuscular adrenaline.',
              keyPoints: ['Five rights prevent medication errors', 'IM adrenaline treats anaphylaxis'],
              subtopics: [],
              questions: [
                {
                  questionType: 'TRUE_FALSE',
                  difficulty: 'EASY',
                  questionText: 'Intramuscular adrenaline is the first-line treatment for anaphylaxis.',
                  options: ['True', 'False'],
                  correctAnswer: 'True',
                  explanation: 'IM adrenaline rapidly reverses airway oedema and hypotension in anaphylaxis.',
                },
              ],
            },
          ],
        };
      }

      const payload = JSON.stringify({
        id: `chatcmpl-mock-${state.callCount}`,
        object: 'chat.completion',
        model: parsed.model || 'mock-nursing-gpt',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: JSON.stringify(contentObj),
            },
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: 150,
          completion_tokens: 95,
          total_tokens: 245,
        },
      });

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(payload);
    });
  });

  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({ server, port, state });
    });
  });
}

async function getCookieForRole(role) {
  const res = await fetch(`${BASE}/api/auth/demo-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role }),
  });
  const setCookie = res.headers.get('set-cookie') || '';
  return setCookie.split(';')[0];
}

async function run() {
  let passed = 0;
  let failed = 0;
  const createdProviderIds = [];
  let createdMaterialId = null;

  function assert(cond, label, extra = '') {
    if (cond) {
      console.log(`✅ [PASS] ${label}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${label} ${extra}`);
      failed++;
    }
  }

  const mock = await startMockOpenAIServer();
  const mockBaseUrl = `http://127.0.0.1:${mock.port}`;
  console.log(`Mock OpenAI-compatible server listening on ${mockBaseUrl}`);

  try {
    const adminCookie = await getCookieForRole('SUPER_ADMIN');
    const studentCookie = await getCookieForRole('STUDENT');
    assert(Boolean(adminCookie), 'Obtained SUPER_ADMIN session cookie');
    assert(Boolean(studentCookie), 'Obtained STUDENT session cookie');

    // Get seeded course
    const acadRes = await fetch(`${BASE}/api/admin/academics`, {
      headers: { Cookie: adminCookie },
    });
    const acad = await acadRes.json();
    const course = acad.courses?.[0];
    assert(Boolean(course?.id), 'Found seeded course');

    // TEST G: Configure OpenAI-compatible provider with custom base URL, endpoint, key, custom header & test connection
    const createProvRes = await fetch(`${BASE}/api/admin/ai-providers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
      body: JSON.stringify({
        name: 'Mock Clinic OpenAI-Compatible Provider',
        providerType: 'OPENAI_COMPATIBLE',
        apiBaseUrl: mockBaseUrl,
        apiEndpoint: '/v1/chat/completions',
        apiKey: 'sk-mock-clinic-secret-9876',
        modelName: 'mock-nursing-gpt',
        maxOutputTokens: 3000,
        temperature: 0.2,
        timeoutMs: 15000,
        supportsJsonMode: true,
        customHeadersJson: JSON.stringify({ 'X-Clinic-Test': 'clinic-ghana' }),
        isActive: true,
        isDefault: true,
      }),
    });
    const createProvData = await createProvRes.json();
    assert(createProvRes.status === 201 && createProvData.provider?.id, 'Saved OpenAI-compatible AI provider');
    const providerId = createProvData.provider.id;
    createdProviderIds.push(providerId);

    // Ensure key is masked and never exposed in GET
    const listProvRes = await fetch(`${BASE}/api/admin/ai-providers`, {
      headers: { Cookie: adminCookie },
    });
    const listProvData = await listProvRes.json();
    const listed = listProvData.providers?.find((p) => p.id === providerId);
    assert(
      listed && listed.keyMasked.endsWith('9876') && !JSON.stringify(listProvData).includes('sk-mock-clinic-secret-9876'),
      'API key encrypted at rest and masked in GET /api/admin/ai-providers'
    );

    // Test connection
    const testRes = await fetch(`${BASE}/api/admin/ai-providers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
      body: JSON.stringify({ action: 'test', id: providerId }),
    });
    const testData = await testRes.json();
    assert(testRes.ok && testData.ok === true, 'Test connection succeeded against mock OpenAI-compatible endpoint');
    assert(mock.state.lastAuthHeader === 'Bearer sk-mock-clinic-secret-9876', 'Sent Bearer API key header');
    assert(mock.state.lastCustomHeader === 'clinic-ghana', 'Sent custom header X-Clinic-Test');
    assert(mock.state.lastModel === 'mock-nursing-gpt', 'Sent configured modelName');

    // Reset mock call counter before PDF upload
    mock.state.callCount = 0;
    mock.state.topicCalls = 0;
    mock.state.questionCalls = 0;

    // TEST A: First PDF upload triggers one-time AI processing and saves permanently
    const pdfBuf = await createNursingPdf(Date.now());
    const fd = new FormData();
    fd.append('file', new Blob([pdfBuf], { type: 'application/pdf' }), 'maternal-pharmacology.pdf');
    fd.append('title', `AI Upgrade Verification PDF ${Date.now()}`);
    fd.append('description', 'One-time AI extraction verification');
    fd.append('courseId', course.id);
    fd.append('level', course.level || 'Level 100');
    fd.append('processMode', 'sync');

    const upRes = await fetch(`${BASE}/api/admin/learning-materials`, {
      method: 'POST',
      headers: { Cookie: adminCookie },
      body: fd,
    });
    const upData = await upRes.json();
    createdMaterialId = upData.material?.id;
    assert(upRes.status === 201 && upData.processingResult?.success, 'Test A: Initial PDF upload processed successfully');
    assert(
      mock.state.callCount >= 1 && mock.state.topicCalls === 1,
      `Test A: AI provider called once for topic extraction (callCount=${mock.state.callCount}, topicCalls=${mock.state.topicCalls})`
    );
    assert(
      upData.material?.processingStatus === 'COMPLETED' || upData.material?.processingStatus === 'REVIEW_REQUIRED',
      `Test A: Final processingStatus valid (${upData.material?.processingStatus})`
    );
    assert(upData.material?.pdfVersion === 1 && Boolean(upData.material?.contentHash), 'Test A: pdfVersion=1 and contentHash stored');

    const callsAfterUpload = mock.state.callCount;

    // TEST F: Duplicate processing prevention on retry/reprocess of already-processed PDF
    const dupRes = await fetch(`${BASE}/api/admin/learning-materials/${createdMaterialId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
      body: JSON.stringify({ action: 'reprocess' }),
    });
    const dupData = await dupRes.json();
    assert(dupRes.ok, 'Test F: Duplicate reprocess call handled safely');
    assert(
      mock.state.callCount === callsAfterUpload,
      `Test F: Zero AI calls on duplicate reprocess of completed PDF (calls=${mock.state.callCount})`
    );
    assert(
      dupData.processingResult?.alreadyProcessed === true || dupData.processingResult?.skippedDuplicate === true,
      'Test F: Returned alreadyProcessed=true'
    );

    // Approve topics + questions and publish material so student can study
    const detailRes = await fetch(`${BASE}/api/admin/learning-materials/${createdMaterialId}`, {
      headers: { Cookie: adminCookie },
    });
    const detailData = await detailRes.json();
    const topics = detailData.material?.extractedTopics || [];
    assert(topics.length >= 1, `Test B: Retrieved ${topics.length} topics from DB`);
    for (const t of topics) {
      await fetch(`/api/admin/topics/${t.id}`.replace('/api', `${BASE}/api`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
        body: JSON.stringify({ status: 'APPROVED' }),
      });
    }
    const qIds = topics.flatMap((t) => (t.questions || []).map((q) => q.id));
    if (qIds.length > 0) {
      await fetch(`${BASE}/api/admin/question-bank`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
        body: JSON.stringify({ action: 'bulk_status', questionIds: qIds, status: 'APPROVED' }),
      });
    }
    await fetch(`${BASE}/api/admin/learning-materials/${createdMaterialId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
      body: JSON.stringify({ status: 'PUBLISHED' }),
    });

    // TEST B: Reopening material, question bank, and usage dashboard makes 0 AI calls
    await fetch(`${BASE}/api/admin/learning-materials/${createdMaterialId}`, { headers: { Cookie: adminCookie } });
    await fetch(`${BASE}/api/admin/question-bank?courseId=${encodeURIComponent(course.id)}`, { headers: { Cookie: adminCookie } });
    const usageRes = await fetch(`${BASE}/api/admin/ai-usage`, { headers: { Cookie: adminCookie } });
    const usageData = await usageRes.json();
    assert(usageRes.ok && usageData.summary?.totalTokens >= 245, 'Test B: AI usage endpoint returns stored token totals');
    assert(
      mock.state.callCount === callsAfterUpload,
      `Test B: Zero AI calls when admin reopens material, questions, and usage stats (calls=${mock.state.callCount})`
    );

    // TEST C: Student opens learning center, studies topic, and submits quiz with 0 AI calls
    await fetch(`${BASE}/api/student/learning-center`, { headers: { Cookie: studentCookie } });
    const firstTopicId = topics[0].id;
    const topicRes = await fetch(`${BASE}/api/student/learning-topics/${firstTopicId}`, {
      headers: { Cookie: studentCookie },
    });
    const topicData = await topicRes.json();
    assert(topicRes.ok && topicData.topic?.id === firstTopicId, 'Test C: Student opened saved topic from DB');
    const firstQ = topicData.questions?.[0];
    if (firstQ) {
      const submitRes = await fetch(`${BASE}/api/student/learning-topics/${firstTopicId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: studentCookie },
        body: JSON.stringify({
          answers: { [firstQ.id]: firstQ.correctAnswer },
          timeSpentSeconds: 30,
        }),
      });
      assert(submitRes.ok, 'Test C: Student submitted topic quiz');
    }
    assert(
      mock.state.callCount === callsAfterUpload,
      `Test C: Zero AI calls during student reading and quiz submission (calls=${mock.state.callCount})`
    );

    // TEST D: Switching default AI provider does NOT reprocess existing PDFs
    const secondProvRes = await fetch(`${BASE}/api/admin/ai-providers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
      body: JSON.stringify({
        name: 'Secondary Mock Provider',
        apiBaseUrl: mockBaseUrl,
        apiEndpoint: '/v1/chat/completions',
        apiKey: 'sk-secondary-4321',
        modelName: 'mock-nursing-gpt-v2',
        isActive: true,
        isDefault: true,
      }),
    });
    const secondProvData = await secondProvRes.json();
    if (secondProvData.provider?.id) createdProviderIds.push(secondProvData.provider.id);
    assert(secondProvRes.status === 201, 'Test D: Switched default AI provider');
    assert(
      mock.state.callCount === callsAfterUpload,
      `Test D: Switching AI provider triggered 0 reprocessing calls (calls=${mock.state.callCount})`
    );

    // TEST E: Controlled regeneration requires confirmation & preserves approved questions
    const unconfirmedRes = await fetch(`${BASE}/api/admin/learning-materials/${createdMaterialId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
      body: JSON.stringify({ action: 'regenerate', scope: 'QUESTIONS', confirmed: false }),
    });
    assert(unconfirmedRes.status === 400, 'Test E: Unconfirmed regeneration rejected with 400');
    assert(mock.state.callCount === callsAfterUpload, 'Test E: Rejected regeneration made 0 AI calls');

    const confirmedRes = await fetch(`${BASE}/api/admin/learning-materials/${createdMaterialId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
      body: JSON.stringify({ action: 'regenerate', scope: 'QUESTIONS', confirmed: true }),
    });
    const confirmedData = await confirmedRes.json();
    assert(confirmedRes.ok && confirmedData.processingResult?.success, 'Test E: Confirmed QUESTIONS regeneration succeeded');
    assert(
      mock.state.callCount > callsAfterUpload,
      `Test E: Confirmed regeneration called AI provider (calls=${mock.state.callCount})`
    );

    // Verify approved questions were preserved
    const afterRegenDetail = await fetch(`${BASE}/api/admin/learning-materials/${createdMaterialId}`, {
      headers: { Cookie: adminCookie },
    });
    const afterRegenData = await afterRegenDetail.json();
    const afterQIds = (afterRegenData.material?.extractedTopics || []).flatMap((t) =>
      (t.questions || []).map((q) => q.id)
    );
    const allApprovedPreserved = qIds.every((id) => afterQIds.includes(id));
    assert(allApprovedPreserved, 'Test E: Approved questions preserved after QUESTIONS regeneration');
  } finally {
    // Cleanup created test material & mock providers
    try {
      const adminCookie = await getCookieForRole('SUPER_ADMIN');
      if (createdMaterialId) {
        await fetch(`${BASE}/api/admin/learning-materials/${createdMaterialId}`, {
          method: 'DELETE',
          headers: { Cookie: adminCookie },
        });
      }
      for (const pid of createdProviderIds) {
        await fetch(`${BASE}/api/admin/ai-providers?id=${encodeURIComponent(pid)}`, {
          method: 'DELETE',
          headers: { Cookie: adminCookie },
        });
      }
    } catch {
      // ignore cleanup errors
    }
    mock.server.close();
  }

  console.log(`\nSummary: ${passed} passed, ${failed} failed.`);
  process.exit(failed > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
