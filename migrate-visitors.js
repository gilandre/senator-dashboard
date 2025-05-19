require('dotenv').config();
const mysql = require('mysql2/promise');

async function migrateVisitors() {
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
  
  console.log(`Connexion à la base de données ${database} sur ${host}:${port} avec l'utilisateur ${user}...`);
  
  // Créer la connexion
  const connection = await mysql.createConnection({
    host,
    user,
    password: '', // Utiliser une chaîne vide pour le mot de passe
    database,
    port: parseInt(port)
  });

  try {
    // 1. Récupérer tous les badges uniques de type 'visitor' dans access_logs
    console.log('Récupération des badges visiteurs...');
    const [visitorBadges] = await connection.execute(`
      SELECT DISTINCT badge_number 
      FROM access_logs 
      WHERE person_type = 'visitor'
    `);
    
    console.log(`Trouvé ${visitorBadges.length} badges de visiteurs uniques.`);
    
    // Pour chaque badge, créer une entrée dans la table visitors si elle n'existe pas déjà
    let createdCount = 0;
    
    for (const { badge_number } of visitorBadges) {
      // Vérifier si le badge existe déjà dans la table visitors
      const [existingVisitor] = await connection.execute(`
        SELECT id FROM visitors WHERE badge_number = ?
      `, [badge_number]);
      
      if (existingVisitor.length > 0) {
        console.log(`Le visiteur avec le badge ${badge_number} existe déjà (ID: ${existingVisitor[0].id}).`);
        continue;
      }
      
      // Récupérer les informations du visiteur à partir d'access_logs
      const [visitorInfo] = await connection.execute(`
        SELECT 
          badge_number,
          full_name,
          group_name,
          MAX(event_date) as last_visit_date
        FROM access_logs
        WHERE badge_number = ? AND person_type = 'visitor'
        GROUP BY badge_number, full_name, group_name
      `, [badge_number]);
      
      if (visitorInfo.length === 0) {
        console.log(`Aucune information trouvée pour le badge ${badge_number}.`);
        continue;
      }
      
      const info = visitorInfo[0];
      
      // Diviser le nom complet en prénom/nom si possible
      let first_name = '';
      let last_name = info.full_name || 'VISITEUR';
      
      if (info.full_name) {
        const nameParts = info.full_name.split(' ');
        if (nameParts.length > 1) {
          first_name = nameParts[0];
          last_name = nameParts.slice(1).join(' ');
        } else {
          // Si un seul mot, l'utiliser comme nom de famille
          first_name = 'VISITEUR';
          last_name = info.full_name;
        }
      }
      
      // Déterminer la société à partir du groupe
      const company = info.group_name ? info.group_name.replace(/VISITEURS?/i, '').trim() : 'GENERAL';
      
      // Créer l'entrée dans la table visitors
      const [result] = await connection.execute(`
        INSERT INTO visitors (
          badge_number,
          first_name,
          last_name,
          company,
          status,
          visit_purpose,
          last_seen,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, 'active', 'Visite', ?, NOW(), NOW())
      `, [
        badge_number,
        first_name,
        last_name,
        company || 'GENERAL',
        info.last_visit_date
      ]);
      
      console.log(`Créé visiteur: ${first_name} ${last_name}, Badge: ${badge_number}, Société: ${company}, ID: ${result.insertId}`);
      createdCount++;
    }
    
    console.log(`\nRécapitulatif: ${createdCount} visiteurs créés sur ${visitorBadges.length} badges uniques.`);
    
    // Vérifier que la migration a fonctionné
    const [countCheck] = await connection.execute(`
      SELECT COUNT(*) as count FROM visitors
    `);
    
    console.log(`La table visitors contient maintenant ${countCheck[0].count} enregistrements.`);
    
  } catch (error) {
    console.error('Erreur lors de la migration:', error);
  } finally {
    await connection.end();
    console.log('Connexion à la base de données fermée.');
  }
}

migrateVisitors()
  .catch(error => {
    console.error('Erreur non gérée:', error);
    process.exit(1);
  }); 