import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  Award,
  BookOpen,
  Briefcase,
  Calendar,
  CheckCircle,
  Clock,
  GraduationCap,
  MapPin,
  Sparkles,
} from 'lucide-react';
import SchoolNavbar from '@/components/SchoolNavbar';
import SchoolFooter from '@/components/SchoolFooter';
import {
  BROCHURE_PROGRAMMES,
  GRADUATION_REQUIREMENTS,
} from '@/lib/school-programs-catalog';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function SchoolProgrammeDetailPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const upperCode = code.toUpperCase();
  const brochure = BROCHURE_PROGRAMMES.find((p) => p.code.toUpperCase() === upperCode);

  if (!brochure) {
    notFound();
  }

  let dbCourses: Array<{
    id: string;
    code: string;
    title: string;
    description: string;
    creditHours: number;
  }> = [];

  let dbFee = brochure.fee;
  let dbDuration = brochure.duration;
  let dbRequirements = brochure.requirements;
  let dbDescription = brochure.description;
  let dbName = brochure.name;

  try {
    const dbProg = await prisma.programme.findFirst({
      where: { code: upperCode },
      include: {
        courses: {
          where: { status: 'ACTIVE' },
          orderBy: { code: 'asc' },
          select: {
            id: true,
            code: true,
            title: true,
            description: true,
            creditHours: true,
          },
        },
      },
    });
    if (dbProg) {
      dbName = dbProg.name || dbName;
      dbFee = dbProg.fee || dbFee;
      dbDuration = dbProg.duration || dbDuration;
      dbRequirements = dbProg.requirements || dbRequirements;
      dbDescription = dbProg.description || dbDescription;
      dbCourses = dbProg.courses || [];
    }
  } catch {
    // Fallback gracefully to brochure catalog if DB is unavailable
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#f8faf9]">
      <SchoolNavbar />

      {/* Hero Section */}
      <section className="bg-[#073832] text-white py-14 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto space-y-5">
          <Link
            href="/school/programs"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-300 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to All Academic Programmes</span>
          </Link>

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
            <div className="space-y-3 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider bg-emerald-400/20 text-emerald-200 px-3 py-1 rounded-full border border-emerald-400/30">
                  {brochure.code} · {brochure.qualification}
                </span>
                <span className="inline-flex items-center gap-1 text-xs font-semibold bg-white/10 text-white px-3 py-1 rounded-full">
                  <Clock className="w-3.5 h-3.5 text-emerald-300" />
                  {dbDuration}
                </span>
                <span className="inline-flex items-center gap-1 text-xs font-semibold bg-amber-400/20 text-amber-200 px-3 py-1 rounded-full border border-amber-400/30">
                  <Sparkles className="w-3.5 h-3.5" />
                  50% Scholarship Consideration
                </span>
              </div>

              <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
                {dbName}
              </h1>
              <p className="text-sm sm:text-base text-emerald-100/85 max-w-3xl leading-relaxed">
                {dbDescription}
              </p>
            </div>

            {/* Pricing Card */}
            <div className="lg:w-80 shrink-0 bg-white text-slate-900 rounded-2xl p-6 shadow-xl space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                Tuition &amp; Payment Plan
              </div>
              <div className="text-3xl font-black text-[#073832]">
                GH₵{Number(dbFee).toLocaleString()}.00
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                {brochure.installmentNote}
              </p>
              <p className="text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
                {brochure.scholarshipNote}
              </p>
              <Link
                href={`/school/apply?program=${brochure.code}`}
                className="w-full py-3 px-4 bg-[#073832] hover:bg-emerald-900 text-white text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-2 mt-2"
              >
                <span>Apply &amp; Enroll Now</span>
                <ArrowRight className="w-4 h-4 text-emerald-300" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10 w-full">
        {/* Key Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-emerald-700" />
              Class Schedules
            </h2>
            <ul className="space-y-2 text-xs text-slate-700">
              {brochure.schedules.map((s, idx) => (
                <li key={idx} className="flex justify-between gap-2 border-b border-slate-100 pb-1.5 last:border-0 last:pb-0">
                  <span className="font-semibold text-slate-900">{s.label}</span>
                  <span className="text-slate-600 text-right">{s.timing}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Award className="w-4 h-4 text-emerald-700" />
              Entry Requirements &amp; Venue
            </h2>
            <p className="text-xs text-slate-600 leading-relaxed">{dbRequirements}</p>
            <div className="pt-1 flex items-start gap-1.5 text-xs font-semibold text-emerald-800">
              <MapPin className="w-4 h-4 shrink-0 mt-0.5 text-emerald-700" />
              <span>{brochure.venue}</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Briefcase className="w-4 h-4 text-emerald-700" />
              Career Opportunities
            </h2>
            <div className="flex flex-wrap gap-1.5">
              {brochure.careerOpportunities.map((career, idx) => (
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

        {/* Full Course Outline */}
        <section className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
          <div>
            <h2 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-emerald-700" />
              Complete Course Outline &amp; Modules
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Detailed modular syllabus and learning topics covered in {dbName}.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {brochure.courseOutline.map((mod, idx) => (
              <div
                key={idx}
                className="p-5 rounded-2xl border border-slate-200 bg-slate-50/70 hover:border-emerald-300 hover:bg-white transition-all space-y-2.5"
              >
                <span className="inline-block text-[10px] font-extrabold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                  {mod.code}
                </span>
                <h3 className="text-sm font-bold text-slate-900 leading-snug">{mod.title}</h3>
                <p className="text-xs text-slate-600 leading-relaxed">{mod.description}</p>
                <ul className="space-y-1 pt-1">
                  {mod.topics.map((t, tIdx) => (
                    <li key={tIdx} className="text-[11px] text-slate-700 flex items-start gap-1.5">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{t}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {dbCourses.length > 0 && (
            <div className="pt-5 border-t border-slate-100 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Semester Course Units ({dbCourses.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {dbCourses.map((c) => (
                  <div key={c.id} className="p-4 rounded-xl border border-emerald-100 bg-emerald-50/40 space-y-1">
                    <div className="flex items-center justify-between text-xs font-bold text-emerald-900">
                      <span>{c.code}</span>
                      <span>{c.creditHours} Credit Hours</span>
                    </div>
                    <div className="text-xs font-semibold text-slate-800">{c.title}</div>
                    <p className="text-[11px] text-slate-600">{c.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Graduation Requirements */}
        <section className="bg-[#073832] text-white rounded-3xl p-6 sm:p-8 shadow-md space-y-4">
          <div className="flex items-center gap-2.5">
            <GraduationCap className="w-6 h-6 text-emerald-300" />
            <h2 className="text-xl font-extrabold">Graduation &amp; Certification Requirements</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {GRADUATION_REQUIREMENTS.map((req, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2.5 bg-white/10 border border-white/15 rounded-xl p-3.5 text-xs text-emerald-50"
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
