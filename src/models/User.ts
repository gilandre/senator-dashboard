import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

// Définir les types pour l'utilisateur
export type UserRole = 'admin' | 'manager' | 'user' | 'viewer';
export type UserStatus = 'active' | 'inactive' | 'suspended' | 'deleted';

export interface IUserPasswordCompare {
  comparePassword: (candidatePassword: string) => Promise<boolean>;
}

export type IUser = {
  id: number;
  name: string;
  email: string;
  password: string;
  role: string;
  status: string;
  first_login?: boolean;
  created_at?: Date;
  updated_at?: Date;
  password_expiry_date?: Date;
  password_reset_expires?: Date | null;
  password_reset_token?: string | null;
} & IUserPasswordCompare;

/**
 * Créer un nouvel utilisateur
 */
export async function createUser(userData: {
  name: string;
  email: string;
  password: string;
  role?: UserRole;
  status?: UserStatus;
  first_login?: boolean;
}) {
  // Hacher le mot de passe
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(userData.password, salt);

  // Créer l'utilisateur avec Prisma
  return await prisma.user.create({
    data: {
      name: userData.name,
      email: userData.email,
      password: hashedPassword,
      role: userData.role || 'user',
      status: userData.status || 'active',
      first_login: userData.first_login ?? true,
      password_expiry_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // Expiration dans 90 jours
    }
  });
}

/**
 * Récupérer un utilisateur par ID
 */
export async function getUserById(id: number): Promise<IUser | null> {
  const user = await prisma.user.findUnique({
    where: { id }
  });

  if (!user) return null;

  return addUserMethods(user);
}

/**
 * Récupérer un utilisateur par email
 */
export async function getUserByEmail(email: string): Promise<IUser | null> {
  const user = await prisma.user.findUnique({
    where: { email }
  });

  if (!user) return null;

  return addUserMethods(user);
}

/**
 * Récupérer tous les utilisateurs
 */
export async function getAllUsers(options?: {
  skip?: number;
  take?: number;
  orderBy?: { [key: string]: 'asc' | 'desc' };
  where?: any;
}): Promise<IUser[]> {
  const users = await prisma.user.findMany({
    skip: options?.skip,
    take: options?.take,
    orderBy: options?.orderBy,
    where: options?.where,
  });

  return users.map(addUserMethods);
}

/**
 * Mettre à jour un utilisateur par ID
 */
export async function updateUser(id: number, data: Partial<IUser>): Promise<IUser | null> {
  // Hachage du mot de passe si présent
  if (data.password) {
    const salt = await bcrypt.genSalt(10);
    data.password = await bcrypt.hash(data.password, salt);
  }

  const user = await prisma.user.update({
    where: { id },
    data: {
      ...data,
      updated_at: new Date()
    }
  });

  return addUserMethods(user);
}

/**
 * Supprimer un utilisateur par ID
 */
export async function deleteUser(id: number): Promise<any | null> {
  return await prisma.user.delete({
    where: { id }
  });
}

/**
 * Ajouter des méthodes d'instance au modèle User
 */
function addUserMethods(user: any): IUser {
  const userWithMethods = user as IUser;
  
  // Méthode pour comparer les mots de passe
  userWithMethods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
    return bcrypt.compare(candidatePassword, user.password);
  };

  return userWithMethods;
}

// Extend User model with deactivation reason
interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  role: string;
  status: string;
  first_login?: boolean;
  created_at?: Date;
  updated_at?: Date;
  password_expiry_date?: Date;
  password_reset_expires?: Date | null;
  password_reset_token?: string | null;
  deactivationReason?: 'failed_attempts' | 'manual' | 'admin_action';
  failedLoginAttempts?: number;
}

export default {
  createUser,
  getUserById,
  getUserByEmail,
  getAllUsers,
  updateUser,
  deleteUser
};