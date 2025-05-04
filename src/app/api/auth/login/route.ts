import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import User from '@/models/User';
import UserActivity from '@/models/UserActivity';
import { connectToDatabase } from '@/lib/mongodb';
import mongoose from 'mongoose';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    // Valider les identifiants
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email et mot de passe requis' }, 
        { status: 400 }
      );
    }
    
    await connectToDatabase();
    
    // Rechercher l'utilisateur par email
    const user = await User.findOne({ email });
    
    // Si l'utilisateur n'existe pas ou est inactif
    if (!user) {
      return NextResponse.json(
        { error: 'Identifiants incorrects' }, 
        { status: 401 }
      );
    }
    
    // Si l'utilisateur est inactif
    if (user.status === 'inactive') {
      return NextResponse.json(
        { error: 'Compte désactivé. Veuillez contacter l\'administrateur' }, 
        { status: 403 }
      );
    }
    
    // Vérifier le mot de passe
    const isPasswordValid = await user.comparePassword(password);
    
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Identifiants incorrects' }, 
        { status: 401 }
      );
    }
    
    // Mettre à jour la date de dernière connexion
    user.lastLogin = new Date();
    await user.save();
    
    // Enregistrer l'activité de connexion
    const activity = new UserActivity({
      userId: user._id,
      userName: user.name,
      action: 'login',
      details: `Connexion depuis ${request.headers.get('user-agent') || 'navigateur inconnu'}`
    });
    await activity.save();

    // Définir un cookie d'authentification
    cookies().set({
      name: 'auth',
      value: `${(user._id as mongoose.Types.ObjectId).toString()}-${user.role}`,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7, // 1 semaine
      path: '/',
    });

    // Renvoyer les données utilisateur sans le mot de passe
    return NextResponse.json({
      user: {
        id: (user._id as mongoose.Types.ObjectId).toString(),
        name: user.name,
        email: user.email,
        role: user.role,
      }
    }, { status: 200 });
  } catch (error) {
    console.error('Erreur de connexion:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la connexion' }, 
      { status: 500 }
    );
  }
} 