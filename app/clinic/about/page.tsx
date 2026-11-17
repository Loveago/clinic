'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Heart, ShieldCheck, Award, ArrowRight, CheckCircle2 } from 'lucide-react';
import ClinicNavbar from '@/components/ClinicNavbar';
import ClinicFooter from '@/components/ClinicFooter';

export default function ClinicAboutPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#f8faf9]">
      <ClinicNavbar />

      <section className="bg-[#073832] text-white py-14 px-4 sm:px-6 lg:px-8 text-center space-y-4">
        <span className="text-xs font-bold uppercase tracking-widest text-emerald-300">
          Our Heritage &amp; Clinical Quality
        </span>
        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
          About Action Boat Medical Centre / Homeopathy
        </h1>
        <p className="text-sm sm:text-base text-emerald-100/80 max-w-2xl mx-auto">
          We are committed to providing accessible, high-quality healthcare with an uncompromising focus on your well-being.
        </p>
      </section>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
          <div className="relative aspect-[4/3] rounded-3xl overflow-hidden border border-slate-200 shadow-xl">
            <Image
              src="https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=800&auto=format&fit=crop&q=80"
              alt="Action Health Modern Clinic"
              fill
              className="object-cover"
            />
          </div>

          <div className="space-y-4">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full">
              Founded on Compassion &amp; Science
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#073832]">
              Healthcare Redefined for Ghanaian Families
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Action Boat Medical Centre / Homeopathy was conceived as a modern medical sanctuary where cutting-edge technology and human empathy meet. We eliminate long hospital queues with streamlined digital appointments, digital laboratory records, and fully stocked pharmacy dispensaries.
            </p>
            <div className="space-y-2 pt-2 text-xs font-semibold text-slate-800">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Certified tertiary consultants &amp; specialist surgeons</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Integrated clinical training hospital for Action Health College</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>24/7 diagnostic lab, digital radiology, and cardiac ICU</span>
              </div>
            </div>
          </div>
        </div>

        <section
          id="health-info"
          className="scroll-mt-24 bg-white rounded-3xl p-8 sm:p-10 border border-slate-200/90 shadow-sm space-y-6"
        >
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full">
              Patient Health Information
            </span>
            <h2 className="text-2xl font-extrabold text-[#073832]">
              Preventive Care, Homeopathy &amp; Patient Guidance
            </h2>
            <p className="text-sm text-slate-600 max-w-3xl">
              Essential health information to help you prepare for your visit, understand our integrative homeopathic and conventional care model, and access urgent support.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-5 rounded-2xl bg-[#f8faf9] border border-slate-200/80 space-y-2">
              <Heart className="w-5 h-5 text-emerald-700" />
              <h3 className="text-sm font-bold text-slate-900">Integrative &amp; Homeopathic Care</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Our clinicians combine evidence-based conventional medicine with individualized homeopathic remedies for chronic conditions, maternal wellness, and family care.
              </p>
            </div>
            <div className="p-5 rounded-2xl bg-[#f8faf9] border border-slate-200/80 space-y-2">
              <ShieldCheck className="w-5 h-5 text-emerald-700" />
              <h3 className="text-sm font-bold text-slate-900">Preparing for Diagnostics</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                For fasting blood glucose or lipid panels, please fast for 8–12 hours (water is permitted) and bring any current medications or previous lab reports.
              </p>
            </div>
            <div className="p-5 rounded-2xl bg-[#f8faf9] border border-slate-200/80 space-y-2">
              <Award className="w-5 h-5 text-emerald-700" />
              <h3 className="text-sm font-bold text-slate-900">24/7 Emergency Support</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Our Emergency Unit at Tema Michel Camp (Gbetsile Pure Oil) operates 24/7. Call +233 24 412 3456 for urgent clinical triage or ambulance guidance.
              </p>
            </div>
          </div>

          <div className="pt-2 flex flex-wrap items-center gap-4">
            <Link
              href="/clinic/services"
              className="inline-flex items-center gap-2 text-xs font-bold text-white bg-[#073832] hover:bg-emerald-900 px-5 py-2.5 rounded-full transition-colors"
            >
              <span>Explore Clinical Services</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <Link
              href="/clinic/contact"
              className="inline-flex items-center gap-2 text-xs font-bold text-[#073832] bg-emerald-50 hover:bg-emerald-100 px-5 py-2.5 rounded-full transition-colors"
            >
              <span>Contact &amp; Directions</span>
            </Link>
          </div>
        </section>
      </main>

      <ClinicFooter />
    </div>
  );
}

