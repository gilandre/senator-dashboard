import { prisma } from '@/lib/prisma';
import { SecurityIncidentService } from './incidentService';

/**
 * Type d'événements d'authentification
 */
type AuthEventType = 
  | 'login_attempt'
  | 'login_success'
  | 'login_failure'
  | 'logout'
  | 'session_expired'
  | 'password_change_attempt'
  | 'password_change_success'
  | 'password_change_failure'
  | 'first_login'
  | 'expired_password';

/**
 * Journalisation des événements d'authentification pour faciliter le débogage
 */
export class AuthLogger {
  /**
   * Enregistre un événement d'authentification
   */
  static async logAuthEvent(
    type: AuthEventType,
    email: string,
    ipAddress: string,
    userId?: string | null,
    details?: string,
    errorDetails?: any
  ) {
    try {
      // Journalisation en console pour un débogage immédiat
      const timestamp = new Date().toISOString();
      console.log(`[AUTH] ${timestamp} - ${type} - Email: ${email} - IP: ${ipAddress}${details ? ' - ' + details : ''}`);
      
      if (errorDetails) {
        console.error(`[AUTH ERROR] ${timestamp} - ${type} - Email: ${email}:`, errorDetails);
      }
      
      // Enregistrer dans la base de données pour un suivi permanent
      await prisma.$executeRaw`
        INSERT INTO auth_log (event_type, email, ip_address, user_id, details, error_details, timestamp)
        VALUES (
          ${type},
          ${email},
          ${ipAddress},
          ${userId ? parseInt(userId) : null},
          ${details || null},
          ${errorDetails ? JSON.stringify(errorDetails) : null},
          NOW()
        )
      `;

      // Si c'est un échec d'authentification, enregistrer également comme incident de sécurité
      if (type === 'login_failure') {
        await SecurityIncidentService.logFailedLogin(
          email,
          ipAddress,
          details || 'Échec d\'authentification', 
          userId || undefined
        );
      }
    } catch (error) {
      // En cas d'échec de journalisation, au moins enregistrer dans la console
      console.error('Erreur lors de la journalisation d\'authentification:', error);
    }
  }

  /**
   * Récupère l'historique des tentatives d'authentification pour un utilisateur
   */
  static async getAuthHistoryForUser(
    userId: string | number,
    limit: number = 20
  ) {
    const userIdNumber = typeof userId === 'string' ? parseInt(userId) : userId;
    
    try {
      return await prisma.$queryRaw`
        SELECT * FROM auth_log
        WHERE user_id = ${userIdNumber}
        ORDER BY timestamp DESC
        LIMIT ${limit}
      `;
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'historique d\'authentification:', error);
      return [];
    }
  }

  /**
   * Récupère les événements d'authentification récents (tous utilisateurs)
   */
  static async getRecentAuthEvents(
    limit: number = 50,
    eventType?: AuthEventType
  ) {
    try {
      if (eventType) {
        return await prisma.$queryRaw`
          SELECT * FROM auth_log
          WHERE event_type = ${eventType}
          ORDER BY timestamp DESC
          LIMIT ${limit}
        `;
      } else {
        return await prisma.$queryRaw`
          SELECT * FROM auth_log
          ORDER BY timestamp DESC
          LIMIT ${limit}
        `;
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des événements d\'authentification:', error);
      return [];
    }
  }
  
  /**
   * Récupère la date de dernière connexion réussie d'un utilisateur
   * @param userId Identifiant de l'utilisateur
   * @returns Date de dernière connexion ou null si aucune connexion trouvée
   */
  static async getLastLoginDate(userId: string | number): Promise<Date | null> {
    try {
      const userIdNumber = typeof userId === 'string' ? parseInt(userId) : userId;
      
      const result = await prisma.$queryRaw`
        SELECT timestamp 
        FROM auth_log 
        WHERE user_id = ${userIdNumber} 
        AND event_type = 'login_success' 
        ORDER BY timestamp DESC 
        LIMIT 1
      `;
      
      // Vérifier si nous avons un résultat
      if (Array.isArray(result) && result.length > 0 && result[0].timestamp) {
        return new Date(result[0].timestamp);
      }
      
      return null;
    } catch (error) {
      console.error('Erreur lors de la récupération de la dernière connexion:', error);
      return null;
    }
  }
} 