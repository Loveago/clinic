'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  BookOpen,
  Users,
  FileText,
  CheckCircle,
  ArrowRight,
  Clock,
  Calendar,
  CheckSquare,
  FileEdit,
  Download,
  AlertCircle,
  PlusCircle,
  X,
  Megaphone,
  UserCircle,
  LayoutDashboard,
  ClipboardCheck,
  Send,
  Lock,
  Unlock,
  Menu,
  ChevronRight,
  GraduationCap,
} from 'lucide-react';
import DemoRoleSwitcher from '@/components/DemoRoleSwitcher';

type NavTab =
  | 'dashboard'
  | 'courses'
  | 'assignments'
  | 'examinations'
  | 'timetable'
  | 'announcements'
  | 'profile';

type WorkspaceSubTab = 'overview' | 'students' | 'materials' | 'assignments' | 'attendance' | 'grades';
type TimetableView = 'daily' | 'weekly' | 'monthly';

const DAYS_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function LecturerPortalPage() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [data, setData] = useState<any>(null);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [examinations, setExaminations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Course workspace state
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [workspaceTab, setWorkspaceTab] = useState<WorkspaceSubTab>('overview');

  // Timetable view state
  const [timetableView, setTimetableView] = useState<TimetableView>('weekly');
  const [selectedDay, setSelectedDay] = useState<string>('Monday');

  // Assignment create/edit modal state
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<any>(null);
  const [asgCourseId, setAsgCourseId] = useState('');
  const [asgTitle, setAsgTitle] = useState('');
  const [asgDesc, setAsgDesc] = useState('');
  const [asgDeadline, setAsgDeadline] = useState('');
  const [asgMaxMarks, setAsgMaxMarks] = useState(100);
  const [asgWeighting, setAsgWeighting] = useState(20);
  const [asgStatus, setAsgStatus] = useState<'DRAFT' | 'PUBLISHED' | 'CLOSED'>('PUBLISHED');
  const [asgAllowLate, setAsgAllowLate] = useState(true);
  const [asgAllowResubmission, setAsgAllowResubmission] = useState(false);
  const [asgAllowedFormats, setAsgAllowedFormats] = useState('PDF, DOCX');
  const [asgAttachmentUrl, setAsgAttachmentUrl] = useState('');

  // Auto-grading retry state
  const [retryingSubmissionId, setRetryingSubmissionId] = useState<string | null>(null);

  // Exam question proposal state
  const [proposeExamId, setProposeExamId] = useState<string | null>(null);
  const [qType, setQType] = useState('MCQ');
  const [qText, setQText] = useState('');
  const [qOptions, setQOptions] = useState('Option A, Option B, Option C, Option D');
  const [qCorrectAnswer, setQCorrectAnswer] = useState('');
  const [qMarks, setQMarks] = useState(4);
  const [qDifficulty, setQDifficulty] = useState('MEDIUM');
  const [savingQuestion, setSavingQuestion] = useState(false);

  // Announcement composer state
  const [annCourseId, setAnnCourseId] = useState('');
  const [annCohortId, setAnnCohortId] = useState('');
  const [annTitle, setAnnTitle] = useState('');
  const [annContent, setAnnContent] = useState('');
  const [annPriority, setAnnPriority] = useState('NORMAL');
  const [postingAnn, setPostingAnn] = useState(false);

  // Toast
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4000);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const meRes = await fetch('/api/auth/me');
      if (meRes.status === 401 || meRes.status === 403) {
        router.replace('/auth/login');
        return;
      }
      const meData = await meRes.json();
      if (
        !meData?.user ||
        !['LECTURER', 'EXAM_OFFICER', 'SUPER_ADMIN', 'SCHOOL_ADMIN'].includes(meData.user.role)
      ) {
        router.replace('/auth/login');
        return;
      }

      const [coursesRes, annRes, examsRes] = await Promise.all([
        fetch('/api/lecturer/courses'),
        fetch('/api/lecturer/announcements'),
        fetch('/api/lecturer/examinations'),
      ]);
      if (
        coursesRes.status === 401 ||
        coursesRes.status === 403 ||
        annRes.status === 401 ||
        annRes.status === 403 ||
        examsRes.status === 401 ||
        examsRes.status === 403
      ) {
        router.replace('/auth/login');
        return;
      }
      setAuthChecked(true);
      const coursesJson = await coursesRes.json();
      const annJson = await annRes.json();
      const examsJson = await examsRes.json();

      if (coursesRes.ok) {
        setData(coursesJson);
        if (!asgCourseId && coursesJson.courses?.[0]?.id) {
          setAsgCourseId(coursesJson.courses[0].id);
        }
        if (!annCourseId && coursesJson.courses?.[0]?.id) {
          setAnnCourseId(coursesJson.courses[0].id);
        }
      } else {
        showToast('error', coursesJson.error || 'Failed to load lecturer data');
      }

      if (annRes.ok) {
        setAnnouncements(annJson.announcements || []);
      }
      if (examsRes.ok) {
        setExaminations(examsJson.examinations || []);
      }
    } catch (e) {
      console.error(e);
      showToast('error', 'Network error while loading portal data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const courses: any[] = data?.courses || [];
  const stats = data?.stats || {
    assignedCoursesCount: 0,
    totalStudentsTaught: 0,
    totalAssessmentsPending: 0,
    pendingGradesCount: 0,
    totalSessionsCount: 0,
  };
  const lecturer = data?.lecturer || null;
  const timetable: any[] = data?.timetable || [];

  const selectedCourse = useMemo(
    () => courses.find((c) => c.id === selectedCourseId) || null,
    [courses, selectedCourseId]
  );

  const allAssignments = useMemo(
    () =>
      courses.flatMap((c) =>
        (c.assignments || []).map((a: any) => ({
          ...a,
          courseCode: c.code,
          courseTitle: c.title,
        }))
      ),
    [courses]
  );

  const failedSubmissions = useMemo(
    () =>
      allAssignments.flatMap((a) =>
        (a.submissions || [])
          .filter((s: any) => s.evaluationStatus === 'FAILED')
          .map((s: any) => ({
            ...s,
            assignmentTitle: a.title,
            assignmentMaxMarks: a.maxMarks,
            courseCode: a.courseCode,
            assignment: a,
          }))
      ),
    [allAssignments]
  );

  const cohortOptions = useMemo(() => {
    const map = new Map<string, string>();
    const targetCourse = courses.find((c) => c.id === annCourseId);
    const regs = targetCourse?.registrations || courses.flatMap((c) => c.registrations || []);
    for (const r of regs) {
      if (r.student?.cohort?.id) {
        map.set(r.student.cohort.id, r.student.cohort.name);
      }
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [courses, annCourseId]);

  const openCreateAssignment = (courseId?: string) => {
    setEditingAssignment(null);
    setAsgCourseId(courseId || courses[0]?.id || '');
    setAsgTitle('');
    setAsgDesc('');
    setAsgDeadline(new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]);
    setAsgMaxMarks(100);
    setAsgWeighting(20);
    setAsgStatus('PUBLISHED');
    setAsgAllowLate(true);
    setAsgAllowResubmission(false);
    setAsgAllowedFormats('PDF, DOCX');
    setAsgAttachmentUrl('');
    setShowAssignmentModal(true);
  };

  const openEditAssignment = (asg: any) => {
    setEditingAssignment(asg);
    setAsgCourseId(asg.courseId);
    setAsgTitle(asg.title);
    setAsgDesc(asg.description || '');
    setAsgDeadline(asg.deadline || '');
    setAsgMaxMarks(asg.maxMarks || 100);
    setAsgWeighting(asg.weighting || 20);
    setAsgStatus(asg.status || 'PUBLISHED');
    setAsgAllowLate(Boolean(asg.allowLate));
    setAsgAllowResubmission(Boolean(asg.allowResubmission));
    setAsgAllowedFormats(asg.allowedFormats || '');
    setAsgAttachmentUrl(asg.attachmentUrl || '');
    setShowAssignmentModal(true);
  };

  const handleSaveAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const isEdit = Boolean(editingAssignment);
      const res = await fetch('/api/lecturer/assignments', {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(isEdit ? { assignmentId: editingAssignment.id } : {}),
          courseId: asgCourseId,
          title: asgTitle,
          description: asgDesc,
          dueDate: asgDeadline,
          maxMarks: Number(asgMaxMarks),
          weighting: Number(asgWeighting),
          status: asgStatus,
          allowLate: asgAllowLate,
          allowResubmission: asgAllowResubmission,
          allowedFormats: asgAllowedFormats,
          attachmentUrl: asgAttachmentUrl || null,
        }),
      });
      const resJson = await res.json();
      if (!res.ok) {
        showToast('error', resJson.error || 'Failed to save assignment');
        return;
      }
      showToast(
        'success',
        isEdit ? 'Assignment updated successfully.' : 'Assignment created successfully.'
      );
      setShowAssignmentModal(false);
      await loadData();
    } catch (err) {
      console.error(err);
      showToast('error', 'Failed to save assignment');
    }
  };

  const handleToggleAssignmentStatus = async (asg: any, nextStatus: 'PUBLISHED' | 'CLOSED') => {
    try {
      const res = await fetch('/api/lecturer/assignments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignmentId: asg.id,
          status: nextStatus,
        }),
      });
      const resJson = await res.json();
      if (!res.ok) {
        showToast('error', resJson.error || 'Failed to update assignment status');
        return;
      }
      showToast('success', `Assignment ${nextStatus.toLowerCase()}.`);
      await loadData();
    } catch (err) {
      console.error(err);
      showToast('error', 'Network error updating assignment');
    }
  };

  const handleRetryAutoGrading = async (assignmentId: string, submissionId?: string) => {
    setRetryingSubmissionId(submissionId || assignmentId);
    try {
      const res = await fetch('/api/lecturer/assignments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'retry_auto_grading',
          assignmentId,
          ...(submissionId ? { submissionId } : {}),
        }),
      });
      const resJson = await res.json();
      if (!res.ok) {
        showToast('error', resJson.error || 'Failed to retry automated grading');
        return;
      }
      showToast(
        'success',
        `Automated grading retried: ${resJson.completedCount ?? 0} completed, ${resJson.failedCount ?? 0} failed.`
      );
      await loadData();
    } catch (err) {
      console.error(err);
      showToast('error', 'Failed to retry automated grading');
    } finally {
      setRetryingSubmissionId(null);
    }
  };

  const handlePublishAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!annCourseId || !annTitle.trim() || !annContent.trim()) return;
    setPostingAnn(true);
    try {
      const res = await fetch('/api/lecturer/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId: annCourseId,
          cohortId: annCohortId || null,
          title: annTitle,
          content: annContent,
          priority: annPriority,
        }),
      });
      const resJson = await res.json();
      if (!res.ok) {
        showToast('error', resJson.error || 'Failed to publish announcement');
        return;
      }
      showToast(
        'success',
        `Announcement published (${resJson.notifiedCount ?? 0} student(s) notified).`
      );
      setAnnTitle('');
      setAnnContent('');
      await loadData();
    } catch (err) {
      console.error(err);
      showToast('error', 'Failed to publish announcement');
    } finally {
      setPostingAnn(false);
    }
  };

  const handleProposeQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!proposeExamId || !qText.trim()) return;
    setSavingQuestion(true);
    try {
      const optionsArr = qOptions
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      const res = await fetch('/api/lecturer/examinations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          examId: proposeExamId,
          questionType: qType,
          difficulty: qDifficulty,
          text: qText,
          options: qType === 'MCQ' ? optionsArr : qType === 'TRUE_FALSE' ? ['True', 'False'] : [],
          correctAnswer: qCorrectAnswer,
          expectedAnswer: qCorrectAnswer,
          marks: Number(qMarks) || 4,
        }),
      });
      const resJson = await res.json();
      if (!res.ok) {
        showToast('error', resJson.error || 'Failed to add question');
        return;
      }
      showToast('success', 'Question & automated marking rubric added to examination.');
      setProposeExamId(null);
      setQText('');
      setQCorrectAnswer('');
      await loadData();
    } catch (err) {
      console.error(err);
      showToast('error', 'Network error adding question');
    } finally {
      setSavingQuestion(false);
    }
  };

  const navItems: { id: NavTab; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'courses', label: 'My Courses', icon: <BookOpen className="w-4 h-4" /> },
    { id: 'assignments', label: 'Assignments', icon: <ClipboardCheck className="w-4 h-4" /> },
    { id: 'examinations', label: 'Examinations', icon: <FileText className="w-4 h-4" /> },
    { id: 'timetable', label: 'Timetable', icon: <Calendar className="w-4 h-4" /> },
    { id: 'announcements', label: 'Announcements', icon: <Megaphone className="w-4 h-4" /> },
    { id: 'profile', label: 'Profile', icon: <UserCircle className="w-4 h-4" /> },
  ];

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-2 border-[#073832] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-semibold text-slate-500">Verifying lecturer session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800">
      <DemoRoleSwitcher />

      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-[#073832] border-b border-emerald-900/50 text-white px-4 sm:px-6 py-3 shadow-md flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-lg bg-emerald-900/60 text-emerald-100 hover:bg-emerald-800"
            aria-label="Toggle Menu"
          >
            <Menu className="w-4 h-4" />
          </button>
          <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-200">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-bold text-white leading-tight">
                Lecturer Academic Portal
              </h1>
              <span className="hidden sm:inline-block text-[10px] bg-emerald-400/20 text-emerald-200 font-bold px-2 py-0.5 rounded-full border border-emerald-400/30">
                Faculty Workspace
              </span>
            </div>
            <p className="text-[11px] text-emerald-200/80">
              {lecturer?.name || 'Faculty Member'} ·{' '}
              {lecturer?.lecturerProfile?.department?.name || 'Academic Department'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/portal/lecturer/attendance"
            className="hidden sm:flex items-center gap-1.5 bg-emerald-800/80 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg border border-emerald-600/40 transition"
          >
            <CheckSquare className="w-3.5 h-3.5" /> Attendance
          </Link>
          <Link
            href="/portal/lecturer/grading"
            className="hidden sm:flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold px-3 py-1.5 rounded-lg transition"
          >
            <FileEdit className="w-3.5 h-3.5" /> Gradebook
          </Link>
          <Link
            href="/school"
            className="text-xs text-emerald-100 hover:text-white px-2.5 py-1.5 rounded-lg border border-emerald-700/60 transition"
          >
            School &rarr;
          </Link>
        </div>
      </header>

      {/* Toast Notification */}
      {toast && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-4 w-full">
          <div
            className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-sm border ${
              toast.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{toast.text}</span>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col lg:flex-row gap-6 p-4 sm:p-6">
        {/* Sidebar Navigation */}
        <aside
          className={`${
            mobileMenuOpen ? 'block' : 'hidden'
          } lg:block w-full lg:w-60 shrink-0 space-y-2`}
        >
          <div className="bg-white rounded-2xl border border-slate-200/80 p-3 shadow-sm space-y-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  if (item.id !== 'courses') setSelectedCourseId(null);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition ${
                  activeTab === item.id
                    ? 'bg-[#073832] text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  {item.icon}
                  {item.label}
                </span>
                <ChevronRight className="w-3.5 h-3.5 opacity-60" />
              </button>
            ))}

            <div className="pt-3 mt-3 border-t border-slate-100 space-y-1">
              <Link
                href="/portal/lecturer/attendance"
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 transition"
              >
                <CheckSquare className="w-4 h-4" /> Mark Attendance
              </Link>
              <Link
                href="/portal/lecturer/grading"
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-teal-800 bg-teal-50 hover:bg-teal-100 transition"
              >
                <FileEdit className="w-4 h-4" /> Score Sheet &amp; Grades
              </Link>
              <Link
                href="/portal/admin/learning"
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition"
              >
                <FileText className="w-4 h-4" /> PDF Topic Review
              </Link>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0 space-y-6">
          {loading ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-xs text-slate-500">
              Loading Lecturer Portal...
            </div>
          ) : (
            <>
              {/* TAB: DASHBOARD */}
              {activeTab === 'dashboard' && (
                <div className="space-y-6">
                  {/* Real KPI Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
                      <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold block">
                        Assigned Courses
                      </span>
                      <div className="text-2xl font-black text-slate-900 mt-1">
                        {stats.assignedCoursesCount ?? courses.length}
                      </div>
                      <div className="text-xs text-emerald-700 font-semibold mt-1">
                        Active teaching load
                      </div>
                    </div>

                    <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
                      <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold block">
                        Enrolled Students
                      </span>
                      <div className="text-2xl font-black text-slate-900 mt-1">
                        {stats.totalStudentsTaught ?? 0}
                      </div>
                      <div className="text-xs text-teal-700 font-semibold mt-1">
                        Approved registrations
                      </div>
                    </div>

                    <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
                      <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold block">
                        Pending Submissions
                      </span>
                      <div className="text-2xl font-black text-amber-600 mt-1">
                        {stats.totalAssessmentsPending ?? 0}
                      </div>
                      <div className="text-xs text-amber-700 font-semibold mt-1">
                        Awaiting grading
                      </div>
                    </div>

                    <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
                      <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold block">
                        Attendance Sessions
                      </span>
                      <div className="text-2xl font-black text-emerald-700 mt-1">
                        {stats.totalSessionsCount ?? 0}
                      </div>
                      <div className="text-xs text-slate-500 font-semibold mt-1">
                        {stats.pendingGradesCount ?? 0} draft grade(s)
                      </div>
                    </div>
                  </div>

                  {/* Two-column Dashboard Widgets */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Upcoming Classes */}
                    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-4">
                      <div className="flex items-center justify-between">
                        <h2 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-emerald-700" /> Upcoming Timetable
                        </h2>
                        <button
                          onClick={() => setActiveTab('timetable')}
                          className="text-xs font-bold text-emerald-700 hover:underline"
                        >
                          Full Schedule &rarr;
                        </button>
                      </div>
                      {timetable.length === 0 ? (
                        <p className="text-xs text-slate-400 py-4">
                          No class schedules assigned yet.
                        </p>
                      ) : (
                        <div className="space-y-2.5">
                          {timetable.slice(0, 5).map((slot: any) => (
                            <div
                              key={slot.id}
                              className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs"
                            >
                              <div>
                                <span className="font-bold text-emerald-800">
                                  {slot.course?.code}
                                </span>{' '}
                                <span className="font-semibold text-slate-800">
                                  {slot.course?.title}
                                </span>
                                <div className="text-[11px] text-slate-500 mt-0.5">
                                  {slot.dayOfWeek} · {slot.startTime} - {slot.endTime}
                                </div>
                              </div>
                              <span className="text-[11px] font-semibold text-slate-600 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                                {slot.venue}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Failed Auto-Grading Queue */}
                    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-4">
                      <div className="flex items-center justify-between">
                        <h2 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                          <ClipboardCheck className="w-4 h-4 text-amber-600" /> Auto-Grading Status
                        </h2>
                        <button
                          onClick={() => setActiveTab('assignments')}
                          className="text-xs font-bold text-emerald-700 hover:underline"
                        >
                          All Assignments &rarr;
                        </button>
                      </div>
                      {failedSubmissions.length === 0 ? (
                        <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl p-3">
                          All submitted assignments are automatically graded with zero failed evaluations.
                        </p>
                      ) : (
                        <div className="space-y-2.5">
                          {failedSubmissions.slice(0, 5).map((sub: any) => (
                            <div
                              key={sub.id}
                              className="p-3 rounded-xl bg-rose-50/70 border border-rose-200 flex items-center justify-between text-xs"
                            >
                              <div>
                                <div className="font-bold text-slate-900">
                                  {sub.courseCode} · {sub.assignmentTitle}
                                </div>
                                <div className="text-[11px] text-rose-700 mt-0.5">
                                  {sub.errorMessage || 'Automated evaluation failed'}
                                </div>
                              </div>
                              <button
                                onClick={() => handleRetryAutoGrading(sub.assignmentId, sub.id)}
                                disabled={retryingSubmissionId === sub.id}
                                className="px-3 py-1.5 bg-[#073832] text-white rounded-lg font-bold text-[11px] hover:bg-emerald-900 disabled:opacity-50"
                              >
                                {retryingSubmissionId === sub.id ? 'Retrying...' : 'Retry Auto-Grading'}
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Recent Announcements */}
                  <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-3">
                    <div className="flex items-center justify-between">
                      <h2 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                        <Megaphone className="w-4 h-4 text-emerald-700" /> Recent Course Announcements
                      </h2>
                      <button
                        onClick={() => setActiveTab('announcements')}
                        className="text-xs font-bold text-emerald-700 hover:underline"
                      >
                        Compose &rarr;
                      </button>
                    </div>
                    {announcements.length === 0 ? (
                      <p className="text-xs text-slate-400">No announcements published yet.</p>
                    ) : (
                      <div className="grid sm:grid-cols-2 gap-3">
                        {announcements.slice(0, 4).map((ann: any) => (
                          <div
                            key={ann.id}
                            className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-emerald-800">
                                {ann.course?.code || 'Course'}
                              </span>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                                {ann.priority}
                              </span>
                            </div>
                            <div className="font-bold text-slate-900 mt-1">{ann.title}</div>
                            <p className="text-slate-600 mt-1 line-clamp-2">{ann.content}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB: MY COURSES + COURSE WORKSPACE */}
              {activeTab === 'courses' && !selectedCourse && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="font-bold text-slate-900 text-base">Assigned Courses</h2>
                      <p className="text-xs text-slate-500">
                        Select a course to open its workspace, rosters, approved PDF topics, and
                        assessments.
                      </p>
                    </div>
                  </div>

                  {courses.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-xs text-slate-500">
                      No courses are currently assigned to your lecturer account.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {courses.map((course: any) => (
                        <div
                          key={course.id}
                          className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm flex flex-col justify-between gap-4"
                        >
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-100">
                                {course.code}
                              </span>
                              <span className="text-xs text-slate-500 font-semibold">
                                {course.creditHours} Credits · {course.level}
                              </span>
                            </div>
                            <div>
                              <h3 className="font-bold text-slate-900 text-base">{course.title}</h3>
                              <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                                {course.description}
                              </p>
                            </div>
                            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs text-slate-600 space-y-1">
                              <p>
                                <strong>Programme:</strong> {course.programme?.name || '—'}
                              </p>
                              <p>
                                <strong>Enrolled Students:</strong>{' '}
                                {course.registrations?.length ?? 0}
                              </p>
                              <p>
                                <strong>Approved PDFs:</strong> {course.materials?.length ?? 0} ·{' '}
                                <strong>Sessions:</strong> {course.attendance?.length ?? 0}
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100">
                            <button
                              onClick={() => {
                                setSelectedCourseId(course.id);
                                setWorkspaceTab('overview');
                              }}
                              className="px-3.5 py-1.5 bg-[#073832] hover:bg-emerald-900 text-white text-xs font-bold rounded-xl transition flex items-center gap-1"
                            >
                              Open Workspace <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                            <div className="flex items-center gap-3 text-xs font-bold">
                              <Link
                                href={`/portal/lecturer/attendance?courseId=${course.id}`}
                                className="text-emerald-700 hover:underline"
                              >
                                Attendance
                              </Link>
                              <Link
                                href={`/portal/lecturer/grading?courseId=${course.id}`}
                                className="text-teal-700 hover:underline"
                              >
                                Gradebook
                              </Link>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* COURSE WORKSPACE DETAIL */}
              {activeTab === 'courses' && selectedCourse && (
                <div className="space-y-5">
                  <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <button
                          onClick={() => setSelectedCourseId(null)}
                          className="text-xs font-bold text-emerald-700 hover:underline mb-1 inline-block"
                        >
                          &larr; Back to All Courses
                        </button>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                            {selectedCourse.code}
                          </span>
                          <h2 className="font-bold text-slate-900 text-lg">
                            {selectedCourse.title}
                          </h2>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          {selectedCourse.programme?.name} · {selectedCourse.semester} ·{' '}
                          {selectedCourse.creditHours} Credits
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Link
                          href={`/portal/lecturer/attendance?courseId=${selectedCourse.id}`}
                          className="px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold"
                        >
                          Mark Attendance
                        </Link>
                        <Link
                          href={`/portal/lecturer/grading?courseId=${selectedCourse.id}`}
                          className="px-3 py-1.5 bg-[#073832] text-white rounded-xl text-xs font-bold"
                        >
                          Open Gradebook
                        </Link>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
                      {(
                        [
                          ['overview', 'Overview'],
                          ['students', `Enrolled Students (${selectedCourse.registrations?.length ?? 0})`],
                          ['materials', `PDF Materials (${selectedCourse.materials?.length ?? 0})`],
                          ['assignments', `Assignments (${selectedCourse.assignments?.length ?? 0})`],
                          ['attendance', `Attendance (${selectedCourse.attendance?.length ?? 0})`],
                          ['grades', `Performance (${selectedCourse.caResults?.length ?? 0})`],
                        ] as [WorkspaceSubTab, string][]
                      ).map(([id, label]) => (
                        <button
                          key={id}
                          onClick={() => setWorkspaceTab(id)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                            workspaceTab === id
                              ? 'bg-emerald-700 text-white'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {workspaceTab === 'overview' && (
                    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-4 text-xs">
                      <h3 className="font-bold text-slate-900 text-sm">Course Summary</h3>
                      <p className="text-slate-600">{selectedCourse.description}</p>
                      <div className="grid sm:grid-cols-3 gap-4 pt-2">
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                          <span className="text-slate-400 font-bold uppercase text-[10px]">
                            Department
                          </span>
                          <div className="font-bold text-slate-900 mt-0.5">
                            {selectedCourse.department?.name || 'General'}
                          </div>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                          <span className="text-slate-400 font-bold uppercase text-[10px]">
                            Co-Lecturers
                          </span>
                          <div className="font-bold text-slate-900 mt-0.5">
                            {(selectedCourse.courseLecturers || [])
                              .map((cl: any) => cl.lecturer?.name)
                              .filter(Boolean)
                              .join(', ') || 'Primary Lecturer Only'}
                          </div>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                          <span className="text-slate-400 font-bold uppercase text-[10px]">
                            Schedules
                          </span>
                          <div className="font-bold text-slate-900 mt-0.5">
                            {(selectedCourse.schedules || [])
                              .map((s: any) => `${s.dayOfWeek} ${s.startTime}`)
                              .join(' · ') || 'Not scheduled'}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {workspaceTab === 'students' && (
                    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 text-slate-400 font-bold uppercase border-b border-slate-100">
                            <tr>
                              <th className="py-3 px-4">Student ID</th>
                              <th className="py-3 px-4">Name</th>
                              <th className="py-3 px-4">Email</th>
                              <th className="py-3 px-4">Cohort</th>
                              <th className="py-3 px-4">Level</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {(selectedCourse.registrations || []).length === 0 ? (
                              <tr>
                                <td colSpan={5} className="py-8 text-center text-slate-400">
                                  No enrolled students in this course yet.
                                </td>
                              </tr>
                            ) : (
                              (selectedCourse.registrations || []).map((reg: any) => (
                                <tr key={reg.id}>
                                  <td className="py-3 px-4 font-mono font-bold">
                                    {reg.student?.studentId}
                                  </td>
                                  <td className="py-3 px-4 font-bold text-slate-900">
                                    {reg.student?.user?.name}
                                  </td>
                                  <td className="py-3 px-4 text-slate-500">
                                    {reg.student?.user?.email}
                                  </td>
                                  <td className="py-3 px-4">
                                    {reg.student?.cohort?.name || reg.student?.intake}
                                  </td>
                                  <td className="py-3 px-4">{reg.student?.level}</td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {workspaceTab === 'materials' && (
                    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-slate-900 text-sm">
                          Approved PDF Learning Materials &amp; Extracted Topics
                        </h3>
                        <Link
                          href="/portal/admin/learning"
                          className="text-xs font-bold text-emerald-700 hover:underline"
                        >
                          Manage PDF Topics &rarr;
                        </Link>
                      </div>
                      {(selectedCourse.materials || []).length === 0 ? (
                        <p className="text-xs text-slate-400 py-4">
                          No approved/published PDF materials for this course yet.
                        </p>
                      ) : (
                        <div className="space-y-4">
                          {(selectedCourse.materials || []).map((mat: any) => (
                            <div
                              key={mat.id}
                              className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div>
                                  <div className="font-bold text-slate-900 text-sm">
                                    {mat.title}
                                  </div>
                                  <div className="text-[11px] text-slate-500">
                                    {mat.pageCount || '—'} pages ·{' '}
                                    {(mat.extractedTopics || []).length} approved topic(s)
                                  </div>
                                </div>
                                <a
                                  href={`/api/admin/learning-materials/${mat.id}/pdf`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-teal-700 hover:bg-slate-100 flex items-center gap-1"
                                >
                                  <Download className="w-3.5 h-3.5" /> View PDF
                                </a>
                              </div>
                              {(mat.extractedTopics || []).length > 0 && (
                                <div className="grid sm:grid-cols-2 gap-2">
                                  {mat.extractedTopics.map((topic: any) => (
                                    <div
                                      key={topic.id}
                                      className="p-2.5 bg-white rounded-lg border border-slate-200 text-xs"
                                    >
                                      <div className="font-bold text-slate-800">{topic.title}</div>
                                      <div className="text-[11px] text-slate-500 mt-0.5">
                                        Pages {topic.pageStart}-{topic.pageEnd} · {topic.status}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {workspaceTab === 'assignments' && (
                    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-slate-900 text-sm">Course Assignments</h3>
                        <button
                          onClick={() => openCreateAssignment(selectedCourse.id)}
                          className="px-3 py-1.5 bg-[#073832] text-white rounded-xl text-xs font-bold flex items-center gap-1"
                        >
                          <PlusCircle className="w-3.5 h-3.5" /> New Assignment
                        </button>
                      </div>
                      {(selectedCourse.assignments || []).length === 0 ? (
                        <p className="text-xs text-slate-400">No assignments created yet.</p>
                      ) : (
                        <div className="space-y-2.5">
                          {(selectedCourse.assignments || []).map((asg: any) => (
                            <div
                              key={asg.id}
                              className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs"
                            >
                              <div>
                                <div className="font-bold text-slate-900">{asg.title}</div>
                                <div className="text-[11px] text-slate-500">
                                  Due: {asg.deadline} · Max: {asg.maxMarks} · Submissions:{' '}
                                  {asg.submissions?.length ?? 0}
                                </div>
                              </div>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                {asg.status}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {workspaceTab === 'attendance' && (
                    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-3 text-xs">
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-slate-900 text-sm">Attendance Sessions</h3>
                        <Link
                          href={`/portal/lecturer/attendance?courseId=${selectedCourse.id}`}
                          className="text-emerald-700 font-bold hover:underline"
                        >
                          Manage Attendance &rarr;
                        </Link>
                      </div>
                      {(selectedCourse.attendance || []).length === 0 ? (
                        <p className="text-slate-400">No attendance sessions recorded yet.</p>
                      ) : (
                        <div className="space-y-2">
                          {(selectedCourse.attendance || []).map((sess: any) => (
                            <div
                              key={sess.id}
                              className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between"
                            >
                              <div>
                                <div className="font-bold text-slate-900">{sess.title}</div>
                                <div className="text-[11px] text-slate-500">
                                  {sess.date} · {sess.sessionType}
                                </div>
                              </div>
                              <span className="font-bold text-emerald-700">
                                {sess.records?.length ?? 0} record(s)
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {workspaceTab === 'grades' && (
                    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-3 text-xs">
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-slate-900 text-sm">Course Performance</h3>
                        <Link
                          href={`/portal/lecturer/grading?courseId=${selectedCourse.id}`}
                          className="text-emerald-700 font-bold hover:underline"
                        >
                          Open Gradebook &rarr;
                        </Link>
                      </div>
                      {(selectedCourse.caResults || []).length === 0 ? (
                        <p className="text-slate-400">No grade records entered yet.</p>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left">
                            <thead className="bg-slate-50 text-slate-400 uppercase font-bold">
                              <tr>
                                <th className="py-2 px-3">Student</th>
                                <th className="py-2 px-3">CA</th>
                                <th className="py-2 px-3">Exam</th>
                                <th className="py-2 px-3">Total</th>
                                <th className="py-2 px-3">Grade</th>
                                <th className="py-2 px-3">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {(selectedCourse.caResults || []).map((r: any) => (
                                <tr key={r.id}>
                                  <td className="py-2 px-3 font-bold">{r.student?.user?.name}</td>
                                  <td className="py-2 px-3">{r.caScore}</td>
                                  <td className="py-2 px-3">{r.examScore}</td>
                                  <td className="py-2 px-3 font-bold">{r.totalScore}%</td>
                                  <td className="py-2 px-3 font-bold text-emerald-700">{r.grade}</td>
                                  <td className="py-2 px-3">{r.status}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* TAB: ASSIGNMENTS & SUBMISSIONS */}
              {activeTab === 'assignments' && (
                <div className="space-y-5">
                  <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h2 className="font-bold text-slate-900 text-base">
                        Assignments &amp; Submission Grading
                      </h2>
                      <p className="text-xs text-slate-500">
                        Create, publish, close assignments, and grade or return student submissions.
                      </p>
                    </div>
                    <button
                      onClick={() => openCreateAssignment()}
                      className="flex items-center gap-1.5 bg-[#073832] hover:bg-emerald-900 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition self-start sm:self-auto"
                    >
                      <PlusCircle className="w-3.5 h-3.5" /> New Assignment
                    </button>
                  </div>

                  {allAssignments.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-xs text-slate-500">
                      No assignments created yet.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {allAssignments.map((asg: any) => (
                        <div
                          key={asg.id}
                          className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-4"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded">
                                  {asg.courseCode}
                                </span>
                                <span
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                    asg.status === 'PUBLISHED'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : asg.status === 'CLOSED'
                                        ? 'bg-slate-200 text-slate-700'
                                        : 'bg-amber-100 text-amber-800'
                                  }`}
                                >
                                  {asg.status}
                                </span>
                              </div>
                              <h3 className="font-bold text-slate-900 text-sm mt-1">{asg.title}</h3>
                              <p className="text-xs text-slate-500 mt-0.5">
                                Due: <span className="font-mono">{asg.deadline}</span> · Max Marks:{' '}
                                {asg.maxMarks} · Late: {asg.allowLate ? 'Allowed' : 'No'} ·
                                Resubmission: {asg.allowResubmission ? 'Allowed' : 'No'}
                              </p>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 text-xs">
                              <button
                                onClick={() => openEditAssignment(asg)}
                                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg"
                              >
                                Edit
                              </button>
                              {asg.status !== 'PUBLISHED' ? (
                                <button
                                  onClick={() => handleToggleAssignmentStatus(asg, 'PUBLISHED')}
                                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg flex items-center gap-1"
                                >
                                  <Unlock className="w-3 h-3" /> Publish
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleToggleAssignmentStatus(asg, 'CLOSED')}
                                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg flex items-center gap-1"
                                >
                                  <Lock className="w-3 h-3" /> Close
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Stored Marking Rubric Summary */}
                          {(asg.expectedAnswer || asg.rubricJson) && (
                            <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-100 text-xs space-y-1">
                              <div className="font-bold text-emerald-900">
                                Stored Automated Marking Rubric
                              </div>
                              {asg.expectedAnswer && (
                                <p className="text-slate-700 line-clamp-2">
                                  <strong>Expected Answer:</strong> {asg.expectedAnswer}
                                </p>
                              )}
                            </div>
                          )}

                          {/* Submissions Table */}
                          <div className="border-t border-slate-100 pt-3">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="text-xs font-bold text-slate-700">
                                Submissions ({asg.submissions?.length ?? 0})
                              </h4>
                              {(asg.submissions || []).some(
                                (s: any) => s.evaluationStatus === 'FAILED'
                              ) && (
                                <button
                                  onClick={() => handleRetryAutoGrading(asg.id)}
                                  disabled={retryingSubmissionId === asg.id}
                                  className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold text-[11px]"
                                >
                                  {retryingSubmissionId === asg.id
                                    ? 'Retrying...'
                                    : 'Retry Failed Auto-Grading'}
                                </button>
                              )}
                            </div>
                            {(asg.submissions || []).length === 0 ? (
                              <p className="text-xs text-slate-400">No student submissions yet.</p>
                            ) : (
                              <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                  <thead className="bg-slate-50 text-slate-400 uppercase font-bold">
                                    <tr>
                                      <th className="py-2 px-3">Student</th>
                                      <th className="py-2 px-3">Submitted</th>
                                      <th className="py-2 px-3">Evaluation</th>
                                      <th className="py-2 px-3">AI Score</th>
                                      <th className="py-2 px-3">Feedback</th>
                                      <th className="py-2 px-3 text-right">Action</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {asg.submissions.map((sub: any) => {
                                      const evalStatus = sub.evaluationStatus || 'PENDING';
                                      return (
                                        <tr key={sub.id}>
                                          <td className="py-2.5 px-3 font-bold text-slate-900">
                                            {sub.student?.user?.name || sub.studentId}
                                          </td>
                                          <td className="py-2.5 px-3 text-slate-500">
                                            {new Date(sub.submittedAt).toLocaleDateString()}
                                            {sub.isLate && (
                                              <span className="ml-1.5 text-[10px] font-bold text-rose-600">
                                                (LATE)
                                              </span>
                                            )}
                                          </td>
                                          <td className="py-2.5 px-3">
                                            <span
                                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                evalStatus === 'COMPLETED'
                                                  ? 'bg-emerald-100 text-emerald-800'
                                                  : evalStatus === 'FAILED'
                                                    ? 'bg-rose-100 text-rose-800'
                                                    : 'bg-amber-100 text-amber-800'
                                              }`}
                                            >
                                              {evalStatus}
                                            </span>
                                          </td>
                                          <td className="py-2.5 px-3 font-mono font-bold">
                                            {evalStatus === 'FAILED'
                                              ? 'Pending Retry'
                                              : sub.score !== null && sub.score !== undefined
                                                ? `${sub.score}/${asg.maxMarks}`
                                                : '—'}
                                          </td>
                                          <td className="py-2.5 px-3 text-slate-600 max-w-xs truncate">
                                            {sub.feedback || sub.errorMessage || '—'}
                                          </td>
                                          <td className="py-2.5 px-3 text-right">
                                            {evalStatus === 'FAILED' ? (
                                              <button
                                                onClick={() =>
                                                  handleRetryAutoGrading(asg.id, sub.id)
                                                }
                                                disabled={retryingSubmissionId === sub.id}
                                                className="px-3 py-1 bg-[#073832] hover:bg-emerald-900 text-white rounded-lg font-bold text-[11px] disabled:opacity-50"
                                              >
                                                {retryingSubmissionId === sub.id
                                                  ? 'Retrying...'
                                                  : 'Retry Auto-Grading'}
                                              </button>
                                            ) : (
                                              <span className="text-[11px] font-semibold text-emerald-700">
                                                Auto-Graded
                                              </span>
                                            )}
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB: EXAMINATIONS & QUESTION INSIGHTS */}
              {activeTab === 'examinations' && (
                <div className="space-y-5">
                  <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h2 className="font-bold text-slate-900 text-base">
                        Examinations &amp; Question Performance Insights
                      </h2>
                      <p className="text-xs text-slate-500">
                        View course exam schedules, automated grading completion, and item-level
                        analytics (read-only, zero manual exam marking).
                      </p>
                    </div>
                  </div>

                  {examinations.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-xs text-slate-500">
                      No examinations scheduled for your assigned courses yet.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {examinations.map((exam: any) => (
                        <div
                          key={exam.id}
                          className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-4"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-mono text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded">
                                  {exam.course?.code}
                                </span>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                                  {exam.examType} · {exam.mode}
                                </span>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                                  {exam.status}
                                </span>
                              </div>
                              <h3 className="font-bold text-slate-900 text-sm mt-1">
                                {exam.title}
                              </h3>
                              <p className="text-xs text-slate-500 mt-0.5">
                                {exam.scheduledDate} {exam.scheduledTime} · {exam.venue} ·{' '}
                                {exam.durationMinutes} mins · {exam.totalMarks} marks (Pass:{' '}
                                {exam.passMark})
                              </p>
                            </div>

                            <button
                              onClick={() => setProposeExamId(exam.id)}
                              className="px-3 py-1.5 bg-[#073832] hover:bg-emerald-900 text-white text-xs font-bold rounded-xl flex items-center gap-1 self-start sm:self-auto"
                            >
                              <PlusCircle className="w-3.5 h-3.5" /> Propose Question
                            </button>
                          </div>

                          {/* Automated Grading Status Summary */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                              <span className="text-[10px] font-bold text-slate-400 uppercase block">
                                Total Attempts
                              </span>
                              <span className="font-black text-slate-900 text-sm">
                                {exam.gradingSummary?.totalAttempts ?? 0}
                              </span>
                            </div>
                            <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-100">
                              <span className="text-[10px] font-bold text-emerald-700 uppercase block">
                                Auto-Graded
                              </span>
                              <span className="font-black text-emerald-900 text-sm">
                                {exam.gradingSummary?.completedCount ?? 0}
                              </span>
                            </div>
                            <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-100">
                              <span className="text-[10px] font-bold text-amber-700 uppercase block">
                                Needs Verification
                              </span>
                              <span className="font-black text-amber-900 text-sm">
                                {exam.gradingSummary?.needsVerificationCount ?? 0}
                              </span>
                            </div>
                            <div className="p-2.5 rounded-xl bg-rose-50/70 border border-rose-100">
                              <span className="text-[10px] font-bold text-rose-700 uppercase block">
                                Failed Eval
                              </span>
                              <span className="font-black text-rose-900 text-sm">
                                {exam.gradingSummary?.failedCount ?? 0}
                              </span>
                            </div>
                          </div>

                          {/* Question Insights Table */}
                          <div className="border-t border-slate-100 pt-3">
                            <h4 className="text-xs font-bold text-slate-700 mb-2">
                              Question Insights ({exam.questionInsights?.length ?? 0})
                            </h4>
                            {(exam.questionInsights || []).length === 0 ? (
                              <p className="text-xs text-slate-400">
                                No questions added to this examination yet.
                              </p>
                            ) : (
                              <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                  <thead className="bg-slate-50 text-slate-400 uppercase font-bold">
                                    <tr>
                                      <th className="py-2 px-3">#</th>
                                      <th className="py-2 px-3">Question</th>
                                      <th className="py-2 px-3">Type</th>
                                      <th className="py-2 px-3">Answered</th>
                                      <th className="py-2 px-3">Correct %</th>
                                      <th className="py-2 px-3">Avg Marks</th>
                                      <th className="py-2 px-3">Difficulty</th>
                                      <th className="py-2 px-3">Common Wrong Answers</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {exam.questionInsights.map((qi: any) => (
                                      <tr key={qi.id}>
                                        <td className="py-2 px-3 font-mono font-bold">
                                          {qi.orderIndex}
                                        </td>
                                        <td className="py-2 px-3 font-medium text-slate-800 max-w-xs truncate">
                                          {qi.text}
                                        </td>
                                        <td className="py-2 px-3 font-mono text-[11px]">
                                          {qi.questionType}
                                        </td>
                                        <td className="py-2 px-3 font-mono">{qi.answeredCount}</td>
                                        <td className="py-2 px-3 font-mono font-bold">
                                          {qi.correctPct}%
                                        </td>
                                        <td className="py-2 px-3 font-mono">
                                          {qi.avgMarks}/{qi.marks}
                                        </td>
                                        <td className="py-2 px-3">
                                          <span
                                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                              qi.difficultyIndicator === 'EASY'
                                                ? 'bg-emerald-100 text-emerald-800'
                                                : qi.difficultyIndicator === 'MODERATE'
                                                  ? 'bg-amber-100 text-amber-800'
                                                  : qi.difficultyIndicator === 'HARD'
                                                    ? 'bg-rose-100 text-rose-800'
                                                    : 'bg-slate-100 text-slate-600'
                                            }`}
                                          >
                                            {qi.difficultyIndicator}
                                          </span>
                                        </td>
                                        <td className="py-2 px-3 text-[11px] text-slate-500">
                                          {(qi.frequentWrongOptions || []).length === 0
                                            ? '—'
                                            : qi.frequentWrongOptions
                                                .map((w: any) => `${w.option} (${w.count})`)
                                                .join(', ')}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB: TIMETABLE (DAILY / WEEKLY / MONTHLY) */}
              {activeTab === 'timetable' && (
                <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h2 className="font-bold text-slate-900 text-base">
                        Teaching Timetable
                      </h2>
                      <p className="text-xs text-slate-500">
                        Personal class schedule across your assigned courses.
                      </p>
                    </div>
                    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold">
                      {(['daily', 'weekly', 'monthly'] as TimetableView[]).map((v) => (
                        <button
                          key={v}
                          onClick={() => setTimetableView(v)}
                          className={`px-3 py-1.5 rounded-lg capitalize transition ${
                            timetableView === v
                              ? 'bg-[#073832] text-white'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          {v}
                        </button>
                      ))}
                    </div>
                  </div>

                  {timetableView === 'daily' && (
                    <div className="space-y-4">
                      <div className="flex flex-wrap gap-2">
                        {DAYS_ORDER.map((day) => (
                          <button
                            key={day}
                            onClick={() => setSelectedDay(day)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold ${
                              selectedDay === day
                                ? 'bg-emerald-700 text-white'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {day}
                          </button>
                        ))}
                      </div>
                      <div className="space-y-2.5">
                        {timetable.filter((s) => s.dayOfWeek === selectedDay).length === 0 ? (
                          <p className="text-xs text-slate-400 py-4">
                            No classes scheduled for {selectedDay}.
                          </p>
                        ) : (
                          timetable
                            .filter((s) => s.dayOfWeek === selectedDay)
                            .map((s) => (
                              <div
                                key={s.id}
                                className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs"
                              >
                                <div>
                                  <div className="font-bold text-emerald-800">
                                    {s.course?.code} — {s.course?.title}
                                  </div>
                                  <div className="text-slate-500 mt-0.5">
                                    {s.startTime} - {s.endTime} · {s.sessionType}
                                  </div>
                                </div>
                                <span className="font-semibold text-slate-700 bg-white px-3 py-1 rounded-lg border border-slate-200">
                                  {s.venue} {s.room ? `(${s.room})` : ''}
                                </span>
                              </div>
                            ))
                        )}
                      </div>
                    </div>
                  )}

                  {timetableView === 'weekly' && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-500 font-semibold uppercase border-b border-slate-200">
                          <tr>
                            <th className="py-3 px-4">Day</th>
                            <th className="py-3 px-4">Time</th>
                            <th className="py-3 px-4">Course</th>
                            <th className="py-3 px-4">Type</th>
                            <th className="py-3 px-4">Venue</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {timetable.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="py-8 text-center text-slate-400">
                                No teaching schedule entries found.
                              </td>
                            </tr>
                          ) : (
                            timetable.map((s: any) => (
                              <tr key={s.id}>
                                <td className="py-3 px-4 font-bold text-slate-900">
                                  {s.dayOfWeek}
                                </td>
                                <td className="py-3 px-4 font-mono">
                                  {s.startTime} - {s.endTime}
                                </td>
                                <td className="py-3 px-4 font-medium text-emerald-800">
                                  {s.course?.code} — {s.course?.title}
                                </td>
                                <td className="py-3 px-4">{s.sessionType}</td>
                                <td className="py-3 px-4">
                                  {s.venue} {s.room ? `(${s.room})` : ''}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {timetableView === 'monthly' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {DAYS_ORDER.map((day) => {
                        const daySlots = timetable.filter((s) => s.dayOfWeek === day);
                        return (
                          <div
                            key={day}
                            className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2"
                          >
                            <div className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                              Every {day}
                            </div>
                            {daySlots.length === 0 ? (
                              <p className="text-[11px] text-slate-400">No sessions</p>
                            ) : (
                              daySlots.map((s) => (
                                <div
                                  key={s.id}
                                  className="p-2.5 bg-white rounded-lg border border-slate-200 text-xs"
                                >
                                  <div className="font-bold text-emerald-800">{s.course?.code}</div>
                                  <div className="text-[11px] text-slate-600">
                                    {s.startTime} - {s.endTime} · {s.venue}
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* TAB: ANNOUNCEMENTS */}
              {activeTab === 'announcements' && (
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                  <form
                    onSubmit={handlePublishAnnouncement}
                    className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-3 text-xs self-start"
                  >
                    <h2 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                      <Megaphone className="w-4 h-4 text-emerald-700" /> Publish Announcement
                    </h2>

                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">Course</label>
                      <select
                        required
                        value={annCourseId}
                        onChange={(e) => {
                          setAnnCourseId(e.target.value);
                          setAnnCohortId('');
                        }}
                        className="w-full p-2 border border-slate-200 rounded-xl bg-slate-50"
                      >
                        {courses.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.code} - {c.title}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="font-semibold text-slate-700 block mb-1">
                          Cohort (Optional)
                        </label>
                        <select
                          value={annCohortId}
                          onChange={(e) => setAnnCohortId(e.target.value)}
                          className="w-full p-2 border border-slate-200 rounded-xl bg-slate-50"
                        >
                          <option value="">All Enrolled</option>
                          {cohortOptions.map((ch) => (
                            <option key={ch.id} value={ch.id}>
                              {ch.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="font-semibold text-slate-700 block mb-1">Priority</label>
                        <select
                          value={annPriority}
                          onChange={(e) => setAnnPriority(e.target.value)}
                          className="w-full p-2 border border-slate-200 rounded-xl bg-slate-50"
                        >
                          <option value="NORMAL">Normal</option>
                          <option value="HIGH">High</option>
                          <option value="URGENT">Urgent</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">Title</label>
                      <input
                        type="text"
                        required
                        value={annTitle}
                        onChange={(e) => setAnnTitle(e.target.value)}
                        placeholder="e.g. Clinical Lab Rescheduled"
                        className="w-full p-2 border border-slate-200 rounded-xl"
                      />
                    </div>

                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">Message</label>
                      <textarea
                        rows={4}
                        required
                        value={annContent}
                        onChange={(e) => setAnnContent(e.target.value)}
                        placeholder="Write announcement for enrolled students..."
                        className="w-full p-2 border border-slate-200 rounded-xl"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={postingAnn}
                      className="w-full py-2.5 bg-[#073832] hover:bg-emerald-900 text-white font-bold rounded-xl flex items-center justify-center gap-1.5"
                    >
                      <Send className="w-3.5 h-3.5" />
                      {postingAnn ? 'Publishing...' : 'Publish & Notify Students'}
                    </button>
                  </form>

                  <div className="lg:col-span-3 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
                    <h2 className="font-bold text-slate-900 text-sm">Published Announcements</h2>
                    {announcements.length === 0 ? (
                      <p className="text-xs text-slate-400 py-6">No announcements yet.</p>
                    ) : (
                      <div className="space-y-3">
                        {announcements.map((ann) => (
                          <div
                            key={ann.id}
                            className="p-4 rounded-xl bg-slate-50 border border-slate-200/70 text-xs space-y-1.5"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-emerald-800">
                                {ann.course?.code} — {ann.course?.title}
                              </span>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                                {ann.priority}
                              </span>
                            </div>
                            <div className="font-bold text-slate-900 text-sm">{ann.title}</div>
                            <p className="text-slate-600">{ann.content}</p>
                            <div className="text-[11px] text-slate-400">
                              {new Date(ann.createdAt).toLocaleString()}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB: LECTURER PROFILE */}
              {activeTab === 'profile' && (
                <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-5">
                  <div className="flex items-center gap-4 border-b border-slate-100 pb-4">
                    <div className="w-14 h-14 rounded-2xl bg-[#073832] text-white flex items-center justify-center font-black text-xl">
                      {(lecturer?.name || 'L')[0]}
                    </div>
                    <div>
                      <h2 className="font-bold text-slate-900 text-lg">
                        {lecturer?.name || 'Lecturer'}
                      </h2>
                      <p className="text-xs text-slate-500">
                        {lecturer?.email} · Role: {lecturer?.role}
                      </p>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-slate-400 font-bold uppercase text-[10px]">
                        Staff ID
                      </span>
                      <div className="font-mono font-bold text-slate-900 mt-1">
                        {lecturer?.lecturerProfile?.staffId || 'Not assigned'}
                      </div>
                    </div>
                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-slate-400 font-bold uppercase text-[10px]">
                        Department
                      </span>
                      <div className="font-bold text-slate-900 mt-1">
                        {lecturer?.lecturerProfile?.department?.name || 'General'}
                      </div>
                    </div>
                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-slate-400 font-bold uppercase text-[10px]">
                        Employment Status
                      </span>
                      <div className="font-bold text-emerald-700 mt-1">
                        {lecturer?.lecturerProfile?.employmentStatus || 'ACTIVE'}
                      </div>
                    </div>
                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-slate-400 font-bold uppercase text-[10px]">
                        Qualifications
                      </span>
                      <div className="font-semibold text-slate-800 mt-1">
                        {lecturer?.lecturerProfile?.qualifications || '—'}
                      </div>
                    </div>
                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-slate-400 font-bold uppercase text-[10px]">
                        Specialization
                      </span>
                      <div className="font-semibold text-slate-800 mt-1">
                        {lecturer?.lecturerProfile?.specialization || '—'}
                      </div>
                    </div>
                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-slate-400 font-bold uppercase text-[10px]">
                        Office &amp; Phone
                      </span>
                      <div className="font-semibold text-slate-800 mt-1">
                        {lecturer?.lecturerProfile?.officeLocation || '—'} ·{' '}
                        {lecturer?.lecturerProfile?.phone || lecturer?.phone || '—'}
                      </div>
                    </div>
                  </div>

                  {lecturer?.lecturerProfile?.bio && (
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-600">
                      <strong className="text-slate-800 block mb-1">Biography</strong>
                      {lecturer.lecturerProfile.bio}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* MODAL: CREATE / EDIT ASSIGNMENT */}
      {showAssignmentModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base">
                {editingAssignment ? 'Edit Assignment' : 'Create Course Assignment'}
              </h3>
              <button
                onClick={() => setShowAssignmentModal(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAssignment} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Course</label>
                <select
                  value={asgCourseId}
                  onChange={(e) => setAsgCourseId(e.target.value)}
                  disabled={Boolean(editingAssignment)}
                  className="w-full p-2 border border-slate-200 rounded-xl"
                >
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} - {c.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={asgTitle}
                  onChange={(e) => setAsgTitle(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Instructions</label>
                <textarea
                  rows={3}
                  required
                  value={asgDesc}
                  onChange={(e) => setAsgDesc(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Due Date</label>
                  <input
                    type="date"
                    required
                    value={asgDeadline}
                    onChange={(e) => setAsgDeadline(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Max Marks</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={asgMaxMarks}
                    onChange={(e) => setAsgMaxMarks(Number(e.target.value))}
                    className="w-full p-2 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Status</label>
                  <select
                    value={asgStatus}
                    onChange={(e) => setAsgStatus(e.target.value as any)}
                    className="w-full p-2 border border-slate-200 rounded-xl"
                  >
                    <option value="DRAFT">DRAFT</option>
                    <option value="PUBLISHED">PUBLISHED</option>
                    <option value="CLOSED">CLOSED</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Allowed Formats</label>
                  <input
                    type="text"
                    value={asgAllowedFormats}
                    onChange={(e) => setAsgAllowedFormats(e.target.value)}
                    placeholder="PDF, DOCX"
                    className="w-full p-2 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Attachment URL (Optional)
                  </label>
                  <input
                    type="text"
                    value={asgAttachmentUrl}
                    onChange={(e) => setAsgAttachmentUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full p-2 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="flex items-center gap-4 pt-1">
                <label className="flex items-center gap-1.5 font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={asgAllowLate}
                    onChange={(e) => setAsgAllowLate(e.target.checked)}
                  />
                  Allow Late Submissions
                </label>
                <label className="flex items-center gap-1.5 font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={asgAllowResubmission}
                    onChange={(e) => setAsgAllowResubmission(e.target.checked)}
                  />
                  Allow Resubmission
                </label>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAssignmentModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl font-semibold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#073832] hover:bg-emerald-900 text-white rounded-xl font-bold"
                >
                  {editingAssignment ? 'Save Changes' : 'Save Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: PROPOSE EXAM QUESTION */}
      {proposeExamId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base">
                Propose Examination Question
              </h3>
              <button
                onClick={() => setProposeExamId(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleProposeQuestion} className="space-y-3 text-xs">
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Type</label>
                  <select
                    value={qType}
                    onChange={(e) => setQType(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-xl"
                  >
                    <option value="MCQ">MCQ</option>
                    <option value="TRUE_FALSE">TRUE_FALSE</option>
                    <option value="FILL_BLANK">FILL_BLANK</option>
                    <option value="SHORT_ANSWER">SHORT_ANSWER</option>
                    <option value="SCENARIO">SCENARIO</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Difficulty</label>
                  <select
                    value={qDifficulty}
                    onChange={(e) => setQDifficulty(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-xl"
                  >
                    <option value="EASY">EASY</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="DIFFICULT">DIFFICULT</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Marks</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={qMarks}
                    onChange={(e) => setQMarks(Number(e.target.value))}
                    className="w-full p-2 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Question Prompt</label>
                <textarea
                  rows={3}
                  required
                  value={qText}
                  onChange={(e) => setQText(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-xl"
                />
              </div>

              {qType === 'MCQ' && (
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Options (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={qOptions}
                    onChange={(e) => setQOptions(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-xl"
                  />
                </div>
              )}

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Correct / Expected Answer
                </label>
                <input
                  type="text"
                  required
                  value={qCorrectAnswer}
                  onChange={(e) => setQCorrectAnswer(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setProposeExamId(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl font-semibold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingQuestion}
                  className="px-4 py-2 bg-[#073832] hover:bg-emerald-900 text-white rounded-xl font-bold"
                >
                  {savingQuestion ? 'Saving...' : 'Add Question'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
