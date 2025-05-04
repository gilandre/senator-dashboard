import { ISecuritySettings } from '@/models/SecuritySettings';

export interface PasswordStrengthResult {
  score: number;       // Score de 0 à 100
  strength: 'très faible' | 'faible' | 'moyen' | 'fort' | 'très fort';
  meetsRequirements: boolean;
  feedback: string[];
}

/**
 * Évalue la force d'un mot de passe en fonction des critères définis
 * @param password Le mot de passe à évaluer
 * @param securitySettings Les paramètres de sécurité actuels
 * @returns Un objet contenant le score, la force, et des commentaires
 */
export function evaluatePasswordStrength(
  password: string,
  securitySettings: ISecuritySettings
): PasswordStrengthResult {
  const { passwordPolicy } = securitySettings;
  const feedback: string[] = [];
  let score = 0;
  
  // Vérifier la longueur
  if (password.length < passwordPolicy.minLength) {
    feedback.push(`Le mot de passe doit contenir au moins ${passwordPolicy.minLength} caractères`);
  } else {
    // Bonus pour la longueur supplémentaire
    const lengthBonus = Math.min(40, (password.length - passwordPolicy.minLength) * 3);
    score += lengthBonus;
  }
  
  // Vérifier les majuscules
  const hasUppercase = /[A-Z]/.test(password);
  if (passwordPolicy.requireUppercase && !hasUppercase) {
    feedback.push("Le mot de passe doit contenir au moins une lettre majuscule");
  } else if (hasUppercase) {
    score += 10;
  }
  
  // Vérifier les minuscules
  const hasLowercase = /[a-z]/.test(password);
  if (passwordPolicy.requireLowercase && !hasLowercase) {
    feedback.push("Le mot de passe doit contenir au moins une lettre minuscule");
  } else if (hasLowercase) {
    score += 10;
  }
  
  // Vérifier les chiffres
  const hasNumbers = /[0-9]/.test(password);
  if (passwordPolicy.requireNumbers && !hasNumbers) {
    feedback.push("Le mot de passe doit contenir au moins un chiffre");
  } else if (hasNumbers) {
    score += 10;
  }
  
  // Vérifier les caractères spéciaux
  const hasSpecialChars = /[^A-Za-z0-9]/.test(password);
  if (passwordPolicy.requireSpecialChars && !hasSpecialChars) {
    feedback.push("Le mot de passe doit contenir au moins un caractère spécial");
  } else if (hasSpecialChars) {
    score += 15;
  }
  
  // Bonus pour la complexité
  const uniqueChars = new Set(password).size;
  const complexityBonus = Math.min(15, uniqueChars / password.length * 15);
  score += complexityBonus;
  
  // Pénalité pour les répétitions
  const repeats = password.length - uniqueChars;
  const repeatPenalty = Math.min(10, repeats * 2);
  score -= repeatPenalty;
  
  // Pénalité pour les modèles courants
  const commonPatterns = [
    /^123/, /^abc/, /password/i, /admin/i, /user/i, /qwerty/i,
    /\d{4}$/, // 4 chiffres à la fin (comme une année)
  ];
  
  const patternPenalty = commonPatterns.some(pattern => pattern.test(password)) ? 15 : 0;
  score -= patternPenalty;
  
  // Ajuster le score dans la plage 0-100
  score = Math.max(0, Math.min(100, score));
  
  // Déterminer la force
  let strength: PasswordStrengthResult['strength'] = 'très faible';
  if (score >= 80) strength = 'très fort';
  else if (score >= 60) strength = 'fort';
  else if (score >= 40) strength = 'moyen';
  else if (score >= 20) strength = 'faible';
  
  // Vérifier si le mot de passe satisfait toutes les exigences minimales
  const meetsRequirements = 
    password.length >= passwordPolicy.minLength &&
    (!passwordPolicy.requireUppercase || hasUppercase) &&
    (!passwordPolicy.requireLowercase || hasLowercase) &&
    (!passwordPolicy.requireNumbers || hasNumbers) &&
    (!passwordPolicy.requireSpecialChars || hasSpecialChars);
  
  return {
    score,
    strength,
    meetsRequirements,
    feedback
  };
}

/**
 * Génère un mot de passe aléatoire respectant les critères de sécurité
 * @param securitySettings Les paramètres de sécurité actuels
 * @returns Un mot de passe conforme aux exigences
 */
export function generateSecurePassword(securitySettings: ISecuritySettings): string {
  const { passwordPolicy } = securitySettings;
  const length = Math.max(passwordPolicy.minLength, 12); // Au moins 12 caractères ou le minimum configuré
  
  const uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // Sans I et O pour éviter les confusions
  const lowercase = 'abcdefghijkmnopqrstuvwxyz'; // Sans l pour éviter les confusions
  const numbers = '23456789'; // Sans 0 et 1 pour éviter les confusions
  const specialChars = '!@#$%^&*-_=+';
  
  let allowedChars = '';
  let password = '';
  
  // Ajouter au moins un caractère de chaque catégorie requise
  if (passwordPolicy.requireUppercase) {
    allowedChars += uppercase;
    password += uppercase.charAt(Math.floor(Math.random() * uppercase.length));
  }
  
  if (passwordPolicy.requireLowercase) {
    allowedChars += lowercase;
    password += lowercase.charAt(Math.floor(Math.random() * lowercase.length));
  }
  
  if (passwordPolicy.requireNumbers) {
    allowedChars += numbers;
    password += numbers.charAt(Math.floor(Math.random() * numbers.length));
  }
  
  if (passwordPolicy.requireSpecialChars) {
    allowedChars += specialChars;
    password += specialChars.charAt(Math.floor(Math.random() * specialChars.length));
  }
  
  // Si aucune catégorie spécifique n'est requise, utiliser tous les types de caractères
  if (allowedChars === '') {
    allowedChars = lowercase + uppercase + numbers + specialChars;
  }
  
  // Compléter avec des caractères aléatoires jusqu'à atteindre la longueur désirée
  while (password.length < length) {
    password += allowedChars.charAt(Math.floor(Math.random() * allowedChars.length));
  }
  
  // Mélanger les caractères pour éviter que les caractères obligatoires ne soient toujours au début
  return password.split('').sort(() => 0.5 - Math.random()).join('');
} 