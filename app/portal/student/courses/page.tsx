'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  BookOpen,
  User,
  ArrowRight,
  CheckCircle,
  Printer,
  Check,
  AlertCircle,
  Lock,
  FileText,
  CalendarCheck,
} from 'lucide-react';
import StudentHeader from '@/components/StudentHeader';

export default function StudentCoursesPage() {
  const [courses, setCourses] = useState<any[]>([]);
  const [availableCourses, setAvailableCourses] = useState<any[]>([]);
  const [registeredCourses, setRegisteredCourses] = useState<any[]>([]);
  const [attendanceByCourse, setAttendanceByCourse] = useState<Record<string, any>>({});
  const [studentMeta, setStudentMeta] = useState<any>(null);
  const [trackConfig, setTrackConfig] = useState<any>(null);
  const [availableTracks, setAvailableTracks] = useState<any[]>([]);
  const [switchingTrack, setSwitchingTrack] = useState(false);
  const [learningTopics, setLearningTopics] = useState<any[]>([]);
  const [totalCredits, setTotalCredits] = useState(0);
  const [maxCreditLimit, setMaxCreditLimit] = useState(24);
  const [activeTab, setActiveTab] = useState<'enrolled' | 'registration'>('enrolled');
  const [loading, setLoading] = useState(true);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [coursesRes, regRes, attRes, lcRes] = await Promise.all([
        fetch('/api/student/courses').then((r) => r.json()),
        fetch('/api/student/registration').then((r) => r.json()),
        fetch('/api/student/attendance').then((r) => r.json()).catch(() => ({})),
        fetch('/api/student/learning-center').then((r) => r.json()).catch(() => ({})),
      ]);

      if (coursesRes.courses) {
        setCourses(coursesRes.courses);
      }
      if (Array.isArray(lcRes.topics)) {
        setLearningTopics(lcRes.topics);
      }
      if (regRes.availableCourses) setAvailableCourses(regRes.availableCourses);
      if (regRes.registeredCourses) setRegisteredCourses(regRes.registeredCourses);
      if (regRes.student) setStudentMeta(regRes.student);
      if (regRes.trackConfig) setTrackConfig(regRes.trackConfig);
      if (Array.isArray(regRes.availableTracks)) setAvailableTracks(regRes.availableTracks);
      if (typeof regRes.totalRegisteredCredits === 'number') {
        setTotalCredits(regRes.totalRegisteredCredits);
      }
      if (typeof regRes.maxCreditLimit === 'number') {
        setMaxCreditLimit(regRes.maxCreditLimit);
      }
      if (Array.isArray(attRes.courseBreakdown)) {
        const map: Record<string, any> = {};
        for (const item of attRes.courseBreakdown) {
          map[item.courseId] = item;
        }
        setAttendanceByCourse(map);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRegister = async (courseId: string) => {
    setActionError(null);
    setActionSuccess(null);
    try {
      const res = await fetch('/api/student/registration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'register', courseId }),
      });
      const d = await res.json();
      if (res.ok && d.status) {
        setActionSuccess('Course registered successfully!');
        await loadData();
        setTimeout(() => setActionSuccess(null), 3500);
      } else {
        setActionError(d.error || 'Failed to register course.');
      }
    } catch (e) {
      console.error(e);
      setActionError('Network error while registering course.');
    }
  };

  const handleDrop = async (courseId: string) => {
    if (!confirm('Are you sure you want to drop this course?')) return;
    setActionError(null);
    setActionSuccess(null);
    try {
      const res = await fetch('/api/student/registration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'drop', courseId }),
      });
      const d = await res.json();
      if (res.ok && d.status) {
        setActionSuccess('Course dropped successfully.');
        await loadData();
        setTimeout(() => setActionSuccess(null), 3500);
      } else {
        setActionError(d.error || 'Failed to drop course.');
      }
    } catch (e) {
      console.error(e);
      setActionError('Network error while dropping course.');
    }
  };

  const handleSetTrack = async (studyTrack: '6_MONTH' | '12_MONTH') => {
    if (studentMeta?.studyTrack === studyTrack) return;
    setSwitchingTrack(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      const res = await fetch('/api/student/registration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'set_track', studyTrack }),
      });
      const d = await res.json();
      if (res.ok && d.status !== false) {
        setActionSuccess(`Study track updated to ${studyTrack === '6_MONTH' ? '6-Month Intensive Track' : '12-Month Standard Track'}.`);
        await loadData();
        setTimeout(() => setActionSuccess(null), 3500);
      } else {
        setActionError(d.error || 'Failed to update study track.');
      }
    } catch {
      setActionError('Network error while updating study track.');
    } finally {
      setSwitchingTrack(false);
    }
  };

  const regByCourseId = new Map(registeredCourses.map((r: any) => [r.courseId, r]));

  const computeCourseProgress = (course: any) => {
    if (typeof course.enrollments?.[0]?.progressPercent === 'number') {
      return course.enrollments[0].progressPercent;
    }
    const topics = (course.modules || []).flatMap((m: any) => m.topics || []);
    if (topics.length === 0) return 0;
    const completed = topics.filter((t: any) => t.progress?.[0]?.completed).length;
    return Math.round((completed / topics.length) * 100);
  };

  return (
    <>
      <StudentHeader
        title="Courses & Registration (Ghana)"
        subtitle="Active Curriculum, Assigned Lecturers, and Semester Course Add/Drop"
      />

      <main className="p-4 sm:p-8 max-w-7xl mx-auto w-full space-y-6 font-sans">
        {actionSuccess && (
          <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            {actionSuccess}
          </div>
        )}

        {actionError && (
          <div className="bg-rose-50 border border-rose-300 text-rose-800 px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            {actionError}
          </div>
        )}

        {/* 6-Month vs 12-Month Study Track Banner */}
        {(studentMeta || trackConfig) && (
          <div className="bg-gradient-to-r from-[#073832] to-emerald-900 text-white rounded-3xl p-5 sm:p-6 shadow-md flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-400/20 text-emerald-200 border border-emerald-400/30">
                  Active Study Track
                </span>
                <span className="text-xs font-bold text-emerald-300">
                  {trackConfig?.label || (studentMeta?.studyTrack === '6_MONTH' ? '6-Month Intensive Track' : '12-Month Standard Track')}
                </span>
              </div>
              <p className="text-xs text-emerald-100/85 max-w-2xl">
                {trackConfig?.description ||
                  (studentMeta?.studyTrack === '6_MONTH'
                    ? 'Complete Modules 1–13 in 1 intensive 6-month semester, followed by your Final Examination.'
                    : 'Complete Modules 1–13 over 12 months (2 semesters) with End-of-Semester and Final Examinations.')}
              </p>
              {Array.isArray(trackConfig?.requiredExams) && trackConfig.requiredExams.length > 0 && (
                <p className="text-[11px] text-emerald-200/90 font-semibold">
                  Required Exams: {trackConfig.requiredExams.join(' → ')}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2 bg-emerald-950/50 p-1.5 rounded-2xl border border-emerald-700/50 shrink-0">
              {(availableTracks.length > 0
                ? availableTracks
                : [
                    { code: '6_MONTH', label: '6-Month Track' },
                    { code: '12_MONTH', label: '12-Month Track' },
                  ]
              ).map((tr: any) => {
                const isSelected = (studentMeta?.studyTrack || '12_MONTH') === tr.code;
                return (
                  <button
                    key={tr.code}
                    type="button"
                    disabled={switchingTrack}
                    onClick={() => handleSetTrack(tr.code)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition ${
                      isSelected
                        ? 'bg-emerald-400 text-slate-950 shadow-sm'
                        : 'text-emerald-100 hover:bg-white/10'
                    }`}
                  >
                    {tr.code === '6_MONTH' ? '6-Month Track' : '12-Month Track'}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab Controls */}
        <div className="bg-white p-3 rounded-2xl border border-slate-200/90 shadow-sm flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2 text-xs font-bold">
            <button
              onClick={() => setActiveTab('enrolled')}
              className={`px-4 py-2 rounded-xl transition ${
                activeTab === 'enrolled' ? 'bg-emerald-700 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              My Registered Courses ({courses.length})
            </button>
            <button
              onClick={() => setActiveTab('registration')}
              className={`px-4 py-2 rounded-xl transition ${
                activeTab === 'registration' ? 'bg-emerald-700 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Course Registration &amp; Add/Drop
            </button>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-xs font-bold px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700">
              Credits: <span className="text-emerald-800">{totalCredits}</span> / {maxCreditLimit}
            </div>
            {activeTab === 'registration' && (
              <button
                onClick={() => window.print()}
                className="hidden sm:flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-xl transition"
              >
                <Printer className="w-3.5 h-3.5" /> Print Registration Slip
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="bg-white rounded-3xl p-12 text-center text-xs text-slate-500 border border-slate-200">
            Loading courses and registration records...
          </div>
        ) : null}

        {/* TAB 1: ENROLLED COURSES */}
        {!loading && activeTab === 'enrolled' && (
          <>
            {courses.length === 0 ? (
              <div className="bg-white rounded-3xl p-10 text-center border border-slate-200 space-y-3">
                <BookOpen className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-sm font-bold text-slate-700">No registered courses found for this semester.</p>
                <button
                  onClick={() => setActiveTab('registration')}
                  className="px-4 py-2 bg-emerald-700 text-white text-xs font-bold rounded-xl hover:bg-emerald-800 transition"
                >
                  Go to Course Registration
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {courses.map((course) => {
                  const progress = computeCourseProgress(course);
                  const lecturersList = course.lecturers?.length
                    ? course.lecturers
                    : course.lecturer
                    ? [course.lecturer]
                    : [];
                  const attStat = attendanceByCourse[course.id];
                  const asgSummary = course.assignmentSummary;

                  return (
                    <div
                      key={course.id}
                      className="bg-white rounded-3xl border border-slate-200/90 shadow-sm hover:shadow-xl hover:border-emerald-300 transition-all flex flex-col justify-between overflow-hidden group"
                    >
                      <div>
                        <div className="relative h-44 w-full bg-slate-100 overflow-hidden">
                          <Image
                            src={
                              course.thumbnail ||
                              'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=600&auto=format&fit=crop&q=80'
                            }
                            alt={course.title}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-sm text-[#073832] font-bold text-xs px-2.5 py-1 rounded-full shadow-sm">
                            {course.code}
                          </div>
                        </div>

                        <div className="p-6 space-y-3">
                          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                            <span>{course.semester || 'First Semester'}</span>
                            <span>•</span>
                            <span>{course.creditHours} Credit Hours</span>
                          </div>

                          <h3 className="text-lg font-bold text-slate-900 group-hover:text-emerald-800 transition-colors leading-snug">
                            {course.title}
                          </h3>

                          <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                            {course.description}
                          </p>

                          {/* Assigned Lecturers */}
                          <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 px-3 py-2 rounded-xl border border-slate-100">
                            <User className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                            <span className="truncate font-medium">
                              {lecturersList.length > 0
                                ? lecturersList.map((l: any) => `${l.title ? l.title + ' ' : ''}${l.name}`).join(', ')
                                : 'Faculty Lecturer'}
                            </span>
                          </div>

                          {/* Course-level Attendance & Assignments Summary */}
                          <div className="grid grid-cols-2 gap-2 text-[11px]">
                            <div className="bg-slate-50 px-2.5 py-2 rounded-xl border border-slate-100 flex items-center gap-1.5">
                              <CalendarCheck className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                              <div>
                                <div className="text-slate-400 font-semibold">Attendance</div>
                                <div className={`font-bold ${attStat?.belowThreshold ? 'text-rose-600' : 'text-slate-800'}`}>
                                  {attStat && attStat.totalSessions > 0 ? `${attStat.attendanceRate}%` : 'No sessions'}
                                </div>
                              </div>
                            </div>
                            <div className="bg-slate-50 px-2.5 py-2 rounded-xl border border-slate-100 flex items-center gap-1.5">
                              <FileText className="w-3.5 h-3.5 text-teal-700 shrink-0" />
                              <div>
                                <div className="text-slate-400 font-semibold">Assignments</div>
                                <div className="font-bold text-slate-800">
                                  {asgSummary ? `${asgSummary.submitted}/${asgSummary.total} done` : '0/0'}
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="pt-2 border-t border-slate-100 space-y-1.5">
                            <div className="flex items-center justify-between text-xs font-semibold">
                              <span className="text-slate-500">Curriculum Progress</span>
                              <span className="text-emerald-800 font-bold">{progress}%</span>
                            </div>
                            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                              <div
                                className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="p-6 pt-0">
                        <Link
                          href={`/portal/student/courses/${course.id}`}
                          className="w-full py-3 bg-[#073832] hover:bg-emerald-900 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 group-hover:gap-3"
                        >
                          <span>Open Course Workspace</span>
                          <ArrowRight className="w-4 h-4 text-emerald-300" />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Module Tests (Modules 1-13) Section */}
            {learningTopics.length > 0 && (
              <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 sm:p-8 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      Module Tests &amp; Mastery Quizzes (Modules 1–13)
                    </h3>
                    <p className="text-xs text-slate-500">
                      Complete each module and take its Module Test to track your readiness for End-of-Semester &amp; Final Exams.
                    </p>
                  </div>
                  <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                    {learningTopics.filter((t) => t.mastery?.completed).length} / {learningTopics.length} Completed
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {learningTopics.map((t: any, idx: number) => {
                    const score = t.mastery?.bestScorePercent ?? t.mastery?.latestScorePercent;
                    const completed = Boolean(t.mastery?.completed);
                    return (
                      <div
                        key={t.id}
                        className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 flex flex-col justify-between gap-3"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                              Module {idx + 1}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                completed
                                  ? 'bg-emerald-600 text-white'
                                  : typeof score === 'number'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-slate-200 text-slate-600'
                              }`}
                            >
                              {typeof score === 'number'
                                ? `${score}% ${completed ? '· Passed' : '· Retry'}`
                                : 'Pending'}
                            </span>
                          </div>
                          <h4 className="text-xs font-bold text-slate-900 mt-2 line-clamp-2">
                            {t.title}
                          </h4>
                          <p className="text-[10px] text-slate-500 mt-0.5 truncate">
                            {t.materialTitle}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <Link
                            href={`/portal/student/topics/${t.id}`}
                            className="flex-1 text-center py-1.5 px-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-[11px] font-bold"
                          >
                            Study
                          </Link>
                          {t.primaryQuizId && (
                            <Link
                              href={`/portal/student/topic-quiz/${t.primaryQuizId}`}
                              className="flex-1 text-center py-1.5 px-2.5 rounded-xl bg-[#073832] hover:bg-emerald-900 text-white text-[11px] font-bold"
                            >
                              {typeof score === 'number' ? 'Retake Test' : 'Take Test'}
                            </Link>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}

        {/* TAB 2: COURSE REGISTRATION & ADD/DROP */}
        {!loading && activeTab === 'registration' && (
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {studentMeta?.academicYear || '2025/2026'} Academic Year • {studentMeta?.semester || 'First Semester'} Course Roster
                </h3>
                <p className="text-xs text-slate-500">
                  {studentMeta?.programme} ({studentMeta?.level}) · Maximum {maxCreditLimit} credit hours per semester.
                </p>
              </div>
              <div className="text-xs font-bold px-3.5 py-2 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200">
                Registered Credits: {totalCredits} / {maxCreditLimit}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider bg-slate-50">
                    <th className="py-3 px-4">Code</th>
                    <th className="py-3 px-4">Course Title</th>
                    <th className="py-3 px-4">Credits</th>
                    <th className="py-3 px-4">Lecturer(s)</th>
                    <th className="py-3 px-4">Prerequisites &amp; Type</th>
                    <th className="py-3 px-4 text-right">Registration Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {availableCourses.map((c) => {
                    const reg = regByCourseId.get(c.id);
                    const isLocked = reg?.approvalStatus === 'LOCKED' || reg?.status === 'LOCKED';
                    const lecturerNames = [
                      c.lecturer?.name,
                      ...(c.courseLecturers || []).map((cl: any) => cl.lecturer?.name),
                    ].filter(Boolean);
                    const uniqueLecturers = Array.from(new Set(lecturerNames));

                    return (
                      <tr key={c.id} className="hover:bg-slate-50/60 transition">
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{c.code}</td>
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900">{c.title}</div>
                          <div className="text-[11px] text-slate-400">{c.level} · {c.semester}</div>
                        </td>
                        <td className="py-3.5 px-4">{c.creditHours} Credits</td>
                        <td className="py-3.5 px-4 text-emerald-800 font-semibold">
                          {uniqueLecturers.length > 0 ? uniqueLecturers.join(', ') : 'Faculty Lecturer'}
                        </td>
                        <td className="py-3.5 px-4 space-y-1">
                          <div>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                              {c.isElective ? 'Elective' : 'Compulsory'}
                            </span>
                          </div>
                          {c.missingPrerequisites?.length > 0 && (
                            <div className="text-[10px] text-rose-600 font-semibold">
                              Requires: {c.missingPrerequisites.map((m: any) => m.code).join(', ')}
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          {c.isRegistered ? (
                            <div className="inline-flex items-center gap-2">
                              <span className="text-emerald-700 font-bold text-xs inline-flex items-center gap-1">
                                <Check className="w-3.5 h-3.5" /> {reg?.approvalStatus || 'APPROVED'}
                              </span>
                              {isLocked ? (
                                <span className="text-[11px] text-slate-400 inline-flex items-center gap-1 px-2 py-1 bg-slate-100 rounded-lg">
                                  <Lock className="w-3 h-3" /> Locked
                                </span>
                              ) : (
                                <button
                                  onClick={() => handleDrop(c.id)}
                                  className="text-xs bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold px-2.5 py-1 rounded-lg transition"
                                >
                                  Drop
                                </button>
                              )}
                            </div>
                          ) : (
                            <button
                              onClick={() => handleRegister(c.id)}
                              disabled={!c.isEligible}
                              title={!c.isEligible ? c.ineligibilityReasons?.join('; ') : 'Add Course'}
                              className={`font-bold px-3 py-1.5 rounded-lg text-xs shadow-sm transition ${
                                c.isEligible
                                  ? 'bg-emerald-700 hover:bg-emerald-800 text-white'
                                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                              }`}
                            >
                              {c.isEligible ? 'Add Course' : 'Prereq Needed'}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
