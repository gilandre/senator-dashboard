import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { AuthLogger } from '@/lib/security/authLogger';
import type { access_logs, access_logs_person_type, access_logs_event_type, attendance_parameters } from '@prisma/client';
import { format, isWeekend, parseISO } from 'date-fns';

// Définir un type étendu pour attendance_parameters si nécessaire
// mais utiliser directement le type généré par Prisma pour la compatibilité
type AttendanceParams = attendance_parameters;

// Type Decimal pour la compatibilité avec Prisma
type Decimal = {
  toString: () => string;
  toNumber: () => number;
};

// Structure attendue par le frontend pour les données d'assiduité
interface AttendanceRecord {
  _id: string;
  badgeNumber: string;
  firstName: string;
  lastName: string;
  date: string;
  isHoliday: boolean;
  holidayName?: string;
  isWeekend: boolean;
  events: Array<{
    badgeNumber: string;
    eventDate: string;
    time: string;
    eventType: string;
    rawEventType: string | null;
    readerName: string;
    _id: string;
  }>;
  totalHours: number;
  formattedTotalHours: string;
  arrivalTime: string;
  departureTime: string;
  arrivalReader: string;
  departureReader: string;
  reader: string;
  status: string;
  isContinuousDay: boolean;
  isHalfDay: boolean;
  halfDayType?: 'morning' | 'afternoon';
  pauseMinutes: number;
  lunchMinutes: number;
  personType?: 'employee' | 'visitor' | 'unknown';
}

// Type pour les logs d'accès avec des propriétés supplémentaires
type ExtendedAccessLog = access_logs & {
  reader_name?: string;
};

// Fonction utilitaire pour arrondir le temps selon les paramètres configurés
function roundTime(timeStr: string, interval: number, direction: 'up' | 'down' | 'nearest'): string {
  if (!timeStr) return timeStr;
  
  const [hours, minutes] = timeStr.split(':').map(Number);
  let roundedMinutes: number;
  
  if (direction === 'up') {
    // Arrondir vers le haut au prochain intervalle
    roundedMinutes = Math.ceil(minutes / interval) * interval;
  } else if (direction === 'down') {
    // Arrondir vers le bas au précédent intervalle
    roundedMinutes = Math.floor(minutes / interval) * interval;
  } else {
    // Arrondir au plus proche intervalle
    roundedMinutes = Math.round(minutes / interval) * interval;
  }
  
  // Gérer le cas où les minutes arrondies = 60
  let adjustedHours = hours;
  if (roundedMinutes === 60) {
    roundedMinutes = 0;
    adjustedHours += 1;
  }
  
  // Formater le résultat
  return `${adjustedHours.toString().padStart(2, '0')}:${roundedMinutes.toString().padStart(2, '0')}`;
}

// Formater le temps en heures:minutes
function formatTime(date: Date): string {
  return format(date, 'HH:mm');
}

// Formater les heures décimales en chaîne de caractères (ex: 8.5 => "8h30")
function formatHours(hours: number): string {
  const wholeHours = Math.floor(hours);
  const minutes = Math.round((hours - wholeHours) * 60);
  return `${wholeHours}h${minutes.toString().padStart(2, '0')}`;
}

// Calculer la différence en heures entre deux heures (format HH:MM)
function calculateHoursDifference(startTime: string, endTime: string, lunchMinutes: number = 60): number {
  if (!startTime || !endTime) return 0;
  
  const [startHours, startMinutes] = startTime.split(':').map(Number);
  const [endHours, endMinutes] = endTime.split(':').map(Number);
  
  let totalStartMinutes = startHours * 60 + startMinutes;
  let totalEndMinutes = endHours * 60 + endMinutes;
  
  // Gérer le cas où l'heure de fin est le lendemain (nuit)
  if (totalEndMinutes < totalStartMinutes) {
    totalEndMinutes += 24 * 60; // Ajouter 24 heures
  }
  
  // Calculer la différence en minutes, puis soustraire la pause déjeuner
  const diffMinutes = totalEndMinutes - totalStartMinutes - lunchMinutes;
  
  // Convertir en heures décimales (arrondi à 2 décimales)
  return Math.max(0, parseFloat((diffMinutes / 60).toFixed(2)));
}

