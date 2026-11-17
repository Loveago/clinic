'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import {
  Clock,
  ArrowLeft,
  ArrowRight,
  Flag,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Award,
  Send,
} from 'lucide-react';
import StudentHeader from '@/components/StudentHeader';

export default function StudentTopicQuizPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState<any>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [flagged, setFlagged] = useState<Record<string, boolean>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadAssessment = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/student/topic-assessments/${id}`);
      const d = await res.json();
      if (!res.ok) {
        setErrorMsg(d.error || 'Could not load assessment');
      } else {
        setData(d);
        if (d.activeAttempt) {
          setAttempt(d.activeAttempt);
          if (d.activeAttempt.expiresAt) {
            const diff = Math.max(0, Math.floor((new Date(d.activeAttempt.expiresAt).getTime() - Date.now()) / 1000));
            setSecondsLeft(diff);
          }
        }
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAssessment();
  }, [id]);

  // Countdown timer
  useEffect(() => {
    if (secondsLeft === null || !attempt || result) return;
    if (secondsLeft <= 0) {
      handleSubmit(true);
      return;
    }
    const timer = setInterval(() => {
      setSecondsLeft((s) => (s !== null && s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [secondsLeft, attempt, result]);

  const handleStart = async () => {
    setErrorMsg(null);
    const res = await fetch(`/api/student/topic-assessments/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'start' }),
    });
    const d = await res.json();
    if (!res.ok) {
      setErrorMsg(d.error || 'Unable to start attempt');
      return;
    }
    setAttempt(d.attempt);
    setResult(null);
    if (d.attempt.expiresAt) {
      const diff = Math.max(0, Math.floor((new Date(d.attempt.expiresAt).getTime() - Date.now()) / 1000));
      setSecondsLeft(diff);
    }
  };

  const handleSaveProgress = async (nextAnswers: Record<string, string>) => {
    if (!attempt) return;
    await fetch(`/api/student/topic-assessments/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'save', attemptId: attempt.id, answers: nextAnswers }),
    }).catch(() => {});
  };

  const setAnswer = (questionId: string, val: string) => {
    const next = { ...answers, [questionId]: val };
    setAnswers(next);
    handleSaveProgress(next);
  };

  const handleSubmit = async (auto = false) => {
    if (submitting || !attempt) return;
    if (!auto && !confirm('Submit your answers now? You cannot edit answers after submission.')) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/student/topic-assessments/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'submit', attemptId: attempt.id, answers }),
      });
      const d = await res.json();
      if (!res.ok) {
        setErrorMsg(d.error || 'Submission failed');
      } else {
        setResult(d.result);
        setAttempt(null);
        await loadAssessment();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <>
        <StudentHeader title="Topic Assessment" subtitle="Loading quiz..." />
        <main className="p-8 text-center text-xs text-slate-500">Loading assessment...</main>
      </>
    );
  }

  const assessment = data?.assessment;
  const questions = data?.questions || [];
  const currentQ = questions[currentIndex];

  return (
    <>
      <StudentHeader
        title={assessment?.title || 'Topic Assessment'}
        subtitle={
          assessment
            ? `${assessment.course?.code} — ${assessment.course?.title}${
                assessment.topic ? ` · Topic: ${assessment.topic.title}` : ''
              }`
            : ''
        }
      />

      <main className="p-4 sm:p-8 max-w-4xl mx-auto w-full space-y-6">
        <div className="flex items-center justify-between">
          <Link
            href={
              assessment?.topic
                ? `/portal/student/topics/${assessment.topic.id}`
                : '/portal/student/materials'
            }
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-[#073832]"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Topic</span>
          </Link>

          {attempt && secondsLeft !== null && (
            <div
              className={`px-4 py-2 rounded-xl font-black text-xs inline-flex items-center gap-2 ${
                secondsLeft < 60
                  ? 'bg-red-100 text-red-700 border border-red-200'
                  : 'bg-[#073832] text-emerald-300'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>Time Left: {formatTimer(secondsLeft)}</span>
            </div>
          )}
        </div>

        {errorMsg && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-2xl text-xs font-bold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* RESULT VIEW */}
        {result && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
            <div className="text-center space-y-2 border-b border-slate-100 pb-6">
              <div
                className={`w-16 h-16 rounded-full mx-auto flex items-center justify-center ${
                  result.needsManualGrading
                    ? 'bg-amber-100 text-amber-700'
                    : result.passed
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-red-100 text-red-700'
                }`}
              >
                <Award className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-extrabold text-[#073832]">
                {result.needsManualGrading
                  ? 'Submitted — Pending Short-Answer Grading'
                  : result.passed
                  ? 'Assessment Passed!'
                  : 'Needs Revision'}
              </h2>
              <p className="text-sm text-slate-600">
                Score: <span className="font-black text-slate-900">{result.totalScore} / {result.maxScore}</span> ({result.percentage}%)
              </p>
              {!result.passed && !result.needsManualGrading && (
                <p className="text-xs text-amber-700 font-semibold">
                  Recommendation: Revisit the topic notes and source PDF pages, then retake the quiz.
                </p>
              )}
            </div>

            {result.review ? (
              <div className="space-y-3">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                  Answer Review
                </h3>
                {result.review.map((r: any, i: number) => (
                  <div key={r.questionId} className="p-4 rounded-2xl border border-slate-200 space-y-2 text-xs">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-bold text-slate-900">
                        Q{i + 1}: {r.questionText}
                      </span>
                      {r.needsManualReview ? (
                        <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold shrink-0">
                          Pending Review
                        </span>
                      ) : r.isCorrect ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-600 shrink-0" />
                      )}
                    </div>
                    <div className="text-slate-600">
                      <span className="font-bold">Your Answer:</span> {r.answerText || r.selectedOption || '(No answer)'}
                    </div>
                    {r.correctAnswer && !r.needsManualReview && (
                      <div className="text-emerald-800 font-semibold">
                        Correct Answer: {r.correctAnswer}
                      </div>
                    )}
                    {r.explanation && (
                      <div className="bg-slate-50 p-2.5 rounded-xl text-slate-600">
                        <span className="font-bold">Explanation:</span> {r.explanation}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 text-center">
                Detailed answer review is hidden by assessment settings.
              </p>
            )}
          </div>
        )}

        {/* PRE-START SCREEN */}
        {!attempt && !result && assessment && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
            <div className="space-y-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full">
                {assessment.assessmentType}
              </span>
              <h1 className="text-2xl font-extrabold text-[#073832] pt-1">{assessment.title}</h1>
              <p className="text-xs sm:text-sm text-slate-600">{assessment.instructions}</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                <div className="text-base font-black text-slate-900">{questions.length}</div>
                <div className="text-[11px] text-slate-500">Questions</div>
              </div>
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                <div className="text-base font-black text-slate-900">{assessment.durationMinutes} mins</div>
                <div className="text-[11px] text-slate-500">Time Limit</div>
              </div>
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                <div className="text-base font-black text-emerald-700">{assessment.passMark}%</div>
                <div className="text-[11px] text-slate-500">Pass Mark</div>
              </div>
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                <div className="text-base font-black text-slate-900">
                  {data?.pastAttempts?.length || 0} / {assessment.maxAttempts}
                </div>
                <div className="text-[11px] text-slate-500">Attempts Used</div>
              </div>
            </div>

            <button
              onClick={handleStart}
              disabled={(data?.pastAttempts?.length || 0) >= assessment.maxAttempts}
              className="w-full py-3.5 bg-[#073832] hover:bg-emerald-900 disabled:bg-slate-300 text-white rounded-2xl text-sm font-bold transition shadow-md"
            >
              {(data?.pastAttempts?.length || 0) >= assessment.maxAttempts
                ? 'Maximum Attempts Reached'
                : 'Start Assessment Now'}
            </button>

            {data?.pastAttempts?.length > 0 && (
              <div className="pt-4 border-t border-slate-100 space-y-2">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                  Previous Attempts
                </h3>
                {data.pastAttempts.map((pa: any) => (
                  <div key={pa.id} className="flex items-center justify-between text-xs bg-slate-50 p-3 rounded-xl">
                    <span className="font-bold">Attempt #{pa.attemptNumber}</span>
                    <span>
                      {pa.totalScore}/{pa.maxScore} ({pa.percentage}%) ·{' '}
                      <span className={pa.passed ? 'text-emerald-700 font-bold' : 'text-red-600 font-bold'}>
                        {pa.status === 'NEEDS_MANUAL_GRADING' ? 'Pending Grading' : pa.passed ? 'Passed' : 'Needs Revision'}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ACTIVE QUIZ INTERFACE */}
        {attempt && currentQ && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
            {/* Progress & Navigator */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                <span>
                  Question {currentIndex + 1} of {questions.length} ({currentQ.questionType} · {currentQ.marks} Marks)
                </span>
                <button
                  onClick={() => setFlagged({ ...flagged, [currentQ.id]: !flagged[currentQ.id] })}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg ${
                    flagged[currentQ.id] ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  <Flag className="w-3.5 h-3.5" />
                  <span>{flagged[currentQ.id] ? 'Flagged' : 'Mark for Review'}</span>
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {questions.map((q: any, idx: number) => {
                  const isAnswered = Boolean(answers[q.id]);
                  const isFlagged = Boolean(flagged[q.id]);
                  return (
                    <button
                      key={q.id}
                      onClick={() => setCurrentIndex(idx)}
                      className={`w-8 h-8 rounded-lg text-xs font-bold border transition ${
                        idx === currentIndex
                          ? 'bg-[#073832] text-white border-[#073832]'
                          : isFlagged
                          ? 'bg-amber-100 text-amber-900 border-amber-300'
                          : isAnswered
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-slate-50 text-slate-500 border-slate-200'
                      }`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Question Prompt */}
            <div className="space-y-4 pt-2">
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900 leading-snug">
                {currentQ.questionText}
              </h2>

              {/* MCQ / TRUE_FALSE / SCENARIO */}
              {['MCQ', 'TRUE_FALSE', 'SCENARIO'].includes(currentQ.questionType) &&
                Array.isArray(currentQ.options) && (
                  <div className="space-y-2.5">
                    {currentQ.options.map((opt: string) => {
                      const selected = answers[currentQ.id] === opt;
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setAnswer(currentQ.id, opt)}
                          className={`w-full text-left p-4 rounded-2xl border text-xs sm:text-sm font-semibold transition ${
                            selected
                              ? 'bg-emerald-50 border-emerald-600 text-[#073832] ring-2 ring-emerald-500/20'
                              : 'bg-slate-50/70 border-slate-200 hover:border-emerald-300 text-slate-800'
                          }`}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                )}

              {/* FILL_BLANK */}
              {currentQ.questionType === 'FILL_BLANK' && (
                <input
                  type="text"
                  value={answers[currentQ.id] || ''}
                  onChange={(e) => setAnswer(currentQ.id, e.target.value)}
                  placeholder="Type the missing term..."
                  className="w-full p-4 rounded-2xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600/30"
                />
              )}

              {/* SHORT_ANSWER / ESSAY */}
              {['SHORT_ANSWER', 'ESSAY'].includes(currentQ.questionType) && (
                <textarea
                  rows={currentQ.questionType === 'ESSAY' ? 7 : 4}
                  value={answers[currentQ.id] || ''}
                  onChange={(e) => setAnswer(currentQ.id, e.target.value)}
                  placeholder={
                    currentQ.questionType === 'ESSAY'
                      ? 'Write a detailed, structured clinical essay response covering all key points...'
                      : 'Write a clear clinical/academic response...'
                  }
                  className="w-full p-4 rounded-2xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600/30"
                />
              )}

              {/* MATCHING */}
              {currentQ.questionType === 'MATCHING' && currentQ.options?.leftItems && (
                <div className="space-y-3">
                  {currentQ.options.leftItems.map((left: string) => {
                    const currentMap = answers[currentQ.id] ? JSON.parse(answers[currentQ.id]) : {};
                    return (
                      <div key={left} className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center bg-slate-50 p-3 rounded-xl border border-slate-200">
                        <div className="text-xs font-bold text-slate-900">{left}</div>
                        <select
                          value={currentMap[left] || ''}
                          onChange={(e) => {
                            const updated = { ...currentMap, [left]: e.target.value };
                            setAnswer(currentQ.id, JSON.stringify(updated));
                          }}
                          className="text-xs border border-slate-300 rounded-xl px-3 py-2 bg-white"
                        >
                          <option value="">Select matching description...</option>
                          {currentQ.options.rightItems.map((right: string) => (
                            <option key={right} value={right}>
                              {right}
                            </option>
                          ))}
                        </select>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Navigation & Submit */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <button
                onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
                disabled={currentIndex === 0}
                className="px-4 py-2.5 bg-slate-100 disabled:opacity-40 text-slate-800 rounded-xl text-xs font-bold inline-flex items-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Previous</span>
              </button>

              {currentIndex < questions.length - 1 ? (
                <button
                  onClick={() => setCurrentIndex((i) => Math.min(questions.length - 1, i + 1))}
                  className="px-5 py-2.5 bg-[#073832] text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5"
                >
                  <span>Next</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={() => handleSubmit(false)}
                  disabled={submitting}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-md"
                >
                  <Send className="w-4 h-4" />
                  <span>{submitting ? 'Submitting...' : 'Submit Assessment'}</span>
                </button>
              )}
            </div>
          </div>
        )}
      </main>
    </>
  );
}

