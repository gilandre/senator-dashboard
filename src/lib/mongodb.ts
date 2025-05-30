/**
 * DEPRECATED: Ce fichier est maintenu pour des raisons de compatibilité
 * Toutes les fonctions redirigent maintenant vers Prisma
 */

import { prisma } from './prisma';

// Avertissement de dépréciation
console.warn(
  '⚠️ AVERTISSEMENT: Le module MongoDB est déprécié. ' +
  'Utilisez Prisma directement pour toutes les opérations de base de données.'
);

// Stub pour l'interface MongoDB
export const mongoose = {
  connect: () => Promise.resolve(),
  connection: {
    db: null,
    readyState: 1,
    on: () => {},
    once: () => {},
    close: () => Promise.resolve()
  },
  model: () => ({ 
    find: () => ({ exec: () => Promise.resolve([]) }),
    findOne: () => Promise.resolve(null),
    create: () => Promise.resolve({}),
    updateOne: () => Promise.resolve({ modifiedCount: 0 }),
    deleteOne: () => Promise.resolve({ deletedCount: 0 }),
    deleteMany: () => Promise.resolve({ deletedCount: 0 }),
    countDocuments: () => Promise.resolve(0)
  }),
  Schema: function() { return {}; }
};

/**
 * DEPRECATED: Fonction de compatibilité qui retourne Prisma
 * @returns Une promise résolue avec un objet factice de connexion
 */
export async function connectToDatabase() {
  console.warn(
    '⚠️ AVERTISSEMENT: connectToDatabase() est déprécié. ' +
    'Utilisez prisma directement pour toutes les opérations de base de données.'
  );
  
  return Promise.resolve({ 
    db: null,
    client: null,
    readyState: 1,
    prisma
  });
}

/**
 * DEPRECATED: Fonction de compatibilité qui ne fait plus rien
 */
export async function disconnectFromDatabase() {
  console.warn(
    '⚠️ AVERTISSEMENT: disconnectFromDatabase() est déprécié. ' +
    'Utilisez prisma.$disconnect() si nécessaire.'
  );
  
  return Promise.resolve(true);
}

// Export de l'instance prisma comme valeur par défaut
export default prisma; 