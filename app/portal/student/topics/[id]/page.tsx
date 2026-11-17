'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  BookOpen,
  FileText,
  CheckCircle2,
  Circle,
  Sparkles,
  ArrowRight,
  Award,
  ExternalLink,
  ListChecks,
} from 'lucide-react';
import StudentHeader from '@/components/StudentHeader';

export default function StudentTopicReaderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  const loadTopic = () => {
    fetch(`/api/student/learning-topics/${id}`)
      .then((res) => res.json())
      .then((d) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadTopic();
  }, [id]);

  const handleToggleComplete = async () => {
    if (!data?.mastery) return;
    setToggling(true);
    try {
      const res = await fetch(`/api/student/learning-topics/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: !data.mastery.completed }),
      });
      if (res.ok) loadTopic();
    } finally {
      setToggling(false);
    }
  };

  if (loading) {
    return (
      <>
        <StudentHeader title="Topic Reader" subtitle="Loading topic learning guide..." />
        <main className="p-8 max-w-5xl mx-auto text-center text-xs text-slate-500">Loading topic...</main>
      </>
    );
  }

  if (data?.error || !data?.topic) {
    return (
      <>
        <StudentHeader title="Topic Unavailable" subtitle="Access or publication check" />
        <main className="p-8 max-w-3xl mx-auto text-center space-y-4">
          <p className="text-sm font-bold text-red-600">{data?.error || 'Topic not found'}</p>
          <Link href="/portal/student/materials" className="inline-flex items-center gap-2 text-xs font-bold text-emerald-800">
            <ArrowLeft className="w-4 h-4" />
            <span>Back to PDF Learning Centre</span>
          </Link>
        </main>
      </>
    );
  }

  const { topic, course, mastery, quizzes } = data;
  const content = topic.structuredContent || {};

  return (
    <>
      <StudentHeader
        title={topic.title}
        subtitle={`${course.code} — ${course.title} · Source PDF Pages ${topic.pageStart}–${topic.pageEnd}`}
      />

      <main className="p-4 sm:p-8 max-w-5xl mx-auto w-full space-y-6">
        {/* Top Action Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/portal/student/materials"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-[#073832]"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to PDF Learning Centre</span>
          </Link>

          <div className="flex flex-wrap items-center gap-2.5">
            <a
              href={`${topic.pdfUrl}#page=${topic.pageStart}`}
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2 bg-white border border-slate-200 hover:border-emerald-300 text-slate-800 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-sm"
            >
              <FileText className="w-4 h-4 text-emerald-700" />
              <span>View Original PDF (p. {topic.pageStart})</span>
              <ExternalLink className="w-3 h-3 text-slate-400" />
            </a>

            <button
              onClick={handleToggleComplete}
              disabled={toggling}
              className={`px-4 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-sm transition ${
                mastery?.completed
                  ? 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                  : 'bg-[#073832] text-white hover:bg-emerald-900'
              }`}
            >
              {mastery?.completed ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                  <span>Completed</span>
                </>
              ) : (
                <>
                  <Circle className="w-4 h-4 text-emerald-300" />
                  <span>Mark as Completed</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Reading Card */}
        <article className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200/90 shadow-sm space-y-8">
          <header className="space-y-2 border-b border-slate-100 pb-6">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-black bg-emerald-50 text-emerald-800 px-2.5 py-1 rounded-full border border-emerald-100">
                {course.code} · Topic #{topic.orderIndex}
              </span>
              <span className="text-[11px] font-semibold text-slate-500">
                Source: {topic.material?.title} (pp. {topic.pageStart}–{topic.pageEnd})
              </span>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
                Status: {mastery?.masteryStatus || 'IN_PROGRESS'}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#073832] tracking-tight pt-1">
              {topic.title}
            </h1>
            {topic.description && (
              <p className="text-sm text-slate-600 leading-relaxed">{topic.description}</p>
            )}
          </header>

          {/* Learning Objectives */}
          {content.learningObjectives?.length > 0 && (
            <section className="bg-emerald-50/70 rounded-2xl p-5 border border-emerald-100 space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-emerald-900">
                <Sparkles className="w-4 h-4 text-emerald-700" />
                <span>Learning Objectives</span>
              </div>
              <ul className="space-y-1.5 text-xs sm:text-sm text-slate-700 list-disc list-inside">
                {content.learningObjectives.map((obj: string, i: number) => (
                  <li key={i}>{obj}</li>
                ))}
              </ul>
            </section>
          )}

          {/* Main Explanation */}
          <section className="space-y-3">
            <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-emerald-700" />
              <span>Detailed Study Content</span>
            </h2>
            <div className="text-sm sm:text-[15px] text-slate-700 leading-7 whitespace-pre-line">
              {content.mainExplanation || topic.rawText || topic.description}
            </div>
          </section>

          {/* Subtopics */}
          {topic.subtopics?.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-base font-extrabold text-slate-900">Subtopics Covered</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {topic.subtopics.map((sub: any) => (
                  <div key={sub.id} className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80">
                    <h3 className="text-xs font-extrabold text-[#073832]">{sub.title}</h3>
                    {sub.summary && <p className="text-xs text-slate-600 mt-1">{sub.summary}</p>}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Important Definitions */}
          {content.definitions?.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-base font-extrabold text-slate-900">Important Definitions</h2>
              <div className="space-y-2.5">
                {content.definitions.map((d: any, idx: number) => (
                  <div key={idx} className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                    <span className="text-xs font-black text-emerald-800">{d.term}: </span>
                    <span className="text-xs sm:text-sm text-slate-700">{d.definition}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Key Points & Revision Notes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
            {content.keyPoints?.length > 0 && (
              <section className="bg-slate-50 rounded-2xl p-5 border border-slate-200/80 space-y-2">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <ListChecks className="w-4 h-4 text-emerald-700" />
                  <span>Key Takeaways</span>
                </h3>
                <ul className="space-y-1.5 text-xs text-slate-600 list-disc list-inside">
                  {content.keyPoints.map((kp: string, i: number) => (
                    <li key={i}>{kp}</li>
                  ))}
                </ul>
              </section>
            )}

            <section className="bg-[#073832] text-white rounded-2xl p-5 space-y-2">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-emerald-300">
                Summary &amp; Revision Notes
              </h3>
              <p className="text-xs text-emerald-100/90 leading-relaxed">
                {content.summary || topic.summary}
              </p>
              {content.revisionNotes && (
                <p className="text-[11px] text-emerald-200/80 pt-2 border-t border-emerald-800">
                  {content.revisionNotes}
                </p>
              )}
            </section>
          </div>
        </article>

        {/* Topic Quizzes Section */}
        <section className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-extrabold text-[#073832]">Topic Knowledge Check &amp; Quizzes</h2>
              <p className="text-xs text-slate-500">
                Assess your mastery of &ldquo;{topic.title}&rdquo;. Achieve 80%+ to earn Mastered status.
              </p>
            </div>
            {mastery?.attemptsCount > 0 && (
              <div className="text-right">
                <div className="text-xs text-slate-500">Best Score</div>
                <div className="text-lg font-black text-emerald-700">{mastery.bestScore}%</div>
              </div>
            )}
          </div>

          {quizzes?.length === 0 ? (
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-500 text-center">
              No quizzes published for this topic yet. Check back soon or review the PDF material above.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {quizzes.map((q: any) => (
                <div key={q.id} className="p-5 rounded-2xl border border-emerald-200 bg-emerald-50/40 flex flex-col justify-between gap-4">
                  <div>
                    <div className="flex items-center justify-between text-[11px] font-bold text-emerald-800">
                      <span>{q.assessmentType}</span>
                      <span>{q._count?.questions || 0} Questions · {q.durationMinutes} mins</span>
                    </div>
                    <h3 className="text-base font-extrabold text-slate-900 mt-1">{q.title}</h3>
                    <p className="text-xs text-slate-600 mt-1">
                      Pass Mark: {q.passMark}% · Attempts Used: {q.attempts?.length || 0} / {q.maxAttempts}
                    </p>
                  </div>
                  <Link
                    href={`/portal/student/topic-quiz/${q.id}`}
                    className="w-full py-2.5 bg-[#073832] hover:bg-emerald-900 text-white rounded-xl text-xs font-bold inline-flex items-center justify-center gap-2"
                  >
                    <Award className="w-4 h-4 text-emerald-300" />
                    <span>{q.attempts?.length > 0 ? 'Retake / View Results' : 'Start Topic Quiz'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Previous / Next Topic Navigation */}
        {(data.prevTopic || data.nextTopic) && (
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            {data.prevTopic ? (
              <Link
                href={`/portal/student/topics/${data.prevTopic.id}`}
                className="px-4 py-3 bg-white border border-slate-200 hover:border-emerald-300 rounded-2xl text-xs font-bold text-slate-800 inline-flex items-center gap-2 shadow-sm"
              >
                <ArrowLeft className="w-4 h-4 text-emerald-700" />
                <span>Previous: {data.prevTopic.title}</span>
              </Link>
            ) : (
              <span />
            )}

            {data.nextTopic && (
              <Link
                href={`/portal/student/topics/${data.nextTopic.id}`}
                className="px-4 py-3 bg-[#073832] hover:bg-emerald-900 text-white rounded-2xl text-xs font-bold inline-flex items-center gap-2 shadow-sm ml-auto"
              >
                <span>Next: {data.nextTopic.title}</span>
                <ArrowRight className="w-4 h-4 text-emerald-300" />
              </Link>
            )}
          </div>
        )}
      </main>
    </>
  );
}

