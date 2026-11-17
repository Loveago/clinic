'use client';

import React from 'react';
import ClinicNavbar from '@/components/ClinicNavbar';
import ClinicFooter from '@/components/ClinicFooter';

export default function ClinicTermsPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#f8faf9]">
      <ClinicNavbar />

      <section className="bg-[#073832] text-white py-14 px-4 sm:px-6 lg:px-8 text-center space-y-4">
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
          Terms &amp; Conditions of Service
        </h1>
        <p className="text-xs sm:text-sm text-emerald-100/80 max-w-xl mx-auto">
          Terms governing appointment reservations, website usage, and clinical consultations.
        </p>
      </section>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-200/90 shadow-sm space-y-6 text-sm text-slate-700 leading-relaxed">
          <h2 className="text-xl font-bold text-slate-900">1. Online Appointment Requests</h2>
          <p>
            Submission of an online appointment request on this platform does not constitute an automatically binding confirmation. All appointment slots remain provisional until verified and approved by Action Health clinical administrative staff.
          </p>

          <h2 className="text-xl font-bold text-slate-900">2. Emergency Medical Situations</h2>
          <p>
            In acute medical emergencies (e.g., severe chest pain, major trauma, acute shortness of breath), do not wait for an online appointment confirmation. Call our 24/7 emergency hotline (+233 24 412 3456) or proceed immediately to the Action Boat Medical Centre Emergency &amp; Trauma Suite.
          </p>

          <h2 className="text-xl font-bold text-slate-900">3. Electronic Advice &amp; Articles</h2>
          <p>
            Articles published on this website are for educational awareness and should not replace an in-person physical clinical examination and diagnosis by a certified medical practitioner.
          </p>

          <div className="pt-4 border-t border-slate-100 text-xs text-slate-400">
            Last Updated: April 2025 · Action Boat Medical Centre / Homeopathy
          </div>
        </div>
      </main>

      <ClinicFooter />
    </div>
  );
}

