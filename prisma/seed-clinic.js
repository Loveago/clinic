/**
 * Idempotent seed script for Action Boat Medical Centre (Clinic Module).
 * Populates realistic Ghanaian clinic departments, services, diagnosis codes,
 * laboratory tests, pharmacy medicines + batches, imaging, procedures, and insurance providers.
 *
 * Usage:
 *   node prisma/seed-clinic.js
 */

const { PrismaClient } = require('@prisma/client');

process.env.DATABASE_URL ??= 'file:./dev.db';

const prisma = new PrismaClient();

async function ensureDepartment(data) {
  const existing = await prisma.clinicDepartment.findFirst({
    where: { name: data.name },
  });
  if (existing) {
    return prisma.clinicDepartment.update({
      where: { id: existing.id },
      data,
    });
  }
  return prisma.clinicDepartment.create({ data });
}

async function ensureService(data) {
  const existing = await prisma.clinicService.findFirst({
    where: { title: data.title },
  });
  if (existing) {
    return prisma.clinicService.update({
      where: { id: existing.id },
      data,
    });
  }
  return prisma.clinicService.create({ data });
}

async function ensureMedicineWithBatch(med) {
  let existing = await prisma.medicine.findFirst({
    where: { name: med.name },
  });
  if (!existing) {
    existing = await prisma.medicine.create({
      data: {
        name: med.name,
        genericName: med.genericName,
        brandName: med.brandName,
        category: med.category,
        dosageForm: med.dosageForm,
        strength: med.strength,
        route: med.route || 'Oral',
        unit: med.unit,
        purchasePrice: med.purchasePrice,
        sellingPrice: med.sellingPrice,
        reorderLevel: med.reorderLevel || 20,
        isActive: true,
      },
    });
  } else {
    existing = await prisma.medicine.update({
      where: { id: existing.id },
      data: {
        purchasePrice: med.purchasePrice,
        sellingPrice: med.sellingPrice,
        isActive: true,
      },
    });
  }

  for (const b of med.batches) {
    await prisma.medicineBatch.upsert({
      where: {
        medicineId_batchNumber: {
          medicineId: existing.id,
          batchNumber: b.batchNumber,
        },
      },
      update: {},
      create: {
        medicineId: existing.id,
        batchNumber: b.batchNumber,
        quantityReceived: b.quantity,
        quantityAvailable: b.quantity,
        expiryDate: b.expiryDate,
        purchaseDate: '2026-01-15',
        supplier: b.supplier || 'Ernest Chemists Ltd, Accra',
        unitCost: med.purchasePrice,
      },
    });
  }

  return existing;
}

