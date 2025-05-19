/**
 * Script pour importer les employés à partir des access_logs
 * 
 * Ce script récupère les informations des employés à partir de la table access_logs
 * et les insère dans la table employees.
 * 
 * Usage: node scripts/import-employees-from-logs.js
 */

// Charger les variables d'environnement
require('dotenv').config();

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function importEmployeesFromLogs() {
  console.log('Démarrage de l\'importation des employés depuis les logs d\'accès...');
  
  try {
    // 1. Récupérer tous les logs d'accès avec person_type = 'employee' et qui ont un nom complet
    const uniqueEmployeeLogs = await prisma.access_logs.findMany({
      where: {
        person_type: 'employee',
        full_name: {
          not: '',
        },
        badge_number: {
          not: '',
        },
      },
      distinct: ['badge_number'],
      orderBy: {
        event_date: 'desc',
      },
    });

    console.log(`Trouvé ${uniqueEmployeeLogs.length} employés uniques dans les logs d'accès.`);

    let created = 0;
    let skipped = 0;
    let updated = 0;

    // 2. Pour chaque log unique, vérifier si l'employé existe déjà
    for (const log of uniqueEmployeeLogs) {
      const { badge_number, full_name, group_name } = log;
      
      // Ignorer les entrées sans nom complet ou badge
      if (!full_name || !badge_number) {
        console.log(`Log ignoré car données incomplètes: badge=${badge_number}, name=${full_name}`);
        continue;
      }
      
      // Vérifier si l'employé existe déjà
      const existingEmployee = await prisma.employees.findUnique({
        where: {
          badge_number,
        },
      });

      if (existingEmployee) {
        skipped++;
        console.log(`Employé avec badge ${badge_number} existe déjà, ignoré.`);
        continue;
      }

      // Extraire le prénom et le nom du full_name
      let firstName = '';
      let lastName = '';

      if (full_name) {
        const nameParts = full_name.trim().split(' ');
        if (nameParts.length >= 2) {
          firstName = nameParts[0];
          lastName = nameParts.slice(1).join(' ');
        } else {
          firstName = full_name;
          lastName = '';
        }
      }

      // Créer l'employé
      await prisma.employees.create({
        data: {
          badge_number,
          first_name: firstName,
          last_name: lastName,
          department: group_name || null,
          status: 'active',
          created_at: new Date(),
          updated_at: new Date(),
        },
      });

      created++;
      console.log(`Employé créé: ${firstName} ${lastName} (Badge: ${badge_number})`);
    }

    console.log('=== Rapport d\'importation ===');
    console.log(`Total des employés dans les logs: ${uniqueEmployeeLogs.length}`);
    console.log(`Employés créés: ${created}`);
    console.log(`Employés ignorés (déjà existants): ${skipped}`);
    console.log(`Employés mis à jour: ${updated}`);
    console.log('============================');

  } catch (error) {
    console.error('Erreur lors de l\'importation des employés:', error);
  } finally {
    await prisma.$disconnect();
    console.log('Importation terminée.');
  }
}

// Exécuter la fonction principale
importEmployeesFromLogs()
  .then(() => {
    console.log('Script exécuté avec succès.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Erreur lors de l\'exécution du script:', error);
    process.exit(1);
  }); 