import { prisma } from '@/lib/prisma';

export interface IPasswordHistory {
  id?: number;
  user_id: number;
  password_hash: string;
  created_at?: Date;
}

/**
 * Ajouter un mot de passe à l'historique
 */
export async function addPasswordToHistory(userId: number, passwordHash: string): Promise<IPasswordHistory> {
  return await prisma.password_history.create({
    data: {
      user_id: userId,
      password_hash: passwordHash,
      created_at: new Date()
    }
  });
}

/**
 * Récupérer l'historique des mots de passe d'un utilisateur
 */
export async function getUserPasswordHistory(userId: number, limit?: number): Promise<IPasswordHistory[]> {
  return await prisma.password_history.findMany({
    where: {
      user_id: userId
    },
    orderBy: {
      created_at: 'desc'
    },
    take: limit
  });
}

/**
 * Vérifier si un mot de passe existe déjà dans l'historique
 */
export async function isPasswordInHistory(userId: number, passwordHash: string, count: number = 3): Promise<boolean> {
  const history = await prisma.password_history.findMany({
    where: {
      user_id: userId
    },
    orderBy: {
      created_at: 'desc'
    },
    take: count
  });

  return history.some(entry => entry.password_hash === passwordHash);
}

/**
 * Effacer l'historique des mots de passe au-delà d'une certaine limite
 */
export async function cleanPasswordHistory(userId: number, keepCount: number = 5): Promise<void> {
  // Récupérer tous les enregistrements triés par date
  const allHistory = await prisma.password_history.findMany({
    where: {
      user_id: userId
    },
    orderBy: {
      created_at: 'desc'
    }
  });

  // S'il y a plus d'enregistrements que la limite, supprimer les plus anciens
  if (allHistory.length > keepCount) {
    const toDelete = allHistory.slice(keepCount);
    
    for (const entry of toDelete) {
      await prisma.password_history.delete({
        where: {
          id: entry.id
        }
      });
    }
  }
}

export default {
  addPasswordToHistory,
  getUserPasswordHistory,
  isPasswordInHistory,
  cleanPasswordHistory
}; 