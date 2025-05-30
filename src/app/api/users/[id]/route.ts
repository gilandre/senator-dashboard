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
  role_id: z.number().optional(),
  role: z.enum(['admin', 'operator', 'viewer', 'user']).optional(),
  status_id: z.number().optional(),
  status: z.enum(['active', 'inactive']).optional(),
  first_login: z.boolean().optional(),
  profileIds: z.array(z.number()).optional()
});

// Schéma de validation pour le changement de mot de passe
const changePasswordSchema = z.object({
  currentPassword: z.string(),
  newPassword: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères")
});

/**
 * GET /api/users/[id] - Récupérer un utilisateur spécifique
 */
export async function GET(
  req: NextRequest,
  context: { params: { id: string } }
) {
  try {
    // Vérification de l'authentification
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Authentification requise" }, { status: 401 });
    }

    // Utiliser params.id de manière sûre
    const userId = Number(context.params.id);
    if (isNaN(userId)) {
      return NextResponse.json({ error: "ID d'utilisateur invalide" }, { status: 400 });
    }

    // Vérifier les permissions
    const isOwnProfile = String(session?.user?.id) === String(userId);
    if (!isAdmin(session as any) && !isOwnProfile) {
      return NextResponse.json({ error: "Permission refusée" }, { status: 403 });
    }

    // Récupérer l'utilisateur
    const user = await prisma.users.findUnique({
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
    const profiles = user.user_profiles?.map(up => up.profile) || [];
    const profileIds = profiles.map(p => p.id);
    
    return NextResponse.json({
      ...user,
      profileIds,
      profiles
    });
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'utilisateur:', error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération de l'utilisateur" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/users/[id] - Mettre à jour un utilisateur
 */
export async function PUT(
  req: NextRequest,
  context: { params: { id: string } }
) {
  try {
    // Vérifier l'authentification
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // Utiliser params.id de manière sûre
    const userId = Number(context.params.id);
    if (isNaN(userId)) {
      return NextResponse.json({ error: "ID d'utilisateur invalide" }, { status: 400 });
    }

    // Vérifier les permissions
    const isOwnProfile = String(session?.user?.id) === String(userId);
    if (!isAdmin(session as any) && !isOwnProfile) {
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
    
    const { name, email, role_id, role, status_id, status, first_login, profileIds } = validationResult.data;

    // Vérifier si l'utilisateur existe
    const existingUser = await prisma.users.findUnique({
      where: { id: userId }
    });

    if (!existingUser) {
      return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });
    }

    // Si on modifie l'email, vérifier qu'il n'est pas déjà utilisé
    if (email && email !== existingUser.email) {
      const emailExists = await prisma.users.findUnique({
        where: { email }
      });

      if (emailExists) {
        return NextResponse.json(
          { error: "Cet email est déjà utilisé par un autre utilisateur" },
          { status: 400 }
        );
      }
    }

    // Exécuter les opérations dans une transaction
    const updatedUser = await prisma.$transaction(async (tx) => {
      if (profileIds) {
        // Supprimer tous les profils existants
        await tx.userProfile.deleteMany({
          where: { user_id: userId }
        });
        
        // Ajouter les nouveaux profils
        for (const profileId of profileIds) {
          await tx.userProfile.create({
            data: {
              user_id: userId,
              profile_id: profileId
            }
          });
        }
      }
      
      // Construire les données de mise à jour
      const updateData: any = {
        updated_at: new Date()
      };
      
      if (name) updateData.name = name;
      if (email) updateData.email = email;
      if (first_login !== undefined) updateData.first_login = first_login;
      
      // Si role_id est fourni, mettre à jour role et role_id
      if (role_id) {
        // Récupérer le rôle correspondant à l'ID
        const roleRecord = await prisma.roles.findUnique({
          where: { id: role_id }
        });
        
        if (roleRecord) {
          // Mise à jour synchronisée de role et role_id
          updateData.role = roleRecord.name as any; // Cast en any pour éviter l'erreur de type
          updateData.role_id = role_id;
          
          console.log("Mise à jour utilisateur avec le rôle:", {
            role: roleRecord.name,
            role_id: role_id
          });
        }
      }
      // Si seul role est fourni, rechercher le role_id correspondant
      else if (role) {
        // Vérifier si le role est une valeur valide pour l'enum
        if (['admin', 'operator', 'viewer', 'user'].includes(role)) {
          // Rechercher l'ID du rôle correspondant
          const roleRecord = await prisma.roles.findFirst({
            where: { name: role }
          });
          
          if (roleRecord) {
            // Mise à jour synchronisée de role et role_id
            updateData.role = role as any; // Cast en any pour éviter l'erreur de type
            updateData.role_id = roleRecord.id;
            
            console.log("Mise à jour utilisateur avec le rôle par nom:", {
              role: role,
              role_id: roleRecord.id
            });
          }
        }
      }
      
      if (status_id) {
        // Pour l'instant, utilisons une mise à jour SQL directe pour status_id
        await tx.$executeRaw`UPDATE users SET status_id = ${status_id} WHERE id = ${userId}`;
      } else if (status) {
        // Mettre à jour le champ status (enum)
        await tx.users.update({
          where: { id: userId },
          data: { status }
        });
        
        // Si un status est fourni, essayer de trouver l'ID correspondant dans reference_data
        try {
          const statusRef = await tx.$queryRawUnsafe(
            `SELECT id FROM reference_data WHERE type = ? AND code = ? AND module = ?`,
            'status',
            status,
            'users'
          );
          
          if (Array.isArray(statusRef) && statusRef.length > 0) {
            await tx.$executeRaw`UPDATE users SET status_id = ${statusRef[0].id} WHERE id = ${userId}`;
          }
        } catch (error) {
          console.error('Erreur lors de la récupération du status_id:', error);
        }
      }
      
      // Récupérer l'utilisateur mis à jour avec une requête SQL directe pour inclure tous les champs
      const updatedUserData = await tx.$queryRaw`
        SELECT 
          u.id, u.name, u.email, u.role, u.status, u.first_login, u.updated_at,
          u.role_id, u.status_id
        FROM users u
        WHERE u.id = ${userId}
      `;
      
      return Array.isArray(updatedUserData) && updatedUserData.length > 0 
        ? updatedUserData[0] 
        : null;
    });

    if (!updatedUser) {
      return NextResponse.json({ error: "Erreur lors de la mise à jour de l'utilisateur" }, { status: 500 });
    }

    // Récupérer les profils de l'utilisateur
    const userProfiles = await prisma.userProfile.findMany({
      where: { user_id: userId },
      include: {
        profile: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    const profiles = userProfiles.map(up => up.profile);
    const userProfileIds = profiles.map(p => p.id);

    // Enregistrer l'activité
    await AuthLogger.logActivity(
      session.user.id,
      "update_user",
      `users/${userId}`,
      { role: updatedUser.role, status: updatedUser.status }
    );

    return NextResponse.json({
      ...updatedUser,
      userProfileIds,
      profiles
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour de l\'utilisateur:', error);
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour de l'utilisateur" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/users/[id] - Supprimer un utilisateur
 */
export async function DELETE(
  req: NextRequest,
  context: { params: { id: string } }
) {
  try {
    // Vérification de l'authentification
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Authentification requise" }, { status: 401 });
    }

    // Seuls les admins peuvent désactiver des utilisateurs
    if (!isAdmin(session as any)) {
      return NextResponse.json({ error: "Permission refusée" }, { status: 403 });
    }

    // Utiliser params.id de manière sûre
    const userId = Number(context.params.id);
    if (isNaN(userId)) {
      return NextResponse.json({ error: "ID d'utilisateur invalide" }, { status: 400 });
    }

    // Empêcher la désactivation de son propre compte
    if (String(session.user.id) === String(userId)) {
      return NextResponse.json(
        { error: "Vous ne pouvez pas désactiver votre propre compte" },
        { status: 400 }
      );
    }

    // Vérifier si l'utilisateur existe
    const existingUser = await prisma.users.findUnique({
      where: { id: userId }
    });

    if (!existingUser) {
      return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });
    }

    // Désactiver l'utilisateur plutôt que de le supprimer
    await prisma.users.update({
      where: { id: userId },
      data: {
        status: 'inactive',
        updated_at: new Date()
      }
    });

    // Enregistrer l'activité
    await AuthLogger.logActivity(
      session.user.id,
      "deactivate_user", 
      `users/${userId}`,
      { newStatus: "inactive" }
    );

    return NextResponse.json({ message: "Utilisateur désactivé avec succès" });
  } catch (error) {
    console.error('Erreur lors de la désactivation de l\'utilisateur:', error);
    return NextResponse.json(
      { error: "Erreur lors de la désactivation de l'utilisateur" },
      { status: 500 }
    );
  }
}

// PATCH /api/users/[id] - Mettre à jour partiellement un utilisateur (exemple: changer le mot de passe)
export async function PATCH(
  req: NextRequest, 
  context: { params: { id: string } }
) {
  try {
    // Vérifier l'authentification
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: "Authentification requise" }, { status: 401 });
    }
    
    // Utiliser params.id de manière sûre
    const userId = Number(context.params.id);
    
    // Vérifier si l'utilisateur existe
    const user = await prisma.users.findUnique({
      where: { id: userId }
    });
    
    if (!user) {
      return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });
    }
    
    // L'utilisateur ne peut modifier que son propre mot de passe, sauf s'il est admin
    if (userId !== Number(session.user.id) && session.user.role !== 'admin') {
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
        String(userId)
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
      await prisma.users.update({
        where: { id: userId },
        data: { 
          password: hashedPassword,
          first_login: false,
          updated_at: new Date()
        }
      });
      
      // Ajouter le nouveau mot de passe à l'historique
      await addToPasswordHistory(String(userId), hashedPassword, passwordPolicy.password_history_count || 3);
      
      // Mettre à jour la date d'expiration du mot de passe
      await setPasswordExpiryDate(String(userId));
      
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