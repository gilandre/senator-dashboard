require('dotenv').config();
const mysql = require('mysql2/promise');

async function analyzeVisitorsInEmployees() {
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
    console.log('Recherche des employés avec "visiteur" dans leur nom...');
    
    // Trouver tous les employés avec "visiteur" dans leur nom
    const [employees] = await connection.execute(`
      SELECT * FROM employees 
      WHERE 
        first_name LIKE '%visiteur%' OR
        last_name LIKE '%visiteur%' OR
        first_name LIKE '%Visiteur%' OR
        last_name LIKE '%Visiteur%'
    `);
    
    console.log(`Trouvé ${employees.length} employés avec "visiteur" dans leur nom:`);
    
    // Analyser chaque employé "visiteur"
    for (const emp of employees) {
      console.log(`\n${emp.first_name} ${emp.last_name} (Badge: ${emp.badge_number}):`);
      
      // Vérifier les entrées dans access_logs pour ce badge
      const [logs] = await connection.execute(`
        SELECT * FROM access_logs
        WHERE badge_number = ?
      `, [emp.badge_number]);
      
      // Compter les entrées par person_type
      const employeeEntries = logs.filter(log => log.person_type === 'employee').length;
      const visitorEntries = logs.filter(log => log.person_type === 'visitor').length;
      
      console.log(`  Entrées dans access_logs: ${logs.length} au total`);
      console.log(`  - Entrées de type 'employee': ${employeeEntries}`);
      console.log(`  - Entrées de type 'visitor': ${visitorEntries}`);
      
      // Vérifier si ce badge est référencé dans l'API des employés
      const [employeeLogs] = await connection.execute(`
        SELECT * FROM access_logs
        WHERE badge_number = ? AND person_type = 'employee'
        LIMIT 1
      `, [emp.badge_number]);
      
      console.log(`  Ce badge ${employeeLogs.length > 0 ? 'APPARAÎTRA' : 'N\'APPARAÎTRA PAS'} dans l'API des employés avec la nouvelle logique`);
      
      // Obtenir plus de détails sur les entrées s'il y en a
      if (logs.length > 0) {
        console.log('  Entrées de logs (max 3):');
        for (let i = 0; i < Math.min(3, logs.length); i++) {
          const log = logs[i];
          console.log(`    - Badge: ${log.badge_number}, Type: ${log.person_type}, Groupe: ${log.group_name}`);
        }
      }
    }
    
  } catch (error) {
    console.error('Erreur:', error);
  } finally {
    await connection.end();
    console.log('Connexion à la base de données fermée.');
  }
}

analyzeVisitorsInEmployees()
  .catch(error => {
    console.error('Erreur non gérée:', error);
    process.exit(1);
  }); 