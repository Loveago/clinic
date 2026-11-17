'use client';

import React, { useState, useEffect } from 'react';
import { CheckCircle2, XCircle, Clock, AlertTriangle, ShieldCheck } from 'lucide-react';
import StudentHeader from '@/components/StudentHeader';

export default function StudentAttendancePage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/student/attendance')
      .then((res) => res.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const summary = data?.summary || {
    totalSessions: 0,
    presentCount: 0,
    lateCount: 0,
    absentCount: 0,
    excusedCount: 0,
    overallRate: 0,
    thresholdPercent: 75,
    belowThreshold: false,
  };
  const courseBreakdown = data?.courseBreakdown || [];
  const records = data?.records || [];

  const renderStatusBadge = (status: string) => {
    if (status === 'PRESENT') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
          <CheckCircle2 className="w-3.5 h-3.5" /> Present
        </span>
      );
    }
    if (status === 'LATE') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
          <Clock className="w-3.5 h-3.5" /> Late
        </span>
      );
    }
    if (status === 'EXCUSED') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-800 bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-200">
          <ShieldCheck className="w-3.5 h-3.5" /> Excused
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-800 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200">
        <XCircle className="w-3.5 h-3.5" /> Absent
      </span>
    );
  };

  return (
    <>
      <StudentHeader
        title="Attendance & Clinical Hours"
        subtitle="Lecture Hall Attendance & Hospital Ward Rotations"
      />

      <main className="p-4 sm:p-8 max-w-7xl mx-auto w-full space-y-8 font-sans">
        {summary.belowThreshold && (
          <div className="bg-rose-50 border border-rose-300 text-rose-900 p-4 rounded-2xl flex items-start gap-3 shadow-sm">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <div className="font-bold text-sm">Attendance Warning: Below {summary.thresholdPercent}% Threshold</div>
              <p>
                Your overall attendance rate ({summary.overallRate}%) is below the {summary.thresholdPercent}% minimum required for end-of-semester examination eligibility. Please contact your course lecturer or academic advisor.
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Overall Attendance</span>
            <div className={`text-3xl font-extrabold mt-1 ${summary.belowThreshold ? 'text-rose-600' : 'text-emerald-800'}`}>
              {loading ? '—' : summary.totalSessions > 0 ? `${summary.overallRate}%` : 'No Data'}
            </div>
            <div className="text-xs text-slate-500 mt-1 font-medium">
              Requirement for Exam Eligibility: &ge;{summary.thresholdPercent}%
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Sessions Attended</span>
            <div className="text-3xl font-extrabold text-slate-900 mt-1">
              {loading ? '—' : `${summary.presentCount + summary.lateCount} / ${summary.totalSessions}`}
            </div>
            <div className="text-xs text-slate-500 mt-1 font-medium">
              {summary.presentCount} Present · {summary.lateCount} Late
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Absences &amp; Excused</span>
            <div className="text-3xl font-extrabold text-[#073832] mt-1">
              {loading ? '—' : `${summary.absentCount} / ${summary.excusedCount}`}
            </div>
            <div className="text-xs text-emerald-700 font-semibold mt-1">
              {summary.absentCount} Unexcused · {summary.excusedCount} Excused
            </div>
          </div>
        </div>

        {/* Per-Course Attendance Breakdown */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-slate-900 pb-3 border-b border-slate-100">
            Attendance by Registered Course
          </h3>
          {loading ? (
            <p className="text-xs text-slate-400">Loading course attendance...</p>
          ) : courseBreakdown.length === 0 ? (
            <p className="text-xs text-slate-400">No course attendance records yet.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {courseBreakdown.map((c: any) => (
                <div
                  key={c.courseId}
                  className={`p-4 rounded-2xl border space-y-2 ${
                    c.belowThreshold ? 'border-rose-200 bg-rose-50/40' : 'border-slate-200 bg-slate-50/50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-mono font-bold text-emerald-800">{c.courseCode}</span>
                    {c.belowThreshold ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700">
                        Below 75%
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                        Good Standing
                      </span>
                    )}
                  </div>
                  <div className="text-sm font-bold text-slate-900 truncate">{c.courseTitle}</div>
                  <div className="flex items-center justify-between text-xs text-slate-600 pt-1">
                    <span>{c.totalSessions} session(s)</span>
                    <span className="font-extrabold text-slate-900">
                      {c.totalSessions > 0 ? `${c.attendanceRate}%` : '—'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Attendance Log */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-slate-900 pb-3 border-b border-slate-100">
            Attendance Session Log
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider">
                  <th className="pb-3 pr-4">Date</th>
                  <th className="pb-3 pr-4">Course</th>
                  <th className="pb-3 pr-4">Topic / Session</th>
                  <th className="pb-3 pr-4">Type</th>
                  <th className="pb-3 text-right">Attendance Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-400">
                      Loading attendance records...
                    </td>
                  </tr>
                ) : records.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-400">
                      No attendance sessions have been recorded yet.
                    </td>
                  </tr>
                ) : (
                  records.map((r: any) => (
                    <tr key={r.id} className="hover:bg-slate-50/60">
                      <td className="py-4 pr-4 font-bold text-slate-900 whitespace-nowrap">{r.date}</td>
                      <td className="py-4 pr-4 text-emerald-800 font-semibold">
                        {r.courseCode} — {r.courseTitle}
                      </td>
                      <td className="py-4 pr-4 text-slate-600">{r.sessionTitle}</td>
                      <td className="py-4 pr-4 text-slate-500">{r.sessionType}</td>
                      <td className="py-4 text-right">{renderStatusBadge(r.status)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </>
  );
}
