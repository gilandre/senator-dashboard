import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/mongodb';
import { authOptions, isAdmin, CustomSession } from '@/lib/auth';
import { Session } from "next-auth";

// Interface étendue pour inclure les propriétés utilisateur personnalisées
interface ExtendedSession extends Session {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

// Define models if they don't exist in their own files
const profilePermissionSchema = new mongoose.Schema({
  profileId: { type: mongoose.Schema.Types.ObjectId, ref: 'Profile', required: true },
  permissionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Permission', required: true },
  view: { type: Boolean, default: false },
  create: { type: Boolean, default: false },
  edit: { type: Boolean, default: false },
  delete: { type: Boolean, default: false },
  approve: { type: Boolean, default: false },
  export: { type: Boolean, default: false },
  level: { type: String, enum: ['Complet', 'Écriture', 'Lecture', 'Aucun'], default: 'Aucun' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Create a compound index to ensure uniqueness of profile-permission pairs
profilePermissionSchema.index({ profileId: 1, permissionId: 1 }, { unique: true });

// Use or create models
const ProfilePermission = mongoose.models.ProfilePermission || 
                         mongoose.model('ProfilePermission', profilePermissionSchema);
const Permission = mongoose.models.Permission;
const Profile = mongoose.models.Profile;

// Connexion à la base de données
async function connectDB() {
  try {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI || '');
    }
  } catch (error) {
    console.error("Erreur de connexion à la base de données:", error);
    throw new Error("Erreur de connexion à la base de données");
  }
}

// GET /api/profiles/[id]/permissions - Récupérer les permissions d'un profil
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions) as ExtendedSession;
    if (!session) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { id } = params;

    // Valider l'ID du profil
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "ID de profil invalide" },
        { status: 400 }
      );
    }

    await connectDB();

    const profile = await Profile.findById(id).populate({
      path: "permissions",
      select: "name code module function description isActive",
    });

    if (!profile) {
      return NextResponse.json(
        { error: "Profil non trouvé" },
        { status: 404 }
      );
    }

    return NextResponse.json(profile.permissions);
  } catch (error) {
    console.error("Erreur lors de la récupération des permissions:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des permissions" },
      { status: 500 }
    );
  }
}

// POST /api/profiles/[id]/permissions - Ajouter des permissions à un profil
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions) as ExtendedSession;
    if (!session) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // Vérifier si l'utilisateur est admin
    if (session.user.role !== "admin") {
      return NextResponse.json(
        { error: "Vous n'êtes pas autorisé à modifier les permissions des profils" },
        { status: 403 }
      );
    }

    const { id } = params;

    // Valider l'ID du profil
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "ID de profil invalide" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { permissionIds } = body;

    if (!permissionIds || !Array.isArray(permissionIds) || permissionIds.length === 0) {
      return NextResponse.json(
        { error: "Liste de permissions invalide" },
        { status: 400 }
      );
    }

    // Valider tous les IDs de permission
    const invalidIds = permissionIds.filter(
      (permId) => !mongoose.Types.ObjectId.isValid(permId as string)
    );
    if (invalidIds.length > 0) {
      return NextResponse.json(
        { error: "Certains IDs de permission sont invalides", invalidIds },
        { status: 400 }
      );
    }

    await connectDB();

    // Vérifier si le profil existe
    const profile = await Profile.findById(id);
    if (!profile) {
      return NextResponse.json(
        { error: "Profil non trouvé" },
        { status: 404 }
      );
    }

    // Vérifier si toutes les permissions existent
    const permissions = await Permission.find({
      _id: { $in: permissionIds },
    });

    if (permissions.length !== permissionIds.length) {
      return NextResponse.json(
        { error: "Certaines permissions n'existent pas" },
        { status: 400 }
      );
    }

    // Ajouter les nouvelles permissions sans dupliquer
    const currentPermissionIds = profile.permissions.map((p: any) => 
      p.toString()
    );
    
    const newPermissionIds = permissionIds.filter(
      (permId) => !currentPermissionIds.includes(permId as string)
    );

    if (newPermissionIds.length === 0) {
      return NextResponse.json(
        { message: "Toutes les permissions sont déjà associées à ce profil" }
      );
    }

    // Mettre à jour le profil avec les nouvelles permissions
    const updatedProfile = await Profile.findByIdAndUpdate(
      id,
      {
        $addToSet: { permissions: { $each: newPermissionIds } },
        updatedBy: session.user.id,
      },
      { new: true }
    ).populate({
      path: "permissions",
      select: "name code module function description isActive",
    });

    return NextResponse.json({
      message: "Permissions ajoutées avec succès",
      profile: updatedProfile,
      addedPermissions: newPermissionIds.length,
    });
  } catch (error) {
    console.error("Erreur lors de l'ajout des permissions:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'ajout des permissions" },
      { status: 500 }
    );
  }
}

// DELETE /api/profiles/[id]/permissions - Supprimer des permissions d'un profil
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions) as ExtendedSession;
    if (!session) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // Vérifier si l'utilisateur est admin
    if (session.user.role !== "admin") {
      return NextResponse.json(
        { error: "Vous n'êtes pas autorisé à modifier les permissions des profils" },
        { status: 403 }
      );
    }

    const { id } = params;

    // Valider l'ID du profil
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "ID de profil invalide" },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const permissionId = searchParams.get("permissionId");

    if (!permissionId) {
      return NextResponse.json(
        { error: "ID de permission requis" },
        { status: 400 }
      );
    }

    // Valider l'ID de permission
    if (!mongoose.Types.ObjectId.isValid(permissionId)) {
      return NextResponse.json(
        { error: "ID de permission invalide" },
        { status: 400 }
      );
    }

    await connectDB();

    // Vérifier si le profil existe
    const profile = await Profile.findById(id);
    if (!profile) {
      return NextResponse.json(
        { error: "Profil non trouvé" },
        { status: 404 }
      );
    }

    // Vérifier si la permission est associée au profil
    const hasPermission = profile.permissions.some(
      (p: any) => p.toString() === permissionId
    );

    if (!hasPermission) {
      return NextResponse.json(
        { error: "Cette permission n'est pas associée à ce profil" },
        { status: 400 }
      );
    }

    // Supprimer la permission du profil
    const updatedProfile = await Profile.findByIdAndUpdate(
      id,
      {
        $pull: { permissions: permissionId },
        updatedBy: session.user.id,
      },
      { new: true }
    ).populate({
      path: "permissions",
      select: "name code module function description isActive",
    });

    return NextResponse.json({
      message: "Permission supprimée avec succès",
      profile: updatedProfile,
    });
  } catch (error) {
    console.error("Erreur lors de la suppression de la permission:", error);
    return NextResponse.json(
      { error: "Erreur lors de la suppression de la permission" },
      { status: 500 }
    );
  }
} 