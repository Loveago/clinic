import React from 'react';
import Link from 'next/link';
import { GraduationCap, MapPin, Phone, Mail, Award, ArrowRight } from 'lucide-react';

export default function SchoolFooter() {
  return (
    <footer className="bg-[#052924] text-slate-300 pt-16 pb-12 border-t border-emerald-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
          {/* Brand Col */}
          <div className="space-y-4">
            <div className="flex items-center gap-2.5">
              <img
                src="/images/school-logo.jpeg"
                alt="Action Health College"
                className="w-11 h-11 rounded-full object-cover border border-emerald-700/50 bg-white"
              />
              <div>
                <span className="text-lg font-extrabold text-white tracking-tight">Action Health</span>
                <span className="block text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">
                  College
                </span>
              </div>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed">
              Professionalism and Excellency — equipping aspiring caregivers and healthcare professionals with practical clinical competence.
            </p>
            <div className="pt-2 flex items-center gap-2 text-xs text-emerald-300 font-medium">
              <Award className="w-4 h-4" />
              <span>Certified Training by Action Health College</span>
            </div>
          </div>

          {/* Academic Programs */}
          <div>
            <h3 className="text-white font-bold text-sm tracking-wider uppercase mb-4">Academic Programs</h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="/school/programs" className="hover:text-emerald-400 transition-colors">
                  Diploma in Care Giving (3m / 6m / 1yr)
                </Link>
              </li>
              <li>
                <Link href="/school/programs" className="hover:text-emerald-400 transition-colors">
                  Healthcare Assistant Studies
                </Link>
              </li>
              <li>
                <Link href="/school/programs" className="hover:text-emerald-400 transition-colors">
                  Nursing Assistant Studies
                </Link>
              </li>
              <li>
                <Link href="/school/programs" className="text-emerald-300 hover:text-white transition-colors flex items-center gap-1 font-medium pt-1">
                  View All Programs <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </li>
            </ul>
          </div>

          {/* Admissions & Portal */}
          <div>
            <h3 className="text-white font-bold text-sm tracking-wider uppercase mb-4">Admissions & Portal</h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="/school/admissions" className="hover:text-emerald-400 transition-colors">
                  Admission Requirements
                </Link>
              </li>
              <li>
                <Link href="/school/apply" className="hover:text-emerald-400 transition-colors">
                  Purchase Admission Form
                </Link>
              </li>
              <li>
                <Link href="/school/track" className="hover:text-emerald-400 transition-colors">
                  Track Application Status
                </Link>
              </li>
              <li>
                <Link href="/portal/student/dashboard" className="text-emerald-300 hover:text-white transition-colors flex items-center gap-1 font-semibold pt-1">
                  Student E-Learning Login <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </li>
            </ul>
          </div>

          {/* Campus Location */}
          <div>
            <h3 className="text-white font-bold text-sm tracking-wider uppercase mb-4">Campus & Inquiries</h3>
            <ul className="space-y-3 text-sm text-slate-300">
              <li className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>Action Boat Medical Centre / Homeopathy, Tema Michel Camp (Gbetsile Pure Oil), Ghana</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>+233 24 412 3456 / +233 30 212 3456</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>actionhealthcollege@gmail.com</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 mt-8 border-t border-emerald-950/80 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400">
          <p>© {new Date().getFullYear()} Action Health College. Affiliated with Action Boat Medical Centre / Homeopathy.</p>
          <p className="mt-2 sm:mt-0">Powered by Crazy Tech Enterprise</p>
        </div>
      </div>
    </footer>
  );
}

