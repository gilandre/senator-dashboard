import { prisma } from '@/lib/prisma';

/**
 * Interface pour les paramètres de sécurité
 */
export interface ISecuritySettings {
  id?: number;
  passwordPolicy: {
    minLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireNumbers: boolean;
    requireSpecialChars: boolean;
    preventReuse: number; // Nombre d'anciens mots de passe à vérifier
    expiryDays: number; // 0 = pas d'expiration
    defaultPassword?: string; // Mot de passe par défaut pour les nouveaux utilisateurs
  };
  accountPolicy: {
    maxLoginAttempts: number;
    lockoutDuration: number; // durée en minutes
    forcePasswordChangeOnFirstLogin: boolean;
  };
  sessionPolicy: {
    sessionTimeout: number; // en minutes
    inactivityTimeout: number; // en minutes
    singleSessionOnly: boolean;
  };
  networkPolicy: {
    ipRestrictionEnabled: boolean;
    allowedIPs: string[]; // liste des IPs ou plages autorisées
    enforceHTTPS: boolean;
  };
  auditPolicy: {
    logLogins: boolean;
    logModifications: boolean;
    logRetentionDays: number;
    enableNotifications: boolean;
  };
  twoFactorAuth: {
    enabled: boolean;
    requiredForRoles: string[]; // 'all' ou liste de rôles
  };
  created_at?: Date;
  updated_at?: Date;
  updated_by?: number | null;
}

/**
 * Obtenir les paramètres de sécurité
 */
export async function getSecuritySettings(): Promise<ISecuritySettings | null> {
  // Récupérer les paramètres les plus récents
  const settings = await prisma.security_settings.findFirst({
    orderBy: {
      updated_at: 'desc'
    }
  });

  if (!settings) return null;

  // Convertir les données JSON stockées en objet structuré
  return {
    id: settings.id,
    passwordPolicy: JSON.parse(settings.password_policy as string),
    accountPolicy: JSON.parse(settings.account_policy as string),
    sessionPolicy: JSON.parse(settings.session_policy as string),
    networkPolicy: JSON.parse(settings.network_policy as string),
    auditPolicy: JSON.parse(settings.audit_policy as string),
    twoFactorAuth: JSON.parse(settings.two_factor_auth as string),
    created_at: settings.created_at,
    updated_at: settings.updated_at,
    updated_by: settings.updated_by
  };
}

/**
 * Créer ou mettre à jour les paramètres de sécurité
 */
export async function saveSecuritySettings(settings: ISecuritySettings, updatedBy: number): Promise<ISecuritySettings> {
  // Préparer les données pour le stockage JSON
  const securityData = {
    password_policy: JSON.stringify(settings.passwordPolicy),
    account_policy: JSON.stringify(settings.accountPolicy),
    session_policy: JSON.stringify(settings.sessionPolicy),
    network_policy: JSON.stringify(settings.networkPolicy),
    audit_policy: JSON.stringify(settings.auditPolicy),
    two_factor_auth: JSON.stringify(settings.twoFactorAuth),
    updated_by: updatedBy,
    updated_at: new Date()
  };

  let updatedSettings;

  if (settings.id) {
    // Mise à jour des paramètres existants
    updatedSettings = await prisma.security_settings.update({
      where: { id: settings.id },
      data: securityData
    });
  } else {
    // Création de nouveaux paramètres
    updatedSettings = await prisma.security_settings.create({
      data: {
        ...securityData,
        created_at: new Date()
      }
    });
  }

  // Convertir les paramètres stockés pour les retourner
  return {
    id: updatedSettings.id,
    passwordPolicy: JSON.parse(updatedSettings.password_policy as string),
    accountPolicy: JSON.parse(updatedSettings.account_policy as string),
    sessionPolicy: JSON.parse(updatedSettings.session_policy as string),
    networkPolicy: JSON.parse(updatedSettings.network_policy as string),
    auditPolicy: JSON.parse(updatedSettings.audit_policy as string),
    twoFactorAuth: JSON.parse(updatedSettings.two_factor_auth as string),
    created_at: updatedSettings.created_at,
    updated_at: updatedSettings.updated_at,
    updated_by: updatedSettings.updated_by
  };
}

export default {
  getSecuritySettings,
  saveSecuritySettings
}; 