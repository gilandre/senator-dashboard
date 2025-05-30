import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Fonction pour récupérer les statistiques depuis la base de données
async function fetchDashboardStatistics() {
  try {
    // Obtenir le nombre total d'enregistrements d'accès
    const totalRecords = await prisma.access_logs.count();
    
    // Obtenir le nombre d'employés actifs
    const employees = await prisma.employees.count({
      where: { status: 'active' }
    });
    
    // Obtenir le nombre de visiteurs actuels
    const visitors = await prisma.visitors.count({
      where: { 
        status: 'active'
      }
    });
    
    // Obtenir le nombre total d'anomalies liées aux badges
    const anomalies = await prisma.anomalies.count({
      where: {
        severity: { 
          in: ['medium', 'high'] 
        },
        status: {
          in: ['new', 'investigating']
        }
      }
    });
    
    // Obtenir le nombre d'anomalies récentes (dernière semaine)
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    const recentAnomalies = await prisma.anomalies.count({
      where: {
        severity: { 
          in: ['medium', 'high'] 
        },
        status: {
          in: ['new', 'investigating']
        },
        detected_at: {
          gte: oneWeekAgo
        }
      }
    });
    
    return {
      totalRecords,
      employees,
      visitors,
      anomalies,
      recentAnomalies
    };
  } catch (error) {
    console.error("Erreur lors de la récupération des statistiques depuis la base de données:", error);
    // En cas d'erreur, renvoyer des données par défaut
    return {
      totalRecords: 0,
      employees: 0,
      visitors: 0,
      anomalies: 0,
      recentAnomalies: 0
    };
  }
}

/**
 * GET /api/statistics
 * Récupérer les statistiques générales
 */
export async function GET(req: NextRequest) {
  try {
    // Bypass d'authentification pour les tests en développement
    const bypassAuth = process.env.NODE_ENV === 'development' && 
                      req.headers.get('x-test-bypass-auth') === 'admin';
    
    if (!bypassAuth) {
      const session = await getServerSession(authOptions);
      
      if (!session) {
        return NextResponse.json(
          { error: "Non autorisé" },
          { status: 401 }
        );
      }
    }
    
    // Récupérer les statistiques depuis la base de données
    const statistics = await fetchDashboardStatistics();
    
    return NextResponse.json(statistics);
  } catch (error) {
    console.error("[API] Error fetching dashboard statistics", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des statistiques" },
      { status: 500 }
    );
  }
} 