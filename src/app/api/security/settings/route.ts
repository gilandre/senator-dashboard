import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AuthLogger } from "@/lib/auth-logger";
import { z } from "zod";

// Schéma de validation pour les paramètres de sécurité
const securitySettingsSchema = z.object({
  min_password_length: z.number().min(8).max(30).default(12),
  require_special_chars: z.boolean().default(true),
  require_numbers: z.boolean().default(true),
  require_uppercase: z.boolean().default(true),
  password_history_count: z.number().min(0).max(10).default(3),
  max_login_attempts: z.number().min(1).max(10).default(5),
  lock_duration_minutes: z.number().min(5).max(1440).default(30),
  two_factor_auth_enabled: z.boolean().default(false),
  default_password: z.string().min(8).max(30).default("P@ssw0rd2025")
});

// Créer une réponse avec des valeurs par défaut pour les cas où la table est vide
const getDefaultSecuritySettings = () => {
  return {
    // Valeurs par défaut
    maxLoginAttempts: 5,
    lockoutDuration: 15,
    sessionTimeout: 30,
    require2FA: false,
    passwordMinLength: 12,
    passwordRequireSpecial: true,
    passwordRequireNumbers: true,
    passwordRequireUppercase: true,
    passwordExpiryDays: 90,
    accessLogRetentionDays: 365,
    enableAuditLog: true,
    notifyOnIncident: true,
    notifyOnAccessDenied: true,
    notifyOnMultipleFailures: true,
    ipWhitelist: [],
    allowedCountries: [],
    maintenanceMode: false,
    maintenanceMessage: "Le système est en maintenance. Veuillez réessayer plus tard.",
    autoLockTimeout: 15,
    requireReauthOnSensitive: true,
    maxConcurrentSessions: 3,
    sessionInactivityTimeout: 30,
    enableBruteForceProtection: true,
    enableGeoFencing: false,
    enableDeviceFingerprinting: true,
    enableAnomalyDetection: true,
    defaultPassword: "P@ssw0rd2025",
    passwordPolicy: {
      minLength: 12,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: true,
      preventReuse: 3,
      expiryDays: 90
    }
  };
};

/**
 * GET /api/security/settings
 * Renvoie les paramètres de sécurité en se basant sur la table security_settings
 */
export async function GET(req: NextRequest) {
  try {
    // Récupérer les paramètres de sécurité de la base de données
    const securitySettings = await prisma.security_settings.findFirst({
      orderBy: { id: 'desc' },
    });

    // Si aucun paramètre n'est trouvé, utiliser les valeurs par défaut
    if (!securitySettings) {
      return NextResponse.json(getDefaultSecuritySettings());
    }

    // Mapper les valeurs de la table aux valeurs attendues par l'API
    const responseData = {
      maxLoginAttempts: securitySettings.max_login_attempts || 5,
      lockoutDuration: securitySettings.lock_duration_minutes || 15,
      sessionTimeout: 30, // Valeur par défaut car non stockée dans la table
      require2FA: securitySettings.two_factor_auth_enabled || false,
      passwordMinLength: securitySettings.min_password_length || 12,
      passwordRequireSpecial: securitySettings.require_special_chars || true,
      passwordRequireNumbers: securitySettings.require_numbers || true,
      passwordRequireUppercase: securitySettings.require_uppercase || true,
      passwordExpiryDays: 90, // Valeur par défaut car non stockée dans la table
      defaultPassword: securitySettings.default_password || "P@ssw0rd2025",
      accessLogRetentionDays: 365, // Valeur par défaut car non stockée dans la table
      enableAuditLog: true, // Valeur par défaut car non stockée dans la table
      notifyOnIncident: true, // Valeur par défaut car non stockée dans la table
      notifyOnAccessDenied: true, // Valeur par défaut car non stockée dans la table
      notifyOnMultipleFailures: true, // Valeur par défaut car non stockée dans la table
      ipWhitelist: [], // Valeur par défaut car non stockée dans la table
      allowedCountries: [], // Valeur par défaut car non stockée dans la table
      maintenanceMode: false, // Valeur par défaut car non stockée dans la table
      maintenanceMessage: "Le système est en maintenance. Veuillez réessayer plus tard.", // Valeur par défaut
      autoLockTimeout: 15, // Valeur par défaut car non stockée dans la table
      requireReauthOnSensitive: true, // Valeur par défaut car non stockée dans la table
      maxConcurrentSessions: 3, // Valeur par défaut car non stockée dans la table
      sessionInactivityTimeout: 30, // Valeur par défaut car non stockée dans la table
      enableBruteForceProtection: true, // Valeur par défaut car non stockée dans la table
      enableGeoFencing: false, // Valeur par défaut car non stockée dans la table
      enableDeviceFingerprinting: true, // Valeur par défaut car non stockée dans la table
      enableAnomalyDetection: true, // Valeur par défaut car non stockée dans la table
      passwordPolicy: {
        minLength: securitySettings.min_password_length || 12,
        requireUppercase: securitySettings.require_uppercase || true,
        requireLowercase: true, // Valeur par défaut car non stockée dans la table
        requireNumbers: securitySettings.require_numbers || true,
        requireSpecialChars: securitySettings.require_special_chars || true,
        preventReuse: securitySettings.password_history_count || 3,
        expiryDays: 90 // Valeur par défaut car non stockée dans la table
      }
    };

    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Erreur lors de la récupération des paramètres de sécurité:', error);
    // En cas d'erreur, renvoyer les valeurs par défaut
    return NextResponse.json(getDefaultSecuritySettings());
  }
}

