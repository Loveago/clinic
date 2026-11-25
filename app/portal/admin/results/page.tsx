'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Award,
  BookOpen,
  CheckCircle2,
  FileText,
  Printer,
  Search,
  UserCheck,
  ArrowLeft,
} from 'lucide-react';

export default function AdminStudentResultsPage() {
  const [students, setStudents] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [trackFilter, setTrackFilter] = useState('');

  const loadStudents = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (search) qs.set('search', search);
      if (trackFilter) qs.set('track', trackFilter);
      const res = await fetch(`/api/admin/student-academics?${qs.toString()}`);
      if (res.ok) {
        const d = await res.json();
        setStudents(d.students || []);
      }
    } finally {
      setLoading(false);
    }
  }, [search, trackFilter]);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  const openStudentRecord = async (studentId: string) => {
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/admin/student-academics?studentId=${encodeURIComponent(studentId)}`);
      if (res.ok) {
        const d = await res.json();
        setSelectedStudent(d.student);
      }
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto w-full space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-xl font-extrabold text-[#073832]">Student Academic Results &amp; Transcripts</h1>
          <p className="text-xs text-slate-500">
            Inspect every student&apos;s examination scores, module quiz attempts, Modules 1–13 progress, and grades.
          </p>
        </div>
        {selectedStudent && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 inline-flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              Print Academic Report
            </button>
            <button
              type="button"
              onClick={() => setSelectedStudent(null)}
              className="px-3.5 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold inline-flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              All Students
            </button>
          </div>
        )}
      </div>

      {!selectedStudent ? (
        <>
          <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col sm:flex-row gap-3 justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search student name, email, or ID..."
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs"
              />
            </div>
            <select
              value={trackFilter}
              onChange={(e) => setTrackFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold bg-white"
            >
              <option value="">All Study Tracks</option>
              <option value="6_MONTH">6-Month Intensive Track</option>
              <option value="12_MONTH">12-Month Standard Track</option>
            </select>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto shadow-sm">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase text-slate-500">
                <tr>
                  <th className="p-3.5">Student</th>
                  <th className="p-3.5">Track</th>
                  <th className="p-3.5">Modules Done</th>
                  <th className="p-3.5">Module Quizzes</th>
                  <th className="p-3.5">Examinations</th>
                  <th className="p-3.5">GPA</th>
                  <th className="p-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      Loading student academic records...
                    </td>
                  </tr>
                ) : students.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      No students found.
                    </td>
                  </tr>
                ) : (
                  students.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50">
                      <td className="p-3.5">
                        <div className="font-bold text-slate-900">{s.name}</div>
                        <div className="text-[11px] text-slate-500">
                          {s.studentId} • {s.email}
                        </div>
                      </td>
                      <td className="p-3.5">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold">
                          {s.studyTrack === '6_MONTH' ? '6-Month' : '12-Month'}
                        </span>
                      </td>
                      <td className="p-3.5 font-semibold text-slate-700">{s.modulesCompleted} / 13</td>
                      <td className="p-3.5">
                        <span className="font-bold text-slate-900">{s.quizzesTaken}</span>
                        {s.quizzesTaken > 0 && (
                          <span className="ml-1 text-emerald-700 font-semibold">({s.avgQuizPct}%)</span>
                        )}
                      </td>
                      <td className="p-3.5">
                        <span className="font-bold text-slate-900">{s.examsTaken}</span>
                        {s.examsTaken > 0 && (
                          <span className="ml-1 text-emerald-700 font-semibold">({s.avgExamPct}%)</span>
                        )}
                      </td>
                      <td className="p-3.5 font-bold text-[#073832]">{s.gpa.toFixed(2)}</td>
                      <td className="p-3.5 text-right">
                        <button
                          type="button"
                          disabled={detailLoading}
                          onClick={() => openStudentRecord(s.id)}
                          className="px-3 py-1.5 rounded-lg bg-[#073832] text-white font-bold hover:bg-emerald-900"
                        >
                          View Academics
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div className="space-y-6">
          {/* Student Header */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-extrabold text-slate-900">{selectedStudent.user?.name}</h2>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold">
                  {selectedStudent.studyTrack === '6_MONTH' ? '6-Month Intensive Track' : '12-Month Standard Track'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {selectedStudent.studentId} • {selectedStudent.programme?.name} • {selectedStudent.level} •{' '}
                {selectedStudent.user?.email}
              </p>
            </div>
            <div className="flex gap-4 text-center">
              <div className="px-4 py-2 rounded-xl bg-slate-50 border border-slate-200">
                <div className="text-lg font-black text-[#073832]">{selectedStudent.examAttempts?.length || 0}</div>
                <div className="text-[10px] font-bold uppercase text-slate-500">Exams</div>
              </div>
              <div className="px-4 py-2 rounded-xl bg-slate-50 border border-slate-200">
                <div className="text-lg font-black text-[#073832]">
                  {selectedStudent.topicAssessmentAttempts?.length || 0}
                </div>
                <div className="text-[10px] font-bold uppercase text-slate-500">Module Quizzes</div>
              </div>
              <div className="px-4 py-2 rounded-xl bg-slate-50 border border-slate-200">
                <div className="text-lg font-black text-[#073832]">
                  {selectedStudent.topicMasteries?.filter((m: any) =>
                    ['COMPLETED', 'MASTERED'].includes(m.masteryStatus)
                  ).length || 0}
                  /13
                </div>
                <div className="text-[10px] font-bold uppercase text-slate-500">Modules Done</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Examination Results */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Award className="w-4 h-4 text-emerald-700" />
                Examination Results ({selectedStudent.examAttempts?.length || 0})
              </h3>
              {(selectedStudent.examAttempts || []).length === 0 ? (
                <p className="text-xs text-slate-400">No examinations taken yet.</p>
              ) : (
                <div className="space-y-2">
                  {selectedStudent.examAttempts.map((a: any) => {
                    const passed = a.percentage >= (a.exam?.passMark || 50);
                    return (
                      <div key={a.id} className="p-3 rounded-xl border border-slate-200 text-xs flex justify-between items-center">
                        <div>
                          <p className="font-bold text-slate-900">{a.exam?.title}</p>
                          <p className="text-slate-500">
                            {a.exam?.course?.code} • {a.exam?.examType} • {a.status}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-black text-sm text-slate-900">
                            {a.score ?? 0}/{a.totalMarks ?? a.exam?.totalMarks ?? 100} ({Math.round(a.percentage || 0)}%)
                          </p>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              passed ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                            }`}
                          >
                            {passed ? 'PASS' : 'FAIL'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Module Quiz Results */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-700" />
                Module Quiz Results ({selectedStudent.topicAssessmentAttempts?.length || 0})
              </h3>
              {(selectedStudent.topicAssessmentAttempts || []).length === 0 ? (
                <p className="text-xs text-slate-400">No module quizzes taken yet.</p>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {selectedStudent.topicAssessmentAttempts.map((q: any) => (
                    <div key={q.id} className="p-3 rounded-xl border border-slate-200 text-xs flex justify-between items-center">
                      <div>
                        <p className="font-bold text-slate-900">{q.assessment?.title}</p>
                        <p className="text-slate-500">
                          {q.assessment?.course?.code} • {q.assessment?.topic?.title || 'Module Quiz'}
                        </p>
                      </div>
                      <div className="text-right font-bold text-emerald-800">
                        {q.score ?? 0}/{q.totalMarks ?? 0} ({Math.round(q.percentage || 0)}%)
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modules 1-13 Mastery */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-emerald-700" />
                Module Progress ({selectedStudent.topicMasteries?.length || 0})
              </h3>
              {(selectedStudent.topicMasteries || []).length === 0 ? (
                <p className="text-xs text-slate-400">Student has not opened any modules yet.</p>
              ) : (
                <div className="space-y-1.5 max-h-72 overflow-y-auto">
                  {selectedStudent.topicMasteries.map((m: any) => (
                    <div key={m.id} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs flex justify-between">
                      <span className="font-semibold text-slate-900">{m.topic?.title}</span>
                      <span className="font-bold text-emerald-700">
                        {m.masteryStatus} {m.bestScore > 0 ? `(${m.bestScore}%)` : ''}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Course Grades / Transcript */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                Course Grades &amp; Continuous Assessment
              </h3>
              {(selectedStudent.assessments || []).length === 0 ? (
                <p className="text-xs text-slate-400">No course grade records published yet.</p>
              ) : (
                <div className="space-y-2">
                  {selectedStudent.assessments.map((ca: any) => (
                    <div key={ca.id} className="p-2.5 rounded-xl border border-slate-200 text-xs flex justify-between">
                      <div>
                        <p className="font-bold text-slate-900">{ca.course?.code} — {ca.course?.title}</p>
                        <p className="text-slate-500">CA: {ca.caScore ?? 0} • Exam: {ca.examScore ?? 0}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-black text-[#073832]">{ca.totalScore ?? 0}% ({ca.grade || '—'})</p>
                        <p className="text-[10px] text-slate-500">GPA: {ca.gpaPoint ?? 0}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
