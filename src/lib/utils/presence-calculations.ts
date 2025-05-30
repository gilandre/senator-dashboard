import { attendance_parameters } from '@prisma/client';

export interface PresenceData {
  daily: Array<{
    date: string;
    count: number;
    duration: number;
    breakTimeDeducted?: number;
  }>;
  summary?: {
    totalEmployees: number;
    avgEmployeePerDay: number;
    totalHours: number;
  };
}

export interface CalculatedStats {
  totalDays: number;
  maxEmployees: number;
  totalHours: number;
  avgHoursPerDay: number;
  avgHoursPerEmployee: number;
  presenceRate: number;
  totalBreakTime: number;
  netTotalHours: number;
}

export function calculatePresenceStats(
  data: PresenceData,
  attendanceParams?: attendance_parameters | null,
  includeBreakTime: boolean = true
): CalculatedStats {
  if (!data.daily || data.daily.length === 0) {
    return {
      totalDays: 0,
      maxEmployees: 0,
      totalHours: 0,
      avgHoursPerDay: 0,
      avgHoursPerEmployee: 0,
      presenceRate: 0,
      totalBreakTime: 0,
      netTotalHours: 0
    };
  }

  // Calculer les statistiques de base
  const maxEmployees = data.daily.reduce((max, day) => Math.max(max, day.count || 0), 0);
  const totalDays = data.daily.length;
  
  // Calculer le temps total et le temps de pause
  let totalDuration = 0;
  let totalBreakTime = 0;
  let totalEmployeeCount = 0;

  data.daily.forEach(day => {
    if (day.count && day.count > 0) {
      totalDuration += day.duration || 0;
      totalEmployeeCount += day.count;

      // Calculer le temps de pause si les paramètres sont disponibles
      if (attendanceParams?.lunch_break && !includeBreakTime) {
        const breakDuration = (attendanceParams.lunch_break_duration || 60) * day.count;
        totalBreakTime += breakDuration;
      }
    }
  });

  // Convertir en heures
  const totalHours = totalDuration / 60;
  const netTotalHours = (totalDuration - totalBreakTime) / 60;
  
  // Calculer les moyennes
  const avgHoursPerDay = totalDays > 0 ? totalHours / totalDays : 0;
  const avgHoursPerEmployee = totalEmployeeCount > 0 ? totalHours / totalEmployeeCount : 0;
  
  // Calculer le taux de présence
  const presenceRate = data.summary?.totalEmployees 
    ? (data.summary.avgEmployeePerDay * 100) / data.summary.totalEmployees 
    : 0;

  return {
    totalDays,
    maxEmployees,
    totalHours: Number(totalHours.toFixed(1)),
    avgHoursPerDay: Number(avgHoursPerDay.toFixed(1)),
    avgHoursPerEmployee: Number(avgHoursPerEmployee.toFixed(1)),
    presenceRate: Number(presenceRate.toFixed(1)),
    totalBreakTime: Number((totalBreakTime / 60).toFixed(1)),
    netTotalHours: Number(netTotalHours.toFixed(1))
  };
}

export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes === 0 
    ? `${hours}h` 
    : `${hours}h${remainingMinutes.toString().padStart(2, '0')}`;
}

export function formatPercentage(value: number): string {
  if (isNaN(value)) return '0%';
  return `${value.toFixed(1)}%`;
}

export function formatHours(hours: number): string {
  if (isNaN(hours)) return '0h00';
  
  const wholeHours = Math.floor(hours);
  const minutes = Math.round((hours - wholeHours) * 60);
  return `${wholeHours}h${minutes.toString().padStart(2, '0')}`;
}

/**
 * Vérifie la cohérence des données entre les détails et les visualisations graphiques
 * 
 * @param detailedData Données détaillées (tableau)
 * @param graphData Données des graphiques
 * @param summaryData Données de résumé
 * @returns Object contenant des informations sur la cohérence et les éventuelles différences
 */
export function validateDataConsistency(
  detailedData: PresenceData,
  graphData: any,
  summaryData: any
): { 
  isConsistent: boolean;
  differences: Array<{ field: string, detailedValue: any, graphValue: any, difference: number }>
} {
  const differences: Array<{ field: string, detailedValue: any, graphValue: any, difference: number }> = [];
  
  // Vérifier la cohérence des données journalières
  if (graphData?.dailyData && detailedData?.daily) {
    // Vérifier que le nombre total de jours correspond
    if (graphData.dailyData.length !== detailedData.daily.length) {
      differences.push({
        field: 'dailyDataCount',
        detailedValue: detailedData.daily.length,
        graphValue: graphData.dailyData.length,
        difference: Math.abs(detailedData.daily.length - graphData.dailyData.length)
      });
    }
    
    // Vérifier la somme des heures totales
    const detailedTotalHours = detailedData.daily.reduce((sum, day) => sum + ((day.duration || 0) / 60), 0);
    const graphTotalHours = graphData.dailyData.reduce((sum, day) => sum + (day.totalHours || 0), 0);
    
    if (Math.abs(detailedTotalHours - graphTotalHours) > 0.1) { // Tolérance de 0.1h (6 minutes)
      differences.push({
        field: 'totalHours',
        detailedValue: detailedTotalHours.toFixed(2),
        graphValue: graphTotalHours.toFixed(2),
        difference: Math.abs(detailedTotalHours - graphTotalHours)
      });
    }
    
    // Vérifier la somme des employés
    const detailedTotalEmployees = detailedData.daily.reduce((sum, day) => sum + (day.count || 0), 0);
    const graphTotalEmployees = graphData.dailyData.reduce((sum, day) => sum + (day.employeeCount || 0), 0);
    
    if (detailedTotalEmployees !== graphTotalEmployees) {
      differences.push({
        field: 'totalEmployees',
        detailedValue: detailedTotalEmployees,
        graphValue: graphTotalEmployees,
        difference: Math.abs(detailedTotalEmployees - graphTotalEmployees)
      });
    }
  }
  
  // Vérifier les données de résumé
  if (summaryData && detailedData?.summary) {
    // Vérifier le nombre total d'employés
    if (summaryData.totalEmployees !== detailedData.summary.totalEmployees) {
      differences.push({
        field: 'summaryTotalEmployees',
        detailedValue: detailedData.summary.totalEmployees,
        graphValue: summaryData.totalEmployees,
        difference: Math.abs(detailedData.summary.totalEmployees - summaryData.totalEmployees)
      });
    }
    
    // Vérifier les heures totales
    const summaryTotalHours = summaryData.totalHours || 0;
    const detailedSummaryTotalHours = detailedData.summary.totalHours || 0;
    
    if (Math.abs(summaryTotalHours - detailedSummaryTotalHours) > 0.1) {
      differences.push({
        field: 'summaryTotalHours',
        detailedValue: detailedSummaryTotalHours.toFixed(2),
        graphValue: summaryTotalHours.toFixed(2),
        difference: Math.abs(detailedSummaryTotalHours - summaryTotalHours)
      });
    }
  }
  
  return {
    isConsistent: differences.length === 0,
    differences
  };
} 