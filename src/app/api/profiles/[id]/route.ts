import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/database';
import mongoose from 'mongoose';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Session } from 'next-auth';

// Interface étendue pour inclure les propriétés utilisateur personnalisées
interface CustomSession extends Session {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

// Interface pour le document Profile
interface ProfileDocument extends mongoose.Document {
  name: string;
  description: string;
  permissions: mongoose.Types.ObjectId[];
  isActive: boolean;
  createdBy?: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  permissionsData?: any[];
}

// Référence au modèle Profile
let Profile: mongoose.Model<ProfileDocument>;

try {
  // Tente de récupérer le modèle existant
  Profile = mongoose.model<ProfileDocument>('Profile');
} catch (error) {
  // Définir le schéma et créer le modèle s'il n'existe pas
  const profileSchema = new mongoose.Schema(
    {
      name: { type: String, required: true, unique: true },
      description: { type: String, required: true },
      permissions: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Permission',
        },
      ],
      isActive: { type: Boolean, default: true },
      createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    },
    { timestamps: true }
  );

  Profile = mongoose.model<ProfileDocument>('Profile', profileSchema);
}

// GET /api/profiles/[id] - Récupérer un profil spécifique
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions) as CustomSession;
    if (!session) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { id } = params;

    // Valider l'ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'ID de profil invalide' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Récupérer le profil sans tenter de peupler les permissions
    const profile = await Profile.findById(id);

    if (!profile) {
      return NextResponse.json(
        { error: 'Profil non trouvé' },
        { status: 404 }
      );
    }

    // Convertir le document Mongoose en objet JSON
    const profileObj = profile.toObject();

    // Si le profil a des permissions, les récupérer séparément
    if (profileObj.permissions && profileObj.permissions.length > 0) {
      try {
        const Permission = mongoose.model('Permission');
        const permissions = await Permission.find({
          _id: { $in: profileObj.permissions }
        }).select('name code module function');
        
        profileObj.permissionsData = permissions;
      } catch (err) {
        console.error('Erreur lors de la récupération des permissions:', err);
        // Continuer même si les permissions ne peuvent pas être récupérées
      }
    }

    return NextResponse.json(profileObj);
  } catch (error) {
    console.error('Erreur lors de la récupération du profil:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération du profil' },
      { status: 500 }
    );
  }
}

// PUT /api/profiles/[id] - Mettre à jour un profil spécifique
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions) as CustomSession;
    if (!session) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    // Vérifier si l'utilisateur est admin
    if (session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Vous n\'êtes pas autorisé à modifier des profils' },
        { status: 403 }
      );
    }

    const { id } = params;

    // Valider l'ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'ID de profil invalide' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { name, description, permissions, isActive } = body;

    // Valider les champs requis
    if (!name || !description) {
      return NextResponse.json(
        { error: 'Le nom et la description sont requis' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Vérifier si le profil existe
    const profile = await Profile.findById(id);
    if (!profile) {
      return NextResponse.json(
        { error: 'Profil non trouvé' },
        { status: 404 }
      );
    }

    // Vérifier si le nom est déjà utilisé par un autre profil
    if (name !== profile.name) {
      const existingProfile = await Profile.findOne({
        name,
        _id: { $ne: id },
      });
      if (existingProfile) {
        return NextResponse.json(
          { error: 'Un profil avec ce nom existe déjà' },
          { status: 400 }
        );
      }
    }

    // Mettre à jour le profil sans utiliser populate
    const updatedProfile = await Profile.findByIdAndUpdate(
      id,
      {
        name,
        description,
        permissions: permissions || profile.permissions,
        isActive: isActive !== undefined ? isActive : profile.isActive,
        updatedBy: session.user.id,
      },
      { new: true }
    );

    if (!updatedProfile) {
      return NextResponse.json(
        { error: 'Erreur lors de la mise à jour du profil' },
        { status: 500 }
      );
    }

    // Convertir en objet plat
    const updatedProfileObj = updatedProfile.toObject();

    return NextResponse.json(updatedProfileObj);
  } catch (error) {
    console.error('Erreur lors de la mise à jour du profil:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour du profil' },
      { status: 500 }
    );
  }
}

// DELETE /api/profiles/[id] - Supprimer un profil spécifique
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions) as CustomSession;
    if (!session) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    // Vérifier si l'utilisateur est admin
    if (session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Vous n\'êtes pas autorisé à supprimer des profils' },
        { status: 403 }
      );
    }

    const { id } = params;

    // Valider l'ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'ID de profil invalide' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Vérifier si le profil existe
    const profile = await Profile.findById(id);
    if (!profile) {
      return NextResponse.json(
        { error: 'Profil non trouvé' },
        { status: 404 }
      );
    }

    // Vérifier si le profil est utilisé par des utilisateurs
    const User = mongoose.model('User');
    const usersWithProfile = await User.countDocuments({ profile: id });
    
    if (usersWithProfile > 0) {
      return NextResponse.json(
        { 
          error: 'Ce profil ne peut pas être supprimé car il est actuellement attribué à des utilisateurs',
          count: usersWithProfile
        },
        { status: 400 }
      );
    }

    // Supprimer le profil
    await Profile.findByIdAndDelete(id);

    return NextResponse.json({
      message: 'Profil supprimé avec succès',
    });
  } catch (error) {
    console.error('Erreur lors de la suppression du profil:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la suppression du profil' },
      { status: 500 }
    );
  }
} 