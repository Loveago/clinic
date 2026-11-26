'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Activity,
  Users,
  Calendar,
  ListOrdered,
  HeartPulse,
  Stethoscope,
  FlaskConical,
  Scan,
  Scissors,
  Pill,
  CreditCard,
  ShieldCheck,
  BarChart3,
  Settings,
  ArrowRightLeft,
  LogOut,
  Menu,
  X,
  Building2,
  ClipboardList,
} from 'lucide-react';

export interface ClinicUser {
  id: string;
  name: string;
  email: string;
  role: string;
  clinicRole?: string;
}

export type ClinicSectionKey =
  | 'dashboard'
  | 'patients'
  | 'queue'
  | 'appointments'
  | 'triage'
  | 'consultations'
  | 'referrals'
  | 'lab'
  | 'imaging'
  | 'procedures'
  | 'prescriptions'
  | 'pharmacy'
  | 'billing'
  | 'insurance'
  | 'inpatient'
  | 'reports';

interface ClinicShellProps {
  user: ClinicUser | null;
  clinicName?: string;
  activeSection?: ClinicSectionKey | 'admin';
  onSelectSection?: (section: ClinicSectionKey) => void;
  children: React.ReactNode;
}

const ROLE_ALLOWED_SECTIONS: Record<string, ClinicSectionKey[]> = {
  CLINIC_SUPER_ADMIN: [
    'dashboard', 'patients', 'queue', 'appointments', 'triage', 'consultations',
    'referrals', 'lab', 'imaging', 'procedures', 'prescriptions', 'pharmacy',
    'billing', 'insurance', 'inpatient', 'reports',
  ],
  CLINIC_ADMIN: [
    'dashboard', 'patients', 'queue', 'appointments', 'triage', 'consultations',
    'referrals', 'lab', 'imaging', 'procedures', 'prescriptions', 'pharmacy',
    'billing', 'insurance', 'inpatient', 'reports',
  ],
  DOCTOR: [
    'dashboard', 'patients', 'queue', 'appointments', 'triage', 'consultations',
    'referrals', 'lab', 'imaging', 'procedures', 'prescriptions', 'inpatient',
  ],
  NURSE: [
    'dashboard', 'patients', 'queue', 'appointments', 'triage', 'consultations',
    'procedures', 'inpatient',
  ],
  MIDWIFE: [
    'dashboard', 'patients', 'queue', 'appointments', 'triage', 'consultations',
    'procedures', 'inpatient',
  ],
  RECEPTIONIST: ['dashboard', 'patients', 'queue', 'appointments', 'billing', 'insurance'],
  RECORDS_OFFICER: ['dashboard', 'patients', 'appointments', 'referrals', 'reports'],
  PHARMACIST: ['dashboard', 'patients', 'prescriptions', 'pharmacy'],
  LAB_TECH: ['dashboard', 'patients', 'lab'],
  RADIOLOGY_STAFF: ['dashboard', 'patients', 'imaging'],
  CASHIER: ['dashboard', 'patients', 'billing', 'insurance', 'reports'],
};

