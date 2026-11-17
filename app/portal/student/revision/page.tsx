'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  BookOpen,
  ArrowRight,
  CheckCircle2,
  Award,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import StudentHeader from '@/components/StudentHeader';

export default function StudentRevisionCenterPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/student/learning-center')
      .then((res) => res.json())
      .then((d) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const allTopics = (data?.courses || []).flatMap((c: any) =>
    (c.topics || []).map((t: any) => ({ ...t, courseCode: c.code, courseTitle: c.title }))
  );

  const weakTopics = allTopics.filter((t: any) => t.mastery?.masteryStatus === 'NEEDS_REVISION');
  const incompleteTopics = allTopics.filter((t: any) =>
    ['NOT_STARTED', 'IN_PROGRESS'].includes(t.mastery?.masteryStatus || 'NOT_STARTED')
  );
  const masteredTopics = allTopics.filter((t: any) => t.mastery?.masteryStatus === 'MASTERED');
  const recentAttempts = data?.recentAttempts || [];

  return (
    <>
      <StudentHeader
        title="Revision Centre"
        subtitle="Personalised Weak-Topic Recommendations, Incomplete Topics &amp; Practice Quizzes"
      />

      <main className="p-4 sm:p-8 max-w-6xl mx-auto w-full space-y-6">
        {loading ? (
          <div className="bg-white rounded-3xl p-10 text-center border border-slate-200 text-xs text-slate-500">
            Analysing your topic mastery and quiz history...
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-white rounded-2xl p-5 border border-red-200/80 shadow-sm">
                <div className="text-2xl font-black text-red-600">{weakTopics.length}</div>
                <div className="text-xs font-bold text-slate-600 mt-1">Topics Needing Revision</div>
              </div>
              <div className="bg-white rounded-2xl p-5 border border-amber-200/80 shadow-sm">
                <div className="text-2xl font-black text-amber-600">{incompleteTopics.length}</div>
                <div className="text-xs font-bold text-slate-600 mt-1">Incomplete Topics</div>
              </div>
              <div className="bg-white rounded-2xl p-5 border border-emerald-200/80 shadow-sm">
                <div className="text-2xl font-black text-emerald-700">{masteredTopics.length}</div>
                <div className="text-xs font-bold text-slate-600 mt-1">Mastered Topics (80%+)</div>
              </div>
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
                <div className="text-2xl font-black text-[#073832]">{data?.stats?.averageScore ?? 0}%</div>
                <div className="text-xs font-bold text-slate-600 mt-1">Overall Quiz Average</div>
              </div>
            </div>

            {/* Priority Revision Topics */}
            <section className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 bg-red-50/70 border-b border-red-100 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <h2 className="text-sm font-extrabold text-red-900">
                  Priority Topics Requiring Revision (Scored Below 50%)
                </h2>
              </div>
              <div className="divide-y divide-slate-100">
                {weakTopics.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-500 flex flex-col items-center gap-2">
                    <CheckCircle2 className="w-7 h-7 text-emerald-600" />
                    <span>Great work! You currently have no weak topics flagged for urgent revision.</span>
                  </div>
                ) : (
                  weakTopics.map((t: any) => (
                    <div key={t.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <span className="text-[11px] font-bold text-red-700">
                          {t.courseCode} · Best Score: {t.mastery?.bestScore || 0}%
                        </span>
                        <h3 className="text-sm font-extrabold text-slate-900 mt-0.5">{t.title}</h3>
                        <p className="text-xs text-slate-500 mt-0.5">{t.description}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Link
                          href={`/portal/student/topics/${t.id}`}
                          className="px-4 py-2 bg-[#073832] text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5"
                        >
                          <BookOpen className="w-3.5 h-3.5 text-emerald-300" />
                          <span>Revise Notes</span>
                        </Link>
                        {t.primaryQuizId && (
                          <Link
                            href={`/portal/student/topic-quiz/${t.primaryQuizId}`}
                            className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-800 border border-red-200 rounded-xl text-xs font-bold inline-flex items-center gap-1.5"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Retake Quiz</span>
                          </Link>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

            {/* Incomplete Topics */}
            <section className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-700" />
                <h2 className="text-sm font-extrabold text-[#073832]">
                  Incomplete &amp; In-Progress Topics
                </h2>
              </div>
              <div className="divide-y divide-slate-100">
                {incompleteTopics.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400">
                    All published course topics have been completed.
                  </div>
                ) : (
                  incompleteTopics.map((t: any) => (
                    <div key={t.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <span className="text-[11px] font-bold text-emerald-700">{t.courseCode}</span>
                        <h3 className="text-sm font-bold text-slate-900">{t.title}</h3>
                      </div>
                      <Link
                        href={`/portal/student/topics/${t.id}`}
                        className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shrink-0"
                      >
                        <span>Continue Studying</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  ))
                )}
              </div>
            </section>

            {/* Recent Quiz Attempts */}
            {recentAttempts.length > 0 && (
              <section className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
                  <Award className="w-4 h-4 text-emerald-700" />
                  <h2 className="text-sm font-extrabold text-[#073832]">Recent Quiz Attempts</h2>
                </div>
                <div className="divide-y divide-slate-100 text-xs">
                  {recentAttempts.map((att: any) => (
                    <div key={att.id} className="p-4 flex items-center justify-between gap-3">
                      <div>
                        <div className="font-bold text-slate-900">{att.assessment?.title}</div>
                        <div className="text-[11px] text-slate-500">
                          Attempt #{att.attemptNumber} · {att.totalScore}/{att.maxScore} ({att.percentage}%)
                        </div>
                      </div>
                      <Link
                        href={`/portal/student/topic-quiz/${att.assessmentId}`}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-bold"
                      >
                        Review
                      </Link>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </>
  );
}

