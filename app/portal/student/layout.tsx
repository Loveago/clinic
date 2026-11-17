'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import StudentSidebar from '@/components/StudentSidebar';

export default function StudentPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    let active = true;
    fetch('/api/auth/me')
      .then((res) => {
        if (res.status === 401 || res.status === 403) {
          router.replace('/auth/login');
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (!active || !data) return;
        const user = data.user;
        if (!user || !['STUDENT', 'SUPER_ADMIN'].includes(user.role)) {
          router.replace('/auth/login');
          return;
        }
        setAuthChecked(true);
      })
      .catch(() => {
        if (active) router.replace('/auth/login');
      });
    return () => {
      active = false;
    };
  }, [router]);

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-[#f8faf9] flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-2 border-[#073832] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-semibold text-slate-500">Verifying student session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8faf9] flex">
      {/* Sidebar */}
      <StudentSidebar
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        {children}
      </div>
    </div>
  );
}

