/**
 * Utilitaires pour l'envoi d'emails
 */

/**
 * Envoie un email de réinitialisation de mot de passe à l'utilisateur
 * @param email Adresse email du destinataire
 * @param name Nom du destinataire
 * @param password Nouveau mot de passe
 */
export async function sendPasswordResetEmail(
  email: string,
  name: string,
  password: string
): Promise<boolean> {
  try {
    // Dans un environnement de production, vous utiliseriez un service d'email comme SendGrid, Mailgun, etc.
    // Pour le moment, nous simulons l'envoi d'email
    console.log(`[MAIL] Envoi d'un email de réinitialisation de mot de passe à ${email}`);
    console.log(`[MAIL] Objet: Réinitialisation de votre mot de passe`);
    console.log(`[MAIL] Contenu: Bonjour ${name}, votre mot de passe a été réinitialisé. Votre nouveau mot de passe est: ${password}`);
    
    // En environnement de développement, nous considérons que l'email a été envoyé avec succès
    return true;
  } catch (error) {
    console.error('Erreur lors de l\'envoi de l\'email de réinitialisation de mot de passe:', error);
    return false;
  }
}

/**
 * Envoie un email de bienvenue à un nouvel utilisateur
 * @param email Adresse email du destinataire
 * @param name Nom du destinataire
 * @param password Mot de passe temporaire
 */
export async function sendWelcomeEmail(
  email: string,
  name: string,
  password: string
): Promise<boolean> {
  try {
    console.log(`[MAIL] Envoi d'un email de bienvenue à ${email}`);
    console.log(`[MAIL] Objet: Bienvenue sur la plateforme SENATOR INVESTECH`);
    console.log(`[MAIL] Contenu: Bonjour ${name}, votre compte a été créé. Votre mot de passe temporaire est: ${password}`);
    
    return true;
  } catch (error) {
    console.error('Erreur lors de l\'envoi de l\'email de bienvenue:', error);
    return false;
  }
}

/**
 * Envoie une notification
 * @param email Adresse email du destinataire
 * @param subject Objet de l'email
 * @param message Contenu de l'email
 */
export async function sendNotification(
  email: string,
  subject: string,
  message: string
): Promise<boolean> {
  try {
    console.log(`[MAIL] Envoi d'une notification à ${email}`);
    console.log(`[MAIL] Objet: ${subject}`);
    console.log(`[MAIL] Contenu: ${message}`);
    
    return true;
  } catch (error) {
    console.error('Erreur lors de l\'envoi de la notification:', error);
    return false;
  }
} 