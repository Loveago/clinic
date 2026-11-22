'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  ClipboardList,
  CreditCard,
  FileText,
  FlaskConical,
  HeartPulse,
  History,
  Pill,
  Plus,
  RefreshCw,
  ShieldCheck,
  Stethoscope,
  Syringe,
  UserCheck,
  X,
} from 'lucide-react';

interface PatientEmrWorkspaceProps {
  patientId: string;
  onClose: () => void;
  onQuickAction?: (action: 'queue' | 'triage' | 'consult' | 'invoice', patient: any) => void;
}

type EmrTab =
  | 'overview'
  | 'timeline'
  | 'allergies'
  | 'triage'
  | 'encounters'
  | 'prescriptions'
  | 'diagnostics'
  | 'billing'
  | 'consent';

export default function PatientEmrWorkspace({
  patientId,
  onClose,
  onQuickAction,
}: PatientEmrWorkspaceProps) {
  const [tab, setTab] = useState<EmrTab>('overview');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [data, setData] = useState<any>(null);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // Forms inside EMR
  const [allergyForm, setAllergyForm] = useState({
    substance: '',
    category: 'MEDICATION',
    reaction: '',
    severity: 'MODERATE',
  });
  const [historyForm, setHistoryForm] = useState({
    category: 'CHRONIC',
    condition: '',
    diagnosedDate: '',
    notes: '',
  });
  const [immunizationForm, setImmunizationForm] = useState({
    vaccineName: '',
    dose: '',
    administeredDate: new Date().toISOString().slice(0, 10),
    batchNumber: '',
  });
  const [nursingNoteForm, setNursingNoteForm] = useState({
    noteType: 'OBSERVATION',
    content: '',
  });
  const [consentForm, setConsentForm] = useState({
    consentType: 'GENERAL_TREATMENT',
    notes: '',
  });
  const [referralForm, setReferralForm] = useState({
    direction: 'INTERNAL',
    receivingFacility: '',
    receivingDepartment: '',
    reason: '',
    urgency: 'ROUTINE',
  });

  const loadEmr = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/clinic/emr?patientId=${encodeURIComponent(patientId)}`);
      const d = await res.json();
      if (res.ok) setData(d);
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    loadEmr();
  }, [loadEmr]);

  const submitEmr = async (url: string, payload: Record<string, unknown>, successText: string) => {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Operation failed');
      setMsg({ type: 'ok', text: successText });
      await loadEmr();
      return true;
    } catch (e: any) {
      setMsg({ type: 'err', text: e.message || 'Operation failed' });
      return false;
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-sm text-slate-500">
        Loading longitudinal patient medical record...
      </div>
    );
  }

  const p = data?.patient;
  if (!p) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
        <p className="text-sm text-rose-600 font-semibold">Patient record not found.</p>
        <button onClick={onClose} className="mt-4 px-4 py-2 rounded-lg bg-slate-900 text-white text-xs font-semibold">
          Back to Directory
        </button>
      </div>
    );
  }

  const activeAllergies = (p.allergyRecords || []).filter((a: any) => a.status === 'ACTIVE');
  const latestConsult = (p.consultations || [])[0];
  const latestVitals = latestConsult?.vitals || (p.triageRecords || [])[0];
  const outstandingBalance = (p.invoices || []).reduce((s: number, inv: any) => s + (inv.balance || 0), 0);

  const tabs: Array<{ key: EmrTab; label: string }> = [
    { key: 'overview', label: 'Overview' },
    { key: 'timeline', label: `Timeline (${data.timeline?.length || 0})` },
    { key: 'allergies', label: `Allergies & History (${activeAllergies.length})` },
    { key: 'triage', label: `Triage & Nursing (${(p.triageRecords?.length || 0) + (p.nursingNotes?.length || 0)})` },
    { key: 'encounters', label: `Encounters (${p.consultations?.length || 0})` },
    { key: 'prescriptions', label: `Prescriptions (${p.prescriptions?.length || 0})` },
    { key: 'diagnostics', label: `Lab, Imaging & Proc (${(p.labRequests?.length || 0) + (p.imagingRequests?.length || 0) + (p.procedureRecords?.length || 0)})` },
    { key: 'billing', label: `Referrals & Billing (${p.invoices?.length || 0})` },
    { key: 'consent', label: `Consent, Docs & Audit` },
  ];

  return (
    <div className="space-y-4">
      {/* Top Bar */}
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Patient Directory
        </button>
        <button
          type="button"
          onClick={loadEmr}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:bg-slate-50"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh EMR
        </button>
      </div>

      {msg && (
        <div
          className={`px-4 py-2.5 rounded-xl border text-xs font-semibold flex items-center justify-between ${
            msg.type === 'ok'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <span>{msg.text}</span>
          <button onClick={() => setMsg(null)}>
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Persistent Patient Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-teal-600 text-white flex items-center justify-center text-lg font-bold shrink-0">
              {p.fullName
                .split(' ')
                .slice(0, 2)
                .map((s: string) => s[0])
                .join('')
                .toUpperCase()}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">{p.fullName}</h2>
                <span className="px-2 py-0.5 rounded-md bg-teal-50 text-teal-800 border border-teal-200 text-xs font-mono font-semibold">
                  {p.patientNumber}
                </span>
                <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-xs font-semibold">
                  {p.status}
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1">
                {p.gender} • DOB: {p.dateOfBirth || 'Not recorded'} • Phone: {p.phone}
                {p.bloodGroup ? ` • Blood Group: ${p.bloodGroup}` : ''}
                {p.ghanaCardNumber ? ` • Ghana Card: ${p.ghanaCardNumber}` : ''}
              </p>
            </div>
          </div>

          {onQuickAction && (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onQuickAction('queue', p)}
                className="px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800"
              >
                + Check In
              </button>
              <button
                type="button"
                onClick={() => onQuickAction('triage', p)}
                className="px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-semibold hover:bg-amber-700"
              >
                + Triage
              </button>
              <button
                type="button"
                onClick={() => onQuickAction('consult', p)}
                className="px-3 py-1.5 rounded-lg bg-teal-600 text-white text-xs font-semibold hover:bg-teal-700"
              >
                + New Encounter
              </button>
              <button
                type="button"
                onClick={() => onQuickAction('invoice', p)}
                className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-800 text-xs font-semibold hover:bg-slate-50"
              >
                + Invoice
              </button>
            </div>
          )}
        </div>

        {/* Prominent Allergy Alert */}
        {(activeAllergies.length > 0 || p.allergies) && (
          <div className="rounded-xl bg-rose-50 border border-rose-200 px-4 py-2.5 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="text-xs text-rose-900">
              <span className="font-bold">ALLERGY ALERT: </span>
              {activeAllergies.length > 0
                ? activeAllergies
                    .map((a: any) => `${a.substance} (${a.severity}${a.reaction ? ` — ${a.reaction}` : ''})`)
                    .join(' | ')
                : p.allergies}
            </div>
          </div>
        )}

        {/* Quick Vitals & Balance Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-1">
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-2.5">
            <p className="text-[10px] font-bold uppercase text-slate-500">Latest BP</p>
            <p className="text-sm font-bold text-slate-900 mt-0.5">
              {latestVitals?.bpSystolic ? `${latestVitals.bpSystolic}/${latestVitals.bpDiastolic} mmHg` : '—'}
            </p>
          </div>
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-2.5">
            <p className="text-[10px] font-bold uppercase text-slate-500">Temp / Pulse</p>
            <p className="text-sm font-bold text-slate-900 mt-0.5">
              {latestVitals?.temperatureC ? `${latestVitals.temperatureC}°C` : '—'}
              {latestVitals?.pulseBpm ? ` / ${latestVitals.pulseBpm} bpm` : ''}
            </p>
          </div>
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-2.5">
            <p className="text-[10px] font-bold uppercase text-slate-500">BMI</p>
            <p className="text-sm font-bold text-slate-900 mt-0.5">
              {latestVitals?.bmi ? `${latestVitals.bmi} kg/m²` : '—'}
            </p>
          </div>
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-2.5">
            <p className="text-[10px] font-bold uppercase text-slate-500">Last Encounter</p>
            <p className="text-sm font-bold text-slate-900 mt-0.5">
              {latestConsult ? new Date(latestConsult.startedAt).toLocaleDateString() : 'None'}
            </p>
          </div>
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-2.5">
            <p className="text-[10px] font-bold uppercase text-slate-500">Outstanding Bill</p>
            <p className={`text-sm font-bold mt-0.5 ${outstandingBalance > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
              GH₵{outstandingBalance.toFixed(2)}
            </p>
          </div>
        </div>

        {/* EMR Tabs */}
        <div className="flex gap-1.5 overflow-x-auto pt-2 border-t border-slate-100">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                tab === t.key
                  ? 'bg-teal-600 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {tab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-teal-600" />
              Demographics & Contact
            </h3>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div><span className="text-slate-500">Marital Status:</span> <span className="font-semibold">{p.maritalStatus || '—'}</span></div>
              <div><span className="text-slate-500">Nationality:</span> <span className="font-semibold">{p.nationality || 'Ghanaian'}</span></div>
              <div><span className="text-slate-500">Language:</span> <span className="font-semibold">{p.preferredLanguage || 'English'}</span></div>
              <div><span className="text-slate-500">Occupation:</span> <span className="font-semibold">{p.occupation || '—'}</span></div>
              <div><span className="text-slate-500">Address:</span> <span className="font-semibold">{p.address || '—'}</span></div>
              <div><span className="text-slate-500">City / Region:</span> <span className="font-semibold">{[p.townCity, p.region].filter(Boolean).join(', ') || '—'}</span></div>
              <div><span className="text-slate-500">GhanaPost GPS:</span> <span className="font-semibold">{p.ghanaPostGps || '—'}</span></div>
              <div><span className="text-slate-500">Email:</span> <span className="font-semibold">{p.email || '—'}</span></div>
            </div>
            <div className="pt-3 border-t border-slate-100 text-xs">
              <p className="font-bold text-slate-700 mb-1">Emergency Contact & Next of Kin</p>
              <p className="text-slate-600">
                Emergency: {p.emergencyName || '—'} ({p.emergencyRelation || '—'}) • {p.emergencyPhone || '—'}
              </p>
              <p className="text-slate-600 mt-0.5">
                Next of Kin: {p.nextOfKinName || '—'} ({p.nextOfKinRelation || '—'}) • {p.nextOfKinPhone || '—'}
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-teal-600" />
              Insurance & Clinical Summary
            </h3>
            {(p.insurances || []).length === 0 ? (
              <p className="text-xs text-slate-500">No insurance policy recorded (Cash / Self-Pay).</p>
            ) : (
              <div className="space-y-2">
                {p.insurances.map((ins: any) => (
                  <div key={ins.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs flex justify-between">
                    <div>
                      <p className="font-bold text-slate-900">{ins.provider?.name}</p>
                      <p className="text-slate-600">Member #: {ins.membershipNumber} • {ins.coverageType}</p>
                    </div>
                    <span className="px-2 py-0.5 h-fit rounded bg-emerald-100 text-emerald-800 font-semibold">
                      {ins.verificationStatus}
                    </span>
                  </div>
                ))}
              </div>
            )}
            <div className="pt-3 border-t border-slate-100 text-xs space-y-1">
              <p className="font-bold text-slate-700">Active Diagnoses</p>
              {(p.diagnoses || []).slice(0, 5).map((d: any) => (
                <p key={d.id} className="text-slate-700">
                  • {d.code ? `[${d.code}] ` : ''}{d.title} ({d.diagnosisType})
                </p>
              ))}
              {(p.diagnoses || []).length === 0 && <p className="text-slate-500">No diagnoses recorded yet.</p>}
            </div>
          </div>
        </div>
      )}

      {tab === 'timeline' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
            <History className="w-4 h-4 text-teal-600" />
            Chronological Clinical Timeline
          </h3>
          <div className="space-y-3">
            {(data.timeline || []).map((ev: any) => (
              <div key={ev.id} className="flex items-start gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50/60">
                <span className="px-2 py-0.5 rounded bg-teal-50 text-teal-800 border border-teal-200 text-[10px] font-bold shrink-0">
                  {ev.type}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-900">{ev.title}</p>
                  <p className="text-xs text-slate-600">{ev.subtitle}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[11px] text-slate-500">{new Date(ev.date).toLocaleString()}</p>
                  {ev.status && <span className="text-[10px] font-semibold text-slate-700">{ev.status}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'allergies' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Allergies */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              Allergy Management
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <input
                placeholder="Substance (e.g. Penicillin)"
                value={allergyForm.substance}
                onChange={(e) => setAllergyForm({ ...allergyForm, substance: e.target.value })}
                className="px-3 py-2 rounded-lg border border-slate-200 text-xs"
              />
              <select
                value={allergyForm.category}
                onChange={(e) => setAllergyForm({ ...allergyForm, category: e.target.value })}
                className="px-3 py-2 rounded-lg border border-slate-200 text-xs"
              >
                <option value="MEDICATION">Medication</option>
                <option value="FOOD">Food</option>
                <option value="ENVIRONMENTAL">Environmental</option>
                <option value="OTHER">Other</option>
              </select>
              <input
                placeholder="Reaction (e.g. Rash, Anaphylaxis)"
                value={allergyForm.reaction}
                onChange={(e) => setAllergyForm({ ...allergyForm, reaction: e.target.value })}
                className="px-3 py-2 rounded-lg border border-slate-200 text-xs"
              />
              <select
                value={allergyForm.severity}
                onChange={(e) => setAllergyForm({ ...allergyForm, severity: e.target.value })}
                className="px-3 py-2 rounded-lg border border-slate-200 text-xs"
              >
                <option value="MILD">Mild</option>
                <option value="MODERATE">Moderate</option>
                <option value="SEVERE">Severe</option>
                <option value="LIFE_THREATENING">Life Threatening</option>
              </select>
            </div>
            <button
              type="button"
              disabled={busy || !allergyForm.substance.trim()}
              onClick={async () => {
                const ok = await submitEmr('/api/clinic/emr', { action: 'add_allergy', patientId, ...allergyForm }, 'Allergy recorded.');
                if (ok) setAllergyForm({ substance: '', category: 'MEDICATION', reaction: '', severity: 'MODERATE' });
              }}
              className="px-3 py-2 rounded-lg bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 disabled:opacity-50"
            >
              + Record Allergy
            </button>
            <div className="space-y-2 pt-2">
              {(p.allergyRecords || []).map((a: any) => (
                <div key={a.id} className="p-2.5 rounded-lg border border-slate-200 text-xs flex justify-between items-center">
                  <div>
                    <p className="font-bold text-slate-900">{a.substance} ({a.severity})</p>
                    <p className="text-slate-500">{a.category} • {a.reaction || 'No reaction specified'} • {a.status}</p>
                  </div>
                  {a.status === 'ACTIVE' && (
                    <button
                      type="button"
                      onClick={() => submitEmr('/api/clinic/emr', { action: 'update_allergy', patientId, id: a.id, status: 'RESOLVED' }, 'Allergy marked resolved.')}
                      className="px-2 py-1 rounded border border-slate-300 text-[11px] font-semibold hover:bg-slate-50"
                    >
                      Resolve
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Medical History & Immunizations */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
              <h3 className="text-sm font-bold text-slate-900">Medical, Surgical & Family History</h3>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={historyForm.category}
                  onChange={(e) => setHistoryForm({ ...historyForm, category: e.target.value })}
                  className="px-3 py-2 rounded-lg border border-slate-200 text-xs"
                >
                  <option value="CHRONIC">Chronic Disease</option>
                  <option value="PAST_MEDICAL">Past Medical</option>
                  <option value="SURGICAL">Surgical History</option>
                  <option value="HOSPITALIZATION">Hospitalization</option>
                  <option value="FAMILY">Family History</option>
                  <option value="SOCIAL">Social / Lifestyle</option>
                </select>
                <input
                  placeholder="Condition / Procedure"
                  value={historyForm.condition}
                  onChange={(e) => setHistoryForm({ ...historyForm, condition: e.target.value })}
                  className="px-3 py-2 rounded-lg border border-slate-200 text-xs"
                />
              </div>
              <button
                type="button"
                disabled={busy || !historyForm.condition.trim()}
                onClick={async () => {
                  const ok = await submitEmr('/api/clinic/emr', { action: 'add_medical_history', patientId, ...historyForm }, 'Medical history added.');
                  if (ok) setHistoryForm({ category: 'CHRONIC', condition: '', diagnosedDate: '', notes: '' });
                }}
                className="px-3 py-2 rounded-lg bg-teal-600 text-white text-xs font-semibold hover:bg-teal-700 disabled:opacity-50"
              >
                + Add History Entry
              </button>
              <div className="space-y-1.5">
                {(p.medicalHistoryRecords || []).map((h: any) => (
                  <div key={h.id} className="p-2 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                    <span className="font-bold text-teal-800">[{h.category}]</span> {h.condition}
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Syringe className="w-4 h-4 text-teal-600" />
                Immunization History
              </h3>
              <div className="grid grid-cols-3 gap-2">
                <input
                  placeholder="Vaccine Name"
                  value={immunizationForm.vaccineName}
                  onChange={(e) => setImmunizationForm({ ...immunizationForm, vaccineName: e.target.value })}
                  className="px-3 py-2 rounded-lg border border-slate-200 text-xs"
                />
                <input
                  placeholder="Dose (e.g. 1st Dose)"
                  value={immunizationForm.dose}
                  onChange={(e) => setImmunizationForm({ ...immunizationForm, dose: e.target.value })}
                  className="px-3 py-2 rounded-lg border border-slate-200 text-xs"
                />
                <input
                  type="date"
                  value={immunizationForm.administeredDate}
                  onChange={(e) => setImmunizationForm({ ...immunizationForm, administeredDate: e.target.value })}
                  className="px-3 py-2 rounded-lg border border-slate-200 text-xs"
                />
              </div>
              <button
                type="button"
                disabled={busy || !immunizationForm.vaccineName.trim()}
                onClick={async () => {
                  const ok = await submitEmr('/api/clinic/emr', { action: 'add_immunization', patientId, ...immunizationForm }, 'Immunization recorded.');
                  if (ok) setImmunizationForm({ vaccineName: '', dose: '', administeredDate: new Date().toISOString().slice(0, 10), batchNumber: '' });
                }}
                className="px-3 py-2 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 disabled:opacity-50"
              >
                + Record Immunization
              </button>
              <div className="space-y-1.5">
                {(p.immunizations || []).map((im: any) => (
                  <div key={im.id} className="p-2 rounded-lg bg-slate-50 border border-slate-200 text-xs flex justify-between">
                    <span className="font-semibold">{im.vaccineName} {im.dose ? `(${im.dose})` : ''}</span>
                    <span className="text-slate-500">{im.administeredDate}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'triage' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <HeartPulse className="w-4 h-4 text-teal-600" />
              Triage Assessments
            </h3>
            {(p.triageRecords || []).length === 0 ? (
              <p className="text-xs text-slate-500">No triage assessments recorded.</p>
            ) : (
              p.triageRecords.map((t: any) => (
                <div key={t.id} className="p-3 rounded-xl border border-slate-200 text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="font-bold text-slate-900">{t.triageCategory} — {t.chiefComplaint}</span>
                    <span className="text-slate-500">{new Date(t.triagedAt).toLocaleString()}</span>
                  </div>
                  <p className="text-slate-600">
                    BP: {t.bpSystolic || '—'}/{t.bpDiastolic || '—'} • Temp: {t.temperatureC || '—'}°C • Pulse: {t.pulseBpm || '—'} • SpO2: {t.spo2Percent || '—'}% • Pain: {t.painScore ?? '—'}/10
                  </p>
                  <p className="text-slate-500">By: {t.nurseName || 'Nurse'}</p>
                </div>
              ))
            )}
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
            <h3 className="text-sm font-bold text-slate-900">Nursing Notes</h3>
            <div className="flex gap-2">
              <select
                value={nursingNoteForm.noteType}
                onChange={(e) => setNursingNoteForm({ ...nursingNoteForm, noteType: e.target.value })}
                className="px-3 py-2 rounded-lg border border-slate-200 text-xs"
              >
                <option value="OBSERVATION">Observation</option>
                <option value="ASSESSMENT">Assessment</option>
                <option value="CARE_PLAN">Care Plan</option>
                <option value="WOUND_CARE">Wound Care</option>
                <option value="HANDOVER">Handover</option>
              </select>
              <input
                placeholder="Enter nursing note..."
                value={nursingNoteForm.content}
                onChange={(e) => setNursingNoteForm({ ...nursingNoteForm, content: e.target.value })}
                className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-xs"
              />
              <button
                type="button"
                disabled={busy || !nursingNoteForm.content.trim()}
                onClick={async () => {
                  const ok = await submitEmr('/api/clinic/triage', { action: 'add_nursing_note', patientId, ...nursingNoteForm }, 'Nursing note saved.');
                  if (ok) setNursingNoteForm({ noteType: 'OBSERVATION', content: '' });
                }}
                className="px-3 py-2 rounded-lg bg-teal-600 text-white text-xs font-semibold"
              >
                Save
              </button>
            </div>
            <div className="space-y-2">
              {(p.nursingNotes || []).map((n: any) => (
                <div key={n.id} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                  <div className="flex justify-between font-semibold text-slate-700">
                    <span>{n.noteType}</span>
                    <span>{n.nurseName} • {new Date(n.recordedAt).toLocaleString()}</span>
                  </div>
                  <p className="text-slate-800 mt-1">{n.content}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'encounters' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Stethoscope className="w-4 h-4 text-teal-600" />
            Clinical Encounters & Consultations
          </h3>
          {(p.consultations || []).map((c: any) => (
            <div key={c.id} className="p-4 rounded-xl border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <div>
                  <span className="font-mono font-bold text-teal-800">{c.consultationNumber}</span>
                  <span className="ml-2 font-bold text-slate-900">{c.encounterType}: {c.chiefComplaint}</span>
                </div>
                <span className="px-2 py-0.5 rounded bg-slate-100 font-semibold">{c.status}</span>
              </div>
              {c.examFindings && <p className="text-slate-700"><strong>Findings:</strong> {c.examFindings}</p>}
              {c.treatmentPlan && <p className="text-slate-700"><strong>Plan:</strong> {c.treatmentPlan}</p>}
              {c.diagnoses?.length > 0 && (
                <p className="text-slate-700">
                  <strong>Diagnoses:</strong> {c.diagnoses.map((d: any) => `${d.code ? `[${d.code}] ` : ''}${d.title}`).join(', ')}
                </p>
              )}
              {c.amendments?.length > 0 && (
                <div className="p-2 rounded bg-amber-50 border border-amber-200 text-amber-900">
                  Amended {c.amendments.length} time(s). Latest: {c.amendments[c.amendments.length - 1].reason}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === 'prescriptions' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Pill className="w-4 h-4 text-teal-600" />
            Prescriptions
          </h3>
          {(p.prescriptions || []).map((rx: any) => (
            <div key={rx.id} className="p-3 rounded-xl border border-slate-200 text-xs space-y-1.5">
              <div className="flex justify-between font-bold">
                <span>{rx.prescriptionNumber}</span>
                <span className="text-teal-700">{rx.status}</span>
              </div>
              {rx.items?.map((it: any) => (
                <p key={it.id} className="text-slate-700">
                  • {it.medicineName} — {it.dosage} {it.frequency} for {it.duration} (Qty: {it.quantityDispensed}/{it.quantityPrescribed})
                </p>
              ))}
            </div>
          ))}
        </div>
      )}

      {tab === 'diagnostics' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-2">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <FlaskConical className="w-4 h-4 text-teal-600" /> Laboratory ({p.labRequests?.length || 0})
            </h3>
            {(p.labRequests || []).map((l: any) => (
              <div key={l.id} className="p-2.5 rounded-lg border border-slate-200 text-xs">
                <p className="font-bold">{l.test?.name}</p>
                <p className="text-slate-500">{l.requestNumber} • {l.status}</p>
                {l.result && <p className="text-teal-800 font-semibold mt-1">{l.result.resultValue} {l.result.unit} ({l.result.flag})</p>}
              </div>
            ))}
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-2">
            <h3 className="text-sm font-bold text-slate-900">Imaging ({p.imagingRequests?.length || 0})</h3>
            {(p.imagingRequests || []).map((img: any) => (
              <div key={img.id} className="p-2.5 rounded-lg border border-slate-200 text-xs">
                <p className="font-bold">{img.imaging?.name} ({img.imaging?.modality})</p>
                <p className="text-slate-500">{img.requestNumber} • {img.status}</p>
                {img.result && <p className="text-slate-700 mt-1">{img.result.impression || img.result.findings}</p>}
              </div>
            ))}
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-2">
            <h3 className="text-sm font-bold text-slate-900">Procedures ({p.procedureRecords?.length || 0})</h3>
            {(p.procedureRecords || []).map((pr: any) => (
              <div key={pr.id} className="p-2.5 rounded-lg border border-slate-200 text-xs">
                <p className="font-bold">{pr.procedure?.name}</p>
                <p className="text-slate-500">{pr.procedureNumber} • {pr.status} • GH₵{pr.chargeGHS.toFixed(2)}</p>
                {pr.outcome && <p className="text-slate-700 mt-1">{pr.outcome}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'billing' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-teal-600" /> Invoices & Payments
            </h3>
            {(p.invoices || []).map((inv: any) => (
              <div key={inv.id} className="p-3 rounded-xl border border-slate-200 text-xs flex justify-between">
                <div>
                  <p className="font-bold">{inv.invoiceNumber} — {inv.title}</p>
                  <p className="text-slate-500">Total: GH₵{inv.totalAmount.toFixed(2)} • Paid: GH₵{inv.amountPaid.toFixed(2)}</p>
                </div>
                <div className="text-right">
                  <span className="font-bold text-slate-900">Bal: GH₵{inv.balance.toFixed(2)}</span>
                  <p className="text-[11px] text-teal-700 font-semibold">{inv.status}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
            <h3 className="text-sm font-bold text-slate-900">Referrals</h3>
            <div className="grid grid-cols-2 gap-2">
              <select
                value={referralForm.direction}
                onChange={(e) => setReferralForm({ ...referralForm, direction: e.target.value })}
                className="px-3 py-2 rounded-lg border border-slate-200 text-xs"
              >
                <option value="INTERNAL">Internal Referral</option>
                <option value="EXTERNAL">External Referral</option>
              </select>
              <input
                placeholder="Receiving Facility / Dept"
                value={referralForm.receivingFacility}
                onChange={(e) => setReferralForm({ ...referralForm, receivingFacility: e.target.value })}
                className="px-3 py-2 rounded-lg border border-slate-200 text-xs"
              />
              <input
                placeholder="Referral Reason"
                value={referralForm.reason}
                onChange={(e) => setReferralForm({ ...referralForm, reason: e.target.value })}
                className="col-span-2 px-3 py-2 rounded-lg border border-slate-200 text-xs"
              />
            </div>
            <button
              type="button"
              disabled={busy || !referralForm.reason.trim()}
              onClick={async () => {
                const ok = await submitEmr('/api/clinic/referrals', { patientId, ...referralForm }, 'Referral created.');
                if (ok) setReferralForm({ direction: 'INTERNAL', receivingFacility: '', receivingDepartment: '', reason: '', urgency: 'ROUTINE' });
              }}
              className="px-3 py-2 rounded-lg bg-slate-900 text-white text-xs font-semibold"
            >
              + Create Referral
            </button>
            <div className="space-y-2">
              {(p.referrals || []).map((r: any) => (
                <div key={r.id} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                  <p className="font-bold">{r.referralNumber} ({r.direction}) — {r.status}</p>
                  <p className="text-slate-600">{r.receivingFacility || r.receivingDepartment} • {r.reason}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'consent' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-teal-600" /> Patient Consent & Documents
            </h3>
            <div className="flex gap-2">
              <select
                value={consentForm.consentType}
                onChange={(e) => setConsentForm({ ...consentForm, consentType: e.target.value })}
                className="px-3 py-2 rounded-lg border border-slate-200 text-xs"
              >
                <option value="GENERAL_TREATMENT">General Treatment Consent</option>
                <option value="SURGERY">Surgical / Procedure Consent</option>
                <option value="DATA_SHARING">Clinical Data Sharing</option>
              </select>
              <button
                type="button"
                disabled={busy}
                onClick={() => submitEmr('/api/clinic/emr', { action: 'record_consent', patientId, ...consentForm }, 'Consent recorded.')}
                className="px-3 py-2 rounded-lg bg-teal-600 text-white text-xs font-semibold"
              >
                Record Consent
              </button>
            </div>
            {(p.consents || []).map((c: any) => (
              <div key={c.id} className="p-2 rounded-lg bg-slate-50 border border-slate-200 text-xs flex justify-between">
                <span>{c.consentType} ({c.status})</span>
                <span className="text-slate-500">{new Date(c.consentDate).toLocaleDateString()}</span>
              </div>
            ))}
            <div className="pt-2 border-t border-slate-100 space-y-1.5">
              <p className="text-xs font-bold text-slate-700">Uploaded Documents ({p.documents?.length || 0})</p>
              {(p.documents || []).map((doc: any) => (
                <a
                  key={doc.id}
                  href={`/api/clinic/documents/${doc.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="block p-2 rounded-lg border border-slate-200 text-xs text-teal-700 hover:bg-slate-50 font-semibold"
                >
                  {doc.title} ({doc.category})
                </a>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-2">
            <h3 className="text-sm font-bold text-slate-900">Clinical Audit Trail</h3>
            {(data.auditLogs || []).map((log: any) => (
              <div key={log.id} className="p-2 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                <p className="font-semibold text-slate-900">{log.action} • {log.entityType}</p>
                <p className="text-slate-500">{log.actorName} ({log.actorRole}) • {new Date(log.createdAt).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
