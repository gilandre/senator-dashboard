import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

/**
 * Interface pour les options d'enregistrement d'activité
 */
export interface LogActivityOptions {
  action: string;
  details?: string;
  userId?: number;
  ipAddress?: string;
}

/**
 * Enregistre une activité utilisateur dans la base de données
 * @param options Options pour l'enregistrement de l'activité
 * @returns L'activité créée
 */
export async function logActivity(options: LogActivityOptions) {
  try {
    // Si l'ID utilisateur n'est pas fourni, essayer de le récupérer depuis la session
    let userId = options.userId;
    
    if (!userId) {
      try {
        const session = await getServerSession(authOptions);
        if (session?.user?.id) {
          userId = parseInt(session.user.id as string, 10);
        }
      } catch (error) {
        console.error('Erreur lors de la récupération de la session:', error);
      }
    }
    
    // Créer l'enregistrement d'activité
    const activity = await prisma.user_activities.create({
      data: {
        action: options.action,
        details: options.details,
        user_id: userId || null,
        ip_address: options.ipAddress,
        timestamp: new Date()
      }
    });
    
    return activity;
  } catch (error) {
    console.error('Erreur lors de l\'enregistrement de l\'activité:', error);
    return null;
  }
}

/**
 * Récupère les activités récentes limitées par nombre
 * @param limit Nombre maximum d'activités à récupérer
 * @returns Liste des activités récentes
 */
export async function getRecentActivities(limit: number = 10) {
  try {
    const activities = await prisma.user_activities.findMany({
      take: limit,
      orderBy: {
        timestamp: 'desc'
      },
      include: {
        users: true
      }
    });
    
    return activities.map(activity => ({
      id: activity.id.toString(),
      action: activity.action,
      details: activity.details || '',
      timestamp: activity.timestamp,
      userName: activity.users?.name || 'Système'
    }));
  } catch (error) {
    console.error('Erreur lors de la récupération des activités récentes:', error);
    return [];
  }
}

// Create activity logger
interface ActivityLog {
  userId: string;
  action: string;
  metadata: Record<string, unknown>;
  timestamp: Date;
}

const logActivity = async (log: Omit<ActivityLog, 'timestamp'>) => {
  await prisma.activityLog.create({
    data: {
      ...log,
      timestamp: new Date()
    }
  });
};