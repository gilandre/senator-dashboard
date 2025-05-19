import axios from 'axios';
import { config } from '@/lib/config';

// Configuration de l'URL de base
axios.defaults.baseURL = config.apiUrl;

// Types pour les données retournées par les API
export interface DashboardStatistics {
  totalRecords: number;
  employees: number;
  visitors: number;
  anomalies: number;
  recentAnomalies: number;
}

export interface ActivityItem {
  id: string;
  type: 'access' | 'anomaly';
  personName: string;
  personType: 'employee' | 'visitor';
  location: string;
  timestamp: string;
  status: string;
}

export interface AttendanceData {
  date: string;
  avgEntryTime: string | null;
  avgExitTime: string | null;
  entryCount: number;
  exitCount: number;
}

export interface DepartmentData {
  departmentName: string;
  count: number;
}

export interface AccessData {
  presenceStats: {
    daily: any[];
    weekly: any[];
    monthly: any[];
    yearly: any[];
  }
}

export interface DateFilter {
  startDate?: string;
  endDate?: string;
}

/**
 * Service centralisé pour les API du tableau de bord
 */
export class DashboardService {
  /**
   * Calcule la date limite pour le filtre (2 mois maximum)
   */
  private static getValidDateRange(filter?: DateFilter): DateFilter {
    const today = new Date();
    const endDate = filter?.endDate ? new Date(filter.endDate) : today;
    
    // La date de début par défaut est de 2 mois avant la date de fin
    let defaultStartDate = new Date(endDate);
    defaultStartDate.setMonth(defaultStartDate.getMonth() - 2);
    
    // Si une date de début est fournie, on vérifie qu'elle n'est pas trop ancienne
    let startDate = filter?.startDate ? new Date(filter.startDate) : defaultStartDate;
    
    // Si la date de début est plus ancienne que 2 mois avant la date de fin, on la limite
    const minStartDate = new Date(endDate);
    minStartDate.setMonth(minStartDate.getMonth() - 2);
    
    if (startDate < minStartDate) {
      startDate = minStartDate;
    }
    
    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    };
  }

  /**
   * Récupère les statistiques générales pour le tableau de bord
   */
  static async getStatistics(filter?: DateFilter): Promise<DashboardStatistics> {
    try {
      const dateRange = this.getValidDateRange(filter);
      const params = new URLSearchParams();
      
      if (dateRange.startDate) params.append('startDate', dateRange.startDate);
      if (dateRange.endDate) params.append('endDate', dateRange.endDate);
      
      const url = `/api/statistics${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await axios.get<DashboardStatistics>(url);
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la récupération des statistiques:', error);
      // Renvoyer des valeurs par défaut en cas d'erreur
      return {
        totalRecords: 0,
        employees: 0,
        visitors: 0,
        anomalies: 0,
        recentAnomalies: 0
      };
    }
  }

  /**
   * Récupère les données d'activité récentes
   */
  static async getRecentActivities(limit: number = 5, filter?: DateFilter): Promise<ActivityItem[]> {
    try {
      const dateRange = this.getValidDateRange(filter);
      const params = new URLSearchParams();
      
      params.append('limit', limit.toString());
      if (dateRange.startDate) params.append('startDate', dateRange.startDate);
      if (dateRange.endDate) params.append('endDate', dateRange.endDate);
      
      const url = `/api/activities/recent?${params.toString()}`;
      const response = await axios.get<ActivityItem[]>(url);
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la récupération des activités récentes:', error);
      return [];
    }
  }

  /**
   * Récupère les données de présence moyennes
   */
  static async getAttendanceData(filter?: DateFilter): Promise<AttendanceData[]> {
    try {
      const dateRange = this.getValidDateRange(filter);
      const params = new URLSearchParams();
      
      if (dateRange.startDate) params.append('startDate', dateRange.startDate);
      if (dateRange.endDate) params.append('endDate', dateRange.endDate);
      
      const url = `/api/attendance/average${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await axios.get<AttendanceData[]>(url);
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la récupération des données de présence:', error);
      return [];
    }
  }

  /**
   * Récupère les données par département
   */
  static async getDepartmentData(filter?: DateFilter): Promise<DepartmentData[]> {
    try {
      const dateRange = this.getValidDateRange(filter);
      const params = new URLSearchParams();
      
      if (dateRange.startDate) params.append('startDate', dateRange.startDate);
      if (dateRange.endDate) params.append('endDate', dateRange.endDate);
      
      const url = `/api/departments/statistics${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await axios.get<DepartmentData[]>(url);
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la récupération des données par département:', error);
      return [];
    }
  }

  /**
   * Récupère toutes les données du tableau de bord en un seul appel
   */
  static async getAllDashboardData(filter?: DateFilter) {
    try {
      const dateRange = this.getValidDateRange(filter);
      
      const [statistics, activities, attendance, departments] = await Promise.all([
        this.getStatistics(dateRange),
        this.getRecentActivities(10, dateRange),
        this.getAttendanceData(dateRange),
        this.getDepartmentData(dateRange)
      ]);

      return {
        statistics,
        activities,
        attendance,
        departments
      };
    } catch (error) {
      console.error('Erreur lors de la récupération des données du tableau de bord:', error);
      return {
        statistics: {
          totalRecords: 0,
          employees: 0,
          visitors: 0,
          anomalies: 0,
          recentAnomalies: 0
        },
        activities: [],
        attendance: [],
        departments: []
      };
    }
  }
} 