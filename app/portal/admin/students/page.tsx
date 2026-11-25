'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Eye,
  FileText,
  GraduationCap,
  Layers,
  Plus,
  Search,
  Settings,
  Shield,
  Users,
  X,
} from 'lucide-react';

const STATUS_BADGE: Record<string, string> = {
  ACTIVE: 'bg-emerald-100 text-emerald-800',
  ADMITTED: 'bg-blue-100 text-blue-800',
  REGISTRATION_PENDING: 'bg-amber-100 text-amber-800',
  DEFERRED: 'bg-purple-100 text-purple-800',
  SUSPENDED: 'bg-red-100 text-red-800',
  WITHDRAWN: 'bg-slate-200 text-slate-700',
  GRADUATED: 'bg-teal-100 text-teal-800',
  ARCHIVED: 'bg-slate-100 text-slate-500',
};

export default function AdminStudentsWorkspace() {
  const [tab, setTab] = useState<'directory' | 'cohorts' | 'settings'>('directory');
  const [students, setStudents] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, totalPages: 1 });
  const [cohorts, setCohorts] = useState<any[]>([]);
  const [programmes, setProgrammes] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [programmeId, setProgrammeId] = useState('');
  const [level, setLevel] = useState('');
  const [status, setStatus] = useState('');
  const [feeStatus, setFeeStatus] = useState('');
  const [page, setPage] = useState(1);

  // Profile drawer
  const [activeStudent, setActiveStudent] = useState<any>(null);
  const [profileTab, setProfileTab] = useState<'personal' | 'academic' | 'guardians' | 'documents' | 'financial' | 'history'>('personal');
  const [editReason, setEditReason] = useState('');
  const [editForm, setEditForm] = useState<any>({});
  const [guardianForm, setGuardianForm] = useState({ name: '', relationship: 'Parent / Guardian', phone: '', address: '' });

  // New cohort / student modals
  const [showCohortModal, setShowCohortModal] = useState(false);
  const [cohortForm, setCohortForm] = useState({ name: '', programmeId: '', academicYear: '2025/2026', level: 'Level 100', capacity: 60 });
  const [showNewStudentModal, setShowNewStudentModal] = useState(false);
  const [newStudentForm, setNewStudentForm] = useState({ name: '', email: '', phone: '', programmeId: '', level: 'Level 100', cohortId: '' });

  const notify = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ page: String(page), limit: '15' });
      if (search) qs.set('search', search);
      if (programmeId) qs.set('programmeId', programmeId);
      if (level) qs.set('level', level);
      if (status) qs.set('status', status);
      if (feeStatus) qs.set('feeStatus', feeStatus);

      const [stRes, cohRes, setRes] = await Promise.all([
        fetch(`/api/admin/students?${qs.toString()}`),
        fetch('/api/admin/cohorts'),
        fetch('/api/admin/school-settings'),
      ]);
      const stJson = await stRes.json();
      const cohJson = await cohRes.json();
      const setJson = await setRes.json();

      setStudents(stJson.students || []);
      if (stJson.pagination) setPagination(stJson.pagination);
      setCohorts(cohJson.cohorts || []);
      setProgrammes(cohJson.programmes || []);
      if (setJson.settings) setSettings(setJson.settings);
    } finally {
      setLoading(false);
    }
  }, [page, search, programmeId, level, status, feeStatus]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openStudentProfile = async (id: string) => {
    const res = await fetch(`/api/admin/students/${id}`);
    const d = await res.json();
    if (res.ok && d.student) {
      setActiveStudent(d.student);
      setEditForm({
        name: d.student.user?.name || '',
        phone: d.student.user?.phone || '',
        dateOfBirth: d.student.dateOfBirth || '',
        gender: d.student.gender || '',
        residentialAddress: d.student.residentialAddress || '',
        ghanaPostGps: d.student.ghanaPostGps || '',
        programmeId: d.student.programmeId,
        level: d.student.level,
        currentSemester: d.student.currentSemester,
        cohortId: d.student.cohortId || '',
        studyTrack: d.student.studyTrack || '12_MONTH',
        status: d.student.status,
      });
      setEditReason('');
      setProfileTab('personal');
    }
  };

  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeStudent) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/students/${activeStudent.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...editForm, reason: editReason || 'Updated via Student Records Workspace' }),
      });
      if (res.ok) {
        notify('Student record updated and logged.');
        await openStudentProfile(activeStudent.id);
        await loadData();
      }
    } finally {
      setBusy(false);
    }
  };

  const handleAddGuardian = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeStudent) return;
    const res = await fetch(`/api/admin/students/${activeStudent.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'add_guardian', guardian: guardianForm }),
    });
    if (res.ok) {
      notify('Guardian contact added.');
      setGuardianForm({ name: '', relationship: 'Parent / Guardian', phone: '', address: '' });
      await openStudentProfile(activeStudent.id);
    }
  };

  const handleVerifyDoc = async (docId: string, verificationStatus: string) => {
    if (!activeStudent) return;
    const res = await fetch(`/api/admin/students/${activeStudent.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'verify_document', documentId: docId, verificationStatus }),
    });
    if (res.ok) {
      notify(`Document marked ${verificationStatus}.`);
      await openStudentProfile(activeStudent.id);
    }
  };

  const handleCreateCohort = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/admin/cohorts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cohortForm),
    });
    if (res.ok) {
      notify('Cohort created.');
      setShowCohortModal(false);
      await loadData();
    }
  };

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/admin/students', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newStudentForm),
    });
    if (res.ok) {
      notify('Student registered with unique ID.');
      setShowNewStudentModal(false);
      setNewStudentForm({ name: '', email: '', phone: '', programmeId: '', level: 'Level 100', cohortId: '' });
      await loadData();
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/admin/school-settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    if (res.ok) notify('School & Student ID format settings saved.');
  };

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
                <Users className="w-5 h-5 text-emerald-300" />
                Student Records &amp; Cohorts
              </h1>
              <p className="text-[11px] text-emerald-200">
                Searchable Directory, Profiles, Guardians, Documents, Academic Transfers &amp; ID Configuration
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-bold">
            <button onClick={() => setTab('directory')} className={`px-3.5 py-2 rounded-xl ${tab === 'directory' ? 'bg-emerald-500 text-slate-950' : 'bg-white/10'}`}>
              Directory ({pagination.total})
            </button>
            <button onClick={() => setTab('cohorts')} className={`px-3.5 py-2 rounded-xl ${tab === 'cohorts' ? 'bg-emerald-500 text-slate-950' : 'bg-white/10'}`}>
              Cohorts ({cohorts.length})
            </button>
            <button onClick={() => setTab('settings')} className={`px-3.5 py-2 rounded-xl ${tab === 'settings' ? 'bg-emerald-500 text-slate-950' : 'bg-white/10'}`}>
              ID &amp; Enrolment Settings
            </button>
          </div>
        </div>
      </header>

      {toast && (
        <div className="max-w-7xl mx-auto px-4 sm:px-8 pt-4">
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl text-xs font-bold shadow-sm">
            {toast}
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto p-4 sm:p-8 space-y-6">
        {tab === 'directory' && (
          <>
            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 flex flex-wrap items-center justify-between gap-3 shadow-sm text-xs">
              <div className="grid sm:grid-cols-5 gap-2.5 flex-1">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                    placeholder="ID, name, email..."
                    className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl"
                  />
                </div>
                <select value={programmeId} onChange={(e) => { setProgrammeId(e.target.value); setPage(1); }} className="border border-slate-200 rounded-xl px-3 py-2">
                  <option value="">All Programmes</option>
                  {programmes.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <select value={level} onChange={(e) => { setLevel(e.target.value); setPage(1); }} className="border border-slate-200 rounded-xl px-3 py-2">
                  <option value="">All Levels</option>
                  {['Level 100', 'Level 200', 'Level 300', 'Level 400'].map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
                <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="border border-slate-200 rounded-xl px-3 py-2">
                  <option value="">All Statuses</option>
                  {['ACTIVE', 'ADMITTED', 'REGISTRATION_PENDING', 'DEFERRED', 'SUSPENDED', 'WITHDRAWN', 'GRADUATED', 'ARCHIVED'].map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <select value={feeStatus} onChange={(e) => { setFeeStatus(e.target.value); setPage(1); }} className="border border-slate-200 rounded-xl px-3 py-2">
                  <option value="">All Fee Statuses</option>
                  <option value="OWING">Owing Balance</option>
                  <option value="CLEARED">Fees Cleared</option>
                </select>
              </div>
              <button
                onClick={() => setShowNewStudentModal(true)}
                className="px-4 py-2 rounded-xl bg-[#073832] text-white font-bold inline-flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Register Student
              </button>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="p-3.5">Student ID</th>
                    <th className="p-3.5">Student</th>
                    <th className="p-3.5">Programme &amp; Level</th>
                    <th className="p-3.5">Fee Balance</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 text-right">Profile</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr><td colSpan={6} className="p-8 text-center text-slate-400">Loading student directory...</td></tr>
                  ) : students.length === 0 ? (
                    <tr><td colSpan={6} className="p-8 text-center text-slate-400">No student records match your filters.</td></tr>
                  ) : (
                    students.map((st) => {
                      const owing = (st.invoices || []).filter((i: any) => i.status !== 'CANCELLED').reduce((s: number, i: any) => s + i.balance, 0);
                      return (
                        <tr key={st.id} className="hover:bg-slate-50/70">
                          <td className="p-3.5 font-mono font-bold text-emerald-800">{st.studentId}</td>
                          <td className="p-3.5">
                            <div className="font-bold text-slate-900">{st.user?.name}</div>
                            <div className="text-[11px] text-slate-500">{st.user?.email} · {st.user?.phone}</div>
                          </td>
                          <td className="p-3.5">
                            <div className="font-semibold text-slate-800">{st.programme?.name}</div>
                            <div className="text-[11px] text-slate-400">{st.level} · {st.academicYear} {st.cohort ? `· ${st.cohort.name}` : ''}</div>
                          </td>
                          <td className="p-3.5 font-mono font-bold">
                            {owing > 0 ? <span className="text-amber-700">GH₵ {owing.toFixed(2)}</span> : <span className="text-emerald-700">Cleared</span>}
                          </td>
                          <td className="p-3.5">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${STATUS_BADGE[st.status] || 'bg-slate-100'}`}>
                              {st.status}
                            </span>
                          </td>
                          <td className="p-3.5 text-right">
                            <button
                              onClick={() => openStudentProfile(st.id)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold"
                            >
                              <Eye className="w-3.5 h-3.5" /> Open Record
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between p-4 border-t border-slate-100 text-xs">
                  <span className="text-slate-500">Page {pagination.page} of {pagination.totalPages} ({pagination.total} students)</span>
                  <div className="flex gap-2">
                    <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="px-3 py-1.5 rounded-lg border border-slate-200 disabled:opacity-40">Previous</button>
                    <button disabled={page >= pagination.totalPages} onClick={() => setPage((p) => p + 1)} className="px-3 py-1.5 rounded-lg border border-slate-200 disabled:opacity-40">Next</button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {tab === 'cohorts' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-extrabold text-slate-900">Academic Cohorts &amp; Class Groups</h2>
              <button onClick={() => setShowCohortModal(true)} className="px-4 py-2 rounded-xl bg-[#073832] text-white text-xs font-bold inline-flex items-center gap-1.5">
                <Plus className="w-4 h-4" /> Create Cohort
              </button>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {cohorts.map((c) => (
                <div key={c.id} className="bg-white rounded-2xl border border-slate-200 p-5 space-y-2 shadow-sm">
                  <div className="font-extrabold text-slate-900">{c.name}</div>
                  <div className="text-xs text-emerald-800 font-semibold">{c.programme?.name}</div>
                  <div className="text-xs text-slate-500">{c.academicYear} · {c.level} · {c._count?.students || 0} student(s)</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'settings' && settings && (
          <form onSubmit={handleSaveSettings} className="bg-white rounded-2xl border border-slate-200 p-6 max-w-xl space-y-4 text-xs shadow-sm">
            <h2 className="text-base font-extrabold text-slate-900">Student ID Format &amp; Institution Settings</h2>
            <div>
              <label className="font-bold block mb-1">Student ID Format (supports {'{YEAR}'} and {'{SEQ}'})</label>
              <input value={settings.studentIdFormat} onChange={(e) => setSettings({ ...settings, studentIdFormat: e.target.value })} className="w-full border border-slate-200 rounded-xl px-3 py-2 font-mono" />
            </div>
            <div>
              <label className="font-bold block mb-1">Institution Name</label>
              <input value={settings.institutionName} onChange={(e) => setSettings({ ...settings, institutionName: e.target.value })} className="w-full border border-slate-200 rounded-xl px-3 py-2" />
            </div>
            <div>
              <label className="font-bold block mb-1">Campus Address (Ghana)</label>
              <input value={settings.institutionAddress} onChange={(e) => setSettings({ ...settings, institutionAddress: e.target.value })} className="w-full border border-slate-200 rounded-xl px-3 py-2" />
            </div>
            <button type="submit" className="px-5 py-2.5 rounded-xl bg-[#073832] text-white font-bold">
              Save Configuration
            </button>
          </form>
        )}
      </main>

      {/* INDIVIDUAL STUDENT PROFILE DRAWER */}
      {activeStudent && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex justify-end">
          <div className="bg-white w-full max-w-3xl h-full overflow-y-auto p-6 space-y-5 shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-emerald-800">{activeStudent.studentId}</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${STATUS_BADGE[activeStudent.status] || 'bg-slate-100'}`}>
                    {activeStudent.status}
                  </span>
                </div>
                <h2 className="text-lg font-black text-slate-900 mt-1">{activeStudent.user?.name}</h2>
                <p className="text-xs text-slate-500">{activeStudent.programme?.name} · {activeStudent.level} · {activeStudent.academicYear}</p>
              </div>
              <button onClick={() => setActiveStudent(null)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5 border-b border-slate-100 pb-3 text-xs font-bold">
              {[
                { id: 'personal', label: 'Personal' },
                { id: 'academic', label: 'Academic & Status' },
                { id: 'guardians', label: `Guardians (${activeStudent.guardians?.length || 0})` },
                { id: 'documents', label: `Documents (${activeStudent.documents?.length || 0})` },
                { id: 'financial', label: `Financial (${activeStudent.invoices?.length || 0})` },
                { id: 'history', label: `Activity (${activeStudent.statusHistory?.length || 0})` },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setProfileTab(t.id as any)}
                  className={`px-3 py-1.5 rounded-lg ${profileTab === t.id ? 'bg-[#073832] text-white' : 'bg-slate-100 text-slate-600'}`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {(profileTab === 'personal' || profileTab === 'academic') && (
              <form onSubmit={handleSaveStudent} className="space-y-4 text-xs">
                {profileTab === 'personal' ? (
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold block mb-1">Full Name</label>
                      <input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="w-full border border-slate-200 rounded-xl px-3 py-2" />
                    </div>
                    <div>
                      <label className="font-bold block mb-1">Phone (+233)</label>
                      <input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} className="w-full border border-slate-200 rounded-xl px-3 py-2" />
                    </div>
                    <div>
                      <label className="font-bold block mb-1">Date of Birth</label>
                      <input type="date" value={editForm.dateOfBirth} onChange={(e) => setEditForm({ ...editForm, dateOfBirth: e.target.value })} className="w-full border border-slate-200 rounded-xl px-3 py-2" />
                    </div>
                    <div>
                      <label className="font-bold block mb-1">GhanaPost GPS Address</label>
                      <input value={editForm.ghanaPostGps} onChange={(e) => setEditForm({ ...editForm, ghanaPostGps: e.target.value })} placeholder="e.g. GA-183-8164" className="w-full border border-slate-200 rounded-xl px-3 py-2" />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="font-bold block mb-1">Residential Address</label>
                      <input value={editForm.residentialAddress} onChange={(e) => setEditForm({ ...editForm, residentialAddress: e.target.value })} className="w-full border border-slate-200 rounded-xl px-3 py-2" />
                    </div>
                  </div>
                ) : (
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold block mb-1">Programme</label>
                      <select value={editForm.programmeId} onChange={(e) => setEditForm({ ...editForm, programmeId: e.target.value })} className="w-full border border-slate-200 rounded-xl px-3 py-2">
                        {programmes.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="font-bold block mb-1">Academic Level</label>
                      <select value={editForm.level} onChange={(e) => setEditForm({ ...editForm, level: e.target.value })} className="w-full border border-slate-200 rounded-xl px-3 py-2">
                        {['Level 100', 'Level 200', 'Level 300', 'Level 400'].map((l) => <option key={l} value={l}>{l}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="font-bold block mb-1">Cohort / Class</label>
                      <select value={editForm.cohortId} onChange={(e) => setEditForm({ ...editForm, cohortId: e.target.value })} className="w-full border border-slate-200 rounded-xl px-3 py-2">
                        <option value="">Unassigned</option>
                        {cohorts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="font-bold block mb-1">Student Status</label>
                      <select value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })} className="w-full border border-slate-200 rounded-xl px-3 py-2">
                        {['ACTIVE', 'ADMITTED', 'REGISTRATION_PENDING', 'DEFERRED', 'SUSPENDED', 'WITHDRAWN', 'GRADUATED', 'ARCHIVED'].map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="font-bold block mb-1">Study Track</label>
                      <select value={editForm.studyTrack || '12_MONTH'} onChange={(e) => setEditForm({ ...editForm, studyTrack: e.target.value })} className="w-full border border-slate-200 rounded-xl px-3 py-2">
                        <option value="12_MONTH">12-Month Standard Track (2 Semesters)</option>
                        <option value="6_MONTH">6-Month Intensive Track (1 Semester)</option>
                      </select>
                    </div>
                  </div>
                )}
                <div>
                  <label className="font-bold block mb-1">Reason for Change (Audit Trail)</label>
                  <input value={editReason} onChange={(e) => setEditReason(e.target.value)} placeholder="e.g. Approved transfer / annual progression / guardian update" className="w-full border border-slate-200 rounded-xl px-3 py-2" />
                </div>
                <button type="submit" disabled={busy} className="px-4 py-2 rounded-xl bg-[#073832] text-white font-bold">
                  Save Record Changes
                </button>
              </form>
            )}

            {profileTab === 'guardians' && (
              <div className="space-y-4 text-xs">
                <form onSubmit={handleAddGuardian} className="bg-slate-50 p-4 rounded-2xl border border-slate-200 grid sm:grid-cols-2 gap-2.5">
                  <input required value={guardianForm.name} onChange={(e) => setGuardianForm({ ...guardianForm, name: e.target.value })} placeholder="Guardian full name" className="border border-slate-200 bg-white rounded-xl px-3 py-2" />
                  <input required value={guardianForm.relationship} onChange={(e) => setGuardianForm({ ...guardianForm, relationship: e.target.value })} placeholder="Relationship" className="border border-slate-200 bg-white rounded-xl px-3 py-2" />
                  <input required value={guardianForm.phone} onChange={(e) => setGuardianForm({ ...guardianForm, phone: e.target.value })} placeholder="Phone (+233...)" className="border border-slate-200 bg-white rounded-xl px-3 py-2" />
                  <button type="submit" className="px-3 py-2 bg-[#073832] text-white rounded-xl font-bold">Add Guardian</button>
                </form>
                <div className="space-y-2">
                  {(activeStudent.guardians || []).map((g: any) => (
                    <div key={g.id} className="p-3 rounded-xl border border-slate-200 flex items-center justify-between">
                      <div>
                        <div className="font-bold text-slate-900">{g.name} ({g.relationship})</div>
                        <div className="text-slate-500">{g.phone} {g.address ? `· ${g.address}` : ''}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {profileTab === 'documents' && (
              <div className="space-y-2 text-xs">
                {(activeStudent.documents || []).length === 0 ? (
                  <p className="text-slate-400">No documents on file.</p>
                ) : (
                  activeStudent.documents.map((doc: any) => (
                    <div key={doc.id} className="p-3 rounded-xl border border-slate-200 flex items-center justify-between">
                      <div>
                        <div className="font-bold text-slate-900">{doc.title} ({doc.category})</div>
                        <div className="text-[11px] text-slate-500">Verification: <strong>{doc.verificationStatus}</strong></div>
                      </div>
                      <div className="flex gap-2">
                        <a href={doc.fileUrl} target="_blank" rel="noreferrer" className="px-2.5 py-1 bg-slate-100 rounded-lg font-bold">View</a>
                        {doc.verificationStatus !== 'VERIFIED' && (
                          <button onClick={() => handleVerifyDoc(doc.id, 'VERIFIED')} className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-lg font-bold">Verify</button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {profileTab === 'financial' && (
              <div className="space-y-3 text-xs">
                {(activeStudent.invoices || []).map((inv: any) => (
                  <div key={inv.id} className="p-3.5 rounded-xl border border-slate-200 flex items-center justify-between">
                    <div>
                      <div className="font-mono font-bold text-emerald-800">{inv.invoiceNumber}</div>
                      <div className="font-semibold text-slate-800">{inv.title}</div>
                      <div className="text-[11px] text-slate-500">Due: {inv.dueDate} · Status: {inv.status}</div>
                    </div>
                    <div className="text-right font-mono">
                      <div className="font-bold">Total: GH₵ {inv.amount.toFixed(2)}</div>
                      <div className="text-emerald-700">Paid: GH₵ {inv.amountPaid.toFixed(2)}</div>
                      <div className="text-amber-700 font-bold">Bal: GH₵ {inv.balance.toFixed(2)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {profileTab === 'history' && (
              <div className="space-y-2 text-xs">
                {(activeStudent.statusHistory || []).map((h: any) => (
                  <div key={h.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="flex justify-between font-bold">
                      <span>{h.previousStatus ? `${h.previousStatus} → ` : ''}{h.newStatus}</span>
                      <span className="text-[10px] text-slate-400">{new Date(h.createdAt).toLocaleString('en-GH')}</span>
                    </div>
                    <p className="text-slate-600 mt-0.5">{h.reason}</p>
                    <p className="text-[10px] text-slate-400">By: {h.changedBy}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* NEW COHORT MODAL */}
      {showCohortModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <form onSubmit={handleCreateCohort} className="bg-white rounded-3xl max-w-md w-full p-6 space-y-3 text-xs shadow-2xl">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-extrabold">Create Cohort</h3>
              <button type="button" onClick={() => setShowCohortModal(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <input required value={cohortForm.name} onChange={(e) => setCohortForm({ ...cohortForm, name: e.target.value })} placeholder="Cohort Name (e.g. NUR-2026-A)" className="w-full border border-slate-200 rounded-xl px-3 py-2" />
            <select required value={cohortForm.programmeId} onChange={(e) => setCohortForm({ ...cohortForm, programmeId: e.target.value })} className="w-full border border-slate-200 rounded-xl px-3 py-2">
              <option value="">Select Programme</option>
              {programmes.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <input required value={cohortForm.academicYear} onChange={(e) => setCohortForm({ ...cohortForm, academicYear: e.target.value })} placeholder="Academic Year" className="w-full border border-slate-200 rounded-xl px-3 py-2" />
            <button type="submit" className="w-full py-2.5 rounded-xl bg-[#073832] text-white font-bold">Save Cohort</button>
          </form>
        </div>
      )}

      {/* NEW STUDENT MODAL */}
      {showNewStudentModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <form onSubmit={handleCreateStudent} className="bg-white rounded-3xl max-w-md w-full p-6 space-y-3 text-xs shadow-2xl">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-extrabold">Register New Student</h3>
              <button type="button" onClick={() => setShowNewStudentModal(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <input required value={newStudentForm.name} onChange={(e) => setNewStudentForm({ ...newStudentForm, name: e.target.value })} placeholder="Full Name" className="w-full border border-slate-200 rounded-xl px-3 py-2" />
            <input required type="email" value={newStudentForm.email} onChange={(e) => setNewStudentForm({ ...newStudentForm, email: e.target.value })} placeholder="Email Address" className="w-full border border-slate-200 rounded-xl px-3 py-2" />
            <input value={newStudentForm.phone} onChange={(e) => setNewStudentForm({ ...newStudentForm, phone: e.target.value })} placeholder="Phone (+233...)" className="w-full border border-slate-200 rounded-xl px-3 py-2" />
            <select required value={newStudentForm.programmeId} onChange={(e) => setNewStudentForm({ ...newStudentForm, programmeId: e.target.value })} className="w-full border border-slate-200 rounded-xl px-3 py-2">
              <option value="">Select Programme</option>
              {programmes.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <button type="submit" className="w-full py-2.5 rounded-xl bg-[#073832] text-white font-bold">Create Student Account</button>
          </form>
        </div>
      )}
    </div>
  );
}

