"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ImportRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.push('/import/csv');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="flex flex-col items-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        <p className="text-muted-foreground">Redirection vers l'interface d'importation...</p>
      </div>
    </div>
  );
} 