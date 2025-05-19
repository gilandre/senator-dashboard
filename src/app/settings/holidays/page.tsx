'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HolidaysRedirect() {
  const router = useRouter();
  
  useEffect(() => {
    router.replace('/settings/work-calendar');
  }, [router]);
  
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto"></div>
        <p className="mt-4 text-gray-500 dark:text-gray-400">Redirection en cours vers la gestion du temps et des présences...</p>
      </div>
    </div>
  );
} 