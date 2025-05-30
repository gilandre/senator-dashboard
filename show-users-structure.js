const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function showUsersStructure() {
  try {
    console.log('Affichage de la structure de la table users...');
    
    // Récupérer la structure de la table users
    const structure = await prisma.$queryRaw`DESCRIBE users`;
    
    console.log('Structure de la table users:');
    console.table(structure);
    
    // Récupérer les utilisateurs avec une requête SQL directe
    const users = await prisma.$queryRaw`
      SELECT 
        id, name, email, role, role_id, status, status_id, first_login
      FROM users
    `;
    
    console.log('\nListe des utilisateurs:');
    console.table(users);
    
  } catch (error) {
    console.error('Erreur lors de l\'affichage de la structure:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Exécuter le script
showUsersStructure(); 