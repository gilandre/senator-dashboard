import { prisma } from './prisma';
import * as crypto from 'crypto';

interface PasswordPolicy {
  min_length: number;
  require_uppercase: boolean;
  require_numbers: boolean;
  require_special: boolean;
}

interface RolePasswordPolicies {
  [key: string]: PasswordPolicy;
}

/**
 * Génère un mot de passe temporaire aléatoire et sécurisé
 * @param length Longueur du mot de passe
 * @param options Options de complexité
 * @returns Mot de passe généré
 */
export function generateSecurePassword(
  length = 16,
  options = {
    uppercase: true,
    lowercase: true,
    numbers: true,
    special: true
  }
): string {
  // Ensembles de caractères
  const uppercaseChars = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // Sans I et O pour éviter la confusion
  const lowercaseChars = 'abcdefghijkmnopqrstuvwxyz'; // Sans l pour éviter la confusion
  const numberChars = '23456789'; // Sans 0 et 1 pour éviter la confusion
  const specialChars = '!@#$%^&*()_+-=[]{}|;:,.<>?';
  
  // Créer un ensemble de caractères en fonction des options
  let chars = '';
  if (options.lowercase) chars += lowercaseChars;
  if (options.uppercase) chars += uppercaseChars;
  if (options.numbers) chars += numberChars;
  if (options.special) chars += specialChars;
  
  // Si aucune option n'est activée, utiliser au moins les minuscules et les chiffres
  if (chars.length === 0) chars = lowercaseChars + numberChars;
  
  // Générer le mot de passe
  let password = '';
  const randomBytes = crypto.randomBytes(length * 2); // Plus de bytes que nécessaire pour éviter les biais
  
  for (let i = 0; i < length; i++) {
    const randomIndex = randomBytes[i] % chars.length;
    password += chars[randomIndex];
  }
  
  // Assurer qu'au moins un caractère de chaque type est présent si demandé
  let finalPassword = password;
  
  if (options.lowercase && !/[a-z]/.test(finalPassword)) {
    const randomPos = crypto.randomInt(0, length);
    const randomChar = lowercaseChars[crypto.randomInt(0, lowercaseChars.length)];
    finalPassword = replaceCharAt(finalPassword, randomPos, randomChar);
  }
  
  if (options.uppercase && !/[A-Z]/.test(finalPassword)) {
    const randomPos = crypto.randomInt(0, length);
    const randomChar = uppercaseChars[crypto.randomInt(0, uppercaseChars.length)];
    finalPassword = replaceCharAt(finalPassword, randomPos, randomChar);
  }
  
  if (options.numbers && !/[0-9]/.test(finalPassword)) {
    const randomPos = crypto.randomInt(0, length);
    const randomChar = numberChars[crypto.randomInt(0, numberChars.length)];
    finalPassword = replaceCharAt(finalPassword, randomPos, randomChar);
  }
  
  if (options.special && !/[^a-zA-Z0-9]/.test(finalPassword)) {
    const randomPos = crypto.randomInt(0, length);
    const randomChar = specialChars[crypto.randomInt(0, specialChars.length)];
    finalPassword = replaceCharAt(finalPassword, randomPos, randomChar);
  }
  
  return finalPassword;
}

/**
 * Remplace un caractère à une position donnée dans une chaîne
 */
function replaceCharAt(str: string, index: number, char: string): string {
  return str.substring(0, index) + char + str.substring(index + 1);
}

/**
 * Récupère la politique de mot de passe pour un rôle spécifique
 * @param roleId ID du rôle ou nom du rôle
 * @returns Politique de mot de passe
 */
export async function getPasswordPolicyForRole(roleId?: number | string): Promise<PasswordPolicy> {
  try {
    // Récupérer les paramètres de sécurité
    const securitySettings = await prisma.security_settings.findFirst({
      orderBy: { updated_at: 'desc' },
    });
    
    if (!securitySettings) {
      // Retourner une politique par défaut si aucun paramètre n'est trouvé
      return {
        min_length: 12,
        require_uppercase: true,
        require_numbers: true,
        require_special: true
      };
    }
    
    // Extraire les politiques spécifiques par rôle
    let rolePolicies: RolePasswordPolicies = {};
    
    try {
      if (securitySettings.role_password_policies) {
        rolePolicies = JSON.parse(securitySettings.role_password_policies);
      }
    } catch (error) {
      console.error('Erreur lors du parsing des politiques de mot de passe:', error);
    }
    
    // Déterminer le nom du rôle si un ID est fourni
    let roleName = 'default';
    
    if (roleId) {
      if (typeof roleId === 'number') {
        // Rechercher le nom du rôle dans la base de données
        const role = await prisma.roles.findUnique({
          where: { id: roleId },
          select: { name: true }
        });
        
        if (role?.name) {
          roleName = role.name;
        }
      } else if (typeof roleId === 'string') {
        roleName = roleId;
      }
    }
    
    // Récupérer la politique pour ce rôle ou utiliser la politique par défaut
    const policy = rolePolicies[roleName] || rolePolicies['default'] || {
      min_length: securitySettings.min_password_length || 12,
      require_uppercase: securitySettings.require_uppercase || true,
      require_numbers: securitySettings.require_numbers || true,
      require_special: securitySettings.require_special_chars || true
    };
    
    return policy;
  } catch (error) {
    console.error('Erreur lors de la récupération de la politique de mot de passe:', error);
    
    // Retourner une politique par défaut en cas d'erreur
    return {
      min_length: 12,
      require_uppercase: true,
      require_numbers: true,
      require_special: true
    };
  }
}

