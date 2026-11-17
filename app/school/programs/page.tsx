'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Stethoscope,
  PlusCircle,
  Heart,
  Clock,
  Award,
  CheckCircle,
  ArrowRight,
  BookOpen,
} from 'lucide-react';
import SchoolNavbar from '@/components/SchoolNavbar';
import SchoolFooter from '@/components/SchoolFooter';
import { FadeUp, StaggerGrid, StaggerItem } from '@/components/MotionPrimitives';

export default function SchoolProgramsDirectoryPage() {
  const [programs, setPrograms] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/school/programs')
      .then((res) => res.json())
      .then((data) => {
        if (data.programs) setPrograms(data.programs);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-[#f8faf9]">
      <SchoolNavbar />

      {/* Hero Header */}
      <section className="bg-[#073832] text-white py-14 px-4 sm:px-6 lg:px-8 text-center space-y-4">
        <FadeUp>
          <span className="text-xs font-bold uppercase tracking-widest text-emerald-300">
            Curriculum &amp; Qualifications
          </span>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight mt-2">
            Academic Nursing Programmes
          </h1>
          <p className="text-sm sm:text-base text-emerald-100/80 max-w-2xl mx-auto mt-3">
            Accredited nursing qualifications tailored for entry-level candidates, certified nurses advancing their careers, and specialized healthcare practitioners.
          </p>
        </FadeUp>
      </section>

      {/* Program Cards */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-12">
        <StaggerGrid className="grid grid-cols-1 md:grid-cols-3 gap-8" staggerDelay={0.1}>
          {programs.map((prog, index) => {
            const icons = [Stethoscope, PlusCircle, Heart];
            const Icon = icons[index % icons.length];

            return (
              <StaggerItem key={prog.id}>
                <div
                  id={prog.code.toLowerCase()}
                  className="bg-white rounded-3xl p-8 border border-slate-200/90 shadow-md hover:shadow-xl hover:-translate-y-1 hover:border-emerald-300 transition-all flex flex-col justify-between group h-full"
                >
                <div>
                  <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-800 flex items-center justify-center mb-6 group-hover:scale-105 transition-transform">
                    <Icon className="w-7 h-7 text-emerald-700" />
                  </div>

                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                    {prog.code} · {prog.duration}
                  </span>

                  <h2 className="text-2xl font-bold text-slate-900 mt-3 group-hover:text-emerald-800 transition-colors">
                    {prog.name}
                  </h2>

                  <div className="mt-4 text-3xl font-extrabold text-[#073832]">
                    GH₵{prog.fee.toLocaleString()}
                  </div>
                  <p className="text-xs text-slate-500 font-medium">Standard Tuition Fee in Ghana Cedis (GHS)</p>

                  <p className="text-sm text-slate-600 mt-4 leading-relaxed">
                    {prog.description}
                  </p>

                  <div className="mt-6 pt-6 border-t border-slate-100 space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Admission Requirements:
                    </h4>
                    <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                      {prog.requirements}
                    </p>
                  </div>
                </div>

                <div className="pt-8 mt-6">
                  <Link
                    href={`/school/apply?program=${prog.code}`}
                    className="w-full py-3.5 bg-[#073832] hover:bg-emerald-900 text-white text-xs font-bold rounded-full shadow-md transition-all flex items-center justify-center gap-2 group-hover:gap-3"
                  >
                    <span>Enroll In This Programme</span>
                    <ArrowRight className="w-4 h-4 text-emerald-300" />
                  </Link>
                </div>
              </div>
              </StaggerItem>
            );
          })}
        </StaggerGrid>
      </main>

      <SchoolFooter />
    </div>
  );
}

