'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  Clock,
  MapPin,
  Phone,
  Mail,
  Stethoscope,
  Activity,
  Pill,
  HeartPulse,
  CheckCircle2,
  Award,
  Sparkles,
  ShieldCheck,
  Microscope,
  Baby,
  Bone,
  HeartHandshake,
  ChevronDown,
  Star,
  CalendarCheck,
  FileText,
  Ambulance,
  Building2,
} from 'lucide-react';
import ClinicNavbar from '@/components/ClinicNavbar';
import ClinicFooter from '@/components/ClinicFooter';
import AppointmentModal from '@/components/AppointmentModal';
import {
  FadeUp,
  StaggerGrid,
  StaggerItem,
  ScaleIn,
  AnimatedCounter,
} from '@/components/MotionPrimitives';

const DEPARTMENTS = [
  {
    icon: HeartPulse,
    title: 'Internal Medicine & Cardiology',
    desc: 'Comprehensive hypertension management, ECG, echocardiography, diabetes clinics, and chronic care tailored to Ghanaian adults.',
    badge: 'Specialist Care',
    href: '/clinic/departments',
  },
  {
    icon: Baby,
    title: 'Obstetrics & Maternal Health',
    desc: 'Antenatal clinics, 4D obstetric ultrasound, painless delivery suites, and postnatal family support led by senior consultants.',
    badge: '24/7 Maternity',
    href: '/clinic/departments',
  },
  {
    icon: Stethoscope,
    title: 'Paediatrics & Child Health',
    desc: 'Well-baby checkups, Ghana Health Service immunization schedules, neonatal care, and adolescent medicine.',
    badge: 'Child Friendly',
    href: '/clinic/departments',
  },
  {
    icon: Bone,
    title: 'Orthopaedics & Trauma Care',
    desc: 'Fracture management, sports injury rehabilitation, joint care, and minimally invasive orthopaedic procedures.',
    badge: 'Surgical Suite',
    href: '/clinic/departments',
  },
  {
    icon: Microscope,
    title: 'Digital Radiology & Diagnostics',
    desc: 'Same-day automated clinical chemistry, haematology, digital X-ray, ultrasound, and histopathology reporting.',
    badge: 'Rapid Results',
    href: '/clinic/services#diagnostics',
  },
  {
    icon: Pill,
    title: '24/7 In-House Pharmacy',
    desc: 'FDA-Ghana certified medications, clinical pharmacist counselling, chronic refill reminders, and home delivery across Accra.',
    badge: 'Always Open',
    href: '/clinic/services#pharmacy',
  },
];

const CONSULTANTS = [
  {
    name: 'Dr. Kwame Mensah',
    role: 'Medical Director & Consultant Cardiologist',
    credentials: 'MBChB (UGMS Korle Bu), FWACP',
    experience: '16+ Years Clinical Experience',
    image: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=600&auto=format&fit=crop&q=80',
  },
  {
    name: 'Dr. Abena Osei',
    role: 'Head of Obstetrics & Gynaecology',
    credentials: 'MBChB (KNUST), FGCS, FWACS',
    experience: '14+ Years Maternal & Fetal Care',
    image: 'https://images.unsplash.com/photo-1594824476967-48c8b964273f?w=600&auto=format&fit=crop&q=80',
  },
  {
    name: 'Dr. Kwabena Frimpong',
    role: 'Senior Consultant Paediatrician',
    credentials: 'MBChB (UGMS), MGCP, MPH',
    experience: '12+ Years Neonatal & Child Health',
    image: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=600&auto=format&fit=crop&q=80',
  },
];

