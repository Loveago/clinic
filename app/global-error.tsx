'use client';

import React from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#f8faf9] text-slate-800 flex items-center justify-center px-4 py-12 font-sans antialiased">
        <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200 shadow-xl p-8 text-center space-y-5">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center mx-auto text-2xl font-extrabold">
            !
          </div>
          <div className="space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-widest text-emerald-800">
              Action Boat Medical &amp; Action Health College
            </p>
            <h1 className="text-2xl font-extrabold text-[#073832]">
              Application Error
            </h1>
            <p className="text-sm text-slate-600">
              A critical error occurred. Please reload or return to the home page.
            </p>
            {error?.digest && (
              <p className="text-[11px] font-mono text-slate-400">
                Reference: {error.digest}
              </p>
            )}
          </div>
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              type="button"
              onClick={() => reset()}
              className="flex-1 py-3 px-5 bg-[#073832] hover:bg-emerald-900 text-white text-xs font-bold rounded-xl shadow-md transition-all"
            >
              Try Again
            </button>
            <a
              href="/"
              className="flex-1 py-3 px-5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition-all flex items-center justify-center"
            >
              Return Home
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
