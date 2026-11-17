export interface BrochureModuleOutline {
  code: string;
  title: string;
  description: string;
  topics: string[];
}

export interface BrochureProgrammeDetail {
  code: string;
  name: string;
  qualification: string;
  duration: string;
  fee: number;
  initialDeposit: number;
  installmentNote: string;
  scholarshipNote: string;
  schedules: { label: string; timing: string }[];
  venue: string;
  requirements: string;
  description: string;
  careerOpportunities: string[];
  courseOutline: BrochureModuleOutline[];
}

export const BROCHURE_PROGRAMMES: BrochureProgrammeDetail[] = [
  {
    code: 'DCG',
    name: 'Diploma in Care Giving',
    qualification: 'Diploma in Care Giving (Action Health College)',
    duration: '3 Months / 6 Months / 1 Year',
    fee: 4000,
    initialDeposit: 2000,
    installmentNote: 'Initial payment GH₵2,000.00 with 50% half installment plan',
    scholarshipNote: 'Eligible for up to 50% Successfield Scholarship consideration on application',
    schedules: [
      { label: 'Regular (Mon – Thu)', timing: '8:00 AM – 1:00 PM' },
      { label: 'Weekends (Sat & Sun)', timing: '8:00 AM – 2:00 PM' },
      { label: 'Online Class (Mon – Thu)', timing: '7:00 PM – 9:00 PM' },
      { label: 'Sandwich Track', timing: 'Intensive Modular Clinical Sessions' },
    ],
    venue: 'Action Boat Medical Centre / Homeopathy — Tema Medical Camp (Gbetsile Pure Oil)',
    requirements:
      'WASSCE or any equivalent certificate. Inclusive entry for applicants able to read and write; Recognition of Prior Learning (RPL) also available.',
    description:
      'Comprehensive, hands-on caregiving and healthcare assistant training covering human anatomy, ethics & law, communication, pharmacology, chronic & palliative care, nutrition, mental health, activities of daily living, caregiver self-care, and infection prevention and control.',
    careerOpportunities: [
      'Healthcare Assistant',
      'Professional Caregiver',
      'Home Care Assistant',
      'Patient Care Assistant',
      'Elderly Care Assistant',
      'Hospital Support Worker',
      'Residential Care Worker',
      'Community Care Assistant',
    ],
    courseOutline: [
      {
        code: 'Module 1',
        title: 'Introduction to Caregiving',
        description: 'Foundations of professional vs. family caregiving, caregiver roles, and daily support.',
        topics: ['Professional vs. Family Caregiving', 'Activities of Daily Living Support', 'Emotional Companionship', 'Health Monitoring & Reporting'],
      },
      {
        code: 'Module 2 & 12',
        title: 'Human Anatomy, Physiology & Introduction to Pathology',
        description: 'Essential body systems, normal physiological function, and introduction to common diseases.',
        topics: ['Cardiovascular & Respiratory Systems', 'Musculoskeletal & Nervous Systems', 'Vital Signs Baseline', 'Study of Common Pathologies'],
      },
      {
        code: 'Module 3',
        title: 'Caregiving Ethics, Cultural Competence & Healthcare Management Law',
        description: 'Patient confidentiality, informed consent, cultural sensitivity, and legal boundaries.',
        topics: ['Ethical Principles & Confidentiality', 'Cultural Competence in Ghana & Abroad', 'Healthcare Law & Patient Rights', 'Duty of Care & Documentation'],
      },
      {
        code: 'Module 4',
        title: 'Care Coordination and Communication Skills',
        description: 'Therapeutic communication with patients, families, and multidisciplinary clinical teams.',
        topics: ['Active Listening & Empathy', 'Shift Handover & Charting', 'Communicating with Elderly & Impaired Patients', 'Care Plan Coordination'],
      },
      {
        code: 'Module 5',
        title: 'Basic Pharmacology and Medication Management',
        description: 'Safe medication assistance, routes of administration, storage, and adverse reaction reporting.',
        topics: ['The 6 Rights of Medication Assistance', 'Common Drug Classes & Side Effects', 'Safe Storage & Expiration Checks', 'Recognizing & Reporting Adverse Reactions'],
      },
      {
        code: 'Module 6',
        title: 'Chronic Disease Management, Palliative, and End-of-Life Care',
        description: 'Supporting clients with hypertension, diabetes, stroke, dementia, and compassionate end-of-life care.',
        topics: ['Hypertension, Diabetes & Stroke Care', 'Dementia & Alzheimer Support', 'Pain & Symptom Comfort Measures', 'Palliative & Hospice Support'],
      },
      {
        code: 'Module 7',
        title: 'Nutrition and Hydration in Clinical Care',
        description: 'Balanced therapeutic diets, feeding assistance, dysphagia precautions, and hydration monitoring.',
        topics: ['Macronutrients & Therapeutic Diets', 'Safe Feeding Techniques & Aspiration Prevention', 'Fluid Balance & Dehydration Signs', 'Meal Planning for Elderly Clients'],
      },
      {
        code: 'Module 8',
        title: 'Mental Health and Well-Being',
        description: 'Recognizing depression, anxiety, cognitive decline, and delivering trauma-informed psychosocial support.',
        topics: ['Psychosocial Needs of Patients', 'Anxiety, Depression & Loneliness', 'De-escalation & Behavioral Support', 'Dignity-Centered Mental Wellness'],
      },
      {
        code: 'Module 9',
        title: 'Activities of Daily Living (ADLs), Basic Nursing & Health Promotion',
        description: 'Bed bathing, safe transfers, pressure sore prevention, vital signs, and preventive health education.',
        topics: ['Personal Hygiene, Grooming & Bed Making', 'Safe Lifting, Transfers & Mobility Aids', 'Vital Signs Measurement (BP, Temp, Pulse, SpO2)', 'Health Promotion & Disease Prevention'],
      },
      {
        code: 'Module 10',
        title: 'Caregiver Self-Care and Collaboration in Healthcare',
        description: 'Preventing caregiver burnout, ergonomics, stress management, and working within hospital teams.',
        topics: ['Burnout Prevention & Stress Management', 'Back Safety & Ergonomics', 'Interprofessional Collaboration', 'Continuous Professional Development'],
      },
      {
        code: 'Module 11 & 13',
        title: 'Safety, Infection Prevention & Control (IPC) & Holistic Wellness',
        description: 'Hand hygiene, PPE, biomedical waste handling, fall prevention, and the 8-Dimension Wellness Wheel.',
        topics: ['Standard Precautions & Hand Hygiene', 'PPE Donning & Doffing', 'Fall & Fire Safety in Care Settings', '8-Dimension Holistic Wellness'],
      },
    ],
  },
  {
    code: 'NAS',
    name: 'Professional Diploma in Nursing Assistant Studies',
    qualification: 'Professional Diploma in Nursing Assistant Studies',
    duration: '1 Year',
    fee: 4500,
    initialDeposit: 2250,
    installmentNote: 'Flexible installment plan available (50% initial deposit)',
    scholarshipNote: 'Eligible for up to 50% Successfield Scholarship consideration on application',
    schedules: [
      { label: 'Regular (Mon – Thu)', timing: '8:00 AM – 1:00 PM' },
      { label: 'Weekends (Sat & Sun)', timing: '8:00 AM – 2:00 PM' },
      { label: 'Clinical Rotations', timing: 'Supervised Hospital Ward Practice' },
    ],
    venue: 'Action Boat Medical Centre / Homeopathy — Tema Medical Camp (Gbetsile Pure Oil)',
    requirements:
      'WASSCE / SSSCE or equivalent certificate, or recognized healthcare foundation certificate. Interview & clinical orientation required.',
    description:
      'Intensive clinical support assistant training preparing graduates to assist registered nurses and physicians with vital signs monitoring, bedside nursing procedures, ward hygiene, specimen handling, and patient recovery care.',
    careerOpportunities: [
      'Nursing Assistant',
      'Patient Care Assistant',
      'Healthcare Support Worker',
      'Clinical Support Assistant',
      'Hospital Support Assistant',
      'Home Care Assistant',
      'Residential Care Assistant',
      'Community Healthcare Support Worker',
    ],
    courseOutline: [
      {
        code: 'NAS 101',
        title: 'Foundations of Nursing Assistant Practice & Professional Ethics',
        description: 'Hospital workflows, nursing team roles, patient rights, and clinical documentation.',
        topics: ['Role of the Nursing Assistant in Ghana', 'Therapeutic Nurse-Patient Communication', 'Medical Ethics & Confidentiality', 'Shift Handover & Ward Charting'],
      },
      {
        code: 'NAS 102',
        title: 'Applied Anatomy, Physiology & Vital Signs Monitoring',
        description: 'Body systems assessment, accurate blood pressure, temperature, pulse, respiration, and SpO2 charting.',
        topics: ['Vital Signs & Early Warning Recognition', 'Cardiopulmonary & Renal Basics', 'Fluid Intake & Output Charting', 'Anthropometry & BMI Calculation'],
      },
      {
        code: 'NAS 103',
        title: 'Basic Bedside Nursing Procedures & Infection Control',
        description: 'Aseptic technique, wound dressing assistance, catheter & ostomy care support, and sterile supply handling.',
        topics: ['Aseptic & Sterile Technique', 'Bed Making & Pressure Ulcer Prevention', 'Specimen Collection Support', 'Hospital Infection Prevention & Control (IPC)'],
      },
      {
        code: 'NAS 104',
        title: 'Supervised Clinical Ward Rotations & Emergency Readiness',
        description: 'Hands-on rotations across OPD, medical/surgical wards, maternity support, and acute triage.',
        topics: ['OPD Triage & Patient Intake', 'Medical & Surgical Ward Support', 'Medication Administration Assistance', 'Basic Life Support & Ward Emergencies'],
      },
    ],
  },
  {
    code: 'PHE',
    name: 'Public Health, First Aid & Basic Emergency Care',
    qualification: 'Diploma / Advanced Certificate in Public Health, First Aid & Emergency Care',
    duration: '3 – 6 Months',
    fee: 2500,
    initialDeposit: 1250,
    installmentNote: 'Flexible installment plan available (50% initial deposit)',
    scholarshipNote: 'Eligible for up to 50% Successfield Scholarship consideration on application',
    schedules: [
      { label: 'Regular (Mon – Thu)', timing: '8:00 AM – 1:00 PM' },
      { label: 'Weekends (Sat & Sun)', timing: '8:00 AM – 2:00 PM' },
      { label: 'Online / Hybrid', timing: 'Mon – Thu, 7:00 PM – 9:00 PM' },
    ],
    venue: 'Action Boat Medical Centre / Homeopathy — Tema Medical Camp (Gbetsile Pure Oil)',
    requirements:
      'Open to WASSCE holders, workplace safety officers, teachers, community health workers, and individuals able to read and write.',
    description:
      'Practical public health, occupational safety, advanced first aid, CPR, fire safety, and basic emergency response training designed for clinics, schools, workplaces, and community health settings.',
    careerOpportunities: [
      'Public Health & Safety Officer',
      'Occupational Health & Safety Assistant',
      'First Aid Officer',
      'Workplace First Aider',
      'Emergency Response Team Member',
      'Fire Safety Officer / Fire Warden',
      'School & Event First Aid Officer',
      'Community Health & Safety Officer',
    ],
    courseOutline: [
      {
        code: 'PHE 101',
        title: 'Public Health, Environmental Safety & Disease Prevention',
        description: 'Community health promotion, epidemiology basics, sanitation, and occupational hazard control.',
        topics: ['Community Health & Epidemiology Basics', 'Water, Sanitation & Hygiene (WASH)', 'Communicable Disease Prevention', 'Workplace Occupational Health & Safety'],
      },
      {
        code: 'PHE 102',
        title: 'Advanced First Aid, CPR & Basic Emergency Care',
        description: 'Primary survey (DRABC), CPR & AED operation, bleeding control, fractures, burns, and shock management.',
        topics: ['Scene Safety & Primary Survey (DRABC)', 'Adult, Child & Infant CPR', 'Hemorrhage, Shock & Fracture Stabilization', 'Burns, Choking & Medical Emergencies'],
      },
      {
        code: 'PHE 103',
        title: 'Fire Safety & Emergency Preparedness',
        description: 'Fire triangle, extinguisher selection, evacuation drills, and workplace emergency coordination.',
        topics: ['Fire Prevention & Extinguisher Types', 'Emergency Evacuation Protocols', 'Workplace Hazard Audits', 'Incident Reporting & Triage'],
      },
    ],
  },
];

