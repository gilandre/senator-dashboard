import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import AccessRecord from '@/models/AccessRecord';
import Employee from '@/models/Employee';
import mongoose from 'mongoose';

/**
 * GET /api/readers/usage
 * Récupérer les statistiques d'utilisation des lecteurs par département
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
    
    // Récupérer les enregistrements d'accès avec les informations des employés
    const accessRecords = await AccessRecord.aggregate([
      // Uniquement les accès des employés
      { $match: { personType: 'Employee' } },
      // Jointure avec la collection des employés
      {
        $lookup: {
          from: 'employees',
          localField: 'personId',
          foreignField: '_id',
          as: 'employee'
        }
      },
      // Déstructurer le tableau 'employee'
      { $unwind: { path: '$employee', preserveNullAndEmptyArrays: true } },
      // Regrouper par lecteur et département
      {
        $group: {
          _id: {
            deviceId: '$deviceId',
            location: '$location',
            department: '$employee.department'
          },
          count: { $sum: 1 }
        }
      },
      // Filtrer les données sans département (au cas où)
      { $match: { '_id.department': { $exists: true, $ne: null } } },
      // Trier par nombre d'utilisations décroissant
      { $sort: { count: -1 } },
      // Restructurer les données
      {
        $project: {
          _id: 0,
          deviceId: '$_id.deviceId',
          location: '$_id.location',
          department: '$_id.department',
          count: 1
        }
      },
      // Limiter aux 20 combinaisons les plus utilisées
      { $limit: 20 }
    ]);
    
    // Grouper les résultats par département
    const departmentReaders = accessRecords.reduce((acc, record) => {
      if (!acc[record.department]) {
        acc[record.department] = [];
      }
      
      acc[record.department].push({
        deviceId: record.deviceId,
        location: record.location,
        count: record.count
      });
      
      return acc;
    }, {});
    
    // Transformer en format adapté pour le graphique
    const result = Object.keys(departmentReaders).map(department => ({
      department,
      readers: departmentReaders[department].map(r => ({
        deviceId: r.deviceId,
        location: r.location,
        count: r.count
      })),
      total: departmentReaders[department].reduce((sum, r) => sum + r.count, 0)
    }));
    
    // Trier par utilisation totale (département avec le plus d'utilisations en premier)
    result.sort((a, b) => b.total - a.total);
    
    return NextResponse.json(result);
    
  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques de lecteurs:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des statistiques de lecteurs' },
      { status: 500 }
    );
  }
} 