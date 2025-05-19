/**
 * Script pour vérifier les variables d'environnement utilisées par l'application
 */

require('dotenv').config();

console.log('=== Variables d\'environnement ===');
console.log('PORT:', process.env.PORT || '3010 (défaut)');
console.log('NODE_ENV:', process.env.NODE_ENV || 'development (défaut)');
console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Configuré' : 'Non configuré');
console.log('MONGODB_URI:', process.env.MONGODB_URI ? 'Configuré' : 'Non configuré');
console.log('APP_URL:', process.env.APP_URL || `http://localhost:${process.env.PORT || 3010} (défaut)`);
console.log();
console.log('Note: Les variables manquantes utiliseront les valeurs par défaut.');
console.log('Pour configurer ces variables, créez ou modifiez le fichier .env à la racine du projet.'); 