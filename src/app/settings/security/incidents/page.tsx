import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Metadata } from 'next';
import { ToastProvider } from '@/components/ui/toast-provider';
import SecurityIncidentsClient from './incidents-client';

export const metadata: Metadata = {
  title: 'Historique des incidents de sécurité | SENATOR INVESTECH',
  description: 'Consultation et gestion de l\'historique des incidents de sécurité'
};

export default function SecurityIncidentsPage() {
  return (
    <ToastProvider>
      <div className="container mx-auto py-6 max-w-7xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link href="/settings/security" passHref>
              <Button variant="outline" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <h1 className="text-2xl font-bold tracking-tight">Historique des incidents de sécurité</h1>
          </div>
        </div>
        
        <SecurityIncidentsClient />
      </div>
    </ToastProvider>
  );
} 