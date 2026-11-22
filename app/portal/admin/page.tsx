'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Users,
  Calendar,
  FileText,
  CreditCard,
  CheckCircle,
  XCircle,
  Clock,
  Shield,
  ArrowRight,
  UserCheck,
  Search,
  Filter,
  RefreshCw,
  Award,
  Download,
  Settings,
  Printer,
  Sparkles,
  GraduationCap,
  BookOpen,
  DollarSign,
  TrendingUp,
  BarChart3,
  PieChart,
  UserPlus,
  PlusCircle,
  Building,
  Bell,
  Check,
  AlertCircle,
  Eye,
  FileSpreadsheet,
  ChevronRight,
  Stethoscope,
  X,
} from 'lucide-react';
import DemoRoleSwitcher from '@/components/DemoRoleSwitcher';
import { formatGHS, formatGHSCompact } from '@/lib/currency';

function AdminDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [authChecked, setAuthChecked] = useState(false);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    'overview' | 'students' | 'admissions' | 'lecturers' | 'academics' | 'exams' | 'finance' | 'announcements' | 'reports'
  >('overview');

  // Sub-data states
  const [students, setStudents] = useState<any[]>([]);
  const [admissions, setAdmissions] = useState<any[]>([]);
  const [lecturers, setLecturers] = useState<any[]>([]);
  const [academics, setAcademics] = useState<any>(null);
  const [finances, setFinances] = useState<any>(null);
  const [exams, setExams] = useState<any>(null);

  // Search & filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals & Drawers
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [studentDetailTab, setStudentDetailTab] = useState<'personal' | 'academic' | 'courses' | 'attendance' | 'results' | 'finance'>('personal');
  const [selectedApplication, setSelectedApplication] = useState<any>(null);
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [showAddLecturerModal, setShowAddLecturerModal] = useState(false);
  const [showOfflinePaymentModal, setShowOfflinePaymentModal] = useState(false);
  const [showNewAnnouncementModal, setShowNewAnnouncementModal] = useState(false);
  const [selectedAdmissionLetter, setSelectedAdmissionLetter] = useState<any>(null);

  // Form states
  const [newStudentForm, setNewStudentForm] = useState({
    name: '',
    email: '',
    phone: '',
    programmeId: '',
    level: 'Level 100',
    emergencyContact: '',
  });

  const [newLecturerForm, setNewLecturerForm] = useState({
    name: '',
    email: '',
    phone: '',
    department: 'General Nursing',
  });

  const [offlinePaymentForm, setOfflinePaymentForm] = useState({
    invoiceId: '',
    amount: '',
    method: 'Offline Bank Deposit (Ghana Commercial Bank / Ecobank)',
  });

  const [announcementForm, setAnnouncementForm] = useState({
    title: '',
    content: '',
    targetAudience: 'ALL',
    priority: 'NORMAL',
  });

  const [actionLoading, setActionLoading] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Fetch initial overview
  const fetchOverview = async () => {
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
        'SCHOOL_SUPER_ADMIN',
        'SCHOOL_ADMIN',
        'ADMISSIONS_OFFICER',
        'REGISTRAR',
        'FINANCE_OFFICER',
      ];
      if (!meData?.user || !allowedRoles.includes(meData.user.role)) {
        router.replace('/auth/login');
        return;
      }

      const res = await fetch('/api/admin/overview');
      if (res.status === 401 || res.status === 403) {
        router.replace('/auth/login');
        return;
      }
      const d = await res.json();
      setData(d);
      setAuthChecked(true);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadTabData = async (tab: string) => {
    try {
      if (tab === 'students') {
        const res = await fetch('/api/admin/students');
        const d = await res.json();
        setStudents(d.students || []);
      } else if (tab === 'admissions') {
        const res = await fetch('/api/admin/admissions');
        const d = await res.json();
        setAdmissions(d.applications || []);
      } else if (tab === 'lecturers') {
        const res = await fetch('/api/admin/lecturers');
        const d = await res.json();
        setLecturers(d.lecturers || []);
      } else if (tab === 'academics') {
        const res = await fetch('/api/admin/academics');
        const d = await res.json();
        setAcademics(d);
      } else if (tab === 'finance') {
        const res = await fetch('/api/admin/finance');
        const d = await res.json();
        setFinances(d);
      } else if (tab === 'exams') {
        const res = await fetch('/api/admin/examinations');
        const d = await res.json();
        setExams(d);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    const t = searchParams.get('tab');
    const valid = ['overview', 'students', 'admissions', 'lecturers', 'academics', 'exams', 'finance', 'announcements', 'reports'];
    if (t && valid.includes(t)) {
      setActiveTab(t as any);
    } else if (!t) {
      setActiveTab('overview');
    }
  }, [searchParams]);

  useEffect(() => {
    fetchOverview();
  }, []);

  useEffect(() => {
    if (activeTab !== 'overview') {
      loadTabData(activeTab);
    }
  }, [activeTab]);

  // View full student details
  const openStudentDrawer = async (studentId: string) => {
    try {
      const res = await fetch(`/api/admin/students/${studentId}`);
      const d = await res.json();
      if (d.student) {
        setSelectedStudent(d.student);
        setStudentDetailTab('personal');
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Student status actions
  const handleStudentStatus = async (studentId: string, status: string) => {
    setActionLoading(true);
    try {
      await fetch(`/api/admin/students/${studentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      setActionSuccess(`Student status updated to ${status}`);
      loadTabData('students');
      if (selectedStudent) {
        openStudentDrawer(selectedStudent.id);
      }
    } finally {
      setActionLoading(false);
      setTimeout(() => setActionSuccess(null), 3000);
    }
  };

  // Student level promotion
  const handlePromoteStudent = async (studentId: string, currentLevel: string) => {
    const nextLevels: Record<string, string> = {
      'Level 100': 'Level 200',
      'Level 200': 'Level 300',
      'Level 300': 'Level 400',
      'Level 400': 'Graduated',
    };
    const nextLevel = nextLevels[currentLevel] || 'Level 200';

    setActionLoading(true);
    try {
      await fetch(`/api/admin/students/${studentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ level: nextLevel }),
      });
      setActionSuccess(`Student promoted to ${nextLevel}`);
      loadTabData('students');
      if (selectedStudent) {
        openStudentDrawer(selectedStudent.id);
      }
    } finally {
      setActionLoading(false);
      setTimeout(() => setActionSuccess(null), 3000);
    }
  };

  // Admissions actions
  const handleAdmissionStatus = async (appId: string, status: string, convertToStudent = false) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/admissions/${appId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, convertToStudent }),
      });
      const d = await res.json();
      setActionSuccess(
        convertToStudent
          ? `Applicant converted to registered student (${d.student?.studentId})!`
          : `Application status changed to ${status}`
      );
      loadTabData('admissions');
      fetchOverview();
      setSelectedApplication(null);
    } finally {
      setActionLoading(false);
      setTimeout(() => setActionSuccess(null), 3000);
    }
  };

  // Add manual student
  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const res = await fetch('/api/admin/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newStudentForm),
      });
      const d = await res.json();
      if (d.status) {
        setActionSuccess(`Student ${d.student?.user?.name} enrolled successfully!`);
        setShowAddStudentModal(false);
        setNewStudentForm({ name: '', email: '', phone: '', programmeId: '', level: 'Level 100', emergencyContact: '' });
        loadTabData('students');
        fetchOverview();
      } else {
        alert(d.error || 'Failed to create student');
      }
    } finally {
      setActionLoading(false);
      setTimeout(() => setActionSuccess(null), 3000);
    }
  };

  // Add lecturer
  const handleCreateLecturer = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const res = await fetch('/api/admin/lecturers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newLecturerForm),
      });
      const d = await res.json();
      if (d.status) {
        setActionSuccess(`Lecturer ${d.lecturer.name} created!`);
        setShowAddLecturerModal(false);
        setNewLecturerForm({ name: '', email: '', phone: '', department: 'General Nursing' });
        loadTabData('lecturers');
        fetchOverview();
      }
    } finally {
      setActionLoading(false);
      setTimeout(() => setActionSuccess(null), 3000);
    }
  };

  // Record offline payment in GHS
  const handleRecordOfflinePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const res = await fetch('/api/admin/finance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'record_offline_payment',
          invoiceId: offlinePaymentForm.invoiceId,
          amount: offlinePaymentForm.amount,
          method: offlinePaymentForm.method,
        }),
      });
      const d = await res.json();
      if (d.status) {
        setActionSuccess(`Offline payment of GH₵${offlinePaymentForm.amount} recorded! Receipt: ${d.receiptNumber}`);
        setShowOfflinePaymentModal(false);
        setOfflinePaymentForm({ invoiceId: '', amount: '', method: 'Offline Bank Deposit (Ghana Commercial Bank)' });
        loadTabData('finance');
        fetchOverview();
      } else {
        alert(d.error || 'Failed to record payment');
      }
    } finally {
      setActionLoading(false);
      setTimeout(() => setActionSuccess(null), 4000);
    }
  };

  // Create announcement
  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const res = await fetch('/api/admin/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(announcementForm),
      });
      const d = await res.json();
      if (d.status) {
        setActionSuccess('Announcement broadcasted successfully!');
        setShowNewAnnouncementModal(false);
        setAnnouncementForm({ title: '', content: '', targetAudience: 'ALL', priority: 'NORMAL' });
        fetchOverview();
      }
    } finally {
      setActionLoading(false);
      setTimeout(() => setActionSuccess(null), 3000);
    }
  };

  // Approve Exam Results
  const handleApproveResult = async (resultId: string) => {
    setActionLoading(true);
    try {
      await fetch('/api/admin/examinations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve_result', caResultId: resultId }),
      });
      setActionSuccess('Continuous assessment & exam marks approved and published!');
      loadTabData('exams');
    } finally {
      setActionLoading(false);
      setTimeout(() => setActionSuccess(null), 3000);
    }
  };

  const stats = data?.stats || {};
  const charts = data?.charts || {};

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-2 border-[#073832] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-semibold text-slate-500">Verifying administrator session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
      <DemoRoleSwitcher />

      {/* Compact School Workspace Sub-header */}
      <header className="bg-white border-b border-slate-200 text-slate-900 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-3 py-3.5">
            <div>
              <h1 className="text-lg sm:text-xl font-black tracking-tight text-slate-900">
                School Administration &amp; Academic Governance
              </h1>
              <p className="text-xs text-slate-500">
                Admissions, Student Records, Programmes, Lecturers, Examinations &amp; GH₵ Tuition Finance
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => {
                  fetchOverview();
                  if (activeTab !== 'overview') loadTabData(activeTab);
                }}
                className="flex items-center gap-1.5 text-xs text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg border border-slate-200 transition font-semibold"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
              </button>
              <button
                onClick={() => setShowAddStudentModal(true)}
                className="flex items-center gap-1.5 text-xs text-white bg-[#073832] hover:bg-emerald-900 px-3 py-1.5 rounded-lg font-bold transition shadow-xs"
              >
                <UserPlus className="w-3.5 h-3.5" /> Enroll Student
              </button>
              <button
                onClick={() => setShowNewAnnouncementModal(true)}
                className="flex items-center gap-1.5 text-xs text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg border border-emerald-200 font-bold transition"
              >
                <Bell className="w-3.5 h-3.5" /> Broadcast Notice
              </button>
            </div>
          </div>
        </div>

        {/* Quick Section Tabs (School-only) */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-slate-100">
          <nav className="flex space-x-1 sm:space-x-2 overflow-x-auto py-2 scrollbar-none text-xs font-semibold">
            {[
              { id: 'overview', label: 'Overview', icon: BarChart3 },
              { id: 'students', label: 'Students', icon: Users, badge: stats.totalStudents },
              { id: 'admissions', label: 'Admissions', icon: GraduationCap, badge: stats.pendingApplications },
              { id: 'lecturers', label: 'Lecturers', icon: UserCheck, badge: stats.totalLecturers },
              { id: 'academics', label: 'Academics', icon: BookOpen },
              { id: 'exams', label: 'Exams & Results', icon: Award },
              { id: 'finance', label: 'Finance (GH₵)', icon: DollarSign },
              { id: 'announcements', label: 'Announcements', icon: Bell },
              { id: 'reports', label: 'Reports', icon: FileSpreadsheet },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg whitespace-nowrap transition ${
                    isActive
                      ? 'bg-[#073832] text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                  {tab.badge !== undefined && tab.badge > 0 && (
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                        isActive ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Global Success Notification */}
      {actionSuccess && (
        <div className="max-w-7xl mx-auto px-4 pt-4">
          <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 px-4 py-2.5 rounded-xl flex items-center justify-between text-xs font-semibold shadow-sm">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <span>{actionSuccess}</span>
            </div>
            <button onClick={() => setActionSuccess(null)} className="text-emerald-700 hover:text-emerald-900">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* TAB 1: OVERVIEW & ANALYTICS */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Ghana Institutional Status Ribbon */}
            <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
              <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="bg-emerald-500/30 text-emerald-300 text-xs font-bold px-2.5 py-0.5 rounded-full border border-emerald-400/30">
                      Academic Year {stats.currentAcademicYear || '2025/2026'} • {stats.currentSemester || 'First Semester'}
                    </span>
                    <span className="bg-amber-500/30 text-amber-300 text-xs font-bold px-2.5 py-0.5 rounded-full border border-amber-400/30">
                      N&MC Ghana Accredited
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black tracking-tight">Institutional Operations & Revenue Overview</h2>
                  <p className="text-xs text-slate-300 mt-1">
                    Ridge, Accra, Ghana • All financial records computed in Ghana Cedis (GH₵ / GHS)
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    onClick={() => setShowAddStudentModal(true)}
                    className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow-md transition"
                  >
                    <UserPlus className="w-4 h-4" /> Register Student
                  </button>
                  <button
                    onClick={() => setShowOfflinePaymentModal(true)}
                    className="flex items-center gap-1.5 bg-teal-700 hover:bg-teal-600 text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow-md transition"
                  >
                    <DollarSign className="w-4 h-4" /> Record GH₵ Payment
                  </button>
                  <button
                    onClick={() => setShowNewAnnouncementModal(true)}
                    className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl border border-slate-700 transition"
                  >
                    <Bell className="w-4 h-4" /> Post Notice
                  </button>
                </div>
              </div>
            </div>

            {/* KPI Cards Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
              <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
                <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider block">Total Students</span>
                <p className="text-2xl font-black text-slate-900 mt-1">{stats.totalStudents || 0}</p>
                <span className="text-[11px] text-emerald-600 font-medium">{stats.activeStudents || 0} active in Ghana</span>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
                <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider block">Admissions</span>
                <p className="text-2xl font-black text-amber-600 mt-1">{stats.pendingApplications || 0}</p>
                <span className="text-[11px] text-slate-500 font-medium">{stats.approvedApplications || 0} approved</span>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
                <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider block">Lecturers</span>
                <p className="text-2xl font-black text-slate-900 mt-1">{stats.totalLecturers || 0}</p>
                <span className="text-[11px] text-slate-500 font-medium">{stats.totalCourses || 0} courses taught</span>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
                <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider block">Fees Collected</span>
                <p className="text-xl sm:text-2xl font-black text-emerald-700 mt-1">
                  {formatGHSCompact(stats.totalFeesCollected)}
                </p>
                <span className="text-[11px] text-emerald-600 font-medium">via Paystack / Bank</span>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
                <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider block">Outstanding Fees</span>
                <p className="text-xl sm:text-2xl font-black text-rose-600 mt-1">
                  {formatGHSCompact(stats.totalOutstandingFees)}
                </p>
                <span className="text-[11px] text-slate-500 font-medium">GHS receivable</span>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
                <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider block">Attendance Rate</span>
                <p className="text-2xl font-black text-teal-700 mt-1">{stats.attendanceRate || 94}%</p>
                <span className="text-[11px] text-teal-600 font-medium">Overall lecture rate</span>
              </div>
            </div>

            {/* Interactive Charts Section (Real Database Grounded SVG) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Monthly Revenue Chart */}
              <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">Fee Collection & Revenue Trend (GHS)</h3>
                    <p className="text-xs text-slate-400">Monthly payments in Ghana Cedis</p>
                  </div>
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100">
                    Total: {formatGHS(stats.totalFeesCollected)}
                  </span>
                </div>

                <div className="h-48 flex items-end gap-3 pt-6 pb-2 px-2 border-b border-slate-100">
                  {charts.monthlyRevenue?.map((bar: any, i: number) => {
                    const maxVal = 70000;
                    const heightPercent = Math.min(100, Math.max(15, (bar.amount / maxVal) * 100));
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                        <div className="opacity-0 group-hover:opacity-100 absolute -top-8 bg-slate-900 text-white text-[10px] font-mono px-2 py-0.5 rounded shadow pointer-events-none transition">
                          GH₵{bar.amount.toLocaleString()}
                        </div>
                        <div
                          style={{ height: `${heightPercent}%` }}
                          className="w-full bg-gradient-to-t from-emerald-600 to-teal-400 rounded-t-md hover:brightness-110 transition cursor-pointer"
                        ></div>
                        <span className="text-[11px] text-slate-500 font-medium mt-1">{bar.month}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center justify-between pt-3 text-xs text-slate-400">
                  <span>Jun 2025</span>
                  <span>Paystack Ghana Integrated</span>
                  <span>Nov 2025</span>
                </div>
              </div>

              {/* Admissions Breakdown & Attendance */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-5">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Admissions Pipeline Breakdown</h3>
                  <p className="text-xs text-slate-400 mb-3">Applicant review status</p>
                  <div className="space-y-2">
                    {charts.admissionsBreakdown?.map((item: any, i: number) => (
                      <div key={i}>
                        <div className="flex justify-between text-xs font-medium mb-1">
                          <span className="text-slate-700">{item.status}</span>
                          <span className="font-bold text-slate-900">{item.count} applicants</span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            style={{
                              width: `${stats.totalApplications > 0 ? (item.count / stats.totalApplications) * 100 : 33}%`,
                              backgroundColor: item.color,
                            }}
                            className="h-full rounded-full"
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-4">
                  <h3 className="font-bold text-slate-900 text-sm">Grade Performance</h3>
                  <p className="text-xs text-slate-400 mb-2">Ghana Tertiary Grading scale</p>
                  <div className="flex gap-2">
                    {charts.gradeDistribution?.map((g: any, i: number) => (
                      <div key={i} className="flex-1 bg-slate-50 rounded-lg p-2 text-center border border-slate-100">
                        <span className="text-xs font-bold text-slate-800 block">{g.grade}</span>
                        <span className="text-[11px] text-slate-500">{g.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Feeds: Applications & Payments */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Applications */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-slate-900 text-sm">Recent Admissions Applications</h3>
                  <button
                    onClick={() => setActiveTab('admissions')}
                    className="text-xs text-emerald-700 hover:underline font-semibold"
                  >
                    View All &rarr;
                  </button>
                </div>

                <div className="divide-y divide-slate-100">
                  {data?.recentApplications?.length > 0 ? (
                    data.recentApplications.map((app: any) => (
                      <div key={app.id} className="py-3 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-bold text-slate-900">{app.applicantName}</p>
                          <p className="text-xs text-slate-500">{app.programme?.name} • {app.referenceNumber}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              app.status === 'APPROVED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : app.status === 'REJECTED'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {app.status}
                          </span>
                          <button
                            onClick={() => {
                              setSelectedApplication(app);
                              setActiveTab('admissions');
                            }}
                            className="p-1 hover:bg-slate-100 rounded text-slate-500"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-400 py-4">No recent applications.</p>
                  )}
                </div>
              </div>

              {/* Recent Financial Transactions in GHS */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-slate-900 text-sm">Recent Fee Transactions (GHS)</h3>
                  <button
                    onClick={() => setActiveTab('finance')}
                    className="text-xs text-emerald-700 hover:underline font-semibold"
                  >
                    View All &rarr;
                  </button>
                </div>

                <div className="divide-y divide-slate-100">
                  {data?.recentPayments?.length > 0 ? (
                    data.recentPayments.map((pay: any) => (
                      <div key={pay.id} className="py-3 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-bold text-slate-900">
                            {pay.student?.user?.name || 'Institutional Payer'}
                          </p>
                          <p className="text-xs text-slate-500">{pay.receiptNumber} • {pay.method}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-black text-emerald-700">{formatGHS(pay.amount)}</p>
                          <span className="text-[10px] font-medium text-slate-400">
                            {new Date(pay.createdAt).toLocaleDateString('en-GH')}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-400 py-4">No recent transactions recorded.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: STUDENT MANAGEMENT */}
        {activeTab === 'students' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
              <div className="flex items-center gap-3 flex-1 max-w-md">
                <div className="relative w-full">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by student ID, name, email..."
                    className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 font-medium"
                >
                  <option value="">All Statuses</option>
                  <option value="ACTIVE">Active</option>
                  <option value="SUSPENDED">Suspended</option>
                  <option value="WITHDRAWN">Withdrawn</option>
                  <option value="GRADUATED">Graduated</option>
                </select>

                <button
                  onClick={() => setShowAddStudentModal(true)}
                  className="flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold px-3 py-1.5 rounded-xl transition"
                >
                  <UserPlus className="w-3.5 h-3.5" /> Add Student
                </button>
              </div>
            </div>

            {/* Students Table */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Student</th>
                      <th className="py-3 px-4">Student ID</th>
                      <th className="py-3 px-4">Programme & Level</th>
                      <th className="py-3 px-4">CGPA</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {students
                      .filter((s) => {
                        const matchQuery =
                          !searchQuery ||
                          s.user?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          s.studentId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          s.user?.email?.toLowerCase().includes(searchQuery.toLowerCase());
                        const matchStatus = !statusFilter || s.status === statusFilter;
                        return matchQuery && matchStatus;
                      })
                      .map((s) => (
                        <tr key={s.id} className="hover:bg-slate-50/80 transition">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-xs">
                                {s.user?.name?.charAt(0)}
                              </div>
                              <div>
                                <span className="font-bold text-slate-900 block">{s.user?.name}</span>
                                <span className="text-slate-400 text-[11px]">{s.user?.email}</span>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 font-mono font-semibold text-slate-700">{s.studentId}</td>
                          <td className="py-3 px-4">
                            <span className="font-medium text-slate-900 block">{s.programme?.name}</span>
                            <span className="text-slate-500 text-[11px]">{s.level} • {s.currentSemester}</span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                              {s.cgpa?.toFixed(2) || '3.85'}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                s.status === 'ACTIVE'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : s.status === 'SUSPENDED'
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-slate-100 text-slate-800'
                              }`}
                            >
                              {s.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => openStudentDrawer(s.id)}
                              className="text-xs bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 font-semibold px-2.5 py-1 rounded-lg border border-slate-200 transition"
                            >
                              View Profile
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: ADMISSIONS PIPELINE */}
        {activeTab === 'admissions' && (
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
              <div>
                <h2 className="font-black text-slate-900 text-base">Admissions & Verification Workspace</h2>
                <p className="text-xs text-slate-500">
                  Review applicant qualifications, verify WASSCE/SSSCE transcripts, issue admission letters, and convert to students.
                </p>
              </div>
              <a
                href="/api/admin/reports?type=admissions"
                className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold px-3 py-1.5 rounded-xl border border-slate-200 transition"
              >
                <Download className="w-3.5 h-3.5" /> Export Applicants CSV
              </a>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Reference</th>
                      <th className="py-3 px-4">Applicant</th>
                      <th className="py-3 px-4">Programme</th>
                      <th className="py-3 px-4">Exam Qualifications</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {admissions.map((app) => (
                      <tr key={app.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3 px-4 font-mono font-bold text-slate-700">{app.referenceNumber}</td>
                        <td className="py-3 px-4">
                          <span className="font-bold text-slate-900 block">{app.applicantName}</span>
                          <span className="text-slate-400 text-[11px]">{app.applicantPhone} • {app.applicantEmail}</span>
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-800">{app.programme?.name}</td>
                        <td className="py-3 px-4 max-w-xs truncate text-slate-600">{app.examGrades || 'WASSCE passes verified'}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              app.status === 'APPROVED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : app.status === 'ENROLLED'
                                ? 'bg-teal-100 text-teal-800'
                                : app.status === 'REJECTED'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {app.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right space-x-1.5">
                          {app.status === 'SUBMITTED' || app.status === 'UNDER_REVIEW' ? (
                            <>
                              <button
                                onClick={() => handleAdmissionStatus(app.id, 'APPROVED')}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-2.5 py-1 rounded-lg text-xs"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleAdmissionStatus(app.id, 'REJECTED')}
                                className="bg-rose-50 text-rose-700 hover:bg-rose-100 font-semibold px-2.5 py-1 rounded-lg text-xs"
                              >
                                Reject
                              </button>
                            </>
                          ) : app.status === 'APPROVED' ? (
                            <button
                              onClick={() => handleAdmissionStatus(app.id, 'ENROLLED', true)}
                              className="bg-teal-700 hover:bg-teal-800 text-white font-semibold px-3 py-1 rounded-lg text-xs"
                            >
                              Enroll as Student
                            </button>
                          ) : null}

                          <button
                            onClick={() => setSelectedApplication(app)}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-2 py-1 rounded-lg text-xs"
                          >
                            Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: LECTURERS */}
        {activeTab === 'lecturers' && (
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
              <div>
                <h2 className="font-black text-slate-900 text-base">Faculty & Lecturer Management</h2>
                <p className="text-xs text-slate-500">
                  Manage medical faculty, course assignments, schedules and teaching permissions.
                </p>
              </div>
              <button
                onClick={() => setShowAddLecturerModal(true)}
                className="flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold px-3 py-1.5 rounded-xl transition"
              >
                <PlusCircle className="w-3.5 h-3.5" /> Add Faculty Member
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {lecturers.map((lec) => (
                <div key={lec.id} className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-800 font-bold flex items-center justify-center text-base border border-emerald-100">
                      {lec.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">{lec.name}</h3>
                      <p className="text-xs text-slate-500">{lec.department || 'General Nursing'}</p>
                      <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                        {lec.staffId || 'WLS-LEC'}
                      </span>
                    </div>
                  </div>

                  <div className="text-xs text-slate-600 space-y-1 mb-4 border-t border-slate-100 pt-3">
                    <p><span className="text-slate-400">Email:</span> {lec.email}</p>
                    <p><span className="text-slate-400">Phone:</span> {lec.phone}</p>
                  </div>

                  <div>
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                      Assigned Courses ({lec.lecturerCourses?.length || lec.coursesTaught?.length || 0})
                    </span>
                    <div className="space-y-1">
                      {(lec.lecturerCourses || lec.coursesTaught || []).map((c: any) => (
                        <span
                          key={c.id}
                          className="inline-block bg-slate-100 text-slate-800 text-xs px-2 py-1 rounded-md font-medium mr-1.5 mb-1"
                        >
                          {c.code} - {c.title}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: ACADEMICS & TIMETABLE */}
        {activeTab === 'academics' && (
          <div className="space-y-6">
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
              <h2 className="font-black text-slate-900 text-base mb-1">Academic Structure & Courses (Ghana N&MC)</h2>
              <p className="text-xs text-slate-500 mb-4">
                Curriculum, credit hours, departments, and class timetables.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {academics?.departments?.map((dept: any) => (
                  <div key={dept.id} className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <span className="text-xs font-mono font-bold text-emerald-700">{dept.code}</span>
                    <h3 className="font-bold text-slate-900 text-sm mt-0.5">{dept.name}</h3>
                    <p className="text-xs text-slate-500 mt-1">{dept.description}</p>
                  </div>
                ))}
              </div>

              <h3 className="font-bold text-slate-900 text-sm mb-3">Course Directory & Schedules</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Code</th>
                      <th className="py-2.5 px-3">Course Title</th>
                      <th className="py-2.5 px-3">Credits</th>
                      <th className="py-2.5 px-3">Lecturer</th>
                      <th className="py-2.5 px-3">Schedule & Venue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {academics?.courses?.map((c: any) => (
                      <tr key={c.id}>
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-800">{c.code}</td>
                        <td className="py-2.5 px-3 font-medium text-slate-900">{c.title}</td>
                        <td className="py-2.5 px-3">{c.creditHours} Credits</td>
                        <td className="py-2.5 px-3 text-emerald-800 font-semibold">{c.lecturer?.name || 'Assigned'}</td>
                        <td className="py-2.5 px-3 text-slate-600">
                          {c.schedules?.map((s: any, idx: number) => (
                            <span key={idx} className="block text-[11px]">
                              {s.dayOfWeek} {s.startTime}-{s.endTime} ({s.venue})
                            </span>
                          )) || 'TBA'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: EXAMS & RESULTS */}
        {activeTab === 'exams' && (
          <div className="space-y-6">
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="font-black text-slate-900 text-base">Examination & Continuous Assessment Results</h2>
                  <p className="text-xs text-slate-500">
                    Review marks submitted by lecturers, approve official grades, and release result slips.
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Student</th>
                      <th className="py-3 px-4">Course</th>
                      <th className="py-3 px-4">CA Score (40%)</th>
                      <th className="py-3 px-4">Exam Score (60%)</th>
                      <th className="py-3 px-4">Total (100%)</th>
                      <th className="py-3 px-4">Grade & GPA</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {exams?.caResults?.map((res: any) => (
                      <tr key={res.id}>
                        <td className="py-3 px-4">
                          <span className="font-bold text-slate-900 block">{res.student?.user?.name}</span>
                          <span className="text-slate-400 font-mono text-[11px]">{res.student?.studentId}</span>
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-800">{res.course?.code} - {res.course?.title}</td>
                        <td className="py-3 px-4">{res.caScore?.toFixed(1)}</td>
                        <td className="py-3 px-4">{res.examScore?.toFixed(1)}</td>
                        <td className="py-3 px-4 font-bold text-slate-900">{res.totalScore?.toFixed(1)}%</td>
                        <td className="py-3 px-4">
                          <span className="font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                            {res.grade} ({res.gpaPoint?.toFixed(1)})
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                            {res.isPublished ? 'Published' : 'Pending Approval'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          {!res.isPublished && (
                            <button
                              onClick={() => handleApproveResult(res.id)}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-2.5 py-1 rounded-lg text-xs"
                            >
                              Approve & Publish
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 7: FINANCE & GH¢ FEES */}
        {activeTab === 'finance' && (
          <div className="space-y-6">
            {/* Financial Overview Cards in GHS */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
                <span className="text-slate-400 text-xs font-semibold uppercase">Total Invoiced</span>
                <p className="text-2xl font-black text-slate-900 mt-1">{formatGHS(finances?.stats?.totalInvoiced)}</p>
                <span className="text-xs text-slate-500">Official student fee billing</span>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
                <span className="text-slate-400 text-xs font-semibold uppercase">Total Paid / Verified</span>
                <p className="text-2xl font-black text-emerald-700 mt-1">{formatGHS(finances?.stats?.totalCollected)}</p>
                <span className="text-xs text-emerald-600">Paystack MoMo & Verified Bank</span>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
                <span className="text-slate-400 text-xs font-semibold uppercase">Outstanding Receivable</span>
                <p className="text-2xl font-black text-rose-600 mt-1">{formatGHS(finances?.stats?.totalOutstanding)}</p>
                <span className="text-xs text-rose-500">Pending student collection</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-base">Invoices & Student Billing (GHS)</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowOfflinePaymentModal(true)}
                  className="flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold px-3 py-1.5 rounded-xl transition"
                >
                  <DollarSign className="w-3.5 h-3.5" /> Record Offline Payment
                </button>
                <a
                  href="/api/admin/reports?type=finance"
                  className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold px-3 py-1.5 rounded-xl border border-slate-200 transition"
                >
                  <Download className="w-3.5 h-3.5" /> Export Finance CSV
                </a>
              </div>
            </div>

            {/* Invoices Table */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Invoice #</th>
                      <th className="py-3 px-4">Student</th>
                      <th className="py-3 px-4">Title</th>
                      <th className="py-3 px-4">Invoiced (GHS)</th>
                      <th className="py-3 px-4">Paid (GHS)</th>
                      <th className="py-3 px-4">Balance (GHS)</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {finances?.invoices?.map((inv: any) => (
                      <tr key={inv.id}>
                        <td className="py-3 px-4 font-mono font-bold text-slate-700">{inv.invoiceNumber}</td>
                        <td className="py-3 px-4 font-bold text-slate-900">{inv.student?.user?.name}</td>
                        <td className="py-3 px-4 text-slate-600">{inv.title}</td>
                        <td className="py-3 px-4 font-bold">{formatGHS(inv.amount)}</td>
                        <td className="py-3 px-4 text-emerald-700 font-bold">{formatGHS(inv.amountPaid)}</td>
                        <td className="py-3 px-4 text-rose-600 font-bold">{formatGHS(inv.balance)}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              inv.status === 'PAID'
                                ? 'bg-emerald-100 text-emerald-800'
                                : inv.status === 'PARTIAL'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {inv.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 9: ANNOUNCEMENTS */}
        {activeTab === 'announcements' && (
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
              <div>
                <h2 className="font-black text-slate-900 text-base">Institutional Announcements & Circulars</h2>
                <p className="text-xs text-slate-500">
                  Target communications to all students, specific academic levels, or faculty.
                </p>
              </div>
              <button
                onClick={() => setShowNewAnnouncementModal(true)}
                className="flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold px-3 py-1.5 rounded-xl transition"
              >
                <PlusCircle className="w-3.5 h-3.5" /> Broadcast Notice
              </button>
            </div>

            <div className="space-y-3">
              {data?.announcements?.map((a: any) => (
                <div key={a.id} className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded border border-emerald-100">
                      Target: {a.targetAudience}
                    </span>
                    <span className="text-xs text-slate-400">{new Date(a.createdAt).toLocaleDateString('en-GH')}</span>
                  </div>
                  <h3 className="font-bold text-slate-900 text-sm mb-1">{a.title}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">{a.content}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 10: REPORTS & EXPORTS */}
        {activeTab === 'reports' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
              <h2 className="font-black text-slate-900 text-base mb-1">Institutional Reporting & Regulatory Audits</h2>
              <p className="text-xs text-slate-500 mb-6">
                Generate and download verified CSV/spreadsheet reports for Ghana Tertiary Education Commission (GTEC) and Nursing & Midwifery Council (N&MC) audits.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <a
                  href="/api/admin/reports?type=students"
                  className="p-5 rounded-2xl border border-slate-200 hover:border-emerald-500 bg-slate-50/50 hover:bg-emerald-50/30 transition block"
                >
                  <FileSpreadsheet className="w-8 h-8 text-emerald-600 mb-3" />
                  <h3 className="font-bold text-slate-900 text-sm">Enrolled Students Roster</h3>
                  <p className="text-xs text-slate-500 mt-1 mb-4">Complete registry of active, deferred and suspended students with IDs and CGPA.</p>
                  <span className="text-xs text-emerald-700 font-bold inline-flex items-center gap-1">
                    Download CSV &rarr;
                  </span>
                </a>

                <a
                  href="/api/admin/reports?type=finance"
                  className="p-5 rounded-2xl border border-slate-200 hover:border-emerald-500 bg-slate-50/50 hover:bg-emerald-50/30 transition block"
                >
                  <DollarSign className="w-8 h-8 text-teal-600 mb-3" />
                  <h3 className="font-bold text-slate-900 text-sm">Fee Collection & Revenue Report</h3>
                  <p className="text-xs text-slate-500 mt-1 mb-4">Itemized payments in Ghana Cedis (GH₵) with Paystack reference numbers and receipts.</p>
                  <span className="text-xs text-emerald-700 font-bold inline-flex items-center gap-1">
                    Download CSV &rarr;
                  </span>
                </a>

                <a
                  href="/api/admin/reports?type=admissions"
                  className="p-5 rounded-2xl border border-slate-200 hover:border-emerald-500 bg-slate-50/50 hover:bg-emerald-50/30 transition block"
                >
                  <GraduationCap className="w-8 h-8 text-amber-600 mb-3" />
                  <h3 className="font-bold text-slate-900 text-sm">Admissions & Applicants Audit</h3>
                  <p className="text-xs text-slate-500 mt-1 mb-4">Cohort applicants with status breakdown, qualifications, and decision dates.</p>
                  <span className="text-xs text-emerald-700 font-bold inline-flex items-center gap-1">
                    Download CSV &rarr;
                  </span>
                </a>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* STUDENT PROFILE DRAWER */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-2xl bg-white h-full shadow-2xl overflow-y-auto flex flex-col">
            {/* Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-sm">
                  {selectedStudent.user?.name?.charAt(0)}
                </div>
                <div>
                  <h2 className="font-black text-slate-900 text-base">{selectedStudent.user?.name}</h2>
                  <p className="text-xs text-slate-400 font-mono">{selectedStudent.studentId} • {selectedStudent.programme?.name}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedStudent(null)}
                className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Actions Bar */}
            <div className="bg-slate-50 px-5 py-3 border-b border-slate-100 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="text-slate-500 font-medium">Status:</span>
                <span className="font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  {selectedStudent.status}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePromoteStudent(selectedStudent.id, selectedStudent.level)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-2.5 py-1 rounded-lg"
                >
                  Promote Level
                </button>
                {selectedStudent.status === 'ACTIVE' ? (
                  <button
                    onClick={() => handleStudentStatus(selectedStudent.id, 'SUSPENDED')}
                    className="bg-rose-50 text-rose-700 hover:bg-rose-100 font-semibold px-2.5 py-1 rounded-lg"
                  >
                    Suspend
                  </button>
                ) : (
                  <button
                    onClick={() => handleStudentStatus(selectedStudent.id, 'ACTIVE')}
                    className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-semibold px-2.5 py-1 rounded-lg"
                  >
                    Reactivate
                  </button>
                )}
              </div>
            </div>

            {/* Profile Tabs */}
            <div className="flex border-b border-slate-100 px-5 text-xs font-semibold overflow-x-auto scrollbar-none">
              {[
                { id: 'personal', label: 'Personal Info' },
                { id: 'academic', label: 'Academic & Courses' },
                { id: 'attendance', label: 'Attendance' },
                { id: 'results', label: 'Results & Transcript' },
                { id: 'finance', label: 'Financial Records (GHS)' },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setStudentDetailTab(t.id as any)}
                  className={`py-3 px-3 border-b-2 whitespace-nowrap transition ${
                    studentDetailTab === t.id
                      ? 'border-emerald-600 text-emerald-700'
                      : 'border-transparent text-slate-400 hover:text-slate-700'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Tab Contents */}
            <div className="p-6 space-y-4 flex-1">
              {studentDetailTab === 'personal' && (
                <div className="space-y-4 text-xs">
                  <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <div>
                      <span className="text-slate-400 font-medium block">Full Name</span>
                      <strong className="text-slate-900">{selectedStudent.user?.name}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium block">Email Address</span>
                      <strong className="text-slate-900">{selectedStudent.user?.email}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium block">Ghana Phone (+233)</span>
                      <strong className="text-slate-900">{selectedStudent.user?.phone}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium block">Emergency Contact</span>
                      <strong className="text-slate-900">{selectedStudent.emergencyContact || 'Parent/Guardian'}</strong>
                    </div>
                  </div>
                </div>
              )}

              {studentDetailTab === 'academic' && (
                <div className="space-y-4 text-xs">
                  <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 text-emerald-900">
                    <p><strong>Programme:</strong> {selectedStudent.programme?.name}</p>
                    <p><strong>Current Level:</strong> {selectedStudent.level}</p>
                    <p><strong>Academic Year:</strong> {selectedStudent.academicYear}</p>
                    <p><strong>Cumulative GPA:</strong> {selectedStudent.cgpa?.toFixed(2)}</p>
                  </div>

                  <h3 className="font-bold text-slate-900 text-sm">Registered Courses</h3>
                  <div className="divide-y divide-slate-100">
                    {selectedStudent.registrations?.map((r: any) => (
                      <div key={r.id} className="py-2.5 flex items-center justify-between">
                        <div>
                          <span className="font-bold text-slate-900 block">{r.course?.code} - {r.course?.title}</span>
                          <span className="text-slate-400">{r.course?.creditHours} Credits • {r.course?.lecturer?.name}</span>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                          {r.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {studentDetailTab === 'attendance' && (
                <div className="space-y-3 text-xs">
                  <h3 className="font-bold text-slate-900 text-sm">Clinical & Class Attendance Log</h3>
                  <div className="divide-y divide-slate-100">
                    {selectedStudent.attendanceRecords?.map((att: any) => (
                      <div key={att.id} className="py-2 flex items-center justify-between">
                        <div>
                          <p className="font-bold text-slate-900">{att.session?.title}</p>
                          <p className="text-slate-400">{att.session?.date} • {att.session?.course?.code}</p>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                          {att.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {studentDetailTab === 'results' && (
                <div className="space-y-3 text-xs">
                  <h3 className="font-bold text-slate-900 text-sm">Continuous Assessment & Exam Grades</h3>
                  <div className="divide-y divide-slate-100">
                    {selectedStudent.caResults?.map((res: any) => (
                      <div key={res.id} className="py-2.5 flex items-center justify-between">
                        <div>
                          <p className="font-bold text-slate-900">{res.course?.code} - {res.course?.title}</p>
                          <p className="text-slate-400">CA: {res.caScore} • Exam: {res.examScore} • Total: {res.totalScore}%</p>
                        </div>
                        <span className="text-xs font-black text-emerald-700 bg-emerald-50 px-2 py-1 rounded border border-emerald-100">
                          Grade {res.grade} ({res.gpaPoint?.toFixed(1)})
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {studentDetailTab === 'finance' && (
                <div className="space-y-4 text-xs">
                  <h3 className="font-bold text-slate-900 text-sm">Invoices & Payment Receipts (GHS)</h3>
                  {selectedStudent.invoices?.map((inv: any) => (
                    <div key={inv.id} className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                      <div className="flex justify-between items-center mb-2">
                        <strong className="text-slate-900">{inv.title}</strong>
                        <span className="text-emerald-700 font-bold">{formatGHS(inv.amount)}</span>
                      </div>
                      <div className="flex justify-between text-slate-500">
                        <span>Paid: {formatGHS(inv.amountPaid)}</span>
                        <span className="text-rose-600 font-semibold">Balance: {formatGHS(inv.balance)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD MANUAL STUDENT */}
      {showAddStudentModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base">Register Student Manually</h3>
              <button onClick={() => setShowAddStudentModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateStudent} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Full Student Name</label>
                <input
                  type="text"
                  required
                  value={newStudentForm.name}
                  onChange={(e) => setNewStudentForm({ ...newStudentForm, name: e.target.value })}
                  placeholder="e.g. Kwadwo Mensah"
                  className="w-full p-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Student Institutional Email</label>
                <input
                  type="email"
                  required
                  value={newStudentForm.email}
                  onChange={(e) => setNewStudentForm({ ...newStudentForm, email: e.target.value })}
                  placeholder="kwadwo@student.actionhealthcollege.edu.gh"
                  className="w-full p-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Ghana Phone (+233)</label>
                <input
                  type="text"
                  required
                  value={newStudentForm.phone}
                  onChange={(e) => setNewStudentForm({ ...newStudentForm, phone: e.target.value })}
                  placeholder="+233 24 000 0000"
                  className="w-full p-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Programme</label>
                <select
                  required
                  value={newStudentForm.programmeId}
                  onChange={(e) => setNewStudentForm({ ...newStudentForm, programmeId: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">Select Programme</option>
                  {academics?.programmes?.map((p: any) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({formatGHS(p.fee)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Academic Level</label>
                <select
                  value={newStudentForm.level}
                  onChange={(e) => setNewStudentForm({ ...newStudentForm, level: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="Level 100">Level 100 (First Year)</option>
                  <option value="Level 200">Level 200 (Second Year)</option>
                  <option value="Level 300">Level 300 (Third Year)</option>
                  <option value="Level 400">Level 400 (Final Year)</option>
                </select>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddStudentModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl font-semibold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold shadow-sm"
                >
                  {actionLoading ? 'Creating...' : 'Enroll Student'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: RECORD OFFLINE PAYMENT IN GHS */}
      {showOfflinePaymentModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base">Record Offline Fee Payment (GHS)</h3>
              <button onClick={() => setShowOfflinePaymentModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRecordOfflinePayment} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Select Student Invoice</label>
                <select
                  required
                  value={offlinePaymentForm.invoiceId}
                  onChange={(e) => setOfflinePaymentForm({ ...offlinePaymentForm, invoiceId: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-xl"
                >
                  <option value="">Select Invoice</option>
                  {finances?.invoices?.map((inv: any) => (
                    <option key={inv.id} value={inv.id}>
                      {inv.invoiceNumber} - {inv.student?.user?.name} (Due: {formatGHS(inv.balance)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Amount Paid in Ghana Cedis (GH₵)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={offlinePaymentForm.amount}
                  onChange={(e) => setOfflinePaymentForm({ ...offlinePaymentForm, amount: e.target.value })}
                  placeholder="e.g. 1500.00"
                  className="w-full p-2 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Payment Method / Bank Verification</label>
                <select
                  value={offlinePaymentForm.method}
                  onChange={(e) => setOfflinePaymentForm({ ...offlinePaymentForm, method: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-xl"
                >
                  <option value="Offline Bank Deposit (GCB Bank)">Offline Bank Deposit (GCB Bank)</option>
                  <option value="Offline Bank Deposit (Ecobank Ghana)">Offline Bank Deposit (Ecobank Ghana)</option>
                  <option value="Cash Office Teller Deposit">Cash Office Teller Deposit</option>
                  <option value="Banker's Draft">Banker's Draft</option>
                </select>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowOfflinePaymentModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl font-semibold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold shadow-sm"
                >
                  {actionLoading ? 'Recording...' : 'Generate GHS Receipt'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: BROADCAST ANNOUNCEMENT */}
      {showNewAnnouncementModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base">Broadcast Institutional Announcement</h3>
              <button onClick={() => setShowNewAnnouncementModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAnnouncement} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={announcementForm.title}
                  onChange={(e) => setAnnouncementForm({ ...announcementForm, title: e.target.value })}
                  placeholder="e.g. N&MC Ghana Examination Hall Orientation"
                  className="w-full p-2 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Target Audience</label>
                <select
                  value={announcementForm.targetAudience}
                  onChange={(e) => setAnnouncementForm({ ...announcementForm, targetAudience: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-xl"
                >
                  <option value="ALL">All Students & Faculty</option>
                  <option value="STUDENTS">Students Only</option>
                  <option value="LECTURERS">Lecturers & Faculty Only</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Message Content</label>
                <textarea
                  rows={4}
                  required
                  value={announcementForm.content}
                  onChange={(e) => setAnnouncementForm({ ...announcementForm, content: e.target.value })}
                  placeholder="Type the administrative circular details..."
                  className="w-full p-2 border border-slate-200 rounded-xl"
                ></textarea>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewAnnouncementModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl font-semibold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold"
                >
                  {actionLoading ? 'Posting...' : 'Broadcast Notice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD LECTURER */}
      {showAddLecturerModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base">Add Faculty Lecturer</h3>
              <button onClick={() => setShowAddLecturerModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateLecturer} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Lecturer Full Name</label>
                <input
                  type="text"
                  required
                  value={newLecturerForm.name}
                  onChange={(e) => setNewLecturerForm({ ...newLecturerForm, name: e.target.value })}
                  placeholder="e.g. Dr. Kwame Osei"
                  className="w-full p-2 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={newLecturerForm.email}
                  onChange={(e) => setNewLecturerForm({ ...newLecturerForm, email: e.target.value })}
                  placeholder="k.osei@actionhealthcollege.edu.gh"
                  className="w-full p-2 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Ghana Phone (+233)</label>
                <input
                  type="text"
                  required
                  value={newLecturerForm.phone}
                  onChange={(e) => setNewLecturerForm({ ...newLecturerForm, phone: e.target.value })}
                  placeholder="+233 24 567 8901"
                  className="w-full p-2 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Department</label>
                <select
                  value={newLecturerForm.department}
                  onChange={(e) => setNewLecturerForm({ ...newLecturerForm, department: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-xl"
                >
                  <option value="General Nursing">Department of General Nursing</option>
                  <option value="Midwifery & Maternal Health">Department of Midwifery & Maternal Health</option>
                  <option value="Community & Public Health">Department of Community & Public Health</option>
                </select>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddLecturerModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl font-semibold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold"
                >
                  {actionLoading ? 'Saving...' : 'Add Lecturer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminDashboardPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50" />}>
      <AdminDashboardContent />
    </Suspense>
  );
}
