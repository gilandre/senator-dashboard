import prisma from './prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from './auth';

export class AuthLogger {
  private static async getCurrentUser() {
    const session = await getServerSession(authOptions);
    return session?.user?.id || null;
  }

  static async logActivity(
    userId: string | number,
    method: string,
    resource: string,
    details: Record<string, any>
  ) {
    try {
      // Use user_activities table which exists in the schema
      await prisma.user_activities.create({
        data: {
          user_id: typeof userId === 'string' ? parseInt(userId) : userId,
          action: `${method}:${resource}`,
          details: JSON.stringify(details),
          timestamp: new Date(),
        },
      });
    } catch (error) {
      console.error('Erreur lors de la journalisation:', error);
      // Ne pas propager l'erreur pour ne pas perturber le flux principal
    }
  }

  static async logAccess(
    resource: string,
    method: string,
    status: number,
    details?: Record<string, any>
  ) {
    try {
      const user = await this.getCurrentUser();
      
      await prisma.accessLog.create({
        data: {
          userId: user,
          resource,
          method,
          status,
          details: details ? JSON.stringify(details) : null,
          timestamp: new Date(),
        },
      });
    } catch (error) {
      console.error('Erreur lors de la journalisation d\'accès:', error);
    }
  }

  static async logSecurityEvent(
    eventType: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    details: Record<string, any>
  ) {
    try {
      const user = await this.getCurrentUser();
      
      await prisma.securityLog.create({
        data: {
          eventType,
          severity,
          details: JSON.stringify(details),
          userId: user,
          timestamp: new Date(),
        },
      });
    } catch (error) {
      console.error('Erreur lors de la journalisation de sécurité:', error);
    }
  }

  static async getRecentLogs(
    type: 'audit' | 'access' | 'security',
    limit: number = 100,
    userId?: string
  ) {
    try {
      switch (type) {
        case 'audit':
          return await prisma.auditLog.findMany({
            where: userId ? { userId } : undefined,
            orderBy: { timestamp: 'desc' },
            take: limit,
          });
        case 'access':
          return await prisma.accessLog.findMany({
            where: userId ? { userId } : undefined,
            orderBy: { timestamp: 'desc' },
            take: limit,
          });
        case 'security':
          return await prisma.securityLog.findMany({
            where: userId ? { userId } : undefined,
            orderBy: { timestamp: 'desc' },
            take: limit,
          });
        default:
          throw new Error('Type de log non supporté');
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des logs:', error);
      throw error;
    }
  }

  // Ajouter cette méthode à la classe AuthLogger
  
  public static async logUserStatusChange(adminId: number, userId: number, newStatus: string): Promise<void> {
    try {
      const admin = await prisma.user.findUnique({
        where: { id: adminId },
        select: { name: true, email: true }
      });
  
      const targetUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { name: true, email: true }
      });
  
      if (!admin || !targetUser) return;
  
      await prisma.securityIncident.create({
        data: {
          type: 'user_status_change',
          severity: 'info',
          description: `L'utilisateur ${targetUser.name} (${targetUser.email}) a été ${newStatus === 'active' ? 'activé' : 'désactivé'} par ${admin.name} (${admin.email})`,
          user_id: adminId,
          target_user_id: userId,
          metadata: JSON.stringify({
            adminName: admin.name,
            adminEmail: admin.email,
            userName: targetUser.name,
            userEmail: targetUser.email,
            newStatus: newStatus
          })
        }
      });
    } catch (error) {
      console.error('Erreur lors de la journalisation du changement de statut:', error);
    }
  }
}