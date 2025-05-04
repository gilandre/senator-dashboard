import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import AccessLog from '@/models/AccessLog';
import Holiday from '@/models/Holiday';
import { connectToDatabase } from '@/lib/mongodb';

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
    // Créer des objets Date pour le début et la fin de la journée
    const startOfDay = new Date(requestDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(requestDate);
    endOfDay.setHours(23, 59, 59, 999);
    
    // Connecter à la base de données
    await connectToDatabase();
    
    // Vérifier si c'est un jour férié
    const holiday = await Holiday.findOne({
      date: {
        $gte: startOfDay,
        $lte: endOfDay
      }
    }).lean() as IHoliday | null;
    
    // Vérifier si c'est un week-end
    const isWeekend = requestDate.getDay() === 0 || requestDate.getDay() === 6; // 0 = dimanche, 6 = samedi
    
    // Récupérer tous les événements d'accès pour l'employé à la date spécifiée
    const accessLogs = await AccessLog.find({
      badgeNumber: badgeNumber,
      eventDate: {
        $gte: startOfDay,
        $lte: endOfDay
      }
    }).sort({ eventTime: 1 }).lean();
    
    // Si aucun log n'est trouvé, renvoyer une réponse vide
    if (!accessLogs || accessLogs.length === 0) {
      return NextResponse.json({ error: 'Aucune donnée trouvée pour cet employé à cette date' }, { status: 404 });
    }
    
    // Extraire les informations de l'employé du premier log
    const employeeInfo = {
      badgeNumber: accessLogs[0].badgeNumber,
      firstName: accessLogs[0].firstName || '',
      lastName: accessLogs[0].lastName || '',
    };
    
    // Formater les événements
    const events = accessLogs.map(log => ({
      time: log.eventTime,
      type: log.eventType,
      reader: log.reader
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
      
      // Calculer la différence en heures
      totalHours = (departureHour - arrivalHour) + (departureMinute - arrivalMinute) / 60;
      
      // S'assurer que la valeur est positive (cas où l'employé part le lendemain)
      if (totalHours < 0) {
        totalHours += 24;
      }
    }
    
    // Construire la réponse
    const response = {
      ...employeeInfo,
      date: date,
      events: events,
      isHoliday: !!holiday,
      isContinuousDay: !!holiday && holiday?.type === 'continuous',
      isWeekend: isWeekend,
      holidayName: holiday ? holiday.name : undefined,
      totalHours: totalHours
    };
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('Erreur lors de la récupération des détails de présence:', error);
    
    // Si la connexion à la base de données a échoué
    if (error instanceof mongoose.Error || error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { error: 'Une erreur s\'est produite lors de la récupération des détails' },
      { status: 500 }
    );
  }
} 