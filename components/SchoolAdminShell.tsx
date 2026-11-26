'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';
import {
  BarChart3,
  Users,
  GraduationCap,
  UserCheck,
  BookOpen,
  FileText,
  Award,
  DollarSign,
  Bell,
  FileSpreadsheet,
  Menu,
  X,
  LogOut,
  ExternalLink,
  Stethoscope,
  Shield,
  Clock,
} from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  match: (pathname: string, tab: string | null) => boolean;
  icon: React.ComponentType<{ className?: string }>;
  badgeKey?: 'pendingApplications' | 'totalStudents' | 'totalLecturers';
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    title: 'Overview',
    items: [
      {
        label: 'Executive Dashboard',
        href: '/portal/admin',
        match: (p, t) => p === '/portal/admin' && (!t || t === 'overview'),
        icon: BarChart3,
      },
      {
        label: 'Announcements',
        href: '/portal/admin?tab=announcements',
        match: (p, t) => p === '/portal/admin' && t === 'announcements',
        icon: Bell,
      },
      {
        label: 'Reports & Exports',
        href: '/portal/admin?tab=reports',
        match: (p, t) => p === '/portal/admin' && t === 'reports',
        icon: FileSpreadsheet,
      },
    ],
  },
  {
    title: 'Admissions & Students',
    items: [
      {
        label: 'Admissions Console',
        href: '/portal/admin/admissions',
        match: (p, t) => p.startsWith('/portal/admin/admissions') || (p === '/portal/admin' && t === 'admissions'),
        icon: GraduationCap,
        badgeKey: 'pendingApplications',
      },
      {
        label: 'Student Directory',
        href: '/portal/admin/students',
        match: (p, t) => p.startsWith('/portal/admin/students') || (p === '/portal/admin' && t === 'students'),
        icon: Users,
        badgeKey: 'totalStudents',
      },
    ],
  },
  {
    title: 'Academics & Learning',
    items: [
      {
        label: 'Programmes & Academics',
        href: '/portal/admin/academics',
        match: (p, t) => p.startsWith('/portal/admin/academics') || (p === '/portal/admin' && t === 'academics'),
        icon: BookOpen,
      },
      {
        label: 'Lecturers & Faculty',
        href: '/portal/admin?tab=lecturers',
        match: (p, t) => p === '/portal/admin' && t === 'lecturers',
        icon: UserCheck,
        badgeKey: 'totalLecturers',
      },
      {
        label: 'Learning & Topics',
        href: '/portal/admin/learning',
        match: (p) => p.startsWith('/portal/admin/learning'),
        icon: FileText,
      },
      {
        label: 'Examinations Console',
        href: '/portal/admin/examinations',
        match: (p, t) => p.startsWith('/portal/admin/examinations') || (p === '/portal/admin' && t === 'exams'),
        icon: Award,
      },
      {
        label: 'Student Results & Academics',
        href: '/portal/admin/results',
        match: (p) => p.startsWith('/portal/admin/results'),
        icon: GraduationCap,
      },
    ],
  },
  {
    title: 'Finance',
    items: [
      {
        label: 'Tuition & Fee Finance',
        href: '/portal/admin/finance',
        match: (p, t) => p.startsWith('/portal/admin/finance') || (p === '/portal/admin' && t === 'finance'),
        icon: DollarSign,
      },
    ],
  },
];

function SchoolAdminShellInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const currentTab = searchParams.get('tab');

  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.user) setUser(d.user);
      })
      .catch(() => {});

    fetch('/api/admin/overview')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.stats) {
          setCounts({
            pendingApplications: d.stats.pendingApplications || 0,
            totalStudents: d.stats.totalStudents || 0,
            totalLecturers: d.stats.totalLecturers || 0,
          });
        }
      })
      .catch(() => {});
  }, [pathname]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    router.push('/auth/login');
  };

  const accraDate = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Accra',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date());

  return (
    <div className="min-h-screen bg-slate-50 flex text-slate-900">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-slate-950/60 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Left Sidebar */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-50 h-screen w-68 bg-slate-950 text-slate-100 flex flex-col border-r border-slate-800/80 transition-transform duration-200 shrink-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="h-16 px-5 flex items-center justify-between border-b border-slate-800/80">
          <Link href="/portal/admin" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-black tracking-tight text-white">Action Health</div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">
                School Admin
              </div>
            </div>
          </Link>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
          {NAV_GROUPS.map((group) => (
            <div key={group.title}>
              <div className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                {group.title}
              </div>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = item.match(pathname, currentTab);
                  const badgeVal = item.badgeKey ? counts[item.badgeKey] : 0;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={`flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                        active
                          ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30'
                          : 'text-slate-300 hover:text-white hover:bg-slate-900'
                      }`}
                    >
                      <span className="flex items-center gap-2.5 truncate">
                        <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-white' : 'text-slate-400'}`} />
                        <span className="truncate">{item.label}</span>
                      </span>
                      {badgeVal > 0 && (
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                            active ? 'bg-white/20 text-white' : 'bg-slate-800 text-emerald-400'
                          }`}
                        >
                          {badgeVal}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer links */}
        <div className="p-3 border-t border-slate-800/80 space-y-1.5">
          <Link
            href="/school"
            className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-900 transition"
          >
            <span>Public School Portal</span>
            <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-rose-300 hover:text-rose-200 hover:bg-rose-500/10 transition"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col overflow-x-hidden">
        {/* Sticky Topbar */}
        <div className="h-14 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100"
              aria-label="Open School Admin menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500 font-medium">
              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-bold border border-emerald-200">
                School Management System
              </span>
              <span className="flex items-center gap-1 text-slate-400">
                <Clock className="w-3.5 h-3.5" />
                {accraDate} (Africa/Accra)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {user && (
              <div className="flex items-center gap-2 text-xs">
                <div className="text-right hidden sm:block">
                  <div className="font-bold text-slate-900">{user.name}</div>
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700">
                    {user.role}
                  </div>
                </div>
                <div className="w-8 h-8 rounded-full bg-[#073832] text-white flex items-center justify-center font-bold text-xs">
                  {String(user.name || 'A').charAt(0).toUpperCase()}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </div>
  );
}

export default function SchoolAdminShell({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50">{children}</div>}>
      <SchoolAdminShellInner>{children}</SchoolAdminShellInner>
    </Suspense>
  );
}
