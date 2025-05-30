import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { SecuritySettingsService } from "@/services";
import { connectToDatabase } from "@/lib/mongodb";

/**
 * GET /api/security/settings
 * Récupérer les paramètres de sécurité actuels
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

    // Connexion à la base de données
    await connectToDatabase();

    // Récupérer les paramètres de sécurité
    const settings = await SecuritySettingsService.getSettings();
    return NextResponse.json(settings);
  } catch (error: any) {
    console.error('Erreur lors de la récupération des paramètres de sécurité:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des paramètres de sécurité' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/security/settings
 * Mettre à jour les paramètres de sécurité
 */
export async function PUT(req: NextRequest) {
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

    // Récupérer les données de la requête
    const data = await req.json();

    // Connexion à la base de données
    await connectToDatabase();

    // Mettre à jour les paramètres de sécurité
    const updatedSettings = await SecuritySettingsService.updateSettings(data);
    
    return NextResponse.json(updatedSettings);
  } catch (error: any) {
    console.error('Erreur lors de la mise à jour des paramètres de sécurité:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour des paramètres de sécurité' },
      { status: 500 }
    );
  }
} 