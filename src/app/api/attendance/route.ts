import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import type { access_logs, holidays } from '@prisma/client';

// Définir un type étendu pour attendance_parameters qui inclut working_days
type AttendanceParams = {
  id: number;
  start_hour: string;
  end_hour: string;
  daily_hours: number | bigint | Decimal;
  count_weekends: boolean | null;
  count_holidays: boolean | null;
  lunch_break: boolean | null;
  lunch_break_duration: number | null;
  lunch_break_start: string | null;
  lunch_break_end: string | null;
  allow_other_breaks: boolean | null;
  max_break_time: number | null;
  absence_request_deadline: number | null;
  overtime_request_deadline: number | null;
  round_attendance_time: boolean | null;
  rounding_interval: number | null;
  rounding_direction: string | null;
  last_updated: Date | null;
  updated_by: string | null;
  working_days: string | null;
};

// Type Decimal pour la compatibilité avec Prisma
type Decimal = {
  toString: () => string;
  toNumber: () => number;
};

// Calculer les heures d'arrivée et de départ pour chaque employé et chaque jour
type AttendanceRecord = {
  date: string;
  badgeNumber: string;
  firstName: string | null;
  lastName: string | null;
  arrivalTime: string | null;
  departureTime: string | null;
  arrivalReader: string | null;  // Lecteur de première entrée
  departureReader: string | null;  // Lecteur de dernière sortie
  totalHours: number | null;
  isHoliday: boolean;
  isContinuousDay: boolean;
  isWeekend: boolean;
  isHalfDay: boolean;  // Indique si c'est une demi-journée
  halfDayType: 'morning' | 'afternoon' | null;  // Type de demi-journée
  holidayName: string | undefined;
  notes: string | null;
  reader: string;
  pauseMinutes: number | null;  // Minutes de pause (hors déjeuner)
  lunchMinutes: number | null;  // Minutes de pause déjeuner
  events: Array<{
    badgeNumber: string;
    date: string;
    time: string;
    eventType: string;
    rawEventType: string | null;
    readerName: string;  // Nom du lecteur pour cet événement
  }>;
};

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

