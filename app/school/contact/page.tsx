'use client';

import React from 'react';
import { MapPin, Phone, Mail, Clock, GraduationCap, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import SchoolNavbar from '@/components/SchoolNavbar';
import SchoolFooter from '@/components/SchoolFooter';

export default function SchoolContactPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#f8faf9]">
      <SchoolNavbar />

      <section className="bg-[#073832] text-white py-14 px-4 sm:px-6 lg:px-8 text-center space-y-4">
        <span className="text-xs font-bold uppercase tracking-widest text-emerald-300">
          Admissions Office &amp; Campus Visits
        </span>
        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
          Contact Admissions &amp; Registry
        </h1>
        <p className="text-sm sm:text-base text-emerald-100/80 max-w-2xl mx-auto">
          We welcome prospective students and guardians for campus tours and academic advising.
        </p>
      </section>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-xl font-bold text-slate-900">Admissions Liaison Office</h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              For inquiries regarding WAEC qualifications, credential verification, and entrance examination dates.
            </p>
            <div className="space-y-3 pt-3 text-xs text-slate-700">
              <div className="flex items-center gap-3">
                <MapPin className="w-4 h-4 text-emerald-700" />
                <span>Academic Secretariat, Level 2, Tema Michel Camp (Gbetsile Pure Oil), Greater Accra, Ghana</span>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-emerald-700" />
                <span>+233 24 412 3456 / +233 30 212 3456</span>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-emerald-700" />
                <span>actionhealthcollege@gmail.com</span>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="w-4 h-4 text-emerald-700" />
                <span>Monday - Friday: 8:00 AM - 4:00 PM</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm flex flex-col justify-between space-y-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Ready to Enroll?</h2>
              <p className="text-xs text-slate-600 leading-relaxed mt-2">
                Save time by completing your admission application online and accessing instant status tracking.
              </p>
            </div>
            <div className="space-y-3">
              <Link
                href="/school/apply"
                className="w-full py-3 bg-[#073832] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-emerald-900 transition-colors shadow-md"
              >
                <span>Purchase Admission Form Online</span>
                <ArrowRight className="w-4 h-4 text-emerald-300" />
              </Link>
              <Link
                href="/school/track"
                className="w-full py-3 bg-slate-50 text-slate-800 text-xs font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-slate-100 transition-colors border border-slate-200"
              >
                <span>Track Existing Application</span>
              </Link>
            </div>
          </div>
        </div>
      </main>

      <SchoolFooter />
    </div>
  );
}

