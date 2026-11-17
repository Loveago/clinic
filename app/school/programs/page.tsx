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
  Calendar,
  MapPin,
  Briefcase,
  ChevronDown,
  ChevronUp,
  Sparkles,
  GraduationCap,
} from 'lucide-react';
import SchoolNavbar from '@/components/SchoolNavbar';
import SchoolFooter from '@/components/SchoolFooter';
import {
  BROCHURE_PROGRAMMES,
  ADDITIONAL_BROCHURE_PROGRAMMES,
  GRADUATION_REQUIREMENTS,
} from '@/lib/school-programs-catalog';

const INITIAL_PROGRAMS = BROCHURE_PROGRAMMES.map((b, idx) => ({
  id: `brochure-${b.code.toLowerCase()}-${idx}`,
  ...b,
  courses: [] as any[],
}));

export default function SchoolProgramsDirectoryPage() {
  const [programs, setPrograms] = useState<any[]>(INITIAL_PROGRAMS);
  const [additionalProgrammes, setAdditionalProgrammes] = useState<any[]>(ADDITIONAL_BROCHURE_PROGRAMMES);
  const [graduationRequirements, setGraduationRequirements] = useState<string[]>(GRADUATION_REQUIREMENTS);
  const [expandedCodes, setExpandedCodes] = useState<Record<string, boolean>>({
    DCG: true,
    NAS: true,
    PHE: true,
  });

  useEffect(() => {
    fetch('/api/school/programs')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data.programs) && data.programs.length > 0) {
          setPrograms(data.programs);
        }
        if (Array.isArray(data.additionalProgrammes)) {
          setAdditionalProgrammes(data.additionalProgrammes);
        }
        if (Array.isArray(data.graduationRequirements)) {
          setGraduationRequirements(data.graduationRequirements);
        }
      })
      .catch(() => {});
  }, []);

  const toggleOutline = (code: string) => {
    setExpandedCodes((prev) => ({ ...prev, [code]: !prev[code] }));
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f8faf9]">
      <SchoolNavbar />

      {/* Hero Header */}
      <section className="bg-[#073832] text-white py-14 px-4 sm:px-6 lg:px-8 text-center space-y-4">
        <div className="max-w-4xl mx-auto space-y-3">
          <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-emerald-300 bg-emerald-900/60 px-3 py-1 rounded-full border border-emerald-700/60">
            <Award className="w-3.5 h-3.5" />
            Curriculum, Fees &amp; Course Outlines
          </span>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
            Academic Nursing &amp; Healthcare Programmes
          </h1>
          <p className="text-sm sm:text-base text-emerald-100/85 max-w-2xl mx-auto">
            Practical, career-focused training with flexible schedules, installment plans, up to 50% scholarship consideration, and supervised clinical rotations.
          </p>

          {/* Quick Jump Pills */}
          <div className="flex flex-wrap justify-center gap-2.5 pt-3">
            {programs.map((p) => (
              <a
                key={p.code}
                href={`#${p.code.toLowerCase()}`}
                className="px-4 py-1.5 rounded-full text-xs font-bold bg-white/10 hover:bg-emerald-500/30 text-white border border-white/20 transition-colors"
              >
                {p.name} ({p.code})
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Detailed Programme Sections */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 space-y-12 w-full">
        <div className="space-y-10">
          {programs.map((prog, index) => {
            const icons = [Heart, Stethoscope, PlusCircle];
            const Icon = icons[index % icons.length];
            const isExpanded = expandedCodes[prog.code] !== false;
            const outline = prog.courseOutline || [];
            const dbCourses = prog.courses || [];

            return (
              <section
                key={prog.id || prog.code}
                id={prog.code.toLowerCase()}
                className="scroll-mt-24 bg-white rounded-3xl border border-slate-200/90 shadow-md overflow-hidden"
              >
                {/* Top Summary Header */}
                <div className="p-6 sm:p-8 border-b border-slate-100 bg-gradient-to-br from-white to-emerald-50/40">
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
                    <div className="space-y-3 flex-1">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <div className="w-11 h-11 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                          <Icon className="w-6 h-6 text-emerald-700" />
                        </div>
                        <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                          {prog.code}
                        </span>
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 bg-slate-100 px-3 py-1 rounded-full">
                          <Clock className="w-3.5 h-3.5 text-emerald-700" />
                          Duration: {prog.duration}
                        </span>
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-800 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
                          <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                          50% Scholarship Eligible
                        </span>
                      </div>

                      <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                        {prog.name}
                      </h2>
                      <p className="text-sm text-slate-600 leading-relaxed max-w-3xl">
                        {prog.description}
                      </p>
                    </div>

                    {/* Fee & CTA Box */}
                    <div className="lg:w-80 shrink-0 bg-[#073832] text-white rounded-2xl p-5 space-y-3 shadow-lg">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-300">
                        Standard Tuition Fee
                      </div>
                      <div className="text-3xl font-black">
                        GH₵{Number(prog.fee || 0).toLocaleString()}.00
                      </div>
                      <p className="text-xs text-emerald-100/90 leading-relaxed">
                        {prog.installmentNote || `Initial deposit GH₵${Math.round(Number(prog.fee || 0) / 2).toLocaleString()} with half installment plan.`}
                      </p>
                      <div className="pt-2 space-y-2">
                        <Link
                          href={`/school/apply?program=${prog.code}`}
                          className="w-full py-2.5 px-4 bg-emerald-400 hover:bg-emerald-300 text-[#073832] text-xs font-extrabold rounded-xl transition-colors flex items-center justify-center gap-2"
                        >
                          <span>Enroll In This Programme</span>
                          <ArrowRight className="w-4 h-4" />
                        </Link>
                        <Link
                          href={`/school/programs/${prog.code.toLowerCase()}`}
                          className="w-full py-2 px-4 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
                        >
                          <BookOpen className="w-3.5 h-3.5" />
                          <span>Open Dedicated Course Page</span>
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Schedules, Venue & Requirements Grid */}
                <div className="p-6 sm:p-8 grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-50/50 border-b border-slate-100">
                  <div className="bg-white p-4 rounded-2xl border border-slate-200/80 space-y-2.5">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-emerald-700" />
                      Class Schedules
                    </h3>
                    <ul className="space-y-1.5 text-xs text-slate-700">
                      {(prog.schedules || []).map((s: any, idx: number) => (
                        <li key={idx} className="flex justify-between gap-2 border-b border-slate-100 pb-1 last:border-0 last:pb-0">
                          <span className="font-semibold text-slate-800">{s.label}</span>
                          <span className="text-slate-600 text-right">{s.timing}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="bg-white p-4 rounded-2xl border border-slate-200/80 space-y-2.5">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-700" />
                      Admission Requirements &amp; Venue
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed">{prog.requirements}</p>
                    <div className="pt-1 flex items-start gap-1.5 text-xs text-emerald-800 font-medium">
                      <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0 text-emerald-700" />
                      <span>{prog.venue}</span>
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-2xl border border-slate-200/80 space-y-2.5">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <Briefcase className="w-3.5 h-3.5 text-emerald-700" />
                      Career Opportunities
                    </h3>
                    <div className="flex flex-wrap gap-1.5">
                      {(prog.careerOpportunities || []).map((career: string, idx: number) => (
                        <span
                          key={idx}
                          className="text-[11px] font-medium bg-emerald-50 text-emerald-900 px-2.5 py-1 rounded-full border border-emerald-100"
                        >
                          {career}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Course Outline & Modules */}
                <div className="p-6 sm:p-8 space-y-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-emerald-700" />
                        Course Outline &amp; Modules
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Structured curriculum modules and topics covered in this programme.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleOutline(prog.code)}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-3.5 py-2 rounded-xl border border-emerald-200 transition-colors"
                    >
                      <span>{isExpanded ? 'Hide Outline' : 'Show Outline'}</span>
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="space-y-4 pt-2">
                      {outline.length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {outline.map((mod: any, idx: number) => (
                            <div
                              key={idx}
                              className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 hover:border-emerald-300 hover:bg-white transition-all space-y-2"
                            >
                              <span className="inline-block text-[10px] font-extrabold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                                {mod.code}
                              </span>
                              <h4 className="text-sm font-bold text-slate-900 leading-snug">
                                {mod.title}
                              </h4>
                              <p className="text-xs text-slate-600 leading-relaxed">
                                {mod.description}
                              </p>
                              {Array.isArray(mod.topics) && mod.topics.length > 0 && (
                                <ul className="pt-1 space-y-1">
                                  {mod.topics.map((t: string, tIdx: number) => (
                                    <li key={tIdx} className="text-[11px] text-slate-700 flex items-start gap-1.5">
                                      <CheckCircle className="w-3 h-3 text-emerald-600 shrink-0 mt-0.5" />
                                      <span>{t}</span>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {dbCourses.length > 0 && (
                        <div className="pt-3 border-t border-slate-100">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                            Registered Academic Courses ({dbCourses.length})
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            {dbCourses.map((c: any) => (
                              <div
                                key={c.id}
                                className="p-3.5 rounded-xl border border-emerald-100 bg-emerald-50/40 space-y-1"
                              >
                                <div className="flex items-center justify-between text-xs font-bold text-emerald-900">
                                  <span>{c.code}</span>
                                  <span>{c.creditHours} Credits</span>
                                </div>
                                <div className="text-xs font-semibold text-slate-800">{c.title}</div>
                                <p className="text-[11px] text-slate-600 line-clamp-2">{c.description}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </section>
            );
          })}
        </div>

        {/* Additional Brochure Programmes */}
        <section className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-md space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                College Brochure Catalogue
              </span>
              <h2 className="text-2xl font-extrabold text-slate-900 mt-1">
                Additional Certificate &amp; Professional Diploma Programmes
              </h2>
            </div>
            <Link
              href="/school/apply"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#073832] hover:bg-emerald-900 text-white text-xs font-bold transition-colors"
            >
              <span>Apply For Any Programme</span>
              <ArrowRight className="w-4 h-4 text-emerald-300" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {additionalProgrammes.map((item) => (
              <div
                key={item.code}
                className="p-5 rounded-2xl border border-slate-200 bg-slate-50/60 hover:border-emerald-300 hover:bg-white transition-all flex flex-col justify-between gap-3"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                      {item.category}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-500">{item.duration}</span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900">{item.name}</h3>
                  <div className="flex flex-wrap gap-1 pt-1">
                    {(item.careers || []).map((c: string, i: number) => (
                      <span
                        key={i}
                        className="text-[10px] bg-white border border-slate-200 text-slate-600 px-2 py-0.5 rounded-full"
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
                <Link
                  href="/school/apply"
                  className="text-xs font-bold text-emerald-800 hover:text-emerald-950 inline-flex items-center gap-1 pt-2"
                >
                  <span>Inquire &amp; Apply</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ))}
          </div>
        </section>

        {/* Graduation Requirements */}
        <section className="bg-[#073832] text-white rounded-3xl p-6 sm:p-8 shadow-lg">
          <div className="flex items-start gap-3 mb-4">
            <GraduationCap className="w-7 h-7 text-emerald-300 shrink-0 mt-0.5" />
            <div>
              <h2 className="text-xl sm:text-2xl font-extrabold">
                Graduation &amp; Certification Requirements
              </h2>
              <p className="text-xs sm:text-sm text-emerald-100/80 mt-0.5">
                Receiving your official Diploma or Certificate upon successful completion.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
            {graduationRequirements.map((req, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2.5 bg-white/10 border border-white/15 rounded-xl p-3.5 text-xs sm:text-sm text-emerald-50"
              >
                <CheckCircle className="w-4 h-4 text-emerald-300 shrink-0 mt-0.5" />
                <span>{req}</span>
              </div>
            ))}
          </div>
        </section>
      </main>

      <SchoolFooter />
    </div>
  );
}
