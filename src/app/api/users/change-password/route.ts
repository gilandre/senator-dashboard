import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, CustomSession } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/models/User";
import { SecuritySettingsService } from "@/services/security-settings-service";
import { validatePassword, addToPasswordHistory } from "@/lib/security/passwordValidator";
import { SecurityIncidentService } from "@/lib/security/incidentService";
import { compare } from "bcryptjs";
import mongoose from "mongoose";

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
    const { currentPassword, newPassword, confirmPassword } = await req.json();
    
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
    
    // Connecter à la base de données
    await connectToDatabase();
    
    // Récupérer l'utilisateur
    const user = await User.findById(session.user.id);
    
    if (!user) {
      return NextResponse.json(
        { error: "Utilisateur non trouvé" },
        { status: 404 }
      );
    }
    
    // Vérifier le mot de passe actuel
    const isPasswordValid = await compare(currentPassword, user.password);
    
    if (!isPasswordValid) {
      // Journaliser la tentative échouée
      await SecurityIncidentService.logIncident(
        'failed_login',
        'Échec de changement de mot de passe: mot de passe actuel incorrect',
        ipAddress,
        'info',
        session.user.id,
        session.user.email
      );
      
      return NextResponse.json(
        { error: "Le mot de passe actuel est incorrect" },
        { status: 400 }
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
      securitySettings,
      session.user.id
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
    
    // Mettre à jour le mot de passe de l'utilisateur
    user.password = newPassword;
    
    // Si c'était la première connexion, mettre à jour le flag
    const wasFirstLogin = user.firstLogin;
    if (user.firstLogin) {
      user.firstLogin = false;
    }
    
    // Enregistrer les modifications
    await user.save();
    
    // Ajouter le nouveau mot de passe haché à l'historique
    await addToPasswordHistory(
      session.user.id,
      user.password,
      securitySettings.passwordPolicy.preventReuse
    );
    
    // Journaliser le changement de mot de passe
    await SecurityIncidentService.logPasswordChange(
      session.user.id,
      session.user.email,
      ipAddress
    );
    
    return NextResponse.json({
      success: true,
      message: "Mot de passe changé avec succès",
      wasFirstLogin: wasFirstLogin,
      requiresReauthentication: true,
      // Indiquer que l'utilisateur devrait être redirigé vers le dashboard
      redirectTo: wasFirstLogin ? "/dashboard" : undefined
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
    const { userId, newPassword, forceFirstLogin } = await req.json();
    
    // Vérifier les données requises
    if (!userId || !newPassword) {
      return NextResponse.json(
        { error: "L'ID utilisateur et le nouveau mot de passe sont obligatoires" },
        { status: 400 }
      );
    }
    
    // Connecter à la base de données
    await connectToDatabase();
    
    // Récupérer l'utilisateur
    let user;
    try {
      user = await User.findById(new mongoose.Types.ObjectId(userId));
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
    
    // Mettre à jour le mot de passe de l'utilisateur
    user.password = newPassword;
    
    // Si forceFirstLogin est vrai, forcer le changement du mot de passe à la prochaine connexion
    if (forceFirstLogin) {
      user.firstLogin = true;
    }
    
    // Enregistrer les modifications
    await user.save();
    
    // Ajouter le nouveau mot de passe haché à l'historique
    await addToPasswordHistory(
      userId,
      user.password,
      securitySettings.passwordPolicy.preventReuse
    );
    
    // Journaliser le changement de mot de passe
    await SecurityIncidentService.logPasswordChange(
      session.user.id, // ID de l'administrateur qui a fait le changement
      session.user.email,
      ipAddress,
      true // C'est une réinitialisation
    );
    
    return NextResponse.json({
      success: true,
      message: "Mot de passe changé avec succès",
    });
  } catch (error) {
    console.error('Erreur lors du changement de mot de passe:', error);
    return NextResponse.json(
      { error: "Erreur serveur lors du changement de mot de passe" },
      { status: 500 }
    );
  }
}