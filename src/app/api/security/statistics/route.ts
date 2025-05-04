import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { SecurityIncidentService } from "@/services";
import { connectToDatabase } from "@/lib/mongodb";

/**
 * GET /api/security/statistics
 * Récupérer les statistiques des incidents de sécurité
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

    // Récupérer les paramètres de la requête
    const { searchParams } = new URL(req.url);
    const days = parseInt(searchParams.get('days') || '30', 10);

    // Connexion à la base de données
    await connectToDatabase();

    // Récupérer les statistiques
    const stats = await SecurityIncidentService.getIncidentStats(days);

    return NextResponse.json({ data: stats });
  } catch (error: any) {
    console.error('Erreur lors de la récupération des statistiques de sécurité:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des statistiques de sécurité' },
      { status: 500 }
    );
  }
} 