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

async function api(path, { method = 'GET', body, cookie = '', headers: extraHeaders = {} } = {}) {
  const headers = { ...extraHeaders };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (cookie) headers['Cookie'] = cookie;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined,
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
  if (!res.ok || !res.authCookie) {
    throw new Error(`Demo login failed for ${role}: ${res.status} ${JSON.stringify(res.data)}`);
  }
  return res.authCookie;
}

async function loginWithCredentials(email, password) {
  const res = await api('/api/auth/login', {
    method: 'POST',
    body: { email, password },
  });
  if (!res.ok || !res.authCookie) {
    throw new Error(`Credential login failed for ${email}: ${res.status} ${JSON.stringify(res.data)}`);
  }
  return res.authCookie;
}

async function main() {
  const ts = Date.now();
  const cleanup = {
    userIds: [],
    patientIds: [],
    departmentIds: [],
    serviceIds: [],
    diagnosisIds: [],
    labTestIds: [],
    medicineIds: [],
    appointmentIds: [],
    paymentRefs: [],
  };

  try {
    console.log('\n=== Phase 23: Complete Clinic Management System Verification ===\n');

    // 1. Auth setup & School/Clinic Separation
    const adminCookie = await loginWithDemo('CLINIC_SUPER_ADMIN');
    const schoolAdminCookie = await loginWithDemo('SUPER_ADMIN');
    const studentCookie = await loginWithDemo('STUDENT');
    assert(Boolean(adminCookie && schoolAdminCookie && studentCookie), 'Demo logins succeed for CLINIC_SUPER_ADMIN, SUPER_ADMIN, and STUDENT');

    // Check portal pages
    const clinicPage = await fetch(`${BASE}/portal/clinic`);
    const clinicAdminPage = await fetch(`${BASE}/portal/clinic/admin`);
    const patientPage = await fetch(`${BASE}/portal/patient`);
    const patientPortalApi = await api('/api/clinic/patient-portal', { cookie: studentCookie });
    assert(clinicPage.status === 200, '/portal/clinic returns HTTP 200');
    assert(clinicAdminPage.status === 200, '/portal/clinic/admin returns HTTP 200');
    assert(patientPage.status === 404, 'Removed /portal/patient returns HTTP 404');
    assert(patientPortalApi.status === 404, 'Removed /api/clinic/patient-portal returns HTTP 404');

    // Strict separation checks
    const unauthPatients = await api('/api/clinic/patients', { cookie: studentCookie });
    assert(unauthPatients.status === 403, 'Unauthorized role (STUDENT) blocked from /api/clinic/patients (403)');

    const schoolIntoClinic = await api('/api/clinic/patients', { cookie: schoolAdminCookie });
    assert(schoolIntoClinic.status === 403, 'School Admin (SUPER_ADMIN without clinic profile) blocked from /api/clinic/patients (403)');

    const clinicIntoSchool = await api('/api/admin/school-settings', { cookie: adminCookie });
    assert(clinicIntoSchool.status === 403, 'Clinic Super Admin blocked from /api/admin/school-settings (403)');

    // 2. Create temporary clinic staff (DOCTOR and LAB_TECH)
    const docEmail = `verify.doc.${ts}@clinic.local`;
    const labEmail = `verify.lab.${ts}@clinic.local`;
    const staffPassword = `VerifyPass!${ts}`;

    const docCreate = await api('/api/clinic/catalog', {
      method: 'POST',
      cookie: adminCookie,
      body: {
        entity: 'staff',
        name: `Dr. Verify ${ts}`,
        email: docEmail,
        password: staffPassword,
        clinicRole: 'DOCTOR',
        phone: '+233240001111',
        specialty: 'General Medicine',
      },
    });
    const docUserId = docCreate.data.staff?.user?.id;
    const docStaffId = docCreate.data.staff?.id;
    assert(docCreate.ok && docUserId && docStaffId, 'Create DOCTOR staff account');
    if (docUserId) cleanup.userIds.push(docUserId);

    const labCreate = await api('/api/clinic/catalog', {
      method: 'POST',
      cookie: adminCookie,
      body: {
        entity: 'staff',
        name: `Lab Tech Verify ${ts}`,
        email: labEmail,
        password: staffPassword,
        clinicRole: 'LAB_TECH',
        phone: '+233240002222',
      },
    });
    const labUserId = labCreate.data.staff?.user?.id;
    assert(labCreate.ok && labUserId, 'Create LAB_TECH staff account');
    if (labUserId) cleanup.userIds.push(labUserId);

    const doctorCookie = await loginWithCredentials(docEmail, staffPassword);
    const labTechCookie = await loginWithCredentials(labEmail, staffPassword);
    assert(Boolean(doctorCookie && labTechCookie), 'DOCTOR and LAB_TECH can sign in via /api/auth/login');

    // 3. Create catalog items (Department, Service, Diagnosis, Lab Test, Medicine + Batches)
    const deptRes = await api('/api/clinic/catalog', {
      method: 'POST',
      cookie: adminCookie,
      body: {
        entity: 'department',
        name: `Verify OPD ${ts}`,
        description: 'Verification OPD',
      },
    });
    assert(deptRes.ok && deptRes.data.department?.id, 'Create ClinicDepartment');
    const deptId = deptRes.data.department.id;
    cleanup.departmentIds.push(deptId);

    const svcRes = await api('/api/clinic/catalog', {
      method: 'POST',
      cookie: adminCookie,
      body: {
        entity: 'service',
        title: `Verify Consultation ${ts}`,
        departmentId: deptId,
        feeGHS: 120,
        description: 'OPD consultation',
      },
    });
    assert(svcRes.ok && svcRes.data.service?.id, 'Create ClinicService (GH₵120)');
    const serviceId = svcRes.data.service.id;
    cleanup.serviceIds.push(serviceId);

    const diagRes = await api('/api/clinic/catalog', {
      method: 'POST',
      cookie: adminCookie,
      body: {
        entity: 'diagnosisCatalog',
        code: `V-${String(ts).slice(-5)}`,
        name: `Verify Malaria ${ts}`,
        category: 'Infectious',
      },
    });
    assert(diagRes.ok && diagRes.data.diagnosisCatalog?.id, 'Create DiagnosisCatalog item');
    const diagnosisCode = diagRes.data.diagnosisCatalog.code;
    const diagnosisName = diagRes.data.diagnosisCatalog.name;
    cleanup.diagnosisIds.push(diagRes.data.diagnosisCatalog.id);

    const labTestRes = await api('/api/clinic/lab', {
      method: 'POST',
      cookie: adminCookie,
      body: {
        action: 'create_test',
        code: `FBC-${String(ts).slice(-4)}`,
        name: `Verify FBC ${ts}`,
        category: 'Hematology',
        sampleType: 'Blood',
        referenceRangeText: '4.0 - 11.0 x10^9/L',
        unit: 'x10^9/L',
        priceGHS: 80,
      },
    });
    assert(labTestRes.ok && labTestRes.data.test?.id, 'Create LabTestCatalog item (GH₵80)');
    const labTestId = labTestRes.data.test.id;
    cleanup.labTestIds.push(labTestId);

    const medRes = await api('/api/clinic/pharmacy', {
      method: 'POST',
      cookie: adminCookie,
      body: {
        action: 'create_medicine',
        name: `Verify Artemether ${ts}`,
        genericName: 'Artemether-Lumefantrine',
        category: 'Antimalarial',
        dosageForm: 'Tablet',
        strength: '20/120mg',
        unit: 'pack',
        reorderLevel: 5,
        unitPrice: 45,
      },
    });
    assert(medRes.ok && medRes.data.medicine?.id, 'Create Medicine in pharmacy catalog');
    const medicineId = medRes.data.medicine.id;
    cleanup.medicineIds.push(medicineId);

    // Add valid batch (qty 10)
    const validBatchRes = await api('/api/clinic/pharmacy', {
      method: 'POST',
      cookie: adminCookie,
      body: {
        action: 'receive_batch',
        medicineId,
        batchNumber: `BATCH-OK-${ts}`,
        quantity: 10,
        expiryDate: '2028-12-31',
        supplier: 'Ghana Medical Supplies',
        unitCost: 25,
      },
    });
    assert(validBatchRes.ok && validBatchRes.data.batch?.id, 'Receive valid MedicineBatch (qty 10)');

    // Add an expired-only medicine to test expired batch blocking
    const expMedRes = await api('/api/clinic/pharmacy', {
      method: 'POST',
      cookie: adminCookie,
      body: {
        action: 'create_medicine',
        name: `Expired Med ${ts}`,
        unit: 'tablet',
        unitPrice: 10,
      },
    });
    const expMedicineId = expMedRes.data.medicine.id;
    cleanup.medicineIds.push(expMedicineId);

    const expBatchRes = await api('/api/clinic/pharmacy', {
      method: 'POST',
      cookie: adminCookie,
      body: {
        action: 'receive_batch',
        medicineId: expMedicineId,
        batchNumber: `BATCH-EXP-${ts}`,
        quantity: 5,
        expiryDate: '2020-01-01',
      },
    });
    assert(expBatchRes.ok, 'Create expired batch for edge-case test');

    // 4. Step 1: Register patient (+233 normalization)
    const rawPhone = `024${String(ts).slice(-7)}`;
    const expectedPhone = `+233${rawPhone.slice(1)}`;
    const ptRes = await api('/api/clinic/patients', {
      method: 'POST',
      cookie: adminCookie,
      body: {
        fullName: `Kwame Mensah ${ts}`,
        phone: rawPhone,
        dateOfBirth: '1994-05-12',
        gender: 'Male',
        bloodGroup: 'O+',
        allergies: 'Penicillin',
      },
    });
    assert(
      ptRes.status === 201 && ptRes.data.patient?.phone === expectedPhone && ptRes.data.patient?.patientNumber?.startsWith('WMC-PT-'),
      'Step 1: Register patient with +233 phone normalization and WMC-PT number'
    );
    const patientId = ptRes.data.patient.id;
    cleanup.patientIds.push(patientId);

    // Duplicate patient detection (409)
    const dupPtRes = await api('/api/clinic/patients', {
      method: 'POST',
      cookie: adminCookie,
      body: {
        fullName: `Kwame Mensah ${ts}`,
        phone: rawPhone,
        dateOfBirth: '1994-05-12',
      },
    });
    assert(dupPtRes.status === 409, 'Duplicate patient registration blocked with 409');

    // 5. Step 2: Schedule appointment & conflict detection (409)
    const apptDate = '2026-12-20';
    const apptTime = '10:30';
    const apptRes = await api('/api/clinic/appointments', {
      method: 'POST',
      cookie: adminCookie,
      body: {
        patientId,
        patientName: `Kwame Mensah ${ts}`,
        patientPhone: expectedPhone,
        serviceId,
        departmentId: deptId,
        staffId: docStaffId,
        preferredDate: apptDate,
        preferredTime: apptTime,
        reason: 'Fever and headache',
      },
    });
    assert(apptRes.ok && apptRes.data.appointment?.id, 'Step 2: Schedule appointment', `${apptRes.status} ${JSON.stringify(apptRes.data)}`);
    const appointmentId = apptRes.data.appointment.id;
    cleanup.appointmentIds.push(appointmentId);

    const conflictAppt = await api('/api/clinic/appointments', {
      method: 'POST',
      cookie: adminCookie,
      body: {
        patientName: `Ama Serwaa ${ts}`,
        patientPhone: `+23355${String(ts).slice(-7)}`,
        serviceId,
        staffId: docStaffId,
        preferredDate: apptDate,
        preferredTime: apptTime,
        reason: 'Checkup',
      },
    });
    assert(conflictAppt.status === 409, 'Appointment scheduling conflict detected (409)');

    // Edge case: Cancel a separate appointment
    const cancelApptCreate = await api('/api/clinic/appointments', {
      method: 'POST',
      cookie: adminCookie,
      body: {
        patientName: `Cancel Test ${ts}`,
        patientPhone: `+23320${String(ts).slice(-7)}`,
        preferredDate: '2026-12-21',
        preferredTime: '14:00',
        reason: 'To cancel',
      },
    });
    if (cancelApptCreate.data.appointment?.id) {
      cleanup.appointmentIds.push(cancelApptCreate.data.appointment.id);
      const cancelRes = await api(`/api/clinic/appointments/${cancelApptCreate.data.appointment.id}`, {
        method: 'PATCH',
        cookie: adminCookie,
        body: { status: 'CANCELLED', cancelReason: 'Patient rescheduled' },
      });
      assert(cancelRes.ok && cancelRes.data.appointment?.status === 'CANCELLED', 'Cancelled appointment transitions to CANCELLED');
    }

    // 6. Step 3: Check-in to queue
    const queueRes = await api('/api/clinic/queue', {
      method: 'POST',
      cookie: adminCookie,
      body: {
        patientId,
        appointmentId,
        departmentId: deptId,
        staffId: docStaffId,
        priority: 'URGENT',
      },
    });
    assert(queueRes.status === 201 && queueRes.data.entry?.queueNumber?.startsWith('Q-'), 'Step 3: Check-in to queue with Q-xxx number');
    const queueId = queueRes.data.entry.id;

    // 7. Step 4-6: Start consultation + vitals + BMI + diagnosis
    const consultRes = await api('/api/clinic/consultations', {
      method: 'POST',
      cookie: doctorCookie,
      body: {
        patientId,
        queueId,
        chiefComplaint: 'High fever for 2 days',
        hpi: 'Intermittent chills and headache',
        clinicalNotes: 'Patient alert and oriented',
        treatmentPlan: 'FBC + Antimalarial therapy',
        internalNotes: 'Clinician private observation',
        vitals: {
          temperatureC: 38.6,
          bpSystolic: 120,
          bpDiastolic: 80,
          pulseBpm: 92,
          weightKg: 70,
          heightCm: 175,
        },
        diagnoses: [
          {
            code: diagnosisCode,
            title: diagnosisName,
            isPrimary: true,
            notes: 'Suspected uncomplicated malaria',
          },
        ],
      },
    });
    const vitalsList = Array.isArray(consultRes.data.consultation?.vitals)
      ? consultRes.data.consultation.vitals
      : consultRes.data.consultation?.vitals
      ? [consultRes.data.consultation.vitals]
      : [];
    assert(
      consultRes.status === 201 &&
        consultRes.data.consultation?.id &&
        Math.abs((vitalsList[0]?.bmi || 0) - 22.9) < 0.2 &&
        consultRes.data.consultation.diagnoses?.length === 1,
      'Step 4-6: Create consultation with vitals, arithmetic BMI (~22.9), and diagnosis'
    );
    const consultationId = consultRes.data.consultation.id;

    // 8. Step 7: Issue prescription
    const rxRes = await api('/api/clinic/prescriptions', {
      method: 'POST',
      cookie: doctorCookie,
      body: {
        consultationId,
        patientId,
        notes: 'Take with food',
        items: [
          {
            medicineId,
            medicineName: `Verify Artemether ${ts}`,
            dosage: '4 tablets',
            frequency: 'BD',
            duration: '3 days',
            quantityPrescribed: 2,
          },
        ],
      },
    });
    assert(rxRes.status === 201 && rxRes.data.prescription?.id, 'Step 7: Issue electronic prescription');
    const prescriptionId = rxRes.data.prescription.id;

    // 9. Step 8-11: Request lab test -> enter result -> unauthorized review 403 -> doctor review 200
    const labReqRes = await api('/api/clinic/lab', {
      method: 'POST',
      cookie: doctorCookie,
      body: {
        action: 'create_request',
        patientId,
        consultationId,
        testId: labTestId,
        priority: 'URGENT',
      },
    });
    assert(labReqRes.status === 201 && labReqRes.data.request?.id, 'Step 8: Request laboratory test');
    const labRequestId = labReqRes.data.request.id;

    const labResultRes = await api('/api/clinic/lab', {
      method: 'PATCH',
      cookie: labTechCookie,
      body: {
        id: labRequestId,
        action: 'enter_result',
        resultValue: '6.8',
        unit: 'x10^9/L',
        normalRange: '4.0 - 11.0 x10^9/L',
        isAbnormal: false,
        interpretation: 'Normal white cell count',
      },
    });
    assert(labResultRes.ok && labResultRes.data.request?.status === 'COMPLETED', 'Step 9: Lab Tech enters laboratory result');

    const unauthReview = await api('/api/clinic/lab', {
      method: 'PATCH',
      cookie: labTechCookie,
      body: {
        id: labRequestId,
        action: 'review_result',
        releaseToPatient: true,
      },
    });
    assert(unauthReview.status === 403, 'Step 10: Unauthorized lab review by LAB_TECH blocked (403)');

    const authReview = await api('/api/clinic/lab', {
      method: 'PATCH',
      cookie: doctorCookie,
      body: {
        id: labRequestId,
        action: 'review_result',
        releaseToPatient: true,
      },
    });
    assert(authReview.ok && authReview.data.request?.status === 'REVIEWED', 'Step 11: Authorized DOCTOR reviews and releases lab result');

    // 10. Step 12-14: Generate invoice + partial payment + full payment
    const invRes = await api('/api/clinic/billing', {
      method: 'POST',
      cookie: adminCookie,
      body: {
        patientId,
        consultationId,
        title: `Clinic Visit ${ts}`,
        items: [
          { itemType: 'CONSULTATION', description: 'OPD Consultation', quantity: 1, unitPrice: 120 },
          { itemType: 'LAB_TEST', description: 'Verify FBC', quantity: 1, unitPrice: 80 },
          { itemType: 'MEDICINE', description: 'Verify Artemether', quantity: 2, unitPrice: 45 },
        ],
      },
    });
    assert(
      invRes.status === 201 && invRes.data.invoice?.totalAmount === 290 && invRes.data.invoice?.balance === 290,
      'Step 12: Generate ClinicInvoice (GH₵290.00)'
    );
    const invoiceId = invRes.data.invoice.id;

    const payRef1 = `WMC-CASH-VERIFY-${ts}-1`;
    cleanup.paymentRefs.push(payRef1);
    const partPay = await api('/api/clinic/billing', {
      method: 'PATCH',
      cookie: adminCookie,
      body: {
        action: 'record_payment',
        invoiceId,
        amount: 100,
        method: 'Cash',
        reference: payRef1,
      },
    });
    assert(
      partPay.ok && partPay.data.invoice?.status === 'PARTIALLY_PAID' && partPay.data.invoice?.balance === 190,
      'Step 13: Record partial Cash payment (GH₵100 -> PARTIALLY_PAID, balance GH₵190)'
    );

    const payRef2 = `WMC-MOMO-VERIFY-${ts}-2`;
    cleanup.paymentRefs.push(payRef2);
    const fullPay = await api('/api/clinic/billing', {
      method: 'PATCH',
      cookie: adminCookie,
      body: {
        action: 'record_payment',
        invoiceId,
        amount: 190,
        method: 'Mobile Money',
        reference: payRef2,
      },
    });
    assert(
      fullPay.ok && fullPay.data.invoice?.status === 'PAID' && fullPay.data.invoice?.balance === 0,
      'Step 14: Record remaining MoMo payment (GH₵190 -> PAID, balance GH₵0)'
    );

    // 11. Step 15: FEFO dispense prescription
    const rxItemId = rxRes.data.prescription.items[0].id;
    const dispRes = await api('/api/clinic/pharmacy', {
      method: 'POST',
      cookie: adminCookie,
      body: {
        action: 'dispense',
        prescriptionId,
        items: [{ prescriptionItemId: rxItemId, quantity: 2 }],
      },
    });
    assert(
      dispRes.ok && (dispRes.data.prescription?.status === 'DISPENSED' || dispRes.data.dispensed?.length === 1),
      'Step 15: FEFO atomic prescription dispensing',
      `${dispRes.status} ${JSON.stringify(dispRes.data)}`
    );

    // Edge cases: insufficient stock & expired medicine blocked
    const insuffRes = await api('/api/clinic/pharmacy', {
      method: 'POST',
      cookie: adminCookie,
      body: {
        action: 'dispense',
        prescriptionId,
        items: [{ prescriptionItemId: rxItemId, quantity: 999 }],
      },
    });
    assert(insuffRes.status === 400, 'Insufficient stock dispensing blocked (400)');

    const expRxRes = await api('/api/clinic/prescriptions', {
      method: 'POST',
      cookie: doctorCookie,
      body: {
        consultationId,
        patientId,
        items: [{ medicineId: expMedicineId, medicineName: `Expired Med ${ts}`, quantity: 1 }],
      },
    });
    const expRxItemId = expRxRes.data.prescription.items[0].id;
    const expDispRes = await api('/api/clinic/pharmacy', {
      method: 'POST',
      cookie: adminCookie,
      body: {
        action: 'dispense',
        prescriptionId: expRxRes.data.prescription.id,
        items: [{ prescriptionItemId: expRxItemId, quantity: 1 }],
      },
    });
    assert(expDispRes.status === 400, 'Expired medicine batch dispensing blocked (400)');

    // 12. Step 16: Complete consultation & test amendment protection
    const completeRes = await api('/api/clinic/consultations', {
      method: 'PATCH',
      cookie: doctorCookie,
      body: {
        id: consultationId,
        action: 'complete',
      },
    });
    assert(completeRes.ok && completeRes.data.consultation?.status === 'COMPLETED', 'Step 16: Complete consultation');

    const overwriteBlocked = await api('/api/clinic/consultations', {
      method: 'PATCH',
      cookie: doctorCookie,
      body: {
        id: consultationId,
        clinicalNotes: 'Silent overwrite attempt',
      },
    });
    assert(overwriteBlocked.status === 409, 'Completed consultation silent overwrite blocked (409)');

    const amendRes = await api('/api/clinic/consultations', {
      method: 'PATCH',
      cookie: doctorCookie,
      body: {
        id: consultationId,
        action: 'amend',
        reason: 'Added follow-up instruction',
        followUpNotes: 'Return in 3 days if fever persists',
      },
    });
    assert(amendRes.ok && amendRes.data.consultation?.amendments?.length === 1, 'Authorized consultation amendment creates ConsultationAmendment');

    // Longitudinal patient profile check
    const profileRes = await api(`/api/clinic/patients/${patientId}`, { cookie: doctorCookie });
    assert(
      profileRes.ok &&
        profileRes.data.patient?.consultations?.length >= 1 &&
        profileRes.data.patient?.prescriptions?.length >= 1 &&
        profileRes.data.patient?.labRequests?.length >= 1 &&
        profileRes.data.patient?.invoices?.length >= 1,
      'Longitudinal patient profile returns complete visit records'
    );

    // 13. Paystack failed verification & duplicate webhook idempotency
    const psInvRes = await api('/api/clinic/billing', {
      method: 'POST',
      cookie: adminCookie,
      body: {
        patientId,
        title: `Paystack Clinic Test ${ts}`,
        items: [{ itemType: 'SERVICE', description: 'Dressing', quantity: 1, unitPrice: 50 }],
      },
    });
    const psInvoiceId = psInvRes.data.invoice.id;

    const failedVerify = await api('/api/payments/paystack/verify', {
      method: 'POST',
      cookie: adminCookie,
      body: {
        clinicInvoiceId: psInvoiceId,
      },
    });
    assert(
      failedVerify.status === 400,
      'Paystack verification without reference rejected (400)',
      `${failedVerify.status} ${JSON.stringify(failedVerify.data)}`
    );

    const invalidInit = await api('/api/payments/paystack/initialize', {
      method: 'POST',
      cookie: adminCookie,
      body: {
        clinicInvoiceId: 'non-existent-clinic-invoice-id',
        amount: 50,
      },
    });
    assert(
      invalidInit.status >= 400,
      'Paystack initialization for non-existent clinic invoice rejected (4xx)',
      `${invalidInit.status} ${JSON.stringify(invalidInit.data)}`
    );

    // EMR, Triage, Config, and Referral checks
    const cfgRes = await api('/api/clinic/config', { cookie: adminCookie });
    assert(cfgRes.ok && Boolean(cfgRes.data.config?.clinicName), 'ClinicConfiguration GET returns clinic settings');

    const allergyRes = await api('/api/clinic/emr', {
      method: 'POST',
      cookie: doctorCookie,
      body: { action: 'add_allergy', patientId, substance: 'Penicillin', category: 'MEDICATION', reaction: 'Rash', severity: 'SEVERE' },
    });
    assert(allergyRes.ok, 'EMR: Record structured patient allergy');

    const triageRes = await api('/api/clinic/triage', {
      method: 'POST',
      cookie: adminCookie,
      body: { action: 'record_triage', patientId, triageCategory: 'URGENT', chiefComplaint: 'High fever', bpSystolic: 120, bpDiastolic: 80, temperatureC: 38.6, weightKg: 70, heightCm: 175 },
    });
    assert(triageRes.ok && triageRes.data.triage?.bmi === 22.9, 'Triage: Record triage assessment with BMI calculation');

    const emrFull = await api(`/api/clinic/emr?patientId=${patientId}`, { cookie: doctorCookie });
    assert(
      emrFull.ok &&
        emrFull.data.patient?.allergyRecords?.length >= 1 &&
        emrFull.data.patient?.triageRecords?.length >= 1 &&
        emrFull.data.timeline?.length >= 3,
      'EMR: Longitudinal workspace returns allergies, triage, and chronological timeline'
    );

    const refRes = await api('/api/clinic/referrals', {
      method: 'POST',
      cookie: doctorCookie,
      body: { patientId, direction: 'INTERNAL', receivingDepartment: 'Laboratory', reason: 'Follow-up review' },
    });
    assert(refRes.ok && Boolean(refRes.data.referral?.referralNumber), 'Referral: Create internal referral');

    // Webhook idempotency test (when PAYSTACK_SECRET_KEY is configured)
    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (secret) {
      const whRef = `WMC-WH-VERIFY-${ts}`;
      cleanup.paymentRefs.push(whRef);
      await prisma.payment.create({
        data: {
          reference: whRef,
          clinicInvoiceId: psInvoiceId,
          patientId,
          title: `Paystack Clinic Test ${ts}`,
          amount: 50,
          currency: 'GHS',
          method: 'Paystack',
          channel: 'paystack',
          status: 'PENDING',
        },
      });
      const payload = JSON.stringify({
        event: 'charge.success',
        data: { reference: whRef, amount: 5000, status: 'success', channel: 'card' },
      });
      const sig = crypto.createHmac('sha512', secret).update(payload).digest('hex');

      const wh1 = await api('/api/payments/paystack/webhook', {
        method: 'POST',
        body: payload,
        headers: { 'x-paystack-signature': sig },
      });
      const wh2 = await api('/api/payments/paystack/webhook', {
        method: 'POST',
        body: payload,
        headers: { 'x-paystack-signature': sig },
      });
      const updatedPsInv = await prisma.clinicInvoice.findUnique({ where: { id: psInvoiceId } });
      assert(
        wh1.ok && wh2.ok && updatedPsInv?.paidAmount === 50 && updatedPsInv?.status === 'PAID',
        'Paystack duplicate webhook idempotent (credited once, GH₵50 -> PAID)'
      );
    } else {
      console.log('ℹ️ [INFO] PAYSTACK_SECRET_KEY not set in env; skipping signed webhook test');
    }

    console.log(`\nSummary: ${passed} passed, ${failed} failed\n`);
    if (failed > 0) process.exitCode = 1;
  } finally {
    // Cleanup temporary test data
    try {
      if (cleanup.paymentRefs.length > 0) {
        await prisma.payment.deleteMany({ where: { reference: { in: cleanup.paymentRefs } } });
      }
      if (cleanup.appointmentIds.length > 0) {
        await prisma.clinicQueue.deleteMany({ where: { appointmentId: { in: cleanup.appointmentIds } } });
        await prisma.appointment.deleteMany({ where: { id: { in: cleanup.appointmentIds } } });
      }
      if (cleanup.patientIds.length > 0) {
        await prisma.clinicInvoice.deleteMany({ where: { patientId: { in: cleanup.patientIds } } });
        await prisma.labRequest.deleteMany({ where: { patientId: { in: cleanup.patientIds } } });
        await prisma.prescription.deleteMany({ where: { patientId: { in: cleanup.patientIds } } });
        await prisma.consultation.deleteMany({ where: { patientId: { in: cleanup.patientIds } } });
        await prisma.clinicQueue.deleteMany({ where: { patientId: { in: cleanup.patientIds } } });
        await prisma.patient.deleteMany({ where: { id: { in: cleanup.patientIds } } });
      }
      if (cleanup.medicineIds.length > 0) {
        await prisma.stockMovement.deleteMany({ where: { medicineId: { in: cleanup.medicineIds } } });
        await prisma.medicineBatch.deleteMany({ where: { medicineId: { in: cleanup.medicineIds } } });
        await prisma.medicine.deleteMany({ where: { id: { in: cleanup.medicineIds } } });
      }
      if (cleanup.labTestIds.length > 0) {
        await prisma.labTestCatalog.deleteMany({ where: { id: { in: cleanup.labTestIds } } });
      }
      if (cleanup.diagnosisIds.length > 0) {
        await prisma.diagnosisCatalog.deleteMany({ where: { id: { in: cleanup.diagnosisIds } } });
      }
      if (cleanup.serviceIds.length > 0) {
        await prisma.clinicService.deleteMany({ where: { id: { in: cleanup.serviceIds } } });
      }
      if (cleanup.departmentIds.length > 0) {
        await prisma.clinicDepartment.deleteMany({ where: { id: { in: cleanup.departmentIds } } });
      }
      if (cleanup.userIds.length > 0) {
        await prisma.clinicStaffProfile.deleteMany({ where: { userId: { in: cleanup.userIds } } });
        await prisma.user.deleteMany({ where: { id: { in: cleanup.userIds } } });
      }
      await prisma.auditLog.deleteMany({
        where: { entityType: { in: ['Patient', 'Consultation', 'LabResult', 'ClinicInvoice', 'Prescription'] }, createdAt: { gte: new Date(ts - 60000) } },
      });
    } catch (cleanupErr) {
      console.error('Cleanup warning:', cleanupErr.message);
    }
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error('Fatal verification error:', err);
  process.exit(1);
});
