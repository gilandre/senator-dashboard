require('dotenv').config();
const mysql = require('mysql2/promise');

async function checkVisitorsData() {
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
    console.log('=== STATISTIQUES DES ACCESS_LOGS ===');
    
    // Compter les entrées par type de personne
    const [totalStats] = await connection.execute(`
      SELECT person_type, COUNT(*) as count 
      FROM access_logs 
      GROUP BY person_type
    `);
    
    console.log('Répartition par person_type:');
    totalStats.forEach(stat => {
      console.log(` - ${stat.person_type}: ${stat.count} entrées`);
    });
    
    // Compter les badges uniques par type de personne
    const [badgeStats] = await connection.execute(`
      SELECT person_type, COUNT(DISTINCT badge_number) as count 
      FROM access_logs 
      GROUP BY person_type
    `);
    
    console.log('\nBadges uniques par person_type:');
    badgeStats.forEach(stat => {
      console.log(` - ${stat.person_type}: ${stat.count} badges uniques`);
    });
    
    // Informations sur la table des visiteurs
    console.log('\n=== TABLE DES VISITEURS ===');
    const [visitorsCount] = await connection.execute(`
      SELECT COUNT(*) as count FROM visitors
    `);
    
    console.log(`Nombre total de visiteurs: ${visitorsCount[0].count}`);
    
    // Échantillon de visiteurs
    const [sampleVisitors] = await connection.execute(`
      SELECT id, first_name, last_name, badge_number, status
      FROM visitors
      LIMIT 5
    `);
    
    console.log('\nÉchantillon de visiteurs:');
    for (const visitor of sampleVisitors) {
      console.log(`- ID ${visitor.id}: ${visitor.first_name} ${visitor.last_name} (Badge: ${visitor.badge_number}, Status: ${visitor.status})`);
      
      // Vérifier les entrées d'access_logs pour ce badge
      const [logs] = await connection.execute(`
        SELECT person_type, COUNT(*) as count
        FROM access_logs
        WHERE badge_number = ?
        GROUP BY person_type
      `, [visitor.badge_number]);
      
      if (logs.length === 0) {
        console.log(`  * Ce badge n'a AUCUNE entrée dans access_logs!`);
      } else {
        logs.forEach(log => {
          console.log(`  * ${log.count} entrées de type ${log.person_type} dans access_logs`);
        });
      }
    }
    
    // Vérifier si tous les badges de visiteurs ont des entrées dans access_logs
    console.log('\n=== CONCORDANCE ENTRE VISITEURS ET ACCESS_LOGS ===');
    const [visitorsWithLogs] = await connection.execute(`
      SELECT v.badge_number, COUNT(a.id) as log_count
      FROM visitors v
      LEFT JOIN access_logs a ON v.badge_number = a.badge_number AND a.person_type = 'visitor'
      GROUP BY v.badge_number
    `);
    
    const visitorsWithoutLogs = visitorsWithLogs.filter(v => v.log_count === 0);
    
    console.log(`Visiteurs sans entrées de type 'visitor' dans access_logs: ${visitorsWithoutLogs.length} sur ${visitorsWithLogs.length}`);
    
    if (visitorsWithoutLogs.length > 0) {
      console.log('\nExemples de badges visiteurs sans entrées correspondantes:');
      for (let i = 0; i < Math.min(5, visitorsWithoutLogs.length); i++) {
        console.log(` - Badge ${visitorsWithoutLogs[i].badge_number}`);
      }
    }
    
    // Vérifier les badges dans access_logs marqués comme 'visitor' qui n'existent pas dans la table visitors
    const [logsWithoutVisitors] = await connection.execute(`
      SELECT a.badge_number, COUNT(*) as count
      FROM access_logs a
      WHERE a.person_type = 'visitor'
      AND NOT EXISTS (SELECT 1 FROM visitors v WHERE v.badge_number = a.badge_number)
      GROUP BY a.badge_number
      LIMIT 5
    `);
    
    console.log('\nBadges marqués comme visitor dans access_logs mais absents de la table visitors:');
    if (logsWithoutVisitors.length === 0) {
      console.log(' - Aucun');
    } else {
      for (const log of logsWithoutVisitors) {
        console.log(` - Badge ${log.badge_number}: ${log.count} entrées`);
      }
    }
    
  } catch (error) {
    console.error('Erreur:', error);
  } finally {
    await connection.end();
    console.log('\nConnexion à la base de données fermée.');
  }
}

checkVisitorsData()
  .catch(error => {
    console.error('Erreur non gérée:', error);
    process.exit(1);
  }); 