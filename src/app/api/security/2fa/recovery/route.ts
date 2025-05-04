import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { TwoFactorAuthService } from "@/services/two-factor-auth-service";
import { SecurityIncidentService } from "@/services";

/**
 * POST /api/security/2fa/recovery
 * Utiliser un code de récupération pour désactiver l'authentification à deux facteurs
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

    // Récupérer le code de récupération
    const data = await req.json();
    const { recoveryCode } = data;

    if (!recoveryCode) {
      return NextResponse.json({ error: 'Code de récupération requis' }, { status: 400 });
    }

    // Connexion à la base de données
    await connectToDatabase();

    // Valider le code de récupération et désactiver le 2FA
    const isValid = await TwoFactorAuthService.validateRecoveryCode(userId, recoveryCode);

    if (!isValid) {
      return NextResponse.json({ 
        success: false,
        message: 'Code de récupération invalide'
      }, { status: 400 });
    }

    // Journaliser la désactivation du 2FA via code de récupération
    await SecurityIncidentService.createIncident({
      type: 'security_setting_change',
      userId,
      userEmail: session.user.email,
      ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '127.0.0.1',
      details: 'Désactivation de l\'authentification à deux facteurs via code de récupération',
      status: 'alert'
    });

    return NextResponse.json({
      success: true,
      message: 'Authentification à deux facteurs désactivée avec succès'
    });
  } catch (error: any) {
    console.error('Erreur lors de la validation du code de récupération:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la validation du code de récupération' },
      { status: 500 }
    );
  }
} 