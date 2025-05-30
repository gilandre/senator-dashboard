import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

interface AttendanceData {
  date: string;
  avgEntryTime: string | null;
  avgExitTime: string | null;
  entryCount: number;
  exitCount: number;
}

interface WeeklyAttendanceData {
  day: string;
  entryValue: number;
  exitValue: number;
}

interface MonthlyAttendanceData {
  month: string;
  avgHours: number;
}

interface AttendanceResponse {
  daily: AttendanceData[];
  weekly: WeeklyAttendanceData[];
  monthly: MonthlyAttendanceData[];
}

// Types pour les résultats des requêtes SQL
interface DailyDataRow {
  date: Date;
  avg_entry_seconds: number | null;
  avg_exit_seconds: number | null;
  entry_count: number;
  exit_count: number;
}

interface WeeklyDataRow {
  day: string;
  avg_entry_seconds: number | null;
  avg_exit_seconds: number | null;
}

interface MonthlyDataRow {
  month_number: number;
  avg_hours: number;
}

async function fetchAttendanceData(startDate?: string, endDate?: string): Promise<AttendanceResponse> {
  try {
    // Convertir les dates si fournies
    const startDateTime = startDate ? new Date(startDate) : new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    const endDateTime = endDate ? new Date(endDate) : new Date();

    // Récupérer les données quotidiennes
    const dailyData = await prisma.$queryRaw<DailyDataRow[]>`
      SELECT 
        DATE(event_date) as date,
        AVG(CASE WHEN event_type = 'entry' OR event_type = 'user_accepted' OR event_type = 'door_opened' THEN TIME_TO_SEC(event_time) END) as avg_entry_seconds,
        AVG(CASE WHEN event_type = 'exit' OR event_type = 'door_closed' THEN TIME_TO_SEC(event_time) END) as avg_exit_seconds,
        COUNT(CASE WHEN event_type = 'entry' OR event_type = 'user_accepted' OR event_type = 'door_opened' THEN 1 END) as entry_count,
        COUNT(CASE WHEN event_type = 'exit' OR event_type = 'door_closed' THEN 1 END) as exit_count
      FROM access_logs
      WHERE event_date BETWEEN ${startDateTime} AND ${endDateTime}
      GROUP BY DATE(event_date)
      ORDER BY date DESC
      LIMIT 14
    `;

    // Récupérer les données hebdomadaires
    const weeklyData = await prisma.$queryRaw<WeeklyDataRow[]>`
      SELECT 
        DAYNAME(event_date) as day,
        AVG(CASE WHEN event_type = 'entry' OR event_type = 'user_accepted' OR event_type = 'door_opened' THEN TIME_TO_SEC(event_time) END) as avg_entry_seconds,
        AVG(CASE WHEN event_type = 'exit' OR event_type = 'door_closed' THEN TIME_TO_SEC(event_time) END) as avg_exit_seconds
      FROM access_logs
      WHERE event_date BETWEEN ${startDateTime} AND ${endDateTime}
      GROUP BY DAYNAME(event_date)
      ORDER BY FIELD(DAYNAME(event_date), 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday')
    `;

    // Récupérer les données mensuelles avec une sous-requête pour calculer les heures
    const monthlyData = await prisma.$queryRaw<MonthlyDataRow[]>`
      WITH paired_events AS (
        SELECT 
          event_date,
          event_type,
          raw_event_type,
          event_time,
          person_id,
          LAG(event_time) OVER (PARTITION BY DATE(event_date), person_id ORDER BY event_time) as entry_time,
          event_time as exit_time
        FROM access_logs
        WHERE event_date BETWEEN ${startDateTime} AND ${endDateTime}
      )
      SELECT 
        MONTH(event_date) as month_number,
        AVG(
          CASE 
            WHEN (event_type = 'exit' OR event_type = 'door_closed') AND entry_time IS NOT NULL
            THEN TIME_TO_SEC(TIMEDIFF(exit_time, entry_time)) / 3600
            ELSE 8
          END
        ) as avg_hours
      FROM paired_events
      WHERE event_type = 'exit' OR event_type = 'door_closed'
      GROUP BY MONTH(event_date)
      ORDER BY month_number
    `;

    // Transformer les données quotidiennes
    const daily: AttendanceData[] = dailyData.map(row => ({
      date: row.date.toISOString().split('T')[0],
      avgEntryTime: row.avg_entry_seconds ? 
        new Date(row.avg_entry_seconds * 1000).toISOString().substr(11, 8) : null,
      avgExitTime: row.avg_exit_seconds ? 
        new Date(row.avg_exit_seconds * 1000).toISOString().substr(11, 8) : null,
      entryCount: row.entry_count,
      exitCount: row.exit_count
    }));

    // Transformer les données hebdomadaires
    const weekly: WeeklyAttendanceData[] = weeklyData.map(row => ({
      day: row.day,
      entryValue: row.avg_entry_seconds ? row.avg_entry_seconds / 3600 : 8,
      exitValue: row.avg_exit_seconds ? row.avg_exit_seconds / 3600 : 17
    }));

    // Transformer les données mensuelles
    const monthNames = [
      'Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin',
      'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'
    ];
    const monthly: MonthlyAttendanceData[] = monthlyData.map(row => ({
      month: monthNames[row.month_number - 1],
      avgHours: parseFloat(row.avg_hours.toString()) || 8
    }));

    return { daily, weekly, monthly };
  } catch (error) {
    console.error('Error fetching attendance data:', error);
    throw error;
  }
}

export async function GET(req: NextRequest) {
  try {
    // Bypass d'authentification pour les tests en développement
    const bypassAuth = process.env.NODE_ENV === 'development' && 
                       req.headers.get('x-test-bypass-auth') === 'admin';
    
    if (!bypassAuth) {
      const session = await getServerSession(authOptions);
      
      if (!session) {
        return NextResponse.json(
          { error: "Non autorisé" },
          { status: 401 }
        );
      }
    }
    
    // Récupérer les paramètres de date depuis l'URL
    const url = new URL(req.url);
    const startDate = url.searchParams.get('startDate') || undefined;
    const endDate = url.searchParams.get('endDate') || undefined;
    
    // Récupérer les données depuis la base de données
    const data = await fetchAttendanceData(startDate, endDate);
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching attendance data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch attendance data' },
      { status: 500 }
    );
  }
} 