import { prisma } from './prisma';

/**
 * Utilitaires pour la gestion des rôles
 */

/**
 * Obtient l'ID du rôle à partir de son nom
 */
export async function getRoleIdFromName(roleName: string): Promise<number | null> {
  const role = await prisma.roles.findUnique({
    where: { name: roleName }
  });
  
  return role?.id || null;
}

/**
 * Obtient le rôle par défaut (généralement 'user')
 */
export async function getDefaultRoleId(): Promise<number | null> {
  // Chercher d'abord un rôle marqué comme défaut
  const defaultRole = await prisma.roles.findFirst({
    where: { is_default: true }
  });
  
  if (defaultRole) {
    return defaultRole.id;
  }
  
  // Sinon utiliser 'user' comme valeur par défaut
  const userRole = await prisma.roles.findUnique({
    where: { name: 'user' }
  });
  
  return userRole?.id || null;
}

/**
 * Vérifie si l'utilisateur a un rôle spécifique
 * Supporte à la fois l'ancien modèle (enum) et le nouveau (relation)
 */
export function hasRole(user: any, roleName: string): boolean {
  if (!user) return false;
  
  // Vérifier l'ancien modèle (enum)
  if (user.role === roleName) return true;
  
  // Vérifier le nouveau modèle (relation)
  if (user.role_relation?.name === roleName) return true;
  
  return false;
}

/**
 * Vérifie si l'utilisateur est administrateur
 */
export function isAdmin(user: any): boolean {
  return hasRole(user, 'admin');
}

/**
 * Vérifie si l'utilisateur est opérateur
 */
export function isOperator(user: any): boolean {
  return hasRole(user, 'admin') || hasRole(user, 'operator');
}

/**
 * Vérifie si l'utilisateur est observateur
 */
export function isViewer(user: any): boolean {
  return hasRole(user, 'admin') || hasRole(user, 'operator') || hasRole(user, 'viewer');
}

/**
 * Type pour les rôles utilisateur
 */
export type UserRole = {
  id: number;
  name: string;
  description?: string | null;
}; 