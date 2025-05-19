/**
 * Script pour ajouter la colonne person_type à la table access_logs
 */
require('dotenv').config();

const mysql = require('mysql2/promise');

async function addPersonTypeColumn() {
  // Récupérer la chaîne de connexion à partir de .env
  const dbUrl = process.env.DATABASE_URL;
  console.log('URL de connexion à la base de données:', dbUrl);
  
  // Extraire les informations de connexion de DATABASE_URL
  const regex = /mysql:\/\/([^:]+)(:([^@]+))?@([^:]+):(\d+)\/(.+)/;
  const match = dbUrl.match(regex);
  
  if (!match) {
    throw new Error('Format DATABASE_URL invalide');
  }
  
  const [, user, , password, host, port, database] = match;
  
  console.log(`Connexion à la base de données ${database} sur ${host}:${port} avec l'utilisateur ${user} (sans mot de passe)...`);
  
  // Créer la connexion sans mot de passe comme demandé
  const connection = await mysql.createConnection({
    host,
    user,
    password: '', // Utiliser une chaîne vide pour le mot de passe
    database,
    port: parseInt(port)
  });

  try {
    // Vérifier si la table access_logs contient des enregistrements
    console.log('Vérification des enregistrements dans access_logs...');
    const [rows] = await connection.execute('SELECT COUNT(*) as count FROM access_logs');
    const count = rows[0].count;
    console.log(`La table access_logs contient ${count} enregistrements.`);
    
    if (count === 0) {
      console.log('ATTENTION: La table est vide. Aucun enregistrement à mettre à jour.');
    }
    
    // Vérifier si la colonne existe déjà
    console.log('Vérification de l\'existence de la colonne person_type...');
    
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = '${database}' 
      AND TABLE_NAME = 'access_logs' 
      AND COLUMN_NAME = 'person_type'
    `);
    
    if (columns.length > 0) {
      console.log('La colonne person_type existe déjà.');
      return true;
    }
    
    // Ajouter la colonne
    console.log('Ajout de la colonne person_type à la table access_logs...');
    
    await connection.execute(`
      ALTER TABLE access_logs 
      ADD COLUMN person_type ENUM('employee', 'visitor', 'contractor') 
      DEFAULT 'employee' 
      AFTER badge_number
    `);
    
    console.log('Colonne person_type ajoutée avec succès !');
    
    // Mise à jour initiale de la colonne
    console.log('Mise à jour initiale des types de personnes basée sur le champ group_name...');
    
    // Mettre à jour comme visiteurs les enregistrements avec group_name contenant "visiteur"
    const [visitorsResult] = await connection.execute(`
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
    `);
    
    console.log(`${visitorsResult.affectedRows} enregistrements mis à jour comme visiteurs.`);
    
    // Mettre à jour le reste comme employés
    const [employeesResult] = await connection.execute(`
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
    `);
    
    console.log(`${employeesResult.affectedRows} enregistrements mis à jour comme employés.`);
    
    // Vérifier le résultat
    const [visitorCount] = await connection.execute(`
      SELECT COUNT(*) as count FROM access_logs WHERE person_type = 'visitor'
    `);
    
    const [employeeCount] = await connection.execute(`
      SELECT COUNT(*) as count FROM access_logs WHERE person_type = 'employee'
    `);
    
    const [totalCount] = await connection.execute(`
      SELECT COUNT(*) as count FROM access_logs
    `);
    
    console.log('\nStatistiques après mise à jour:');
    console.log(`Total des enregistrements: ${totalCount[0].count}`);
    
    if (totalCount[0].count > 0) {
      console.log(`Visiteurs: ${visitorCount[0].count} (${(visitorCount[0].count / totalCount[0].count * 100).toFixed(2)}%)`);
      console.log(`Employés: ${employeeCount[0].count} (${(employeeCount[0].count / totalCount[0].count * 100).toFixed(2)}%)`);
    }
    
    return true;
  } catch (error) {
    console.error('Erreur lors de la modification de la table:', error);
    return false;
  } finally {
    await connection.end();
    console.log('Connexion à la base de données fermée.');
  }
}

// Exécuter la fonction
addPersonTypeColumn()
  .then((success) => {
    if (success) {
      console.log('Opération réussie !');
    } else {
      console.log('Opération échouée.');
    }
    process.exit(0);
  })
  .catch((error) => {
    console.error('Erreur non gérée:', error);
    process.exit(1);
  }); 