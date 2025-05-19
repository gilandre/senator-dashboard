import { prisma } from '@/lib/prisma';
import { SecurityIncidentService } from '@/lib/security/incidentService';

export class SecuritySettingsService {
  /**
   * Récupère les paramètres de sécurité actuels
   * Si aucun paramètre n'existe, crée une configuration par défaut
   */
  static async getSettings() {
    try {
      // Rechercher les paramètres existants
      const settings = await prisma.security_settings.findFirst({
        orderBy: { updated_at: 'desc' }
      });
      
      // Si aucun paramètre n'existe, créer une configuration par défaut
      if (!settings) {
        return await this.createDefaultSettings();
      }
      
      // Convertir la structure de la base de données en objet attendu
      return this.formatSettingsFromDb(settings);
    } catch (error) {
      console.error('Erreur lors de la récupération des paramètres de sécurité:', error);
      return this.getDefaultSettingsData(); // En cas d'erreur, retourner les valeurs par défaut
    }
  }

  /**
   * Format les paramètres depuis la base de données vers la structure attendue
   */
  private static formatSettingsFromDb(settings: any) {
    try {
      return {
        passwordPolicy: {
          minLength: settings.min_password_length || 8,
          requireUppercase: settings.require_uppercase || true,
          requireLowercase: true,
          requireNumbers: settings.require_numbers || true,
          requireSpecialChars: settings.require_special_chars || true,
          preventReuse: settings.password_history_count || 3,
          expiryDays: 90
        },
        accountPolicy: {
          maxLoginAttempts: settings.max_login_attempts || 5,
          lockoutDuration: settings.lock_duration_minutes || 30,
          forcePasswordChangeOnFirstLogin: true
        },
        sessionPolicy: {
          sessionTimeout: 30,
          inactivityTimeout: 15,
          singleSessionOnly: false,
        },
        networkPolicy: {
          ipRestrictionEnabled: false,
          allowedIPs: [],
          enforceHTTPS: true
        },
        auditPolicy: {
          logLogins: true,
          logModifications: true,
          logRetentionDays: 365,
          enableNotifications: true
        },
        twoFactorAuth: {
          enabled: settings.two_factor_auth_enabled || false,
          requiredForRoles: []
        },
        updatedAt: settings.updated_at,
        updatedBy: settings.updated_by
      };
    } catch (error) {
      console.error('Erreur lors du formatage des paramètres:', error);
      return this.getDefaultSettingsData();
    }
  }

  /**
   * Met à jour les paramètres de sécurité
   */
  static async updateSettings(updateData: any, userId?: number) {
    try {
      // Extraire les valeurs des objets
      const dataToSave = {
        min_password_length: updateData.passwordPolicy?.minLength || 8,
        require_uppercase: updateData.passwordPolicy?.requireUppercase || true,
        require_numbers: updateData.passwordPolicy?.requireNumbers || true,
        require_special_chars: updateData.passwordPolicy?.requireSpecialChars || true,
        password_history_count: updateData.passwordPolicy?.preventReuse || 3,
        max_login_attempts: updateData.accountPolicy?.maxLoginAttempts || 5,
        lock_duration_minutes: updateData.accountPolicy?.lockoutDuration || 30,
        two_factor_auth_enabled: updateData.twoFactorAuth?.enabled || false,
        updated_at: new Date(),
        updated_by: userId
      };
      
      // Créer ou mettre à jour les paramètres
      const settings = await prisma.security_settings.upsert({
        where: { id: 1 }, // Assumer qu'il y a toujours un seul enregistrement avec ID 1
        update: dataToSave,
        create: {
          ...dataToSave
        }
      });
      
      // Enregistrer l'incident de modification des paramètres de sécurité
      await SecurityIncidentService.logIncident(
        'security_setting_change',
        'Paramètres de sécurité mis à jour',
        '127.0.0.1', // À remplacer par l'IP réelle
        'info',
        userId ? String(userId) : undefined
      );
      
      return this.formatSettingsFromDb(settings);
    } catch (error) {
      console.error('Erreur lors de la mise à jour des paramètres de sécurité:', error);
      throw error;
    }
  }

  /**
   * Crée les paramètres de sécurité par défaut
   */
  private static async createDefaultSettings() {
    try {
      const defaultSettings = this.getDefaultSettingsData();
      
      // Créer l'enregistrement dans la base de données
      const dataToSave = {
        min_password_length: defaultSettings.passwordPolicy.minLength,
        require_uppercase: defaultSettings.passwordPolicy.requireUppercase,
        require_numbers: defaultSettings.passwordPolicy.requireNumbers,
        require_special_chars: defaultSettings.passwordPolicy.requireSpecialChars,
        password_history_count: defaultSettings.passwordPolicy.preventReuse,
        max_login_attempts: defaultSettings.accountPolicy.maxLoginAttempts,
        lock_duration_minutes: defaultSettings.accountPolicy.lockoutDuration,
        two_factor_auth_enabled: defaultSettings.twoFactorAuth.enabled
      };
      
      // Créer l'enregistrement dans la base de données
      const settings = await prisma.security_settings.create({
        data: dataToSave
      });
      
      // Enregistrer l'incident de création des paramètres par défaut
      await SecurityIncidentService.logIncident(
        'security_setting_change',
        'Paramètres de sécurité par défaut créés',
        '127.0.0.1',
        'info'
      );
      
      return defaultSettings;
    } catch (error) {
      console.error('Erreur lors de la création des paramètres de sécurité par défaut:', error);
      // En cas d'erreur, retourner les valeurs par défaut sans les stocker
      return this.getDefaultSettingsData();
    }
  }
  
  /**
   * Données par défaut pour les paramètres de sécurité
   */
  private static getDefaultSettingsData() {
    return {
      passwordPolicy: {
        minLength: 8,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSpecialChars: true,
        preventReuse: 5,
        expiryDays: 90
      },
      
      accountPolicy: {
        maxLoginAttempts: 5,
        lockoutDuration: 30,
        forcePasswordChangeOnFirstLogin: true
      },
      
      sessionPolicy: {
        sessionTimeout: 30,
        inactivityTimeout: 15,
        singleSessionOnly: false,
      },
      
      networkPolicy: {
        ipRestrictionEnabled: false,
        allowedIPs: [],
        enforceHTTPS: true
      },
      
      auditPolicy: {
        logLogins: true,
        logModifications: true,
        logRetentionDays: 365,
        enableNotifications: true
      },
      
      twoFactorAuth: {
        enabled: false,
        requiredForRoles: []
      }
    };
  }
} 