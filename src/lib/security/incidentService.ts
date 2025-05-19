// Service d'incidents de sécurité avec Prisma
import { prisma } from "../prisma";

// Type d'incidents de sécurité
type SecurityIncidentType = 
  | 'failed_login' 
  | 'successful_login'
  | 'password_change'
  | 'account_locked'
  | 'account_unlocked'
  | 'unauthorized_access'
  | 'security_setting_change'
  | 'admin_action'
  | 'system_error';

// Niveau de gravité des incidents - adapté aux valeurs acceptées par Prisma
type SecurityIncidentSeverity = 'info' | 'warning' | 'critical' | 'resolved';

// Mapping des valeurs de sévérité vers les valeurs enum Prisma
const severityToPrisma = {
  'info': 'info',
  'warning': 'warning',
  'critical': 'critical',
  'resolved': 'resolved'
};

/**
 * Service pour enregistrer et gérer les incidents de sécurité
 */
export class SecurityIncidentService {
  /**
   * Journalise un incident de sécurité
   */
  static async logIncident(
    type: SecurityIncidentType,
    description: string,
    ipAddress: string,
    severity: SecurityIncidentSeverity = 'info',
    userId?: string | null | number,
    userEmail?: string,
    additionalData?: any
  ) {
    try {
      console.log(`[SECURITY INCIDENT] ${type}: ${description} | IP: ${ipAddress} | Status: ${severity}${userId ? ' | User ID: ' + userId : ''}${userEmail ? ' | User: ' + userEmail : ''}`);
      
      // Préparer la description complète avec les données additionnelles si nécessaire
      const fullDescription = additionalData 
        ? `${description} | ${JSON.stringify(additionalData)}`
        : description;
      
      // Convertir la sévérité au format attendu par Prisma
      const prismaStatus = severityToPrisma[severity] || 'info';
      
      // Enregistrer l'incident dans la base de données
      await prisma.securityIncident.create({
        data: {
          type,
          description: fullDescription,
          ip_address: ipAddress,
          status: prismaStatus as any,
          user_id: userId ? (typeof userId === 'string' ? parseInt(userId) : userId) : null,
          occurred_at: new Date()
        }
      });
    } catch (error) {
      console.error('Erreur lors de la journalisation de l\'incident de sécurité:', error);
    }
  }

  /**
   * Journalise spécifiquement une tentative de connexion échouée
   */
  static async logFailedLogin(
    email: string,
    ipAddress: string,
    reason: string = 'Identifiants invalides',
    userId?: string | number
  ) {
    const description = `Échec de connexion pour ${email}: ${reason}`;
    await this.logIncident(
      'failed_login',
      description,
      ipAddress,
      'info',
      userId,
      email
    );
  }

  /**
   * Journalise un changement de mot de passe
   */
  static async logPasswordChange(
    userId: string | number,
    userEmail: string,
    ipAddress: string,
    adminAction: boolean = false
  ) {
    const description = adminAction
      ? `Mot de passe réinitialisé par un administrateur pour ${userEmail}`
      : `Changement de mot de passe pour ${userEmail}`;
    
    await this.logIncident(
      'password_change',
      description,
      ipAddress,
      'info',
      userId,
      userEmail
    );
  }

  /**
   * Récupère les incidents récents pour un utilisateur spécifique
   */
  static async getRecentIncidentsForUser(userId: string | number, limit: number = 10) {
    try {
      const userIdNumber = typeof userId === 'string' ? parseInt(userId) : userId;
      
      return await prisma.securityIncident.findMany({
        where: { user_id: userIdNumber },
        orderBy: { occurred_at: 'desc' },
        take: limit
      });
    } catch (error) {
      console.error('Erreur lors de la récupération des incidents:', error);
      return [];
    }
  }

  /**
   * Récupère les incidents récents pour tous les utilisateurs
   */
  static async getRecentIncidents(limit: number = 50, type?: SecurityIncidentType) {
    try {
      const where = type ? { type } : {};
      
      return await prisma.securityIncident.findMany({
        where,
        orderBy: { occurred_at: 'desc' },
        take: limit
      });
    } catch (error) {
      console.error('Erreur lors de la récupération des incidents:', error);
      return [];
    }
  }
} 