const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Récupérer les rôles existants depuis l'enum
  const roleValues = ['admin', 'operator', 'viewer', 'user'];
  
  // Définir les descriptions pour chaque rôle
  const roleDescriptions = {
    admin: 'Administrateur avec accès complet au système',
    operator: 'Opérateur avec accès aux fonctions principales',
    viewer: 'Observateur avec accès en lecture seule',
    user: 'Utilisateur standard avec accès limité'
  };
  
  console.log(`Début de l'insertion des rôles...`);
  
  // Insérer ou mettre à jour chaque rôle
  for (const role of roleValues) {
    const existingRole = await prisma.roles.findUnique({
      where: { name: role },
    });
    
    if (!existingRole) {
      await prisma.roles.create({
        data: {
          name: role,
          description: roleDescriptions[role],
          is_active: true,
          is_default: role === 'user' // Marquer 'user' comme rôle par défaut
        },
      });
      console.log(`Rôle "${role}" créé avec succès`);
    } else {
      await prisma.roles.update({
        where: { id: existingRole.id },
        data: {
          description: roleDescriptions[role],
          is_active: true
        },
      });
      console.log(`Rôle "${role}" mis à jour`);
    }
  }
  
  console.log('Opération terminée');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 