export const ADDITIONAL_BROCHURE_PROGRAMMES = [
  {
    code: 'FAID',
    name: 'Advanced Certificate in First Aid Training',
    duration: '1 – 3 Months',
    category: 'Short Certificate',
    careers: ['First Aid Officer', 'Workplace First Aider', 'First Aid Trainer', 'School & Event First Aid Officer'],
  },
  {
    code: 'BEC',
    name: 'Certificate in Basic Emergency Care Training',
    duration: '1 – 3 Months',
    category: 'Short Certificate',
    careers: ['Emergency Response Team Member', 'School Emergency Care Assistant', 'Community Emergency Care Worker'],
  },
  {
    code: 'FSAF',
    name: 'Certificate in Fire Safety',
    duration: '1 – 2 Months',
    category: 'Short Certificate',
    careers: ['Fire Safety Officer', 'Fire Warden / Marshal', 'Workplace Fire Safety Coordinator'],
  },
  {
    code: 'DBA',
    name: 'Professional Diploma in Business Administration',
    duration: '6 – 12 Months',
    category: 'Professional Diploma',
    careers: ['Administrative Officer', 'Customer Service Officer', 'Business Support Officer', 'Office Supervisor'],
  },
  {
    code: 'DOA',
    name: 'Professional Diploma in Office Administration',
    duration: '6 – 12 Months',
    category: 'Professional Diploma',
    careers: ['Office Administrator', 'Front Desk Officer', 'Records Officer', 'Office Coordinator'],
  },
  {
    code: 'DES',
    name: 'Professional Diploma in Education Studies (Teaching & Learning)',
    duration: '6 – 12 Months',
    category: 'Professional Diploma',
    careers: ['Teaching Assistant', 'Learning Support Assistant', 'Teaching & Learning Facilitator'],
  },
  {
    code: 'BLS',
    name: 'Executive Certificate in Basic Legal Studies',
    duration: '3 – 6 Months',
    category: 'Executive Certificate',
    careers: ['Legal Administrative Assistant', 'Compliance Assistant', 'Paralegal Support Assistant'],
  },
];

export const GRADUATION_REQUIREMENTS = [
  'Completion of all required coursework, clinical rotations, and online assessments with passing grades.',
  'Minimum Cumulative Weighted Average (CWA) of 70% across programme courses.',
  'Full settlement of tuition, course materials, and graduation fees prior to graduation.',
  'Submission of final capstone / practical project where applicable.',
  'Completion of the institutional graduate exit survey.',
];
