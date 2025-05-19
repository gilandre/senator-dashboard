import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Types pour les données de présence
interface PresenceData {
  date: string;
  entryTime: string;
  exitTime: string;
  duration: number; // en minutes
  isComplete: boolean;
  count: number;
}

// Ajouter les interfaces pour les nouveaux composants du rapport
interface EmployeePresenceDetail {
  badge_number: string;
  name: string;
  groupe: string; // Renommé de "department" à "groupe"
  date: string;
  first_badge: string;
  last_badge: string;
  duration: number;
  is_complete: boolean;
}

interface PresenceStats {
  daily: PresenceData[];
  weekly: {
    day: string;
    avgDuration: number;
    count: number;
    totalHours: number; // Ajouté pour le résumé
  }[];
  monthly: {
    week: string;
    avgDuration: number;
    count: number;
    totalHours: number; // Ajouté pour le résumé
  }[];
  yearly: {
    month: string;
    avgDuration: number;
    count: number;
    totalHours: number; // Ajouté pour le résumé
  }[];
  employeeStats: {
    badge_number: string;
    name: string;
    groupe: string; // Renommé de "department" à "groupe"
    avgDuration: number;
    totalDays: number;
    totalHours: number;
  }[];
  detailedLogs: EmployeePresenceDetail[];
  summary: {
    totalEmployees: number;
    totalDays: number;
    avgDailyHours: number;
    totalHours: number;
    avgEmployeePerDay: number;
  };
}

// Fonction pour calculer la durée en minutes entre deux heures au format HH:MM
function calculateDuration(entryTime: string, exitTime: string): number {
  try {
    const [entryHours, entryMinutes] = entryTime.split(':').map(Number);
    const [exitHours, exitMinutes] = exitTime.split(':').map(Number);
    
    const entryTotalMinutes = entryHours * 60 + entryMinutes;
    const exitTotalMinutes = exitHours * 60 + exitMinutes;
    
    return exitTotalMinutes - entryTotalMinutes;
  } catch (error) {
    return 0;
  }
}

// Fonction pour récupérer la date maximale des logs d'accès
async function getMaxLogDate(): Promise<Date> {
  try {
    const result = await prisma.$queryRaw<{max_date: Date}[]>`
      SELECT MAX(event_date) as max_date FROM access_logs
    `;
    
    if (result && result[0]?.max_date) {
      return new Date(result[0].max_date);
    }
    
    // Si aucune date n'est trouvée, retourner la date actuelle
    return new Date();
  } catch (error) {
    console.error('Erreur lors de la récupération de la date maximale:', error);
    // En cas d'erreur, retourner la date actuelle
    return new Date();
  }
}