const TESTIMONIALS = [
  {
    quote:
      'I booked my cardiology review online and was seen within ten minutes of arriving at Ridge. The digital lab results were ready before I left the building.',
    author: 'Nana Yaw Boateng',
    location: 'Cantonments, Accra',
    service: 'Cardiology Clinic',
  },
  {
    quote:
      'From antenatal visits to delivery, Dr. Abena Osei and the Action Health nursing team treated our family with warmth, dignity, and remarkable clinical precision.',
    author: 'Efua Mensah-Bonsu',
    location: 'East Legon, Accra',
    service: 'Maternity & Delivery',
  },
  {
    quote:
      'Their 24-hour emergency unit handled my son’s high fever swiftly at 2:00 AM. Having the pharmacy and lab right on site makes all the difference.',
    author: 'Kojo Appiah-Kubi',
    location: 'Osu, Accra',
    service: 'Paediatric Emergency',
  },
];

const HEALTH_ARTICLES = [
  {
    category: 'Cardiovascular Health',
    readTime: '4 min read',
    title: 'Managing Blood Pressure & Salt Intake in Everyday Ghanaian Meals',
    excerpt:
      'Practical clinical nutrition tips from our Ridge dietitians on balancing traditional soups, smoked fish, and heart-healthy potassium sources.',
    image: 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=600&auto=format&fit=crop&q=80',
  },
  {
    category: 'Maternal Wellness',
    readTime: '5 min read',
    title: 'First-Trimester Antenatal Checklist for Expectant Mothers in Accra',
    excerpt:
      'Essential screening tests, folic acid supplementation, and ultrasound milestones every expectant mother should schedule early.',
    image: 'https://images.unsplash.com/photo-1584515933487-779824d29309?w=600&auto=format&fit=crop&q=80',
  },
  {
    category: 'Preventive Screening',
    readTime: '3 min read',
    title: 'Why Annual Executive Health Screenings Catch Silent Risks Early',
    excerpt:
      'Discover what is included in a comprehensive blood panel, lipid profile, liver function check, and ECG screening at Action Health.',
    image: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=600&auto=format&fit=crop&q=80',
  },
];

const FAQS = [
  {
    q: 'Do you accept NHIS and private health insurance in Ghana?',
    a: 'Yes. Action Boat Medical Centre / Homeopathy accepts active NHIS cards for accredited outpatient services as well as major private health insurers in Ghana including GLICO Health, Acacia Health Insurance, Premier Health, Nationwide Medical Insurance, and international corporate policies.',
  },
  {
    q: 'How fast can I get my laboratory and diagnostic imaging results?',
    a: 'Routine haematology, malaria, urinalysis, and chemistry panels are processed in 45–90 minutes inside our automated Ridge laboratory. Digital X-rays and ultrasound reports are delivered to your attending physician the same day.',
  },
  {
    q: 'Is the Emergency & Trauma unit open 24 hours a day?',
    a: 'Yes. While routine outpatient specialist clinics run Monday–Friday (8:00 AM – 8:00 PM) and Saturday (9:00 AM – 5:00 PM), our Emergency & Triage Unit, Maternity Suite, and In-House Pharmacy operate 24/7 including public holidays.',
  },
  {
    q: 'Can I book an appointment for a family member or elderly parent?',
    a: 'Yes. Click "Book Appointment" anywhere on this page to reserve a time slot for yourself or a dependent. You will receive instant confirmation and SMS/email reminders.',
  },
];

