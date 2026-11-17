'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Award,
  CheckCircle2,
  CreditCard,
  DollarSign,
  Download,
  FileSpreadsheet,
  FileText,
  Layers,
  Plus,
  Receipt,
  TrendingUp,
  X,
  XCircle,
} from 'lucide-react';

export default function AdminFinanceWorkspace() {
  const [tab, setTab] = useState<'overview' | 'structures' | 'invoices' | 'discounts' | 'transactions'>('overview');
  const [fin, setFin] = useState<any>(null);
  const [fsData, setFsData] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);

  // Fee structure form
  const [showStructureModal, setShowStructureModal] = useState(false);
  const [structForm, setStructForm] = useState({
    name: '',
    programmeId: '',
    academicYear: '2025/2026',
    semester: 'First Semester',
    level: 'Level 100',
    studentCategory: 'ALL',
    items: [{ feeCategoryId: '', title: 'Tuition Fees', amount: 3000 }],
  });

  // Bulk/Single Invoice modal
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [invForm, setInvForm] = useState({
    mode: 'programme',
    programmeId: '',
    studentId: '',
    feeStructureId: '',
    level: 'Level 100',
    title: '',
    amount: 0,
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
  });

  // Offline Payment modal
  const [payInvoice, setPayInvoice] = useState<any>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('Offline Bank Deposit (GCB / Ecobank Ghana)');

  // Discount modal
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [discForm, setDiscForm] = useState({
    studentId: '',
    invoiceId: '',
    type: 'SCHOLARSHIP',
    title: '',
    adjustmentAmount: 500,
    reason: '',
    autoApprove: true,
  });

  const notify = (msg: string, type: 'ok' | 'err' = 'ok') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [fRes, fsRes, stRes] = await Promise.all([
        fetch('/api/admin/finance'),
        fetch('/api/admin/fee-structures'),
        fetch('/api/admin/students'),
      ]);
      const fJson = await fRes.json();
      const fsJson = await fsRes.json();
      const stJson = await stRes.json();
      setFin(fJson);
      setFsData(fsJson);
      setStudents(stJson.students || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const handleCreateStructure = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const catDefault = fsData?.categories?.[0]?.id || '';
      const payload = {
        ...structForm,
        items: structForm.items.map((it) => ({
          ...it,
          feeCategoryId: it.feeCategoryId || catDefault,
        })),
      };
      const res = await fetch('/api/admin/fee-structures', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const d = await res.json();
      if (res.ok) {
        notify('Fee structure created in GHS.');
        setShowStructureModal(false);
        await loadAll();
      } else {
        notify(d.error || 'Failed to create fee structure', 'err');
      }
    } finally {
      setBusy(false);
    }
  };

  const handleGenerateInvoices = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch('/api/admin/finance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate_invoices',
          feeStructureId: invForm.feeStructureId || undefined,
          programmeId: invForm.mode === 'programme' ? invForm.programmeId : undefined,
          studentId: invForm.mode === 'student' ? invForm.studentId : undefined,
          level: invForm.mode === 'programme' ? invForm.level : undefined,
          title: invForm.title || undefined,
          amount: invForm.amount ? Number(invForm.amount) : undefined,
          dueDate: invForm.dueDate,
        }),
      });
      const d = await res.json();
      if (res.ok) {
        notify(`Generated ${d.count} invoice(s) successfully.`);
        setShowInvoiceModal(false);
        await loadAll();
      } else {
        notify(d.error || 'Invoice generation failed', 'err');
      }
    } finally {
      setBusy(false);
    }
  };

  const handleOfflinePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payInvoice) return;
    setBusy(true);
    try {
      const res = await fetch('/api/admin/finance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'record_offline_payment',
          invoiceId: payInvoice.id,
          amount: Number(payAmount),
          method: payMethod,
        }),
      });
      const d = await res.json();
      if (res.ok) {
        notify('Offline payment recorded and receipt issued.');
        setPayInvoice(null);
        await loadAll();
      } else {
        notify(d.error || 'Payment recording failed', 'err');
      }
    } finally {
      setBusy(false);
    }
  };

  const handleCreateDiscount = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch('/api/admin/finance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create_discount', ...discForm }),
      });
      const d = await res.json();
      if (res.ok) {
        notify('Scholarship / discount recorded.');
        setShowDiscountModal(false);
        await loadAll();
      } else {
        notify(d.error || 'Failed to save adjustment', 'err');
      }
    } finally {
      setBusy(false);
    }
  };

  const handleDiscountDecision = async (discountId: string, action: 'approve_discount' | 'reject_discount') => {
    const res = await fetch('/api/admin/finance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, discountId }),
    });
    const d = await res.json();
    if (res.ok) {
      notify(action === 'approve_discount' ? 'Adjustment approved & applied.' : 'Adjustment rejected.');
      await loadAll();
    } else {
      notify(d.error || 'Action denied', 'err');
    }
  };

  const stats = fin?.stats || {};
  const breakdowns = fin?.breakdowns || {};
  const invoices = fin?.invoices || [];
  const payments = fin?.payments || [];
  const discounts = fin?.discounts || [];
  const structures = fsData?.structures || [];
  const categories = fsData?.categories || [];
  const programmes = fsData?.programmes || [];

  const fmt = (n: number) => `GH₵ ${Number(n || 0).toLocaleString('en-GH', { minimumFractionDigits: 2 })}`;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <header className="sticky top-0 z-30 bg-[#073832] text-white border-b border-emerald-900/60 px-4 sm:px-8 py-3.5 shadow-md">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link href="/portal/admin" className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-base font-extrabold tracking-tight flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-300" />
                Finance, Fee Structures &amp; Reconciliation (GHS)
              </h1>
              <p className="text-[11px] text-emerald-200">
                Fee Versioning, Bulk Invoicing, Paystack Ghana Verification, Scholarships &amp; Financial Reports
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 text-xs font-bold">
            {[
              { id: 'overview', label: 'Dashboard & Reports' },
              { id: 'structures', label: `Fee Structures (${structures.length})` },
              { id: 'invoices', label: `Invoices (${invoices.length})` },
              { id: 'discounts', label: `Scholarships (${discounts.length})` },
              { id: 'transactions', label: `Transactions (${payments.length})` },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id as any)}
                className={`px-3 py-2 rounded-xl transition ${tab === t.id ? 'bg-emerald-500 text-slate-950' : 'bg-white/10 hover:bg-white/20'}`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {toast && (
        <div className="max-w-7xl mx-auto px-4 sm:px-8 pt-4">
          <div className={`px-4 py-3 rounded-xl text-xs font-bold border shadow-sm ${
            toast.type === 'err' ? 'bg-red-50 border-red-200 text-red-800' : 'bg-emerald-50 border-emerald-200 text-emerald-800'
          }`}>
            {toast.msg}
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto p-4 sm:p-8 space-y-6">
        {/* Finance KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
            <div className="text-[10px] font-bold uppercase text-slate-400">Total Invoiced</div>
            <div className="text-lg font-black text-slate-900 mt-1">{fmt(stats.totalInvoiced)}</div>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
            <div className="text-[10px] font-bold uppercase text-slate-400">Total Collected</div>
            <div className="text-lg font-black text-emerald-700 mt-1">{fmt(stats.totalCollected)}</div>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
            <div className="text-[10px] font-bold uppercase text-slate-400">Outstanding Balance</div>
            <div className="text-lg font-black text-amber-700 mt-1">{fmt(stats.totalOutstanding)}</div>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
            <div className="text-[10px] font-bold uppercase text-slate-400">Collection Rate</div>
            <div className="text-lg font-black text-teal-700 mt-1">{stats.collectionRate || 0}%</div>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
            <div className="text-[10px] font-bold uppercase text-slate-400">Partial / Unpaid</div>
            <div className="text-lg font-black text-slate-800 mt-1">{stats.partialCount || 0} / {stats.unpaidCount || 0}</div>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
            <div className="text-[10px] font-bold uppercase text-slate-400">Tx (OK / Failed)</div>
            <div className="text-lg font-black text-slate-800 mt-1">{stats.successfulTxCount || 0} / {stats.failedTxCount || 0}</div>
          </div>
        </div>

        {tab === 'overview' && (
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 space-y-4 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="font-extrabold text-slate-900 text-sm">Revenue by Programme</h2>
                <div className="flex gap-2">
                  <a href="/api/admin/finance?format=csv&report=reconciliation" className="text-xs font-bold px-3 py-1.5 rounded-lg bg-slate-900 text-white inline-flex items-center gap-1">
                    <Download className="w-3.5 h-3.5" /> Reconciliation CSV
                  </a>
                  <a href="/api/admin/finance?format=csv&report=outstanding" className="text-xs font-bold px-3 py-1.5 rounded-lg bg-amber-600 text-white inline-flex items-center gap-1">
                    <Download className="w-3.5 h-3.5" /> Debtors CSV
                  </a>
                </div>
              </div>
              <div className="space-y-2.5 text-xs">
                {(breakdowns.byProgramme || []).map((row: any) => (
                  <div key={row.programme} className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center justify-between">
                    <span className="font-bold text-slate-800">{row.programme}</span>
                    <div className="text-right font-mono">
                      <span className="text-emerald-700 font-bold">{fmt(row.collected)}</span>
                      <span className="text-slate-400"> / {fmt(row.invoiced)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 space-y-4 shadow-sm">
              <h2 className="font-extrabold text-slate-900 text-sm">Collections by Payment Channel</h2>
              <div className="space-y-2.5 text-xs">
                {(breakdowns.byMethod || []).map((m: any) => (
                  <div key={m.method} className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-800">{m.method}</div>
                      <div className="text-[11px] text-slate-500">{m.count} verified transaction(s)</div>
                    </div>
                    <span className="font-mono font-bold text-emerald-800">{fmt(m.total)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === 'structures' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-extrabold text-slate-900">Fee Structures (GH₵)</h2>
              <button onClick={() => setShowStructureModal(true)} className="px-4 py-2 rounded-xl bg-[#073832] text-white text-xs font-bold inline-flex items-center gap-1.5">
                <Plus className="w-4 h-4" /> New Fee Structure
              </button>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              {structures.map((s: any) => {
                const total = (s.items || []).reduce((sum: number, it: any) => sum + it.amount, 0);
                return (
                  <div key={s.id} className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3 shadow-sm text-xs">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-slate-900 text-sm">{s.name}</h3>
                        <p className="text-slate-500">{s.programme?.name} · {s.level} · {s.academicYear} ({s.studentCategory})</p>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                        v{s.version} · {s._count?.invoices || 0} inv
                      </span>
                    </div>
                    <div className="divide-y divide-slate-100 border-t border-slate-100">
                      {(s.items || []).map((it: any) => (
                        <div key={it.id} className="py-1.5 flex justify-between">
                          <span>{it.title}</span>
                          <span className="font-mono font-semibold">{fmt(it.amount)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="pt-2 border-t border-slate-200 flex justify-between font-black text-emerald-900">
                      <span>Total Structure Fee</span>
                      <span className="font-mono">{fmt(total)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {tab === 'invoices' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-extrabold text-slate-900">Student Invoices</h2>
              <button onClick={() => setShowInvoiceModal(true)} className="px-4 py-2 rounded-xl bg-[#073832] text-white text-xs font-bold inline-flex items-center gap-1.5">
                <Plus className="w-4 h-4" /> Generate Invoices
              </button>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase">
                  <tr>
                    <th className="p-3.5">Invoice No</th>
                    <th className="p-3.5">Student</th>
                    <th className="p-3.5">Title</th>
                    <th className="p-3.5">Total / Paid / Bal</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invoices.map((inv: any) => (
                    <tr key={inv.id} className="hover:bg-slate-50/70">
                      <td className="p-3.5 font-mono font-bold text-emerald-800">{inv.invoiceNumber}</td>
                      <td className="p-3.5">
                        <div className="font-bold">{inv.student?.user?.name}</div>
                        <div className="text-[11px] text-slate-400">{inv.student?.studentId}</div>
                      </td>
                      <td className="p-3.5">{inv.title}</td>
                      <td className="p-3.5 font-mono">
                        <div>{fmt(inv.amount)}</div>
                        <div className="text-[11px] text-emerald-700">Paid: {fmt(inv.amountPaid)} · Bal: {fmt(inv.balance)}</div>
                      </td>
                      <td className="p-3.5 font-bold">{inv.status}</td>
                      <td className="p-3.5 text-right space-x-1.5">
                        {inv.balance > 0 && inv.status !== 'CANCELLED' && (
                          <button
                            onClick={() => { setPayInvoice(inv); setPayAmount(String(inv.balance)); }}
                            className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 font-bold"
                          >
                            Record Payment
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

        {tab === 'discounts' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-extrabold text-slate-900">Scholarships, Bursaries &amp; Discounts</h2>
              <button onClick={() => setShowDiscountModal(true)} className="px-4 py-2 rounded-xl bg-[#073832] text-white text-xs font-bold inline-flex items-center gap-1.5">
                <Plus className="w-4 h-4" /> Add Scholarship / Discount
              </button>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase">
                  <tr>
                    <th className="p-3.5">Student</th>
                    <th className="p-3.5">Type &amp; Title</th>
                    <th className="p-3.5">Amount (GHS)</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 text-right">Approval</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {discounts.map((d: any) => (
                    <tr key={d.id}>
                      <td className="p-3.5 font-bold">{d.student?.user?.name}</td>
                      <td className="p-3.5"><strong>{d.type}</strong> — {d.title}<div className="text-[11px] text-slate-400">{d.reason}</div></td>
                      <td className="p-3.5 font-mono font-bold text-emerald-800">{fmt(d.adjustmentAmount)}</td>
                      <td className="p-3.5 font-bold">{d.approvalStatus}</td>
                      <td className="p-3.5 text-right space-x-1.5">
                        {d.approvalStatus === 'PENDING' && (
                          <>
                            <button onClick={() => handleDiscountDecision(d.id, 'approve_discount')} className="px-2.5 py-1 bg-emerald-700 text-white rounded-lg font-bold">Approve</button>
                            <button onClick={() => handleDiscountDecision(d.id, 'reject_discount')} className="px-2.5 py-1 bg-red-100 text-red-700 rounded-lg font-bold">Reject</button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'transactions' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase">
                <tr>
                  <th className="p-3.5">Receipt</th>
                  <th className="p-3.5">Reference</th>
                  <th className="p-3.5">Student / Payer</th>
                  <th className="p-3.5">Method</th>
                  <th className="p-3.5">Amount</th>
                  <th className="p-3.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.map((p: any) => (
                  <tr key={p.id}>
                    <td className="p-3.5 font-mono font-bold text-emerald-800">{p.receiptNumber}</td>
                    <td className="p-3.5 font-mono">{p.reference}</td>
                    <td className="p-3.5 font-bold">{p.student?.user?.name || 'Applicant'}</td>
                    <td className="p-3.5">{p.method}</td>
                    <td className="p-3.5 font-mono font-bold">{fmt(p.amount)}</td>
                    <td className="p-3.5 font-bold">{p.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* MODAL: NEW FEE STRUCTURE */}
      {showStructureModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <form onSubmit={handleCreateStructure} className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-3 text-xs shadow-2xl">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-extrabold">Create Fee Structure (GHS)</h3>
              <button type="button" onClick={() => setShowStructureModal(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <input required value={structForm.name} onChange={(e) => setStructForm({ ...structForm, name: e.target.value })} placeholder="Structure Name (e.g. Level 100 Sem 1 Schedule)" className="w-full border border-slate-200 rounded-xl px-3 py-2" />
            <div className="grid grid-cols-2 gap-2">
              <select required value={structForm.programmeId} onChange={(e) => setStructForm({ ...structForm, programmeId: e.target.value })} className="border border-slate-200 rounded-xl px-3 py-2">
                <option value="">Select Programme</option>
                {programmes.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <select value={structForm.level} onChange={(e) => setStructForm({ ...structForm, level: e.target.value })} className="border border-slate-200 rounded-xl px-3 py-2">
                {['Level 100', 'Level 200', 'Level 300', 'Level 400'].map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between font-bold">
                <span>Fee Items (GH₵)</span>
                <button
                  type="button"
                  onClick={() => setStructForm({ ...structForm, items: [...structForm.items, { feeCategoryId: categories[0]?.id || '', title: 'Registration Fee', amount: 200 }] })}
                  className="text-emerald-700 underline"
                >
                  + Add Item
                </button>
              </div>
              {structForm.items.map((it, idx) => (
                <div key={idx} className="grid grid-cols-3 gap-2">
                  <select
                    value={it.feeCategoryId}
                    onChange={(e) => {
                      const next = [...structForm.items];
                      next[idx].feeCategoryId = e.target.value;
                      setStructForm({ ...structForm, items: next });
                    }}
                    className="border border-slate-200 rounded-xl px-2 py-2"
                  >
                    {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <input
                    value={it.title}
                    onChange={(e) => {
                      const next = [...structForm.items];
                      next[idx].title = e.target.value;
                      setStructForm({ ...structForm, items: next });
                    }}
                    className="border border-slate-200 rounded-xl px-2 py-2"
                  />
                  <input
                    type="number"
                    value={it.amount}
                    onChange={(e) => {
                      const next = [...structForm.items];
                      next[idx].amount = Number(e.target.value);
                      setStructForm({ ...structForm, items: next });
                    }}
                    className="border border-slate-200 rounded-xl px-2 py-2"
                  />
                </div>
              ))}
            </div>
            <button type="submit" disabled={busy} className="w-full py-2.5 rounded-xl bg-[#073832] text-white font-bold">
              Save Fee Structure
            </button>
          </form>
        </div>
      )}

      {/* MODAL: GENERATE INVOICES */}
      {showInvoiceModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <form onSubmit={handleGenerateInvoices} className="bg-white rounded-3xl max-w-md w-full p-6 space-y-3 text-xs shadow-2xl">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-extrabold">Generate Student Invoices</h3>
              <button type="button" onClick={() => setShowInvoiceModal(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <select value={invForm.mode} onChange={(e) => setInvForm({ ...invForm, mode: e.target.value })} className="w-full border border-slate-200 rounded-xl px-3 py-2">
              <option value="programme">Entire Programme / Level</option>
              <option value="student">Single Student</option>
            </select>
            {invForm.mode === 'programme' ? (
              <select required value={invForm.programmeId} onChange={(e) => setInvForm({ ...invForm, programmeId: e.target.value })} className="w-full border border-slate-200 rounded-xl px-3 py-2">
                <option value="">Select Programme</option>
                {programmes.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            ) : (
              <select required value={invForm.studentId} onChange={(e) => setInvForm({ ...invForm, studentId: e.target.value })} className="w-full border border-slate-200 rounded-xl px-3 py-2">
                <option value="">Select Student</option>
                {students.map((s) => <option key={s.id} value={s.id}>{s.studentId} — {s.user?.name}</option>)}
              </select>
            )}
            <select value={invForm.feeStructureId} onChange={(e) => setInvForm({ ...invForm, feeStructureId: e.target.value })} className="w-full border border-slate-200 rounded-xl px-3 py-2">
              <option value="">Custom Amount (or choose Fee Structure)</option>
              {structures.map((s: any) => <option key={s.id} value={s.id}>{s.name} (v{s.version})</option>)}
            </select>
            {!invForm.feeStructureId && (
              <>
                <input required value={invForm.title} onChange={(e) => setInvForm({ ...invForm, title: e.target.value })} placeholder="Invoice Title" className="w-full border border-slate-200 rounded-xl px-3 py-2" />
                <input type="number" required value={invForm.amount} onChange={(e) => setInvForm({ ...invForm, amount: Number(e.target.value) })} placeholder="Amount (GH₵)" className="w-full border border-slate-200 rounded-xl px-3 py-2" />
              </>
            )}
            <input type="date" required value={invForm.dueDate} onChange={(e) => setInvForm({ ...invForm, dueDate: e.target.value })} className="w-full border border-slate-200 rounded-xl px-3 py-2" />
            <button type="submit" disabled={busy} className="w-full py-2.5 rounded-xl bg-[#073832] text-white font-bold">
              Issue Invoices
            </button>
          </form>
        </div>
      )}

      {/* MODAL: RECORD OFFLINE PAYMENT */}
      {payInvoice && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <form onSubmit={handleOfflinePayment} className="bg-white rounded-3xl max-w-md w-full p-6 space-y-3 text-xs shadow-2xl">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-extrabold">Record Payment — {payInvoice.invoiceNumber}</h3>
              <button type="button" onClick={() => setPayInvoice(null)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <p className="text-slate-500">Outstanding Balance: <strong>{fmt(payInvoice.balance)}</strong> (Partial payments supported)</p>
            <input type="number" step="0.01" required value={payAmount} onChange={(e) => setPayAmount(e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2 font-mono" />
            <input required value={payMethod} onChange={(e) => setPayMethod(e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2" />
            <button type="submit" disabled={busy} className="w-full py-2.5 rounded-xl bg-[#073832] text-white font-bold">
              Confirm &amp; Issue Receipt
            </button>
          </form>
        </div>
      )}

      {/* MODAL: ADD SCHOLARSHIP / DISCOUNT */}
      {showDiscountModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <form onSubmit={handleCreateDiscount} className="bg-white rounded-3xl max-w-md w-full p-6 space-y-3 text-xs shadow-2xl">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-extrabold">Scholarship / Fee Discount</h3>
              <button type="button" onClick={() => setShowDiscountModal(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <select required value={discForm.studentId} onChange={(e) => setDiscForm({ ...discForm, studentId: e.target.value })} className="w-full border border-slate-200 rounded-xl px-3 py-2">
              <option value="">Select Student</option>
              {students.map((s) => <option key={s.id} value={s.id}>{s.studentId} — {s.user?.name}</option>)}
            </select>
            <select value={discForm.invoiceId} onChange={(e) => setDiscForm({ ...discForm, invoiceId: e.target.value })} className="w-full border border-slate-200 rounded-xl px-3 py-2">
              <option value="">Apply to Invoice (Optional)</option>
              {invoices.filter((i: any) => i.studentId === discForm.studentId && i.balance > 0).map((i: any) => (
                <option key={i.id} value={i.id}>{i.invoiceNumber} — Bal: {fmt(i.balance)}</option>
              ))}
            </select>
            <select value={discForm.type} onChange={(e) => setDiscForm({ ...discForm, type: e.target.value })} className="w-full border border-slate-200 rounded-xl px-3 py-2">
              <option value="SCHOLARSHIP">Scholarship</option>
              <option value="BURSARY">Bursary</option>
              <option value="DISCOUNT">Approved Fee Discount</option>
              <option value="SPONSORSHIP">Sponsorship</option>
            </select>
            <input required value={discForm.title} onChange={(e) => setDiscForm({ ...discForm, title: e.target.value })} placeholder="Title (e.g. GETFund Nursing Bursary)" className="w-full border border-slate-200 rounded-xl px-3 py-2" />
            <input type="number" required value={discForm.adjustmentAmount} onChange={(e) => setDiscForm({ ...discForm, adjustmentAmount: Number(e.target.value) })} placeholder="Amount (GH₵)" className="w-full border border-slate-200 rounded-xl px-3 py-2" />
            <input required value={discForm.reason} onChange={(e) => setDiscForm({ ...discForm, reason: e.target.value })} placeholder="Reason / Reference" className="w-full border border-slate-200 rounded-xl px-3 py-2" />
            <button type="submit" disabled={busy} className="w-full py-2.5 rounded-xl bg-[#073832] text-white font-bold">
              Submit Adjustment
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

