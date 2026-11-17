'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Award, ArrowRight, Printer, BookOpen } from 'lucide-react';
import StudentHeader from '@/components/StudentHeader';

export default function StudentResultsPage() {
  const [showDetailed, setShowDetailed] = useState(true);
  const [resultsData, setResultsData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/student/results')
      .then((res) => res.json())
      .then((data) => {
        setResultsData(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const student = resultsData?.student || {};
  const summary = resultsData?.summary || {
    totalCredits: 0,
    totalQualityPoints: 0,
    gpa: 0,
    cgpa: 0,
    classStanding: '—',
  };
  const semesterBreakdown = resultsData?.semesterBreakdown || [];
  const results = resultsData?.results || [];

  return (
    <>
      <StudentHeader
        title="Exam Results & Transcript"
        subtitle="Published Continuous Assessment Results, Semester GPA & Cumulative CGPA"
      />

      <main className="p-4 sm:p-8 max-w-5xl mx-auto w-full space-y-8 font-sans">
        {/* Academic Standing Summary Card */}
        <div className="max-w-md mx-auto bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-xl space-y-6">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
            <Link
              href="/portal/student/dashboard"
              className="p-1.5 -ml-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h2 className="text-base font-bold text-slate-900">Academic Results Summary</h2>
          </div>

          <div className="text-center space-y-3 py-2">
            <div className="w-20 h-20 bg-[#34d399] text-white rounded-full flex items-center justify-center mx-auto shadow-lg shadow-emerald-200/60 ring-8 ring-emerald-50">
              <Award className="w-10 h-10 stroke-[2.5]" />
            </div>

            <div className="space-y-1">
              <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                {loading ? 'Loading...' : results.length > 0 ? `CGPA ${Number(summary.cgpa || 0).toFixed(2)}` : 'No Published Results'}
              </h3>
              <p className="text-sm font-bold text-emerald-800">
                {loading ? '—' : summary.classStanding}
              </p>
              <p className="text-xs text-slate-500 font-medium">
                {student.programme || 'Nursing & Midwifery'} · {student.level || 'Level 100'}
              </p>
            </div>
          </div>

          <div className="bg-slate-50/80 rounded-2xl p-5 border border-slate-200/80 divide-y divide-slate-200/80 text-sm font-semibold">
            <div className="flex items-center justify-between pb-3">
              <span className="text-slate-600">Current Semester GPA</span>
              <span className="text-emerald-700 font-extrabold">{Number(summary.gpa || 0).toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between py-3">
              <span className="text-slate-600">Published Courses</span>
              <span className="text-slate-900 font-extrabold">{results.length}</span>
            </div>
            <div className="flex items-center justify-between pt-3">
              <span className="text-slate-900 font-bold">Total Credit Hours</span>
              <span className="text-slate-900 font-extrabold">{summary.totalCredits || 0}</span>
            </div>
          </div>

          <div>
            <button
              onClick={() => setShowDetailed(!showDetailed)}
              className="w-full py-3.5 px-6 bg-[#073832] hover:bg-emerald-900 active:scale-95 text-white text-sm font-bold rounded-full shadow-lg transition-all flex items-center justify-center gap-2 group"
            >
              <span>{showDetailed ? 'Hide Semester Statement' : 'View Detailed Results'}</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>

        {/* Semester GPA Breakdown */}
        {showDetailed && semesterBreakdown.length > 0 && (
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 sm:p-8 space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-emerald-700" />
              Semester GPA Breakdown
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {semesterBreakdown.map((sem: any, idx: number) => (
                <div key={idx} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-1">
                  <div className="text-xs font-bold text-emerald-800">{sem.academicYear}</div>
                  <div className="text-sm font-bold text-slate-900">{sem.semester}</div>
                  <div className="flex items-center justify-between pt-2 text-xs text-slate-600">
                    <span>{sem.totalCredits} Credits</span>
                    <span className="font-black text-emerald-700 text-sm">GPA: {Number(sem.gpa).toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Official Semester Transcript & Result Sheet */}
        {showDetailed && (
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                  Accredited by Nursing &amp; Midwifery Council (N&amp;MC) of Ghana
                </span>
                <h3 className="text-lg font-black text-slate-900 mt-2">Official Semester Grade Statement</h3>
                <p className="text-xs text-slate-500">
                  {student.name || 'Student'} ({student.studentId || '—'}) · {student.academicYear || '2025/2026'}
                </p>
              </div>

              <div className="text-left sm:text-right bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                <span className="text-xs text-slate-400 font-medium block">Cumulative CGPA</span>
                <span className="text-2xl font-black text-emerald-700">{Number(summary.cgpa || 0).toFixed(2)}</span>
                <span className="text-[11px] font-bold text-slate-600 block">{summary.classStanding}</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider bg-slate-50">
                    <th className="py-3 px-3">Course Code</th>
                    <th className="py-3 px-3">Course Title</th>
                    <th className="py-3 px-3">Semester</th>
                    <th className="py-3 px-3">Credits</th>
                    <th className="py-3 px-3">CA</th>
                    <th className="py-3 px-3">Exam</th>
                    <th className="py-3 px-3">Total</th>
                    <th className="py-3 px-3">Grade</th>
                    <th className="py-3 px-3 text-right">Grade Point</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {loading ? (
                    <tr>
                      <td colSpan={9} className="py-6 text-center text-slate-400">
                        Loading published results...
                      </td>
                    </tr>
                  ) : results.length > 0 ? (
                    results.map((r: any) => (
                      <tr key={r.id} className="hover:bg-slate-50/60 transition">
                        <td className="py-3.5 px-3 font-mono font-bold text-slate-900">{r.courseCode}</td>
                        <td className="py-3.5 px-3 font-semibold text-slate-900">{r.courseTitle}</td>
                        <td className="py-3.5 px-3 text-slate-500">{r.semester}</td>
                        <td className="py-3.5 px-3">{r.credits}</td>
                        <td className="py-3.5 px-3">{Number(r.caScore || 0).toFixed(1)}</td>
                        <td className="py-3.5 px-3">{Number(r.examScore || 0).toFixed(1)}</td>
                        <td className="py-3.5 px-3 font-bold text-slate-900">{Number(r.totalScore || 0).toFixed(1)}%</td>
                        <td className="py-3.5 px-3">
                          <span className="font-black text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-100">
                            {r.grade}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 font-mono font-bold text-slate-800 text-right">
                          {Number(r.gpaPoint || 0).toFixed(1)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={9} className="py-6 text-center text-slate-400">
                        No approved and published results are available yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-3">
              <p>Ghana Tertiary Education Commission Grading System • Pass Mark: 50%</p>
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold px-4 py-2 rounded-xl transition"
              >
                <Printer className="w-4 h-4" /> Print Transcript Statement
              </button>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