/**
 * Génère un mot de passe temporaire en fonction du rôle
 * @param roleId ID du rôle ou nom du rôle
 * @returns Mot de passe temporaire généré
 */
export async function generateTemporaryPasswordForRole(roleId?: number | string): Promise<string> {
  try {
    // Récupérer la politique de mot de passe pour ce rôle
    const policy = await getPasswordPolicyForRole(roleId);
    
    // Récupérer les paramètres de sécurité
    const securitySettings = await prisma.security_settings.findFirst({
      orderBy: { updated_at: 'desc' },
    });
    
    // Vérifier si un mot de passe statique est défini dans les politiques
    let rolePolicies: any = {};
    try {
      if (securitySettings?.role_password_policies) {
        rolePolicies = JSON.parse(securitySettings.role_password_policies);
      }
    } catch (error) {
      console.error('Erreur lors du parsing des politiques de mot de passe:', error);
    }
    
    // Déterminer le nom du rôle
    let roleName = 'default';
    if (roleId) {
      if (typeof roleId === 'number') {
        const role = await prisma.roles.findUnique({
          where: { id: roleId },
          select: { name: true }
        });
        if (role?.name) {
          roleName = role.name;
        }
      } else if (typeof roleId === 'string') {
        roleName = roleId;
      }
    }
    
    // Vérifier si un mot de passe statique est défini pour ce rôle
    if (rolePolicies[roleName]?.password) {
      return rolePolicies[roleName].password;
    } else if (rolePolicies['default']?.password) {
      return rolePolicies['default'].password;
    }
    
    // Si aucun mot de passe statique n'est défini, générer un mot de passe aléatoire
    const tempPasswordLength = securitySettings?.temp_password_length || 16;
    
    // Utiliser la valeur la plus élevée entre la politique et la longueur par défaut
    const length = Math.max(policy.min_length, tempPasswordLength);
    
    // Générer le mot de passe
    return generateSecurePassword(length, {
      uppercase: policy.require_uppercase,
      lowercase: true, // Toujours requis
      numbers: policy.require_numbers,
      special: policy.require_special
    });
  } catch (error) {
    console.error('Erreur lors de la génération du mot de passe temporaire:', error);
    
    // En cas d'erreur, utiliser le mot de passe par défaut
    return 'P@ssw0rd';
  }
}

/**
 * Calcule la date d'expiration d'un mot de passe temporaire
 * @returns Date d'expiration
 */
export async function calculateTemporaryPasswordExpiry(): Promise<Date> {
  try {
    // Récupérer les paramètres de sécurité
    const securitySettings = await prisma.security_settings.findFirst({
      orderBy: { updated_at: 'desc' },
    });
    
    // Nombre d'heures avant expiration (24h par défaut)
    const expiryHours = securitySettings?.temp_password_expiry_hours || 24;
    
    // Calculer la date d'expiration
    const expiryDate = new Date();
    expiryDate.setHours(expiryDate.getHours() + expiryHours);
    
    return expiryDate;
  } catch (error) {
    console.error('Erreur lors du calcul de la date d\'expiration:', error);
    
    // Par défaut, expiration dans 24h
    const expiryDate = new Date();
    expiryDate.setHours(expiryDate.getHours() + 24);
    
    return expiryDate;
  }
}

/**
 * Vérifie la force d'un mot de passe
 * @param password Mot de passe à vérifier
 * @returns Score de 0 (très faible) à 4 (très fort)
 */
export function checkPasswordStrength(password: string): number {
  let score = 0;
  
  // Longueur minimale
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  
  // Complexité
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  
  // Limiter le score maximum à 4
  return Math.min(score, 4);
} 