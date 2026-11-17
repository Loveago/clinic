'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Calendar,
  FileText,
  Pill,
  FlaskConical,
  CreditCard,
  User,
  CheckCircle2,
  AlertTriangle,
  Plus,
  RefreshCw,
} from 'lucide-react';

export default function PatientSelfPortalPage() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'overview' | 'appointments' | 'prescriptions' | 'labs' | 'billing' | 'profile'>('overview');
  const [toast, setToast] = useState<string | null>(null);
  const [apptForm, setApptForm] = useState({ serviceId: '', preferredDate: '', preferredTime: '09:00', reason: '' });
  const [contactForm, setContactForm] = useState({ phone: '', address: '', emergencyName: '', emergencyPhone: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const meRes = await fetch('/api/auth/me');
      if (meRes.status === 401 || meRes.status === 403) {
        router.replace('/auth/login');
        return;
      }
      const meData = await meRes.json();
      if (!meData?.user) {
        router.replace('/auth/login');
        return;
      }

      const res = await fetch('/api/clinic/patient-portal');
      if (res.status === 401 || res.status === 403) {
        router.replace('/auth/login');
        return;
      }
      if (res.ok) {
        const json = await res.json();
        setData(json);
        if (json.patient) {
          setContactForm({
            phone: json.patient.phone || '',
            address: json.patient.address || '',
            emergencyName: json.patient.emergencyName || '',
            emergencyPhone: json.patient.emergencyPhone || '',
          });
        }
        setAuthChecked(true);
      }
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  const handleRequestAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/clinic/patient-portal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(apptForm),
    });
    if (res.ok) {
      setToast('Appointment request submitted.');
      setApptForm({ serviceId: '', preferredDate: '', preferredTime: '09:00', reason: '' });
      await load();
    }
  };

  const handleUpdateContact = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/clinic/patient-portal', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(contactForm),
    });
    if (res.ok) {
      setToast('Contact details updated.');
      await load();
    }
  };

  const handlePaystackPay = async (invoice: any) => {
    const res = await fetch('/api/payments/paystack/initialize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clinicInvoiceId: invoice.id, amount: invoice.balance }),
    });
    const json = await res.json();
    if (json.authorization_url) {
      window.location.href = json.authorization_url;
    } else {
      setToast(json.message || 'Paystack initialized.');
    }
  };

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-2 border-[#073832] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-semibold text-slate-500">Verifying patient session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="bg-[#073832] text-white px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-extrabold">Action Boat Medical Centre — Patient Portal</h1>
          <p className="text-xs text-emerald-200/80">
            {data?.patient ? `${data.patient.fullName} · ${data.patient.patientNumber}` : 'Personal Medical & Billing Access'}
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <Link href="/" className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 font-semibold">
            Clinic Home
          </Link>
          <button onClick={load} className="p-2 rounded-xl bg-white/10 hover:bg-white/20">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </header>

      {toast && (
        <div className="max-w-5xl mx-auto mt-4 px-4">
          <div className="bg-emerald-900 text-emerald-100 px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{toast}</span>
          </div>
        </div>
      )}

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        <div className="flex gap-2 overflow-x-auto pb-1 text-xs font-bold">
          {[
            { id: 'overview', label: 'Overview', icon: FileText },
            { id: 'appointments', label: 'Appointments', icon: Calendar },
            { id: 'prescriptions', label: 'Prescriptions', icon: Pill },
            { id: 'labs', label: 'Released Lab Results', icon: FlaskConical },
            { id: 'billing', label: 'Invoices & Payments', icon: CreditCard },
            { id: 'profile', label: 'Contact Details', icon: User },
          ].map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id as any)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl whitespace-nowrap ${
                  tab === t.id ? 'bg-[#073832] text-white' : 'bg-white border border-slate-200 text-slate-700'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {!data?.patient && !loading ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-xs text-slate-500">
            <AlertTriangle className="w-6 h-6 text-amber-600 mx-auto mb-2" />
            No patient profile is linked to your current session.
          </div>
        ) : (
          <>
            {tab === 'overview' && (
              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-white rounded-2xl border p-4"><div className="text-slate-500 font-bold">Appointments</div><div className="text-xl font-extrabold text-[#073832]">{data?.appointments?.length || 0}</div></div>
                  <div className="bg-white rounded-2xl border p-4"><div className="text-slate-500 font-bold">Consultations</div><div className="text-xl font-extrabold text-[#073832]">{data?.consultations?.length || 0}</div></div>
                  <div className="bg-white rounded-2xl border p-4"><div className="text-slate-500 font-bold">Prescriptions</div><div className="text-xl font-extrabold text-[#073832]">{data?.prescriptions?.length || 0}</div></div>
                  <div className="bg-white rounded-2xl border p-4"><div className="text-slate-500 font-bold">Released Labs</div><div className="text-xl font-extrabold text-[#073832]">{data?.labResults?.length || 0}</div></div>
                </div>
                <div className="bg-white rounded-2xl border p-5 space-y-2">
                  <div className="font-extrabold text-sm text-[#073832]">Consultation Summaries</div>
                  {data?.consultations?.length === 0 ? (
                    <div className="text-slate-400">No completed consultation summaries yet.</div>
                  ) : (
                    data?.consultations?.map((c: any) => (
                      <div key={c.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                        <div className="font-bold">{c.consultationNumber} — {c.chiefComplaint}</div>
                        <div className="text-slate-600">Plan: {c.treatmentPlan || 'See clinician notes'}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {tab === 'appointments' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                <form onSubmit={handleRequestAppointment} className="bg-white rounded-2xl border p-5 space-y-3">
                  <h3 className="font-extrabold text-sm text-[#073832]">Request Appointment</h3>
                  <select value={apptForm.serviceId} onChange={(e) => setApptForm({ ...apptForm, serviceId: e.target.value })} className="w-full px-3 py-2 border rounded-xl bg-white">
                    <option value="">Select Service</option>
                    {data?.services?.map((s: any) => <option key={s.id} value={s.id}>{s.title} (GH₵{s.feeGHS})</option>)}
                  </select>
                  <div className="grid grid-cols-2 gap-2">
                    <input type="date" required value={apptForm.preferredDate} onChange={(e) => setApptForm({ ...apptForm, preferredDate: e.target.value })} className="px-3 py-2 border rounded-xl" />
                    <input type="time" required value={apptForm.preferredTime} onChange={(e) => setApptForm({ ...apptForm, preferredTime: e.target.value })} className="px-3 py-2 border rounded-xl" />
                  </div>
                  <input placeholder="Reason" value={apptForm.reason} onChange={(e) => setApptForm({ ...apptForm, reason: e.target.value })} className="w-full px-3 py-2 border rounded-xl" />
                  <button type="submit" className="w-full py-2.5 rounded-xl bg-[#073832] text-white font-bold inline-flex items-center justify-center gap-1">
                    <Plus className="w-4 h-4" />
                    <span>Submit Request</span>
                  </button>
                </form>

                <div className="bg-white rounded-2xl border p-5 space-y-2">
                  <h3 className="font-extrabold text-sm text-[#073832]">My Appointments</h3>
                  {data?.appointments?.map((a: any) => (
                    <div key={a.id} className="p-3 rounded-xl border border-slate-100 flex justify-between">
                      <div>
                        <div className="font-bold">{a.service?.title || 'Clinic Visit'}</div>
                        <div className="text-slate-500">{a.preferredDate} · {a.preferredTime}</div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 font-bold text-[10px] h-fit">{a.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tab === 'prescriptions' && (
              <div className="bg-white rounded-2xl border p-5 space-y-3 text-xs">
                <h3 className="font-extrabold text-sm text-[#073832]">Issued Prescriptions</h3>
                {data?.prescriptions?.map((rx: any) => (
                  <div key={rx.id} className="p-3 rounded-xl border border-slate-100">
                    <div className="font-bold">{rx.prescriptionNumber} ({rx.status})</div>
                    <div className="text-slate-600 mt-1">
                      {rx.items?.map((i: any) => `${i.medicineName} — ${i.dosage} ${i.frequency} for ${i.duration}`).join(' | ')}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {tab === 'labs' && (
              <div className="bg-white rounded-2xl border p-5 space-y-3 text-xs">
                <h3 className="font-extrabold text-sm text-[#073832]">Released Laboratory Results</h3>
                {data?.labResults?.length === 0 ? (
                  <div className="text-slate-400">No released laboratory results yet.</div>
                ) : (
                  data?.labResults?.map((r: any) => (
                    <div key={r.id} className="p-3 rounded-xl border border-slate-100">
                      <div className="font-bold">{r.test?.name} ({r.requestNumber})</div>
                      <div className="text-emerald-800 font-bold mt-1">
                        Result: {r.result?.resultValue} {r.result?.unit} (Ref: {r.result?.referenceRange || 'N/A'}) — {r.result?.flag}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {tab === 'billing' && (
              <div className="bg-white rounded-2xl border p-5 space-y-3 text-xs">
                <h3 className="font-extrabold text-sm text-[#073832]">My Clinic Invoices (GH₵)</h3>
                {data?.invoices?.map((inv: any) => (
                  <div key={inv.id} className="p-3 rounded-xl border border-slate-100 flex flex-wrap justify-between items-center gap-2">
                    <div>
                      <div className="font-bold">{inv.invoiceNumber} — {inv.title}</div>
                      <div className="text-slate-500">Total: GH₵{inv.totalAmount.toFixed(2)} · Paid: GH₵{inv.amountPaid.toFixed(2)} · Balance: GH₵{inv.balance.toFixed(2)}</div>
                    </div>
                    {inv.balance > 0 ? (
                      <button
                        onClick={() => handlePaystackPay(inv)}
                        className="px-3 py-1.5 rounded-xl bg-[#073832] text-white font-bold"
                      >
                        Pay GH₵{inv.balance.toFixed(2)} via Paystack
                      </button>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">PAID</span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {tab === 'profile' && (
              <form onSubmit={handleUpdateContact} className="bg-white rounded-2xl border p-5 space-y-3 max-w-lg text-xs">
                <h3 className="font-extrabold text-sm text-[#073832]">Update Permitted Contact Details</h3>
                <input placeholder="Phone (+233)" value={contactForm.phone} onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })} className="w-full px-3 py-2 border rounded-xl" />
                <input placeholder="Residential Address" value={contactForm.address} onChange={(e) => setContactForm({ ...contactForm, address: e.target.value })} className="w-full px-3 py-2 border rounded-xl" />
                <input placeholder="Emergency Contact Name" value={contactForm.emergencyName} onChange={(e) => setContactForm({ ...contactForm, emergencyName: e.target.value })} className="w-full px-3 py-2 border rounded-xl" />
                <input placeholder="Emergency Contact Phone" value={contactForm.emergencyPhone} onChange={(e) => setContactForm({ ...contactForm, emergencyPhone: e.target.value })} className="w-full px-3 py-2 border rounded-xl" />
                <button type="submit" className="px-4 py-2.5 rounded-xl bg-[#073832] text-white font-bold">Save Contact Info</button>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}
