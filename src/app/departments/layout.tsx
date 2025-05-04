'use client';

import TopMenu from '@/components/ui/top-menu';
import SideMenu from '@/components/ui/side-menu';
import { Toaster } from '@/components/ui/toaster';

export default function DepartmentsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col h-screen">
      <TopMenu />
      <div className="flex flex-1 overflow-hidden">
        <SideMenu />
        <main className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-gray-900">
          {children}
        </main>
      </div>
      <Toaster />
    </div>
  );
} 