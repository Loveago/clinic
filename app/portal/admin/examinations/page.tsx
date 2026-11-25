'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Award,
  Calendar,
  FileText,
  Layers,
  BarChart3,
  RefreshCw,
  Plus,
  Trash2,
  Edit3,
  AlertTriangle,
  CheckCircle2,
  X,
  Send,
  RotateCcw,
  Download,
  Clock,
  ShieldAlert,
  Sparkles,
  Check,
  Ban,
  Lock,
  Unlock,
} from 'lucide-react';
import DemoRoleSwitcher from '@/components/DemoRoleSwitcher';

type ExamTab =
  | 'dashboard'
  | 'periods'
  | 'builder'
  | 'scheduling'
  | 'lockControl'
  | 'publication'
  | 'analytics';

const STATUS_BADGE: Record<string, string> = {
  UPCOMING: 'bg-sky-100 text-sky-800 border-sky-200',
  ACTIVE: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  CONCLUDED: 'bg-slate-100 text-slate-700 border-slate-200',
  COMPLETED: 'bg-teal-100 text-teal-800 border-teal-200',
  CANCELLED: 'bg-rose-100 text-rose-800 border-rose-200',
  DRAFT: 'bg-slate-100 text-slate-700 border-slate-200',
  PUBLISHED: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  FAILED: 'bg-rose-100 text-rose-800 border-rose-200',
  NEEDS_VERIFICATION: 'bg-amber-100 text-amber-800 border-amber-200',
};

