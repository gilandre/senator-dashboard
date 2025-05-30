const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Début de la migration des rôles utilisateurs...');
    
    // 1. Récupérer tous les utilisateurs
    const users = await prisma.users.findMany();
    console.log(`${users.length} utilisateurs trouvés`);
    
    // 2. Pour chaque utilisateur, trouver le rôle correspondant et mettre à jour role_id
    let updatedCount = 0;
    for (const user of users) {
      const role = user.role; // Valeur enum actuelle (admin, user, etc.)
      
      // Trouver l'ID du rôle correspondant dans la table roles
      const roleRecord = await prisma.roles.findUnique({
        where: { name: role }
      });
      
      if (roleRecord) {
        // Mettre à jour l'utilisateur avec le role_id
        await prisma.users.update({
          where: { id: user.id },
          data: { role_id: roleRecord.id }
        });
        updatedCount++;
        console.log(`Utilisateur #${user.id} (${user.name}) - rôle '${role}' migré vers role_id ${roleRecord.id}`);
      } else {
        console.warn(`Avertissement: Rôle '${role}' non trouvé dans la table roles pour l'utilisateur #${user.id}`);
      }
    }
    
    console.log(`Migration terminée. ${updatedCount} utilisateurs mis à jour.`);
  } catch (error) {
    console.error('Erreur lors de la migration des rôles:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main(); 