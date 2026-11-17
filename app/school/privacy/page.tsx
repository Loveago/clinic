'use client';

import React from 'react';
import SchoolNavbar from '@/components/SchoolNavbar';
import SchoolFooter from '@/components/SchoolFooter';

export default function SchoolPrivacyPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#f8faf9]">
      <SchoolNavbar />

      <section className="bg-[#073832] text-white py-14 px-4 sm:px-6 lg:px-8 text-center space-y-4">
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
          School Privacy &amp; Academic Data Policy
        </h1>
        <p className="text-xs sm:text-sm text-emerald-100/80 max-w-xl mx-auto">
          Protection of student personal identifiable information, examination records, and financial data.
        </p>
      </section>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-200/90 shadow-sm space-y-6 text-sm text-slate-700 leading-relaxed">
          <h2 className="text-xl font-bold text-slate-900">1. Student Academic Records</h2>
          <p>
            Student examination results, grading records, continuous assessments, and transcripts are strictly protected. They are accessible exclusively by the individual student, their course lecturer, and authorized examination administration officers.
          </p>

          <h2 className="text-xl font-bold text-slate-900">2. Applicant Credentials &amp; Biometrics</h2>
          <p>
            Document uploads, WAEC/NECO grades, and student identity photographs are processed securely for admission verification, ID card issuance, and Nursing Council matriculation registration.
          </p>

          <h2 className="text-xl font-bold text-slate-900">3. Payment &amp; Financial Security</h2>
          <p>
            Tuition payments and form sales are processed via PCI-DSS compliant financial providers. Credit card numbers are never stored directly on our servers.
          </p>
        </div>
      </main>

      <SchoolFooter />
    </div>
  );
}

