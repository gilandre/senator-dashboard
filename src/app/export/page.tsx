import React from 'react';
import { Upload, Download, Calendar, Filter, FileType } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ChartCard from '@/components/dashboard/chart-card';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Exporter | SenatorFX",
  description: "Exportation des données d&apos;accès",
};

export default function ExportPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Exporter les données</h1>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm">
            <Calendar className="h-4 w-4 mr-2" />
            Période
          </Button>
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filtrer
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ChartCard 
          title="Export rapide" 
          description="Exporter rapidement les données avec les paramètres par défaut"
        >
          <div className="space-y-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors">
                <div className="flex items-center mb-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center mr-3">
                    <Download className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h3 className="font-medium">Accès aujourd&apos;hui</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Format CSV</p>
                  </div>
                </div>
                <Button variant="outline" className="w-full">Exporter</Button>
              </div>
              
              <div className="border rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors">
                <div className="flex items-center mb-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center mr-3">
                    <Download className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h3 className="font-medium">Cette semaine</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Format CSV</p>
                  </div>
                </div>
                <Button variant="outline" className="w-full">Exporter</Button>
              </div>
              
              <div className="border rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors">
                <div className="flex items-center mb-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center mr-3">
                    <Download className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h3 className="font-medium">Ce mois</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Format CSV</p>
                  </div>
                </div>
                <Button variant="outline" className="w-full">Exporter</Button>
              </div>
              
              <div className="border rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors">
                <div className="flex items-center mb-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center mr-3">
                    <Download className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h3 className="font-medium">Anomalies récentes</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Format CSV</p>
                  </div>
                </div>
                <Button variant="outline" className="w-full">Exporter</Button>
              </div>
            </div>
          </div>
        </ChartCard>
        
        <ChartCard 
          title="Export personnalisé" 
          description="Configurer les paramètres d&apos;exportation"
        >
          <div className="space-y-4 py-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Période
              </label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">
                    Date de début
                  </label>
                  <input 
                    type="date" 
                    className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
                    aria-label="Date de début de la période"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">
                    Date de fin
                  </label>
                  <input 
                    type="date" 
                    className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
                    aria-label="Date de fin de la période"
                  />
                </div>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Type de données
              </label>
              <select 
                className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
                aria-label="Type de données à exporter"
              >
                <option value="all">Tous les accès</option>
                <option value="employees">Accès des employés</option>
                <option value="visitors">Accès des visiteurs</option>
                <option value="anomalies">Anomalies d&apos;accès</option>
                <option value="departments">Statistiques par département</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Format d&apos;export
              </label>
              <div className="flex space-x-4">
                {['CSV', 'Excel', 'PDF', 'JSON'].map((format, index) => (
                  <div key={index} className="flex items-center">
                    <input 
                      type="radio" 
                      id={`format-${format}`} 
                      name="format" 
                      value={format} 
                      className="mr-2"
                      defaultChecked={index === 0}
                    />
                    <label htmlFor={`format-${format}`} className="text-sm">{format}</label>
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Options additionnelles
              </label>
              <div className="space-y-2">
                <div className="flex items-center">
                  <input type="checkbox" id="include-headers" className="mr-2" defaultChecked />
                  <label htmlFor="include-headers" className="text-sm">Inclure les en-têtes de colonnes</label>
                </div>
                <div className="flex items-center">
                  <input type="checkbox" id="anonymize" className="mr-2" />
                  <label htmlFor="anonymize" className="text-sm">Anonymiser les données personnelles</label>
                </div>
                <div className="flex items-center">
                  <input type="checkbox" id="compress" className="mr-2" />
                  <label htmlFor="compress" className="text-sm">Compresser le fichier (ZIP)</label>
                </div>
              </div>
            </div>
            
            <Button className="w-full mt-4">
              <Download className="h-4 w-4 mr-2" />
              Générer l&apos;export
            </Button>
          </div>
        </ChartCard>
      </div>
      
      <ChartCard 
        title="Historique des exports" 
        description="Derniers fichiers exportés"
      >
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800">
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Nom du fichier</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Date d&apos;export</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Type de données</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Période</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Format</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Taille</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody>
              {[
                { name: 'acces_2023-06-18.csv', date: '18/06/2023 10:45', type: "Tous les accès", period: "Aujourd'hui", format: 'CSV', size: '1.2 MB' },
                { name: 'acces_semaine_24.csv', date: '17/06/2023 18:30', type: "Tous les accès", period: 'Semaine 24', format: 'CSV', size: '5.8 MB' },
                { name: 'anomalies_juin_2023.xlsx', date: '15/06/2023 14:20', type: "Anomalies d'accès", period: 'Juin 2023', format: 'Excel', size: '2.3 MB' },
                { name: 'acces_departements_mai.pdf', date: '01/06/2023 09:15', type: 'Statistiques par département', period: 'Mai 2023', format: 'PDF', size: '4.1 MB' },
                { name: 'visiteurs_s23.csv', date: '10/06/2023 11:30', type: 'Accès des visiteurs', period: 'Semaine 23', format: 'CSV', size: '1.7 MB' }
              ].map((file, index) => (
                <tr key={index} className="border-b border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900">
                  <td className="px-4 py-3 text-sm font-medium">{file.name}</td>
                  <td className="px-4 py-3 text-sm">{file.date}</td>
                  <td className="px-4 py-3 text-sm">{file.type}</td>
                  <td className="px-4 py-3 text-sm">{file.period}</td>
                  <td className="px-4 py-3 text-sm">
                    <div className="flex items-center">
                      <FileType className="h-4 w-4 mr-1 text-blue-500" />
                      {file.format}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm">{file.size}</td>
                  <td className="px-4 py-3 text-sm">
                    <div className="flex space-x-2">
                      <Button variant="ghost" size="sm">
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300">
                        Supprimer
                      </Button>
                    </div>
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