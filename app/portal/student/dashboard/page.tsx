'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  BookOpen,
  CheckCircle,
  Award,
  Calendar,
  Clock,
  ArrowRight,
  ChevronRight,
  FileText,
  AlertCircle,
  GraduationCap,
} from 'lucide-react';
import StudentHeader from '@/components/StudentHeader';

export default function StudentDashboardPage() {
  const [data, setData] = useState<any>(null);
  const [learning, setLearning] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/student/dashboard').then((res) => res.json()),
      fetch('/api/student/learning-center').then((res) => res.json()),
    ])
      .then(([resData, lcData]) => {
        setData(resData);
        setLearning(lcData);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  return (
    <>
      <StudentHeader
        title="Student Dashboard"
        subtitle={`Welcome back, ${data?.student?.name || 'Student'}!`}
        avatarUrl={data?.student?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80'}
      />

      <main className="p-4 sm:p-8 max-w-7xl mx-auto w-full space-y-8">
        {/* STAT METRICS CARDS - Strictly matching mockup */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {/* Card 1: Enrolled Courses */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Enrolled Courses
              </div>
              <div className="text-3xl font-extrabold text-slate-900 mt-0.5">
                {data?.stats?.enrolledCourses || 3}
              </div>
            </div>
          </div>

          {/* Card 2: Completed Topics */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Completed Topics
              </div>
              <div className="text-3xl font-extrabold text-slate-900 mt-0.5">
                {data?.stats?.completedTopics || '8 / 15'}
              </div>
            </div>
          </div>

          {/* Card 3: Latest Result */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0 border border-sky-100">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Latest Result
              </div>
              <div className="text-3xl font-extrabold text-slate-900 mt-0.5">
                {data?.stats?.latestResult || '92%'}
              </div>
            </div>
          </div>
        </div>

        {/* TWO-COLUMN WORKSPACE - Strictly matching mockup */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: My Courses (matching mockup) */}
          <div className="lg:col-span-7 bg-white rounded-2xl p-6 sm:p-7 border border-slate-200/90 shadow-sm space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">My Courses</h2>
              <Link
                href="/portal/student/courses"
                className="text-xs font-bold text-emerald-800 hover:text-emerald-950 flex items-center gap-1 group"
              >
                <span>View All</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>

            {/* Course Card from mockup */}
            <div className="space-y-4">
              <div className="border border-slate-200 rounded-2xl p-5 hover:border-emerald-300 hover:shadow-md transition-all">
                <div className="flex flex-col sm:flex-row sm:items-center gap-5">
                  <div className="relative w-full sm:w-28 h-24 sm:h-20 rounded-xl overflow-hidden shrink-0 border border-slate-200">
                    <Image
                      src="https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=500&auto=format&fit=crop&q=80"
                      alt="Basic Nursing Certificate"
                      fill
                      className="object-cover"
                    />
                  </div>

                  <div className="flex-1 space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full">
                          BNC101
                        </span>
                        <h3 className="text-base font-bold text-slate-900 mt-1">
                          Basic Nursing Certificate
                        </h3>
                      </div>
                      <span className="text-xs font-extrabold text-blue-600">60%</span>
                    </div>

                    {/* Progress Bar (matching mockup) */}
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-blue-600 h-full rounded-full transition-all duration-500"
                        style={{ width: '60%' }}
                      />
                    </div>

                    <div className="pt-2 flex items-center justify-between">
                      <span className="text-[11px] text-slate-500 font-medium">
                        Instructor: Dr. Kemi Adebayo
                      </span>
                      <Link
                        href="/portal/student/courses/bnc101"
                        className="text-xs font-bold text-slate-800 hover:text-emerald-800 flex items-center gap-1 group"
                      >
                        <span>Continue Learning</span>
                        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>

              {/* Course 2 */}
              <div className="border border-slate-200 rounded-2xl p-5 hover:border-emerald-300 hover:shadow-md transition-all">
                <div className="flex flex-col sm:flex-row sm:items-center gap-5">
                  <div className="relative w-full sm:w-28 h-24 sm:h-20 rounded-xl overflow-hidden shrink-0 border border-slate-200">
                    <Image
                      src="https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=500&auto=format&fit=crop&q=80"
                      alt="Anatomy & Physiology"
                      fill
                      className="object-cover"
                    />
                  </div>

                  <div className="flex-1 space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full">
                          ANA102
                        </span>
                        <h3 className="text-base font-bold text-slate-900 mt-1">
                          Anatomy &amp; Physiology for Nurses
                        </h3>
                      </div>
                      <span className="text-xs font-extrabold text-emerald-600">50%</span>
                    </div>

                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                        style={{ width: '50%' }}
                      />
                    </div>

                    <div className="pt-2 flex items-center justify-between">
                      <span className="text-[11px] text-slate-500 font-medium">
                        4 Credit Hours · Semester 1
                      </span>
                      <Link
                        href="/portal/student/courses/ana102"
                        className="text-xs font-bold text-slate-800 hover:text-emerald-800 flex items-center gap-1 group"
                      >
                        <span>Open Modules</span>
                        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Upcoming Exams & Quick Actions (matching mockup) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Upcoming Exams Card */}
            <div className="bg-white rounded-2xl p-6 sm:p-7 border border-slate-200/90 shadow-sm space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h2 className="text-lg font-bold text-slate-900">Upcoming Exams</h2>
                <Link
                  href="/portal/student/exams"
                  className="text-xs font-bold text-emerald-800 hover:text-emerald-950 flex items-center gap-1 group"
                >
                  <span>View All</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </div>

              {/* Anatomy & Physiology Exam Card - strictly matching mockup */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 space-y-4">
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 leading-snug">
                      Anatomy &amp; Physiology
                    </h3>
                    <div className="text-xs text-slate-500 font-medium mt-1 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>Tue, Apr 29, 2025 · 10:00 AM</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-1">
                  <Link
                    href="/portal/student/exams"
                    className="flex-1 text-center py-2.5 px-4 bg-white border border-slate-200 hover:border-slate-300 text-slate-800 text-xs font-bold rounded-xl shadow-sm transition-all"
                  >
                    View Details
                  </Link>
                  <Link
                    href="/portal/student/exams/start"
                    className="flex-1 text-center py-2.5 px-4 bg-[#073832] hover:bg-emerald-900 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
                  >
                    Take Exam
                  </Link>
                </div>
              </div>

              {/* Latest Examination Result Link Card */}
              <div className="border border-emerald-100 bg-emerald-50/60 rounded-2xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                    <Award className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">Recent Exam Passed</div>
                    <div className="text-[11px] text-emerald-800 font-semibold">Scored 92% (23/25 Correct)</div>
                  </div>
                </div>
                <Link
                  href="/portal/student/results"
                  className="px-3 py-1.5 bg-[#073832] text-white text-xs font-bold rounded-lg shadow-sm hover:bg-emerald-900 transition-colors"
                >
                  View Result
                </Link>
              </div>
            </div>

            {/* PDF Learning & Topic Mastery Card */}
            {learning?.stats && (
              <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    PDF Learning &amp; Topic Mastery
                  </h3>
                  <Link href="/portal/student/materials" className="text-xs font-bold text-emerald-700 hover:underline">
                    Open Learning Centre →
                  </Link>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  <div className="bg-slate-50 p-3 rounded-xl">
                    <div className="text-lg font-black text-[#073832]">{learning.stats.availableMaterials}</div>
                    <div className="text-[10px] text-slate-500 font-semibold">Course PDFs</div>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl">
                    <div className="text-lg font-black text-emerald-700">
                      {learning.stats.topicsCompleted}/{learning.stats.totalTopics}
                    </div>
                    <div className="text-[10px] text-slate-500 font-semibold">Topics Done</div>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl">
                    <div className="text-lg font-black text-amber-600">{learning.stats.pendingQuizzes}</div>
                    <div className="text-[10px] text-slate-500 font-semibold">Pending Quizzes</div>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl">
                    <div className="text-lg font-black text-[#073832]">{learning.stats.averageScore}%</div>
                    <div className="text-[10px] text-slate-500 font-semibold">Quiz Average</div>
                  </div>
                </div>
              </div>
            )}

            {/* Quick Links Card */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-sm space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Academic Quick Shortcuts
              </h3>
              <div className="grid grid-cols-2 gap-2.5 text-xs font-semibold">
                <Link
                  href="/portal/student/materials"
                  className="p-3 bg-slate-50 hover:bg-emerald-50 rounded-xl border border-slate-100 text-slate-800 flex items-center gap-2 transition-colors"
                >
                  <FileText className="w-4 h-4 text-emerald-700" />
                  <span>PDF Learning Centre</span>
                </Link>
                <Link
                  href="/portal/student/revision"
                  className="p-3 bg-slate-50 hover:bg-emerald-50 rounded-xl border border-slate-100 text-slate-800 flex items-center gap-2 transition-colors"
                >
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  <span>Revision Centre ({learning?.stats?.topicsNeedsRevision ?? 0})</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

