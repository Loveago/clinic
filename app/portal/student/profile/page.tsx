'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { User, QrCode, Phone, Mail, MapPin, ShieldCheck, Download, Award, FileText } from 'lucide-react';
import StudentHeader from '@/components/StudentHeader';

export default function StudentProfilePage() {
  const [student, setStudent] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/student/dashboard')
      .then((res) => res.json())
      .then((d) => {
        if (d?.student) setStudent(d.student);
        setLoading(false);
      })
      .catch((e) => {
        console.error(e);
        setLoading(false);
      });
  }, []);

  const name = student?.name || 'Ama Serwaa Mensah';
  const studentId = student?.studentId || 'WNS/GH/2025/001';
  const email = student?.email || 'ama@student.welllife.org';
  const phone = student?.phone || '+233 24 890 1234';
  const programme = student?.programme || 'Basic Nursing Certificate';
  const level = student?.level || 'Level 100';
  const avatar = student?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80';

  return (
    <>
      <StudentHeader
        title="Student Profile & Digital ID (Ghana)"
        subtitle="Institutional Credentials, Ghana Card Verification & Emergency Contact"
      />

      <main className="p-4 sm:p-8 max-w-7xl mx-auto w-full space-y-8 font-sans">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Digital Student ID Card (Left) */}
          <div className="lg:col-span-5 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Official Digital Student ID Card</h3>

            {/* ID Card Visual */}
            <div className="bg-gradient-to-br from-[#073832] via-[#052924] to-[#042420] text-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-emerald-800/50 space-y-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-44 h-44 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

              {/* Card Header */}
              <div className="flex items-center justify-between border-b border-emerald-800/60 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-bold text-xs border border-emerald-500/30">
                    WNS
                  </div>
                  <div>
                    <div className="text-xs font-black tracking-wider text-white">Action Health College</div>
                    <div className="text-[9px] uppercase tracking-widest text-emerald-300">Accra Ghana • Student ID</div>
                  </div>
                </div>
                <span className="text-[10px] font-bold bg-emerald-900/90 text-emerald-200 px-2.5 py-0.5 rounded-full border border-emerald-700/50">
                  ACTIVE
                </span>
              </div>

              {/* Photo & Main Details */}
              <div className="flex items-center gap-5">
                <div className="relative w-20 h-24 rounded-xl overflow-hidden border-2 border-emerald-500/40 shrink-0 shadow-md">
                  <Image
                    src={avatar}
                    alt={name}
                    fill
                    className="object-cover"
                  />
                </div>

                <div className="space-y-1">
                  <div className="text-base font-black text-white leading-tight">{name}</div>
                  <div className="text-xs text-emerald-300 font-mono font-bold">{studentId}</div>
                  <div className="text-xs text-slate-300 font-medium">{programme}</div>
                  <div className="text-[10px] text-slate-400">{level} • First Semester</div>
                </div>
              </div>

              {/* Barcode / QR Simulation & Verification */}
              <div className="pt-3 border-t border-emerald-800/60 flex items-center justify-between text-[10px] text-emerald-200">
                <div className="space-y-0.5">
                  <div className="font-semibold text-white">Academic Session 2025/2026</div>
                  <div className="text-emerald-300/80">Accredited by N&MC Ghana</div>
                </div>
                <div className="w-10 h-10 bg-white rounded-lg p-1 flex items-center justify-center">
                  <QrCode className="w-8 h-8 text-[#073832]" />
                </div>
              </div>
            </div>

            <button
              onClick={() => window.print()}
              className="w-full py-3 bg-white border border-slate-200 hover:border-slate-300 text-slate-800 text-xs font-bold rounded-2xl shadow-sm transition-all flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4 text-emerald-800" />
              <span>Print / Download Digital ID Pass</span>
            </button>
          </div>

          {/* Student Profile Details (Right) */}
          <div className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Personal & Institutional Records</h3>
              <span className="text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full font-bold border border-emerald-200">
                Ghana Health Service Standards
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                <span className="text-slate-400 uppercase font-bold text-[10px]">Full Name</span>
                <div className="font-bold text-slate-900 text-sm">{name}</div>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                <span className="text-slate-400 uppercase font-bold text-[10px]">Student ID Number</span>
                <div className="font-bold text-slate-900 text-sm font-mono">{studentId}</div>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                <span className="text-slate-400 uppercase font-bold text-[10px]">Email Address</span>
                <div className="font-bold text-slate-900">{email}</div>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                <span className="text-slate-400 uppercase font-bold text-[10px]">Phone Number (Ghana)</span>
                <div className="font-bold text-slate-900 font-mono">{phone}</div>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                <span className="text-slate-400 uppercase font-bold text-[10px]">Ghana Card Verification</span>
                <div className="font-bold text-slate-900 font-mono">GHA-723491823-9</div>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                <span className="text-slate-400 uppercase font-bold text-[10px]">Residential Address</span>
                <div className="font-bold text-slate-900">House No. 14, Ringway Estates, Osu, Accra, Ghana</div>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1 sm:col-span-2">
                <span className="text-slate-400 uppercase font-bold text-[10px]">Emergency Contact</span>
                <div className="font-bold text-slate-900">Nana Kofi Mensah (Father) - +233 24 333 4455</div>
              </div>
            </div>

            {/* Document Vault */}
            <div className="pt-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Verified Academic Credentials</h4>
              <div className="space-y-2 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-emerald-700" />
                    <span className="font-bold text-slate-800">WASSCE Official Result Certificate (Verified)</span>
                  </div>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                    Verified
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-emerald-700" />
                    <span className="font-bold text-slate-800">N&MC Ghana Indexing Clearance Form</span>
                  </div>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                    Approved
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
