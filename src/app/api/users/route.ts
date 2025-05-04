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
  status: z.enum(["active", "inactive"], { 
    errorMap: () => ({ message: "Le statut doit être 'active' ou 'inactive'" })
  }),
  profileId: z.string().min(1, { message: "Le profil est obligatoire" })
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
    const { isAuthenticated, isAdmin } = await checkAuth(req);

    if (!isAuthenticated) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // Vérifier si l'utilisateur est un admin pour accéder à tous les utilisateurs
    if (!isAdmin) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    await connectToDatabase();
    
    // Récupérer les paramètres de requête
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || undefined;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;
    
    // Construire la requête
    const query: any = {};
    
    // Filtre de recherche
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Filtre de statut
    if (status) {
      query.status = status;
    }
    
    // Exécuter la requête
    const total = await User.countDocuments(query);
    
    // Récupérer les données avec peuplement du profil
    const users = await User.find(query)
      .select('-password')
      .populate('profileId', 'name description')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
    
    // Transformer les données pour le client
    const transformedUsers = users.map(user => {
      // Convertir le document Mongoose en objet simple
      const userObj = user as any;
      
      // Traiter le profil en toute sécurité
      let profileId = '';
      let profileName = 'Non assigné';
      
      if (userObj.profileId && typeof userObj.profileId === 'object') {
        const profile = userObj.profileId as any;
        profileId = profile._id ? String(profile._id) : '';
        profileName = profile.name ? String(profile.name) : 'Non assigné';
      }
      
      // Créer un objet fortement typé
      return {
        id: String(userObj._id),
        name: String(userObj.name),
        email: String(userObj.email),
        status: String(userObj.status),
        lastLogin: userObj.lastLogin,
        profileId,
        profileName
      };
    });
    
    // Calculer les métadonnées de pagination
    const totalPages = Math.ceil(total / limit);
    
    return NextResponse.json({
      users: transformedUsers,
      pagination: {
        total,
        page,
        limit,
        pages: totalPages
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des utilisateurs:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des utilisateurs' },
      { status: 500 }
    );
  }
}

// POST /api/users - Créer un nouvel utilisateur
export async function POST(req: NextRequest) {
  try {
    const { isAuthenticated, isAdmin } = await checkAuth(req);

    if (!isAuthenticated) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // Vérifier si l'utilisateur est un admin pour créer un utilisateur
    if (!isAdmin) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    await connectToDatabase();
    
    const body = await req.json();
    console.log('Données reçues:', body);
    
    // Valider les champs obligatoires (validation de base)
    const validationResult = userSchema.safeParse(body);
    if (!validationResult.success) {
      const details = validationResult.error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
      return NextResponse.json(
        { 
          error: "Données invalides", 
          details
        },
        { status: 400 }
      );
    }
    
    const { name, email, password, status, profileId } = body;
    
    // Vérifier si l'email est déjà utilisé
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json(
        { error: 'Cette adresse email est déjà utilisée par un autre utilisateur' },
        { status: 400 }
      );
    }
    
    // Vérifier si le profil existe en utilisant directement le modèle Profile importé
    if (profileId) {
      const profile = await Profile.findById(profileId);
      if (!profile) {
        return NextResponse.json(
          { error: 'Le profil sélectionné n\'existe pas ou a été supprimé' }, 
          { status: 400 }
        );
      }
    }
    
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
    
    // Valider le mot de passe selon les règles de sécurité
    const passwordValidation: PasswordValidationResult = await validatePassword(password, securitySettings);
    
    if (!passwordValidation.isValid) {
      return NextResponse.json(
        { 
          error: 'Le mot de passe ne respecte pas les règles de sécurité',
          details: passwordValidation.errors 
        },
        { status: 400 }
      );
    }
    
    // Hacher le mot de passe
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Créer le nouvel utilisateur
    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      status,
      profileId: profileId || null,
      firstLogin: true,
    });
    
    await newUser.save();
    
    // Retourner l'utilisateur créé sans le mot de passe
    const userWithoutPassword = { ...newUser.toObject(), password: undefined };
    
    return NextResponse.json(
      {
        ...userWithoutPassword,
        message: "Utilisateur créé avec succès",
        user: {
          id: newUser._id,
          name: newUser.name,
          email: newUser.email,
          status: newUser.status,
          profileId: newUser.profileId
        }
      }, 
      { status: 201 }
    );
  } catch (error) {
    console.error('Erreur lors de la création de l\'utilisateur:', error);
    return NextResponse.json(
      { error: 'Erreur serveur lors de la création de l\'utilisateur. Veuillez réessayer.' },
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
    if (body.status) user.status = body.status;
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
        status: user.status,
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