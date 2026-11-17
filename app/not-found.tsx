import React from 'react';
import Link from 'next/link';
import { FileQuestion, Home, GraduationCap, LogIn } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#f8faf9] flex flex-col items-center justify-center px-4 py-12">
      <div className="max-w-lg w-full bg-white rounded-3xl border border-slate-200/90 shadow-xl p-8 sm:p-10 text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-100 text-[#073832] flex items-center justify-center mx-auto">
          <FileQuestion className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <span className="inline-block text-xs font-extrabold uppercase tracking-widest text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full">
            404 · Page Not Found
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#073832]">
            We couldn&apos;t find that page
          </h1>
          <p className="text-sm text-slate-600 leading-relaxed">
            The page you are looking for may have been moved, renamed, or does not exist on Action Boat Medical Centre &amp; Action Health College.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <Link
            href="/"
            className="py-3 px-4 bg-[#073832] hover:bg-emerald-900 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4" />
            <span>Clinic Home</span>
          </Link>
          <Link
            href="/school"
            className="py-3 px-4 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2"
          >
            <GraduationCap className="w-4 h-4" />
            <span>College</span>
          </Link>
          <Link
            href="/auth/login"
            className="py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2"
          >
            <LogIn className="w-4 h-4" />
            <span>Portal Login</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
