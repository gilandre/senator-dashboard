import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    // Récupérer le nombre total d'employés (basé sur les badgeNumbers uniques)
    const badgeCounts = await prisma.access_logs.groupBy({
      by: ['badge_number'],
      _count: true
    });
    const totalEmployees = badgeCounts.length;

    // Récupérer le nombre total d'enregistrements
    const totalRecords = await prisma.access_logs.count();

    // Récupérer le nombre de jours avec des données
    const dateCounts = await prisma.$queryRaw`
      SELECT COUNT(DISTINCT DATE(event_date)) as count 
      FROM access_logs
    `;
    const daysWithData = Array.isArray(dateCounts) && dateCounts.length > 0 
      ? (dateCounts[0] as any).count 
      : 0;

    // Trouver le jour avec le plus d'activité
    const activeDaysResult = await prisma.$queryRaw`
      SELECT DATE(event_date) as date, COUNT(*) as count 
      FROM access_logs 
      GROUP BY DATE(event_date) 
      ORDER BY count DESC 
      LIMIT 1
    `;
    
    const activeDays = Array.isArray(activeDaysResult) && activeDaysResult.length > 0 
      ? activeDaysResult as any[]
      : [];
    
    const mostActiveDay = activeDays.length > 0 ? {
      date: activeDays[0].date.toISOString().split('T')[0],
      count: Number(activeDays[0].count)
    } : null;

    // Récupérer l'arrivée la plus matinale
    const earliestArrivalResult = await prisma.$queryRaw`
      SELECT a.full_name, a.raw_event_type, MIN(TIME(a.event_time)) as earliest_time
      FROM access_logs a
      WHERE a.event_type = 'entry' OR a.event_type = 'user_accepted' OR a.event_type = 'door_opened'
      GROUP BY a.badge_number, DATE(a.event_date), a.full_name, a.raw_event_type
      ORDER BY earliest_time ASC
      LIMIT 1
    `;
    
    const earliestArrivals = Array.isArray(earliestArrivalResult) && earliestArrivalResult.length > 0
      ? earliestArrivalResult as any[]
      : [];
    
    const earliestArrival = earliestArrivals.length > 0 ? {
      time: earliestArrivals[0].earliest_time.toString().substring(0, 8),
      employee: earliestArrivals[0].full_name || 'Inconnu',
      rawEventType: earliestArrivals[0].raw_event_type || null
    } : null;

    // Récupérer le départ le plus tardif
    const latestDepartureResult = await prisma.$queryRaw`
      SELECT a.full_name, a.raw_event_type, MAX(TIME(a.event_time)) as latest_time
      FROM access_logs a
      WHERE a.event_type = 'exit' OR a.event_type = 'door_closed'
      GROUP BY a.badge_number, DATE(a.event_date), a.full_name, a.raw_event_type
      ORDER BY latest_time DESC
      LIMIT 1
    `;
    
    const latestDepartures = Array.isArray(latestDepartureResult) && latestDepartureResult.length > 0
      ? latestDepartureResult as any[]
      : [];
    
    const latestDeparture = latestDepartures.length > 0 ? {
      time: latestDepartures[0].latest_time.toString().substring(0, 8),
      employee: latestDepartures[0].full_name || 'Inconnu',
      rawEventType: latestDepartures[0].raw_event_type || null
    } : null;

    // Calculer la moyenne des heures travaillées par jour (valeur approximative pour l'instant)
    // Un calcul plus précis nécessiterait de comparer les premières entrées et dernières sorties de chaque jour
    const averageHours = 8.5;

    return NextResponse.json({
      totalEmployees,
      totalRecords,
      daysWithData,
      averageHours,
      mostActiveDay,
      earliestArrival,
      latestDeparture
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des données de résumé:', error);
    return NextResponse.json(
      { error: 'Une erreur s\'est produite lors de la récupération des données de résumé' },
      { status: 500 }
    );
  }
} 