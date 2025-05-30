import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import * as z from "zod";
import bcrypt from "bcryptjs";
import { AuthLogger } from "@/lib/auth-logger";
import { hash } from 'bcrypt';
import { addDays } from 'date-fns';
import { isAdmin } from '@/lib/role-utils';
import { generateTemporaryPasswordForRole, calculateTemporaryPasswordExpiry } from '@/lib/password-utils';

// Mot de passe par défaut pour les nouveaux utilisateurs
const DEFAULT_PASSWORD = "P@ssw0rd2025";

// Modifier le schéma de validation pour utiliser role_id et status_id
const createUserSchema = z.object({
  name: z.string().min(3, "Le nom doit contenir au moins 3 caractères"),
  email: z.string().email("Format d'email invalide"),
  role_id: z.number().optional(), // Utiliser role_id
  status_id: z.number().optional(), // Utiliser status_id au lieu de status
  status: z.enum(['active', 'inactive']).optional(), // Gardé pour rétrocompatibilité
  profileIds: z.array(z.number()).optional()
});

/**
 * GET /api/users - Récupérer la liste des utilisateurs
 */
export async function GET(req: NextRequest) {
  try {
    // Vérifier l'authentification
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // Utiliser Prisma Raw pour contourner les problèmes de types
    const usersWithRoles = await prisma.$queryRaw`
      SELECT 
        u.id, u.name, u.email, u.role, u.role_id, u.status, u.status_id, u.created_at, u.updated_at, 
        u.password_expiry_date, u.first_login,
        r.id as role_ref_id, r.name as role_name, r.description as role_description,
        rd.id as status_ref_id, rd.display_name as status_display_name, rd.color_code as status_color, 
        rd.icon_name as status_icon,
        (SELECT MAX(timestamp) FROM auth_log WHERE email = u.email AND event_type = 'login_success') as last_login
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      LEFT JOIN reference_data rd ON u.status_id = rd.id AND rd.type = 'status' AND rd.module = 'users'
      ORDER BY u.created_at DESC
    `;

    // Récupérer les profils pour chaque utilisateur
    const formattedUsers = await Promise.all(
      Array.isArray(usersWithRoles) 
        ? usersWithRoles.map(async (user: any) => {
            // Logs de débogage pour les rôles
            console.log(`API /users - Utilisateur ${user.id} (${user.name}):`, {
              role: user.role,
              role_id: user.role_id,
              role_name: user.role_name
            });
            
            // Récupérer les profils pour cet utilisateur
            const userProfiles = await prisma.userProfile.findMany({
              where: { user_id: user.id },
              include: {
                profile: {
                  select: {
                    id: true,
                    name: true,
                    description: true,
                  },
                },
              },
            });

            const profiles = userProfiles.map((up) => up.profile);
            const profileIds = profiles.map((p) => p.id);

            // Formater les données utilisateur
            return {
              id: user.id.toString(),
              name: user.name,
              email: user.email,
              role: user.role, // Garder pour rétrocompatibilité
              role_id: user.role_id, // Conserver le role_id original de l'utilisateur
              role_name: user.role_name, // Nom du rôle via la jointure
              status: user.status, // Garder pour rétrocompatibilité
              status_id: user.status_id,
              status_display: user.status_display_name,
              status_color: user.status_color,
              status_icon: user.status_icon,
              createdAt: user.created_at,
              updatedAt: user.updated_at,
              passwordExpiryDate: user.password_expiry_date,
              firstLogin: user.first_login,
              lastLogin: user.last_login,
              profiles,
              profileIds,
            };
          })
        : []
    );

    return NextResponse.json(formattedUsers);
  } catch (error) {
    console.error("Erreur lors de la récupération des utilisateurs:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des utilisateurs" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/users - Créer un nouvel utilisateur
 */
export async function POST(req: NextRequest) {
  try {
    // Vérifier l'authentification
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // Récupérer et valider les données
    const body = await req.json();
    const { name, email, role_id, status_id, profileIds = [] } = body;

    // Valider les données requises
    if (!name || !email) {
      return NextResponse.json(
        { error: "Nom et email requis" },
        { status: 400 }
      );
    }

    // Vérifier si l'email existe déjà
    const existingUser = await prisma.users.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Un utilisateur avec cet email existe déjà" },
        { status: 409 }
      );
    }

    // Générer un mot de passe temporaire sécurisé en fonction du rôle
    const tempPassword = await generateTemporaryPasswordForRole(role_id);
    
    // Calculer la date d'expiration du mot de passe
    const passwordExpiryDate = await calculateTemporaryPasswordExpiry();

    // Hacher le mot de passe
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    // Récupérer le nom du rôle à partir du role_id
    let roleName = "user"; // Valeur par défaut
    if (role_id) {
      const roleResult = await prisma.roles.findUnique({
        where: { id: role_id },
        select: { name: true }
      });
      if (roleResult?.name) {
        roleName = roleResult.name;
      }
    }

    // Récupérer le statut à partir du status_id
    let statusValue = "active"; // Valeur par défaut
    if (status_id) {
      const statusResult = await prisma.$queryRaw`
        SELECT value FROM reference_data 
        WHERE id = ${status_id} AND type = 'status' AND module = 'users'
        LIMIT 1
      `;
      if (Array.isArray(statusResult) && statusResult.length > 0 && statusResult[0].value) {
        statusValue = statusResult[0].value;
      }
    }

    // Créer l'utilisateur
    const newUser = await prisma.$queryRaw`
      INSERT INTO users (
        name, email, password, role_id, status_id, role, status,
        first_login, password_expiry_date, created_at, updated_at
      ) VALUES (
        ${name},
        ${email},
        ${hashedPassword},
        ${role_id || null},
        ${status_id || null},
        ${roleName},
        ${statusValue},
        true,
        ${passwordExpiryDate},
        NOW(),
        NOW()
      )
    `;
    
    // Récupérer l'ID du nouvel utilisateur
    const userId = await prisma.$queryRaw`SELECT LAST_INSERT_ID() as id`;
    const newUserId = Array.isArray(userId) && userId.length > 0 ? userId[0].id : null;

    // Associer les profils
    if (newUserId && profileIds && profileIds.length > 0) {
      for (const profileId of profileIds) {
        await prisma.$executeRaw`
          INSERT INTO user_profiles (user_id, profile_id)
          VALUES (${newUserId}, ${profileId})
        `;
      }
    }

    // Enregistrer l'événement de création
    await prisma.user_activities.create({
      data: {
        user_id: session.user.id ? parseInt(session.user.id) : undefined,
        action: "create_user",
        details: `Utilisateur créé: ${email}`,
        ip_address: req.headers.get("x-forwarded-for") || req.ip || "unknown",
      },
    });

    // Loguer l'action de sécurité
    AuthLogger.logSecurityEvent(
      "user_created",
      "medium",
      { 
        email: session.user.email || "unknown",
        details: `Nouvel utilisateur créé: ${email}`,
        success: true,
        ip_address: req.headers.get("x-forwarded-for") || req.ip || "unknown"
      }
    );

    // Envoyer un email avec le mot de passe temporaire (à implémenter)
    // Ici, vous mettriez en place l'envoi d'email, mais cette partie est laissée pour une implémentation future
    console.log(`Un compte a été créé pour ${email} avec le mot de passe temporaire: ${tempPassword}`);

    // Récupérer l'utilisateur créé avec ses profils pour la réponse
    const userWithProfiles = await prisma.$queryRaw`
      SELECT 
        u.id, u.name, u.email, u.role, u.role_id, u.status, u.status_id, 
        u.created_at, u.updated_at, u.password_expiry_date, u.first_login
      FROM users u
      WHERE u.id = ${newUserId}
    `;

    const userProfiles = await prisma.$queryRaw`
      SELECT p.id, p.name, p.description
      FROM profiles p
      JOIN user_profiles up ON p.id = up.profile_id
      WHERE up.user_id = ${newUserId}
    `;

    // Formater la réponse
    const formattedUser = {
      ...(Array.isArray(userWithProfiles) && userWithProfiles.length > 0 ? userWithProfiles[0] : {}),
      profiles: Array.isArray(userProfiles) ? userProfiles : [],
      profileIds: Array.isArray(userProfiles) ? userProfiles.map((p) => p.id) : [],
      temporaryPassword: tempPassword, // Inclure le mot de passe temporaire dans la réponse pour l'administrateur
    };

    return NextResponse.json(formattedUser);
  } catch (error) {
    console.error("Erreur lors de la création de l'utilisateur:", error);
    return NextResponse.json(
      { error: "Erreur lors de la création de l'utilisateur" },
      { status: 500 }
    );
  }
}

/**
 * Générer un mot de passe temporaire selon les règles de sécurité
 */
function generateTempPassword(securitySettings: any): string {
  const length = securitySettings?.min_password_length || 12;
  const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const lowercase = "abcdefghijklmnopqrstuvwxyz";
  const numbers = "0123456789";
  const special = "!@#$%^&*()_+[]{}|;:,.<>?";

  let chars = "";

  // Ajouter les ensembles de caractères en fonction des exigences de sécurité
  if (securitySettings?.require_uppercase) chars += uppercase;
  if (true) chars += lowercase; // Toujours inclure des minuscules
  if (securitySettings?.require_numbers) chars += numbers;
  if (securitySettings?.require_special_chars) chars += special;

  // Ajouter des ensembles par défaut si aucun paramètre n'est activé
  if (chars.length === 0) {
    chars = uppercase + lowercase + numbers + special;
  }

  let password = "";
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  // S'assurer que le mot de passe contient au moins un caractère de chaque ensemble requis
  let hasUpper = !securitySettings?.require_uppercase || /[A-Z]/.test(password);
  let hasLower = true; // Toujours requis
  let hasNumber = !securitySettings?.require_numbers || /[0-9]/.test(password);
  let hasSpecial = !securitySettings?.require_special_chars || /[^A-Za-z0-9]/.test(password);

  // Si une contrainte n'est pas respectée, remplacer un caractère aléatoire
  if (!hasUpper) {
    const pos = Math.floor(Math.random() * length);
    password = password.substring(0, pos) + uppercase.charAt(Math.floor(Math.random() * uppercase.length)) + password.substring(pos + 1);
  }
  if (!hasLower) {
    const pos = Math.floor(Math.random() * length);
    password = password.substring(0, pos) + lowercase.charAt(Math.floor(Math.random() * lowercase.length)) + password.substring(pos + 1);
  }
  if (!hasNumber) {
    const pos = Math.floor(Math.random() * length);
    password = password.substring(0, pos) + numbers.charAt(Math.floor(Math.random() * numbers.length)) + password.substring(pos + 1);
  }
  if (!hasSpecial) {
    const pos = Math.floor(Math.random() * length);
    password = password.substring(0, pos) + special.charAt(Math.floor(Math.random() * special.length)) + password.substring(pos + 1);
  }

  return password;
}