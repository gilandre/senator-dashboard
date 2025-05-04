import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import AccessRecord from '@/models/AccessRecord';
import { format, subDays } from 'date-fns';

export async function GET(req: NextRequest) {
  try {
    // Vérifier l'authentification
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { error: "Non autorisé" },
        { status: 401 }
      );
    }

    await connectToDatabase();
    
    // Récupérer les paramètres de requête (nombre de jours)
    const { searchParams } = new URL(req.url);
    const days = parseInt(searchParams.get('days') || '10');
    
    // Calculer la date de début (jours derniers jours)
    const endDate = new Date();
    const startDate = subDays(endDate, days);
    
    // Formater les dates pour l'agrégation
    const formattedStartDate = startDate.toISOString().split('T')[0];
    const formattedEndDate = endDate.toISOString().split('T')[0];
    
    // Pipeline d'agrégation MongoDB pour calculer les heures moyennes d'arrivée et de départ par jour
    const averageTimes = await AccessRecord.aggregate([
      // Filtrer par période
      {
        $match: {
          timestamp: { 
            $gte: new Date(formattedStartDate), 
            $lte: new Date(new Date(formattedEndDate).setHours(23, 59, 59, 999)) 
          },
          personType: "Employee"
        }
      },
      // Ajouter un champ pour la date formatée (sans l'heure)
      {
        $addFields: {
          date: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } },
          hour: { $hour: "$timestamp" },
          minute: { $minute: "$timestamp" }
        }
      },
      // Grouper par date et direction
      {
        $group: {
          _id: {
            date: "$date",
            direction: "$direction"
          },
          avgHour: { $avg: "$hour" },
          avgMinute: { $avg: "$minute" },
          count: { $sum: 1 }
        }
      },
      // Restructurer les données
      {
        $group: {
          _id: "$_id.date",
          directions: {
            $push: {
              direction: "$_id.direction",
              avgHour: "$avgHour",
              avgMinute: "$avgMinute",
              count: "$count"
            }
          }
        }
      },
      // Trier par date
      {
        $sort: { _id: 1 }
      }
    ]);
    
    // Formater les résultats
    const formattedResults = averageTimes.map(day => {
      const date = day._id;
      
      // Chercher les données d'entrée et de sortie
      const entryData = day.directions.find(d => d.direction === 'in');
      const exitData = day.directions.find(d => d.direction === 'out');
      
      // Calculer les heures moyennes au format HH:MM
      const avgEntryTime = entryData 
        ? `${Math.floor(entryData.avgHour).toString().padStart(2, '0')}:${Math.floor(entryData.avgMinute).toString().padStart(2, '0')}` 
        : null;
      
      const avgExitTime = exitData 
        ? `${Math.floor(exitData.avgHour).toString().padStart(2, '0')}:${Math.floor(exitData.avgMinute).toString().padStart(2, '0')}` 
        : null;
      
      // Créer l'objet de résultat
      return {
        date,
        avgEntryTime,
        avgExitTime,
        entryCount: entryData?.count || 0,
        exitCount: exitData?.count || 0
      };
    });
    
    return NextResponse.json(formattedResults);
    
  } catch (error) {
    console.error('Erreur lors de la récupération des heures moyennes:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des heures moyennes' },
      { status: 500 }
    );
  }
} 