const http = require('http');

function testEndpoint(method, path, body = null) {
  return new Promise((resolve) => {
    const postData = body ? JSON.stringify(body) : null;
    const options = {
      hostname: 'localhost',
      port: 3000,
      path,
      method,
      headers: {
        'User-Agent': 'Phase2-Verifier/1.0',
        ...(postData ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(postData) } : {}),
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        resolve({
          path,
          method,
          status: res.statusCode,
          contentType: res.headers['content-type'],
          success: res.statusCode >= 200 && res.statusCode < 400,
          bodySample: data.slice(0, 120),
        });
      });
    });

    req.on('error', (err) => {
      resolve({
        path,
        method,
        status: 0,
        success: false,
        error: err.message,
      });
    });

    if (postData) req.write(postData);
    req.end();
  });
}

async function runPhase2Verification() {
  console.log('--- EXECUTING PHASE 2 END-TO-END VERIFICATION SUITE ---');

  const tests = [
    // 1. Pages
    ['GET', '/'],
    ['GET', '/school'],
    ['GET', '/portal/admin'],
    ['GET', '/portal/lecturer'],
    ['GET', '/portal/lecturer/attendance'],
    ['GET', '/portal/lecturer/grading'],
    ['GET', '/portal/student/dashboard'],
    ['GET', '/portal/student/payments'],
    ['GET', '/portal/student/courses'],
    ['GET', '/portal/student/results'],
    ['GET', '/portal/student/profile'],
    ['GET', '/portal/student/support'],
    ['GET', '/portal/student/receipts/WLS-PAY-GH-9821341'],

    // 2. Admin APIs
    ['GET', '/api/admin/overview'],
    ['GET', '/api/admin/students'],
    ['GET', '/api/admin/admissions'],
    ['GET', '/api/admin/lecturers'],
    ['GET', '/api/admin/academics'],
    ['GET', '/api/admin/finance'],
    ['GET', '/api/admin/examinations'],
    ['GET', '/api/admin/announcements'],
    ['GET', '/api/admin/reports?type=students'],
    ['GET', '/api/admin/reports?type=finance'],
    ['GET', '/api/admin/reports?type=admissions'],

    // 3. Lecturer APIs
    ['GET', '/api/lecturer/courses'],
    ['GET', '/api/lecturer/attendance'],
    ['GET', '/api/lecturer/assignments'],
    ['GET', '/api/lecturer/grading'],

    // 4. Student APIs
    ['GET', '/api/student/dashboard'],
    ['GET', '/api/student/registration'],
    ['GET', '/api/student/results'],
    ['GET', '/api/student/payments'],
    ['GET', '/api/student/attendance'],
    ['GET', '/api/student/tickets'],

    // 5. Paystack Ghana APIs
    ['POST', '/api/payments/paystack/initialize', { amount: 250, email: 'ama@student.welllife.org' }],
    ['POST', '/api/payments/paystack/verify', { reference: 'WLS-PAY-GH-9821341' }],
    ['GET', '/api/payments/receipt/WLS-PAY-GH-9821341'],
  ];

  let passed = 0;
  let failed = 0;

  for (const [method, path, body] of tests) {
    const res = await testEndpoint(method, path, body);
    if (res.success) {
      passed++;
      console.log(`✅ [${res.status}] ${method} ${path}`);
    } else {
      failed++;
      console.error(`❌ [${res.status}] ${method} ${path} -> ${res.bodySample || res.error}`);
    }
  }

  console.log(`\n--- SUMMARY: ${passed} PASSED, ${failed} FAILED (TOTAL: ${tests.length}) ---`);
  if (failed > 0) process.exit(1);
}

runPhase2Verification();

