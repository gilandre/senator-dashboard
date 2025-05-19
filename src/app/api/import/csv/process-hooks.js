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
 * Met à jour le champ person_type en fonction du champ group_name
 * Règle:
 * - Si group_name contient "visiteur" => person_type = "visitor"
 * - Sinon => person_type = "employee"
 */
async function updatePersonTypeAfterImport() {
  console.log('[Post-Import] Mise à jour du champ person_type...');
  
  try {
    // 1. Mettre à jour comme "visitor" tous les enregistrements dont group_name contient "visiteur"
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
      AND processed = 0
    `;
    
    // 2. Mettre à jour comme "employee" tous les autres enregistrements non traités
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
  markAsProcessed,
  
  // Hook principal qui exécute tous les traitements
  afterImport: async function() {
    const typeUpdateResult = await updatePersonTypeAfterImport();
    const processResult = await markAsProcessed();
    
    return {
      typeUpdate: typeUpdateResult,
      processed: processResult,
      success: typeUpdateResult.success && processResult.success
    };
  }
}; 