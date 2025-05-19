/**
 * Script de démarrage qui charge les variables d'environnement depuis .env
 * et démarre l'application Next.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Charge les variables d'environnement depuis .env
const envPath = path.resolve(process.cwd(), '.env');

if (fs.existsSync(envPath)) {
  console.log('Chargement des variables d\'environnement depuis .env');
  dotenv.config({ path: envPath });
} else {
  console.warn('Fichier .env non trouvé. Création d\'un fichier .env par défaut...');
  
  // Valeurs par défaut
  const defaultEnv = `# Configuration du serveur
PORT=3010

# Configuration de la base de données MySQL
DATABASE_URL="mysql://root:password@localhost:3306/senator_db"

# Configuration MongoDB (maintenue pour la période de transition)
MONGODB_URI="mongodb://localhost:27017/senatorDb"

# Configuration de l'application
NODE_ENV="development"
APP_URL="http://localhost:3010"
`;

  fs.writeFileSync(envPath, defaultEnv);
  console.log('Fichier .env créé avec les valeurs par défaut.');
  dotenv.config({ path: envPath });
}

// Définit explicitement la variable PORT
process.env.PORT = process.env.PORT || '3010';

// Prépare la commande
const isProduction = process.env.NODE_ENV === 'production';
const command = isProduction 
  ? `npm run start` 
  : `npm run dev`;

console.log(`Démarrage de l'application sur le port ${process.env.PORT}...`);
console.log(`Mode: ${isProduction ? 'production' : 'développement'}`);

// Exécute la commande
try {
  execSync(command, { 
    stdio: 'inherit',
    env: process.env
  });
} catch (error) {
  console.error('Erreur lors du démarrage de l\'application:', error);
  process.exit(1);
} 