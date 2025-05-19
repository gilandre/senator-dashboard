// DÉPRÉCIÉ: Ce fichier est maintenu uniquement pour des raisons de compatibilité
// Utilisez prisma.ts à la place pour toutes les opérations de base de données

import { prisma } from './prisma';

console.warn(
  '⚠️ AVERTISSEMENT: La connexion MongoDB est dépréciée. ' +
  'Utilisez Prisma à la place pour toutes les opérations de base de données.'
);

/**
 * DÉPRÉCIÉ: Fonction de compatibilité qui ne connecte plus à MongoDB
 * @deprecated Utilisez prisma à la place
 */
export async function connectToDatabase() {
  console.warn(
    '⚠️ AVERTISSEMENT: connectToDatabase() est déprécié. ' +
    'Utilisez prisma à la place pour toutes les opérations de base de données.'
  );
  
  // Retourne simplement une promesse résolue
  return Promise.resolve({ readyState: 1 });
}

/**
 * DÉPRÉCIÉ: Fonction de compatibilité qui ne déconnecte plus de MongoDB
 * @deprecated Utilisez $disconnect sur l'instance Prisma si nécessaire
 */
export async function disconnectFromDatabase() {
  console.warn(
    '⚠️ AVERTISSEMENT: disconnectFromDatabase() est déprécié. ' +
    'Utilisez prisma.$disconnect() si nécessaire.'
  );
  
  return Promise.resolve(true);
} 