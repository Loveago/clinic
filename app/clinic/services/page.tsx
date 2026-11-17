'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Stethoscope,
  Activity,
  Pill,
  HeartPulse,
  Clock,
  ArrowRight,
  ShieldCheck,
  CheckCircle,
  Calendar,
} from 'lucide-react';
import ClinicNavbar from '@/components/ClinicNavbar';
import ClinicFooter from '@/components/ClinicFooter';
import AppointmentModal from '@/components/AppointmentModal';
import { FadeUp, StaggerGrid, StaggerItem } from '@/components/MotionPrimitives';

export default function ClinicServicesPage() {
  const [appointmentModalOpen, setAppointmentModalOpen] = useState(false);
  const [services, setServices] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/clinic/services')
      .then((res) => res.json())
      .then((data) => {
        if (data.services) setServices(data.services);
      })
      .catch(() => {});
  }, []);

  const serviceIcons: Record<string, any> = {
    Stethoscope: Stethoscope,
    Activity: Activity,
    Pill: Pill,
    HeartPulse: HeartPulse,
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f8faf9]">
      <ClinicNavbar onOpenAppointment={() => setAppointmentModalOpen(true)} />

      {/* Header */}
      <section className="bg-[#073832] text-white py-14 px-4 sm:px-6 lg:px-8 text-center space-y-4">
        <FadeUp>
          <span className="text-xs font-bold uppercase tracking-widest text-emerald-300">
            Comprehensive Clinical Excellence
          </span>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight mt-2">
            Medical Services &amp; Specialties
          </h1>
          <p className="text-sm sm:text-base text-emerald-100/80 max-w-2xl mx-auto mt-3">
            Delivering advanced diagnostics, compassionate primary care, pharmacy, and surgical consultations under one roof.
          </p>
        </FadeUp>
      </section>

      {/* Services List */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-8">
        <StaggerGrid className="grid grid-cols-1 md:grid-cols-2 gap-8" staggerDelay={0.08}>
          {services.map((svc) => {
            const Icon = serviceIcons[svc.iconName] || Stethoscope;

            return (
              <StaggerItem key={svc.id}>
                <div
                  id={svc.category.toLowerCase()}
                  className="bg-white rounded-3xl p-8 border border-slate-200/90 shadow-md hover:shadow-xl hover:-translate-y-1 hover:border-emerald-300 transition-all space-y-5 h-full"
                >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-800 flex items-center justify-center shrink-0 border border-emerald-100">
                    <Icon className="w-7 h-7 text-emerald-700" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100 uppercase tracking-wider">
                      {svc.category}
                    </span>
                    <h3 className="text-xl font-bold text-slate-900 mt-1">
                      {svc.title}
                    </h3>
                  </div>
                </div>

                <p className="text-sm text-slate-600 leading-relaxed">
                  {svc.description}
                </p>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs text-slate-500 font-medium">
                    Consultation Duration: {svc.duration || '30 mins'}
                  </span>
                  <button
                    onClick={() => setAppointmentModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-[#073832] hover:bg-emerald-900 text-white text-xs font-bold rounded-full transition-all shadow-sm"
                  >
                    <Calendar className="w-3.5 h-3.5 text-emerald-300" />
                    <span>Book Appointment</span>
                  </button>
                  </div>
                </div>
              </StaggerItem>
            );
          })}
        </StaggerGrid>
      </main>

      <AppointmentModal
        isOpen={appointmentModalOpen}
        onClose={() => setAppointmentModalOpen(false)}
      />

      <ClinicFooter />
    </div>
  );
}