/**
 * PUT /api/security/settings
 * Met à jour les paramètres de sécurité dans la table security_settings
 */
export async function PUT(req: NextRequest) {
  try {
    // Vérifier l'authentification
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Authentification requise" }, { status: 401 });
    }

    // Vérifier si l'utilisateur est administrateur
    const user = await prisma.user.findUnique({
      where: { id: parseInt(session.user.id) },
      select: { role: true }
    });

    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: "Accès non autorisé" }, { status: 403 });
    }

    // Extraire et valider les données
    const body = await req.json();
    
    // Mapper les données reçues au format attendu par la base de données
    const securityData = {
      min_password_length: body.passwordMinLength || body.passwordPolicy?.minLength || 12,
      require_special_chars: body.passwordRequireSpecial || body.passwordPolicy?.requireSpecialChars || true,
      require_numbers: body.passwordRequireNumbers || body.passwordPolicy?.requireNumbers || true,
      require_uppercase: body.passwordRequireUppercase || body.passwordPolicy?.requireUppercase || true,
      password_history_count: body.passwordPolicy?.preventReuse || 3,
      max_login_attempts: body.maxLoginAttempts || 5,
      lock_duration_minutes: body.lockoutDuration || 15,
      two_factor_auth_enabled: body.require2FA || false,
      default_password: body.defaultPassword || "P@ssw0rd2025",
      updated_at: new Date(),
      updated_by: parseInt(session.user.id)
    };

    // Créer une nouvelle entrée dans la table des paramètres de sécurité
    const updatedSettings = await prisma.security_settings.create({
      data: securityData
    });

    // Journaliser l'activité
    await AuthLogger.logActivity(
      'update_security_settings',
      { 
        userId: session.user.id, 
        action: 'PUT',
        endpoint: '/api/security/settings'
      }
    );

    // Mapper les données mises à jour au format attendu par le frontend
    const responseData = {
      id: updatedSettings.id,
      maxLoginAttempts: updatedSettings.max_login_attempts,
      lockoutDuration: updatedSettings.lock_duration_minutes,
      sessionTimeout: 30,
      require2FA: updatedSettings.two_factor_auth_enabled,
      passwordMinLength: updatedSettings.min_password_length,
      passwordRequireSpecial: updatedSettings.require_special_chars,
      passwordRequireNumbers: updatedSettings.require_numbers,
      passwordRequireUppercase: updatedSettings.require_uppercase,
      passwordExpiryDays: 90, // Valeur par défaut car non stockée dans la table
      defaultPassword: updatedSettings.default_password,
      // Autres valeurs par défaut
      accessLogRetentionDays: 365,
      enableAuditLog: true,
      notifyOnIncident: true,
      notifyOnAccessDenied: true,
      notifyOnMultipleFailures: true,
      ipWhitelist: [],
      allowedCountries: [],
      maintenanceMode: false,
      maintenanceMessage: "Le système est en maintenance. Veuillez réessayer plus tard.",
      autoLockTimeout: 15,
      requireReauthOnSensitive: true,
      maxConcurrentSessions: 3,
      sessionInactivityTimeout: 30,
      enableBruteForceProtection: true,
      enableGeoFencing: false,
      enableDeviceFingerprinting: true,
      enableAnomalyDetection: true,
      passwordPolicy: {
        minLength: updatedSettings.min_password_length,
        requireUppercase: updatedSettings.require_uppercase,
        requireLowercase: true,
        requireNumbers: updatedSettings.require_numbers,
        requireSpecialChars: updatedSettings.require_special_chars,
        preventReuse: updatedSettings.password_history_count,
        expiryDays: 90 // Valeur par défaut car non stockée dans la table
      },
      updated_at: updatedSettings.updated_at,
      updated_by: updatedSettings.updated_by
    };

    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Erreur lors de la mise à jour des paramètres de sécurité:', error);
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour des paramètres de sécurité" },
      { status: 500 }
    );
  }
}

