'use client';

import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, Stethoscope, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

interface AppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AppointmentModal({ isOpen, onClose }: AppointmentModalProps) {
  const [services, setServices] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    patientName: '',
    patientPhone: '',
    patientEmail: '',
    serviceId: '',
    departmentName: 'General Outpatient (OPD)',
    preferredDate: '',
    preferredTime: '10:00 AM',
    message: '',
  });
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetch('/api/clinic/services')
        .then((res) => res.json())
        .then((data) => {
          if (data.services) {
            setServices(data.services);
            if (data.services.length > 0 && !formData.serviceId) {
              setFormData((prev) => ({ ...prev, serviceId: data.services[0].id }));
            }
          }
        })
        .catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/clinic/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit appointment');
      }

      setSuccessMsg(data.message || 'Appointment requested successfully!');
      setTimeout(() => {
        // Reset and close after a moment
        setFormData({
          patientName: '',
          patientPhone: '',
          patientEmail: '',
          serviceId: services[0]?.id || '',
          departmentName: 'General Outpatient (OPD)',
          preferredDate: '',
          preferredTime: '10:00 AM',
          message: '',
        });
      }, 2000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit appointment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto border border-slate-100">
        {/* Header */}
        <div className="bg-[#073832] text-white p-6 relative rounded-t-2xl">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 text-emerald-200 hover:text-white p-1 rounded-full transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 text-emerald-300 text-xs font-bold uppercase tracking-wider mb-1">
            <Stethoscope className="w-4 h-4" />
            <span>Action Boat Medical Centre / Homeopathy</span>
          </div>
          <h2 className="text-2xl font-bold">Book an Appointment</h2>
          <p className="text-emerald-100/80 text-sm mt-1">
            Choose your preferred service, date and time. Our team will verify and confirm promptly.
          </p>
        </div>

        {/* Content */}
        <div className="p-6">
          {successMsg ? (
            <div className="py-8 text-center space-y-4">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Request Received!</h3>
              <p className="text-slate-600 text-sm max-w-sm mx-auto">{successMsg}</p>
              <button
                onClick={onClose}
                className="mt-4 px-6 py-2.5 bg-[#073832] text-white text-sm font-semibold rounded-full hover:bg-emerald-800 transition-colors"
              >
                Done
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {errorMsg && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Patient Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Babatunde Adeleke"
                  value={formData.patientName}
                  onChange={(e) => setFormData({ ...formData, patientName: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700/30 focus:border-emerald-700"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="+233 24 412 3456"
                    value={formData.patientPhone}
                    onChange={(e) => setFormData({ ...formData, patientPhone: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700/30 focus:border-emerald-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Email Address (Optional)
                  </label>
                  <input
                    type="email"
                    placeholder="patient@example.com"
                    value={formData.patientEmail}
                    onChange={(e) => setFormData({ ...formData, patientEmail: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700/30 focus:border-emerald-700"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Required Medical Service *
                </label>
                <select
                  value={formData.serviceId}
                  onChange={(e) => setFormData({ ...formData, serviceId: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700/30 focus:border-emerald-700"
                >
                  {services.map((svc) => (
                    <option key={svc.id} value={svc.id}>
                      {svc.title} ({svc.category})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Preferred Date *
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      required
                      min={new Date().toISOString().split('T')[0]}
                      value={formData.preferredDate}
                      onChange={(e) => setFormData({ ...formData, preferredDate: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700/30 focus:border-emerald-700"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Preferred Time Slot *
                  </label>
                  <select
                    value={formData.preferredTime}
                    onChange={(e) => setFormData({ ...formData, preferredTime: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700/30 focus:border-emerald-700"
                  >
                    <option value="08:30 AM">08:30 AM (Morning)</option>
                    <option value="10:00 AM">10:00 AM (Morning)</option>
                    <option value="11:30 AM">11:30 AM (Mid-day)</option>
                    <option value="02:00 PM">02:00 PM (Afternoon)</option>
                    <option value="04:00 PM">04:00 PM (Evening)</option>
                    <option value="06:00 PM">06:00 PM (Evening)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Brief Medical Note or Symptoms (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Describe your health concern or symptoms..."
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700/30 focus:border-emerald-700"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-[#073832] hover:bg-emerald-900 text-white font-semibold rounded-xl text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Submitting Request...</span>
                    </>
                  ) : (
                    <>
                      <Calendar className="w-4 h-4 text-emerald-300" />
                      <span>Submit Appointment Request</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