// Récupérer les données de présence depuis la base de données
async function fetchPresenceData(startDate?: string, endDate?: string, filters: any = {}): Promise<PresenceStats> {
  try {
    console.log(`Fetching presence data with date range: ${startDate || 'none'} to ${endDate || 'none'}`);
    console.log('Filters:', filters);
    
    // Définir une date de début et de fin par défaut basée sur la date maximale des logs
    const maxLogDate = await getMaxLogDate();
    const defaultEndDate = maxLogDate; // Date maximale des logs
    const defaultStartDate = new Date(maxLogDate);
    defaultStartDate.setDate(defaultStartDate.getDate() - 14); // 2 semaines avant
    
    const formattedStartDate = startDate ? new Date(startDate) : defaultStartDate;
    const formattedEndDate = endDate ? new Date(endDate) : defaultEndDate;
    
    console.log('Date de début formatée:', formattedStartDate);
    console.log('Date de fin formatée:', formattedEndDate);
    
    // RÉCUPÉRATION DES DONNÉES RÉELLES
    const dailyData: PresenceData[] = [];
    let detailedLogs: EmployeePresenceDetail[] = [];
    
    try {
      // 1. Récupération des logs détaillés par employé (incluant tous les employés, même désactivés)
      const detailedQuery = `
        SELECT 
          a.event_date,
          a.badge_number,
          COALESCE(CONCAT(e.first_name, ' ', e.last_name), 'données vides') as name,
          COALESCE(a.group_name, 'données vides') as groupe,
          MIN(a.event_time) as first_badge,
          MAX(a.event_time) as last_badge,
          TIMESTAMPDIFF(MINUTE, MIN(a.event_time), MAX(a.event_time)) as duration
        FROM access_logs a
        LEFT JOIN employees e ON a.badge_number = e.badge_number
        WHERE a.event_date BETWEEN ? AND ?
        ${filters.personType && filters.personType !== 'all' ? 'AND a.person_type = ?' : ''}
        ${filters.department && filters.department !== 'all' ? 'AND a.group_name = ?' : ''}
        ${filters.eventType ? 'AND a.event_type = ?' : ''}
        GROUP BY a.event_date, a.badge_number, name, a.group_name
        ORDER BY a.event_date, a.badge_number
      `;
      
      let detailedParams: any[] = [formattedStartDate, formattedEndDate];
      if (filters.personType && filters.personType !== 'all') {
        detailedParams.push(filters.personType);
      }
      if (filters.department && filters.department !== 'all') {
        detailedParams.push(filters.department);
      }
      if (filters.eventType) {
        detailedParams.push(filters.eventType);
      }
      
      const detailedResults = await prisma.$queryRawUnsafe(detailedQuery, ...detailedParams) as any[];
      
      if (Array.isArray(detailedResults) && detailedResults.length > 0) {
        console.log(`Récupération détaillée de ${detailedResults.length} enregistrements employé/jour`);
        
        // Convertir en format détaillé
        detailedLogs = detailedResults.map(record => ({
          badge_number: record.badge_number,
          name: record.name,
          groupe: record.groupe, // Renommé de "department" à "groupe"
          date: new Date(record.event_date).toISOString().split('T')[0],
          first_badge: formatTime(new Date(record.first_badge)),
          last_badge: formatTime(new Date(record.last_badge)),
          duration: Math.max(0, Number(record.duration) || 0),
          is_complete: true
        }));
        
        // 2. Calcul des résumés journaliers
        const dailyMap = new Map<string, { totalDuration: number; userCount: number; }>();
        
        for (const log of detailedLogs) {
          if (!dailyMap.has(log.date)) {
            dailyMap.set(log.date, { totalDuration: 0, userCount: 0 });
          }
          
          const day = dailyMap.get(log.date)!;
          day.totalDuration += log.duration;
          day.userCount += 1;
        }
        
        // Convertir en format quotidien
        Array.from(dailyMap.entries()).forEach(([date, data]) => {
          const avgDuration = data.userCount > 0 ? Math.round(data.totalDuration / data.userCount) : 0;
          
          dailyData.push({
            date,
            entryTime: "08:00", // Heure standard de début
            exitTime: formatEndTime("08:00", avgDuration),
            duration: avgDuration,
            isComplete: true,
            count: data.userCount
          });
        });
      } else {
        console.log("Pas de données employé détaillées, retournant des résultats vides");
        return getEmptyPresenceStats();
      }
      
      // 3. Calcul des statistiques par employé
      const employeeMap = new Map<string, { 
        badge_number: string;
        name: string;
        groupe: string; // Renommé de "department" à "groupe"
        totalDuration: number;
        daysCount: number;
      }>();
      
      for (const log of detailedLogs) {
        if (!employeeMap.has(log.badge_number)) {
          employeeMap.set(log.badge_number, { 
            badge_number: log.badge_number,
            name: log.name,
            groupe: log.groupe, // Renommé de "department" à "groupe"
            totalDuration: 0, 
            daysCount: 0 
          });
        }
        
        const emp = employeeMap.get(log.badge_number)!;
        emp.totalDuration += log.duration;
        emp.daysCount += 1;
      }
      
      const employeeStats = Array.from(employeeMap.values()).map(emp => ({
        badge_number: emp.badge_number,
        name: emp.name,
        groupe: emp.groupe, // Renommé de "department" à "groupe"
        avgDuration: emp.daysCount > 0 ? Math.round(emp.totalDuration / emp.daysCount) : 0,
        totalDays: emp.daysCount,
        totalHours: Math.round(emp.totalDuration / 60 * 10) / 10 // Arrondi à 1 décimale
      }));
    
    } catch (error) {
      console.error("Erreur lors de la récupération des données détaillées:", error);
      return getEmptyPresenceStats();
    }
    
    // Trier par date
    dailyData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    // 4. Données hebdomadaires - agrégées par jour de la semaine
    const weeklyMap = new Map<string, { totalDuration: number; totalCount: number; days: number }>();
    const dayNames = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
    
    for (const day of dailyData) {
      const date = new Date(day.date);
      const dayOfWeek = date.getDay();
      const dayName = dayNames[dayOfWeek];
      
      if (!weeklyMap.has(dayName)) {
        weeklyMap.set(dayName, { totalDuration: 0, totalCount: 0, days: 0 });
      }
      
      const data = weeklyMap.get(dayName)!;
      data.totalDuration += day.duration * day.count; // Total des minutes de tous les utilisateurs 
      data.totalCount += day.count;
      data.days += 1;
    }
    
    const weekly = Array.from(weeklyMap.entries())
      .filter(([day]) => day !== "Samedi" && day !== "Dimanche") // Exclure les weekends si nécessaire
      .map(([day, data]) => ({
        day,
        avgDuration: data.totalCount > 0 ? Math.round(data.totalDuration / data.totalCount) : 0,
        count: data.days > 0 ? Math.round(data.totalCount / data.days) : 0,
        totalHours: Math.round(data.totalDuration / 60 * 10) / 10 // En heures avec 1 décimale
      }))
      .sort((a, b) => {
        // Trier par jour de la semaine
        const dayIndex = (name: string) => dayNames.indexOf(name);
        return dayIndex(a.day) - dayIndex(b.day);
      });
    
    // 5. Données mensuelles - agrégées par semaine
    const monthly = generateMonthlyDataFromDaily(dailyData);
    
    // 6. Données annuelles - agrégées par mois
    const yearly = generateYearlyDataFromDaily(dailyData);
    
    // 7. Résumé global
    let totalEmployees = new Set(detailedLogs.map(log => log.badge_number)).size;
    let totalDays = new Set(detailedLogs.map(log => log.date)).size;
    let totalPresenceDuration = detailedLogs.reduce((sum, log) => sum + log.duration, 0);
    let totalDailyEmployeeCount = dailyData.reduce((sum, day) => sum + day.count, 0);
    
    const summary = {
      totalEmployees,
      totalDays,
      avgDailyHours: totalDays > 0 ? Math.round((totalPresenceDuration / totalDays / 60) * 10) / 10 : 0,
      totalHours: Math.round(totalPresenceDuration / 60 * 10) / 10,
      avgEmployeePerDay: totalDays > 0 ? Math.round((totalDailyEmployeeCount / totalDays) * 10) / 10 : 0
    };
    
    return {
      daily: dailyData,
      weekly,
      monthly,
      yearly,
      employeeStats: [],  // Tableau vide si la variable n'est pas définie plus tôt
      detailedLogs,
      summary
    };
    
  } catch (error) {
    console.error('Erreur lors de la récupération des données de présence:', error);
    return getEmptyPresenceStats();
  }
}

