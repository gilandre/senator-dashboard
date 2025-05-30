import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { TwoFactorAuthService } from "@/services/two-factor-auth-service";
import { SecurityIncidentService } from "@/services";

/**
 * POST /api/security/2fa/verify
 * Vérifier et activer l'authentification à deux facteurs avec un code
 */
export async function POST(req: NextRequest) {
  try {
    // Vérifier l'authentification
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    // Récupérer l'ID de l'utilisateur
    // @ts-ignore
    const userId = session.user.id;
    if (!userId) {
      return NextResponse.json({ error: 'ID utilisateur non trouvé' }, { status: 400 });
    }

    // Récupérer le token
    const data = await req.json();
    const { token } = data;

    if (!token) {
      return NextResponse.json({ error: 'Code de vérification requis' }, { status: 400 });
    }

    // Connexion à la base de données
    await connectToDatabase();

    // Vérifier et activer l'authentification 2FA
    const isValid = await TwoFactorAuthService.verifyAndActivate(userId, token);

    if (!isValid) {
      return NextResponse.json({ 
        success: false,
        message: 'Code de vérification invalide'
      }, { status: 400 });
    }

    // Journaliser l'activation du 2FA
    await SecurityIncidentService.createIncident({
      type: 'security_setting_change',
      userId,
      userEmail: session.user.email,
      ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '127.0.0.1',
      details: 'Activation de l\'authentification à deux facteurs',
      status: 'info'
    });

    return NextResponse.json({
      success: true,
      message: 'Authentification à deux facteurs activée avec succès'
    });
  } catch (error: any) {
    console.error('Erreur lors de la vérification du code 2FA:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la vérification du code 2FA' },
      { status: 500 }
    );
  }
} 