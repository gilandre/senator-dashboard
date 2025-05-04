import React from 'react';
import { Clock, Filter, Download, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ChartCard from '@/components/dashboard/chart-card';
import StatsCard from '@/components/dashboard/stats-card';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Historique d'accès | EMERAUDE DASHI",
  description: "Consultez l'historique des accès à l'établissement",
};

export default function AccessHistoryPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Historique d&apos;accès</h1>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm">
            <Calendar className="h-4 w-4 mr-2" />
            Période
          </Button>
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filtrer
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Exporter
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard 
          title="Total des événements" 
          value={24871} 
          icon={<Clock className="h-6 w-6 text-blue-500" />}
          description="Tous les accès enregistrés"
        />
        <StatsCard 
          title="Ce mois-ci" 
          value={2145} 
          description="Événements du mois en cours"
          trend={{ value: 8, label: "vs mois précédent", positive: true }}
        />
        <StatsCard 
          title="Cette semaine" 
          value={483} 
          description="Événements des 7 derniers jours"
        />
        <StatsCard 
          title="Aujourd&apos;hui" 
          value={82} 
          description="Événements du jour"
        />
      </div>
      
      <ChartCard 
        title="Recherche avancée"
        description="Filtrez l&apos;historique selon plusieurs critères"
      >
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Date de début
            </label>
            <input 
              type="date" 
              className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
              aria-label="Date de début de la période"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Date de fin
            </label>
            <input 
              type="date" 
              className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
              aria-label="Date de fin de la période"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Badge ou Nom
            </label>
            <input 
              type="text" 
              placeholder="Rechercher..."
              className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Point d&apos;accès
            </label>
            <select 
              className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
              aria-label="Sélectionner un point d'accès"
            >
              <option value="">Tous les points d&apos;accès</option>
              <option value="entrance">Entrée principale</option>
              <option value="parking">Parking</option>
              <option value="offices">Bureaux</option>
            </select>
          </div>
        </div>
        <Button>Rechercher</Button>
      </ChartCard>
      
      <ChartCard 
        title="Historique des événements" 
        description="Liste chronologique des événements d&apos;accès"
      >
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800">
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Date</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Heure</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Badge</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Nom</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Département</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Point d&apos;accès</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Type</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Statut</th>
              </tr>
            </thead>
            <tbody>
              {[...Array(15)].map((_, index) => (
                <tr key={index} className="border-b border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900">
                  <td className="px-4 py-3 text-sm">12/06/2023</td>
                  <td className="px-4 py-3 text-sm">{15 - index}:30</td>
                  <td className="px-4 py-3 text-sm">A12345{index % 10}</td>
                  <td className="px-4 py-3 text-sm">
                    {index % 3 === 0 ? 'Martin Dupont' : index % 3 === 1 ? 'Sophie Martin' : 'Jean Durand'}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {index % 4 === 0 ? 'IT' : index % 4 === 1 ? 'RH' : index % 4 === 2 ? 'Finance' : 'Marketing'}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {index % 3 === 0 ? 'Entrée principale' : index % 3 === 1 ? 'Parking' : 'Bureaux'}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {index % 2 === 0 ? 'Entrée' : 'Sortie'}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      index % 5 === 0 
                        ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400' 
                        : 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                    }`}>
                      {index % 5 === 0 ? 'Refusé' : 'Autorisé'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between mt-6">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Affichage de 1 à 15 sur 24871 entrées
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" size="sm">Précédent</Button>
            <Button variant="outline" size="sm">Suivant</Button>
          </div>
        </div>
      </ChartCard>
    </div>
  );
} 