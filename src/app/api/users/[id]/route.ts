import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { hash, compare } from 'bcryptjs';
import { z } from 'zod';
import { authOptions, isAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { SecurityIncidentService } from '@/lib/security/incidentService';
import { validatePassword, addToPasswordHistory, setPasswordExpiryDate } from '@/lib/security/passwordValidator';
import { AuthLogger } from '@/lib/security/authLogger';

// Schéma de validation pour la mise à jour d'un utilisateur
const updateUserSchema = z.object({
  name: z.string().min(3, "Le nom doit contenir au moins 3 caractères").optional(),
  email: z.string().email("Format d'email invalide").optional(), 
  role: z.enum(['admin', 'operator', 'viewer', 'user']).optional(),
  status: z.enum(['active', 'inactive', 'suspended']).optional(),
  first_login: z.boolean().optional(),
  profileIds: z.array(z.number()).optional()
});

/**
 * GET /api/users/[id] - Récupérer un utilisateur spécifique
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Vérification de l'authentification
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Authentification requise" }, { status: 401 });
    }

    const userId = Number(params.id);
    if (isNaN(userId)) {
      return NextResponse.json({ error: "ID d'utilisateur invalide" }, { status: 400 });
    }

    // Corriger la vérification des permissions - utiliser le type any pour session temporairement
    const isOwnProfile = String(session.user.id) === String(userId);
    if (!(session.user.role === 'admin') && !isOwnProfile) {
      return NextResponse.json({ error: "Permission refusée" }, { status: 403 });
    }

    // Récupérer l'utilisateur
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        first_login: true,
        created_at: true,
        updated_at: true,
        // Supprimer les champs non reconnus
        user_profiles: {
          select: {
            profile: {
              select: {
                id: true,
                name: true,
                description: true
              }
            }
          }
        }
      }
    });

    if (!user) {
      return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });
    }

    // Transformer les données pour le retour
    const profiles = user.user_profiles.map(up => up.profile);
    const profileIds = profiles.map(p => p.id);
    const profileNames = profiles.map(p => p.name);
    
    // Récupérer la dernière connexion depuis les logs d'authentification
    const lastLogin = await AuthLogger.getLastLoginDate(userId);
    
    const userData = {
      ...user,
      user_profiles: undefined, // Supprimer le format d'origine
      profiles, // Ajouter le format simplifié
      profileIds, // Ajouter les IDs de profil dans le format attendu
      profileNames, // Ajouter les noms de profil dans le format attendu
      status: user.status || 'active', // S'assurer que le statut est défini
      lastLogin // Utiliser la valeur récupérée des logs d'authentification
    };

    // Journaliser la consultation du profil
    if (!isOwnProfile) {
      await SecurityIncidentService.logIncident(
        'admin_action',
        `Consultation du profil utilisateur: ${user.email}`,
        req.headers.get('x-forwarded-for') || 'unknown',
        'info',
        session.user?.id ? String(session.user.id) : undefined,
        session.user?.email || ''
      );
    }

    return NextResponse.json(userData);
  } catch (error: any) {
    console.error('Erreur lors de la récupération de l\'utilisateur:', error);
    return NextResponse.json(
      { error: "Erreur serveur lors de la récupération de l'utilisateur" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/users/[id] - Mettre à jour un utilisateur
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Vérification de l'authentification
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Authentification requise" }, { status: 401 });
    }

    const userId = Number(params.id);
    if (isNaN(userId)) {
      return NextResponse.json({ error: "ID d'utilisateur invalide" }, { status: 400 });
    }

    // Corriger la vérification des permissions - utiliser le type any pour session temporairement
    const isOwnProfile = String(session.user.id) === String(userId);
    if (!(session.user.role === 'admin') && !isOwnProfile) {
      return NextResponse.json({ error: "Permission refusée" }, { status: 403 });
    }

    // Récupérer les données du corps de la requête
    const body = await req.json();
    
    // Valider les données
    const validationResult = updateUserSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Données invalides", details: validationResult.error.format() },
        { status: 400 }
      );
    }
    
    const { name, email, role, status, first_login, profileIds } = validationResult.data;

    // Vérifier si l'utilisateur existe
    const existingUser = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!existingUser) {
      return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });
    }

    // Si on modifie l'email, vérifier qu'il n'est pas déjà utilisé
    if (email && email !== existingUser.email) {
      const emailExists = await prisma.user.findUnique({
        where: { email }
      });

      if (emailExists) {
        return NextResponse.json(
          { error: "Cet email est déjà utilisé par un autre utilisateur" },
          { status: 400 }
        );
      }
    }

    // Limiter les champs que les non-admins peuvent modifier sur leur propre profil
    let updateData: any = {};
    
    if (session.user.role === 'admin') {
      // Les admins peuvent tout modifier
      if (name !== undefined) updateData.name = name;
      if (email !== undefined) updateData.email = email;
      if (role !== undefined) updateData.role = role;
      if (status !== undefined) updateData.status = status;
      if (first_login !== undefined) updateData.first_login = first_login;
    } else if (isOwnProfile) {
      // Les utilisateurs ne peuvent changer que leur nom
      if (name !== undefined) updateData.name = name;
    }

    // Mise à jour de l'horodatage
    updateData.updated_at = new Date();

    // Mise à jour de l'utilisateur
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        first_login: true,
        created_at: true,
        updated_at: true
      }
    });

    // Mettre à jour les associations de profils si spécifiées (admin uniquement)
    if (session.user.role === 'admin' && profileIds !== undefined) {
      // Supprimer toutes les associations existantes
      await prisma.userProfile.deleteMany({
        where: { user_id: userId }
      });

      // Créer les nouvelles associations
      if (profileIds.length > 0) {
        await Promise.all(profileIds.map(profileId =>
          prisma.userProfile.create({
            data: {
              user_id: userId,
              profile_id: profileId
            }
          })
        ));
      }
    }

    // Journaliser la mise à jour
    await SecurityIncidentService.logIncident(
      session.user.role === 'admin' ? 'admin_action' : 'admin_action',
      `Utilisateur mis à jour: ${updatedUser.email}`,
      req.headers.get('x-forwarded-for') || 'unknown',
      'info',
      session.user?.id ? String(session.user.id) : undefined,
      session.user?.email || ''
    );

    return NextResponse.json({
      user: updatedUser,
      message: "Utilisateur mis à jour avec succès"
    });
  } catch (error: any) {
    console.error('Erreur lors de la mise à jour de l\'utilisateur:', error);
    return NextResponse.json(
      { error: "Erreur serveur lors de la mise à jour de l'utilisateur" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/users/[id] - Supprimer un utilisateur
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Vérification de l'authentification
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Authentification requise" }, { status: 401 });
    }

    // Seuls les admins peuvent supprimer des utilisateurs
    if (!(session.user.role === 'admin')) {
      return NextResponse.json({ error: "Permission refusée" }, { status: 403 });
    }

    const userId = Number(params.id);
    if (isNaN(userId)) {
      return NextResponse.json({ error: "ID d'utilisateur invalide" }, { status: 400 });
    }

    // Vérifier si l'utilisateur existe
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true }
    });

    if (!user) {
      return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });
    }

    // Vérifier que l'admin ne se supprime pas lui-même
    if (Number(userId) === Number(session.user.id)) {
      return NextResponse.json(
        { error: "Vous ne pouvez pas supprimer votre propre compte" },
        { status: 400 }
      );
    }

    // Supprimer d'abord toutes les associations
    await prisma.userProfile.deleteMany({
      where: { user_id: userId }
    });

    // Supprimer l'historique des mots de passe
    await prisma.password_history.deleteMany({
      where: { user_id: userId }
    });

    // Supprimer l'utilisateur
    await prisma.user.delete({
      where: { id: userId }
    });

    // Journaliser la suppression
    await SecurityIncidentService.logIncident(
      'admin_action',
      `Utilisateur supprimé: ${user.email}`,
      req.headers.get('x-forwarded-for') || 'unknown',
      'warning',
      session.user?.id ? String(session.user.id) : undefined,
      session.user?.email || ''
    );

    return NextResponse.json({
      message: "Utilisateur supprimé avec succès"
    });
  } catch (error: any) {
    console.error('Erreur lors de la suppression de l\'utilisateur:', error);
    return NextResponse.json(
      { error: "Erreur serveur lors de la suppression de l'utilisateur" },
      { status: 500 }
    );
  }
}

// PATCH /api/users/[id] - Mettre à jour partiellement un utilisateur (exemple: changer le mot de passe)
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Vérifier l'authentification
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: "Authentification requise" }, { status: 401 });
    }
    
    const { id: userId } = params;
    
    // Vérifier si l'utilisateur existe
    const user = await prisma.user.findUnique({
      where: { id: Number(userId) }
    });
    
    if (!user) {
      return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });
    }
    
    // L'utilisateur ne peut modifier que son propre mot de passe, sauf s'il est admin
    if (Number(userId) !== Number(session.user.id) && session.user.role !== 'admin') {
      return NextResponse.json(
        { error: "Vous ne pouvez pas modifier le mot de passe d'un autre utilisateur" },
        { status: 403 }
      );
    }
    
    // Extraire les données de la requête
    const body = await req.json();
    
    // Vérifier si la requête concerne un changement de mot de passe
    if (body.newPassword) {
      
      // Récupérer les paramètres de sécurité
      const securitySettings = await prisma.security_settings.findFirst({
        orderBy: { updated_at: 'desc' }
      });
      
      // Si aucun paramètre, utiliser les paramètres par défaut
      const passwordPolicy = securitySettings || {
        min_password_length: 8,
        require_uppercase: true,
        require_numbers: true,
        require_special_chars: true,
        password_history_count: 3
      };
      
      // Vérifier l'ancien mot de passe si ce n'est pas un admin
      if (session.user.role !== 'admin' && body.currentPassword) {
        const isPasswordValid = await compare(body.currentPassword, user.password);
        
        if (!isPasswordValid) {
          return NextResponse.json({ error: "Mot de passe actuel incorrect" }, { status: 400 });
        }
      }
      
      // Valider le nouveau mot de passe
      const passwordValidationResult = await validatePassword(
        body.newPassword, 
        {
          passwordPolicy: {
            minLength: securitySettings?.min_password_length || 8,
            requireUppercase: securitySettings?.require_uppercase || true,
            requireLowercase: true,
            requireNumbers: securitySettings?.require_numbers || true,
            requireSpecialChars: securitySettings?.require_special_chars || true,
            preventReuse: securitySettings?.password_history_count || 3,
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
            singleSessionOnly: false
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
        },
        userId
      );
      
      if (!passwordValidationResult.isValid) {
        return NextResponse.json(
          { error: "Le nouveau mot de passe ne respecte pas les critères de sécurité", details: passwordValidationResult.errors },
          { status: 400 }
        );
      }
      
      // Hasher le nouveau mot de passe
      const hashedPassword = await hash(body.newPassword, 10);
      
      // Mettre à jour le mot de passe
      await prisma.user.update({
        where: { id: Number(userId) },
        data: { 
          password: hashedPassword,
          first_login: false,
          updated_at: new Date()
        }
      });
      
      // Ajouter le nouveau mot de passe à l'historique
      await addToPasswordHistory(userId, hashedPassword, passwordPolicy.password_history_count || 3);
      
      // Mettre à jour la date d'expiration du mot de passe
      await setPasswordExpiryDate(userId);
      
      // Journaliser le changement de mot de passe
      await SecurityIncidentService.logIncident(
        session.user.role === 'admin' ? 'admin_action' : 'admin_action',
        `Mot de passe modifié pour l'utilisateur: ${user.email}`,
        req.headers.get('x-forwarded-for') || 'unknown',
        'info',
        String(session.user.id),
        session.user.email || ''
      );
      
      return NextResponse.json({ message: "Mot de passe mis à jour avec succès" });
    }
    
    // Si ce n'est pas un changement de mot de passe
    return NextResponse.json({ error: "Opération non supportée" }, { status: 400 });
  } catch (error: any) {
    console.error('Erreur lors de la mise à jour du mot de passe:', error);
    return NextResponse.json(
      { error: "Erreur serveur lors de la mise à jour du mot de passe" },
      { status: 500 }
    );
  }
} 