'use client';

import React from 'react';
import SchoolNavbar from '@/components/SchoolNavbar';
import SchoolFooter from '@/components/SchoolFooter';

export default function SchoolTermsPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#f8faf9]">
      <SchoolNavbar />

      <section className="bg-[#073832] text-white py-14 px-4 sm:px-6 lg:px-8 text-center space-y-4">
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
          Academic Terms &amp; Student Code of Conduct
        </h1>
        <p className="text-xs sm:text-sm text-emerald-100/80 max-w-xl mx-auto">
          Institutional regulations governing matriculation, clinical ethics, examinations, and fee policies.
        </p>
      </section>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-200/90 shadow-sm space-y-6 text-sm text-slate-700 leading-relaxed">
          <h2 className="text-xl font-bold text-slate-900">1. Academic Honesty &amp; CBT Rules</h2>
          <p>
            Any student found attempting examination malpractice, unauthorized tab switching during CBT tests, or impersonation faces immediate disciplinary review and possible suspension or expulsion.
          </p>

          <h2 className="text-xl font-bold text-slate-900">2. Clinical Ward Conduct</h2>
          <p>
            Nursing students must strictly adhere to hospital patient confidentiality, professional nursing attire, infection control protocols, and preceptor directives at all times during hospital rotations.
          </p>

          <h2 className="text-xl font-bold text-slate-900">3. Fee Settlement &amp; Clearance</h2>
          <p>
            Admission and tuition fees must be cleared prior to examination registration and release of official academic transcripts.
          </p>
        </div>
      </main>

      <SchoolFooter />
    </div>
  );
}

