const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');

const MODULE_DATA = [
  {
    num: 1,
    pdfFile: 'module-01-introduction-to-caregiving.pdf',
    courseCode: 'CGV 101',
    title: 'Module 1: Introduction & Foundations of Caregiving',
    description: 'Core principles, types of caregiving, caregiver roles, professionalism, and compassionate care standards.',
    objectives: [
      'Define professional vs. family caregiving and explain its core principles.',
      'Describe the physical, emotional, and health-monitoring responsibilities of a caregiver.',
      'Demonstrate ethical attitude, empathy, and professionalism in client interactions.',
    ],
    keyConcepts: ['Professional vs. Family Caregiving', 'Activities of Daily Living Support', 'Emotional Companionship', 'Health Monitoring & Reporting'],
    definitions: [
      { term: 'Caregiving', definition: 'Providing physical, emotional, and health-monitoring assistance to individuals unable to fully care for themselves due to age, illness, or disability.' },
      { term: 'Professional Caregiver', definition: 'A trained, formal care provider delivering structured support in clinical, residential, or home-care settings.' },
    ],
    summary: 'Caregiving is a compassionate, ethical, and skill-based profession combining physical support, emotional companionship, and vigilant health monitoring.',
    questions: [
      {
        type: 'MCQ',
        difficulty: 'EASY',
        text: 'Which of the following best describes the three core pillars of caregiving?',
        options: [
          'Physical support, emotional support, and health monitoring',
          'Surgical intervention, prescribing drugs, and billing',
          'Laboratory testing, X-ray imaging, and administration',
          'Hospital cleaning, catering, and security',
        ],
        answer: 'Physical support, emotional support, and health monitoring',
        explanation: 'Caregiving encompasses physical assistance (hygiene, mobility, feeding), emotional companionship, and monitoring/reporting health changes.',
      },
      {
        type: 'TRUE_FALSE',
        difficulty: 'EASY',
        text: 'Informal or family caregiving is typically unpaid support provided by relatives or friends, whereas professional caregiving is formal and trained.',
        options: ['True', 'False'],
        answer: 'True',
        explanation: 'Family caregiving is informal and unpaid, while professional caregiving involves formal training and compensation.',
      },
      {
        type: 'MCQ',
        difficulty: 'MEDIUM',
        text: 'When noticing a sudden change in a client’s appetite, mobility, or alertness, what is the caregiver’s primary responsibility?',
        options: [
          'Document the observation accurately and report it promptly to the supervising nurse or doctor',
          'Immediately prescribe a new medication',
          'Wait a full week to see if it resolves on its own',
          'Ignore it unless the client complains loudly',
        ],
        answer: 'Document the observation accurately and report it promptly to the supervising nurse or doctor',
        explanation: 'Caregivers act as the eyes and ears of the healthcare team by observing, documenting, and reporting changes promptly.',
      },
      {
        type: 'MCQ',
        difficulty: 'MEDIUM',
        text: 'Which attitude is essential for building trust with a dependent client?',
        options: [
          'Patience, empathy, and respect for dignity',
          'Rushing through tasks without speaking',
          'Making decisions without consulting the client',
          'Discussing the client’s condition publicly',
        ],
        answer: 'Patience, empathy, and respect for dignity',
        explanation: 'Compassionate, respectful communication preserves client dignity and builds therapeutic trust.',
      },
      {
        type: 'SHORT_ANSWER',
        difficulty: 'MEDIUM',
        text: 'List two physical care tasks and one emotional support task performed by a caregiver.',
        answer: 'Physical: bathing/grooming, feeding, or mobility assistance. Emotional: active listening or companionship.',
        explanation: 'Physical tasks include ADLs (bathing, dressing, feeding, mobility), while emotional support includes companionship, reassurance, and active listening.',
      },
    ],
  },
  {
    num: 2,
    pdfFile: 'module-02-human-anatomy-and-physiology.pdf',
    courseCode: 'CGV 101',
    title: 'Module 2: Human Anatomy & Physiology',
    description: 'Body systems structure and function plus standardized anatomical directional terms (midline, medial/lateral, proximal/distal, superior/inferior).',
    objectives: [
      'Distinguish between human anatomy (structure) and physiology (function).',
      'Identify the major organ systems and their primary roles in maintaining homeostasis.',
      'Apply standard anatomical directional terms accurately when describing body locations.',
    ],
    keyConcepts: ['Anatomy vs. Physiology', 'Major Organ Systems', 'Anatomical Position & Midline', 'Directional Terminology'],
    definitions: [
      { term: 'Anatomy', definition: 'The study of the physical structure and parts of the human body.' },
      { term: 'Physiology', definition: 'The study of how body parts and organ systems function and work together.' },
      { term: 'Proximal vs. Distal', definition: 'Proximal means closer to the trunk/point of attachment; Distal means farther away from the trunk.' },
    ],
    summary: 'Understanding normal body structure, organ system functions, and anatomical directional terms enables caregivers to recognize abnormalities and communicate clearly.',
    questions: [
      {
        type: 'MCQ',
        difficulty: 'EASY',
        text: 'In standard anatomical terminology, which term means "closer to the midline of the body"?',
        options: ['Medial', 'Lateral', 'Distal', 'Inferior'],
        answer: 'Medial',
        explanation: 'Medial structures lie closer to the body’s vertical midline, whereas lateral structures lie farther away from the midline.',
      },
      {
        type: 'MCQ',
        difficulty: 'MEDIUM',
        text: 'Which directional term describes the wrist in relation to the shoulder?',
        options: ['Distal', 'Proximal', 'Superior', 'Medial'],
        answer: 'Distal',
        explanation: 'The wrist is farther from the trunk (point of attachment) than the shoulder, making it distal to the shoulder.',
      },
      {
        type: 'TRUE_FALSE',
        difficulty: 'EASY',
        text: 'Anatomy is the study of body functions, while physiology is the study of body structures.',
        options: ['True', 'False'],
        answer: 'False',
        explanation: 'Anatomy studies body structure and parts, while physiology studies how those parts function.',
      },
      {
        type: 'MCQ',
        difficulty: 'MEDIUM',
        text: 'Which pair of terms refers to the front and back of the human body respectively?',
        options: [
          'Anterior (ventral) and Posterior (dorsal)',
          'Superior and Inferior',
          'Medial and Lateral',
          'Proximal and Distal',
        ],
        answer: 'Anterior (ventral) and Posterior (dorsal)',
        explanation: 'Anterior (ventral) refers to the front of the body, and Posterior (dorsal) refers to the back.',
      },
      {
        type: 'SHORT_ANSWER',
        difficulty: 'MEDIUM',
        text: 'Explain why structure (anatomy) and function (physiology) are considered interrelated in caregiving.',
        answer: 'Structure determines function; understanding normal anatomy helps caregivers recognize abnormal physical changes or impaired organ function.',
        explanation: 'In biology and clinical care, an organ’s physical structure enables its specific function, so structural damage impairs function.',
      },
    ],
  },
  {
    num: 3,
    pdfFile: 'module-03-ethics-cultural-competence-and-law.pdf',
    courseCode: 'CGV 101',
    title: 'Module 3: Caregiving Ethics, Cultural Competence & Healthcare Law',
    description: 'Bioethical principles, patient rights, informed consent, confidentiality, cultural sensitivity, and legal responsibilities.',
    objectives: [
      'Apply the six core ethical principles: autonomy, non-maleficence, beneficence, justice, veracity, and fidelity.',
      'Explain patient rights, confidentiality, and types of informed consent.',
      'Practice culturally competent care and recognize common clinical ethical dilemmas.',
    ],
    keyConcepts: ['Autonomy & Informed Consent', 'Confidentiality & Privacy', 'Beneficence & Non-Maleficence', 'Cultural Competence'],
    definitions: [
      { term: 'Autonomy', definition: 'Respecting an individual’s right to make informed decisions about their own healthcare.' },
      { term: 'Non-Maleficence', definition: 'The ethical duty to do no harm and prevent avoidable injury.' },
      { term: 'Beneficence', definition: 'Acting proactively in the best interest and well-being of the client.' },
    ],
    summary: 'Ethical integrity, legal compliance (informed consent and confidentiality), and cultural sensitivity are mandatory foundations of safe caregiving.',
    questions: [
      {
        type: 'MCQ',
        difficulty: 'EASY',
        text: 'Which ethical principle obligates healthcare providers and caregivers to "do no harm"?',
        options: ['Non-maleficence', 'Autonomy', 'Veracity', 'Justice'],
        answer: 'Non-maleficence',
        explanation: 'Non-maleficence means avoiding harm, whereas beneficence means actively doing good.',
      },
      {
        type: 'MCQ',
        difficulty: 'MEDIUM',
        text: 'Who must provide legal consent before a non-emergency medical procedure is performed on a minor (under 18)?',
        options: [
          'A parent or legal guardian',
          'Any friend accompanying the minor',
          'The caregiver on duty',
          'No consent is needed for minors',
        ],
        answer: 'A parent or legal guardian',
        explanation: 'For minors under 18, informed consent must be obtained from a parent or legal guardian unless an emergency law applies.',
      },
      {
        type: 'TRUE_FALSE',
        difficulty: 'EASY',
        text: 'Veracity refers to the ethical obligation to tell the truth and be honest with clients.',
        options: ['True', 'False'],
        answer: 'True',
        explanation: 'Veracity is truthfulness, while fidelity is keeping promises and commitments.',
      },
      {
        type: 'MCQ',
        difficulty: 'MEDIUM',
        text: 'In a life-threatening emergency when an unconscious adult patient cannot give consent, what legal principle applies?',
        options: [
          'Implied consent through emergency laws',
          'No treatment can ever be given',
          'Written consent must be mailed first',
          'Only verbal consent from a neighbor is valid',
        ],
        answer: 'Implied consent through emergency laws',
        explanation: 'Emergency laws recognize implied consent when a client is incapacitated and immediate care is needed to save life or limb.',
      },
      {
        type: 'SHORT_ANSWER',
        difficulty: 'MEDIUM',
        text: 'State three key patient rights every caregiver must uphold daily.',
        answer: 'Right to privacy/confidentiality, right to considerate and respectful care, and right to be informed or refuse treatment.',
        explanation: 'Patients have rights to privacy, respectful care, clear information, consent/refusal, and access to their own medical records.',
      },
    ],
  },
  {
    num: 4,
    pdfFile: 'module-04-care-coordination-and-communication.pdf',
    courseCode: 'CGV 101',
    title: 'Module 4: Care Coordination & Effective Communication Skills',
    description: 'Active listening, verbal/non-verbal/written communication, patient education, conflict resolution, and multidisciplinary teamwork.',
    objectives: [
      'Demonstrate active listening and empathetic verbal and non-verbal communication.',
      'Document clinical observations clearly and accurately in written care logs.',
      'Coordinate effectively with nurses, physicians, and families across care settings.',
    ],
    keyConcepts: ['Active Listening', 'Verbal & Non-Verbal Cues', 'Patient Education', 'Multidisciplinary Care Coordination'],
    definitions: [
      { term: 'Active Listening', definition: 'Fully concentrating on, understanding, and responding thoughtfully to what a client is communicating.' },
      { term: 'Care Coordination', definition: 'Deliberately organizing patient care activities and sharing information among all participants to achieve safer, more effective care.' },
    ],
    summary: 'Communication is the #1 workplace competency in healthcare, enabling trust, accurate handovers, and coordinated multidisciplinary care.',
    questions: [
      {
        type: 'MCQ',
        difficulty: 'EASY',
        text: 'Which skill is ranked #1 among core workplace competencies in healthcare?',
        options: ['Communication', 'Creativity', 'Graphic design', 'Solo decision-making'],
        answer: 'Communication',
        explanation: 'Communication consistently ranks highest (57.9%) ahead of organization and teamwork because it underpins patient safety.',
      },
      {
        type: 'MCQ',
        difficulty: 'MEDIUM',
        text: 'Which of the following is an example of effective non-verbal communication with an anxious patient?',
        options: [
          'Maintaining calm posture, gentle eye contact, and nodding attentively',
          'Checking your phone while the patient speaks',
          'Crossing arms and looking away impatiently',
          'Speaking rapidly in complex medical jargon',
        ],
        answer: 'Maintaining calm posture, gentle eye contact, and nodding attentively',
        explanation: 'Open body language, eye contact, and attentive nodding convey empathy and build trust.',
      },
      {
        type: 'TRUE_FALSE',
        difficulty: 'EASY',
        text: 'Written communication in caregiving includes accurate, objective, and timely documentation in patient care logs.',
        options: ['True', 'False'],
        answer: 'True',
        explanation: 'Clear written records ensure continuity of care across shift handovers and protect legal accountability.',
      },
      {
        type: 'MCQ',
        difficulty: 'MEDIUM',
        text: 'Why is cultural awareness important in patient education?',
        options: [
          'It helps tailor health explanations respectfully so clients understand and follow care plans',
          'It allows caregivers to ignore standard clinical protocols',
          'It replaces the need for informed consent',
          'It limits communication to written handouts only',
        ],
        answer: 'It helps tailor health explanations respectfully so clients understand and follow care plans',
        explanation: 'Culturally sensitive communication builds trust and improves treatment adherence.',
      },
      {
        type: 'SHORT_ANSWER',
        difficulty: 'MEDIUM',
        text: 'Name two benefits of effective care coordination within a healthcare team.',
        answer: 'Prevents medical errors/duplication and ensures seamless continuity of care for the patient.',
        explanation: 'Coordinated teams share timely updates, reduce medication/handover errors, and improve patient outcomes.',
      },
    ],
  },
  {
    num: 5,
    pdfFile: 'module-05-pharmacology-and-medication-management.pdf',
    courseCode: 'CGV 102',
    title: 'Module 5: Basic Pharmacology & Medication Management',
    description: 'Drug classifications, prescription vs. OTC/herbal medicines, ADME pharmacokinetics, and safe medication administration.',
    objectives: [
      'Explain the four stages of pharmacokinetics: Absorption, Distribution, Metabolism, and Excretion (ADME).',
      'Identify major drug classifications including analgesics, antibiotics, antihypertensives, and diuretics.',
      'Apply safe medication handling, storage, and observation practices.',
    ],
    keyConcepts: ['ADME Pharmacokinetics', 'Drug Classifications', 'Prescription vs. OTC & Herbal', 'Medication Safety'],
    definitions: [
      { term: 'Pharmacokinetics (ADME)', definition: 'How the body processes a drug through Absorption, Distribution, Metabolism (mainly liver), and Excretion (mainly kidneys).' },
      { term: 'Analgesics', definition: 'Medications used to relieve pain.' },
      { term: 'Antihypertensives', definition: 'Medications used to manage and lower high blood pressure.' },
    ],
    summary: 'Understanding ADME and major drug classes allows caregivers to support adherence safely and spot adverse drug reactions early.',
    questions: [
      {
        type: 'MCQ',
        difficulty: 'EASY',
        text: 'In the ADME framework, what does the letter "M" stand for, and which organ performs it primarily?',
        options: [
          'Metabolism — primarily in the liver',
          'Movement — primarily in the muscles',
          'Monitoring — primarily in the brain',
          'Measurement — primarily in the stomach',
        ],
        answer: 'Metabolism — primarily in the liver',
        explanation: 'The liver breaks down (metabolizes) most medications into active or inactive metabolites.',
      },
      {
        type: 'MCQ',
        difficulty: 'MEDIUM',
        text: 'Which organ is primarily responsible for the Excretion ("E" in ADME) of most drugs and their metabolites?',
        options: ['Kidneys', 'Lungs only', 'Spleen', 'Pancreas'],
        answer: 'Kidneys',
        explanation: 'The kidneys filter drugs and metabolites from the blood into urine for excretion.',
      },
      {
        type: 'TRUE_FALSE',
        difficulty: 'EASY',
        text: 'Intravenous (IV) medications bypass gastrointestinal absorption and enter systemic circulation directly.',
        options: ['True', 'False'],
        answer: 'True',
        explanation: 'IV administration delivers drugs directly into the bloodstream, resulting in immediate systemic distribution.',
      },
      {
        type: 'MCQ',
        difficulty: 'MEDIUM',
        text: 'Which drug class is prescribed to fight bacterial infections?',
        options: ['Antibiotics', 'Diuretics', 'Analgesics', 'Antihypertensives'],
        answer: 'Antibiotics',
        explanation: 'Antibiotics target bacterial infections; analgesics relieve pain, diuretics increase fluid excretion, and antihypertensives lower blood pressure.',
      },
      {
        type: 'SHORT_ANSWER',
        difficulty: 'MEDIUM',
        text: 'List the four stages of ADME in order and briefly define each.',
        answer: 'Absorption (getting into blood), Distribution (traveling to tissues), Metabolism (broken down by liver), Excretion (eliminated by kidneys).',
        explanation: 'ADME describes the complete lifecycle of a medication inside the human body.',
      },
    ],
  },
  {
    num: 6,
    pdfFile: 'module-06-chronic-disease-and-palliative-care.pdf',
    courseCode: 'CGV 102',
    title: 'Module 6: Chronic Disease Management, Palliative & End-of-Life Care',
    description: 'Long-term management of diabetes, hypertension, COPD, arthritis, palliative comfort, and dignified end-of-life support.',
    objectives: [
      'Identify common chronic diseases and the caregiver’s role in symptom control and adherence.',
      'Explain the goals and principles of palliative care.',
      'Provide compassionate, dignified end-of-life care and support for families.',
    ],
    keyConcepts: ['Chronic Disease Adherence', 'Complication Prevention', 'Palliative Comfort', 'Dignified End-of-Life Care'],
    definitions: [
      { term: 'Chronic Disease', definition: 'A long-term health condition (such as diabetes, hypertension, COPD, or arthritis) requiring ongoing management.' },
      { term: 'Palliative Care', definition: 'Specialized care focused on relieving pain, symptoms, and stress of serious illness to improve quality of life.' },
    ],
    summary: 'Caregivers improve quality of life for chronically ill and palliative patients through adherence support, symptom comfort, and emotional dignity.',
    questions: [
      {
        type: 'MCQ',
        difficulty: 'EASY',
        text: 'Which of the following is the primary goal of palliative care?',
        options: [
          'Relieving symptoms, pain, and stress to improve quality of life',
          'Replacing all family involvement',
          'Restricting all pain medication',
          'Focusing exclusively on laboratory research',
        ],
        answer: 'Relieving symptoms, pain, and stress to improve quality of life',
        explanation: 'Palliative care prioritizes comfort, symptom relief, and dignity for patients and families facing serious illness.',
      },
      {
        type: 'TRUE_FALSE',
        difficulty: 'EASY',
        text: 'Diabetes, hypertension, arthritis, and COPD are examples of chronic diseases requiring ongoing management.',
        options: ['True', 'False'],
        answer: 'True',
        explanation: 'Chronic conditions persist long-term and require consistent lifestyle, medication, and monitoring support.',
      },
      {
        type: 'MCQ',
        difficulty: 'MEDIUM',
        text: 'How can a caregiver best support a client living with hypertension or diabetes?',
        options: [
          'Encourage medication adherence, balanced diet, safe activity, and regular monitoring',
          'Advise stopping medications whenever they feel fine',
          'Serve high-sugar, high-salt meals daily',
          'Skip blood pressure or blood glucose checks',
        ],
        answer: 'Encourage medication adherence, balanced diet, safe activity, and regular monitoring',
        explanation: 'Consistent adherence and healthy lifestyle support prevent life-threatening complications.',
      },
      {
        type: 'MCQ',
        difficulty: 'MEDIUM',
        text: 'During end-of-life care, what is most important for the caregiver to uphold?',
        options: [
          'Physical comfort, respect for cultural/spiritual wishes, and emotional support for both client and family',
          'Loud, busy room environments',
          'Forcing heavy meals when the client has no appetite',
          'Ignoring family questions',
        ],
        answer: 'Physical comfort, respect for cultural/spiritual wishes, and emotional support for both client and family',
        explanation: 'Dignity, comfort, and compassionate family support are central to end-of-life care.',
      },
      {
        type: 'SHORT_ANSWER',
        difficulty: 'MEDIUM',
        text: 'State two goals of chronic disease management.',
        answer: 'Control symptoms and prevent complications (while improving quality of life and independence).',
        explanation: 'Effective management minimizes flare-ups, prevents organ damage, and supports daily independence.',
      },
    ],
  },
  {
    num: 7,
    pdfFile: 'module-07-nutrition-and-hydration.pdf',
    courseCode: 'CGV 102',
    title: 'Module 7: Nutrition & Hydration in Clinical Care',
    description: 'Essential nutrients, hydration balance, deficiency prevention, special therapeutic diets, and safe feeding assistance.',
    objectives: [
      'Explain why balanced nutrition and optimal hydration are vital for healing and immunity.',
      'Distinguish macronutrients, micronutrients, and therapeutic dietary modifications.',
      'Assist clients with feeding safely while respecting cultural and medical needs.',
    ],
    keyConcepts: ['Macronutrients & Micronutrients', 'Hydration & Thermoregulation', 'Deficiency Prevention', 'Therapeutic Diets'],
    definitions: [
      { term: 'Nutrition', definition: 'The process of providing or obtaining the food necessary for health, growth, healing, and bodily function.' },
      { term: 'Hydration', definition: 'Maintaining adequate body water for temperature regulation, joint lubrication, circulation, and waste removal.' },
    ],
    summary: 'Proper nutrition and hydration accelerate wound healing, prevent deficiency diseases, and sustain energy and mental alertness.',
    questions: [
      {
        type: 'MCQ',
        difficulty: 'EASY',
        text: 'Which of the following is a key physiological role of proper hydration?',
        options: [
          'Temperature regulation, joint lubrication, and waste removal',
          'Increasing blood viscosity',
          'Preventing nutrient absorption',
          'Replacing all dietary protein',
        ],
        answer: 'Temperature regulation, joint lubrication, and waste removal',
        explanation: 'Water is essential for thermoregulation, cushioning joints, transporting nutrients, and excreting waste.',
      },
      {
        type: 'TRUE_FALSE',
        difficulty: 'EASY',
        text: 'Adequate nutrition supports wound healing, immune response, and prevention of deficiency diseases like scurvy and rickets.',
        options: ['True', 'False'],
        answer: 'True',
        explanation: 'Protein, vitamins (like Vitamin C and D), and minerals are essential for tissue repair and immunity.',
      },
      {
        type: 'MCQ',
        difficulty: 'MEDIUM',
        text: 'When assisting an elderly client with swallowing difficulties (dysphagia) during meals, what should a caregiver do?',
        options: [
          'Position the client upright, offer small bites slowly, and follow prescribed texture modifications',
          'Feed the client while lying flat on their back',
          'Rush feeding to finish in 5 minutes',
          'Give thin liquids quickly without checking care plan',
        ],
        answer: 'Position the client upright, offer small bites slowly, and follow prescribed texture modifications',
        explanation: 'Upright positioning and unhurried small bites reduce aspiration and choking risks.',
      },
      {
        type: 'MCQ',
        difficulty: 'MEDIUM',
        text: 'Which dietary modification is most appropriate for a client with uncontrolled hypertension?',
        options: [
          'Low-sodium (low-salt) balanced diet',
          'High-salt processed diet',
          'High-sugar beverage diet',
          'Zero-fluid restriction without orders',
        ],
        answer: 'Low-sodium (low-salt) balanced diet',
        explanation: 'Reducing sodium intake helps lower blood pressure and fluid retention.',
      },
      {
        type: 'SHORT_ANSWER',
        difficulty: 'MEDIUM',
        text: 'Give three signs of dehydration a caregiver should watch for in a client.',
        answer: 'Dry mouth/lips, dark or reduced urine output, dizziness, fatigue, or confusion.',
        explanation: 'Early recognition of dehydration allows prompt oral rehydration or medical intervention.',
      },
    ],
  },
  {
    num: 8,
    pdfFile: 'module-08-mental-health-and-wellbeing.pdf',
    courseCode: 'CGV 102',
    title: 'Module 8: Mental Health, Psychosocial Support & Well-Being',
    description: 'The mental health continuum, common mental disorders, biological/environmental causes, and supportive caregiving.',
    objectives: [
      'Describe mental health as a continuum from thriving well-being to acute or long-term conditions.',
      'Recognize common mental health disorders including anxiety, depression, bipolar disorder, PTSD, and SUDs.',
      'Identify genetic, biological, environmental, psychological, and bodily causes of mental health conditions.',
    ],
    keyConcepts: ['Mental Health Continuum', 'Common Mental Disorders', 'Causes & Triggers', 'Stigma-Free Support'],
    definitions: [
      { term: 'Mental Health', definition: 'A state of well-being in which an individual realizes their potential, copes with normal life stresses, works productively, and contributes to community.' },
      { term: 'PTSD', definition: 'Post-Traumatic Stress Disorder — a trauma-related mental health condition triggered by experiencing or witnessing a distressing event.' },
    ],
    summary: 'Caregivers play a crucial frontline role in recognizing early mental health warning signs and offering non-judgmental psychosocial support.',
    questions: [
      {
        type: 'MCQ',
        difficulty: 'EASY',
        text: 'On the Mental Wellbeing to Mental Health continuum, what is the correct progression of signs and symptoms?',
        options: [
          'At risk → Emerging → Acute → Long-term',
          'Long-term → Acute → At risk → Emerging',
          'Acute → At risk → Long-term → Emerging',
          'Emerging → Long-term → At risk → Acute',
        ],
        answer: 'At risk → Emerging → Acute → Long-term',
        explanation: 'Early intervention at the "At risk" or "Emerging" stage helps prevent progression to acute or long-term illness.',
      },
      {
        type: 'MCQ',
        difficulty: 'MEDIUM',
        text: 'Which of the following is classified as a Mood Disorder?',
        options: [
          'Depression and Bipolar Disorder',
          'Obsessive-Compulsive Disorder (OCD)',
          'Schizophrenia',
          'Anorexia nervosa',
        ],
        answer: 'Depression and Bipolar Disorder',
        explanation: 'Depression and bipolar disorder are mood disorders; OCD is an anxiety-related disorder, schizophrenia is psychotic, and anorexia is an eating disorder.',
      },
      {
        type: 'TRUE_FALSE',
        difficulty: 'EASY',
        text: 'Mental health conditions can result from a combination of genetic, biological, environmental, psychological, and bodily factors.',
        options: ['True', 'False'],
        answer: 'True',
        explanation: 'Mental health is shaped by multi-factorial interactions including brain chemistry, trauma, genetics, coping skills, and chronic physical illness.',
      },
      {
        type: 'MCQ',
        difficulty: 'MEDIUM',
        text: 'How should a caregiver respond when a client expresses feelings of persistent sadness or hopelessness?',
        options: [
          'Listen empathetically without judgment and report concerns to the clinical supervisor',
          'Tell the client to simply "snap out of it"',
          'Leave the client completely isolated',
          'Share the client’s feelings on social media',
        ],
        answer: 'Listen empathetically without judgment and report concerns to the clinical supervisor',
        explanation: 'Empathetic, stigma-free listening and timely clinical referral protect client safety.',
      },
      {
        type: 'SHORT_ANSWER',
        difficulty: 'MEDIUM',
        text: 'Name four common categories of mental health disorders.',
        answer: 'Anxiety disorders, Mood disorders, Trauma-related disorders (PTSD), and Substance Use Disorders (or Psychotic/Eating/Personality disorders).',
        explanation: 'Recognizing disorder categories helps caregivers understand client behaviors and care plans.',
      },
    ],
  },
  {
    num: 9,
    pdfFile: 'module-09-adls-nursing-procedures-and-health-promotion.pdf',
    courseCode: 'CGV 103',
    title: 'Module 9: Activities of Daily Living (ADLs), Basic Nursing & Health Promotion',
    description: 'Assisting with bathing, dressing, toileting, mobility, vital signs monitoring, and community health promotion.',
    objectives: [
      'Assist clients safely with Activities of Daily Living (ADLs) while encouraging independence and dignity.',
      'Perform basic nursing observations including vital signs monitoring and documentation.',
      'Apply health promotion and disease prevention strategies in clinical and community settings.',
    ],
    keyConcepts: ['Activities of Daily Living (ADLs)', 'Vital Signs Monitoring', 'Health Promotion', 'Disease Prevention'],
    definitions: [
      { term: 'ADLs', definition: 'Fundamental daily self-care tasks including bathing, dressing, eating, grooming, toileting, and mobility.' },
      { term: 'Health Promotion', definition: 'The process of enabling people to increase control over and improve their health through education and healthy habits.' },
    ],
    summary: 'Supporting ADLs with dignity, monitoring vital signs accurately, and promoting preventive habits form the daily core of clinical caregiving.',
    questions: [
      {
        type: 'MCQ',
        difficulty: 'EASY',
        text: 'Which of the following is NOT one of the six basic Activities of Daily Living (ADLs)?',
        options: [
          'Performing surgical sutures',
          'Bathing and personal hygiene',
          'Dressing and grooming',
          'Toileting and mobility',
        ],
        answer: 'Performing surgical sutures',
        explanation: 'ADLs are fundamental self-care tasks: bathing, dressing, eating, grooming, toileting, and mobility.',
      },
      {
        type: 'TRUE_FALSE',
        difficulty: 'EASY',
        text: 'When assisting clients with ADLs, caregivers should encourage the client to do as much as they safely can independently.',
        options: ['True', 'False'],
        answer: 'True',
        explanation: 'Encouraging safe independence preserves strength, confidence, and personal dignity.',
      },
      {
        type: 'MCQ',
        difficulty: 'MEDIUM',
        text: 'What are the four primary vital signs routinely monitored in basic nursing care?',
        options: [
          'Temperature, pulse, respiration rate, and blood pressure',
          'Height, hair color, shoe size, and appetite',
          'Blood group, vision, dental count, and grip',
          'Weight, skin tone, sleep hours, and mood',
        ],
        answer: 'Temperature, pulse, respiration rate, and blood pressure',
        explanation: 'TPR and BP (often alongside oxygen saturation) are the core physiological vital signs.',
      },
      {
        type: 'MCQ',
        difficulty: 'MEDIUM',
        text: 'Which action best demonstrates disease prevention in community health promotion?',
        options: [
          'Educating families on handwashing, balanced nutrition, immunizations, and routine screenings',
          'Waiting until complications require emergency surgery',
          'Discouraging preventive clinic checkups',
          'Sharing unverified health rumors',
        ],
        answer: 'Educating families on handwashing, balanced nutrition, immunizations, and routine screenings',
        explanation: 'Preventive education and immunization reduce disease incidence before illness develops.',
      },
      {
        type: 'SHORT_ANSWER',
        difficulty: 'MEDIUM',
        text: 'Why must privacy and dignity always be protected when assisting a client with bathing or toileting?',
        answer: 'Protecting privacy prevents embarrassment, builds trust, and upholds the client’s fundamental human dignity and rights.',
        explanation: 'Closing curtains/doors and covering exposed areas respectfully are mandatory caregiving standards.',
      },
    ],
  },
  {
    num: 10,
    pdfFile: 'module-10-caregiver-self-care-and-collaboration.pdf',
    courseCode: 'CGV 103',
    title: 'Module 10: Caregiver Self-Care & Collaboration in Healthcare',
    description: 'Recognizing and preventing caregiver burnout, stress management, and effective interprofessional collaboration.',
    objectives: [
      'Identify early warning signs of caregiver stress and burnout.',
      'Practice daily self-care routines to sustain physical and emotional resilience.',
      'Collaborate respectfully and effectively within multidisciplinary healthcare teams.',
    ],
    keyConcepts: ['Burnout Prevention', 'Stress Management', 'Interprofessional Collaboration', 'Healthy Boundaries'],
    definitions: [
      { term: 'Caregiver Burnout', definition: 'A state of physical, emotional, and mental exhaustion caused by prolonged, unmanaged caregiving stress.' },
      { term: 'Interprofessional Collaboration', definition: 'Multiple health workers from different professional backgrounds working together with patients and families to deliver highest-quality care.' },
    ],
    summary: 'Sustaining your own health and collaborating openly with colleagues ensures safe, compassionate, long-term caregiving.',
    questions: [
      {
        type: 'MCQ',
        difficulty: 'EASY',
        text: 'Which of the following is a common warning sign of caregiver burnout?',
        options: [
          'Chronic fatigue, irritability, sleep disturbance, and emotional exhaustion',
          'Feeling energized and well-rested every day',
          'Strong enthusiasm for teamwork',
          'Consistent healthy sleep patterns',
        ],
        answer: 'Chronic fatigue, irritability, sleep disturbance, and emotional exhaustion',
        explanation: 'Burnout manifests as physical exhaustion, emotional detachment, irritability, and declining focus.',
      },
      {
        type: 'TRUE_FALSE',
        difficulty: 'EASY',
        text: 'Asking colleagues or supervisors for help when a workload becomes unsafe is a sign of professionalism, not weakness.',
        options: ['True', 'False'],
        answer: 'True',
        explanation: 'Collaborative teamwork protects both caregiver well-being and patient safety.',
      },
      {
        type: 'MCQ',
        difficulty: 'MEDIUM',
        text: 'Which habit best helps prevent caregiver burnout?',
        options: [
          'Setting healthy work-rest boundaries, sleeping 7–8 hours, exercising, and debriefing stress',
          'Working double shifts continuously without breaks',
          'Skipping meals during shifts',
          'Isolating yourself from friends and peers',
        ],
        answer: 'Setting healthy work-rest boundaries, sleeping 7–8 hours, exercising, and debriefing stress',
        explanation: 'Regular rest, nutrition, movement, and peer support replenish emotional and physical reserves.',
      },
      {
        type: 'MCQ',
        difficulty: 'MEDIUM',
        text: 'What strengthens collaboration between caregivers, nurses, and doctors?',
        options: [
          'Mutual respect, clear handover communication, and shared patient-centered goals',
          'Withholding patient updates from other shifts',
          'Competing for credit',
          'Ignoring care plan instructions',
        ],
        answer: 'Mutual respect, clear handover communication, and shared patient-centered goals',
        explanation: 'Shared goals and respectful, timely communication make multidisciplinary care seamless.',
      },
      {
        type: 'SHORT_ANSWER',
        difficulty: 'MEDIUM',
        text: 'Describe two practical self-care strategies you can use after a stressful clinical shift.',
        answer: 'Take a mindful rest/walk, hydrate and eat a balanced meal, talk with a trusted peer/mentor, or ensure 7–8 hours of sleep.',
        explanation: 'Intentional recovery routines prevent cumulative stress from turning into burnout.',
      },
    ],
  },
  {
    num: 11,
    pdfFile: 'module-11-safety-and-infection-control.pdf',
    courseCode: 'CGV 103',
    title: 'Module 11: Safety & Infection Prevention and Control (IPC)',
    description: 'Proper body mechanics, fall prevention, assistive devices, standard precautions, hand hygiene, PPE, and medical waste disposal.',
    objectives: [
      'Apply proper body mechanics and environmental checks to prevent falls and musculoskeletal injuries.',
      'Demonstrate WHO standard hand hygiene and appropriate Personal Protective Equipment (PPE) use.',
      'Follow safe sharps handling and color-coded clinical waste segregation protocols.',
    ],
    keyConcepts: ['Body Mechanics & Fall Prevention', 'Standard Precautions', 'Hand Hygiene & PPE', 'Waste & Sharps Safety'],
    definitions: [
      { term: 'Standard Precautions', definition: 'Infection control practices (hand hygiene, PPE, safe injection/sharps handling) applied to all patients regardless of suspected infection status.' },
      { term: 'Body Mechanics', definition: 'Using proper posture, leg strength, and alignment when lifting or transferring clients to prevent back and muscle injury.' },
    ],
    summary: 'Strict safety and infection prevention protocols protect clients, caregivers, and healthcare facilities from avoidable injuries and disease transmission.',
    questions: [
      {
        type: 'MCQ',
        difficulty: 'EASY',
        text: 'What is the single most effective measure for preventing healthcare-associated infections?',
        options: [
          'Proper and consistent hand hygiene (washing with soap/water or alcohol-based hand rub)',
          'Wearing the same gloves for every patient',
          'Opening windows once a month',
          'Using antibiotics for every cold',
        ],
        answer: 'Proper and consistent hand hygiene (washing with soap/water or alcohol-based hand rub)',
        explanation: 'Hand hygiene breaks the chain of infection before and after every patient contact.',
      },
      {
        type: 'MCQ',
        difficulty: 'MEDIUM',
        text: 'When lifting a heavy object or assisting a client transfer, which body mechanics technique is safest?',
        options: [
          'Keep your back straight, bend at the knees, and lift with your leg muscles',
          'Bend sharply at the waist with straight legs',
          'Twist your spine while lifting',
          'Hold the load far away from your body',
        ],
        answer: 'Keep your back straight, bend at the knees, and lift with your leg muscles',
        explanation: 'Using strong leg muscles with a neutral spine protects the lower back from injury.',
      },
      {
        type: 'TRUE_FALSE',
        difficulty: 'EASY',
        text: 'Used needles and sharps must be placed immediately into a puncture-proof sharps container without recapping.',
        options: ['True', 'False'],
        answer: 'True',
        explanation: 'Never recap used needles; dispose of them immediately in a puncture-resistant sharps box to prevent needlestick injuries.',
      },
      {
        type: 'MCQ',
        difficulty: 'MEDIUM',
        text: 'Which environmental precaution best reduces client fall risks in a ward or home?',
        options: [
          'Keep walkways clear, secure loose rugs/cords, and ensure adequate lighting',
          'Leave electrical cords across doorways',
          'Keep floors wet without warning signs',
          'Place needed items out of reach',
        ],
        answer: 'Keep walkways clear, secure loose rugs/cords, and ensure adequate lighting',
        explanation: 'Clear, well-lit, clutter-free pathways prevent slips, trips, and falls.',
      },
      {
        type: 'SHORT_ANSWER',
        difficulty: 'MEDIUM',
        text: 'List three items of Personal Protective Equipment (PPE) and state when gloves should be changed.',
        answer: 'Gloves, face mask, gown/apron (or eye protection). Gloves must be changed between every patient and between dirty and clean tasks.',
        explanation: 'PPE protects against blood and body fluid exposure; gloves are single-use per patient/task.',
      },
    ],
  },
  {
    num: 12,
    pdfFile: 'module-12-introduction-to-pathology.pdf',
    courseCode: 'CGV 101',
    title: 'Module 12: Introduction to Pathology — The Study of Diseases',
    description: 'Standalone visual & clinical module on Pathology: studying cells, tissues, blood/body fluids, pathogens, diagnosis, and treatment guidance.',
    objectives: [
      'Define pathology and explain its core question: "What went wrong in the body, and why?"',
      'Identify the four main specimen areas studied in pathology: cells, tissues, blood/body fluids, and disease-causing agents.',
      'Explain how pathology supports accurate diagnosis, symptom explanation, treatment decisions, and complication prevention.',
    ],
    keyConcepts: ['Etiology & Pathogenesis', 'Cytopathology & Histopathology', 'Clinical Lab Fluids', 'Microbiology & Pathogens'],
    definitions: [
      { term: 'Pathology', definition: 'The branch of medical science that studies diseases—their causes, development, and structural/functional effects on the body.' },
      { term: 'Etiology', definition: 'The underlying cause or origin of a disease (e.g., bacterial infection, genetic mutation, toxin).' },
    ],
    summary: 'Pathology connects outward clinical symptoms to cellular and tissue changes, guiding accurate diagnosis and safer patient care.',
    questions: [
      {
        type: 'MCQ',
        difficulty: 'EASY',
        text: 'Which core question does the science of pathology answer?',
        options: [
          '"What went wrong in the body, and why?"',
          '"How much does hospital equipment cost?"',
          '"Which shift schedule is shortest?"',
          '"Where should reception desks be placed?"',
        ],
        answer: '"What went wrong in the body, and why?"',
        explanation: 'Pathology investigates the causes, mechanisms, and effects of disease in cells, tissues, and fluids.',
      },
      {
        type: 'MCQ',
        difficulty: 'EASY',
        text: 'Which four key areas do pathologists and medical laboratories examine?',
        options: [
          'Cells, tissues, blood & body fluids, and disease-causing agents',
          'Buildings, vehicles, furniture, and uniforms',
          'Only bones and teeth',
          'Only blood pressure readings',
        ],
        answer: 'Cells, tissues, blood & body fluids, and disease-causing agents',
        explanation: 'Cytopathology (cells), histopathology (tissues), clinical pathology (fluids), and microbiology (pathogens) form the core of pathology.',
      },
      {
        type: 'TRUE_FALSE',
        difficulty: 'EASY',
        text: 'Pathology helps explain why specific symptoms occur and guides clinicians in choosing effective treatments.',
        options: ['True', 'False'],
        answer: 'True',
        explanation: 'By identifying the exact disease process, pathology explains symptoms and informs targeted therapy.',
      },
      {
        type: 'MCQ',
        difficulty: 'MEDIUM',
        text: 'Why is understanding basic pathology valuable for a caregiver?',
        options: [
          'It helps recognize early warning signs, support proper specimen collection, and prevent disease complications',
          'It allows caregivers to perform surgeries independently',
          'It replaces the need for doctors',
          'It is only useful for accountants',
        ],
        answer: 'It helps recognize early warning signs, support proper specimen collection, and prevent disease complications',
        explanation: 'Informed caregivers spot abnormal changes earlier and handle specimens/observations safely.',
      },
      {
        type: 'SHORT_ANSWER',
        difficulty: 'MEDIUM',
        text: 'List three ways pathology is used in modern healthcare.',
        answer: 'Helps diagnose diseases, explains why symptoms occur, guides treatment decisions, and supports medical research.',
        explanation: 'Pathology underpins diagnosis, clinical decision-making, complication prevention, and medical research.',
      },
    ],
  },
  {
    num: 13,
    pdfFile: 'module-13-holistic-wellness-wheel.pdf',
    courseCode: 'CGV 103',
    title: 'Module 13: Holistic Wellness & The 8-Dimension Wellness Wheel',
    description: 'Standalone holistic health module covering all 8 dimensions of wellness (Physical, Emotional, Social, Intellectual, Spiritual, Environmental, Occupational, Financial).',
    objectives: [
      'Define holistic wellness and explain why all 8 dimensions are interconnected.',
      'Describe practical daily habits for each of the 8 dimensions of the Wellness Wheel.',
      'Apply the Wellness Wheel to both holistic patient care and personal caregiver self-care.',
    ],
    keyConcepts: ['8 Dimensions of Wellness', 'Holistic Patient Assessment', 'Preventive Lifestyle Habits', 'Caregiver Work-Life Balance'],
    definitions: [
      { term: 'Holistic Wellness', definition: 'An integrated approach to health addressing physical, emotional, social, intellectual, spiritual, environmental, occupational, and financial well-being.' },
      { term: 'Environmental Wellness', definition: 'Maintaining clean, safe, clutter-free personal and clinical surroundings and caring for the wider environment.' },
    ],
    summary: 'The 8-Dimension Wellness Wheel provides a complete framework for holistic patient care and sustainable caregiver well-being.',
    questions: [
      {
        type: 'MCQ',
        difficulty: 'EASY',
        text: 'How many interconnected dimensions make up the Holistic Wellness Wheel?',
        options: ['8 dimensions', '2 dimensions', '4 dimensions', '12 dimensions'],
        answer: '8 dimensions',
        explanation: 'The 8 dimensions are Physical, Emotional, Social, Intellectual, Spiritual, Environmental, Occupational, and Financial.',
      },
      {
        type: 'MCQ',
        difficulty: 'MEDIUM',
        text: 'Which dimension of the Wellness Wheel focuses on decluttering your space, recycling, and keeping surroundings safe and healthy?',
        options: ['Environmental Wellness', 'Financial Wellness', 'Intellectual Wellness', 'Occupational Wellness'],
        answer: 'Environmental Wellness',
        explanation: 'Environmental wellness involves caring for both immediate living/working spaces and the broader natural environment.',
      },
      {
        type: 'TRUE_FALSE',
        difficulty: 'EASY',
        text: 'Financial wellness—such as budgeting and planning within your means—can reduce stress and positively impact overall health.',
        options: ['True', 'False'],
        answer: 'True',
        explanation: 'Financial strain is a major source of chronic stress; sound financial habits support emotional and physical well-being.',
      },
      {
        type: 'MCQ',
        difficulty: 'MEDIUM',
        text: 'Which activities best support Intellectual Wellness?',
        options: [
          'Continuous learning, reading, creative problem-solving, and attending workshops',
          'Skipping sleep to watch television',
          'Avoiding all new skills after graduation',
          'Neglecting physical exercise',
        ],
        answer: 'Continuous learning, reading, creative problem-solving, and attending workshops',
        explanation: 'Intellectual wellness thrives on curiosity, lifelong learning, and creative engagement.',
      },
      {
        type: 'SHORT_ANSWER',
        difficulty: 'MEDIUM',
        text: 'Name at least five of the eight dimensions on the Wellness Wheel.',
        answer: 'Physical, Emotional, Social, Intellectual, Spiritual (plus Environmental, Occupational, Financial).',
        explanation: 'All eight dimensions work together to support resilient, holistic health.',
      },
    ],
  },
];

