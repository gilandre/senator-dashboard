import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/models/User';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email } = body;

    // Valider l'email
    if (!email) {
      return NextResponse.json(
        { error: 'Email requis' }, 
        { status: 400 }
      );
    }

    // Se connecter à la base de données
    await connectToDatabase();

    // Rechercher l'utilisateur par email
    const user = await User.findOne({ email });

    // Pour des raisons de sécurité, on ne révèle pas si l'email existe ou non
    // On renvoie toujours une réponse positive, même si l'utilisateur n'existe pas
    if (!user) {
      return NextResponse.json({ 
        success: true, 
        message: 'Si un compte existe avec cette adresse email, des instructions de réinitialisation seront envoyées.' 
      });
    }

    // Générer un jeton de réinitialisation et une date d'expiration
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    // Date d'expiration: 1 heure
    const tokenExpiry = new Date();
    tokenExpiry.setHours(tokenExpiry.getHours() + 1);

    // Enregistrer le jeton dans la base de données
    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = tokenExpiry;
    await user.save();

    // Dans un environnement de production, vous enverriez un email avec le lien de réinitialisation
    // Le lien contiendrait le jeton: `${process.env.NEXT_PUBLIC_SITE_URL}/reset-password?token=${resetToken}`
    
    // Nous simulons simplement que l'email a été envoyé
    console.log(`[DEBUG] Email de réinitialisation envoyé à ${email}`);
    console.log(`[DEBUG] Token de réinitialisation: ${resetToken}`);

    return NextResponse.json({
      success: true,
      message: 'Si un compte existe avec cette adresse email, des instructions de réinitialisation seront envoyées.'
    });
  } catch (error) {
    console.error('Erreur lors de la réinitialisation du mot de passe:', error);
    
    return NextResponse.json(
      { error: 'Une erreur est survenue lors de la réinitialisation du mot de passe' },
      { status: 500 }
    );
  }
} 