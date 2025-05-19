import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/database';
import mongoose from 'mongoose';
import { getServerSession } from 'next-auth';
import { authOptions, isAdmin } from '@/lib/auth';
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

// Référence aux modèles
let Profile: mongoose.Model<any>;
let User: mongoose.Model<any>;

try {
  // Récupérer les modèles existants
  Profile = mongoose.model('Profile');
  User = mongoose.model('User');
} catch (error) {
  // Si les modèles n'existent pas, définir leurs schémas et les créer
  // (Ceci ne devrait pas se produire car les modèles sont déjà définis ailleurs)
  console.error('Erreur lors de la récupération des modèles:', error);
}

// GET /api/profiles/:id/users - Récupérer les utilisateurs avec un profil spécifique
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
    
    // Récupérer les utilisateurs associés à ce profil
    const users = await User.find({ profileId: id })
      .select('name email status lastLogin');
    
    return NextResponse.json({ users });
  } catch (error) {
    console.error('Erreur lors de la récupération des utilisateurs:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des utilisateurs' },
      { status: 500 }
    );
  }
}

// POST /api/profiles/:id/users - Ajouter un utilisateur à un profil
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions) as CustomSession;
    if (!session || !isAdmin(session)) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }
    
    const { id } = params;
    const { userId } = await request.json();
    
    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json(
        { error: 'ID invalide' },
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
    
    // Vérifier si l'utilisateur existe
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json(
        { error: 'Utilisateur non trouvé' },
        { status: 404 }
      );
    }
    
    // Mettre à jour l'utilisateur avec le nouveau profil
    user.profileId = new mongoose.Types.ObjectId(id);
    await user.save();
    
    return NextResponse.json({ 
      message: 'Utilisateur ajouté au profil avec succès',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        status: user.status,
        lastLogin: user.lastLogin || 'Jamais'
      }
    });
    
  } catch (error) {
    console.error('Erreur lors de l\'ajout de l\'utilisateur au profil:', error);
    return NextResponse.json(
      { error: 'Erreur lors de l\'ajout de l\'utilisateur au profil' },
      { status: 500 }
    );
  }
}

// DELETE /api/profiles/:id/users - Retirer un utilisateur d'un profil
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions) as CustomSession;
    if (!session || !isAdmin(session)) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }
    
    const { id } = params;
    const { userId } = await request.json();
    
    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json(
        { error: 'ID invalide' },
        { status: 400 }
      );
    }
    
    await connectToDatabase();
    
    // Vérifier si l'utilisateur est associé à ce profil
    const user = await User.findOne({ _id: userId, profileId: id });
    if (!user) {
      return NextResponse.json(
        { error: 'Utilisateur non trouvé dans ce profil' },
        { status: 404 }
      );
    }
    
    // Affecter l'utilisateur au profil par défaut
    // Trouver le profil par défaut
    const defaultProfile = await Profile.findOne({ isDefault: true });
    
    if (defaultProfile) {
      user.profileId = defaultProfile._id;
    } else {
      // Si pas de profil par défaut, supprimer la référence
      user.profileId = undefined;
    }
    
    await user.save();
    
    return NextResponse.json({ 
      message: 'Utilisateur retiré du profil avec succès' 
    });
    
  } catch (error) {
    console.error('Erreur lors du retrait de l\'utilisateur du profil:', error);
    return NextResponse.json(
      { error: 'Erreur lors du retrait de l\'utilisateur du profil' },
      { status: 500 }
    );
  }
} 