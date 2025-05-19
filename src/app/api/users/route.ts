import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import User, { IUser } from '@/models/User';
import Profile from '@/models/Profile';  // Import direct du modèle Profile
import { connectToDatabase } from '@/lib/database';
import { getServerSession } from 'next-auth';
import { authOptions, isAdmin, CustomSession } from '@/lib/auth';
import { Session } from 'next-auth';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { JwtPayload } from 'jsonwebtoken';
import SecuritySettings, { ISecuritySettings } from '@/models/SecuritySettings';
import { validatePassword, PasswordValidationResult } from '@/lib/security/passwordValidator';
import { prisma } from '@/lib/prisma';
import { SecurityIncidentService } from '@/lib/security/incidentService';
import { AuthLogger } from '@/lib/security/authLogger';
import { hash } from 'bcryptjs';
import { setPasswordExpiryDate } from '@/lib/security/passwordValidator';
import { addToPasswordHistory } from '@/lib/security/passwordValidator';

// Interface pour notre JWT payload
interface CustomJwtPayload extends JwtPayload {
  userId: string;
  role?: string;
}

// Schéma de validation pour la création d'un utilisateur
const userSchema = z.object({
  name: z.string().min(1, { message: "Le nom est obligatoire" }),
  email: z.string().email({ message: "Format d'email invalide" }),
  password: z.string().min(1, { message: "Le mot de passe est obligatoire" }),
  profileId: z.string().min(1, { message: "Le profil est obligatoire" })
});

// Schéma de validation pour la création d'un utilisateur
const createUserSchema = z.object({
  name: z.string().min(3, "Le nom doit contenir au moins 3 caractères"),
  email: z.string().email("Format d'email invalide"),
  password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères"),
  role: z.enum(['admin', 'operator', 'viewer', 'user']).default('user'),
  status: z.enum(['active', 'inactive', 'suspended']).default('active'),
  profileIds: z.array(z.number()).optional(),
  first_login: z.boolean().optional().default(true)
});

// Schéma de validation pour la mise à jour d'un utilisateur
const updateUserSchema = z.object({
  name: z.string().min(3, "Le nom doit contenir au moins 3 caractères").optional(),
  email: z.string().email("Format d'email invalide").optional(),
  role: z.enum(['admin', 'operator', 'viewer', 'user']).optional(),
  profileIds: z.array(z.number()).optional(),
});

// Fonction pour vérifier le token JWT
async function verifyToken(authHeader: string | null): Promise<CustomJwtPayload | null> {
  console.log('AuthHeader:', authHeader);
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('Token manquant ou format incorrect');
    return null;
  }

  const token = authHeader.split(' ')[1];
  console.log('Token à vérifier:', token);
  
  try {
    // Vérifier la clé secrète utilisée
    const secret = process.env.NEXTAUTH_SECRET || 'your_jwt_secret';
    console.log('Clé secrète utilisée (début uniquement):', secret.substring(0, 3) + '...');
    
    // Vérifier le token avec la clé secrète JWT
    const decoded = jwt.verify(token, secret);
    console.log('Token décodé:', decoded);
    return decoded as CustomJwtPayload;
  } catch (error) {
    console.error('Erreur de vérification du token:', error);
    return null;
  }
}

// Fonctions pour vérifier l'authentification et l'autorisation
async function checkAuth(req: NextRequest) {
  // Vérifier d'abord la session NextAuth
  console.log('Vérification de session et token...');
  const session = await getServerSession(authOptions) as CustomSession | null;
  
  if (session) {
    console.log('Session trouvée:', session.user);
    return { 
      isAuthenticated: true, 
      isAdmin: isAdmin(session),
      userId: session.user.id
    };
  } else {
    console.log('Pas de session trouvée, vérification du token');
  }
  
  // Si pas de session, vérifier le token Bearer
  const authHeader = req.headers.get('authorization');
  const tokenData = await verifyToken(authHeader);
  
  if (tokenData) {
    console.log('Token validé:', tokenData);
    return { 
      isAuthenticated: true, 
      isAdmin: tokenData.role === 'admin',
      userId: tokenData.userId
    };
  } else {
    console.log('Token invalide ou inexistant');
  }
  
  // Ni session ni token valide
  return { isAuthenticated: false, isAdmin: false, userId: null };
}