const ESSAY_BANK = {
  1: [
    {
      text: 'Discuss the key differences between professional caregiving and family caregiving, highlighting three ethical and practical responsibilities of a professional caregiver.',
      answer: 'Professional caregiving is formal, trained, and compensated with structured accountability, whereas family caregiving is informal and unpaid. Key responsibilities include physical ADL support, emotional companionship, and accurate health monitoring/reporting.',
      concepts: ['formal training', 'physical support', 'emotional companionship', 'health monitoring'],
    },
    {
      text: 'A newly admitted elderly client refuses morning hygiene care and appears withdrawn. Explain how you would apply compassionate caregiving principles to build trust and respond appropriately.',
      answer: 'Approach calmly with patience and empathy, respect autonomy and privacy, listen to the client’s concerns without forcing, offer choices, and document/report behavioral changes to the supervising nurse.',
      concepts: ['empathy', 'autonomy', 'privacy', 'communication', 'reporting'],
    },
  ],
  2: [
    {
      text: 'Explain why a caregiver needs a solid foundation in both human anatomy and physiology, using two body systems as clinical examples.',
      answer: 'Anatomy is body structure and physiology is body function; structure determines function. Knowing normal cardiovascular (heart/blood pressure) and respiratory (lungs/breathing) function allows caregivers to spot abnormal vital signs or distress early.',
      concepts: ['structure and function', 'cardiovascular', 'respiratory', 'abnormal signs'],
    },
    {
      text: 'Describe the standard anatomical position and explain the clinical difference between Medial vs. Lateral and Proximal vs. Distal when documenting an injury.',
      answer: 'In the standard anatomical position, the body stands upright facing forward with palms forward. Medial is closer to the midline and lateral is farther away. Proximal is closer to the trunk attachment and distal is farther along a limb.',
      concepts: ['anatomical position', 'midline', 'medial', 'lateral', 'proximal', 'distal'],
    },
  ],
  3: [
    {
      text: 'Define Autonomy, Beneficence, Non-Maleficence, and Justice, and describe a practical caregiving scenario where two of these principles might conflict.',
      answer: 'Autonomy respects client choice; beneficence means doing good; non-maleficence means doing no harm; justice means fair care. A conflict arises when a client refuses a prescribed treatment (autonomy) that could prevent harm (beneficence/non-maleficence).',
      concepts: ['autonomy', 'beneficence', 'non-maleficence', 'justice', 'ethical dilemma'],
    },
    {
      text: 'Explain the legal and ethical requirements for Informed Consent and Patient Confidentiality, including exceptions for minors and life-threatening emergencies.',
      answer: 'Non-emergency care requires informed consent after explaining risks, benefits, and alternatives in plain language. Minors under 18 require parent/guardian consent; emergencies allow implied consent. Patient records must remain strictly confidential.',
      concepts: ['informed consent', 'confidentiality', 'minors', 'implied consent'],
    },
  ],
  4: [
    {
      text: 'Explain why communication is ranked the #1 competency in healthcare and describe how active listening, non-verbal cues, and accurate written documentation prevent clinical errors.',
      answer: 'Clear communication builds patient trust and prevents handover mistakes. Active listening validates patient needs, calm non-verbal cues reduce anxiety, and objective written logs ensure continuity across shifts.',
      concepts: ['active listening', 'non-verbal', 'written documentation', 'patient safety'],
    },
    {
      text: 'Describe how a caregiver should handle a disagreement between a patient’s family and the care plan while maintaining multidisciplinary teamwork.',
      answer: 'Listen respectfully to the family’s concerns, avoid defensive language, clarify facts within your scope, and escalate promptly to the supervising nurse or physician for a coordinated family meeting.',
      concepts: ['conflict resolution', 'teamwork', 'scope of practice', 'escalation'],
    },
  ],
  5: [
    {
      text: 'Trace the four stages of Pharmacokinetics (ADME) for an oral tablet versus an intravenous (IV) medication, and explain how liver or kidney disease affects drug safety.',
      answer: 'Oral drugs undergo Absorption in the GI tract, Distribution via blood, Metabolism mainly in the liver, and Excretion mainly via kidneys. IV drugs bypass GI absorption directly into blood. Liver or kidney impairment slows clearance and increases toxicity risk.',
      concepts: ['absorption', 'distribution', 'metabolism', 'excretion', 'liver', 'kidneys'],
    },
    {
      text: 'Discuss the safety precautions a caregiver must observe when assisting with prescription, over-the-counter (OTC), and herbal/homeopathic remedies.',
      answer: 'Verify the right client, drug, dose, route, and time; check expiry dates and storage; never mix OTC or herbal products without clinician review due to drug interactions; and monitor/report side effects promptly.',
      concepts: ['medication rights', 'interactions', 'storage', 'side effects'],
    },
  ],
  6: [
    {
      text: 'Select one chronic condition (e.g., diabetes or hypertension) and outline a comprehensive daily caregiving support plan covering medication, diet, monitoring, and complication prevention.',
      answer: 'For diabetes/hypertension: support timely medication adherence, prepare balanced low-sugar/low-sodium meals, monitor blood pressure/glucose logs, encourage safe physical activity, and watch for warning signs like dizziness or foot sores.',
      concepts: ['adherence', 'diet', 'monitoring', 'complication prevention'],
    },
    {
      text: 'Explain the core philosophy of palliative and end-of-life care, and describe how caregivers preserve a dying client’s physical comfort and emotional dignity.',
      answer: 'Palliative care focuses on relieving pain, distressing symptoms, and emotional stress rather than curative treatment alone. Caregivers maintain hygiene, gentle positioning, quiet comfort, respect spiritual/cultural wishes, and support grieving families.',
      concepts: ['symptom relief', 'dignity', 'comfort', 'family support'],
    },
  ],
  7: [
    {
      text: 'Explain the physiological importance of balanced nutrition and hydration for recovery, immunity, and preventing deficiency diseases in hospitalized or elderly clients.',
      answer: 'Proteins, vitamins, and minerals rebuild tissue and boost immunity, preventing scurvy or rickets. Optimal hydration regulates body temperature, lubricates joints, supports circulation, and removes metabolic waste.',
      concepts: ['wound healing', 'immunity', 'deficiency diseases', 'thermoregulation', 'waste removal'],
    },
    {
      text: 'Describe the safety steps a caregiver must take when feeding a client with swallowing difficulties (dysphagia) and monitoring for dehydration.',
      answer: 'Position the client upright at 90 degrees, offer small slow bites, follow prescribed thickened/soft diets, check for pocketing, and monitor hydration signs such as urine output, dry lips, and alertness.',
      concepts: ['upright position', 'dysphagia', 'aspiration prevention', 'dehydration signs'],
    },
  ],
  8: [
    {
      text: 'Using the Mental Wellbeing to Mental Health Continuum, explain why early recognition of "At Risk" and "Emerging" signs is critical for caregivers.',
      answer: 'Mental health moves along a continuum from thriving to At Risk, Emerging, Acute, and Long-Term illness. Spotting early sleep changes, withdrawal, or anxiety allows timely psychosocial support and clinical referral before crisis.',
      concepts: ['continuum', 'at risk', 'emerging', 'early intervention'],
    },
    {
      text: 'Discuss three major categories of mental health disorders and five contributing causes (genetic, biological, environmental, psychological, and bodily triggers).',
      answer: 'Categories include Mood Disorders (depression, bipolar), Anxiety Disorders (panic, OCD), Trauma (PTSD), and SUDs. Causes involve genetic predisposition, brain chemistry/hormonal imbalance, trauma/stressors, coping patterns, and chronic physical illness.',
      concepts: ['mood disorders', 'anxiety', 'PTSD', 'genetic', 'biological', 'environmental'],
    },
  ],
  9: [
    {
      text: 'Describe the six Activities of Daily Living (ADLs) and explain how a caregiver balances providing physical assistance with promoting client independence and privacy.',
      answer: 'The six ADLs are bathing, dressing, eating, grooming, toileting, and mobility. Caregivers close curtains/doors for privacy, explain each step, and encourage clients to perform safe parts independently.',
      concepts: ['bathing', 'dressing', 'eating', 'grooming', 'toileting', 'mobility', 'dignity'],
    },
    {
      text: 'Explain how routine vital signs monitoring (TPR & BP) and community health promotion work together to prevent acute hospital admissions.',
      answer: 'Tracking temperature, pulse, respiration, and blood pressure detects fever, hypoxia, or hypertension early. Combined with health education on hygiene, nutrition, and immunizations, complications are prevented early.',
      concepts: ['temperature', 'pulse', 'respiration', 'blood pressure', 'health promotion'],
    },
  ],
  10: [
    {
      text: 'Define caregiver burnout, identify four early physical or emotional warning signs, and design a personal weekly self-care plan to prevent it.',
      answer: 'Burnout is physical, emotional, and mental exhaustion from prolonged unmanaged stress. Signs include chronic fatigue, irritability, insomnia, and detachment. Prevention includes 7–8 hours sleep, exercise, boundaries, nutrition, and peer debriefing.',
      concepts: ['burnout', 'fatigue', 'irritability', 'boundaries', 'self-care'],
    },
    {
      text: 'Explain how effective interprofessional collaboration among caregivers, nurses, physicians, and homeopathic practitioners improves patient outcomes.',
      answer: 'Respectful teamwork, clear shift handovers, and shared patient goals prevent conflicting advice, reduce errors, and ensure holistic physical and emotional care.',
      concepts: ['collaboration', 'handover', 'mutual respect', 'patient-centered'],
    },
  ],
  11: [
    {
      text: 'Describe the Standard Precautions every caregiver must follow regardless of a client’s diagnosis, including hand hygiene, PPE, and sharps disposal.',
      answer: 'Standard precautions assume all blood/body fluids may be infectious: perform WHO hand hygiene before/after contact, wear appropriate PPE (gloves, mask, gown), never recap needles, and place sharps immediately in puncture-proof boxes.',
      concepts: ['standard precautions', 'hand hygiene', 'PPE', 'sharps safety'],
    },
    {
      text: 'Explain proper body mechanics during client transfers and environmental fall-prevention checks in a ward or home setting.',
      answer: 'Keep the back straight, bend at the knees, use leg muscles, and avoid twisting the spine. Prevent falls by clearing walkways, securing rugs/cords, ensuring good lighting, and checking mobility aids.',
      concepts: ['body mechanics', 'leg muscles', 'fall prevention', 'assistive devices'],
    },
  ],
  12: [
    {
      text: 'Define Pathology and explain the four primary specimen areas studied by pathologists and clinical laboratories (cells, tissues, body fluids, and pathogens).',
      answer: 'Pathology studies disease causes, development, and effects ("What went wrong and why?"). Labs examine cells (cytopathology), tissues (histopathology), blood/body fluids (clinical chemistry/haematology), and disease-causing microbes.',
      concepts: ['pathology', 'cells', 'tissues', 'blood and fluids', 'pathogens'],
    },
    {
      text: 'Discuss how pathology findings guide clinicians in diagnosing illness, explaining symptoms, selecting treatments, and preventing complications.',
      answer: 'Lab and tissue results confirm exact diagnoses, link symptoms like fever or anemia to underlying organ changes, guide targeted medications, and allow early intervention before complications worsen.',
      concepts: ['diagnosis', 'symptoms', 'treatment decisions', 'complications'],
    },
  ],
  13: [
    {
      text: 'Describe all eight dimensions of the Holistic Wellness Wheel and explain how neglecting one dimension (e.g., Financial or Environmental) can affect Physical and Emotional health.',
      answer: 'The 8 dimensions are Physical, Emotional, Social, Intellectual, Spiritual, Environmental, Occupational, and Financial. Neglecting financial or environmental wellness creates chronic stress, poor sleep, or unsafe living hazards that harm physical and emotional health.',
      concepts: ['physical', 'emotional', 'social', 'intellectual', 'spiritual', 'environmental', 'occupational', 'financial'],
    },
    {
      text: 'Explain how a caregiver can apply the 8-Dimension Wellness Wheel both when assessing a patient holistically and when auditing their own personal wellness.',
      answer: 'For patients, caregivers look beyond physical pain to social isolation, emotional distress, living safety, and spiritual comfort. For themselves, caregivers review sleep, stress, finances, and work balance monthly.',
      concepts: ['holistic assessment', 'patient care', 'self-audit', 'wellness wheel'],
    },
  ],
};

