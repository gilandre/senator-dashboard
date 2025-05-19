import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

interface AccessData {
  totalRecords: number;
  dailyStats: DailyStat[];
  weeklyStats: DailyStat[];
  monthlyStats: DailyStat[];
  yearlyStats: DailyStat[];
  centralReaderStats: CentralReaderStat[];
  groupStats: GroupStat[];
  hourlyTraffic: HourlyTrafficStat[];
  byGroup: GroupDayStat[];
  byEventType: EventTypeStat[];
}

interface DailyStat {
  date: string;
  count: number;
}

interface CentralReaderStat {
  central: string;
  readers: {
    reader: string;
    count: number;
  }[];
  total: number;
}

interface GroupStat {
  group: string;
  count: number;
}

interface HourlyTrafficStat {
  hour: number;
  count: number;
}

interface GroupDayStat {
  date: string;
  groupName: string;
  count: number;
}

interface EventTypeStat {
  eventType: string;
  rawEventType: string | null;
  count: number;
}

async function fetchAccessData(startDate?: string, endDate?: string): Promise<AccessData> {
  try {
    // Si aucune date n'est fournie, on prend la date max de la table access_logs
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

    // Récupérer la répartition horaire (sans exclure les 00:00:00)
    const hourlyTraffic = await prisma.$queryRaw`
      SELECT 
        HOUR(event_time) as hour,
        COUNT(*) as count
      FROM access_logs
      WHERE event_date BETWEEN ${startDateTime} AND ${endDateTime}
      AND badge_number IS NOT NULL
      AND event_date IS NOT NULL
      AND event_time IS NOT NULL
      GROUP BY HOUR(event_time)
      ORDER BY hour
    `;

    // Récupérer les statistiques des lecteurs par centrale
    const centralReaderStats = await prisma.$queryRaw`
      SELECT 
        reader,
        COUNT(*) as count
      FROM access_logs
      WHERE event_date BETWEEN ${startDateTime} AND ${endDateTime}
      AND badge_number IS NOT NULL
      AND event_date IS NOT NULL
      AND event_time IS NOT NULL
      GROUP BY reader
      ORDER BY count DESC
    `;

    // Récupérer les statistiques par groupe
    const groupStats = await prisma.$queryRaw`
      SELECT 
        group_name as \`group\`,
        COUNT(*) as count
      FROM access_logs
      WHERE event_date BETWEEN ${startDateTime} AND ${endDateTime}
      AND badge_number IS NOT NULL
      AND event_date IS NOT NULL
      AND event_time IS NOT NULL
      GROUP BY group_name
      ORDER BY count DESC
    `;

    // Récupérer les statistiques quotidiennes
    const dailyStats = await prisma.$queryRaw`
      SELECT 
        DATE(event_date) as date,
        COUNT(*) as count
      FROM access_logs
      WHERE event_date BETWEEN ${startDateTime} AND ${endDateTime}
      AND badge_number IS NOT NULL
      AND event_date IS NOT NULL
      AND event_time IS NOT NULL
      GROUP BY DATE(event_date)
      ORDER BY date DESC
      LIMIT 14
    `;

    // Récupérer les statistiques hebdomadaires
    const weeklyStats = await prisma.$queryRaw`
      SELECT 
        CONCAT('Semaine ', WEEK(event_date)) as date,
        COUNT(*) as count
      FROM access_logs
      WHERE event_date BETWEEN ${startDateTime} AND ${endDateTime}
      AND badge_number IS NOT NULL
      AND event_date IS NOT NULL
      AND event_time IS NOT NULL
      GROUP BY WEEK(event_date), CONCAT('Semaine ', WEEK(event_date))
      ORDER BY WEEK(event_date) DESC
      LIMIT 4
    `;

    // Récupérer les statistiques mensuelles
    const monthlyStats = await prisma.$queryRaw`
      SELECT 
        DATE_FORMAT(event_date, '%b') as date,
        COUNT(*) as count
      FROM access_logs
      WHERE event_date BETWEEN ${startDateTime} AND ${endDateTime}
      AND badge_number IS NOT NULL
      AND event_date IS NOT NULL
      AND event_time IS NOT NULL
      GROUP BY MONTH(event_date), DATE_FORMAT(event_date, '%b')
      ORDER BY MONTH(event_date) DESC
      LIMIT 12
    `;

    // Récupérer les statistiques annuelles
    const yearlyStats = await prisma.$queryRaw`
      SELECT 
        YEAR(event_date) as date,
        COUNT(*) as count
      FROM access_logs
      WHERE event_date BETWEEN ${startDateTime} AND ${endDateTime}
      AND badge_number IS NOT NULL
      AND event_date IS NOT NULL
      AND event_time IS NOT NULL
      GROUP BY YEAR(event_date)
      ORDER BY YEAR(event_date) DESC
      LIMIT 3
    `;

    // Récupérer les statistiques par groupe et par jour
    const byGroup = await prisma.$queryRaw`
      SELECT 
        DATE(event_date) as date,
        group_name as groupName,
        COUNT(*) as count
      FROM access_logs
      WHERE event_date BETWEEN ${startDateTime} AND ${endDateTime}
      AND badge_number IS NOT NULL
      AND event_date IS NOT NULL
      AND event_time IS NOT NULL
      GROUP BY DATE(event_date), group_name
      ORDER BY date DESC, group_name
      LIMIT 35
    `;

    // Récupérer les statistiques par type d'événement
    const byEventType = await prisma.$queryRaw`
      SELECT 
        event_type as eventType,
        raw_event_type as rawEventType,
        COUNT(*) as count
      FROM access_logs
      WHERE event_date BETWEEN ${startDateTime} AND ${endDateTime}
      AND badge_number IS NOT NULL
      AND event_date IS NOT NULL
      AND event_time IS NOT NULL
      GROUP BY event_type, raw_event_type
    `;

    // Calculer le nombre total d'enregistrements valides
    const totalRecordsResult = await prisma.$queryRaw`
      SELECT COUNT(*) as total
      FROM access_logs
      WHERE event_date BETWEEN ${startDateTime} AND ${endDateTime}
      AND badge_number IS NOT NULL
      AND event_date IS NOT NULL
      AND event_time IS NOT NULL
    `;
    const totalRecords = Number((totalRecordsResult as any[])[0].total);

    // Convert all BigInt counts to regular numbers
    return {
      totalRecords,
      dailyStats: (dailyStats as any[]).map(stat => ({
        date: stat.date,
        count: Number(stat.count)
      })),
      weeklyStats: (weeklyStats as any[]).map(stat => ({
        date: stat.date,
        count: Number(stat.count)
      })),
      monthlyStats: (monthlyStats as any[]).map(stat => ({
        date: stat.date,
        count: Number(stat.count)
      })),
      yearlyStats: (yearlyStats as any[]).map(stat => ({
        date: stat.date,
        count: Number(stat.count)
      })),
      centralReaderStats: formatCentralReaderStats((centralReaderStats as any[]).map(stat => ({
        reader: stat.reader,
        count: Number(stat.count)
      }))),
      groupStats: (groupStats as any[]).map(stat => ({
        group: stat.group,
        count: Number(stat.count)
      })),
      hourlyTraffic: (hourlyTraffic as any[]).map(stat => ({
        hour: Number(stat.hour),
        count: Number(stat.count)
      })),
      byGroup: (byGroup as any[]).map(stat => ({
        date: stat.date,
        groupName: stat.groupName,
        count: Number(stat.count)
      })),
      byEventType: (byEventType as any[]).map(stat => ({
        eventType: stat.eventType,
        rawEventType: stat.rawEventType,
        count: Number(stat.count)
      }))
    };
  } catch (error) {
    console.error('Error fetching access data:', error);
    throw error;
  }
}

