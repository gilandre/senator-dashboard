import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";

// Interface pour la structure des activités
interface ActivityItemResponse {
  id: string;
  type: 'access' | 'anomaly';
  personName: string;
  personType: 'employee' | 'visitor' | 'unknown';
  location: string;
  timestamp: string;
  status: string;
  event_type?: string;
  direction?: string;
  badge_number?: string;
  group_name?: string;
}

// Récupérer les activités récentes depuis la base de données
async function fetchRecentActivities(limit: number, startDate?: string, endDate?: string): Promise<ActivityItemResponse[]> {
  try {
    console.log(`Fetching recent activities: limit=${limit}, startDate=${startDate || 'none'}, endDate=${endDate || 'none'}`);
    
    // Vérifier la connexion à la base de données
    await prisma.$queryRaw`SELECT 1`;

    // Récupérer les logs d'accès récents
    const accessLogs = await prisma.access_logs.findMany({
      where: {},
      orderBy: {
        created_at: 'desc'
      },
      take: limit
    });
    
    console.log(`Retrieved ${accessLogs.length} recent access logs from database`);
    
    // Transformer les données pour correspondre à notre interface
    const activities: ActivityItemResponse[] = accessLogs.map(log => {
      // Déterminer le type de personne
      let personType: 'employee' | 'visitor' | 'unknown' = 'unknown';
      if (log.person_type === 'employee') {
        personType = 'employee';
      } else if (log.person_type === 'visitor') {
        personType = 'visitor';
      }
      
      // Déterminer le statut
      let status = 'valid';
      if (log.event_type === 'unknown') {
        status = 'refused';
      }
      
      // Déterminer le type d'activité
      const type = status === 'refused' ? 'anomaly' : 'access';
      
      // Créer un timestamp valide
      const timestamp = log.event_date 
        ? new Date(log.event_date).toISOString()
        : new Date().toISOString();
      
      return {
        id: String(log.id),
        type,
        personName: log.full_name || `Badge ${log.badge_number}`,
        personType,
        location: log.reader || 'Emplacement inconnu',
        timestamp,
        status,
        event_type: log.event_type || undefined,
        direction: log.direction || undefined,
        badge_number: log.badge_number || undefined,
        group_name: log.group_name || undefined
      };
    });
    
    return activities;
  } catch (error) {
    console.error("Erreur lors de la récupération des activités récentes:", error);
    // En cas d'erreur, renvoyer une liste vide
    return [];
  }
}

export async function GET(req: NextRequest) {
  try {
    // Bypass d'authentification pour les tests en développement
    const bypassAuth = process.env.NODE_ENV === 'development' && 
                       req.headers.get('x-test-bypass-auth') === 'admin';
    
    if (!bypassAuth) {
      const session = await getServerSession(authOptions);
      
      if (!session) {
        return NextResponse.json(
          { error: 'Non autorisé' },
          { status: 401 }
        );
      }
    }
    
    // Récupérer les paramètres depuis l'URL
    const url = new URL(req.url);
    const limitParam = url.searchParams.get('limit');
    const startDate = url.searchParams.get('startDate') || undefined;
    const endDate = url.searchParams.get('endDate') || undefined;
    
    // Convertir limit en nombre (par défaut 10)
    const limit = limitParam ? parseInt(limitParam, 10) : 10;
    
    // Simuler un délai réseau (uniquement en développement)
    if (process.env.NODE_ENV === 'development') {
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    // Récupérer les activités récentes
    const activities = await fetchRecentActivities(limit, startDate, endDate);
    
    return NextResponse.json(activities);
  } catch (error) {
    console.error('Error fetching recent activities:', error);
    return NextResponse.json(
      { error: 'Failed to fetch recent activities' },
      { status: 500 }
    );
  }
} 