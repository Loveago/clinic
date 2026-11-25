'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  CheckCircle,
  Circle,
  FileText,
  Download,
  Sparkles,
  ExternalLink,
  User,
  Calendar,
  Clock,
  ClipboardList,
  Megaphone,
  Upload,
  X,
  AlertCircle,
} from 'lucide-react';
import StudentHeader from '@/components/StudentHeader';

export default function CourseLmsViewerPage() {
  const params = useParams();
  const courseId = params?.id as string;

  const [course, setCourse] = useState<any>(null);
  const [selectedTopic, setSelectedTopic] = useState<any>(null);
  const [pdfMaterials, setPdfMaterials] = useState<any[]>([]);
  const [courseAssignments, setCourseAssignments] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'materials' | 'assignments' | 'timetable'>('materials');
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  // Assignment submission modal state
  const [submittingAssignment, setSubmittingAssignment] = useState<any>(null);
  const [submissionFileUrl, setSubmissionFileUrl] = useState('');
  const [submissionNotes, setSubmissionNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedbackBanner, setFeedbackBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadWorkspace = async () => {
    try {
      const [data, lcData, asgData] = await Promise.all([
        fetch('/api/student/courses').then((res) => res.json()),
        fetch('/api/student/learning-center').then((res) => res.json()).catch(() => ({ materials: [] })),
        fetch('/api/student/assignments').then((res) => res.json()).catch(() => ({ assignments: [] })),
      ]);

      if (data.courses) {
        const found =
          data.courses.find(
            (c: any) => c.id === courseId || c.code.toLowerCase() === courseId.toLowerCase()
          ) || data.courses[0];

        setCourse(found);

        const firstTopic = found?.modules?.[0]?.topics?.[0];
        if (firstTopic && !selectedTopic) setSelectedTopic(firstTopic);

        const mats = (lcData.materials || []).filter(
          (m: any) => !found?.id || m.course?.id === found.id || m.courseId === found.id
        );
        setPdfMaterials(mats);

        const filteredAsgs = (asgData.assignments || []).filter(
          (a: any) => !found?.id || a.courseId === found.id || a.courseCode === found.code
        );
        setCourseAssignments(filteredAsgs);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWorkspace();
  }, [courseId]);

  const toggleTopicCompletion = async () => {
    if (!selectedTopic) return;
    setToggling(true);
    try {
      const res = await fetch(`/api/student/topics/${selectedTopic.id}/complete`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success) {
        setSelectedTopic((prev: any) => ({
          ...prev,
          progress: [{ completed: data.completed }],
        }));
        await loadWorkspace();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setToggling(false);
    }
  };

  const openSubmissionModal = (asg: any) => {
    setSubmittingAssignment(asg);
    setSubmissionFileUrl(asg.submission?.fileUrl || '');
    setSubmissionNotes(asg.submission?.notes || '');
  };

  const handleAssignmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!submittingAssignment) return;
    setSubmitting(true);
    setFeedbackBanner(null);
    try {
      const method = submittingAssignment.isSubmitted ? 'PATCH' : 'POST';
      const res = await fetch('/api/student/assignments', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignmentId: submittingAssignment.id,
          fileUrl: submissionFileUrl.trim() || '/uploads/assignments/student_submission.pdf',
          notes: submissionNotes.trim(),
        }),
      });
      const d = await res.json();
      if (res.ok && d.status) {
        setFeedbackBanner({ type: 'success', text: 'Assignment submitted successfully!' });
        setSubmittingAssignment(null);
        await loadWorkspace();
      } else {
        setFeedbackBanner({ type: 'error', text: d.error || 'Failed to submit assignment.' });
      }
    } catch (err) {
      console.error(err);
      setFeedbackBanner({ type: 'error', text: 'Network error submitting assignment.' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading interactive course workspace...</div>;
  }

  const isCompleted = selectedTopic?.progress?.[0]?.completed;
  const progressPercent = course?.enrollments?.[0]?.progressPercent ?? 0;
  const lecturersList = course?.lecturers?.length
    ? course.lecturers
    : course?.lecturer
    ? [course.lecturer]
    : [];
  const courseMaterials = course?.materials?.length ? course.materials : pdfMaterials;
  const timetable = course?.timetable || course?.schedules || [];
  const announcements = course?.announcements || [];

  return (
    <>
      <StudentHeader
        title={course?.title || 'Course Workspace'}
        subtitle={`${course?.code || ''} · ${course?.creditHours || 3} Credits · Progress: ${progressPercent}%`}
      />

      <main className="p-4 sm:p-8 max-w-7xl mx-auto w-full space-y-6 font-sans">
        {/* Top Back bar & Lecturers */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/portal/student/courses"
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-emerald-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to All Courses</span>
          </Link>

          <div className="flex flex-wrap items-center gap-3">
            {lecturersList.length > 0 && (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 bg-white px-3 py-1.5 rounded-full border border-slate-200">
                <User className="w-3.5 h-3.5 text-emerald-700" />
                {lecturersList.map((l: any) => `${l.title ? l.title + ' ' : ''}${l.name}`).join(', ')}
              </span>
            )}
            <span className="text-xs font-extrabold text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200">
              {progressPercent}% Complete
            </span>
          </div>
        </div>

        {feedbackBanner && (
          <div
            className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 border ${
              feedbackBanner.type === 'success'
                ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                : 'bg-rose-50 border-rose-300 text-rose-800'
            }`}
          >
            {feedbackBanner.type === 'success' ? (
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{feedbackBanner.text}</span>
          </div>
        )}

        {/* Workspace Tabs */}
        <div className="bg-white p-2 rounded-2xl border border-slate-200/90 shadow-sm flex flex-wrap gap-2 text-xs font-bold">
          <button
            onClick={() => setActiveTab('materials')}
            className={`px-4 py-2 rounded-xl transition flex items-center gap-1.5 ${
              activeTab === 'materials' ? 'bg-emerald-700 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <FileText className="w-3.5 h-3.5" /> Materials &amp; Topics ({courseMaterials.length})
          </button>
          <button
            onClick={() => setActiveTab('assignments')}
            className={`px-4 py-2 rounded-xl transition flex items-center gap-1.5 ${
              activeTab === 'assignments' ? 'bg-emerald-700 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <ClipboardList className="w-3.5 h-3.5" /> Assignments ({courseAssignments.length})
          </button>
          <button
            onClick={() => setActiveTab('timetable')}
            className={`px-4 py-2 rounded-xl transition flex items-center gap-1.5 ${
              activeTab === 'timetable' ? 'bg-emerald-700 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" /> Timetable &amp; Notices
          </button>
        </div>

        {/* TAB 1: MATERIALS & TOPICS */}
        {activeTab === 'materials' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-8 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm space-y-6">
              {selectedTopic ? (
                <>
                  <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md">
                        Active Topic
                      </span>
                      <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-1.5 leading-snug">
                        {selectedTopic.title}
                      </h2>
                    </div>

                    <button
                      onClick={toggleTopicCompletion}
                      disabled={toggling}
                      className={`px-4 py-2.5 rounded-full text-xs font-bold transition-all shadow-sm flex items-center gap-2 shrink-0 ${
                        isCompleted
                          ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border border-emerald-300'
                          : 'bg-[#073832] text-white hover:bg-emerald-900'
                      }`}
                    >
                      {isCompleted ? (
                        <>
                          <CheckCircle className="w-4 h-4 text-emerald-700" />
                          <span>Completed ✓</span>
                        </>
                      ) : (
                        <>
                          <Circle className="w-4 h-4 text-emerald-300" />
                          <span>Mark as Complete</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="space-y-4 text-sm text-slate-700 leading-relaxed">
                    <h3 className="text-base font-bold text-slate-900">Clinical Overview</h3>
                    <p>
                      {selectedTopic.description ||
                        'Study structured notes, definitions, and clinical principles for this curriculum topic.'}
                    </p>
                  </div>
                </>
              ) : (
                <div className="rounded-2xl bg-gradient-to-br from-[#073832] to-[#0c4e45] p-6 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-300">
                      Course Study Materials
                    </span>
                    <h3 className="text-lg font-extrabold">{course?.title}</h3>
                    <p className="text-xs text-emerald-100/80">
                      Review published course PDFs and extracted study topics below.
                    </p>
                  </div>
                  <Link
                    href="/portal/student/materials"
                    className="shrink-0 inline-flex items-center gap-2 bg-[#34d399] hover:bg-[#2bc489] text-[#073832] font-bold text-xs px-4 py-2.5 rounded-xl"
                  >
                    <FileText className="w-4 h-4" />
                    <span>Learning Centre</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </div>
              )}

              {/* Published PDF Materials & Extracted Topics */}
              <div className="pt-4 border-t border-slate-100 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Published Course PDFs &amp; Extracted Topics
                  </h4>
                  <Link href="/portal/student/materials" className="text-xs font-bold text-emerald-700 hover:underline">
                    Open Learning Centre &rarr;
                  </Link>
                </div>

                {courseMaterials.length === 0 ? (
                  <div className="p-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 text-xs text-slate-500">
                    No published PDF materials linked to this course yet.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {courseMaterials.map((mat: any) => {
                      const topics = mat.extractedTopics || mat.topics || [];
                      return (
                        <div key={mat.id} className="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-3">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                                <FileText className="w-4 h-4" />
                              </div>
                              <div>
                                <div className="text-xs font-bold text-slate-900">{mat.title}</div>
                                <div className="text-[10px] text-slate-500">
                                  {mat.fileSize || 'PDF'} · {mat.pageCount || '—'} pages · {topics.length} topics
                                </div>
                              </div>
                            </div>
                            <a
                              href={`/api/admin/learning-materials/${mat.id}/pdf`}
                              target="_blank"
                              rel="noreferrer"
                              className="p-2 text-slate-600 hover:text-emerald-800 hover:bg-emerald-100/50 rounded-lg transition-colors"
                              title="Download PDF"
                            >
                              <Download className="w-4 h-4" />
                            </a>
                          </div>
                          {topics.length > 0 && (
                            <div className="space-y-1.5 pt-2 border-t border-slate-200/80">
                              {topics.map((t: any) => (
                                <div
                                  key={t.id}
                                  className="flex flex-wrap items-center justify-between gap-2 bg-white px-3 py-2 rounded-xl border border-slate-200/70 text-xs"
                                >
                                  <div className="font-semibold text-slate-800">
                                    {t.title}{' '}
                                    <span className="text-[10px] text-slate-400 font-normal">
                                      (pp. {t.pageStart}–{t.pageEnd})
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Link
                                      href={`/portal/student/topics/${t.id}`}
                                      className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 font-bold hover:bg-emerald-100"
                                    >
                                      Read Topic
                                    </Link>
                                    {t.assessments?.[0]?.id && (
                                      <Link
                                        href={`/portal/student/topic-quiz/${t.assessments[0].id}`}
                                        className="px-2.5 py-1 rounded-lg bg-teal-700 text-white font-bold hover:bg-teal-800"
                                      >
                                        Topic Quiz
                                      </Link>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Curriculum Sidebar */}
            <div className="lg:col-span-4 bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm space-y-4">
              <h3 className="text-base font-bold text-slate-900">Course Curriculum</h3>
              {(!course?.modules || course.modules.length === 0) ? (
                <p className="text-xs text-slate-400">No structured modules added yet.</p>
              ) : (
                <div className="space-y-4">
                  {course.modules.map((module: any) => (
                    <div key={module.id} className="border border-slate-200 rounded-2xl overflow-hidden">
                      <div className="bg-slate-50 px-4 py-3 font-bold text-xs text-slate-800 border-b border-slate-200/80">
                        {module.title}
                      </div>
                      <div className="divide-y divide-slate-100">
                        {module.topics?.map((topic: any) => {
                          const topicCompleted = topic.progress?.[0]?.completed;
                          const isSelected = selectedTopic?.id === topic.id;
                          return (
                            <button
                              key={topic.id}
                              onClick={() => setSelectedTopic(topic)}
                              className={`w-full text-left px-4 py-3 text-xs flex items-center justify-between gap-3 transition-colors ${
                                isSelected
                                  ? 'bg-emerald-50/90 font-bold text-emerald-950 border-l-4 border-emerald-700'
                                  : 'hover:bg-slate-50 text-slate-700'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 truncate">
                                {topicCompleted ? (
                                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                                ) : (
                                  <Circle className="w-4 h-4 text-slate-300 shrink-0" />
                                )}
                                <span className="truncate">{topic.title}</span>
                              </div>
                              <span className="text-[10px] text-slate-400 shrink-0">
                                {topic.durationMinutes || 45}m
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: ASSIGNMENTS */}
        {activeTab === 'assignments' && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-900">Course Assignments &amp; Submissions</h3>
            {courseAssignments.length === 0 ? (
              <p className="text-xs text-slate-400 py-4">No published assignments for this course yet.</p>
            ) : (
              <div className="space-y-4">
                {courseAssignments.map((asg: any) => (
                  <div
                    key={asg.id}
                    className="p-5 rounded-2xl border border-slate-200 bg-slate-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-sm text-slate-900">{asg.title}</span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            asg.submissionStatus === 'GRADED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : asg.submissionStatus === 'RETURNED_FOR_RESUBMISSION'
                              ? 'bg-amber-100 text-amber-800'
                              : asg.isSubmitted
                              ? 'bg-sky-100 text-sky-800'
                              : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {asg.submissionStatus}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600">{asg.description}</p>
                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 font-medium">
                        <span>Due: {asg.deadline}</span>
                        <span>•</span>
                        <span>Max: {asg.maxMarks} marks ({asg.weighting}% CA)</span>
                        {asg.submission?.isGraded && (
                          <>
                            <span>•</span>
                            <span className="text-emerald-700 font-bold">
                              Score: {asg.submission.score}/{asg.maxMarks}
                            </span>
                          </>
                        )}
                      </div>
                      {asg.submission?.evaluationStatus === 'FAILED' && (
                        <div className="text-xs text-amber-900 bg-amber-50 px-3 py-2 rounded-xl border border-amber-200 mt-1">
                          <strong>Evaluation Pending / Failed:</strong> Your submission is saved and queued for automated grading retry.
                        </div>
                      )}
                      {asg.submission?.feedback && (
                        <div className="text-xs text-slate-700 bg-white px-3 py-2 rounded-xl border border-slate-200 mt-1 space-y-1">
                          <div>
                            <strong>Automated Feedback:</strong> {asg.submission.feedback}
                          </div>
                          {Array.isArray(asg.submission.evaluationDetails?.conceptsCorrect) &&
                            asg.submission.evaluationDetails.conceptsCorrect.length > 0 && (
                              <div className="text-emerald-700">
                                <strong>Concepts Identified:</strong>{' '}
                                {asg.submission.evaluationDetails.conceptsCorrect.join(', ')}
                              </div>
                            )}
                          {Array.isArray(asg.submission.evaluationDetails?.conceptsMissing) &&
                            asg.submission.evaluationDetails.conceptsMissing.length > 0 && (
                              <div className="text-amber-700">
                                <strong>Concepts Missing:</strong>{' '}
                                {asg.submission.evaluationDetails.conceptsMissing.join(', ')}
                              </div>
                            )}
                        </div>
                      )}
                      {asg.expectedAnswer && asg.answerKeyReleased && (
                        <div className="text-xs text-emerald-800 bg-emerald-50/60 px-3 py-2 rounded-xl border border-emerald-200 mt-1">
                          <strong>Model Answer Key:</strong> {asg.expectedAnswer}
                        </div>
                      )}
                      {Array.isArray(asg.submission?.revisionRecommendations) &&
                        asg.submission.revisionRecommendations.length > 0 && (
                          <div className="flex flex-wrap items-center gap-2 pt-1">
                            <span className="text-[11px] font-bold text-slate-500">Revise:</span>
                            {asg.submission.revisionRecommendations.map((rec: any) => (
                              <Link
                                key={rec.topicId}
                                href={`/portal/student/topics/${rec.topicId}`}
                                className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100"
                              >
                                {rec.topicTitle} &rarr;
                              </Link>
                            ))}
                          </div>
                        )}
                    </div>

                    <div className="shrink-0">
                      {(!asg.isSubmitted && asg.canSubmit) || asg.canEdit ? (
                        <button
                          onClick={() => openSubmissionModal(asg)}
                          className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          {asg.isSubmitted ? 'Update Submission' : 'Submit Assignment'}
                        </button>
                      ) : (
                        <span className="text-xs font-semibold text-slate-400">
                          {asg.submissionStatus === 'GRADED' ? 'Graded & Locked' : 'Deadline Closed'}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: TIMETABLE & NOTICES */}
        {activeTab === 'timetable' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm space-y-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-700" />
                Course Timetable
              </h3>
              {timetable.length === 0 ? (
                <p className="text-xs text-slate-400">No scheduled class sessions yet.</p>
              ) : (
                <div className="space-y-2.5">
                  {timetable.map((s: any) => (
                    <div key={s.id} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs flex items-center justify-between">
                      <div>
                        <div className="font-bold text-slate-900">{s.dayOfWeek}</div>
                        <div className="text-slate-500">{s.startTime} – {s.endTime}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-emerald-800">{s.venue}</div>
                        <div className="text-[11px] text-slate-400">{s.sessionType || 'LECTURE'} {s.room ? `· ${s.room}` : ''}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm space-y-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-emerald-700" />
                Course Announcements
              </h3>
              {announcements.length === 0 ? (
                <p className="text-xs text-slate-400">No course-specific announcements posted yet.</p>
              ) : (
                <div className="space-y-3">
                  {announcements.map((ann: any) => (
                    <div key={ann.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-xs text-slate-900">{ann.title}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                          {ann.priority}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600">{ann.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* SUBMISSION MODAL */}
      {submittingAssignment && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base">Submit Assignment</h3>
              <button onClick={() => setSubmittingAssignment(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAssignmentSubmit} className="space-y-3 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div className="font-bold text-slate-900">{submittingAssignment.title}</div>
                <div className="text-slate-500">Due: {submittingAssignment.deadline}</div>
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Document / File URL</label>
                <input
                  type="text"
                  value={submissionFileUrl}
                  onChange={(e) => setSubmissionFileUrl(e.target.value)}
                  placeholder="/uploads/assignments/my_work.pdf"
                  className="w-full p-2.5 border border-slate-200 rounded-xl"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Submission Notes / Response</label>
                <textarea
                  rows={4}
                  required
                  value={submissionNotes}
                  onChange={(e) => setSubmissionNotes(e.target.value)}
                  placeholder="Enter your assignment summary or clinical notes..."
                  className="w-full p-2.5 border border-slate-200 rounded-xl"
                />
              </div>
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSubmittingAssignment(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl font-semibold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : 'Submit Work'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
