'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { HeartPulse, Scan, Scissors, ArrowRightLeft, ShieldCheck, CheckCircle2, X } from 'lucide-react';

interface Props {
  mode: 'triage' | 'diagnostics';
  patients: any[];
  preselectedPatientId?: string;
}

export default function ClinicTriageAndDiagnostics({ mode, patients, preselectedPatientId }: Props) {
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null);

  // Triage & Nursing state
  const [triageData, setTriageData] = useState<any>({ triageRecords: [], nursingNotes: [], medicationAdmins: [] });
  const [triageForm, setTriageForm] = useState({
    patientId: preselectedPatientId || '',
    triageCategory: 'NON_URGENT',
    chiefComplaint: '',
    bpSystolic: '',
    bpDiastolic: '',
    temperatureC: '',
    pulseBpm: '',
    respiratoryRate: '',
    spo2Percent: '',
    weightKg: '',
    heightCm: '',
    painScore: '',
    allergiesReviewed: true,
    notes: '',
  });
  const [noteForm, setNoteForm] = useState({ patientId: preselectedPatientId || '', noteType: 'OBSERVATION', content: '' });

  // Diagnostics & Referrals & Insurance state
  const [imaging, setImaging] = useState<any>({ catalog: [], requests: [] });
  const [procedures, setProcedures] = useState<any>({ catalog: [], records: [] });
  const [referrals, setReferrals] = useState<any[]>([]);
  const [insurance, setInsurance] = useState<any>({ providers: [], claims: [] });

  const [imgReqForm, setImgReqForm] = useState({ patientId: preselectedPatientId || '', imagingId: '', clinicalNotes: '', priority: 'ROUTINE' });
  const [procForm, setProcForm] = useState({ patientId: preselectedPatientId || '', procedureId: '', materialsUsed: '', procedureNotes: '', outcome: '' });
  const [refForm, setRefForm] = useState({ patientId: preselectedPatientId || '', direction: 'INTERNAL', receivingFacility: '', reason: '', urgency: 'ROUTINE' });
  const [claimForm, setClaimForm] = useState({ patientId: preselectedPatientId || '', providerId: '', description: 'Outpatient Consultation & Lab', amountGHS: '150' });

  const loadData = useCallback(async () => {
    if (mode === 'triage') {
      const res = await fetch('/api/clinic/triage');
      if (res.ok) setTriageData(await res.json());
    } else {
      const [imgR, procR, refR, insR] = await Promise.all([
        fetch('/api/clinic/imaging'),
        fetch('/api/clinic/procedures'),
        fetch('/api/clinic/referrals'),
        fetch('/api/clinic/insurance'),
      ]);
      if (imgR.ok) setImaging(await imgR.json());
      if (procR.ok) setProcedures(await procR.json());
      if (refR.ok) setReferrals((await refR.json()).referrals || []);
      if (insR.ok) setInsurance(await insR.json());
    }
  }, [mode]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const submit = async (url: string, body: Record<string, unknown>, okMsg: string) => {
    setBusy(true);
    setToast(null);
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Operation failed');
      setToast({ type: 'ok', msg: okMsg });
      await loadData();
      return true;
    } catch (e: any) {
      setToast({ type: 'err', msg: e.message || 'Operation failed' });
      return false;
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      {toast && (
        <div
          className={`px-4 py-2.5 rounded-xl border text-xs font-semibold flex items-center justify-between ${
            toast.type === 'ok'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            {toast.msg}
          </span>
          <button onClick={() => setToast(null)}>
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {mode === 'triage' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <HeartPulse className="w-4 h-4 text-teal-600" />
              Record Patient Triage & Vitals
            </h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <select
                value={triageForm.patientId}
                onChange={(e) => setTriageForm({ ...triageForm, patientId: e.target.value })}
                className="col-span-2 px-3 py-2 rounded-lg border border-slate-200"
              >
                <option value="">Select Patient...</option>
                {patients.map((p: any) => (
                  <option key={p.id} value={p.id}>{p.patientNumber} — {p.fullName}</option>
                ))}
              </select>
              <select
                value={triageForm.triageCategory}
                onChange={(e) => setTriageForm({ ...triageForm, triageCategory: e.target.value })}
                className="px-3 py-2 rounded-lg border border-slate-200"
              >
                <option value="NON_URGENT">Non-Urgent (Green)</option>
                <option value="SEMI_URGENT">Semi-Urgent (Yellow)</option>
                <option value="URGENT">Urgent (Orange)</option>
                <option value="EMERGENCY">Emergency (Red)</option>
              </select>
              <input
                placeholder="Chief Complaint"
                value={triageForm.chiefComplaint}
                onChange={(e) => setTriageForm({ ...triageForm, chiefComplaint: e.target.value })}
                className="px-3 py-2 rounded-lg border border-slate-200"
              />
              <input placeholder="BP Systolic" type="number" value={triageForm.bpSystolic} onChange={(e) => setTriageForm({ ...triageForm, bpSystolic: e.target.value })} className="px-3 py-2 rounded-lg border border-slate-200" />
              <input placeholder="BP Diastolic" type="number" value={triageForm.bpDiastolic} onChange={(e) => setTriageForm({ ...triageForm, bpDiastolic: e.target.value })} className="px-3 py-2 rounded-lg border border-slate-200" />
              <input placeholder="Temp (°C)" type="number" step="0.1" value={triageForm.temperatureC} onChange={(e) => setTriageForm({ ...triageForm, temperatureC: e.target.value })} className="px-3 py-2 rounded-lg border border-slate-200" />
              <input placeholder="Pulse (bpm)" type="number" value={triageForm.pulseBpm} onChange={(e) => setTriageForm({ ...triageForm, pulseBpm: e.target.value })} className="px-3 py-2 rounded-lg border border-slate-200" />
              <input placeholder="SpO2 (%)" type="number" value={triageForm.spo2Percent} onChange={(e) => setTriageForm({ ...triageForm, spo2Percent: e.target.value })} className="px-3 py-2 rounded-lg border border-slate-200" />
              <input placeholder="Pain (0-10)" type="number" value={triageForm.painScore} onChange={(e) => setTriageForm({ ...triageForm, painScore: e.target.value })} className="px-3 py-2 rounded-lg border border-slate-200" />
              <input placeholder="Weight (kg)" type="number" step="0.1" value={triageForm.weightKg} onChange={(e) => setTriageForm({ ...triageForm, weightKg: e.target.value })} className="px-3 py-2 rounded-lg border border-slate-200" />
              <input placeholder="Height (cm)" type="number" step="0.1" value={triageForm.heightCm} onChange={(e) => setTriageForm({ ...triageForm, heightCm: e.target.value })} className="px-3 py-2 rounded-lg border border-slate-200" />
            </div>
            <button
              type="button"
              disabled={busy || !triageForm.patientId || !triageForm.chiefComplaint}
              onClick={async () => {
                const ok = await submit('/api/clinic/triage', { action: 'record_triage', ...triageForm }, 'Triage assessment recorded.');
                if (ok) setTriageForm({ ...triageForm, chiefComplaint: '', bpSystolic: '', bpDiastolic: '', temperatureC: '', pulseBpm: '', spo2Percent: '', painScore: '', weightKg: '', heightCm: '' });
              }}
              className="w-full py-2 rounded-lg bg-teal-600 text-white text-xs font-semibold hover:bg-teal-700 disabled:opacity-50"
            >
              Save Triage Assessment
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Recent Triage & Nursing Notes</h3>
            <div className="flex gap-2 text-xs">
              <select value={noteForm.patientId} onChange={(e) => setNoteForm({ ...noteForm, patientId: e.target.value })} className="w-40 px-2 py-2 rounded-lg border border-slate-200">
                <option value="">Patient...</option>
                {patients.map((p: any) => (
                  <option key={p.id} value={p.id}>{p.fullName}</option>
                ))}
              </select>
              <input placeholder="Nursing note..." value={noteForm.content} onChange={(e) => setNoteForm({ ...noteForm, content: e.target.value })} className="flex-1 px-3 py-2 rounded-lg border border-slate-200" />
              <button
                type="button"
                disabled={busy || !noteForm.patientId || !noteForm.content}
                onClick={async () => {
                  const ok = await submit('/api/clinic/triage', { action: 'add_nursing_note', ...noteForm }, 'Nursing note saved.');
                  if (ok) setNoteForm({ ...noteForm, content: '' });
                }}
                className="px-3 py-2 rounded-lg bg-slate-900 text-white font-semibold"
              >
                Add Note
              </button>
            </div>
            <div className="space-y-2 max-h-72 overflow-y-auto text-xs">
              {(triageData.triageRecords || []).map((t: any) => (
                <div key={t.id} className="p-2.5 rounded-xl border border-slate-200 bg-slate-50">
                  <div className="flex justify-between font-bold">
                    <span>{t.patient?.fullName} — {t.triageCategory}</span>
                    <span className="text-slate-500">{new Date(t.triagedAt).toLocaleTimeString()}</span>
                  </div>
                  <p className="text-slate-600">{t.chiefComplaint} • BP {t.bpSystolic || '—'}/{t.bpDiastolic || '—'} • Temp {t.temperatureC || '—'}°C</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Imaging */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Scan className="w-4 h-4 text-teal-600" /> Radiology & Imaging ({imaging.requests?.length || 0})
            </h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <select value={imgReqForm.patientId} onChange={(e) => setImgReqForm({ ...imgReqForm, patientId: e.target.value })} className="px-2 py-2 rounded-lg border border-slate-200">
                <option value="">Select Patient...</option>
                {patients.map((p: any) => <option key={p.id} value={p.id}>{p.fullName}</option>)}
              </select>
              <select value={imgReqForm.imagingId} onChange={(e) => setImgReqForm({ ...imgReqForm, imagingId: e.target.value })} className="px-2 py-2 rounded-lg border border-slate-200">
                <option value="">Select Imaging...</option>
                {(imaging.catalog || []).map((c: any) => <option key={c.id} value={c.id}>{c.name} ({c.modality})</option>)}
              </select>
            </div>
            <button
              type="button"
              disabled={busy || !imgReqForm.patientId || !imgReqForm.imagingId}
              onClick={() => submit('/api/clinic/imaging', { action: 'create_request', ...imgReqForm }, 'Imaging request created.')}
              className="px-3 py-1.5 rounded-lg bg-teal-600 text-white text-xs font-semibold disabled:opacity-50"
            >
              + Request Imaging
            </button>
            <div className="space-y-1.5 max-h-40 overflow-y-auto text-xs">
              {(imaging.requests || []).map((r: any) => (
                <div key={r.id} className="p-2 rounded-lg bg-slate-50 border border-slate-200 flex justify-between">
                  <span><strong>{r.requestNumber}</strong> — {r.patient?.fullName} ({r.imaging?.name})</span>
                  <span className="font-semibold text-teal-700">{r.status}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Procedures */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Scissors className="w-4 h-4 text-teal-600" /> Procedures ({procedures.records?.length || 0})
            </h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <select value={procForm.patientId} onChange={(e) => setProcForm({ ...procForm, patientId: e.target.value })} className="px-2 py-2 rounded-lg border border-slate-200">
                <option value="">Select Patient...</option>
                {patients.map((p: any) => <option key={p.id} value={p.id}>{p.fullName}</option>)}
              </select>
              <select value={procForm.procedureId} onChange={(e) => setProcForm({ ...procForm, procedureId: e.target.value })} className="px-2 py-2 rounded-lg border border-slate-200">
                <option value="">Select Procedure...</option>
                {(procedures.catalog || []).map((c: any) => <option key={c.id} value={c.id}>{c.name} (GH₵{c.priceGHS})</option>)}
              </select>
            </div>
            <button
              type="button"
              disabled={busy || !procForm.patientId || !procForm.procedureId}
              onClick={() => submit('/api/clinic/procedures', { action: 'record_procedure', ...procForm }, 'Procedure recorded.')}
              className="px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold disabled:opacity-50"
            >
              + Record Procedure
            </button>
            <div className="space-y-1.5 max-h-40 overflow-y-auto text-xs">
              {(procedures.records || []).map((r: any) => (
                <div key={r.id} className="p-2 rounded-lg bg-slate-50 border border-slate-200 flex justify-between">
                  <span><strong>{r.procedureNumber}</strong> — {r.patient?.fullName} ({r.procedure?.name})</span>
                  <span className="font-semibold">GH₵{r.chargeGHS.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Referrals */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <ArrowRightLeft className="w-4 h-4 text-teal-600" /> Referrals ({referrals.length})
            </h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <select value={refForm.patientId} onChange={(e) => setRefForm({ ...refForm, patientId: e.target.value })} className="px-2 py-2 rounded-lg border border-slate-200">
                <option value="">Select Patient...</option>
                {patients.map((p: any) => <option key={p.id} value={p.id}>{p.fullName}</option>)}
              </select>
              <input placeholder="Receiving Facility / Dept" value={refForm.receivingFacility} onChange={(e) => setRefForm({ ...refForm, receivingFacility: e.target.value })} className="px-2 py-2 rounded-lg border border-slate-200" />
              <input placeholder="Reason for referral" value={refForm.reason} onChange={(e) => setRefForm({ ...refForm, reason: e.target.value })} className="col-span-2 px-2 py-2 rounded-lg border border-slate-200" />
            </div>
            <button
              type="button"
              disabled={busy || !refForm.patientId || !refForm.reason}
              onClick={() => submit('/api/clinic/referrals', refForm, 'Referral created.')}
              className="px-3 py-1.5 rounded-lg bg-teal-600 text-white text-xs font-semibold disabled:opacity-50"
            >
              + Issue Referral
            </button>
          </div>

          {/* Insurance Claims */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-teal-600" /> Insurance & NHIS Claims ({insurance.claims?.length || 0})
            </h3>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <select value={claimForm.patientId} onChange={(e) => setClaimForm({ ...claimForm, patientId: e.target.value })} className="px-2 py-2 rounded-lg border border-slate-200">
                <option value="">Patient...</option>
                {patients.map((p: any) => <option key={p.id} value={p.id}>{p.fullName}</option>)}
              </select>
              <select value={claimForm.providerId} onChange={(e) => setClaimForm({ ...claimForm, providerId: e.target.value })} className="px-2 py-2 rounded-lg border border-slate-200">
                <option value="">Insurer...</option>
                {(insurance.providers || []).map((pr: any) => <option key={pr.id} value={pr.id}>{pr.name}</option>)}
              </select>
              <input type="number" placeholder="Claim GH₵" value={claimForm.amountGHS} onChange={(e) => setClaimForm({ ...claimForm, amountGHS: e.target.value })} className="px-2 py-2 rounded-lg border border-slate-200" />
            </div>
            <button
              type="button"
              disabled={busy || !claimForm.patientId || !claimForm.providerId}
              onClick={() => submit('/api/clinic/insurance', {
                action: 'create_claim',
                patientId: claimForm.patientId,
                providerId: claimForm.providerId,
                submitNow: true,
                items: [{ description: claimForm.description, amountGHS: Number(claimForm.amountGHS) || 0 }],
              }, 'Insurance claim submitted.')}
              className="px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold disabled:opacity-50"
            >
              + Submit Insurance Claim
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
