import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import User from '@/models/User';
import { connectToDatabase } from '@/lib/mongodb';

export async function GET() {
  try {
    // Récupérer le cookie d'authentification
    const authCookie = cookies().get('auth');
    
    if (!authCookie || !authCookie.value) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }
    
    // Le format du cookie est userId-role
    const [userId, role] = authCookie.value.split('-');
    
    if (!userId) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }
    
    await connectToDatabase();
    
    // Vérifier si l'utilisateur existe et est actif
    const user = await User.findById(userId).lean();
    
    if (!user || user.status !== 'active') {
      // Supprimer le cookie si l'utilisateur n'existe pas ou est inactif
      cookies().delete('auth');
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }
    
    // Renvoyer les informations de l'utilisateur
    return NextResponse.json({
      authenticated: true,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
      }
    });
  } catch (error) {
    console.error('Erreur lors de la vérification de l\'authentification:', error);
    return NextResponse.json({ authenticated: false, error: 'Erreur serveur' }, { status: 500 });
  }
} 