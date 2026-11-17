'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Award, CheckCircle, ShieldCheck, Heart, ArrowRight } from 'lucide-react';
import SchoolNavbar from '@/components/SchoolNavbar';
import SchoolFooter from '@/components/SchoolFooter';

export default function SchoolAboutPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#f8faf9]">
      <SchoolNavbar />

      <section className="bg-[#073832] text-white py-14 px-4 sm:px-6 lg:px-8 text-center space-y-4">
        <span className="text-xs font-bold uppercase tracking-widest text-emerald-300">
          History, Vision &amp; Leadership
        </span>
        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
          About Action Health College
        </h1>
        <p className="text-sm sm:text-base text-emerald-100/80 max-w-2xl mx-auto">
          Pioneering clinical excellence, compassionate patient advocacy, and evidence-based nursing practice.
        </p>
      </section>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-12">
        <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-200/90 shadow-md space-y-6">
          <h2 className="text-2xl font-bold text-[#073832]">Our Institutional Mission</h2>
          <p className="text-slate-600 leading-relaxed text-sm sm:text-base">
            Action Health College was founded with a singular conviction: that the best healthcare education occurs when academic rigor is intimately bound to actual clinical practice. Operating directly within the Action Boat Medical Centre / Homeopathy complex in Ridge, Accra, Ghana, our students train on the front lines of healthcare delivery under the direct guidance of seasoned nurse educators and specialist physicians accredited by the Nursing &amp; Midwifery Council (N&amp;MC) of Ghana.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-slate-100">
            <div className="space-y-2">
              <h3 className="font-bold text-slate-900 text-base">Academic Excellence</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Curriculum fully aligned with international standards and Nursing &amp; Midwifery Council guidelines.
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="font-bold text-slate-900 text-base">Clinical Immersion</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                100% guaranteed ward rotations across internal medicine, pediatrics, obstetrics, and emergency trauma.
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="font-bold text-slate-900 text-base">Digital Learning (LMS)</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Modern student portal with CBT examinations, lecture archives, and real-time progress indicators.
              </p>
            </div>
          </div>
        </div>
      </main>

      <SchoolFooter />
    </div>
  );
}

