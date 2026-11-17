'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  FileText,
  Download,
  Search,
  BookOpen,
  Eye,
  CheckCircle2,
  Clock,
  AlertCircle,
  Award,
  ArrowRight,
  Sparkles,
  HelpCircle,
} from 'lucide-react';
import StudentHeader from '@/components/StudentHeader';

export default function StudentPdfLearningCenterPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCourseId, setSelectedCourseId] = useState('');

  useEffect(() => {
    fetch('/api/student/learning-center')
      .then((res) => res.json())
      .then((d) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const masteryBadge = (status: string) => {
    const map: Record<string, { label: string; cls: string }> = {
      MASTERED: { label: 'Mastered', cls: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
      COMPLETED: { label: 'Completed', cls: 'bg-sky-100 text-sky-800 border-sky-200' },
      IN_PROGRESS: { label: 'In Progress', cls: 'bg-amber-100 text-amber-800 border-amber-200' },
      NEEDS_REVISION: { label: 'Needs Revision', cls: 'bg-red-100 text-red-700 border-red-200' },
      NOT_STARTED: { label: 'Not Started', cls: 'bg-slate-100 text-slate-600 border-slate-200' },
    };
    return map[status] || map.NOT_STARTED;
  };

  const stats = data?.stats || {};
  const courses = (data?.courses || []).filter(
    (c: any) => !selectedCourseId || c.id === selectedCourseId
  );

  return (
    <>
      <StudentHeader
        title="PDF Learning Centre"
        subtitle="Structured Course PDFs, Extracted Topics, Mastery Tracking &amp; Topic Quizzes"
      />

      <main className="p-4 sm:p-8 max-w-7xl mx-auto w-full space-y-6">
        {/* Learning Metrics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: 'PDF Materials', val: stats.availableMaterials ?? 0, icon: FileText },
            { label: 'Total Topics', val: stats.totalTopics ?? 0, icon: BookOpen },
            { label: 'Completed', val: stats.topicsCompleted ?? 0, icon: CheckCircle2 },
            { label: 'Mastered', val: stats.topicsMastered ?? 0, icon: Award },
            { label: 'Pending Quizzes', val: stats.pendingQuizzes ?? 0, icon: HelpCircle },
            { label: 'Avg Quiz Score', val: `${stats.averageScore ?? 0}%`, icon: Sparkles },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.label}
                className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-sm flex items-center gap-3"
              >
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-lg font-black text-[#073832]">{item.val}</div>
                  <div className="text-[11px] text-slate-500 font-medium">{item.label}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Revision Alert Banner if weak topics exist */}
        {data?.revisionTopics?.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-extrabold text-amber-900">
                  Topics Requiring Revision ({data.revisionTopics.length})
                </h4>
                <p className="text-xs text-amber-800 mt-0.5">
                  Based on your quiz performance, revisit these topics and retake their practice quizzes to achieve mastery.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {data.revisionTopics.slice(0, 3).map((rt: any) => (
                <Link
                  key={rt.id}
                  href={`/portal/student/topics/${rt.id}`}
                  className="px-3 py-1.5 bg-white border border-amber-300 rounded-xl text-xs font-bold text-amber-900 hover:bg-amber-100"
                >
                  Revise: {rt.title}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Filter & Search Bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-96">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search PDFs or extracted topics..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-700/30"
            />
          </div>
          <select
            value={selectedCourseId}
            onChange={(e) => setSelectedCourseId(e.target.value)}
            className="w-full sm:w-64 text-xs border border-slate-200 rounded-xl px-3 py-2 bg-white font-semibold"
          >
            <option value="">All Enrolled Courses</option>
            {(data?.courses || []).map((c: any) => (
              <option key={c.id} value={c.id}>
                {c.code} — {c.title}
              </option>
            ))}
          </select>
        </div>

        {/* Courses, Published PDFs, and Extracted Topics */}
        {loading ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 text-xs text-slate-500">
            Loading your PDF Learning Centre...
          </div>
        ) : courses.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 text-xs text-slate-500">
            No enrolled courses or published PDF materials available yet.
          </div>
        ) : (
          <div className="space-y-6">
            {courses.map((course: any) => {
              const filteredTopics = (course.topics || []).filter(
                (t: any) =>
                  !searchTerm ||
                  t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  (t.description || '').toLowerCase().includes(searchTerm.toLowerCase())
              );

              return (
                <div
                  key={course.id}
                  className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden"
                >
                  {/* Course Header */}
                  <div className="p-6 bg-slate-50/80 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <span className="text-[11px] font-black text-emerald-700 uppercase tracking-wider">
                        {course.code} · {course.semester} · {course.level}
                      </span>
                      <h3 className="text-lg font-extrabold text-[#073832] mt-0.5">{course.title}</h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Lecturer: {course.lecturerName} · {course.materials?.length || 0} PDFs · {course.topics?.length || 0} Topics
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-xs font-bold text-slate-700">Course Mastery</div>
                        <div className="text-sm font-black text-emerald-700">{course.progressPercent}%</div>
                      </div>
                      <div className="w-28 h-2.5 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-600 rounded-full transition-all"
                          style={{ width: `${course.progressPercent}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Published PDF Materials for this Course */}
                  {course.materials?.length > 0 && (
                    <div className="px-6 py-4 bg-emerald-50/40 border-b border-slate-100 space-y-2">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
                        Course PDF Study Materials
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {course.materials.map((m: any) => (
                          <div
                            key={m.id}
                            className="bg-white rounded-2xl p-3.5 border border-emerald-100 flex items-center justify-between gap-3"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                                <FileText className="w-5 h-5" />
                              </div>
                              <div className="min-w-0">
                                <div className="text-xs font-bold text-slate-900 truncate">{m.title}</div>
                                <div className="text-[11px] text-slate-500">
                                  PDF · {m.pageCount || '—'} pages · {m.fileSize}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <a
                                href={m.fileUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl text-[11px] font-bold inline-flex items-center gap-1"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>View PDF</span>
                              </a>
                              <a
                                href={m.fileUrl}
                                download
                                className="p-1.5 text-slate-500 hover:text-emerald-800 hover:bg-emerald-50 rounded-xl"
                                title="Download PDF"
                              >
                                <Download className="w-4 h-4" />
                              </a>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Extracted Topics List */}
                  <div className="divide-y divide-slate-100">
                    {filteredTopics.length === 0 ? (
                      <div className="p-6 text-xs text-slate-400 text-center">
                        No published topics extracted for this course yet.
                      </div>
                    ) : (
                      filteredTopics.map((topic: any, idx: number) => {
                        const badge = masteryBadge(topic.mastery?.masteryStatus);
                        return (
                          <div
                            key={topic.id}
                            className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors"
                          >
                            <div className="space-y-1 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-[11px] font-black text-emerald-700">
                                  Topic {idx + 1}
                                </span>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badge.cls}`}>
                                  {badge.label}
                                </span>
                                <span className="text-[11px] text-slate-400">
                                  PDF pp. {topic.pageStart}–{topic.pageEnd}
                                </span>
                                {topic.mastery?.attemptsCount > 0 && (
                                  <span className="text-[11px] font-semibold text-emerald-700">
                                    Best Quiz: {topic.mastery.bestScore}%
                                  </span>
                                )}
                              </div>
                              <h4 className="text-sm font-extrabold text-slate-900">{topic.title}</h4>
                              <p className="text-xs text-slate-500 line-clamp-2">{topic.description}</p>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 shrink-0">
                              <Link
                                href={`/portal/student/topics/${topic.id}`}
                                className="px-4 py-2 bg-[#073832] hover:bg-emerald-900 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5"
                              >
                                <BookOpen className="w-3.5 h-3.5 text-emerald-300" />
                                <span>Read Topic</span>
                              </Link>
                              {topic.primaryQuizId && (
                                <Link
                                  href={`/portal/student/topic-quiz/${topic.primaryQuizId}`}
                                  className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 rounded-xl text-xs font-bold inline-flex items-center gap-1.5"
                                >
                                  <span>Start Topic Quiz</span>
                                  <ArrowRight className="w-3.5 h-3.5" />
                                </Link>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}
