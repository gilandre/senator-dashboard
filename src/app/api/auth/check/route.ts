import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET() {
  try {
    // Vérifier d'abord la session NextAuth
    const session = await getServerSession(authOptions);
    
    if (session?.user) {
      // Si une session NextAuth existe, vérifier que l'utilisateur est toujours actif
      const user = await prisma.user.findUnique({
        where: { id: Number(session.user.id) },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true,
          first_login: true
        }
      });

      if (!user || user.status !== 'active') {
        return NextResponse.json({ authenticated: false }, { status: 401 });
      }

      return NextResponse.json({
        authenticated: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          first_login: user.first_login
        }
      });
    }

    // Si pas de session NextAuth, vérifier le cookie d'authentification
    const authCookie = cookies().get('auth');
    
    if (!authCookie || !authCookie.value) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }
    
    // Le format du cookie est userId-role
    const [userId, role] = authCookie.value.split('-');
    
    if (!userId) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }
    
    // Vérifier si l'utilisateur existe et est actif
    const user = await prisma.user.findUnique({
      where: { id: Number(userId) },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        first_login: true
      }
    });
    
    if (!user || user.status !== 'active') {
      // Supprimer le cookie si l'utilisateur n'existe pas ou est inactif
      cookies().delete('auth');
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }
    
    // Renvoyer les informations de l'utilisateur
    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        first_login: user.first_login
      }
    });
  } catch (error) {
    console.error('Erreur lors de la vérification de l\'authentification:', error);
    return NextResponse.json({ authenticated: false, error: 'Erreur serveur' }, { status: 500 });
  }
} 