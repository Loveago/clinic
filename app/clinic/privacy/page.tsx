'use client';

import React from 'react';
import ClinicNavbar from '@/components/ClinicNavbar';
import ClinicFooter from '@/components/ClinicFooter';

export default function ClinicPrivacyPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#f8faf9]">
      <ClinicNavbar />

      <section className="bg-[#073832] text-white py-14 px-4 sm:px-6 lg:px-8 text-center space-y-4">
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
          Privacy Policy &amp; Data Protection
        </h1>
        <p className="text-xs sm:text-sm text-emerald-100/80 max-w-xl mx-auto">
          Compliant with the Ghana Data Protection Act (Act 843) and international health confidentiality protocols.
        </p>
      </section>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-200/90 shadow-sm space-y-6 text-sm text-slate-700 leading-relaxed">
          <h2 className="text-xl font-bold text-slate-900">1. Information Collection &amp; Use</h2>
          <p>
            Action Boat Medical Centre / Homeopathy collects information you explicitly submit through our public website for appointment scheduling, general healthcare inquiries, and prospective student enrollment. We do not store or transmit medical health records through unencrypted public website channels.
          </p>

          <h2 className="text-xl font-bold text-slate-900">2. Appointment &amp; Contact Records</h2>
          <p>
            Contact numbers and email addresses provided during appointment bookings are utilized solely to verify and schedule your consultation with the requested medical specialist or diagnostic department.
          </p>

          <h2 className="text-xl font-bold text-slate-900">3. Institutional Security Standards</h2>
          <p>
            Our backend utilizes TLS encryption, secure database environments, and least-privilege role-based access control. All administrative interactions are restricted to authorized clinical staff.
          </p>

          <div className="pt-4 border-t border-slate-100 text-xs text-slate-400">
            Last Updated: April 2025 · Action Boat Medical Centre / Homeopathy Legal Directorate
          </div>
        </div>
      </main>

      <ClinicFooter />
    </div>
  );
}

