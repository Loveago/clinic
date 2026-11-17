'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Search, CheckCircle, Clock, XCircle, ArrowRight, FileText, UserCheck, Loader2 } from 'lucide-react';
import SchoolNavbar from '@/components/SchoolNavbar';
import SchoolFooter from '@/components/SchoolFooter';

function TrackContent() {
  const searchParams = useSearchParams();
  const initialRef = searchParams.get('ref') || '';

  const [refInput, setRefInput] = useState(initialRef);
  const [application, setApplication] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const lookupApplication = async (ref: string) => {
    if (!ref.trim()) return;
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch(`/api/school/track?ref=${encodeURIComponent(ref.trim())}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Application reference not found.');
      }
      setApplication(data.application);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to find application.');
      setApplication(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialRef) {
      lookupApplication(initialRef);
    }
  }, [initialRef]);

  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <span className="text-xs font-bold uppercase tracking-widest text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full">
          Admissions Status Tracking
        </span>
        <h1 className="text-3xl font-extrabold text-[#073832]">
          Track Your Admission Application
        </h1>
        <p className="text-slate-600 text-sm max-w-md mx-auto">
          Enter your unique application reference number (e.g. <code>APP-2025-0104</code>) below.
        </p>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 sm:p-6 rounded-3xl border border-slate-200/90 shadow-lg max-w-xl mx-auto">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            lookupApplication(refInput);
          }}
          className="flex flex-col sm:flex-row gap-3"
        >
          <div className="relative flex-1">
            <Search className="w-5 h-5 text-slate-400 absolute left-4 top-3.5" />
            <input
              type="text"
              required
              placeholder="e.g. APP-2025-0104"
              value={refInput}
              onChange={(e) => setRefInput(e.target.value)}
              className="w-full pl-11 pr-4 py-3 rounded-2xl border border-slate-200 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-emerald-700/30"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="py-3 px-6 bg-[#073832] hover:bg-emerald-900 text-white text-xs font-bold rounded-2xl shadow-md transition-all flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search Status'}
          </button>
        </form>

        {errorMsg && (
          <p className="text-rose-600 text-xs mt-3 text-center font-medium">{errorMsg}</p>
        )}

        {/* Quick Demo Links */}
        {(process.env.NODE_ENV !== 'production' ||
          process.env.NEXT_PUBLIC_ALLOW_DEMO_LOGIN === 'true') && (
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-center gap-3 text-xs text-slate-500">
            <span>Try sample references:</span>
            <button
              type="button"
              onClick={() => {
                setRefInput('APP-2025-0104');
                lookupApplication('APP-2025-0104');
              }}
              className="font-mono text-emerald-800 font-bold hover:underline"
            >
              APP-2025-0104
            </button>
            <span>·</span>
            <button
              type="button"
              onClick={() => {
                setRefInput('APP-2025-0105');
                lookupApplication('APP-2025-0105');
              }}
              className="font-mono text-emerald-800 font-bold hover:underline"
            >
              APP-2025-0105
            </button>
          </div>
        )}
      </div>

      {/* Application Result Details */}
      {application && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-xl space-y-6 max-w-2xl mx-auto animate-in fade-in">
          <div className="flex items-start justify-between border-b border-slate-100 pb-4">
            <div>
              <span className="text-xs font-mono font-bold text-slate-400">
                {application.referenceNumber}
              </span>
              <h3 className="text-xl font-bold text-slate-900 mt-1">
                {application.applicantName}
              </h3>
              <p className="text-xs text-slate-500">{application.programme?.name}</p>
            </div>

            <div>
              {application.status === 'APPROVED' ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  <CheckCircle className="w-4 h-4" /> APPROVED
                </span>
              ) : application.status === 'UNDER_REVIEW' ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-amber-100 text-amber-800 border border-amber-300">
                  <Clock className="w-4 h-4" /> UNDER REVIEW
                </span>
              ) : application.status === 'ENROLLED' ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-blue-100 text-blue-800 border border-blue-300">
                  <UserCheck className="w-4 h-4" /> ENROLLED STUDENT
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-slate-100 text-slate-800 border border-slate-200">
                  {application.status}
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs text-slate-700">
            <div>
              <span className="text-slate-400 block font-semibold text-[10px] uppercase">Contact Phone</span>
              <span className="font-bold">{application.applicantPhone}</span>
            </div>
            <div>
              <span className="text-slate-400 block font-semibold text-[10px] uppercase">Email</span>
              <span className="font-bold">{application.applicantEmail}</span>
            </div>
            <div>
              <span className="text-slate-400 block font-semibold text-[10px] uppercase">Previous School</span>
              <span className="font-bold">{application.previousSchool}</span>
            </div>
            <div>
              <span className="text-slate-400 block font-semibold text-[10px] uppercase">WAEC / Results</span>
              <span className="font-bold">{application.examGrades}</span>
            </div>
          </div>

          {application.offer && (
            <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="font-extrabold text-emerald-900 text-sm">
                    Official Admission Offer Issued ({application.offer.admissionReference})
                  </div>
                  <p className="text-emerald-800 mt-0.5">
                    Status: <strong>{application.offer.status}</strong> · Acceptance Deadline: <strong>{application.offer.acceptanceDeadline}</strong>
                  </p>
                </div>
                <Link
                  href={`/school/offer/${application.referenceNumber}`}
                  className="px-4 py-2 rounded-xl bg-[#073832] text-white font-bold inline-flex items-center gap-1.5"
                >
                  <FileText className="w-3.5 h-3.5" /> View &amp; Respond to Offer Letter
                </Link>
              </div>
            </div>
          )}

          {/* Requested Additional Document Upload */}
          {application.status === 'AWAITING_DOCUMENTS' && (
            <div className="p-4 rounded-2xl bg-orange-50 border border-orange-200 text-xs space-y-2">
              <div className="font-bold text-orange-900">Additional Document Requested</div>
              <p className="text-orange-800">Please upload the requested PDF, JPG, or PNG document below to resume review.</p>
              <label className="inline-block px-3.5 py-2 rounded-xl bg-orange-600 text-white font-bold cursor-pointer">
                Upload Requested Document
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  className="hidden"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    const fd = new FormData();
                    fd.append('file', f);
                    const up = await fetch('/api/school/upload-document', { method: 'POST', body: fd });
                    const upData = await up.json();
                    if (up.ok) {
                      await fetch('/api/school/track', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          referenceNumber: application.referenceNumber,
                          action: 'upload_document',
                          title: f.name,
                          ...upData,
                        }),
                      });
                      lookupApplication(application.referenceNumber);
                    }
                  }}
                />
              </label>
            </div>
          )}

          {/* Application Progress Timeline */}
          {application.reviews && application.reviews.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Application Timeline</h4>
              <div className="space-y-2">
                {application.reviews.map((rev: any) => (
                  <div key={rev.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 text-xs flex items-start justify-between gap-3">
                    <div>
                      <div className="font-bold text-slate-800">{rev.newStatus}</div>
                      {rev.reason && <p className="text-slate-600 mt-0.5">{rev.reason}</p>}
                    </div>
                    <span className="text-[10px] text-slate-400 shrink-0">{new Date(rev.createdAt).toLocaleDateString('en-GH')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(application.status === 'APPROVED' || application.status === 'REGISTERED' || application.status === 'ENROLLED') && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs space-y-2">
              <div className="font-bold text-emerald-900 text-sm">
                Welcome to Action Health Nursing &amp; Midwifery Training College!
              </div>
              <div className="pt-1">
                <Link
                  href="/portal/student/dashboard"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-900 underline"
                >
                  <span>Proceed to Student Portal</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ApplicationTrackingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#f8faf9]">
      <SchoolNavbar />
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-12 space-y-8">
        <Suspense fallback={<div className="text-center py-12 text-slate-500">Loading tracker...</div>}>
          <TrackContent />
        </Suspense>
      </main>
      <SchoolFooter />
    </div>
  );
}
