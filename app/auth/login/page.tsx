'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  GraduationCap,
  Heart,
  Lock,
  Mail,
  ArrowRight,
  Shield,
  Stethoscope,
  Loader2,
  AlertCircle,
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showForgotHelp, setShowForgotHelp] = useState(false);

  const allowDemo =
    process.env.NODE_ENV !== 'production' ||
    process.env.NEXT_PUBLIC_ALLOW_DEMO_LOGIN === 'true';

  const getPortalRouteForRole = (role: string) => {
    if (role === 'STUDENT') return '/portal/student/dashboard';
    if (role === 'LECTURER' || role === 'EXAM_OFFICER') return '/portal/lecturer';
    if (role === 'CLINIC_SUPER_ADMIN') return '/portal/clinic/admin';
    if (
      [
        'DOCTOR',
        'NURSE',
        'MIDWIFE',
        'PHARMACIST',
        'LAB_TECH',
        'RADIOLOGY_STAFF',
        'RECEPTIONIST',
        'CASHIER',
        'RECORDS_OFFICER',
        'CLINIC_ADMIN',
      ].includes(role)
    ) {
      return '/portal/clinic';
    }
    if (
      [
        'SUPER_ADMIN',
        'SCHOOL_SUPER_ADMIN',
        'SCHOOL_ADMIN',
        'ADMISSIONS_OFFICER',
        'REGISTRAR',
        'FINANCE_OFFICER',
      ].includes(role)
    ) {
      return '/portal/admin';
    }
    return '/';
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Login failed');
      }

      router.push(getPortalRouteForRole(data.user.role));
    } catch (err: any) {
      setErrorMsg(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoLogin = async (role: string) => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/auth/demo-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });
      const data = await res.json();
      if (data.success) {
        if (role === 'student') router.push('/portal/student/dashboard');
        else if (role === 'lecturer') router.push('/portal/lecturer');
        else router.push('/portal/admin');
      }
    } catch (e: any) {
      setErrorMsg(e.message || 'Demo login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8faf9] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-3">
        <div className="flex items-center justify-center gap-2">
          <div className="w-11 h-11 rounded-full bg-[#073832] text-white flex items-center justify-center shadow-md">
            <GraduationCap className="w-6 h-6 text-emerald-300" />
          </div>
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-[#073832]">
          Action Health &amp; Action Boat E-Portal
        </h2>
        <p className="text-xs sm:text-sm text-slate-500">
          Single sign-on for students, academic staff, clinic staff, patients, and administration
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 sm:px-10 rounded-3xl border border-slate-200/90 shadow-xl space-y-6">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Institutional Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="email"
                  required
                  placeholder="student@actionhealthcollege.edu.gh"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-700/30"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowForgotHelp((prev) => !prev)}
                  className="text-[11px] font-medium text-emerald-800 hover:underline"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="password"
                  required
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-700/30"
                />
              </div>
            </div>

            {showForgotHelp && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 text-xs space-y-1.5">
                <div className="font-bold">Need help resetting your password?</div>
                <p className="text-emerald-900/90 leading-relaxed">
                  For security, credential resets are handled by our administrative desks:
                </p>
                <ul className="list-disc list-inside space-y-0.5 text-[11px] text-emerald-900">
                  <li>
                    <strong>Students &amp; Lecturers:</strong> Contact College IT / Admissions at{' '}
                    <span className="font-semibold">actionhealthcollege@gmail.com</span>
                  </li>
                  <li>
                    <strong>Patients &amp; Clinic Staff:</strong> Contact Clinic Admin at{' '}
                    <span className="font-semibold">actiondoctor2019@gmail.com</span> or{' '}
                    <span className="font-semibold">+233 24 412 3456</span>
                  </li>
                </ul>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[#073832] hover:bg-emerald-900 active:scale-95 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span>Sign In to Portal</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo One-Click Access Cards */}
          {allowDemo && (
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block text-center">
                Instant One-Click Demo Access
              </span>

              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickDemoLogin('student')}
                  disabled={loading}
                  className="p-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 rounded-xl border border-emerald-200 text-center transition-colors text-xs font-semibold"
                >
                  <GraduationCap className="w-4 h-4 mx-auto mb-1 text-emerald-700" />
                  <span>Student</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickDemoLogin('lecturer')}
                  disabled={loading}
                  className="p-2.5 bg-blue-50 hover:bg-blue-100 text-blue-900 rounded-xl border border-blue-200 text-center transition-colors text-xs font-semibold"
                >
                  <Stethoscope className="w-4 h-4 mx-auto mb-1 text-blue-700" />
                  <span>Lecturer</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickDemoLogin('admin')}
                  disabled={loading}
                  className="p-2.5 bg-purple-50 hover:bg-purple-100 text-purple-900 rounded-xl border border-purple-200 text-center transition-colors text-xs font-semibold"
                >
                  <Shield className="w-4 h-4 mx-auto mb-1 text-purple-700" />
                  <span>Admin</span>
                </button>
              </div>
            </div>
          )}

          <div className="text-center pt-2 text-xs text-slate-500">
            <Link href="/" className="text-emerald-800 font-bold hover:underline">
              ← Return to Action Boat &amp; Action Health Public Site
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

