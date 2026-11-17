'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  BookOpen,
  Users,
  Calendar,
  Award,
  BarChart3,
  Building,
  Plus,
  Search,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  X,
  Edit3,
  Trash2,
  Key,
  ShieldAlert,
  Download,
  Lock,
  Unlock,
  Send,
  RotateCcw,
  Check,
  Clock,
  GraduationCap,
} from 'lucide-react';
import DemoRoleSwitcher from '@/components/DemoRoleSwitcher';

type TabKey =
  | 'lecturers'
  | 'structure'
  | 'courses'
  | 'timetable'
  | 'results'
  | 'analytics';

const STATUS_BADGE: Record<string, string> = {
  ACTIVE: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  Active: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  INACTIVE: 'bg-slate-100 text-slate-700 border-slate-200',
  SUSPENDED: 'bg-rose-100 text-rose-800 border-rose-200',
  ARCHIVED: 'bg-amber-100 text-amber-800 border-amber-200',
  DRAFT: 'bg-slate-100 text-slate-700 border-slate-200',
  SUBMITTED: 'bg-sky-100 text-sky-800 border-sky-200',
  UNDER_REVIEW: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  APPROVED: 'bg-teal-100 text-teal-800 border-teal-200',
  PUBLISHED: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  RETURNED: 'bg-amber-100 text-amber-800 border-amber-200',
  LOCKED: 'bg-slate-800 text-white border-slate-900',
};

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function AdminAcademicsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('lecturers');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null);

  // Core data
  const [lecturers, setLecturers] = useState<any[]>([]);
  const [academics, setAcademics] = useState<{
    academicYears: any[];
    semesters: any[];
    departments: any[];
    programmes: any[];
    cohorts: any[];
    courses: any[];
    schedules: any[];
    gradeScales: any[];
  }>({
    academicYears: [],
    semesters: [],
    departments: [],
    programmes: [],
    cohorts: [],
    courses: [],
    schedules: [],
    gradeScales: [],
  });

  // Results moderation state
  const [resultsData, setResultsData] = useState<{
    results: any[];
    gradeScales: any[];
    studentSummaries: any[];
    stats: any;
  }>({ results: [], gradeScales: [], studentSummaries: [], stats: {} });
  const [resultFilters, setResultFilters] = useState({
    programmeId: '',
    courseId: '',
    level: '',
    status: '',
    search: '',
  });
  const [selectedResultIds, setSelectedResultIds] = useState<string[]>([]);
  const [returnModal, setReturnModal] = useState<{ ids: string[]; remarks: string } | null>(null);

  // Analytics state
  const [analytics, setAnalytics] = useState<any>(null);
  const [analyticsFilters, setAnalyticsFilters] = useState({
    academicYearId: '',
    semesterId: '',
    programmeId: '',
    departmentId: '',
  });

  // Lecturer filters & modals
  const [lecturerSearch, setLecturerSearch] = useState('');
  const [lecturerDeptFilter, setLecturerDeptFilter] = useState('');
  const [lecturerStatusFilter, setLecturerStatusFilter] = useState('');
  const [showLecturerModal, setShowLecturerModal] = useState(false);
  const [editingLecturer, setEditingLecturer] = useState<any>(null);
  const [lecturerForm, setLecturerForm] = useState({
    name: '',
    email: '',
    phone: '',
    title: '',
    departmentId: '',
    staffId: '',
    staffIdFormat: 'WLS-LEC-{YYYY}-{XXX}',
    qualifications: '',
    specialization: '',
    officeLocation: '',
    password: '',
  });
  const [assignModalLecturer, setAssignModalLecturer] = useState<any>(null);
  const [assignForm, setAssignForm] = useState({
    courseId: '',
    semesterId: '',
    academicYearId: '',
    cohortId: '',
    role: 'PRIMARY',
  });
  const [resetPwModal, setResetPwModal] = useState<any>(null);
  const [newPassword, setNewPassword] = useState('');

  // Structure & Course & Schedule & GradeScale modals
  const [deptForm, setDeptForm] = useState({ id: '', code: '', name: '', description: '' });
  const [progForm, setProgForm] = useState({
    id: '',
    code: '',
    name: '',
    departmentId: '',
    duration: '3 Years',
    qualification: 'Diploma',
    fee: '4500',
    status: 'Active',
  });
  const [yearForm, setYearForm] = useState({
    id: '',
    name: '',
    startDate: '',
    endDate: '',
    isCurrent: false,
  });
  const [semForm, setSemForm] = useState({
    id: '',
    academicYearId: '',
    name: 'First Semester',
    startDate: '',
    endDate: '',
    isCurrent: false,
  });
  const [cohortForm, setCohortForm] = useState({
    id: '',
    name: '',
    programmeId: '',
    academicYear: '2025/2026',
    semester: 'First Semester',
    level: 'Level 100',
    capacity: '',
  });

  // Course modal & filters
  const [courseSearch, setCourseSearch] = useState('');
  const [courseProgFilter, setCourseProgFilter] = useState('');
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [courseForm, setCourseForm] = useState({
    id: '',
    code: '',
    title: '',
    description: '',
    creditHours: '3',
    programmeId: '',
    departmentId: '',
    level: 'Level 100',
    semester: 'First Semester',
    semesterId: '',
    lecturerId: '',
    maxCapacity: '',
    status: 'ACTIVE',
    isElective: false,
    prerequisites: '',
    prerequisiteCourseIds: [] as string[],
  });

  // Schedule modal & conflict state
  const [scheduleDayFilter, setScheduleDayFilter] = useState('');
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({
    id: '',
    courseId: '',
    lecturerId: '',
    semesterId: '',
    cohortId: '',
    sessionType: 'LECTURE',
    dayOfWeek: 'Monday',
    startTime: '08:00 AM',
    endTime: '10:00 AM',
    venue: '',
    room: '',
  });
  const [scheduleConflicts, setScheduleConflicts] = useState<any[]>([]);

  // GradeScale form
  const [gradeForm, setGradeForm] = useState({
    id: '',
    name: 'Standard Ghana 4.0',
    minScore: '',
    maxScore: '',
    gradeLetter: '',
    gradePoint: '',
    remark: '',
    isDefault: true,
  });

  const showToast = (type: 'ok' | 'err', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4500);
  };

  const loadCoreData = useCallback(async () => {
    setLoading(true);
    try {
      const [lecRes, acadRes] = await Promise.all([
        fetch('/api/admin/lecturers?includeInactive=true'),
        fetch('/api/admin/academics'),
      ]);
      if (lecRes.ok) {
        const ld = await lecRes.json();
        setLecturers(ld.lecturers || []);
      }
      if (acadRes.ok) {
        const ad = await acadRes.json();
        setAcademics({
          academicYears: ad.academicYears || [],
          semesters: ad.semesters || [],
          departments: ad.departments || [],
          programmes: ad.programmes || [],
          cohorts: ad.cohorts || [],
          courses: ad.courses || [],
          schedules: ad.schedules || [],
          gradeScales: ad.gradeScales || [],
        });
      }
    } catch {
      showToast('err', 'Failed to load academic data.');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadResults = useCallback(async () => {
    const params = new URLSearchParams();
    if (resultFilters.programmeId) params.set('programmeId', resultFilters.programmeId);
    if (resultFilters.courseId) params.set('courseId', resultFilters.courseId);
    if (resultFilters.level) params.set('level', resultFilters.level);
    if (resultFilters.status) params.set('status', resultFilters.status);
    if (resultFilters.search) params.set('search', resultFilters.search);
    const res = await fetch(`/api/admin/results?${params.toString()}`);
    if (res.ok) {
      const d = await res.json();
      setResultsData(d);
    }
  }, [resultFilters]);

  const loadAnalytics = useCallback(async () => {
    const params = new URLSearchParams();
    if (analyticsFilters.academicYearId) params.set('academicYearId', analyticsFilters.academicYearId);
    if (analyticsFilters.semesterId) params.set('semesterId', analyticsFilters.semesterId);
    if (analyticsFilters.programmeId) params.set('programmeId', analyticsFilters.programmeId);
    if (analyticsFilters.departmentId) params.set('departmentId', analyticsFilters.departmentId);
    const res = await fetch(`/api/admin/academic-analytics?${params.toString()}`);
    if (res.ok) {
      setAnalytics(await res.json());
    }
  }, [analyticsFilters]);

  useEffect(() => {
    loadCoreData();
  }, [loadCoreData]);

  useEffect(() => {
    if (activeTab === 'results') loadResults();
    if (activeTab === 'analytics') loadAnalytics();
  }, [activeTab, loadResults, loadAnalytics]);

  // Lecturer handlers
  const openCreateLecturer = () => {
    setEditingLecturer(null);
    setLecturerForm({
      name: '',
      email: '',
      phone: '',
      title: '',
      departmentId: academics.departments[0]?.id || '',
      staffId: '',
      staffIdFormat: 'WLS-LEC-{YYYY}-{XXX}',
      qualifications: '',
      specialization: '',
      officeLocation: '',
      password: '',
    });
    setShowLecturerModal(true);
  };

  const openEditLecturer = (lec: any) => {
    setEditingLecturer(lec);
    setLecturerForm({
      name: lec.name || '',
      email: lec.email || '',
      phone: lec.phone || '',
      title: lec.title || '',
      departmentId: lec.lecturerProfile?.departmentId || '',
      staffId: lec.staffId || '',
      staffIdFormat: 'WLS-LEC-{YYYY}-{XXX}',
      qualifications: lec.lecturerProfile?.qualifications || '',
      specialization: lec.lecturerProfile?.specialization || '',
      officeLocation: lec.lecturerProfile?.officeLocation || '',
      password: '',
    });
    setShowLecturerModal(true);
  };

  const handleSaveLecturer = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const isEdit = Boolean(editingLecturer);
      const res = await fetch('/api/admin/lecturers', {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          isEdit
            ? { action: 'update_profile', lecturerId: editingLecturer.id, ...lecturerForm }
            : { action: 'create_lecturer', ...lecturerForm }
        ),
      });
      const d = await res.json();
      if (!res.ok) {
        showToast('err', d.error || 'Failed to save lecturer');
        return;
      }
      showToast('ok', isEdit ? 'Lecturer profile updated.' : `Lecturer ${d.lecturer?.name} created.`);
      setShowLecturerModal(false);
      await loadCoreData();
    } finally {
      setBusy(false);
    }
  };

  const handleLecturerStatus = async (lecturerId: string, action: 'activate' | 'suspend' | 'deactivate') => {
    setBusy(true);
    try {
      const res = await fetch('/api/admin/lecturers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, lecturerId }),
      });
      const d = await res.json();
      if (!res.ok) {
        showToast('err', d.error || 'Failed to update status');
        return;
      }
      showToast('ok', `Lecturer status updated to ${d.profile?.employmentStatus}.`);
      await loadCoreData();
    } finally {
      setBusy(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPwModal) return;
    setBusy(true);
    try {
      const res = await fetch('/api/admin/lecturers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reset_password',
          lecturerId: resetPwModal.id,
          newPassword: newPassword || 'lecturer123',
        }),
      });
      const d = await res.json();
      if (!res.ok) {
        showToast('err', d.error || 'Failed to reset password');
        return;
      }
      showToast('ok', `Password reset for ${resetPwModal.name}.`);
      setResetPwModal(null);
      setNewPassword('');
    } finally {
      setBusy(false);
    }
  };

  const handleAssignCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignModalLecturer) return;
    setBusy(true);
    try {
      const res = await fetch('/api/admin/lecturers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'assign_course',
          lecturerId: assignModalLecturer.id,
          ...assignForm,
        }),
      });
      const d = await res.json();
      if (!res.ok) {
        showToast('err', d.error || 'Failed to assign course');
        return;
      }
      showToast('ok', `Assigned ${d.assignment?.course?.code} to ${assignModalLecturer.name}.`);
      setAssignModalLecturer(null);
      await loadCoreData();
    } finally {
      setBusy(false);
    }
  };

  const handleDeactivateAssignment = async (assignmentId: string) => {
    setBusy(true);
    try {
      const res = await fetch('/api/admin/lecturers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'deactivate_assignment', assignmentId }),
      });
      if (res.ok) {
        showToast('ok', 'Course assignment deactivated.');
        await loadCoreData();
      }
    } finally {
      setBusy(false);
    }
  };

  // Generic Academic Entity CRUD helper
  const saveAcademicEntity = async (type: string, id: string, data: any, onDone?: () => void) => {
    setBusy(true);
    try {
      const isEdit = Boolean(id);
      const res = await fetch('/api/admin/academics', {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isEdit ? { type, id, data } : { type, data }),
      });
      const d = await res.json();
      if (!res.ok) {
        if (res.status === 409 && d.conflicts) {
          setScheduleConflicts(d.conflicts);
        }
        showToast('err', d.error || `Failed to save ${type}`);
        return false;
      }
      showToast('ok', `${type} ${isEdit ? 'updated' : 'created'} successfully.`);
      if (onDone) onDone();
      await loadCoreData();
      return true;
    } finally {
      setBusy(false);
    }
  };

  const deleteAcademicEntity = async (type: string, id: string) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/academics?type=${type}&id=${id}`, {
        method: 'DELETE',
      });
      const d = await res.json();
      if (!res.ok) {
        showToast('err', d.error || `Failed to delete ${type}`);
        return;
      }
      showToast('ok', `${type} deleted.`);
      await loadCoreData();
    } finally {
      setBusy(false);
    }
  };

  // Schedule save with optional override
  const handleSaveSchedule = async (overrideConflict = false) => {
    setScheduleConflicts([]);
    const ok = await saveAcademicEntity(
      'schedule',
      scheduleForm.id,
      { ...scheduleForm, overrideConflict },
      () => {
        setShowScheduleModal(false);
        setScheduleConflicts([]);
      }
    );
    return ok;
  };

  // Results Moderation Actions
  const handleResultsAction = async (
    action: 'approve' | 'return' | 'publish' | 'lock' | 'reopen' | 'recalculate',
    ids: string[],
    remarks?: string
  ) => {
    if (ids.length === 0) return;
    setBusy(true);
    try {
      const res = await fetch('/api/admin/results', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, resultIds: ids, remarks }),
      });
      const d = await res.json();
      if (!res.ok) {
        showToast('err', d.error || 'Failed to update results');
        return;
      }
      showToast('ok', `${action.toUpperCase()} completed on ${d.updatedCount} record(s).`);
      setSelectedResultIds([]);
      setReturnModal(null);
      await loadResults();
    } finally {
      setBusy(false);
    }
  };

  const exportAnalyticsCsv = (section: string) => {
    const params = new URLSearchParams();
    params.set('format', 'csv');
    params.set('section', section);
    if (analyticsFilters.academicYearId) params.set('academicYearId', analyticsFilters.academicYearId);
    if (analyticsFilters.semesterId) params.set('semesterId', analyticsFilters.semesterId);
    if (analyticsFilters.programmeId) params.set('programmeId', analyticsFilters.programmeId);
    if (analyticsFilters.departmentId) params.set('departmentId', analyticsFilters.departmentId);
    window.open(`/api/admin/academic-analytics?${params.toString()}`, '_blank');
  };

  const filteredLecturers = lecturers.filter((l) => {
    const q = lecturerSearch.toLowerCase();
    const matchSearch =
      !q ||
      l.name?.toLowerCase().includes(q) ||
      l.email?.toLowerCase().includes(q) ||
      l.staffId?.toLowerCase().includes(q);
    const matchDept =
      !lecturerDeptFilter || l.lecturerProfile?.departmentId === lecturerDeptFilter;
    const status = l.lecturerProfile?.employmentStatus || 'ACTIVE';
    const matchStatus = !lecturerStatusFilter || status === lecturerStatusFilter;
    return matchSearch && matchDept && matchStatus;
  });

  const filteredCourses = academics.courses.filter((c) => {
    const q = courseSearch.toLowerCase();
    const matchSearch =
      !q ||
      c.code?.toLowerCase().includes(q) ||
      c.title?.toLowerCase().includes(q);
    const matchProg = !courseProgFilter || c.programmeId === courseProgFilter;
    return matchSearch && matchProg;
  });

  const filteredSchedules = academics.schedules.filter(
    (s) => !scheduleDayFilter || s.dayOfWeek === scheduleDayFilter
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Top Institutional Header */}
      <header className="bg-[#073832] text-white border-b border-emerald-900/60 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/portal/admin"
              className="p-2 rounded-lg bg-emerald-900/50 hover:bg-emerald-800/70 text-emerald-200 transition"
              title="Back to Admin Dashboard"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-lg sm:text-xl font-bold tracking-tight flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-emerald-300" />
                <span>Academic &amp; Lecturer Management</span>
              </h1>
              <p className="text-xs text-emerald-200/80">
                Faculty directory, curriculum, timetable conflict control, results moderation &amp; analytics
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <DemoRoleSwitcher />
            <button
              onClick={() => {
                loadCoreData();
                if (activeTab === 'results') loadResults();
                if (activeTab === 'analytics') loadAnalytics();
              }}
              className="px-3 py-1.5 rounded-lg bg-emerald-800/70 hover:bg-emerald-700 text-xs font-medium flex items-center gap-1.5 transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-2 flex items-center gap-1.5 overflow-x-auto text-xs font-medium">
          {[
            { key: 'lecturers', label: 'Lecturers & Assignments', icon: Users },
            { key: 'structure', label: 'Departments, Programmes & Terms', icon: Building },
            { key: 'courses', label: 'Courses & Prerequisites', icon: BookOpen },
            { key: 'timetable', label: 'Timetable & Conflicts', icon: Calendar },
            { key: 'results', label: 'Results Moderation & Grade Scale', icon: Award },
            { key: 'analytics', label: 'Academic Analytics', icon: BarChart3 },
          ].map((t) => {
            const Icon = t.icon;
            const active = activeTab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key as TabKey)}
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

      {/* Toast Notification */}
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
              <X className="w-4 h-4 opacity-60 hover:opacity-100" />
            </button>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* TAB 1: LECTURERS & ASSIGNMENTS */}
        {activeTab === 'lecturers' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3 flex-1">
                <div className="relative flex-1 min-w-[200px] max-w-xs">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    value={lecturerSearch}
                    onChange={(e) => setLecturerSearch(e.target.value)}
                    placeholder="Search name, email, staff ID..."
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <select
                  value={lecturerDeptFilter}
                  onChange={(e) => setLecturerDeptFilter(e.target.value)}
                  className="px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white"
                >
                  <option value="">All Departments</option>
                  {academics.departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
                <select
                  value={lecturerStatusFilter}
                  onChange={(e) => setLecturerStatusFilter(e.target.value)}
                  className="px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white"
                >
                  <option value="">All Statuses</option>
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="SUSPENDED">SUSPENDED</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </div>
              <button
                onClick={openCreateLecturer}
                className="px-4 py-2 bg-[#073832] hover:bg-emerald-900 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
              >
                <Plus className="w-4 h-4" />
                <span>Add Lecturer</span>
              </button>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase">
                    <tr>
                      <th className="py-3 px-4 font-semibold">Lecturer</th>
                      <th className="py-3 px-4 font-semibold">Staff ID &amp; Dept</th>
                      <th className="py-3 px-4 font-semibold">Assigned Courses</th>
                      <th className="py-3 px-4 font-semibold">Status</th>
                      <th className="py-3 px-4 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredLecturers.map((lec) => {
                      const empStatus = lec.lecturerProfile?.employmentStatus || 'ACTIVE';
                      const activeAssignments = (lec.courseAssignments || []).filter((a: any) => a.isActive);
                      return (
                        <tr key={lec.id} className="hover:bg-slate-50/70">
                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-900">
                              {lec.title ? `${lec.title} ` : ''}{lec.name}
                            </div>
                            <div className="text-slate-500">{lec.email}</div>
                            {lec.phone && <div className="text-slate-400">{lec.phone}</div>}
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-mono text-[11px] bg-slate-100 px-2 py-0.5 rounded text-slate-700">
                              {lec.staffId || 'N/A'}
                            </span>
                            <div className="text-slate-600 mt-1">
                              {lec.lecturerProfile?.department?.name || lec.department || 'Unassigned'}
                            </div>
                            {lec.lecturerProfile?.specialization && (
                              <div className="text-slate-400 text-[11px]">
                                {lec.lecturerProfile.specialization}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex flex-wrap gap-1.5">
                              {activeAssignments.length > 0 ? (
                                activeAssignments.map((a: any) => (
                                  <span
                                    key={a.id}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 font-medium"
                                  >
                                    {a.course?.code} ({a.role})
                                    <button
                                      onClick={() => handleDeactivateAssignment(a.id)}
                                      title="Deactivate assignment"
                                      className="text-emerald-600 hover:text-rose-600"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </span>
                                ))
                              ) : (lec.lecturerCourses || []).length > 0 ? (
                                lec.lecturerCourses.map((c: any) => (
                                  <span
                                    key={c.id}
                                    className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700"
                                  >
                                    {c.code}
                                  </span>
                                ))
                              ) : (
                                <span className="text-slate-400 italic">No active courses</span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded-full border text-[11px] font-semibold ${
                                STATUS_BADGE[empStatus] || STATUS_BADGE.ACTIVE
                              }`}
                            >
                              {empStatus}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="inline-flex items-center gap-1">
                              <button
                                onClick={() => {
                                  setAssignModalLecturer(lec);
                                  setAssignForm({
                                    courseId: academics.courses[0]?.id || '',
                                    semesterId: academics.semesters[0]?.id || '',
                                    academicYearId: academics.academicYears[0]?.id || '',
                                    cohortId: '',
                                    role: 'PRIMARY',
                                  });
                                }}
                                className="px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-medium"
                                title="Assign Course"
                              >
                                Assign
                              </button>
                              <button
                                onClick={() => openEditLecturer(lec)}
                                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600"
                                title="Edit Profile"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setResetPwModal(lec)}
                                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600"
                                title="Reset Password"
                              >
                                <Key className="w-3.5 h-3.5" />
                              </button>
                              {empStatus !== 'ACTIVE' ? (
                                <button
                                  onClick={() => handleLecturerStatus(lec.id, 'activate')}
                                  className="px-2 py-1 rounded-lg bg-emerald-100 text-emerald-800 hover:bg-emerald-200 font-medium"
                                >
                                  Activate
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleLecturerStatus(lec.id, 'suspend')}
                                  className="px-2 py-1 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 font-medium"
                                >
                                  Suspend
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredLecturers.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-400">
                          No lecturers match the current filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: DEPARTMENTS, PROGRAMMES & TERMS */}
        {activeTab === 'structure' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Departments */}
            <section className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
              <h2 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Building className="w-4 h-4 text-emerald-700" />
                <span>Departments</span>
              </h2>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  await saveAcademicEntity('department', deptForm.id, deptForm, () =>
                    setDeptForm({ id: '', code: '', name: '', description: '' })
                  );
                }}
                className="grid grid-cols-1 sm:grid-cols-3 gap-2"
              >
                <input
                  required
                  placeholder="Code (e.g. NUR)"
                  value={deptForm.code}
                  onChange={(e) => setDeptForm({ ...deptForm, code: e.target.value })}
                  className="px-3 py-2 text-xs border border-slate-200 rounded-xl"
                />
                <input
                  required
                  placeholder="Department Name"
                  value={deptForm.name}
                  onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
                  className="px-3 py-2 text-xs border border-slate-200 rounded-xl sm:col-span-2"
                />
                <input
                  placeholder="Description (optional)"
                  value={deptForm.description}
                  onChange={(e) => setDeptForm({ ...deptForm, description: e.target.value })}
                  className="px-3 py-2 text-xs border border-slate-200 rounded-xl sm:col-span-2"
                />
                <button
                  disabled={busy}
                  className="px-3 py-2 bg-[#073832] text-white rounded-xl text-xs font-semibold hover:bg-emerald-900"
                >
                  {deptForm.id ? 'Update' : 'Add Dept'}
                </button>
              </form>
              <div className="divide-y divide-slate-100 text-xs max-h-60 overflow-y-auto">
                {academics.departments.map((d) => (
                  <div key={d.id} className="py-2.5 flex items-center justify-between gap-2">
                    <div>
                      <span className="font-mono font-semibold text-emerald-800 mr-2">{d.code}</span>
                      <span className="font-medium text-slate-800">{d.name}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() =>
                          setDeptForm({
                            id: d.id,
                            code: d.code,
                            name: d.name,
                            description: d.description || '',
                          })
                        }
                        className="p-1 text-slate-500 hover:text-slate-900"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => deleteAcademicEntity('department', d.id)}
                        className="p-1 text-rose-500 hover:text-rose-700"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Programmes */}
            <section className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
              <h2 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-emerald-700" />
                <span>Programmes</span>
              </h2>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  await saveAcademicEntity('programme', progForm.id, progForm, () =>
                    setProgForm({
                      id: '',
                      code: '',
                      name: '',
                      departmentId: '',
                      duration: '3 Years',
                      qualification: 'Diploma',
                      fee: '4500',
                      status: 'Active',
                    })
                  );
                }}
                className="grid grid-cols-1 sm:grid-cols-3 gap-2"
              >
                <input
                  required
                  placeholder="Code (e.g. RGN)"
                  value={progForm.code}
                  onChange={(e) => setProgForm({ ...progForm, code: e.target.value })}
                  className="px-3 py-2 text-xs border border-slate-200 rounded-xl"
                />
                <input
                  required
                  placeholder="Programme Name"
                  value={progForm.name}
                  onChange={(e) => setProgForm({ ...progForm, name: e.target.value })}
                  className="px-3 py-2 text-xs border border-slate-200 rounded-xl sm:col-span-2"
                />
                <select
                  value={progForm.departmentId}
                  onChange={(e) => setProgForm({ ...progForm, departmentId: e.target.value })}
                  className="px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white"
                >
                  <option value="">Select Department</option>
                  {academics.departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
                <input
                  placeholder="Fee (GHS)"
                  type="number"
                  value={progForm.fee}
                  onChange={(e) => setProgForm({ ...progForm, fee: e.target.value })}
                  className="px-3 py-2 text-xs border border-slate-200 rounded-xl"
                />
                <button
                  disabled={busy}
                  className="px-3 py-2 bg-[#073832] text-white rounded-xl text-xs font-semibold hover:bg-emerald-900"
                >
                  {progForm.id ? 'Update' : 'Add Programme'}
                </button>
              </form>
              <div className="divide-y divide-slate-100 text-xs max-h-60 overflow-y-auto">
                {academics.programmes.map((p) => (
                  <div key={p.id} className="py-2.5 flex items-center justify-between gap-2">
                    <div>
                      <span className="font-mono font-semibold text-emerald-800 mr-2">{p.code}</span>
                      <span className="font-medium text-slate-800">{p.name}</span>
                      <span className="ml-2 text-slate-400">GHS {p.fee}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() =>
                          setProgForm({
                            id: p.id,
                            code: p.code,
                            name: p.name,
                            departmentId: p.departmentId || '',
                            duration: p.duration,
                            qualification: p.qualification,
                            fee: String(p.fee),
                            status: p.status,
                          })
                        }
                        className="p-1 text-slate-500 hover:text-slate-900"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => deleteAcademicEntity('programme', p.id)}
                        className="p-1 text-rose-500 hover:text-rose-700"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Academic Years & Semesters */}
            <section className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
              <h2 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-700" />
                <span>Academic Years &amp; Semesters</span>
              </h2>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  await saveAcademicEntity('academicYear', yearForm.id, yearForm, () =>
                    setYearForm({ id: '', name: '', startDate: '', endDate: '', isCurrent: false })
                  );
                }}
                className="grid grid-cols-1 sm:grid-cols-4 gap-2"
              >
                <input
                  required
                  placeholder="2025/2026"
                  value={yearForm.name}
                  onChange={(e) => setYearForm({ ...yearForm, name: e.target.value })}
                  className="px-3 py-2 text-xs border border-slate-200 rounded-xl"
                />
                <input
                  required
                  type="date"
                  value={yearForm.startDate}
                  onChange={(e) => setYearForm({ ...yearForm, startDate: e.target.value })}
                  className="px-3 py-2 text-xs border border-slate-200 rounded-xl"
                />
                <input
                  required
                  type="date"
                  value={yearForm.endDate}
                  onChange={(e) => setYearForm({ ...yearForm, endDate: e.target.value })}
                  className="px-3 py-2 text-xs border border-slate-200 rounded-xl"
                />
                <button
                  disabled={busy}
                  className="px-3 py-2 bg-[#073832] text-white rounded-xl text-xs font-semibold"
                >
                  {yearForm.id ? 'Update Year' : 'Add Year'}
                </button>
              </form>

              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  await saveAcademicEntity('semester', semForm.id, semForm, () =>
                    setSemForm({
                      id: '',
                      academicYearId: '',
                      name: 'First Semester',
                      startDate: '',
                      endDate: '',
                      isCurrent: false,
                    })
                  );
                }}
                className="grid grid-cols-1 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100"
              >
                <select
                  required
                  value={semForm.academicYearId}
                  onChange={(e) => setSemForm({ ...semForm, academicYearId: e.target.value })}
                  className="px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white"
                >
                  <option value="">Academic Year</option>
                  {academics.academicYears.map((y) => (
                    <option key={y.id} value={y.id}>{y.name}</option>
                  ))}
                </select>
                <input
                  required
                  placeholder="First Semester"
                  value={semForm.name}
                  onChange={(e) => setSemForm({ ...semForm, name: e.target.value })}
                  className="px-3 py-2 text-xs border border-slate-200 rounded-xl"
                />
                <input
                  required
                  type="date"
                  value={semForm.startDate}
                  onChange={(e) => setSemForm({ ...semForm, startDate: e.target.value })}
                  className="px-3 py-2 text-xs border border-slate-200 rounded-xl"
                />
                <div className="flex gap-1">
                  <input
                    required
                    type="date"
                    value={semForm.endDate}
                    onChange={(e) => setSemForm({ ...semForm, endDate: e.target.value })}
                    className="px-2 py-2 text-xs border border-slate-200 rounded-xl w-full"
                  />
                  <button
                    disabled={busy}
                    className="px-3 py-2 bg-emerald-700 text-white rounded-xl text-xs font-semibold whitespace-nowrap"
                  >
                    + Sem
                  </button>
                </div>
              </form>

              <div className="divide-y divide-slate-100 text-xs max-h-48 overflow-y-auto">
                {academics.semesters.map((s) => (
                  <div key={s.id} className="py-2 flex items-center justify-between">
                    <div>
                      <span className="font-semibold">{s.academicYear?.name}</span> — {s.name}
                      {s.isCurrent && (
                        <span className="ml-2 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                          CURRENT
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {!s.isCurrent && (
                        <button
                          onClick={() =>
                            saveAcademicEntity('semester', s.id, { isCurrent: true })
                          }
                          className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[11px] font-medium"
                        >
                          Set Current
                        </button>
                      )}
                      <button
                        onClick={() => deleteAcademicEntity('semester', s.id)}
                        className="p-1 text-rose-500"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Cohorts */}
            <section className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
              <h2 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-700" />
                <span>Student Cohorts</span>
              </h2>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  await saveAcademicEntity('cohort', cohortForm.id, cohortForm, () =>
                    setCohortForm({
                      id: '',
                      name: '',
                      programmeId: '',
                      academicYear: '2025/2026',
                      semester: 'First Semester',
                      level: 'Level 100',
                      capacity: '',
                    })
                  );
                }}
                className="grid grid-cols-1 sm:grid-cols-3 gap-2"
              >
                <input
                  required
                  placeholder="Cohort Name (e.g. NUR-2025-A)"
                  value={cohortForm.name}
                  onChange={(e) => setCohortForm({ ...cohortForm, name: e.target.value })}
                  className="px-3 py-2 text-xs border border-slate-200 rounded-xl"
                />
                <select
                  required
                  value={cohortForm.programmeId}
                  onChange={(e) => setCohortForm({ ...cohortForm, programmeId: e.target.value })}
                  className="px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white"
                >
                  <option value="">Select Programme</option>
                  {academics.programmes.map((p) => (
                    <option key={p.id} value={p.id}>{p.code} - {p.name}</option>
                  ))}
                </select>
                <select
                  value={cohortForm.level}
                  onChange={(e) => setCohortForm({ ...cohortForm, level: e.target.value })}
                  className="px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white"
                >
                  {['Level 100', 'Level 200', 'Level 300', 'Level 400'].map((lvl) => (
                    <option key={lvl} value={lvl}>{lvl}</option>
                  ))}
                </select>
                <input
                  placeholder="Academic Year"
                  value={cohortForm.academicYear}
                  onChange={(e) => setCohortForm({ ...cohortForm, academicYear: e.target.value })}
                  className="px-3 py-2 text-xs border border-slate-200 rounded-xl"
                />
                <input
                  type="number"
                  placeholder="Capacity (optional)"
                  value={cohortForm.capacity}
                  onChange={(e) => setCohortForm({ ...cohortForm, capacity: e.target.value })}
                  className="px-3 py-2 text-xs border border-slate-200 rounded-xl"
                />
                <button
                  disabled={busy}
                  className="px-3 py-2 bg-[#073832] text-white rounded-xl text-xs font-semibold"
                >
                  {cohortForm.id ? 'Update' : 'Add Cohort'}
                </button>
              </form>
              <div className="divide-y divide-slate-100 text-xs max-h-52 overflow-y-auto">
                {academics.cohorts.map((c) => (
                  <div key={c.id} className="py-2.5 flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-slate-900">{c.name}</span>
                      <span className="ml-2 text-slate-500">
                        {c.programme?.code} • {c.level} • {c.academicYear}
                      </span>
                    </div>
                    <button
                      onClick={() => deleteAcademicEntity('cohort', c.id)}
                      className="p-1 text-rose-500 hover:text-rose-700"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {/* TAB 3: COURSES & PREREQUISITES */}
        {activeTab === 'courses' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-wrap items-center justify-between gap-3 shadow-sm">
              <div className="flex flex-wrap items-center gap-3 flex-1">
                <div className="relative min-w-[200px] flex-1 max-w-xs">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    value={courseSearch}
                    onChange={(e) => setCourseSearch(e.target.value)}
                    placeholder="Search course code or title..."
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl"
                  />
                </div>
                <select
                  value={courseProgFilter}
                  onChange={(e) => setCourseProgFilter(e.target.value)}
                  className="px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white"
                >
                  <option value="">All Programmes</option>
                  {academics.programmes.map((p) => (
                    <option key={p.id} value={p.id}>{p.code} - {p.name}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={() => {
                  setCourseForm({
                    id: '',
                    code: '',
                    title: '',
                    description: '',
                    creditHours: '3',
                    programmeId: academics.programmes[0]?.id || '',
                    departmentId: academics.departments[0]?.id || '',
                    level: 'Level 100',
                    semester: 'First Semester',
                    semesterId: academics.semesters[0]?.id || '',
                    lecturerId: '',
                    maxCapacity: '',
                    status: 'ACTIVE',
                    isElective: false,
                    prerequisites: '',
                    prerequisiteCourseIds: [],
                  });
                  setShowCourseModal(true);
                }}
                className="px-4 py-2 bg-[#073832] text-white rounded-xl text-xs font-semibold flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>New Course</span>
              </button>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase">
                    <tr>
                      <th className="py-3 px-4">Course</th>
                      <th className="py-3 px-4">Programme &amp; Level</th>
                      <th className="py-3 px-4">Credits / Cap</th>
                      <th className="py-3 px-4">Prerequisites</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredCourses.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50/70">
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">{c.code} — {c.title}</div>
                          <div className="text-slate-500">
                            Lecturer: {c.lecturer?.name || 'Unassigned'}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div>{c.programme?.name}</div>
                          <div className="text-slate-500">{c.level} • {c.semester}</div>
                        </td>
                        <td className="py-3 px-4">
                          <div>{c.creditHours} Credits</div>
                          <div className="text-slate-400">
                            Cap: {c.maxCapacity || 'Unlimited'}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex flex-wrap gap-1">
                            {(c.prerequisitesList || []).map((p: any) => (
                              <span
                                key={p.id}
                                className="px-2 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-800"
                              >
                                {p.prerequisiteCourse?.code}
                              </span>
                            ))}
                            {(!c.prerequisitesList || c.prerequisitesList.length === 0) && (
                              <span className="text-slate-400">None</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full border text-[11px] font-semibold ${
                              STATUS_BADGE[c.status] || STATUS_BADGE.ACTIVE
                            }`}
                          >
                            {c.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="inline-flex items-center gap-1">
                            <button
                              onClick={() => {
                                setCourseForm({
                                  id: c.id,
                                  code: c.code,
                                  title: c.title,
                                  description: c.description || '',
                                  creditHours: String(c.creditHours),
                                  programmeId: c.programmeId,
                                  departmentId: c.departmentId || '',
                                  level: c.level,
                                  semester: c.semester,
                                  semesterId: c.semesterId || '',
                                  lecturerId: c.lecturerId || '',
                                  maxCapacity: c.maxCapacity ? String(c.maxCapacity) : '',
                                  status: c.status || 'ACTIVE',
                                  isElective: Boolean(c.isElective),
                                  prerequisites: c.prerequisites || '',
                                  prerequisiteCourseIds: (c.prerequisitesList || []).map(
                                    (p: any) => p.prerequisiteCourseId
                                  ),
                                });
                                setShowCourseModal(true);
                              }}
                              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => deleteAcademicEntity('course', c.id)}
                              className="p-1.5 rounded-lg hover:bg-rose-50 text-rose-600"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: TIMETABLE & CONFLICTS */}
        {activeTab === 'timetable' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-wrap items-center justify-between gap-3 shadow-sm">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setScheduleDayFilter('')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium ${
                    !scheduleDayFilter ? 'bg-[#073832] text-white' : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  All Days
                </button>
                {DAYS_OF_WEEK.map((day) => (
                  <button
                    key={day}
                    onClick={() => setScheduleDayFilter(day)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium ${
                      scheduleDayFilter === day
                        ? 'bg-[#073832] text-white'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>
              <button
                onClick={() => {
                  setScheduleConflicts([]);
                  setScheduleForm({
                    id: '',
                    courseId: academics.courses[0]?.id || '',
                    lecturerId: lecturers[0]?.id || '',
                    semesterId: academics.semesters[0]?.id || '',
                    cohortId: '',
                    sessionType: 'LECTURE',
                    dayOfWeek: 'Monday',
                    startTime: '08:00 AM',
                    endTime: '10:00 AM',
                    venue: '',
                    room: '',
                  });
                  setShowScheduleModal(true);
                }}
                className="px-4 py-2 bg-[#073832] text-white rounded-xl text-xs font-semibold flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Add Timetable Slot</span>
              </button>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase">
                    <tr>
                      <th className="py-3 px-4">Day &amp; Time</th>
                      <th className="py-3 px-4">Course</th>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4">Lecturer</th>
                      <th className="py-3 px-4">Venue / Room</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredSchedules.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50/70">
                        <td className="py-3 px-4 font-medium">
                          <div>{s.dayOfWeek}</div>
                          <div className="text-slate-500 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>{s.startTime} – {s.endTime}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-bold text-emerald-900">{s.course?.code}</span>
                          <div className="text-slate-600">{s.course?.title}</div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
                            {s.sessionType}
                          </span>
                        </td>
                        <td className="py-3 px-4">{s.lecturer?.name || 'TBA'}</td>
                        <td className="py-3 px-4">
                          {s.venue}{s.room ? ` (${s.room})` : ''}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => {
                              setScheduleConflicts([]);
                              setScheduleForm({
                                id: s.id,
                                courseId: s.courseId,
                                lecturerId: s.lecturerId || '',
                                semesterId: s.semesterId || '',
                                cohortId: s.cohortId || '',
                                sessionType: s.sessionType || 'LECTURE',
                                dayOfWeek: s.dayOfWeek,
                                startTime: s.startTime,
                                endTime: s.endTime,
                                venue: s.venue,
                                room: s.room || '',
                              });
                              setShowScheduleModal(true);
                            }}
                            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => deleteAcademicEntity('schedule', s.id)}
                            className="p-1.5 rounded-lg hover:bg-rose-50 text-rose-600"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {filteredSchedules.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400">
                          No timetable slots scheduled.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: RESULTS MODERATION & GRADE SCALE */}
        {activeTab === 'results' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
              {[
                { label: 'Total', val: resultsData.stats?.total || 0 },
                { label: 'Submitted', val: resultsData.stats?.submitted || 0 },
                { label: 'Approved', val: resultsData.stats?.approved || 0 },
                { label: 'Published', val: resultsData.stats?.published || 0 },
                { label: 'Returned', val: resultsData.stats?.returned || 0 },
                { label: 'Locked', val: resultsData.stats?.locked || 0 },
              ].map((st) => (
                <div key={st.label} className="bg-white rounded-xl border border-slate-200 p-3 shadow-sm">
                  <div className="text-[11px] text-slate-500">{st.label}</div>
                  <div className="text-xl font-bold text-slate-900">{st.val}</div>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-wrap items-center justify-between gap-3 shadow-sm">
              <div className="flex flex-wrap items-center gap-2 flex-1">
                <input
                  placeholder="Search student or course..."
                  value={resultFilters.search}
                  onChange={(e) => setResultFilters({ ...resultFilters, search: e.target.value })}
                  className="px-3 py-2 text-xs border border-slate-200 rounded-xl min-w-[180px]"
                />
                <select
                  value={resultFilters.programmeId}
                  onChange={(e) => setResultFilters({ ...resultFilters, programmeId: e.target.value })}
                  className="px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white"
                >
                  <option value="">All Programmes</option>
                  {academics.programmes.map((p) => (
                    <option key={p.id} value={p.id}>{p.code}</option>
                  ))}
                </select>
                <select
                  value={resultFilters.courseId}
                  onChange={(e) => setResultFilters({ ...resultFilters, courseId: e.target.value })}
                  className="px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white"
                >
                  <option value="">All Courses</option>
                  {academics.courses.map((c) => (
                    <option key={c.id} value={c.id}>{c.code}</option>
                  ))}
                </select>
                <select
                  value={resultFilters.status}
                  onChange={(e) => setResultFilters({ ...resultFilters, status: e.target.value })}
                  className="px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white"
                >
                  <option value="">All Statuses</option>
                  {['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'PUBLISHED', 'RETURNED', 'LOCKED'].map(
                    (st) => (
                      <option key={st} value={st}>{st}</option>
                    )
                  )}
                </select>
              </div>
              {selectedResultIds.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => handleResultsAction('approve', selectedResultIds)}
                    className="px-3 py-1.5 rounded-lg bg-teal-600 text-white text-xs font-semibold"
                  >
                    Approve ({selectedResultIds.length})
                  </button>
                  <button
                    onClick={() => handleResultsAction('publish', selectedResultIds)}
                    className="px-3 py-1.5 rounded-lg bg-[#073832] text-white text-xs font-semibold"
                  >
                    Publish ({selectedResultIds.length})
                  </button>
                  <button
                    onClick={() => setReturnModal({ ids: selectedResultIds, remarks: '' })}
                    className="px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-semibold"
                  >
                    Return
                  </button>
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase">
                    <tr>
                      <th className="py-3 px-3">
                        <input
                          type="checkbox"
                          checked={
                            resultsData.results.length > 0 &&
                            selectedResultIds.length === resultsData.results.length
                          }
                          onChange={(e) =>
                            setSelectedResultIds(
                              e.target.checked ? resultsData.results.map((r) => r.id) : []
                            )
                          }
                        />
                      </th>
                      <th className="py-3 px-3">Student</th>
                      <th className="py-3 px-3">Course</th>
                      <th className="py-3 px-3">CA / Exam / Total</th>
                      <th className="py-3 px-3">Grade</th>
                      <th className="py-3 px-3">Status</th>
                      <th className="py-3 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {resultsData.results.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50/70">
                        <td className="py-3 px-3">
                          <input
                            type="checkbox"
                            checked={selectedResultIds.includes(r.id)}
                            onChange={(e) =>
                              setSelectedResultIds(
                                e.target.checked
                                  ? [...selectedResultIds, r.id]
                                  : selectedResultIds.filter((id) => id !== r.id)
                              )
                            }
                          />
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-semibold">{r.student?.user?.name}</div>
                          <div className="text-slate-500">{r.student?.studentId}</div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-semibold">{r.course?.code}</div>
                          <div className="text-slate-500">{r.semester} ({r.academicYear})</div>
                        </td>
                        <td className="py-3 px-3">
                          {r.caScore} + {r.examScore} = <strong>{r.totalScore}</strong>
                        </td>
                        <td className="py-3 px-3 font-bold">
                          {r.grade} ({r.gpaPoint.toFixed(1)})
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-full border text-[11px] font-semibold ${
                              STATUS_BADGE[r.status] || STATUS_BADGE.DRAFT
                            }`}
                          >
                            {r.status}
                          </span>
                          {r.remarks && (
                            <div className="text-[11px] text-amber-700 mt-0.5">{r.remarks}</div>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="inline-flex items-center gap-1">
                            {r.status !== 'LOCKED' && (
                              <>
                                <button
                                  onClick={() => handleResultsAction('approve', [r.id])}
                                  className="p-1.5 rounded bg-teal-50 text-teal-700 hover:bg-teal-100"
                                  title="Approve"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => setReturnModal({ ids: [r.id], remarks: '' })}
                                  className="p-1.5 rounded bg-amber-50 text-amber-700 hover:bg-amber-100"
                                  title="Return with Remarks"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleResultsAction('publish', [r.id])}
                                  className="p-1.5 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                  title="Publish"
                                >
                                  <Send className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleResultsAction('lock', [r.id])}
                                  className="p-1.5 rounded bg-slate-100 text-slate-700 hover:bg-slate-200"
                                  title="Lock"
                                >
                                  <Lock className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                            {r.status === 'LOCKED' && (
                              <button
                                onClick={() => handleResultsAction('reopen', [r.id])}
                                className="px-2 py-1 rounded bg-slate-800 text-white text-[11px] flex items-center gap-1"
                              >
                                <Unlock className="w-3 h-3" />
                                <span>Reopen</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {resultsData.results.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-400">
                          No assessment records match the selected filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Grade Scale Editor */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
              <h3 className="font-bold text-sm text-slate-900">Grade Scale Configuration</h3>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  await saveAcademicEntity('gradeScale', gradeForm.id, gradeForm, () =>
                    setGradeForm({
                      id: '',
                      name: 'Standard Ghana 4.0',
                      minScore: '',
                      maxScore: '',
                      gradeLetter: '',
                      gradePoint: '',
                      remark: '',
                      isDefault: true,
                    })
                  );
                }}
                className="grid grid-cols-2 sm:grid-cols-6 gap-2"
              >
                <input
                  required
                  placeholder="Letter (A)"
                  value={gradeForm.gradeLetter}
                  onChange={(e) => setGradeForm({ ...gradeForm, gradeLetter: e.target.value })}
                  className="px-3 py-2 text-xs border border-slate-200 rounded-xl"
                />
                <input
                  required
                  type="number"
                  step="0.01"
                  placeholder="Min Score"
                  value={gradeForm.minScore}
                  onChange={(e) => setGradeForm({ ...gradeForm, minScore: e.target.value })}
                  className="px-3 py-2 text-xs border border-slate-200 rounded-xl"
                />
                <input
                  required
                  type="number"
                  step="0.01"
                  placeholder="Max Score"
                  value={gradeForm.maxScore}
                  onChange={(e) => setGradeForm({ ...gradeForm, maxScore: e.target.value })}
                  className="px-3 py-2 text-xs border border-slate-200 rounded-xl"
                />
                <input
                  required
                  type="number"
                  step="0.1"
                  placeholder="GPA Point"
                  value={gradeForm.gradePoint}
                  onChange={(e) => setGradeForm({ ...gradeForm, gradePoint: e.target.value })}
                  className="px-3 py-2 text-xs border border-slate-200 rounded-xl"
                />
                <input
                  placeholder="Remark (Distinction)"
                  value={gradeForm.remark}
                  onChange={(e) => setGradeForm({ ...gradeForm, remark: e.target.value })}
                  className="px-3 py-2 text-xs border border-slate-200 rounded-xl"
                />
                <button className="px-3 py-2 bg-[#073832] text-white rounded-xl text-xs font-semibold">
                  {gradeForm.id ? 'Update Band' : 'Add Band'}
                </button>
              </form>
              <div className="flex flex-wrap gap-2 text-xs">
                {academics.gradeScales.map((g) => (
                  <div
                    key={g.id}
                    className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-2"
                  >
                    <span className="font-bold text-emerald-900">{g.gradeLetter}</span>
                    <span>{g.minScore}–{g.maxScore}%</span>
                    <span className="text-slate-500">({g.gradePoint} GP)</span>
                    <button
                      onClick={() => deleteAcademicEntity('gradeScale', g.id)}
                      className="text-rose-500 hover:text-rose-700"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: ACADEMIC ANALYTICS */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-wrap items-center justify-between gap-3 shadow-sm">
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={analyticsFilters.academicYearId}
                  onChange={(e) =>
                    setAnalyticsFilters({ ...analyticsFilters, academicYearId: e.target.value })
                  }
                  className="px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white"
                >
                  <option value="">All Academic Years</option>
                  {academics.academicYears.map((y) => (
                    <option key={y.id} value={y.id}>{y.name}</option>
                  ))}
                </select>
                <select
                  value={analyticsFilters.semesterId}
                  onChange={(e) =>
                    setAnalyticsFilters({ ...analyticsFilters, semesterId: e.target.value })
                  }
                  className="px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white"
                >
                  <option value="">All Semesters</option>
                  {academics.semesters.map((s) => (
                    <option key={s.id} value={s.id}>{s.academicYear?.name} - {s.name}</option>
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
                  {academics.programmes.map((p) => (
                    <option key={p.id} value={p.id}>{p.code} - {p.name}</option>
                  ))}
                </select>
                <select
                  value={analyticsFilters.departmentId}
                  onChange={(e) =>
                    setAnalyticsFilters({ ...analyticsFilters, departmentId: e.target.value })
                  }
                  className="px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white"
                >
                  <option value="">All Departments</option>
                  {academics.departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => exportAnalyticsCsv('at-risk')}
                  className="px-3 py-2 rounded-xl bg-[#073832] text-white text-xs font-semibold flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export At-Risk CSV</span>
                </button>
                <button
                  onClick={() => exportAnalyticsCsv('lecturers')}
                  className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Load CSV</span>
                </button>
              </div>
            </div>

            {analytics && (
              <>
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                  {[
                    {
                      label: 'Active Enrolment',
                      value: `${analytics.summary.activeStudents} / ${analytics.summary.totalStudents}`,
                      sub: `${analytics.summary.totalEnrollments} course enrollments`,
                    },
                    {
                      label: 'Attendance Rate',
                      value: `${analytics.summary.attendanceRate}%`,
                      sub: `${analytics.summary.totalAttendanceSessions} sessions`,
                    },
                    {
                      label: 'Assignment Submission',
                      value: `${analytics.summary.assignmentSubmissionRate}%`,
                      sub: `${analytics.summary.totalSubmissions} submissions`,
                    },
                    {
                      label: 'Course Pass Rate',
                      value: `${analytics.summary.passRate}%`,
                      sub: `Avg score: ${analytics.summary.averageScore}%`,
                    },
                    {
                      label: 'At-Risk Students',
                      value: analytics.summary.atRiskCount,
                      sub: 'Low attendance / GPA / fails',
                    },
                  ].map((kpi) => (
                    <div
                      key={kpi.label}
                      className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm"
                    >
                      <div className="text-xs text-slate-500">{kpi.label}</div>
                      <div className="text-2xl font-bold text-slate-900 mt-1">{kpi.value}</div>
                      <div className="text-[11px] text-slate-400 mt-1">{kpi.sub}</div>
                    </div>
                  ))}
                </div>

                {/* Lecturer Teaching Load */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
                  <h3 className="font-bold text-sm text-slate-900">Lecturer Teaching Load</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase">
                        <tr>
                          <th className="py-2.5 px-3">Lecturer</th>
                          <th className="py-2.5 px-3">Department</th>
                          <th className="py-2.5 px-3">Courses</th>
                          <th className="py-2.5 px-3">Credit Hours</th>
                          <th className="py-2.5 px-3">Scheduled Sessions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {(analytics.lecturerTeachingLoad || []).map((l: any) => (
                          <tr key={l.id}>
                            <td className="py-2.5 px-3 font-medium">
                              {l.name} <span className="text-slate-400">({l.staffId || 'N/A'})</span>
                            </td>
                            <td className="py-2.5 px-3">{l.department}</td>
                            <td className="py-2.5 px-3">{l.assignedCoursesCount}</td>
                            <td className="py-2.5 px-3 font-semibold">{l.totalCreditHours}</td>
                            <td className="py-2.5 px-3">{l.scheduledSessionsCount}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* At-Risk Students */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
                  <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-rose-600" />
                    <span>At-Risk Students</span>
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase">
                        <tr>
                          <th className="py-2.5 px-3">Student</th>
                          <th className="py-2.5 px-3">Programme &amp; Level</th>
                          <th className="py-2.5 px-3">CGPA</th>
                          <th className="py-2.5 px-3">Attendance</th>
                          <th className="py-2.5 px-3">Risk Level &amp; Reasons</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {(analytics.atRiskStudents || []).map((st: any) => (
                          <tr key={st.studentId}>
                            <td className="py-2.5 px-3">
                              <div className="font-semibold">{st.name}</div>
                              <div className="text-slate-500">{st.studentCode}</div>
                            </td>
                            <td className="py-2.5 px-3">
                              {st.programmeCode} • {st.level}
                            </td>
                            <td className="py-2.5 px-3 font-semibold">{st.cgpa.toFixed(2)}</td>
                            <td className="py-2.5 px-3">
                              {st.attendanceRate !== null ? `${st.attendanceRate}%` : 'N/A'}
                            </td>
                            <td className="py-2.5 px-3">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold mr-2 ${
                                  st.riskLevel === 'HIGH'
                                    ? 'bg-rose-100 text-rose-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {st.riskLevel}
                              </span>
                              <span className="text-slate-600">{st.riskReasons.join(', ')}</span>
                            </td>
                          </tr>
                        ))}
                        {(analytics.atRiskStudents || []).length === 0 && (
                          <tr>
                            <td colSpan={5} className="py-6 text-center text-slate-400">
                              No at-risk students flagged for the current filters.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </main>

      {/* MODAL: ADD / EDIT LECTURER */}
      {showLecturerModal && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base">
                {editingLecturer ? 'Edit Lecturer Profile' : 'Add New Lecturer'}
              </h3>
              <button onClick={() => setShowLecturerModal(false)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <form onSubmit={handleSaveLecturer} className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  required
                  placeholder="Full Name"
                  value={lecturerForm.name}
                  onChange={(e) => setLecturerForm({ ...lecturerForm, name: e.target.value })}
                  className="px-3 py-2 border border-slate-200 rounded-xl"
                />
                <input
                  required
                  type="email"
                  placeholder="Email Address"
                  value={lecturerForm.email}
                  onChange={(e) => setLecturerForm({ ...lecturerForm, email: e.target.value })}
                  className="px-3 py-2 border border-slate-200 rounded-xl"
                />
                <input
                  placeholder="Title (e.g. Dr., Nurse)"
                  value={lecturerForm.title}
                  onChange={(e) => setLecturerForm({ ...lecturerForm, title: e.target.value })}
                  className="px-3 py-2 border border-slate-200 rounded-xl"
                />
                <input
                  placeholder="Phone"
                  value={lecturerForm.phone}
                  onChange={(e) => setLecturerForm({ ...lecturerForm, phone: e.target.value })}
                  className="px-3 py-2 border border-slate-200 rounded-xl"
                />
                <select
                  value={lecturerForm.departmentId}
                  onChange={(e) =>
                    setLecturerForm({ ...lecturerForm, departmentId: e.target.value })
                  }
                  className="px-3 py-2 border border-slate-200 rounded-xl bg-white"
                >
                  <option value="">Select Department</option>
                  {academics.departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
                <input
                  placeholder="Staff ID (leave blank to auto-generate)"
                  value={lecturerForm.staffId}
                  onChange={(e) => setLecturerForm({ ...lecturerForm, staffId: e.target.value })}
                  className="px-3 py-2 border border-slate-200 rounded-xl"
                />
                {!editingLecturer && (
                  <>
                    <input
                      placeholder="Staff ID Format (WLS-LEC-{YYYY}-{XXX})"
                      value={lecturerForm.staffIdFormat}
                      onChange={(e) =>
                        setLecturerForm({ ...lecturerForm, staffIdFormat: e.target.value })
                      }
                      className="px-3 py-2 border border-slate-200 rounded-xl"
                    />
                    <input
                      type="password"
                      placeholder="Initial Password (default: lecturer123)"
                      value={lecturerForm.password}
                      onChange={(e) =>
                        setLecturerForm({ ...lecturerForm, password: e.target.value })
                      }
                      className="px-3 py-2 border border-slate-200 rounded-xl"
                    />
                  </>
                )}
                <input
                  placeholder="Qualifications (e.g. MSc Nursing)"
                  value={lecturerForm.qualifications}
                  onChange={(e) =>
                    setLecturerForm({ ...lecturerForm, qualifications: e.target.value })
                  }
                  className="px-3 py-2 border border-slate-200 rounded-xl"
                />
                <input
                  placeholder="Specialization"
                  value={lecturerForm.specialization}
                  onChange={(e) =>
                    setLecturerForm({ ...lecturerForm, specialization: e.target.value })
                  }
                  className="px-3 py-2 border border-slate-200 rounded-xl"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowLecturerModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  disabled={busy}
                  className="px-4 py-2 rounded-xl bg-[#073832] text-white font-semibold"
                >
                  {busy ? 'Saving...' : 'Save Lecturer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ASSIGN COURSE TO LECTURER */}
      {assignModalLecturer && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base">
                Assign Course to {assignModalLecturer.name}
              </h3>
              <button onClick={() => setAssignModalLecturer(null)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <form onSubmit={handleAssignCourse} className="space-y-3 text-xs">
              <select
                required
                value={assignForm.courseId}
                onChange={(e) => setAssignForm({ ...assignForm, courseId: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white"
              >
                <option value="">Select Course</option>
                {academics.courses.map((c) => (
                  <option key={c.id} value={c.id}>{c.code} — {c.title}</option>
                ))}
              </select>
              <select
                value={assignForm.semesterId}
                onChange={(e) => setAssignForm({ ...assignForm, semesterId: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white"
              >
                <option value="">Select Semester (optional)</option>
                {academics.semesters.map((s) => (
                  <option key={s.id} value={s.id}>{s.academicYear?.name} — {s.name}</option>
                ))}
              </select>
              <select
                value={assignForm.cohortId}
                onChange={(e) => setAssignForm({ ...assignForm, cohortId: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white"
              >
                <option value="">Select Cohort (optional)</option>
                {academics.cohorts.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <select
                value={assignForm.role}
                onChange={(e) => setAssignForm({ ...assignForm, role: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white"
              >
                <option value="PRIMARY">PRIMARY</option>
                <option value="CO_LECTURER">CO_LECTURER</option>
                <option value="CLINICAL_INSTRUCTOR">CLINICAL_INSTRUCTOR</option>
              </select>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAssignModalLecturer(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  disabled={busy}
                  className="px-4 py-2 rounded-xl bg-[#073832] text-white font-semibold"
                >
                  Assign Course
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: RESET LECTURER PASSWORD */}
      {resetPwModal && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-xl">
            <h3 className="font-bold text-base">Reset Password: {resetPwModal.name}</h3>
            <form onSubmit={handleResetPassword} className="space-y-3 text-xs">
              <input
                type="password"
                placeholder="New Password (default: lecturer123)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setResetPwModal(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  disabled={busy}
                  className="px-4 py-2 rounded-xl bg-[#073832] text-white font-semibold"
                >
                  Reset Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT COURSE */}
      {showCourseModal && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base">
                {courseForm.id ? 'Edit Course' : 'Create Course'}
              </h3>
              <button onClick={() => setShowCourseModal(false)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                await saveAcademicEntity('course', courseForm.id, courseForm, () =>
                  setShowCourseModal(false)
                );
              }}
              className="space-y-3 text-xs"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  required
                  placeholder="Course Code (e.g. NUR101)"
                  value={courseForm.code}
                  onChange={(e) => setCourseForm({ ...courseForm, code: e.target.value })}
                  className="px-3 py-2 border border-slate-200 rounded-xl"
                />
                <input
                  required
                  placeholder="Course Title"
                  value={courseForm.title}
                  onChange={(e) => setCourseForm({ ...courseForm, title: e.target.value })}
                  className="px-3 py-2 border border-slate-200 rounded-xl"
                />
                <select
                  required
                  value={courseForm.programmeId}
                  onChange={(e) => setCourseForm({ ...courseForm, programmeId: e.target.value })}
                  className="px-3 py-2 border border-slate-200 rounded-xl bg-white"
                >
                  <option value="">Select Programme</option>
                  {academics.programmes.map((p) => (
                    <option key={p.id} value={p.id}>{p.code} - {p.name}</option>
                  ))}
                </select>
                <select
                  value={courseForm.departmentId}
                  onChange={(e) => setCourseForm({ ...courseForm, departmentId: e.target.value })}
                  className="px-3 py-2 border border-slate-200 rounded-xl bg-white"
                >
                  <option value="">Select Department</option>
                  {academics.departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
                <input
                  type="number"
                  placeholder="Credit Hours"
                  value={courseForm.creditHours}
                  onChange={(e) => setCourseForm({ ...courseForm, creditHours: e.target.value })}
                  className="px-3 py-2 border border-slate-200 rounded-xl"
                />
                <input
                  type="number"
                  placeholder="Max Capacity (optional)"
                  value={courseForm.maxCapacity}
                  onChange={(e) => setCourseForm({ ...courseForm, maxCapacity: e.target.value })}
                  className="px-3 py-2 border border-slate-200 rounded-xl"
                />
                <select
                  value={courseForm.level}
                  onChange={(e) => setCourseForm({ ...courseForm, level: e.target.value })}
                  className="px-3 py-2 border border-slate-200 rounded-xl bg-white"
                >
                  {['Level 100', 'Level 200', 'Level 300', 'Level 400'].map((lvl) => (
                    <option key={lvl} value={lvl}>{lvl}</option>
                  ))}
                </select>
                <select
                  value={courseForm.status}
                  onChange={(e) => setCourseForm({ ...courseForm, status: e.target.value })}
                  className="px-3 py-2 border border-slate-200 rounded-xl bg-white"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="ARCHIVED">ARCHIVED</option>
                </select>
              </div>
              <textarea
                placeholder="Course description"
                value={courseForm.description}
                onChange={(e) => setCourseForm({ ...courseForm, description: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                rows={2}
              />
              <div>
                <div className="font-semibold mb-1 text-slate-700">Prerequisites</div>
                <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-2 border border-slate-200 rounded-xl">
                  {academics.courses
                    .filter((c) => c.id !== courseForm.id)
                    .map((c) => {
                      const checked = courseForm.prerequisiteCourseIds.includes(c.id);
                      return (
                        <label
                          key={c.id}
                          className={`px-2 py-1 rounded-lg border cursor-pointer flex items-center gap-1 ${
                            checked
                              ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                              : 'bg-slate-50 border-slate-200'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) =>
                              setCourseForm({
                                ...courseForm,
                                prerequisiteCourseIds: e.target.checked
                                  ? [...courseForm.prerequisiteCourseIds, c.id]
                                  : courseForm.prerequisiteCourseIds.filter((id) => id !== c.id),
                              })
                            }
                          />
                          <span>{c.code}</span>
                        </label>
                      );
                    })}
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCourseModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  disabled={busy}
                  className="px-4 py-2 rounded-xl bg-[#073832] text-white font-semibold"
                >
                  Save Course
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT SCHEDULE WITH CONFLICT DETECTION */}
      {showScheduleModal && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base">
                {scheduleForm.id ? 'Edit Timetable Slot' : 'Add Timetable Slot'}
              </h3>
              <button onClick={() => setShowScheduleModal(false)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {scheduleConflicts.length > 0 && (
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-800 space-y-1.5">
                <div className="font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Timetable Conflict Detected (409)</span>
                </div>
                {scheduleConflicts.map((c, idx) => (
                  <div key={idx}>
                    • <strong>{c.type}</strong>: {c.courseCode} ({c.dayOfWeek} {c.startTime}–{c.endTime} at {c.venue})
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => handleSaveSchedule(true)}
                  className="mt-1 px-3 py-1.5 rounded-lg bg-rose-700 text-white font-semibold"
                >
                  Override Conflict &amp; Save Anyway
                </button>
              </div>
            )}

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                await handleSaveSchedule(false);
              }}
              className="space-y-3 text-xs"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <select
                  required
                  value={scheduleForm.courseId}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, courseId: e.target.value })}
                  className="px-3 py-2 border border-slate-200 rounded-xl bg-white"
                >
                  <option value="">Select Course</option>
                  {academics.courses.map((c) => (
                    <option key={c.id} value={c.id}>{c.code} — {c.title}</option>
                  ))}
                </select>
                <select
                  value={scheduleForm.lecturerId}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, lecturerId: e.target.value })}
                  className="px-3 py-2 border border-slate-200 rounded-xl bg-white"
                >
                  <option value="">Select Lecturer</option>
                  {lecturers.map((l) => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
                <select
                  value={scheduleForm.dayOfWeek}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, dayOfWeek: e.target.value })}
                  className="px-3 py-2 border border-slate-200 rounded-xl bg-white"
                >
                  {DAYS_OF_WEEK.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
                <select
                  value={scheduleForm.sessionType}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, sessionType: e.target.value })}
                  className="px-3 py-2 border border-slate-200 rounded-xl bg-white"
                >
                  {['LECTURE', 'LAB', 'CLINICAL', 'TUTORIAL'].map((st) => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>
                <input
                  required
                  placeholder="Start Time (e.g. 08:00 AM)"
                  value={scheduleForm.startTime}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, startTime: e.target.value })}
                  className="px-3 py-2 border border-slate-200 rounded-xl"
                />
                <input
                  required
                  placeholder="End Time (e.g. 10:00 AM)"
                  value={scheduleForm.endTime}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, endTime: e.target.value })}
                  className="px-3 py-2 border border-slate-200 rounded-xl"
                />
                <input
                  required
                  placeholder="Venue (e.g. Lecture Hall 1)"
                  value={scheduleForm.venue}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, venue: e.target.value })}
                  className="px-3 py-2 border border-slate-200 rounded-xl"
                />
                <input
                  placeholder="Room (optional)"
                  value={scheduleForm.room}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, room: e.target.value })}
                  className="px-3 py-2 border border-slate-200 rounded-xl"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowScheduleModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  disabled={busy}
                  className="px-4 py-2 rounded-xl bg-[#073832] text-white font-semibold"
                >
                  Save Slot
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: RETURN RESULTS WITH REMARKS */}
      {returnModal && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="font-bold text-base">Return Results to Lecturer</h3>
            <textarea
              required
              rows={3}
              placeholder="Enter moderation remarks explaining what needs correction..."
              value={returnModal.remarks}
              onChange={(e) => setReturnModal({ ...returnModal, remarks: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl"
            />
            <div className="flex justify-end gap-2 text-xs">
              <button
                onClick={() => setReturnModal(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-semibold"
              >
                Cancel
              </button>
              <button
                disabled={busy || !returnModal.remarks.trim()}
                onClick={() =>
                  handleResultsAction('return', returnModal.ids, returnModal.remarks)
                }
                className="px-4 py-2 rounded-xl bg-amber-600 text-white font-semibold disabled:opacity-50"
              >
                Return Results
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
