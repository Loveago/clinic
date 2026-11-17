const BASE = 'http://127.0.0.1:3000';

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

async function run() {
  console.log('--- EXECUTING SCHOOL ADMINISTRATION SYSTEM E2E VERIFICATION ---');

  // 1. UI routes render 200
  for (const path of ['/portal/admin/admissions', '/portal/admin/students', '/portal/admin/finance']) {
    const r = await fetch(`${BASE}${path}`);
    assert(r.status === 200, `GET ${path} returns HTTP 200`, `got ${r.status}`);
  }

  // 2. Admission periods & programmes
  const perListRes = await fetch(`${BASE}/api/admin/admission-periods`);
  const perListData = await perListRes.json();
  assert(perListRes.status === 200 && Array.isArray(perListData.periods), 'GET /api/admin/admission-periods returns periods');
  const progId = perListData.programmes?.[0]?.id;
  assert(Boolean(progId), 'Found seeded programme');

  const uniqueTag = Date.now();
  const createPerRes = await fetch(`${BASE}/api/admin/admission-periods`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: `Test Intake ${uniqueTag}`,
      academicYear: '2026/2027',
      semester: 'First Semester',
      openDate: '2026-01-01',
      closeDate: '2026-12-31',
      applicationFeeGHS: 150,
    }),
  });
  const createPerData = await createPerRes.json();
  assert(createPerRes.status === 201 && createPerData.period?.id, 'Created admission period');
  const periodId = createPerData.period.id;

  // 3. Document upload validation (reject invalid, accept valid PDF)
  const badFd = new FormData();
  badFd.append('file', new Blob(['NOT_A_PDF'], { type: 'application/pdf' }), 'fake.pdf');
  const badUpRes = await fetch(`${BASE}/api/school/upload-document`, { method: 'POST', body: badFd });
  assert(badUpRes.status === 400, 'Invalid document signature rejected with 400');

  const goodFd = new FormData();
  goodFd.append('file', new Blob(['%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF'], { type: 'application/pdf' }), 'wassce.pdf');
  const goodUpRes = await fetch(`${BASE}/api/school/upload-document`, { method: 'POST', body: goodFd });
  const goodUpData = await goodUpRes.json();
  assert(goodUpRes.status === 200 && goodUpData.fileUrl, 'Valid PDF document uploaded');

  // 4. Public application submission + duplicate guard
  const testEmail = `applicant.${uniqueTag}@example.com`;
  const applyPayload = {
    admissionPeriodId: periodId,
    applicantName: 'Kofi Mensah Test',
    applicantEmail: testEmail,
    applicantPhone: '+233 24 555 0199',
    programmeId: progId,
    ghanaPostGps: 'GA-183-8164',
    uploadedDocuments: [{ ...goodUpData, title: 'WASSCE Slip', category: 'ACADEMIC' }],
  };
  const applyRes = await fetch(`${BASE}/api/school/apply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(applyPayload),
  });
  const applyData = await applyRes.json();
  assert(applyRes.status === 200 && applyData.referenceNumber, 'Application submitted with reference number');
  const refNo = applyData.referenceNumber;
  const appId = applyData.application.id;

  const dupApplyRes = await fetch(`${BASE}/api/school/apply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(applyPayload),
  });
  assert(dupApplyRes.status === 409, 'Duplicate application rejected with 409');

  // 5. Public tracker hides private reviewNotes
  await fetch(`${BASE}/api/admin/admissions/${appId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'add_note', reviewNotes: 'SECRET_STAFF_NOTE' }),
  });
  const trackRes = await fetch(`${BASE}/api/school/track?ref=${encodeURIComponent(refNo)}`);
  const trackData = await trackRes.json();
  assert(
    trackRes.status === 200 && trackData.application?.reviewNotes === undefined,
    'Public tracker hides private internal reviewNotes'
  );

  // 6. Request document -> Applicant uploads -> Resumes UNDER_REVIEW
  await fetch(`${BASE}/api/admin/admissions/${appId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'request_documents', requestedDocTitle: 'Ghana Card' }),
  });
  const docResumeRes = await fetch(`${BASE}/api/school/track`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      referenceNumber: refNo,
      action: 'upload_document',
      title: 'Ghana Card',
      ...goodUpData,
    }),
  });
  assert(docResumeRes.status === 200, 'Applicant uploaded requested document & resumed review');

  // 7. Issue Offer -> View Offer Letter -> Accept Offer -> Enrol Student
  const offerRes = await fetch(`${BASE}/api/admin/admissions/${appId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'issue_offer', conditions: 'Verify original WASSCE' }),
  });
  const offerData = await offerRes.json();
  assert(offerRes.status === 200 && offerData.application?.offer?.admissionReference, 'Admission offer issued');

  const offerPageRes = await fetch(`${BASE}/school/offer/${refNo}`);
  assert(offerPageRes.status === 200, 'Printable offer letter page returns HTTP 200');

  const acceptRes = await fetch(`${BASE}/api/school/track`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ referenceNumber: refNo, action: 'accept_offer' }),
  });
  const acceptData = await acceptRes.json();
  assert(acceptRes.status === 200 && acceptData.offer?.status === 'ACCEPTED', 'Applicant accepted admission offer');

  const enrolRes = await fetch(`${BASE}/api/admin/admissions/${appId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'enrol_student', generateInvoice: false }),
  });
  const enrolData = await enrolRes.json();
  assert(enrolRes.status === 200 && enrolData.student?.studentId, 'Accepted applicant converted to Student with unique ID');
  const studentDbId = enrolData.student.id;

  // 8. Student Directory Search & Record Update with Audit Reason
  const dirRes = await fetch(`${BASE}/api/admin/students?search=${encodeURIComponent(enrolData.student.studentId)}&page=1&limit=10`);
  const dirData = await dirRes.json();
  assert(dirRes.status === 200 && dirData.students?.length === 1, 'Student directory search & pagination works');

  const updStRes = await fetch(`${BASE}/api/admin/students/${studentDbId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ level: 'Level 200', reason: 'Direct entry promotion' }),
  });
  assert(updStRes.status === 200, 'Student record updated with audit reason');

  // 9. Fee Structure + Versioning + Bulk/Single Invoicing
  const fsGetRes = await fetch(`${BASE}/api/admin/fee-structures`);
  const fsGetData = await fsGetRes.json();
  const catId = fsGetData.categories?.[0]?.id;

  const fsCreateRes = await fetch(`${BASE}/api/admin/fee-structures`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: `Test Fee Schedule ${uniqueTag}`,
      programmeId: progId,
      level: 'Level 200',
      items: [{ feeCategoryId: catId, title: 'Semester Tuition', amount: 1000 }],
    }),
  });
  const fsCreateData = await fsCreateRes.json();
  assert(fsCreateRes.status === 201 && fsCreateData.structure?.id, 'Created Fee Structure in GHS');
  const structureId = fsCreateData.structure.id;

  const invGenRes = await fetch(`${BASE}/api/admin/finance`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'generate_invoices',
      studentId: studentDbId,
      feeStructureId: structureId,
    }),
  });
  const invGenData = await invGenRes.json();
  assert(invGenRes.status === 201 && invGenData.count === 1, 'Generated invoice from Fee Structure');
  const invoiceId = invGenData.invoices[0].id;

  // Versioning check
  const fsVerRes = await fetch(`${BASE}/api/admin/fee-structures`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: structureId,
      items: [{ feeCategoryId: catId, title: 'Semester Tuition', amount: 1200 }],
    }),
  });
  const fsVerData = await fsVerRes.json();
  assert(fsVerRes.status === 200 && fsVerData.versioned === true && fsVerData.structure?.version === 2, 'Editing used Fee Structure creates v2 without mutating existing invoice');

  // 10. Partial Payment + Overpayment Guard + Idempotent Paystack Verify + Duplicate Webhook
  const overpayRes = await fetch(`${BASE}/api/payments/paystack/initialize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ invoiceId, amount: 5000 }),
  });
  assert(overpayRes.status === 400, 'Overpayment rejected with 400');

  const initPayRes = await fetch(`${BASE}/api/payments/paystack/initialize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ invoiceId, amount: 400 }),
  });
  const initPayData = await initPayRes.json();
  assert(initPayRes.status === 200 && initPayData.reference, 'Initialized partial Paystack payment (GH₵400)');
  const payRef = initPayData.reference;

  const ver1Res = await fetch(`${BASE}/api/payments/paystack/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reference: payRef }),
  });
  const ver1Data = await ver1Res.json();
  assert(ver1Res.status === 200 && ver1Data.status === true, 'Paystack payment verified');

  // Idempotent second verify + duplicate webhook
  const ver2Res = await fetch(`${BASE}/api/payments/paystack/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reference: payRef }),
  });
  const ver2Data = await ver2Res.json();
  assert(ver2Res.status === 200 && ver2Data.alreadyVerified === true, 'Duplicate verify is idempotent (no double credit)');

  await fetch(`${BASE}/api/payments/paystack/webhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event: 'charge.success', data: { reference: payRef, amount: 40000 } }),
  });

  // Confirm invoice balance is exactly 600 (1000 - 400)
  const stCheckRes = await fetch(`${BASE}/api/admin/students/${studentDbId}`);
  const stCheckData = await stCheckRes.json();
  const invAfter = stCheckData.student?.invoices?.find((i) => i.id === invoiceId);
  assert(invAfter && invAfter.amountPaid === 400 && invAfter.balance === 600 && invAfter.status === 'PARTIAL', 'Invoice reflects exact partial payment (GH₵400 paid, GH₵600 balance)');

  // Protect paid invoice from cancellation
  const cancelPaidRes = await fetch(`${BASE}/api/admin/finance`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'cancel_invoice', invoiceId }),
  });
  assert(cancelPaidRes.status === 400, 'Cannot cancel invoice with verified payments');

  // 11. Finance Dashboard & CSV Export
  const finDashRes = await fetch(`${BASE}/api/admin/finance`);
  const finDashData = await finDashRes.json();
  assert(finDashRes.status === 200 && finDashData.stats?.totalCollected >= 400, 'Finance dashboard reflects verified collections');

  const finCsvRes = await fetch(`${BASE}/api/admin/finance?format=csv&report=reconciliation`);
  assert(finCsvRes.status === 200 && (finCsvRes.headers.get('content-type') || '').includes('text/csv'), 'Finance CSV reconciliation report exports cleanly');

  // 12. RBAC enforcement: Student blocked (403) from admin finance & admissions mutations
  const stuLogin = await fetch(`${BASE}/api/auth/demo-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role: 'STUDENT' }),
  });
  const stuCookie = (stuLogin.headers.get('set-cookie') || '').split(';')[0];
  const rbacFinRes = await fetch(`${BASE}/api/admin/finance`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: stuCookie },
    body: JSON.stringify({ action: 'cancel_invoice', invoiceId }),
  });
  assert(rbacFinRes.status === 403, 'RBAC blocks STUDENT (403) from finance mutations');

  console.log(`\n--- SUMMARY: ${passed} PASSED, ${failed} FAILED (TOTAL: ${passed + failed}) ---`);
  process.exit(failed > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

