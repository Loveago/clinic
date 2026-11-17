'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  FileText,
  CreditCard,
  CheckCircle,
  AlertCircle,
  Loader2,
  ArrowRight,
  ShieldCheck,
  Printer,
  GraduationCap,
} from 'lucide-react';
import SchoolNavbar from '@/components/SchoolNavbar';
import SchoolFooter from '@/components/SchoolFooter';

export default function OnlineAdmissionApplicationPage() {
  const [formData, setFormData] = useState({
    admissionPeriodId: '',
    applicantName: '',
    applicantEmail: '',
    applicantPhone: '',
    dateOfBirth: '2004-05-12',
    gender: 'Female',
    nationality: 'Ghanaian',
    address: '',
    ghanaPostGps: '',
    previousSchool: '',
    examGrades: '',
    programmeId: '',
  });

  const [programs, setPrograms] = useState<any[]>([]);
  const [periods, setPeriods] = useState<any[]>([]);
  const [uploadedDocs, setUploadedDocs] = useState<any[]>([]);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [loading, setLoading] = useState(false);
  const [successResult, setSuccessResult] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState('');

  React.useEffect(() => {
    Promise.all([
      fetch('/api/school/programs').then((res) => res.json()),
      fetch('/api/admin/admission-periods').then((res) => res.json()).catch(() => ({ periods: [] })),
    ])
      .then(([data, perData]) => {
        if (data.programs) {
          setPrograms(data.programs);
          if (data.programs.length > 0 && !formData.programmeId) {
            setFormData((prev) => ({ ...prev, programmeId: data.programs[0].id }));
          }
        }
        const openPeriods = (perData.periods || []).filter((p: any) => p.isActive);
        setPeriods(openPeriods);
        if (openPeriods.length > 0) {
          setFormData((prev) => ({ ...prev, admissionPeriodId: openPeriods[0].id }));
        }
      })
      .catch(() => {});
  }, []);

  const handleDocUpload = async (file: File, title: string) => {
    setUploadingDoc(true);
    setErrorMsg('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/school/upload-document', { method: 'POST', body: fd });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Document upload failed');
      setUploadedDocs((prev) => [...prev, { ...d, title, category: 'ACADEMIC' }]);
    } catch (err: any) {
      setErrorMsg(err.message || 'Document upload failed');
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/school/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, uploadedDocuments: uploadedDocs }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit application');
      }

      setSuccessResult(data);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit application');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f8faf9]">
      <SchoolNavbar />

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-12">
        {successResult ? (
          <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-200/90 shadow-xl text-center space-y-6">
            <div className="w-20 h-20 bg-emerald-100 text-emerald-800 rounded-full flex items-center justify-center mx-auto shadow-md ring-8 ring-emerald-50">
              <CheckCircle className="w-10 h-10" />
            </div>

            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-widest text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full">
                Application &amp; Form Payment Confirmed
              </span>
              <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                Application Submitted Successfully!
              </h1>
              <p className="text-slate-600 text-sm max-w-lg mx-auto leading-relaxed">
                Your admission application and form payment have been verified. Save your unique reference number below to track review status.
              </p>
            </div>

            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 max-w-md mx-auto text-left space-y-3 text-xs">
              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <span className="text-slate-500 font-medium">Application Reference:</span>
                <span className="font-mono text-base font-extrabold text-emerald-800">
                  {successResult.referenceNumber}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Applicant:</span>
                <span className="font-bold text-slate-900">{formData.applicantName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Academic Programme:</span>
                <span className="font-bold text-slate-900">
                  {successResult.application?.programme?.name || 'Nursing Programme'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Application Form Fee:</span>
                <span className="font-bold text-emerald-700">GH₵150.00 (Paid via Paystack)</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Status:</span>
                <span className="font-bold text-blue-700">SUBMITTED (Under Review)</span>
              </div>
            </div>

            <div className="pt-4 flex flex-wrap justify-center gap-4">
              <button
                onClick={() => window.print()}
                className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-full transition-colors flex items-center gap-2"
              >
                <Printer className="w-4 h-4" />
                <span>Print Application Slip</span>
              </button>
              <Link
                href={`/school/track?ref=${successResult.referenceNumber}`}
                className="px-6 py-3 bg-[#073832] hover:bg-emerald-900 text-white text-xs font-bold rounded-full transition-colors flex items-center gap-2"
              >
                <span>Track Admission Progress</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200/90 shadow-xl space-y-8">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full">
                Admissions Portal · 2025/2026 Academic Session
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#073832] mt-2">
                Online Admission Application Form
              </h1>
              <p className="text-slate-600 text-sm mt-1">
                Fill the applicant details below. Official application form fee of GH₵150.00 is processed securely on submission.
              </p>
            </div>

            {errorMsg && (
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Personal Information */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">
                  1. Personal &amp; Contact Information
                </h3>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Full Legal Name (as on credentials) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Babatunde Adeleke"
                    value={formData.applicantName}
                    onChange={(e) => setFormData({ ...formData, applicantName: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700/30"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="applicant@example.com"
                      value={formData.applicantEmail}
                      onChange={(e) => setFormData({ ...formData, applicantEmail: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700/30"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="+233 24 412 3456"
                      value={formData.applicantPhone}
                      onChange={(e) => setFormData({ ...formData, applicantPhone: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700/30"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Date of Birth *
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.dateOfBirth}
                      onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700/30"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Gender *
                    </label>
                    <select
                      value={formData.gender}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700/30"
                    >
                      <option value="Female">Female</option>
                      <option value="Male">Male</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Nationality *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.nationality}
                      onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700/30"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Residential Address *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Residential address in Ghana or abroad"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700/30"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      GhanaPost GPS Digital Address
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. GA-183-8164"
                      value={formData.ghanaPostGps}
                      onChange={(e) => setFormData({ ...formData, ghanaPostGps: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700/30"
                    />
                  </div>
                </div>
              </div>

              {/* Programme & Academic History */}
              <div className="space-y-4 pt-4 border-t border-slate-100">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">
                  2. Programme Selection &amp; Academic Background
                </h3>

                {periods.length > 0 && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Admission Period / Intake *
                    </label>
                    <select
                      value={formData.admissionPeriodId}
                      onChange={(e) => setFormData({ ...formData, admissionPeriodId: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700/30"
                    >
                      {periods.map((per) => (
                        <option key={per.id} value={per.id}>
                          {per.name} ({per.academicYear}) — Form Fee: GH₵{Number(per.applicationFeeGHS).toFixed(2)}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Desired Nursing Programme *
                  </label>
                  <select
                    value={formData.programmeId}
                    onChange={(e) => setFormData({ ...formData, programmeId: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700/30"
                  >
                    {programs.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.duration}) — Tuition: GH₵{p.fee?.toLocaleString()}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Document Upload */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2.5 text-xs">
                  <div className="font-bold text-slate-800">Supporting Documents (PDF, JPG, PNG · Max 10 MB)</div>
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="px-3 py-2 rounded-xl bg-white border border-slate-300 font-bold cursor-pointer hover:bg-slate-100">
                      {uploadingDoc ? 'Uploading...' : '+ Upload WASSCE / Ghana Card / Photo'}
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        className="hidden"
                        disabled={uploadingDoc}
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleDocUpload(f, f.name);
                          e.target.value = '';
                        }}
                      />
                    </label>
                    <span className="text-slate-500">{uploadedDocs.length} document(s) attached</span>
                  </div>
                  {uploadedDocs.length > 0 && (
                    <ul className="space-y-1 text-[11px] text-emerald-800 font-semibold">
                      {uploadedDocs.map((d, i) => (
                        <li key={i}>✓ {d.fileName || d.title} ({d.fileType})</li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Previous Institution Attended *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Achimota School / Wesley Girls High School"
                      value={formData.previousSchool}
                      onChange={(e) => setFormData({ ...formData, previousSchool: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700/30"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      WASSCE / SSCE Results Summary *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Core Math (A1), English (B2), Int. Science (A1)"
                      value={formData.examGrades}
                      onChange={(e) => setFormData({ ...formData, examGrades: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700/30"
                    />
                  </div>
                </div>
              </div>

              {/* Payment Section */}
              <div className="pt-4 border-t border-slate-100 space-y-3">
                <div className="bg-emerald-50/80 rounded-2xl p-4 border border-emerald-100 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-bold text-[#073832]">Application Form Fee</div>
                    <div className="text-slate-600">Includes credential verification, entrance CBT, and prospectus</div>
                  </div>
                  <div className="text-base font-extrabold text-[#073832]">GH₵150.00</div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 bg-[#073832] hover:bg-emerald-900 active:scale-95 text-white font-bold text-sm rounded-full shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Processing Application &amp; Payment...</span>
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-4 h-4 text-emerald-300" />
                      <span>Pay GH₵150.00 &amp; Submit Application (Paystack Ghana)</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </main>

      <SchoolFooter />
    </div>
  );
}

