/**
 * Script de migration des données de MongoDB vers MySQL via Prisma
 * 
 * Ce script lit les données de MongoDB et les écrit dans la base de données MySQL
 * en utilisant Prisma. Il est conçu pour être exécuté une seule fois lors de la
 * migration complète de la base de données.
 * 
 * Usage:
 * node scripts/migrate-mongodb-to-mysql.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

// MongoDB connection string
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/senatorDb';

// Initialiser Prisma
const prisma = new PrismaClient();

// Définir les modèles MongoDB
const UserSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  role: String,
  status: String,
  createdAt: Date,
  updatedAt: Date
});

// Fonction principale de migration
async function migrateData() {
  try {
    console.log('Début de la migration MongoDB -> MySQL...');
    
    // Connecter à MongoDB
    console.log('Connexion à MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connecté à MongoDB');
    
    // Enregistrer les modèles
    const User = mongoose.model('User', UserSchema);
    
    // Migrer les utilisateurs
    console.log('Migration des utilisateurs...');
    const users = await User.find({});
    console.log(`${users.length} utilisateurs trouvés dans MongoDB`);
    
    for (const user of users) {
      try {
        // Vérifier si l'utilisateur existe déjà dans MySQL
        const existingUser = await prisma.user.findUnique({
          where: { email: user.email }
        });
        
        if (!existingUser) {
          await prisma.user.create({
            data: {
              name: user.name,
              email: user.email,
              password: user.password, // Copier le hash du mot de passe
              role: user.role,
              status: user.status || 'active',
              created_at: user.createdAt || new Date(),
              updated_at: user.updatedAt || new Date(),
              first_login: false // Désactiver le premier login puisque l'utilisateur existe déjà
            }
          });
          console.log(`✅ Utilisateur migré: ${user.email}`);
        } else {
          console.log(`⚠️ Utilisateur déjà existant dans MySQL: ${user.email}`);
        }
      } catch (err) {
        console.error(`❌ Erreur lors de la migration de l'utilisateur ${user.email}:`, err);
      }
    }
    
    // Ajouter ici d'autres migrations pour les autres collections
    // ...
    
    console.log('Migration terminée avec succès');
  } catch (error) {
    console.error('Erreur lors de la migration:', error);
  } finally {
    // Fermer les connexions
    await mongoose.disconnect();
    await prisma.$disconnect();
  }
}

// Exécuter la migration
migrateData(); 