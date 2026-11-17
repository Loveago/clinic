'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { Award, CheckCircle2, Printer, XCircle, ArrowLeft, ShieldCheck } from 'lucide-react';

export default function AdmissionOfferLetterPage({ params }: { params: Promise<{ ref: string }> }) {
  const { ref } = use(params);
  const [app, setApp] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const loadOffer = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/school/track?ref=${encodeURIComponent(ref)}`);
      const data = await res.json();
      if (!res.ok) setError(data.error || 'Application not found');
      else setApp(data.application);
    } catch {
      setError('Failed to load admission offer letter.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOffer();
  }, [ref]);

  const handleDecision = async (action: 'accept_offer' | 'decline_offer') => {
    setBusy(true);
    try {
      const res = await fetch('/api/school/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ referenceNumber: ref, action }),
      });
      if (res.ok) await loadOffer();
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-slate-500">Loading Official Admission Offer Letter...</div>;
  }

  if (error || !app || !app.offer) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center space-y-4">
        <p className="text-slate-700 font-semibold">{error || 'No admission offer has been issued for this reference yet.'}</p>
        <Link href={`/school/track?ref=${encodeURIComponent(ref)}`} className="px-4 py-2 bg-[#073832] text-white rounded-xl text-xs font-bold">
          Return to Application Tracker
        </Link>
      </div>
    );
  }

  const offer = app.offer;

  return (
    <div className="min-h-screen bg-slate-100 py-8 px-4 print:bg-white print:p-0">
      <div className="max-w-3xl mx-auto mb-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href={`/school/track?ref=${encodeURIComponent(ref)}`} className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-emerald-800">
          <ArrowLeft className="w-4 h-4" /> Back to Application Status
        </Link>
        <div className="flex items-center gap-2">
          {offer.status === 'ISSUED' && (
            <>
              <button
                onClick={() => handleDecision('accept_offer')}
                disabled={busy}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-sm"
              >
                <CheckCircle2 className="w-4 h-4" /> Accept Offer
              </button>
              <button
                onClick={() => handleDecision('decline_offer')}
                disabled={busy}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-bold"
              >
                <XCircle className="w-4 h-4" /> Decline Offer
              </button>
            </>
          )}
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold"
          >
            <Printer className="w-4 h-4" /> Print / Save PDF
          </button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto bg-white rounded-3xl shadow-xl border border-slate-200 p-8 sm:p-12 space-y-8 print:shadow-none print:border-0 print:rounded-none">
        {/* Letterhead */}
        <div className="flex items-start justify-between border-b-2 border-[#073832] pb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#073832] text-emerald-300 flex items-center justify-center">
              <Award className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-xl font-black text-[#073832] tracking-tight">Action Health Nursing &amp; Midwifery Training College</h1>
              <p className="text-xs text-slate-500">Plot 14, Tema Michel Camp (Gbetsile Pure Oil), Greater Accra, Ghana · +233 30 278 4412</p>
              <p className="text-[11px] font-semibold text-emerald-700">Accredited by Nursing &amp; Midwifery Council (N&amp;MC) Ghana</p>
            </div>
          </div>
          <div className="text-right text-xs">
            <div className="font-bold text-slate-800">OFFER OF ADMISSION</div>
            <div className="font-mono text-emerald-700 font-bold mt-0.5">{offer.admissionReference}</div>
            <div className="text-slate-400 text-[11px] mt-0.5">Issued: {new Date(offer.issuedAt).toLocaleDateString('en-GH')}</div>
          </div>
        </div>

        {/* Status Banner */}
        <div className={`p-3.5 rounded-xl border text-xs font-bold flex items-center justify-between ${
          offer.status === 'ACCEPTED'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
            : offer.status === 'DECLINED'
            ? 'bg-red-50 border-red-200 text-red-800'
            : 'bg-amber-50 border-amber-200 text-amber-800'
        }`}>
          <span>Offer Status: {offer.status}</span>
          <span>Acceptance Deadline: {offer.acceptanceDeadline}</span>
        </div>

        {/* Body */}
        <div className="space-y-4 text-sm text-slate-700 leading-relaxed">
          <p className="font-bold text-slate-900">Dear {app.applicantName},</p>
          <p>
            Following the review of your application (Reference: <span className="font-mono font-bold">{app.referenceNumber}</span>),
            the Admissions Committee of <strong>Action Health Nursing &amp; Midwifery Training College</strong> is pleased to offer you
            provisional admission into the following academic programme:
          </p>

          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 grid sm:grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-slate-400 uppercase font-bold text-[10px] block">Programme Offered</span>
              <span className="font-extrabold text-slate-900 text-sm">{app.programme?.name}</span>
            </div>
            <div>
              <span className="text-slate-400 uppercase font-bold text-[10px] block">Academic Year &amp; Semester</span>
              <span className="font-bold text-slate-900">{offer.academicYear} · {offer.semester}</span>
            </div>
            <div>
              <span className="text-slate-400 uppercase font-bold text-[10px] block">Tuition Fee (Per Semester)</span>
              <span className="font-bold text-emerald-800">GH₵ {Number(app.programme?.fee || 0).toLocaleString('en-GH', { minimumFractionDigits: 2 })}</span>
            </div>
            <div>
              <span className="text-slate-400 uppercase font-bold text-[10px] block">Acceptance Deadline</span>
              <span className="font-bold text-slate-900">{offer.acceptanceDeadline}</span>
            </div>
          </div>

          <div>
            <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-1.5">Conditions of Admission</h3>
            <p className="text-xs text-slate-600 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              {offer.conditions || 'Satisfactory verification of original WASSCE/academic certificates, Ghana Card, and medical fitness clearance upon registration.'}
            </p>
          </div>

          <p className="text-xs text-slate-600">
            Please note that issuing this offer does not automatically complete your student registration. To secure your place,
            accept this offer online before <strong>{offer.acceptanceDeadline}</strong> and complete the enrolment &amp; fee registration checklist.
          </p>
        </div>

        {/* Signature Block */}
        <div className="pt-8 border-t border-slate-200 flex items-end justify-between text-xs">
          <div>
            <div className="w-40 border-b border-slate-400 mb-1.5 pb-1 font-serif italic text-slate-700">Dr. Kwame Boateng</div>
            <div className="font-bold text-slate-900">Academic Registrar</div>
            <div className="text-slate-500">Action Health Nursing &amp; Midwifery Training College</div>
          </div>
          <div className="flex items-center gap-1.5 text-emerald-800 font-bold">
            <ShieldCheck className="w-4 h-4" />
            <span>Official Verified Document</span>
          </div>
        </div>
      </div>
    </div>
  );
}

