'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Bell, Menu, Check } from 'lucide-react';
import DemoRoleSwitcher from './DemoRoleSwitcher';

export interface StudentNotification {
  id: string;
  title: string;
  message: string;
  read?: boolean;
}

interface StudentHeaderProps {
  onOpenMobileMenu?: () => void;
  title?: string;
  subtitle?: string;
  avatarUrl?: string;
  notifications?: StudentNotification[];
}

export default function StudentHeader({
  onOpenMobileMenu,
  title = 'Student Dashboard',
  subtitle = 'Student Academic Portal',
  avatarUrl = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
  notifications = [],
}: StudentHeaderProps) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [readIds, setReadIds] = useState<Record<string, boolean>>({});

  const unreadCount = notifications.filter((n) => !n.read && !readIds[n.id]).length;

  const handleMarkAllRead = () => {
    const next: Record<string, boolean> = {};
    notifications.forEach((n) => {
      next[n.id] = true;
    });
    setReadIds(next);
  };

  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-100 py-4 px-4 sm:px-8 flex items-center justify-between">
      {/* Left: Mobile trigger & Titles */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileMenu}
          className="lg:hidden p-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          aria-label="Open mobile menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 leading-tight">
            {title}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">{subtitle}</p>
        </div>
      </div>

      {/* Right: Actions, Notifications, Avatar */}
      <div className="flex items-center gap-3 sm:gap-4">
        <div className="hidden sm:block">
          <DemoRoleSwitcher />
        </div>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 text-slate-600 hover:text-emerald-800 hover:bg-emerald-50 rounded-full transition-colors relative"
            aria-label="View notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-emerald-500 rounded-full ring-2 ring-white" />
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-slate-100 p-4 z-50 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Announcements &amp; Alerts
                </h4>
                {notifications.length > 0 && (
                  <button
                    type="button"
                    onClick={handleMarkAllRead}
                    disabled={unreadCount === 0}
                    className="text-[11px] text-emerald-700 font-semibold hover:underline disabled:text-slate-400 disabled:no-underline flex items-center gap-1"
                  >
                    {unreadCount === 0 && <Check className="w-3 h-3" />}
                    <span>{unreadCount === 0 ? 'All read' : 'Mark all read'}</span>
                  </button>
                )}
              </div>
              {notifications.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-500">
                  No new announcements or alerts.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 text-xs max-h-72 overflow-y-auto">
                  {notifications.map((item) => {
                    const isRead = Boolean(item.read || readIds[item.id]);
                    return (
                      <div
                        key={item.id}
                        className={`py-2.5 transition-opacity ${isRead ? 'opacity-60' : ''}`}
                      >
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          {!isRead && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />}
                          <span>{item.title}</span>
                        </div>
                        <div className="text-slate-500 text-[11px] mt-0.5">
                          {item.message}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Avatar (matching mockup) */}
        <div className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-full overflow-hidden border-2 border-emerald-600/30 shadow-sm">
          <Image
            src={avatarUrl}
            alt="Student Avatar"
            fill
            className="object-cover"
          />
        </div>
      </div>
    </header>
  );
}