// GET /api/users - Récupérer la liste des utilisateurs
export async function GET(req: NextRequest) {
  try {
    // Vérifier l'authentification et les permissions
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: "Authentification requise" }, { status: 401 });
    }
    
    // Seuls les admins peuvent voir la liste complète des utilisateurs
    if (!(session.user.role === 'admin')) {
      return NextResponse.json({ error: "Permission refusée" }, { status: 403 });
    }
    
    // Extraire les paramètres de requête
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const search = url.searchParams.get('search') || '';
    const role = url.searchParams.get('role') || '';
    
    // Calculer le décalage pour la pagination
    const skip = (page - 1) * limit;
    
    // Construire la requête avec les filtres
    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } }
      ];
    }
    if (role) {
      where.role = role;
    }
    
    // Récupérer les utilisateurs avec pagination
    const users = await prisma.user.findMany({
      where,
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
                name: true
              }
            }
          }
        }
      },
      skip,
      take: limit,
      orderBy: { name: 'asc' }
    });
    
    // Récupérer les dernières connexions pour tous les utilisateurs
    const formattedUsers = await Promise.all(users.map(async user => {
      // Extraire les informations de profil
      const profileIds = user.user_profiles?.map(up => up.profile.id) || [];
      const profileNames = user.user_profiles?.map(up => up.profile.name) || [];
      
      // Récupérer la dernière connexion depuis les logs d'authentification
      const lastLogin = await AuthLogger.getLastLoginDate(user.id);
      
      return {
        ...user,
        // Standardiser les noms des champs pour le frontend
        profileIds,
        profileNames,
        // S'assurer que les champs sont au bon format
        status: user.status || 'active',
        lastLogin, // Utiliser la valeur récupérée des logs d'authentification
        first_login: user.first_login
      };
    }));
    
    // Compter le nombre total d'utilisateurs pour la pagination
    const total = await prisma.user.count({ where });
    
    // Journaliser l'accès à la liste des utilisateurs
    await SecurityIncidentService.logIncident(
      'admin_action',
      `Liste des utilisateurs consultée`,
      req.headers.get('x-forwarded-for') || 'unknown',
      'info',
      String(session.user.id),
      session.user.email || ''
    );
    
    return NextResponse.json({
      users: formattedUsers,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error: any) {
    console.error('Erreur lors de la récupération des utilisateurs:', error);
    return NextResponse.json(
      { error: "Erreur serveur lors de la récupération des utilisateurs" },
      { status: 500 }
    );
  }
}

// POST /api/users - Créer un nouvel utilisateur
export async function POST(req: NextRequest) {
  try {
    // Vérifier l'authentification et les permissions
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: "Authentification requise" }, { status: 401 });
    }
    
    // Seuls les admins peuvent créer des utilisateurs
    if (!(session.user.role === 'admin')) {
      return NextResponse.json({ error: "Permission refusée" }, { status: 403 });
    }
    
    // Extraire les données
    const body = await req.json();
    
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
    
    // Valider les champs obligatoires
    const validationResult = createUserSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Données invalides", details: validationResult.error.format() },
        { status: 400 }
      );
    }
    
    const { name, email, password, role, status, profileIds, first_login } = validationResult.data;
    
    // Valider le mot de passe selon les règles de sécurité définies
    const passwordValidationResult = await validatePassword(
      password, 
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
      }
    );
    
    if (!passwordValidationResult.isValid) {
      return NextResponse.json(
        { error: "Le mot de passe ne respecte pas les critères de sécurité", details: passwordValidationResult.errors },
        { status: 400 }
      );
    }
    
    // Vérifier si l'email est déjà utilisé
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });
    
    if (existingUser) {
      return NextResponse.json(
        { error: "Un utilisateur avec cet email existe déjà" },
        { status: 400 }
      );
    }
    
    // Hacher le mot de passe
    const hashedPassword = await hash(password, 10);
    
    // Créer l'utilisateur
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role,
        status,
        first_login: first_login ?? true,
        created_at: new Date(),
        updated_at: new Date()
      }
    });
    
    // Définir la date d'expiration du mot de passe (90 jours par défaut)
    await setPasswordExpiryDate(String(user.id));
    
    // Associer les profils si fournis
    if (profileIds && profileIds.length > 0) {
      await Promise.all(profileIds.map(profileId => 
        prisma.userProfile.create({
          data: {
            user_id: user.id,
            profile_id: profileId
          }
        })
      ));
    }
    
    // Ajouter le mot de passe à l'historique
    await addToPasswordHistory(String(user.id), hashedPassword, passwordPolicy.password_history_count || 3);
    
    // Journaliser la création de l'utilisateur
    await SecurityIncidentService.logIncident(
      'admin_action',
      `Utilisateur créé: ${email}`,
      req.headers.get('x-forwarded-for') || 'unknown',
      'info',
      String(session.user.id),
      session.user.email || ''
    );
    
    // Journaliser dans les logs d'authentification
    await AuthLogger.logAuthEvent(
      'login_success',
      email,
      req.headers.get('x-forwarded-for') || 'unknown',
      String(user.id),
      "Compte créé par administrateur"
    );
    
    return NextResponse.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      first_login: user.first_login,
      created_at: user.created_at
    }, { status: 201 });
  } catch (error: any) {
    console.error('Erreur lors de la création de l\'utilisateur:', error);
    return NextResponse.json(
      { error: "Erreur serveur lors de la création de l'utilisateur" },
      { status: 500 }
    );
  }
}