export default function AdminExaminationsPage() {
  const [activeTab, setActiveTab] = useState<ExamTab>('dashboard');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null);

  const [data, setData] = useState<any>({
    kpis: {},
    periods: [],
    examinations: [],
    courses: [],
    cohorts: [],
    programmes: [],
    academicYears: [],
    semesters: [],
    questionBank: [],
  });
  const [analytics, setAnalytics] = useState<any>(null);

  // Filters
  const [filters, setFilters] = useState({
    academicYearId: '',
    semesterId: '',
    programmeId: '',
    courseId: '',
    examType: '',
    status: '',
    periodId: '',
  });
  const [analyticsFilters, setAnalyticsFilters] = useState({
    periodId: '',
    programmeId: '',
    courseId: '',
    level: '',
  });

  // Modals & forms
  const [showCreateExamModal, setShowCreateExamModal] = useState(false);
  const [examForm, setExamForm] = useState({
    courseId: '',
    periodId: '',
    title: '',
    examType: 'END_OF_SEMESTER',
    academicYearId: '',
    semesterId: '',
    cohortId: '',
    instructions: 'Answer all questions carefully.',
    venue: 'CBT Lab & Online Portal',
    durationMinutes: '60',
    totalMarks: '100',
    passMark: '50',
    scheduledDate: new Date().toISOString().slice(0, 10),
    scheduledTime: '09:00 AM',
    mode: 'ONLINE',
    selectionMode: 'FIXED',
    publicationMode: 'IMMEDIATE',
    randomizeQuestions: true,
    randomizeOptions: true,
    requireFinancialClearance: false,
    requireVerificationBeforePublish: false,
    maxRetakes: '1',
  });

  // Period form
  const [periodForm, setPeriodForm] = useState({
    id: '',
    title: '',
    academicYearId: '',
    semesterId: '',
    programmeId: '',
    startDate: '',
    endDate: '',
    instructions: '',
    status: 'DRAFT',
  });

  // Builder state
  const [selectedExamId, setSelectedExamId] = useState('');
  const [sectionForm, setSectionForm] = useState({
    title: '',
    instructions: '',
    marksAllocated: '40',
    questionCount: '10',
    selectionRule: 'FIXED',
  });
  const [questionForm, setQuestionForm] = useState({
    sectionId: '',
    questionType: 'MCQ',
    difficulty: 'MEDIUM',
    text: '',
    optionsText: 'Option A\nOption B\nOption C\nOption D',
    correctAnswer: 'Option A',
    marks: '4',
    explanation: '',
  });
  const [selectedBankIds, setSelectedBankIds] = useState<string[]>([]);
  const [importSectionId, setImportSectionId] = useState('');

  // Scheduling state
  const [scheduleForm, setScheduleForm] = useState({
    examId: '',
    scheduledDate: '',
    scheduledTime: '',
    startTime: '',
    endTime: '',
    venue: '',
    cohortId: '',
    mode: 'ONLINE',
  });
  const [scheduleConflicts, setScheduleConflicts] = useState<any[]>([]);

  // Lock & Unlock Control + PDF Comprehensive Exam state
  const [lockTrackFilter, setLockTrackFilter] = useState('');
  const [lockTypeFilter, setLockTypeFilter] = useState('');
  const [genForm, setGenForm] = useState({
    courseId: '',
    studyTrack: '6_MONTH',
    examType: 'FINAL',
    title: '',
  });

  const showToast = (type: 'ok' | 'err', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4500);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => {
        if (v) params.set(k, v);
      });
      const res = await fetch(`/api/admin/examinations?${params.toString()}`);
      if (res.ok) {
        const d = await res.json();
        setData(d);
        if (!selectedExamId && d.examinations?.length > 0) {
          setSelectedExamId(d.examinations[0].id);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [filters, selectedExamId]);

  const loadAnalytics = useCallback(async () => {
    const params = new URLSearchParams();
    Object.entries(analyticsFilters).forEach(([k, v]) => {
      if (v) params.set(k, v);
    });
    const res = await fetch(`/api/admin/exam-analytics?${params.toString()}`);
    if (res.ok) {
      setAnalytics(await res.json());
    }
  }, [analyticsFilters]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (activeTab === 'analytics') loadAnalytics();
  }, [activeTab, loadAnalytics]);

  const selectedExam = data.examinations.find((e: any) => e.id === selectedExamId) || null;

  const postExamAction = async (payload: any, onSuccess?: () => void) => {
    setBusy(true);
    try {
      const res = await fetch('/api/admin/examinations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const d = await res.json();
      if (!res.ok) {
        if (res.status === 409 && d.conflicts) {
          setScheduleConflicts(d.conflicts);
        }
        showToast('err', d.error || 'Action failed');
        return false;
      }
      showToast('ok', 'Operation completed successfully.');
      if (onSuccess) onSuccess();
      await loadData();
      return true;
    } finally {
      setBusy(false);
    }
  };

  const patchExamAction = async (payload: any, onSuccess?: () => void) => {
    setBusy(true);
    try {
      const res = await fetch('/api/admin/examinations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const d = await res.json();
      if (!res.ok) {
        showToast('err', d.error || 'Update failed');
        return false;
      }
      showToast('ok', 'Updated successfully.');
      if (onSuccess) onSuccess();
      await loadData();
      return true;
    } finally {
      setBusy(false);
    }
  };

  const exportCsv = (section: 'exams' | 'questions') => {
    const params = new URLSearchParams();
    params.set('format', 'csv');
    params.set('section', section);
    Object.entries(analyticsFilters).forEach(([k, v]) => {
      if (v) params.set(k, v);
    });
    window.open(`/api/admin/exam-analytics?${params.toString()}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="bg-[#073832] text-white border-b border-emerald-900/60 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/portal/admin"
              className="p-2 rounded-lg bg-emerald-900/50 hover:bg-emerald-800/70 text-emerald-200 transition"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-lg sm:text-xl font-bold tracking-tight flex items-center gap-2">
                <Award className="w-5 h-5 text-emerald-300" />
                <span>Admin Examination Console</span>
              </h1>
              <p className="text-xs text-emerald-200/80">
                Examination periods, paper builder, conflict scheduling, publication &amp; item analytics
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <DemoRoleSwitcher />
            <button
              onClick={() => {
                loadData();
                if (activeTab === 'analytics') loadAnalytics();
              }}
              className="px-3 py-1.5 rounded-lg bg-emerald-800/70 hover:bg-emerald-700 text-xs font-medium flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-2 flex items-center gap-1.5 overflow-x-auto text-xs font-medium">
          {[
            { key: 'dashboard', label: 'Dashboard & Exams', icon: Award },
            { key: 'periods', label: 'Examination Periods', icon: Calendar },
            { key: 'builder', label: 'Paper Builder & Question Bank', icon: Layers },
            { key: 'scheduling', label: 'Scheduling & Conflicts', icon: Clock },
            { key: 'lockControl', label: 'Lock & Unlock Control', icon: Lock },
            { key: 'publication', label: 'Results Publication & Retries', icon: Send },
            { key: 'analytics', label: 'Exam & Question Analytics', icon: BarChart3 },
          ].map((t) => {
            const Icon = t.icon;
            const active = activeTab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key as ExamTab)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg whitespace-nowrap transition ${
                  active
                    ? 'bg-white text-[#073832] font-semibold shadow-sm'
                    : 'text-emerald-100/80 hover:bg-emerald-800/50'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>
      </header>

      {toast && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-4">
          <div
            className={`px-4 py-3 rounded-xl border text-xs font-semibold flex items-center justify-between shadow-sm ${
              toast.type === 'ok'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            <div className="flex items-center gap-2">
              {toast.type === 'ok' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-600" />
              )}
              <span>{toast.msg}</span>
            </div>
            <button onClick={() => setToast(null)}>
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* TAB 1: DASHBOARD & EXAMS */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
              {[
                { label: 'Total Exams', val: data.kpis?.total || 0 },
                { label: 'Upcoming / Active', val: `${data.kpis?.upcoming || 0} / ${data.kpis?.ongoing || 0}` },
                { label: 'Completed / Cancelled', val: `${data.kpis?.completed || 0} / ${data.kpis?.cancelled || 0}` },
                { label: 'Students Scheduled', val: data.kpis?.studentsScheduled || 0 },
                { label: 'Completed Attempts', val: data.kpis?.studentsCompleted || 0 },
                { label: 'Avg Score / Pass Rate', val: `${data.kpis?.avgScore || 0}% / ${data.kpis?.passRate || 0}%` },
              ].map((k) => (
                <div key={k.label} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
                  <div className="text-[11px] text-slate-500">{k.label}</div>
                  <div className="text-lg font-bold text-slate-900 mt-1">{k.val}</div>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-wrap items-center justify-between gap-3 shadow-sm">
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={filters.periodId}
                  onChange={(e) => setFilters({ ...filters, periodId: e.target.value })}
                  className="px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white"
                >
                  <option value="">All Periods</option>
                  {data.periods.map((p: any) => (
                    <option key={p.id} value={p.id}>{p.title}</option>
                  ))}
                </select>
                <select
                  value={filters.courseId}
                  onChange={(e) => setFilters({ ...filters, courseId: e.target.value })}
                  className="px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white"
                >
                  <option value="">All Courses</option>
                  {data.courses.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.code} - {c.title}</option>
                  ))}
                </select>
                <select
                  value={filters.examType}
                  onChange={(e) => setFilters({ ...filters, examType: e.target.value })}
                  className="px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white"
                >
                  <option value="">All Types</option>
                  {['QUIZ', 'MID_SEMESTER', 'END_OF_SEMESTER', 'PRACTICAL', 'RESIT', 'SUPPLEMENTARY'].map(
                    (t) => (
                      <option key={t} value={t}>{t}</option>
                    )
                  )}
                </select>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  className="px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white"
                >
                  <option value="">All Statuses</option>
                  {['UPCOMING', 'ACTIVE', 'CONCLUDED', 'CANCELLED'].map((st) => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={() => {
                  setExamForm({
                    ...examForm,
                    courseId: data.courses[0]?.id || '',
                    periodId: data.periods[0]?.id || '',
                  });
                  setShowCreateExamModal(true);
                }}
                className="px-4 py-2 bg-[#073832] text-white rounded-xl text-xs font-semibold flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Create Examination</span>
              </button>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase">
                    <tr>
                      <th className="py-3 px-4">Examination</th>
                      <th className="py-3 px-4">Course &amp; Type</th>
                      <th className="py-3 px-4">Schedule &amp; Mode</th>
                      <th className="py-3 px-4">Questions / Attempts</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.examinations.map((ex: any) => (
                      <tr key={ex.id} className="hover:bg-slate-50/70">
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">{ex.title}</div>
                          <div className="text-slate-500">
                            {ex.period?.title || 'Standalone'} • {ex.publicationMode}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-emerald-900">{ex.course?.code}</div>
                          <div className="text-slate-500">{ex.examType}</div>
                        </td>
                        <td className="py-3 px-4">
                          <div>{ex.scheduledDate} • {ex.scheduledTime}</div>
                          <div className="text-slate-500">{ex.venue} ({ex.mode})</div>
                        </td>
                        <td className="py-3 px-4">
                          <div>{ex.questions?.length || 0} Qs ({ex.totalMarks} marks)</div>
                          <div className="text-slate-500">{ex.attemptsCount || 0} attempts</div>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full border text-[11px] font-semibold ${
                              STATUS_BADGE[ex.status] || STATUS_BADGE.UPCOMING
                            }`}
                          >
                            {ex.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="inline-flex items-center gap-1">
                            <button
                              onClick={() => {
                                setSelectedExamId(ex.id);
                                setActiveTab('builder');
                              }}
                              className="px-2 py-1 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-medium"
                            >
                              Builder
                            </button>
                            {ex.status === 'UPCOMING' && (
                              <button
                                onClick={() =>
                                  patchExamAction({
                                    action: 'update_exam',
                                    examId: ex.id,
                                    examData: { status: 'ACTIVE' },
                                  })
                                }
                                className="px-2 py-1 rounded bg-sky-50 text-sky-700 hover:bg-sky-100 font-medium"
                              >
                                Activate
                              </button>
                            )}
                            {ex.status !== 'CANCELLED' && (
                              <button
                                onClick={() =>
                                  postExamAction({ action: 'cancel_exam', examId: ex.id })
                                }
                                className="p-1.5 rounded bg-rose-50 text-rose-600 hover:bg-rose-100"
                                title="Cancel Exam"
                              >
                                <Ban className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {data.examinations.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400">
                          No examinations found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: EXAMINATION PERIODS */}
        {activeTab === 'periods' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
              <h2 className="font-bold text-sm">
                {periodForm.id ? 'Edit Examination Period' : 'Create Examination Period'}
              </h2>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  await postExamAction(
                    {
                      action: periodForm.id ? 'update_period' : 'create_period',
                      periodId: periodForm.id || undefined,
                      data: periodForm,
                    },
                    () =>
                      setPeriodForm({
                        id: '',
                        title: '',
                        academicYearId: '',
                        semesterId: '',
                        programmeId: '',
                        startDate: '',
                        endDate: '',
                        instructions: '',
                        status: 'DRAFT',
                      })
                  );
                }}
                className="space-y-3 text-xs"
              >
                <input
                  required
                  placeholder="Period Title (e.g. 2025/2026 Sem 1 Finals)"
                  value={periodForm.title}
                  onChange={(e) => setPeriodForm({ ...periodForm, title: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                />
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={periodForm.academicYearId}
                    onChange={(e) => setPeriodForm({ ...periodForm, academicYearId: e.target.value })}
                    className="px-3 py-2 border border-slate-200 rounded-xl bg-white"
                  >
                    <option value="">Academic Year</option>
                    {data.academicYears.map((y: any) => (
                      <option key={y.id} value={y.id}>{y.name}</option>
                    ))}
                  </select>
                  <select
                    value={periodForm.semesterId}
                    onChange={(e) => setPeriodForm({ ...periodForm, semesterId: e.target.value })}
                    className="px-3 py-2 border border-slate-200 rounded-xl bg-white"
                  >
                    <option value="">Semester</option>
                    {data.semesters.map((s: any) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    required
                    type="date"
                    value={periodForm.startDate}
                    onChange={(e) => setPeriodForm({ ...periodForm, startDate: e.target.value })}
                    className="px-3 py-2 border border-slate-200 rounded-xl"
                  />
                  <input
                    required
                    type="date"
                    value={periodForm.endDate}
                    onChange={(e) => setPeriodForm({ ...periodForm, endDate: e.target.value })}
                    className="px-3 py-2 border border-slate-200 rounded-xl"
                  />
                </div>
                <select
                  value={periodForm.status}
                  onChange={(e) => setPeriodForm({ ...periodForm, status: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white"
                >
                  {['DRAFT', 'ACTIVE', 'CONCLUDED', 'PUBLISHED'].map((st) => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>
                <button
                  disabled={busy}
                  className="w-full py-2.5 bg-[#073832] text-white rounded-xl font-semibold"
                >
                  {periodForm.id ? 'Update Period' : 'Create Period'}
                </button>
              </form>
            </div>

            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
              <h2 className="font-bold text-sm">Examination Periods</h2>
              <div className="divide-y divide-slate-100 text-xs">
                {data.periods.map((p: any) => (
                  <div key={p.id} className="py-3 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="font-bold text-slate-900">{p.title}</div>
                      <div className="text-slate-500">
                        {new Date(p.startDate).toLocaleDateString()} –{' '}
                        {new Date(p.endDate).toLocaleDateString()} • {p._count?.examinations || 0} exams
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded-full border text-[11px] font-semibold ${
                          STATUS_BADGE[p.status] || STATUS_BADGE.DRAFT
                        }`}
                      >
                        {p.status}
                      </span>
                      <button
                        onClick={() =>
                          patchExamAction({ action: 'publish_period_results', periodId: p.id })
                        }
                        className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 font-semibold"
                      >
                        Publish Results
                      </button>
                      <button
                        onClick={() =>
                          setPeriodForm({
                            id: p.id,
                            title: p.title,
                            academicYearId: p.academicYearId || '',
                            semesterId: p.semesterId || '',
                            programmeId: p.programmeId || '',
                            startDate: p.startDate ? String(p.startDate).slice(0, 10) : '',
                            endDate: p.endDate ? String(p.endDate).slice(0, 10) : '',
                            instructions: p.instructions || '',
                            status: p.status,
                          })
                        }
                        className="p-1.5 rounded-lg hover:bg-slate-100"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() =>
                          postExamAction({ action: 'delete_period', periodId: p.id })
                        }
                        className="p-1.5 rounded-lg hover:bg-rose-50 text-rose-600"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
                {data.periods.length === 0 && (
                  <div className="py-8 text-center text-slate-400">No examination periods yet.</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: PAPER BUILDER & QUESTION BANK */}
        {activeTab === 'builder' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-wrap items-center justify-between gap-3 shadow-sm">
              <div className="flex items-center gap-3 flex-1">
                <span className="text-xs font-semibold text-slate-600">Select Exam:</span>
                <select
                  value={selectedExamId}
                  onChange={(e) => setSelectedExamId(e.target.value)}
                  className="px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white min-w-[260px]"
                >
                  <option value="">Choose Examination</option>
                  {data.examinations.map((ex: any) => (
                    <option key={ex.id} value={ex.id}>
                      {ex.course?.code} — {ex.title}
                    </option>
                  ))}
                </select>
              </div>
              {selectedExam && (
                <div className="text-xs text-slate-600">
                  <strong>{selectedExam.questions?.length || 0}</strong> questions •{' '}
                  <strong>
                    {(selectedExam.questions || []).reduce((s: number, q: any) => s + q.marks, 0)}
                  </strong>{' '}
                  / {selectedExam.totalMarks} marks
                </div>
              )}
            </div>

            {selectedExam && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Sections & Custom Question */}
                <div className="space-y-6">
                  <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
                    <h3 className="font-bold text-sm">Exam Sections</h3>
                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        await postExamAction(
                          { action: 'add_section', examId: selectedExam.id, section: sectionForm },
                          () =>
                            setSectionForm({
                              title: '',
                              instructions: '',
                              marksAllocated: '40',
                              questionCount: '10',
                              selectionRule: 'FIXED',
                            })
                        );
                      }}
                      className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs"
                    >
                      <input
                        required
                        placeholder="Section A: MCQs"
                        value={sectionForm.title}
                        onChange={(e) => setSectionForm({ ...sectionForm, title: e.target.value })}
                        className="px-3 py-2 border border-slate-200 rounded-xl col-span-2"
                      />
                      <input
                        type="number"
                        placeholder="Marks"
                        value={sectionForm.marksAllocated}
                        onChange={(e) =>
                          setSectionForm({ ...sectionForm, marksAllocated: e.target.value })
                        }
                        className="px-3 py-2 border border-slate-200 rounded-xl"
                      />
                      <button className="px-3 py-2 bg-[#073832] text-white rounded-xl font-semibold">
                        + Section
                      </button>
                    </form>
                    <div className="flex flex-wrap gap-2 text-xs">
                      {(selectedExam.sections || []).map((sec: any) => (
                        <span
                          key={sec.id}
                          className="px-3 py-1 rounded-lg bg-slate-100 text-slate-800 font-medium"
                        >
                          {sec.title} ({sec.marksAllocated}m)
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
                    <h3 className="font-bold text-sm flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-emerald-700" />
                      <span>Add Question (Auto-Rubric at Creation)</span>
                    </h3>
                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        const options = questionForm.optionsText
                          .split('\n')
                          .map((s) => s.trim())
                          .filter(Boolean);
                        await postExamAction(
                          {
                            action: 'add_question',
                            examId: selectedExam.id,
                            question: {
                              ...questionForm,
                              sectionId: questionForm.sectionId || null,
                              options,
                            },
                          },
                          () =>
                            setQuestionForm({
                              ...questionForm,
                              text: '',
                              explanation: '',
                            })
                        );
                      }}
                      className="space-y-3 text-xs"
                    >
                      <div className="grid grid-cols-3 gap-2">
                        <select
                          value={questionForm.questionType}
                          onChange={(e) =>
                            setQuestionForm({ ...questionForm, questionType: e.target.value })
                          }
                          className="px-3 py-2 border border-slate-200 rounded-xl bg-white"
                        >
                          {['MCQ', 'TRUE_FALSE', 'FILL_BLANK', 'MATCHING', 'SHORT_ANSWER', 'ESSAY', 'SCENARIO'].map(
                            (qt) => (
                              <option key={qt} value={qt}>{qt}</option>
                            )
                          )}
                        </select>
                        <select
                          value={questionForm.sectionId}
                          onChange={(e) =>
                            setQuestionForm({ ...questionForm, sectionId: e.target.value })
                          }
                          className="px-3 py-2 border border-slate-200 rounded-xl bg-white"
                        >
                          <option value="">No Section</option>
                          {(selectedExam.sections || []).map((s: any) => (
                            <option key={s.id} value={s.id}>{s.title}</option>
                          ))}
                        </select>
                        <input
                          type="number"
                          placeholder="Marks"
                          value={questionForm.marks}
                          onChange={(e) =>
                            setQuestionForm({ ...questionForm, marks: e.target.value })
                          }
                          className="px-3 py-2 border border-slate-200 rounded-xl"
                        />
                      </div>
                      <textarea
                        required
                        rows={2}
                        placeholder="Question text / clinical scenario..."
                        value={questionForm.text}
                        onChange={(e) => setQuestionForm({ ...questionForm, text: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                      />
                      {(questionForm.questionType === 'MCQ' ||
                        questionForm.questionType === 'TRUE_FALSE') && (
                        <textarea
                          rows={3}
                          placeholder="Options (one per line)"
                          value={questionForm.optionsText}
                          onChange={(e) =>
                            setQuestionForm({ ...questionForm, optionsText: e.target.value })
                          }
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono"
                        />
                      )}
                      <input
                        placeholder="Correct Answer / Expected Key Points"
                        value={questionForm.correctAnswer}
                        onChange={(e) =>
                          setQuestionForm({ ...questionForm, correctAnswer: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                      />
                      <button
                        disabled={busy}
                        className="w-full py-2.5 bg-[#073832] text-white rounded-xl font-semibold"
                      >
                        Add Question to Paper
                      </button>
                    </form>
                  </div>
                </div>

                {/* Question Bank Import (0 AI calls) */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-sm">Import Approved Question Bank (0 AI Calls)</h3>
                    <button
                      disabled={busy || selectedBankIds.length === 0}
                      onClick={() =>
                        postExamAction(
                          {
                            action: 'import_bank_questions',
                            examId: selectedExam.id,
                            sectionId: importSectionId || null,
                            questionIds: selectedBankIds,
                          },
                          () => setSelectedBankIds([])
                        )
                      }
                      className="px-3 py-1.5 rounded-xl bg-[#073832] text-white text-xs font-semibold disabled:opacity-50"
                    >
                      Import ({selectedBankIds.length})
                    </button>
                  </div>
                  <select
                    value={importSectionId}
                    onChange={(e) => setImportSectionId(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white"
                  >
                    <option value="">Target Section (Optional)</option>
                    {(selectedExam.sections || []).map((s: any) => (
                      <option key={s.id} value={s.id}>{s.title}</option>
                    ))}
                  </select>
                  <div className="divide-y divide-slate-100 max-h-[380px] overflow-y-auto text-xs">
                    {data.questionBank.map((q: any) => (
                      <label key={q.id} className="py-2.5 flex items-start gap-2.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedBankIds.includes(q.id)}
                          onChange={(e) =>
                            setSelectedBankIds(
                              e.target.checked
                                ? [...selectedBankIds, q.id]
                                : selectedBankIds.filter((id) => id !== q.id)
                            )
                          }
                          className="mt-0.5"
                        />
                        <div className="flex-1">
                          <div className="font-medium text-slate-900">{q.questionText}</div>
                          <div className="text-[11px] text-slate-500">
                            {q.questionType} • {q.difficulty} • {q.marks} marks • {q.topic?.title}
                          </div>
                        </div>
                      </label>
                    ))}
                    {data.questionBank.length === 0 && (
                      <div className="py-6 text-center text-slate-400">
                        No approved questions in question bank yet.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: SCHEDULING & CONFLICTS */}
        {activeTab === 'scheduling' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4 max-w-2xl">
            <h2 className="font-bold text-sm">Schedule / Reschedule Examination</h2>
            {scheduleConflicts.length > 0 && (
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-800 space-y-1.5">
                <div className="font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Schedule Conflict Detected (409)</span>
                </div>
                {scheduleConflicts.map((c, idx) => (
                  <div key={idx}>
                    • {c.courseCode} — {c.title}
                  </div>
                ))}
                <button
                  onClick={() =>
                    postExamAction(
                      {
                        action: 'schedule_exam',
                        examId: scheduleForm.examId,
                        data: { ...scheduleForm, overrideConflict: true },
                      },
                      () => setScheduleConflicts([])
                    )
                  }
                  className="px-3 py-1.5 rounded-lg bg-rose-700 text-white font-semibold"
                >
                  Override Conflict &amp; Schedule
                </button>
              </div>
            )}

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setScheduleConflicts([]);
                await postExamAction({
                  action: 'schedule_exam',
                  examId: scheduleForm.examId,
                  data: scheduleForm,
                });
              }}
              className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs"
            >
              <select
                required
                value={scheduleForm.examId}
                onChange={(e) => setScheduleForm({ ...scheduleForm, examId: e.target.value })}
                className="px-3 py-2 border border-slate-200 rounded-xl bg-white sm:col-span-2"
              >
                <option value="">Select Examination</option>
                {data.examinations.map((ex: any) => (
                  <option key={ex.id} value={ex.id}>{ex.course?.code} — {ex.title}</option>
                ))}
              </select>
              <input
                type="date"
                value={scheduleForm.scheduledDate}
                onChange={(e) => setScheduleForm({ ...scheduleForm, scheduledDate: e.target.value })}
                className="px-3 py-2 border border-slate-200 rounded-xl"
              />
              <input
                placeholder="Display Time (e.g. 09:00 AM)"
                value={scheduleForm.scheduledTime}
                onChange={(e) => setScheduleForm({ ...scheduleForm, scheduledTime: e.target.value })}
                className="px-3 py-2 border border-slate-200 rounded-xl"
              />
              <input
                type="datetime-local"
                value={scheduleForm.startTime}
                onChange={(e) => setScheduleForm({ ...scheduleForm, startTime: e.target.value })}
                className="px-3 py-2 border border-slate-200 rounded-xl"
              />
              <input
                type="datetime-local"
                value={scheduleForm.endTime}
                onChange={(e) => setScheduleForm({ ...scheduleForm, endTime: e.target.value })}
                className="px-3 py-2 border border-slate-200 rounded-xl"
              />
              <input
                placeholder="Venue"
                value={scheduleForm.venue}
                onChange={(e) => setScheduleForm({ ...scheduleForm, venue: e.target.value })}
                className="px-3 py-2 border border-slate-200 rounded-xl"
              />
              <select
                value={scheduleForm.cohortId}
                onChange={(e) => setScheduleForm({ ...scheduleForm, cohortId: e.target.value })}
                className="px-3 py-2 border border-slate-200 rounded-xl bg-white"
              >
                <option value="">All Cohorts</option>
                {data.cohorts.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <button
                disabled={busy}
                className="sm:col-span-2 py-2.5 bg-[#073832] text-white rounded-xl font-semibold"
              >
                Save Schedule
              </button>
            </form>
          </div>
        )}

        {/* TAB 5: RESULTS PUBLICATION & RETRIES */}
        {activeTab === 'publication' && (
          <div className="space-y-4">
            {data.examinations.map((ex: any) => {
              const failed = (ex.attempts || []).filter((a: any) => a.evaluationStatus === 'FAILED');
              const needsVerify = (ex.attempts || []).filter(
                (a: any) => a.evaluationStatus === 'NEEDS_VERIFICATION'
              );
              return (
                <div
                  key={ex.id}
                  className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-wrap items-center justify-between gap-4"
                >
                  <div>
                    <div className="font-bold text-sm">
                      {ex.course?.code} — {ex.title}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      Attempts: {ex.attempts?.length || 0} • Failed AI Grading:{' '}
                      <strong className="text-rose-600">{failed.length}</strong> • Needs
                      Verification: <strong className="text-amber-600">{needsVerify.length}</strong>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    {failed.length > 0 && (
                      <button
                        disabled={busy}
                        onClick={() =>
                          patchExamAction({ action: 'retry_failed_grading', examId: ex.id })
                        }
                        className="px-3 py-1.5 rounded-xl bg-rose-600 text-white font-semibold flex items-center gap-1.5"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Retry Failed ({failed.length})</span>
                      </button>
                    )}
                    {needsVerify.length > 0 && (
                      <button
                        disabled={busy}
                        onClick={() =>
                          patchExamAction({ action: 'publish_verified_results', examId: ex.id })
                        }
                        className="px-3 py-1.5 rounded-xl bg-amber-600 text-white font-semibold flex items-center gap-1.5"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Verify &amp; Publish ({needsVerify.length})</span>
                      </button>
                    )}
                    <button
                      disabled={busy}
                      onClick={() =>
                        patchExamAction({ action: 'publish_exam_results', examId: ex.id })
                      }
                      className="px-3 py-1.5 rounded-xl bg-[#073832] text-white font-semibold flex items-center gap-1.5"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Publish All Results</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* TAB 6: EXAM & QUESTION ANALYTICS */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-wrap items-center justify-between gap-3 shadow-sm">
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={analyticsFilters.periodId}
                  onChange={(e) =>
                    setAnalyticsFilters({ ...analyticsFilters, periodId: e.target.value })
                  }
                  className="px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white"
                >
                  <option value="">All Periods</option>
                  {data.periods.map((p: any) => (
                    <option key={p.id} value={p.id}>{p.title}</option>
                  ))}
                </select>
                <select
                  value={analyticsFilters.programmeId}
                  onChange={(e) =>
                    setAnalyticsFilters({ ...analyticsFilters, programmeId: e.target.value })
                  }
                  className="px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white"
                >
                  <option value="">All Programmes</option>
                  {data.programmes.map((p: any) => (
                    <option key={p.id} value={p.id}>{p.code}</option>
                  ))}
                </select>
                <select
                  value={analyticsFilters.courseId}
                  onChange={(e) =>
                    setAnalyticsFilters({ ...analyticsFilters, courseId: e.target.value })
                  }
                  className="px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white"
                >
                  <option value="">All Courses</option>
                  {data.courses.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.code}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => exportCsv('exams')}
                  className="px-3 py-2 rounded-xl bg-[#073832] text-white text-xs font-semibold flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export Exams CSV</span>
                </button>
                <button
                  onClick={() => exportCsv('questions')}
                  className="px-3 py-2 rounded-xl bg-slate-100 text-slate-800 text-xs font-semibold flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Questions CSV</span>
                </button>
              </div>
            </div>

            {analytics && (
              <>
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
                  <h3 className="font-bold text-sm">Score Distribution</h3>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 text-xs">
                    {(analytics.scoreDistribution || []).map((b: any) => (
                      <div key={b.label} className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                        <div className="text-slate-500">{b.label}</div>
                        <div className="text-xl font-bold text-slate-900">{b.count}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
                  <h3 className="font-bold text-sm">Question Performance &amp; Ambiguity Analysis</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase">
                        <tr>
                          <th className="py-2.5 px-3">Question</th>
                          <th className="py-2.5 px-3">Course / Type</th>
                          <th className="py-2.5 px-3">Answered</th>
                          <th className="py-2.5 px-3">Correct %</th>
                          <th className="py-2.5 px-3">Difficulty</th>
                          <th className="py-2.5 px-3">Flag</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {(analytics.questionAnalytics || []).map((q: any) => (
                          <tr key={q.questionId}>
                            <td className="py-2.5 px-3 max-w-xs truncate">{q.questionText}</td>
                            <td className="py-2.5 px-3">
                              {q.courseCode} • {q.questionType}
                            </td>
                            <td className="py-2.5 px-3">{q.answeredCount}</td>
                            <td className="py-2.5 px-3 font-semibold">{q.correctPct}%</td>
                            <td className="py-2.5 px-3">{q.difficultyIndicator}</td>
                            <td className="py-2.5 px-3">
                              {q.ambiguityFlag ? (
                                <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-bold inline-flex items-center gap-1">
                                  <ShieldAlert className="w-3 h-3" />
                                  AMBIGUOUS
                                </span>
                              ) : (
                                <span className="text-emerald-700">OK</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* TAB: LOCK & UNLOCK CONTROL + COMPREHENSIVE PDF EXAM GENERATION */}
        {activeTab === 'lockControl' && (() => {
          const filteredLockExams = (data.examinations || []).filter((ex: any) => {
            if (lockTrackFilter && (ex.studyTrack || 'ALL') !== lockTrackFilter) return false;
            if (lockTypeFilter && ex.examType !== lockTypeFilter) return false;
            return true;
          });
          const lockedCount = filteredLockExams.filter((ex: any) => ex.isLocked).length;
          const unlockedCount = filteredLockExams.length - lockedCount;
          const filteredIds = filteredLockExams.map((ex: any) => ex.id);

          return (
            <div className="space-y-6">
              {/* Generate Comprehensive Exam from PDFs (Modules 1-13) */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-emerald-700" />
                      Generate Comprehensive Exam (Modules 1–13) from PDFs
                    </h3>
                    <p className="text-xs text-slate-500">
                      Automatically generates Section A (Objective MCQ) &amp; Section B (Written / Essay) from uploaded PDF topics.
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                  <select
                    value={genForm.courseId}
                    onChange={(e) => setGenForm({ ...genForm, courseId: e.target.value })}
                    className="border border-slate-200 rounded-xl px-3 py-2 bg-white"
                  >
                    <option value="">Select Course</option>
                    {(data.courses || []).map((c: any) => (
                      <option key={c.id} value={c.id}>
                        {c.code} — {c.title}
                      </option>
                    ))}
                  </select>
                  <select
                    value={genForm.studyTrack}
                    onChange={(e) => setGenForm({ ...genForm, studyTrack: e.target.value })}
                    className="border border-slate-200 rounded-xl px-3 py-2 bg-white"
                  >
                    <option value="6_MONTH">6-Month Intensive Track</option>
                    <option value="12_MONTH">12-Month Standard Track</option>
                  </select>
                  <select
                    value={genForm.examType}
                    onChange={(e) => setGenForm({ ...genForm, examType: e.target.value })}
                    className="border border-slate-200 rounded-xl px-3 py-2 bg-white"
                  >
                    <option value="FINAL">Final Examination (Modules 1–13)</option>
                    <option value="END_OF_SEMESTER">End-of-Semester Examination</option>
                  </select>
                  <button
                    type="button"
                    disabled={busy || !genForm.courseId}
                    onClick={() =>
                      postExamAction({
                        action: 'generate_from_pdf',
                        courseId: genForm.courseId,
                        studyTrack: genForm.studyTrack,
                        examType: genForm.examType,
                        title: genForm.title || undefined,
                        isLocked: true,
                        includeAllProgrammeModules: true,
                      })
                    }
                    className="px-4 py-2 rounded-xl bg-[#073832] hover:bg-emerald-900 disabled:opacity-50 text-white font-bold flex items-center justify-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Generate Exam (Locked)</span>
                  </button>
                </div>
              </div>

              {/* Lock / Unlock Controls & Filters */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="px-3 py-1.5 rounded-xl bg-slate-100 font-bold text-slate-700">
                      Total: {filteredLockExams.length}
                    </span>
                    <span className="px-3 py-1.5 rounded-xl bg-rose-50 font-bold text-rose-800 border border-rose-200">
                      Locked: {lockedCount}
                    </span>
                    <span className="px-3 py-1.5 rounded-xl bg-emerald-50 font-bold text-emerald-800 border border-emerald-200">
                      Unlocked: {unlockedCount}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <select
                      value={lockTrackFilter}
                      onChange={(e) => setLockTrackFilter(e.target.value)}
                      className="border border-slate-200 rounded-xl px-3 py-1.5 bg-white"
                    >
                      <option value="">All Tracks</option>
                      <option value="6_MONTH">6-Month Track</option>
                      <option value="12_MONTH">12-Month Track</option>
                    </select>
                    <select
                      value={lockTypeFilter}
                      onChange={(e) => setLockTypeFilter(e.target.value)}
                      className="border border-slate-200 rounded-xl px-3 py-1.5 bg-white"
                    >
                      <option value="">All Exam Types</option>
                      <option value="FINAL">Final Examination</option>
                      <option value="END_OF_SEMESTER">End-of-Semester</option>
                      <option value="MID_TERM">Mid-Term</option>
                    </select>
                    <button
                      type="button"
                      disabled={busy || filteredIds.length === 0}
                      onClick={() => postExamAction({ action: 'bulk_unlock', examIds: filteredIds })}
                      className="px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-bold flex items-center gap-1"
                    >
                      <Unlock className="w-3.5 h-3.5" /> Unlock Filtered
                    </button>
                    <button
                      type="button"
                      disabled={busy || filteredIds.length === 0}
                      onClick={() => postExamAction({ action: 'bulk_lock', examIds: filteredIds })}
                      className="px-3 py-1.5 rounded-xl bg-rose-700 hover:bg-rose-800 disabled:opacity-50 text-white font-bold flex items-center gap-1"
                    >
                      <Lock className="w-3.5 h-3.5" /> Lock Filtered
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase">
                      <tr>
                        <th className="py-2.5 px-3">Examination</th>
                        <th className="py-2.5 px-3">Track</th>
                        <th className="py-2.5 px-3">Sections</th>
                        <th className="py-2.5 px-3">Schedule</th>
                        <th className="py-2.5 px-3">Lock Status</th>
                        <th className="py-2.5 px-3 text-right">Control</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredLockExams.map((ex: any) => (
                        <tr key={ex.id} className="hover:bg-slate-50/70">
                          <td className="py-3 px-3">
                            <div className="font-bold text-slate-900">{ex.title}</div>
                            <div className="text-[11px] text-slate-500">
                              {ex.course?.code} · {String(ex.examType || '').replace(/_/g, ' ')}
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <span className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-800 font-bold text-[10px]">
                              {ex.studyTrack === '6_MONTH'
                                ? '6-Month'
                                : ex.studyTrack === '12_MONTH'
                                ? '12-Month'
                                : 'All Tracks'}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-[11px] text-slate-600">
                            {(ex.sections || []).length > 0
                              ? ex.sections.map((s: any) => `${s.sectionType || 'OBJECTIVE'} (${s.questionCount})`).join(' + ')
                              : `${ex.questions?.length || 0} Qs`}
                          </td>
                          <td className="py-3 px-3 text-slate-600">
                            {ex.scheduledDate} · {ex.scheduledTime}
                          </td>
                          <td className="py-3 px-3">
                            {ex.isLocked ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 font-bold text-[10px]">
                                <Lock className="w-3 h-3" /> Locked
                              </span>
                            ) : (
                              <div>
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                                  <Unlock className="w-3 h-3" /> Unlocked
                                </span>
                                {ex.unlockedByName && (
                                  <div className="text-[10px] text-slate-400 mt-0.5">
                                    by {ex.unlockedByName}
                                  </div>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-3 text-right">
                            {ex.isLocked ? (
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => postExamAction({ action: 'unlock_exam', examId: ex.id })}
                                className="px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold inline-flex items-center gap-1"
                              >
                                <Unlock className="w-3.5 h-3.5" /> Unlock Exam
                              </button>
                            ) : (
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => postExamAction({ action: 'lock_exam', examId: ex.id })}
                                className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 font-bold inline-flex items-center gap-1"
                              >
                                <Lock className="w-3.5 h-3.5" /> Lock Exam
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                      {filteredLockExams.length === 0 && (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-slate-400">
                            No examinations match the selected track/type filter.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          );
        })()}
      </main>

      {/* CREATE EXAM MODAL */}
      {showCreateExamModal && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base">Create Examination</h3>
              <button onClick={() => setShowCreateExamModal(false)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                await postExamAction({ action: 'create_exam', examData: examForm }, () =>
                  setShowCreateExamModal(false)
                );
              }}
              className="space-y-3 text-xs"
            >
              <input
                required
                placeholder="Examination Title"
                value={examForm.title}
                onChange={(e) => setExamForm({ ...examForm, title: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl"
              />
              <div className="grid grid-cols-2 gap-2">
                <select
                  required
                  value={examForm.courseId}
                  onChange={(e) => setExamForm({ ...examForm, courseId: e.target.value })}
                  className="px-3 py-2 border border-slate-200 rounded-xl bg-white"
                >
                  <option value="">Select Course</option>
                  {data.courses.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.code} - {c.title}</option>
                  ))}
                </select>
                <select
                  value={examForm.periodId}
                  onChange={(e) => setExamForm({ ...examForm, periodId: e.target.value })}
                  className="px-3 py-2 border border-slate-200 rounded-xl bg-white"
                >
                  <option value="">Standalone (No Period)</option>
                  {data.periods.map((p: any) => (
                    <option key={p.id} value={p.id}>{p.title}</option>
                  ))}
                </select>
                <select
                  value={examForm.examType}
                  onChange={(e) => setExamForm({ ...examForm, examType: e.target.value })}
                  className="px-3 py-2 border border-slate-200 rounded-xl bg-white"
                >
                  {['QUIZ', 'MID_SEMESTER', 'END_OF_SEMESTER', 'PRACTICAL', 'RESIT', 'SUPPLEMENTARY'].map(
                    (t) => (
                      <option key={t} value={t}>{t}</option>
                    )
                  )}
                </select>
                <select
                  value={examForm.publicationMode}
                  onChange={(e) => setExamForm({ ...examForm, publicationMode: e.target.value })}
                  className="px-3 py-2 border border-slate-200 rounded-xl bg-white"
                >
                  <option value="IMMEDIATE">IMMEDIATE</option>
                  <option value="SCHEDULED">SCHEDULED</option>
                  <option value="AFTER_PERIOD">AFTER_PERIOD</option>
                </select>
                <input
                  type="number"
                  placeholder="Duration (mins)"
                  value={examForm.durationMinutes}
                  onChange={(e) => setExamForm({ ...examForm, durationMinutes: e.target.value })}
                  className="px-3 py-2 border border-slate-200 rounded-xl"
                />
                <input
                  type="number"
                  placeholder="Total Marks"
                  value={examForm.totalMarks}
                  onChange={(e) => setExamForm({ ...examForm, totalMarks: e.target.value })}
                  className="px-3 py-2 border border-slate-200 rounded-xl"
                />
                <input
                  type="date"
                  value={examForm.scheduledDate}
                  onChange={(e) => setExamForm({ ...examForm, scheduledDate: e.target.value })}
                  className="px-3 py-2 border border-slate-200 rounded-xl"
                />
                <input
                  placeholder="Time (09:00 AM)"
                  value={examForm.scheduledTime}
                  onChange={(e) => setExamForm({ ...examForm, scheduledTime: e.target.value })}
                  className="px-3 py-2 border border-slate-200 rounded-xl"
                />
              </div>
              <div className="flex flex-wrap gap-3 pt-1">
                <label className="flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={examForm.randomizeQuestions}
                    onChange={(e) =>
                      setExamForm({ ...examForm, randomizeQuestions: e.target.checked })
                    }
                  />
                  <span>Randomize Questions</span>
                </label>
                <label className="flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={examForm.requireFinancialClearance}
                    onChange={(e) =>
                      setExamForm({ ...examForm, requireFinancialClearance: e.target.checked })
                    }
                  />
                  <span>Require Financial Clearance</span>
                </label>
                <label className="flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={examForm.requireVerificationBeforePublish}
                    onChange={(e) =>
                      setExamForm({
                        ...examForm,
                        requireVerificationBeforePublish: e.target.checked,
                      })
                    }
                  />
                  <span>Verify Before Publish</span>
                </label>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateExamModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  disabled={busy}
                  className="px-4 py-2 rounded-xl bg-[#073832] text-white font-semibold"
                >
                  Create Exam
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
