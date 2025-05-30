import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/role-utils";
import * as z from "zod";

// Schéma de validation pour les paramètres de sécurité
const securitySettingsSchema = z.object({
  min_password_length: z.number().min(8).max(64).default(12),
  require_special_chars: z.boolean().default(true),
  require_numbers: z.boolean().default(true),
  require_uppercase: z.boolean().default(true),
  password_history_count: z.number().min(0).max(20).default(3),
  max_login_attempts: z.number().min(1).max(10).default(5),
  lock_duration_minutes: z.number().min(5).max(1440).default(30),
  two_factor_auth_enabled: z.boolean().default(false),
  temp_password_length: z.number().min(8).max(64).default(16),
  temp_password_expiry_hours: z.number().min(1).max(168).default(24),
  role_password_policies: z.string().optional(),
});

/**
 * GET /api/settings/security - Récupérer les paramètres de sécurité
 */
export async function GET(req: NextRequest) {
  try {
    // Vérifier l'authentification
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // Vérifier si l'utilisateur est administrateur
    if (!isAdmin(session as any)) {
      return NextResponse.json(
        { error: "Accès réservé aux administrateurs" },
        { status: 403 }
      );
    }

    // Récupérer les paramètres de sécurité
    const securitySettings = await prisma.security_settings.findFirst({
      orderBy: {
        updated_at: "desc",
      },
    });

    if (!securitySettings) {
      // Créer des paramètres par défaut si aucun n'existe
      const defaultPolicies = {
        default: { min_length: 12, require_uppercase: true, require_numbers: true, require_special: true },
        admin: { min_length: 16, require_uppercase: true, require_numbers: true, require_special: true },
        operator: { min_length: 14, require_uppercase: true, require_numbers: true, require_special: true },
        user: { min_length: 12, require_uppercase: true, require_numbers: true, require_special: true }
      };

      const newSettings = await prisma.$executeRaw`
        INSERT INTO security_settings (
          min_password_length, require_special_chars, require_numbers, require_uppercase,
          password_history_count, max_login_attempts, lock_duration_minutes, two_factor_auth_enabled,
          temp_password_length, temp_password_expiry_hours, role_password_policies,
          created_at, updated_at
        ) VALUES (
          12, true, true, true, 3, 5, 30, false, 16, 24,
          ${JSON.stringify(defaultPolicies)},
          NOW(), NOW()
        )
      `;

      const createdSettings = await prisma.security_settings.findFirst({
        orderBy: {
          updated_at: "desc",
        },
      });

      return NextResponse.json(createdSettings);
    }

    return NextResponse.json(securitySettings);
  } catch (error) {
    console.error("Erreur lors de la récupération des paramètres de sécurité:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des paramètres de sécurité" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/settings/security - Mettre à jour les paramètres de sécurité
 */
export async function PUT(req: NextRequest) {
  try {
    // Vérifier l'authentification
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // Vérifier si l'utilisateur est administrateur
    if (!isAdmin(session as any)) {
      return NextResponse.json(
        { error: "Accès réservé aux administrateurs" },
        { status: 403 }
      );
    }

    // Extraire et valider les données
    const body = await req.json();
    const validationResult = securitySettingsSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Données invalides", details: validationResult.error.format() },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Récupérer l'ID de l'utilisateur
    const userId = session.user.id ? parseInt(session.user.id) : null;

    // Mettre à jour les paramètres de sécurité avec une requête SQL pour contourner les problèmes de typage
    await prisma.$executeRaw`
      UPDATE security_settings
      SET min_password_length = ${data.min_password_length},
          require_special_chars = ${data.require_special_chars},
          require_numbers = ${data.require_numbers},
          require_uppercase = ${data.require_uppercase},
          password_history_count = ${data.password_history_count},
          max_login_attempts = ${data.max_login_attempts},
          lock_duration_minutes = ${data.lock_duration_minutes},
          two_factor_auth_enabled = ${data.two_factor_auth_enabled},
          temp_password_length = ${data.temp_password_length},
          temp_password_expiry_hours = ${data.temp_password_expiry_hours},
          role_password_policies = ${data.role_password_policies},
          updated_at = NOW(),
          updated_by = ${userId}
      WHERE id = ${body.id}
    `;

    // Enregistrer l'activité utilisateur
    await prisma.user_activities.create({
      data: {
        user_id: userId,
        action: "update_security_settings",
        details: "Paramètres de sécurité des mots de passe mis à jour",
        ip_address: req.headers.get("x-forwarded-for") || req.ip || "unknown",
      },
    });

    // Récupérer les paramètres mis à jour
    const updatedSettings = await prisma.security_settings.findFirst({
      where: { id: body.id },
    });

    return NextResponse.json(updatedSettings);
  } catch (error) {
    console.error("Erreur lors de la mise à jour des paramètres de sécurité:", error);
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour des paramètres de sécurité" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/settings/security?action=reset
 * Réinitialiser les paramètres de sécurité aux valeurs par défaut
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // Vérifier si l'utilisateur a les droits d'administration
    const user = await prisma.users.findUnique({
      where: { id: parseInt(session.user.id) },
      select: { role: true }
    });

    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: "Accès non autorisé" }, { status: 403 });
    }

    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    if (action !== "reset") {
      return NextResponse.json({ error: "Action non supportée" }, { status: 400 });
    }

    // Définir les politiques de mot de passe par défaut
    const defaultPolicies = {
      default: { min_length: 12, require_uppercase: true, require_numbers: true, require_special: true, password: 'P@ssw0rd' },
      admin: { min_length: 16, require_uppercase: true, require_numbers: true, require_special: true, password: 'P@ssw0rd' },
      operator: { min_length: 14, require_uppercase: true, require_numbers: true, require_special: true, password: 'P@ssw0rd' },
      user: { min_length: 12, require_uppercase: true, require_numbers: true, require_special: true, password: 'P@ssw0rd' }
    };

    // Créer une entrée avec les valeurs par défaut
    const settings = await prisma.security_settings.create({
      data: {
        min_password_length: 12,
        require_special_chars: true,
        require_numbers: true,
        require_uppercase: true,
        password_history_count: 3,
        max_login_attempts: 5,
        lock_duration_minutes: 30,
        two_factor_auth_enabled: false,
        temp_password_length: 16,
        temp_password_expiry_hours: 24,
        role_password_policies: JSON.stringify(defaultPolicies),
        updated_by: parseInt(session.user.id)
      }
    });

    return NextResponse.json({
      success: true,
      message: "Paramètres de sécurité réinitialisés avec succès",
      settings: {
        require2FA: settings.two_factor_auth_enabled,
        maxLoginAttempts: settings.max_login_attempts,
        lockoutDuration: settings.lock_duration_minutes,
        sessionTimeout: 30,
        passwordMinLength: settings.min_password_length,
        passwordRequireSpecial: settings.require_special_chars,
        passwordRequireNumbers: settings.require_numbers,
        passwordRequireUppercase: settings.require_uppercase,
        passwordExpiryDays: 90,
        defaultPassword: 'P@ssw0rd'
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