async function seedModulesAndQuizzes(prisma, { coursesByCode, programmeId, lecturerId }) {
  console.log('Seeding all 13 Modules, Extracted Topics, Essay Tests, Objective Quizzes & Final Exam...');

  // Clean existing topic assessments / extracted topics for fresh idempotent seed
  await prisma.topicAssessmentQuestion.deleteMany();
  await prisma.topicAssessmentAttempt.deleteMany();
  await prisma.topicAssessment.deleteMany();
  await prisma.topicQuestion.deleteMany();
  await prisma.topicSubtopic.deleteMany();
  await prisma.extractedTopic.deleteMany();

  const finalTestQuestions = [];
  const finalExamMcqs = [];

  for (const modDef of MODULE_DATA) {
    const course = coursesByCode[modDef.courseCode];
    if (!course) {
      console.warn('Course not found for', modDef.courseCode);
      continue;
    }

    const pdfRelPath = path.join('storage', 'pdfs', modDef.pdfFile);
    const pdfAbsPath = path.join(process.cwd(), pdfRelPath);
    let sizeLabel = '1500 KB';
    let pageCount = 5;
    let extractedPages = [];

    if (fs.existsSync(pdfAbsPath)) {
      const buf = fs.readFileSync(pdfAbsPath);
      sizeLabel = `${Math.round(buf.length / 1024)} KB`;
      try {
        const parsed = await pdfParse(buf);
        pageCount = parsed.numpages || 5;
        const cleanFull = (parsed.text || '').replace(/\s+/g, ' ').trim();
        extractedPages = [{ page: 1, text: cleanFull.slice(0, 12000) }];
      } catch (e) {
        extractedPages = [{ page: 1, text: modDef.description }];
      }
    }

    // Ensure CourseModule exists (reuse existing Module N if present, or create for 12 & 13)
    let courseModule = await prisma.courseModule.findFirst({
      where: { courseId: course.id, title: { startsWith: `Module ${modDef.num}:` } },
    });
    if (!courseModule) {
      courseModule = await prisma.courseModule.create({
        data: {
          courseId: course.id,
          title: modDef.title,
          orderIndex: modDef.num,
        },
      });
    } else if (courseModule.title !== modDef.title) {
      courseModule = await prisma.courseModule.update({
        where: { id: courseModule.id },
        data: { title: modDef.title },
      });
    }

    // Find or create LearningMaterial
    let material = await prisma.learningMaterial.findFirst({
      where: { courseId: course.id, fileName: modDef.pdfFile },
    });
    if (!material) {
      material = await prisma.learningMaterial.create({
        data: {
          courseId: course.id,
          title: modDef.title,
          description: modDef.description,
          programmeId,
          academicYear: '2025/2026',
          semester: 'First Semester',
          level: 'Level 100',
          category: modDef.num >= 12 ? 'Standalone Visual & Clinical Guide' : 'Lecture Notes & Visual Guide',
          fileType: 'PDF',
          fileName: modDef.pdfFile,
          fileUrl: `/api/admin/learning-materials/placeholder/pdf`,
          filePath: pdfRelPath,
          fileSize: sizeLabel,
          pageCount,
          extractedTextJson: JSON.stringify(extractedPages),
          processingStatus: 'COMPLETED',
          processedAt: new Date(),
          status: 'PUBLISHED',
          isDownloadable: true,
          uploadedById: lecturerId,
        },
      });
      await prisma.learningMaterial.update({
        where: { id: material.id },
        data: { fileUrl: `/api/admin/learning-materials/${material.id}/pdf` },
      });
    } else {
      await prisma.learningMaterial.update({
        where: { id: material.id },
        data: {
          title: modDef.title,
          description: modDef.description,
          fileSize: sizeLabel,
          pageCount,
          extractedTextJson: JSON.stringify(extractedPages),
          processingStatus: 'COMPLETED',
          processedAt: new Date(),
          status: 'PUBLISHED',
        },
      });
    }

    // Ensure CourseTopic exists for Modules 12 & 13
    const existingTopicCount = await prisma.courseTopic.count({ where: { moduleId: courseModule.id } });
    if (existingTopicCount === 0) {
      await prisma.courseTopic.create({
        data: {
          moduleId: courseModule.id,
          title: modDef.title,
          description: modDef.description,
          pdfUrl: `/api/admin/learning-materials/${material.id}/pdf`,
          durationMinutes: 45,
          orderIndex: 1,
        },
      });
    }

    // Create ExtractedTopic with full structured study notes
    const contentPayload = {
      introduction: modDef.description,
      learningObjectives: modDef.objectives,
      mainExplanation: `${modDef.description} ${modDef.summary}`,
      keyConcepts: modDef.keyConcepts,
      definitions: modDef.definitions,
      keyPoints: modDef.objectives,
      summary: modDef.summary,
      revisionNotes: `Review the ${modDef.title} PDF and focus on: ${modDef.keyConcepts.join(', ')}.`,
    };

    const extractedTopic = await prisma.extractedTopic.create({
      data: {
        materialId: material.id,
        courseId: course.id,
        programmeId,
        level: 'Level 100',
        semester: 'First Semester',
        title: modDef.title,
        description: modDef.description,
        summary: modDef.summary,
        contentJson: JSON.stringify(contentPayload),
        rawText: extractedPages[0]?.text || modDef.description,
        pageStart: 1,
        pageEnd: pageCount,
        orderIndex: modDef.num,
        confidence: 0.98,
        needsReview: false,
        status: 'PUBLISHED',
      },
    });

    // Subtopics
    for (let sIdx = 0; sIdx < modDef.keyConcepts.length; sIdx++) {
      await prisma.topicSubtopic.create({
        data: {
          topicId: extractedTopic.id,
          title: modDef.keyConcepts[sIdx],
          summary: `Core concept ${sIdx + 1} in ${modDef.title}.`,
          pageStart: 1,
          pageEnd: pageCount,
          orderIndex: sIdx + 1,
        },
      });
    }

    // 1. PART A: ESSAY TEST (created BEFORE Objectives per module)
    const moduleEssays = ESSAY_BANK[modDef.num] || [];
    const essayAssessment = await prisma.topicAssessment.create({
      data: {
        courseId: course.id,
        topicId: extractedTopic.id,
        topicIdsJson: JSON.stringify([extractedTopic.id]),
        title: `${modDef.title} — Part A: Essay Test`,
        assessmentType: 'TOPIC_QUIZ',
        instructions: `Written Essay Assessment for ${modDef.title}. Answer all ${moduleEssays.length} essay questions thoroughly before proceeding to the Objective Test. Pass mark: 50%.`,
        durationMinutes: 25,
        totalMarks: moduleEssays.length * 5,
        passMark: 50,
        maxAttempts: 5,
        randomizeQuestions: false,
        randomizeOptions: false,
        allowReview: true,
        showExplanations: true,
        status: 'PUBLISHED',
      },
    });

    for (let eIdx = 0; eIdx < moduleEssays.length; eIdx++) {
      const e = moduleEssays[eIdx];
      const createdEssayQ = await prisma.topicQuestion.create({
        data: {
          topicId: extractedTopic.id,
          courseId: course.id,
          questionType: 'ESSAY',
          difficulty: 'MEDIUM',
          questionText: e.text,
          optionsJson: null,
          correctAnswer: e.answer,
          expectedAnswer: e.answer,
          requiredConceptsJson: JSON.stringify(e.concepts),
          markingGuide: `Award full marks for clearly explaining: ${e.concepts.join(', ')}.`,
          explanation: e.answer,
          marks: 5,
          pageRef: '1',
          status: 'PUBLISHED',
          isAiGenerated: false,
        },
      });

      await prisma.topicAssessmentQuestion.create({
        data: {
          assessmentId: essayAssessment.id,
          questionId: createdEssayQ.id,
          orderIndex: eIdx + 1,
        },
      });

      if (eIdx === 0) {
        finalTestQuestions.push({ id: createdEssayQ.id, marks: 5 });
      }
    }

    // 2. PART B: OBJECTIVE TEST (MCQs & True/False)
    const objectiveQs = modDef.questions.filter((q) => ['MCQ', 'TRUE_FALSE'].includes(q.type));
    const assessment = await prisma.topicAssessment.create({
      data: {
        courseId: course.id,
        topicId: extractedTopic.id,
        topicIdsJson: JSON.stringify([extractedTopic.id]),
        title: `${modDef.title} — Part B: Objective Test`,
        assessmentType: 'TOPIC_QUIZ',
        instructions: `Objective Quiz for ${modDef.title}. Answer all ${objectiveQs.length} objective questions. Pass mark is 50%.`,
        durationMinutes: 15,
        totalMarks: objectiveQs.length * 2,
        passMark: 50,
        maxAttempts: 5,
        randomizeQuestions: false,
        randomizeOptions: false,
        allowReview: true,
        showExplanations: true,
        status: 'PUBLISHED',
      },
    });

    for (let qIdx = 0; qIdx < objectiveQs.length; qIdx++) {
      const q = objectiveQs[qIdx];
      const createdQ = await prisma.topicQuestion.create({
        data: {
          topicId: extractedTopic.id,
          courseId: course.id,
          questionType: q.type,
          difficulty: q.difficulty,
          questionText: q.text,
          optionsJson: q.options ? JSON.stringify(q.options) : null,
          correctAnswer: q.answer,
          expectedAnswer: null,
          markingGuide: q.explanation,
          explanation: q.explanation,
          marks: 2,
          pageRef: '1',
          status: 'PUBLISHED',
          isAiGenerated: false,
        },
      });

      await prisma.topicAssessmentQuestion.create({
        data: {
          assessmentId: assessment.id,
          questionId: createdQ.id,
          orderIndex: qIdx + 1,
        },
      });

      if (qIdx === 0) {
        finalTestQuestions.push({ id: createdQ.id, marks: 2 });
      }
      if (q.type === 'MCQ' && q.options && q.options.length >= 2) {
        finalExamMcqs.push({
          text: `[Module ${modDef.num}] ${q.text}`,
          options: q.options,
          answer: q.answer,
          explanation: q.explanation,
        });
      }
    }
  }

  // 3. FINAL COMPREHENSIVE TEST (After Completing All 13 Modules)
  const capstoneCourse = coursesByCode['CGV 103'] || Object.values(coursesByCode)[0];
  const firstTopic = await prisma.extractedTopic.findFirst({
    where: { status: 'PUBLISHED' },
    orderBy: { orderIndex: 'asc' },
  });

  if (capstoneCourse && finalTestQuestions.length > 0) {
    const finalTotalMarks = finalTestQuestions.reduce((sum, item) => sum + item.marks, 0);
    const finalAssessment = await prisma.topicAssessment.create({
      data: {
        courseId: capstoneCourse.id,
        topicId: firstTopic ? firstTopic.id : null,
        topicIdsJson: JSON.stringify([]),
        title: 'Diploma in Care Giving — Final Comprehensive Test (All 13 Modules)',
        assessmentType: 'COURSE_ASSESSMENT',
        instructions: 'Final end-of-programme test to be taken after completing all 13 modules. Includes both written Essay questions and Objective questions across Modules 1–13. Pass mark: 50%.',
        durationMinutes: 60,
        totalMarks: finalTotalMarks,
        passMark: 50,
        maxAttempts: 3,
        randomizeQuestions: false,
        randomizeOptions: false,
        allowReview: true,
        showExplanations: true,
        status: 'PUBLISHED',
      },
    });

    for (let i = 0; i < finalTestQuestions.length; i++) {
      await prisma.topicAssessmentQuestion.create({
        data: {
          assessmentId: finalAssessment.id,
          questionId: finalTestQuestions[i].id,
          orderIndex: i + 1,
          marksOverride: finalTestQuestions[i].marks,
        },
      });
    }

    // Also publish as a CBT Final Comprehensive Examination in /portal/student/exams
    const cbtQuestions = finalExamMcqs.slice(0, 26);
    const finalExam = await prisma.examination.create({
      data: {
        courseId: capstoneCourse.id,
        title: 'Diploma in Care Giving — Final Comprehensive Examination (Modules 1–13)',
        instructions: `Comprehensive CBT Final Examination covering all 13 modules of the Diploma in Care Giving. Answer all ${cbtQuestions.length} questions. Pass mark: 50%.`,
        venue: 'Action Health College CBT Center & Online Portal',
        durationMinutes: 60,
        totalMarks: cbtQuestions.length * 4,
        passMark: 50,
        scheduledDate: '2026-11-30',
        scheduledTime: '09:00 AM',
        status: 'ACTIVE',
        isPublished: true,
      },
    });

    for (let i = 0; i < cbtQuestions.length; i++) {
      const cq = cbtQuestions[i];
      await prisma.question.create({
        data: {
          examId: finalExam.id,
          orderIndex: i + 1,
          text: cq.text,
          optionsJson: JSON.stringify(cq.options),
          correctAnswer: cq.answer,
          explanation: cq.explanation,
          marks: 4,
        },
      });
    }
  }

  console.log(`✅ Seeded ${MODULE_DATA.length} modules with Essay Tests (before Objectives), Objective Quizzes, and Final Comprehensive Examination!`);
}

module.exports = { seedModulesAndQuizzes, MODULE_DATA };
