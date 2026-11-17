'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Calendar,
  Clock,
  Award,
  ArrowRight,
  AlertCircle,
  CheckCircle,
  FileText,
  Lock,
  PlayCircle,
  Printer,
  X,
  ShieldAlert,
} from 'lucide-react';
import StudentHeader from '@/components/StudentHeader';

export default function StudentExamsDirectoryPage() {
  const [exams, setExams] = useState<any[]>([]);
  const [student, setStudent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'AVAILABLE' | 'COMPLETED'>('ALL');
  const [slipExam, setSlipExam] = useState<any>(null);

  useEffect(() => {
    fetch('/api/student/exams')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data.exams)) setExams(data.exams);
        if (data.student) setStudent(data.student);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filteredExams = exams.filter((ex) => {
    if (filter === 'COMPLETED') return Boolean(ex.latestAttempt) && !ex.activeAttempt;
    if (filter === 'AVAILABLE') return Boolean(ex.activeAttempt) || !ex.latestAttempt;
    return true;
  });

  return (
    <>
      <StudentHeader
        title="Examinations & Assessments"
        subtitle="Computer-Based Testing (CBT) & Scheduled Examinations"
      />

      <main className="p-4 sm:p-8 max-w-7xl mx-auto w-full space-y-6">
        {/* Examination Instructions Banner */}
        <div className="bg-emerald-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="max-w-2xl space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-300 bg-emerald-800/80 px-3 py-1 rounded-full">
                Online Examination Rules
              </span>
              <h2 className="text-2xl font-bold">Standard Examination Guidelines</h2>
              <p className="text-xs sm:text-sm text-emerald-100/80 leading-relaxed">
                Your countdown timer is synchronized with the server. Answers autosave continuously.
                Tab switches and focus exits are logged for academic integrity review. Submit before 00:00.
              </p>
            </div>
            {student && (
              <div className="bg-emerald-950/60 border border-emerald-700/60 rounded-2xl p-4 text-xs space-y-1 shrink-0">
                <p className="text-emerald-300 font-bold uppercase tracking-wider">Candidate Status</p>
                <p className="font-semibold text-white">{student.name} ({student.studentId})</p>
                <p className="text-emerald-200">
                  Account: <span className="font-bold">{student.status}</span>
                </p>
                {student.outstandingBalance > 0 && (
                  <p className="text-amber-300 font-semibold">
                    Fee Balance: GH₵{Number(student.outstandingBalance).toFixed(2)}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-lg font-bold text-slate-900">Your Examinations</h3>
          <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
            {(['ALL', 'AVAILABLE', 'COMPLETED'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  filter === tab
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab === 'ALL' ? 'All Exams' : tab === 'AVAILABLE' ? 'Active & Upcoming' : 'Completed'}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="bg-white rounded-2xl p-10 border border-slate-200 text-center text-sm text-slate-500">
            Loading scheduled examinations...
          </div>
        ) : filteredExams.length === 0 ? (
          <div className="bg-white rounded-2xl p-10 border border-slate-200 text-center space-y-2">
            <FileText className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-sm font-bold text-slate-700">No examinations match this view.</p>
            <p className="text-xs text-slate-500">
              Scheduled examinations for your registered courses will appear here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredExams.map((exam) => {
              const eligible = exam.eligibility?.eligible;
              const reasons: string[] = exam.eligibility?.reasons || [];
              const hasActive = Boolean(exam.activeAttempt);
              const latest = exam.latestAttempt;

              return (
                <div
                  key={exam.id}
                  className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-sm hover:shadow-md transition-all flex flex-col justify-between gap-4"
                >
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                          <Calendar className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                              {exam.courseCode}
                            </span>
                            <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                              {String(exam.examType || 'EXAM').replace(/_/g, ' ')}
                            </span>
                            <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
                              {exam.mode || 'ONLINE'}
                            </span>
                          </div>
                          <h4 className="text-base font-bold text-slate-900 mt-1">{exam.title}</h4>
                          {exam.periodTitle && (
                            <p className="text-[11px] text-slate-500">{exam.periodTitle}</p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">
                          Schedule
                        </span>
                        <span className="font-semibold text-slate-900">
                          {exam.scheduledDate} · {exam.scheduledTime}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">
                          Duration &amp; Questions
                        </span>
                        <span className="font-semibold text-slate-900">
                          {exam.durationMinutes} mins · {exam.questionCount} Qs
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">
                          Pass Mark
                        </span>
                        <span className="font-semibold text-slate-900">{exam.passMark}%</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">
                          Attempts
                        </span>
                        <span className="font-semibold text-slate-900">
                          {exam.eligibility?.attemptsUsed || 0} / {exam.maxRetakes || 1}
                        </span>
                      </div>
                    </div>

                    {/* Eligibility / Financial Clearance Warning */}
                    {!hasActive && !eligible && reasons.length > 0 && (
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 space-y-1">
                        <div className="flex items-center gap-1.5 font-bold">
                          <ShieldAlert className="w-4 h-4 shrink-0" />
                          <span>Not Eligible to Start</span>
                        </div>
                        <ul className="list-disc pl-5 space-y-0.5 text-[11px]">
                          {reasons.map((r, i) => (
                            <li key={i}>{r}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Latest Submitted Attempt Status */}
                    {latest && (
                      <div
                        className={`rounded-xl p-3 border text-xs flex items-center justify-between gap-2 ${
                          latest.resultPublished
                            ? latest.passed
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                              : 'bg-rose-50 border-rose-200 text-rose-900'
                            : 'bg-slate-50 border-slate-200 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {latest.resultPublished ? (
                            <Award className="w-4 h-4 shrink-0" />
                          ) : (
                            <Clock className="w-4 h-4 shrink-0" />
                          )}
                          <div>
                            {latest.resultPublished ? (
                              <p className="font-bold">
                                Score: {latest.percentage}% ({latest.passed ? 'PASSED' : 'FAILED'})
                              </p>
                            ) : latest.evaluationStatus === 'FAILED' ? (
                              <p className="font-bold text-amber-800">
                                Evaluation Pending — Automated grading retry queued
                              </p>
                            ) : (
                              <p className="font-bold">
                                Submitted · Result Pending Publication ({exam.publicationMode})
                              </p>
                            )}
                            {latest.submittedAt && (
                              <p className="text-[11px] opacity-80">
                                Submitted {new Date(latest.submittedAt).toLocaleString()}
                              </p>
                            )}
                          </div>
                        </div>

                        {latest.resultPublished && (
                          <button
                            onClick={() => setSlipExam(exam)}
                            className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[11px] font-bold text-slate-800 hover:bg-slate-50 shrink-0"
                          >
                            Result Slip
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-1 flex items-center gap-3">
                    {hasActive ? (
                      <Link
                        href={`/portal/student/exams/start?id=${exam.id}`}
                        className="flex-1 py-3 px-4 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
                      >
                        <PlayCircle className="w-4 h-4" />
                        <span>
                          Resume Exam ({Math.ceil((exam.activeAttempt.remainingSeconds || 0) / 60)}m left)
                        </span>
                      </Link>
                    ) : eligible ? (
                      <Link
                        href={`/portal/student/exams/start?id=${exam.id}`}
                        className="flex-1 py-3 px-4 bg-[#073832] hover:bg-emerald-900 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
                      >
                        <span>{latest ? 'Start Retake' : 'Start Examination'}</span>
                        <ArrowRight className="w-4 h-4 text-emerald-300" />
                      </Link>
                    ) : (
                      <button
                        disabled
                        className="flex-1 py-3 px-4 bg-slate-100 text-slate-400 text-xs font-bold rounded-xl flex items-center justify-center gap-2 cursor-not-allowed"
                      >
                        <Lock className="w-4 h-4" />
                        <span>{latest ? 'Completed' : 'Locked'}</span>
                      </button>
                    )}

                    {latest?.resultPublished && (
                      <Link
                        href={`/portal/student/exams/start?id=${exam.id}`}
                        className="py-3 px-4 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition-all"
                      >
                        Review
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Printable Result Slip Modal */}
      {slipExam && slipExam.latestAttempt && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl space-y-5">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
                  Action Health Nursing &amp; Midwifery Training College
                </p>
                <h3 className="text-lg font-extrabold text-slate-900">
                  Official Examination Result Slip
                </h3>
              </div>
              <button
                onClick={() => setSlipExam(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-2xl">
                <div>
                  <span className="text-slate-400 block">Student</span>
                  <span className="font-bold text-slate-900">{student?.name}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Student ID</span>
                  <span className="font-bold text-slate-900">{student?.studentId}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Course</span>
                  <span className="font-bold text-slate-900">
                    {slipExam.courseCode} · {slipExam.courseName}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Examination</span>
                  <span className="font-bold text-slate-900">{slipExam.title}</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100">
                  <span className="text-[10px] font-bold uppercase text-emerald-700 block">
                    Score
                  </span>
                  <span className="text-xl font-black text-emerald-900">
                    {slipExam.latestAttempt.percentage}%
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold uppercase text-slate-500 block">
                    Questions
                  </span>
                  <span className="text-xl font-black text-slate-900">
                    {slipExam.latestAttempt.correctCount ?? '-'} /{' '}
                    {slipExam.latestAttempt.totalQuestions}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold uppercase text-slate-500 block">
                    Status
                  </span>
                  <span
                    className={`text-sm font-black ${
                      slipExam.latestAttempt.passed ? 'text-emerald-700' : 'text-rose-700'
                    }`}
                  >
                    {slipExam.latestAttempt.passed ? 'PASSED' : 'FAILED'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => window.print()}
                className="flex-1 py-2.5 px-4 bg-[#073832] hover:bg-emerald-900 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2"
              >
                <Printer className="w-4 h-4" />
                <span>Print / Save PDF</span>
              </button>
              <button
                onClick={() => setSlipExam(null)}
                className="py-2.5 px-4 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
