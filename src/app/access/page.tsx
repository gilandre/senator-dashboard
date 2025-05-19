import React from 'react';
import { DoorOpen, Clock, Users, AlertTriangle } from 'lucide-react';
import ChartCard from '@/components/dashboard/chart-card';
import StatsCard from '@/components/dashboard/stats-card';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Accès | EMERAUDE DASHI",
  description: "Contrôle et gestion des accès à l'établissement",
};

export default function AccessPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Contrôle d&apos;accès</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard 
          title="Points d&apos;accès" 
          value={18} 
          icon={<DoorOpen className="h-6 w-6 text-blue-500" />}
          description="Points d&apos;accès actifs"
        />
        <StatsCard 
          title="Accès aujourd&apos;hui" 
          value={248} 
          icon={<Clock className="h-6 w-6 text-green-500" />}
          description="Entrées et sorties"
        />
        <StatsCard 
          title="Présents" 
          value={112} 
          icon={<Users className="h-6 w-6 text-orange-500" />}
          description="Personnes dans les locaux"
        />
        <StatsCard 
          title="Accès refusés" 
          value={3} 
          icon={<AlertTriangle className="h-6 w-6 text-red-500" />}
          description="Tentatives refusées aujourd&apos;hui"
        />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ChartCard 
          title="Activité en temps réel" 
          description="Événements d&apos;accès des dernières 24 heures"
        >
          <div className="h-80 flex items-center justify-center text-gray-500">
            Graphique d&apos;activité en temps réel
          </div>
        </ChartCard>
        
        <ChartCard 
          title="Statut des points d&apos;accès" 
          description="État actuel de tous les points d&apos;accès"
        >
          <div className="h-80 flex items-center justify-center text-gray-500">
            Statut des points d&apos;accès
          </div>
        </ChartCard>
      </div>
      
      <ChartCard 
        title="Derniers événements d&apos;accès" 
        description="Historique des derniers accès en temps réel"
      >
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800">
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Heure</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Badge</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Nom</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Point d&apos;accès</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Type</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Statut</th>
              </tr>
            </thead>
            <tbody>
              {[...Array(5)].map((_, index) => (
                <tr key={index} className="border-b border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900">
                  <td className="px-4 py-3 text-sm">10:0{index} AM</td>
                  <td className="px-4 py-3 text-sm">A12345{index}</td>
                  <td className="px-4 py-3 text-sm">Martin Dupont</td>
                  <td className="px-4 py-3 text-sm">Entrée principale</td>
                  <td className="px-4 py-3 text-sm">Entrée</td>
                  <td className="px-4 py-3 text-sm">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                      Autorisé
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCard>
    </div>
  );
} 