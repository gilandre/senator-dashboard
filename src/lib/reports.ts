import prisma from '@/lib/prisma';
import { cache } from 'react';

// Interface pour la liste des rapports
export interface ReportListItem {
  id: string;
  title: string;
  description: string;
  category: string;
  lastGenerated: string | null;
  icon: string;
  link?: string;
}

// Interface pour les statistiques des rapports
export interface ReportStats {
  totalReports: number;
  recentReports: number;
  scheduledReports: number;
  totalReportCategories: number;
  mostPopularReport: string;
  mostPopularReportCount: number;
}

// Fonction pour récupérer la liste des rapports (mise en cache)
export const getReportsList = cache(async (): Promise<ReportListItem[]> => {
  try {
    // Récupérer les rapports depuis la base de données
    const reports = await prisma.reports.findMany({
      include: {
        report_history: {
          orderBy: {
            generated_at: 'desc'
          },
          take: 1
        }
      }
    });
    
    // Transformer les résultats pour correspondre à l'interface ReportListItem
    return reports.map(report => ({
      id: report.id.toString(),
      title: report.title,
      description: report.description || '',
      category: report.category || 'Non catégorisé',
      lastGenerated: report.report_history?.[0]?.generated_at?.toISOString() || null,
      icon: report.icon || '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-file-text"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/><line x1="10" x2="8" y1="9" y2="9"/></svg>',
      link: report.link || `/reports/${report.report_type}`
    }));
  } catch (error) {
    console.error('Erreur lors de la récupération des rapports:', error);
    // Fallback à une liste statique en cas d'erreur
    return getStaticReportsList();
  }
});

// Fonction pour récupérer les statistiques des rapports (mise en cache)
export const getReportStats = cache(async (): Promise<ReportStats> => {
  try {
    // Compter le nombre total de rapports
    const totalReports = await prisma.reports.count();
    
    // Compter le nombre de rapports programmés
    const scheduledReports = await prisma.report_schedule.count({
      where: {
        status: 'active'
      }
    });
    
    // Compter le nombre de rapports récents (7 derniers jours)
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    const recentReports = await prisma.report_history.count({
      where: {
        generated_at: {
          gte: oneWeekAgo
        }
      }
    });
    
    // Compter le nombre de catégories de rapports
    const categories = await prisma.reports.groupBy({
      by: ['category'],
      _count: {
        id: true
      }
    });
    
    const totalReportCategories = categories.length;
    
    // Trouver le rapport le plus populaire
    const reportPopularity = await prisma.report_history.groupBy({
      by: ['report_id'],
      _count: {
        id: true
      },
      orderBy: {
        _count: {
          id: 'desc'
        }
      },
      take: 1
    });
    
    let mostPopularReport = 'Aucun rapport généré';
    let mostPopularReportCount = 0;
    
    if (reportPopularity.length > 0) {
      const popularReportId = reportPopularity[0].report_id;
      const popularReport = await prisma.reports.findUnique({
        where: { id: popularReportId }
      });
      
      if (popularReport) {
        mostPopularReport = popularReport.title;
        mostPopularReportCount = reportPopularity[0]._count.id;
      }
    }
    
    return {
      totalReports,
      recentReports,
      scheduledReports,
      totalReportCategories,
      mostPopularReport,
      mostPopularReportCount
    };
  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques des rapports:', error);
    // Fallback à des statistiques statiques en cas d'erreur
    return {
      totalReports: 8,
      recentReports: 3,
      scheduledReports: 2,
      totalReportCategories: 4,
      mostPopularReport: 'Rapport d\'accès quotidien',
      mostPopularReportCount: 5
    };
  }
});

// Fonction pour initialiser les données de rapports par défaut
export async function initializeReportsData() {
  try {
    // Vérifier si la table est vide
    const count = await prisma.reports.count();
    
    if (count === 0) {
      // Insérer des données par défaut
      await prisma.reports.createMany({
        data: getStaticReportsList().map(report => ({
          title: report.title,
          description: report.description,
          category: report.category,
          report_type: report.id,
          icon: report.icon,
          link: report.link
        })),
        skipDuplicates: true
      });
      
      console.log('Données de rapports par défaut initialisées');
    }
  } catch (error) {
    console.error('Erreur lors de l\'initialisation des données de rapports:', error);
  }
}

// Liste statique des rapports (utilisée comme fallback)
export function getStaticReportsList(): ReportListItem[] {
  return [
    {
      id: "daily-access",
      title: "Rapport d'accès quotidien",
      description: "Rapport détaillant tous les accès enregistrés pour une journée spécifique.",
      category: "Quotidien",
      lastGenerated: new Date().toISOString(),
      icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-calendar-days"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/><path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M16 14h.01"/><path d="M8 18h.01"/><path d="M12 18h.01"/><path d="M16 18h.01"/></svg>',
      link: "/reports/daily-access"
    },
    {
      id: "weekly-access",
      title: "Rapport d'accès hebdomadaire",
      description: "Synthèse hebdomadaire des accès avec tendances et statistiques.",
      category: "Hebdomadaire",
      lastGenerated: new Date(Date.now() - 86400000).toISOString(),
      icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-calendar-range"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/><path d="M17 14h-6"/><path d="M13 18H7"/><path d="M7 14h.01"/><path d="M17 18h.01"/></svg>',
      link: "/reports/weekly-access"
    },
    {
      id: "monthly-access",
      title: "Rapport d'accès mensuel",
      description: "Vue d'ensemble mensuelle des accès avec analyse comparative.",
      category: "Mensuel",
      lastGenerated: new Date(Date.now() - 86400000 * 7).toISOString(),
      icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-calendar-check"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/><path d="m9 16 2 2 4-4"/></svg>',
      link: "/reports/monthly-access"
    },
    {
      id: "anomalies",
      title: "Rapport des anomalies",
      description: "Détection des anomalies et des tendances inhabituelles dans les accès.",
      category: "Sécurité",
      lastGenerated: new Date(Date.now() - 86400000 * 3).toISOString(),
      icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-alert-triangle"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>',
      link: "/reports/anomalies"
    },
    {
      id: "department-presence",
      title: "Rapport de présence par département",
      description: "Analyse de la présence par département et par période.",
      category: "RH",
      lastGenerated: new Date(Date.now() - 86400000 * 14).toISOString(),
      icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-building"><rect width="16" height="20" x="4" y="2" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/></svg>',
      link: "/reports/department-presence"
    },
    {
      id: "employee-presence",
      title: "Rapport de présence individuelle",
      description: "Suivi de présence pour un employé spécifique sur une période donnée.",
      category: "RH",
      lastGenerated: null,
      icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-user-check"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><polyline points="16 11 18 13 22 9"/></svg>',
      link: "/reports/employee-presence"
    },
    {
      id: "visitors",
      title: "Rapport des visiteurs",
      description: "Suivi des visites et des visiteurs dans l'établissement.",
      category: "Sécurité",
      lastGenerated: null,
      icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-id-card"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M10 7h4"/><path d="M9 11h6"/><path d="M10 15h2"/></svg>',
      link: "/reports/visitors"
    },
    {
      id: "security-incidents",
      title: "Rapport des incidents de sécurité",
      description: "Récapitulatif des incidents de sécurité avec leur statut et résolution.",
      category: "Sécurité",
      lastGenerated: null,
      icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-shield-alert"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>',
      link: "/reports/security-incidents"
    }
  ];
} 