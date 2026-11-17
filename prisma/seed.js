const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Action Boat Medical Centre / Homeopathy & Action Health College (Ghana)...');

  const passwordHash = await bcrypt.hash('password123', 10);
  const adminHash = await bcrypt.hash('admin123', 10);

  // Clean up in reverse relation order
  console.log('Cleaning up existing records...');
  await prisma.paystackWebhookLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.continuousAssessment.deleteMany();
  await prisma.attendanceRecord.deleteMany();
  await prisma.attendanceSession.deleteMany();
  await prisma.assignmentSubmission.deleteMany();
  await prisma.assignment.deleteMany();
  await prisma.studentDocument.deleteMany();
  await prisma.classSchedule.deleteMany();
  await prisma.courseRegistration.deleteMany();
  await prisma.examAttempt.deleteMany();
  await prisma.question.deleteMany();
  await prisma.examination.deleteMany();
  await prisma.topicAssessmentQuestion.deleteMany();
  await prisma.topicAssessmentAttempt.deleteMany();
  await prisma.topicAssessment.deleteMany();
  await prisma.topicQuestion.deleteMany();
  await prisma.topicSubtopic.deleteMany();
  await prisma.extractedTopic.deleteMany();
  await prisma.pDFProcessingJob.deleteMany();
  await prisma.learningMaterial.deleteMany();
  await prisma.topicProgress.deleteMany();
  await prisma.courseTopic.deleteMany();
  await prisma.courseModule.deleteMany();
  await prisma.courseEnrollment.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.studentFee.deleteMany();
  await prisma.supportTicket.deleteMany();
  await prisma.application.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.medicalStaff.deleteMany();
  await prisma.clinicDepartment.deleteMany();
  await prisma.clinicService.deleteMany();
  await prisma.announcement.deleteMany();
  await prisma.course.deleteMany();
  await prisma.student.deleteMany();
  await prisma.user.deleteMany();
  await prisma.semester.deleteMany();
  await prisma.academicYear.deleteMany();
  await prisma.programme.deleteMany();
  await prisma.department.deleteMany();

  // 1. Departments
  console.log('Creating Academic Departments...');
  const deptNursing = await prisma.department.create({
    data: {
      code: 'CGV',
      name: 'Department of Caregiving & Allied Health',
      description: 'Practical, career-focused caregiving, home health, and clinical support training at Action Health College.',
    },
  });

  const deptMidwifery = await prisma.department.create({
    data: {
      code: 'NAS',
      name: 'Department of Nursing Assistant & Clinical Studies',
      description: 'Bedside nursing assistantship, vital signs monitoring, and clinical ward support training.',
    },
  });

  const deptPublicHealth = await prisma.department.create({
    data: {
      code: 'PUB',
      name: 'Department of Public Health, First Aid & Safety',
      description: 'Preventive healthcare, first aid, basic emergency care, and occupational health & safety management.',
    },
  });

  // 2. Academic Years & Semesters
  console.log('Creating Academic Years & Semesters...');
  const acadYearCurrent = await prisma.academicYear.create({
    data: {
      name: '2025/2026',
      startDate: '2025-09-01',
      endDate: '2026-07-31',
      isCurrent: true,
    },
  });

  const sem1 = await prisma.semester.create({
    data: {
      name: 'First Semester',
      startDate: '2025-09-01',
      endDate: '2026-01-31',
      isCurrent: true,
      academicYearId: acadYearCurrent.id,
    },
  });

  const sem2 = await prisma.semester.create({
    data: {
      name: 'Second Semester',
      startDate: '2026-02-15',
      endDate: '2026-07-15',
      isCurrent: false,
      academicYearId: acadYearCurrent.id,
    },
  });

  // 3. Programmes (Ghana Cedi values)
  console.log('Creating Programmes...');
  const prog1 = await prisma.programme.create({
    data: {
      code: 'DCG',
      name: 'Diploma in Care Giving',
      description: 'Comprehensive 11-module caregiving programme (Regular Mon–Thu 8AM–1PM, Weekends Sat–Sun 8AM–2PM, Sandwich & Online Mon–Thu 7PM–9PM) at Action Boat Medical Centre / Homeopathy, Tema Michel Camp.',
      duration: '3 Months / 6 Months / 1 Year',
      qualification: 'Diploma in Care Giving (Action Health College)',
      fee: 4000.00, // GH₵4,000.00 (Initial payment GH₵2,000 half installment plan)
      requirements: 'WASSCE or any equivalent Certificate.',
      status: 'Active',
      departmentId: deptNursing.id,
    },
  });

  const prog2 = await prisma.programme.create({
    data: {
      code: 'NAS',
      name: 'Professional Diploma in Nursing Assistant Studies',
      description: 'Practical clinical support training, vital signs monitoring, basic nursing procedures, pharmacology, and ward rotations.',
      duration: '1 Year',
      qualification: 'Professional Diploma in Nursing Assistant Studies',
      fee: 4500.00, // GH₵4,500.00
      requirements: 'WASSCE/SSSCE or equivalent qualification.',
      status: 'Active',
      departmentId: deptMidwifery.id,
    },
  });

  const prog3 = await prisma.programme.create({
    data: {
      code: 'PHE',
      name: 'Public Health, First Aid & Basic Emergency Care',
      description: 'Intensive training in workplace & community first aid, CPR, emergency response, and public health & safety management.',
      duration: '3 - 6 Months',
      qualification: 'Certificate / Diploma in First Aid & Public Health',
      fee: 2500.00, // GH₵2,500.00
      requirements: 'WASSCE/SSSCE, healthcare workers, or working professionals.',
      status: 'Active',
      departmentId: deptPublicHealth.id,
    },
  });

  // 4. Users (Ghana profiles)
  console.log('Creating Users...');
  const superAdmin = await prisma.user.create({
    data: {
      email: 'admin@welllife.org',
      passwordHash: adminHash,
      name: 'Dr. Kwame Mensah',
      role: 'SUPER_ADMIN',
      phone: '+233 24 412 3456',
      staffId: 'WLS-ADM-001',
      department: 'Executive Management',
      avatar: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=300&auto=format&fit=crop&q=80',
    },
  });

  const academicAdmin = await prisma.user.create({
    data: {
      email: 'academic@welllife.org',
      passwordHash: adminHash,
      name: 'Mrs. Akosua Serwaa',
      role: 'SCHOOL_ADMIN',
      phone: '+233 20 523 4567',
      staffId: 'WLS-ADM-002',
      department: 'Academic Affairs',
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300&auto=format&fit=crop&q=80',
    },
  });

  const lecturer1 = await prisma.user.create({
    data: {
      email: 'dr.abena@welllife.org',
      passwordHash,
      name: 'Dr. Abena Osei',
      role: 'LECTURER',
      phone: '+233 24 567 8901',
      staffId: 'WLS-LEC-001',
      department: 'General Nursing',
      avatar: 'https://images.unsplash.com/photo-1594824813684-181156291a18?w=300&auto=format&fit=crop&q=80',
    },
  });

  const lecturer2 = await prisma.user.create({
    data: {
      email: 'e.appiah@welllife.org',
      passwordHash,
      name: 'Mr. Emmanuel Appiah',
      role: 'LECTURER',
      phone: '+233 20 678 9012',
      staffId: 'WLS-LEC-002',
      department: 'General Nursing',
      avatar: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=300&auto=format&fit=crop&q=80',
    },
  });

  // Student Users
  const studentUser1 = await prisma.user.create({
    data: {
      email: 'ama@student.welllife.org',
      passwordHash,
      name: 'Ama Serwaa Mensah',
      role: 'STUDENT',
      phone: '+233 24 890 1234',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
    },
  });

  const studentUser2 = await prisma.user.create({
    data: {
      email: 'kwabena@student.welllife.org',
      passwordHash,
      name: 'Kwabena Asante',
      role: 'STUDENT',
      phone: '+233 20 901 2345',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80',
    },
  });

  // 5. Students Profiles
  console.log('Creating Student Profiles...');
  const student1 = await prisma.student.create({
    data: {
      studentId: 'WNS/GH/2025/001',
      userId: studentUser1.id,
      programmeId: prog1.id,
      level: 'Level 100',
      intake: '2025 September Cohort',
      academicYear: '2025/2026',
      currentSemester: 'First Semester',
      status: 'ACTIVE',
      cgpa: 3.85,
      emergencyPhone: '+233 24 333 4455',
      emergencyContact: 'Nana Kofi Mensah (Father)',
    },
  });

  const student2 = await prisma.student.create({
    data: {
      studentId: 'WNS/GH/2025/002',
      userId: studentUser2.id,
      programmeId: prog2.id,
      level: 'Level 200',
      intake: '2025 September Cohort',
      academicYear: '2025/2026',
      currentSemester: 'First Semester',
      status: 'ACTIVE',
      cgpa: 3.65,
      emergencyPhone: '+233 20 444 5566',
      emergencyContact: 'Abena Asante (Mother)',
    },
  });

  // 6. Courses (Diploma in Care Giving - All 11 Modules)
  console.log('Creating Courses & 11 Caregiving Modules...');
  const course1 = await prisma.course.create({
    data: {
      code: 'CGV 101',
      title: 'Foundations of Caregiving, Anatomy, Ethics & Communication',
      description: 'Covers Modules 1–4: Introduction to Caregiving, Human Anatomy & Physiology (with Pathology), Caregiving Ethics, Cultural Competence & Law, and Care Coordination & Communication.',
      creditHours: 4,
      level: 'Level 100',
      semester: 'First Semester',
      semesterId: sem1.id,
      programmeId: prog1.id,
      departmentId: deptNursing.id,
      lecturerId: lecturer1.id,
      isElective: false,
    },
  });

  const course2 = await prisma.course.create({
    data: {
      code: 'CGV 102',
      title: 'Pharmacology, Chronic Care, Nutrition & Mental Health',
      description: 'Covers Modules 5–8: Basic Pharmacology & ADME Medication Management, Chronic Disease & Palliative Care, Clinical Nutrition & Hydration, and Mental Health & Well-Being.',
      creditHours: 4,
      level: 'Level 100',
      semester: 'First Semester',
      semesterId: sem1.id,
      programmeId: prog1.id,
      departmentId: deptNursing.id,
      lecturerId: lecturer2.id,
      isElective: false,
    },
  });

  const course3 = await prisma.course.create({
    data: {
      code: 'CGV 103',
      title: 'Activities of Daily Living, Self-Care & Infection Control',
      description: 'Covers Modules 9–11: ADLs & Basic Nursing Procedures, Health Promotion & Disease Prevention, Caregiver Self-Care & Collaboration, and Safety & Infection Control.',
      creditHours: 4,
      level: 'Level 100',
      semester: 'First Semester',
      semesterId: sem1.id,
      programmeId: prog1.id,
      departmentId: deptNursing.id,
      lecturerId: lecturer1.id,
      isElective: false,
    },
  });

  const moduleDefinitions = [
    {
      courseId: course1.id,
      orderIndex: 1,
      title: 'Module 1: Introduction & Foundations of Caregiving',
      pdfFile: 'module-01-introduction-to-caregiving.pdf',
      topics: [
        { title: 'Definition, Types & Core Roles of a Caregiver', description: 'Physical, emotional, and health monitoring duties in professional vs. family caregiving.', durationMinutes: 45 },
        { title: 'Professionalism, Attitude & Compassionate Care', description: 'Core values and ethical standards in Action Health College clinical practice.', durationMinutes: 40 },
      ],
    },
    {
      courseId: course1.id,
      orderIndex: 2,
      title: 'Module 2: Human Anatomy, Physiology & Pathology',
      pdfFile: 'module-02-human-anatomy-and-physiology.pdf',
      topics: [
        { title: 'Anatomical Directional Terms & Body Orientation', description: 'Midline, medial/lateral, proximal/distal, superior/inferior, and anterior/posterior terminology.', durationMinutes: 45 },
        { title: 'Major Body Systems Overview & Basic Pathology', description: 'Structure and function of body systems plus how pathology identifies disease causes and effects.', durationMinutes: 55 },
      ],
    },
    {
      courseId: course1.id,
      orderIndex: 3,
      title: 'Module 3: Caregiving Ethics, Cultural Competence & Law',
      pdfFile: 'module-03-ethics-cultural-competence-and-law.pdf',
      topics: [
        { title: 'Ethical Principles, Patient Rights & Informed Consent', description: 'Autonomy, non-maleficence, beneficence, justice, veracity, fidelity, and confidentiality.', durationMinutes: 50 },
        { title: 'Cultural Competence & Healthcare Management Law', description: 'Respecting cultural diversity, legal boundaries, and resolving clinical ethical dilemmas.', durationMinutes: 45 },
      ],
    },
    {
      courseId: course1.id,
      orderIndex: 4,
      title: 'Module 4: Care Coordination & Communication Skills',
      pdfFile: 'module-04-care-coordination-and-communication.pdf',
      topics: [
        { title: 'Active Listening, Verbal & Non-Verbal Communication', description: 'Building patient trust, empathy, and clear clinical documentation.', durationMinutes: 45 },
        { title: 'Multidisciplinary Care Coordination & Teamwork', description: 'Coordinating with physicians, nurses, and families to ensure seamless continuity of care.', durationMinutes: 45 },
      ],
    },
    {
      courseId: course2.id,
      orderIndex: 1,
      title: 'Module 5: Basic Pharmacology & Medication Management',
      pdfFile: 'module-05-pharmacology-and-medication-management.pdf',
      topics: [
        { title: 'Pharmacokinetics: Absorption, Distribution, Metabolism & Excretion (ADME)', description: 'Understanding how oral and IV medications move through the GI tract, blood, liver, and kidneys.', durationMinutes: 50 },
        { title: 'Drug Classifications & Safe Administration Protocols', description: 'Analgesics, antibiotics, antihypertensives, diuretics, and the Rights of Medication Administration.', durationMinutes: 50 },
      ],
    },
    {
      courseId: course2.id,
      orderIndex: 2,
      title: 'Module 6: Chronic Disease Management, Palliative & End-of-Life Care',
      pdfFile: 'module-06-chronic-disease-and-palliative-care.pdf',
      topics: [
        { title: 'Supporting Clients with Chronic Conditions', description: 'Diabetes, hypertension, arthritis, COPD, and heart disease adherence support.', durationMinutes: 45 },
        { title: 'Palliative Comfort & Dignified End-of-Life Care', description: 'Pain/symptom relief, emotional comfort, and family support with dignity.', durationMinutes: 50 },
      ],
    },
    {
      courseId: course2.id,
      orderIndex: 3,
      title: 'Module 7: Nutrition & Hydration in Clinical Care',
      pdfFile: 'module-07-nutrition-and-hydration.pdf',
      topics: [
        { title: 'Macronutrients, Micronutrients & Hydration Balance', description: 'Preventing deficiency diseases and maintaining energy, immunity, and healing.', durationMinutes: 45 },
        { title: 'Special Therapeutic Diets & Feeding Assistance', description: 'Diabetic, low-sodium, dysphagia, and culturally appropriate meal planning.', durationMinutes: 45 },
      ],
    },
    {
      courseId: course2.id,
      orderIndex: 4,
      title: 'Module 8: Mental Health, Psychosocial Support & Well-Being',
      pdfFile: 'module-08-mental-health-and-wellbeing.pdf',
      topics: [
        { title: 'The Mental Health Continuum & Common Disorders', description: 'Recognizing anxiety, depression, bipolar disorder, PTSD, schizophrenia, and SUDs.', durationMinutes: 50 },
        { title: 'Causes of Mental Health Conditions & Holistic Wellness', description: 'Biological, genetic, environmental, and psychological factors plus the 8-dimension Wellness Wheel.', durationMinutes: 45 },
      ],
    },
    {
      courseId: course3.id,
      orderIndex: 1,
      title: 'Module 9: Activities of Daily Living, Basic Nursing & Health Promotion',
      pdfFile: 'module-09-adls-nursing-procedures-and-health-promotion.pdf',
      topics: [
        { title: 'Assisting with ADLs & Basic Nursing Procedures', description: 'Bathing, dressing, feeding, mobility, vital signs measurement, and bed-making.', durationMinutes: 55 },
        { title: 'Health Promotion & Disease Prevention Strategies', description: 'Educating clients on preventive screening, immunizations, and healthy lifestyle habits.', durationMinutes: 45 },
      ],
    },
    {
      courseId: course3.id,
      orderIndex: 2,
      title: 'Module 10: Caregiver Self-Care & Healthcare Collaboration',
      pdfFile: 'module-10-caregiver-self-care-and-collaboration.pdf',
      topics: [
        { title: 'Burnout Prevention & the Individual Wellness Wheel', description: 'Balancing physical, emotional, social, spiritual, occupational, and financial wellness.', durationMinutes: 45 },
        { title: 'Effective Interprofessional Collaboration', description: 'Working harmoniously within hospital, homeopathic, and home-care teams.', durationMinutes: 40 },
      ],
    },
    {
      courseId: course3.id,
      orderIndex: 3,
      title: 'Module 11: Safety & Infection Prevention and Control (IPC)',
      pdfFile: 'module-11-safety-and-infection-control.pdf',
      topics: [
        { title: 'Patient Safety, Body Mechanics & Fall Prevention', description: 'Safe lifting, assistive devices, clear walkways, and hazard prevention.', durationMinutes: 45 },
        { title: 'Standard Precautions, Hand Hygiene & Waste Segregation', description: 'PPE usage, sterilization, sharps safety, and infection control protocols.', durationMinutes: 50 },
      ],
    },
  ];

  const fs = require('fs');
  const path = require('path');

  for (const modDef of moduleDefinitions) {
    const mod = await prisma.courseModule.create({
      data: {
        courseId: modDef.courseId,
        title: modDef.title,
        orderIndex: modDef.orderIndex,
      },
    });

    const pdfRelPath = path.join('storage', 'pdfs', modDef.pdfFile);
    const pdfAbsPath = path.join(process.cwd(), pdfRelPath);
    const sizeBytes = fs.existsSync(pdfAbsPath) ? fs.statSync(pdfAbsPath).size : 1500000;
    const sizeLabel = `${Math.round(sizeBytes / 1024)} KB`;

    const material = await prisma.learningMaterial.create({
      data: {
        courseId: modDef.courseId,
        title: modDef.title,
        description: `Official Action Health College study module PDF for ${modDef.title}.`,
        programmeId: prog1.id,
        academicYear: '2025/2026',
        semester: 'First Semester',
        level: 'Level 100',
        category: 'Lecture Notes & Visual Guide',
        fileType: 'PDF',
        fileName: modDef.pdfFile,
        fileUrl: `/api/admin/learning-materials/placeholder/pdf`,
        filePath: pdfRelPath,
        fileSize: sizeLabel,
        pageCount: 6,
        processingStatus: 'COMPLETED',
        status: 'PUBLISHED',
        isDownloadable: true,
        uploadedById: lecturer1.id,
      },
    });

    await prisma.learningMaterial.update({
      where: { id: material.id },
      data: { fileUrl: `/api/admin/learning-materials/${material.id}/pdf` },
    });

    for (let tIdx = 0; tIdx < modDef.topics.length; tIdx++) {
      const t = modDef.topics[tIdx];
      await prisma.courseTopic.create({
        data: {
          moduleId: mod.id,
          title: t.title,
          description: t.description,
          pdfUrl: `/api/admin/learning-materials/${material.id}/pdf`,
          durationMinutes: t.durationMinutes,
          orderIndex: tIdx + 1,
        },
      });
    }
  }

  // 7. Course Registrations & Enrollments
  console.log('Registering Students for Courses...');
  for (const c of [course1, course2, course3]) {
    await prisma.courseRegistration.create({
      data: {
        studentId: student1.id,
        courseId: c.id,
        semesterId: sem1.id,
        status: 'APPROVED',
      },
    });

    await prisma.courseEnrollment.create({
      data: {
        studentId: student1.id,
        courseId: c.id,
        progressPercent: c.code === 'CGV 101' ? 75 : 50,
        status: 'ENROLLED',
      },
    });
  }

  // 8. Timetable / Class Schedules
  console.log('Creating Class Schedules...');
  await prisma.classSchedule.createMany({
    data: [
      {
        courseId: course1.id,
        lecturerId: lecturer1.id,
        dayOfWeek: 'Monday',
        startTime: '09:00 AM',
        endTime: '11:00 AM',
        venue: 'Lecture Hall A',
        room: 'LH-101',
      },
      {
        courseId: course1.id,
        lecturerId: lecturer1.id,
        dayOfWeek: 'Wednesday',
        startTime: '09:00 AM',
        endTime: '11:00 AM',
        venue: 'Lecture Hall A',
        room: 'LH-101',
      },
      {
        courseId: course2.id,
        lecturerId: lecturer2.id,
        dayOfWeek: 'Tuesday',
        startTime: '10:00 AM',
        endTime: '12:00 PM',
        venue: 'Simulation Skills Lab 2',
        room: 'SIM-02',
      },
      {
        courseId: course2.id,
        lecturerId: lecturer2.id,
        dayOfWeek: 'Thursday',
        startTime: '10:00 AM',
        endTime: '12:00 PM',
        venue: 'Simulation Skills Lab 2',
        room: 'SIM-02',
      },
      {
        courseId: course3.id,
        lecturerId: lecturer1.id,
        dayOfWeek: 'Friday',
        startTime: '08:00 AM',
        endTime: '11:00 AM',
        venue: 'Lecture Hall B',
        room: 'LH-102',
      },
    ],
  });

  // 9. Assignments & Submissions
  console.log('Creating Assignments and Submissions...');
  const asg1 = await prisma.assignment.create({
    data: {
      title: 'Clinical Case Study: Cardiovascular Assessment',
      description: 'Analyze the provided patient scenario presenting with acute hypertensive urgency. Detail the triage protocol, vital signs tracking frequency, and initial nursing interventions.',
      courseId: course1.id,
      lecturerId: lecturer1.id,
      maxMarks: 100,
      weighting: 15,
      deadline: '2025-11-20',
    },
  });

  const asg2 = await prisma.assignment.create({
    data: {
      title: 'Infection Control Protocol in Ghanaian Ward Settings',
      description: 'Prepare a reflective report detailing universal precautions, hand hygiene compliance audits, and disposal of clinical sharps in accordance with Ghana Health Service guidelines.',
      courseId: course2.id,
      lecturerId: lecturer2.id,
      maxMarks: 100,
      weighting: 15,
      deadline: '2025-10-25',
    },
  });

  await prisma.assignmentSubmission.create({
    data: {
      assignmentId: asg2.id,
      studentId: student1.id,
      fileUrl: '/uploads/assignments/ama_mensah_infection_report.pdf',
      notes: 'Please find attached my comprehensive report on infection prevention standards implemented at the Ridge Regional Hospital clinical rotation.',
      score: 92.5,
      feedback: 'Excellent grasp of Ghana Health Service infection prevention standards. Good inclusion of waste segregation bins color-coding.',
      isGraded: true,
      isLate: false,
    },
  });

  // 10. Attendance Sessions & Records
  console.log('Creating Attendance Sessions & Records...');
  const attSession1 = await prisma.attendanceSession.create({
    data: {
      courseId: course1.id,
      lecturerId: lecturer1.id,
      date: '2025-10-06',
      title: 'Cardiovascular Anatomy and Blood Flow Dynamics',
      sessionType: 'Lecture',
    },
  });

  await prisma.attendanceRecord.create({
    data: {
      sessionId: attSession1.id,
      studentId: student1.id,
      status: 'PRESENT',
      notes: 'Active participation in blood pressure practical session',
    },
  });

  const attSession2 = await prisma.attendanceSession.create({
    data: {
      courseId: course2.id,
      lecturerId: lecturer2.id,
      date: '2025-10-07',
      title: 'Sterilization & Hand Hygiene Practical Demo',
      sessionType: 'Lab',
    },
  });

  await prisma.attendanceRecord.create({
    data: {
      sessionId: attSession2.id,
      studentId: student1.id,
      status: 'PRESENT',
      notes: 'Demonstrated surgical scrub technique correctly',
    },
  });

  // 11. Continuous Assessment & Examination Results
  console.log('Creating Continuous Assessments and Exam Results...');
  await prisma.continuousAssessment.create({
    data: {
      studentId: student1.id,
      courseId: course1.id,
      caScore: 36.5,
      examScore: 56.0,
      totalScore: 92.5,
      grade: 'A',
      gpaPoint: 4.0,
      isApproved: true,
      isPublished: true,
      semester: 'First Semester',
      academicYear: '2025/2026',
    },
  });

  await prisma.continuousAssessment.create({
    data: {
      studentId: student1.id,
      courseId: course2.id,
      caScore: 34.0,
      examScore: 54.0,
      totalScore: 88.0,
      grade: 'A',
      gpaPoint: 4.0,
      isApproved: true,
      isPublished: true,
      semester: 'First Semester',
      academicYear: '2025/2026',
    },
  });

  // 12. Invoices & Payments (In GHS)
  console.log('Creating Ghana Cedis (GH₵) Invoices & Payments...');
  const invoice1 = await prisma.invoice.create({
    data: {
      invoiceNumber: 'INV-GH-2025-001',
      studentId: student1.id,
      title: 'Level 100 Semester 1 Tuition & Clinical Fees',
      amount: 3500.00,
      amountPaid: 2000.00,
      balance: 1500.00,
      academicYear: '2025/2026',
      semester: 'First Semester',
      dueDate: '2025-10-31',
      status: 'PARTIAL',
    },
  });

  await prisma.studentFee.create({
    data: {
      studentId: student1.id,
      title: 'Semester 1 Tuition & Clinical Training',
      amount: 3500.00,
      paidAmount: 2000.00,
      balance: 1500.00,
      dueDate: '2025-10-31',
      status: 'PARTIAL',
    },
  });

  await prisma.payment.create({
    data: {
      reference: 'WLS-PAY-GH-9821341',
      studentId: student1.id,
      invoiceId: invoice1.id,
      title: 'First Semester Tuition Initial Instalment',
      amount: 2000.00,
      currency: 'GHS',
      method: 'Mobile Money (MTN / Telecel)',
      channel: 'paystack',
      status: 'SUCCESSFUL',
      paystackStatus: 'success',
      paystackRef: 'pstk_gh_live_87236192837',
      receiptNumber: 'RCP-GH-2025-0001',
      verifiedAt: new Date('2025-09-15T11:20:00Z'),
      receiptPdfUrl: '/portal/student/receipts/WLS-PAY-GH-9821341',
    },
  });

  // 13. Admissions Applications (Ghanaian Applicants)
  console.log('Creating Ghana Admission Applications Pipeline...');
  await prisma.application.create({
    data: {
      referenceNumber: 'WLS-ADM-GH-2025-0101',
      applicantName: 'Nana Yaa Boateng',
      applicantEmail: 'nanayaa.b@gmail.com',
      applicantPhone: '+233 24 991 2233',
      dateOfBirth: '2004-08-12',
      gender: 'Female',
      nationality: 'Ghanaian',
      address: 'Plot 12, West Legon, Accra, Ghana',
      previousSchool: 'Achimota Senior High School',
      examGrades: 'WASSCE: Core Math (A1), English (B2), Int. Science (A1), Biology (A1)',
      programmeId: prog1.id,
      status: 'APPROVED',
      reviewNotes: 'Candidate meets all Nursing & Midwifery Council entry requirements with top distinction grades.',
      decisionDate: new Date(),
      admissionLetter: '/portal/admin/admissions/letters/WLS-ADM-GH-2025-0101',
    },
  });

  await prisma.application.create({
    data: {
      referenceNumber: 'WLS-ADM-GH-2025-0102',
      applicantName: 'Kofi Owusu-Ansah',
      applicantEmail: 'kofi.owusu@outlook.com',
      applicantPhone: '+233 20 882 3344',
      dateOfBirth: '2003-01-25',
      gender: 'Male',
      nationality: 'Ghanaian',
      address: 'Kumasi Road, Dome, Accra, Ghana',
      previousSchool: 'Prempeh College',
      examGrades: 'WASSCE: Core Math (B3), English (B3), Int. Science (B2), Chemistry (B3)',
      programmeId: prog2.id,
      status: 'UNDER_REVIEW',
      reviewNotes: 'Scheduled for oral interview with clinical assessment panel.',
    },
  });

  await prisma.application.create({
    data: {
      referenceNumber: 'WLS-ADM-GH-2025-0103',
      applicantName: 'Akua Mansa Dapaah',
      applicantEmail: 'akua.dapaah@yahoo.com',
      applicantPhone: '+233 27 773 4455',
      dateOfBirth: '2004-12-05',
      gender: 'Female',
      nationality: 'Ghanaian',
      address: 'Tema Community 6, Greater Accra, Ghana',
      previousSchool: 'Wesley Girls High School',
      examGrades: 'WASSCE: Core Math (A1), English (A1), Int. Science (A1), Physics (B2)',
      programmeId: prog1.id,
      status: 'AWAITING_DOCUMENTS',
      reviewNotes: 'Certified copy of birth certificate and passport photographs required.',
    },
  });

  // 14. Clinic Services & Doctors (Action Boat Medical Centre / Homeopathy — Tema Michel Camp)
  console.log('Creating Clinic Services & Specialists at Tema Michel Camp...');
  await prisma.clinicService.createMany({
    data: [
      {
        title: 'Homeopathic Medicine & Holistic Care',
        category: 'Homeopathy',
        description: 'Natural, individualized homeopathic consultations and constitutional remedies for chronic, acute, and preventive wellness.',
        iconName: 'Leaf',
        duration: '40 mins',
        featured: true,
      },
      {
        title: 'General Medicine & Specialist Care',
        category: 'Primary Care',
        description: 'Comprehensive outpatient consultation, preventive checkups, chronic disease management, and internal medicine specialist care.',
        iconName: 'Stethoscope',
        duration: '30 mins',
        featured: true,
      },
      {
        title: 'Advanced Diagnostics & Laboratory',
        category: 'Diagnostics',
        description: 'Fully automated diagnostic medical laboratory, digital X-ray, high-resolution ultrasound, and ECG monitoring.',
        iconName: 'Activity',
        duration: '45 mins',
        featured: true,
      },
      {
        title: 'Pharmacy & Natural Dispensary',
        category: 'Pharmacy',
        description: 'Licensed in-house pharmacy & homeopathic dispensary providing verified medications with certified patient counseling.',
        iconName: 'Pill',
        duration: '15 mins',
        featured: true,
      },
      {
        title: 'Wellness & Preventive Care',
        category: 'Wellness',
        description: 'Comprehensive annual wellness screenings, immunizations, dietary counseling, and occupational health assessments.',
        iconName: 'Heart',
        duration: '60 mins',
        featured: true,
      },
    ],
  });

  await prisma.medicalStaff.createMany({
    data: [
      {
        name: 'Dr. Kwame Mensah, MBChB, FWACP',
        specialty: 'Internal Medicine & Cardiology',
        qualification: 'MBChB (UGMS Korle Bu), FWACP, Specialist Physician',
        bio: 'Over 18 years of specialized clinical experience in Accra. Former consultant physician at Korle Bu Teaching Hospital.',
        photoUrl: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&auto=format&fit=crop&q=80',
        availableDays: 'Monday - Thursday',
      },
      {
        name: 'Dr. Abena Osei, MBChB, FWACS',
        specialty: 'Obstetrics & Gynaecology',
        qualification: 'MBChB, FWACS, Dip Advanced Laparoscopic Surgery',
        bio: 'Senior consultant obstetrician committed to maternal health excellence and high-risk pregnancy management across Greater Accra.',
        photoUrl: 'https://images.unsplash.com/photo-1594824813684-181156291a18?w=400&auto=format&fit=crop&q=80',
        availableDays: 'Tuesday, Thursday, Saturday',
      },
      {
        name: 'Dr. Kwabena Frimpong, MD, Paediatrics',
        specialty: 'Paediatrics & Neonatal Care',
        qualification: 'MD, MWACP Paediatrics, Fellow Neonatal Intensive Care',
        bio: 'Dedicated paediatrician with extensive expertise in neonatal critical care, childhood immunizations, and paediatric growth tracking.',
        photoUrl: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&auto=format&fit=crop&q=80',
        availableDays: 'Monday, Wednesday, Friday',
      },
    ],
  });

  // 15. Announcements
  console.log('Creating Institutional Announcements...');
  await prisma.announcement.createMany({
    data: [
      {
        title: 'N&MC Licensure Examination Orientation for Final Year Students',
        content: 'All final year nursing students are scheduled for an intensive 3-day orientation and clinical OSCE simulation workshop at the Main Auditorium.',
        targetAudience: 'STUDENTS',
        priority: 'HIGH',
      },
      {
        title: 'Mid-Semester Continuous Assessment Schedule Released',
        content: 'Continuous assessment test schedules for 2025/2026 First Semester have been published. Check your student portal timetable.',
        targetAudience: 'ALL',
        priority: 'NORMAL',
      },
      {
        title: 'Paystack Ghana Online Fee Payment Portal Active',
        content: 'Students can now pay school fees, clinical lab fees, and examination dues securely in Ghana Cedis (GH₵) via MTN Mobile Money, Telecel Cash, and Visa/Mastercard.',
        targetAudience: 'STUDENTS',
        priority: 'HIGH',
      },
    ],
  });

  // 16. Support Tickets
  console.log('Creating Support Tickets...');
  await prisma.supportTicket.create({
    data: {
      userId: studentUser1.id,
      studentId: student1.id,
      subject: 'Correction of Middle Name on Official Student ID',
      category: 'Academic',
      status: 'RESOLVED',
      message: 'Kindly update my middle name from Serwa to Serwaa as reflected on my Ghana Card.',
      reply: 'Your official record has been verified against your Ghana Card and corrected. Your updated ID card is ready for collection at the Academic Secretariat.',
    },
  });

  // 17. Examinations
  console.log('Creating Examinations...');
  const exam1 = await prisma.examination.create({
    data: {
      courseId: course1.id,
      title: 'End of Semester Anatomy Examination',
      instructions: 'Answer all 25 multiple choice questions. Each question carries 4 marks. Total marks: 100. Time allowed: 45 minutes.',
      venue: 'CBT Lab & Online Portal',
      durationMinutes: 45,
      totalMarks: 100,
      passMark: 50,
      scheduledDate: '2025-11-28',
      scheduledTime: '10:00 AM',
      status: 'UPCOMING',
      isPublished: true,
    },
  });

  await prisma.question.createMany({
    data: [
      {
        examId: exam1.id,
        orderIndex: 1,
        text: 'Which chamber of the human heart pumps oxygenated blood directly into the systemic circulation via the aorta?',
        optionsJson: JSON.stringify(['Right atrium', 'Right ventricle', 'Left atrium', 'Left ventricle']),
        correctAnswer: 'Left ventricle',
        explanation: 'The left ventricle receives oxygenated blood from the left atrium and contracts forcefully to propel blood into the aorta.',
        marks: 4,
      },
      {
        examId: exam1.id,
        orderIndex: 2,
        text: 'What is the normal physiological resting blood pressure range for a healthy adult in Ghana according to standard clinical guidelines?',
        optionsJson: JSON.stringify(['140/90 mmHg', '120/80 mmHg', '90/60 mmHg', '160/100 mmHg']),
        correctAnswer: '120/80 mmHg',
        explanation: '120/80 mmHg is the benchmark standard for adult normotensive resting blood pressure.',
        marks: 4,
      },
    ],
  });

  const { seedModulesAndQuizzes } = require('./seed-modules-and-quizzes');
  await seedModulesAndQuizzes(prisma, {
    coursesByCode: {
      'CGV 101': course1,
      'CGV 102': course2,
      'CGV 103': course3,
    },
    programmeId: prog1.id,
    lecturerId: lecturer1.id,
  });

  console.log('✅ Seeding completed successfully with Ghana localized data and academic structure!');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
