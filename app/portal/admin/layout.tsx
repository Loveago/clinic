import React from 'react';
import SchoolAdminShell from '@/components/SchoolAdminShell';

export default function SchoolAdminLayout({ children }: { children: React.ReactNode }) {
  return <SchoolAdminShell>{children}</SchoolAdminShell>;
}