// PUT /api/users - Mettre à jour un utilisateur
export async function PUT(req: NextRequest) {
  try {
    const { isAuthenticated, isAdmin } = await checkAuth(req);

    if (!isAuthenticated) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // Vérifier si l'utilisateur est un admin pour mettre à jour un utilisateur
    if (!isAdmin) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    await connectToDatabase();
    
    const body = await req.json();
    console.log('Données reçues:', body);
    
    // Vérifier si l'id est présent
    if (!body.id) {
      return NextResponse.json(
        { error: "ID d'utilisateur manquant" },
        { status: 400 }
      );
    }

    // Vérifier si l'utilisateur existe
    const user = await User.findById(body.id);
    if (!user) {
      return NextResponse.json(
        { error: "Utilisateur non trouvé" },
        { status: 404 }
      );
    }

    // Créer un schéma Zod sans validation de mot de passe pour les mises à jour
    const updateSchema = userSchema.partial({ password: true });

    // Valider les données avec Zod
    const validationResult = updateSchema.safeParse(body);
    if (!validationResult.success) {
      const details = validationResult.error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
      return NextResponse.json({ error: "Données invalides", details }, { status: 400 });
    }

    // Vérifier si le profil existe
    if (body.profileId && !mongoose.Types.ObjectId.isValid(body.profileId)) {
      return NextResponse.json(
        { error: "ID de profil invalide" },
        { status: 400 }
      );
    }

    // Vérifier si l'email est déjà utilisé par un autre utilisateur
    if (body.email && body.email !== user.email) {
      const existingUser = await User.findOne({ email: body.email, _id: { $ne: body.id } });
      if (existingUser) {
        return NextResponse.json(
          { error: "Un utilisateur avec cet email existe déjà" },
          { status: 400 }
        );
      }
    }

    // Mise à jour des champs
    if (body.name) user.name = body.name;
    if (body.email) user.email = body.email;
    if (body.profileId) user.profileId = body.profileId;

    // Si un nouveau mot de passe est fourni, le hacher et le définir
    if (body.password && body.password.trim() !== "") {
      // Récupérer les paramètres de sécurité
      let securitySettings: ISecuritySettings | null = null;
      try {
        const settingsDoc = await SecuritySettings.findOne().sort({ updatedAt: -1 }).limit(1).lean();
        
        // Si aucun paramètre n'existe, utiliser les paramètres par défaut
        securitySettings = settingsDoc || {
          passwordPolicy: {
            minLength: 8,
            requireUppercase: true,
            requireLowercase: true,
            requireNumbers: true,
            requireSpecialChars: true
          }
        } as ISecuritySettings;
      } catch (error) {
        console.error('Erreur lors de la récupération des paramètres de sécurité:', error);
        return NextResponse.json(
          { error: 'Erreur lors de la validation du mot de passe' },
          { status: 500 }
        );
      }
      
      // Valider le mot de passe selon la politique de sécurité
      const passwordValidation: PasswordValidationResult = await validatePassword(body.password, securitySettings);
      if (!passwordValidation.isValid) {
        return NextResponse.json(
          { 
            error: "Le mot de passe ne respecte pas la politique de sécurité", 
            details: passwordValidation.errors 
          },
          { status: 400 }
        );
      }

      user.password = await bcrypt.hash(body.password, 10);
      user.firstLogin = false; // Réinitialiser le drapeau de première connexion
    }

    await user.save();

    return NextResponse.json({
      message: "Utilisateur mis à jour avec succès",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        profileId: user.profileId
      }
    });
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour de l'utilisateur" },
      { status: 500 }
    );
  }
}