// Fonction pour retourner des statistiques vides quand aucune donnée n'est disponible
function getEmptyPresenceStats(): PresenceStats {
  return {
    daily: [],
    weekly: [],
    monthly: [],
    yearly: [],
    employeeStats: [],
    detailedLogs: [],
    summary: {
      totalEmployees: 0,
      totalDays: 0,
      avgDailyHours: 0,
      totalHours: 0,
      avgEmployeePerDay: 0
    }
  };
}

// Nouvelle fonction pour calculer l'heure de fin à partir d'une heure de début et d'une durée
function formatEndTime(startTime: string, durationMinutes: number): string {
  try {
    const [hours, minutes] = startTime.split(':').map(Number);
    
    let totalMinutes = hours * 60 + minutes + durationMinutes;
    const endHours = Math.floor(totalMinutes / 60) % 24;
    const endMinutes = totalMinutes % 60;
    
    return `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
  } catch (error) {
    return "17:00"; // Valeur par défaut
  }
}

// Fonction pour générer des données mensuelles à partir des données quotidiennes
function generateMonthlyDataFromDaily(dailyData: PresenceData[]) {
  const weekMap = new Map<string, { totalDuration: number; totalCount: number; days: number }>();
  
  for (const day of dailyData) {
    const date = new Date(day.date);
    const weekNum = getWeekNumber(date);
    const weekKey = `W${weekNum}`;
    
    if (!weekMap.has(weekKey)) {
      weekMap.set(weekKey, { totalDuration: 0, totalCount: 0, days: 0 });
    }
    
    const data = weekMap.get(weekKey)!;
    data.totalDuration += day.duration * day.count; // Multiplication par le nombre d'utilisateurs
    data.totalCount += day.count;
    data.days += 1;
  }
  
  return Array.from(weekMap.entries())
    .map(([week, data]) => ({
      week,
      avgDuration: data.totalCount > 0 ? Math.round(data.totalDuration / data.totalCount) : 0,
      count: data.days > 0 ? Math.round(data.totalCount / data.days) : 0,
      totalHours: Math.round(data.totalDuration / 60 * 10) / 10 // En heures avec 1 décimale
    }))
    .sort((a, b) => {
      // Extract week numbers for comparison
      const numA = parseInt(a.week.substring(1));
      const numB = parseInt(b.week.substring(1));
      return numA - numB;
    });
}

// Fonction pour générer des données annuelles à partir des données quotidiennes
function generateYearlyDataFromDaily(dailyData: PresenceData[]) {
  const monthMap = new Map<string, { totalDuration: number; totalCount: number; days: number }>();
  const monthNames = [
    "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
  ];
  
  for (const day of dailyData) {
    const date = new Date(day.date);
    const month = date.getMonth();
    const monthName = monthNames[month];
    
    if (!monthMap.has(monthName)) {
      monthMap.set(monthName, { totalDuration: 0, totalCount: 0, days: 0 });
    }
    
    const data = monthMap.get(monthName)!;
    data.totalDuration += day.duration * day.count; // Multiplication par le nombre d'utilisateurs
    data.totalCount += day.count;
    data.days += 1;
  }
  
  return Array.from(monthMap.entries())
    .map(([month, data]) => ({
      month,
      avgDuration: data.totalCount > 0 ? Math.round(data.totalDuration / data.totalCount) : 0,
      count: data.days > 0 ? Math.round(data.totalCount / data.days) : 0,
      totalHours: Math.round(data.totalDuration / 60 * 10) / 10 // En heures avec 1 décimale
    }))
    .sort((a, b) => {
      // Sort by month order
      return monthNames.indexOf(a.month) - monthNames.indexOf(b.month);
    });
}

// Fonction utilitaire pour obtenir le numéro de semaine d'une date
function getWeekNumber(date: Date) {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}

// Fonction utilitaire pour formater l'heure à partir d'un objet Date
function formatTime(date: Date): string {
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
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
    const period = searchParams.get("period") || "all";
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;
    
    // Récupérer les filtres supplémentaires
    const filters = {
      personType: searchParams.get("personType") || 'all',
      department: searchParams.get("department") || 'all',
      eventType: searchParams.get("eventType") || undefined
    };
    
    console.log('API request parameters:', { period, startDate, endDate, filters });
    
    // Récupérer les données depuis la base de données
    const data = await fetchPresenceData(startDate, endDate, filters);
    
    // Retourner les données en fonction de la période demandée
    if (period === "daily") {
      return NextResponse.json(data.daily);
    } else if (period === "weekly") {
      return NextResponse.json(data.weekly);
    } else if (period === "monthly") {
      return NextResponse.json(data.monthly);
    } else if (period === "yearly") {
      return NextResponse.json(data.yearly);
    } else {
      return NextResponse.json(data);
    }
  } catch (error) {
    console.error("[API] Error fetching presence data:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des données de présence" },
      { status: 500 }
    );
  }
} 