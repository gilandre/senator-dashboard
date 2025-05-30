import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

interface AnomalyData {
  totalAnomalies: number;
  dailyAnomalies: DailyAnomaly[];
  byEventType: EventTypeStat[];
  byReader: ReaderStat[];
  byGroup: GroupStat[];
  recentAnomalies: RecentAnomaly[];
}

interface DailyAnomaly {
  date: string;
  count: number;
}

interface EventTypeStat {
  eventType: string;
  rawEventType: string | null;
  count: number;
}

interface ReaderStat {
  reader: string;
  count: number;
}

interface GroupStat {
  group: string;
  count: number;
}

interface RecentAnomaly {
  id: number;
  badgeNumber: string;
  eventDate: Date;
  eventTime: string;
  eventType: string;
  rawEventType: string | null;
  reader: string;
  groupName: string | null;
  userName: string | null; // Mapped from full_name in the database
}

async function fetchAnomalyData(startDate?: string, endDate?: string): Promise<AnomalyData> {
  try {
    // If no dates provided, use the last 7 days from max date
    let startDateTime: Date;
    let endDateTime: Date;
    if (!startDate || !endDate) {
      const maxDateResult = await prisma.$queryRaw`SELECT MAX(event_date) as maxDate FROM access_logs`;
      const maxDate = (Array.isArray(maxDateResult) && maxDateResult[0]?.maxDate) ? new Date(maxDateResult[0].maxDate) : new Date();
      endDateTime = maxDate;
      startDateTime = new Date(maxDate.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else {
      startDateTime = new Date(startDate);
      endDateTime = new Date(endDate);
    }

    // Get daily anomaly counts
    const dailyAnomalies = await prisma.$queryRaw`
      SELECT 
        DATE(event_date) as date,
        COUNT(*) as count
      FROM access_logs
      WHERE event_date BETWEEN ${startDateTime} AND ${endDateTime}
      AND event_type != 'user_accepted'
      AND badge_number IS NOT NULL
      GROUP BY DATE(event_date)
      ORDER BY date DESC
    `;

    // Get anomalies by event type
    const byEventType = await prisma.$queryRaw`
      SELECT 
        event_type as eventType,
        raw_event_type as rawEventType,
        COUNT(*) as count
      FROM access_logs
      WHERE event_date BETWEEN ${startDateTime} AND ${endDateTime}
      AND event_type != 'user_accepted'
      AND badge_number IS NOT NULL
      GROUP BY event_type, raw_event_type
      ORDER BY count DESC
    `;

    // Get anomalies by reader
    const byReader = await prisma.$queryRaw`
      SELECT 
        reader,
        COUNT(*) as count
      FROM access_logs
      WHERE event_date BETWEEN ${startDateTime} AND ${endDateTime}
      AND event_type != 'user_accepted'
      AND badge_number IS NOT NULL
      GROUP BY reader
      ORDER BY count DESC
      LIMIT 10
    `;

    // Get anomalies by group
    const byGroup = await prisma.$queryRaw`
      SELECT 
        group_name as \`group\`,
        COUNT(*) as count
      FROM access_logs
      WHERE event_date BETWEEN ${startDateTime} AND ${endDateTime}
      AND event_type != 'user_accepted'
      AND badge_number IS NOT NULL
      GROUP BY group_name
      ORDER BY count DESC
      LIMIT 10
    `;

    // Get recent anomalies (last 20)
    const recentAnomalies = await prisma.$queryRaw`
      SELECT 
        id,
        badge_number as badgeNumber,
        event_date as eventDate,
        event_time as eventTime,
        event_type as eventType,
        raw_event_type as rawEventType,
        reader,
        group_name as groupName,
        full_name as userName
      FROM access_logs
      WHERE event_date BETWEEN ${startDateTime} AND ${endDateTime}
      AND event_type != 'user_accepted'
      AND badge_number IS NOT NULL
      ORDER BY event_date DESC, event_time DESC
      LIMIT 20
    `;

    // Calculate total anomalies
    const totalAnomaliesResult = await prisma.$queryRaw`
      SELECT COUNT(*) as total
      FROM access_logs
      WHERE event_date BETWEEN ${startDateTime} AND ${endDateTime}
      AND event_type != 'user_accepted'
      AND badge_number IS NOT NULL
    `;
    const totalAnomalies = Number((totalAnomaliesResult as any[])[0].total);

    // Convert BigInt counts to regular numbers
    return {
      totalAnomalies,
      dailyAnomalies: (dailyAnomalies as any[]).map(stat => ({
        date: stat.date,
        count: Number(stat.count)
      })),
      byEventType: (byEventType as any[]).map(stat => ({
        eventType: stat.eventType,
        rawEventType: stat.rawEventType,
        count: Number(stat.count)
      })),
      byReader: (byReader as any[]).map(stat => ({
        reader: stat.reader,
        count: Number(stat.count)
      })),
      byGroup: (byGroup as any[]).map(stat => ({
        group: stat.group,
        count: Number(stat.count)
      })),
      recentAnomalies: (recentAnomalies as any[]).map(anomaly => ({
        id: Number(anomaly.id),
        badgeNumber: anomaly.badgeNumber,
        eventDate: anomaly.eventDate,
        eventTime: anomaly.eventTime,
        eventType: anomaly.eventType,
        rawEventType: anomaly.rawEventType,
        reader: anomaly.reader,
        groupName: anomaly.groupName,
        userName: anomaly.userName
      }))
    };
  } catch (error) {
    console.error('Error fetching anomaly data:', error);
    throw error;
  }
}

export async function GET(req: NextRequest) {
  try {
    // Auth bypass for development testing
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
    
    // Get query parameters
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    
    // Fetch anomaly data
    const data = await fetchAnomalyData(startDate, endDate);
    return NextResponse.json(data);
    
  } catch (error) {
    console.error("[API] Error fetching anomaly data:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des données d'anomalies" },
      { status: 500 }
    );
  }
} 