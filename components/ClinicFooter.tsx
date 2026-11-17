import React from 'react';
import Link from 'next/link';
import { Heart, MapPin, Phone, Mail, Clock, ArrowRight, ShieldCheck } from 'lucide-react';

export default function ClinicFooter() {
  return (
    <footer className="bg-[#052924] text-slate-300 pt-16 pb-12 border-t border-emerald-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
          {/* Brand Col */}
          <div className="space-y-4">
            <div className="flex items-center gap-2.5">
              <img
                src="/images/clinic-logo.jpeg"
                alt="Action Boat Medical Centre / Homeopathy"
                className="w-11 h-11 rounded-full object-cover border border-emerald-700/50 bg-white"
              />
              <div>
                <span className="text-lg font-extrabold text-white tracking-tight">Action Boat</span>
                <span className="block text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">
                  Medical Centre / Homeopathy
                </span>
              </div>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed">
              Committed to providing compassionate homeopathic and conventional healthcare for you and your family at Tema Michel Camp.
            </p>
            <div className="pt-2 flex items-center gap-2 text-xs text-emerald-300 font-medium">
              <ShieldCheck className="w-4 h-4" />
              <span>Certified Medical &amp; Homeopathic Centre</span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-white font-bold text-sm tracking-wider uppercase mb-4">Our Clinic</h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="/clinic/about" className="hover:text-emerald-400 transition-colors">
                  About Action Boat Medical
                </Link>
              </li>
              <li>
                <Link href="/clinic/departments" className="hover:text-emerald-400 transition-colors">
                  Departments & Specialties
                </Link>
              </li>
              <li>
                <Link href="/clinic/doctors" className="hover:text-emerald-400 transition-colors">
                  Medical Consultants & Team
                </Link>
              </li>
              <li>
                <Link href="/clinic/facilities" className="hover:text-emerald-400 transition-colors">
                  Diagnostic Labs & Facilities
                </Link>
              </li>
              <li>
                <Link href="/clinic/contact" className="hover:text-emerald-400 transition-colors">
                  Book an Appointment
                </Link>
              </li>
            </ul>
          </div>

          {/* School Promo */}
          <div>
            <h3 className="text-white font-bold text-sm tracking-wider uppercase mb-4">Action Health College</h3>
            <p className="text-sm text-slate-400 mb-3">
              Build a rewarding healthcare career with our Diploma in Care Giving &amp; allied health programs.
            </p>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="/school/programs" className="text-emerald-300 hover:text-white transition-colors flex items-center gap-1 font-medium">
                  Explore Caregiving Programs <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </li>
              <li>
                <Link href="/school/apply" className="hover:text-emerald-400 transition-colors">
                  Online Admission Application
                </Link>
              </li>
              <li>
                <Link href="/portal/student/dashboard" className="hover:text-emerald-400 transition-colors">
                  Student E-Learning Portal
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Details */}
          <div>
            <h3 className="text-white font-bold text-sm tracking-wider uppercase mb-4">Contact Info</h3>
            <ul className="space-y-3 text-sm text-slate-300">
              <li className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>Tema Michel Camp (Gbetsile Pure Oil), Greater Accra, Ghana</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>+233 24 412 3456 / +233 30 212 3456</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>actiondoctor2019@gmail.com</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Clock className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>Mon - Fri: 8AM - 8PM | Sat: 9AM - 5PM<br />Emergency Unit: 24/7</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 mt-8 border-t border-emerald-950/80 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400">
          <p>© {new Date().getFullYear()} Action Boat Medical Centre / Homeopathy &amp; Action Health College. All rights reserved.</p>
          <p className="mt-2 sm:mt-0">Powered by Crazy Tech Enterprise</p>
        </div>
      </div>
    </footer>
  );
}

