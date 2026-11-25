'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  GraduationCap,
  LayoutDashboard,
  BookOpen,
  FileText,
  HelpCircle,
  Award,
  CreditCard,
  User,
  Calendar,
  CheckCircle2,
  Bell,
  MessageSquare,
  Settings,
  LogOut,
  X,
  Stethoscope,
  Sparkles,
} from 'lucide-react';

interface StudentSidebarProps {
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export default function StudentSidebar({ mobileOpen, onCloseMobile }: StudentSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/auth/login');
    } catch (e) {
      router.push('/auth/login');
    }
  };

  const navItems = [
    { label: 'Dashboard', href: '/portal/student/dashboard', icon: LayoutDashboard },
    { label: 'My Courses', href: '/portal/student/courses', icon: BookOpen },
    { label: 'Learning Centre', href: '/portal/student/materials', icon: FileText },
    { label: 'Revision Centre', href: '/portal/student/revision', icon: Sparkles },
    { label: 'Exams', href: '/portal/student/exams', icon: HelpCircle },
    { label: 'Results', href: '/portal/student/results', icon: Award },
    { label: 'Attendance', href: '/portal/student/attendance', icon: CheckCircle2 },
    { label: 'Calendar', href: '/portal/student/calendar', icon: Calendar },
    { label: 'Announcements', href: '/portal/student/announcements', icon: Bell },
    { label: 'Support & Help', href: '/portal/student/support', icon: MessageSquare },
    { label: 'Payments', href: '/portal/student/payments', icon: CreditCard },
    { label: 'Profile & ID', href: '/portal/student/profile', icon: User },
    { label: 'Settings', href: '/portal/student/settings', icon: Settings },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* Sidebar - Deep emerald forest green strictly matching mockup */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-[#073832] text-white flex flex-col justify-between transition-transform duration-300 lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="overflow-y-auto flex-1">
          {/* Header & Logo */}
          <div className="p-6 flex items-center justify-between border-b border-emerald-900/60 sticky top-0 bg-[#073832] z-10">
            <Link href="/school" className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-emerald-800/80 border border-emerald-600/40 flex items-center justify-center text-white">
                <GraduationCap className="w-5 h-5 text-emerald-300" />
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-extrabold text-white leading-tight">Action Health</span>
                <span className="text-[10px] font-semibold text-emerald-300 uppercase tracking-wider">
                  Nursing School
                </span>
              </div>
            </Link>

            {onCloseMobile && (
              <button
                onClick={onCloseMobile}
                className="lg:hidden text-emerald-300 hover:text-white p-1"
                aria-label="Close sidebar"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                pathname === item.href ||
                (item.href !== '/portal/student/dashboard' && pathname.startsWith(item.href));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onCloseMobile}
                  className={`flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-emerald-900/90 text-white shadow-inner border border-emerald-700/50'
                      : 'text-emerald-100/70 hover:bg-emerald-900/40 hover:text-white'
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      isActive ? 'text-emerald-300' : 'text-emerald-200/60'
                    }`}
                  />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Actions */}
        <div className="p-4 border-t border-emerald-900/60 space-y-1.5 shrink-0 bg-[#073832]">
          <Link
            href="/"
            className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-xs font-medium text-emerald-200/80 hover:bg-emerald-900/40 hover:text-white transition-colors"
          >
            <Stethoscope className="w-3.5 h-3.5 text-emerald-400" />
            <span>Visit Medical Center</span>
          </Link>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-rose-200 hover:bg-rose-950/40 hover:text-rose-100 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5 text-rose-400" />
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
}
