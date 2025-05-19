import { Metadata } from 'next';
import { SyncConfigForm } from '@/components/config/sync-config-form';

export const metadata: Metadata = {
  title: 'Configuration de la synchronisation | Senator',
  description: 'Configurez les paramètres de synchronisation des données',
};

export default function SyncConfigPage() {
  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">Configuration de la synchronisation</h1>
      <SyncConfigForm />
    </div>
  );
} 