'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Activity,
  Users,
  Calendar,
  ListOrdered,
  Stethoscope,
  Pill,
  FlaskConical,
  CreditCard,
  Building2,
  BarChart3,
  Plus,
  Search,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Upload,
  Download,
  RefreshCw,
  ArrowLeft,
  Menu,
  X,
  Clock,
  Printer,
  ShieldAlert,
  LogOut,
  ExternalLink,
  Shield,
  HeartPulse,
  Scan,
} from 'lucide-react';
import PatientEmrWorkspace from '@/components/PatientEmrWorkspace';
import ClinicTriageAndDiagnostics from '@/components/ClinicTriageAndDiagnostics';
import ClinicBillingWorkspace from '@/components/ClinicBillingWorkspace';

type ClinicTab =
  | 'dashboard'
  | 'queue'
  | 'patients'
  | 'triage'
  | 'appointments'
  | 'consultations'
  | 'diagnostics'
  | 'pharmacy'
  | 'lab'
  | 'billing'
  | 'catalog'
  | 'reports';

export default function ClinicManagementConsole() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [tab, setTab] = useState<ClinicTab>('dashboard');
  const [mobileNav, setMobileNav] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null);

  const [selectedDate, setSelectedDate] = useState(() =>
    new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Accra' }).format(new Date())
  );

  // Core data states
  const [dashboard, setDashboard] = useState<any>(null);
  const [patients, setPatients] = useState<any[]>([]);
  const [patientSearch, setPatientSearch] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [emrPatientId, setEmrPatientId] = useState<string | null>(null);
  const [queue, setQueue] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [consultations, setConsultations] = useState<any[]>([]);
  const [pharmacy, setPharmacy] = useState<any>(null);
  const [lab, setLab] = useState<any>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [catalog, setCatalog] = useState<any>(null);
  const [reports, setReports] = useState<any>(null);

  // Modals & Forms
  const [showPatientModal, setShowPatientModal] = useState(false);
  const [patientForm, setPatientForm] = useState({
    id: '',
    fullName: '',
    phone: '+233',
    email: '',
    dateOfBirth: '',
    gender: 'Female',
    maritalStatus: '',
    occupation: '',
    ghanaCardNumber: '',
    address: '',
    townCity: '',
    region: '',
    bloodGroup: '',
    genotype: '',
    heightCm: '',
    weightKg: '',
    allergies: '',
    chronicConditions: '',
    insuranceProviderCode: '',
    insuranceNumber: '',
    nextOfKinName: '',
    nextOfKinPhone: '',
    nextOfKinRelation: '',
    emergencyName: '',
    emergencyPhone: '+233',
    emergencyRelation: '',
  });
  const [labSearch, setLabSearch] = useState('');
  const [labStatusFilter, setLabStatusFilter] = useState('ALL');
  const [printLabReport, setPrintLabReport] = useState<any>(null);
  const [selectedConsultId, setSelectedConsultId] = useState<string | null>(null);
  const [consultPatientDetail, setConsultPatientDetail] = useState<any>(null);

  const [showApptModal, setShowApptModal] = useState(false);
  const [apptForm, setApptForm] = useState({
    patientId: '',
    departmentId: '',
    serviceId: '',
    staffId: '',
    preferredDate: selectedDate,
    preferredTime: '09:00',
    reason: '',
    status: 'CONFIRMED',
  });

  const [showConsultModal, setShowConsultModal] = useState(false);
  const [consultForm, setConsultForm] = useState({
    id: '',
    queueId: '',
    patientId: '',
    chiefComplaint: '',
    hpi: '',
    examFindings: '',
    treatmentPlan: '',
    internalNotes: '',
    bpSystolic: '120',
    bpDiastolic: '80',
    temperatureC: '36.8',
    pulseBpm: '76',
    spo2Percent: '98',
    weightKg: '68',
    heightCm: '168',
    diagnosisTitle: '',
    diagnosisCode: '',
    completeNow: false,
    amendReason: '',
  });

  const [showRxModal, setShowRxModal] = useState(false);
  const [rxForm, setRxForm] = useState({
    consultationId: '',
    patientId: '',
    medicineId: '',
    medicineName: '',
    dosage: '500mg',
    frequency: 'TDS',
    duration: '5 days',
    quantityPrescribed: 15,
    instructions: 'Take after meals',
  });

  const [showLabReqModal, setShowLabReqModal] = useState(false);
  const [labReqForm, setLabReqForm] = useState({
    patientId: '',
    consultationId: '',
    testId: '',
    priority: 'ROUTINE',
    clinicalNotes: '',
  });

  const [showLabResultModal, setShowLabResultModal] = useState<any>(null);
  const [labResultForm, setLabResultForm] = useState({
    resultValue: '',
    unit: '',
    referenceRange: '',
    flag: 'NORMAL',
    observations: '',
  });

  const [showMedicineModal, setShowMedicineModal] = useState(false);
  const [medForm, setMedForm] = useState({
    name: '',
    genericName: '',
    category: 'Antibiotics',
    dosageForm: 'Tablet',
    strength: '500mg',
    sellingPrice: 15,
    reorderLevel: 20,
  });

  const [showBatchModal, setShowBatchModal] = useState<any>(null);
  const [batchForm, setBatchForm] = useState({
    batchNumber: '',
    quantity: 100,
    expiryDate: '2027-12-31',
    supplier: 'Ernest Chemists Ltd',
    unitCost: 8,
  });

  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [invoiceForm, setInvoiceForm] = useState({
    patientId: '',
    title: 'Clinic Visit & Services',
    itemType: 'CONSULTATION',
    description: 'General Outpatient Consultation',
    quantity: 1,
    unitPrice: 150,
    discountAmount: 0,
  });

  const [showPayModal, setShowPayModal] = useState<any>(null);
  const [payForm, setPayForm] = useState({
    amount: 0,
    method: 'Mobile Money (MTN/Telecel)',
  });

  const [showStaffModal, setShowStaffModal] = useState(false);
  const [staffForm, setStaffForm] = useState({
    name: '',
    email: '',
    phone: '+233',
    clinicRole: 'DOCTOR',
    departmentId: '',
    specialty: '',
    licenseNumber: '',
  });

  const notify = (msg: string, type: 'ok' | 'err' = 'ok') => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4500);
  };

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const meRes = await fetch('/api/auth/me');
      if (meRes.status === 401 || meRes.status === 403) {
        router.replace('/auth/login');
        return;
      }
      const meData = await meRes.json();
      const allowedRoles = [
        'CLINIC_SUPER_ADMIN',
        'CLINIC_ADMIN',
        'RECEPTIONIST',
        'DOCTOR',
        'NURSE',
        'MIDWIFE',
        'PHARMACIST',
        'LAB_TECH',
        'RADIOLOGY_STAFF',
        'CASHIER',
        'RECORDS_OFFICER',
      ];
      const hasClinicProfile = Boolean(meData?.user?.clinicStaffProfile?.isActive);
      if (!meData?.user || (!allowedRoles.includes(meData.user.role) && !hasClinicProfile)) {
        router.replace('/auth/login');
        return;
      }
      setCurrentUser(meData.user);

      const [dashR, patR, qR, apptR, consR, pharmR, labR, invR, catR, repR] = await Promise.all([
        fetch(`/api/clinic/dashboard?date=${selectedDate}`),
        fetch(`/api/clinic/patients?search=${encodeURIComponent(patientSearch)}`),
        fetch(`/api/clinic/queue?date=${selectedDate}`),
        fetch(`/api/clinic/appointments`),
        fetch(`/api/clinic/consultations`),
        fetch(`/api/clinic/pharmacy`),
        fetch(`/api/clinic/lab`),
        fetch(`/api/clinic/billing`),
        fetch(`/api/clinic/catalog`),
        fetch(`/api/clinic/reports`),
      ]);
      if (
        dashR.status === 401 ||
        dashR.status === 403 ||
        patR.status === 401 ||
        qR.status === 401
      ) {
        router.replace('/auth/login');
        return;
      }
      setAuthChecked(true);
      if (dashR.ok) setDashboard(await dashR.json());
      if (patR.ok) setPatients((await patR.json()).patients || []);
      if (qR.ok) setQueue((await qR.json()).entries || []);
      if (apptR.ok) setAppointments((await apptR.json()).appointments || []);
      if (consR.ok) setConsultations((await consR.json()).consultations || []);
      if (pharmR.ok) setPharmacy(await pharmR.json());
      if (labR.ok) setLab(await labR.json());
      if (invR.ok) setInvoices((await invR.json()).invoices || []);
      if (catR.ok) setCatalog(await catR.json());
      if (repR.ok) setReports(await repR.json());
    } finally {
      setLoading(false);
    }
  }, [selectedDate, patientSearch, router]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const loadPatientDetail = async (id: string) => {
    const res = await fetch(`/api/clinic/patients/${id}`);
    const data = await res.json();
    if (res.ok) setSelectedPatient(data.patient);
  };

  const loadConsultPatientDetail = async (patientId: string) => {
    if (!patientId) return;
    const res = await fetch(`/api/clinic/patients/${patientId}`);
    const data = await res.json();
    if (res.ok) setConsultPatientDetail(data.patient);
  };

  const resetPatientForm = () => {
    setPatientForm({
      id: '',
      fullName: '',
      phone: '+233',
      email: '',
      dateOfBirth: '',
      gender: 'Female',
      maritalStatus: '',
      occupation: '',
      ghanaCardNumber: '',
      address: '',
      townCity: '',
      region: '',
      bloodGroup: '',
      genotype: '',
      heightCm: '',
      weightKg: '',
      allergies: '',
      chronicConditions: '',
      insuranceProviderCode: '',
      insuranceNumber: '',
      nextOfKinName: '',
      nextOfKinPhone: '',
      nextOfKinRelation: '',
      emergencyName: '',
      emergencyPhone: '+233',
      emergencyRelation: '',
    });
  };

  const openEditPatientModal = (p: any) => {
    const geno = p.identifiers?.find((i: any) => i.identifierType === 'GENOTYPE')?.identifierValue || '';
    const latestTriage = p.triageRecords?.[0];
    const primaryIns = p.insurances?.[0];
    setPatientForm({
      id: p.id || '',
      fullName: p.fullName || '',
      phone: p.phone || '+233',
      email: p.email || '',
      dateOfBirth: p.dateOfBirth || '',
      gender: p.gender || 'Female',
      maritalStatus: p.maritalStatus || '',
      occupation: p.occupation || '',
      ghanaCardNumber: p.ghanaCardNumber || '',
      address: p.address || '',
      townCity: p.townCity || '',
      region: p.region || '',
      bloodGroup: p.bloodGroup || '',
      genotype: geno,
      heightCm: latestTriage?.heightCm ? String(latestTriage.heightCm) : '',
      weightKg: latestTriage?.weightKg ? String(latestTriage.weightKg) : '',
      allergies: p.allergies || '',
      chronicConditions: p.chronicConditions || '',
      insuranceProviderCode: primaryIns?.provider?.code || '',
      insuranceNumber: primaryIns?.membershipNumber || '',
      nextOfKinName: p.nextOfKinName || '',
      nextOfKinPhone: p.nextOfKinPhone || '',
      nextOfKinRelation: p.nextOfKinRelation || '',
      emergencyName: p.emergencyName || '',
      emergencyPhone: p.emergencyPhone || '+233',
      emergencyRelation: p.emergencyRelation || '',
    });
    setShowPatientModal(true);
  };

  const calcPatientFormBmi = () => {
    const w = Number(patientForm.weightKg);
    const h = Number(patientForm.heightCm) / 100;
    if (!w || !h) return '—';
    return (w / (h * h)).toFixed(1);
  };

  const handleRegisterPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const isEdit = Boolean(patientForm.id);
      const res = await fetch('/api/clinic/patients', {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patientForm),
      });
      const data = await res.json();
      if (!res.ok) {
        notify(data.error || 'Save patient failed', 'err');
      } else {
        notify(isEdit ? `Updated patient ${data.patient.patientNumber}` : `Registered patient ${data.patient.patientNumber}`);
        setShowPatientModal(false);
        resetPatientForm();
        await loadAll();
        if (isEdit && selectedPatient?.id === data.patient.id) {
          await loadPatientDetail(data.patient.id);
        }
      }
    } finally {
      setBusy(false);
    }
  };

  const handleCheckIn = async (patientId: string, appointmentId?: string, priority = 'NORMAL') => {
    setBusy(true);
    try {
      const res = await fetch('/api/clinic/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientId, appointmentId, priority }),
      });
      const data = await res.json();
      if (!res.ok) notify(data.error || 'Check-in failed', 'err');
      else {
        notify(`Checked in: Queue #${data.entry.queueNumber}`);
        await loadAll();
      }
    } finally {
      setBusy(false);
    }
  };

  const handleQueueAction = async (id: string, action?: string, priority?: string) => {
    setBusy(true);
    try {
      const res = await fetch('/api/clinic/queue', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action, priority }),
      });
      if (res.ok) {
        notify('Queue updated.');
        await loadAll();
      }
    } finally {
      setBusy(false);
    }
  };

  const handleCreateAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch('/api/clinic/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(apptForm),
      });
      const data = await res.json();
      if (!res.ok) notify(data.error || 'Booking failed', 'err');
      else {
        notify('Appointment scheduled.');
        setShowApptModal(false);
        await loadAll();
      }
    } finally {
      setBusy(false);
    }
  };

  const handleSaveConsultation = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const isExisting = Boolean(consultForm.id);
      const existingObj = consultations.find((c) => c.id === consultForm.id);
      const isCompleted = existingObj?.status === 'COMPLETED';
      const payload: any = {
        id: consultForm.id || undefined,
        queueId: consultForm.queueId || undefined,
        patientId: consultForm.patientId,
        chiefComplaint: consultForm.chiefComplaint,
        hpi: consultForm.hpi,
        examFindings: consultForm.examFindings,
        treatmentPlan: consultForm.treatmentPlan,
        internalNotes: consultForm.internalNotes,
        completeNow: consultForm.completeNow,
        action: isCompleted ? 'amend' : consultForm.completeNow ? 'complete' : undefined,
        reason: isCompleted ? consultForm.amendReason : undefined,
        vitals: {
          bpSystolic: Number(consultForm.bpSystolic) || null,
          bpDiastolic: Number(consultForm.bpDiastolic) || null,
          temperatureC: Number(consultForm.temperatureC) || null,
          pulseBpm: Number(consultForm.pulseBpm) || null,
          spo2Percent: Number(consultForm.spo2Percent) || null,
          weightKg: Number(consultForm.weightKg) || null,
          heightCm: Number(consultForm.heightCm) || null,
        },
        diagnoses: consultForm.diagnosisTitle
          ? [{ title: consultForm.diagnosisTitle, code: consultForm.diagnosisCode, isPrimary: true }]
          : [],
      };
      const res = await fetch('/api/clinic/consultations', {
        method: isExisting ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) notify(data.error || 'Consultation save failed', 'err');
      else {
        notify(isCompleted ? 'Consultation amended with audit trail.' : 'Consultation saved.');
        setShowConsultModal(false);
        await loadAll();
      }
    } finally {
      setBusy(false);
    }
  };

  const handleIssueRx = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const selectedMed = pharmacy?.medicines?.find((m: any) => m.id === rxForm.medicineId);
      const res = await fetch('/api/clinic/prescriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          consultationId: rxForm.consultationId,
          patientId: rxForm.patientId,
          items: [
            {
              medicineId: rxForm.medicineId || null,
              medicineName: selectedMed?.name || rxForm.medicineName,
              dosage: rxForm.dosage,
              frequency: rxForm.frequency,
              duration: rxForm.duration,
              quantityPrescribed: Number(rxForm.quantityPrescribed),
              instructions: rxForm.instructions,
            },
          ],
        }),
      });
      const data = await res.json();
      if (!res.ok) notify(data.error || 'Prescription failed', 'err');
      else {
        notify(`Issued ${data.prescription.prescriptionNumber}`);
        setShowRxModal(false);
        await loadAll();
      }
    } finally {
      setBusy(false);
    }
  };

  const handleRequestLab = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch('/api/clinic/lab', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(labReqForm),
      });
      const data = await res.json();
      if (!res.ok) notify(data.error || 'Lab request failed', 'err');
      else {
        notify(`Requested ${data.request.requestNumber}`);
        setShowLabReqModal(false);
        await loadAll();
      }
    } finally {
      setBusy(false);
    }
  };

  const handleSaveLabResult = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showLabResultModal) return;
    setBusy(true);
    try {
      const res = await fetch('/api/clinic/lab', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: showLabResultModal.id,
          action: 'enter_result',
          ...labResultForm,
        }),
      });
      const data = await res.json();
      if (!res.ok) notify(data.error || 'Failed to save result', 'err');
      else {
        notify('Laboratory result entered.');
        setShowLabResultModal(null);
        await loadAll();
      }
    } finally {
      setBusy(false);
    }
  };

  const handleDispenseRx = async (rx: any) => {
    setBusy(true);
    try {
      const items = rx.items
        .filter((i: any) => i.quantityPrescribed > i.quantityDispensed)
        .map((i: any) => ({
          prescriptionItemId: i.id,
          quantity: i.quantityPrescribed - i.quantityDispensed,
        }));
      const res = await fetch('/api/clinic/pharmacy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'dispense', prescriptionId: rx.id, items }),
      });
      const data = await res.json();
      if (!res.ok) notify(data.error || 'Dispensing failed', 'err');
      else {
        notify(`Dispensed ${rx.prescriptionNumber}`);
        await loadAll();
      }
    } finally {
      setBusy(false);
    }
  };

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch('/api/clinic/billing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: invoiceForm.patientId,
          title: invoiceForm.title,
          discountAmount: Number(invoiceForm.discountAmount) || 0,
          items: [
            {
              itemType: invoiceForm.itemType,
              description: invoiceForm.description,
              quantity: Number(invoiceForm.quantity) || 1,
              unitPrice: Number(invoiceForm.unitPrice) || 0,
            },
          ],
        }),
      });
      const data = await res.json();
      if (!res.ok) notify(data.error || 'Failed to generate invoice', 'err');
      else {
        notify(`Invoice ${data.invoice.invoiceNumber} generated`);
        setShowInvoiceModal(false);
        await loadAll();
      }
    } finally {
      setBusy(false);
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showPayModal) return;
    setBusy(true);
    try {
      const res = await fetch('/api/clinic/billing', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'record_payment',
          invoiceId: showPayModal.id,
          amount: Number(payForm.amount),
          method: payForm.method,
        }),
      });
      const data = await res.json();
      if (!res.ok) notify(data.error || 'Payment recording failed', 'err');
      else {
        notify(`Payment recorded (Receipt ${data.payment.receiptNumber})`);
        setShowPayModal(null);
        await loadAll();
      }
    } finally {
      setBusy(false);
    }
  };

  const waitingQueueCount = queue.filter((q) => q.status === 'WAITING' || q.status === 'CALLED').length;
  const pendingLabCount = (lab?.requests || []).filter((r: any) => r.status !== 'REVIEWED' && r.status !== 'CANCELLED').length;
  const pharmacyAlertCount = (pharmacy?.alerts?.lowStockCount || 0) + (pharmacy?.alerts?.expiringSoonCount || 0);
  const unpaidInvoiceCount = invoices.filter((i) => i.status !== 'PAID' && i.status !== 'CANCELLED' && i.status !== 'REFUNDED').length;

  const navItems: Array<{ id: ClinicTab; label: string; icon: any; badge?: number }> = [
    { id: 'dashboard', label: 'Command Centre', icon: Activity },
    { id: 'queue', label: 'Reception & Queue', icon: ListOrdered, badge: waitingQueueCount },
    { id: 'patients', label: 'Patients & EMR', icon: Users },
    { id: 'triage', label: 'Triage & Nursing', icon: HeartPulse },
    { id: 'appointments', label: 'Appointments', icon: Calendar },
    { id: 'consultations', label: 'Consultations', icon: Stethoscope },
    { id: 'pharmacy', label: 'Pharmacy & Stock', icon: Pill, badge: pharmacyAlertCount },
    { id: 'lab', label: 'Laboratory', icon: FlaskConical, badge: pendingLabCount },
    { id: 'diagnostics', label: 'Imaging, Proc & Ref', icon: Scan },
    { id: 'billing', label: 'Billing & Payments', icon: CreditCard, badge: unpaidInvoiceCount },
    { id: 'catalog', label: 'Services & Staff', icon: Building2 },
    { id: 'reports', label: 'Reports & Audit', icon: BarChart3 },
  ];

  const handleClinicLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    router.push('/auth/login');
  };

  const calcLiveBmi = () => {
    const w = Number(consultForm.weightKg);
    const h = Number(consultForm.heightCm);
    if (!w || !h) return '—';
    return (w / ((h / 100) * (h / 100))).toFixed(1);
  };

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-2 border-[#073832] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-semibold text-slate-500">Verifying clinic staff session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col lg:flex-row">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-[#073832] text-white flex flex-col transition-transform lg:static lg:translate-x-0 ${
          mobileNav ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-5 border-b border-emerald-900/70 flex items-center justify-between">
          <div>
            <div className="text-sm font-extrabold tracking-tight">Action Boat Medical Centre</div>
            <div className="text-[11px] text-emerald-300/80">Accra, Ghana · GHS (GH₵)</div>
          </div>
          <button onClick={() => setMobileNav(false)} className="lg:hidden p-1 text-emerald-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto text-xs font-semibold">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setTab(item.id);
                  setMobileNav(false);
                }}
                className={`w-full flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl transition ${
                  active ? 'bg-white text-[#073832] shadow-sm font-bold' : 'text-emerald-100/85 hover:bg-white/10'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                      active ? 'bg-emerald-100 text-[#073832]' : 'bg-white/15 text-emerald-200'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-emerald-900/70 space-y-2 text-xs">
          <Link
            href="/"
            className="flex items-center justify-between px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-emerald-100 font-semibold"
          >
            <span>Public Clinic Site</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
          {['CLINIC_SUPER_ADMIN', 'CLINIC_ADMIN'].includes(currentUser?.clinicStaffProfile?.clinicRole || currentUser?.role) && (
            <Link
              href="/portal/clinic/admin"
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-teal-400/15 hover:bg-teal-400/25 text-teal-200 border border-teal-400/25 font-semibold"
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Clinic Administration</span>
            </Link>
          )}
          <button
            type="button"
            onClick={handleClinicLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-200 font-semibold transition"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
        <header className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileNav(true)}
              className="lg:hidden p-2 rounded-xl bg-slate-100 text-slate-700"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-extrabold text-[#073832]">
                  {navItems.find((n) => n.id === tab)?.label}
                </h1>
                <span className="hidden sm:inline-block text-[10px] font-bold uppercase tracking-wider bg-teal-50 text-teal-800 border border-teal-200 px-2 py-0.5 rounded-full">
                  Clinic System
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Clinical Operations · Africa/Accra · Currency: GH₵
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setTab('patients');
                setShowPatientModal(true);
              }}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#073832] hover:bg-emerald-900 text-white text-xs font-bold transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Register Patient</span>
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
              title="Print current view"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold bg-slate-50"
            />
            <button
              onClick={loadAll}
              disabled={busy}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${busy || loading ? 'animate-spin' : ''}`} />
            </button>
            {currentUser && (
              <div className="hidden xl:flex items-center gap-2 pl-2 border-l border-slate-200 text-xs">
                <div className="text-right">
                  <div className="font-bold text-slate-900 leading-tight">{currentUser.name}</div>
                  <div className="text-[10px] font-semibold uppercase text-teal-700">{currentUser.role}</div>
                </div>
              </div>
            )}
          </div>
        </header>

        {toast && (
          <div
            className={`fixed bottom-5 right-5 z-50 px-4 py-3 rounded-xl shadow-xl text-xs font-bold flex items-center gap-2 ${
              toast.type === 'err' ? 'bg-red-600 text-white' : 'bg-[#073832] text-emerald-200'
            }`}
          >
            {toast.type === 'err' ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
            <span>{toast.msg}</span>
          </div>
        )}

        <main className="p-4 sm:p-6 space-y-6 flex-1">
          {/* TAB 1: DASHBOARD */}
          {tab === 'dashboard' && dashboard?.kpis && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Total Patients', val: dashboard.kpis.totalPatients, sub: `+${dashboard.kpis.newPatientsToday} today` },
                  { label: "Today's Appointments", val: dashboard.kpis.todaysAppointments, sub: `${dashboard.kpis.cancelledAppointments} cancelled` },
                  { label: 'Queue Waiting / Consulting', val: `${dashboard.kpis.waitingCount} / ${dashboard.kpis.consultingCount}`, sub: `${dashboard.kpis.completedConsultations} completed today` },
                  { label: "Today's Revenue", val: `GH₵${dashboard.kpis.todaysRevenueGHS.toFixed(2)}`, sub: `${dashboard.kpis.outstandingBillsCount} unpaid bills` },
                  { label: 'Outstanding Bills', val: `GH₵${dashboard.kpis.outstandingBillsGHS.toFixed(2)}`, sub: 'Receivables in GHS' },
                  { label: 'Low Stock Medicines', val: dashboard.kpis.lowStockCount, sub: `${dashboard.kpis.expiringSoonCount} expiring <=30d` },
                  { label: 'Expired Batches', val: dashboard.kpis.expiredCount, sub: 'Blocked from dispensing' },
                  { label: 'Pending Lab Requests', val: dashboard.kpis.pendingLabRequests, sub: 'Awaiting result/review' },
                ].map((k) => (
                  <div key={k.label} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
                    <div className="text-[11px] font-bold text-slate-500 uppercase">{k.label}</div>
                    <div className="text-xl font-extrabold text-[#073832] mt-1">{k.val}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">{k.sub}</div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                  <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 font-extrabold text-xs uppercase text-slate-700">
                    Pharmacy Stock Alerts
                  </div>
                  <div className="divide-y divide-slate-100 text-xs">
                    {dashboard.lowStockMedicines?.length === 0 ? (
                      <div className="p-6 text-center text-slate-400">All stocked medicines are above reorder levels.</div>
                    ) : (
                      dashboard.lowStockMedicines?.map((m: any) => (
                        <div key={m.id} className="p-3.5 flex items-center justify-between">
                          <span className="font-bold text-slate-900">{m.name}</span>
                          <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold text-[10px]">
                            {m.available} left (reorder {m.reorderLevel})
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                  <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 font-extrabold text-xs uppercase text-slate-700">
                    Recent Clinic Activities
                  </div>
                  <div className="divide-y divide-slate-100 text-xs">
                    {dashboard.recentActivities?.length === 0 ? (
                      <div className="p-6 text-center text-slate-400">No recent clinic activities logged.</div>
                    ) : (
                      dashboard.recentActivities?.slice(0, 8).map((a: any) => (
                        <div key={a.id} className="p-3.5 flex items-center justify-between gap-2">
                          <div>
                            <div className="font-bold text-slate-900">{a.action}</div>
                            <div className="text-[11px] text-slate-500">
                              {a.actorName} · {a.entityType}
                            </div>
                          </div>
                          <span className="text-[10px] text-slate-400 whitespace-nowrap">
                            {new Date(a.createdAt).toLocaleTimeString('en-GH')}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: RECEPTION & QUEUE */}
          {tab === 'queue' && (
            <div className="space-y-4">
              <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-wrap items-center justify-between gap-3 shadow-sm">
                <div className="text-xs font-bold text-slate-700">
                  Daily Queue ({selectedDate}) · {queue.length} patients
                </div>
                <div className="flex flex-wrap gap-2">
                  <select
                    onChange={(e) => {
                      if (e.target.value) handleCheckIn(e.target.value);
                      e.target.value = '';
                    }}
                    className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold bg-white"
                    defaultValue=""
                  >
                    <option value="">+ Quick Walk-In Check-In (Select Patient)...</option>
                    {patients.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.patientNumber} — {p.fullName} ({p.phone})
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => setShowPatientModal(true)}
                    className="px-3.5 py-2 rounded-xl bg-[#073832] text-white text-xs font-bold inline-flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Register Walk-In</span>
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto shadow-sm">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase text-slate-500">
                    <tr>
                      <th className="p-3.5">Queue #</th>
                      <th className="p-3.5">Patient</th>
                      <th className="p-3.5">Priority</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5">Check-In</th>
                      <th className="p-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {queue.length === 0 ? (
                      <tr><td colSpan={6} className="p-8 text-center text-slate-400">No patients in queue for {selectedDate}.</td></tr>
                    ) : (
                      queue.map((q) => (
                        <tr key={q.id}>
                          <td className="p-3.5 font-extrabold text-[#073832]">{q.queueNumber}</td>
                          <td className="p-3.5">
                            <div className="font-bold text-slate-900">{q.patient?.fullName}</div>
                            <div className="text-[11px] text-slate-500">{q.patient?.patientNumber} · {q.patient?.phone}</div>
                          </td>
                          <td className="p-3.5">
                            <select
                              value={q.priority}
                              onChange={(e) => handleQueueAction(q.id, undefined, e.target.value)}
                              className={`px-2 py-1 rounded-full text-[10px] font-bold border ${
                                q.priority === 'EMERGENCY'
                                  ? 'bg-red-100 text-red-800 border-red-200'
                                  : q.priority === 'URGENT'
                                  ? 'bg-amber-100 text-amber-800 border-amber-200'
                                  : 'bg-slate-100 text-slate-700 border-slate-200'
                              }`}
                            >
                              <option value="NORMAL">NORMAL</option>
                              <option value="URGENT">URGENT</option>
                              <option value="EMERGENCY">EMERGENCY</option>
                            </select>
                          </td>
                          <td className="p-3.5">
                            <span className="px-2 py-1 rounded-full bg-emerald-50 text-emerald-800 text-[10px] font-bold">
                              {q.status}
                            </span>
                          </td>
                          <td className="p-3.5 text-slate-500">{new Date(q.checkedInAt).toLocaleTimeString('en-GH')}</td>
                          <td className="p-3.5 text-right space-x-1.5">
                            {q.status === 'WAITING' && (
                              <button
                                onClick={() => handleQueueAction(q.id, 'call')}
                                className="px-2.5 py-1 rounded-lg bg-sky-50 text-sky-800 font-bold hover:bg-sky-100"
                              >
                                Call
                              </button>
                            )}
                            {(q.status === 'WAITING' || q.status === 'CALLED') && (
                              <button
                                onClick={() => {
                                  setConsultForm({
                                    ...consultForm,
                                    id: '',
                                    queueId: q.id,
                                    patientId: q.patientId,
                                    chiefComplaint: '',
                                    completeNow: false,
                                  });
                                  setShowConsultModal(true);
                                }}
                                className="px-2.5 py-1 rounded-lg bg-[#073832] text-white font-bold"
                              >
                                Consult
                              </button>
                            )}
                            {q.status === 'IN_CONSULTATION' && (
                              <button
                                onClick={() => handleQueueAction(q.id, 'complete')}
                                className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 font-bold"
                              >
                                Complete
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: PATIENTS & EMR */}
          {tab === 'patients' && emrPatientId && (
            <PatientEmrWorkspace
              patientId={emrPatientId}
              onClose={() => setEmrPatientId(null)}
              onQuickAction={(act, pat) => {
                if (act === 'queue') {
                  handleCheckIn(pat.id);
                } else if (act === 'triage') {
                  setEmrPatientId(null);
                  setTab('triage');
                } else if (act === 'consult') {
                  setEmrPatientId(null);
                  setTab('consultations');
                } else if (act === 'invoice') {
                  setEmrPatientId(null);
                  setTab('billing');
                }
              }}
            />
          )}

          {tab === 'patients' && !emrPatientId && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3 justify-between">
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    value={patientSearch}
                    onChange={(e) => setPatientSearch(e.target.value)}
                    placeholder="Search patient name, WMC-PT number, or +233 phone..."
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-white text-xs"
                  />
                </div>
                <button
                  onClick={() => {
                    resetPatientForm();
                    setShowPatientModal(true);
                  }}
                  className="px-4 py-2 rounded-xl bg-[#073832] text-white text-xs font-bold inline-flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Register New Patient</span>
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 overflow-x-auto shadow-sm">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase text-slate-500">
                      <tr>
                        <th className="p-3.5">Patient</th>
                        <th className="p-3.5">Contact</th>
                        <th className="p-3.5">Visits</th>
                        <th className="p-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {patients.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50">
                          <td className="p-3.5">
                            <div className="font-bold text-slate-900">{p.fullName}</div>
                            <div className="text-[11px] text-emerald-700 font-semibold">{p.patientNumber} · {p.gender}</div>
                          </td>
                          <td className="p-3.5 text-slate-600">{p.phone}</td>
                          <td className="p-3.5 text-slate-600">{p._count?.consultations || 0} consults</td>
                          <td className="p-3.5 text-right space-x-1.5">
                            <button
                              onClick={() => setEmrPatientId(p.id)}
                              className="px-2.5 py-1 rounded-lg bg-teal-600 text-white font-bold"
                            >
                              Full EMR
                            </button>
                            <button
                              onClick={() => loadPatientDetail(p.id)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 font-bold"
                            >
                              Summary
                            </button>
                            <button
                              onClick={() => handleCheckIn(p.id)}
                              className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-bold"
                            >
                              Check In
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Longitudinal Profile */}
                <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm text-xs space-y-4">
                  {!selectedPatient ? (
                    <div className="p-8 text-center text-slate-400">Select a patient to view their longitudinal medical record.</div>
                  ) : (
                    <>
                      <div className="border-b border-slate-100 pb-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="text-sm font-extrabold text-[#073832]">{selectedPatient.fullName}</div>
                            <div className="text-slate-500">
                              {selectedPatient.patientNumber} · {selectedPatient.phone} · {selectedPatient.gender}
                              {selectedPatient.dateOfBirth ? ` · DOB: ${selectedPatient.dateOfBirth}` : ''}
                            </div>
                          </div>
                          <button
                            onClick={() => openEditPatientModal(selectedPatient)}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-[11px]"
                          >
                            Edit Profile
                          </button>
                        </div>

                        <div className="grid grid-cols-2 gap-1.5 mt-3 text-[11px] bg-slate-50 p-2.5 rounded-xl">
                          <div><span className="text-slate-400">Blood Group:</span> <strong className="text-slate-800">{selectedPatient.bloodGroup || '—'}</strong></div>
                          <div><span className="text-slate-400">Genotype:</span> <strong className="text-slate-800">{selectedPatient.identifiers?.find((i: any) => i.identifierType === 'GENOTYPE')?.identifierValue || '—'}</strong></div>
                          <div><span className="text-slate-400">Height / Weight:</span> <strong className="text-slate-800">{selectedPatient.triageRecords?.[0]?.heightCm ? `${selectedPatient.triageRecords[0].heightCm} cm` : '—'} / {selectedPatient.triageRecords?.[0]?.weightKg ? `${selectedPatient.triageRecords[0].weightKg} kg` : '—'}</strong></div>
                          <div><span className="text-slate-400">BMI:</span> <strong className="text-slate-800">{selectedPatient.triageRecords?.[0]?.bmi || '—'}</strong></div>
                          <div><span className="text-slate-400">Ghana Card:</span> <strong className="text-slate-800">{selectedPatient.ghanaCardNumber || '—'}</strong></div>
                          <div><span className="text-slate-400">Insurance:</span> <strong className="text-slate-800">{selectedPatient.insurances?.[0] ? `${selectedPatient.insurances[0].provider?.code} (${selectedPatient.insurances[0].membershipNumber})` : 'Self-Pay'}</strong></div>
                          <div><span className="text-slate-400">Marital Status:</span> <strong className="text-slate-800">{selectedPatient.maritalStatus || '—'}</strong></div>
                          <div><span className="text-slate-400">Occupation:</span> <strong className="text-slate-800">{selectedPatient.occupation || '—'}</strong></div>
                          <div className="col-span-2"><span className="text-slate-400">Next of Kin:</span> <strong className="text-slate-800">{selectedPatient.nextOfKinName || '—'} {selectedPatient.nextOfKinRelation ? `(${selectedPatient.nextOfKinRelation})` : ''} {selectedPatient.nextOfKinPhone || ''}</strong></div>
                          <div className="col-span-2"><span className="text-slate-400">Emergency:</span> <strong className="text-slate-800">{selectedPatient.emergencyName || '—'} {selectedPatient.emergencyRelation ? `(${selectedPatient.emergencyRelation})` : ''} {selectedPatient.emergencyPhone || ''}</strong></div>
                        </div>

                        {selectedPatient.allergies && (
                          <div className="mt-2 px-2.5 py-1 rounded-lg bg-red-50 text-red-700 font-bold text-[11px]">
                            Allergies: {selectedPatient.allergies}
                          </div>
                        )}
                        {selectedPatient.chronicConditions && (
                          <div className="mt-1.5 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 font-bold text-[11px]">
                            Chronic Conditions: {selectedPatient.chronicConditions}
                          </div>
                        )}
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="p-2 rounded-xl bg-slate-50">
                          <div className="font-extrabold text-slate-900">{selectedPatient.consultations?.length || 0}</div>
                          <div className="text-[10px] text-slate-500">Consults</div>
                        </div>
                        <div className="p-2 rounded-xl bg-slate-50">
                          <div className="font-extrabold text-slate-900">{selectedPatient.prescriptions?.length || 0}</div>
                          <div className="text-[10px] text-slate-500">Prescriptions</div>
                        </div>
                        <div className="p-2 rounded-xl bg-slate-50">
                          <div className="font-extrabold text-slate-900">{selectedPatient.labRequests?.length || 0}</div>
                          <div className="text-[10px] text-slate-500">Lab Tests</div>
                        </div>
                      </div>
                      <div>
                        <div className="font-bold text-slate-700 mb-1.5">Recent Consultations &amp; Diagnoses</div>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {selectedPatient.consultations?.map((c: any) => (
                            <div key={c.id} className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/70">
                              <div className="font-bold text-slate-900">{c.consultationNumber} — {c.chiefComplaint}</div>
                              <div className="text-[11px] text-slate-600">
                                {c.diagnoses?.map((d: any) => d.title).join(', ') || 'No diagnosis recorded'}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <div className="font-bold text-slate-700 mb-1.5">Documents ({selectedPatient.documents?.length || 0})</div>
                        <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 cursor-pointer font-bold text-[11px]">
                          <Upload className="w-3.5 h-3.5" />
                          <span>Upload Patient Document</span>
                          <input
                            type="file"
                            className="hidden"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              const fd = new FormData();
                              fd.append('patientId', selectedPatient.id);
                              fd.append('title', file.name);
                              fd.append('file', file);
                              const res = await fetch('/api/clinic/documents', { method: 'POST', body: fd });
                              if (res.ok) {
                                notify('Document uploaded.');
                                await loadPatientDetail(selectedPatient.id);
                              } else {
                                const err = await res.json();
                                notify(err.error || 'Upload failed', 'err');
                              }
                            }}
                          />
                        </label>
                        <div className="mt-2 space-y-1">
                          {selectedPatient.documents?.map((d: any) => (
                            <a
                              key={d.id}
                              href={`/api/clinic/documents/${d.id}`}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center justify-between p-2 rounded-lg border border-slate-100 hover:bg-slate-50"
                            >
                              <span className="font-semibold text-emerald-800">{d.title}</span>
                              <Download className="w-3.5 h-3.5 text-slate-400" />
                            </a>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {tab === 'triage' && (
            <ClinicTriageAndDiagnostics mode="triage" patients={patients} />
          )}

          {tab === 'diagnostics' && (
            <ClinicTriageAndDiagnostics mode="diagnostics" patients={patients} />
          )}

          {/* TAB 4: APPOINTMENTS */}
          {tab === 'appointments' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="text-xs font-bold text-slate-600">{appointments.length} total appointments</div>
                <button
                  onClick={() => setShowApptModal(true)}
                  className="px-4 py-2 rounded-xl bg-[#073832] text-white text-xs font-bold inline-flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Book Appointment</span>
                </button>
              </div>
              <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto shadow-sm">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase text-slate-500">
                    <tr>
                      <th className="p-3.5">Patient</th>
                      <th className="p-3.5">Service &amp; Clinician</th>
                      <th className="p-3.5">Date &amp; Time</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {appointments.map((a) => (
                      <tr key={a.id}>
                        <td className="p-3.5">
                          <div className="font-bold text-slate-900">{a.patientName}</div>
                          <div className="text-[11px] text-slate-500">{a.patientPhone}</div>
                        </td>
                        <td className="p-3.5">
                          <div className="font-semibold text-slate-800">{a.service?.title || a.departmentName || 'General'}</div>
                          <div className="text-[11px] text-slate-500">{a.staff?.user?.name || 'Unassigned'}</div>
                        </td>
                        <td className="p-3.5 font-semibold">{a.preferredDate} · {a.preferredTime}</td>
                        <td className="p-3.5">
                          <span className="px-2 py-1 rounded-full bg-slate-100 text-slate-800 text-[10px] font-bold">{a.status}</span>
                        </td>
                        <td className="p-3.5 text-right space-x-1.5">
                          {a.patientId && !a.queueEntry && a.status !== 'CANCELLED' && (
                            <button
                              onClick={() => handleCheckIn(a.patientId, a.id)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 font-bold"
                            >
                              Check In
                            </button>
                          )}
                          {a.status !== 'CANCELLED' && a.status !== 'COMPLETED' && (
                            <button
                              onClick={async () => {
                                await fetch(`/api/clinic/appointments/${a.id}`, {
                                  method: 'PATCH',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ status: 'CANCELLED' }),
                                });
                                notify('Appointment cancelled.');
                                await loadAll();
                              }}
                              className="px-2.5 py-1 rounded-lg bg-red-50 text-red-700 font-bold"
                            >
                              Cancel
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 5: CONSULTATIONS */}
          {tab === 'consultations' && (
            <div className="space-y-4">
              <div className="flex flex-wrap justify-between items-center gap-2">
                <div className="text-xs font-bold text-slate-600">
                  {consultations.length} consultation records · Select a consultation or queue patient to view full clinical chart, labs &amp; imaging
                </div>
                <button
                  onClick={() => {
                    setConsultForm({
                      ...consultForm,
                      id: '',
                      queueId: '',
                      patientId: consultPatientDetail?.id || patients[0]?.id || '',
                      chiefComplaint: '',
                      completeNow: false,
                    });
                    setShowConsultModal(true);
                  }}
                  className="px-4 py-2 rounded-xl bg-[#073832] text-white text-xs font-bold inline-flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>New Consultation</span>
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                {/* Left: Active Queue + Consultations List */}
                <div className="lg:col-span-5 space-y-3">
                  {queue.filter((q) => q.status !== 'COMPLETED' && q.status !== 'CANCELLED').length > 0 && (
                    <div className="bg-emerald-50/60 border border-emerald-200 rounded-2xl p-3 space-y-2 text-xs">
                      <div className="text-[10px] font-extrabold uppercase text-emerald-800">Active Queue Patients</div>
                      <div className="space-y-1.5 max-h-44 overflow-y-auto">
                        {queue
                          .filter((q) => q.status !== 'COMPLETED' && q.status !== 'CANCELLED')
                          .map((q) => (
                            <div
                              key={q.id}
                              onClick={() => {
                                setSelectedConsultId(null);
                                loadConsultPatientDetail(q.patientId);
                              }}
                              className={`p-2.5 rounded-xl bg-white border cursor-pointer flex items-center justify-between gap-2 hover:border-[#073832] ${
                                consultPatientDetail?.id === q.patientId && !selectedConsultId ? 'border-[#073832] ring-1 ring-[#073832]' : 'border-emerald-100'
                              }`}
                            >
                              <div>
                                <div className="font-bold text-slate-900">{q.queueNumber} · {q.patient?.fullName}</div>
                                <div className="text-[10px] text-slate-500">{q.patient?.patientNumber} · {q.status}</div>
                              </div>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  loadConsultPatientDetail(q.patientId);
                                  setConsultForm({
                                    ...consultForm,
                                    id: '',
                                    queueId: q.id,
                                    patientId: q.patientId,
                                    chiefComplaint: '',
                                    completeNow: false,
                                  });
                                  setShowConsultModal(true);
                                }}
                                className="px-2 py-1 rounded-lg bg-[#073832] text-white text-[10px] font-bold"
                              >
                                Start
                              </button>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  <div className="space-y-2.5 max-h-[680px] overflow-y-auto pr-1">
                    {consultations.map((c) => {
                      const isSelected = selectedConsultId === c.id;
                      return (
                        <div
                          key={c.id}
                          onClick={() => {
                            setSelectedConsultId(c.id);
                            loadConsultPatientDetail(c.patientId);
                          }}
                          className={`bg-white rounded-2xl border p-3.5 shadow-sm text-xs space-y-1.5 cursor-pointer transition ${
                            isSelected ? 'border-[#073832] ring-2 ring-[#073832]/15' : 'border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div>
                              <span className="font-extrabold text-[#073832]">{c.consultationNumber}</span> ·{' '}
                              <span className="font-bold text-slate-900">{c.patient?.fullName}</span>
                            </div>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${c.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                              {c.status}
                            </span>
                          </div>
                          <div className="text-slate-600 line-clamp-1">
                            <strong>Complaint:</strong> {c.chiefComplaint}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            BP {c.vitals?.bpSystolic || '—'}/{c.vitals?.bpDiastolic || '—'} · Temp {c.vitals?.temperatureC || '—'}°C · BMI {c.vitals?.bmi || '—'}
                          </div>
                          {c.diagnoses?.length > 0 && (
                            <div className="text-[11px] text-emerald-800 font-semibold">
                              Dx: {c.diagnoses.map((d: any) => d.title).join(', ')}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Right: Doctor Clinical Chart & Results Workspace */}
                <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm text-xs space-y-4">
                  {!consultPatientDetail ? (
                    <div className="p-12 text-center text-slate-400">
                      Select a consultation or active queue patient on the left to inspect full demographics, allergies, vitals, medical history, lab results, and imaging results.
                    </div>
                  ) : (
                    (() => {
                      const activeConsult = consultations.find((c) => c.id === selectedConsultId) || consultPatientDetail.consultations?.[0] || null;
                      const latestTriage = consultPatientDetail.triageRecords?.[0];
                      const latestVitals = activeConsult?.vitals || latestTriage;
                      const geno = consultPatientDetail.identifiers?.find((i: any) => i.identifierType === 'GENOTYPE')?.identifierValue;
                      const primaryIns = consultPatientDetail.insurances?.[0];
                      return (
                        <>
                          {/* Patient Header + Quick Actions */}
                          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-3">
                            <div>
                              <div className="text-base font-extrabold text-[#073832]">{consultPatientDetail.fullName}</div>
                              <div className="text-slate-500 mt-0.5">
                                {consultPatientDetail.patientNumber} · {consultPatientDetail.gender}
                                {consultPatientDetail.dateOfBirth ? ` · DOB: ${consultPatientDetail.dateOfBirth}` : ''} · {consultPatientDetail.phone}
                              </div>
                              <div className="text-[11px] text-slate-500 mt-0.5">
                                {consultPatientDetail.maritalStatus || 'Marital: —'} · {consultPatientDetail.occupation || 'Occupation: —'} · Ghana Card: {consultPatientDetail.ghanaCardNumber || '—'} · Insurance: {primaryIns ? `${primaryIns.provider?.code} (${primaryIns.membershipNumber})` : 'Self-Pay'}
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              <button
                                onClick={() => {
                                  setLabReqForm({
                                    patientId: consultPatientDetail.id,
                                    consultationId: activeConsult?.id || '',
                                    testId: lab?.catalog?.[0]?.id || '',
                                    priority: 'ROUTINE',
                                    clinicalNotes: '',
                                  });
                                  setShowLabReqModal(true);
                                }}
                                className="px-2.5 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-800 font-bold"
                              >
                                + Order Lab
                              </button>
                              <button
                                onClick={() => {
                                  setRxForm({
                                    ...rxForm,
                                    consultationId: activeConsult?.id || '',
                                    patientId: consultPatientDetail.id,
                                  });
                                  setShowRxModal(true);
                                }}
                                className="px-2.5 py-1.5 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-800 font-bold"
                              >
                                + Prescribe
                              </button>
                              {activeConsult ? (
                                <button
                                  onClick={() => {
                                    setConsultForm({
                                      ...consultForm,
                                      id: activeConsult.id,
                                      queueId: activeConsult.queueId || '',
                                      patientId: activeConsult.patientId,
                                      chiefComplaint: activeConsult.chiefComplaint,
                                      hpi: activeConsult.hpi || '',
                                      examFindings: activeConsult.examFindings || '',
                                      treatmentPlan: activeConsult.treatmentPlan || '',
                                      internalNotes: activeConsult.internalNotes || '',
                                      bpSystolic: String(activeConsult.vitals?.bpSystolic || latestTriage?.bpSystolic || '120'),
                                      bpDiastolic: String(activeConsult.vitals?.bpDiastolic || latestTriage?.bpDiastolic || '80'),
                                      temperatureC: String(activeConsult.vitals?.temperatureC || latestTriage?.temperatureC || '36.8'),
                                      pulseBpm: String(activeConsult.vitals?.pulseBpm || latestTriage?.pulseBpm || '76'),
                                      spo2Percent: String(activeConsult.vitals?.spo2Percent || latestTriage?.spo2Percent || '98'),
                                      weightKg: String(activeConsult.vitals?.weightKg || latestTriage?.weightKg || '68'),
                                      heightCm: String(activeConsult.vitals?.heightCm || latestTriage?.heightCm || '168'),
                                      diagnosisTitle: '',
                                      diagnosisCode: '',
                                      completeNow: false,
                                      amendReason: '',
                                    });
                                    setShowConsultModal(true);
                                  }}
                                  className="px-2.5 py-1.5 rounded-xl bg-[#073832] text-white font-bold"
                                >
                                  {activeConsult.status === 'COMPLETED' ? 'Amend Consult' : 'Edit / Complete'}
                                </button>
                              ) : (
                                <button
                                  onClick={() => {
                                    setConsultForm({
                                      ...consultForm,
                                      id: '',
                                      queueId: '',
                                      patientId: consultPatientDetail.id,
                                      chiefComplaint: '',
                                      bpSystolic: String(latestTriage?.bpSystolic || '120'),
                                      bpDiastolic: String(latestTriage?.bpDiastolic || '80'),
                                      temperatureC: String(latestTriage?.temperatureC || '36.8'),
                                      pulseBpm: String(latestTriage?.pulseBpm || '76'),
                                      spo2Percent: String(latestTriage?.spo2Percent || '98'),
                                      weightKg: String(latestTriage?.weightKg || '68'),
                                      heightCm: String(latestTriage?.heightCm || '168'),
                                      completeNow: false,
                                    });
                                    setShowConsultModal(true);
                                  }}
                                  className="px-2.5 py-1.5 rounded-xl bg-[#073832] text-white font-bold"
                                >
                                  + New Consult
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Allergies, Chronic Conditions & Blood/Genotype */}
                          <div className="flex flex-wrap gap-2">
                            <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 font-bold">
                              Blood Group: {consultPatientDetail.bloodGroup || '—'}
                            </span>
                            <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 font-bold">
                              Genotype: {geno || '—'}
                            </span>
                            {consultPatientDetail.allergies ? (
                              <span className="px-2.5 py-1 rounded-lg bg-red-50 border border-red-200 text-red-700 font-extrabold">
                                Allergies: {consultPatientDetail.allergies}
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 font-semibold">
                                No Known Allergies
                              </span>
                            )}
                            {consultPatientDetail.chronicConditions && (
                              <span className="px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 font-bold">
                                Chronic: {consultPatientDetail.chronicConditions}
                              </span>
                            )}
                          </div>

                          {/* Vitals Strip */}
                          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 bg-slate-50 p-3 rounded-xl text-center">
                            <div>
                              <div className="text-[10px] text-slate-400 font-bold">HEIGHT</div>
                              <div className="font-extrabold text-slate-900">{latestVitals?.heightCm ? `${latestVitals.heightCm} cm` : '—'}</div>
                            </div>
                            <div>
                              <div className="text-[10px] text-slate-400 font-bold">WEIGHT</div>
                              <div className="font-extrabold text-slate-900">{latestVitals?.weightKg ? `${latestVitals.weightKg} kg` : '—'}</div>
                            </div>
                            <div>
                              <div className="text-[10px] text-slate-400 font-bold">BMI</div>
                              <div className="font-extrabold text-[#073832]">{latestVitals?.bmi || '—'}</div>
                            </div>
                            <div>
                              <div className="text-[10px] text-slate-400 font-bold">BP</div>
                              <div className="font-extrabold text-slate-900">{latestVitals?.bpSystolic || '—'}/{latestVitals?.bpDiastolic || '—'}</div>
                            </div>
                            <div>
                              <div className="text-[10px] text-slate-400 font-bold">TEMP</div>
                              <div className="font-extrabold text-slate-900">{latestVitals?.temperatureC ? `${latestVitals.temperatureC}°C` : '—'}</div>
                            </div>
                            <div>
                              <div className="text-[10px] text-slate-400 font-bold">PULSE / SpO2</div>
                              <div className="font-extrabold text-slate-900">{latestVitals?.pulseBpm || '—'} / {latestVitals?.spo2Percent ? `${latestVitals.spo2Percent}%` : '—'}</div>
                            </div>
                          </div>

                          {/* Lab Results */}
                          <div>
                            <div className="font-extrabold text-slate-800 mb-1.5 flex items-center justify-between">
                              <span>Laboratory Results ({consultPatientDetail.labRequests?.length || 0})</span>
                            </div>
                            {consultPatientDetail.labRequests?.length === 0 ? (
                              <div className="text-slate-400 italic">No laboratory requests or results recorded.</div>
                            ) : (
                              <div className="space-y-1.5 max-h-44 overflow-y-auto">
                                {consultPatientDetail.labRequests?.map((lr: any) => (
                                  <div key={lr.id} className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/70 flex flex-wrap items-center justify-between gap-2">
                                    <div>
                                      <div className="font-bold text-slate-900">{lr.test?.name} <span className="text-[10px] text-slate-400">({lr.requestNumber})</span></div>
                                      {lr.result ? (
                                        <div className="text-[11px] text-slate-700">
                                          Result: <strong className="text-[#073832]">{lr.result.resultValue} {lr.result.unit || ''}</strong>
                                          {lr.result.referenceRange ? ` · Ref: ${lr.result.referenceRange}` : ''}
                                          {lr.result.observations ? ` · ${lr.result.observations}` : ''}
                                        </div>
                                      ) : (
                                        <div className="text-[11px] text-slate-400">Status: {lr.status} (Awaiting result)</div>
                                      )}
                                    </div>
                                    {lr.result ? (
                                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                                        lr.result.flag === 'CRITICAL' ? 'bg-red-100 text-red-700' :
                                        lr.result.flag === 'ABNORMAL' ? 'bg-amber-100 text-amber-800' :
                                        'bg-emerald-100 text-emerald-800'
                                      }`}>
                                        {lr.result.flag}
                                      </span>
                                    ) : (
                                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold">{lr.status}</span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Imaging Results */}
                          <div>
                            <div className="font-extrabold text-slate-800 mb-1.5">
                              Imaging &amp; Radiology Results ({consultPatientDetail.imagingRequests?.length || 0})
                            </div>
                            {consultPatientDetail.imagingRequests?.length === 0 ? (
                              <div className="text-slate-400 italic">No imaging studies recorded.</div>
                            ) : (
                              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                                {consultPatientDetail.imagingRequests?.map((ir: any) => (
                                  <div key={ir.id} className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/70">
                                    <div className="flex items-center justify-between">
                                      <div className="font-bold text-slate-900">{ir.imaging?.name} ({ir.imaging?.modality})</div>
                                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold">{ir.status}</span>
                                    </div>
                                    {ir.result ? (
                                      <div className="text-[11px] text-slate-700 mt-1">
                                        <div><strong>Findings:</strong> {ir.result.findings}</div>
                                        {ir.result.impression && <div><strong>Impression:</strong> {ir.result.impression}</div>}
                                      </div>
                                    ) : (
                                      <div className="text-[11px] text-slate-400 mt-0.5">Awaiting radiology report</div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Medical History & Past Consultations */}
                          <div>
                            <div className="font-extrabold text-slate-800 mb-1.5">
                              Medical History &amp; Past Consultations ({consultPatientDetail.consultations?.length || 0})
                            </div>
                            <div className="space-y-2 max-h-48 overflow-y-auto">
                              {consultPatientDetail.consultations?.map((hc: any) => (
                                <div key={hc.id} className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/70 space-y-0.5">
                                  <div className="flex justify-between">
                                    <span className="font-bold text-slate-900">{hc.consultationNumber} — {hc.chiefComplaint}</span>
                                    <span className="text-[10px] text-slate-400">{new Date(hc.startedAt).toLocaleDateString('en-GH')}</span>
                                  </div>
                                  {hc.diagnoses?.length > 0 && (
                                    <div className="text-[11px] text-emerald-800 font-semibold">
                                      Diagnoses: {hc.diagnoses.map((d: any) => `${d.title}${d.code ? ` (${d.code})` : ''}`).join(', ')}
                                    </div>
                                  )}
                                  {hc.treatmentPlan && (
                                    <div className="text-[11px] text-slate-600">Plan: {hc.treatmentPlan}</div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        </>
                      );
                    })()
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: PHARMACY & STOCK */}
          {tab === 'pharmacy' && pharmacy && (
            <div className="space-y-6">
              <div className="flex flex-wrap justify-between items-center gap-3">
                <div className="text-xs font-bold text-slate-600">
                  {pharmacy.medicines?.length || 0} medicines · {pharmacy.pendingPrescriptions?.length || 0} pending prescriptions
                </div>
                <button
                  onClick={() => setShowMedicineModal(true)}
                  className="px-4 py-2 rounded-xl bg-[#073832] text-white text-xs font-bold inline-flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Medicine</span>
                </button>
              </div>

              {/* Pending Prescriptions to Dispense */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 font-extrabold text-xs uppercase text-slate-700">
                  Issued Prescriptions Queue (FEFO Expiry-First Dispensing)
                </div>
                <div className="divide-y divide-slate-100 text-xs">
                  {pharmacy.pendingPrescriptions?.length === 0 ? (
                    <div className="p-6 text-center text-slate-400">No pending prescriptions to dispense.</div>
                  ) : (
                    pharmacy.pendingPrescriptions?.map((rx: any) => (
                      <div key={rx.id} className="p-4 flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <div className="font-bold text-slate-900">
                            {rx.prescriptionNumber} — {rx.patient?.fullName} ({rx.patient?.patientNumber})
                          </div>
                          <div className="text-[11px] text-slate-600">
                            {rx.items.map((i: any) => `${i.medicineName} (${i.quantityDispensed}/${i.quantityPrescribed})`).join(', ')}
                          </div>
                        </div>
                        <button
                          onClick={() => handleDispenseRx(rx)}
                          disabled={busy}
                          className="px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold"
                        >
                          Dispense (FEFO)
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Medicine Stock Table */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto shadow-sm">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase text-slate-500">
                    <tr>
                      <th className="p-3.5">Medicine</th>
                      <th className="p-3.5">Price (GH₵)</th>
                      <th className="p-3.5">Valid Stock</th>
                      <th className="p-3.5">Expired</th>
                      <th className="p-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pharmacy.medicines?.map((m: any) => (
                      <tr key={m.id}>
                        <td className="p-3.5">
                          <div className="font-bold text-slate-900">{m.name}</div>
                          <div className="text-[11px] text-slate-500">{m.dosageForm} · {m.strength} · Reorder: {m.reorderLevel}</div>
                        </td>
                        <td className="p-3.5 font-bold">GH₵{m.sellingPrice.toFixed(2)}</td>
                        <td className="p-3.5">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${m.isLowStock ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                            {m.availableStock} {m.unit}
                          </span>
                        </td>
                        <td className="p-3.5 text-red-600 font-bold">{m.expiredStock}</td>
                        <td className="p-3.5 text-right">
                          <button
                            onClick={() => setShowBatchModal(m)}
                            className="px-3 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 font-bold text-slate-800"
                          >
                            + Receive Batch
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 7: LABORATORY */}
          {tab === 'lab' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[260px]">
                  <div className="relative flex-1 max-w-xs">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      value={labSearch}
                      onChange={(e) => setLabSearch(e.target.value)}
                      placeholder="Search patient, request #, or test..."
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-white text-xs"
                    />
                  </div>
                  <select
                    value={labStatusFilter}
                    onChange={(e) => setLabStatusFilter(e.target.value)}
                    className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold"
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="REQUESTED">Requested</option>
                    <option value="SAMPLE_COLLECTED">Sample Collected</option>
                    <option value="PROCESSING">Processing</option>
                    <option value="COMPLETED">Completed (Needs Review)</option>
                    <option value="REVIEWED">Reviewed &amp; Released</option>
                  </select>
                  <span className="text-[11px] text-slate-500 font-semibold">
                    {lab?.catalog?.length || 0} catalog tests
                  </span>
                </div>
                <button
                  onClick={() => {
                    setLabReqForm({
                      patientId: patients[0]?.id || '',
                      consultationId: '',
                      testId: lab?.catalog?.[0]?.id || '',
                      priority: 'ROUTINE',
                      clinicalNotes: '',
                    });
                    setShowLabReqModal(true);
                  }}
                  className="px-4 py-2 rounded-xl bg-[#073832] text-white text-xs font-bold inline-flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Request Lab Test</span>
                </button>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto shadow-sm">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase text-slate-500">
                    <tr>
                      <th className="p-3.5">Request #</th>
                      <th className="p-3.5">Patient</th>
                      <th className="p-3.5">Test</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5">Result</th>
                      <th className="p-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(lab?.requests || [])
                      .filter((r: any) => {
                        if (labStatusFilter !== 'ALL' && r.status !== labStatusFilter) return false;
                        if (!labSearch.trim()) return true;
                        const q = labSearch.toLowerCase();
                        return (
                          r.requestNumber?.toLowerCase().includes(q) ||
                          r.patient?.fullName?.toLowerCase().includes(q) ||
                          r.patient?.patientNumber?.toLowerCase().includes(q) ||
                          r.test?.name?.toLowerCase().includes(q)
                        );
                      })
                      .map((r: any) => (
                        <tr key={r.id} className="hover:bg-slate-50/70">
                          <td className="p-3.5">
                            <div className="font-bold text-[#073832]">{r.requestNumber}</div>
                            {r.priority && r.priority !== 'ROUTINE' && (
                              <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded bg-red-100 text-red-700 text-[9px] font-extrabold">
                                {r.priority}
                              </span>
                            )}
                          </td>
                          <td className="p-3.5">
                            <div className="font-semibold text-slate-900">{r.patient?.fullName}</div>
                            <div className="text-[11px] text-slate-500">{r.patient?.patientNumber}</div>
                          </td>
                          <td className="p-3.5">
                            <div className="font-semibold text-slate-900">{r.test?.name}</div>
                            <div className="text-[11px] text-slate-500">
                              {r.test?.sampleType || 'Blood'} · GH₵{r.test?.priceGHS?.toFixed(2)}
                            </div>
                          </td>
                          <td className="p-3.5">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                r.status === 'REVIEWED'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : r.status === 'COMPLETED'
                                  ? 'bg-sky-100 text-sky-800'
                                  : r.status === 'SAMPLE_COLLECTED' || r.status === 'PROCESSING'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-slate-100 text-slate-800'
                              }`}
                            >
                              {r.status}
                            </span>
                          </td>
                          <td className="p-3.5">
                            {r.result ? (
                              <div>
                                <span className="font-bold text-slate-900">
                                  {r.result.resultValue} {r.result.unit || ''}
                                </span>{' '}
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold ${
                                    r.result.flag === 'CRITICAL'
                                      ? 'bg-red-100 text-red-700'
                                      : r.result.flag === 'ABNORMAL'
                                      ? 'bg-amber-100 text-amber-800'
                                      : 'bg-emerald-50 text-emerald-700'
                                  }`}
                                >
                                  {r.result.flag}
                                </span>
                                {r.result.referenceRange && (
                                  <div className="text-[10px] text-slate-500">Ref: {r.result.referenceRange}</div>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-400">Pending</span>
                            )}
                          </td>
                          <td className="p-3.5 text-right space-x-1.5 whitespace-nowrap">
                            {r.status === 'REQUESTED' && (
                              <button
                                onClick={async () => {
                                  const res = await fetch('/api/clinic/lab', {
                                    method: 'PATCH',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ id: r.id, status: 'SAMPLE_COLLECTED' }),
                                  });
                                  const data = await res.json();
                                  if (!res.ok) notify(data.error || 'Failed to mark sample collected', 'err');
                                  else {
                                    notify('Sample collected.');
                                    await loadAll();
                                  }
                                }}
                                className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 font-bold"
                              >
                                Collect Sample
                              </button>
                            )}
                            {r.status === 'SAMPLE_COLLECTED' && (
                              <button
                                onClick={async () => {
                                  const res = await fetch('/api/clinic/lab', {
                                    method: 'PATCH',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ id: r.id, status: 'PROCESSING' }),
                                  });
                                  const data = await res.json();
                                  if (!res.ok) notify(data.error || 'Failed to update status', 'err');
                                  else {
                                    notify('Sample processing started.');
                                    await loadAll();
                                  }
                                }}
                                className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-800 font-bold"
                              >
                                Processing
                              </button>
                            )}
                            {r.status !== 'REVIEWED' && r.status !== 'CANCELLED' && (
                              <button
                                onClick={() => {
                                  setShowLabResultModal(r);
                                  setLabResultForm({
                                    resultValue: r.result?.resultValue || '',
                                    unit: r.result?.unit || r.test?.unit || '',
                                    referenceRange: r.result?.referenceRange || r.test?.referenceRangeText || '',
                                    flag: r.result?.flag || 'NORMAL',
                                    observations: r.result?.observations || '',
                                  });
                                }}
                                className="px-2.5 py-1 rounded-lg bg-sky-50 text-sky-800 font-bold"
                              >
                                {r.result ? 'Edit Result' : 'Enter Result'}
                              </button>
                            )}
                            {r.status === 'COMPLETED' && (
                              <button
                                onClick={async () => {
                                  const res = await fetch('/api/clinic/lab', {
                                    method: 'PATCH',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ id: r.id, action: 'review_result', releaseToPatient: true }),
                                  });
                                  const data = await res.json();
                                  if (!res.ok) notify(data.error || 'Review failed', 'err');
                                  else {
                                    notify('Lab result reviewed & released.');
                                    await loadAll();
                                  }
                                }}
                                className="px-2.5 py-1 rounded-lg bg-emerald-700 text-white font-bold"
                              >
                                Review &amp; Release
                              </button>
                            )}
                            {r.result && (
                              <button
                                onClick={() => setPrintLabReport(r)}
                                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold inline-flex items-center gap-1"
                              >
                                <Printer className="w-3 h-3" />
                                <span>Report</span>
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 8: BILLING & PAYMENTS */}
          {tab === 'billing' && (
            <ClinicBillingWorkspace
              userRole={currentUser?.clinicRole || currentUser?.role}
              onInvoiceUpdated={loadAll}
            />
          )}

          {/* TAB 9: SERVICES, DEPARTMENTS & STAFF */}
          {tab === 'catalog' && catalog && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <h3 className="font-extrabold text-sm text-[#073832]">Clinic Staff Directory</h3>
                  <button
                    onClick={() => setShowStaffModal(true)}
                    className="px-3 py-1.5 rounded-xl bg-[#073832] text-white font-bold"
                  >
                    + Add Staff Role
                  </button>
                </div>
                <div className="divide-y divide-slate-100">
                  {catalog.staff?.map((s: any) => (
                    <div key={s.id} className="py-2.5 flex items-center justify-between">
                      <div>
                        <div className="font-bold text-slate-900">{s.user?.name}</div>
                        <div className="text-[11px] text-slate-500">{s.user?.email} · {s.department?.name || 'All Units'}</div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                        {s.clinicRole}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3 text-xs">
                <h3 className="font-extrabold text-sm text-[#073832]">Configured Clinic Services (GH₵)</h3>
                <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
                  {catalog.services?.map((srv: any) => (
                    <div key={srv.id} className="py-2.5 flex items-center justify-between">
                      <div>
                        <div className="font-bold text-slate-900">{srv.title}</div>
                        <div className="text-[11px] text-slate-500">{srv.department?.name || srv.category}</div>
                      </div>
                      <span className="font-extrabold text-[#073832]">GH₵{srv.feeGHS.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 10: REPORTS & AUDIT */}
          {tab === 'reports' && reports && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
                <div>
                  <div className="font-extrabold text-sm text-[#073832]">Clinic Reporting &amp; Audit Trail</div>
                  <div className="text-slate-500">Range: {reports.range?.from} to {reports.range?.to}</div>
                </div>
                <div className="flex gap-2">
                  <a
                    href={`/api/clinic/reports?format=csv&section=financial&from=${reports.range?.from}&to=${reports.range?.to}`}
                    className="px-3.5 py-2 rounded-xl bg-emerald-50 text-emerald-800 font-bold inline-flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export Financial CSV</span>
                  </a>
                  <a
                    href={`/api/clinic/reports?format=csv&section=pharmacy`}
                    className="px-3.5 py-2 rounded-xl bg-slate-100 text-slate-800 font-bold inline-flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export Pharmacy CSV</span>
                  </a>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div className="bg-white rounded-2xl border border-slate-200 p-4">
                  <div className="text-slate-500 font-bold uppercase text-[10px]">Net Revenue</div>
                  <div className="text-xl font-extrabold text-[#073832] mt-1">GH₵{reports.financialReport?.netRevenueGHS?.toFixed(2)}</div>
                </div>
                <div className="bg-white rounded-2xl border border-slate-200 p-4">
                  <div className="text-slate-500 font-bold uppercase text-[10px]">Outstanding</div>
                  <div className="text-xl font-extrabold text-amber-700 mt-1">GH₵{reports.financialReport?.outstandingTotalGHS?.toFixed(2)}</div>
                </div>
                <div className="bg-white rounded-2xl border border-slate-200 p-4">
                  <div className="text-slate-500 font-bold uppercase text-[10px]">Lab Completed / Pending</div>
                  <div className="text-xl font-extrabold text-slate-900 mt-1">{reports.labReport?.completed} / {reports.labReport?.pending}</div>
                </div>
                <div className="bg-white rounded-2xl border border-slate-200 p-4">
                  <div className="text-slate-500 font-bold uppercase text-[10px]">Low Stock / Expired</div>
                  <div className="text-xl font-extrabold text-red-600 mt-1">{reports.pharmacyReport?.lowStockCount} / {reports.pharmacyReport?.expiredBatchesCount}</div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 font-extrabold text-xs uppercase text-slate-700">
                  Restricted Clinic Audit Log
                </div>
                <div className="divide-y divide-slate-100 text-xs max-h-96 overflow-y-auto">
                  {reports.auditLogs?.map((log: any) => (
                    <div key={log.id} className="p-3.5 flex items-center justify-between">
                      <div>
                        <span className="font-bold text-slate-900">{log.action}</span> ·{' '}
                        <span className="text-slate-600">{log.actorName} ({log.actorRole})</span>
                      </div>
                      <span className="text-[11px] text-slate-400">{new Date(log.createdAt).toLocaleString('en-GH')}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* MODALS */}
      {showPatientModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4 overflow-y-auto">
          <form onSubmit={handleRegisterPatient} className="bg-white rounded-3xl max-w-2xl w-full p-6 space-y-3 text-xs my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-extrabold text-[#073832]">
                {patientForm.id ? 'Edit Patient Profile' : 'Register New Patient'}
              </h3>
              <button type="button" onClick={() => setShowPatientModal(false)}><X className="w-5 h-5" /></button>
            </div>
            <div className="text-[11px] font-bold uppercase text-slate-400 pt-1">Personal &amp; Demographics</div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              <input required placeholder="Full Name *" value={patientForm.fullName} onChange={(e) => setPatientForm({ ...patientForm, fullName: e.target.value })} className="px-3 py-2 border rounded-xl col-span-2 sm:col-span-2" />
              <select value={patientForm.gender} onChange={(e) => setPatientForm({ ...patientForm, gender: e.target.value })} className="px-3 py-2 border rounded-xl bg-white">
                <option value="Female">Female</option>
                <option value="Male">Male</option>
              </select>
              <input required placeholder="Phone (+233...) *" value={patientForm.phone} onChange={(e) => setPatientForm({ ...patientForm, phone: e.target.value })} className="px-3 py-2 border rounded-xl" />
              <input placeholder="Email (optional)" value={patientForm.email} onChange={(e) => setPatientForm({ ...patientForm, email: e.target.value })} className="px-3 py-2 border rounded-xl" />
              <input type="date" title="Date of Birth" value={patientForm.dateOfBirth} onChange={(e) => setPatientForm({ ...patientForm, dateOfBirth: e.target.value })} className="px-3 py-2 border rounded-xl" />
              <select value={patientForm.maritalStatus} onChange={(e) => setPatientForm({ ...patientForm, maritalStatus: e.target.value })} className="px-3 py-2 border rounded-xl bg-white">
                <option value="">Marital Status</option>
                <option value="Single">Single</option>
                <option value="Married">Married</option>
                <option value="Divorced">Divorced</option>
                <option value="Widowed">Widowed</option>
              </select>
              <input placeholder="Occupation" value={patientForm.occupation} onChange={(e) => setPatientForm({ ...patientForm, occupation: e.target.value })} className="px-3 py-2 border rounded-xl" />
              <input placeholder="Ghana Card (GHA-...)" value={patientForm.ghanaCardNumber} onChange={(e) => setPatientForm({ ...patientForm, ghanaCardNumber: e.target.value })} className="px-3 py-2 border rounded-xl" />
            </div>

            <div className="text-[11px] font-bold uppercase text-slate-400 pt-1">Clinical Baseline, Vitals &amp; Insurance</div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 bg-slate-50 p-3 rounded-xl">
              <select value={patientForm.bloodGroup} onChange={(e) => setPatientForm({ ...patientForm, bloodGroup: e.target.value })} className="px-2.5 py-2 border rounded-xl bg-white">
                <option value="">Blood Group</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
              </select>
              <select value={patientForm.genotype} onChange={(e) => setPatientForm({ ...patientForm, genotype: e.target.value })} className="px-2.5 py-2 border rounded-xl bg-white">
                <option value="">Genotype</option>
                <option value="AA">AA</option>
                <option value="AS">AS</option>
                <option value="AC">AC</option>
                <option value="SS">SS</option>
                <option value="SC">SC</option>
                <option value="CC">CC</option>
              </select>
              <input type="number" step="0.1" placeholder="Height (cm)" value={patientForm.heightCm} onChange={(e) => setPatientForm({ ...patientForm, heightCm: e.target.value })} className="px-2.5 py-2 border rounded-xl bg-white" />
              <input type="number" step="0.1" placeholder="Weight (kg)" value={patientForm.weightKg} onChange={(e) => setPatientForm({ ...patientForm, weightKg: e.target.value })} className="px-2.5 py-2 border rounded-xl bg-white" />
              <div className="px-2.5 py-2 font-bold text-[#073832] flex items-center">BMI: {calcPatientFormBmi()}</div>
              <select value={patientForm.insuranceProviderCode} onChange={(e) => setPatientForm({ ...patientForm, insuranceProviderCode: e.target.value })} className="px-2.5 py-2 border rounded-xl bg-white col-span-2">
                <option value="">NHIS / Insurance Provider (Optional)</option>
                <option value="NHIS">NHIS (National Health Insurance)</option>
                <option value="ACACIA">Acacia Health Insurance</option>
                <option value="GLICO">GLICO Healthcare</option>
                <option value="PREMIER">Premier Health Insurance</option>
                <option value="NATIONWIDE">Nationwide Medical Insurance</option>
              </select>
              <input placeholder="NHIS / Policy Number" value={patientForm.insuranceNumber} onChange={(e) => setPatientForm({ ...patientForm, insuranceNumber: e.target.value })} className="px-2.5 py-2 border rounded-xl bg-white col-span-3" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <input placeholder="Known Allergies (e.g. Penicillin, Sulfa)" value={patientForm.allergies} onChange={(e) => setPatientForm({ ...patientForm, allergies: e.target.value })} className="px-3 py-2 border rounded-xl" />
              <input placeholder="Chronic Conditions (e.g. Hypertension, Diabetes)" value={patientForm.chronicConditions} onChange={(e) => setPatientForm({ ...patientForm, chronicConditions: e.target.value })} className="px-3 py-2 border rounded-xl" />
            </div>

            <div className="text-[11px] font-bold uppercase text-slate-400 pt-1">Address, Next of Kin &amp; Emergency Contact</div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              <input placeholder="Residential Address" value={patientForm.address} onChange={(e) => setPatientForm({ ...patientForm, address: e.target.value })} className="px-3 py-2 border rounded-xl col-span-2 sm:col-span-1" />
              <input placeholder="Town / City" value={patientForm.townCity} onChange={(e) => setPatientForm({ ...patientForm, townCity: e.target.value })} className="px-3 py-2 border rounded-xl" />
              <input placeholder="Region (e.g. Greater Accra)" value={patientForm.region} onChange={(e) => setPatientForm({ ...patientForm, region: e.target.value })} className="px-3 py-2 border rounded-xl" />
              <input placeholder="Next of Kin Name" value={patientForm.nextOfKinName} onChange={(e) => setPatientForm({ ...patientForm, nextOfKinName: e.target.value })} className="px-3 py-2 border rounded-xl" />
              <input placeholder="Next of Kin Phone" value={patientForm.nextOfKinPhone} onChange={(e) => setPatientForm({ ...patientForm, nextOfKinPhone: e.target.value })} className="px-3 py-2 border rounded-xl" />
              <input placeholder="Next of Kin Relation" value={patientForm.nextOfKinRelation} onChange={(e) => setPatientForm({ ...patientForm, nextOfKinRelation: e.target.value })} className="px-3 py-2 border rounded-xl" />
              <input placeholder="Emergency Contact Name" value={patientForm.emergencyName} onChange={(e) => setPatientForm({ ...patientForm, emergencyName: e.target.value })} className="px-3 py-2 border rounded-xl" />
              <input placeholder="Emergency Phone (+233)" value={patientForm.emergencyPhone} onChange={(e) => setPatientForm({ ...patientForm, emergencyPhone: e.target.value })} className="px-3 py-2 border rounded-xl" />
              <input placeholder="Emergency Relation" value={patientForm.emergencyRelation} onChange={(e) => setPatientForm({ ...patientForm, emergencyRelation: e.target.value })} className="px-3 py-2 border rounded-xl" />
            </div>

            <button type="submit" disabled={busy} className="w-full py-2.5 rounded-xl bg-[#073832] text-white font-bold">
              {patientForm.id ? 'Update Patient Profile' : 'Save Patient'}
            </button>
          </form>
        </div>
      )}

      {showApptModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <form onSubmit={handleCreateAppointment} className="bg-white rounded-3xl max-w-md w-full p-6 space-y-3 text-xs">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-extrabold text-[#073832]">Schedule Appointment</h3>
              <button type="button" onClick={() => setShowApptModal(false)}><X className="w-5 h-5" /></button>
            </div>
            <select required value={apptForm.patientId} onChange={(e) => setApptForm({ ...apptForm, patientId: e.target.value })} className="w-full px-3 py-2 border rounded-xl bg-white">
              <option value="">Select Patient *</option>
              {patients.map((p) => <option key={p.id} value={p.id}>{p.patientNumber} — {p.fullName}</option>)}
            </select>
            <select value={apptForm.serviceId} onChange={(e) => setApptForm({ ...apptForm, serviceId: e.target.value })} className="w-full px-3 py-2 border rounded-xl bg-white">
              <option value="">Select Clinic Service</option>
              {catalog?.services?.map((s: any) => <option key={s.id} value={s.id}>{s.title} (GH₵{s.feeGHS})</option>)}
            </select>
            <select value={apptForm.staffId} onChange={(e) => setApptForm({ ...apptForm, staffId: e.target.value })} className="w-full px-3 py-2 border rounded-xl bg-white">
              <option value="">Assign Clinician (Optional)</option>
              {catalog?.staff?.map((s: any) => <option key={s.id} value={s.id}>{s.user?.name} ({s.clinicRole})</option>)}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <input type="date" required value={apptForm.preferredDate} onChange={(e) => setApptForm({ ...apptForm, preferredDate: e.target.value })} className="px-3 py-2 border rounded-xl" />
              <input type="time" required value={apptForm.preferredTime} onChange={(e) => setApptForm({ ...apptForm, preferredTime: e.target.value })} className="px-3 py-2 border rounded-xl" />
            </div>
            <input placeholder="Reason for visit" value={apptForm.reason} onChange={(e) => setApptForm({ ...apptForm, reason: e.target.value })} className="w-full px-3 py-2 border rounded-xl" />
            <button type="submit" disabled={busy} className="w-full py-2.5 rounded-xl bg-[#073832] text-white font-bold">Confirm Booking</button>
          </form>
        </div>
      )}

      {showConsultModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4 overflow-y-auto">
          <form onSubmit={handleSaveConsultation} className="bg-white rounded-3xl max-w-2xl w-full p-6 space-y-3 text-xs my-8">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-extrabold text-[#073832]">Clinical Consultation &amp; Vitals</h3>
              <button type="button" onClick={() => setShowConsultModal(false)}><X className="w-5 h-5" /></button>
            </div>
            <select required disabled={Boolean(consultForm.id)} value={consultForm.patientId} onChange={(e) => setConsultForm({ ...consultForm, patientId: e.target.value })} className="w-full px-3 py-2 border rounded-xl bg-white">
              <option value="">Select Patient *</option>
              {patients.map((p) => <option key={p.id} value={p.id}>{p.patientNumber} — {p.fullName}</option>)}
            </select>
            <input required placeholder="Presenting Complaint *" value={consultForm.chiefComplaint} onChange={(e) => setConsultForm({ ...consultForm, chiefComplaint: e.target.value })} className="w-full px-3 py-2 border rounded-xl" />
            <div className="grid grid-cols-4 gap-2 bg-slate-50 p-3 rounded-xl">
              <input placeholder="BP Sys" value={consultForm.bpSystolic} onChange={(e) => setConsultForm({ ...consultForm, bpSystolic: e.target.value })} className="px-2 py-1.5 border rounded-lg bg-white" />
              <input placeholder="BP Dia" value={consultForm.bpDiastolic} onChange={(e) => setConsultForm({ ...consultForm, bpDiastolic: e.target.value })} className="px-2 py-1.5 border rounded-lg bg-white" />
              <input placeholder="Temp °C" value={consultForm.temperatureC} onChange={(e) => setConsultForm({ ...consultForm, temperatureC: e.target.value })} className="px-2 py-1.5 border rounded-lg bg-white" />
              <input placeholder="Pulse bpm" value={consultForm.pulseBpm} onChange={(e) => setConsultForm({ ...consultForm, pulseBpm: e.target.value })} className="px-2 py-1.5 border rounded-lg bg-white" />
              <input placeholder="SpO2 %" value={consultForm.spo2Percent} onChange={(e) => setConsultForm({ ...consultForm, spo2Percent: e.target.value })} className="px-2 py-1.5 border rounded-lg bg-white" />
              <input placeholder="Weight kg" value={consultForm.weightKg} onChange={(e) => setConsultForm({ ...consultForm, weightKg: e.target.value })} className="px-2 py-1.5 border rounded-lg bg-white" />
              <input placeholder="Height cm" value={consultForm.heightCm} onChange={(e) => setConsultForm({ ...consultForm, heightCm: e.target.value })} className="px-2 py-1.5 border rounded-lg bg-white" />
              <div className="px-2 py-1.5 font-bold text-[#073832]">BMI: {calcLiveBmi()}</div>
            </div>
            <textarea rows={2} placeholder="Examination Findings" value={consultForm.examFindings} onChange={(e) => setConsultForm({ ...consultForm, examFindings: e.target.value })} className="w-full px-3 py-2 border rounded-xl" />
            <div className="grid grid-cols-3 gap-2">
              <input placeholder="Diagnosis Title" value={consultForm.diagnosisTitle} onChange={(e) => setConsultForm({ ...consultForm, diagnosisTitle: e.target.value })} className="col-span-2 px-3 py-2 border rounded-xl" />
              <input placeholder="ICD Code" value={consultForm.diagnosisCode} onChange={(e) => setConsultForm({ ...consultForm, diagnosisCode: e.target.value })} className="px-3 py-2 border rounded-xl" />
            </div>
            <textarea rows={2} placeholder="Treatment Plan & Follow-up" value={consultForm.treatmentPlan} onChange={(e) => setConsultForm({ ...consultForm, treatmentPlan: e.target.value })} className="w-full px-3 py-2 border rounded-xl" />
            <textarea rows={2} placeholder="Internal Clinician Notes (Restricted)" value={consultForm.internalNotes} onChange={(e) => setConsultForm({ ...consultForm, internalNotes: e.target.value })} className="w-full px-3 py-2 border rounded-xl bg-amber-50/40" />
            {consultations.find((c) => c.id === consultForm.id)?.status === 'COMPLETED' ? (
              <input required placeholder="Amendment Reason (Required for completed consultations) *" value={consultForm.amendReason} onChange={(e) => setConsultForm({ ...consultForm, amendReason: e.target.value })} className="w-full px-3 py-2 border border-amber-300 rounded-xl bg-amber-50" />
            ) : (
              <label className="flex items-center gap-2 font-bold text-slate-700">
                <input type="checkbox" checked={consultForm.completeNow} onChange={(e) => setConsultForm({ ...consultForm, completeNow: e.target.checked })} />
                <span>Mark Consultation as Completed</span>
              </label>
            )}
            <button type="submit" disabled={busy} className="w-full py-2.5 rounded-xl bg-[#073832] text-white font-bold">Save Consultation</button>
          </form>
        </div>
      )}

      {showRxModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <form onSubmit={handleIssueRx} className="bg-white rounded-3xl max-w-md w-full p-6 space-y-3 text-xs">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-extrabold text-[#073832]">Issue Electronic Prescription</h3>
              <button type="button" onClick={() => setShowRxModal(false)}><X className="w-5 h-5" /></button>
            </div>
            <select value={rxForm.medicineId} onChange={(e) => setRxForm({ ...rxForm, medicineId: e.target.value })} className="w-full px-3 py-2 border rounded-xl bg-white">
              <option value="">Select Medicine from Catalogue</option>
              {pharmacy?.medicines?.map((m: any) => <option key={m.id} value={m.id}>{m.name} ({m.availableStock} avail)</option>)}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <input required placeholder="Dosage" value={rxForm.dosage} onChange={(e) => setRxForm({ ...rxForm, dosage: e.target.value })} className="px-3 py-2 border rounded-xl" />
              <input required placeholder="Frequency" value={rxForm.frequency} onChange={(e) => setRxForm({ ...rxForm, frequency: e.target.value })} className="px-3 py-2 border rounded-xl" />
              <input required placeholder="Duration" value={rxForm.duration} onChange={(e) => setRxForm({ ...rxForm, duration: e.target.value })} className="px-3 py-2 border rounded-xl" />
              <input type="number" min={1} required placeholder="Qty" value={rxForm.quantityPrescribed} onChange={(e) => setRxForm({ ...rxForm, quantityPrescribed: Number(e.target.value) })} className="px-3 py-2 border rounded-xl" />
            </div>
            <button type="submit" disabled={busy} className="w-full py-2.5 rounded-xl bg-[#073832] text-white font-bold">Issue Prescription</button>
          </form>
        </div>
      )}

      {showLabReqModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <form onSubmit={handleRequestLab} className="bg-white rounded-3xl max-w-md w-full p-6 space-y-3 text-xs">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-extrabold text-[#073832]">Request Laboratory Test</h3>
              <button type="button" onClick={() => setShowLabReqModal(false)}><X className="w-5 h-5" /></button>
            </div>
            <select required value={labReqForm.patientId} onChange={(e) => setLabReqForm({ ...labReqForm, patientId: e.target.value })} className="w-full px-3 py-2 border rounded-xl bg-white">
              <option value="">Select Patient *</option>
              {patients.map((p) => <option key={p.id} value={p.id}>{p.patientNumber} — {p.fullName}</option>)}
            </select>
            <select required value={labReqForm.testId} onChange={(e) => setLabReqForm({ ...labReqForm, testId: e.target.value })} className="w-full px-3 py-2 border rounded-xl bg-white">
              <option value="">Select Lab Test *</option>
              {lab?.catalog?.map((t: any) => <option key={t.id} value={t.id}>{t.name} ({t.sampleType}) — GH₵{t.priceGHS}</option>)}
            </select>
            <select value={labReqForm.priority} onChange={(e) => setLabReqForm({ ...labReqForm, priority: e.target.value })} className="w-full px-3 py-2 border rounded-xl bg-white">
              <option value="ROUTINE">ROUTINE</option>
              <option value="URGENT">URGENT</option>
              <option value="STAT">STAT (Immediate)</option>
            </select>
            <textarea rows={2} placeholder="Clinical Notes / Indication" value={labReqForm.clinicalNotes} onChange={(e) => setLabReqForm({ ...labReqForm, clinicalNotes: e.target.value })} className="w-full px-3 py-2 border rounded-xl" />
            <button type="submit" disabled={busy} className="w-full py-2.5 rounded-xl bg-[#073832] text-white font-bold">Submit Lab Request</button>
          </form>
        </div>
      )}

      {printLabReport && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 flex items-center justify-center p-4 overflow-y-auto print:bg-white print:p-0">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-8 space-y-5 text-xs shadow-2xl print:shadow-none print:rounded-none">
            <div className="flex items-start justify-between border-b border-slate-200 pb-4">
              <div>
                <h2 className="text-lg font-extrabold text-[#073832]">Action Boat Medical Centre</h2>
                <p className="text-slate-500">Clinical Laboratory Department · Official Diagnostic Report</p>
              </div>
              <div className="text-right">
                <div className="font-extrabold text-slate-900">{printLabReport.requestNumber}</div>
                <div className="text-slate-500">Status: {printLabReport.status}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-2xl">
              <div><span className="text-slate-400">Patient Name:</span> <strong>{printLabReport.patient?.fullName}</strong></div>
              <div><span className="text-slate-400">Patient ID:</span> <strong>{printLabReport.patient?.patientNumber}</strong></div>
              <div><span className="text-slate-400">Gender / DOB:</span> <strong>{printLabReport.patient?.gender || '—'} {printLabReport.patient?.dateOfBirth ? `(${printLabReport.patient.dateOfBirth})` : ''}</strong></div>
              <div><span className="text-slate-400">Phone:</span> <strong>{printLabReport.patient?.phone || '—'}</strong></div>
              <div><span className="text-slate-400">Sample Type:</span> <strong>{printLabReport.test?.sampleType || 'Blood'}</strong></div>
              <div><span className="text-slate-400">Collected At:</span> <strong>{printLabReport.sampleCollectedAt ? new Date(printLabReport.sampleCollectedAt).toLocaleString('en-GH') : '—'}</strong></div>
            </div>

            <div className="border border-slate-200 rounded-2xl overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-100 text-[10px] uppercase text-slate-600">
                  <tr>
                    <th className="p-3">Test</th>
                    <th className="p-3">Result</th>
                    <th className="p-3">Unit</th>
                    <th className="p-3">Reference Range</th>
                    <th className="p-3">Flag</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-slate-100">
                    <td className="p-3 font-bold text-slate-900">{printLabReport.test?.name}</td>
                    <td className="p-3 font-extrabold text-[#073832] text-sm">{printLabReport.result?.resultValue}</td>
                    <td className="p-3">{printLabReport.result?.unit || '—'}</td>
                    <td className="p-3">{printLabReport.result?.referenceRange || '—'}</td>
                    <td className="p-3 font-bold">{printLabReport.result?.flag}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {printLabReport.result?.observations && (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="font-bold text-slate-700 mb-1">Laboratory Observations / Comments</div>
                <div className="text-slate-700 whitespace-pre-wrap">{printLabReport.result.observations}</div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-200 text-[11px] text-slate-600">
              <div>
                <div>Entered By: <strong>{printLabReport.result?.enteredByName || 'Lab Technician'}</strong></div>
                <div>Entered At: {printLabReport.result?.enteredAt ? new Date(printLabReport.result.enteredAt).toLocaleString('en-GH') : '—'}</div>
              </div>
              <div className="text-right">
                <div>Reviewed &amp; Released By: <strong>{printLabReport.result?.reviewedByName || printLabReport.reviewedByName || 'Pending Review'}</strong></div>
                <div>Reviewed At: {printLabReport.reviewedAt ? new Date(printLabReport.reviewedAt).toLocaleString('en-GH') : '—'}</div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 print:hidden">
              <button type="button" onClick={() => setPrintLabReport(null)} className="px-4 py-2 rounded-xl bg-slate-100 font-bold text-slate-700">
                Close
              </button>
              <button type="button" onClick={() => window.print()} className="px-4 py-2 rounded-xl bg-[#073832] text-white font-bold inline-flex items-center gap-1.5">
                <Printer className="w-4 h-4" />
                <span>Print Lab Report</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {showLabResultModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <form onSubmit={handleSaveLabResult} className="bg-white rounded-3xl max-w-md w-full p-6 space-y-3 text-xs">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-extrabold text-[#073832]">Enter Result — {showLabResultModal.requestNumber}</h3>
              <button type="button" onClick={() => setShowLabResultModal(null)}><X className="w-5 h-5" /></button>
            </div>
            <input required placeholder="Result Value *" value={labResultForm.resultValue} onChange={(e) => setLabResultForm({ ...labResultForm, resultValue: e.target.value })} className="w-full px-3 py-2 border rounded-xl" />
            <div className="grid grid-cols-2 gap-2">
              <input placeholder="Unit" value={labResultForm.unit} onChange={(e) => setLabResultForm({ ...labResultForm, unit: e.target.value })} className="px-3 py-2 border rounded-xl" />
              <input placeholder="Reference Range" value={labResultForm.referenceRange} onChange={(e) => setLabResultForm({ ...labResultForm, referenceRange: e.target.value })} className="px-3 py-2 border rounded-xl" />
            </div>
            <select value={labResultForm.flag} onChange={(e) => setLabResultForm({ ...labResultForm, flag: e.target.value })} className="w-full px-3 py-2 border rounded-xl bg-white">
              <option value="NORMAL">NORMAL</option>
              <option value="ABNORMAL">ABNORMAL</option>
              <option value="CRITICAL">CRITICAL</option>
            </select>
            <textarea rows={2} placeholder="Observations" value={labResultForm.observations} onChange={(e) => setLabResultForm({ ...labResultForm, observations: e.target.value })} className="w-full px-3 py-2 border rounded-xl" />
            <button type="submit" disabled={busy} className="w-full py-2.5 rounded-xl bg-[#073832] text-white font-bold">Save Lab Result</button>
          </form>
        </div>
      )}

      {showMedicineModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              try {
                const res = await fetch('/api/clinic/pharmacy', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ action: 'create_medicine', ...medForm }),
                });
                if (res.ok) {
                  notify('Medicine added to catalogue.');
                  setShowMedicineModal(false);
                  await loadAll();
                }
              } finally {
                setBusy(false);
              }
            }}
            className="bg-white rounded-3xl max-w-md w-full p-6 space-y-3 text-xs"
          >
            <div className="flex justify-between items-center">
              <h3 className="text-base font-extrabold text-[#073832]">Add Medicine</h3>
              <button type="button" onClick={() => setShowMedicineModal(false)}><X className="w-5 h-5" /></button>
            </div>
            <input required placeholder="Medicine Name *" value={medForm.name} onChange={(e) => setMedForm({ ...medForm, name: e.target.value })} className="w-full px-3 py-2 border rounded-xl" />
            <div className="grid grid-cols-2 gap-2">
              <input placeholder="Dosage Form" value={medForm.dosageForm} onChange={(e) => setMedForm({ ...medForm, dosageForm: e.target.value })} className="px-3 py-2 border rounded-xl" />
              <input placeholder="Strength" value={medForm.strength} onChange={(e) => setMedForm({ ...medForm, strength: e.target.value })} className="px-3 py-2 border rounded-xl" />
              <input type="number" step="0.01" placeholder="Selling Price (GH₵)" value={medForm.sellingPrice} onChange={(e) => setMedForm({ ...medForm, sellingPrice: Number(e.target.value) })} className="px-3 py-2 border rounded-xl" />
              <input type="number" placeholder="Reorder Level" value={medForm.reorderLevel} onChange={(e) => setMedForm({ ...medForm, reorderLevel: Number(e.target.value) })} className="px-3 py-2 border rounded-xl" />
            </div>
            <button type="submit" disabled={busy} className="w-full py-2.5 rounded-xl bg-[#073832] text-white font-bold">Save Medicine</button>
          </form>
        </div>
      )}

      {showBatchModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              try {
                const res = await fetch('/api/clinic/pharmacy', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ action: 'receive_batch', medicineId: showBatchModal.id, ...batchForm }),
                });
                if (res.ok) {
                  notify('Stock batch received.');
                  setShowBatchModal(null);
                  await loadAll();
                }
              } finally {
                setBusy(false);
              }
            }}
            className="bg-white rounded-3xl max-w-md w-full p-6 space-y-3 text-xs"
          >
            <div className="flex justify-between items-center">
              <h3 className="text-base font-extrabold text-[#073832]">Receive Batch — {showBatchModal.name}</h3>
              <button type="button" onClick={() => setShowBatchModal(null)}><X className="w-5 h-5" /></button>
            </div>
            <input required placeholder="Batch Number *" value={batchForm.batchNumber} onChange={(e) => setBatchForm({ ...batchForm, batchNumber: e.target.value })} className="w-full px-3 py-2 border rounded-xl" />
            <div className="grid grid-cols-2 gap-2">
              <input type="number" min={1} required placeholder="Quantity" value={batchForm.quantity} onChange={(e) => setBatchForm({ ...batchForm, quantity: Number(e.target.value) })} className="px-3 py-2 border rounded-xl" />
              <input type="date" required value={batchForm.expiryDate} onChange={(e) => setBatchForm({ ...batchForm, expiryDate: e.target.value })} className="px-3 py-2 border rounded-xl" />
            </div>
            <button type="submit" disabled={busy} className="w-full py-2.5 rounded-xl bg-[#073832] text-white font-bold">Receive Stock</button>
          </form>
        </div>
      )}

      {showInvoiceModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <form onSubmit={handleCreateInvoice} className="bg-white rounded-3xl max-w-md w-full p-6 space-y-3 text-xs">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-extrabold text-[#073832]">Generate Patient Invoice</h3>
              <button type="button" onClick={() => setShowInvoiceModal(false)}><X className="w-5 h-5" /></button>
            </div>
            <select required value={invoiceForm.patientId} onChange={(e) => setInvoiceForm({ ...invoiceForm, patientId: e.target.value })} className="w-full px-3 py-2 border rounded-xl bg-white">
              <option value="">Select Patient *</option>
              {patients.map((p) => <option key={p.id} value={p.id}>{p.patientNumber} — {p.fullName}</option>)}
            </select>
            <input required placeholder="Invoice Title" value={invoiceForm.title} onChange={(e) => setInvoiceForm({ ...invoiceForm, title: e.target.value })} className="w-full px-3 py-2 border rounded-xl" />
            <div className="grid grid-cols-2 gap-2">
              <select value={invoiceForm.itemType} onChange={(e) => setInvoiceForm({ ...invoiceForm, itemType: e.target.value })} className="px-3 py-2 border rounded-xl bg-white">
                <option value="CONSULTATION">CONSULTATION</option>
                <option value="LAB_TEST">LAB_TEST</option>
                <option value="MEDICINE">MEDICINE</option>
                <option value="PROCEDURE">PROCEDURE</option>
                <option value="SERVICE">SERVICE</option>
              </select>
              <input type="number" step="0.01" placeholder="Unit Price (GH₵)" value={invoiceForm.unitPrice} onChange={(e) => setInvoiceForm({ ...invoiceForm, unitPrice: Number(e.target.value) })} className="px-3 py-2 border rounded-xl" />
            </div>
            <input required placeholder="Line Item Description" value={invoiceForm.description} onChange={(e) => setInvoiceForm({ ...invoiceForm, description: e.target.value })} className="w-full px-3 py-2 border rounded-xl" />
            <button type="submit" disabled={busy} className="w-full py-2.5 rounded-xl bg-[#073832] text-white font-bold">Generate Invoice (GH₵)</button>
          </form>
        </div>
      )}

      {showPayModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <form onSubmit={handleRecordPayment} className="bg-white rounded-3xl max-w-md w-full p-6 space-y-3 text-xs">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-extrabold text-[#073832]">Record Payment — {showPayModal.invoiceNumber}</h3>
              <button type="button" onClick={() => setShowPayModal(null)}><X className="w-5 h-5" /></button>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 font-bold">Outstanding Balance: GH₵{showPayModal.balance.toFixed(2)}</div>
            <input type="number" step="0.01" required max={showPayModal.balance} value={payForm.amount} onChange={(e) => setPayForm({ ...payForm, amount: Number(e.target.value) })} className="w-full px-3 py-2 border rounded-xl" />
            <select value={payForm.method} onChange={(e) => setPayForm({ ...payForm, method: e.target.value })} className="w-full px-3 py-2 border rounded-xl bg-white">
              <option value="Mobile Money (MTN/Telecel)">Mobile Money (MTN / Telecel / AT)</option>
              <option value="Cash">Cash (GHS)</option>
              <option value="Card">Card</option>
              <option value="Bank Transfer">Bank Transfer</option>
            </select>
            <button type="submit" disabled={busy} className="w-full py-2.5 rounded-xl bg-[#073832] text-white font-bold">Confirm Payment</button>
          </form>
        </div>
      )}

      {showStaffModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              try {
                const res = await fetch('/api/clinic/catalog', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ entity: 'staff', ...staffForm }),
                });
                const data = await res.json();
                if (!res.ok) notify(data.error || 'Failed to add staff', 'err');
                else {
                  notify('Clinic staff role assigned.');
                  setShowStaffModal(false);
                  await loadAll();
                }
              } finally {
                setBusy(false);
              }
            }}
            className="bg-white rounded-3xl max-w-md w-full p-6 space-y-3 text-xs"
          >
            <div className="flex justify-between items-center">
              <h3 className="text-base font-extrabold text-[#073832]">Assign Clinic Staff Role</h3>
              <button type="button" onClick={() => setShowStaffModal(false)}><X className="w-5 h-5" /></button>
            </div>
            <input required placeholder="Full Name *" value={staffForm.name} onChange={(e) => setStaffForm({ ...staffForm, name: e.target.value })} className="w-full px-3 py-2 border rounded-xl" />
            <input required type="email" placeholder="Email (reuses existing User if found) *" value={staffForm.email} onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })} className="w-full px-3 py-2 border rounded-xl" />
            <select value={staffForm.clinicRole} onChange={(e) => setStaffForm({ ...staffForm, clinicRole: e.target.value })} className="w-full px-3 py-2 border rounded-xl bg-white">
              <option value="DOCTOR">DOCTOR</option>
              <option value="NURSE">NURSE</option>
              <option value="RECEPTIONIST">RECEPTIONIST</option>
              <option value="PHARMACIST">PHARMACIST</option>
              <option value="LAB_TECH">LAB_TECH</option>
              <option value="CASHIER">CASHIER</option>
              <option value="CLINIC_ADMIN">CLINIC_ADMIN</option>
            </select>
            <input placeholder="Phone (+233)" value={staffForm.phone} onChange={(e) => setStaffForm({ ...staffForm, phone: e.target.value })} className="w-full px-3 py-2 border rounded-xl" />
            <button type="submit" disabled={busy} className="w-full py-2.5 rounded-xl bg-[#073832] text-white font-bold">Save Staff Assignment</button>
          </form>
        </div>
      )}
    </div>
  );
}
