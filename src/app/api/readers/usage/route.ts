import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Interface pour les lecteurs et statistiques
interface Reader {
  deviceId: string;
  location: string;
  count: number;
}

interface DepartmentReaderData {
  department: string;
  readers: Reader[];
  total: number;
}

// Récupérer les données d'utilisation des lecteurs depuis la base de données
async function fetchReaderUsageData(): Promise<DepartmentReaderData[]> {
  try {
    // Vérifier si les tables nécessaires existent
    const departmentsExist = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = DATABASE() 
        AND table_name = 'departments'
      ) as exists_departments
    `;
    
    const accessLogsExist = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = DATABASE() 
        AND table_name = 'access_logs'
      ) as exists_access_logs
    `;
    
    // Si les tables n'existent pas, retourner des données simulées
    const departmentsTableExists = (departmentsExist as any)[0]?.exists_departments === 1;
    const accessLogsTableExists = (accessLogsExist as any)[0]?.exists_access_logs === 1;
    
    if (!departmentsTableExists || !accessLogsTableExists) {
      console.log("Tables requises non trouvées, utilisation de données simulées");
      return generateDefaultData();
    }
    
    // Récupérer les statistiques d'utilisation des lecteurs par département
    const readerStats = await prisma.$queryRaw<any[]>`
      SELECT 
        d.name as department,
        a.reader as deviceId,
        a.terminal as location,
        COUNT(*) as count
      FROM 
        departments d
      JOIN
        employees e ON e.department_id = d.id
      JOIN
        access_logs a ON a.badge_number = e.badge_number
      WHERE
        a.event_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
        AND a.reader IS NOT NULL
      GROUP BY 
        d.name, a.reader, a.terminal
      ORDER BY 
        count DESC
    `;
    
    if (!readerStats || readerStats.length === 0) {
      console.log("Aucune donnée d'utilisation des lecteurs trouvée, utilisation de données simulées");
      return generateDefaultData();
    }
    
    // Organiser les données par département
    const departmentMap = new Map<string, { readers: Reader[], total: number }>();
    
    readerStats.forEach(stat => {
      const department = stat.department;
      const reader: Reader = {
        deviceId: stat.deviceId || 'Unknown',
        location: stat.location || stat.deviceId || 'Unknown',
        count: Number(stat.count) || 0
      };
      
      if (!departmentMap.has(department)) {
        departmentMap.set(department, { readers: [], total: 0 });
      }
      
      const deptData = departmentMap.get(department)!;
      deptData.readers.push(reader);
      deptData.total += reader.count;
    });
    
    // Convertir la Map en tableau et trier
    const result: DepartmentReaderData[] = Array.from(departmentMap.entries())
      .map(([department, data]) => ({
        department,
        readers: data.readers.sort((a, b) => b.count - a.count),
        total: data.total
      }))
      .sort((a, b) => b.total - a.total);
    
    return result;
  } catch (error) {
    console.error("Erreur lors de la récupération des données d'utilisation des lecteurs:", error);
    return generateDefaultData();
  }
}

// Génération de données par défaut en cas d'erreur ou d'absence de données
function generateDefaultData(): DepartmentReaderData[] {
  const departments = [
    "Administration",
    "Ressources Humaines",
    "Finance",
    "Informatique",
    "Production"
  ];
  
  // Générer des données pour chaque département
  return departments.map(department => {
    // Nombre de lecteurs par département (2-3)
    const readerCount = Math.floor(Math.random() * 2) + 2;
    
    // Générer des lecteurs pour ce département
    const readers: Reader[] = [];
    for (let i = 0; i < readerCount; i++) {
      readers.push({
        deviceId: `READER-${department.substring(0, 3)}-${i + 1}`,
        location: `${department} - Zone ${i + 1}`,
        count: 0 // Pas de données réelles, donc compter 0
      });
    }
    
    return {
      department,
      readers,
      total: 0
    };
  });
}

