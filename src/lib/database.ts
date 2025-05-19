import mongoose from 'mongoose';
// Importer tous les modèles pour s'assurer qu'ils sont enregistrés
import '@/models/index';

// Définir la chaîne de connexion à partir de la variable d'environnement
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/senator_db';

// Définir les options de connexion
const options: mongoose.ConnectOptions = {
  // Options supplémentaires si nécessaires
};

// Type pour la connexion en cache
interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

// Variable pour stocker la connexion
let cached: MongooseCache = (global as any).mongoose || { conn: null, promise: null };

// Initialiser le cache
if (!(global as any).mongoose) {
  (global as any).mongoose = cached;
}

// Fonction pour précharger les modèles
async function preloadModels() {
  try {
    // Importer les modèles pour s'assurer qu'ils sont enregistrés
    await Promise.all([
      import('@/models/User'),
      import('@/models/Profile'),
      import('@/models/Permission'),
      import('@/models/SecurityIncident'),
      import('@/models/SecuritySettings'),
      // Ajoutez ici d'autres modèles si nécessaire
    ]);
    
    console.log('Modèles préchargés avec succès');
  } catch (error) {
    console.error('Erreur lors du préchargement des modèles:', error);
  }
}

/**
 * Fonction pour se connecter à la base de données MongoDB
 * @returns Une promesse qui résout la connexion Mongoose
 */
export async function connectToDatabase() {
  // Si une connexion existe, la retourner
  if (cached.conn) {
    return cached.conn;
  }

  // Si une promesse de connexion existe, la retourner
  if (!cached.promise) {
    try {
      // Précharger les modèles avant de se connecter
      await preloadModels();
      
      // Créer la promesse de connexion
      cached.promise = mongoose.connect(MONGODB_URI, options)
        .then((mongoose) => {
          console.log('Connecté à MongoDB');
          return mongoose;
        })
        .catch((error) => {
          console.error('Erreur de connexion à MongoDB:', error);
          throw error;
        });
    } catch (error) {
      console.error('Erreur lors de l\'initialisation de la connexion MongoDB:', error);
      throw error;
    }
  }

  // Attendre la résolution de la promesse et stocker la connexion
  cached.conn = await cached.promise;
  return cached.conn;
}

/**
 * Déconnecte de la base de données MongoDB
 * Utile pour les tests et la fermeture propre de l'application
 */
export async function disconnectFromDatabase() {
  if (!cached.conn) {
    return;
  }

  try {
    await mongoose.disconnect();
    cached.conn = null;
    cached.promise = null;
    console.log('Déconnecté de MongoDB');
  } catch (error) {
    console.error('Erreur lors de la déconnexion de MongoDB:', error);
    throw error;
  }
}

/**
 * Vérifie si une connexion à MongoDB est active
 */
export function isConnectedToDatabase() {
  return !!cached.conn;
} 