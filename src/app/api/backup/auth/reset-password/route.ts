import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/models/User';
import { hash } from 'bcrypt';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { token, newPassword } = body;

    // Valider les entrées
    if (!token || !newPassword) {
      return NextResponse.json(
        { error: 'Token et nouveau mot de passe requis' }, 
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: 'Le mot de passe doit contenir au moins 8 caractères' }, 
        { status: 400 }
      );
    }

    // Hacher le token pour la comparaison avec celui stocké dans la base de données
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    // Se connecter à la base de données
    await connectToDatabase();

    // Rechercher l'utilisateur avec ce token et vérifier qu'il n'est pas expiré
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: new Date() }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Token invalide ou expiré' }, 
        { status: 400 }
      );
    }

    // Hacher le nouveau mot de passe
    const saltRounds = 10;
    const hashedPassword = await hash(newPassword, saltRounds);

    // Mettre à jour le mot de passe et supprimer le token de réinitialisation
    user.password = hashedPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    // Enregistrer une activité de réinitialisation de mot de passe
    // Cela pourrait être fait via un modèle UserActivity comme dans d'autres parties de l'application

    return NextResponse.json({
      success: true,
      message: 'Mot de passe réinitialisé avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la réinitialisation du mot de passe:', error);
    
    return NextResponse.json(
      { error: 'Une erreur est survenue lors de la réinitialisation du mot de passe' },
      { status: 500 }
    );
  }
} 