/**
 * GET /api/readers/usage
 * Récupérer les statistiques d'utilisation des lecteurs par département
 */
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
    
    // Récupérer les paramètres depuis l'URL
    const url = new URL(req.url);
    const startDate = url.searchParams.get('startDate') || undefined;
    const endDate = url.searchParams.get('endDate') || undefined;
    
    // Simuler un délai réseau (uniquement en développement)
    if (process.env.NODE_ENV === 'development') {
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    // Construire les conditions de date pour les requêtes
    let dateCondition = '';
    const dateParams: any[] = [];
    
    if (startDate || endDate) {
      const conditions = [];
      
      if (startDate) {
        conditions.push('event_date >= ?');
        dateParams.push(new Date(startDate));
      }
      
      if (endDate) {
        conditions.push('event_date <= ?');
        dateParams.push(new Date(endDate));
      }
      
      if (conditions.length > 0) {
        dateCondition = `AND ${conditions.join(' AND ')}`;
      }
    }
    
    // Récupérer les statistiques d'utilisation des lecteurs directement depuis la table access_logs
    
    // 1. Top des lecteurs par utilisation
    const topReaders = await prisma.$queryRaw`
      SELECT 
        reader as name,
        COUNT(*) as count
      FROM 
        access_logs
      WHERE 
        reader IS NOT NULL
        ${dateCondition ? prisma.$raw([dateCondition, ...dateParams]) : prisma.$raw([])}
      GROUP BY 
        reader
      ORDER BY 
        count DESC
      LIMIT 10
    `;
    
    // 2. Statistiques par heure de la journée
    const hourlyUsage = await prisma.$queryRaw`
      SELECT 
        HOUR(event_time) as hour,
        COUNT(*) as count
      FROM 
        access_logs
      WHERE 
        event_time IS NOT NULL
        ${dateCondition ? prisma.$raw([dateCondition, ...dateParams]) : prisma.$raw([])}
      GROUP BY 
        HOUR(event_time)
      ORDER BY 
        hour
    `;
    
    // 3. Statistiques par jour de la semaine
    const weekdayUsage = await prisma.$queryRaw`
      SELECT 
        DAYNAME(event_date) as day,
        COUNT(*) as count,
        DAYOFWEEK(event_date) as day_number
      FROM 
        access_logs
      WHERE 
        event_date IS NOT NULL
        ${dateCondition ? prisma.$raw([dateCondition, ...dateParams]) : prisma.$raw([])}
      GROUP BY 
        DAYNAME(event_date), DAYOFWEEK(event_date)
      ORDER BY 
        day_number
    `;
    
    // 4. Utilisation par type d'événement (entrée/sortie/etc.)
    const usageByEventType = await prisma.$queryRaw`
      SELECT 
        event_type as type,
        COUNT(*) as count
      FROM 
        access_logs
      WHERE 
        event_type IS NOT NULL
        ${dateCondition ? prisma.$raw([dateCondition, ...dateParams]) : prisma.$raw([])}
      GROUP BY 
        event_type
      ORDER BY 
        count DESC
    `;
    
    // 5. Tendance quotidienne des 14 derniers jours
    const dailyTrend = await prisma.$queryRaw`
      SELECT 
        DATE_FORMAT(event_date, '%Y-%m-%d') as date,
        COUNT(*) as count
      FROM 
        access_logs
      WHERE 
        event_date >= DATE_SUB(CURDATE(), INTERVAL 14 DAY)
        ${dateCondition ? prisma.$raw([dateCondition, ...dateParams]) : prisma.$raw([])}
      GROUP BY 
        DATE_FORMAT(event_date, '%Y-%m-%d')
      ORDER BY 
        date
    `;
    
    return NextResponse.json({
      topReaders: Array.isArray(topReaders) ? topReaders.map(item => ({
        name: item.name,
        count: Number(item.count)
      })) : [],
      hourlyUsage: Array.isArray(hourlyUsage) ? hourlyUsage.map(item => ({
        hour: Number(item.hour),
        count: Number(item.count)
      })) : [],
      weekdayUsage: Array.isArray(weekdayUsage) ? weekdayUsage.map(item => ({
        day: item.day,
        count: Number(item.count)
      })) : [],
      usageByEventType: Array.isArray(usageByEventType) ? usageByEventType.map(item => ({
        type: item.type,
        count: Number(item.count)
      })) : [],
      dailyTrend: Array.isArray(dailyTrend) ? dailyTrend.map(item => ({
        date: item.date,
        count: Number(item.count)
      })) : []
    });
  } catch (error) {
    console.error('Error fetching reader usage data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reader usage data' },
      { status: 500 }
    );
  }
} 