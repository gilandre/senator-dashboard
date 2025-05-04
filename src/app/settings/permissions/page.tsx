import React from 'react';
import { Lock, Search, Plus, ChevronLeft, ShieldCheck, Check, X, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import ChartCard from '@/components/dashboard/chart-card';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Gestion des permissions | SenatorFX",
  description: "Gestion détaillée des droits d'accès au système",
};

export default function PermissionsSettingsPage() {
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
          <h1 className="text-2xl font-bold">Gestion des permissions</h1>
        </div>
        <div className="flex space-x-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <input 
              type="text" 
              placeholder="Rechercher une permission..." 
              className="pl-9 py-2 pr-4 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900"
              aria-label="Rechercher une permission"
            />
          </div>
          <Button size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filtrer
          </Button>
        </div>
      </div>
      
      <div className="flex space-x-4 mb-4">
        <Button variant="outline" className="flex items-center">
          <ShieldCheck className="h-4 w-4 mr-2" />
          Tous les modules
        </Button>
        {['Tableau de bord', 'Accès', 'Rapports', 'Utilisateurs', 'Configuration'].map((module, index) => (
          <Button key={index} variant="outline" className="flex items-center">
            {module}
          </Button>
        ))}
      </div>
      
      <ChartCard 
        title="Permissions par module" 
        description="Définition détaillée des droits d'accès par module et fonction"
      >
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800">
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Module / Fonction</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-500 dark:text-gray-400">Voir</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-500 dark:text-gray-400">Créer</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-500 dark:text-gray-400">Modifier</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-500 dark:text-gray-400">Supprimer</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-500 dark:text-gray-400">Approuver</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-500 dark:text-gray-400">Exporter</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody>
              {[
                { 
                  name: "Tableau de bord", 
                  isModule: true,
                  view: true, 
                  create: false, 
                  edit: false, 
                  delete: false, 
                  approve: false, 
                  export: true 
                },
                { 
                  name: "Statistiques générales", 
                  isFunction: true,
                  parentModule: "Tableau de bord",
                  view: true, 
                  create: false, 
                  edit: false, 
                  delete: false, 
                  approve: false, 
                  export: true 
                },
                { 
                  name: "Tendances d'accès", 
                  isFunction: true,
                  parentModule: "Tableau de bord",
                  view: true, 
                  create: false, 
                  edit: false, 
                  delete: false, 
                  approve: false, 
                  export: true 
                },
                { 
                  name: "Alertes", 
                  isFunction: true,
                  parentModule: "Tableau de bord",
                  view: true, 
                  create: false, 
                  edit: true, 
                  delete: false, 
                  approve: false, 
                  export: true 
                },
                { 
                  name: "Accès", 
                  isModule: true,
                  view: true, 
                  create: true, 
                  edit: true, 
                  delete: true, 
                  approve: true, 
                  export: true 
                },
                { 
                  name: "Gestion des accès", 
                  isFunction: true,
                  parentModule: "Accès",
                  view: true, 
                  create: true, 
                  edit: true, 
                  delete: true, 
                  approve: true, 
                  export: true 
                },
                { 
                  name: "Historique des accès", 
                  isFunction: true,
                  parentModule: "Accès",
                  view: true, 
                  create: false, 
                  edit: false, 
                  delete: false, 
                  approve: false, 
                  export: true 
                },
                { 
                  name: "Anomalies d'accès", 
                  isFunction: true,
                  parentModule: "Accès",
                  view: true, 
                  create: false, 
                  edit: true, 
                  delete: true, 
                  approve: true, 
                  export: true 
                },
                { 
                  name: "Configuration", 
                  isModule: true,
                  view: true, 
                  create: true, 
                  edit: true, 
                  delete: true, 
                  approve: true, 
                  export: true 
                },
                { 
                  name: "Gestion des utilisateurs", 
                  isFunction: true,
                  parentModule: "Configuration",
                  view: true, 
                  create: true, 
                  edit: true, 
                  delete: true, 
                  approve: true, 
                  export: true 
                },
                { 
                  name: "Gestion des profils", 
                  isFunction: true,
                  parentModule: "Configuration",
                  view: true, 
                  create: true, 
                  edit: true, 
                  delete: true, 
                  approve: true, 
                  export: true 
                },
                { 
                  name: "Gestion des permissions", 
                  isFunction: true,
                  parentModule: "Configuration",
                  view: true, 
                  create: true, 
                  edit: true, 
                  delete: true, 
                  approve: true, 
                  export: true 
                }
              ].map((permission, index) => (
                <tr 
                  key={index} 
                  className={`
                    border-b border-gray-200 dark:border-gray-800 
                    hover:bg-gray-50 dark:hover:bg-gray-900
                    ${permission.isModule ? 'bg-gray-50 dark:bg-gray-900/50 font-medium' : ''}
                    ${permission.isFunction ? 'pl-6' : ''}
                  `}
                >
                  <td className={`px-4 py-3 text-sm ${permission.isFunction ? 'pl-10' : ''}`}>
                    <div className="flex items-center">
                      {permission.isModule && (
                        <div className="w-6 h-6 rounded-md bg-primary-100 dark:bg-primary-900/20 flex items-center justify-center mr-2">
                          <Lock className="h-3 w-3 text-primary-500 dark:text-primary-400" />
                        </div>
                      )}
                      {permission.name}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-center">
                    {permission.view ? (
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                        <Check className="h-4 w-4" />
                      </span>
                    ) : (
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400">
                        <X className="h-4 w-4" />
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-center">
                    {permission.create ? (
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                        <Check className="h-4 w-4" />
                      </span>
                    ) : (
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400">
                        <X className="h-4 w-4" />
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-center">
                    {permission.edit ? (
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                        <Check className="h-4 w-4" />
                      </span>
                    ) : (
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400">
                        <X className="h-4 w-4" />
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-center">
                    {permission.delete ? (
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                        <Check className="h-4 w-4" />
                      </span>
                    ) : (
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400">
                        <X className="h-4 w-4" />
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-center">
                    {permission.approve ? (
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                        <Check className="h-4 w-4" />
                      </span>
                    ) : (
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400">
                        <X className="h-4 w-4" />
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-center">
                    {permission.export ? (
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                        <Check className="h-4 w-4" />
                      </span>
                    ) : (
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400">
                        <X className="h-4 w-4" />
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <Button variant="ghost" size="sm">Modifier</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCard>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ChartCard 
          title="Attribution de permissions" 
          description="Association des permissions aux profils"
        >
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800">
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Profil</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Permissions</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { 
                    profile: "Administrateur", 
                    permissions: "Toutes les permissions (42)"
                  },
                  { 
                    profile: "Gestionnaire", 
                    permissions: "Accès complet (Tableau de bord, Accès, Rapports), Lecture seule (Configuration)"
                  },
                  { 
                    profile: "Opérateur", 
                    permissions: "Lecture (Tableau de bord, Rapports), Écriture (Accès)"
                  },
                  { 
                    profile: "Consultant", 
                    permissions: "Lecture seule (Tableau de bord, Accès, Rapports)"
                  },
                  { 
                    profile: "Audit", 
                    permissions: "Lecture seule (Toutes les sections)"
                  }
                ].map((item, index) => (
                  <tr key={index} className="border-b border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900">
                    <td className="px-4 py-3 text-sm font-medium">{item.profile}</td>
                    <td className="px-4 py-3 text-sm">{item.permissions}</td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex space-x-2">
                        <Button variant="ghost" size="sm">Configurer</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ChartCard>
        
        <ChartCard 
          title="Historique des modifications" 
          description="Derniers changements apportés aux permissions"
        >
          <div className="space-y-4 py-2">
            {[
              { action: "Ajout permission 'Exporter' au profil Consultant", user: "Michel Dupont", time: "Aujourd'hui 09:23" },
              { action: "Modification permissions module 'Accès'", user: "Laura Petit", time: "Hier 17:47" },
              { action: "Retrait permission 'Supprimer' du profil Opérateur", user: "Sophie Martin", time: "10/06/2023 16:45" },
              { action: "Ajout permission 'Approuver' au profil Gestionnaire", user: "Michel Dupont", time: "10/06/2023 11:05" },
              { action: "Révision complète des permissions Administrateur", user: "Laura Petit", time: "05/06/2023 09:12" }
            ].map((activity, index) => (
              <div 
                key={index} 
                className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
              >
                <div>
                  <p className="font-medium">{activity.action}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Par {activity.user}</p>
                </div>
                <span className="text-sm text-gray-500 dark:text-gray-400">{activity.time}</span>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>
    </div>
  );
} 