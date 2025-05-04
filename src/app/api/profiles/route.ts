import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import Profile, { IProfile } from '@/models/Profile';
import User from '@/models/User';
import { connectToDatabase } from '@/lib/database';
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

// Définir les schémas Mongoose (normalement ces modèles seraient importés)
const ProfileSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  description: { type: String, required: true },
  accessLevel: { type: String, default: 'Standard' },
  status: { type: String, default: 'Actif', enum: ['Actif', 'Inactif'] },
  permissions: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Permission',
  }],
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  createdBy: { type: String },
  updatedAt: { type: Date, default: Date.now }
});

// Récupérer un modèle existant, ou en créer un nouveau
const ProfileModel = mongoose.models.Profile || mongoose.model('Profile', ProfileSchema);

// GET /api/profiles - Récupérer tous les profils
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions) as CustomSession;
    if (!session) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const url = new URL(request.url);
    const searchParam = url.searchParams.get('search') || '';
    const statusParam = url.searchParams.get('status') || '';

    await connectToDatabase();

    // Construire la requête de recherche
    let query: any = {};
    
    // Ajouter la recherche par nom si spécifiée
    if (searchParam) {
      query.name = { $regex: searchParam, $options: 'i' };
    }
    
    // Filtrer par statut si spécifié
    if (statusParam === 'Actif') {
      query.isActive = true;
    } else if (statusParam === 'Inactif') {
      query.isActive = false;
    }

    // Récupérer les profils
    const profiles = await ProfileModel.find(query)
      .select('name description accessLevel isActive status createdAt updatedAt permissions')
      .sort({ name: 1 });

    // Compter les utilisateurs par profil
    const usersCountPromises = profiles.map(async (profile) => {
      const count = await User.countDocuments({ profileId: profile._id });
      return { profileId: profile._id.toString(), count };
    });
    
    const usersCountResults = await Promise.all(usersCountPromises);
    const usersCountMap = usersCountResults.reduce((map, item) => {
      map[item.profileId] = item.count;
      return map;
    }, {} as Record<string, number>);

    // Transform MongoDB _id to id for frontend compatibility
    const transformedProfiles = profiles.map(profile => {
      const profileObj = profile.toObject();
      return {
        id: profileObj._id.toString(),
        name: profileObj.name,
        description: profileObj.description,
        accessLevel: profileObj.accessLevel || 'Standard',
        status: profileObj.status || 'Actif',
        isActive: profileObj.isActive !== undefined ? profileObj.isActive : true,
        createdAt: profileObj.createdAt,
        updatedAt: profileObj.updatedAt,
        permissionsCount: profileObj.permissions ? profileObj.permissions.length : 0,
        usersCount: usersCountMap[profileObj._id.toString()] || 0
      };
    });

    return NextResponse.json({ profiles: transformedProfiles });
  } catch (error) {
    console.error('Erreur lors de la récupération des profils:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des profils' },
      { status: 500 }
    );
  }
}

// POST /api/profiles - Créer un nouveau profil
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions) as CustomSession;
    if (!session) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    // Vérifier si l'utilisateur est admin
    if (session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Vous n\'êtes pas autorisé à créer des profils' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, description, accessLevel, status, isActive } = body;

    // Valider les champs requis
    if (!name || !description) {
      return NextResponse.json(
        { error: 'Le nom et la description sont requis' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Vérifier si un profil avec le même nom existe déjà
    const existingProfile = await ProfileModel.findOne({ name });
    if (existingProfile) {
      return NextResponse.json(
        { error: 'Un profil avec ce nom existe déjà' },
        { status: 400 }
      );
    }

    // Créer le nouveau profil
    const newProfile = new ProfileModel({
      name,
      description,
      accessLevel: accessLevel || 'Standard',
      status: status || 'Actif',
      isActive: isActive !== undefined ? isActive : true,
      createdBy: session.user.id,
    });

    await newProfile.save();

    return NextResponse.json(newProfile, { status: 201 });
  } catch (error) {
    console.error('Erreur lors de la création du profil:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la création du profil' },
      { status: 500 }
    );
  }
} 