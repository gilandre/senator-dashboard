/**
 * Hooks pour le traitement post-importation de fichiers CSV
 * Ces fonctions sont appelées automatiquement après l'importation de données
 */

const { PrismaClient } = require('@prisma/client');

// Récupérer la chaîne de connexion du fichier .env
const dbUrl = process.env.DATABASE_URL;

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: dbUrl
    },
  },
});

/**
 * Met à jour le champ person_type en fonction de plusieurs critères
 * Règles harmonisées avec les autres parties de l'application:
 * - Badge commençant par V-, VIS-, VISIT-
 * - Statut contenant "visiteur", "visitor", "extern", "temp"
 * - Groupe/département contenant "visiteur", "visitor", "extern", "prestataire"
 */
async function updatePersonTypeAfterImport() {
  console.log('[Post-Import] Mise à jour du champ person_type...');
  
  try {
    // 1. Mettre à jour comme "visitor" selon des critères multiples
    const visitorsResult = await prisma.$executeRaw`
      UPDATE access_logs 
      SET person_type = 'visitor'
      WHERE (
        /* Critères liés au groupe/département */
        group_name LIKE '%visiteur%' OR
        group_name LIKE '%Visiteur%' OR
        group_name LIKE '%VISITEUR%' OR
        group_name LIKE '%visitor%' OR
        group_name LIKE '%Visitor%' OR
        group_name LIKE '%VISITOR%' OR
        group_name LIKE '%extern%' OR
        group_name LIKE '%Extern%' OR
        group_name LIKE '%EXTERN%' OR
        group_name LIKE '%prestataire%' OR
        group_name LIKE '%Prestataire%' OR
        
        /* Critères liés au badge */
        badge_number LIKE 'V-%' OR
        badge_number LIKE 'VIS-%' OR
        badge_number LIKE 'VISIT-%'
      )
      AND processed = 0
    `;
    
    // 2. Mettre à jour les tables visitors et employees
    await updateVisitorsTable();
    await updateEmployeesTable();
    
    // 3. Mettre à jour comme "employee" tous les autres enregistrements non traités
    const employeesResult = await prisma.$executeRaw`
      UPDATE access_logs 
      SET person_type = 'employee'
      WHERE person_type IS NULL OR person_type = ''
      AND processed = 0
    `;
    
    console.log(`[Post-Import] ${visitorsResult} visiteurs et ${employeesResult} employés mis à jour.`);
    return { success: true, visitorsUpdated: visitorsResult, employeesUpdated: employeesResult };
  } catch (error) {
    console.error('[Post-Import] Erreur lors de la mise à jour du person_type:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Met à jour la table visitors avec les nouvelles données
 */
async function updateVisitorsTable() {
  try {
    // Récupérer les informations des visiteurs uniques depuis access_logs
    const visitors = await prisma.$queryRaw`
      SELECT DISTINCT 
        badge_number, 
        full_name,
        group_name as company
      FROM access_logs
      WHERE person_type = 'visitor'
      AND processed = 0
    `;
    
    // Pour chaque visiteur, l'insérer ou mettre à jour la table visitors
    let updatedCount = 0;
    for (const visitor of visitors) {
      // Extraire prénom et nom si possible
      let firstName = '';
      let lastName = '';
      
      if (visitor.full_name) {
        const nameParts = visitor.full_name.split(' ');
        if (nameParts.length > 1) {
          firstName = nameParts[0];
          lastName = nameParts.slice(1).join(' ');
        } else {
          lastName = visitor.full_name;
        }
      }
      
      // Upsert dans la table visitors
      await prisma.visitors.upsert({
        where: { badge_number: visitor.badge_number },
        update: {
          last_seen: new Date(),
          access_count: { increment: 1 }
        },
        create: {
          badge_number: visitor.badge_number,
          first_name: firstName,
          last_name: lastName,
          company: visitor.company || '',
          first_seen: new Date(),
          last_seen: new Date(),
          access_count: 1,
          status: 'active'
        }
      });
      
      updatedCount++;
    }
    
    console.log(`[Post-Import] ${updatedCount} visiteurs ajoutés/mis à jour dans la table visitors.`);
    return { success: true, count: updatedCount };
  } catch (error) {
    console.error('[Post-Import] Erreur lors de la mise à jour de la table visitors:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Met à jour la table employees avec les nouvelles données
 */
async function updateEmployeesTable() {
  try {
    // Récupérer les informations des employés uniques depuis access_logs
    const employees = await prisma.$queryRaw`
      SELECT DISTINCT 
        badge_number, 
        full_name,
        group_name as department
      FROM access_logs
      WHERE person_type = 'employee'
      AND processed = 0
    `;
    
    // Pour chaque employé, l'insérer ou mettre à jour la table employees
    let updatedCount = 0;
    for (const employee of employees) {
      // Extraire prénom et nom si possible
      let firstName = '';
      let lastName = '';
      
      if (employee.full_name) {
        const nameParts = employee.full_name.split(' ');
        if (nameParts.length > 1) {
          firstName = nameParts[0];
          lastName = nameParts.slice(1).join(' ');
        } else {
          lastName = employee.full_name;
        }
      }
      
      // Upsert dans la table employees
      await prisma.employees.upsert({
        where: { badge_number: employee.badge_number },
        update: {
          department: employee.department || '',
          updated_at: new Date()
        },
        create: {
          badge_number: employee.badge_number,
          first_name: firstName,
          last_name: lastName,
          department: employee.department || '',
          status: 'active',
          created_at: new Date(),
          updated_at: new Date()
        }
      });
      
      updatedCount++;
    }
    
    console.log(`[Post-Import] ${updatedCount} employés ajoutés/mis à jour dans la table employees.`);
    return { success: true, count: updatedCount };
  } catch (error) {
    console.error('[Post-Import] Erreur lors de la mise à jour de la table employees:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Met à jour le champ direction pour les enregistrements sans direction spécifiée
 * en utilisant les mêmes règles que dans le reste de l'application
 */
async function updateDirectionField() {
  console.log('[Post-Import] Mise à jour du champ direction...');
  
  try {
    // 1. Mise à jour des entrées basées sur le nom du lecteur
    const entriesResult = await prisma.$executeRaw`
      UPDATE access_logs 
      SET direction = 'in'
      WHERE (
        (direction IS NULL OR direction = '') AND
        (
          reader LIKE '%entre%' OR
          reader LIKE '%entr%e%' OR
          reader LIKE '%entry%' OR
          reader LIKE '%in%' OR
          reader LIKE '%IN%' OR
          event_type LIKE '%entry%' OR
          event_type LIKE '%entre%'
        )
      )
      AND processed = 0
    `;
    
    // 2. Mise à jour des sorties basées sur le nom du lecteur
    const exitsResult = await prisma.$executeRaw`
      UPDATE access_logs 
      SET direction = 'out'
      WHERE (
        (direction IS NULL OR direction = '') AND
        (
          reader LIKE '%sort%' OR
          reader LIKE '%exit%' OR
          reader LIKE '%out%' OR
          reader LIKE '%OUT%' OR
          event_type LIKE '%exit%' OR
          event_type LIKE '%sort%'
        )
      )
      AND processed = 0
    `;
    
    // 3. Par défaut, on considère comme entrée si non spécifié
    const defaultResult = await prisma.$executeRaw`
      UPDATE access_logs 
      SET direction = 'in'
      WHERE (direction IS NULL OR direction = '')
      AND processed = 0
    `;
    
    console.log(`[Post-Import] Direction mise à jour: ${entriesResult} entrées, ${exitsResult} sorties, ${defaultResult} par défaut.`);
    return { success: true, entriesUpdated: entriesResult, exitsUpdated: exitsResult, defaultUpdated: defaultResult };
  } catch (error) {
    console.error('[Post-Import] Erreur lors de la mise à jour de la direction:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Marque les enregistrements importés comme traités
 */
async function markAsProcessed() {
  try {
    const result = await prisma.$executeRaw`
      UPDATE access_logs 
      SET processed = 1
      WHERE processed = 0
    `;
    
    console.log(`[Post-Import] ${result} enregistrements marqués comme traités.`);
    return { success: true, processed: result };
  } catch (error) {
    console.error('[Post-Import] Erreur lors du marquage des enregistrements:', error);
    return { success: false, error: error.message };
  }
}

// Exporter les hooks
module.exports = {
  updatePersonTypeAfterImport,
  updateDirectionField,
  updateVisitorsTable,
  updateEmployeesTable,
  markAsProcessed,
  
  // Hook principal qui exécute tous les traitements
  afterImport: async function() {
    const typeUpdateResult = await updatePersonTypeAfterImport();
    const directionUpdateResult = await updateDirectionField();
    const processResult = await markAsProcessed();
    
    return {
      typeUpdate: typeUpdateResult,
      directionUpdate: directionUpdateResult,
      processed: processResult,
      success: typeUpdateResult.success && directionUpdateResult.success && processResult.success
    };
  }
}; 