'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Calendar, Clock, Award, Phone } from 'lucide-react';
import ClinicNavbar from '@/components/ClinicNavbar';
import ClinicFooter from '@/components/ClinicFooter';
import AppointmentModal from '@/components/AppointmentModal';

export default function ClinicDoctorsPage() {
  const [doctors, setDoctors] = useState<any[]>([]);
  const [appointmentModalOpen, setAppointmentModalOpen] = useState(false);

  useEffect(() => {
    fetch('/api/clinic/doctors')
      .then((res) => res.json())
      .then((data) => {
        if (data.doctors) setDoctors(data.doctors);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-[#f8faf9]">
      <ClinicNavbar onOpenAppointment={() => setAppointmentModalOpen(true)} />

      <section className="bg-[#073832] text-white py-14 px-4 sm:px-6 lg:px-8 text-center space-y-4">
        <span className="text-xs font-bold uppercase tracking-widest text-emerald-300">
          Our Healthcare Practitioners
        </span>
        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
          Meet Our Medical Consultants &amp; Specialists
        </h1>
        <p className="text-sm sm:text-base text-emerald-100/80 max-w-2xl mx-auto">
          Dedicated physicians, surgeons, and nurse educators bringing decades of clinical acumen and empathetic bedside care.
        </p>
      </section>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {doctors.map((doc) => (
            <div
              key={doc.id}
              className="bg-white rounded-3xl overflow-hidden border border-slate-200/90 shadow-md hover:shadow-xl hover:border-emerald-300 transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="relative h-64 w-full bg-slate-100 overflow-hidden">
                  <Image
                    src={doc.photoUrl}
                    alt={doc.name}
                    fill
                    className="object-cover object-top group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent opacity-40" />
                </div>

                <div className="p-6 space-y-2">
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                    {doc.qualification}
                  </span>
                  <h3 className="text-base font-bold text-slate-900 group-hover:text-emerald-800 transition-colors leading-snug">
                    {doc.name}
                  </h3>
                  <p className="text-xs font-semibold text-emerald-700">
                    {doc.specialty}
                  </p>
                  <p className="text-xs text-slate-500 leading-relaxed pt-1">
                    {doc.bio}
                  </p>
                </div>
              </div>

              <div className="p-6 pt-0 space-y-3">
                <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-500 font-medium flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-emerald-700" />
                  <span>{doc.availableDays}</span>
                </div>

                <button
                  onClick={() => setAppointmentModalOpen(true)}
                  className="w-full py-2.5 bg-[#073832] hover:bg-emerald-900 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
                >
                  Request Consultation
                </button>
              </div>
            </div>
          ))}
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

