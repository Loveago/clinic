'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Award,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  FileText,
  Filter,
  GraduationCap,
  Plus,
  Search,
  Send,
  ShieldAlert,
  UserCheck,
  UserPlus,
  Users,
  X,
  XCircle,
} from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-700',
  SUBMITTED: 'bg-blue-100 text-blue-800',
  PAYMENT_PENDING: 'bg-amber-100 text-amber-800',
  UNDER_REVIEW: 'bg-indigo-100 text-indigo-800',
  AWAITING_DOCUMENTS: 'bg-orange-100 text-orange-800',
  ACCEPTED: 'bg-emerald-100 text-emerald-800',
  APPROVED: 'bg-emerald-100 text-emerald-800',
  WAITLISTED: 'bg-purple-100 text-purple-800',
  REJECTED: 'bg-red-100 text-red-800',
  ADMISSION_ACCEPTED: 'bg-teal-100 text-teal-800',
  REGISTRATION_PENDING: 'bg-cyan-100 text-cyan-800',
  REGISTERED: 'bg-emerald-700 text-white',
  ENROLLED: 'bg-emerald-700 text-white',
};

export default function AdminAdmissionsWorkspace() {
  const [tab, setTab] = useState<'applications' | 'periods'>('applications');
  const [data, setData] = useState<any>(null);
  const [periodsData, setPeriodsData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [programmeFilter, setProgrammeFilter] = useState('');
  const [periodFilter, setPeriodFilter] = useState('');

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState('');
  const [bulkReviewer, setBulkReviewer] = useState('');

  // Review drawer / modal
  const [activeApp, setActiveApp] = useState<any>(null);
  const [reviewNote, setReviewNote] = useState('');
  const [statusReason, setStatusReason] = useState('');
  const [reqDocTitle, setReqDocTitle] = useState('');
  const [offerConditions, setOfferConditions] = useState('');
  const [offerDeadline, setOfferDeadline] = useState(
    new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  );
  const [confirmModal, setConfirmModal] = useState<{
    title: string;
    message: string;
    onConfirm: () => Promise<void>;
  } | null>(null);

  // New period modal
  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [periodForm, setPeriodForm] = useState({
    name: '',
    academicYear: '2026/2027',
    semester: 'First Semester',
    openDate: new Date().toISOString().slice(0, 10),
    closeDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    applicationFeeGHS: 150,
    maxApplications: '',
  });

  const notify = (msg: string, type: 'ok' | 'err' = 'ok') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const loadAdmissions = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (search) qs.set('search', search);
      if (statusFilter) qs.set('status', statusFilter);
      if (programmeFilter) qs.set('programmeId', programmeFilter);
      if (periodFilter) qs.set('admissionPeriodId', periodFilter);

      const [admRes, perRes] = await Promise.all([
        fetch(`/api/admin/admissions?${qs.toString()}`),
        fetch('/api/admin/admission-periods'),
      ]);
      const admJson = await admRes.json();
      const perJson = await perRes.json();
      setData(admJson);
      setPeriodsData(perJson);
    } catch {
      notify('Failed to load admissions data.', 'err');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, programmeFilter, periodFilter]);

  useEffect(() => {
    loadAdmissions();
  }, [loadAdmissions]);

  const openApplicationDetail = async (id: string) => {
    const res = await fetch(`/api/admin/admissions/${id}`);
    const d = await res.json();
    if (res.ok) {
      setActiveApp(d.application);
      setReviewNote(d.application.reviewNotes || '');
    }
  };

  const handlePatchApp = async (payload: any, successMsg: string) => {
    if (!activeApp) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/admissions/${activeApp.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const d = await res.json();
      if (!res.ok) {
        notify(d.error || 'Action failed', 'err');
      } else {
        notify(successMsg);
        if (d.application) setActiveApp(d.application);
        await loadAdmissions();
      }
    } finally {
      setBusy(false);
    }
  };

  const handleBulkSubmit = async () => {
    if (selectedIds.length === 0 || !bulkAction) return;
    setBusy(true);
    try {
      const payload: any = { applicationIds: selectedIds };
      if (bulkAction === 'assign_reviewer') {
        payload.action = 'assign_reviewer';
        payload.reviewerName = bulkReviewer || 'Admissions Officer';
      } else if (bulkAction === 'UNDER_REVIEW' || bulkAction === 'WAITLISTED') {
        payload.action = 'bulk_status';
        payload.status = bulkAction;
        payload.confirmed = true;
      } else if (bulkAction === 'notify') {
        payload.action = 'send_notification';
        payload.title = 'Admissions Status Reminder';
        payload.message = 'Please log in to the Application Tracker to review any pending updates.';
      }
      const res = await fetch('/api/admin/admissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const d = await res.json();
      if (res.ok) {
        notify(`Bulk action completed (${d.updated ?? d.notified ?? selectedIds.length} records).`);
        setSelectedIds([]);
        setBulkAction('');
        await loadAdmissions();
      } else {
        notify(d.error || 'Bulk action failed', 'err');
      }
    } finally {
      setBusy(false);
    }
  };

  const exportCsv = () => {
    const rows = (data?.applications || []).map((a: any) =>
      `"${a.referenceNumber}","${a.applicantName}","${a.applicantEmail}","${a.applicantPhone}","${a.programme?.name || ''}","${a.status}","${new Date(a.createdAt).toISOString().slice(0, 10)}"`
    );
    const csv = 'Reference,Name,Email,Phone,Programme,Status,Submitted\n' + rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'welllife-applications.csv';
    link.click();
  };

  const handleCreatePeriod = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch('/api/admin/admission-periods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(periodForm),
      });
      const d = await res.json();
      if (res.ok) {
        notify('Admission period created.');
        setShowPeriodModal(false);
        setPeriodForm({ ...periodForm, name: '' });
        await loadAdmissions();
      } else {
        notify(d.error || 'Failed to create period', 'err');
      }
    } finally {
      setBusy(false);
    }
  };

  const togglePeriodActive = async (period: any) => {
    const res = await fetch('/api/admin/admission-periods', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: period.id, isActive: !period.isActive }),
    });
    if (res.ok) {
      notify(`Period ${period.isActive ? 'closed' : 'activated'}.`);
      await loadAdmissions();
    }
  };

  const kpis = data?.kpis || {};
  const applications = data?.applications || [];
  const periods = periodsData?.periods || [];
  const programmes = periodsData?.programmes || data?.programmes || [];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-[#073832] text-white border-b border-emerald-900/60 px-4 sm:px-8 py-3.5 shadow-md">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link href="/portal/admin" className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-base font-extrabold tracking-tight flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-emerald-300" />
                Admissions &amp; Enrolment Workspace
              </h1>
              <p className="text-[11px] text-emerald-200">
                Application Review, Admission Offers, Period Configuration &amp; Student Conversion
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-bold">
            <button
              onClick={() => setTab('applications')}
              className={`px-3.5 py-2 rounded-xl transition ${tab === 'applications' ? 'bg-emerald-500 text-slate-950' : 'bg-white/10 hover:bg-white/20'}`}
            >
              Applications ({kpis.total || 0})
            </button>
            <button
              onClick={() => setTab('periods')}
              className={`px-3.5 py-2 rounded-xl transition ${tab === 'periods' ? 'bg-emerald-500 text-slate-950' : 'bg-white/10 hover:bg-white/20'}`}
            >
              Admission Periods ({periods.length})
            </button>
            <Link href="/portal/admin/students" className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20">
              Student Records &rarr;
            </Link>
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
        {/* KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {[
            { label: 'Total Apps', val: kpis.total || 0, cls: 'text-slate-900' },
            { label: 'New', val: kpis.newSubmitted || 0, cls: 'text-blue-700' },
            { label: 'In Review', val: kpis.underReview || 0, cls: 'text-indigo-700' },
            { label: 'Awaiting Docs', val: kpis.awaitingDocuments || 0, cls: 'text-orange-700' },
            { label: 'Accepted', val: kpis.accepted || 0, cls: 'text-emerald-700' },
            { label: 'Waitlisted', val: kpis.waitlisted || 0, cls: 'text-purple-700' },
            { label: 'Offer Accepted', val: kpis.admissionAccepted || 0, cls: 'text-teal-700' },
            { label: 'Registered', val: kpis.registered || 0, cls: 'text-emerald-900' },
          ].map((item) => (
            <div key={item.label} className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-sm">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{item.label}</div>
              <div className={`text-xl font-black mt-1 ${item.cls}`}>{item.val}</div>
            </div>
          ))}
        </div>

        {tab === 'applications' && (
          <>
            {/* Programme Breakdown */}
            {data?.byProgramme?.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200/80 p-4 flex flex-wrap items-center gap-3">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">By Programme:</span>
                {data.byProgramme.map((p: any) => (
                  <span key={p.programmeId} className="text-xs bg-slate-100 px-3 py-1 rounded-full font-semibold text-slate-700">
                    {p.code}: <strong className="text-emerald-800">{p.count}</strong>
                  </span>
                ))}
              </div>
            )}

            {/* Filters & Bulk Toolbar */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 space-y-3 shadow-sm">
              <div className="grid sm:grid-cols-4 gap-3 text-xs">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search reference, name, email..."
                    className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl"
                  />
                </div>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="border border-slate-200 rounded-xl px-3 py-2">
                  <option value="">All Statuses</option>
                  {['SUBMITTED', 'UNDER_REVIEW', 'AWAITING_DOCUMENTS', 'ACCEPTED', 'WAITLISTED', 'REJECTED', 'ADMISSION_ACCEPTED', 'REGISTERED', 'ENROLLED'].map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <select value={programmeFilter} onChange={(e) => setProgrammeFilter(e.target.value)} className="border border-slate-200 rounded-xl px-3 py-2">
                  <option value="">All Programmes</option>
                  {programmes.map((p: any) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <div className="flex gap-2">
                  <select value={periodFilter} onChange={(e) => setPeriodFilter(e.target.value)} className="flex-1 border border-slate-200 rounded-xl px-3 py-2">
                    <option value="">All Periods</option>
                    {periods.map((per: any) => (
                      <option key={per.id} value={per.id}>{per.name}</option>
                    ))}
                  </select>
                  <button onClick={exportCsv} className="px-3 py-2 rounded-xl bg-slate-900 text-white font-bold inline-flex items-center gap-1">
                    <Download className="w-3.5 h-3.5" /> CSV
                  </button>
                </div>
              </div>

              {selectedIds.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
                  <span className="font-bold text-emerald-800">{selectedIds.length} selected:</span>
                  <select value={bulkAction} onChange={(e) => setBulkAction(e.target.value)} className="border border-slate-200 rounded-lg px-2.5 py-1.5">
                    <option value="">Choose bulk action...</option>
                    <option value="assign_reviewer">Assign Reviewer</option>
                    <option value="UNDER_REVIEW">Move to Under Review</option>
                    <option value="WAITLISTED">Move to Waitlisted</option>
                    <option value="notify">Send Portal Notification</option>
                  </select>
                  {bulkAction === 'assign_reviewer' && (
                    <input
                      type="text"
                      value={bulkReviewer}
                      onChange={(e) => setBulkReviewer(e.target.value)}
                      placeholder="Reviewer name"
                      className="border border-slate-200 rounded-lg px-2.5 py-1.5"
                    />
                  )}
                  <button onClick={handleBulkSubmit} disabled={busy} className="px-3 py-1.5 bg-[#073832] text-white rounded-lg font-bold">
                    Apply Bulk Action
                  </button>
                </div>
              )}
            </div>

            {/* Applications Table */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="p-3.5 w-8">
                      <input
                        type="checkbox"
                        checked={applications.length > 0 && selectedIds.length === applications.length}
                        onChange={(e) =>
                          setSelectedIds(e.target.checked ? applications.map((a: any) => a.id) : [])
                        }
                      />
                    </th>
                    <th className="p-3.5">Reference</th>
                    <th className="p-3.5">Applicant</th>
                    <th className="p-3.5">Programme &amp; Period</th>
                    <th className="p-3.5">Docs / Reviewer</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr><td colSpan={7} className="p-8 text-center text-slate-400">Loading applications...</td></tr>
                  ) : applications.length === 0 ? (
                    <tr><td colSpan={7} className="p-8 text-center text-slate-400">No applications match your filter criteria.</td></tr>
                  ) : (
                    applications.map((app: any) => (
                      <tr key={app.id} className="hover:bg-slate-50/70">
                        <td className="p-3.5">
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(app.id)}
                            onChange={(e) =>
                              setSelectedIds((prev) =>
                                e.target.checked ? [...prev, app.id] : prev.filter((id) => id !== app.id)
                              )
                            }
                          />
                        </td>
                        <td className="p-3.5 font-mono font-bold text-emerald-800">{app.referenceNumber}</td>
                        <td className="p-3.5">
                          <div className="font-bold text-slate-900">{app.applicantName}</div>
                          <div className="text-[11px] text-slate-500">{app.applicantEmail} · {app.applicantPhone}</div>
                        </td>
                        <td className="p-3.5">
                          <div className="font-semibold text-slate-800">{app.programme?.name}</div>
                          <div className="text-[11px] text-slate-400">{app.admissionPeriod?.name || 'General Intake'}</div>
                        </td>
                        <td className="p-3.5">
                          <div className="text-slate-700">{app._count?.documents || 0} doc(s)</div>
                          <div className="text-[11px] text-slate-400">{app.assignedReviewerName || 'Unassigned'}</div>
                        </td>
                        <td className="p-3.5">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${STATUS_COLORS[app.status] || 'bg-slate-100 text-slate-700'}`}>
                            {app.status}
                          </span>
                        </td>
                        <td className="p-3.5 text-right">
                          <button
                            onClick={() => openApplicationDetail(app.id)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold"
                          >
                            <Eye className="w-3.5 h-3.5" /> Review
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {tab === 'periods' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-extrabold text-slate-900 text-base">Admission Periods &amp; Intake Windows</h2>
                <p className="text-xs text-slate-500">Configure application dates, GH₵ form fees, and intake limits without overwriting history.</p>
              </div>
              <button
                onClick={() => setShowPeriodModal(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#073832] text-white text-xs font-bold shadow-sm"
              >
                <Plus className="w-4 h-4" /> New Admission Period
              </button>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {periods.map((p: any) => (
                <div key={p.id} className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-slate-900">{p.name}</h3>
                      <p className="text-xs text-slate-500">{p.academicYear} · {p.semester}</p>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${p.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
                      {p.isActive ? 'OPEN' : 'CLOSED'}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs bg-slate-50 p-3 rounded-xl">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Window</span>
                      <span className="font-semibold">{p.openDate} &rarr; {p.closeDate}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Form Fee</span>
                      <span className="font-bold text-emerald-800">GH₵ {Number(p.applicationFeeGHS).toFixed(2)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Applications</span>
                      <span className="font-bold">{p._count?.applications || 0}{p.maxApplications ? ` / ${p.maxApplications}` : ''}</span>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button
                      onClick={() => togglePeriodActive(p)}
                      className="text-xs font-bold px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50"
                    >
                      {p.isActive ? 'Close Period' : 'Reopen Period'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* APPLICATION REVIEW DRAWER */}
      {activeApp && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex justify-end">
          <div className="bg-white w-full max-w-2xl h-full overflow-y-auto p-6 space-y-6 shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-emerald-800">{activeApp.referenceNumber}</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${STATUS_COLORS[activeApp.status] || 'bg-slate-100'}`}>
                    {activeApp.status}
                  </span>
                </div>
                <h2 className="text-lg font-black text-slate-900 mt-1">{activeApp.applicantName}</h2>
                <p className="text-xs text-slate-500">{activeApp.programme?.name} · {activeApp.admissionPeriod?.name || 'General Intake'}</p>
              </div>
              <button onClick={() => setActiveApp(null)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Profile & Educational History */}
            <div className="grid sm:grid-cols-2 gap-3 text-xs bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
              <div><span className="text-slate-400 block">Email &amp; Phone</span><strong>{activeApp.applicantEmail} · {activeApp.applicantPhone}</strong></div>
              <div><span className="text-slate-400 block">DOB / Gender / Nationality</span><strong>{activeApp.dateOfBirth} · {activeApp.gender} · {activeApp.nationality}</strong></div>
              <div><span className="text-slate-400 block">Address &amp; GhanaPost GPS</span><strong>{activeApp.address} {activeApp.ghanaPostGps ? `(${activeApp.ghanaPostGps})` : ''}</strong></div>
              <div><span className="text-slate-400 block">Previous School</span><strong>{activeApp.previousSchool}</strong></div>
              <div className="sm:col-span-2"><span className="text-slate-400 block">Examination Grades</span><strong>{activeApp.examGrades}</strong></div>
            </div>

            {/* Uploaded Documents */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Uploaded Documents ({activeApp.documents?.length || 0})</h3>
              {(activeApp.documents || []).length === 0 ? (
                <p className="text-xs text-slate-400 italic">No documents uploaded yet.</p>
              ) : (
                <div className="space-y-2">
                  {activeApp.documents.map((doc: any) => (
                    <div key={doc.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-200 text-xs">
                      <div>
                        <div className="font-bold text-slate-800">{doc.title} ({doc.fileType})</div>
                        <div className="text-[11px] text-slate-500">Status: <strong>{doc.verificationStatus}</strong></div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <a href={doc.fileUrl} target="_blank" rel="noreferrer" className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 font-bold">
                          Preview
                        </a>
                        {doc.verificationStatus !== 'VERIFIED' && (
                          <button
                            onClick={() => handlePatchApp({ action: 'verify_document', documentId: doc.id, verificationStatus: 'VERIFIED' }, 'Document verified.')}
                            className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 font-bold"
                          >
                            Verify
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Reviewer Actions */}
            <div className="space-y-4 border-t border-slate-200 pt-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Internal Review Notes (Private to Staff)</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={reviewNote}
                    onChange={(e) => setReviewNote(e.target.value)}
                    placeholder="Add internal review notes..."
                    className="flex-1 border border-slate-200 rounded-xl px-3 py-2"
                  />
                  <button
                    onClick={() => handlePatchApp({ action: 'add_note', reviewNotes: reviewNote }, 'Internal note saved.')}
                    disabled={busy}
                    className="px-3 py-2 bg-slate-800 text-white rounded-xl font-bold"
                  >
                    Save Note
                  </button>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Request Additional Document</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={reqDocTitle}
                    onChange={(e) => setReqDocTitle(e.target.value)}
                    placeholder="e.g. Certified WASSCE Certificate"
                    className="flex-1 border border-slate-200 rounded-xl px-3 py-2"
                  />
                  <button
                    onClick={() => handlePatchApp({ action: 'request_documents', requestedDocTitle: reqDocTitle }, 'Document request sent.')}
                    disabled={busy || !reqDocTitle}
                    className="px-3 py-2 bg-orange-600 text-white rounded-xl font-bold"
                  >
                    Request Doc
                  </button>
                </div>
              </div>

              {/* Offer & Decision Controls */}
              <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4 space-y-3">
                <div className="font-bold text-emerald-900">Admission Decision &amp; Offer Letter</div>
                <div className="grid sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={offerConditions}
                    onChange={(e) => setOfferConditions(e.target.value)}
                    placeholder="Offer conditions (optional)"
                    className="border border-slate-200 bg-white rounded-xl px-3 py-2"
                  />
                  <input
                    type="date"
                    value={offerDeadline}
                    onChange={(e) => setOfferDeadline(e.target.value)}
                    className="border border-slate-200 bg-white rounded-xl px-3 py-2"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handlePatchApp({ status: 'UNDER_REVIEW', reason: statusReason || 'Moved to review' }, 'Marked Under Review.')}
                    disabled={busy}
                    className="px-3 py-2 rounded-xl bg-indigo-100 text-indigo-800 font-bold"
                  >
                    Under Review
                  </button>
                  <button
                    onClick={() => handlePatchApp({ status: 'WAITLISTED', reason: statusReason || 'Placed on waitlist' }, 'Applicant Waitlisted.')}
                    disabled={busy}
                    className="px-3 py-2 rounded-xl bg-purple-100 text-purple-800 font-bold"
                  >
                    Waitlist
                  </button>
                  <button
                    onClick={() =>
                      setConfirmModal({
                        title: 'Confirm Acceptance & Issue Offer',
                        message: `Accept ${activeApp.applicantName} into ${activeApp.programme?.name} and issue an official Admission Offer Letter?`,
                        onConfirm: async () => {
                          await handlePatchApp(
                            { action: 'issue_offer', conditions: offerConditions, acceptanceDeadline: offerDeadline },
                            'Admission Offer issued!'
                          );
                        },
                      })
                    }
                    disabled={busy}
                    className="px-3.5 py-2 rounded-xl bg-emerald-700 text-white font-bold"
                  >
                    Accept &amp; Issue Offer
                  </button>
                  <button
                    onClick={() =>
                      setConfirmModal({
                        title: 'Confirm Rejection',
                        message: `Are you sure you want to reject ${activeApp.applicantName}'s application?`,
                        onConfirm: async () => {
                          await handlePatchApp({ status: 'REJECTED', reason: statusReason || 'Did not meet entry criteria.' }, 'Application rejected.');
                        },
                      })
                    }
                    disabled={busy}
                    className="px-3 py-2 rounded-xl bg-red-600 text-white font-bold"
                  >
                    Reject
                  </button>
                  {(activeApp.offer || activeApp.status === 'ACCEPTED' || activeApp.status === 'ADMISSION_ACCEPTED') &&
                    activeApp.status !== 'REGISTERED' &&
                    activeApp.status !== 'ENROLLED' && (
                      <button
                        onClick={() => handlePatchApp({ action: 'enrol_student' }, 'Applicant converted to Registered Student!')}
                        disabled={busy}
                        className="px-3.5 py-2 rounded-xl bg-slate-900 text-white font-bold inline-flex items-center gap-1.5"
                      >
                        <UserPlus className="w-3.5 h-3.5" /> Enrol as Student
                      </button>
                    )}
                </div>
                {activeApp.offer && (
                  <div className="pt-2 border-t border-emerald-200 flex items-center justify-between text-[11px]">
                    <span>Offer Ref: <strong className="font-mono">{activeApp.offer.admissionReference}</strong> ({activeApp.offer.status})</span>
                    <Link href={`/school/offer/${activeApp.referenceNumber}`} target="_blank" className="font-bold text-emerald-800 underline">
                      View Offer Letter &rarr;
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {/* Review History */}
            <div className="space-y-2 border-t border-slate-200 pt-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Audit &amp; Review History</h3>
              <div className="space-y-2">
                {(activeApp.reviews || []).map((rev: any) => (
                  <div key={rev.id} className="text-xs p-3 rounded-xl bg-slate-50 border border-slate-200/70">
                    <div className="flex items-center justify-between font-bold text-slate-800">
                      <span>{rev.action}: {rev.previousStatus ? `${rev.previousStatus} → ` : ''}{rev.newStatus}</span>
                      <span className="text-[10px] text-slate-400">{new Date(rev.createdAt).toLocaleString('en-GH')}</span>
                    </div>
                    {rev.reason && <p className="text-slate-600 mt-0.5">{rev.reason}</p>}
                    <p className="text-[10px] text-slate-400 mt-0.5">By: {rev.reviewerName}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION DIALOG */}
      {confirmModal && (
        <div className="fixed inset-0 z-[60] bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-2 text-amber-700 font-extrabold">
              <ShieldAlert className="w-5 h-5" />
              <span>{confirmModal.title}</span>
            </div>
            <p className="text-xs text-slate-600">{confirmModal.message}</p>
            <div className="flex justify-end gap-2 text-xs font-bold">
              <button onClick={() => setConfirmModal(null)} className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700">
                Cancel
              </button>
              <button
                onClick={async () => {
                  const fn = confirmModal.onConfirm;
                  setConfirmModal(null);
                  await fn();
                }}
                className="px-4 py-2 rounded-xl bg-[#073832] text-white"
              >
                Confirm Action
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NEW ADMISSION PERIOD MODAL */}
      {showPeriodModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <form onSubmit={handleCreatePeriod} className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl text-xs">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-slate-900">Create Admission Period</h3>
              <button type="button" onClick={() => setShowPeriodModal(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="font-bold block mb-1">Period Name</label>
                <input required value={periodForm.name} onChange={(e) => setPeriodForm({ ...periodForm, name: e.target.value })} placeholder="e.g. 2026/2027 Main Intake" className="w-full border border-slate-200 rounded-xl px-3 py-2" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold block mb-1">Academic Year</label>
                  <input required value={periodForm.academicYear} onChange={(e) => setPeriodForm({ ...periodForm, academicYear: e.target.value })} className="w-full border border-slate-200 rounded-xl px-3 py-2" />
                </div>
                <div>
                  <label className="font-bold block mb-1">Form Fee (GH₵)</label>
                  <input type="number" required value={periodForm.applicationFeeGHS} onChange={(e) => setPeriodForm({ ...periodForm, applicationFeeGHS: Number(e.target.value) })} className="w-full border border-slate-200 rounded-xl px-3 py-2" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold block mb-1">Open Date</label>
                  <input type="date" required value={periodForm.openDate} onChange={(e) => setPeriodForm({ ...periodForm, openDate: e.target.value })} className="w-full border border-slate-200 rounded-xl px-3 py-2" />
                </div>
                <div>
                  <label className="font-bold block mb-1">Close Date</label>
                  <input type="date" required value={periodForm.closeDate} onChange={(e) => setPeriodForm({ ...periodForm, closeDate: e.target.value })} className="w-full border border-slate-200 rounded-xl px-3 py-2" />
                </div>
              </div>
              <div>
                <label className="font-bold block mb-1">Application Quota / Limit (Optional)</label>
                <input type="number" value={periodForm.maxApplications} onChange={(e) => setPeriodForm({ ...periodForm, maxApplications: e.target.value })} placeholder="Unlimited" className="w-full border border-slate-200 rounded-xl px-3 py-2" />
              </div>
            </div>
            <button type="submit" disabled={busy} className="w-full py-2.5 rounded-xl bg-[#073832] text-white font-bold">
              Create Admission Period
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

