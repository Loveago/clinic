'use client';

import React from 'react';
import Image from 'next/image';
import SchoolNavbar from '@/components/SchoolNavbar';
import SchoolFooter from '@/components/SchoolFooter';

export default function SchoolManagementPage() {
  const leaders = [
    {
      name: 'Prof. Adeyemi Adeleke, PhD, RN, FWACN',
      role: 'Provost & Chief Academic Officer',
      bio: 'Former Dean of Nursing Sciences with over 28 years of academic leadership and healthcare curriculum development.',
      img: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=600&auto=format&fit=crop&q=80',
    },
    {
      name: 'Dr. Kemi Adebayo, PhD, RN',
      role: 'Head of Department & Senior Lecturer',
      bio: 'Specialist in clinical nursing pedagogy, simulation education, and cardiovascular health surveillance.',
      img: 'https://images.unsplash.com/photo-1594824813684-181156291a18?w=600&auto=format&fit=crop&q=80',
    },
    {
      name: 'Nurse Grace Danladi, RN, RM',
      role: 'Director of Clinical Preceptorship',
      bio: 'Oversees student ward rotations, clinical skills assessments, and hospital preceptorship partnerships.',
      img: 'https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=600&auto=format&fit=crop&q=80',
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#f8faf9]">
      <SchoolNavbar />

      <section className="bg-[#073832] text-white py-14 px-4 sm:px-6 lg:px-8 text-center space-y-4">
        <span className="text-xs font-bold uppercase tracking-widest text-emerald-300">
          Academic Leadership
        </span>
        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
          School Management &amp; Governing Council
        </h1>
        <p className="text-sm sm:text-base text-emerald-100/80 max-w-2xl mx-auto">
          Visionary leaders committed to molding ethically sound, clinically superior healthcare practitioners.
        </p>
      </section>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {leaders.map((leader, i) => (
            <div
              key={i}
              className="bg-white rounded-3xl overflow-hidden border border-slate-200/90 shadow-md hover:shadow-xl transition-all"
            >
              <div className="relative h-72 w-full bg-slate-100">
                <Image
                  src={leader.img}
                  alt={leader.name}
                  fill
                  className="object-cover object-top"
                />
              </div>
              <div className="p-6 space-y-2">
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full uppercase tracking-wider">
                  {leader.role}
                </span>
                <h3 className="text-lg font-bold text-slate-900 mt-2">{leader.name}</h3>
                <p className="text-xs text-slate-600 leading-relaxed pt-1">{leader.bio}</p>
              </div>
            </div>
          ))}
        </div>
      </main>

      <SchoolFooter />
    </div>
  );
}