export default function ClinicShell({
  user,
  clinicName = 'Action Boat Medical Centre',
  activeSection = 'dashboard',
  onSelectSection,
  children,
}: ClinicShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const effectiveRole = user?.clinicRole || user?.role || 'CLINIC_ADMIN';
  const allowed = new Set(ROLE_ALLOWED_SECTIONS[effectiveRole] || ROLE_ALLOWED_SECTIONS.CLINIC_ADMIN);
  const isAdmin = ['CLINIC_SUPER_ADMIN', 'CLINIC_ADMIN'].includes(effectiveRole);

  const navGroups: Array<{
    title: string;
    items: Array<{ key: ClinicSectionKey; label: string; icon: React.ComponentType<{ className?: string }> }>;
  }> = [
    {
      title: 'Overview',
      items: [{ key: 'dashboard', label: 'Command Centre', icon: Activity }],
    },
    {
      title: 'Patient Management',
      items: [{ key: 'patients', label: 'Patients & EMR', icon: Users }],
    },
    {
      title: 'Clinical Operations',
      items: [
        { key: 'queue', label: 'Reception & Queue', icon: ListOrdered },
        { key: 'appointments', label: 'Appointments', icon: Calendar },
        { key: 'triage', label: 'Triage & Nursing', icon: HeartPulse },
        { key: 'consultations', label: 'Consultations', icon: Stethoscope },
        { key: 'referrals', label: 'Referrals', icon: ArrowRightLeft },
        { key: 'inpatient', label: 'Wards & Inpatient', icon: Building2 },
      ],
    },
    {
      title: 'Diagnostics',
      items: [
        { key: 'lab', label: 'Laboratory', icon: FlaskConical },
        { key: 'imaging', label: 'Radiology & Imaging', icon: Scan },
        { key: 'procedures', label: 'Procedures', icon: Scissors },
      ],
    },
    {
      title: 'Medication',
      items: [
        { key: 'prescriptions', label: 'Prescriptions', icon: ClipboardList },
        { key: 'pharmacy', label: 'Pharmacy & Stock', icon: Pill },
      ],
    },
    {
      title: 'Finance',
      items: [
        { key: 'billing', label: 'Billing & Payments', icon: CreditCard },
        { key: 'insurance', label: 'Insurance & NHIS', icon: ShieldCheck },
      ],
    },
    {
      title: 'Analytics',
      items: [{ key: 'reports', label: 'Clinic Reports', icon: BarChart3 }],
    },
  ];

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/auth/login');
  };

  const handleNavClick = (key: ClinicSectionKey) => {
    setMobileOpen(false);
    if (pathname !== '/portal/clinic') {
      router.push(`/portal/clinic?tab=${key}`);
      return;
    }
    onSelectSection?.(key);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex text-slate-900">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-slate-950/50 z-30 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-40 h-screen w-64 bg-slate-950 text-slate-100 flex flex-col border-r border-slate-800 transition-transform duration-200 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="px-4 py-4 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-teal-600 flex items-center justify-center shrink-0">
              <HeartPulse className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-white truncate">{clinicName}</p>
              <p className="text-[11px] text-teal-400 font-medium truncate">Clinical EMR System</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
          {navGroups.map((group) => {
            const visibleItems = group.items.filter((item) => allowed.has(item.key));
            if (visibleItems.length === 0) return null;
            return (
              <div key={group.title}>
                <p className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  {group.title}
                </p>
                <div className="space-y-0.5">
                  {visibleItems.map((item) => {
                    const Icon = item.icon;
                    const active = pathname === '/portal/clinic' && activeSection === item.key;
                    return (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => handleNavClick(item.key)}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition ${
                          active
                            ? 'bg-teal-600 text-white shadow-sm'
                            : 'text-slate-300 hover:text-white hover:bg-slate-900'
                        }`}
                      >
                        <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-white' : 'text-slate-400'}`} />
                        <span className="truncate">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {isAdmin && (
            <div>
              <p className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Administration
              </p>
              <Link
                href="/portal/clinic/admin"
                onClick={() => setMobileOpen(false)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition ${
                  pathname.startsWith('/portal/clinic/admin')
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-900'
                }`}
              >
                <Settings className="w-4 h-4 shrink-0" />
                <span>Clinic Administration</span>
              </Link>
            </div>
          )}
        </nav>

        <div className="p-3 border-t border-slate-800/80 space-y-2">
          {user && (
            <div className="px-3 py-2 rounded-lg bg-slate-900/80 border border-slate-800">
              <p className="text-xs font-semibold text-white truncate">{user.name}</p>
              <p className="text-[11px] text-teal-400 font-medium truncate">{effectiveRole}</p>
            </div>
          )}
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-rose-300 hover:text-rose-200 hover:bg-rose-500/10 transition"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 min-w-0 flex flex-col overflow-x-hidden">
        <header className="h-14 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="text-sm font-bold text-slate-800">
              {pathname.startsWith('/portal/clinic/admin') ? 'Clinic Administration & Configuration' : 'Clinical Operations Workspace'}
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span className="hidden sm:inline font-medium">Africa/Accra • GHS (GH₵)</span>
            <Link
              href="/clinic/services"
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium"
            >
              Public Clinic Site
            </Link>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 max-w-[1600px] w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}
