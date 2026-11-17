'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  GraduationCap,
  BookOpen,
  Award,
  CheckCircle,
  Stethoscope,
  PlusCircle,
  Heart,
  ChevronRight,
  ChevronDown,
  Building2,
  Microscope,
  Laptop,
  Home,
  CreditCard,
  Quote,
  Sparkles,
  FileCheck,
} from 'lucide-react';
import SchoolNavbar from '@/components/SchoolNavbar';
import SchoolFooter from '@/components/SchoolFooter';
import {
  FadeUp,
  StaggerGrid,
  StaggerItem,
  ScaleIn,
  AnimatedCounter,
} from '@/components/MotionPrimitives';

const FACILITIES = [
  {
    icon: Microscope,
    title: 'High-Fidelity OSCE Skills Lab',
    desc: 'Practice venepuncture, catheterization, CPR, and maternity delivery on anatomical simulation manikins before entering live hospital wards.',
  },
  {
    icon: Laptop,
    title: '24/7 E-Library & CBT Center',
    desc: 'Access clinical journals, online lecture recordings, and Nursing & Midwifery Council (N&MC) mock computer-based testing.',
  },
  {
    icon: Building2,
    title: 'Teaching Hospital Rotations',
    desc: 'Structured supervised placements inside Action Boat Medical Centre / Homeopathy, Greater Accra Regional Hospital (Ridge), and partner specialist clinics.',
  },
  {
    icon: Home,
    title: 'Safe Ridge Student Hostels',
    desc: 'Optional furnished campus accommodation in Ridge, Accra with 24-hour security, high-speed Wi-Fi, and study lounges.',
  },
];

const ADMISSION_STEPS = [
  {
    step: '01',
    title: 'Submit Online Application',
    desc: 'Complete the digital form and pay the GH₵150.00 application fee securely via Paystack (MTN MoMo, Telecel Cash, or Card).',
  },
  {
    step: '02',
    title: 'WASSCE & Document Review',
    desc: 'Upload your WASSCE/SSSCE certificates, birth certificate, and passport photograph for verification by our Admissions Board.',
  },
  {
    step: '03',
    title: 'CBT Screening & Interview',
    desc: 'Shortlisted applicants sit a brief general science & aptitude screening followed by a panel interview with nursing faculty.',
  },
  {
    step: '04',
    title: 'Admission Letter & Enrollment',
    desc: 'Receive your official Student ID, register courses online, pay semester fees in GHS, and begin clinical orientation.',
  },
];

const ALUMNI = [
  {
    name: 'Akosua Boateng, RN',
    cohort: 'Class of 2023 · Advanced Nursing Diploma',
    placement: 'Critical Care Nurse, Korle Bu Teaching Hospital',
    quote:
      'My daily ward rotations at Action Boat Medical Centre / Homeopathy made the transition to Korle Bu ICU effortless. Our preceptors drilled clinical precision into us from week one.',
  },
  {
    name: 'Kwaku Mensah-Tetteh, EN',
    cohort: 'Class of 2024 · Basic Nursing Certificate',
    placement: 'Staff Nurse, 37 Military Hospital, Accra',
    quote:
      'The online Student Portal, lecture notes, and CBT practice exams helped me pass my Council licensure examination on the very first attempt.',
  },
  {
    name: 'Abena Pokuaa, RN',
    cohort: 'Class of 2022 · Specialized Care Training',
    placement: 'Neonatal Ward Preceptor, Greater Accra Regional Hospital',
    quote:
      'Specializing in neonatal care at Action Health gave me hands-on confidence with incubators and triage protocols that employers immediately value.',
  },
];

