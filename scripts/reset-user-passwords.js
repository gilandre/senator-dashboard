const { PrismaClient } = require('@prisma/client');
const { hash } = require('bcryptjs');

const prisma = new PrismaClient();

async function resetAllUserPasswords() {
  try {
    console.log('Début de la réinitialisation des mots de passe...');
    
    // Hachage du nouveau mot de passe
    const hashedPassword = await hash('P@ssw0rd', 10);
    
    // Mise à jour de tous les utilisateurs - uniquement les champs qui existent
    const result = await prisma.user.updateMany({
      data: {
        password: hashedPassword,
        first_login: true,        // Forcer le changement de mot de passe à la prochaine connexion
      }
    });
    
    console.log(`${result.count} utilisateurs mis à jour avec succès.`);
    
    // Récupérer et afficher tous les utilisateurs pour vérification
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        first_login: true
      }
    });
    
    console.log('\nListe des utilisateurs:');
    users.forEach(user => {
      console.log(`- ${user.name} (${user.email}), Rôle: ${user.role}, Changement de mot de passe requis: ${user.first_login ? 'Oui' : 'Non'}`);
    });
    
    console.log('\nTous les mots de passe ont été réinitialisés à "P@ssw0rd"');
    console.log('Les utilisateurs devront changer leur mot de passe à la prochaine connexion.');
  } catch (error) {
    console.error('Erreur lors de la réinitialisation des mots de passe:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Exécuter la fonction
resetAllUserPasswords(); 