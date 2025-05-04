import React from 'react';
import { AlertTriangle, ShieldAlert, Clock, Filter } from 'lucide-react';
import ChartCard from '@/components/dashboard/chart-card';
import StatsCard from '@/components/dashboard/stats-card';
import { Button } from '@/components/ui/button';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Anomalies | EMERAUDE DASHI",
  description: "Détection et analyse des anomalies d'accès",
};

export default function AnomaliesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Anomalies</h1>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filtrer
          </Button>
          <Button variant="outline" size="sm">
            Exporter
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard 
          title="Total anomalies" 
          value={187} 
          icon={<AlertTriangle className="h-6 w-6 text-red-500" />}
          description="Sur les 30 derniers jours"
          trend={{ value: 12, label: "vs mois précédent", positive: false }}
        />
        <StatsCard 
          title="Accès refusés" 
          value={142} 
          icon={<ShieldAlert className="h-6 w-6 text-orange-500" />}
          description="Badges non autorisés"
        />
        <StatsCard 
          title="Tentatives hors heures" 
          value={32} 
          icon={<Clock className="h-6 w-6 text-yellow-500" />}
          description="Accès en dehors des horaires"
        />
        <StatsCard 
          title="Badges inconnus" 
          value={13} 
          icon={<AlertTriangle className="h-6 w-6 text-blue-500" />}
          description="Badges non enregistrés"
        />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard 
          title="Anomalies par type" 
          description="Répartition des types d&apos;anomalies"
        >
          <div className="h-80 flex items-center justify-center text-gray-500">
            Graphique répartition des anomalies
          </div>
        </ChartCard>
        
        <ChartCard 
          title="Tendance des anomalies" 
          description="Évolution sur les 30 derniers jours"
        >
          <div className="h-80 flex items-center justify-center text-gray-500">
            Graphique tendance des anomalies
          </div>
        </ChartCard>
      </div>
      
      <ChartCard 
        title="Détail des anomalies" 
        description="Liste des dernières anomalies détectées"
      >
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800">
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Date</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Heure</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Badge</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Point d&apos;accès</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Type d&apos;anomalie</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Sévérité</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Action</th>
              </tr>
            </thead>
            <tbody>
              {[...Array(10)].map((_, index) => (
                <tr key={index} className="border-b border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900">
                  <td className="px-4 py-3 text-sm">12/06/2023</td>
                  <td className="px-4 py-3 text-sm">08:4{index} AM</td>
                  <td className="px-4 py-3 text-sm">B98765{index}</td>
                  <td className="px-4 py-3 text-sm">Entrée Parking</td>
                  <td className="px-4 py-3 text-sm">
                    {index % 3 === 0 ? 'Badge non autorisé' : index % 3 === 1 ? 'Hors horaires' : 'Badge inconnu'}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      index % 3 === 0 
                        ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400' 
                        : index % 3 === 1 
                          ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                          : 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                    }`}>
                      {index % 3 === 0 ? 'Haute' : index % 3 === 1 ? 'Moyenne' : 'Basse'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <Button variant="ghost" size="sm">Détails</Button>
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