import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/database';
import User from '@/models/User';
import { getServerSession } from 'next-auth';
import { authOptions, isAdmin } from '@/lib/auth';
import mongoose from 'mongoose';
import { Session } from 'next-auth';

// Définir l'interface CustomSession si elle n'est pas exportée
interface CustomSession extends Session {
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
  }
}

// GET /api/users/:id - Récupérer un utilisateur spécifique
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions) as CustomSession;
    if (!session) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }
    
    // Vérifier si l'utilisateur consulte son propre profil ou s'il est admin
    if (session.user.id !== params.id && !isAdmin(session)) {
      return NextResponse.json({ error: 'Accès interdit' }, { status: 403 });
    }
    
    const { id } = params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'ID utilisateur invalide' },
        { status: 400 }
      );
    }
    
    await connectToDatabase();
    
    const user = await User.findById(id)
      .select('-password')
      .populate('profileId', 'name description');
    
    if (!user) {
      return NextResponse.json(
        { error: 'Utilisateur non trouvé' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(user);
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'utilisateur:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération de l\'utilisateur' },
      { status: 500 }
    );
  }
}

// PUT /api/users/:id - Mettre à jour un utilisateur
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions) as CustomSession;
    if (!session) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const userId = params.id;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json({ error: "ID utilisateur invalide" }, { status: 400 });
    }

    await connectToDatabase();

    // Vérifier si l'utilisateur existe
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });
    }

    // Vérifier les permissions
    const isOwnProfile = session.user.id === userId;
    const hasAdminAccess = isAdmin(session);

    if (!hasAdminAccess && !isOwnProfile) {
      return NextResponse.json(
        { error: "Vous n'êtes pas autorisé à modifier cet utilisateur" },
        { status: 403 }
      );
    }

    const data = await request.json();
    
    // Si l'email est modifié, vérifier qu'il n'est pas déjà utilisé
    if (data.email && data.email !== user.email) {
      const existingUser = await User.findOne({ email: data.email });
      if (existingUser) {
        return NextResponse.json(
          { error: "Cet email est déjà utilisé" },
          { status: 400 }
        );
      }
    }

    // Limiter les champs que l'utilisateur peut modifier sur son propre profil
    if (isOwnProfile && !hasAdminAccess) {
      // L'utilisateur ne peut modifier que son nom et son email
      const updates: any = {};
      if (data.name) updates.name = data.name;
      if (data.email) updates.email = data.email;
      if (data.password) updates.password = data.password;

      Object.assign(user, updates);
    } else if (hasAdminAccess) {
      // L'administrateur peut modifier tous les champs
      if (data.name) user.name = data.name;
      if (data.email) user.email = data.email;
      if (data.password) user.password = data.password;
      if (data.status) user.status = data.status;
      if (data.profileId) {
        // Vérifier si le profil existe
        const Profile = mongoose.models.Profile;
        if (!Profile) {
          return NextResponse.json({ error: 'Modèle de profil non disponible' }, { status: 500 });
        }
        
        const profile = await Profile.findById(data.profileId);
        if (!profile) {
          return NextResponse.json({ error: 'Profil non trouvé' }, { status: 400 });
        }
        user.profileId = data.profileId;
      }
    }

    await user.save();

    // Renvoyer l'utilisateur mis à jour sans le mot de passe
    const userResponse = {
      id: user._id,
      name: user.name,
      email: user.email,
      status: user.status,
      profileId: user.profileId
    };

    return NextResponse.json(userResponse);
  } catch (error) {
    console.error("Erreur lors de la mise à jour de l'utilisateur:", error);
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour de l'utilisateur" },
      { status: 500 }
    );
  }
}

// DELETE /api/users/[id] - Supprimer un utilisateur
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions) as CustomSession;
    if (!session) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // Seul un administrateur peut supprimer un utilisateur
    if (!isAdmin(session)) {
      return NextResponse.json(
        { error: "Vous n'êtes pas autorisé à supprimer des utilisateurs" },
        { status: 403 }
      );
    }

    const userId = params.id;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json({ error: "ID utilisateur invalide" }, { status: 400 });
    }

    await connectToDatabase();

    // Vérifier si l'utilisateur existe
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });
    }

    // Ne pas permettre la suppression du super admin
    if (user.email === "admin@senator.ci") {
      return NextResponse.json(
        { error: "Impossible de supprimer le super administrateur" },
        { status: 403 }
      );
    }

    // Supprimer l'utilisateur
    await User.findByIdAndDelete(userId);

    return NextResponse.json({ message: "Utilisateur supprimé avec succès" });
  } catch (error) {
    console.error("Erreur lors de la suppression de l'utilisateur:", error);
    return NextResponse.json(
      { error: "Erreur lors de la suppression de l'utilisateur" },
      { status: 500 }
    );
  }
} 