// Vérifier si une date est un jour férié
async function isHoliday(date: Date): Promise<{ isHoliday: boolean, holidayName?: string }> {
  const formattedDate = format(date, 'yyyy-MM-dd');
  
  const holiday = await prisma.holidays.findUnique({
    where: { date: new Date(formattedDate) }
  });
  
  if (holiday) {
    return { isHoliday: true, holidayName: holiday.name };
  }
  
  return { isHoliday: false };
}

/**
 * GET /api/attendance - Récupérer les données d'assiduité
 */
export async function GET(req: NextRequest) {
  try {
    // Vérification de l'authentification
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Authentification requise" }, { status: 401 });
    }

    // Récupérer les paramètres de la requête
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const employeeId = searchParams.get('employeeId');
    const department = searchParams.get('department');

    // Valider les dates
    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: "Les dates de début et de fin sont requises" },
        { status: 400 }
      );
    }

    console.log(`[DEBUG] Requête attendance: startDate=${startDate}, endDate=${endDate}, employeeId=${employeeId}, department=${department}`);

    // Construire la requête pour les logs d'accès
    const where = {
      event_date: {
        gte: new Date(startDate),
        lte: new Date(endDate)
      },
      // Supprimer le filtre par type de personne pour inclure tous les utilisateurs (employés, visiteurs, etc.)
      // person_type: 'employee' as access_logs_person_type,
      ...(employeeId && { badge_number: { equals: employeeId } }),
      ...(department && {
        group_name: { equals: department }
      })
    };

    // Récupérer les données d'accès
    const accessLogs = await prisma.access_logs.findMany({
      where,
      orderBy: {
        event_date: 'desc'
      }
    });
    
    console.log(`[DEBUG] Nombre d'enregistrements trouvés dans access_logs: ${accessLogs.length}`);
    
    if (accessLogs.length === 0) {
      console.log('[DEBUG] Aucun enregistrement trouvé, vérifier les filtres ou les données en base');
      return NextResponse.json([]);
    }
    
    // Récupérer les numéros de badge uniques
    const badgeNumbers = Array.from(new Set(accessLogs.map(log => log.badge_number)));
    console.log(`[DEBUG] Numéros de badge uniques: ${badgeNumbers.length} [${badgeNumbers.join(', ')}]`);
    
    // Récupérer les informations des employés
    const employees = await prisma.employees.findMany({
      where: {
        badge_number: {
          in: badgeNumbers
        }
      }
    });
    
    console.log(`[DEBUG] Employés trouvés: ${employees.length}`);
    if (employees.length > 0) {
      console.log(`[DEBUG] Badges des employés trouvés: [${employees.map(e => e.badge_number).join(', ')}]`);
    }
    
    // Récupérer les informations des visiteurs pour les badges qui ne correspondent pas à des employés
    const employeeBadges = employees.map(e => e.badge_number);
    const visitorBadges = badgeNumbers.filter(badge => !employeeBadges.includes(badge));
    
    // Définir le type visitors basé sur le schéma de la table visiteurs
    let visitors: {
      id: number;
      badge_number: string;
      first_name: string;
      last_name: string;
      company: string;
      reason: string | null;
      status: string;
      created_at: Date;
      updated_at: Date;
      access_count: number;
      first_seen: Date | null;
      last_seen: Date | null;
    }[] = [];
    
    if (visitorBadges.length > 0) {
      visitors = await prisma.visitors.findMany({
        where: {
          badge_number: {
            in: visitorBadges
          }
        }
      });
      console.log(`[DEBUG] Visiteurs trouvés: ${visitors.length}`);
      if (visitors.length > 0) {
        console.log(`[DEBUG] Badges des visiteurs trouvés: [${visitors.map(v => v.badge_number).join(', ')}]`);
      }
    }

    // Récupérer les paramètres de configuration de l'assiduité
    const attendanceParams = await prisma.attendance_parameters.findFirst();
    
    // Récupérer les paramètres de pause déjeuner
    const lunchDuration = attendanceParams?.lunch_break_duration || 60;
    const lunchBreakEnabled = attendanceParams?.lunch_break === true;
    const lunchBreakStart = attendanceParams?.lunch_break_start || '12:00';
    const lunchBreakEnd = attendanceParams?.lunch_break_end || '13:00';
    
    // Récupérer les heures de travail standard
    const workStartHour = attendanceParams?.start_hour || '08:00';
    const workEndHour = attendanceParams?.end_hour || '17:00';
    
    // Récupérer les jours fériés dans la période
    const holidays = await prisma.holidays.findMany({
      where: {
        date: {
          gte: new Date(startDate),
          lte: new Date(endDate)
        }
      }
    });
    
    const holidayDates = holidays.reduce((acc, holiday) => {
      const dateStr = format(holiday.date, 'yyyy-MM-dd');
      acc[dateStr] = holiday.name;
      return acc;
    }, {} as Record<string, string>);
    
    // Récupérer les jours définis comme journées continues dans la configuration
    // Format "1,4,7" (où 1=lundi, 7=dimanche)
    // Note: Utilisation d'une méthode alternative pour récupérer les jours continus
    const continuousDaysParam = ((attendanceParams as any)?.continuous_days || '')
      .split(',')
      .map(Number)
      .filter(n => !isNaN(n));
    
    // Convertir les minutes pour les calculs de pause déjeuner
    const lunchStartMinutes = convertTimeToMinutes(lunchBreakStart);
    const lunchEndMinutes = convertTimeToMinutes(lunchBreakEnd);

    // Organiser les logs par badge et par jour
    const logsByBadgeAndDate: Record<string, Record<string, access_logs[]>> = {};
    
    accessLogs.forEach(log => {
      const badge = log.badge_number;
      const dateStr = format(log.event_date, 'yyyy-MM-dd');
      
      if (!logsByBadgeAndDate[badge]) {
        logsByBadgeAndDate[badge] = {};
      }
      
      if (!logsByBadgeAndDate[badge][dateStr]) {
        logsByBadgeAndDate[badge][dateStr] = [];
      }
      
      logsByBadgeAndDate[badge][dateStr].push(log);
    });

    // Transformer les logs en enregistrements d'assiduité
    const attendanceRecords: AttendanceRecord[] = [];
    
    for (const badge in logsByBadgeAndDate) {
      // Chercher d'abord si c'est un employé
      let employee = employees.find(e => e.badge_number === badge);
      let isVisitor = false;
      
      // Si ce n'est pas un employé, vérifier si c'est un visiteur
      let visitor;
      if (!employee) {
        visitor = visitors.find(v => v.badge_number === badge);
        isVisitor = !!visitor;
      }
      
      // Obtenir les informations de la personne (employé ou visiteur)
      const personInfo = employee ? {
        firstName: employee.first_name,
        lastName: employee.last_name,
        type: 'employee' as const
      } : visitor ? {
        firstName: visitor.first_name,
        lastName: visitor.last_name,
        type: 'visitor' as const
      } : {
        // Si aucune correspondance, utiliser les informations du log
        firstName: accessLogs.find(log => log.badge_number === badge)?.full_name?.split(' ')[0] || 'Personne',
        lastName: accessLogs.find(log => log.badge_number === badge)?.full_name?.split(' ')[1] || badge,
        type: (accessLogs.find(log => log.badge_number === badge)?.person_type || 'unknown') as 'employee' | 'visitor' | 'unknown'
      };
      
      for (const dateStr in logsByBadgeAndDate[badge]) {
        const logsForDay = logsByBadgeAndDate[badge][dateStr];
        
        // Trier les logs par heure
        logsForDay.sort((a, b) => {
          return new Date(a.event_time).getTime() - new Date(b.event_time).getTime();
        });
        
        // Déterminer l'heure d'arrivée et de départ
        const firstLog = logsForDay[0];
        const lastLog = logsForDay[logsForDay.length - 1];
        
        // Vérifier si le jour est un weekend ou férié
        const date = new Date(dateStr);
        const isWeekendDay = isWeekend(date);
        const isHolidayDay = !!holidayDates[dateStr];
        
        // Vérifier si le jour est une journée continue selon la configuration
        // Le jour de la semaine: 0 = dimanche, 1 = lundi, ..., 6 = samedi
        const dayOfWeek = date.getDay();
        // Convertir pour correspondre au format du paramètre (où 1 = lundi, 7 = dimanche)
        const configDayOfWeek = dayOfWeek === 0 ? 7 : dayOfWeek;
        const isContinuousDay = continuousDaysParam.includes(configDayOfWeek);
        
        // Séparer les entrées des sorties
        const entryLogs = logsForDay.filter(log => 
          log.event_type === 'entry' || 
          log.direction === 'in' ||
          (log.reader && log.reader.toLowerCase().includes('entree') || log.reader?.toLowerCase().includes('entrée'))
        );
        
        const exitLogs = logsForDay.filter(log => 
          log.event_type === 'exit' || 
          log.direction === 'out' ||
          (log.reader && log.reader.toLowerCase().includes('sortie'))
        );
        
        // Utiliser le premier log d'entrée et le dernier log de sortie
        const firstEntry = entryLogs.length > 0 ? entryLogs[0] : firstLog;
        const lastExit = exitLogs.length > 0 ? exitLogs[exitLogs.length - 1] : lastLog;
        
        // Formater les heures
        const arrivalTime = formatTime(new Date(firstEntry.event_time));
        const departureTime = formatTime(new Date(lastExit.event_time));
        
        // Convertir les heures en minutes pour les calculs
        const arrivalMinutes = convertTimeToMinutes(arrivalTime);
        const departureMinutes = convertTimeToMinutes(departureTime);
        
        // Calculer la durée de présence en tenant compte de la pause déjeuner
        let totalMinutes = 0;
        let pauseDeducted = 0;
        
        if (departureMinutes < arrivalMinutes) {
          // Cas spécial: journée continue passant par minuit
          totalMinutes = (24 * 60 - arrivalMinutes) + departureMinutes;
        } else {
          totalMinutes = departureMinutes - arrivalMinutes;
        }
        
        // Déduire la pause déjeuner uniquement si:
        // 1. La pause déjeuner est activée dans les paramètres
        // 2. L'employé était présent pendant la période de pause
        // 3. Ce n'est pas un weekend ou un jour férié
        // 4. Ce n'est pas une journée continue
        if (lunchBreakEnabled && !isWeekendDay && !isHolidayDay && !isContinuousDay) {
          // Vérifier si la période de présence chevauche la pause déjeuner
          const presenceDuringLunch = 
            (arrivalMinutes <= lunchStartMinutes && departureMinutes >= lunchEndMinutes) || // Présent pendant toute la pause
            (arrivalMinutes >= lunchStartMinutes && arrivalMinutes < lunchEndMinutes) ||   // Arrivé pendant la pause
            (departureMinutes > lunchStartMinutes && departureMinutes <= lunchEndMinutes); // Parti pendant la pause
            
          if (presenceDuringLunch) {
            // Si présent pendant toute la pause, déduire la durée complète
            if (arrivalMinutes <= lunchStartMinutes && departureMinutes >= lunchEndMinutes) {
              pauseDeducted = lunchEndMinutes - lunchStartMinutes;
            } 
            // Si arrivé pendant la pause, déduire depuis l'arrivée jusqu'à la fin de la pause
            else if (arrivalMinutes >= lunchStartMinutes && arrivalMinutes < lunchEndMinutes) {
              pauseDeducted = lunchEndMinutes - arrivalMinutes;
            }
            // Si parti pendant la pause, déduire depuis le début de la pause jusqu'au départ
            else if (departureMinutes > lunchStartMinutes && departureMinutes <= lunchEndMinutes) {
              pauseDeducted = departureMinutes - lunchStartMinutes;
            }
          }
        }
        
        // Calculer le temps total en déduisant la pause
        const netMinutes = totalMinutes - pauseDeducted;
        const totalHours = netMinutes / 60;
        
        // Créer les événements au format attendu
        const events = logsForDay.map(log => ({
          badgeNumber: log.badge_number,
          eventDate: format(log.event_date, 'yyyy-MM-dd'),
          time: formatTime(new Date(log.event_time)),
          eventType: log.event_type || (log.direction === 'in' ? 'entry' : log.direction === 'out' ? 'exit' : 'unknown'),
          rawEventType: log.raw_event_type,
          readerName: log.reader || 'Non spécifié',
          _id: log.id.toString()
        }));
        
        // Créer l'enregistrement d'assiduité
        attendanceRecords.push({
          _id: `${badge}_${dateStr}`,
          badgeNumber: badge,
          firstName: personInfo.firstName,
          lastName: personInfo.lastName,
          date: dateStr,
          isHoliday: isHolidayDay,
          holidayName: holidayDates[dateStr],
          isWeekend: isWeekendDay,
          events,
          totalHours,
          formattedTotalHours: formatHours(totalHours),
          arrivalTime,
          departureTime,
          arrivalReader: firstEntry.reader || 'Non spécifié',
          departureReader: lastExit.reader || 'Non spécifié',
          reader: firstEntry.reader || 'Non spécifié',  // Compatibilité
          status: isHolidayDay ? 'HOLIDAY' : isWeekendDay ? 'WEEKEND' : isContinuousDay ? 'CONTINUOUS' : 'PRESENT',
          isContinuousDay,
          isHalfDay: false,  // Par défaut
          halfDayType: undefined,
          pauseMinutes: pauseDeducted,  // Temps de pause réellement déduit
          lunchMinutes: lunchBreakEnabled ? lunchDuration : 0,
          personType: personInfo.type
        });
      }
    }

    // Calculer les statistiques
    const stats = {
      total: attendanceRecords.length,
      uniqueDates: Array.from(new Set(attendanceRecords.map(record => record.date))).length,
      uniqueEmployees: badgeNumbers.length,
      avgPerDay: (attendanceRecords.length / Math.max(1, Array.from(new Set(attendanceRecords.map(record => record.date))).length)).toFixed(1),
      avgPerEmployee: (attendanceRecords.length / Math.max(1, badgeNumbers.length)).toFixed(1)
    };
    
    console.log(`[DEBUG] Statistiques: ${JSON.stringify(stats)}`);

    // Enregistrer l'activité
    await AuthLogger.logActivity(
      session.user.id,
      'attendance_view',
      `Consultation des données d'assiduité du ${startDate} au ${endDate}`
    );

    // Trier les enregistrements par date (plus récente en premier) et par nom
    attendanceRecords.sort((a, b) => {
      // D'abord par date (plus récente en premier)
      const dateComparison = b.date.localeCompare(a.date);
      if (dateComparison !== 0) return dateComparison;
      
      // Ensuite par nom de famille
      return a.lastName.localeCompare(b.lastName);
    });

    // Renvoyer les enregistrements
    return NextResponse.json(attendanceRecords);
  } catch (error) {
    console.error('Erreur lors de la récupération des données d\'assiduité:', error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des données d'assiduité" },
      { status: 500 }
    );
  }
}

