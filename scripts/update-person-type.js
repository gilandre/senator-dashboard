/**
 * Script pour mettre à jour le champ person_type dans access_logs
 * en fonction du champ group_name
 * 
 * Règle:
 * - Si group_name contient "visiteur" (dans n'importe quelle casse) => person_type = "visitor"
 * - Sinon => person_type = "employee"
 */
require('dotenv').config();

const { PrismaClient } = require('@prisma/client');

// Récupérer la chaîne de connexion à partir de .env mais forcer l'absence de mot de passe
const dbUrl = process.env.DATABASE_URL;
console.log('URL de connexion à la base de données:', dbUrl);

// Extraire et modifier l'URL pour enlever le mot de passe
const regex = /mysql:\/\/([^:]+)(:([^@]+))?@([^:]+):(\d+)\/(.+)/;
const match = dbUrl.match(regex);

let modifiedUrl;
if (match) {
  const [, user, , password, host, port, database] = match;
  modifiedUrl = `mysql://${user}@${host}:${port}/${database}`;
  console.log('URL modifiée (sans mot de passe):', modifiedUrl);
} else {
  modifiedUrl = "mysql://root@localhost:3306/senator_investech";
  console.log('Format d\'URL non reconnu, utilisation de l\'URL par défaut:', modifiedUrl);
}

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: modifiedUrl
    },
  },
});

async function updatePersonType() {
  try {
    console.log('Début de la mise à jour du champ person_type dans access_logs...');
    
    // Vérifier si la table contient des enregistrements
    const totalCount = await prisma.access_logs.count();
    console.log(`La table access_logs contient ${totalCount} enregistrements.`);
    
    if (totalCount === 0) {
      console.log('ATTENTION: La table est vide. Aucun enregistrement à mettre à jour.');
      return;
    }
    
    const startTime = Date.now();
    
    // 1. Mettre à jour comme "visitor" tous les enregistrements dont group_name contient "visiteur"
    console.log('Mise à jour des enregistrements de visiteurs...');
    const visitorsResult = await prisma.$executeRaw`
      UPDATE access_logs 
      SET person_type = 'visitor'
      WHERE (
        group_name LIKE '%visiteur%' OR
        group_name LIKE '%Visiteur%' OR
        group_name LIKE '%VISITEUR%' OR
        group_name LIKE '%visiteurs%' OR
        group_name LIKE '%Visiteurs%' OR
        group_name LIKE '%VISITEURS%'
      )
    `;
    
    console.log(`${visitorsResult} enregistrements mis à jour comme visiteurs.`);
    
    // 2. Mettre à jour comme "employee" tous les autres enregistrements
    console.log('Mise à jour des enregistrements d\'employés...');
    const employeesResult = await prisma.$executeRaw`
      UPDATE access_logs 
      SET person_type = 'employee'
      WHERE NOT (
        group_name LIKE '%visiteur%' OR
        group_name LIKE '%Visiteur%' OR
        group_name LIKE '%VISITEUR%' OR
        group_name LIKE '%visiteurs%' OR
        group_name LIKE '%Visiteurs%' OR
        group_name LIKE '%VISITEURS%'
      )
    `;
    
    console.log(`${employeesResult} enregistrements mis à jour comme employés.`);
    
    // 3. Statistiques après mise à jour
    const visitorCount = await prisma.access_logs.count({
      where: {
        person_type: 'visitor'
      }
    });
    
    const employeeCount = await prisma.access_logs.count({
      where: {
        person_type: 'employee'
      }
    });
    
    console.log('\nStatistiques après mise à jour:');
    console.log(`Total des enregistrements: ${totalCount}`);
    console.log(`Visiteurs: ${visitorCount} (${(visitorCount / totalCount * 100).toFixed(2)}%)`);
    console.log(`Employés: ${employeeCount} (${(employeeCount / totalCount * 100).toFixed(2)}%)`);
    
    const duration = (Date.now() - startTime) / 1000;
    console.log(`\nMise à jour terminée en ${duration.toFixed(2)} secondes.`);
    
  } catch (error) {
    console.error('Erreur lors de la mise à jour:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Exécuter le script
updatePersonType()
  .then(() => {
    console.log('Script exécuté avec succès.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Erreur lors de l\'exécution du script:', error);
    process.exit(1);
  }); 