"use client";

import React from 'react';
import { Users, Clock, AlertTriangle, Building } from 'lucide-react';
import StatsCard from './stats-card';

export function DashboardMetrics() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <StatsCard 
        title="Total des enregistrements" 
        value={1245} 
        icon={<Clock className="h-6 w-6 text-blue-500" />}
        description="Nombre total d'événements d'accès"
      />
      <StatsCard 
        title="Employés" 
        value={845} 
        icon={<Users className="h-6 w-6 text-green-500" />}
        description="Événements liés aux employés"
      />
      <StatsCard 
        title="Visiteurs" 
        value={400} 
        icon={<Users className="h-6 w-6 text-orange-500" />}
        description="Événements liés aux visiteurs"
      />
      <StatsCard 
        title="Anomalies" 
        value={28} 
        icon={<AlertTriangle className="h-6 w-6 text-red-500" />}
        description="Accès refusés ou invalides"
      />
    </div>
  );
} 