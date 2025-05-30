import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { format, parseISO, subDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { calculatePresenceStats } from '@/lib/utils/presence-calculations';

// Define route segment config
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/**
 * GET /api/presence/summary
 * Récupère les données de synthèse pour le rapport de présence
 * Inclut des données quotidiennes agrégées, mais sans détails individuels
 */
export async function GET(req: NextRequest) {
  try {
    console.log('[SUMMARY-API] Début du traitement de la requête');
    
    // Authentification (sauf en développement avec bypass)
    const bypassAuth = process.env.NODE_ENV === 'development' && 
                     req.headers.get('x-test-bypass-auth') === 'admin';
    
    if (!bypassAuth) {
      const session = await getServerSession(authOptions);
      if (!session) {
        return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
      }
    }
    
    // Récupérer les paramètres
    const { searchParams } = new URL(req.url);
    let startDate = searchParams.get('startDate');
    let endDate = searchParams.get('endDate');
    const department = searchParams.get('department');
    const personType = searchParams.get('personType');
    
    console.log(`[SUMMARY-API] Paramètres: startDate=${startDate}, endDate=${endDate}, department=${department}, personType=${personType}`);
    
    // Valider les dates
    if (!startDate || !endDate) {
      // Utiliser les 14 derniers jours par défaut
      const today = new Date();
      endDate = format(today, 'yyyy-MM-dd');
      startDate = format(subDays(today, 14), 'yyyy-MM-dd');
      console.log(`[SUMMARY-API] Dates par défaut: ${startDate} - ${endDate}`);
    }
    
    // Convertir les dates
    const startDateTime = parseISO(startDate);
    const endDateTime = parseISO(endDate);

    // Conditions de filtrage de base
    let whereConditions: any = {
      event_date: {
        gte: startDateTime,
        lte: endDateTime
      },
      event_type: 'user_accepted' // Uniquement les accès acceptés
    };
    
    // Filtrer par type de personne si spécifié
    if (personType && personType !== 'all') {
      whereConditions.person_type = personType;
    }
    
    // Filtrer par département si spécifié
    if (department && department !== 'all') {
      whereConditions.group_name = department;
    }
    
    console.log('[SUMMARY-API] Exécution des requêtes SQL');
    
    // Exécuter les requêtes pour les statistiques de synthèse
    
    // 1. Statistiques globales (sans les données détaillées jour par jour)
    const totalEmployeesResult = await prisma.$queryRaw`
      SELECT COUNT(DISTINCT badge_number) as count 
      FROM access_logs 
      WHERE badge_number IS NOT NULL
      AND event_type = 'user_accepted'
      AND event_date BETWEEN ${startDateTime} AND ${endDateTime}
      ${department && department !== 'all' ? prisma.$raw`AND group_name = ${department}` : prisma.$raw``}
      ${personType && personType !== 'all' ? prisma.$raw`AND person_type = ${personType}` : prisma.$raw``}
    `;
    
    const totalHoursResult = await prisma.$queryRaw`
      SELECT SUM(TIMESTAMPDIFF(MINUTE, MIN(event_time), MAX(event_time))) as total_minutes
      FROM (
        SELECT 
          badge_number, 
          event_date, 
          MIN(event_time) as event_time
        FROM access_logs
        WHERE badge_number IS NOT NULL
        AND event_type = 'user_accepted'
        AND event_date BETWEEN ${startDateTime} AND ${endDateTime}
        ${department && department !== 'all' ? prisma.$raw`AND group_name = ${department}` : prisma.$raw``}
        ${personType && personType !== 'all' ? prisma.$raw`AND person_type = ${personType}` : prisma.$raw``}
        GROUP BY badge_number, event_date
      ) as first_entries
      JOIN (
        SELECT 
          badge_number, 
          event_date, 
          MAX(event_time) as event_time
        FROM access_logs
        WHERE badge_number IS NOT NULL
        AND event_type = 'user_accepted'
        AND event_date BETWEEN ${startDateTime} AND ${endDateTime}
        ${department && department !== 'all' ? prisma.$raw`AND group_name = ${department}` : prisma.$raw``}
        ${personType && personType !== 'all' ? prisma.$raw`AND person_type = ${personType}` : prisma.$raw``}
        GROUP BY badge_number, event_date
      ) as last_exits
      ON first_entries.badge_number = last_exits.badge_number 
      AND first_entries.event_date = last_exits.event_date
    `;
    
    const totalDaysResult = await prisma.$queryRaw`
      SELECT COUNT(DISTINCT event_date) as count
      FROM access_logs
      WHERE badge_number IS NOT NULL
      AND event_type = 'user_accepted'
      AND event_date BETWEEN ${startDateTime} AND ${endDateTime}
      ${department && department !== 'all' ? prisma.$raw`AND group_name = ${department}` : prisma.$raw``}
      ${personType && personType !== 'all' ? prisma.$raw`AND person_type = ${personType}` : prisma.$raw``}
    `;
    
    // 2. Récupérer les données quotidiennes AGRÉGÉES (sans détails individuels)
    console.log('[SUMMARY-API] Récupération des données quotidiennes agrégées');
    const dailyData = await prisma.$queryRaw`
      SELECT 
        event_date as date,
        COUNT(DISTINCT badge_number) as count,
        SUM(TIMESTAMPDIFF(MINUTE, MIN(event_time), MAX(event_time))) as duration
      FROM access_logs
      WHERE badge_number IS NOT NULL
      AND event_type = 'user_accepted'
      AND event_date BETWEEN ${startDateTime} AND ${endDateTime}
      ${department && department !== 'all' ? prisma.$raw`AND group_name = ${department}` : prisma.$raw``}
      ${personType && personType !== 'all' ? prisma.$raw`AND person_type = ${personType}` : prisma.$raw``}
      GROUP BY event_date
      ORDER BY event_date
    `;
    
    // 3. Récupérer uniquement les informations hebdomadaires pour les graphiques
    const weeklyData = await prisma.$queryRaw`
      SELECT 
        CONCAT('Semaine ', WEEK(event_date)) as day,
        COUNT(DISTINCT badge_number) as count,
        AVG(TIMESTAMPDIFF(MINUTE, MIN(event_time), MAX(event_time))) as avgDuration
      FROM access_logs
      WHERE badge_number IS NOT NULL
      AND event_type = 'user_accepted'
      AND event_date BETWEEN ${startDateTime} AND ${endDateTime}
      ${department && department !== 'all' ? prisma.$raw`AND group_name = ${department}` : prisma.$raw``}
      ${personType && personType !== 'all' ? prisma.$raw`AND person_type = ${personType}` : prisma.$raw``}
      GROUP BY WEEK(event_date)
      ORDER BY WEEK(event_date)
    `;
    
    // 4. Récupérer uniquement les informations mensuelles pour les graphiques
    const monthlyData = await prisma.$queryRaw`
      SELECT 
        CONCAT(YEAR(event_date), '-', MONTH(event_date)) as week,
        COUNT(DISTINCT badge_number) as count,
        AVG(TIMESTAMPDIFF(MINUTE, MIN(event_time), MAX(event_time))) as avgDuration
      FROM access_logs
      WHERE badge_number IS NOT NULL
      AND event_type = 'user_accepted'
      AND event_date BETWEEN ${startDateTime} AND ${endDateTime}
      ${department && department !== 'all' ? prisma.$raw`AND group_name = ${department}` : prisma.$raw``}
      ${personType && personType !== 'all' ? prisma.$raw`AND person_type = ${personType}` : prisma.$raw``}
      GROUP BY YEAR(event_date), MONTH(event_date)
      ORDER BY YEAR(event_date), MONTH(event_date)
    `;
    
    // 5. Récupérer les statistiques des employés pour les graphiques (sans données détaillées)
    const employeeStatsResult = await prisma.$queryRaw`
      SELECT
        badge_number,
        full_name,
        COUNT(DISTINCT event_date) as days_present,
        SUM(TIMESTAMPDIFF(MINUTE, MIN(event_time), MAX(event_time))) as total_minutes
      FROM access_logs
      WHERE badge_number IS NOT NULL
      AND event_type = 'user_accepted'
      AND event_date BETWEEN ${startDateTime} AND ${endDateTime}
      ${department && department !== 'all' ? prisma.$raw`AND group_name = ${department}` : prisma.$raw``}
      ${personType && personType !== 'all' ? prisma.$raw`AND person_type = ${personType}` : prisma.$raw``}
      GROUP BY badge_number, full_name
      ORDER BY total_minutes DESC
      LIMIT 20
    `;
    
    // Extraire les valeurs des résultats
    const totalEmployees = Number((totalEmployeesResult as any[])[0]?.count || 0);
    const totalMinutes = Number((totalHoursResult as any[])[0]?.total_minutes || 0);
    const totalDays = Number((totalDaysResult as any[])[0]?.count || 0);
    
    // Calculer les moyennes
    const avgDailyHours = totalDays > 0 ? totalMinutes / totalDays / 60 : 0;
    const avgEmployeePerDay = totalDays > 0 && totalEmployees > 0 ? totalEmployees / totalDays : 0;
    
    // Formater les données quotidiennes
    console.log(`[SUMMARY-API] Formatage des données quotidiennes (${(dailyData as any[]).length} jours)`);
    const formattedDailyData = (dailyData as any[]).map(day => ({
      date: format(new Date(day.date), 'yyyy-MM-dd'),
      count: Number(day.count),
      duration: Number(day.duration || 0)
    }));
    
    // Créer le résumé qui contient des données agrégées par jour (mais pas individuelles)
    const summaryData = {
      summary: {
        totalEmployees,
        totalHours: totalMinutes / 60,
        totalDays,
        avgDailyHours,
        avgEmployeePerDay,
        attendanceRate: totalEmployees > 0 ? avgEmployeePerDay / totalEmployees : 0
      },
      // Données quotidiennes AGRÉGÉES (et non détaillées par personne)
      daily: formattedDailyData,
      // Données pour les graphiques
      weekly: (weeklyData as any[]).map(week => ({
        day: week.day,
        count: Number(week.count),
        avgDuration: Number(week.avgDuration || 0)
      })),
      monthly: (monthlyData as any[]).map(month => ({
        week: month.week,
        count: Number(month.count),
        avgDuration: Number(month.avgDuration || 0)
      })),
      employeeStats: (employeeStatsResult as any[]).map(emp => ({
        badge: emp.badge_number,
        name: emp.full_name,
        daysPresent: Number(emp.days_present),
        totalHours: Number(emp.total_minutes / 60)
      }))
    };
    
    // Debug: Vérifier si les données sont bien formatées
    console.log(`[SUMMARY-API] Structure finale des données:`, Object.keys(summaryData));
    console.log(`[SUMMARY-API] Nombre de jours: ${summaryData.daily.length}`);
    
    if (summaryData.daily.length > 0) {
      console.log(`[SUMMARY-API] Structure d'un jour: ${Object.keys(summaryData.daily[0]).join(', ')}`);
    }
    
    // Force: assurons-nous que detailedLogs n'existe pas du tout
    if ((summaryData as any).detailedLogs) {
      console.log(`[SUMMARY-API] Suppression forcée de detailedLogs`);
      delete (summaryData as any).detailedLogs;
    }
    
    // Retourner les données de synthèse
    return NextResponse.json(summaryData);
    
  } catch (error) {
    console.error('Erreur lors de la récupération des données de synthèse:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des données' },
      { status: 500 }
    );
  }
} 