async function main() {
  console.log('Seeding Action Boat Medical Centre clinic data...');

  // 1. Departments
  const deptDefs = [
    {
      name: 'General Practice & OPD',
      description: 'Outpatient consultations, acute care, chronic disease management, and family medicine.',
      headDoctor: 'Dr. Efua Mansa',
      room: 'OPD Wing A — Rooms 1-3',
      iconName: 'Stethoscope',
      isActive: true,
    },
    {
      name: 'Antenatal & Maternal Care',
      description: 'Antenatal clinics, postnatal follow-up, maternal screening, and midwifery services.',
      headDoctor: 'Midwife Akosua Boateng',
      room: 'Maternal Wing — Room 4',
      iconName: 'HeartPulse',
      isActive: true,
    },
    {
      name: 'Paediatrics & Child Health',
      description: 'Childhood illness consultations, growth monitoring, and routine immunizations.',
      headDoctor: 'Dr. Kofi Mensah',
      room: 'OPD Wing B — Room 5',
      iconName: 'Users',
      isActive: true,
    },
    {
      name: 'Laboratory & Diagnostics',
      description: 'Haematology, clinical chemistry, parasitology, serology, and rapid diagnostic testing.',
      headDoctor: 'MLS Yaw Boateng',
      room: 'Diagnostic Block — Lab 1',
      iconName: 'FlaskConical',
      isActive: true,
    },
    {
      name: 'Pharmacy & Dispensary',
      description: 'Prescription dispensing, patient counselling, and FEFO stock management.',
      headDoctor: 'Pharm. Nana Ama Darko',
      room: 'Ground Floor Dispensary',
      iconName: 'Pill',
      isActive: true,
    },
    {
      name: 'Imaging & Radiology',
      description: 'Digital X-Ray, obstetric & abdominal ultrasound, and 12-lead ECG.',
      headDoctor: 'Dr. Kwesi Appiah',
      room: 'Diagnostic Block — Imaging Suite',
      iconName: 'Scan',
      isActive: true,
    },
  ];

  const departments = {};
  for (const d of deptDefs) {
    const created = await ensureDepartment(d);
    departments[d.name] = created;
  }

  // 2. Clinic Services
  const serviceDefs = [
    {
      title: 'General OPD Consultation',
      category: 'Consultation',
      description: 'Comprehensive outpatient medical consultation with a Medical Officer.',
      iconName: 'Stethoscope',
      duration: '20 mins',
      feeGHS: 120.0,
      featured: true,
      departmentId: departments['General Practice & OPD'].id,
    },
    {
      title: 'Specialist Consultation',
      category: 'Consultation',
      description: 'Specialist review for complex or chronic medical conditions.',
      iconName: 'Stethoscope',
      duration: '30 mins',
      feeGHS: 220.0,
      featured: true,
      departmentId: departments['General Practice & OPD'].id,
    },
    {
      title: 'Antenatal Care (ANC) Visit',
      category: 'Maternal Care',
      description: 'Routine antenatal assessment, foetal heart monitoring, and maternal counselling.',
      iconName: 'HeartPulse',
      duration: '25 mins',
      feeGHS: 100.0,
      featured: true,
      departmentId: departments['Antenatal & Maternal Care'].id,
    },
    {
      title: 'Paediatric Consultation',
      category: 'Paediatrics',
      description: 'Outpatient medical consultation and growth check for infants and children.',
      iconName: 'Users',
      duration: '20 mins',
      feeGHS: 130.0,
      featured: false,
      departmentId: departments['Paediatrics & Child Health'].id,
    },
    {
      title: 'Triage & Vital Signs Check',
      category: 'Nursing',
      description: 'Blood pressure, temperature, pulse, SpO2, weight, height, and BMI assessment.',
      iconName: 'Activity',
      duration: '10 mins',
      feeGHS: 30.0,
      featured: false,
      departmentId: departments['General Practice & OPD'].id,
    },
    {
      title: 'Medical Fitness & Employment Screening',
      category: 'Screening',
      description: 'Pre-employment or school medical examination and certification.',
      iconName: 'FileText',
      duration: '30 mins',
      feeGHS: 180.0,
      featured: false,
      departmentId: departments['General Practice & OPD'].id,
    },
    {
      title: 'Hypertension & Diabetes Clinic Review',
      category: 'Chronic Care',
      description: 'Scheduled chronic care follow-up with blood pressure and glucometer check.',
      iconName: 'HeartPulse',
      duration: '20 mins',
      feeGHS: 90.0,
      featured: false,
      departmentId: departments['General Practice & OPD'].id,
    },
  ];

  for (const s of serviceDefs) {
    await ensureService(s);
  }

  // 3. Diagnosis Catalog (ICD-10)
  const diagnoses = [
    { code: 'B54', name: 'Uncomplicated Malaria', category: 'Infectious Diseases', description: 'Confirmed or clinical Plasmodium malaria without severity signs' },
    { code: 'B50.9', name: 'Plasmodium falciparum Malaria', category: 'Infectious Diseases', description: 'Severe or falciparum malaria' },
    { code: 'A01.0', name: 'Typhoid Fever (Enteric Fever)', category: 'Infectious Diseases', description: 'Salmonella typhi infection' },
    { code: 'J06.9', name: 'Acute Upper Respiratory Tract Infection (URTI)', category: 'Respiratory', description: 'Acute nasopharyngitis / pharyngitis / common cold' },
    { code: 'J18.9', name: 'Community-Acquired Pneumonia', category: 'Respiratory', description: 'Lower respiratory tract infection / pneumonia' },
    { code: 'I10', name: 'Essential (Primary) Hypertension', category: 'Cardiovascular', description: 'Elevated systemic arterial blood pressure' },
    { code: 'E11.9', name: 'Type 2 Diabetes Mellitus', category: 'Endocrine', description: 'Non-insulin-dependent diabetes mellitus' },
    { code: 'A09', name: 'Acute Gastroenteritis', category: 'Gastrointestinal', description: 'Infectious diarrhoea and vomiting' },
    { code: 'K27.9', name: 'Peptic Ulcer Disease / Gastritis', category: 'Gastrointestinal', description: 'Dyspepsia, gastritis, or peptic ulceration' },
    { code: 'N39.0', name: 'Urinary Tract Infection (UTI)', category: 'Genitourinary', description: 'Bacterial infection of the urinary tract' },
    { code: 'D50.9', name: 'Iron Deficiency Anaemia', category: 'Haematology', description: 'Microcytic hypochromic anaemia' },
    { code: 'Z34.9', name: 'Normal Antenatal Pregnancy Supervision', category: 'Maternal Care', description: 'Routine antenatal care follow-up' },
    { code: 'L30.9', name: 'Dermatitis / Skin Infection', category: 'Dermatology', description: 'Acute or chronic dermatitis' },
    { code: 'M54.5', name: 'Low Back Pain / Musculoskeletal Strain', category: 'Musculoskeletal', description: 'Mechanical low back pain' },
  ];

  for (const d of diagnoses) {
    await prisma.diagnosisCatalog.upsert({
      where: { code: d.code },
      update: { name: d.name, category: d.category, description: d.description, isActive: true },
      create: { ...d, isActive: true },
    });
  }

  // 4. Laboratory Test Catalog
  const labTests = [
    {
      code: 'MAL-RDT',
      name: 'Malaria Rapid Diagnostic Test (RDT)',
      category: 'Parasitology',
      description: 'Rapid antigen detection for Plasmodium falciparum / pan-malaria.',
      priceGHS: 35.0,
      sampleType: 'Whole Blood (Fingerprick / EDTA)',
      turnaroundHours: 1,
      referenceRangeText: 'Negative',
      unit: 'Qualitative',
    },
    {
      code: 'MAL-MPS',
      name: 'Malaria Parasite Microscopy (BF for MPS)',
      category: 'Parasitology',
      description: 'Thick and thin blood film microscopy with parasite density.',
      priceGHS: 40.0,
      sampleType: 'Whole Blood (EDTA)',
      turnaroundHours: 2,
      referenceRangeText: 'No malaria parasites seen',
      unit: 'parasites/µL',
    },
    {
      code: 'HEM-FBC',
      name: 'Full Blood Count (FBC)',
      category: 'Haematology',
      description: 'Hb, WBC, Platelets, RBC, MCV, Differential count.',
      priceGHS: 75.0,
      sampleType: 'Whole Blood (EDTA)',
      turnaroundHours: 3,
      referenceRangeText: 'Hb: 11.5-16.5 g/dL; WBC: 4.0-11.0; PLT: 150-400',
      unit: 'g/dL / 10^9/L',
    },
    {
      code: 'URI-RE',
      name: 'Urinalysis (Routine & Microscopy)',
      category: 'Clinical Pathology',
      description: 'Dipstick biochemistry and urine sediment microscopy.',
      priceGHS: 40.0,
      sampleType: 'Midstream Urine',
      turnaroundHours: 2,
      referenceRangeText: 'Protein: Neg; Glucose: Neg; Leukocytes: Neg; Nitrite: Neg',
      unit: 'Qualitative / HPF',
    },
    {
      code: 'CHEM-FBS',
      name: 'Fasting Blood Sugar (FBS)',
      category: 'Clinical Chemistry',
      description: 'Fasting plasma glucose measurement (8-12 hours fast).',
      priceGHS: 35.0,
      sampleType: 'Fluoride Oxalate / Capillary',
      preparationNotes: 'Fast for 8-12 hours (water allowed).',
      turnaroundHours: 1,
      referenceRangeText: '3.9 - 5.5',
      unit: 'mmol/L',
    },
    {
      code: 'CHEM-RBS',
      name: 'Random Blood Sugar (RBS)',
      category: 'Clinical Chemistry',
      description: 'Random capillary or venous blood glucose.',
      priceGHS: 30.0,
      sampleType: 'Whole Blood / Capillary',
      turnaroundHours: 1,
      referenceRangeText: '3.9 - 7.8',
      unit: 'mmol/L',
    },
    {
      code: 'SER-WIDAL',
      name: 'Widal Test (Typhoid Serology)',
      category: 'Serology',
      description: 'Salmonella typhi O and H agglutinin titres.',
      priceGHS: 45.0,
      sampleType: 'Serum',
      turnaroundHours: 2,
      referenceRangeText: '< 1:80 (Non-reactive)',
      unit: 'Titre',
    },
    {
      code: 'CHEM-LFT',
      name: 'Liver Function Test (LFT)',
      category: 'Clinical Chemistry',
      description: 'ALT, AST, ALP, GGT, Total & Direct Bilirubin, Albumin, Total Protein.',
      priceGHS: 140.0,
      sampleType: 'Serum (SST)',
      turnaroundHours: 6,
      referenceRangeText: 'ALT: 7-56 U/L; AST: 10-40 U/L; Bilirubin: < 21 µmol/L',
      unit: 'U/L / µmol/L',
    },
    {
      code: 'CHEM-KFT',
      name: 'Kidney Function Test (KFT / BUE & Cr)',
      category: 'Clinical Chemistry',
      description: 'Urea, Creatinine, Sodium, Potassium, Chloride, Bicarbonate.',
      priceGHS: 130.0,
      sampleType: 'Serum (SST)',
      turnaroundHours: 6,
      referenceRangeText: 'Creatinine: 53-115 µmol/L; Urea: 2.5-7.1 mmol/L',
      unit: 'µmol/L / mmol/L',
    },
    {
      code: 'CHEM-LIPID',
      name: 'Lipid Profile',
      category: 'Clinical Chemistry',
      description: 'Total Cholesterol, HDL, LDL, Triglycerides.',
      priceGHS: 120.0,
      sampleType: 'Serum (Fasting)',
      preparationNotes: 'Fasting 10-12 hours recommended.',
      turnaroundHours: 6,
      referenceRangeText: 'Total Chol < 5.2 mmol/L; LDL < 3.4 mmol/L',
      unit: 'mmol/L',
    },
    {
      code: 'SER-HBSAG',
      name: 'Hepatitis B Surface Antigen (HBsAg)',
      category: 'Serology',
      description: 'Rapid immunochromatographic screening for Hepatitis B.',
      priceGHS: 45.0,
      sampleType: 'Serum / Plasma',
      turnaroundHours: 1,
      referenceRangeText: 'Non-Reactive',
      unit: 'Qualitative',
    },
    {
      code: 'HEM-SICKLE',
      name: 'Sickling Test & Hb Genotype',
      category: 'Haematology',
      description: 'Sickling screen and haemoglobin electrophoresis.',
      priceGHS: 65.0,
      sampleType: 'Whole Blood (EDTA)',
      turnaroundHours: 12,
      referenceRangeText: 'Negative / AA',
      unit: 'Genotype',
    },
    {
      code: 'HEM-BG',
      name: 'Blood Grouping & Rhesus Factor',
      category: 'Haematology',
      description: 'ABO and Rh(D) blood group determination.',
      priceGHS: 35.0,
      sampleType: 'Whole Blood (EDTA)',
      turnaroundHours: 1,
      referenceRangeText: 'A/B/AB/O Rh Pos or Neg',
      unit: 'Group',
    },
    {
      code: 'SER-UPT',
      name: 'Urine Pregnancy Test (UPT)',
      category: 'Serology',
      description: 'Qualitative beta-hCG urine pregnancy test.',
      priceGHS: 30.0,
      sampleType: 'Urine',
      turnaroundHours: 1,
      referenceRangeText: 'Negative / Positive',
      unit: 'Qualitative',
    },
  ];

  for (const t of labTests) {
    await prisma.labTestCatalog.upsert({
      where: { code: t.code },
      update: { ...t, isActive: true },
      create: { ...t, isActive: true },
    });
  }

  // 5. Pharmacy Medicines + Batches
  const medicines = [
    {
      name: 'Artemether-Lumefantrine 20/120mg',
      genericName: 'Artemether + Lumefantrine',
      brandName: 'Coartem / Lonart',
      category: 'Antimalarial',
      dosageForm: 'Tablet',
      strength: '20mg/120mg',
      unit: 'Tab',
      purchasePrice: 1.5,
      sellingPrice: 3.0,
      reorderLevel: 48,
      batches: [
        { batchNumber: 'AL-2026-01', quantity: 240, expiryDate: '2027-08-31' },
      ],
    },
    {
      name: 'Paracetamol 500mg',
      genericName: 'Paracetamol',
      brandName: 'Panadol / Para-Denk',
      category: 'Analgesic & Antipyretic',
      dosageForm: 'Tablet',
      strength: '500mg',
      unit: 'Tab',
      purchasePrice: 0.25,
      sellingPrice: 0.6,
      reorderLevel: 100,
      batches: [
        { batchNumber: 'PCM-2026-01', quantity: 500, expiryDate: '2028-03-31' },
      ],
    },
    {
      name: 'Amoxicillin 500mg',
      genericName: 'Amoxicillin',
      brandName: 'Amoxil',
      category: 'Antibiotic',
      dosageForm: 'Capsule',
      strength: '500mg',
      unit: 'Cap',
      purchasePrice: 0.9,
      sellingPrice: 2.0,
      reorderLevel: 60,
      batches: [
        { batchNumber: 'AMX-2026-01', quantity: 300, expiryDate: '2027-11-30' },
      ],
    },
    {
      name: 'Amoxicillin-Clavulanate 625mg',
      genericName: 'Co-amoxiclav',
      brandName: 'Augmentin',
      category: 'Antibiotic',
      dosageForm: 'Tablet',
      strength: '625mg',
      unit: 'Tab',
      purchasePrice: 4.5,
      sellingPrice: 8.5,
      reorderLevel: 30,
      batches: [
        { batchNumber: 'AUG-2026-01', quantity: 140, expiryDate: '2027-09-30' },
      ],
    },
    {
      name: 'Metronidazole 400mg',
      genericName: 'Metronidazole',
      brandName: 'Flagyl',
      category: 'Antibiotic / Antiprotozoal',
      dosageForm: 'Tablet',
      strength: '400mg',
      unit: 'Tab',
      purchasePrice: 0.45,
      sellingPrice: 1.0,
      reorderLevel: 60,
      batches: [
        { batchNumber: 'MTZ-2026-01', quantity: 250, expiryDate: '2027-12-31' },
      ],
    },
    {
      name: 'Ciprofloxacin 500mg',
      genericName: 'Ciprofloxacin',
      brandName: 'Cipro',
      category: 'Antibiotic',
      dosageForm: 'Tablet',
      strength: '500mg',
      unit: 'Tab',
      purchasePrice: 1.8,
      sellingPrice: 3.5,
      reorderLevel: 40,
      batches: [
        { batchNumber: 'CIP-2026-01', quantity: 180, expiryDate: '2027-10-31' },
      ],
    },
    {
      name: 'Omeprazole 20mg',
      genericName: 'Omeprazole',
      brandName: 'Losec',
      category: 'Gastrointestinal (PPI)',
      dosageForm: 'Capsule',
      strength: '20mg',
      unit: 'Cap',
      purchasePrice: 0.8,
      sellingPrice: 1.8,
      reorderLevel: 50,
      batches: [
        { batchNumber: 'OMP-2026-01', quantity: 220, expiryDate: '2028-01-31' },
      ],
    },
    {
      name: 'Amlodipine 5mg',
      genericName: 'Amlodipine Besylate',
      brandName: 'Norvasc',
      category: 'Antihypertensive',
      dosageForm: 'Tablet',
      strength: '5mg',
      unit: 'Tab',
      purchasePrice: 1.0,
      sellingPrice: 2.2,
      reorderLevel: 60,
      batches: [
        { batchNumber: 'AML-2026-01', quantity: 300, expiryDate: '2028-02-28' },
      ],
    },
    {
      name: 'Metformin 500mg',
      genericName: 'Metformin HCl',
      brandName: 'Glucophage',
      category: 'Antidiabetic',
      dosageForm: 'Tablet',
      strength: '500mg',
      unit: 'Tab',
      purchasePrice: 0.7,
      sellingPrice: 1.5,
      reorderLevel: 60,
      batches: [
        { batchNumber: 'MET-2026-01', quantity: 320, expiryDate: '2028-04-30' },
      ],
    },
    {
      name: 'Ferrous Sulfate + Folic Acid',
      genericName: 'Iron + Folic Acid',
      brandName: 'Fefol',
      category: 'Haematinic / Maternal',
      dosageForm: 'Tablet',
      strength: '200mg/0.4mg',
      unit: 'Tab',
      purchasePrice: 0.4,
      sellingPrice: 0.9,
      reorderLevel: 80,
      batches: [
        { batchNumber: 'FEF-2026-01', quantity: 400, expiryDate: '2028-05-31' },
      ],
    },
    {
      name: 'ORS (Oral Rehydration Salts)',
      genericName: 'Low-Osmolarity ORS',
      brandName: 'WHO-ORS',
      category: 'Rehydration',
      dosageForm: 'Sachet',
      strength: '20.5g',
      unit: 'Sachet',
      purchasePrice: 1.2,
      sellingPrice: 2.5,
      reorderLevel: 50,
      batches: [
        { batchNumber: 'ORS-2026-01', quantity: 200, expiryDate: '2028-06-30' },
      ],
    },
    {
      name: 'Ibuprofen 400mg',
      genericName: 'Ibuprofen',
      brandName: 'Brufen',
      category: 'NSAID / Analgesic',
      dosageForm: 'Tablet',
      strength: '400mg',
      unit: 'Tab',
      purchasePrice: 0.4,
      sellingPrice: 1.0,
      reorderLevel: 80,
      batches: [
        { batchNumber: 'IBU-2026-01', quantity: 350, expiryDate: '2028-01-31' },
      ],
    },
  ];

  for (const med of medicines) {
    await ensureMedicineWithBatch(med);
  }

  // 6. Imaging Catalog
  const imagingItems = [
    { code: 'IMG-CXR', name: 'Chest X-Ray (PA View)', modality: 'X-Ray', description: 'Standard posterior-anterior chest radiograph.', priceGHS: 140.0, turnaroundHours: 4 },
    { code: 'IMG-ABDUS', name: 'Abdominal Ultrasound Scan', modality: 'Ultrasound', description: 'Liver, gallbladder, kidneys, spleen, and pancreas scan.', preparationNotes: 'Fast 6 hours before scan; full bladder if pelvic included.', priceGHS: 180.0, turnaroundHours: 2 },
    { code: 'IMG-OBSUS', name: 'Obstetric / Pelvic Ultrasound', modality: 'Ultrasound', description: 'Foetal biometry, gestational age, placenta & pelvic assessment.', priceGHS: 160.0, turnaroundHours: 2 },
    { code: 'IMG-ECG', name: '12-Lead Electrocardiogram (ECG)', modality: 'ECG', description: 'Resting 12-lead cardiac rhythm and ischaemia tracing.', priceGHS: 110.0, turnaroundHours: 1 },
    { code: 'IMG-LIMBXR', name: 'Limb / Joint X-Ray (AP & Lateral)', modality: 'X-Ray', description: 'Orthopaedic radiograph for fracture or joint assessment.', priceGHS: 130.0, turnaroundHours: 4 },
  ];

  for (const img of imagingItems) {
    await prisma.imagingCatalog.upsert({
      where: { code: img.code },
      update: { ...img, isActive: true },
      create: { ...img, isActive: true },
    });
  }

  // 7. Procedure Catalog
  const procedures = [
    { code: 'PROC-DRESS', name: 'Wound Dressing & Debridement', category: 'Nursing Procedure', description: 'Sterile wound cleansing, debridement, and dressing.', priceGHS: 60.0 },
    { code: 'PROC-SUTURE', name: 'Laceration Suturing (Minor)', category: 'Minor Surgery', description: 'Local anaesthesia, wound irrigation, and suturing.', priceGHS: 150.0 },
    { code: 'PROC-IVF', name: 'IV Cannulation & Fluid Therapy', category: 'Nursing Procedure', description: 'Intravenous line insertion and infusion monitoring.', priceGHS: 85.0 },
    { code: 'PROC-NEB', name: 'Nebulization Therapy', category: 'Respiratory Care', description: 'Bronchodilator nebulization session.', priceGHS: 50.0 },
    { code: 'PROC-IND', name: 'Incision & Drainage (Abscess)', category: 'Minor Surgery', description: 'Sterile incision, drainage, and packing under local anaesthesia.', priceGHS: 180.0 },
    { code: 'PROC-EAR', name: 'Ear Syringing / Wax Removal', category: 'ENT Procedure', description: 'Gentle warm saline ear irrigation.', priceGHS: 70.0 },
  ];

  for (const p of procedures) {
    await prisma.procedureCatalog.upsert({
      where: { code: p.code },
      update: { ...p, isActive: true },
      create: { ...p, isActive: true },
    });
  }

  // 8. Insurance Providers
  const providers = [
    { code: 'NHIS', name: 'National Health Insurance Scheme (NHIS)', providerType: 'PUBLIC', contactPhone: '+233 30 223 0000' },
    { code: 'ACACIA', name: 'Acacia Health Insurance', providerType: 'PRIVATE', contactPhone: '+233 30 274 4400' },
    { code: 'GLICO', name: 'GLICO Healthcare', providerType: 'PRIVATE', contactPhone: '+233 30 221 8500' },
    { code: 'PREMIER', name: 'Premier Health Insurance', providerType: 'PRIVATE', contactPhone: '+233 30 278 0100' },
    { code: 'NATIONWIDE', name: 'Nationwide Medical Insurance', providerType: 'CORPORATE', contactPhone: '+233 30 276 9200' },
  ];

  for (const prov of providers) {
    await prisma.insuranceProvider.upsert({
      where: { code: prov.code },
      update: { ...prov, isActive: true },
      create: { ...prov, isActive: true },
    });
  }

  // 9. Sample Wards & Beds (idempotent)
  const wardDefs = [
    { name: 'Observation & Day Care Ward', wardType: 'GENERAL', capacity: 4, prefix: 'OBS' },
    { name: 'Maternity & Postnatal Ward', wardType: 'MATERNITY', capacity: 4, prefix: 'MAT' },
  ];

  for (const w of wardDefs) {
    const ward = await prisma.ward.upsert({
      where: { name: w.name },
      update: { wardType: w.wardType, capacity: w.capacity, isActive: true },
      create: { name: w.name, wardType: w.wardType, capacity: w.capacity, isActive: true },
    });
    for (let i = 1; i <= w.capacity; i++) {
      const bedNumber = `${w.prefix}-B${i}`;
      await prisma.bed.upsert({
        where: { wardId_bedNumber: { wardId: ward.id, bedNumber } },
        update: {},
        create: { wardId: ward.id, bedNumber, status: 'AVAILABLE' },
      });
    }
  }

  console.log('Clinic seed completed successfully!');
}

main()
  .catch((err) => {
    console.error('Clinic seed failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
