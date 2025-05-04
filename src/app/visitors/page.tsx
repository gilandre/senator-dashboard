import React from 'react';
import { Users, Search, Filter, UserPlus, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ChartCard from '@/components/dashboard/chart-card';
import StatsCard from '@/components/dashboard/stats-card';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Visiteurs | SenatorFX",
  description: "Gestion des visiteurs et de leurs accès",
};

export default function VisitorsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Visiteurs</h1>
        <div className="flex space-x-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <input 
              type="text" 
              placeholder="Rechercher un visiteur..." 
              className="pl-9 py-2 pr-4 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900"
              aria-label="Rechercher un visiteur"
            />
          </div>
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filtrer
          </Button>
          <Button size="sm">
            <UserPlus className="h-4 w-4 mr-2" />
            Nouveau visiteur
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard 
          title="Total visiteurs" 
          value={152} 
          icon={<Users className="h-6 w-6 text-blue-500" />}
          description="Visiteurs enregistrés ce mois"
        />
        <StatsCard 
          title="Présents actuellement" 
          value={24} 
          icon={<Clock className="h-6 w-6 text-green-500" />}
          description="Visiteurs dans les locaux"
        />
        <StatsCard 
          title="Visites aujourd&apos;hui" 
          value={42} 
          description="Visites programmées"
          trend={{ value: 15, label: "vs hier", positive: true }}
        />
        <StatsCard 
          title="Temps moyen" 
          value="1h45" 
          description="Durée moyenne de visite"
        />
      </div>
      
      <ChartCard 
        title="Visiteurs actuels" 
        description="Visiteurs présents dans les locaux"
      >
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800">
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Nom</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Prénom</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Badge</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Entreprise</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Contact interne</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Arrivée</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Durée</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody>
              {[...Array(5)].map((_, index) => (
                <tr key={index} className="border-b border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900">
                  <td className="px-4 py-3 text-sm">
                    {index % 3 === 0 ? 'Bernard' : index % 3 === 1 ? 'Lambert' : 'Petit'}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {index % 3 === 0 ? 'Claire' : index % 3 === 1 ? 'Thomas' : 'Marie'}
                  </td>
                  <td className="px-4 py-3 text-sm">V98765{index}</td>
                  <td className="px-4 py-3 text-sm">
                    {index % 4 === 0 ? 'TechCorp' : index % 4 === 1 ? 'InnoSystems' : index % 4 === 2 ? 'Digital Partners' : 'NextGen Solutions'}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {index % 3 === 0 ? 'Martin Dupont' : index % 3 === 1 ? 'Sophie Martin' : 'Jean Durand'}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {9 + index}:15
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {(index + 1) * 25}min
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <div className="flex space-x-2">
                      <Button variant="ghost" size="sm">Détails</Button>
                      <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300">
                        Départ
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCard>
      
      <ChartCard 
        title="Visites programmées" 
        description="Visiteurs attendus aujourd&apos;hui"
      >
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800">
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Nom</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Prénom</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Entreprise</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Contact interne</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Heure prévue</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Status</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody>
              {[...Array(5)].map((_, index) => (
                <tr key={index} className="border-b border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900">
                  <td className="px-4 py-3 text-sm">
                    {index % 3 === 0 ? 'Roux' : index % 3 === 1 ? 'Moreau' : 'Leroy'}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {index % 3 === 0 ? 'Julien' : index % 3 === 1 ? 'Camille' : 'Emilie'}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {index % 4 === 0 ? 'Smart Solutions' : index % 4 === 1 ? 'Data Systems' : index % 4 === 2 ? 'Cloud Partners' : 'Mobility Tech'}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {index % 3 === 0 ? 'Jean Durand' : index % 3 === 1 ? 'Sophie Martin' : 'Martin Dupont'}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {14 + index}:00
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      index % 3 === 0 
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400' 
                        : index % 3 === 1
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                          : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                    }`}>
                      {index % 3 === 0 ? 'À venir' : index % 3 === 1 ? 'Présent' : 'En attente'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <div className="flex space-x-2">
                      <Button variant="ghost" size="sm">Détails</Button>
                      <Button variant="ghost" size="sm">Enregistrer</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCard>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ChartCard 
          title="Statistiques des visites" 
          description="Évolution des visites sur les 30 derniers jours"
        >
          <div className="h-80 flex items-center justify-center text-gray-500">
            Graphique d&apos;évolution des visites
          </div>
        </ChartCard>
        
        <ChartCard 
          title="Répartition par entreprise" 
          description="Top 10 des entreprises visiteuses"
        >
          <div className="h-80 flex items-center justify-center text-gray-500">
            Graphique de répartition par entreprise
          </div>
        </ChartCard>
      </div>
    </div>
  );
} 