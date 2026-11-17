'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Menu, X, GraduationCap, ChevronDown, LogIn, ArrowRight } from 'lucide-react';
import DemoRoleSwitcher from './DemoRoleSwitcher';

export default function SchoolNavbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [coursesDropdownOpen, setCoursesDropdownOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent | TouchEvent) => {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setCoursesDropdownOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setCoursesDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-100 transition-all">
      {/* Top Banner Notice */}
      <div className="bg-[#073832] text-white py-1.5 px-4 text-xs font-medium text-center flex items-center justify-between">
        <div className="hidden sm:block text-emerald-200 text-[11px]">
          🎓 Diploma in Care Giving Admissions Ongoing — Regular, Weekends, Sandwich &amp; Online
        </div>
        <div className="mx-auto sm:mx-0 flex items-center gap-3">
          <span className="text-emerald-200">Affiliated Healthcare System:</span>
          <Link
            href="/"
            className="inline-flex items-center gap-1 font-bold text-white hover:text-emerald-300 underline underline-offset-2 transition-colors"
          >
            Action Boat Medical Centre <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="hidden md:block">
          <DemoRoleSwitcher />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Brand Logo */}
          <Link href="/school" className="flex items-center gap-2.5 group">
            <img
              src="/images/school-logo.jpeg"
              alt="Action Health College"
              className="w-11 h-11 rounded-full object-cover border border-emerald-200 shadow-sm group-hover:scale-105 transition-transform bg-white"
            />
            <div className="flex flex-col">
              <span className="text-lg font-extrabold tracking-tight text-[#073832] leading-none">
                Action Health
              </span>
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mt-0.5">
                College • Professionalism &amp; Excellency
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links (matching mockup) */}
          <nav ref={navRef} className="hidden lg:flex items-center gap-8 text-[15px] font-medium text-slate-700">
            <Link
              href="/school"
              className="text-[#073832] font-semibold hover:text-emerald-700 transition-colors"
            >
              Home
            </Link>

            {/* Courses Dropdown */}
            <div
              className="relative group"
              onMouseEnter={() => setCoursesDropdownOpen(true)}
              onMouseLeave={() => setCoursesDropdownOpen(false)}
            >
              <button
                type="button"
                aria-expanded={coursesDropdownOpen}
                aria-haspopup="true"
                onClick={() => setCoursesDropdownOpen((prev) => !prev)}
                className="flex items-center gap-1 hover:text-emerald-700 transition-colors py-2"
              >
                <span>Courses</span>
                <ChevronDown
                  className={`w-4 h-4 transition-transform ${
                    coursesDropdownOpen ? 'rotate-180 text-emerald-700' : 'text-slate-400 group-hover:text-emerald-700 group-hover:rotate-180'
                  }`}
                />
              </button>
              <div
                className={`absolute left-0 mt-1 w-64 bg-white rounded-xl shadow-xl border border-slate-100 py-2 transition-all duration-200 ${
                  coursesDropdownOpen
                    ? 'opacity-100 visible'
                    : 'opacity-0 invisible group-hover:opacity-100 group-hover:visible'
                }`}
              >
                <Link
                  href="/school/programs"
                  onClick={() => setCoursesDropdownOpen(false)}
                  className="block px-4 py-2 text-sm text-slate-700 hover:bg-emerald-50 hover:text-emerald-800"
                >
                  All Academic Programmes
                </Link>
                <Link
                  href="/school/programs#dcg"
                  onClick={() => setCoursesDropdownOpen(false)}
                  className="block px-4 py-2 text-sm text-slate-700 hover:bg-emerald-50 hover:text-emerald-800"
                >
                  Diploma in Care Giving
                </Link>
                <Link
                  href="/school/programs#nas"
                  onClick={() => setCoursesDropdownOpen(false)}
                  className="block px-4 py-2 text-sm text-slate-700 hover:bg-emerald-50 hover:text-emerald-800"
                >
                  Nursing Assistant Studies
                </Link>
                <Link
                  href="/school/programs#phe"
                  onClick={() => setCoursesDropdownOpen(false)}
                  className="block px-4 py-2 text-sm text-slate-700 hover:bg-emerald-50 hover:text-emerald-800"
                >
                  Public Health &amp; First Aid
                </Link>
              </div>
            </div>

            <Link
              href="/school/admissions"
              className="hover:text-emerald-700 transition-colors"
            >
              Admissions
            </Link>

            <Link
              href="/portal/student/dashboard"
              className="hover:text-emerald-700 transition-colors font-semibold text-emerald-800 flex items-center gap-1"
            >
              <span>Student Portal</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </Link>

            <Link
              href="/school/about"
              className="hover:text-emerald-700 transition-colors"
            >
              About
            </Link>
          </nav>

          {/* Right Action Button - matching mockup "Login" */}
          <div className="flex items-center gap-4">
            <Link
              href="/auth/login"
              className="inline-flex items-center gap-2 bg-[#073832] hover:bg-[#0b4e46] text-white text-sm font-semibold px-6 py-2.5 rounded-full shadow-md hover:shadow-lg transition-all active:scale-95"
            >
              <LogIn className="w-4 h-4 text-emerald-300" />
              <span>Login</span>
            </Link>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-white border-b border-slate-200 px-4 pt-3 pb-6 space-y-3 shadow-2xl animate-in slide-in-from-top-4 duration-200">
          <div className="py-2">
            <DemoRoleSwitcher />
          </div>
          <Link
            href="/school"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 text-base font-semibold text-emerald-800 bg-emerald-50 rounded-lg"
          >
            Home
          </Link>
          <Link
            href="/school/programs"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 text-base font-medium text-slate-700 hover:bg-slate-50 rounded-lg"
          >
            Courses & Programmes
          </Link>
          <Link
            href="/school/admissions"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 text-base font-medium text-slate-700 hover:bg-slate-50 rounded-lg"
          >
            Admissions & Requirements
          </Link>
          <Link
            href="/school/apply"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 text-base font-medium text-slate-700 hover:bg-slate-50 rounded-lg"
          >
            Apply Online
          </Link>
          <Link
            href="/school/track"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 text-base font-medium text-slate-700 hover:bg-slate-50 rounded-lg"
          >
            Track Application
          </Link>
          <Link
            href="/portal/student/dashboard"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 text-base font-bold text-emerald-800 bg-emerald-100/50 rounded-lg"
          >
            Student Portal
          </Link>
          <Link
            href="/school/about"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 text-base font-medium text-slate-700 hover:bg-slate-50 rounded-lg"
          >
            About Institution
          </Link>
          <div className="pt-2 border-t border-slate-100">
            <Link
              href="/"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-between px-3 py-2 text-sm font-semibold text-emerald-800 bg-emerald-50/80 rounded-lg"
            >
              <span>Visit Action Boat Medical Centre / Homeopathy</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <Link
            href="/auth/login"
            onClick={() => setMobileMenuOpen(false)}
            className="w-full mt-2 bg-[#073832] text-white font-semibold py-3 rounded-full flex items-center justify-center gap-2"
          >
            <LogIn className="w-4 h-4 text-emerald-300" />
            <span>Login to Portal</span>
          </Link>
        </div>
      )}
    </header>
  );
}

