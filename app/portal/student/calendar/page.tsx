'use client';

import React from 'react';
import { Calendar, Clock, AlertCircle, Bookmark } from 'lucide-react';
import StudentHeader from '@/components/StudentHeader';

export default function StudentCalendarPage() {
  const events = [
    {
      date: 'Tue, Apr 29, 2025',
      time: '10:00 AM - 10:45 AM',
      title: 'Anatomy & Physiology Mid-Term Examination',
      type: 'Exam',
      location: 'CBT Portal / Online',
    },
    {
      date: 'Mon, May 05, 2025',
      time: '08:00 AM',
      title: 'Clinical Ward Rotation Group A Induction',
      type: 'Clinical',
      location: 'Action Boat Medical Centre / Homeopathy, Ward 2',
    },
    {
      date: 'Fri, May 16, 2025',
      time: '02:00 PM',
      title: 'Pharmacology Dosage Calculation Seminar',
      type: 'Lecture',
      location: 'Lecture Hall 1 & Virtual Stream',
    },
    {
      date: 'Mon, Jun 02, 2025',
      time: '09:00 AM',
      title: 'Second Semester Registration Deadline',
      type: 'Administrative',
      location: 'Portal / Registry',
    },
  ];

  return (
    <>
      <StudentHeader
        title="Academic Calendar"
        subtitle="Examination Dates, Semester Timetables, and Clinical Rotations"
      />

      <main className="p-4 sm:p-8 max-w-7xl mx-auto w-full space-y-8">
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-base font-bold text-slate-900">Semester 1 Key Dates &amp; Deadlines</h3>
            <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              Session 2025/2026
            </span>
          </div>

          <div className="space-y-4">
            {events.map((evt, i) => (
              <div
                key={i}
                className="p-5 rounded-2xl border border-slate-200 bg-slate-50/60 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
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
                          : evt.type === 'Clinical'
                          ? 'bg-blue-100 text-blue-800'
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
              </div>
            ))}
          </div>
        </div>
      </main>
    </>
  );
}