function formatCentralReaderStats(stats: any[]): CentralReaderStat[] {
  const centralMap = new Map<string, CentralReaderStat>();

  stats.forEach(stat => {
    if (typeof stat.reader !== 'string' || !stat.reader.includes('_')) {
      // On ignore ou on log les cas anormaux
      // console.warn('Reader mal formé ou null:', stat.reader);
      return;
    }
    const [central, reader] = stat.reader.split('_');
    if (!central) return;
    if (!centralMap.has(central)) {
      centralMap.set(central, {
        central,
        readers: [],
        total: 0
      });
    }

    const centralStat = centralMap.get(central)!;
    centralStat.readers.push({
      reader,
      count: Number(stat.count)
    });
    centralStat.total += Number(stat.count);
  });

  return Array.from(centralMap.values());
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
    
    // Récupérer les paramètres de requête
    const { searchParams } = new URL(req.url);
    const getMaxDate = searchParams.get('getMaxDate') === 'true';
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    
    if (getMaxDate) {
      // Récupérer la date maximale des logs d'accès
      const result = await prisma.$queryRaw<{ max_date: Date }[]>`
        SELECT MAX(event_date) as max_date FROM access_logs
      `;
      
      const maxDate = result[0]?.max_date ? new Date(result[0].max_date) : new Date();
      
      return NextResponse.json({ maxDate });
    }
    
    // Si des dates sont fournies ou si aucun paramètre spécifique n'est requis, récupérer les données
    if (startDate || endDate) {
      const data = await fetchAccessData(startDate, endDate);
      return NextResponse.json(data);
    }
    
    // Si aucun paramètre n'est fourni, utiliser les dates par défaut (30 derniers jours)
    const defaultEndDate = new Date();
    const defaultStartDate = new Date();
    defaultStartDate.setDate(defaultStartDate.getDate() - 30);
    
    const data = await fetchAccessData(
      defaultStartDate.toISOString().split('T')[0], 
      defaultEndDate.toISOString().split('T')[0]
    );
    
    return NextResponse.json(data);
  } catch (error) {
    console.error("[API] Error fetching access data:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des données d'accès" },
      { status: 500 }
    );
  }
} 