'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Building, Microscope, Baby, AlertCircle, ArrowRight, Calendar } from 'lucide-react';
import ClinicNavbar from '@/components/ClinicNavbar';
import ClinicFooter from '@/components/ClinicFooter';
import AppointmentModal from '@/components/AppointmentModal';

export default function ClinicDepartmentsPage() {
  const [appointmentModalOpen, setAppointmentModalOpen] = useState(false);

  const departments = [
    {
      name: 'General Outpatient Department (OPD)',
      icon: Building,
      desc: 'First point of entry for patient triage, vital checks, and primary diagnosis by attending medical officers.',
      head: 'Dr. Amina Bello, FWACP',
      room: 'Building A, Ground Floor',
    },
    {
      name: 'Diagnostic Imaging & Automated Laboratory',
      icon: Microscope,
      desc: 'Equipped with computerized hematology analyzers, digital X-ray, 4D ultrasound, and real-time clinical biochemistry.',
      head: 'Dr. Samuel Chukwu',
      room: 'Building B, Wing 1',
    },
    {
      name: 'Maternal & Child Health Suite',
      icon: Baby,
      desc: 'Comprehensive antenatal care, safe delivery suites, child welfare clinic, and neonatal intensive observation.',
      head: 'Dr. Sarah Johnson, FMCPaed',
      room: 'Building A, First Floor',
    },
    {
      name: '24/7 Emergency & Trauma Center',
      icon: AlertCircle,
      desc: 'Always open with acute cardiac resuscitation, minor theatre, and rapid ambulance dispatch protocols.',
      head: 'Dr. Emeka Okafor, FWACS',
      room: 'Emergency Wing, Bay 1-4',
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#f8faf9]">
      <ClinicNavbar onOpenAppointment={() => setAppointmentModalOpen(true)} />

      <section className="bg-[#073832] text-white py-14 px-4 sm:px-6 lg:px-8 text-center space-y-4">
        <span className="text-xs font-bold uppercase tracking-widest text-emerald-300">
          Specialized Clinical Units
        </span>
        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
          Clinic Departments &amp; Facilities
        </h1>
        <p className="text-sm sm:text-base text-emerald-100/80 max-w-2xl mx-auto">
          Modern infrastructure organized into focused clinical departments for optimal diagnostic precision and patient recovery.
        </p>
      </section>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {departments.map((dept, i) => {
            const Icon = dept.icon;
            return (
              <div
                key={i}
                className="bg-white rounded-3xl p-8 border border-slate-200/90 shadow-md hover:shadow-xl hover:border-emerald-300 transition-all space-y-4"
              >
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-800 flex items-center justify-center">
                  <Icon className="w-6 h-6 text-emerald-700" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">{dept.name}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{dept.desc}</p>
                <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Head of Unit</span>
                    <span className="font-semibold text-slate-800">{dept.head}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Location</span>
                    <span className="font-semibold text-slate-800">{dept.room}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      <AppointmentModal
        isOpen={appointmentModalOpen}
        onClose={() => setAppointmentModalOpen(false)}
      />

      <ClinicFooter />
    </div>
  );
}

