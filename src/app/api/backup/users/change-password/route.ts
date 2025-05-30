import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, CustomSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SecuritySettingsService } from "@/services/security-settings-service";
import { validatePassword, addToPasswordHistory, setPasswordExpiryDate } from "@/lib/security/passwordValidator";
import { SecurityIncidentService } from "@/lib/security/incidentService";
import { compare, hash } from "bcryptjs";

/**
 * POST /api/users/change-password
 * Changer le mot de passe de l'utilisateur actuel
 */
export async function POST(req: NextRequest) {
  try {
    // Vérifier l'authentification
    const session = await getServerSession(authOptions) as CustomSession;
    
    if (!session) {
      return NextResponse.json(
        { error: "Authentification requise" },
        { status: 401 }
      );
    }
    
    // Récupérer l'adresse IP
    const ipAddress = req.headers.get('x-forwarded-for') || req.ip || 'unknown';
    
    // Récupérer les données du corps de la requête
    const { currentPassword, newPassword, confirmPassword, isFirstLogin, isExpiredPassword } = await req.json();
    
    // Vérifier les données requises
    if (!currentPassword || !newPassword || !confirmPassword) {
      return NextResponse.json(
        { error: "Tous les champs sont obligatoires" },
        { status: 400 }
      );
    }
    
    // Vérifier que les mots de passe correspondent
    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { error: "Le nouveau mot de passe et sa confirmation ne correspondent pas" },
        { status: 400 }
      );
    }
    
    // Récupérer l'utilisateur avec Prisma
    const user = await prisma.user.findUnique({
      where: { id: Number(session.user.id) }
    });
    
    if (!user) {
      return NextResponse.json(
        { error: "Utilisateur non trouvé" },
        { status: 404 }
      );
    }
    
    // Vérifier le mot de passe actuel
    // Ignorer la vérification si c'est la première connexion ou un mot de passe expiré et que c'est spécifié
    const shouldCheckCurrentPassword = !isFirstLogin && !isExpiredPassword;
    
    if (shouldCheckCurrentPassword) {
      const isPasswordValid = await compare(currentPassword, user.password);
      
      if (!isPasswordValid) {
        // Journaliser la tentative échouée
        await SecurityIncidentService.logIncident(
          'failed_login',
          'Échec de changement de mot de passe: mot de passe actuel incorrect',
          ipAddress,
          'info',
          String(session.user.id),
          session.user.email
        );
        
        return NextResponse.json(
          { error: "Le mot de passe actuel est incorrect" },
          { status: 400 }
        );
      }
    }
    
    // Récupérer les paramètres de sécurité
    const securitySettings = await SecuritySettingsService.getSettings();
    
    // Vérifier si les paramètres de sécurité ont été récupérés
    if (!securitySettings) {
      return NextResponse.json(
        { error: "Erreur lors de la récupération des paramètres de sécurité" },
        { status: 500 }
      );
    }
    
    // Valider le nouveau mot de passe selon les règles de sécurité
    const validationResult = await validatePassword(
      newPassword,
      securitySettings,
      String(session.user.id)
    );
    
    if (!validationResult.isValid) {
      return NextResponse.json(
        { 
          error: "Le mot de passe ne respecte pas les règles de sécurité", 
          details: validationResult.errors 
        },
        { status: 400 }
      );
    }
    
    // Hacher le nouveau mot de passe
    const hashedPassword = await hash(newPassword, 10);
    
    // Détecter si c'était la première connexion
    const wasFirstLogin = user.first_login || false;
    const wasPasswordExpired = user.password_expiry_date ? new Date() > user.password_expiry_date : false;
    
    // Définir la nouvelle date d'expiration du mot de passe
    const passwordValidityDays = securitySettings.passwordPolicy.expiryDays || 90;
    const passwordExpiryDate = new Date();
    passwordExpiryDate.setDate(passwordExpiryDate.getDate() + passwordValidityDays);
    
    // Mettre à jour le mot de passe de l'utilisateur avec Prisma
    await prisma.$executeRaw`
      UPDATE users 
      SET 
        password = ${hashedPassword},
        first_login = false,
        password_expiry_date = ${passwordExpiryDate}
      WHERE id = ${Number(session.user.id)}
    `;
    
    // Ajouter le nouveau mot de passe haché à l'historique
    await addToPasswordHistory(
      String(session.user.id),
      hashedPassword,
      securitySettings.passwordPolicy.preventReuse
    );
    
    // Journaliser le changement de mot de passe
    await SecurityIncidentService.logPasswordChange(
      String(session.user.id),
      session.user.email,
      ipAddress
    );
    
    return NextResponse.json({
      success: true,
      message: "Mot de passe changé avec succès",
      wasFirstLogin: wasFirstLogin,
      wasPasswordExpired: wasPasswordExpired,
      requiresReauthentication: true,
      // Indiquer que l'utilisateur devrait être redirigé vers le dashboard
      redirectTo: wasFirstLogin || wasPasswordExpired ? "/dashboard" : undefined
    });
  } catch (error) {
    console.error('Erreur lors du changement de mot de passe:', error);
    return NextResponse.json(
      { error: "Erreur serveur lors du changement de mot de passe" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/users/change-password
 * Forcer le changement de mot de passe d'un utilisateur (admin seulement)
 */
export async function PUT(req: NextRequest) {
  try {
    // Vérifier l'authentification
    const session = await getServerSession(authOptions) as CustomSession;
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: "Accès non autorisé" },
        { status: 403 }
      );
    }
    
    // Récupérer l'adresse IP
    const ipAddress = req.headers.get('x-forwarded-for') || req.ip || 'unknown';
    
    // Récupérer les données du corps de la requête
    const { userId, newPassword, forceFirstLogin, forcePasswordExpiry } = await req.json();
    
    // Vérifier les données requises
    if (!userId || !newPassword) {
      return NextResponse.json(
        { error: "L'ID utilisateur et le nouveau mot de passe sont obligatoires" },
        { status: 400 }
      );
    }
    
    // Récupérer l'utilisateur avec Prisma
    let user;
    try {
      user = await prisma.user.findUnique({
        where: { id: Number(userId) }
      });
    } catch (error) {
      return NextResponse.json(
        { error: "ID utilisateur invalide" },
        { status: 400 }
      );
    }
    
    if (!user) {
      return NextResponse.json(
        { error: "Utilisateur non trouvé" },
        { status: 404 }
      );
    }
    
    // Récupérer les paramètres de sécurité
    const securitySettings = await SecuritySettingsService.getSettings();
    
    // Vérifier si les paramètres de sécurité ont été récupérés
    if (!securitySettings) {
      return NextResponse.json(
        { error: "Erreur lors de la récupération des paramètres de sécurité" },
        { status: 500 }
      );
    }
    
    // Valider le nouveau mot de passe selon les règles de sécurité
    const validationResult = await validatePassword(
      newPassword,
      securitySettings
    );
    
    if (!validationResult.isValid) {
      return NextResponse.json(
        { 
          error: "Le mot de passe ne respecte pas les règles de sécurité", 
          details: validationResult.errors 
        },
        { status: 400 }
      );
    }
    
    // Hacher le nouveau mot de passe
    const hashedPassword = await hash(newPassword, 10);
    
    // Définir la date d'expiration du mot de passe
    let passwordExpiryDate = null;
    
    if (forcePasswordExpiry) {
      // Définir la date d'expiration immédiate (date passée)
      passwordExpiryDate = new Date();
      passwordExpiryDate.setDate(passwordExpiryDate.getDate() - 1);
    } else {
      // Définir la date d'expiration normale
      const passwordValidityDays = securitySettings.passwordPolicy.expiryDays || 90;
      passwordExpiryDate = new Date();
      passwordExpiryDate.setDate(passwordExpiryDate.getDate() + passwordValidityDays);
    }
    
    // Mettre à jour le mot de passe de l'utilisateur avec Prisma
    await prisma.$executeRaw`
      UPDATE users 
      SET 
        password = ${hashedPassword},
        first_login = ${forceFirstLogin ?? false},
        password_expiry_date = ${passwordExpiryDate}
      WHERE id = ${Number(userId)}
    `;
    
    // Ajouter le nouveau mot de passe haché à l'historique
    await addToPasswordHistory(
      String(userId),
      hashedPassword,
      securitySettings.passwordPolicy.preventReuse
    );
    
    // Journaliser le changement de mot de passe
    await SecurityIncidentService.logPasswordChange(
      String(userId),
      user.email,
      ipAddress,
      true // C'est une réinitialisation par admin
    );
    
    return NextResponse.json({
      success: true,
      message: "Mot de passe de l'utilisateur changé avec succès",
      forceFirstLogin: forceFirstLogin,
      forcePasswordExpiry: forcePasswordExpiry
    });
  } catch (error) {
    console.error('Erreur lors du changement de mot de passe:', error);
    return NextResponse.json(
      { error: "Erreur serveur lors du changement de mot de passe" },
      { status: 500 }
    );
  }
}