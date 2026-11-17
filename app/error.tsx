'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RefreshCw, Home, GraduationCap } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#f8faf9] flex flex-col items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200/90 shadow-xl p-8 text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <span className="inline-block text-[11px] font-bold uppercase tracking-widest text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full">
            Action Boat Medical &amp; Action Health College
          </span>
          <h1 className="text-2xl font-extrabold text-[#073832]">
            Something went wrong
          </h1>
          <p className="text-sm text-slate-600 leading-relaxed">
            An unexpected error occurred while loading this page. Please try again or return to the main portal.
          </p>
          {error?.digest && (
            <p className="text-[11px] font-mono text-slate-400 pt-1">
              Reference: {error.digest}
            </p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            type="button"
            onClick={() => reset()}
            className="flex-1 py-3 px-5 bg-[#073832] hover:bg-emerald-900 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Try Again</span>
          </button>
          <Link
            href="/"
            className="flex-1 py-3 px-5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4" />
            <span>Clinic Home</span>
          </Link>
        </div>

        <div className="pt-4 border-t border-slate-100 flex items-center justify-center gap-4 text-xs font-semibold text-emerald-800">
          <Link href="/school" className="hover:underline inline-flex items-center gap-1">
            <GraduationCap className="w-3.5 h-3.5" />
            <span>College Home</span>
          </Link>
          <span className="text-slate-300">·</span>
          <Link href="/auth/login" className="hover:underline">
            Portal Login
          </Link>
        </div>
      </div>
    </div>
  );
}
