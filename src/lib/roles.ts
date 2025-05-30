import { prisma } from './prisma';

/**
 * Service pour gérer les rôles d'utilisateurs
 */
export const RolesService = {
  /**
   * Récupère tous les rôles actifs
   */
  async getAllRoles() {
    return await prisma.roles.findMany({
      where: {
        is_active: true
      },
      orderBy: {
        name: 'asc'
      }
    });
  },

  /**
   * Récupère un rôle par son ID
   */
  async getRoleById(id: number) {
    return await prisma.roles.findUnique({
      where: { id }
    });
  },

  /**
   * Récupère un rôle par son nom
   */
  async getRoleByName(name: string) {
    return await prisma.roles.findUnique({
      where: { name }
    });
  },

  /**
   * Récupère le rôle par défaut (généralement 'user')
   */
  async getDefaultRole() {
    const defaultRole = await prisma.roles.findFirst({
      where: { is_default: true }
    });
    
    // Fallback sur le rôle "user" si aucun rôle par défaut n'est défini
    if (!defaultRole) {
      return await prisma.roles.findUnique({
        where: { name: 'user' }
      });
    }
    
    return defaultRole;
  },

  /**
   * Vérifie si un utilisateur a un rôle spécifique
   */
  async hasRole(userId: number, roleName: string) {
    const user = await prisma.users.findUnique({
      where: { id: userId },
      include: {
        role_relation: true
      }
    });
    
    if (!user || !user.role_relation) {
      return false;
    }
    
    return user.role_relation.name === roleName;
  },

  /**
   * Obtient le rôle d'un utilisateur
   */
  async getUserRole(userId: number) {
    const user = await prisma.users.findUnique({
      where: { id: userId },
      include: {
        role_relation: true
      }
    });
    
    return user?.role_relation;
  }
};

/**
 * Vérifie si l'utilisateur est un administrateur
 */
export function isAdmin(user: any) {
  if (!user) return false;
  
  // Support pour l'ancien système basé sur enum
  if (user.role === 'admin') return true;
  
  // Support pour le nouveau système basé sur relation
  if (user.role_relation?.name === 'admin') return true;
  
  return false;
}

/**
 * Vérifie si l'utilisateur est un opérateur ou administrateur
 */
export function isOperator(user: any) {
  if (!user) return false;
  
  // Support pour l'ancien système basé sur enum
  if (user.role === 'admin' || user.role === 'operator') return true;
  
  // Support pour le nouveau système basé sur relation
  if (user.role_relation?.name === 'admin' || user.role_relation?.name === 'operator') return true;
  
  return false;
} 