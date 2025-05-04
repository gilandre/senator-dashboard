import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import AccessLog from '@/models/AccessLog';
import Holiday from '@/models/Holiday';
import AttendanceConfig, { IAttendanceConfig } from '@/models/AttendanceConfig';
import { connectToDatabase } from '@/lib/mongodb';

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
    // Récupérer les paramètres de requête
    const { searchParams } = new URL(request.url);
    const start = searchParams.get('start');
    const end = searchParams.get('end');
    
    // Valider les paramètres
    if (!start || !end) {
      return NextResponse.json(
        { error: 'Les paramètres start et end sont requis' },
        { status: 400 }
      );
    }

    // Convertir les chaînes en objets Date
    const startDate = new Date(start);
    const endDate = new Date(end);
    
    // Connecter à la base de données
    await connectToDatabase();
    
    // Récupérer les journées fériées dans la plage de dates
    const holidays = await Holiday.find({
      date: { $gte: startDate, $lte: endDate }
    }).lean();
    
    // Récupérer la configuration de l'assiduité
    let defaultConfig = {
      startHour: '08:00',
      endHour: '17:00',
      dailyHours: 8,
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
      const configDoc = await AttendanceConfig.findOne().lean();
      if (configDoc) {
        // Si un document de configuration existe, l'utiliser
        defaultConfig = {
          ...defaultConfig,
          ...configDoc
        }
      }
    } catch (error) {
      console.error('Erreur lors de la récupération de la configuration:', error);
    }
    
    const config = defaultConfig;
    
    // Mapper les journées fériées par date pour une recherche plus facile
    const holidayMap = new Map();
    holidays.forEach(holiday => {
      const dateStr = holiday.date.toISOString().split('T')[0];
      holidayMap.set(dateStr, holiday);
    });
    
    // Récupérer tous les événements d'accès dans la plage de dates
    const accessLogs = await AccessLog.find({
      eventDate: { $gte: startDate, $lte: endDate }
    }).sort({ eventDate: 1, eventTime: 1 }).lean();
    
    // Organiser les événements par badge et par date
    const employeeAccessMap = new Map();
    
    accessLogs.forEach(log => {
      const dateStr = log.eventDate.toISOString().split('T')[0];
      const key = `${log.badgeNumber}_${dateStr}`;
      
      if (!employeeAccessMap.has(key)) {
        employeeAccessMap.set(key, {
          date: dateStr,
          badgeNumber: log.badgeNumber,
          firstName: log.firstName,
          lastName: log.lastName,
          events: []
        });
      }
      
      employeeAccessMap.get(key).events.push({
        time: log.eventTime,
        type: log.eventType,
        reader: log.reader
      });
    });
    
    // Calculer les heures d'arrivée et de départ pour chaque employé et chaque jour
    const attendanceRecords: Array<{
      date: string;
      badgeNumber: string;
      firstName: string | null;
      lastName: string | null;
      arrivalTime: string | null;
      departureTime: string | null;
      totalHours: number | null;
      isHoliday: boolean;
      isContinuousDay: boolean;
      isWeekend: boolean;
      holidayName: string | undefined;
      notes: string | null;
      reader: string;
      events: Array<{
        badgeNumber: string;
        date: string;
        time: string;
        eventType: string;
      }>;
    }> = [];
    
    // Utiliser Array.from pour convertir en tableau d'entrées avant d'itérer
    for (const [_, record] of Array.from(employeeAccessMap.entries())) {
      // Trier les événements par heure
      record.events.sort((a: { time: string }, b: { time: string }) => a.time.localeCompare(b.time));
      
      // Déterminer l'heure d'arrivée (premier événement de la journée)
      let arrivalTime = record.events.length > 0 ? record.events[0].time : null;
      
      // Déterminer l'heure de départ (dernier événement de la journée)
      let departureTime = record.events.length > 0 ? record.events[record.events.length - 1].time : null;
      
      // Appliquer les règles d'arrondi si configurées
      if (config.roundAttendanceTime && arrivalTime && departureTime) {
        // Arrondir l'heure d'arrivée et de départ selon les paramètres configurés
        arrivalTime = roundTime(
          arrivalTime, 
          config.roundingInterval, 
          config.roundingDirection as 'up' | 'down' | 'nearest'
        );
        
        departureTime = roundTime(
          departureTime, 
          config.roundingInterval, 
          config.roundingDirection as 'up' | 'down' | 'nearest'
        );
      }
      
      // Récupérer le lecteur de la première entrée
      const firstEntryReader = record.events.length > 0 ? record.events[0].reader : null;
      
      // Récupérer le lecteur de la dernière sortie
      const lastExitReader = record.events.length > 0 ? record.events[record.events.length - 1].reader : null;
      
      // Formatage des lecteurs à afficher
      let readerDisplay = '';
      if (firstEntryReader && lastExitReader) {
        if (firstEntryReader === lastExitReader) {
          readerDisplay = firstEntryReader;
        } else {
          readerDisplay = `Entrée: ${firstEntryReader || '-'}, Sortie: ${lastExitReader || '-'}`;
        }
      } else if (firstEntryReader) {
        readerDisplay = `Entrée: ${firstEntryReader}`;
      } else if (lastExitReader) {
        readerDisplay = `Sortie: ${lastExitReader}`;
      }
      
      // Calculer le nombre d'heures travaillées si les deux horodatages sont disponibles
      let totalHours: number | null = null;
      if (arrivalTime && departureTime) {
        const [arrivalHour, arrivalMinute] = arrivalTime.split(':').map(Number);
        const [departureHour, departureMinute] = departureTime.split(':').map(Number);
        
        // Calculer la différence en heures
        totalHours = (departureHour - arrivalHour) + (departureMinute - arrivalMinute) / 60;
        
        // S'assurer que la valeur est positive (cas où l'employé part le lendemain)
        if (totalHours < 0) {
          totalHours += 24;
        }
        
        // Déduire la pause déjeuner si configurée et applicable
        if (config.lunchBreak && totalHours >= 5) {  // Déduire seulement si présent plus de 5 heures
          const lunchBreakHours = config.lunchBreakDuration / 60;
          totalHours = Math.max(0, totalHours - lunchBreakHours);
        }
      }
      
      // Vérifier si c'est un jour férié
      const holiday = holidayMap.get(record.date);
      const isHoliday = !!holiday;
      
      // Vérifier si c'est une journée continue
      const isContinuousDay = isHoliday && holiday?.type === 'continuous';
      
      // Vérifier si c'est un week-end
      const date = new Date(record.date);
      const isWeekend = date.getDay() === 0 || date.getDay() === 6; // 0 = dimanche, 6 = samedi
      
      // Process events for each person's daily record
      const allEvents = record.events.map((event: { time: string; type: string; reader: string }) => {
        return {
          badgeNumber: record.badgeNumber,
          date: record.date,
          time: event.time,
          eventType: event.type
        };
      });
      
      attendanceRecords.push({
        date: record.date,
        badgeNumber: record.badgeNumber,
        firstName: record.firstName,
        lastName: record.lastName,
        arrivalTime,
        departureTime,
        totalHours,
        isHoliday,
        isContinuousDay,
        isWeekend,
        holidayName: holiday?.name,
        notes: null,
        reader: readerDisplay,
        events: allEvents // Conserver tous les événements pour la page de détail
      });
    }
    
    // Trier les enregistrements par date puis par nom
    attendanceRecords.sort((a, b) => {
      // D'abord par date (plus récente en premier)
      const dateComparison = b.date.localeCompare(a.date);
      if (dateComparison !== 0) return dateComparison;
      
      // Ensuite par nom de famille
      return (a.lastName || '').localeCompare(b.lastName || '');
    });
    
    return NextResponse.json(attendanceRecords);
  } catch (error) {
    console.error('Erreur lors de la récupération des données d\'assiduité:', error);
    
    // Si la connexion à la base de données a échoué
    if (error instanceof mongoose.Error || error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { error: 'Une erreur s\'est produite lors de la récupération des données d\'assiduité' },
      { status: 500 }
    );
  }
} 