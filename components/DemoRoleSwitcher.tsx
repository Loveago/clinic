'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { UserCheck, Shield, GraduationCap, Stethoscope, ChevronDown } from 'lucide-react';

export default function DemoRoleSwitcher() {
  const allowDemo =
    process.env.NODE_ENV !== 'production' ||
    process.env.NEXT_PUBLIC_ALLOW_DEMO_LOGIN === 'true';

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!allowDemo) return;
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.user) setCurrentUser(data.user);
      })
      .catch(() => {});
  }, [allowDemo]);

  if (!allowDemo) {
    return null;
  }

  const switchRole = async (role: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/demo-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });
      const data = await res.json();
      if (data.success) {
        setCurrentUser(data.user);
        setIsOpen(false);
        if (role === 'student') {
          router.push('/portal/student/dashboard');
        } else if (role === 'lecturer') {
          router.push('/portal/lecturer');
        } else if (role === 'admin') {
          router.push('/portal/admin');
        }
        router.refresh();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative inline-block text-left z-50">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-emerald-900/10 hover:bg-emerald-900/20 text-emerald-950 border border-emerald-800/20 transition-all shadow-sm"
        title="Quick Role Switcher for Demo & Testing"
      >
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        <span className="font-semibold text-emerald-900">
          Demo: {currentUser ? currentUser.name.split(' ')[0] : 'Visitor'}
        </span>
        <span className="text-[10px] uppercase tracking-wider text-emerald-800/70 font-mono">
          ({currentUser ? currentUser.role : 'Public'})
        </span>
        <ChevronDown className="w-3.5 h-3.5 text-emerald-800" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-2xl border border-slate-100 py-2 text-slate-800 z-50">
          <div className="px-3 py-1.5 border-b border-slate-100 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Switch Perspective (Instant Demo)
          </div>

          <button
            onClick={() => switchRole('student')}
            disabled={loading}
            className="w-full text-left px-3 py-2 text-xs hover:bg-emerald-50 flex items-center gap-2.5 transition-colors"
          >
            <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
              <GraduationCap className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-slate-900">Chioma Eze (Student)</div>
              <div className="text-[11px] text-slate-500">Student Portal, LMS, Online Exams</div>
            </div>
          </button>

          <button
            onClick={() => switchRole('lecturer')}
            disabled={loading}
            className="w-full text-left px-3 py-2 text-xs hover:bg-blue-50 flex items-center gap-2.5 transition-colors"
          >
            <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center font-bold">
              <Stethoscope className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-slate-900">Dr. Kemi Adebayo (Lecturer)</div>
              <div className="text-[11px] text-slate-500">Course Materials, Question Bank, Grading</div>
            </div>
          </button>

          <button
            onClick={() => switchRole('admin')}
            disabled={loading}
            className="w-full text-left px-3 py-2 text-xs hover:bg-purple-50 flex items-center gap-2.5 transition-colors"
          >
            <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-800 flex items-center justify-center font-bold">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-slate-900">Dr. Adeyemi (Super Admin)</div>
              <div className="text-[11px] text-slate-500">Appointments, Admissions, Finance</div>
            </div>
          </button>

          <div className="border-t border-slate-100 mt-1 pt-1 px-3 py-1 flex items-center justify-between text-[11px]">
            <a href="/" className="text-emerald-700 hover:underline">Clinic Home</a>
            <a href="/school" className="text-emerald-700 hover:underline">School Home</a>
            <a href="/portal/student/dashboard" className="text-emerald-700 hover:underline font-semibold">Portal</a>
          </div>
        </div>
      )}
    </div>
  );
}

