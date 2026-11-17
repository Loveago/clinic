'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Save,
  Check,
  AlertTriangle,
  CheckCircle,
  AlertCircle,
  Lock,
  Unlock,
  Plus,
} from 'lucide-react';
import DemoRoleSwitcher from '@/components/DemoRoleSwitcher';

type AttendanceStatus = 'PRESENT' | 'LATE' | 'ABSENT' | 'EXCUSED';

interface RosterEntry {
  studentId: string;
  matricNumber: string;
  name: string;
  cohortName: string;
  status: AttendanceStatus;
  notes: string;
}

export default function LecturerAttendanceMarkingPage() {
  const [courses, setCourses] = useState<any[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [selectedCohortId, setSelectedCohortId] = useState<string>('');
  const [threshold, setThreshold] = useState<number>(75);

  const [sessions, setSessions] = useState<any[]>([]);
  const [studentSummary, setStudentSummary] = useState<any[]>([]);
  const [enrolledStudents, setEnrolledStudents] = useState<any[]>([]);

  // Mode: 'new' or editing an existing session ID
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [sessionTitle, setSessionTitle] = useState('Lecture Session');
  const [sessionType, setSessionType] = useState('Lecture');
  const [sessionDate, setSessionDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [sessionVenue, setSessionVenue] = useState('');
  const [isLocked, setIsLocked] = useState(false);

  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const initialCourseId = params.get('courseId') || '';

    fetch('/api/lecturer/courses')
      .then((res) => res.json())
      .then((data) => {
        const list = data.courses || [];
        setCourses(list);
        if (list.length > 0) {
          const targetId =
            initialCourseId && list.some((c: any) => c.id === initialCourseId)
              ? initialCourseId
              : list[0].id;
          setSelectedCourseId(targetId);
        } else {
          setLoading(false);
        }
      })
      .catch(() => setLoading(false));
  }, []);

  const loadAttendanceData = async (courseId: string, cohortId: string, thresh: number) => {
    if (!courseId) return;
    setLoading(true);
    try {
      const qs = new URLSearchParams({
        courseId,
        threshold: String(thresh),
        ...(cohortId ? { cohortId } : {}),
      });
      const res = await fetch(`/api/lecturer/attendance?${qs.toString()}`);
      const data = await res.json();
      if (!res.ok) {
        showToast('error', data.error || 'Failed to load attendance data');
        return;
      }

      setSessions(data.sessions || []);
      setStudentSummary(data.studentSummary || []);
      const students = data.enrolledStudents || [];
      setEnrolledStudents(students);

      if (!editingSessionId) {
        setRoster(
          students.map((st: any) => ({
            studentId: st.id,
            matricNumber: st.studentId,
            name: st.user?.name || 'Student',
            cohortName: st.cohort?.name || st.intake || '—',
            status: 'PRESENT',
            notes: '',
          }))
        );
      }
    } catch (e) {
      console.error(e);
      showToast('error', 'Failed to load attendance records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedCourseId) {
      loadAttendanceData(selectedCourseId, selectedCohortId, threshold);
    }
  }, [selectedCourseId, selectedCohortId, threshold]);

  const cohortOptions = useMemo(() => {
    const map = new Map<string, string>();
    const course = courses.find((c) => c.id === selectedCourseId);
    for (const r of course?.registrations || []) {
      if (r.student?.cohort?.id) {
        map.set(r.student.cohort.id, r.student.cohort.name);
      }
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [courses, selectedCourseId]);

  const startNewSession = () => {
    setEditingSessionId(null);
    setSessionTitle('Lecture Session');
    setSessionType('Lecture');
    setSessionDate(new Date().toISOString().split('T')[0]);
    setSessionVenue('');
    setIsLocked(false);
    setRoster(
      enrolledStudents.map((st: any) => ({
        studentId: st.id,
        matricNumber: st.studentId,
        name: st.user?.name || 'Student',
        cohortName: st.cohort?.name || st.intake || '—',
        status: 'PRESENT',
        notes: '',
      }))
    );
  };

  const selectSessionToEdit = (sess: any) => {
    setEditingSessionId(sess.id);
    setSessionTitle(sess.title);
    setSessionType(sess.sessionType || 'Lecture');
    setSessionDate(sess.date);
    setSessionVenue(sess.venue || '');
    setIsLocked(Boolean(sess.isLocked));

    const recordMap = new Map<string, any>();
    for (const r of sess.records || []) {
      recordMap.set(r.studentId, r);
    }

    setRoster(
      enrolledStudents.map((st: any) => {
        const rec = recordMap.get(st.id);
        return {
          studentId: st.id,
          matricNumber: st.studentId,
          name: st.user?.name || 'Student',
          cohortName: st.cohort?.name || st.intake || '—',
          status: (rec?.status as AttendanceStatus) || 'PRESENT',
          notes: rec?.notes || '',
        };
      })
    );
  };

  const updateStudentStatus = (studentId: string, status: AttendanceStatus) => {
    setRoster((prev) => prev.map((r) => (r.studentId === studentId ? { ...r, status } : r)));
  };

  const updateStudentNotes = (studentId: string, notes: string) => {
    setRoster((prev) => prev.map((r) => (r.studentId === studentId ? { ...r, notes } : r)));
  };

  const markAllPresent = () => {
    setRoster((prev) => prev.map((r) => ({ ...r, status: 'PRESENT' })));
  };

  const handleSave = async () => {
    if (!selectedCourseId) return;
    if (roster.length === 0) {
      showToast('error', 'No enrolled students to record attendance for.');
      return;
    }
    setSaving(true);
    try {
      const isEdit = Boolean(editingSessionId);
      const res = await fetch('/api/lecturer/attendance', {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(isEdit ? { sessionId: editingSessionId, isLocked } : { courseId: selectedCourseId }),
          title: sessionTitle,
          sessionType,
          date: sessionDate,
          venue: sessionVenue,
          records: roster.map((r) => ({
            studentId: r.studentId,
            status: r.status,
            notes: r.notes || null,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast('error', data.error || 'Failed to save attendance');
        return;
      }
      showToast(
        'success',
        isEdit ? 'Attendance session updated.' : 'Attendance session recorded to database.'
      );
      if (!isEdit && data.session?.id) {
        setEditingSessionId(data.session.id);
      }
      await loadAttendanceData(selectedCourseId, selectedCohortId, threshold);
    } catch (e) {
      console.error(e);
      showToast('error', 'Network error saving attendance');
    } finally {
      setSaving(false);
    }
  };

  const toggleLockSession = async () => {
    if (!editingSessionId) return;
    const nextLocked = !isLocked;
    try {
      const res = await fetch('/api/lecturer/attendance', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: editingSessionId,
          isLocked: nextLocked,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast('error', data.error || 'Failed to toggle lock');
        return;
      }
      setIsLocked(nextLocked);
      showToast('success', nextLocked ? 'Session locked.' : 'Session unlocked.');
      await loadAttendanceData(selectedCourseId, selectedCohortId, threshold);
    } catch (e) {
      console.error(e);
    }
  };

  const belowThresholdCount = studentSummary.filter((s) => s.belowThreshold).length;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800">
      <DemoRoleSwitcher />

      <header className="sticky top-0 z-30 bg-[#073832] border-b border-emerald-900/50 text-white px-4 sm:px-8 py-3.5 shadow-md flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/portal/lecturer"
            className="p-1.5 bg-emerald-900/70 hover:bg-emerald-800 rounded-lg text-emerald-100 hover:text-white transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-sm sm:text-base font-bold text-white leading-tight">
              Course Attendance Register
            </h1>
            <p className="text-xs text-emerald-200/80">
              Record sessions, edit registers, and monitor &lt;{threshold}% attendance alerts
            </p>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving || roster.length === 0 || isLocked}
          className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 text-xs font-bold rounded-xl shadow-md flex items-center gap-1.5 transition"
        >
          {saving ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          <span>{saving ? 'Saving...' : editingSessionId ? 'Update Session' : 'Submit Register'}</span>
        </button>
      </header>

      {toast && (
        <div className="max-w-6xl mx-auto px-4 sm:px-8 pt-4 w-full">
          <div
            className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 border ${
              toast.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600" />
            )}
            <span>{toast.text}</span>
          </div>
        </div>
      )}

      <main className="max-w-6xl mx-auto w-full p-4 sm:p-8 space-y-6 flex-1">
        {/* Course, Cohort & Session Controls */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Course</label>
              <select
                value={selectedCourseId}
                onChange={(e) => {
                  setEditingSessionId(null);
                  setSelectedCohortId('');
                  setSelectedCourseId(e.target.value);
                }}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
              >
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} - {c.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Cohort Filter</label>
              <select
                value={selectedCohortId}
                onChange={(e) => setSelectedCohortId(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
              >
                <option value="">All Enrolled Cohorts</option>
                {cohortOptions.map((ch) => (
                  <option key={ch.id} value={ch.id}>
                    {ch.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Warning Threshold (%)
              </label>
              <input
                type="number"
                min={1}
                max={100}
                value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value) || 75)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold"
              />
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4 grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Session Title</label>
              <input
                type="text"
                value={sessionTitle}
                disabled={isLocked}
                onChange={(e) => setSessionTitle(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Session Type</label>
              <select
                value={sessionType}
                disabled={isLocked}
                onChange={(e) => setSessionType(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
              >
                <option value="Lecture">Lecture</option>
                <option value="Clinical Ward">Clinical Ward</option>
                <option value="Skills Lab">Skills Lab</option>
                <option value="Tutorial">Tutorial</option>
              </select>
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Date</label>
              <input
                type="date"
                value={sessionDate}
                disabled={isLocked}
                onChange={(e) => setSessionDate(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Venue (Optional)</label>
              <input
                type="text"
                value={sessionVenue}
                disabled={isLocked}
                onChange={(e) => setSessionVenue(e.target.value)}
                placeholder="e.g. Lecture Hall 2"
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
          </div>

          {/* Past Sessions Switcher */}
          <div className="border-t border-slate-100 pt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={startNewSession}
                className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 ${
                  !editingSessionId
                    ? 'bg-[#073832] text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Plus className="w-3.5 h-3.5" /> New Session
              </button>
              {sessions.slice(0, 6).map((sess) => (
                <button
                  key={sess.id}
                  onClick={() => selectSessionToEdit(sess)}
                  className={`px-3 py-1.5 rounded-lg font-semibold border ${
                    editingSessionId === sess.id
                      ? 'bg-emerald-700 text-white border-emerald-700'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {sess.date} · {sess.title} {sess.isLocked ? '🔒' : ''}
                </button>
              ))}
            </div>

            {editingSessionId && (
              <button
                onClick={toggleLockSession}
                className="px-3 py-1.5 rounded-lg font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center gap-1"
              >
                {isLocked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                {isLocked ? 'Unlock Session' : 'Lock Session'}
              </button>
            )}
          </div>
        </div>

        {/* Roster Marking Table */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-bold text-slate-900 text-sm">
              Enrolled Students ({roster.length})
            </h2>
            {!isLocked && roster.length > 0 && (
              <button
                onClick={markAllPresent}
                className="text-xs font-bold text-emerald-700 hover:underline"
              >
                Mark All Present
              </button>
            )}
          </div>

          {loading ? (
            <div className="p-8 text-center text-xs text-slate-400">Loading roster...</div>
          ) : roster.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No enrolled students found for this course/cohort.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-400 font-bold uppercase border-b border-slate-100">
                  <tr>
                    <th className="py-3 px-4">Student ID</th>
                    <th className="py-3 px-4">Name</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {roster.map((s) => (
                    <tr key={s.studentId} className="hover:bg-slate-50/60">
                      <td className="py-3 px-4 font-mono font-bold text-slate-700">
                        {s.matricNumber}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{s.name}</div>
                        <div className="text-[11px] text-slate-400">{s.cohortName}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1.5">
                          {(
                            [
                              ['PRESENT', 'Present', 'bg-emerald-600'],
                              ['LATE', 'Late', 'bg-amber-600'],
                              ['EXCUSED', 'Excused', 'bg-sky-600'],
                              ['ABSENT', 'Absent', 'bg-rose-600'],
                            ] as [AttendanceStatus, string, string][]
                          ).map(([val, label, activeColor]) => (
                            <button
                              key={val}
                              type="button"
                              disabled={isLocked}
                              onClick={() => updateStudentStatus(s.studentId, val)}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                                s.status === val
                                  ? `${activeColor} text-white shadow-sm`
                                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                              }`}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <input
                          type="text"
                          disabled={isLocked}
                          value={s.notes}
                          onChange={(e) => updateStudentNotes(s.studentId, e.target.value)}
                          placeholder="Optional note..."
                          className="w-full min-w-[140px] p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Per-Student Attendance Summary & Threshold Warnings */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="font-bold text-slate-900 text-sm">
                Per-Student Attendance Summary ({sessions.length} Session(s))
              </h2>
              <p className="text-xs text-slate-500">
                Students below {threshold}% are flagged for academic follow-up.
              </p>
            </div>
            {belowThresholdCount > 0 && (
              <span className="px-3 py-1 rounded-full bg-rose-100 text-rose-800 text-xs font-bold flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> {belowThresholdCount} Below {threshold}%
              </span>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-400 font-bold uppercase border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Present</th>
                  <th className="py-3 px-4">Late</th>
                  <th className="py-3 px-4">Excused</th>
                  <th className="py-3 px-4">Absent</th>
                  <th className="py-3 px-4">Attendance %</th>
                  <th className="py-3 px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {studentSummary.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-slate-400">
                      No attendance summary available yet.
                    </td>
                  </tr>
                ) : (
                  studentSummary.map((st) => (
                    <tr key={st.studentId}>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{st.name}</div>
                        <div className="text-[11px] font-mono text-slate-400">
                          {st.studentNumber}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono">{st.presentCount}</td>
                      <td className="py-3 px-4 font-mono">{st.lateCount}</td>
                      <td className="py-3 px-4 font-mono">{st.excusedCount}</td>
                      <td className="py-3 px-4 font-mono">{st.absentCount}</td>
                      <td className="py-3 px-4 font-mono font-bold">{st.attendancePercent}%</td>
                      <td className="py-3 px-4 text-right">
                        {st.belowThreshold ? (
                          <span className="px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold text-[10px]">
                            Below {threshold}%
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                            Good Standing
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
