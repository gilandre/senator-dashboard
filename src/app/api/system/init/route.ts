import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, isAdmin, CustomSession } from '@/lib/auth';
import { initializeSystem } from '@/lib/initPermissions';

export async function POST(request: NextRequest) {
  try {
    // Vérifier l'authentification
    const session = await getServerSession(authOptions) as CustomSession;
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }
    
    // Vérifier les droits d'administration
    if (!isAdmin(session)) {
      return NextResponse.json({ error: 'Permissions insuffisantes. Vous devez être administrateur.' }, { status: 403 });
    }
    
    // Récupérer les options de la requête
    const { force = false } = await request.json();
    
    // Initialiser le système
    const result = await initializeSystem(force);
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Système initialisé avec succès',
        details: result
      });
    } else {
      return NextResponse.json({
        success: false,
        message: 'Erreur lors de l\'initialisation du système',
        error: result.error instanceof Error ? result.error.message : 'Erreur inconnue',
        details: result
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Erreur lors du traitement de la requête d\'initialisation:', error);
    return NextResponse.json({
      success: false,
      message: 'Erreur serveur',
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    }, { status: 500 });
  }
} 