'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import {
  Clock,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Send,
  Loader2,
  BookOpen,
  Award,
  Flag,
  Maximize2,
  Minimize2,
  Wifi,
  WifiOff,
  Lock,
} from 'lucide-react';

export default function CBTExamTakingPage() {
  const [exam, setExam] = useState<any>(null);
  const [sections, setSections] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [eligibility, setEligibility] = useState<any>(null);
  const [activeAttempt, setActiveAttempt] = useState<any>(null);
  const [latestAttempt, setLatestAttempt] = useState<any>(null);

  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [flagged, setFlagged] = useState<string[]>([]);
  const [timeLeft, setTimeLeft] = useState(45 * 60);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [submitResult, setSubmitResult] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [isFullscreen, setIsFullscreen] = useState(false);

  const idempotencyKeyRef = useRef<string>(`exam-sub-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const submittingRef = useRef(false);

  const loadExamData = useCallback(async () => {
    try {
      const params = new URLSearchParams(window.location.search);
      let examId = params.get('id');
      if (!examId) {
        const dashRes = await fetch('/api/student/dashboard');
        const dashData = await dashRes.json();
        examId = dashData.upcomingExams?.[0]?.id || dashData.latestAttempt?.examId || 'default';
      }

      const res = await fetch(`/api/student/exams/${examId}`);
      const data = await res.json();
      if (data.exam) {
        setExam(data.exam);
        setSections(data.exam.sections || []);
        setQuestions(data.exam.questions || []);
        setEligibility(data.eligibility || null);
        setLatestAttempt(data.latestAttempt || null);
        if (data.activeAttempt) {
          setActiveAttempt(data.activeAttempt);
          setAnswers(data.activeAttempt.savedAnswers || {});
          setFlagged(data.activeAttempt.flaggedQuestions || []);
          setTimeLeft(data.activeAttempt.remainingSeconds ?? (data.exam.durationMinutes || 45) * 60);
        } else {
          setTimeLeft((data.exam.durationMinutes || 45) * 60);
        }
      } else {
        setErrorMsg(data.error || 'Examination not found.');
      }
    } catch {
      setErrorMsg('Failed to load examination details.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadExamData();
  }, [loadExamData]);

  const handleFinalSubmit = useCallback(
    async (autoSubmitted = false) => {
      if (!exam || submittingRef.current) return;
      submittingRef.current = true;
      setSubmitting(true);
      setShowConfirmModal(false);
      try {
        const res = await fetch(`/api/student/exams/${exam.id}/submit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            answers,
            attemptId: activeAttempt?.id,
            idempotencyKey: idempotencyKeyRef.current,
            autoSubmitted,
          }),
        });
        const data = await res.json();
        if (res.ok) {
          setSubmitResult(data);
          setActiveAttempt(null);
        } else {
          setErrorMsg(data.error || 'Submission failed.');
          submittingRef.current = false;
        }
      } catch {
        setErrorMsg('Network error during submission. Please retry.');
        submittingRef.current = false;
      } finally {
        setSubmitting(false);
      }
    },
    [exam, answers, activeAttempt]
  );

  // Server-synced countdown timer while session is active
  useEffect(() => {
    if (!activeAttempt || submitting || submitResult) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleFinalSubmit(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [activeAttempt, submitting, submitResult, handleFinalSubmit]);

  // Debounced autosave to server
  const persistAutosave = useCallback(
    async (nextAnswers: Record<string, string>, nextFlagged: string[]) => {
      if (!exam || !activeAttempt) return;
      setSaveStatus('saving');
      try {
        const res = await fetch(`/api/student/exams/${exam.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            attemptId: activeAttempt.id,
            answers: nextAnswers,
            flaggedQuestions: nextFlagged,
          }),
        });
        const data = await res.json();
        if (data.expired && data.result) {
          setSubmitResult(data.result);
          setActiveAttempt(null);
          return;
        }
        if (res.ok) {
          setSaveStatus('saved');
          if (typeof data.remainingSeconds === 'number') {
            setTimeLeft(data.remainingSeconds);
          }
        } else {
          setSaveStatus('error');
        }
      } catch {
        setSaveStatus('error');
      }
    },
    [exam, activeAttempt]
  );

  const scheduleAutosave = (nextAnswers: Record<string, string>, nextFlagged: string[]) => {
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(() => {
      persistAutosave(nextAnswers, nextFlagged);
    }, 600);
  };

  // Integrity event logging (tab switch, fullscreen exit)
  useEffect(() => {
    if (!exam || !activeAttempt || submitResult) return;

    const sendIntegrityEvent = (eventType: string) => {
      fetch(`/api/student/exams/${exam.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attemptId: activeAttempt.id,
          integrityEvent: { eventType, details: { timestamp: new Date().toISOString() } },
        }),
      }).catch(() => {});
    };

    const onVisibilityChange = () => {
      if (document.hidden) sendIntegrityEvent('TAB_SWITCH');
    };
    const onFullscreenChange = () => {
      const fs = Boolean(document.fullscreenElement);
      setIsFullscreen(fs);
      if (!fs) sendIntegrityEvent('FULLSCREEN_EXIT');
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      document.removeEventListener('fullscreenchange', onFullscreenChange);
    };
  }, [exam, activeAttempt, submitResult]);

  // Keyboard Left/Right navigation
  useEffect(() => {
    if (!activeAttempt || submitResult) return;
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === 'ArrowRight') {
        setCurrentIdx((i) => Math.min(questions.length - 1, i + 1));
      } else if (e.key === 'ArrowLeft') {
        setCurrentIdx((i) => Math.max(0, i - 1));
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeAttempt, submitResult, questions.length]);

  const handleStartExam = async () => {
    if (!exam) return;
    setStarting(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/student/exams/${exam.id}`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Unable to start examination.');
        if (data.eligibility) setEligibility(data.eligibility);
        return;
      }
      if (data.attempt) {
        setActiveAttempt(data.attempt);
        setAnswers(data.attempt.savedAnswers || {});
        setFlagged(data.attempt.flaggedQuestions || []);
        setTimeLeft(data.attempt.remainingSeconds ?? (exam.durationMinutes || 45) * 60);
      }
      if (Array.isArray(data.sections)) setSections(data.sections);
      if (Array.isArray(data.questions)) setQuestions(data.questions);
    } catch {
      setErrorMsg('Network error starting examination.');
    } finally {
      setStarting(false);
    }
  };

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      // Ignore if browser blocks fullscreen
    }
  };

  const updateAnswer = (qId: string, val: string) => {
    const next = { ...answers, [qId]: val };
    setAnswers(next);
    scheduleAutosave(next, flagged);
  };

  const toggleFlag = (qId: string) => {
    const next = flagged.includes(qId)
      ? flagged.filter((id) => id !== qId)
      : [...flagged, qId];
    setFlagged(next);
    scheduleAutosave(answers, next);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-8 text-center">
        <Loader2 className="w-10 h-10 text-emerald-800 animate-spin mb-4" />
        <h2 className="text-lg font-bold text-slate-800">Preparing Examination Environment...</h2>
        <p className="text-xs text-slate-500 mt-1">Verifying eligibility and loading your paper.</p>
      </div>
    );
  }

  // Post-Submission Automated Report OR Previously Completed View
  const reportData = submitResult || (!activeAttempt && latestAttempt && !eligibility?.eligible ? {
    ...latestAttempt,
    questionReview: latestAttempt.evaluationDetails || [],
  } : null);

  if (reportData) {
    const isFailed = reportData.evaluationStatus === 'FAILED';
    const isPendingVerification = reportData.evaluationStatus === 'NEEDS_VERIFICATION';
    const isAwaitingPublication = reportData.resultPublished === false && !isFailed && !isPendingVerification;

    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 sm:p-8">
        <div className="max-w-3xl w-full bg-white rounded-3xl p-6 sm:p-10 shadow-xl border border-slate-100 space-y-6">
          <div className="text-center space-y-3">
            <div
              className={`w-16 h-16 rounded-2xl mx-auto flex items-center justify-center ${
                isFailed || isPendingVerification || isAwaitingPublication
                  ? 'bg-amber-100 text-amber-700'
                  : reportData.passed
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-rose-100 text-rose-700'
              }`}
            >
              {isFailed || isPendingVerification || isAwaitingPublication ? (
                <Clock className="w-8 h-8" />
              ) : (
                <Award className="w-8 h-8" />
              )}
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900">
              {isFailed
                ? 'Evaluation Pending / Failed'
                : isPendingVerification
                ? 'Submitted for Verification'
                : isAwaitingPublication
                ? 'Examination Submitted Successfully'
                : reportData.passed
                ? 'Examination Passed!'
                : 'Examination Completed'}
            </h2>
            <p className="text-sm text-slate-600">{exam?.title}</p>
          </div>

          {isFailed && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-800">
              Your answers are safely recorded. Automated subjective grading encountered a temporary issue and has been queued for automatic retry.
            </div>
          )}

          {isAwaitingPublication && (
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-xs text-blue-800">
              Results for this examination are scheduled for publication ({reportData.publicationMode})
              {reportData.publishAt ? ` on ${new Date(reportData.publishAt).toLocaleString()}` : ''}.
            </div>
          )}

          {reportData.resultPublished !== false && !isFailed && (
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100">
                <span className="text-[10px] font-bold uppercase text-emerald-700 block">Score</span>
                <span className="text-2xl font-black text-emerald-900">{reportData.percentage}%</span>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-bold uppercase text-slate-500 block">Correct</span>
                <span className="text-2xl font-black text-slate-900">
                  {reportData.correctCount ?? '-'} / {reportData.totalQuestions}
                </span>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-bold uppercase text-slate-500 block">Result</span>
                <span
                  className={`text-sm font-black ${
                    reportData.passed ? 'text-emerald-700' : 'text-rose-700'
                  }`}
                >
                  {reportData.passed ? 'PASSED' : 'BELOW PASS MARK'}
                </span>
              </div>
            </div>
          )}

          {/* Question-by-question Feedback */}
          {Array.isArray(reportData.questionReview) && reportData.questionReview.length > 0 && (
            <div className="space-y-3 pt-2">
              <h3 className="text-sm font-bold text-slate-900">Automated Assessment Report</h3>
              <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                {reportData.questionReview.map((qr: any, idx: number) => (
                  <div key={qr.id || idx} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-2 text-xs">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-bold text-slate-900">
                        Q{idx + 1}. {qr.text}
                      </p>
                      <span className="px-2 py-0.5 rounded-full font-bold bg-white border border-slate-200 shrink-0">
                        {qr.marksAwarded ?? 0} / {qr.maxMarks}
                      </span>
                    </div>
                    <p className="text-slate-700">
                      <span className="font-semibold">Your Answer:</span> {qr.studentAnswer || '(No answer)'}
                    </p>
                    {qr.feedback && (
                      <p className="text-slate-600 bg-white p-2.5 rounded-xl border border-slate-100">
                        {qr.feedback}
                      </p>
                    )}
                    {(qr.correctAnswer || qr.expectedAnswer) && (
                      <p className="text-emerald-800 font-semibold">
                        Model Answer: {qr.correctAnswer || qr.expectedAnswer}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Revision Recommendations */}
          {Array.isArray(reportData.revisionRecommendations) &&
            reportData.revisionRecommendations.length > 0 && (
              <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-indigo-900">
                  <BookOpen className="w-4 h-4" />
                  <span>Recommended Revision Topics</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {reportData.revisionRecommendations.map((rec: any, i: number) => (
                    <Link
                      key={i}
                      href={rec.topicId ? `/portal/student/topics/${rec.topicId}` : '/portal/student/revision'}
                      className="px-3 py-1.5 bg-white border border-indigo-200 rounded-xl text-xs font-bold text-indigo-800 hover:bg-indigo-100"
                    >
                      {rec.topicTitle || rec.title || 'Review Topic'}
                    </Link>
                  ))}
                </div>
              </div>
            )}

          <div className="flex items-center gap-3 pt-2">
            <Link
              href="/portal/student/exams"
              className="flex-1 py-3 px-4 bg-[#073832] hover:bg-emerald-900 text-white text-xs font-bold rounded-xl text-center"
            >
              Back to Examinations
            </Link>
            <Link
              href="/portal/student/results"
              className="py-3 px-4 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl"
            >
              View Transcript
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Pre-Start / Eligibility Gate Screen
  if (!activeAttempt) {
    const eligible = eligibility?.eligible !== false;
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 sm:p-8">
        <div className="max-w-xl w-full bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-200 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-800 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
                {exam?.courseCode} · {exam?.courseName}
              </span>
              <h1 className="text-xl font-extrabold text-slate-900">{exam?.title}</h1>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Duration</span>
              <span className="font-bold text-slate-900">{exam?.durationMinutes} mins</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Questions</span>
              <span className="font-bold text-slate-900">{questions.length}</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Pass Mark</span>
              <span className="font-bold text-slate-900">{exam?.passMark}%</span>
            </div>
          </div>

          <div className="bg-slate-50 rounded-2xl p-4 text-xs text-slate-700 space-y-2 border border-slate-100">
            <p className="font-bold text-slate-900">Examination Instructions</p>
            <p>{exam?.instructions}</p>
          </div>

          {errorMsg && (
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-xs text-rose-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {!eligible && Array.isArray(eligibility?.reasons) && eligibility.reasons.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-800 space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                <Lock className="w-4 h-4" />
                <span>Eligibility Check Failed</span>
              </p>
              <ul className="list-disc pl-5 space-y-0.5">
                {eligibility.reasons.map((r: string, i: number) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex items-center gap-3">
            <Link
              href="/portal/student/exams"
              className="py-3 px-4 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50"
            >
              Back
            </Link>
            <button
              onClick={handleStartExam}
              disabled={!eligible || starting}
              className="flex-1 py-3 px-5 bg-[#073832] hover:bg-emerald-900 disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs font-bold rounded-xl shadow-md flex items-center justify-center gap-2"
            >
              {starting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Starting Session...</span>
                </>
              ) : (
                <>
                  <span>Begin Examination Now</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentQ = questions[currentIdx];
  const answeredCount = Object.values(answers).filter((v) => String(v || '').trim() !== '').length;
  const isLowTime = timeLeft <= 300;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      {/* Top Distraction-Free Exam Header */}
      <header className="bg-[#073832] text-white px-4 sm:px-8 py-3.5 shadow-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider">
              {exam?.courseCode} · Attempt #{activeAttempt.attemptNumber}
            </p>
            <h1 className="text-sm sm:text-base font-extrabold truncate max-w-md">{exam?.title}</h1>
          </div>

          <div className="flex items-center gap-3">
            {/* Autosave Status */}
            <div className="hidden sm:flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl bg-emerald-900/60 border border-emerald-700/50">
              {saveStatus === 'error' ? (
                <>
                  <WifiOff className="w-3.5 h-3.5 text-rose-300" />
                  <span className="text-rose-200">Connection interrupted</span>
                </>
              ) : saveStatus === 'saving' ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-300" />
                  <span className="text-emerald-200">Saving...</span>
                </>
              ) : (
                <>
                  <Wifi className="w-3.5 h-3.5 text-emerald-300" />
                  <span className="text-emerald-100">
                    {saveStatus === 'saved' ? 'All answers saved' : 'Autosave active'}
                  </span>
                </>
              )}
            </div>

            {/* Countdown Timer */}
            <div
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl font-mono text-sm font-black ${
                isLowTime
                  ? 'bg-rose-600 text-white animate-pulse'
                  : 'bg-emerald-950/80 text-emerald-200 border border-emerald-700/60'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>{formatTime(timeLeft)}</span>
            </div>

            <button
              onClick={toggleFullscreen}
              title="Toggle Fullscreen"
              className="p-2 rounded-xl bg-emerald-900/70 hover:bg-emerald-800 text-emerald-100"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </header>

      {isLowTime && (
        <div className="bg-rose-600 text-white text-center py-1.5 px-4 text-xs font-bold">
          Less than 5 minutes remaining! Your examination will auto-submit automatically at 00:00.
        </div>
      )}

      {errorMsg && (
        <div className="max-w-7xl mx-auto w-full px-4 pt-4">
          <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-xl p-3 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        </div>
      )}

      {/* Main Split Layout */}
      <main className="max-w-7xl mx-auto w-full flex-1 p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Question Card */}
        <div className="lg:col-span-3 bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 flex flex-col justify-between space-y-6">
          {currentQ ? (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold">
                    Question {currentIdx + 1} of {questions.length}
                  </span>
                  {currentQ.sectionTitle && (
                    <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-[11px] font-semibold">
                      {currentQ.sectionTitle}
                    </span>
                  )}
                  <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-[11px] font-bold">
                    {currentQ.marks} marks
                  </span>
                </div>

                <button
                  onClick={() => toggleFlag(currentQ.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all ${
                    flagged.includes(currentQ.id)
                      ? 'bg-amber-50 border-amber-300 text-amber-800'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Flag className="w-3.5 h-3.5" />
                  <span>{flagged.includes(currentQ.id) ? 'Flagged' : 'Mark for Review'}</span>
                </button>
              </div>

              <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-relaxed">
                {currentQ.text}
              </h2>

              {/* Answer Input by Question Type */}
              {['MCQ', 'TRUE_FALSE'].includes((currentQ.questionType || 'MCQ').toUpperCase()) ? (
                <div className="space-y-3">
                  {(Array.isArray(currentQ.options) && currentQ.options.length > 0
                    ? currentQ.options
                    : ['True', 'False']
                  ).map((opt: string, optIdx: number) => {
                    const selected = answers[currentQ.id] === opt;
                    return (
                      <button
                        key={optIdx}
                        onClick={() => updateAnswer(currentQ.id, opt)}
                        className={`w-full text-left p-4 rounded-2xl border text-sm font-medium transition-all flex items-center gap-3 ${
                          selected
                            ? 'bg-emerald-50 border-emerald-600 text-emerald-950 shadow-sm'
                            : 'bg-white border-slate-200 text-slate-700 hover:border-emerald-300 hover:bg-slate-50'
                        }`}
                      >
                        <span
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                            selected
                              ? 'bg-emerald-700 text-white'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {String.fromCharCode(65 + optIdx)}
                        </span>
                        <span>{opt}</span>
                      </button>
                    );
                  })}
                </div>
              ) : (currentQ.questionType || '').toUpperCase() === 'FILL_BLANK' ? (
                <input
                  type="text"
                  value={answers[currentQ.id] || ''}
                  onChange={(e) => updateAnswer(currentQ.id, e.target.value)}
                  placeholder="Type your answer here..."
                  className="w-full p-4 rounded-2xl border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 outline-none text-sm"
                />
              ) : (
                <textarea
                  rows={6}
                  value={answers[currentQ.id] || ''}
                  onChange={(e) => updateAnswer(currentQ.id, e.target.value)}
                  placeholder="Write your clinical/analytical response clearly..."
                  className="w-full p-4 rounded-2xl border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 outline-none text-sm leading-relaxed"
                />
              )}
            </div>
          ) : (
            <p className="text-sm text-slate-500">No questions available in this examination.</p>
          )}

          {/* Navigation Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <button
              onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
              disabled={currentIdx === 0}
              className="py-2.5 px-4 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Previous</span>
            </button>

            {currentIdx < questions.length - 1 ? (
              <button
                onClick={() => setCurrentIdx((i) => Math.min(questions.length - 1, i + 1))}
                className="py-2.5 px-5 rounded-xl bg-[#073832] hover:bg-emerald-900 text-white text-xs font-bold flex items-center gap-2"
              >
                <span>Next Question</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={() => setShowConfirmModal(true)}
                className="py-2.5 px-5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-2 shadow-md"
              >
                <Send className="w-4 h-4" />
                <span>Submit Examination</span>
              </button>
            )}
          </div>
        </div>

        {/* Question Palette Sidebar */}
        <aside className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200 space-y-5 h-fit">
          <div>
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
              Question Navigator
            </h3>
            <p className="text-xs text-slate-600 mt-1">
              {answeredCount} of {questions.length} answered · {flagged.length} flagged
            </p>
          </div>

          {sections.length > 1 && (
            <div className="space-y-1">
              <p className="text-[10px] font-bold uppercase text-slate-400">Sections</p>
              <div className="flex flex-wrap gap-1.5">
                {sections.map((s: any, sIdx: number) => (
                  <button
                    key={s.id || sIdx}
                    onClick={() => {
                      const firstQId = s.questionIds?.[0];
                      const idx = questions.findIndex((q) => q.id === firstQId);
                      if (idx >= 0) setCurrentIdx(idx);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-emerald-50 text-[11px] font-bold text-slate-700"
                  >
                    {s.title}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-5 gap-2">
            {questions.map((q, idx) => {
              const isAnswered = Boolean(String(answers[q.id] || '').trim());
              const isFlagged = flagged.includes(q.id);
              const isCurrent = idx === currentIdx;

              return (
                <button
                  key={q.id}
                  onClick={() => setCurrentIdx(idx)}
                  className={`h-9 rounded-xl text-xs font-bold relative transition-all border ${
                    isCurrent
                      ? 'bg-[#073832] text-white border-[#073832] ring-2 ring-emerald-300'
                      : isFlagged
                      ? 'bg-amber-50 text-amber-800 border-amber-300'
                      : isAnswered
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => setShowConfirmModal(true)}
            disabled={submitting}
            className="w-full py-3 px-4 bg-[#073832] hover:bg-emerald-900 text-white text-xs font-bold rounded-xl shadow-md flex items-center justify-center gap-2"
          >
            <CheckCircle className="w-4 h-4" />
            <span>Finish &amp; Submit</span>
          </button>
        </aside>
      </main>

      {/* Submit Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-extrabold text-slate-900">Submit Examination?</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              You have answered <strong>{answeredCount}</strong> of <strong>{questions.length}</strong> questions
              {flagged.length > 0 ? ` (${flagged.length} marked for review)` : ''}. Once submitted, your answers cannot be changed.
            </p>
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 py-2.5 px-4 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                Continue Exam
              </button>
              <button
                onClick={() => handleFinalSubmit(false)}
                disabled={submitting}
                className="flex-1 py-2.5 px-4 bg-[#073832] hover:bg-emerald-900 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                <span>Confirm Submit</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
