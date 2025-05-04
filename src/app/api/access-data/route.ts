import { NextResponse } from 'next/server';
import { loadLocalCSVData } from '@/lib/csv-loader';
import { 
  countEntriesByGroup, 
  countEntriesByDay, 
  countEntriesByEventType, 
  countEntriesByReader,
  identifyAnomalies,
  analyzeHourlyTraffic,
  calculateAverageTimeSpent,
  calculateDailyPresence,
  calculateWeeklyPresence,
  calculateMonthlyPresence,
  calculateYearlyPresence
} from '@/lib/csv-parser';

export async function GET() {
  try {
    const { employees, visitors } = await loadLocalCSVData();
    
    // Combiner les données pour l'analyse
    const allData = [...employees, ...visitors];
    
    // Générer les statistiques
    const stats = {
      totalRecords: allData.length,
      employeesRecords: employees.length,
      visitorsRecords: visitors.length,
      byGroup: countEntriesByGroup(allData),
      byDay: countEntriesByDay(allData),
      byEventType: countEntriesByEventType(allData),
      byReader: countEntriesByReader(allData),
      anomalies: identifyAnomalies(allData).length,
      hourlyTraffic: analyzeHourlyTraffic(allData),
      // Pour le temps moyen, on calcule uniquement pour les employés
      averageTimeSpent: calculateAverageTimeSpent(employees),
      // Nouvelles statistiques de présence
      presenceStats: {
        daily: calculateDailyPresence(employees),
        weekly: calculateWeeklyPresence(employees),
        monthly: calculateMonthlyPresence(employees),
        yearly: calculateYearlyPresence(employees)
      }
    };
    
    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error processing access data:', error);
    return NextResponse.json(
      { error: 'Failed to process access data' },
      { status: 500 }
    );
  }
} 