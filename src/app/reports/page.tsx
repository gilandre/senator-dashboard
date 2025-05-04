import React from 'react';
import { FileText, Download, Calendar, Filter, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ChartCard from '@/components/dashboard/chart-card';
import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: "Rapports | SenatorFX",
  description: "Rapports d'accès et statistiques",
};

export default function ReportsPage() {
  const reports = [
    {
      title: "Rapport d'accès quotidien",
      description: "Résumé des entrées et sorties de la journée",
      icon: "chart-bar",
      lastGenerated: "Aujourd'hui à 08:00",
      category: "Quotidien"
    },
    {
      title: "Rapport d'accès hebdomadaire",
      description: "Synthèse des accès de la semaine par département",
      icon: "chart-bar",
      lastGenerated: "17/06/2023",
      category: "Hebdomadaire"
    },
    {
      title: "Rapport d'anomalies",
      description: "Liste des tentatives d'accès refusées",
      icon: "alert-triangle",
      lastGenerated: "Aujourd'hui à 08:00",
      category: "Sécurité"
    },
    {
      title: "Rapport de présence par département",
      description: "Taux de présence par département",
      icon: "users",
      lastGenerated: "17/06/2023",
      category: "Ressources Humaines"
    },
    {
      title: "Rapport de fréquentation mensuelle",
      description: "Analyse des tendances d'accès mensuelles",
      icon: "line-chart",
      lastGenerated: "01/06/2023",
      category: "Mensuel"
    },
    {
      title: "Rapport d'audit de sécurité",
      description: "Audit complet des événements de sécurité",
      icon: "shield",
      lastGenerated: "15/06/2023",
      category: "Sécurité"
    },
    {
      title: "Rapport de temps de présence",
      description: "Heures d'entrée et de sortie des employés",
      icon: "clock",
      lastGenerated: "Aujourd'hui à 08:00",
      category: "Ressources Humaines",
      link: "/reports/presence-report"
    },
    {
      title: "Rapport de visites",
      description: "Synthèse des visites externes",
      icon: "user-plus",
      lastGenerated: "17/06/2023",
      category: "Accueil"
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Rapports</h1>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm">
            <Calendar className="h-4 w-4 mr-2" />
            Période
          </Button>
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filtrer
          </Button>
          <Button size="sm">
            <FileText className="h-4 w-4 mr-2" />
            Nouveau rapport
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ChartCard 
          title="Rapports récents" 
          description="Derniers rapports générés"
        >
          <div className="space-y-4 py-2">
            {reports.slice(0, 5).map((report, index) => (
              <div 
                key={index} 
                className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
              >
                <div className="flex items-center">
                  <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center mr-4">
                    <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h3 className="font-medium">{report.title}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{report.lastGenerated}</p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button variant="ghost" size="sm">
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm">Voir</Button>
                </div>
              </div>
            ))}
          </div>
        </ChartCard>
        
        <ChartCard 
          title="Rapports programmés" 
          description="Rapports générés automatiquement"
        >
          <div className="space-y-4 py-2">
            {[
              {
                title: "Rapport d'accès quotidien",
                frequency: "Chaque jour à 08:00",
                recipients: "direction@entreprise.com",
                format: "PDF, Excel"
              },
              {
                title: "Rapport d'anomalies",
                frequency: "Chaque jour à 08:00",
                recipients: "securite@entreprise.com",
                format: "PDF"
              },
              {
                title: "Rapport d'accès hebdomadaire",
                frequency: "Chaque lundi à 09:00",
                recipients: "direction@entreprise.com, rh@entreprise.com",
                format: "PDF, Excel"
              },
              {
                title: "Rapport de présence par département",
                frequency: "Chaque lundi à 09:00",
                recipients: "rh@entreprise.com",
                format: "PDF, Excel"
              }
            ].map((report, index) => (
              <div 
                key={index} 
                className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
              >
                <div className="flex justify-between">
                  <h3 className="font-medium">{report.title}</h3>
                  <Button variant="ghost" size="sm">Modifier</Button>
                </div>
                <div className="mt-2 text-sm">
                  <div className="flex items-center text-gray-600 dark:text-gray-400">
                    <span className="w-24">Fréquence:</span> 
                    <span>{report.frequency}</span>
                  </div>
                  <div className="flex items-center text-gray-600 dark:text-gray-400">
                    <span className="w-24">Destinataires:</span> 
                    <span className="truncate">{report.recipients}</span>
                  </div>
                  <div className="flex items-center text-gray-600 dark:text-gray-400">
                    <span className="w-24">Format:</span> 
                    <span>{report.format}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>
      
      <ChartCard 
        title="Catalogue de rapports" 
        description="Tous les rapports disponibles par catégorie"
      >
        <div className="space-y-6">
          {['Quotidien', 'Hebdomadaire', 'Mensuel', 'Sécurité', 'Ressources Humaines', 'Accueil'].map((category, i) => (
            <div key={i} className="space-y-2">
              <h3 className="font-medium text-lg">{category}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {reports
                  .filter(report => report.category === category)
                  .map((report, index) => (
                    <div 
                      key={index} 
                      className="flex justify-between items-center p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                    >
                      <div>
                        <h4 className="font-medium">{report.title}</h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{report.description}</p>
                      </div>
                      {report.link ? (
                        <Link href={report.link}>
                          <Button variant="ghost" size="sm">
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </Link>
                      ) : (
                        <Button variant="ghost" size="sm">
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </ChartCard>
    </div>
  );
} 