// Fonction utilitaire pour convertir une heure (format HH:MM) en minutes depuis minuit
function convertTimeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * POST /api/attendance - Enregistrer une nouvelle entrée d'assiduité manuelle
 */
export async function POST(req: NextRequest) {
  try {
    // Vérification de l'authentification
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Authentification requise" }, { status: 401 });
    }

    // Extraire les données
    const body = await req.json();
    const { employeeId, date, status, notes } = body;

    // Valider les données requises
    if (!employeeId || !date || !status) {
      return NextResponse.json(
        { error: "Tous les champs obligatoires doivent être remplis" },
        { status: 400 }
      );
    }

    // Vérifier si l'employé existe
    const employee = await prisma.employees.findUnique({
      where: { id: Number(employeeId) }
    });

    if (!employee) {
      return NextResponse.json(
        { error: "Employé non trouvé" },
        { status: 404 }
      );
    }

    // Au lieu de créer une entrée dans une table attendance inexistante,
    // créer un log d'accès manuel
    const accessLog = await prisma.access_logs.create({
      data: {
        badge_number: employee.badge_number,
        person_type: 'employee' as access_logs_person_type,
        event_date: new Date(date),
        event_time: new Date(), // Heure actuelle
        event_type: status === 'PRESENT' ? 'entry' as access_logs_event_type : 'unknown' as access_logs_event_type,
        direction: status === 'PRESENT' ? 'in' : null,
        full_name: `${employee.first_name} ${employee.last_name}`,
        group_name: employee.department || '',
        raw_event_type: notes,
        processed: true
      }
    });

    // Enregistrer l'activité
    await AuthLogger.logActivity(
      session.user.id,
      'attendance_create',
      `Création manuelle d'une entrée d'assiduité pour l'employé ${employee.first_name} ${employee.last_name} (${employee.badge_number})`
    );

    // Formater la réponse pour correspondre à l'attendu
    const attendanceRecord = {
      id: accessLog.id,
      date: accessLog.event_date,
      time: accessLog.event_time,
      badge_number: accessLog.badge_number,
      employee: {
        id: employee.id,
        name: `${employee.first_name} ${employee.last_name}`,
        employee_id: employee.employee_id,
        department: employee.department
      },
      status: status,
      notes: notes,
      created_by: session.user.id
    };

    return NextResponse.json(attendanceRecord);
  } catch (error) {
    console.error('Erreur lors de la création de l\'entrée d\'assiduité:', error);
    return NextResponse.json(
      { error: "Erreur lors de la création de l'entrée d'assiduité" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/attendance - Mettre à jour une entrée d'assiduité
 */
export async function PUT(req: NextRequest) {
  try {
    // Vérification de l'authentification
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Authentification requise" }, { status: 401 });
    }

    // Extraire les données
    const body = await req.json();
    const { id, status, notes } = body;

    if (!id) {
      return NextResponse.json(
        { error: "ID d'assiduité requis" },
        { status: 400 }
      );
    }

    // Vérifier si l'entrée existe
    const existingLog = await prisma.access_logs.findUnique({
      where: { id: Number(id) }
    });

    if (!existingLog) {
      return NextResponse.json(
        { error: "Entrée d'assiduité non trouvée" },
        { status: 404 }
      );
    }

    // Mettre à jour l'entrée dans les logs d'accès
    const updatedLog = await prisma.access_logs.update({
      where: { id: Number(id) },
      data: {
        event_type: status === 'PRESENT' ? 'entry' as access_logs_event_type : 'unknown' as access_logs_event_type,
        raw_event_type: notes,
        processed: true
      }
    });

    // Récupérer les informations de l'employé correspondant
    const employee = await prisma.employees.findUnique({
      where: { badge_number: updatedLog.badge_number }
    });

    // Formater la réponse
    const attendance = {
      id: updatedLog.id,
      date: updatedLog.event_date,
      time: updatedLog.event_time,
      badge_number: updatedLog.badge_number,
      employee: employee ? {
        id: employee.id,
        name: `${employee.first_name} ${employee.last_name}`,
        employee_id: employee.employee_id,
        department: employee.department
      } : {
        id: null,
        name: updatedLog.full_name || `Employé (${updatedLog.badge_number})`,
        employee_id: updatedLog.badge_number,
        department: updatedLog.group_name || 'Non spécifié'
      },
      status: updatedLog.event_type === 'entry' ? 'PRESENT' : 'ABSENT',
      notes: updatedLog.raw_event_type
    };

    // Enregistrer l'activité
    await AuthLogger.logActivity(
      session.user.id,
      'attendance_update',
      `Mise à jour d'une entrée d'assiduité pour ${attendance.employee.name}`
    );

    return NextResponse.json({ attendance });
  } catch (error) {
    console.error('Erreur lors de la mise à jour de l\'assiduité:', error);
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour de l'assiduité" },
      { status: 500 }
    );
  }
}

/**
 * Calcule les statistiques d'assiduité
 */
async function calculateAttendanceStats(where: any) {
  // Récupérer les données d'accès au lieu des données d'assiduité
  const accessLogs = await prisma.access_logs.findMany({
    where,
    orderBy: {
      event_date: 'desc'
    }
  });

  // Calculer les statistiques de base
  const total = accessLogs.length;
  const uniqueDates = Array.from(new Set(accessLogs.map(log => log.event_date.toISOString().split('T')[0])));
  const uniqueEmployees = Array.from(new Set(accessLogs.map(log => log.badge_number)));

  return {
    total,
    uniqueDates: uniqueDates.length,
    uniqueEmployees: uniqueEmployees.length,
    avgPerDay: uniqueDates.length > 0 ? (total / uniqueDates.length).toFixed(1) : 0,
    avgPerEmployee: uniqueEmployees.length > 0 ? (total / uniqueEmployees.length).toFixed(1) : 0
  };
}

function generateTestData(startDate: Date, endDate: Date): AttendanceRecord[] {
  const testData: AttendanceRecord[] = [];
  const employees = [
    { badgeNumber: 'B001', firstName: 'Jean', lastName: 'Dupont' },
    { badgeNumber: 'B002', firstName: 'Marie', lastName: 'Martin' },
    { badgeNumber: 'B003', firstName: 'Pierre', lastName: 'Dubois' },
    { badgeNumber: 'B004', firstName: 'Sophie', lastName: 'Lefebvre' },
    { badgeNumber: 'B005', firstName: 'Lucas', lastName: 'Bernard' }
  ];
  
  // Générer des données pour chaque jour dans la plage
  const currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    // Ignorer les weekends pour certains employés
    const isWeekend = currentDate.getDay() === 0 || currentDate.getDay() === 6;
    
    const dateStr = currentDate.toISOString().split('T')[0];
    
    // Pour chaque employé
    employees.forEach((employee, index) => {
      // Certains employés sont parfois absents
      const isPresent = Math.random() > 0.2;
      
      // Moins de présence le weekend
      if ((isWeekend && Math.random() > 0.3) || !isPresent) {
        return; // Pas d'entrée pour cet employé ce jour-là
      }
      
      // Heure d'arrivée (entre 7h30 et 9h30)
      const arrivalH = 7 + Math.floor(Math.random() * 2);
      const arrivalM = Math.floor(Math.random() * 60);
      const arrivalTime = `${arrivalH.toString().padStart(2, '0')}:${arrivalM.toString().padStart(2, '0')}`;
      
      // Heure de départ (entre 16h et 18h30)
      const departureH = 16 + Math.floor(Math.random() * 3);
      const departureM = Math.floor(Math.random() * 60);
      const departureTime = `${departureH.toString().padStart(2, '0')}:${departureM.toString().padStart(2, '0')}`;
      
      // Calculer les heures travaillées
      const totalHours = (departureH - arrivalH) + (departureM - arrivalM) / 60 - 1; // -1 pour la pause déjeuner
      
      // Ajouter l'enregistrement
      testData.push({
        _id: `${employee.badgeNumber}_${dateStr}`,
        date: dateStr,
        badgeNumber: employee.badgeNumber,
        firstName: employee.firstName,
        lastName: employee.lastName,
        arrivalTime,
        departureTime,
        arrivalReader: 'Porte principale',
        departureReader: 'Porte principale',
        totalHours,
        formattedTotalHours: formatHours(totalHours),
        isHoliday: false,
        isContinuousDay: false,
        isWeekend,
        isHalfDay: false,
        halfDayType: undefined,
        holidayName: undefined,
        reader: 'Porte principale',
        status: isWeekend ? 'WEEKEND' : 'PRESENT',
        pauseMinutes: 0,
        lunchMinutes: 60,
        events: [
          {
            badgeNumber: employee.badgeNumber,
            eventDate: dateStr,
            time: arrivalTime,
            eventType: 'entry',
            rawEventType: null,
            readerName: 'Porte principale',
            _id: `entry_${employee.badgeNumber}_${dateStr}`
          },
          {
            badgeNumber: employee.badgeNumber,
            eventDate: dateStr,
            time: departureTime,
            eventType: 'exit',
            rawEventType: null,
            readerName: 'Porte principale',
            _id: `exit_${employee.badgeNumber}_${dateStr}`
          }
        ]
      });
    });
    
    // Passer au jour suivant
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  // Trier les données
  testData.sort((a, b) => {
    // D'abord par date (plus récente en premier)
    const dateComparison = b.date.localeCompare(a.date);
    if (dateComparison !== 0) return dateComparison;
    
    // Ensuite par nom de famille
    return a.lastName.localeCompare(b.lastName);
  });
  
  return testData;
} 