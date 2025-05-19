import React from 'react';
import { Building, Plus, Search, Users, PieChart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ChartCard from '@/components/dashboard/chart-card';
import StatsCard from '@/components/dashboard/stats-card';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Groupes | SenatorFX",
  description: "Gestion des groupes et leurs accès",
};

export default function DepartmentsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Groupes</h1>
        <div className="flex space-x-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <input 
              type="text" 
              placeholder="Rechercher un groupe..." 
              className="pl-9 py-2 pr-4 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900"
              aria-label="Rechercher un groupe"
            />
          </div>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Nouveau groupe
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard 
          title="Groupes" 
          value={8} 
          icon={<Building className="h-6 w-6 text-blue-500" />}
          description="Nombre total de groupes"
        />
        <StatsCard 
          title="Employés" 
          value={248} 
          icon={<Users className="h-6 w-6 text-green-500" />}
          description="Répartis dans les groupes"
        />
        <StatsCard 
          title="Taille moyenne" 
          value={31} 
          icon={<PieChart className="h-6 w-6 text-orange-500" />}
          description="Employés par groupe"
        />
        <StatsCard 
          title="Plus grand" 
          value="IT" 
          description="68 employés"
        />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard 
          title="Liste des groupes" 
          description="Tous les groupes avec le nombre d'employés"
        >
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800">
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Nom du groupe</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Responsable</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Employés</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Étage</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { name: 'IT', manager: 'Jean Dupont', employees: 68, floor: 3 },
                  { name: 'Finance', manager: 'Marie Laurent', employees: 42, floor: 2 },
                  { name: 'Marketing', manager: 'Paul Martin', employees: 36, floor: 4 },
                  { name: 'Ressources Humaines', manager: 'Sophie Bernard', employees: 18, floor: 2 },
                  { name: 'Commercial', manager: 'Pierre Dubois', employees: 35, floor: 1 },
                  { name: 'Juridique', manager: 'Claire Moreau', employees: 12, floor: 5 },
                  { name: 'R&D', manager: 'Thomas Leroy', employees: 24, floor: 3 },
                  { name: 'Direction', manager: 'Luc Girard', employees: 8, floor: 6 }
                ].map((dept, index) => (
                  <tr key={index} className="border-b border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900">
                    <td className="px-4 py-3 text-sm font-medium">{dept.name}</td>
                    <td className="px-4 py-3 text-sm">{dept.manager}</td>
                    <td className="px-4 py-3 text-sm">{dept.employees}</td>
                    <td className="px-4 py-3 text-sm">{dept.floor}</td>
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
        </ChartCard>
        
        <ChartCard 
          title="Répartition des employés" 
          description="Pourcentage d'employés par groupe"
        >
          <div className="h-96 flex items-center justify-center text-gray-500">
            Graphique de répartition des employés par groupe
          </div>
        </ChartCard>
      </div>
      
      <ChartCard 
        title="Points d'accès par groupe" 
        description="Attribution des points d'accès autorisés par groupe"
      >
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800">
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Groupe</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Entrée principale</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Parking</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Étage spécifique</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Salles de réunion</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Zone sécurisée</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody>
              {[
                { name: 'IT', principal: true, parking: true, specific: 'Étage 3', meeting: true, secure: true },
                { name: 'Finance', principal: true, parking: true, specific: 'Étage 2', meeting: true, secure: true },
                { name: 'Marketing', principal: true, parking: true, specific: 'Étage 4', meeting: true, secure: false },
                { name: 'Ressources Humaines', principal: true, parking: true, specific: 'Étage 2', meeting: true, secure: true },
                { name: 'Commercial', principal: true, parking: true, specific: 'Étage 1', meeting: true, secure: false },
                { name: 'Juridique', principal: true, parking: true, specific: 'Étage 5', meeting: true, secure: true },
                { name: 'R&D', principal: true, parking: true, specific: 'Étage 3', meeting: true, secure: true },
                { name: 'Direction', principal: true, parking: true, specific: 'Tous les étages', meeting: true, secure: true }
              ].map((dept, index) => (
                <tr key={index} className="border-b border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900">
                  <td className="px-4 py-3 text-sm font-medium">{dept.name}</td>
                  <td className="px-4 py-3 text-sm text-center">
                    {dept.principal ? '✓' : ''}
                  </td>
                  <td className="px-4 py-3 text-sm text-center">
                    {dept.parking ? '✓' : ''}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {dept.specific}
                  </td>
                  <td className="px-4 py-3 text-sm text-center">
                    {dept.meeting ? '✓' : ''}
                  </td>
                  <td className="px-4 py-3 text-sm text-center">
                    {dept.secure ? '✓' : ''}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <Button variant="ghost" size="sm">Gérer les accès</Button>
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