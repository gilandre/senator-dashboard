import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import * as bcrypt from 'bcryptjs';

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
    
    // Rechercher l'utilisateur par email avec Prisma
    const user = await prisma.user.findUnique({
      where: { email }
    });
    
    // Si l'utilisateur n'existe pas
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
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Identifiants incorrects' }, 
        { status: 401 }
      );
    }
    
    // Mettre à jour la date de dernière connexion (si le champ existe dans Prisma)
    await prisma.user.update({
      where: { id: user.id },
      data: { updated_at: new Date() }
    });
    
    // Enregistrer l'activité de connexion
    await prisma.user_activities.create({
      data: {
        user_id: user.id,
        action: 'login',
        details: `Connexion depuis ${request.headers.get('user-agent') || 'navigateur inconnu'}`
      }
    });

    // Définir un cookie d'authentification
    cookies().set({
      name: 'auth',
      value: `${user.id}-${user.role}`,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7, // 1 semaine
      path: '/',
    });

    // Renvoyer les données utilisateur sans le mot de passe
    return NextResponse.json({
      user: {
        id: user.id,
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