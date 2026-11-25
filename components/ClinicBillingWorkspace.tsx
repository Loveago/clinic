'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CreditCard,
  FileText,
  FlaskConical,
  Pill,
  Plus,
  Printer,
  RefreshCw,
  RotateCcw,
  Scan,
  Scissors,
  Search,
  Sparkles,
  Stethoscope,
  Trash2,
  User,
  Wallet,
  X,
  CheckCircle2,
  AlertCircle,
  Ban,
  Percent,
} from 'lucide-react';

export interface ClinicBillingWorkspaceProps {
  clinicName?: string;
  userRole?: string;
  onInvoiceUpdated?: () => void;
}

interface PatientSummary {
  id: string;
  patientNumber: string;
  fullName: string;
  phone: string;
  email?: string | null;
  ghanaCardNumber?: string | null;
  address?: string | null;
}

interface DraftLineItem {
  key: string;
  itemType: 'SERVICE' | 'CONSULTATION' | 'LAB_TEST' | 'MEDICINE' | 'IMAGING' | 'PROCEDURE' | 'CUSTOM';
  referenceId?: string | null;
  description: string;
  quantity: number;
  unitPrice: number;
}

interface UnbilledItem {
  itemType: string;
  referenceId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  sourceLabel: string;
  createdAt: string;
  alreadyInvoiced: boolean;
}

