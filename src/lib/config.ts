/**
 * Configuration centralisée de l'application
 * Ce fichier expose toutes les variables d'environnement et configurations de manière cohérente
 */

// Valeurs par défaut pour le développement local
const DEFAULT_PORT = 3010;
const DEFAULT_API_URL = `http://localhost:${DEFAULT_PORT}`;

// Durée de session JWT en secondes (8 heures)
export const JWT_SESSION_DURATION = 60 * 60 * 8;

// Configuration des URLs et ports
export const config = {
  // URL de base de l'API, priorité à la variable d'environnement, sinon valeur par défaut
  apiUrl: process.env.NEXT_PUBLIC_API_URL || DEFAULT_API_URL,
  
  // Port de l'application
  port: process.env.PORT || DEFAULT_PORT,
  
  // URL de l'authentification NextAuth
  authUrl: process.env.NEXTAUTH_URL || DEFAULT_API_URL,
  
  // Timezone pour les dates
  timezone: process.env.TZ || 'Africa/Abidjan',
  
  // Mode de l'application
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  
  // URL de la base de données
  databaseUrl: process.env.DATABASE_URL || 'mysql://root:@localhost:3306/senator_investech',
  
  // Durée de session JWT en secondes (8 heures)
  jwtSessionDuration: JWT_SESSION_DURATION
};

/**
 * Construit une URL complète en utilisant l'URL de base de l'API
 * @param path - Le chemin à ajouter à l'URL de base
 * @returns L'URL complète
 */
export function buildUrl(path: string): string {
  // Supprimer les slashes en double
  const cleanPath = path.replace(/\/+/g, '/');
  // Supprimer le slash initial si présent
  const pathWithoutLeadingSlash = cleanPath.startsWith('/') ? cleanPath.slice(1) : cleanPath;
  // Construire l'URL complète
  return `${config.apiUrl}/${pathWithoutLeadingSlash}`;
}

export default config; 