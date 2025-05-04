import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import Employee from '@/models/Employee';
import Visitor from '@/models/Visitor';
import AccessRecord from '@/models/AccessRecord';
import Anomaly from '@/models/Anomaly';

/**
 * GET /api/statistics
 * Récupérer les statistiques générales
 */
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
    
    // Récupérer le nombre total d'employés
    const employeesCount = await Employee.countDocuments({});
    
    // Récupérer le nombre total de visiteurs
    const visitorsCount = await Visitor.countDocuments({});
    
    // Récupérer le nombre total d'enregistrements d'accès
    const accessRecordsCount = await AccessRecord.countDocuments({});
    
    // Récupérer le nombre total d'anomalies
    const anomaliesCount = await Anomaly.countDocuments({});
    
    // Calculer le nombre d'anomalies récentes (7 derniers jours)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const recentAnomaliesCount = await Anomaly.countDocuments({
      createdAt: { $gte: sevenDaysAgo }
    });
    
    // Retourner les statistiques
    return NextResponse.json({
      totalRecords: accessRecordsCount,
      employees: employeesCount,
      visitors: visitorsCount,
      anomalies: anomaliesCount,
      recentAnomalies: recentAnomaliesCount
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des statistiques' },
      { status: 500 }
    );
  }
} 