const SCHOOL_FAQS = [
  {
    q: 'What are the WASSCE / SSSCE entry requirements for admission?',
    a: 'Applicants for the Advanced Nursing Diploma require passes (A1–C6) in Core English, Core Mathematics, Integrated Science, and three relevant electives. Basic Nursing Certificate applicants require passes in English, Mathematics, and Science or mature applicant assessment.',
  },
  {
    q: 'Can I pay my school fees in installments?',
    a: 'Yes. Action Health College supports a 60% initial semester commitment before matriculation and 40% balance before mid-semester examinations, payable seamlessly in GHS through your Student Portal via Paystack Ghana.',
  },
  {
    q: 'Are clinical uniforms and nursing kits provided?',
    a: 'Yes. Newly enrolled students are issued two tailored Action Health clinical uniforms, a stethoscope, sphygmomanometer, fob watch, and clinical logbook during Matriculation Week.',
  },
  {
    q: 'How do I track my application status after applying?',
    a: 'Once you submit your application, you receive a unique Tracking Code (e.g., WNS-2026-XXXX). Use the Track Application page anytime to view real-time updates from Admissions.',
  },
];

export default function SchoolHomePage() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <div className="min-h-screen flex flex-col bg-[#f8faf9] overflow-x-hidden">
      {/* Top Navbar */}
      <SchoolNavbar />

      {/* HERO SECTION - Strictly matching mockup top-right & mobile views */}
      <section className="relative bg-[#073832] text-white overflow-hidden pt-8 pb-16 lg:pt-14 lg:pb-24">
        <div className="absolute inset-0 bg-radial-gradient pointer-events-none opacity-40" />
        <motion.div
          animate={{ scale: [1, 1.08, 1], opacity: [0.12, 0.24, 0.12] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -right-32 -bottom-40 w-96 h-96 rounded-full bg-emerald-500/20 blur-3xl pointer-events-none"
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            {/* Left Content Column */}
            <div className="lg:col-span-7 space-y-6 text-left">
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="inline-block"
              >
                <span className="text-[12px] sm:text-[13px] font-bold tracking-[0.2em] text-emerald-300 uppercase">
                  LEARN · PRACTICE · EXCEL
                </span>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.08 }}
                className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.1]"
              >
                Build a Career <br />
                <span className="text-emerald-100">in Nursing</span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.16 }}
                className="text-base sm:text-lg text-emerald-100/80 max-w-xl font-normal leading-relaxed"
              >
                World-class nursing education in Accra, Ghana designed to equip you with clinical mastery for a better tomorrow.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.24 }}
                className="pt-2 flex flex-wrap items-center gap-4"
              >
                <Link
                  href="#programs"
                  className="inline-flex items-center gap-2 bg-[#34d399] hover:bg-[#2bc489] text-[#073832] text-sm sm:text-base font-bold px-7 py-3.5 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 active:scale-95 group"
                >
                  <span>Explore Courses</span>
                  <ArrowRight className="w-4 h-4 text-[#073832] group-hover:translate-x-1 transition-transform" />
                </Link>

                <Link
                  href="/school/apply"
                  className="inline-flex items-center gap-2 bg-transparent hover:bg-white/10 text-white text-sm sm:text-base font-semibold px-6 py-3.5 rounded-full border border-emerald-400/30 transition-all duration-200"
                >
                  <span>Apply for Admission</span>
                </Link>
              </motion.div>
            </div>

            {/* Right Hero Image Column - Nursing Student in Blue Scrubs */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
              className="lg:col-span-5 relative mt-4 lg:mt-0 flex justify-center"
            >
              <div className="relative w-full max-w-md lg:max-w-none">
                <div className="relative rounded-3xl overflow-hidden shadow-2xl border-4 border-emerald-900/50 aspect-[4/4.5] sm:aspect-[4/4.2]">
                  <Image
                    src="https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&auto=format&fit=crop&q=85"
                    alt="Action Health College Student"
                    fill
                    className="object-cover object-top"
                    priority
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#073832]/80 via-transparent to-transparent opacity-60" />
                </div>

                {/* Floating Accreditation Pill */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0, y: [0, -6, 0] }}
                  transition={{
                    opacity: { duration: 0.6, delay: 0.35 },
                    x: { duration: 0.6, delay: 0.35 },
                    y: { duration: 4.5, repeat: Infinity, ease: 'easeInOut', delay: 0.6 },
                  }}
                  className="hidden sm:flex absolute bottom-4 -left-6 bg-white text-slate-900 p-4 rounded-2xl shadow-2xl border border-slate-100 items-center gap-3 z-20"
                >
                  <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                    <Award className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-extrabold text-[#073832]">2026 Admissions Open</div>
                    <div className="text-[11px] text-slate-500 font-medium">N&amp;MC Ghana Accredited</div>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* OUR PROGRAMS SECTION - Strictly matching mockup top-right & mobile */}
      <section id="programs" className="py-16 sm:py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <FadeUp className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 gap-4">
          <div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#073832] tracking-tight">
              Our Programs
            </h2>
            <p className="text-slate-600 text-sm sm:text-base mt-1.5 font-normal">
              Comprehensive courses tailored for aspiring and practicing nurses.
            </p>
          </div>
          <div>
            <Link
              href="/school/programs"
              className="inline-flex items-center gap-1.5 text-sm font-bold text-emerald-800 hover:text-emerald-950 transition-colors group"
            >
              <span>View All Courses</span>
              <ArrowRight className="w-4 h-4 text-emerald-700 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </FadeUp>

        <StaggerGrid className="grid grid-cols-1 md:grid-cols-3 gap-6" staggerDelay={0.1}>
          {/* Card 1: Diploma in Care Giving */}
          <StaggerItem>
            <div className="bg-white rounded-2xl p-7 border border-slate-200/90 shadow-md hover:shadow-xl hover:border-emerald-300 hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group h-full">
              <div>
                <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center mb-5 group-hover:scale-105 transition-transform">
                  <Heart className="w-6 h-6 text-emerald-700" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 group-hover:text-emerald-800 transition-colors">
                  Diploma in Care Giving
                </h3>
                <p className="text-xs text-slate-500 font-semibold mt-1">
                  3 Months / 6 Months / 1 Year · Regular, Weekends, Sandwich &amp; Online
                </p>
                <div className="mt-5 text-2xl font-black text-[#073832]">
                  GH₵4,000.00
                </div>
                <p className="text-xs text-emerald-700 font-semibold mt-0.5">
                  Initial Deposit: GH₵2,000 (Half Installment Plan)
                </p>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                  Comprehensive 11-module caregiving curriculum covering anatomy, pharmacology, ethics, ADLs, nutrition, mental health, and infection control at Action Boat Medical Centre.
                </p>
              </div>
              <div className="pt-6 mt-6 border-t border-slate-100">
                <Link
                  href="/school/apply?program=DCG"
                  className="inline-flex items-center gap-2 text-sm font-bold text-emerald-800 hover:text-emerald-950 group-hover:translate-x-1 transition-all"
                >
                  <span>Enroll Now</span>
                  <ArrowRight className="w-4 h-4 text-emerald-700" />
                </Link>
              </div>
            </div>
          </StaggerItem>

          {/* Card 2: Professional Diploma in Nursing Assistant Studies */}
          <StaggerItem>
            <div className="bg-white rounded-2xl p-7 border border-slate-200/90 shadow-md hover:shadow-xl hover:border-emerald-300 hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group h-full">
              <div>
                <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center mb-5 group-hover:scale-105 transition-transform">
                  <Stethoscope className="w-6 h-6 text-emerald-700" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 group-hover:text-emerald-800 transition-colors">
                  Nursing Assistant Studies
                </h3>
                <p className="text-xs text-slate-500 font-semibold mt-1">Duration: 1 Year · Regular &amp; Weekend</p>
                <div className="mt-5 text-2xl font-black text-[#073832]">
                  GH₵4,500.00
                </div>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                  Clinical support assistant training, vital signs monitoring, basic nursing procedures, and supervised ward rotations.
                </p>
              </div>
              <div className="pt-6 mt-6 border-t border-slate-100">
                <Link
                  href="/school/apply?program=NAS"
                  className="inline-flex items-center gap-2 text-sm font-bold text-emerald-800 hover:text-emerald-950 group-hover:translate-x-1 transition-all"
                >
                  <span>Enroll Now</span>
                  <ArrowRight className="w-4 h-4 text-emerald-700" />
                </Link>
              </div>
            </div>
          </StaggerItem>

          {/* Card 3: Public Health, First Aid & Basic Emergency Care */}
          <StaggerItem>
            <div className="bg-white rounded-2xl p-7 border border-slate-200/90 shadow-md hover:shadow-xl hover:border-emerald-300 hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group h-full">
              <div>
                <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center mb-5 group-hover:scale-105 transition-transform">
                  <PlusCircle className="w-6 h-6 text-emerald-700" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 group-hover:text-emerald-800 transition-colors">
                  First Aid &amp; Public Health
                </h3>
                <p className="text-xs text-slate-500 font-semibold mt-1">Duration: 3 – 6 Months · Flexible</p>
                <div className="mt-5 text-2xl font-black text-[#073832]">
                  GH₵2,500.00
                </div>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                  Hands-on emergency response, CPR, workplace first aid, and community health &amp; safety management.
                </p>
              </div>
              <div className="pt-6 mt-6 border-t border-slate-100">
                <Link
                  href="/school/apply?program=PHE"
                  className="inline-flex items-center gap-2 text-sm font-bold text-emerald-800 hover:text-emerald-950 group-hover:translate-x-1 transition-all"
                >
                  <span>Enroll Now</span>
                  <ArrowRight className="w-4 h-4 text-emerald-700" />
                </Link>
              </div>
            </div>
          </StaggerItem>
        </StaggerGrid>
      </section>

      {/* WHY STUDY AT WELLLIFE */}
      <section className="bg-white py-20 border-y border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <FadeUp className="space-y-6">
              <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider bg-emerald-50 px-3 py-1 rounded-full">
                Clinical Excellence
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-[#073832] tracking-tight">
                Direct Hospital Clinical Rotations Inside Action Boat Medical Centre / Homeopathy
              </h2>
              <p className="text-slate-600 leading-relaxed text-sm sm:text-base">
                Unlike theoretical academies, Action Health College students train directly alongside consultant doctors and senior registered nurses inside our busy hospital wards, diagnostic labs, and modern surgery suites in Ridge, Accra.
              </p>

              <div className="space-y-3.5 pt-2">
                <div className="flex items-center gap-3 text-slate-800 text-sm font-semibold">
                  <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>Interactive E-Learning Portal with continuous assessments &amp; online CBT exams</span>
                </div>
                <div className="flex items-center gap-3 text-slate-800 text-sm font-semibold">
                  <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>Hands-on skills laboratory with high-fidelity clinical simulation manikins</span>
                </div>
                <div className="flex items-center gap-3 text-slate-800 text-sm font-semibold">
                  <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>Licensed nurse preceptorship and guaranteed clinical internship placement</span>
                </div>
              </div>

              <div className="pt-4 flex flex-wrap items-center gap-4">
                <Link
                  href="/school/admissions"
                  className="bg-[#073832] text-white px-6 py-3 rounded-full text-sm font-bold hover:bg-emerald-900 transition-colors shadow-md"
                >
                  View Admission Criteria
                </Link>
                <Link
                  href="/auth/login"
                  className="text-emerald-800 hover:text-emerald-950 font-bold text-sm flex items-center gap-1"
                >
                  <span>Student Portal Login</span>
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </FadeUp>

            <StaggerGrid className="grid grid-cols-2 gap-4" staggerDelay={0.1}>
              <div className="space-y-4">
                <StaggerItem>
                  <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100 text-center">
                    <div className="text-3xl font-extrabold text-[#073832]">
                      <AnimatedCounter value={98} suffix="%" />
                    </div>
                    <div className="text-xs text-slate-600 mt-1 font-medium">N&amp;MC Licensure Pass Rate</div>
                  </div>
                </StaggerItem>
                <StaggerItem>
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm text-center">
                    <div className="text-3xl font-extrabold text-emerald-700">1:5</div>
                    <div className="text-xs text-slate-600 mt-1 font-medium">Preceptor to Student Ratio</div>
                  </div>
                </StaggerItem>
              </div>
              <div className="space-y-4 pt-6">
                <StaggerItem>
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm text-center">
                    <div className="text-3xl font-extrabold text-emerald-700">
                      <AnimatedCounter value={100} suffix="%" />
                    </div>
                    <div className="text-xs text-slate-600 mt-1 font-medium">Clinical Ward Placement</div>
                  </div>
                </StaggerItem>
                <StaggerItem>
                  <div className="bg-emerald-900 text-white p-6 rounded-2xl text-center">
                    <div className="text-3xl font-extrabold text-emerald-300">
                      <AnimatedCounter value={2400} suffix="+" />
                    </div>
                    <div className="text-xs text-emerald-100 mt-1 font-medium">Graduates Practicing Globally</div>
                  </div>
                </StaggerItem>
              </div>
            </StaggerGrid>
          </div>
        </div>
      </section>

      {/* CAMPUS FACILITIES & STUDENT LIFE */}
      <section className="py-20 bg-[#f8faf9]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeUp className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-700 bg-emerald-100/70 px-3 py-1 rounded-full">
              Ridge Campus, Accra
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#073832] tracking-tight mt-3">
              Campus Facilities &amp; Simulation Labs
            </h2>
            <p className="text-slate-600 text-sm sm:text-base mt-2">
              Every resource you need to master clinical theory, pass Council examinations, and thrive in student life.
            </p>
          </FadeUp>

          <StaggerGrid className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6" staggerDelay={0.08}>
            {FACILITIES.map((item) => {
              const Icon = item.icon;
              return (
                <StaggerItem key={item.title}>
                  <div className="bg-white rounded-2xl p-6 border border-slate-200/80 hover:border-emerald-300 hover:shadow-lg transition-all h-full">
                    <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-4">
                      <Icon className="w-6 h-6" />
                    </div>
                    <h3 className="text-base font-extrabold text-slate-900">{item.title}</h3>
                    <p className="text-xs text-slate-600 mt-2 leading-relaxed">{item.desc}</p>
                  </div>
                </StaggerItem>
              );
            })}
          </StaggerGrid>
        </div>
      </section>

      {/* STEP-BY-STEP ADMISSIONS ROADMAP */}
      <section className="py-20 bg-[#073832] text-white relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <FadeUp className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
            <div className="max-w-2xl">
              <span className="text-xs font-bold uppercase tracking-widest text-emerald-300 bg-emerald-400/15 px-3 py-1 rounded-full border border-emerald-400/30">
                2026 Intake Open
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mt-3">
                4-Step Admissions Roadmap
              </h2>
              <p className="text-emerald-100/80 text-sm sm:text-base mt-2">
                Transparent digital admissions from online application to matriculation in Accra.
              </p>
            </div>
            <Link
              href="/school/track"
              className="inline-flex items-center gap-2 text-sm font-bold text-emerald-300 hover:text-white transition-colors"
            >
              <span>Track Existing Application</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </FadeUp>

          <StaggerGrid className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6" staggerDelay={0.09}>
            {ADMISSION_STEPS.map((s) => (
              <StaggerItem key={s.step}>
                <div className="bg-white/10 backdrop-blur-sm border border-emerald-400/20 rounded-2xl p-6 h-full hover:bg-white/15 transition-colors">
                  <div className="text-2xl font-black text-emerald-300 mb-3">{s.step}</div>
                  <h3 className="text-base font-bold text-white">{s.title}</h3>
                  <p className="text-xs text-emerald-100/75 mt-2 leading-relaxed">{s.desc}</p>
                </div>
              </StaggerItem>
            ))}
          </StaggerGrid>

          {/* Tuition & Paystack Ghana Flex Banner */}
          <FadeUp delay={0.15} className="mt-10 bg-emerald-950/60 border border-emerald-400/25 rounded-2xl p-6 sm:p-8 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-400/20 text-emerald-300 flex items-center justify-center shrink-0">
                <CreditCard className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-base sm:text-lg font-bold text-white">
                  Flexible Ghana Cedi (GHS) Fee Plans via Paystack Ghana
                </h4>
                <p className="text-xs sm:text-sm text-emerald-100/80 mt-1">
                  Pay application and tuition invoices instantaneously using MTN Mobile Money, Telecel Cash, AT Money, or Bank Card with instant official PDF receipts.
                </p>
              </div>
            </div>
            <Link
              href="/school/apply"
              className="shrink-0 inline-flex items-center gap-2 bg-[#34d399] hover:bg-[#2bc489] text-[#073832] font-bold text-sm px-6 py-3 rounded-full shadow-lg transition-all active:scale-95"
            >
              <span>Start Application (GH₵150)</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </FadeUp>
        </div>
      </section>

      {/* ALUMNI SUCCESS STORIES */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeUp className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full">
              Graduate Impact
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#073832] tracking-tight mt-3">
              Where Action Health Graduates Practice
            </h2>
          </FadeUp>

          <StaggerGrid className="grid grid-cols-1 md:grid-cols-3 gap-6" staggerDelay={0.1}>
            {ALUMNI.map((alum) => (
              <StaggerItem key={alum.name}>
                <div className="bg-[#f8faf9] rounded-2xl p-7 border border-slate-200/80 h-full flex flex-col justify-between">
                  <div>
                    <Quote className="w-7 h-7 text-emerald-600/40 mb-3" />
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                      &ldquo;{alum.quote}&rdquo;
                    </p>
                  </div>
                  <div className="pt-5 mt-5 border-t border-slate-200/70">
                    <div className="font-extrabold text-sm text-slate-900">{alum.name}</div>
                    <div className="text-[11px] font-bold text-emerald-700 mt-0.5">{alum.placement}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">{alum.cohort}</div>
                  </div>
                </div>
              </StaggerItem>
            ))}
          </StaggerGrid>
        </div>
      </section>

      {/* ADMISSIONS FAQ ACCORDION */}
      <section className="py-20 bg-[#f8faf9] border-t border-slate-200/70">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeUp className="text-center mb-10">
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-700 bg-emerald-100/70 px-3 py-1 rounded-full">
              Prospective Students
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#073832] tracking-tight mt-3">
              Admissions &amp; Programme FAQs
            </h2>
          </FadeUp>

          <div className="space-y-3">
            {SCHOOL_FAQS.map((item, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={item.q}
                  className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-sm"
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full px-6 py-5 text-left flex items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors"
                  >
                    <span className="font-bold text-sm sm:text-base text-slate-900">{item.q}</span>
                    <ChevronDown
                      className={`w-5 h-5 text-emerald-700 shrink-0 transition-transform duration-300 ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="overflow-hidden"
                      >
                        <div className="px-6 pb-5 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
                          {item.a}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* FINAL ADMISSIONS CTA BANNER */}
      <section className="py-16 bg-white border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <ScaleIn>
            <div className="bg-gradient-to-r from-[#073832] to-[#0c4e45] rounded-3xl p-8 sm:p-12 text-white flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8 shadow-2xl">
              <div className="max-w-2xl space-y-3">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-400/20 text-emerald-300 border border-emerald-400/30">
                  <GraduationCap className="w-4 h-4" /> Academic Year 2025/2026
                </span>
                <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
                  Ready to Begin Your Nursing Career in Accra?
                </h2>
                <p className="text-emerald-100/80 text-sm sm:text-base">
                  Applications are reviewed on a rolling basis. Submit your form online or visit our Ridge Admissions Office Monday–Friday.
                </p>
              </div>
              <div className="flex flex-wrap gap-4 shrink-0">
                <Link
                  href="/school/apply"
                  className="inline-flex items-center gap-2 bg-[#34d399] hover:bg-[#2bc489] text-[#073832] font-bold text-sm px-7 py-3.5 rounded-full shadow-lg transition-all active:scale-95"
                >
                  <span>Apply Online Now</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/school/contact"
                  className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white font-semibold text-sm px-6 py-3.5 rounded-full border border-white/20 transition-all"
                >
                  <span>Contact Admissions</span>
                </Link>
              </div>
            </div>
          </ScaleIn>
        </div>
      </section>

      {/* Footer */}
      <SchoolFooter />
    </div>
  );
}
