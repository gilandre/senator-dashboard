'use client';

import { ReferenceDataProvider } from "@/components/reference-data-provider";

export default function UsersLayout({ children }: { children: React.ReactNode }) {
  return (
    <ReferenceDataProvider 
      preloadTypes={['status', 'role']} 
      preloadModules={['users']}
    >
      {children}
    </ReferenceDataProvider>
  );
} 