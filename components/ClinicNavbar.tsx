'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Search, Menu, X, Heart, ChevronDown, Calendar, ArrowRight } from 'lucide-react';
import DemoRoleSwitcher from './DemoRoleSwitcher';

interface ClinicNavbarProps {
  onOpenAppointment?: () => void;
}

export default function ClinicNavbar({ onOpenAppointment }: ClinicNavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [clinicDropdownOpen, setClinicDropdownOpen] = useState(false);
  const [servicesDropdownOpen, setServicesDropdownOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent | TouchEvent) => {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setClinicDropdownOpen(false);
        setServicesDropdownOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setClinicDropdownOpen(false);
        setServicesDropdownOpen(false);
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
          🏥 Tema Michel Camp (Gbetsile Pure Oil) • <strong>actiondoctor2019@gmail.com</strong>
        </div>
        <div className="mx-auto sm:mx-0 flex items-center gap-3">
          <span className="text-emerald-200">Visit our institution:</span>
          <Link
            href="/school"
            className="inline-flex items-center gap-1 font-bold text-white hover:text-emerald-300 underline underline-offset-2 transition-colors"
          >
            Action Health College <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="hidden md:block">
          <DemoRoleSwitcher />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <img
              src="/images/clinic-logo.jpeg"
              alt="Action Boat Medical Centre / Homeopathy"
              className="w-11 h-11 rounded-full object-cover border border-emerald-200 shadow-sm group-hover:scale-105 transition-transform bg-white"
            />
            <div className="flex flex-col">
              <span className="text-lg font-extrabold tracking-tight text-[#073832] leading-none">
                Action Boat
              </span>
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mt-0.5">
                Medical Centre &amp; Homeopathy
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav ref={navRef} className="hidden lg:flex items-center gap-8 text-[15px] font-medium text-slate-700">
            <Link
              href="/"
              className="text-[#073832] font-semibold hover:text-emerald-700 transition-colors"
            >
              Home
            </Link>

            {/* Our Clinic Dropdown */}
            <div
              className="relative group"
              onMouseEnter={() => {
                setClinicDropdownOpen(true);
                setServicesDropdownOpen(false);
              }}
              onMouseLeave={() => setClinicDropdownOpen(false)}
            >
              <button
                type="button"
                aria-expanded={clinicDropdownOpen}
                aria-haspopup="true"
                onClick={() => {
                  setClinicDropdownOpen((prev) => !prev);
                  setServicesDropdownOpen(false);
                }}
                className="flex items-center gap-1 hover:text-emerald-700 transition-colors py-2"
              >
                <span>Our Clinic</span>
                <ChevronDown
                  className={`w-4 h-4 transition-transform ${
                    clinicDropdownOpen ? 'rotate-180 text-emerald-700' : 'text-slate-400 group-hover:text-emerald-700 group-hover:rotate-180'
                  }`}
                />
              </button>
              <div
                className={`absolute left-0 mt-1 w-52 bg-white rounded-xl shadow-xl border border-slate-100 py-2 transition-all duration-200 ${
                  clinicDropdownOpen
                    ? 'opacity-100 visible'
                    : 'opacity-0 invisible group-hover:opacity-100 group-hover:visible'
                }`}
              >
                <Link
                  href="/clinic/about"
                  onClick={() => setClinicDropdownOpen(false)}
                  className="block px-4 py-2 text-sm text-slate-700 hover:bg-emerald-50 hover:text-emerald-800"
                >
                  About the Center
                </Link>
                <Link
                  href="/clinic/departments"
                  onClick={() => setClinicDropdownOpen(false)}
                  className="block px-4 py-2 text-sm text-slate-700 hover:bg-emerald-50 hover:text-emerald-800"
                >
                  Departments & Specialties
                </Link>
                <Link
                  href="/clinic/doctors"
                  onClick={() => setClinicDropdownOpen(false)}
                  className="block px-4 py-2 text-sm text-slate-700 hover:bg-emerald-50 hover:text-emerald-800"
                >
                  Our Medical Team
                </Link>
                <Link
                  href="/clinic/facilities"
                  onClick={() => setClinicDropdownOpen(false)}
                  className="block px-4 py-2 text-sm text-slate-700 hover:bg-emerald-50 hover:text-emerald-800"
                >
                  Facilities & Gallery
                </Link>
              </div>
            </div>

            {/* Services Dropdown */}
            <div
              className="relative group"
              onMouseEnter={() => {
                setServicesDropdownOpen(true);
                setClinicDropdownOpen(false);
              }}
              onMouseLeave={() => setServicesDropdownOpen(false)}
            >
              <button
                type="button"
                aria-expanded={servicesDropdownOpen}
                aria-haspopup="true"
                onClick={() => {
                  setServicesDropdownOpen((prev) => !prev);
                  setClinicDropdownOpen(false);
                }}
                className="flex items-center gap-1 hover:text-emerald-700 transition-colors py-2"
              >
                <span>Services</span>
                <ChevronDown
                  className={`w-4 h-4 transition-transform ${
                    servicesDropdownOpen ? 'rotate-180 text-emerald-700' : 'text-slate-400 group-hover:text-emerald-700 group-hover:rotate-180'
                  }`}
                />
              </button>
              <div
                className={`absolute left-0 mt-1 w-64 bg-white rounded-xl shadow-xl border border-slate-100 py-2 transition-all duration-200 ${
                  servicesDropdownOpen
                    ? 'opacity-100 visible'
                    : 'opacity-0 invisible group-hover:opacity-100 group-hover:visible'
                }`}
              >
                <Link
                  href="/clinic/services"
                  onClick={() => setServicesDropdownOpen(false)}
                  className="block px-4 py-2 text-sm text-slate-700 hover:bg-emerald-50 hover:text-emerald-800"
                >
                  General & Specialist Care
                </Link>
                <Link
                  href="/clinic/services#diagnostics"
                  onClick={() => setServicesDropdownOpen(false)}
                  className="block px-4 py-2 text-sm text-slate-700 hover:bg-emerald-50 hover:text-emerald-800"
                >
                  Advanced Diagnostics & Lab
                </Link>
                <Link
                  href="/clinic/services#pharmacy"
                  onClick={() => setServicesDropdownOpen(false)}
                  className="block px-4 py-2 text-sm text-slate-700 hover:bg-emerald-50 hover:text-emerald-800"
                >
                  24/7 Pharmacy Services
                </Link>
                <Link
                  href="/clinic/services#wellness"
                  onClick={() => setServicesDropdownOpen(false)}
                  className="block px-4 py-2 text-sm text-slate-700 hover:bg-emerald-50 hover:text-emerald-800"
                >
                  Wellness & Preventive Care
                </Link>
              </div>
            </div>

            <Link
              href="/clinic/about#health-info"
              className="hover:text-emerald-700 transition-colors"
            >
              Health Info
            </Link>

            <Link
              href="/clinic/contact"
              className="hover:text-emerald-700 transition-colors"
            >
              Contact
            </Link>
          </nav>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-4">
            <button
              aria-label="Search"
              className="p-2 text-slate-500 hover:text-emerald-800 hover:bg-emerald-50 rounded-full transition-colors hidden sm:block"
            >
              <Search className="w-5 h-5" />
            </button>

            {/* Book Appointment CTA - strictly matching mockup */}
            <button
              onClick={onOpenAppointment}
              className="inline-flex items-center gap-2 bg-[#073832] hover:bg-[#0b4e46] text-white text-sm font-semibold px-5 py-2.5 rounded-full shadow-md hover:shadow-lg transition-all active:scale-95"
            >
              <Calendar className="w-4 h-4 text-emerald-300" />
              <span>Book Appointment</span>
            </button>

            {/* Mobile Menu Toggle Button */}
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

      {/* Mobile Drawer Navigation (matches mockup mobile view) */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-white border-b border-slate-200 px-4 pt-3 pb-6 space-y-3 shadow-2xl animate-in slide-in-from-top-4 duration-200">
          <div className="py-2">
            <DemoRoleSwitcher />
          </div>
          <Link
            href="/"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 text-base font-semibold text-emerald-800 bg-emerald-50 rounded-lg"
          >
            Home
          </Link>
          <Link
            href="/clinic/about"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 text-base font-medium text-slate-700 hover:bg-slate-50 rounded-lg"
          >
            About Our Clinic
          </Link>
          <Link
            href="/clinic/services"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 text-base font-medium text-slate-700 hover:bg-slate-50 rounded-lg"
          >
            Medical Services
          </Link>
          <Link
            href="/clinic/doctors"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 text-base font-medium text-slate-700 hover:bg-slate-50 rounded-lg"
          >
            Medical Team
          </Link>
          <Link
            href="/clinic/contact"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 text-base font-medium text-slate-700 hover:bg-slate-50 rounded-lg"
          >
            Contact & Directions
          </Link>
          <div className="pt-2 border-t border-slate-100">
            <Link
              href="/school"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-between px-3 py-2 text-sm font-semibold text-emerald-800 bg-emerald-50/80 rounded-lg"
            >
              <span>Visit Action Health College</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <button
            onClick={() => {
              setMobileMenuOpen(false);
              if (onOpenAppointment) onOpenAppointment();
            }}
            className="w-full mt-2 bg-[#073832] text-white font-semibold py-3 rounded-full flex items-center justify-center gap-2"
          >
            <Calendar className="w-4 h-4 text-emerald-300" />
            <span>Book Appointment</span>
          </button>
        </div>
      )}
    </header>
  );
}

