import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { AuthLogger } from "@/lib/auth-logger";
import * as z from "zod";
import bcrypt from "bcryptjs";
import { generateSecurePassword } from "@/lib/password-utils";
import { sendPasswordResetEmail } from "@/lib/mail-utils";

// Schéma de validation pour les données de réinitialisation du mot de passe
const resetPasswordSchema = z.object({
  generateRandom: z.boolean().default(true),
  password: z.string().optional(),
  requirePasswordChange: z.boolean().default(true),
  sendEmail: z.boolean().default(false),
});

/**
 * POST /api/users/[id]/reset-password - Réinitialiser le mot de passe d'un utilisateur
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Vérifier l'authentification
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: "Authentification requise" },
        { status: 401 }
      );
    }

    // Vérifier les autorisations (admin ou l'utilisateur lui-même)
    if (
      session.user.role !== "admin" &&
      session.user.id !== parseInt(params.id)
    ) {
      return NextResponse.json(
        { error: "Autorisation insuffisante" },
        { status: 403 }
      );
    }

    // Récupérer l'utilisateur
    const userId = parseInt(params.id);
    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Utilisateur non trouvé" },
        { status: 404 }
      );
    }

    // Analyser et valider les données de la requête
    const body = await req.json();
    const validatedData = resetPasswordSchema.parse(body);
    const { generateRandom, password, requirePasswordChange, sendEmail } = validatedData;

    // Générer ou utiliser le mot de passe fourni
    let newPassword: string;
    
    if (generateRandom) {
      // Générer un mot de passe aléatoire
      newPassword = generateSecurePassword();
    } else if (password) {
      // Utiliser le mot de passe fourni
      newPassword = password;
    } else {
      // Récupérer le mot de passe par défaut des paramètres de sécurité
      const securitySettings = await prisma.security_settings.findFirst({
        orderBy: { id: 'desc' }
      });
      
      newPassword = securitySettings?.default_password || "P@ssw0rd2025";
    }

    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Date d'expiration du mot de passe (par défaut, 90 jours)
    const expiryDays = 90;
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + expiryDays);

    // Mettre à jour le mot de passe de l'utilisateur
    await prisma.users.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        first_login: requirePasswordChange, // Si requirePasswordChange est true, first_login sera true également
        password_expiry_date: expiryDate,
      },
    });

    // Enregistrer le nouveau mot de passe dans l'historique
    await prisma.password_history.create({
      data: {
        user_id: userId,
        password: hashedPassword,
      },
    });

    // Envoyer un email à l'utilisateur si demandé
    if (sendEmail && user.email) {
      await sendPasswordResetEmail(user.email, user.name, newPassword);
    }

    return NextResponse.json({
      success: true,
      message: "Mot de passe réinitialisé avec succès",
      password: newPassword, // Renvoyer le mot de passe en clair pour que l'admin puisse le communiquer
    });
  } catch (error) {
    console.error("Erreur lors de la réinitialisation du mot de passe:", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Données invalides", details: error.format() },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: "Erreur lors de la réinitialisation du mot de passe" },
      { status: 500 }
    );
  }
}

/**
 * Valider un mot de passe selon les règles de sécurité
 */
function validatePassword(password: string, securitySettings: any): boolean {
  // Vérifier la longueur minimale
  const minLength = securitySettings?.min_password_length || 8;
  if (password.length < minLength) {
    return false;
  }

  // Vérifier les exigences de complexité
  if (securitySettings?.require_uppercase && !/[A-Z]/.test(password)) {
    return false;
  }

  if (securitySettings?.require_numbers && !/[0-9]/.test(password)) {
    return false;
  }

  if (securitySettings?.require_special_chars && !/[^A-Za-z0-9]/.test(password)) {
    return false;
  }

  // Si toutes les vérifications sont passées
  return true;
} 