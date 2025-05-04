import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import AccessLog from '@/models/AccessLog';
import { connectToDatabase } from '@/lib/mongodb';

export async function GET() {
  try {
    await connectToDatabase();

    // Récupérer le nombre total d'employés (basé sur les badgeNumbers uniques)
    const badgeCounts = await AccessLog.aggregate([
      { $group: { _id: "$badgeNumber" } },
      { $count: "count" }
    ]);
    const totalEmployees = badgeCounts.length > 0 ? badgeCounts[0].count : 0;

    // Récupérer le nombre total d'enregistrements
    const totalRecords = await AccessLog.countDocuments();

    // Récupérer le nombre de jours avec des données
    const dateCounts = await AccessLog.aggregate([
      {
        $project: {
          dateString: { $dateToString: { format: "%Y-%m-%d", date: "$eventDate" } }
        }
      },
      { $group: { _id: "$dateString" } },
      { $count: "count" }
    ]);
    const daysWithData = dateCounts.length > 0 ? dateCounts[0].count : 0;

    // Trouver le jour avec le plus d'activité
    const activeDays = await AccessLog.aggregate([
      {
        $project: {
          dateString: { $dateToString: { format: "%Y-%m-%d", date: "$eventDate" } }
        }
      },
      { $group: { _id: "$dateString", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 1 }
    ]);
    const mostActiveDay = activeDays.length > 0 ? {
      date: activeDays[0]._id,
      count: activeDays[0].count
    } : null;

    // Calculer l'heure d'arrivée moyenne (première entrée de la journée)
    const earliestArrivals = await AccessLog.aggregate([
      {
        $match: {
          eventType: { $regex: /accepté|accepted/i }
        }
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: "%Y-%m-%d", date: "$eventDate" } },
            badgeNumber: "$badgeNumber"
          },
          firstName: { $first: "$firstName" },
          lastName: { $first: "$lastName" },
          eventTime: { $min: "$eventTime" }
        }
      },
      { $sort: { eventTime: 1 } },
      { $limit: 1 }
    ]);

    const earliestArrival = earliestArrivals.length > 0 ? {
      time: earliestArrivals[0].eventTime,
      employee: `${earliestArrivals[0].firstName} ${earliestArrivals[0].lastName}`
    } : null;

    // Calculer l'heure de départ moyenne (dernière sortie de la journée)
    const latestDepartures = await AccessLog.aggregate([
      {
        $match: {
          eventType: { $regex: /accepté|accepted/i }
        }
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: "%Y-%m-%d", date: "$eventDate" } },
            badgeNumber: "$badgeNumber"
          },
          firstName: { $first: "$firstName" },
          lastName: { $first: "$lastName" },
          eventTime: { $max: "$eventTime" }
        }
      },
      { $sort: { eventTime: -1 } },
      { $limit: 1 }
    ]);

    const latestDeparture = latestDepartures.length > 0 ? {
      time: latestDepartures[0].eventTime,
      employee: `${latestDepartures[0].firstName} ${latestDepartures[0].lastName}`
    } : null;

    // Calculer la moyenne des heures travaillées par jour
    const averageHours = 8.5; // Valeur par défaut, à remplacer par un calcul réel si disponible

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
    
    if (error instanceof mongoose.Error || error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { error: 'Une erreur s\'est produite lors de la récupération des données de résumé' },
      { status: 500 }
    );
  }
} 