'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Calendar } from 'lucide-react';
import StudentHeader from '@/components/StudentHeader';

export default function StudentCalendarPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/student/dashboard')
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const examEvents = (data?.upcomingExams || []).map((ex: any) => ({
    date: ex.date || 'Scheduled',
    time: `${ex.time || '09:00 AM'} (${ex.durationMinutes || 60} mins)`,
    title: `${ex.courseCode ? ex.courseCode + ': ' : ''}${ex.title}`,
    type: 'Exam',
    location: ex.venue || 'CBT Portal / Exam Hall',
    href: `/portal/student/exams/start?id=${ex.id}`,
  }));

  const assignmentEvents = (data?.assignments || []).map((a: any) => ({
    date: a.deadline || 'Upcoming',
    time: '11:59 PM Deadline',
    title: `${a.courseCode ? a.courseCode + ': ' : ''}${a.title}`,
    type: 'Assignment',
    location: a.isSubmitted ? 'Submitted' : 'Submission Due on Student Portal',
    href: '/portal/student/courses',
  }));

  const scheduleEvents = (data?.enrollments || []).flatMap((enr: any) =>
    (enr.schedules || []).map((s: any) => ({
      date: s.dayOfWeek || 'Weekly',
      time: `${s.startTime || '08:00 AM'} - ${s.endTime || '10:00 AM'}`,
      title: `${enr.code}: ${enr.title}`,
      type: 'Lecture',
      location: s.venue || s.room || 'Lecture Hall / Clinical Lab',
      href: `/portal/student/courses/${enr.courseId}`,
    }))
  );

  const events = [...examEvents, ...assignmentEvents, ...scheduleEvents];

  return (
    <>
      <StudentHeader
        title="Academic Calendar"
        subtitle="Examination Dates, Semester Timetables, and Clinical Rotations"
      />

      <main className="p-4 sm:p-8 max-w-7xl mx-auto w-full space-y-8">
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-base font-bold text-slate-900">
              {data?.student?.currentSemester || 'Current Semester'} Key Dates &amp; Timetable
            </h3>
            <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              Session {data?.student?.academicYear || '2025/2026'}
            </span>
          </div>

          {loading ? (
            <div className="py-10 text-center text-xs text-slate-500">Loading academic calendar...</div>
          ) : events.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-500 border border-dashed border-slate-200 rounded-2xl">
              No scheduled examinations, deadlines, or timetable sessions found yet.
            </div>
          ) : (
            <div className="space-y-4">
              {events.map((evt, i) => (
                <Link
                  key={i}
                  href={evt.href}
                  className="p-5 rounded-2xl border border-slate-200 bg-slate-50/60 hover:bg-slate-50 hover:border-emerald-300 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4 block"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-800 flex items-center justify-center shrink-0 border border-emerald-100 font-bold">
                      <Calendar className="w-6 h-6 text-emerald-700" />
                    </div>
                    <div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                          evt.type === 'Exam'
                            ? 'bg-rose-100 text-rose-800'
                            : evt.type === 'Assignment'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {evt.type}
                      </span>
                      <h4 className="text-sm sm:text-base font-bold text-slate-900 mt-1">
                        {evt.title}
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">{evt.location}</p>
                    </div>
                  </div>

                  <div className="sm:text-right shrink-0">
                    <div className="font-bold text-xs text-slate-900">{evt.date}</div>
                    <div className="text-[11px] text-slate-500 font-medium">{evt.time}</div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}

