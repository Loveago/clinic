'use client';

import React from 'react';
import Link from 'next/link';
import { CheckCircle, Award, FileText, ArrowRight, Calendar, UserCheck } from 'lucide-react';
import SchoolNavbar from '@/components/SchoolNavbar';
import SchoolFooter from '@/components/SchoolFooter';

export default function SchoolAdmissionsPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#f8faf9]">
      <SchoolNavbar />

      <section className="bg-[#073832] text-white py-14 px-4 sm:px-6 lg:px-8 text-center space-y-4">
        <span className="text-xs font-bold uppercase tracking-widest text-emerald-300">
          Admissions Guide · 2025/2026 Session
        </span>
        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
          Admissions &amp; Entry Requirements
        </h1>
        <p className="text-sm sm:text-base text-emerald-100/80 max-w-2xl mx-auto">
          Everything you need to know about applying to Action Health College.
        </p>
      </section>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-12">
        {/* Step-by-Step Guide */}
        <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-200/90 shadow-md space-y-8">
          <h2 className="text-2xl font-bold text-[#073832]">How to Apply (4-Step Process)</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
              <div className="w-8 h-8 rounded-full bg-[#073832] text-white flex items-center justify-center font-bold text-xs">
                1
              </div>
              <h3 className="font-bold text-slate-900 text-base">Select Your Programme</h3>
              <p className="text-slate-600 text-xs leading-relaxed">
                Choose between Basic Nursing Certificate (6 Months), Advanced Nursing Diploma (1 Year), or Specialized Care Training (3 Months).
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
              <div className="w-8 h-8 rounded-full bg-[#073832] text-white flex items-center justify-center font-bold text-xs">
                2
              </div>
              <h3 className="font-bold text-slate-900 text-base">Purchase &amp; Complete Application</h3>
              <p className="text-slate-600 text-xs leading-relaxed">
                Fill the online application form and pay the official GH₵150.00 application fee securely via Paystack Ghana (Mobile Money or Card).
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
              <div className="w-8 h-8 rounded-full bg-[#073832] text-white flex items-center justify-center font-bold text-xs">
                3
              </div>
              <h3 className="font-bold text-slate-900 text-base">Entrance CBT Assessment</h3>
              <p className="text-slate-600 text-xs leading-relaxed">
                Take the online aptitude examination covering English, Biology, General Knowledge, and Clinical Reasoning.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
              <div className="w-8 h-8 rounded-full bg-[#073832] text-white flex items-center justify-center font-bold text-xs">
                4
              </div>
              <h3 className="font-bold text-slate-900 text-base">Admission Letter &amp; Enrolment</h3>
              <p className="text-slate-600 text-xs leading-relaxed">
                Successful applicants receive formal admission letters, student ID registration, and immediate portal credentials.
              </p>
            </div>
          </div>

          <div className="pt-4 text-center">
            <Link
              href="/school/apply"
              className="inline-flex items-center gap-2 bg-[#073832] hover:bg-emerald-900 text-white font-bold text-sm px-8 py-3.5 rounded-full shadow-lg transition-all"
            >
              <span>Start Online Application Now</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </main>

      <SchoolFooter />
    </div>
  );
}

