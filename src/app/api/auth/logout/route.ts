import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import User from '@/models/User';
import UserActivity from '@/models/UserActivity';
import { connectToDatabase } from '@/lib/mongodb';

export async function POST() {
  try {
    // Récupérer le cookie d'authentification
    const authCookie = cookies().get('auth');
    
    if (authCookie && authCookie.value) {
      // Le format du cookie est userId-role
      const [userId] = authCookie.value.split('-');
      
      if (userId) {
        await connectToDatabase();
        
        // Trouver l'utilisateur pour enregistrer son activité
        const user = await User.findById(userId);
        
        if (user) {
          // Enregistrer l'activité de déconnexion
          const activity = new UserActivity({
            userId: user._id,
            userName: user.name,
            action: 'logout',
            details: 'Déconnexion'
          });
          await activity.save();
        }
      }
    }
    
    // Supprimer le cookie d'authentification
    cookies().delete('auth');
    
    return NextResponse.json({ message: 'Déconnexion réussie' });
  } catch (error) {
    console.error('Erreur lors de la déconnexion:', error);
    return NextResponse.json({ error: 'Erreur lors de la déconnexion' }, { status: 500 });
  }
} 