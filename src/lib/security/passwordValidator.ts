import { ISecuritySettings } from "@/models/SecuritySettings";
import { compare } from "bcryptjs";
import PasswordHistory from "@/models/PasswordHistory";
import mongoose from "mongoose";

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
    // Convertir l'ID utilisateur en ObjectId
    const userObjectId = new mongoose.Types.ObjectId(userId);
    
    // Récupérer l'historique des mots de passe
    const passwordHistory = await PasswordHistory.findOne({ userId: userObjectId });
    
    if (!passwordHistory || passwordHistory.passwordHashes.length === 0) {
      return false;
    }
    
    // Limiter la vérification au nombre spécifié
    const hashesToCheck = passwordHistory.passwordHashes.slice(0, preventReuse);
    
    // Vérifier si le mot de passe correspond à l'un des hachages précédents
    for (const hash of hashesToCheck) {
      const isMatch = await compare(password, hash);
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
    const userObjectId = new mongoose.Types.ObjectId(userId);
    
    // Rechercher ou créer un enregistrement d'historique
    let history = await PasswordHistory.findOne({ userId: userObjectId });
    
    if (!history) {
      history = new PasswordHistory({
        userId: userObjectId,
        passwordHashes: [passwordHash]
      });
    } else {
      // Ajouter le nouveau hachage au début de la liste
      history.passwordHashes.unshift(passwordHash);
      
      // Limiter la taille de l'historique
      if (history.passwordHashes.length > maxHistory) {
        history.passwordHashes = history.passwordHashes.slice(0, maxHistory);
      }
    }
    
    await history.save();
  } catch (error) {
    console.error("Erreur lors de la mise à jour de l'historique des mots de passe:", error);
    throw error;
  }
} 