interface ClinicInvoice {
  id: string;
  invoiceNumber: string;
  patientId: string;
  patient?: PatientSummary;
  title: string;
  subtotal: number;
  discountAmount: number;
  adjustmentNote?: string | null;
  totalAmount: number;
  amountPaid: number;
  balance: number;
  status: string;
  notes?: string | null;
  createdAt: string;
  items: Array<{
    id: string;
    itemType: string;
    referenceId?: string | null;
    description: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
  payments: Array<{
    id: string;
    reference: string;
    amount: number;
    method: string;
    receiptNumber?: string | null;
    recordedByStaff?: string | null;
    createdAt: string;
  }>;
  refunds: Array<{
    id: string;
    amount: number;
    reason: string;
    approvedByName: string;
    createdAt: string;
  }>;
}

type PickerTab = 'services' | 'lab' | 'pharmacy' | 'imaging_proc' | 'custom';

const PAYMENT_METHODS = ['Cash', 'MoMo', 'Card', 'Bank Transfer', 'Paystack'] as const;

const STATUS_BADGE: Record<string, string> = {
  PAID: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  PARTIALLY_PAID: 'bg-amber-50 text-amber-700 border-amber-200',
  UNPAID: 'bg-rose-50 text-rose-700 border-rose-200',
  DRAFT: 'bg-slate-100 text-slate-600 border-slate-200',
  REFUNDED: 'bg-purple-50 text-purple-700 border-purple-200',
  CANCELLED: 'bg-slate-100 text-slate-400 border-slate-200 line-through',
};

const formatGHS = (n: number) =>
  `GH₵${Number(n || 0).toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function ClinicBillingWorkspace({
  clinicName: propClinicName,
  userRole: propUserRole,
  onInvoiceUpdated,
}: ClinicBillingWorkspaceProps) {
  const [view, setView] = useState<'invoices' | 'create'>('invoices');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null);

  // Core data
  const [clinicConfig, setClinicConfig] = useState<any>(null);
  const [effectiveRole, setEffectiveRole] = useState<string>(propUserRole || '');
  const [invoices, setInvoices] = useState<ClinicInvoice[]>([]);
  const [patients, setPatients] = useState<PatientSummary[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [labCatalog, setLabCatalog] = useState<any[]>([]);
  const [medicines, setMedicines] = useState<any[]>([]);
  const [imagingCatalog, setImagingCatalog] = useState<any[]>([]);
  const [procedureCatalog, setProcedureCatalog] = useState<any[]>([]);

  // Invoice list filters
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [invoiceSearch, setInvoiceSearch] = useState<string>('');

  // Create invoice builder state
  const [patientSearch, setPatientSearch] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [invoiceTitle, setInvoiceTitle] = useState('Clinic Visit & Services Bill');
  const [discountAmount, setDiscountAmount] = useState<string>('0');
  const [adjustmentNote, setAdjustmentNote] = useState('');
  const [invoiceNotes, setInvoiceNotes] = useState('');
  const [lineItems, setLineItems] = useState<DraftLineItem[]>([]);

  // Catalogue picker state
  const [pickerTab, setPickerTab] = useState<PickerTab>('services');
  const [pickerSearch, setPickerSearch] = useState('');
  const [customItem, setCustomItem] = useState({
    description: '',
    itemType: 'CUSTOM' as DraftLineItem['itemType'],
    quantity: '1',
    unitPrice: '',
  });

  // Unbilled patient items state
  const [loadingUnbilled, setLoadingUnbilled] = useState(false);
  const [unbilledItems, setUnbilledItems] = useState<UnbilledItem[] | null>(null);

  // Modals
  const [payModalInvoice, setPayModalInvoice] = useState<ClinicInvoice | null>(null);
  const [payForm, setPayForm] = useState({ amount: '', method: 'Cash', reference: '' });

  const [refundModalInvoice, setRefundModalInvoice] = useState<ClinicInvoice | null>(null);
  const [refundForm, setRefundForm] = useState({ amount: '', reason: '' });

  const [discountModalInvoice, setDiscountModalInvoice] = useState<ClinicInvoice | null>(null);
  const [discountForm, setDiscountForm] = useState({ discountAmount: '', reason: '' });

  const [printInvoice, setPrintInvoice] = useState<ClinicInvoice | null>(null);
  const [printMode, setPrintMode] = useState<'INVOICE' | 'RECEIPT'>('INVOICE');

  const isAdmin = ['CLINIC_SUPER_ADMIN', 'CLINIC_ADMIN', 'SUPER_ADMIN'].includes(effectiveRole);

  const loadWorkspaceData = useCallback(async () => {
    setLoading(true);
    try {
      const [invR, patR, catR, pharmR, imgR, procR, cfgR, meR] = await Promise.all([
        fetch('/api/clinic/billing'),
        fetch('/api/clinic/patients?limit=100'),
        fetch('/api/clinic/catalog'),
        fetch('/api/clinic/pharmacy'),
        fetch('/api/clinic/imaging'),
        fetch('/api/clinic/procedures'),
        fetch('/api/clinic/config'),
        propUserRole ? Promise.resolve(null) : fetch('/api/auth/me'),
      ]);

      if (invR.ok) setInvoices((await invR.json()).invoices || []);
      if (patR.ok) setPatients((await patR.json()).patients || []);
      if (catR.ok) {
        const catData = await catR.json();
        setServices(catData.services || []);
        setLabCatalog(catData.labCatalog || []);
      }
      if (pharmR.ok) setMedicines((await pharmR.json()).medicines || []);
      if (imgR.ok) setImagingCatalog((await imgR.json()).catalog || []);
      if (procR.ok) setProcedureCatalog((await procR.json()).catalog || []);
      if (cfgR.ok) setClinicConfig((await cfgR.json()).config || null);
      if (meR && meR.ok) {
        const me = (await meR.json()).user;
        setEffectiveRole(me?.clinicStaffProfile?.clinicRole || me?.role || '');
      }
    } catch (err) {
      console.error('Failed to load billing workspace:', err);
      setToast({ type: 'err', msg: 'Failed to load billing catalogues.' });
    } finally {
      setLoading(false);
    }
  }, [propUserRole]);

  useEffect(() => {
    loadWorkspaceData();
  }, [loadWorkspaceData]);

  const selectedPatient = useMemo(
    () => patients.find((p) => p.id === selectedPatientId) || null,
    [patients, selectedPatientId]
  );

  const filteredPatients = useMemo(() => {
    const q = patientSearch.trim().toLowerCase();
    if (!q) return patients;
    return patients.filter(
      (p) =>
        p.fullName.toLowerCase().includes(q) ||
        p.patientNumber.toLowerCase().includes(q) ||
        p.phone.toLowerCase().includes(q)
    );
  }, [patients, patientSearch]);

  const filteredInvoices = useMemo(() => {
    const q = invoiceSearch.trim().toLowerCase();
    return invoices.filter((inv) => {
      if (statusFilter !== 'ALL' && inv.status !== statusFilter) return false;
      if (!q) return true;
      return (
        inv.invoiceNumber.toLowerCase().includes(q) ||
        inv.title.toLowerCase().includes(q) ||
        (inv.patient?.fullName || '').toLowerCase().includes(q) ||
        (inv.patient?.patientNumber || '').toLowerCase().includes(q)
      );
    });
  }, [invoices, statusFilter, invoiceSearch]);

  const summary = useMemo(() => {
    const active = invoices.filter((i) => i.status !== 'CANCELLED');
    return {
      totalBilled: active.reduce((s, i) => s + Number(i.totalAmount || 0), 0),
      totalCollected: active.reduce((s, i) => s + Number(i.amountPaid || 0), 0),
      totalOutstanding: active.reduce((s, i) => s + Number(i.balance || 0), 0),
      unpaidCount: active.filter((i) => i.status === 'UNPAID' || i.status === 'PARTIALLY_PAID').length,
    };
  }, [invoices]);

  // Cart calculations
  const subtotal = useMemo(
    () => Number(lineItems.reduce((s, i) => s + i.quantity * i.unitPrice, 0).toFixed(2)),
    [lineItems]
  );
  const parsedDiscount = Math.min(subtotal, Math.max(0, Number(discountAmount) || 0));
  const netTotal = Number((subtotal - parsedDiscount).toFixed(2));

  const addLineItem = (item: Omit<DraftLineItem, 'key'>) => {
    setLineItems((prev) => {
      if (item.referenceId) {
        const existingIdx = prev.findIndex(
          (p) => p.referenceId === item.referenceId && p.itemType === item.itemType
        );
        if (existingIdx >= 0) {
          const copy = [...prev];
          copy[existingIdx] = {
            ...copy[existingIdx],
            quantity: copy[existingIdx].quantity + item.quantity,
          };
          return copy;
        }
      }
      return [
        ...prev,
        {
          ...item,
          key: `${item.itemType}-${item.referenceId || 'custom'}-${Date.now()}-${Math.random()}`,
        },
      ];
    });
  };

  const handleLoadUnbilledItems = async () => {
    if (!selectedPatientId) {
      setToast({ type: 'err', msg: 'Select a patient first to load their unbilled items.' });
      return;
    }
    setLoadingUnbilled(true);
    setUnbilledItems(null);
    try {
      const res = await fetch(
        `/api/clinic/billing?unbilledForPatientId=${encodeURIComponent(selectedPatientId)}`
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load unbilled items');
      setUnbilledItems(data.unbilledItems || []);
    } catch (e: any) {
      setToast({ type: 'err', msg: e.message || 'Failed to load unbilled items' });
    } finally {
      setLoadingUnbilled(false);
    }
  };

  const handleAddAllUnbilled = () => {
    if (!unbilledItems) return;
    const pending = unbilledItems.filter((u) => !u.alreadyInvoiced);
    for (const u of pending) {
      addLineItem({
        itemType: (u.itemType as DraftLineItem['itemType']) || 'SERVICE',
        referenceId: u.referenceId,
        description: u.description,
        quantity: u.quantity,
        unitPrice: u.unitPrice,
      });
    }
    setToast({ type: 'ok', msg: `Added ${pending.length} unbilled item(s) to invoice.` });
  };

  const handleCreateInvoice = async (mode: 'UNPAID' | 'DRAFT' | 'PAY_NOW') => {
    if (!selectedPatientId) {
      setToast({ type: 'err', msg: 'Please select a patient.' });
      return;
    }
    if (lineItems.length === 0) {
      setToast({ type: 'err', msg: 'Add at least one line item to the invoice.' });
      return;
    }
    setBusy(true);
    setToast(null);
    try {
      const res = await fetch('/api/clinic/billing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: selectedPatientId,
          title: invoiceTitle.trim() || 'Clinic Visit & Services Bill',
          discountAmount: parsedDiscount,
          adjustmentNote: adjustmentNote.trim() || null,
          notes: invoiceNotes.trim() || null,
          isDraft: mode === 'DRAFT',
          items: lineItems.map((i) => ({
            itemType: i.itemType,
            referenceId: i.referenceId || null,
            description: i.description,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create invoice');

      const created: ClinicInvoice = data.invoice;
      setInvoices((prev) => [created, ...prev]);
      setLineItems([]);
      setDiscountAmount('0');
      setAdjustmentNote('');
      setInvoiceNotes('');
      setUnbilledItems(null);
      setView('invoices');
      onInvoiceUpdated?.();

      if (mode === 'PAY_NOW') {
        setPayModalInvoice(created);
        setPayForm({ amount: String(created.balance), method: 'Cash', reference: '' });
        setToast({ type: 'ok', msg: `Invoice ${created.invoiceNumber} created. Ready for payment.` });
      } else {
        setToast({ type: 'ok', msg: `Invoice ${created.invoiceNumber} generated.` });
      }
    } catch (e: any) {
      setToast({ type: 'err', msg: e.message || 'Failed to create invoice' });
    } finally {
      setBusy(false);
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payModalInvoice) return;
    setBusy(true);
    setToast(null);
    try {
      const res = await fetch('/api/clinic/billing', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'record_payment',
          invoiceId: payModalInvoice.id,
          amount: Number(payForm.amount),
          method: payForm.method,
          reference: payForm.reference.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Payment failed');

      const updated: ClinicInvoice = data.invoice;
      setInvoices((prev) => prev.map((inv) => (inv.id === updated.id ? updated : inv)));
      setPayModalInvoice(null);
      setPrintInvoice(updated);
      setPrintMode('RECEIPT');
      setToast({
        type: 'ok',
        msg: `Payment of ${formatGHS(data.payment.amount)} recorded (Receipt: ${data.payment.receiptNumber}).`,
      });
      onInvoiceUpdated?.();
    } catch (e: any) {
      setToast({ type: 'err', msg: e.message || 'Payment failed' });
    } finally {
      setBusy(false);
    }
  };

  const handleRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refundModalInvoice) return;
    setBusy(true);
    setToast(null);
    try {
      const res = await fetch('/api/clinic/billing', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'refund',
          invoiceId: refundModalInvoice.id,
          amount: Number(refundForm.amount),
          reason: refundForm.reason,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Refund failed');

      const updated: ClinicInvoice = data.invoice;
      setInvoices((prev) => prev.map((inv) => (inv.id === updated.id ? updated : inv)));
      setRefundModalInvoice(null);
      setToast({ type: 'ok', msg: `Refund of ${formatGHS(Number(refundForm.amount))} issued.` });
      onInvoiceUpdated?.();
    } catch (e: any) {
      setToast({ type: 'err', msg: e.message || 'Refund failed' });
    } finally {
      setBusy(false);
    }
  };

  const handleApplyDiscount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!discountModalInvoice) return;
    setBusy(true);
    setToast(null);
    try {
      const res = await fetch('/api/clinic/billing', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'apply_discount',
          invoiceId: discountModalInvoice.id,
          discountAmount: Number(discountForm.discountAmount),
          reason: discountForm.reason,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Discount update failed');

      const updated: ClinicInvoice = data.invoice;
      setInvoices((prev) => prev.map((inv) => (inv.id === updated.id ? updated : inv)));
      setDiscountModalInvoice(null);
      setToast({ type: 'ok', msg: `Discount updated on ${updated.invoiceNumber}.` });
      onInvoiceUpdated?.();
    } catch (e: any) {
      setToast({ type: 'err', msg: e.message || 'Discount update failed' });
    } finally {
      setBusy(false);
    }
  };

  const handleInvoiceAction = async (invoiceId: string, action: 'cancel' | 'issue_draft') => {
    setBusy(true);
    setToast(null);
    try {
      const res = await fetch('/api/clinic/billing', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, invoiceId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Action failed');
      const updated: ClinicInvoice = data.invoice;
      setInvoices((prev) => prev.map((inv) => (inv.id === updated.id ? updated : inv)));
      setToast({
        type: 'ok',
        msg: action === 'cancel' ? `Invoice ${updated.invoiceNumber} cancelled.` : `Invoice ${updated.invoiceNumber} finalized.`,
      });
      onInvoiceUpdated?.();
    } catch (e: any) {
      setToast({ type: 'err', msg: e.message || 'Action failed' });
    } finally {
      setBusy(false);
    }
  };

  const resolvedClinicName = propClinicName || clinicConfig?.clinicName || 'Action Boat Medical Centre';
  const resolvedClinicPhone = clinicConfig?.phone || '+233 24 412 3456';
  const resolvedClinicEmail = clinicConfig?.email || 'actiondoctor2019@gmail.com';
  const resolvedClinicAddress = clinicConfig?.address || 'Accra, Ghana';

  const pq = pickerSearch.trim().toLowerCase();

  return (
    <div className="space-y-5">
      {/* Print-only isolation CSS */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #clinic-printable-receipt,
          #clinic-printable-receipt * {
            visibility: visible !important;
          }
          #clinic-printable-receipt {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            background: #ffffff !important;
            padding: 20px !important;
            box-shadow: none !important;
            border: none !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Header & Mode Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Clinic Billing, Cashier &amp; Receipts</h2>
          <p className="text-xs text-slate-500">
            Generate itemized bills in GH₵, pull unbilled prescriptions/labs, record Cash/MoMo/Paystack payments &amp; print receipts.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadWorkspaceData}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            type="button"
            onClick={() => setView('invoices')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition ${
              view === 'invoices'
                ? 'bg-slate-900 text-white'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Invoices &amp; Payments ({invoices.length})
          </button>
          <button
            type="button"
            onClick={() => setView('create')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition ${
              view === 'create'
                ? 'bg-teal-600 text-white'
                : 'bg-teal-600/90 text-white hover:bg-teal-700'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            New Invoice
          </button>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div
          className={`px-4 py-2.5 rounded-xl border text-xs font-semibold flex items-center justify-between ${
            toast.type === 'ok'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <span className="flex items-center gap-2">
            {toast.type === 'ok' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {toast.msg}
          </span>
          <button type="button" onClick={() => setToast(null)}>
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <p className="text-[11px] font-semibold text-slate-500 uppercase">Total Billed</p>
          <p className="text-xl font-extrabold text-slate-900 mt-1">{formatGHS(summary.totalBilled)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <p className="text-[11px] font-semibold text-slate-500 uppercase">Total Collected</p>
          <p className="text-xl font-extrabold text-emerald-700 mt-1">{formatGHS(summary.totalCollected)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <p className="text-[11px] font-semibold text-slate-500 uppercase">Outstanding Balance</p>
          <p className="text-xl font-extrabold text-rose-600 mt-1">{formatGHS(summary.totalOutstanding)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <p className="text-[11px] font-semibold text-slate-500 uppercase">Pending Invoices</p>
          <p className="text-xl font-extrabold text-amber-600 mt-1">{summary.unpaidCount}</p>
        </div>
      </div>

      {/* VIEW 1: INVOICES & PAYMENTS */}
      {view === 'invoices' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="relative flex-1 min-w-[220px] max-w-sm">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                placeholder="Search invoice #, patient name, or ID..."
                value={invoiceSearch}
                onChange={(e) => setInvoiceSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 text-xs"
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {['ALL', 'UNPAID', 'PARTIALLY_PAID', 'PAID', 'DRAFT', 'REFUNDED', 'CANCELLED'].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border transition ${
                    statusFilter === st
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {st.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {filteredInvoices.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500 space-y-2">
              <p>No invoices match your filter.</p>
              <button
                type="button"
                onClick={() => setView('create')}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-teal-600 text-white font-semibold"
              >
                <Plus className="w-3.5 h-3.5" /> Create First Invoice
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredInvoices.map((inv) => (
                <div
                  key={inv.id}
                  className="p-4 rounded-xl border border-slate-200 hover:border-slate-300 transition flex flex-col lg:flex-row lg:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-xs text-slate-900">{inv.invoiceNumber}</span>
                      <span
                        className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${
                          STATUS_BADGE[inv.status] || 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {inv.status.replace('_', ' ')}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {new Date(inv.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-slate-800">
                      {inv.patient?.fullName || 'Patient'}{' '}
                      <span className="text-slate-400 font-normal">
                        ({inv.patient?.patientNumber}) • {inv.title}
                      </span>
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {inv.items.length} item(s):{' '}
                      {inv.items
                        .slice(0, 3)
                        .map((i) => `${i.description} ×${i.quantity}`)
                        .join(', ')}
                      {inv.items.length > 3 ? ` +${inv.items.length - 3} more` : ''}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-4">
                    <div className="text-right text-xs">
                      <p className="font-bold text-slate-900">Total: {formatGHS(inv.totalAmount)}</p>
                      <p className="text-[11px] text-emerald-700">Paid: {formatGHS(inv.amountPaid)}</p>
                      {inv.balance > 0 && (
                        <p className="text-[11px] font-bold text-rose-600">
                          Balance: {formatGHS(inv.balance)}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      {inv.status === 'DRAFT' && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => handleInvoiceAction(inv.id, 'issue_draft')}
                          className="px-2.5 py-1.5 rounded-lg bg-teal-600 text-white text-[11px] font-semibold hover:bg-teal-700"
                        >
                          Finalize
                        </button>
                      )}
                      {inv.balance > 0 && !['CANCELLED', 'REFUNDED', 'DRAFT'].includes(inv.status) && (
                        <button
                          type="button"
                          onClick={() => {
                            setPayModalInvoice(inv);
                            setPayForm({ amount: String(inv.balance), method: 'Cash', reference: '' });
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white text-[11px] font-semibold hover:bg-emerald-700"
                        >
                          <Wallet className="w-3 h-3" /> Record Payment
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setPrintInvoice(inv);
                          setPrintMode(inv.amountPaid > 0 ? 'RECEIPT' : 'INVOICE');
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 text-[11px] font-semibold hover:bg-slate-50"
                      >
                        <Printer className="w-3 h-3" /> Print
                      </button>
                      {inv.status !== 'PAID' && inv.status !== 'CANCELLED' && inv.status !== 'REFUNDED' && (
                        <button
                          type="button"
                          onClick={() => {
                            setDiscountModalInvoice(inv);
                            setDiscountForm({
                              discountAmount: String(inv.discountAmount || 0),
                              reason: inv.adjustmentNote || '',
                            });
                          }}
                          title="Apply Discount"
                          className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                        >
                          <Percent className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {isAdmin && inv.amountPaid > 0 && inv.status !== 'REFUNDED' && (
                        <button
                          type="button"
                          onClick={() => {
                            setRefundModalInvoice(inv);
                            setRefundForm({ amount: String(inv.amountPaid), reason: '' });
                          }}
                          title="Issue Refund"
                          className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg border border-purple-200 bg-purple-50 text-purple-700 text-[11px] font-semibold hover:bg-purple-100"
                        >
                          <RotateCcw className="w-3 h-3" /> Refund
                        </button>
                      )}
                      {inv.amountPaid === 0 && inv.status !== 'CANCELLED' && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => handleInvoiceAction(inv.id, 'cancel')}
                          title="Cancel Invoice"
                          className="p-1.5 rounded-lg border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100"
                        >
                          <Ban className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: CREATE NEW INVOICE */}
      {view === 'create' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
          {/* LEFT: Patient Selection & Catalogue Picker */}
          <div className="xl:col-span-7 space-y-4">
            {/* Step 1: Patient Selector + Unbilled Items Loader */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <User className="w-4 h-4 text-teal-600" /> 1. Select Patient
                </h3>
                <button
                  type="button"
                  disabled={!selectedPatientId || loadingUnbilled}
                  onClick={handleLoadUnbilledItems}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold hover:bg-amber-100 disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {loadingUnbilled ? 'Loading...' : 'Load Unbilled Patient Items'}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    placeholder="Filter patients by name, ID or phone..."
                    value={patientSearch}
                    onChange={(e) => setPatientSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 rounded-lg border border-slate-200 text-xs"
                  />
                </div>
                <select
                  value={selectedPatientId}
                  onChange={(e) => {
                    setSelectedPatientId(e.target.value);
                    setUnbilledItems(null);
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs bg-white"
                >
                  <option value="">-- Choose Patient ({filteredPatients.length}) --</option>
                  {filteredPatients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.fullName} ({p.patientNumber}) • {p.phone}
                    </option>
                  ))}
                </select>
              </div>

              {selectedPatient && (
                <div className="p-2.5 rounded-xl bg-teal-50/70 border border-teal-200 text-xs flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="font-bold text-teal-950">{selectedPatient.fullName}</span>
                    <span className="text-teal-800 ml-2">
                      {selectedPatient.patientNumber} • {selectedPatient.phone}
                    </span>
                  </div>
                  {selectedPatient.ghanaCardNumber && (
                    <span className="text-[11px] font-semibold text-teal-800">
                      Ghana Card: {selectedPatient.ghanaCardNumber}
                    </span>
                  )}
                </div>
              )}

              {/* Unbilled Patient Items Panel */}
              {unbilledItems !== null && (
                <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-amber-900">
                      Recent Patient Clinical Items ({unbilledItems.filter((u) => !u.alreadyInvoiced).length} unbilled)
                    </p>
                    <div className="flex items-center gap-2">
                      {unbilledItems.some((u) => !u.alreadyInvoiced) && (
                        <button
                          type="button"
                          onClick={handleAddAllUnbilled}
                          className="px-2.5 py-1 rounded-lg bg-amber-600 text-white text-[11px] font-semibold hover:bg-amber-700"
                        >
                          + Add All Unbilled
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setUnbilledItems(null)}
                        className="text-amber-800 hover:text-amber-950"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  {unbilledItems.length === 0 ? (
                    <p className="text-[11px] text-amber-800">
                      No recent prescriptions, labs, imaging, or procedures found for this patient.
                    </p>
                  ) : (
                    <div className="max-h-44 overflow-y-auto space-y-1.5">
                      {unbilledItems.map((u, idx) => (
                        <div
                          key={`${u.referenceId}-${idx}`}
                          className="p-2 rounded-lg bg-white border border-amber-200/80 flex items-center justify-between gap-2 text-xs"
                        >
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-900 truncate">
                              {u.description}{' '}
                              <span className="text-[10px] text-slate-400">({u.sourceLabel})</span>
                            </p>
                            <p className="text-[11px] text-slate-500">
                              Qty: {u.quantity} × {formatGHS(u.unitPrice)} ={' '}
                              <strong>{formatGHS(u.quantity * u.unitPrice)}</strong>
                            </p>
                          </div>
                          {u.alreadyInvoiced ? (
                            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-500 text-[10px] font-semibold shrink-0">
                              Already Invoiced
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() =>
                                addLineItem({
                                  itemType: (u.itemType as DraftLineItem['itemType']) || 'SERVICE',
                                  referenceId: u.referenceId,
                                  description: u.description,
                                  quantity: u.quantity,
                                  unitPrice: u.unitPrice,
                                })
                              }
                              className="px-2.5 py-1 rounded-lg bg-teal-600 text-white text-[11px] font-semibold shrink-0 hover:bg-teal-700"
                            >
                              + Add
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Step 2: Catalogue Picker */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-slate-900">2. Pick Billable Items</h3>
                <div className="relative w-56">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                  <input
                    placeholder="Search catalogue..."
                    value={pickerSearch}
                    onChange={(e) => setPickerSearch(e.target.value)}
                    className="w-full pl-8 pr-2.5 py-1.5 rounded-lg border border-slate-200 text-xs"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {(
                  [
                    { key: 'services', label: `Services (${services.length})`, icon: Stethoscope },
                    { key: 'lab', label: `Lab Tests (${labCatalog.length})`, icon: FlaskConical },
                    { key: 'pharmacy', label: `Pharmacy (${medicines.length})`, icon: Pill },
                    {
                      key: 'imaging_proc',
                      label: `Imaging & Procedures (${imagingCatalog.length + procedureCatalog.length})`,
                      icon: Scan,
                    },
                    { key: 'custom', label: 'Custom Item', icon: Plus },
                  ] as const
                ).map((t) => {
                  const Icon = t.icon;
                  return (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => setPickerTab(t.key)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border transition ${
                        pickerTab === t.key
                          ? 'bg-teal-600 text-white border-teal-600'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {t.label}
                    </button>
                  );
                })}
              </div>

              {/* (a) Clinic Services */}
              {pickerTab === 'services' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
                  {services
                    .filter((s) => !pq || s.title.toLowerCase().includes(pq) || (s.category || '').toLowerCase().includes(pq))
                    .map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() =>
                          addLineItem({
                            itemType: s.category?.toLowerCase().includes('consult') ? 'CONSULTATION' : 'SERVICE',
                            referenceId: s.id,
                            description: s.title,
                            quantity: 1,
                            unitPrice: Number(s.feeGHS || 0),
                          })
                        }
                        className="p-2.5 rounded-xl border border-slate-200 hover:border-teal-400 hover:bg-teal-50/40 text-left flex items-center justify-between gap-2 transition"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 truncate">{s.title}</p>
                          <p className="text-[11px] text-slate-500">{s.category}</p>
                        </div>
                        <span className="text-xs font-bold text-teal-700 shrink-0">
                          {formatGHS(s.feeGHS)}
                        </span>
                      </button>
                    ))}
                </div>
              )}

              {/* (b) Lab Tests */}
              {pickerTab === 'lab' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
                  {labCatalog
                    .filter((l) => !pq || l.name.toLowerCase().includes(pq) || l.code.toLowerCase().includes(pq))
                    .map((l) => (
                      <button
                        key={l.id}
                        type="button"
                        onClick={() =>
                          addLineItem({
                            itemType: 'LAB_TEST',
                            referenceId: l.id,
                            description: `${l.name} (${l.code})`,
                            quantity: 1,
                            unitPrice: Number(l.priceGHS || 0),
                          })
                        }
                        className="p-2.5 rounded-xl border border-slate-200 hover:border-teal-400 hover:bg-teal-50/40 text-left flex items-center justify-between gap-2 transition"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 truncate">{l.name}</p>
                          <p className="text-[11px] text-slate-500">
                            {l.code} • {l.sampleType}
                          </p>
                        </div>
                        <span className="text-xs font-bold text-teal-700 shrink-0">
                          {formatGHS(l.priceGHS)}
                        </span>
                      </button>
                    ))}
                </div>
              )}

              {/* (c) Pharmacy Medicines with sellingPrice & available stock */}
              {pickerTab === 'pharmacy' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
                  {medicines
                    .filter(
                      (m) =>
                        !pq ||
                        m.name.toLowerCase().includes(pq) ||
                        (m.genericName || '').toLowerCase().includes(pq)
                    )
                    .map((m) => {
                      const stock = Number(m.availableStock ?? 0);
                      const stockBadge =
                        stock <= 0
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : m.isLowStock
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200';
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() =>
                            addLineItem({
                              itemType: 'MEDICINE',
                              referenceId: m.id,
                              description: `${m.name}${m.strength ? ` ${m.strength}` : ''} (${m.dosageForm})`,
                              quantity: 1,
                              unitPrice: Number(m.sellingPrice || 0),
                            })
                          }
                          className="p-2.5 rounded-xl border border-slate-200 hover:border-teal-400 hover:bg-teal-50/40 text-left flex items-center justify-between gap-2 transition"
                        >
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-900 truncate">
                              {m.name} {m.strength || ''}
                            </p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[10px] text-slate-500">{m.dosageForm}</span>
                              <span className={`px-1.5 py-0.5 rounded border text-[10px] font-semibold ${stockBadge}`}>
                                Stock: {stock}
                              </span>
                            </div>
                          </div>
                          <span className="text-xs font-bold text-teal-700 shrink-0">
                            {formatGHS(m.sellingPrice)}
                          </span>
                        </button>
                      );
                    })}
                </div>
              )}

              {/* (d) Imaging & Procedures */}
              {pickerTab === 'imaging_proc' && (
                <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                  <div>
                    <p className="text-[11px] font-bold text-slate-500 uppercase mb-1.5 flex items-center gap-1">
                      <Scan className="w-3 h-3" /> Radiology &amp; Imaging
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {imagingCatalog
                        .filter((i) => !pq || i.name.toLowerCase().includes(pq) || i.modality.toLowerCase().includes(pq))
                        .map((i) => (
                          <button
                            key={i.id}
                            type="button"
                            onClick={() =>
                              addLineItem({
                                itemType: 'IMAGING',
                                referenceId: i.id,
                                description: `${i.name} (${i.modality})`,
                                quantity: 1,
                                unitPrice: Number(i.priceGHS || 0),
                              })
                            }
                            className="p-2.5 rounded-xl border border-slate-200 hover:border-teal-400 hover:bg-teal-50/40 text-left flex items-center justify-between gap-2 transition"
                          >
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-900 truncate">{i.name}</p>
                              <p className="text-[11px] text-slate-500">{i.code} • {i.modality}</p>
                            </div>
                            <span className="text-xs font-bold text-teal-700 shrink-0">{formatGHS(i.priceGHS)}</span>
                          </button>
                        ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-slate-500 uppercase mb-1.5 flex items-center gap-1">
                      <Scissors className="w-3 h-3" /> Clinical Procedures
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {procedureCatalog
                        .filter((p) => !pq || p.name.toLowerCase().includes(pq) || p.category.toLowerCase().includes(pq))
                        .map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() =>
                              addLineItem({
                                itemType: 'PROCEDURE',
                                referenceId: p.id,
                                description: `${p.name} (${p.category})`,
                                quantity: 1,
                                unitPrice: Number(p.priceGHS || 0),
                              })
                            }
                            className="p-2.5 rounded-xl border border-slate-200 hover:border-teal-400 hover:bg-teal-50/40 text-left flex items-center justify-between gap-2 transition"
                          >
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-900 truncate">{p.name}</p>
                              <p className="text-[11px] text-slate-500">{p.code} • {p.category}</p>
                            </div>
                            <span className="text-xs font-bold text-teal-700 shrink-0">{formatGHS(p.priceGHS)}</span>
                          </button>
                        ))}
                    </div>
                  </div>
                </div>
              )}

              {/* (e) Custom Item */}
              {pickerTab === 'custom' && (
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 pt-1">
                  <input
                    placeholder="Item / Charge Description"
                    value={customItem.description}
                    onChange={(e) => setCustomItem({ ...customItem, description: e.target.value })}
                    className="sm:col-span-2 px-3 py-2 rounded-lg border border-slate-200 text-xs"
                  />
                  <input
                    type="number"
                    min="1"
                    placeholder="Qty"
                    value={customItem.quantity}
                    onChange={(e) => setCustomItem({ ...customItem, quantity: e.target.value })}
                    className="px-3 py-2 rounded-lg border border-slate-200 text-xs"
                  />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Unit Price (GH₵)"
                    value={customItem.unitPrice}
                    onChange={(e) => setCustomItem({ ...customItem, unitPrice: e.target.value })}
                    className="px-3 py-2 rounded-lg border border-slate-200 text-xs"
                  />
                  <button
                    type="button"
                    disabled={!customItem.description.trim() || !customItem.unitPrice}
                    onClick={() => {
                      addLineItem({
                        itemType: customItem.itemType,
                        description: customItem.description.trim(),
                        quantity: Math.max(1, Number(customItem.quantity) || 1),
                        unitPrice: Math.max(0, Number(customItem.unitPrice) || 0),
                      });
                      setCustomItem({ description: '', itemType: 'CUSTOM', quantity: '1', unitPrice: '' });
                    }}
                    className="sm:col-span-4 py-2 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 disabled:opacity-50"
                  >
                    + Add Custom Line Item
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: Invoice Summary & Totals */}
          <div className="xl:col-span-5 bg-white rounded-2xl border border-slate-200 p-5 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-900">3. Invoice Builder</h3>
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Invoice Title</label>
                <input
                  value={invoiceTitle}
                  onChange={(e) => setInvoiceTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs"
                />
              </div>

              {lineItems.length === 0 ? (
                <div className="py-10 text-center rounded-xl border border-dashed border-slate-200 text-xs text-slate-400">
                  Select items from the catalogues or load unbilled patient items.
                </div>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {lineItems.map((item) => (
                    <div
                      key={item.key}
                      className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-slate-900 truncate">{item.description}</p>
                        <p className="text-[10px] text-slate-500">{item.itemType}</p>
                      </div>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => {
                          const qty = Math.max(1, Number(e.target.value) || 1);
                          setLineItems((prev) =>
                            prev.map((x) => (x.key === item.key ? { ...x, quantity: qty } : x))
                          );
                        }}
                        className="w-14 px-2 py-1 rounded border border-slate-200 bg-white text-center text-xs"
                      />
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unitPrice}
                        onChange={(e) => {
                          const price = Math.max(0, Number(e.target.value) || 0);
                          setLineItems((prev) =>
                            prev.map((x) => (x.key === item.key ? { ...x, unitPrice: price } : x))
                          );
                        }}
                        className="w-20 px-2 py-1 rounded border border-slate-200 bg-white text-right text-xs"
                      />
                      <span className="w-20 text-right font-bold text-slate-900 shrink-0">
                        {formatGHS(item.quantity * item.unitPrice)}
                      </span>
                      <button
                        type="button"
                        onClick={() => setLineItems((prev) => prev.filter((x) => x.key !== item.key))}
                        className="text-rose-500 hover:text-rose-700"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 pt-2">
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                    Discount (GH₵)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={discountAmount}
                    onChange={(e) => setDiscountAmount(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                    Discount / Adjustment Note
                  </label>
                  <input
                    placeholder="e.g. NHIS / Staff Waiver"
                    value={adjustmentNote}
                    onChange={(e) => setAdjustmentNote(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Notes</label>
                <input
                  placeholder="Optional billing notes..."
                  value={invoiceNotes}
                  onChange={(e) => setInvoiceNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs"
                />
              </div>
            </div>

            <div className="border-t border-slate-200 pt-4 space-y-3">
              <div className="space-y-1 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal</span>
                  <span>{formatGHS(subtotal)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Discount</span>
                  <span>- {formatGHS(parsedDiscount)}</span>
                </div>
                <div className="flex justify-between text-base font-extrabold text-slate-900 pt-1 border-t border-slate-100">
                  <span>Total Due</span>
                  <span className="text-teal-700">{formatGHS(netTotal)}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  disabled={busy || !selectedPatientId || lineItems.length === 0}
                  onClick={() => handleCreateInvoice('DRAFT')}
                  className="py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 disabled:opacity-50"
                >
                  Save Draft
                </button>
                <button
                  type="button"
                  disabled={busy || !selectedPatientId || lineItems.length === 0}
                  onClick={() => handleCreateInvoice('UNPAID')}
                  className="py-2.5 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 disabled:opacity-50"
                >
                  Generate Invoice
                </button>
                <button
                  type="button"
                  disabled={busy || !selectedPatientId || lineItems.length === 0}
                  onClick={() => handleCreateInvoice('PAY_NOW')}
                  className="py-2.5 rounded-xl bg-teal-600 text-white text-xs font-semibold hover:bg-teal-700 disabled:opacity-50"
                >
                  Generate &amp; Pay
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RECORD PAYMENT MODAL */}
      {payModalInvoice && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <form
            onSubmit={handleRecordPayment}
            className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-5 space-y-4 shadow-xl"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-600" /> Record Payment
              </h3>
              <button type="button" onClick={() => setPayModalInvoice(null)}>
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
              <p className="font-bold text-slate-900">{payModalInvoice.invoiceNumber}</p>
              <p className="text-slate-600">{payModalInvoice.patient?.fullName}</p>
              <p className="text-rose-600 font-bold">
                Outstanding Balance: {formatGHS(payModalInvoice.balance)}
              </p>
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-slate-700">Amount (GH₵)</label>
                  <button
                    type="button"
                    onClick={() => setPayForm({ ...payForm, amount: String(payModalInvoice.balance) })}
                    className="text-[11px] font-semibold text-teal-700 hover:underline"
                  >
                    Full Balance
                  </button>
                </div>
                <input
                  type="number"
                  required
                  min="0.01"
                  max={payModalInvoice.balance}
                  step="0.01"
                  value={payForm.amount}
                  onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Payment Method</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {PAYMENT_METHODS.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setPayForm({ ...payForm, method: m })}
                      className={`py-2 px-2 rounded-lg border text-[11px] font-semibold transition ${
                        payForm.method === m
                          ? 'bg-teal-600 text-white border-teal-600'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Transaction / MoMo / Paystack Reference (Optional)
                </label>
                <input
                  placeholder="Auto-generated if left blank"
                  value={payForm.reference}
                  onChange={(e) => setPayForm({ ...payForm, reference: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPayModalInvoice(null)}
                className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busy}
                className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 disabled:opacity-50"
              >
                {busy ? 'Processing...' : 'Confirm Payment & Receipt'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* REFUND MODAL */}
      {refundModalInvoice && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <form
            onSubmit={handleRefund}
            className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-5 space-y-4 shadow-xl"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Issue Clinic Refund</h3>
              <button type="button" onClick={() => setRefundModalInvoice(null)}>
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
            <p className="text-xs text-slate-600">
              Invoice <strong>{refundModalInvoice.invoiceNumber}</strong> • Paid:{' '}
              <strong>{formatGHS(refundModalInvoice.amountPaid)}</strong>
            </p>
            <div className="space-y-3 text-xs">
              <input
                type="number"
                required
                min="0.01"
                max={refundModalInvoice.amountPaid}
                step="0.01"
                placeholder="Refund Amount (GH₵)"
                value={refundForm.amount}
                onChange={(e) => setRefundForm({ ...refundForm, amount: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200"
              />
              <textarea
                required
                rows={3}
                placeholder="Authorized reason for refund..."
                value={refundForm.reason}
                onChange={(e) => setRefundForm({ ...refundForm, reason: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRefundModalInvoice(null)}
                className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busy}
                className="px-4 py-2 rounded-lg bg-purple-600 text-white text-xs font-semibold hover:bg-purple-700"
              >
                Authorize Refund
              </button>
            </div>
          </form>
        </div>
      )}

      {/* DISCOUNT MODAL */}
      {discountModalInvoice && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <form
            onSubmit={handleApplyDiscount}
            className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-5 space-y-4 shadow-xl"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Apply Discount / Adjustment</h3>
              <button type="button" onClick={() => setDiscountModalInvoice(null)}>
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
            <div className="space-y-3 text-xs">
              <input
                type="number"
                required
                min="0"
                max={discountModalInvoice.subtotal}
                step="0.01"
                placeholder="Discount Amount (GH₵)"
                value={discountForm.discountAmount}
                onChange={(e) => setDiscountForm({ ...discountForm, discountAmount: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200"
              />
              <input
                required
                placeholder="Adjustment Reason (e.g. NHIS Co-pay Waiver)"
                value={discountForm.reason}
                onChange={(e) => setDiscountForm({ ...discountForm, reason: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDiscountModalInvoice(null)}
                className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busy}
                className="px-4 py-2 rounded-lg bg-slate-900 text-white text-xs font-semibold"
              >
                Save Adjustment
              </button>
            </div>
          </form>
        </div>
      )}

      {/* PRINTABLE INVOICE & OFFICIAL RECEIPT MODAL */}
      {printInvoice && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-2xl w-full shadow-2xl overflow-hidden">
            {/* Toolbar (hidden when printing) */}
            <div className="no-print px-5 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPrintMode('INVOICE')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                    printMode === 'INVOICE'
                      ? 'bg-slate-900 text-white'
                      : 'bg-white border border-slate-200 text-slate-700'
                  }`}
                >
                  Invoice View
                </button>
                <button
                  type="button"
                  onClick={() => setPrintMode('RECEIPT')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                    printMode === 'RECEIPT'
                      ? 'bg-teal-600 text-white'
                      : 'bg-white border border-slate-200 text-slate-700'
                  }`}
                >
                  Official Receipt View
                </button>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-teal-600 text-white text-xs font-semibold hover:bg-teal-700"
                >
                  <Printer className="w-3.5 h-3.5" /> Print / Save PDF
                </button>
                <button
                  type="button"
                  onClick={() => setPrintInvoice(null)}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Printable Document Body */}
            <div id="clinic-printable-receipt" className="p-6 sm:p-8 space-y-5 text-slate-900 text-xs">
              <div className="flex items-start justify-between border-b border-slate-200 pb-4">
                <div>
                  <h2 className="text-lg font-extrabold text-slate-900">{resolvedClinicName}</h2>
                  <p className="text-slate-500">{resolvedClinicAddress}</p>
                  <p className="text-slate-500">
                    {resolvedClinicPhone} • {resolvedClinicEmail}
                  </p>
                </div>
                <div className="text-right">
                  <span className="inline-block px-2.5 py-1 rounded bg-slate-900 text-white text-[11px] font-bold tracking-wide uppercase">
                    {printMode === 'RECEIPT' ? 'Official Payment Receipt' : 'Clinic Tax Invoice'}
                  </span>
                  <p className="font-bold mt-2">{printInvoice.invoiceNumber}</p>
                  <p className="text-slate-500">
                    Date: {new Date(printInvoice.createdAt).toLocaleDateString('en-GH')}
                  </p>
                  <p className="text-slate-500">Status: {printInvoice.status.replace('_', ' ')}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div>
                  <p className="text-[10px] font-bold uppercase text-slate-400">Billed To (Patient)</p>
                  <p className="font-bold text-slate-900 mt-0.5">{printInvoice.patient?.fullName}</p>
                  <p className="text-slate-600">Patient ID: {printInvoice.patient?.patientNumber}</p>
                  <p className="text-slate-600">Phone: {printInvoice.patient?.phone}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold uppercase text-slate-400">Bill Description</p>
                  <p className="font-semibold text-slate-900 mt-0.5">{printInvoice.title}</p>
                  {printInvoice.patient?.ghanaCardNumber && (
                    <p className="text-slate-600">Ghana Card: {printInvoice.patient.ghanaCardNumber}</p>
                  )}
                </div>
              </div>

              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-slate-300 text-left text-[11px] text-slate-500 uppercase">
                    <th className="py-2">Description</th>
                    <th className="py-2">Type</th>
                    <th className="py-2 text-center">Qty</th>
                    <th className="py-2 text-right">Unit (GH₵)</th>
                    <th className="py-2 text-right">Total (GH₵)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {printInvoice.items.map((item) => (
                    <tr key={item.id}>
                      <td className="py-2 font-medium text-slate-900">{item.description}</td>
                      <td className="py-2 text-slate-500">{item.itemType}</td>
                      <td className="py-2 text-center">{item.quantity}</td>
                      <td className="py-2 text-right">{Number(item.unitPrice).toFixed(2)}</td>
                      <td className="py-2 text-right font-semibold">{Number(item.totalPrice).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="flex justify-end">
                <div className="w-64 space-y-1.5 border-t border-slate-200 pt-3">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal</span>
                    <span>{formatGHS(printInvoice.subtotal)}</span>
                  </div>
                  {printInvoice.discountAmount > 0 && (
                    <div className="flex justify-between text-slate-600">
                      <span>Discount</span>
                      <span>- {formatGHS(printInvoice.discountAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-slate-900 border-t border-slate-200 pt-1.5">
                    <span>Net Total</span>
                    <span>{formatGHS(printInvoice.totalAmount)}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-emerald-700">
                    <span>Amount Paid</span>
                    <span>{formatGHS(printInvoice.amountPaid)}</span>
                  </div>
                  <div className="flex justify-between font-extrabold text-sm border-t border-slate-300 pt-1.5">
                    <span>Balance Due</span>
                    <span>{formatGHS(printInvoice.balance)}</span>
                  </div>
                </div>
              </div>

              {printInvoice.payments && printInvoice.payments.length > 0 && (
                <div className="border-t border-slate-200 pt-3 space-y-1.5">
                  <p className="text-[11px] font-bold uppercase text-slate-500">Payment Receipts Recorded</p>
                  {printInvoice.payments.map((p) => (
                    <div
                      key={p.id}
                      className="flex justify-between text-[11px] bg-emerald-50/60 border border-emerald-200 rounded-lg px-3 py-1.5"
                    >
                      <span>
                        <strong>{p.receiptNumber || p.reference}</strong> • {p.method} •{' '}
                        {new Date(p.createdAt).toLocaleString('en-GH')}
                      </span>
                      <span className="font-bold text-emerald-800">{formatGHS(p.amount)}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="border-t border-slate-200 pt-4 text-center text-[11px] text-slate-400">
                <p>{clinicConfig?.invoiceFooterNote || 'Thank you for choosing Action Boat Medical Centre. Wishing you a speedy recovery.'}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
