import React from 'react';
import { Users, Search, Filter, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ChartCard from '@/components/dashboard/chart-card';
import StatsCard from '@/components/dashboard/stats-card';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Employés | SenatorFX",
  description: "Gestion des employés et de leurs accès",
};

export default function EmployeesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Employés</h1>
        <div className="flex space-x-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <input 
              type="text" 
              placeholder="Rechercher un employé..." 
              className="pl-9 py-2 pr-4 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900"
              aria-label="Rechercher un employé"
            />
          </div>
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filtrer
          </Button>
          <Button size="sm">
            <UserPlus className="h-4 w-4 mr-2" />
            Nouvel employé
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard 
          title="Total employés" 
          value={248} 
          icon={<Users className="h-6 w-6 text-blue-500" />}
          description="Employés actifs"
        />
        <StatsCard 
          title="Présents aujourd'hui" 
          value={172} 
          description="Employés dans les locaux"
          trend={{ value: 69, label: "Taux de présence", positive: true }}
        />
        <StatsCard 
          title="Nouveaux ce mois" 
          value={12} 
          description="Embauches récentes"
        />
        <StatsCard 
          title="Badges expirés" 
          value={5} 
          description="Badges à renouveler"
        />
      </div>
      
      <ChartCard 
        title="Liste des employés" 
        description="Employés avec leurs informations d'accès"
      >
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800">
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Nom</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Prénom</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Badge</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Département</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Statut</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Dernier accès</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody>
              {[...Array(10)].map((_, index) => (
                <tr key={index} className="border-b border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900">
                  <td className="px-4 py-3 text-sm">
                    {index % 3 === 0 ? 'Dupont' : index % 3 === 1 ? 'Martin' : 'Durand'}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {index % 3 === 0 ? 'Martin' : index % 3 === 1 ? 'Sophie' : 'Jean'}
                  </td>
                  <td className="px-4 py-3 text-sm">A12345{index}</td>
                  <td className="px-4 py-3 text-sm">
                    {index % 4 === 0 ? 'IT' : index % 4 === 1 ? 'RH' : index % 4 === 2 ? 'Finance' : 'Marketing'}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      index % 5 === 0 
                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' 
                        : 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                    }`}>
                      {index % 5 === 0 ? 'Absent' : 'Présent'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {index % 5 === 0 ? 'Il y a 1 jour' : "Aujourd'hui 10:30"}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <div className="flex space-x-2">
                      <Button variant="ghost" size="sm">Voir</Button>
                      <Button variant="ghost" size="sm">Modifier</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between mt-6">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Affichage de 1 à 10 sur 248 employés
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" size="sm">Précédent</Button>
            <Button variant="outline" size="sm">Suivant</Button>
          </div>
        </div>
      </ChartCard>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ChartCard 
          title="Répartition par département" 
          description="Nombre d'employés par département"
        >
          <div className="h-80 flex items-center justify-center text-gray-500">
            Graphique de répartition par département
          </div>
        </ChartCard>
        
        <ChartCard 
          title="Statistiques d'accès" 
          description="Activité d'accès des employés"
        >
          <div className="h-80 flex items-center justify-center text-gray-500">
            Graphique des statistiques d'accès
          </div>
        </ChartCard>
      </div>
    </div>
  );
} 