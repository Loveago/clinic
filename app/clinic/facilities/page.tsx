'use client';

import React from 'react';
import Image from 'next/image';
import ClinicNavbar from '@/components/ClinicNavbar';
import ClinicFooter from '@/components/ClinicFooter';

export default function ClinicFacilitiesPage() {
  const facilities = [
    {
      title: 'Consultation & Triage Suites',
      desc: 'Sound-insulated, air-conditioned consultation chambers ensuring total patient privacy.',
      img: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=800&auto=format&fit=crop&q=80',
    },
    {
      title: 'Automated Diagnostic Laboratory',
      desc: 'Point-of-care rapid testing, hematology, bacteriology, and automated clinical chemistry.',
      img: 'https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=800&auto=format&fit=crop&q=80',
    },
    {
      title: 'Laminar Flow Operating Theatres',
      desc: 'Equipped with positive pressure ventilation and modern anesthesia workstations.',
      img: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=800&auto=format&fit=crop&q=80',
    },
    {
      title: 'Nursing Skills Simulation Laboratory',
      desc: 'Full clinical simulation suite with interactive manikins for student training.',
      img: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&auto=format&fit=crop&q=80',
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#f8faf9]">
      <ClinicNavbar />

      <section className="bg-[#073832] text-white py-14 px-4 sm:px-6 lg:px-8 text-center space-y-4">
        <span className="text-xs font-bold uppercase tracking-widest text-emerald-300">
          World-Class Medical Infrastructure
        </span>
        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
          Facilities &amp; Clinic Gallery
        </h1>
        <p className="text-sm sm:text-base text-emerald-100/80 max-w-2xl mx-auto">
          Explore our sterile wards, high-precision laboratories, and student clinical simulation suites.
        </p>
      </section>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {facilities.map((fac, i) => (
            <div
              key={i}
              className="bg-white rounded-3xl overflow-hidden border border-slate-200/90 shadow-md hover:shadow-xl hover:border-emerald-300 transition-all group"
            >
              <div className="relative h-64 w-full bg-slate-100 overflow-hidden">
                <Image
                  src={fac.img}
                  alt={fac.title}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <div className="p-6 space-y-2">
                <h3 className="text-xl font-bold text-slate-900 group-hover:text-emerald-800 transition-colors">
                  {fac.title}
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">{fac.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </main>

      <ClinicFooter />
    </div>
  );
}

