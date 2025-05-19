import { toast } from 'sonner';

interface ReportListItem {
  id: string;
  title: string;
  description: string;
  category: string;
  lastGenerated: string;
  icon: string;
  link?: string;
}

interface ReportStatsResponse {
  totalReports: number;
  scheduledReports: number;
  recentReports: ReportSummary[];
  reportCategories: { category: string; count: number }[];
}

interface ReportSummary {
  id: string;
  title: string;
  generatedAt: string;
  status: 'completed' | 'failed' | 'pending';
  downloadUrl?: string;
  reportType: string;
}

// Mappage des catégories de l'UI vers les types de rapport acceptés par l'API
const CATEGORY_TO_REPORT_TYPE: Record<string, string> = {
  'Sécurité': 'security-incidents',
  'Analytique': 'monthly-access',
  'Gestion': 'department-stats',
  'Ressources Humaines': 'employee-presence',
  'Quotidien': 'daily-presence',
  'Hebdomadaire': 'weekly-presence',
  'Mensuel': 'monthly-presence'
};

// Mappage des types de rapport vers les liens directs correspondants
const REPORT_TYPE_TO_LINK: Record<string, string> = {
  'employee-presence': '/reports/presence-report',
  'daily-presence': '/reports/daily-presence',
  'security-incidents': '/reports/security',
  'monthly-access': '/reports/monthly-access'
};

// Fonction pour convertir une catégorie de l'UI en type de rapport pour l'API
function mapCategoryToReportType(category: string): string {
  return CATEGORY_TO_REPORT_TYPE[category] || 'daily-access'; // Valeur par défaut si la catégorie n'est pas trouvée
}

/**
 * Fonction utilitaire qui trace les appels API et gère les erreurs
 */
async function fetchWithLogging<T>(url: string, options?: RequestInit): Promise<T> {
  console.log(`🔍 API Request: ${url}`, options);
  const startTime = performance.now();
  
  try {
    const response = await fetch(url, options);
    const endTime = performance.now();
    const duration = Math.round(endTime - startTime);
    
    console.log(`✅ API Response (${duration}ms): ${url}`, { status: response.status });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
      console.error(`❌ API Error: ${url}`, errorData);
      throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log(`📊 API Data: ${url}`, data);
    return data as T;
  } catch (error) {
    console.error(`❌ API Exception: ${url}`, error);
    toast.error(`Erreur lors de la communication avec le serveur: ${(error as Error).message}`);
    throw error;
  }
}

/**
 * Récupérer la liste des rapports disponibles
 */
export async function getReports(): Promise<ReportListItem[]> {
  try {
    const reports = await fetchWithLogging<ReportListItem[]>('/api/reports', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (!reports || reports.length === 0) {
      return getStaticReportsList();
    }

    // Ajouter le lien direct si disponible
    return reports.map(report => {
      const reportType = report.id; // L'id du rapport correspond au type
      if (REPORT_TYPE_TO_LINK[reportType]) {
        return {
          ...report,
          link: REPORT_TYPE_TO_LINK[reportType]
        };
      }
      return report;
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des rapports:', error);
    return getStaticReportsList();
  }
}

/**
 * Récupérer les statistiques des rapports
 */
export async function getReportStats(): Promise<ReportStatsResponse> {
  return fetchWithLogging<ReportStatsResponse>('/api/reports?action=stats');
}

/**
 * Récupérer les rapports récemment générés
 */
export async function getReportHistory(
  page = 1, 
  pageSize = 10, 
  filters?: { 
    reportType?: string,
    status?: string,
    startDate?: string,
    endDate?: string,
    userId?: string
  }
): Promise<{ data: ReportSummary[], pagination: any }> {
  const params = new URLSearchParams();
  params.append('page', page.toString());
  params.append('pageSize', pageSize.toString());
  
  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.append(key, value);
    });
  }
  
  return fetchWithLogging<{ data: ReportSummary[], pagination: any }>(`/api/reports/history?${params.toString()}`);
}

/**
 * Récupérer les rapports programmés
 */
export async function getScheduledReports() {
  return fetchWithLogging('/api/reports/scheduled');
}

/**
 * Générer un nouveau rapport
 */
export async function generateReport(reportType: string, parameters: any, format: string = 'pdf', title?: string) {
  // Convertir la catégorie UI en type de rapport API
  const mappedReportType = mapCategoryToReportType(reportType);
  
  console.log(`Génération d'un rapport de type ${reportType} (mappé vers ${mappedReportType})`);
  
  return fetchWithLogging('/api/reports/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      reportType: mappedReportType,
      parameters,
      format,
      title
    })
  });
}

/**
 * Vérifier le statut d'un rapport en cours de génération
 */
export async function checkReportStatus(reportId: string) {
  return fetchWithLogging(`/api/reports/generate?id=${reportId}`);
}

/**
 * Créer un nouveau modèle de rapport
 */
export async function createReportTemplate(templateData: any) {
  return fetchWithLogging('/api/reports/templates', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(templateData)
  });
}

/**
 * Programmer un rapport pour génération automatique
 */
export async function scheduleReport(scheduleData: any) {
  return fetchWithLogging('/api/reports/scheduled', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(scheduleData)
  });
}

/**
 * Générer une liste de rapports statiques (fallback)
 */
function getStaticReportsList(): ReportListItem[] {
  return [
    {
      id: "employee-presence",
      title: "Rapport de temps de présence",
      description: "Heures d'entrée et de sortie des employés",
      icon: "user",
      lastGenerated: new Date().toISOString(),
      category: "Ressources Humaines",
      link: "/reports/presence-report"
    }
  ];
} 