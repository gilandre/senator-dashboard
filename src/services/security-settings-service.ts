import SecuritySettings from '@/models/SecuritySettings';
import SecurityIncident from '@/models/SecurityIncident';

export class SecuritySettingsService {
  /**
   * Récupère les paramètres de sécurité actuels
   * Si aucun paramètre n'existe, crée une configuration par défaut
   */
  static async getSettings() {
    try {
      // Rechercher les paramètres existants
      const settings = await SecuritySettings.findOne();
      
      // Si aucun paramètre n'existe, créer une configuration par défaut
      if (!settings) {
        return await this.createDefaultSettings();
      }
      
      return settings.toObject();
    } catch (error) {
      console.error('Erreur lors de la récupération des paramètres de sécurité:', error);
      return null;
    }
  }

  /**
   * Met à jour les paramètres de sécurité
   */
  static async updateSettings(updateData: any) {
    try {
      // Rechercher les paramètres existants
      let settings = await SecuritySettings.findOne();
      
      // Si aucun paramètre n'existe, créer une configuration par défaut
      if (!settings) {
        settings = await SecuritySettings.create(this.getDefaultSettingsData());
      } else {
        // Nettoyer les données avant la mise à jour pour éviter les problèmes de conversion
        const cleanedData = { ...updateData };
        
        // Supprimer les champs gérés automatiquement par Mongoose
        delete cleanedData.createdAt;
        delete cleanedData.updatedAt;
        delete cleanedData._id;
        delete cleanedData.__v;

        // Mettre à jour les paramètres avec les nouvelles données
        Object.keys(cleanedData).forEach(key => {
          if (settings && typeof settings[key] === 'object' && cleanedData[key]) {
            // Éviter de remplacer des propriétés qui pourraient ne pas être présentes dans cleanedData[key]
            const existingValue = settings[key].toObject ? settings[key].toObject() : settings[key];
            settings[key] = { ...existingValue, ...cleanedData[key] };
          } else if (settings && cleanedData[key] !== undefined) {
            settings[key] = cleanedData[key];
          }
        });
        
        // Mettre à jour la date de modification manuellement
        settings.updatedAt = new Date();
        
        // Sauvegarder les modifications
        await settings.save();
      }
      
      // Enregistrer l'incident de modification des paramètres de sécurité
      await SecurityIncident.create({
        type: 'security_setting_change',
        ipAddress: '127.0.0.1', // À remplacer par l'IP réelle
        details: 'Paramètres de sécurité mis à jour',
        status: 'info',
        timestamp: new Date(),
      });
      
      return settings.toObject();
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
      const defaultSettings = await SecuritySettings.create(this.getDefaultSettingsData());
      
      // Enregistrer l'incident de création des paramètres par défaut
      await SecurityIncident.create({
        type: 'security_setting_change',
        ipAddress: '127.0.0.1',
        details: 'Paramètres de sécurité par défaut créés',
        status: 'info',
        timestamp: new Date(),
      });
      
      return defaultSettings.toObject();
    } catch (error) {
      console.error('Erreur lors de la création des paramètres de sécurité par défaut:', error);
      throw error;
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