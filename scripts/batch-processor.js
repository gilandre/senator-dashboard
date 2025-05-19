/**
 * Batch Processor
 * 
 * Ce script exécute différentes tâches de synchronisation entre les logs d'accès
 * et les tables de référence du système.
 */

const { PrismaClient } = require('@prisma/client');
const path = require('path');
const fs = require('fs');
const prisma = new PrismaClient();

// Configuration
const BATCH_CONFIG = {
  syncDepartments: true,  // Synchroniser les départements
  syncEmployees: false,   // À implémenter plus tard
  syncVisitors: false,    // À implémenter plus tard
  logToFile: true,        // Journaliser dans un fichier
};

// Initialisation des journaux
const LOG_DIR = path.join(__dirname, '../logs');
const LOG_FILE = path.join(LOG_DIR, `batch-${new Date().toISOString().slice(0, 10)}.log`);

// Créer le répertoire de logs s'il n'existe pas
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

/**
 * Fonction pour journaliser les messages
 */
function log(message, type = 'INFO') {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${type}] ${message}`;
  
  console.log(logMessage);
  
  if (BATCH_CONFIG.logToFile) {
    fs.appendFileSync(LOG_FILE, logMessage + '\n');
  }
}

/**
 * Synchronisation des départements
 */
async function syncDepartments() {
  log('Démarrage de la synchronisation des départements...', 'TASK');

  try {
    // 1. Récupérer tous les group_name uniques et non-null de la table access_logs
    const uniqueGroups = await prisma.$queryRaw`
      SELECT DISTINCT group_name 
      FROM access_logs 
      WHERE group_name IS NOT NULL AND group_name != ''
    `;

    log(`Trouvé ${uniqueGroups.length} départements uniques dans les logs d'accès.`);

    // 2. Pour chaque département, vérifier s'il existe déjà et l'ajouter si nécessaire
    let newDepartments = 0;
    
    for (const group of uniqueGroups) {
      const departmentName = group.group_name.trim();
      
      // Ignorer les valeurs vides après trim
      if (!departmentName) continue;
      
      // Vérifier si le département existe déjà
      const existingDepartment = await prisma.departments.findUnique({
        where: { name: departmentName }
      });
      
      // Si le département n'existe pas, le créer
      if (!existingDepartment) {
        await prisma.departments.create({
          data: {
            name: departmentName,
            description: `Département ${departmentName}`,
            location: 'À définir'
          }
        });
        
        newDepartments++;
        log(`Ajout du département: ${departmentName}`);
      }
    }
    
    log(`Synchronisation terminée. ${newDepartments} nouveaux départements ajoutés.`, 'SUCCESS');
    
    // 3. Mettre à jour les employés avec leur département_id en utilisant des requêtes Prisma
    log('Mise à jour des associations employés-départements...');
    
    // Récupérer tous les départements
    const departments = await prisma.departments.findMany();
    
    // Pour chaque département, mettre à jour les employés correspondants
    let totalUpdated = 0;
    
    for (const dept of departments) {
      // Trouver les employés dont le champ department correspond au nom du département
      // mais dont le department_id n'est pas défini
      const employees = await prisma.employees.findMany({
        where: {
          department: dept.name,
          department_id: null
        }
      });
      
      // Mettre à jour chaque employé
      for (const employee of employees) {
        await prisma.employees.update({
          where: { id: employee.id },
          data: { department_id: dept.id }
        });
        totalUpdated++;
      }
    }
    
    log(`${totalUpdated} employés associés à leur département.`, 'SUCCESS');
    return true;

  } catch (error) {
    log(`Erreur lors de la synchronisation des départements: ${error.message}`, 'ERROR');
    return false;
  }
}

/**
 * Fonction principale d'exécution du batch
 */
async function runBatch() {
  log('Démarrage du traitement batch...', 'START');
  
  try {
    // Synchronisation des départements
    if (BATCH_CONFIG.syncDepartments) {
      const deptSuccess = await syncDepartments();
      if (!deptSuccess) {
        log('Échec de la synchronisation des départements', 'WARNING');
      }
    }
    
    // Ajouter ici d'autres tâches de synchronisation
    
    log('Traitement batch terminé avec succès.', 'FINISH');
    
  } catch (error) {
    log(`Erreur fatale dans le traitement batch: ${error.message}`, 'FATAL');
  } finally {
    await prisma.$disconnect();
  }
}

// Exécuter le batch
runBatch()
  .then(() => {
    process.exit(0);
  })
  .catch(error => {
    log(`Erreur non gérée: ${error.message}`, 'FATAL');
    process.exit(1);
  }); 