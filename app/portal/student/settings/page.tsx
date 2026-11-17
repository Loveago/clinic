'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { User, Lock, ShieldCheck, Mail, Phone, GraduationCap, HelpCircle } from 'lucide-react';
import StudentHeader from '@/components/StudentHeader';

interface AccountInfo {
  name?: string;
  email?: string;
  phone?: string;
  studentId?: string;
  programme?: string;
  level?: string;
}

export default function StudentSettingsPage() {
  const [account, setAccount] = useState<AccountInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.all([
      fetch('/api/auth/me').then((r) => (r.ok ? r.json() : null)).catch(() => null),
      fetch('/api/student/dashboard').then((r) => (r.ok ? r.json() : null)).catch(() => null),
    ])
      .then(([meData, dashData]) => {
        if (!active) return;
        const user = meData?.user;
        const student = dashData?.student;
        if (user || student) {
          setAccount({
            name: student?.name || user?.name,
            email: student?.email || user?.email,
            phone: student?.phone || user?.phone,
            studentId: student?.studentId,
            programme: student?.programme,
            level: student?.level,
          });
        }
        setLoading(false);
      })
      .catch(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <>
      <StudentHeader
        title="Student Settings &amp; Account"
        subtitle="View Account Credentials, Security &amp; Registry Support"
      />

      <main className="p-4 sm:p-8 max-w-4xl mx-auto w-full space-y-6">
        {/* Read-only Account Summary */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-emerald-700" />
              <h3 className="text-base font-bold text-slate-900">
                Registered Student Account
              </h3>
            </div>
            <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100">
              Read-Only
            </span>
          </div>

          {loading ? (
            <div className="py-6 text-xs text-slate-500">Loading account details...</div>
          ) : account ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
                <span className="text-slate-500 font-medium">Full Name</span>
                <div className="font-bold text-slate-900">{account.name || '—'}</div>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
                <span className="text-slate-500 font-medium">Student ID</span>
                <div className="font-bold text-slate-900 font-mono">{account.studentId || '—'}</div>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
                <span className="text-slate-500 font-medium flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-emerald-700" /> Email Address
                </span>
                <div className="font-bold text-slate-900">{account.email || '—'}</div>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
                <span className="text-slate-500 font-medium flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-emerald-700" /> Phone Number
                </span>
                <div className="font-bold text-slate-900">{account.phone || '—'}</div>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1 sm:col-span-2">
                <span className="text-slate-500 font-medium flex items-center gap-1">
                  <GraduationCap className="w-3.5 h-3.5 text-emerald-700" /> Enrolled Programme
                </span>
                <div className="font-bold text-slate-900">
                  {account.programme ? `${account.programme}${account.level ? ` · ${account.level}` : ''}` : '—'}
                </div>
              </div>
            </div>
          ) : (
            <div className="py-4 text-xs text-slate-500">
              Unable to load account details. Please ensure you are signed in to the Student Portal.
            </div>
          )}
        </div>

        {/* Password & Contact Update Guidance */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Lock className="w-4 h-4 text-emerald-700" />
            <h3 className="text-base font-bold text-slate-900">
              Password &amp; Contact Information Updates
            </h3>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-100 text-xs text-slate-700 space-y-2 leading-relaxed">
            <div className="flex items-center gap-2 font-bold text-emerald-900">
              <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>Managed by Action Health College Academic Registry</span>
            </div>
            <p>
              For academic record integrity, self-service editing of student profile details, phone numbers, and portal passwords is disabled. To request a password reset or update your contact information, please submit a support ticket or contact the Registry directly:
            </p>
            <ul className="list-disc list-inside space-y-1 text-slate-600 pt-1">
              <li>Email: <strong>actionhealthcollege@gmail.com</strong></li>
              <li>Phone: <strong>+233 24 412 3456 / +233 30 212 3456</strong></li>
            </ul>
          </div>

          <div className="pt-2 flex justify-end">
            <Link
              href="/portal/student/support"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#073832] text-white text-xs font-bold rounded-xl shadow-sm hover:bg-emerald-900 transition-colors"
            >
              <HelpCircle className="w-4 h-4 text-emerald-300" />
              <span>Open Student Support Ticket</span>
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}

