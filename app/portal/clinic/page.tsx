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
} from 'lucide-react';

type ClinicTab =
  | 'dashboard'
  | 'queue'
  | 'patients'
  | 'appointments'
  | 'consultations'
  | 'pharmacy'
  | 'lab'
  | 'billing'
  | 'catalog'
  | 'reports';

export default function ClinicManagementConsole() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
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
    fullName: '',
    phone: '+233',
    email: '',
    dateOfBirth: '',
    gender: 'Female',
    address: '',
    bloodGroup: '',
    allergies: '',
    emergencyName: '',
    emergencyPhone: '+233',
    emergencyRelation: '',
  });

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
        'SUPER_ADMIN',
        'CLINIC_ADMIN',
        'RECEPTIONIST',
        'DOCTOR',
        'NURSE',
        'PHARMACIST',
        'LAB_TECH',
        'CASHIER',
        'FINANCE_OFFICER',
      ];
      if (!meData?.user || !allowedRoles.includes(meData.user.role)) {
        router.replace('/auth/login');
        return;
      }

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

  const handleRegisterPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch('/api/clinic/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patientForm),
      });
      const data = await res.json();
      if (!res.ok) {
        notify(data.error || 'Registration failed', 'err');
      } else {
        notify(`Registered patient ${data.patient.patientNumber}`);
        setShowPatientModal(false);
        await loadAll();
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

  const navItems: Array<{ id: ClinicTab; label: string; icon: any }> = [
    { id: 'dashboard', label: 'Dashboard', icon: Activity },
    { id: 'queue', label: 'Reception & Queue', icon: ListOrdered },
    { id: 'patients', label: 'Patients', icon: Users },
    { id: 'appointments', label: 'Appointments', icon: Calendar },
    { id: 'consultations', label: 'Consultations', icon: Stethoscope },
    { id: 'pharmacy', label: 'Pharmacy & Stock', icon: Pill },
    { id: 'lab', label: 'Laboratory', icon: FlaskConical },
    { id: 'billing', label: 'Billing & Payments', icon: CreditCard },
    { id: 'catalog', label: 'Services & Staff', icon: Building2 },
    { id: 'reports', label: 'Reports & Audit', icon: BarChart3 },
  ];

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
                className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl transition ${
                  active ? 'bg-white text-[#073832] shadow-sm font-bold' : 'text-emerald-100/85 hover:bg-white/10'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-emerald-900/70 space-y-2 text-xs">
          <Link
            href="/portal/patient"
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-emerald-100 font-semibold"
          >
            <Users className="w-3.5 h-3.5" />
            <span>Patient Self-Portal</span>
          </Link>
          <Link
            href="/portal/admin"
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/15 text-emerald-200"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Main Admin Portal</span>
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3.5 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileNav(true)}
              className="lg:hidden p-2 rounded-xl bg-slate-100 text-slate-700"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-base sm:text-lg font-extrabold text-[#073832]">
                {navItems.find((n) => n.id === tab)?.label}
              </h1>
              <p className="text-[11px] text-slate-500">
                Clinical Operations · Africa/Accra · Currency: GH₵
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
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
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
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

          {/* TAB 3: PATIENTS */}
          {tab === 'patients' && (
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
                  onClick={() => setShowPatientModal(true)}
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
                              onClick={() => loadPatientDetail(p.id)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 font-bold"
                            >
                              Profile
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
                        <div className="text-sm font-extrabold text-[#073832]">{selectedPatient.fullName}</div>
                        <div className="text-slate-500">{selectedPatient.patientNumber} · {selectedPatient.phone}</div>
                        {selectedPatient.allergies && (
                          <div className="mt-2 px-2.5 py-1 rounded-lg bg-red-50 text-red-700 font-bold text-[11px]">
                            Allergies: {selectedPatient.allergies}
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
              <div className="flex justify-between items-center">
                <div className="text-xs font-bold text-slate-600">{consultations.length} consultation records</div>
                <button
                  onClick={() => {
                    setConsultForm({
                      ...consultForm,
                      id: '',
                      queueId: '',
                      patientId: patients[0]?.id || '',
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
              <div className="space-y-3">
                {consultations.map((c) => (
                  <div key={c.id} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm text-xs space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <span className="font-extrabold text-[#073832]">{c.consultationNumber}</span> ·{' '}
                        <span className="font-bold text-slate-900">{c.patient?.fullName}</span> ({c.patient?.patientNumber})
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${c.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                          {c.status}
                        </span>
                        <button
                          onClick={() => {
                            setRxForm({ ...rxForm, consultationId: c.id, patientId: c.patientId });
                            setShowRxModal(true);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-sky-50 text-sky-800 font-bold"
                        >
                          + Prescribe
                        </button>
                        <button
                          onClick={() => {
                            setLabReqForm({ ...labReqForm, consultationId: c.id, patientId: c.patientId });
                            setShowLabReqModal(true);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-purple-50 text-purple-800 font-bold"
                        >
                          + Lab Test
                        </button>
                        <button
                          onClick={() => {
                            setConsultForm({
                              ...consultForm,
                              id: c.id,
                              queueId: c.queueId || '',
                              patientId: c.patientId,
                              chiefComplaint: c.chiefComplaint,
                              hpi: c.hpi || '',
                              examFindings: c.examFindings || '',
                              treatmentPlan: c.treatmentPlan || '',
                              internalNotes: c.internalNotes || '',
                              bpSystolic: String(c.vitals?.bpSystolic || '120'),
                              bpDiastolic: String(c.vitals?.bpDiastolic || '80'),
                              temperatureC: String(c.vitals?.temperatureC || '36.8'),
                              pulseBpm: String(c.vitals?.pulseBpm || '76'),
                              spo2Percent: String(c.vitals?.spo2Percent || '98'),
                              weightKg: String(c.vitals?.weightKg || '68'),
                              heightCm: String(c.vitals?.heightCm || '168'),
                              diagnosisTitle: '',
                              diagnosisCode: '',
                              completeNow: false,
                              amendReason: '',
                            });
                            setShowConsultModal(true);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-bold"
                        >
                          {c.status === 'COMPLETED' ? 'Amend' : 'Edit / Complete'}
                        </button>
                      </div>
                    </div>
                    <div className="text-slate-600">
                      <strong>Complaint:</strong> {c.chiefComplaint} ·{' '}
                      <strong>Vitals:</strong> BP {c.vitals?.bpSystolic || '—'}/{c.vitals?.bpDiastolic || '—'}, Temp {c.vitals?.temperatureC || '—'}°C, BMI {c.vitals?.bmi || '—'}
                    </div>
                    {c.diagnoses?.length > 0 && (
                      <div className="text-slate-700">
                        <strong>Diagnoses:</strong> {c.diagnoses.map((d: any) => `${d.title}${d.code ? ` (${d.code})` : ''}`).join(', ')}
                      </div>
                    )}
                  </div>
                ))}
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
          {tab === 'lab' && lab && (
            <div className="space-y-4">
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
                    {lab.requests?.map((r: any) => (
                      <tr key={r.id}>
                        <td className="p-3.5 font-bold text-[#073832]">{r.requestNumber}</td>
                        <td className="p-3.5">{r.patient?.fullName} ({r.patient?.patientNumber})</td>
                        <td className="p-3.5 font-semibold">{r.test?.name} (GH₵{r.test?.priceGHS?.toFixed(2)})</td>
                        <td className="p-3.5">
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 text-[10px] font-bold">{r.status}</span>
                        </td>
                        <td className="p-3.5">
                          {r.result ? `${r.result.resultValue} ${r.result.unit || ''} (${r.result.flag})` : 'Pending'}
                        </td>
                        <td className="p-3.5 text-right space-x-1.5">
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
                              Enter Result
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
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="text-xs font-bold text-slate-600">{invoices.length} clinic invoices</div>
                <button
                  onClick={() => setShowInvoiceModal(true)}
                  className="px-4 py-2 rounded-xl bg-[#073832] text-white text-xs font-bold inline-flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Generate Patient Invoice</span>
                </button>
              </div>
              <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto shadow-sm">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase text-slate-500">
                    <tr>
                      <th className="p-3.5">Invoice #</th>
                      <th className="p-3.5">Patient</th>
                      <th className="p-3.5">Total</th>
                      <th className="p-3.5">Paid / Balance</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {invoices.map((inv) => (
                      <tr key={inv.id}>
                        <td className="p-3.5 font-bold text-[#073832]">{inv.invoiceNumber}</td>
                        <td className="p-3.5">{inv.patient?.fullName} ({inv.patient?.patientNumber})</td>
                        <td className="p-3.5 font-bold">GH₵{inv.totalAmount.toFixed(2)}</td>
                        <td className="p-3.5">
                          <span className="text-emerald-700 font-bold">GH₵{inv.amountPaid.toFixed(2)}</span> /{' '}
                          <span className="text-red-600 font-bold">GH₵{inv.balance.toFixed(2)}</span>
                        </td>
                        <td className="p-3.5">
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 text-[10px] font-bold">{inv.status}</span>
                        </td>
                        <td className="p-3.5 text-right space-x-1.5">
                          {inv.balance > 0 && inv.status !== 'CANCELLED' && (
                            <button
                              onClick={() => {
                                setShowPayModal(inv);
                                setPayForm({ ...payForm, amount: inv.balance });
                              }}
                              className="px-2.5 py-1 rounded-lg bg-[#073832] text-white font-bold"
                            >
                              Record Payment
                            </button>
                          )}
                          <button
                            onClick={() => window.print()}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-bold inline-flex items-center gap-1"
                          >
                            <Printer className="w-3 h-3" />
                            <span>Print</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
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
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <form onSubmit={handleRegisterPatient} className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-3 text-xs">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-extrabold text-[#073832]">Register New Patient</h3>
              <button type="button" onClick={() => setShowPatientModal(false)}><X className="w-5 h-5" /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input required placeholder="Full Name *" value={patientForm.fullName} onChange={(e) => setPatientForm({ ...patientForm, fullName: e.target.value })} className="px-3 py-2 border rounded-xl col-span-2" />
              <input required placeholder="Phone (+233...) *" value={patientForm.phone} onChange={(e) => setPatientForm({ ...patientForm, phone: e.target.value })} className="px-3 py-2 border rounded-xl" />
              <input placeholder="Email (optional)" value={patientForm.email} onChange={(e) => setPatientForm({ ...patientForm, email: e.target.value })} className="px-3 py-2 border rounded-xl" />
              <input type="date" value={patientForm.dateOfBirth} onChange={(e) => setPatientForm({ ...patientForm, dateOfBirth: e.target.value })} className="px-3 py-2 border rounded-xl" />
              <select value={patientForm.gender} onChange={(e) => setPatientForm({ ...patientForm, gender: e.target.value })} className="px-3 py-2 border rounded-xl bg-white">
                <option value="Female">Female</option>
                <option value="Male">Male</option>
              </select>
              <input placeholder="Residential Address" value={patientForm.address} onChange={(e) => setPatientForm({ ...patientForm, address: e.target.value })} className="px-3 py-2 border rounded-xl col-span-2" />
              <input placeholder="Known Allergies" value={patientForm.allergies} onChange={(e) => setPatientForm({ ...patientForm, allergies: e.target.value })} className="px-3 py-2 border rounded-xl col-span-2" />
              <input placeholder="Emergency Contact Name" value={patientForm.emergencyName} onChange={(e) => setPatientForm({ ...patientForm, emergencyName: e.target.value })} className="px-3 py-2 border rounded-xl" />
              <input placeholder="Emergency Phone (+233)" value={patientForm.emergencyPhone} onChange={(e) => setPatientForm({ ...patientForm, emergencyPhone: e.target.value })} className="px-3 py-2 border rounded-xl" />
            </div>
            <button type="submit" disabled={busy} className="w-full py-2.5 rounded-xl bg-[#073832] text-white font-bold">Save Patient</button>
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
            <select required value={labReqForm.testId} onChange={(e) => setLabReqForm({ ...labReqForm, testId: e.target.value })} className="w-full px-3 py-2 border rounded-xl bg-white">
              <option value="">Select Lab Test *</option>
              {lab?.catalog?.map((t: any) => <option key={t.id} value={t.id}>{t.name} (GH₵{t.priceGHS})</option>)}
            </select>
            <select value={labReqForm.priority} onChange={(e) => setLabReqForm({ ...labReqForm, priority: e.target.value })} className="w-full px-3 py-2 border rounded-xl bg-white">
              <option value="ROUTINE">ROUTINE</option>
              <option value="URGENT">URGENT</option>
            </select>
            <textarea rows={2} placeholder="Clinical Notes" value={labReqForm.clinicalNotes} onChange={(e) => setLabReqForm({ ...labReqForm, clinicalNotes: e.target.value })} className="w-full px-3 py-2 border rounded-xl" />
            <button type="submit" disabled={busy} className="w-full py-2.5 rounded-xl bg-[#073832] text-white font-bold">Submit Lab Request</button>
          </form>
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
