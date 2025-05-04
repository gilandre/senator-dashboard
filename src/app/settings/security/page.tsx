import React from 'react';
import { Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Metadata } from 'next';
import SecuritySettingsClient from './security-settings-client';
import { ToastProvider } from '@/components/ui/toast-provider';

export const metadata: Metadata = {
  title: "Paramètres de sécurité | SenatorFX",
  description: "Configuration des paramètres de sécurité du système",
};

export default function SecuritySettingsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/settings">
            <Button variant="ghost" size="sm">
              ← Retour
            </Button>
          </Link>
          <div className="flex items-center">
            <Shield className="h-6 w-6 mr-2 text-primary" />
            <h1 className="text-2xl font-bold">Paramètres de sécurité</h1>
          </div>
        </div>
      </div>
      
      <ToastProvider>
        <SecuritySettingsClient />
      </ToastProvider>
    </div>
  );
} 