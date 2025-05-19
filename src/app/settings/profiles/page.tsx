import React from 'react';
import { Users, Search, Plus, Filter, ChevronLeft, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import ChartCard from '@/components/dashboard/chart-card';
import { Metadata } from 'next';
import ProfilesTableClient from './profiles-table-client';

export const metadata: Metadata = {
  title: "Profils utilisateurs | SenatorFX",
  description: "Configuration des profils d'accès au système",
};

export default function ProfilesSettingsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Link href="/settings" className="mr-4">
            <Button variant="ghost" size="sm">
              <ChevronLeft className="h-4 w-4 mr-1" />
              Retour
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Profils utilisateurs</h1>
        </div>
        <div className="flex space-x-2">
          <Link href="/settings/profiles/new">
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Nouveau profil
            </Button>
          </Link>
        </div>
      </div>
      
      <ProfilesTableClient />
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ChartCard 
          title="Matrice des permissions" 
          description="Vue d'ensemble des permissions par profil"
        >
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800">
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Module</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-500 dark:text-gray-400">Admin</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-500 dark:text-gray-400">Gestionnaire</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-500 dark:text-gray-400">Opérateur</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-500 dark:text-gray-400">Consultant</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { module: "Tableau de bord", admin: "Complet", manager: "Lecture", operator: "Lecture", consultant: "Lecture" },
                  { module: "Accès", admin: "Complet", manager: "Complet", operator: "Écriture", consultant: "Lecture" },
                  { module: "Rapports", admin: "Complet", manager: "Complet", operator: "Lecture", consultant: "Lecture" },
                  { module: "Utilisateurs", admin: "Complet", manager: "Lecture", operator: "Non", consultant: "Non" },
                  { module: "Configuration", admin: "Complet", manager: "Partiel", operator: "Non", consultant: "Non" }
                ].map((row, index) => (
                  <tr key={index} className="border-b border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900">
                    <td className="px-4 py-3 text-sm font-medium">{row.module}</td>
                    <td className="px-4 py-3 text-sm text-center">
                      <span className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        row.admin === 'Complet' 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' 
                          : row.admin === 'Partiel'
                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                            : row.admin === 'Lecture'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                              : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                      }`}>
                        {row.admin}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-center">
                      <span className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        row.manager === 'Complet' 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' 
                          : row.manager === 'Partiel'
                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                            : row.manager === 'Lecture'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                              : row.manager === 'Non'
                                ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                                : 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
                      }`}>
                        {row.manager}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-center">
                      <span className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        row.operator === 'Complet' 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' 
                          : row.operator === 'Partiel'
                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                            : row.operator === 'Écriture'
                              ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400'
                            : row.operator === 'Lecture'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                              : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                      }`}>
                        {row.operator}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-center">
                      <span className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        row.consultant === 'Complet' 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' 
                          : row.consultant === 'Partiel'
                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                            : row.consultant === 'Lecture'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                              : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                      }`}>
                        {row.consultant}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ChartCard>
        
        <ChartCard 
          title="Statistiques des profils" 
          description="Répartition des utilisateurs par profil"
        >
          <div className="p-4">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              <p>Total des utilisateurs: 39</p>
              <p>Nombre de profils actifs: 5</p>
              <p>Profil le plus utilisé: Opérateur (15 utilisateurs)</p>
            </div>
            <div className="h-48 mt-6">
              {/* Emplacement pour un graphique futur */}
              <div className="w-full h-full bg-gray-100 dark:bg-gray-800 rounded-md flex items-center justify-center">
                <span className="text-sm text-gray-500 dark:text-gray-400">Graphique des profils</span>
              </div>
            </div>
          </div>
        </ChartCard>
      </div>
    </div>
  );
} 