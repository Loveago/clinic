'use client';

import React, { useState, useEffect } from 'react';
import { Bell, Sparkles, Calendar, Tag } from 'lucide-react';
import StudentHeader from '@/components/StudentHeader';

export default function StudentAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/student/dashboard')
      .then((res) => res.json())
      .then((data) => {
        if (data.announcements) setAnnouncements(data.announcements);
      })
      .catch(() => {});
  }, []);

  return (
    <>
      <StudentHeader
        title="Institutional Announcements"
        subtitle="Notices from Registry, Faculty, and Clinical Administration"
      />

      <main className="p-4 sm:p-8 max-w-7xl mx-auto w-full space-y-6">
        <div className="space-y-4">
          {announcements.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm space-y-3 hover:border-emerald-300 transition-colors"
            >
              <div className="flex items-center justify-between">
                <span
                  className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                    item.priority === 'HIGH'
                      ? 'bg-rose-100 text-rose-800 border border-rose-200'
                      : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  }`}
                >
                  {item.priority} Priority · {item.targetAudience}
                </span>
                <span className="text-xs text-slate-400">
                  {new Date(item.createdAt).toLocaleDateString()}
                </span>
              </div>

              <h3 className="text-lg font-bold text-slate-900">{item.title}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{item.content}</p>
            </div>
          ))}
        </div>
      </main>
    </>
  );
}

