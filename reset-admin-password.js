const { PrismaClient } = require('@prisma/client');
const { hash } = require('bcryptjs');

const prisma = new PrismaClient();

async function resetAdminPassword() {
  try {
    console.log('Début de la réinitialisation du mot de passe administrateur...');
    
    // Définir un nouveau mot de passe simple
    const newPassword = 'Admin123!';
    
    // Hacher le nouveau mot de passe
    const hashedPassword = await hash(newPassword, 10);
    
    // Mettre à jour l'utilisateur administrateur par son email
    const result = await prisma.$executeRawUnsafe(
      `UPDATE users SET password = ?, first_login = ?, updated_at = NOW() WHERE email = ?`,
      hashedPassword,
      false,
      'admin@senator.com'
    );
    
    console.log(`Mise à jour effectuée : ${result} utilisateur(s) affecté(s)`);
    console.log(`\nMot de passe réinitialisé pour admin@senator.com`);
    console.log(`Nouveau mot de passe : ${newPassword}`);
  } catch (error) {
    console.error('Erreur lors de la réinitialisation du mot de passe :', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Exécuter le script
resetAdminPassword(); 