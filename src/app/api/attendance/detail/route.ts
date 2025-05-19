import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { access_logs as AccessLog, holidays as Holiday } from '@prisma/client';

// Interface pour définir le type de l'objet Holiday
interface IHoliday {
  _id: any;
  name: string;
  date: Date;
  type: string;
  [key: string]: any;
}

export async function GET(request: Request) {
  try {
    // Récupérer les paramètres de requête
    const { searchParams } = new URL(request.url);
    const badgeNumber = searchParams.get('badgeNumber');
    const date = searchParams.get('date');
    
    // Valider les paramètres
    if (!badgeNumber || !date) {
      return NextResponse.json(
        { error: 'Les paramètres badgeNumber et date sont requis' },
        { status: 400 }
      );
    }

    // Convertir la date en objets Date
    const requestDate = new Date(date);
    if (isNaN(requestDate.getTime())) {
      return NextResponse.json(
        { error: 'Format de date invalide' },
        { status: 400 }
      );
    }

    // Créer des objets Date pour le début et la fin de la journée
    const startOfDay = new Date(requestDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(requestDate);
    endOfDay.setHours(23, 59, 59, 999);
    
    // Vérifier si c'est un jour férié
    const holiday = await prisma.holidays.findFirst({
      where: {
        date: {
          gte: startOfDay,
          lte: endOfDay
        }
      }
    }).catch(error => {
      console.error('Erreur lors de la récupération du jour férié:', error);
      return null;
    });
    
    // Vérifier si c'est un week-end
    const isWeekend = requestDate.getDay() === 0 || requestDate.getDay() === 6;
    
    // Vérifier si l'employé existe
    const employee = await prisma.employees.findUnique({
      where: { badge_number: badgeNumber }
    }).catch(error => {
      console.error('Erreur lors de la vérification de l\'employé:', error);
      return null;
    });

    if (!employee) {
      return NextResponse.json(
        { error: 'Employé non trouvé' },
        { status: 404 }
      );
    }
    
    // Récupérer tous les événements d'accès pour l'employé à la date spécifiée
    const accessLogs = await prisma.access_logs.findMany({
      where: {
        badge_number: badgeNumber,
        event_date: {
          gte: startOfDay,
          lte: endOfDay
        }
      },
      orderBy: {
        event_time: 'asc'
      }
    }).catch(error => {
      console.error('Erreur lors de la récupération des logs d\'accès:', error);
      return [];
    });
    
    // Si aucun log n'est trouvé, renvoyer une réponse avec les informations de base
    if (!accessLogs || accessLogs.length === 0) {
      return NextResponse.json({
        badgeNumber: employee.badge_number,
        firstName: employee.first_name,
        lastName: employee.last_name,
        date: date,
        events: [],
        isHoliday: !!holiday,
        isWeekend: isWeekend,
        holidayName: holiday ? holiday.name : undefined,
        totalHours: 0
      });
    }
    
    // Extraire les informations de l'employé du premier log
    const employeeInfo = {
      badgeNumber: accessLogs[0].badge_number,
      firstName: accessLogs[0].full_name ? accessLogs[0].full_name.split(' ')[0] : '',
      lastName: accessLogs[0].full_name ? accessLogs[0].full_name.split(' ').slice(1).join(' ') : '',
    };
    
    // Formater les événements
    const events = accessLogs.map(log => ({
      time: log.event_time.toTimeString().split(' ')[0].substring(0, 8),
      type: log.event_type,
      reader: log.reader || 'Inconnu'
    }));
    
    // Déterminer l'heure d'arrivée (premier événement de la journée)
    const arrivalTime = events.length > 0 ? events[0].time : null;
    
    // Déterminer l'heure de départ (dernier événement de la journée)
    const departureTime = events.length > 0 ? events[events.length - 1].time : null;
    
    // Calculer le nombre d'heures travaillées si les deux horodatages sont disponibles
    let totalHours: number | null = null;
    if (arrivalTime && departureTime) {
      const [arrivalHour, arrivalMinute] = arrivalTime.split(':').map(Number);
      const [departureHour, departureMinute] = departureTime.split(':').map(Number);
      
      // Calculer la différence en minutes puis en heures pour plus de précision
      const arrivalMinutes = arrivalHour * 60 + arrivalMinute;
      const departureMinutes = departureHour * 60 + departureMinute;
      let durationMinutes = departureMinutes - arrivalMinutes;
      
      // S'assurer que la valeur est positive (cas où l'employé part le lendemain)
      if (durationMinutes < 0) {
        durationMinutes += 24 * 60; // Ajouter 24h en minutes
      }
      
      // Déduire 1h pour la pause déjeuner si la durée est supérieure à 5h
      if (durationMinutes > 5 * 60) {
        durationMinutes -= 60; // Déduire 60 minutes pour la pause
      }
      
      // Convertir en heures avec 2 décimales
      totalHours = Math.round((durationMinutes / 60) * 100) / 100;
    }
    
    // Construire la réponse
    const response = {
      ...employeeInfo,
      date: date,
      events: events,
      isHoliday: !!holiday,
      isContinuousDay: false, // Cette information n'est plus stockée dans le même format
      isWeekend: isWeekend,
      holidayName: holiday ? holiday.name : undefined,
      totalHours: totalHours
    };
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('Erreur lors de la récupération des détails de présence:', error);
    
    return NextResponse.json(
      { error: 'Une erreur s\'est produite lors de la récupération des détails' },
      { status: 500 }
    );
  }
} 