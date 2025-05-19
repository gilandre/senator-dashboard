import prisma from './prisma';

/**
 * Interface pour les données d'activité utilisateur
 */
interface ActivityData {
  userId?: number;
  action: string;
  details: string;
  ipAddress: string;
  targetId?: number;
  targetType?: string;
}

/**
 * Enregistre une activité utilisateur dans la base de données
 */
export async function logActivity(data: ActivityData) {
  try {
    await prisma.user_activities.create({
      data: {
        user_id: data.userId,
        action: data.action,
        details: data.details,
        ip_address: data.ipAddress,
        timestamp: new Date()
      }
    });
    
    return true;
  } catch (error) {
    console.error('Erreur lors de l\'enregistrement de l\'activité:', error);
    return false;
  }
} 