export default function ClinicHomePage() {
  const [appointmentModalOpen, setAppointmentModalOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <div className="min-h-screen flex flex-col bg-[#f8faf9] overflow-x-hidden">
      {/* Top Navbar */}
      <ClinicNavbar onOpenAppointment={() => setAppointmentModalOpen(true)} />

      {/* HERO SECTION - Strictly matching the mockup top-left & mobile views */}
      <section className="relative bg-[#073832] text-white overflow-hidden pt-8 pb-20 lg:pt-14 lg:pb-28">
        <div className="absolute inset-0 bg-radial-gradient pointer-events-none opacity-40" />
        <motion.div
          animate={{ scale: [1, 1.08, 1], opacity: [0.15, 0.25, 0.15] }}
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
                <span className="text-[12px] sm:text-[13px] font-bold tracking-[0.18em] text-emerald-300 uppercase">
                  COMPASSIONATE CARE. BETTER HEALTH.
                </span>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.08 }}
                className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.1]"
              >
                Your Health, <br />
                <span className="text-emerald-100">Our Priority</span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.16 }}
                className="text-base sm:text-lg text-emerald-100/80 max-w-xl font-normal leading-relaxed"
              >
                Quality healthcare services for you and your family, all under one roof in Ridge, Accra.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.24 }}
                className="pt-2 flex flex-wrap items-center gap-4"
              >
                <button
                  onClick={() => setAppointmentModalOpen(true)}
                  className="inline-flex items-center gap-2 bg-white hover:bg-emerald-50 text-[#073832] text-sm sm:text-base font-bold px-7 py-3.5 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 active:scale-95 group"
                >
                  <span>Book Appointment</span>
                  <ArrowRight className="w-4 h-4 text-[#073832] group-hover:translate-x-1 transition-transform" />
                </button>

                <Link
                  href="/clinic/about"
                  className="inline-flex items-center gap-2 bg-transparent hover:bg-white/10 text-white text-sm sm:text-base font-semibold px-6 py-3.5 rounded-full border border-emerald-400/30 transition-all duration-200"
                >
                  <span>Learn More</span>
                </Link>
              </motion.div>
            </div>

            {/* Right Hero Image Column with Floating Opening Hours Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
              className="lg:col-span-5 relative mt-4 lg:mt-0 flex justify-center"
            >
              <div className="relative w-full max-w-md lg:max-w-none">
                <div className="relative rounded-3xl overflow-hidden shadow-2xl border-4 border-emerald-900/50 aspect-[4/4.5] sm:aspect-[4/4.2]">
                  <Image
                    src="https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=800&auto=format&fit=crop&q=85"
                    alt="Action Boat Medical Centre / Homeopathy Physician"
                    fill
                    className="object-cover object-top"
                    priority
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#073832]/80 via-transparent to-transparent opacity-60" />
                </div>

                {/* Floating Opening Hours Card with subtle float motion */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0, y: [0, -6, 0] }}
                  transition={{
                    opacity: { duration: 0.6, delay: 0.35 },
                    x: { duration: 0.6, delay: 0.35 },
                    y: { duration: 4.5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 },
                  }}
                  className="absolute -bottom-6 sm:bottom-4 -left-4 sm:-left-8 bg-white text-slate-800 p-4 sm:p-5 rounded-2xl shadow-2xl border border-slate-100 flex items-center gap-3.5 z-20 backdrop-blur-sm max-w-[280px]"
                >
                  <div className="w-11 h-11 rounded-full bg-emerald-50 text-emerald-800 flex items-center justify-center shrink-0 border border-emerald-100">
                    <Clock className="w-6 h-6 text-emerald-700" />
                  </div>
                  <div className="text-left">
                    <h4 className="text-xs sm:text-sm font-extrabold text-[#073832]">Opening Hours</h4>
                    <p className="text-[11px] sm:text-xs text-slate-600 font-medium leading-snug mt-0.5">
                      Mon - Fri: 8AM - 8PM<br />
                      Sat: 9AM - 5PM
                    </p>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* FLOATING SERVICES BAR - Strictly matching mockup */}
      <section className="relative z-20 -mt-10 sm:-mt-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <StaggerGrid className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" staggerDelay={0.07}>
          <StaggerItem>
            <Link
              href="/clinic/services"
              className="bg-white rounded-2xl p-6 shadow-xl border border-slate-100/80 hover:shadow-2xl hover:border-emerald-200 hover:-translate-y-1 transition-all duration-300 flex flex-col items-center text-center group cursor-pointer h-full"
            >
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <Stethoscope className="w-6 h-6 text-emerald-700" />
              </div>
              <h3 className="text-[15px] font-bold text-slate-900 group-hover:text-emerald-800 transition-colors">
                General Medicine &amp; Specialist Care
              </h3>
            </Link>
          </StaggerItem>

          <StaggerItem>
            <Link
              href="/clinic/services#diagnostics"
              className="bg-white rounded-2xl p-6 shadow-xl border border-slate-100/80 hover:shadow-2xl hover:border-emerald-200 hover:-translate-y-1 transition-all duration-300 flex flex-col items-center text-center group cursor-pointer h-full"
            >
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <Activity className="w-6 h-6 text-emerald-700" />
              </div>
              <h3 className="text-[15px] font-bold text-slate-900 group-hover:text-emerald-800 transition-colors">
                Advanced Diagnostics
              </h3>
            </Link>
          </StaggerItem>

          <StaggerItem>
            <Link
              href="/clinic/services#pharmacy"
              className="bg-white rounded-2xl p-6 shadow-xl border border-slate-100/80 hover:shadow-2xl hover:border-emerald-200 hover:-translate-y-1 transition-all duration-300 flex flex-col items-center text-center group cursor-pointer h-full"
            >
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <Pill className="w-6 h-6 text-emerald-700" />
              </div>
              <h3 className="text-[15px] font-bold text-slate-900 group-hover:text-emerald-800 transition-colors">
                Pharmacy Services
              </h3>
            </Link>
          </StaggerItem>

          <StaggerItem>
            <Link
              href="/clinic/services#wellness"
              className="bg-white rounded-2xl p-6 shadow-xl border border-slate-100/80 hover:shadow-2xl hover:border-emerald-200 hover:-translate-y-1 transition-all duration-300 flex flex-col items-center text-center group cursor-pointer h-full"
            >
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <HeartPulse className="w-6 h-6 text-emerald-700" />
              </div>
              <h3 className="text-[15px] font-bold text-slate-900 group-hover:text-emerald-800 transition-colors">
                Wellness &amp; Preventive Care
              </h3>
            </Link>
          </StaggerItem>
        </StaggerGrid>
      </section>

      {/* ABOUT WELLLIFE MEDICAL CENTER SECTION - Strictly matching mockup */}
      <section className="py-20 lg:py-24 bg-[#f8faf9]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            <ScaleIn className="lg:col-span-4">
              <div className="relative rounded-2xl overflow-hidden shadow-lg border border-slate-200 aspect-[4/3] group">
                <Image
                  src="https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=800&auto=format&fit=crop&q=80"
                  alt="Action Health Modern Clinic Interior"
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-700"
                />
              </div>
            </ScaleIn>

            <FadeUp delay={0.1} className="lg:col-span-5 space-y-5 text-left">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#073832] tracking-tight">
                About Action Boat Medical Centre / Homeopathy
              </h2>
              <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
                We are committed to providing accessible, high-quality healthcare with a focus on your well-being. Equipped with modern diagnostic suites, electronic medical records, and Ghana’s top medical specialists, Action Health delivers compassionate care in the heart of Ridge, Accra.
              </p>
              <div>
                <Link
                  href="/clinic/services"
                  className="inline-flex items-center gap-2 bg-[#073832] hover:bg-[#0b4e46] text-white text-sm font-semibold px-6 py-3 rounded-full shadow-md hover:shadow-lg transition-all active:scale-95 group"
                >
                  <span>Our Services</span>
                  <ArrowRight className="w-4 h-4 text-emerald-300 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </FadeUp>

            <FadeUp delay={0.2} className="lg:col-span-3 space-y-3.5">
              <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-sm flex items-start gap-3.5 hover:border-emerald-300 transition-colors">
                <div className="w-9 h-9 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">Our Location</div>
                  <div className="text-xs text-slate-500 mt-0.5">Tema Michel Camp (Gbetsile Pure Oil), Greater Accra, Ghana</div>
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-sm flex items-start gap-3.5 hover:border-emerald-300 transition-colors">
                <div className="w-9 h-9 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                  <Phone className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">Call Us</div>
                  <div className="text-xs text-slate-500 mt-0.5">+233 24 412 3456 / +233 30 212 3456</div>
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-sm flex items-start gap-3.5 hover:border-emerald-300 transition-colors">
                <div className="w-9 h-9 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">Email Us</div>
                  <div className="text-xs text-slate-500 mt-0.5">actiondoctor2019@gmail.com</div>
                </div>
              </div>
            </FadeUp>
          </div>
        </div>
      </section>

      {/* IMPACT & CLINICAL METRICS BAR */}
      <section className="bg-[#073832] py-14 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <StaggerGrid className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-center" staggerDelay={0.1}>
            <StaggerItem className="space-y-1">
              <div className="text-3xl sm:text-4xl font-black text-emerald-300">
                <AnimatedCounter value={18500} suffix="+" />
              </div>
              <div className="text-xs sm:text-sm font-medium text-emerald-100/80">Patients Served Across Ghana</div>
            </StaggerItem>
            <StaggerItem className="space-y-1">
              <div className="text-3xl sm:text-4xl font-black text-emerald-300">
                <AnimatedCounter value={28} suffix="+" />
              </div>
              <div className="text-xs sm:text-sm font-medium text-emerald-100/80">Board-Certified Specialists</div>
            </StaggerItem>
            <StaggerItem className="space-y-1">
              <div className="text-3xl sm:text-4xl font-black text-emerald-300">
                <AnimatedCounter value={99} suffix="%" />
              </div>
              <div className="text-xs sm:text-sm font-medium text-emerald-100/80">Patient Care Satisfaction</div>
            </StaggerItem>
            <StaggerItem className="space-y-1">
              <div className="text-3xl sm:text-4xl font-black text-emerald-300">24/7</div>
              <div className="text-xs sm:text-sm font-medium text-emerald-100/80">Emergency, Maternity &amp; Pharmacy</div>
            </StaggerItem>
          </StaggerGrid>
        </div>
      </section>

      {/* SPECIALIST DEPARTMENTS DIRECTORY */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeUp className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
            <div className="max-w-2xl">
              <span className="text-xs font-bold uppercase tracking-widest text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full">
                Comprehensive Care Units
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-[#073832] tracking-tight mt-3">
                Clinical Departments &amp; Specialist Units
              </h2>
              <p className="text-slate-600 text-sm sm:text-base mt-2">
                Integrated outpatient, diagnostic, surgical, and inpatient services designed for seamless family healthcare.
              </p>
            </div>
            <Link
              href="/clinic/departments"
              className="inline-flex items-center gap-1.5 text-sm font-bold text-emerald-800 hover:text-emerald-950 group shrink-0"
            >
              <span>Explore All Departments</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </FadeUp>

          <StaggerGrid className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" staggerDelay={0.07}>
            {DEPARTMENTS.map((dept) => {
              const Icon = dept.icon;
              return (
                <StaggerItem key={dept.title}>
                  <Link
                    href={dept.href}
                    className="block h-full bg-[#f8faf9] hover:bg-white rounded-2xl p-7 border border-slate-200/80 hover:border-emerald-300 hover:shadow-xl transition-all duration-300 group"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-12 h-12 rounded-xl bg-emerald-100/80 text-emerald-800 flex items-center justify-center group-hover:bg-[#073832] group-hover:text-white transition-colors">
                        <Icon className="w-6 h-6" />
                      </div>
                      <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-white text-emerald-800 border border-emerald-100">
                        {dept.badge}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 group-hover:text-[#073832] transition-colors">
                      {dept.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed">
                      {dept.desc}
                    </p>
                    <div className="mt-5 inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 group-hover:translate-x-1 transition-transform">
                      <span>View Unit Details</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                  </Link>
                </StaggerItem>
              );
            })}
          </StaggerGrid>
        </div>
      </section>

      {/* WHY CHOOSE WELLLIFE & PATIENT JOURNEY */}
      <section className="py-20 bg-[#f8faf9] border-y border-slate-200/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <FadeUp className="lg:col-span-6 space-y-6">
              <span className="text-xs font-bold uppercase tracking-widest text-emerald-700 bg-emerald-100/70 px-3 py-1 rounded-full">
                The Action Health Standard
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-[#073832] tracking-tight leading-tight">
                Modern Healthcare Built Around Respect, Speed, and Clinical Rigour
              </h2>
              <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
                We eliminate the long hospital queues and fragmented paperwork common in traditional clinics. Every patient visit at our Ridge facility follows a synchronized digital care pathway.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
                  <CalendarCheck className="w-6 h-6 text-emerald-700 mb-2.5" />
                  <h4 className="font-bold text-slate-900 text-sm">Zero-Queue Appointments</h4>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Reserve guaranteed consultation slots online and check in seamlessly.
                  </p>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
                  <ShieldCheck className="w-6 h-6 text-emerald-700 mb-2.5" />
                  <h4 className="font-bold text-slate-900 text-sm">NHIS &amp; Private Insurance</h4>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Accepted across NHIS, GLICO, Acacia, Premier, and corporate plans.
                  </p>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
                  <FileText className="w-6 h-6 text-emerald-700 mb-2.5" />
                  <h4 className="font-bold text-slate-900 text-sm">Integrated Digital EMR</h4>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Instant sync between your consultant, laboratory, and pharmacy.
                  </p>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
                  <Building2 className="w-6 h-6 text-emerald-700 mb-2.5" />
                  <h4 className="font-bold text-slate-900 text-sm">Accredited Teaching Hub</h4>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Clinical standards audited continuously with our nursing school faculty.
                  </p>
                </div>
              </div>
            </FadeUp>

            <FadeUp delay={0.15} className="lg:col-span-6">
              <div className="bg-[#073832] text-white rounded-3xl p-8 sm:p-10 shadow-2xl space-y-6 relative overflow-hidden">
                <div className="absolute -right-16 -top-16 w-48 h-48 rounded-full bg-emerald-400/10 blur-2xl" />
                <h3 className="text-xl sm:text-2xl font-extrabold">Your 4-Step Visit Experience</h3>
                <div className="space-y-5 relative z-10">
                  {[
                    {
                      step: '01',
                      title: 'Book Online or Walk In',
                      text: 'Select your preferred specialty and date in under 60 seconds with transparent GHS consultation fees.',
                    },
                    {
                      step: '02',
                      title: 'Rapid Nursing Triage',
                      text: 'Registered nurses record your vitals, medical history, and triage priority within 10 minutes of arrival.',
                    },
                    {
                      step: '03',
                      title: 'Specialist Consultation & Diagnostics',
                      text: 'See your consultant physician with direct on-site access to digital imaging and automated labs.',
                    },
                    {
                      step: '04',
                      title: 'Pharmacy & Follow-Up Plan',
                      text: 'Collect FDA-approved medication on site and receive your structured recovery follow-up schedule.',
                    },
                  ].map((item) => (
                    <div key={item.step} className="flex items-start gap-4">
                      <div className="w-9 h-9 rounded-xl bg-emerald-400/20 text-emerald-300 font-black text-xs flex items-center justify-center shrink-0 border border-emerald-400/30">
                        {item.step}
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-white">{item.title}</h4>
                        <p className="text-xs text-emerald-100/75 mt-0.5 leading-relaxed">{item.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="pt-2">
                  <button
                    onClick={() => setAppointmentModalOpen(true)}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#34d399] hover:bg-[#2bc489] text-[#073832] font-bold text-sm px-6 py-3 rounded-full transition-all active:scale-95"
                  >
                    <span>Schedule Your Visit Now</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </FadeUp>
          </div>
        </div>
      </section>

      {/* MEET OUR SPECIALIST CONSULTANTS */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeUp className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full">
              Medical Leadership
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#073832] tracking-tight mt-3">
              Meet Our Senior Consultants
            </h2>
            <p className="text-slate-600 text-sm sm:text-base mt-2">
              Experienced fellows trained at Korle Bu, KNUST, and leading international medical institutions.
            </p>
          </FadeUp>

          <StaggerGrid className="grid grid-cols-1 md:grid-cols-3 gap-7" staggerDelay={0.1}>
            {CONSULTANTS.map((doc) => (
              <StaggerItem key={doc.name}>
                <div className="bg-[#f8faf9] rounded-2xl overflow-hidden border border-slate-200/80 hover:border-emerald-300 hover:shadow-xl transition-all duration-300 group">
                  <div className="relative h-64 overflow-hidden">
                    <Image
                      src={doc.image}
                      alt={doc.name}
                      fill
                      className="object-cover object-top group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#073832]/75 via-transparent to-transparent" />
                    <div className="absolute bottom-3 left-4 right-4 text-white">
                      <span className="text-[11px] font-bold bg-emerald-500/90 text-[#073832] px-2.5 py-0.5 rounded-full">
                        {doc.experience}
                      </span>
                    </div>
                  </div>
                  <div className="p-6 space-y-2">
                    <h3 className="text-lg font-extrabold text-slate-900">{doc.name}</h3>
                    <p className="text-xs font-bold text-emerald-700">{doc.role}</p>
                    <p className="text-xs text-slate-500">{doc.credentials}</p>
                    <div className="pt-3">
                      <button
                        onClick={() => setAppointmentModalOpen(true)}
                        className="w-full py-2.5 rounded-xl bg-white border border-slate-200 hover:bg-[#073832] hover:text-white hover:border-[#073832] text-xs font-bold text-[#073832] transition-colors"
                      >
                        Book Consultation
                      </button>
                    </div>
                  </div>
                </div>
              </StaggerItem>
            ))}
          </StaggerGrid>

          <FadeUp className="text-center mt-10">
            <Link
              href="/clinic/doctors"
              className="inline-flex items-center gap-2 text-sm font-bold text-emerald-800 hover:text-emerald-950"
            >
              <span>View Full Medical Directory</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </FadeUp>
        </div>
      </section>

      {/* PATIENT TESTIMONIALS */}
      <section className="py-20 bg-[#f8faf9] border-t border-slate-200/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeUp className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-700 bg-emerald-100/60 px-3 py-1 rounded-full">
              Patient Stories
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#073832] tracking-tight mt-3">
              Trusted by Families Across Accra
            </h2>
          </FadeUp>

          <StaggerGrid className="grid grid-cols-1 md:grid-cols-3 gap-6" staggerDelay={0.1}>
            {TESTIMONIALS.map((t) => (
              <StaggerItem key={t.author}>
                <div className="bg-white rounded-2xl p-7 border border-slate-200/80 shadow-sm hover:shadow-lg transition-shadow h-full flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-1 text-amber-400 mb-4">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-amber-400" />
                      ))}
                    </div>
                    <p className="text-slate-600 text-sm leading-relaxed italic">
                      &ldquo;{t.quote}&rdquo;
                    </p>
                  </div>
                  <div className="pt-5 mt-5 border-t border-slate-100">
                    <div className="text-sm font-bold text-slate-900">{t.author}</div>
                    <div className="text-xs text-slate-500">
                      {t.location} · <span className="text-emerald-700 font-semibold">{t.service}</span>
                    </div>
                  </div>
                </div>
              </StaggerItem>
            ))}
          </StaggerGrid>
        </div>
      </section>

      {/* HEALTH & WELLNESS INSIGHTS */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeUp className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full">
                Health Education
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-[#073832] tracking-tight mt-3">
                Preventive Health &amp; Wellness Articles
              </h2>
            </div>
            <Link
              href="/clinic/news"
              className="inline-flex items-center gap-1.5 text-sm font-bold text-emerald-800 hover:text-emerald-950"
            >
              <span>Read All Health News</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </FadeUp>

          <StaggerGrid className="grid grid-cols-1 md:grid-cols-3 gap-6" staggerDelay={0.09}>
            {HEALTH_ARTICLES.map((post) => (
              <StaggerItem key={post.title}>
                <Link
                  href="/clinic/news"
                  className="block bg-[#f8faf9] rounded-2xl overflow-hidden border border-slate-200/80 hover:border-emerald-300 hover:shadow-xl transition-all duration-300 group h-full"
                >
                  <div className="relative h-48 overflow-hidden">
                    <Image
                      src={post.image}
                      alt={post.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                  <div className="p-6 space-y-2.5">
                    <div className="flex items-center justify-between text-[11px] font-bold text-emerald-700">
                      <span>{post.category}</span>
                      <span className="text-slate-400">{post.readTime}</span>
                    </div>
                    <h3 className="text-base font-extrabold text-slate-900 group-hover:text-[#073832] leading-snug">
                      {post.title}
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed">{post.excerpt}</p>
                  </div>
                </Link>
              </StaggerItem>
            ))}
          </StaggerGrid>
        </div>
      </section>

      {/* FREQUENTLY ASKED QUESTIONS */}
      <section className="py-20 bg-[#f8faf9] border-t border-slate-200/70">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeUp className="text-center mb-10">
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-700 bg-emerald-100/70 px-3 py-1 rounded-full">
              Patient Guide
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#073832] tracking-tight mt-3">
              Frequently Asked Questions
            </h2>
          </FadeUp>

          <div className="space-y-3">
            {FAQS.map((item, idx) => {
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

      {/* PROMOTION BANNER: NURSING TRAINING INSTITUTION */}
      <section className="bg-white py-16 border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <FadeUp>
            <div className="bg-gradient-to-r from-[#073832] to-[#0c4e45] rounded-3xl p-8 sm:p-12 text-white relative overflow-hidden shadow-2xl">
              <div className="relative z-10 max-w-2xl space-y-4">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-400/20 text-emerald-300 border border-emerald-400/30">
                  <Sparkles className="w-3.5 h-3.5" /> Action Health Academic Institution
                </span>
                <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
                  Build a Fulfilling Career in Nursing
                </h2>
                <p className="text-emerald-100/80 text-sm sm:text-base leading-relaxed">
                  Action Health operates an accredited Nursing Training School in Accra offering hands-on clinical rotations right inside our medical center.
                </p>
                <div className="pt-2 flex flex-wrap gap-4">
                  <Link
                    href="/school"
                    className="inline-flex items-center gap-2 bg-[#34d399] hover:bg-[#2bc489] text-[#073832] font-bold text-sm px-6 py-3 rounded-full transition-all active:scale-95 shadow-md"
                  >
                    <span>Explore Nursing Programs</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link
                    href="/school/apply"
                    className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white font-semibold text-sm px-6 py-3 rounded-full border border-white/20 transition-all"
                  >
                    <span>Online Admissions</span>
                  </Link>
                </div>
              </div>

              <div className="hidden lg:block absolute right-8 bottom-0 w-80 h-72">
                <div className="relative w-full h-full">
                  <Image
                    src="https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=600&auto=format&fit=crop&q=80"
                    alt="Action Health Nursing Education"
                    fill
                    className="object-cover rounded-t-2xl shadow-2xl"
                  />
                </div>
              </div>
            </div>
          </FadeUp>

          {/* 24/7 EMERGENCY HOTLINE STRIP */}
          <FadeUp delay={0.1}>
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-[#073832] text-emerald-300 flex items-center justify-center shrink-0">
                  <Ambulance className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-extrabold text-[#073832]">
                    Need Urgent Medical Attention or Ambulance Dispatch?
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
                    Our Ridge Emergency Desk is staffed 24/7. Call +233 24 412 3456 or book a priority outpatient slot.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setAppointmentModalOpen(true)}
                className="shrink-0 inline-flex items-center gap-2 bg-[#073832] hover:bg-emerald-900 text-white font-bold text-sm px-6 py-3.5 rounded-full shadow-md transition-all active:scale-95"
              >
                <span>Book Priority Slot</span>
                <ArrowRight className="w-4 h-4 text-emerald-300" />
              </button>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* APPOINTMENT MODAL */}
      <AppointmentModal
        isOpen={appointmentModalOpen}
        onClose={() => setAppointmentModalOpen(false)}
      />

      {/* Footer */}
      <ClinicFooter />
    </div>
  );
}
