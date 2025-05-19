/**
 * Script de vérification du schéma de la base de données
 * 
 * Ce script permet de vérifier les colonnes disponibles dans nos tables
 * pour aider à résoudre les problèmes liés aux noms de colonnes incorrects
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTableColumns(tableName) {
  try {
    console.log(`\n=== Vérification des colonnes de la table ${tableName} ===`);
    
    const columns = await prisma.$queryRaw`
      SELECT 
        COLUMN_NAME, 
        DATA_TYPE, 
        IS_NULLABLE, 
        COLUMN_DEFAULT,
        COLUMN_COMMENT
      FROM 
        INFORMATION_SCHEMA.COLUMNS 
      WHERE 
        TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = ${tableName}
      ORDER BY 
        ORDINAL_POSITION
    `;
    
    if (columns.length === 0) {
      console.log(`La table ${tableName} n'existe pas ou n'a pas de colonnes.`);
      return;
    }
    
    // Afficher les colonnes dans un format lisible
    console.log('Nom de colonne'.padEnd(25) + 'Type'.padEnd(20) + 'Nullable'.padEnd(10) + 'Défaut');
    console.log('─'.repeat(80));
    
    columns.forEach(col => {
      console.log(
        `${col.COLUMN_NAME.padEnd(25)}${col.DATA_TYPE.padEnd(20)}${col.IS_NULLABLE.padEnd(10)}${col.COLUMN_DEFAULT || 'NULL'}`
      );
    });
    
    return columns;
  } catch (error) {
    console.error(`Erreur lors de la vérification de la table ${tableName}:`, error);
  }
}

async function main() {
  try {
    // Vérifier les tables principales
    await checkTableColumns('access_logs');
    await checkTableColumns('employees');
    await checkTableColumns('visitors');
    await checkTableColumns('departments');
    await checkTableColumns('security_incidents');
  } catch (error) {
    console.error('Erreur lors de la vérification du schéma:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Exécuter le script
console.log('=== VÉRIFICATION DU SCHÉMA DE LA BASE DE DONNÉES ===\n');
main()
  .then(() => {
    console.log('\nVérification du schéma terminée!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\nErreur non gérée:', error);
    process.exit(1);
  }); 