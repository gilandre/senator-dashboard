import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { TwoFactorAuthService } from "@/services/two-factor-auth-service";
import { SecurityIncidentService } from "@/services";

/**
 * POST /api/security/2fa/setup
 * Initialiser la configuration de l'authentification à deux facteurs pour un utilisateur
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

    // Connexion à la base de données
    await connectToDatabase();

    // Générer un secret et une URL QR code pour l'authentification 2FA
    const { secret, qrCodeUrl, recoveryCode } = await TwoFactorAuthService.setupTwoFactor(userId);

    // Journaliser l'activation du 2FA
    await SecurityIncidentService.createIncident({
      type: 'security_setting_change',
      userId,
      userEmail: session.user.email,
      ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '127.0.0.1',
      details: 'Initialisation de l\'authentification à deux facteurs',
      status: 'info'
    });

    return NextResponse.json({
      success: true,
      qrCodeUrl,
      recoveryCode
    });
  } catch (error: any) {
    console.error('Erreur lors de la configuration de l\'authentification à deux facteurs:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la configuration de l\'authentification à deux facteurs' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/security/2fa/setup
 * Désactiver l'authentification à deux facteurs pour un utilisateur
 */
export async function DELETE(req: NextRequest) {
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

    // Connexion à la base de données
    await connectToDatabase();

    // Désactiver l'authentification 2FA
    await TwoFactorAuthService.disableTwoFactor(userId);

    // Journaliser la désactivation du 2FA
    await SecurityIncidentService.createIncident({
      type: 'security_setting_change',
      userId,
      userEmail: session.user.email,
      ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '127.0.0.1',
      details: 'Désactivation de l\'authentification à deux facteurs',
      status: 'info'
    });

    return NextResponse.json({
      success: true,
      message: 'Authentification à deux facteurs désactivée'
    });
  } catch (error: any) {
    console.error('Erreur lors de la désactivation de l\'authentification à deux facteurs:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la désactivation de l\'authentification à deux facteurs' },
      { status: 500 }
    );
  }
} 