export async function GET(request: Request) {
  try {
    // Récupérer les paramètres de date depuis l'URL
    const url = new URL(request.url);
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');
    const allowFuture = url.searchParams.get('allowFuture') === 'true';
    const testData = url.searchParams.get('testData') === 'true';
    
    console.log('Dates reçues:', { startDate, endDate });

    if (!startDate || !endDate) {
      console.error('Dates manquantes dans la requête');
      return NextResponse.json(
        { error: 'Les paramètres startDate et endDate sont requis' },
        { status: 400 }
      );
    }

    // Convertir les dates en objets Date
    const start = new Date(startDate);
    const end = new Date(endDate);

    console.log('Dates converties:', { 
      start: start.toISOString(), 
      end: end.toISOString() 
    });

    // Vérifier que les dates sont valides
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      console.error('Dates invalides:', { start, end });
      return NextResponse.json(
        { error: 'Les dates fournies sont invalides' },
        { status: 400 }
      );
    }

    // Vérifier si les dates sont dans le futur
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (!allowFuture && !testData && (end > today || start > today)) {
      return NextResponse.json(
        { 
          error: 'Les dates futures ne sont pas autorisées', 
          message: 'Utilisez le paramètre allowFuture=true ou testData=true pour les dates futures'
        },
        { status: 400 }
      );
    }
    
    // Si testData est true ou si les dates sont futures, générer des données de test
    if (testData || end > today || start > today) {
      console.log(`Génération de données de test pour la période: ${startDate} à ${endDate}`);
      const testRecords = generateTestData(start, end);
      return NextResponse.json(testRecords);
    }
    
    // Récupérer les jours fériés pour la période
    const holidays = await prisma.holidays.findMany({
      where: {
        date: {
          gte: start,
          lte: end
        }
      }
    }).catch(error => {
      console.error('Erreur lors de la récupération des jours fériés:', error);
      return [];
    });
    
    console.log('Jours fériés trouvés:', holidays.length);
    
    // Récupérer les paramètres de l'assiduité
    let defaultParameters = {
      startHour: '08:00',
      endHour: '17:00',
      dailyHours: 8.0,
      countWeekends: false,
      countHolidays: false,
      workingDays: [1, 2, 3, 4, 5],
      lunchBreak: true,
      lunchBreakDuration: 60,
      lunchBreakStart: '12:00',
      lunchBreakEnd: '13:00',
      allowOtherBreaks: true,
      maxBreakTime: 30,
      absenceRequestDeadline: 3,
      overtimeRequestDeadline: 5,
      roundAttendanceTime: false,
      roundingInterval: 15,
      roundingDirection: 'nearest' as 'up' | 'down' | 'nearest',
      lastUpdated: new Date(),
      updatedBy: 'system'
    };
    
    try {
      const parametersDoc = await prisma.attendance_parameters.findFirst();
      if (parametersDoc) {
        // Convertir les jours de travail de chaîne en tableau
        const workingDays = (parametersDoc as any).working_days 
          ? (parametersDoc as any).working_days.split(',').map((d: string) => parseInt(d))
          : [1, 2, 3, 4, 5]; // Par défaut, lundi à vendredi si working_days n'existe pas

        // Si un document de paramètrage existe, l'utiliser
        defaultParameters = {
          ...defaultParameters,
          startHour: parametersDoc.start_hour,
          endHour: parametersDoc.end_hour,
          dailyHours: typeof parametersDoc.daily_hours === 'object' && 'toNumber' in parametersDoc.daily_hours 
            ? parametersDoc.daily_hours.toNumber() 
            : Number(parametersDoc.daily_hours),
          countWeekends: parametersDoc.count_weekends ?? false,
          countHolidays: parametersDoc.count_holidays ?? false,
          workingDays,
          lunchBreak: parametersDoc.lunch_break ?? true,
          lunchBreakDuration: parametersDoc.lunch_break_duration ?? 60,
          lunchBreakStart: parametersDoc.lunch_break_start ?? '12:00',
          lunchBreakEnd: parametersDoc.lunch_break_end ?? '13:00',
          allowOtherBreaks: parametersDoc.allow_other_breaks ?? true,
          maxBreakTime: parametersDoc.max_break_time ?? 30,
          absenceRequestDeadline: parametersDoc.absence_request_deadline ?? 3,
          overtimeRequestDeadline: parametersDoc.overtime_request_deadline ?? 5,
          roundAttendanceTime: parametersDoc.round_attendance_time ?? false,
          roundingInterval: parametersDoc.rounding_interval ?? 15,
          roundingDirection: (parametersDoc.rounding_direction as 'up' | 'down' | 'nearest') ?? 'nearest',
          lastUpdated: parametersDoc.last_updated ?? new Date(),
          updatedBy: parametersDoc.updated_by ?? 'system'
        };
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des paramètres:', error);
      // Continuer avec les paramètres par défaut
    }
    
    const parameters = defaultParameters;
    
    // Mapper les journées fériées par date pour une recherche plus facile
    const holidayMap = new Map();
    holidays.forEach(holiday => {
      const dateStr = holiday.date.toISOString().split('T')[0];
      holidayMap.set(dateStr, holiday);
    });
    
    // Récupérer tous les événements d'accès dans la plage de dates
    const accessLogs = await prisma.access_logs.findMany({
      where: {
        event_date: {
          gte: start,
          lte: end
        }
      },
      orderBy: [
        { event_date: 'asc' },
        { event_time: 'asc' }
      ]
    }).catch(error => {
      console.error('Erreur lors de la récupération des logs d\'accès:', error);
      return [];
    }) as ExtendedAccessLog[];

    console.log('Logs d\'accès trouvés:', accessLogs.length);

    if (!accessLogs || accessLogs.length === 0) {
      console.log('Aucun log d\'accès trouvé pour la période');
      return NextResponse.json(
        { data: [], message: 'Aucune donnée disponible pour cette période' },
        { status: 200 }
      );
    }
    
    // Organiser les événements par badge et par date
    const employeeAccessMap = new Map();
    
    accessLogs.forEach(log => {
      // MODIFICATION: Vérifier que les logs ont un badge_number valide
      if (!log.badge_number || log.badge_number.trim() === '') {
        return; // Ignorer les logs sans numéro de badge
      }
      
      const dateStr = log.event_date.toISOString().split('T')[0];
      const key = `${log.badge_number}_${dateStr}`;
      
      if (!employeeAccessMap.has(key)) {
        employeeAccessMap.set(key, {
          date: dateStr,
          badgeNumber: log.badge_number,
          firstName: log.full_name ? log.full_name.split(' ')[0] : null,
          lastName: log.full_name ? log.full_name.split(' ').slice(1).join(' ') : null,
          events: []
        });
      }
      
      const eventTime = log.event_time.toTimeString().slice(0, 8);
      employeeAccessMap.get(key).events.push({
        time: eventTime,
        type: log.event_type,
        rawEventType: log.raw_event_type,
        reader: log.reader || 'unknown',
        readerName: (log as ExtendedAccessLog).reader_name || log.reader || 'unknown'
      });
    });
    
    // Calculer les heures d'arrivée et de départ pour chaque employé et chaque jour
    const attendanceRecords: AttendanceRecord[] = [];
    
    // Utiliser Array.from pour convertir en tableau d'entrées avant d'itérer
    for (const [_, record] of Array.from(employeeAccessMap.entries())) {
      // Trier les événements par heure
      record.events.sort((a: { time: string }, b: { time: string }) => a.time.localeCompare(b.time));
      
      // Déterminer l'heure d'arrivée (premier événement de la journée)
      let arrivalTime = record.events.length > 0 ? record.events[0].time : null;
      let arrivalReader = record.events.length > 0 ? record.events[0].readerName || record.events[0].reader : null;
      
      // Déterminer l'heure de départ (dernier événement de la journée)
      let departureTime = record.events.length > 0 ? record.events[record.events.length - 1].time : null;
      let departureReader = record.events.length > 0 ? record.events[record.events.length - 1].readerName || record.events[record.events.length - 1].reader : null;
      
      // Si l'arrondi est activé, appliquer l'arrondi
      if (parameters.roundAttendanceTime && arrivalTime) {
        arrivalTime = roundTime(arrivalTime, parameters.roundingInterval, parameters.roundingDirection);
      }
      
      if (parameters.roundAttendanceTime && departureTime) {
        departureTime = roundTime(departureTime, parameters.roundingInterval, parameters.roundingDirection);
      }
      
      // Calculer les heures totales si arrivée et départ sont disponibles
      let totalHours: number | null = null;
      let notes: string | null = null;
      
      // Initialiser les variables de pause
      let pauseMinutes = 0;
      let lunchMinutes = 0;
      
      if (arrivalTime && departureTime) {
        const [arrivalHours, arrivalMinutes] = arrivalTime.split(':').map(Number);
        const [departureHours, departureMinutes] = departureTime.split(':').map(Number);
        
        // Convertir en minutes pour faciliter le calcul
        const arrivalTotalMinutes = arrivalHours * 60 + arrivalMinutes;
        const departureTotalMinutes = departureHours * 60 + departureMinutes;
        
        // Calculer la durée en minutes
        let durationMinutes = departureTotalMinutes - arrivalTotalMinutes;
        
        // Si négatif, considérer comme une journée continue (passant minuit)
        const isContinuousDay = durationMinutes < 0;
        if (isContinuousDay) {
          durationMinutes = (24 * 60 - arrivalTotalMinutes) + departureTotalMinutes;
          notes = "Journée continue";
        }
        
        // Déterminer les autres pauses
        if (parameters.allowOtherBreaks && parameters.maxBreakTime) {
          pauseMinutes = parameters.maxBreakTime;
        }
        
        // Déduire la pause déjeuner si elle est activée
        if (parameters.lunchBreak && durationMinutes > parameters.lunchBreakDuration) {
          lunchMinutes = parameters.lunchBreakDuration;
          durationMinutes -= parameters.lunchBreakDuration;
        }
        
        // Convertir en heures
        totalHours = Math.round(durationMinutes / 60 * 100) / 100; // Arrondir à 2 décimales
      }
      
      // Vérifier si c'est un jour férié
      const dateObj = new Date(record.date);
      const formattedDate = dateObj.toISOString().split('T')[0]; // Format YYYY-MM-DD
      const isHoliday = holidayMap.has(formattedDate);
      const holidayName = isHoliday ? holidayMap.get(formattedDate).name : undefined;
      
      // Vérifier si c'est un weekend
      const dayOfWeek = dateObj.getDay(); // 0 = dimanche, 6 = samedi
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      
      // Vérifier si c'est une demi-journée
      // Une demi-journée est définie comme < 60% des heures de travail normales
      const isHalfDay = totalHours !== null && totalHours < (parameters.dailyHours * 0.6);
      // Déterminer si c'est une demi-journée du matin ou de l'après-midi
      let halfDayType: 'morning' | 'afternoon' | null = null;
      if (isHalfDay && arrivalTime) {
        // Si l'arrivée est avant midi, c'est une demi-journée du matin
        const arrivalHour = parseInt(arrivalTime.split(':')[0]);
        halfDayType = arrivalHour < 12 ? 'morning' : 'afternoon';
      }
      
      // Vérifier si le jour actuel est un jour de travail selon la configuration
      // MODIFICATION: Ne pas ajouter d'enregistrement s'il n'y a pas de référence (badge, événement, etc.)
      if (!record.badgeNumber || record.events.length === 0) {
        continue; // Passer à l'enregistrement suivant
      }
      
      // MODIFICATION: Toujours considérer comme journée normale si c'est conforme à la table de paramétrage
      // Les journées détectées comme demi-journées sont en fait des journées normales
      const isWorkingDay = parameters.workingDays.includes(dayOfWeek);
      if (isWorkingDay) {
        // Forcer comme journée normale
        // Note: Nous conservons l'info isHalfDay pour référence future si nécessaire
      }
      
      // Ajouter à la liste des enregistrements
      attendanceRecords.push({
        date: record.date,
        badgeNumber: record.badgeNumber,
        firstName: record.firstName,
        lastName: record.lastName,
        arrivalTime,
        departureTime,
        arrivalReader,
        departureReader,
        totalHours,
        isHoliday,
        isContinuousDay: notes === "Journée continue",
        isWeekend,
        // MODIFICATION: Si c'est un jour ouvré selon la configuration, ne pas marquer comme demi-journée
        isHalfDay: isWorkingDay ? false : isHalfDay,
        halfDayType: isWorkingDay ? null : halfDayType,
        holidayName,
        notes,
        reader: record.events.length > 0 ? record.events[0].reader : 'unknown',
        pauseMinutes: pauseMinutes,
        lunchMinutes: lunchMinutes,
        events: record.events.map((e: any) => ({
          badgeNumber: record.badgeNumber,
          date: record.date,
          time: e.time,
          eventType: e.type,
          rawEventType: e.rawEventType,
          readerName: e.readerName || e.reader
        }))
      });
    }
    
    // Trier les enregistrements par date
    attendanceRecords.sort((a, b) => {
      // D'abord par date
      const dateComparison = a.date.localeCompare(b.date);
      if (dateComparison !== 0) return dateComparison;
      
      // Ensuite par heure d'arrivée (si disponible)
      if (a.arrivalTime && b.arrivalTime) {
        return a.arrivalTime.localeCompare(b.arrivalTime);
      }
      
      // Si pas d'heure d'arrivée, trier par badge
      return a.badgeNumber.localeCompare(b.badgeNumber);
    });
    
    return NextResponse.json(attendanceRecords);
  } catch (error) {
    console.error('Erreur lors de la récupération des données de présence:', error);
    return NextResponse.json(
      { error: 'Une erreur est survenue lors de la récupération des données' },
      { status: 500 }
    );
  }
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
        date: dateStr,
        badgeNumber: employee.badgeNumber,
        firstName: employee.firstName,
        lastName: employee.lastName,
        arrivalTime,
        departureTime,
        arrivalReader: 'Porte principale',
        departureReader: 'Porte principale',
        totalHours,
        isHoliday: false,
        isContinuousDay: false,
        isWeekend,
        isHalfDay: false,
        halfDayType: null,
        holidayName: undefined,
        notes: 'Données générées automatiquement',
        reader: 'Porte principale',
        pauseMinutes: 0,
        lunchMinutes: 0,
        events: [
          {
            badgeNumber: employee.badgeNumber,
            date: dateStr,
            time: arrivalTime,
            eventType: 'entry',
            rawEventType: null,
            readerName: 'Porte principale'
          },
          {
            badgeNumber: employee.badgeNumber,
            date: dateStr,
            time: departureTime,
            eventType: 'exit',
            rawEventType: null,
            readerName: 'Porte principale'
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
    return a.lastName!.localeCompare(b.lastName!);
  });
  
  return testData;
} 