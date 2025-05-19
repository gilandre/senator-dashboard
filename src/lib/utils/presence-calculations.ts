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
  return `${value.toFixed(1)}%`;
}

export function formatHours(value: number): string {
  return `${value.toFixed(1)} h`;
} 