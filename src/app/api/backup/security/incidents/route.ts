import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { SecurityIncidentService } from "@/services";
import { connectToDatabase } from "@/lib/mongodb";

/**
 * GET /api/security/incidents
 * Récupérer les incidents de sécurité avec pagination et filtres
 */
export async function GET(req: NextRequest) {
  try {
    // Vérifier l'authentification
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    // Vérifier que l'utilisateur est administrateur
    // @ts-ignore
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    // Récupérer les paramètres de recherche
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const type = searchParams.get('type') || undefined;
    const status = searchParams.get('status') || undefined;
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    const userId = searchParams.get('userId') || undefined;

    // Connexion à la base de données
    await connectToDatabase();

    // Récupérer les incidents
    const incidents = await SecurityIncidentService.getIncidents({
      page,
      limit,
      filters: {
        type,
        status,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        userId
      }
    });

    return NextResponse.json(incidents);
  } catch (error: any) {
    console.error('Erreur lors de la récupération des incidents de sécurité:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des incidents de sécurité' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/security/incidents
 * Créer un nouvel incident de sécurité
 */
export async function POST(req: NextRequest) {
  try {
    // Vérifier l'authentification
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    // Autoriser les administrateurs et le système à créer des incidents
    // @ts-ignore
    const isAdmin = session.user.role === 'admin';
    // @ts-ignore
    const isSystem = session.user.role === 'system';
    
    if (!isAdmin && !isSystem) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    // Récupérer les données de la requête
    const data = await req.json();
    
    // Extraire l'IP de la requête si non fournie
    if (!data.ipAddress) {
      data.ipAddress = req.headers.get('x-forwarded-for') || 
                        req.headers.get('x-real-ip') || 
                        '127.0.0.1';
    }
    
    // Ajouter l'utilisateur connecté si non spécifié
    if (!data.userId && session.user.id) {
      data.userId = session.user.id;
    }
    
    if (!data.userEmail && session.user.email) {
      data.userEmail = session.user.email;
    }

    // Connexion à la base de données
    await connectToDatabase();

    // Créer l'incident
    const newIncident = await SecurityIncidentService.createIncident(data);
    
    return NextResponse.json(newIncident, { status: 201 });
  } catch (error: any) {
    console.error('Erreur lors de la création d\'un incident de sécurité:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la création d\'un incident de sécurité' },
      { status: 500 }
    );
  }
} 