'use client';

import React, { useState } from 'react';
import { MapPin, Phone, Mail, Clock, Send, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import ClinicNavbar from '@/components/ClinicNavbar';
import ClinicFooter from '@/components/ClinicFooter';

export default function ClinicContactPage() {
  const [formData, setFormData] = useState({
    patientName: '',
    patientPhone: '',
    patientEmail: '',
    preferredDate: '',
    preferredTime: '10:00 AM',
    message: '',
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/clinic/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(true);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f8faf9]">
      <ClinicNavbar />

      <section className="bg-[#073832] text-white py-14 px-4 sm:px-6 lg:px-8 text-center space-y-4">
        <span className="text-xs font-bold uppercase tracking-widest text-emerald-300">
          Get in Touch With Us
        </span>
        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
          Contact &amp; Location
        </h1>
        <p className="text-sm sm:text-base text-emerald-100/80 max-w-2xl mx-auto">
          We are here to help you 24 hours a day, 7 days a week.
        </p>
      </section>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          {/* Contact Details - matching mockup */}
          <div className="lg:col-span-5 space-y-6">
            <h2 className="text-2xl font-bold text-[#073832]">Visit Our Medical Campus</h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Action Boat Medical Centre / Homeopathy and Action Health College share a modern, integrated healthcare and educational facility in Ridge, Accra, Ghana.
            </p>

            <div className="space-y-4 pt-2">
              <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Our Physical Location</h3>
                  <p className="text-xs text-slate-600 mt-1">Tema Michel Camp (Gbetsile Pure Oil), Greater Accra, Ghana</p>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                  <Phone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Telephone Lines</h3>
                  <p className="text-xs text-slate-600 mt-1">+233 24 412 3456 / +233 30 212 3456</p>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Email Inquiries</h3>
                  <p className="text-xs text-slate-600 mt-1">actiondoctor2019@gmail.com / actionhealthcollege@gmail.com</p>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Opening Hours</h3>
                  <p className="text-xs text-slate-600 mt-1">
                    Mon - Fri: 8:00 AM - 8:00 PM<br />
                    Saturday: 9:00 AM - 5:00 PM<br />
                    Emergency Unit: Open 24/7
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Appointment Request Form */}
          <div className="lg:col-span-7 bg-white rounded-3xl p-8 sm:p-10 border border-slate-200/90 shadow-xl space-y-6">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full">
                Online Request
              </span>
              <h2 className="text-2xl font-bold text-slate-900 mt-2">
                Request an Appointment or Consultation
              </h2>
            </div>

            {success ? (
              <div className="py-12 text-center space-y-3">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-800 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">Request Dispatched!</h3>
                <p className="text-xs text-slate-600 max-w-sm mx-auto">
                  Our front desk triage staff has received your consultation booking and will call you to confirm your schedule.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Babatunde Adeleke"
                    value={formData.patientName}
                    onChange={(e) => setFormData({ ...formData, patientName: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700/30"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number *</label>
                    <input
                      type="tel"
                      required
                      placeholder="+233 24 412 3456"
                      value={formData.patientPhone}
                      onChange={(e) => setFormData({ ...formData, patientPhone: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700/30"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                    <input
                      type="email"
                      placeholder="patient@example.com"
                      value={formData.patientEmail}
                      onChange={(e) => setFormData({ ...formData, patientEmail: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700/30"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Preferred Date *</label>
                    <input
                      type="date"
                      required
                      min={new Date().toISOString().split('T')[0]}
                      value={formData.preferredDate}
                      onChange={(e) => setFormData({ ...formData, preferredDate: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700/30"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Preferred Time *</label>
                    <select
                      value={formData.preferredTime}
                      onChange={(e) => setFormData({ ...formData, preferredTime: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700/30"
                    >
                      <option value="09:00 AM">09:00 AM (Morning)</option>
                      <option value="11:00 AM">11:00 AM (Mid-day)</option>
                      <option value="02:00 PM">02:00 PM (Afternoon)</option>
                      <option value="04:30 PM">04:30 PM (Evening)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Symptoms or Special Requests</label>
                  <textarea
                    rows={3}
                    placeholder="Briefly describe what you'd like to consult on..."
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700/30"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 bg-[#073832] hover:bg-emerald-900 text-white font-bold text-xs rounded-full shadow-lg transition-all flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 text-emerald-300" />}
                  <span>Submit Appointment Request</span>
                </button>
              </form>
            )}
          </div>
        </div>
      </main>

      <ClinicFooter />
    </div>
  );
}

