'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2 } from 'lucide-react';
import SecuritySettings from './components/SecuritySettings';
import SecurityStatistics from './components/SecurityStatistics';
import SecurityIncidents from './components/SecurityIncidents';
import SecurityAudit from './components/SecurityAudit';

export default function SecuritySettingsPage() {
  const { data: session, status } = useSession();
  const [activeTab, setActiveTab] = useState('settings');

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (status === 'unauthenticated' || !session?.user?.role || (session.user.role !== 'admin' && session.user.role.toLowerCase() !== 'admin')) {
    return (
      <Card className="p-4">
        <div className="text-center text-red-500">
          Vous n'avez pas les droits nécessaires pour accéder à cette page.
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Paramètres de sécurité</h1>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="settings">Paramètres</TabsTrigger>
          <TabsTrigger value="statistics">Statistiques</TabsTrigger>
          <TabsTrigger value="incidents">Incidents</TabsTrigger>
          <TabsTrigger value="audit">Audits</TabsTrigger>
        </TabsList>

        <TabsContent value="settings">
          <SecuritySettings />
        </TabsContent>

        <TabsContent value="statistics">
          <SecurityStatistics />
        </TabsContent>

        <TabsContent value="incidents">
          <SecurityIncidents />
        </TabsContent>

        <TabsContent value="audit">
          <SecurityAudit />
        </TabsContent>
      </Tabs>
    </div>
  );
} 