// POST /api/security/settings/reset - Réinitialiser les paramètres de sécurité
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // Vérifier si l'utilisateur a les droits d'administration
    const user = await prisma.user.findUnique({
      where: { id: parseInt(session.user.id) },
      select: { role: true }
    });

    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: "Accès non autorisé" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');

    if (action !== 'reset') {
      return NextResponse.json(
        { error: "Action non valide" },
        { status: 400 }
      );
    }

    // Créer une nouvelle entrée avec les valeurs par défaut
    const settings = await prisma.security_settings.create({
      data: {
        min_password_length: 12,
        require_special_chars: true,
        require_numbers: true,
        require_uppercase: true,
        password_history_count: 3,
        max_login_attempts: 5,
        lock_duration_minutes: 15,
        two_factor_auth_enabled: false,
        default_password: "P@ssw0rd2025",
        updated_at: new Date(),
        updated_by: parseInt(session.user.id)
      }
    });

    // Logger l'activité
    await AuthLogger.logActivity(
      'reset_security_settings',
      { 
        userId: session.user.id, 
        action: 'POST',
        endpoint: '/api/security/settings/reset'
      }
    );

    // Créer un incident de sécurité
    await prisma.securityIncident.create({
      data: {
        type: 'settings_change',
        description: 'Réinitialisation des paramètres de sécurité',
        user_id: parseInt(session.user.id),
        ip_address: req.headers.get('x-forwarded-for') || 'unknown',
        status: 'info',
        occurred_at: new Date()
      }
    });

    return NextResponse.json({
      message: "Paramètres de sécurité réinitialisés avec succès",
      settings: {
        id: settings.id,
        maxLoginAttempts: settings.max_login_attempts,
        lockoutDuration: settings.lock_duration_minutes,
        require2FA: settings.two_factor_auth_enabled,
        passwordMinLength: settings.min_password_length,
        passwordRequireSpecial: settings.require_special_chars,
        passwordRequireNumbers: settings.require_numbers,
        passwordRequireUppercase: settings.require_uppercase,
        passwordExpiryDays: 90, // Valeur par défaut
        defaultPassword: settings.default_password,
        updated_at: settings.updated_at
      }
    });
  } catch (error) {
    console.error('Erreur lors de la réinitialisation des paramètres de sécurité:', error);
    return NextResponse.json(
      { error: "Erreur lors de la réinitialisation des paramètres de sécurité" },
      { status: 500 }
    );
  }
} 