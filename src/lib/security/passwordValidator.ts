import { ISecuritySettings } from "@/models/SecuritySettings";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/prisma";

export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Valide un mot de passe selon les critères de sécurité
 */
export async function validatePassword(
  password: string,
  securitySettings: ISecuritySettings,
  userId?: string
): Promise<PasswordValidationResult> {
  const errors: string[] = [];
  const { passwordPolicy } = securitySettings;

  // Vérifier la longueur minimale
  if (password.length < passwordPolicy.minLength) {
    errors.push(`Le mot de passe doit contenir au moins ${passwordPolicy.minLength} caractères`);
  }

  // Vérifier la présence de majuscules
  if (passwordPolicy.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push("Le mot de passe doit contenir au moins une lettre majuscule");
  }

  // Vérifier la présence de minuscules
  if (passwordPolicy.requireLowercase && !/[a-z]/.test(password)) {
    errors.push("Le mot de passe doit contenir au moins une lettre minuscule");
  }

  // Vérifier la présence de chiffres
  if (passwordPolicy.requireNumbers && !/[0-9]/.test(password)) {
    errors.push("Le mot de passe doit contenir au moins un chiffre");
  }

  // Vérifier la présence de caractères spéciaux
  if (passwordPolicy.requireSpecialChars && !/[^A-Za-z0-9]/.test(password)) {
    errors.push("Le mot de passe doit contenir au moins un caractère spécial");
  }

  // Vérifier l'historique des mots de passe si un userId est fourni
  if (userId && passwordPolicy.preventReuse > 0) {
    const isReused = await checkPasswordHistory(password, userId, passwordPolicy.preventReuse);
    if (isReused) {
      errors.push(`Le mot de passe ne peut pas être réutilisé parmi les ${passwordPolicy.preventReuse} derniers mots de passe`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Vérifie si le mot de passe a déjà été utilisé dans l'historique récent
 */
async function checkPasswordHistory(
  password: string,
  userId: string,
  preventReuse: number
): Promise<boolean> {
  try {
    // Convertir l'ID utilisateur en nombre
    const userIdNumber = parseInt(userId);
    
    // Récupérer l'historique des mots de passe avec Prisma
    const passwordHistories = await prisma.password_history.findMany({
      where: { user_id: userIdNumber },
      orderBy: { created_at: 'desc' },
      take: preventReuse
    });
    
    if (!passwordHistories || passwordHistories.length === 0) {
      return false;
    }
    
    // Vérifier si le mot de passe correspond à l'un des hachages précédents
    for (const history of passwordHistories) {
      const isMatch = await compare(password, history.password);
      if (isMatch) {
        return true;
      }
    }
    
    return false;
  } catch (error) {
    console.error("Erreur lors de la vérification de l'historique des mots de passe:", error);
    return false;
  }
}

/**
 * Ajoute un mot de passe haché à l'historique
 */
export async function addToPasswordHistory(
  userId: string,
  passwordHash: string,
  maxHistory: number = 5
): Promise<void> {
  try {
    const userIdNumber = parseInt(userId);
    
    // Créer un nouvel enregistrement d'historique avec Prisma
    await prisma.password_history.create({
      data: {
        user_id: userIdNumber,
        password: passwordHash,
        created_at: new Date()
      }
    });
    
    // Limiter la taille de l'historique en supprimant les entrées les plus anciennes
    const totalEntries = await prisma.password_history.count({
      where: { user_id: userIdNumber }
    });
    
    if (totalEntries > maxHistory) {
      // Récupérer les entrées à conserver (les plus récentes)
      const entriesToKeep = await prisma.password_history.findMany({
        where: { user_id: userIdNumber },
        orderBy: { created_at: 'desc' },
        take: maxHistory
      });
      
      // Supprimer toutes les entrées plus anciennes que celles à conserver
      if (entriesToKeep.length > 0) {
        const oldestToKeepDate = entriesToKeep[entriesToKeep.length - 1].created_at;
        
        await prisma.password_history.deleteMany({
          where: {
            user_id: userIdNumber,
            created_at: {
              lt: oldestToKeepDate
            }
          }
        });
      }
    }
  } catch (error) {
    console.error("Erreur lors de la mise à jour de l'historique des mots de passe:", error);
    // Ne pas propager l'erreur pour éviter de bloquer le changement de mot de passe
    // en cas de problème avec l'historique
  }
}

/**
 * Vérifie si le mot de passe de l'utilisateur a expiré
 */
export async function isPasswordExpired(userId: string): Promise<boolean> {
  try {
    const userIdNumber = parseInt(userId);
    
    const user = await prisma.user.findUnique({
      where: { id: userIdNumber }
    });
    
    if (!user) {
      return false;
    }

    // Vérifier si la date d'expiration est définie
    if (!('password_expiry_date' in user) || !user.password_expiry_date) {
      return false;
    }
    
    // Vérifier si la date d'expiration est passée
    const currentDate = new Date();
    return currentDate > user.password_expiry_date;
  } catch (error) {
    console.error("Erreur lors de la vérification de l'expiration du mot de passe:", error);
    return false;
  }
}

/**
 * Définit ou met à jour la date d'expiration du mot de passe d'un utilisateur
 * @param userId ID de l'utilisateur
 * @param daysValid Nombre de jours pendant lesquels le mot de passe est valide
 */
export async function setPasswordExpiryDate(userId: string, daysValid: number = 90): Promise<void> {
  try {
    const userIdNumber = parseInt(userId);
    
    // Calculer la date d'expiration
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + daysValid);
    
    // Mettre à jour la date d'expiration dans la base de données
    await prisma.$executeRaw`
      UPDATE users 
      SET password_expiry_date = ${expiryDate}
      WHERE id = ${userIdNumber}
    `;
  } catch (error) {
    console.error("Erreur lors de la définition de la date d'expiration du mot de passe:", error);
  }
} 