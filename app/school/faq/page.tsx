'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ChevronDown, HelpCircle, ArrowRight } from 'lucide-react';
import SchoolNavbar from '@/components/SchoolNavbar';
import SchoolFooter from '@/components/SchoolFooter';

export default function SchoolFaqPage() {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  const faqs = [
    {
      q: 'Is Action Health College accredited by the Nursing and Midwifery Council?',
      a: 'Yes. Action Health College is fully accredited with full approvals to administer basic nursing, post-basic diplomas, and specialized clinical credentials.',
    },
    {
      q: 'What are the minimum WAEC / NECO requirements for the Basic Nursing Certificate?',
      a: 'Candidates must possess at least 5 credit passes in English Language, Mathematics, Biology, Chemistry, and Physics in not more than two sittings.',
    },
    {
      q: 'Where do students perform their practical clinical rotations?',
      a: 'Our students conduct practical hospital rotations directly inside the Action Boat Medical Centre / Homeopathy and affiliated teaching hospitals under senior preceptors.',
    },
    {
      q: 'Can tuition fees be paid in installments?',
      a: 'Yes. Students may opt for semester installment schedules upon approval by the Institutional Finance Office during registration.',
    },
    {
      q: 'How does the online examination and assessment system work?',
      a: 'Students take Computer-Based Testing (CBT) assessments through our secure student portal with instant automated grading for multiple-choice questions.',
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#f8faf9]">
      <SchoolNavbar />

      <section className="bg-[#073832] text-white py-14 px-4 sm:px-6 lg:px-8 text-center space-y-4">
        <span className="text-xs font-bold uppercase tracking-widest text-emerald-300">
          Answers to Common Questions
        </span>
        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
          Frequently Asked Questions
        </h1>
        <p className="text-sm sm:text-base text-emerald-100/80 max-w-2xl mx-auto">
          Clear answers about admission requirements, clinical rotations, accreditation, and fees.
        </p>
      </section>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-4">
        {faqs.map((faq, i) => {
          const isOpen = openIdx === i;
          return (
            <div
              key={i}
              className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden transition-all"
            >
              <button
                onClick={() => setOpenIdx(isOpen ? null : i)}
                className="w-full text-left p-6 font-bold text-sm text-slate-900 flex items-center justify-between gap-4"
              >
                <span>{faq.q}</span>
                <ChevronDown
                  className={`w-4 h-4 text-slate-400 transition-transform ${
                    isOpen ? 'rotate-180 text-emerald-700' : ''
                  }`}
                />
              </button>
              {isOpen && (
                <div className="px-6 pb-6 text-xs text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
                  {faq.a}
                </div>
              )}
            </div>
          );
        })}

        <div className="pt-8 text-center">
          <p className="text-xs text-slate-500 mb-3">Still have questions not answered here?</p>
          <Link
            href="/school/contact"
            className="inline-flex items-center gap-1.5 px-6 py-2.5 bg-[#073832] text-white text-xs font-bold rounded-full hover:bg-emerald-900 transition-colors"
          >
            <span>Contact Admissions Office</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </main>

      <SchoolFooter />
    </div>
  );
}

