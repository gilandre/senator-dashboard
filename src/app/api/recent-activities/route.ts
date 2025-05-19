import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';

// Types pour les activités récentes
export interface RecentActivity {
  id: string;
  action: string;
  type: string;
  status: string;
  timestamp: string;
  details: string;
  userName?: string;
}

// Fonction pour récupérer les activités récentes depuis la base de données
async function fetchRecentActivities(limit: number = 10): Promise<RecentActivity[]> {
  try {
    // Récupérer les activités récentes depuis la base de données
    const activities = await prisma.$queryRaw`
      SELECT 
        CONCAT('act-', id) as id,
        action_type as action,
        event_type as type,
        status,
        created_at as timestamp,
        details,
        user_name as userName
      FROM activities
      ORDER BY created_at DESC
      LIMIT ${limit}
    `;

    return activities as RecentActivity[];
  } catch (error) {
    console.error('Error fetching recent activities:', error);
    throw error;
  }
}

// Fonction pour déterminer le type d'activité
function determineType(action: string): string {
  const actionLower = action.toLowerCase();
  
  if (actionLower.includes('import') || actionLower.includes('fichier')) {
    return 'import';
  } else if (actionLower.includes('export')) {
    return 'export';
  } else if (actionLower.includes('connexion') || actionLower.includes('login') || actionLower.includes('auth')) {
    return 'auth';
  } else if (actionLower.includes('config') || actionLower.includes('paramètre')) {
    return 'config';
  } else if (actionLower.includes('mise à jour') || actionLower.includes('modification') || actionLower.includes('edit')) {
    return 'data';
  } else {
    return 'system';
  }
}

// Fonction pour générer des activités récentes fictives
function generateMockActivities(limit: number = 10): RecentActivity[] {
  const actionTypes = [
    'Import de fichier CSV',
    'Export de données',
    'Modification de la configuration',
    'Connexion utilisateur',
    'Déconnexion utilisateur',
    'Mise à jour des données',
    'Création de compte',
    'Modification de profil',
    'Réinitialisation de mot de passe',
    'Suppression de données'
  ];
  
  const statusTypes = ['completed', 'failed', 'pending', 'in-progress'];
  const eventTypes = ['import', 'export', 'auth', 'config', 'data', 'user', 'system'];
  const userNames = ['Admin', 'Système', 'User1', 'User2', 'User3', 'Maintenance'];
  
  return Array.from({ length: limit }, (_, i) => {
    const action = actionTypes[Math.floor(Math.random() * actionTypes.length)];
    const type = eventTypes[Math.floor(Math.random() * eventTypes.length)];
    const status = statusTypes[Math.floor(Math.random() * statusTypes.length)];
    const userName = userNames[Math.floor(Math.random() * userNames.length)];
    
    // Timestamp dans les dernières 24 heures
    const timestamp = new Date(Date.now() - Math.floor(Math.random() * 24 * 60 * 60 * 1000)).toISOString();
    
    let details = '';
    if (action.includes('Import')) {
      details = `Importation de ${Math.floor(Math.random() * 1000) + 100} enregistrements`;
    } else if (action.includes('Export')) {
      details = `Exportation de ${Math.floor(Math.random() * 1000) + 100} enregistrements`;
    } else if (action.includes('Connexion')) {
      details = `IP: 192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
    }
    
    return {
      id: `act-${i}-${Date.now()}`,
      action,
      type,
      status,
      timestamp,
      details,
      userName
    };
  });
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
          { error: "Non autorisé" },
          { status: 401 }
        );
      }
    }
    
    // Récupérer le paramètre limit depuis l'URL
    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get('limit') || '10');
    
    // Récupérer les activités récentes depuis la base de données
    const activities = await fetchRecentActivities(limit);
    
    return NextResponse.json(activities);
  } catch (error) {
    console.error('Error fetching recent activities:', error);
    return NextResponse.json(
      { error: 'Failed to fetch recent activities' },
      { status: 500 }
    );
  }
} 