'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import ClinicShell, { ClinicUser } from '@/components/ClinicShell';
import {
  Building2,
  Settings,
  Users,
  BookOpen,
  ShieldCheck,
  BedDouble,
  CheckCircle2,
  X,
} from 'lucide-react';

type AdminTab = 'settings' | 'staff' | 'departments' | 'catalogues' | 'wards';

export default function ClinicAdminPage() {
  const router = useRouter();
  const [user, setUser] = useState<ClinicUser | null>(null);
  const [tab, setTab] = useState<AdminTab>('settings');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null);

  const [config, setConfig] = useState<any>(null);
  const [catalog, setCatalog] = useState<any>(null);
  const [imagingCatalog, setImagingCatalog] = useState<any[]>([]);
  const [procedureCatalog, setProcedureCatalog] = useState<any[]>([]);
  const [insuranceProviders, setInsuranceProviders] = useState<any[]>([]);
  const [wards, setWards] = useState<any[]>([]);

  // Forms
  const [staffForm, setStaffForm] = useState({
    name: '',
    email: '',
    password: '',
    clinicRole: 'DOCTOR',
    departmentId: '',
    specialty: '',
    licenseNumber: '',
    phone: '+233',
  });
  const [deptForm, setDeptForm] = useState({ name: '', headDoctor: '', room: '', description: '' });
  const [serviceForm, setServiceForm] = useState({
    title: '',
    category: 'Consultation',
    feeGHS: '150',
    duration: '30 mins',
    departmentId: '',
    description: '',
  });
  const [diagForm, setDiagForm] = useState({ code: '', name: '', category: 'General' });
  const [labTestForm, setLabTestForm] = useState({ code: '', name: '', category: 'Hematology', priceGHS: '60', sampleType: 'Blood' });
  const [imagingForm, setImagingForm] = useState({ code: '', name: '', modality: 'X-Ray', priceGHS: '180' });
  const [procForm, setProcForm] = useState({ code: '', name: '', category: 'Minor Procedure', priceGHS: '100' });
  const [insForm, setInsForm] = useState({ code: '', name: '', providerType: 'PRIVATE' });
  const [wardForm, setWardForm] = useState({ name: '', wardType: 'GENERAL', capacity: '6' });

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const meRes = await fetch('/api/auth/me');
      if (!meRes.ok) {
        router.replace('/auth/login');
        return;
      }
      const meData = await meRes.json();
      const u = meData.user;
      const role = u?.clinicStaffProfile?.clinicRole || u?.role;
      if (!u || !['CLINIC_SUPER_ADMIN', 'CLINIC_ADMIN'].includes(role)) {
        router.replace('/portal/clinic');
        return;
      }
      setUser({ id: u.id, name: u.name, email: u.email, role: u.role, clinicRole: role });

      const [cfgRes, catRes, imgRes, procRes, insRes, inpRes] = await Promise.all([
        fetch('/api/clinic/config'),
        fetch('/api/clinic/catalog'),
        fetch('/api/clinic/imaging'),
        fetch('/api/clinic/procedures'),
        fetch('/api/clinic/insurance'),
        fetch('/api/clinic/inpatient'),
      ]);
      if (cfgRes.ok) setConfig((await cfgRes.json()).config);
      if (catRes.ok) setCatalog(await catRes.json());
      if (imgRes.ok) setImagingCatalog((await imgRes.json()).catalog || []);
      if (procRes.ok) setProcedureCatalog((await procRes.json()).catalog || []);
      if (insRes.ok) setInsuranceProviders((await insRes.json()).providers || []);
      if (inpRes.ok) setWards((await inpRes.json()).wards || []);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const postAction = async (url: string, body: Record<string, unknown>, okMsg: string, method: 'POST' | 'PATCH' = 'POST') => {
    setBusy(true);
    setToast(null);
    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Request failed');
      setToast({ type: 'ok', msg: okMsg });
      await loadAll();
      return true;
    } catch (e: any) {
      setToast({ type: 'err', msg: e.message || 'Action failed' });
      return false;
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-sm text-slate-500">
        Loading Clinic Administration...
      </div>
    );
  }

  return (
    <ClinicShell user={user} clinicName={config?.clinicName} activeSection="admin">
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Clinic Administration</h1>
            <p className="text-xs text-slate-500">
              Independent Clinic Super Admin workspace — settings, staff roles, departments, catalogues, and modules.
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {(
              [
                { key: 'settings', label: 'Clinic Settings', icon: Settings },
                { key: 'staff', label: 'Staff & Roles', icon: Users },
                { key: 'departments', label: 'Departments & Services', icon: Building2 },
                { key: 'catalogues', label: 'Clinical Catalogues', icon: BookOpen },
                { key: 'wards', label: 'Wards & Beds', icon: BedDouble },
              ] as const
            ).map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTab(t.key)}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition ${
                    tab === t.key
                      ? 'bg-teal-600 text-white'
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

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

        {tab === 'settings' && config && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
            <h2 className="text-sm font-bold text-slate-900">Clinic Branding, Operations & Module Settings</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Clinic Name</label>
                <input
                  value={config.clinicName || ''}
                  onChange={(e) => setConfig({ ...config, clinicName: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Tagline</label>
                <input
                  value={config.tagline || ''}
                  onChange={(e) => setConfig({ ...config, tagline: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Contact Phone (+233)</label>
                <input
                  value={config.phone || ''}
                  onChange={(e) => setConfig({ ...config, phone: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Clinic Email</label>
                <input
                  value={config.email || ''}
                  onChange={(e) => setConfig({ ...config, email: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Operating Hours</label>
                <input
                  value={config.operatingHours || ''}
                  onChange={(e) => setConfig({ ...config, operatingHours: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Default Appointment Slot (mins)</label>
                <input
                  type="number"
                  value={config.appointmentDurationMin || 30}
                  onChange={(e) => setConfig({ ...config, appointmentDurationMin: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-xs">
              {[
                { key: 'nhisEnabled', label: 'NHIS / Insurance Billing' },
                { key: 'enableImaging', label: 'Radiology & Imaging' },
                { key: 'enableEmergency', label: 'Emergency Triage' },
                { key: 'enableInpatient', label: 'Inpatient & Wards' },
              ].map((m) => (
                <label key={m.key} className="flex items-center gap-2 p-3 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(config[m.key])}
                    onChange={(e) => setConfig({ ...config, [m.key]: e.target.checked })}
                  />
                  <span className="font-semibold text-slate-800">{m.label}</span>
                </label>
              ))}
            </div>

            <button
              type="button"
              disabled={busy}
              onClick={() => postAction('/api/clinic/config', config, 'Clinic configuration saved.', 'PATCH')}
              className="px-4 py-2 rounded-lg bg-teal-600 text-white text-xs font-semibold hover:bg-teal-700"
            >
              Save Clinic Configuration
            </button>
          </div>
        )}

        {tab === 'staff' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
              <h2 className="text-sm font-bold text-slate-900">Add Clinic Staff Member</h2>
              <input
                placeholder="Full Name"
                value={staffForm.name}
                onChange={(e) => setStaffForm({ ...staffForm, name: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs"
              />
              <input
                placeholder="Email"
                value={staffForm.email}
                onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs"
              />
              <input
                type="password"
                placeholder="Password"
                value={staffForm.password}
                onChange={(e) => setStaffForm({ ...staffForm, password: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs"
              />
              <select
                value={staffForm.clinicRole}
                onChange={(e) => setStaffForm({ ...staffForm, clinicRole: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs"
              >
                <option value="CLINIC_SUPER_ADMIN">Clinic Super Admin</option>
                <option value="CLINIC_ADMIN">Clinic Administrator</option>
                <option value="DOCTOR">Medical Doctor</option>
                <option value="NURSE">Nurse</option>
                <option value="MIDWIFE">Midwife</option>
                <option value="PHARMACIST">Pharmacist</option>
                <option value="LAB_TECH">Laboratory Technician</option>
                <option value="RADIOLOGY_STAFF">Radiology Staff</option>
                <option value="RECEPTIONIST">Receptionist</option>
                <option value="CASHIER">Cashier</option>
                <option value="RECORDS_OFFICER">Records Officer</option>
              </select>
              <input
                placeholder="Specialty / Designation"
                value={staffForm.specialty}
                onChange={(e) => setStaffForm({ ...staffForm, specialty: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs"
              />
              <button
                type="button"
                disabled={busy || !staffForm.name || !staffForm.email}
                onClick={async () => {
                  const ok = await postAction('/api/clinic/catalog', { action: 'create_staff', ...staffForm }, 'Clinic staff added.');
                  if (ok) setStaffForm({ name: '', email: '', password: '', clinicRole: 'DOCTOR', departmentId: '', specialty: '', licenseNumber: '', phone: '+233' });
                }}
                className="w-full py-2 rounded-lg bg-teal-600 text-white text-xs font-semibold hover:bg-teal-700"
              >
                Create Staff Account
              </button>
            </div>

            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5">
              <h2 className="text-sm font-bold text-slate-900 mb-3">Clinic Workforce ({catalog?.staff?.length || 0})</h2>
              <div className="space-y-2">
                {(catalog?.staff || []).map((s: any) => (
                  <div key={s.id} className="p-3 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-slate-900">{s.user?.name}</p>
                      <p className="text-slate-500">{s.user?.email} • {s.clinicRole} {s.specialty ? `• ${s.specialty}` : ''}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => postAction('/api/clinic/catalog', { action: 'toggle_staff', staffId: s.id, isActive: !s.isActive }, 'Staff status updated.', 'PATCH')}
                      className={`px-2.5 py-1 rounded-lg font-semibold ${
                        s.isActive ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {s.isActive ? 'Active' : 'Inactive'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === 'departments' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
              <h2 className="text-sm font-bold text-slate-900">Departments ({catalog?.departments?.length || 0})</h2>
              <div className="grid grid-cols-2 gap-2">
                <input placeholder="Department Name" value={deptForm.name} onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })} className="px-3 py-2 rounded-lg border border-slate-200 text-xs" />
                <input placeholder="Head Clinician" value={deptForm.headDoctor} onChange={(e) => setDeptForm({ ...deptForm, headDoctor: e.target.value })} className="px-3 py-2 rounded-lg border border-slate-200 text-xs" />
              </div>
              <button
                type="button"
                disabled={busy || !deptForm.name}
                onClick={() => postAction('/api/clinic/catalog', { action: 'create_department', ...deptForm }, 'Department added.')}
                className="px-3 py-2 rounded-lg bg-teal-600 text-white text-xs font-semibold"
              >
                + Add Department
              </button>
              <div className="space-y-1.5 pt-2">
                {(catalog?.departments || []).map((d: any) => (
                  <div key={d.id} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs flex justify-between">
                    <span className="font-bold">{d.name}</span>
                    <span className="text-slate-500">{d.headDoctor || d.room}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
              <h2 className="text-sm font-bold text-slate-900">Clinic Services ({catalog?.services?.length || 0})</h2>
              <div className="grid grid-cols-3 gap-2">
                <input placeholder="Service Title" value={serviceForm.title} onChange={(e) => setServiceForm({ ...serviceForm, title: e.target.value })} className="px-3 py-2 rounded-lg border border-slate-200 text-xs" />
                <input placeholder="Fee (GH₵)" type="number" value={serviceForm.feeGHS} onChange={(e) => setServiceForm({ ...serviceForm, feeGHS: e.target.value })} className="px-3 py-2 rounded-lg border border-slate-200 text-xs" />
                <input placeholder="Category" value={serviceForm.category} onChange={(e) => setServiceForm({ ...serviceForm, category: e.target.value })} className="px-3 py-2 rounded-lg border border-slate-200 text-xs" />
              </div>
              <button
                type="button"
                disabled={busy || !serviceForm.title}
                onClick={() => postAction('/api/clinic/catalog', { action: 'create_service', ...serviceForm }, 'Service added.')}
                className="px-3 py-2 rounded-lg bg-slate-900 text-white text-xs font-semibold"
              >
                + Add Service
              </button>
              <div className="space-y-1.5 pt-2">
                {(catalog?.services || []).map((sv: any) => (
                  <div key={sv.id} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs flex justify-between">
                    <span className="font-bold">{sv.title}</span>
                    <span className="font-semibold text-teal-700">GH₵{Number(sv.feeGHS).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === 'catalogues' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
              <h2 className="text-sm font-bold text-slate-900">Diagnosis Catalogue (ICD-10 / Clinic Codes)</h2>
              <div className="flex gap-2">
                <input placeholder="Code (e.g. B54)" value={diagForm.code} onChange={(e) => setDiagForm({ ...diagForm, code: e.target.value })} className="w-28 px-3 py-2 rounded-lg border border-slate-200 text-xs" />
                <input placeholder="Diagnosis Name" value={diagForm.name} onChange={(e) => setDiagForm({ ...diagForm, name: e.target.value })} className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-xs" />
                <button type="button" onClick={() => postAction('/api/clinic/catalog', { action: 'create_diagnosis', ...diagForm }, 'Diagnosis code added.')} className="px-3 py-2 rounded-lg bg-teal-600 text-white text-xs font-semibold">Add</button>
              </div>
              <div className="max-h-48 overflow-y-auto space-y-1">
                {(catalog?.diagnoses || []).map((d: any) => (
                  <div key={d.id} className="p-2 rounded bg-slate-50 text-xs flex justify-between">
                    <span><strong>{d.code}</strong> — {d.name}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
              <h2 className="text-sm font-bold text-slate-900">Laboratory & Imaging Catalogues</h2>
              <div className="grid grid-cols-4 gap-2">
                <input placeholder="Lab Code" value={labTestForm.code} onChange={(e) => setLabTestForm({ ...labTestForm, code: e.target.value })} className="px-2 py-2 rounded-lg border border-slate-200 text-xs" />
                <input placeholder="Test Name" value={labTestForm.name} onChange={(e) => setLabTestForm({ ...labTestForm, name: e.target.value })} className="col-span-2 px-2 py-2 rounded-lg border border-slate-200 text-xs" />
                <button type="button" onClick={() => postAction('/api/clinic/lab', { action: 'create_test', ...labTestForm }, 'Lab test added.')} className="px-2 py-2 rounded-lg bg-teal-600 text-white text-xs font-semibold">Add Lab</button>
              </div>
              <div className="grid grid-cols-4 gap-2">
                <input placeholder="Img Code" value={imagingForm.code} onChange={(e) => setImagingForm({ ...imagingForm, code: e.target.value })} className="px-2 py-2 rounded-lg border border-slate-200 text-xs" />
                <input placeholder="Imaging Name" value={imagingForm.name} onChange={(e) => setImagingForm({ ...imagingForm, name: e.target.value })} className="col-span-2 px-2 py-2 rounded-lg border border-slate-200 text-xs" />
                <button type="button" onClick={() => postAction('/api/clinic/imaging', { action: 'create_catalog', ...imagingForm }, 'Imaging test added.')} className="px-2 py-2 rounded-lg bg-slate-900 text-white text-xs font-semibold">Add Img</button>
              </div>
              <div className="grid grid-cols-4 gap-2">
                <input placeholder="Proc Code" value={procForm.code} onChange={(e) => setProcForm({ ...procForm, code: e.target.value })} className="px-2 py-2 rounded-lg border border-slate-200 text-xs" />
                <input placeholder="Procedure Name" value={procForm.name} onChange={(e) => setProcForm({ ...procForm, name: e.target.value })} className="col-span-2 px-2 py-2 rounded-lg border border-slate-200 text-xs" />
                <button type="button" onClick={() => postAction('/api/clinic/procedures', { action: 'create_catalog', ...procForm }, 'Procedure added.')} className="px-2 py-2 rounded-lg bg-slate-700 text-white text-xs font-semibold">Add Proc</button>
              </div>
              <p className="text-[11px] text-slate-500">
                Lab tests: {catalog?.labTests?.length || 0} • Imaging: {imagingCatalog.length} • Procedures: {procedureCatalog.length}
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3 lg:col-span-2">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-teal-600" /> Insurance & NHIS Providers ({insuranceProviders.length})
              </h2>
              <div className="flex flex-wrap gap-2">
                <input placeholder="Code (e.g. GLICO)" value={insForm.code} onChange={(e) => setInsForm({ ...insForm, code: e.target.value })} className="px-3 py-2 rounded-lg border border-slate-200 text-xs" />
                <input placeholder="Provider Name" value={insForm.name} onChange={(e) => setInsForm({ ...insForm, name: e.target.value })} className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-xs" />
                <button type="button" onClick={() => postAction('/api/clinic/insurance', { action: 'create_provider', ...insForm }, 'Insurance provider added.')} className="px-3 py-2 rounded-lg bg-teal-600 text-white text-xs font-semibold">+ Add Provider</button>
              </div>
            </div>
          </div>
        )}

        {tab === 'wards' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
            <h2 className="text-sm font-bold text-slate-900">Wards & Bed Configuration ({wards.length})</h2>
            <div className="flex flex-wrap gap-2">
              <input placeholder="Ward Name" value={wardForm.name} onChange={(e) => setWardForm({ ...wardForm, name: e.target.value })} className="px-3 py-2 rounded-lg border border-slate-200 text-xs" />
              <select value={wardForm.wardType} onChange={(e) => setWardForm({ ...wardForm, wardType: e.target.value })} className="px-3 py-2 rounded-lg border border-slate-200 text-xs">
                <option value="GENERAL">General</option>
                <option value="MATERNITY">Maternity</option>
                <option value="PEDIATRIC">Pediatric</option>
                <option value="EMERGENCY">Emergency</option>
              </select>
              <input type="number" placeholder="Beds" value={wardForm.capacity} onChange={(e) => setWardForm({ ...wardForm, capacity: e.target.value })} className="w-24 px-3 py-2 rounded-lg border border-slate-200 text-xs" />
              <button type="button" onClick={() => postAction('/api/clinic/inpatient', { action: 'create_ward', ...wardForm }, 'Ward & beds created.')} className="px-3 py-2 rounded-lg bg-teal-600 text-white text-xs font-semibold">+ Create Ward</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {wards.map((w: any) => (
                <div key={w.id} className="p-3 rounded-xl border border-slate-200 text-xs">
                  <p className="font-bold text-slate-900">{w.name} ({w.wardType})</p>
                  <p className="text-slate-500 mt-1">
                    {w.beds?.filter((b: any) => b.status === 'AVAILABLE').length || 0} / {w.beds?.length || 0} beds available
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </ClinicShell>
  );
}