// DELETE /api/users - Supprimer un utilisateur
export async function DELETE(req: NextRequest) {
  try {
    const { isAuthenticated, isAdmin } = await checkAuth(req);

    if (!isAuthenticated) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // Vérifier si l'utilisateur est un admin pour supprimer un utilisateur
    if (!isAdmin) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    await connectToDatabase();
    
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "ID d'utilisateur manquant" },
        { status: 400 }
      );
    }

    // Vérifier si l'utilisateur existe
    const user = await User.findById(id);
    if (!user) {
      return NextResponse.json(
        { error: "Utilisateur non trouvé" },
        { status: 404 }
      );
    }

    await User.findByIdAndDelete(id);

    return NextResponse.json({ message: "Utilisateur supprimé avec succès" });
  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json(
      { error: "Erreur lors de la suppression de l'utilisateur" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/users
 * Mise à jour massive d'utilisateurs
 */
export async function PATCH(req: NextRequest) {
  try {
    // Vérifier l'authentification et les permissions
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: "Authentification requise" }, { status: 401 });
    }
    
    // Seuls les admins peuvent mettre à jour plusieurs utilisateurs
    if (!(session.user.role === 'admin')) {
      return NextResponse.json({ error: "Permission refusée" }, { status: 403 });
    }
    
    // Extraire les données
    const body = await req.json();
    const { userIds, action, data } = body;
    
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json(
        { error: "Liste d'IDs utilisateurs requise" },
        { status: 400 }
      );
    }
    
    if (!action) {
      return NextResponse.json(
        { error: "Action requise" },
        { status: 400 }
      );
    }
    
    let result;
    
    switch (action) {
      case 'updateRole':
        if (!data?.role || !['admin', 'operator', 'viewer', 'user'].includes(data.role)) {
          return NextResponse.json(
            { error: "Rôle valide requis" },
            { status: 400 }
          );
        }
        
        result = await prisma.user.updateMany({
          where: { id: { in: userIds.map(Number) } },
          data: { role: data.role, updated_at: new Date() }
        });
        break;
        
      case 'addToProfile':
        if (!data?.profileId) {
          return NextResponse.json(
            { error: "ID de profil requis" },
            { status: 400 }
          );
        }
        
        // Pour chaque utilisateur, ajouter l'association au profil s'il n'existe pas déjà
        const createPromises = userIds.map(async (userId) => {
          // Vérifier si l'association existe déjà
          const existing = await prisma.userProfile.findUnique({
            where: {
              user_id_profile_id: {
                user_id: Number(userId),
                profile_id: Number(data.profileId)
              }
            }
          });
          
          // Si elle n'existe pas, la créer
          if (!existing) {
            return prisma.userProfile.create({
              data: {
                user_id: Number(userId),
                profile_id: Number(data.profileId)
              }
            });
          }
          
          return null;
        });
        
        await Promise.all(createPromises);
        
        result = { count: userIds.length };
        break;
        
      case 'removeFromProfile':
        if (!data?.profileId) {
          return NextResponse.json(
            { error: "ID de profil requis" },
            { status: 400 }
          );
        }
        
        // Supprimer les associations utilisateur-profil spécifiées
        result = await prisma.userProfile.deleteMany({
          where: {
            user_id: { in: userIds.map(Number) },
            profile_id: Number(data.profileId)
          }
        });
        break;
        
      case 'activateUsers':
        // Pas directement applicable avec ce schéma - ajuster selon votre implémentation
        result = { count: 0, message: "Action non implémentée" };
        break;
        
      case 'deactivateUsers':
        // Pas directement applicable avec ce schéma - ajuster selon votre implémentation
        result = { count: 0, message: "Action non implémentée" };
        break;
        
      default:
        return NextResponse.json(
          { error: "Action non reconnue" },
          { status: 400 }
        );
    }
    
    // Journaliser l'action collective
    await SecurityIncidentService.logIncident(
      'admin_action',
      `Action collective sur utilisateurs: ${action} (${userIds.length} utilisateurs)`,
      req.headers.get('x-forwarded-for') || 'unknown',
      'info',
      String(session.user.id),
      session.user.email || ''
    );
    
    return NextResponse.json({
      success: true,
      action,
      affected: result?.count || 0
    });
  } catch (error: any) {
    console.error('Erreur lors de la mise à jour collective des utilisateurs:', error);
    return NextResponse.json(
      { error: "Erreur serveur lors de la mise à jour collective des utilisateurs" },
      { status: 500 }
    );
  }
} 