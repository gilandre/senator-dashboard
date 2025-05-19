// Script pour interroger directement la base de données et récupérer les visiteurs
require('dotenv').config();
const mysql = require('mysql2/promise');

async function getVisitorsFromDB() {
  // Créer la connexion à partir de DATABASE_URL
  // Format: mysql://user:password@host:port/database
  const dbUrl = process.env.DATABASE_URL;
  
  console.log(`Connexion à la base de données: ${dbUrl}`);
  
  // Extraire les informations de connexion de DATABASE_URL
  const regex = /mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/;
  const match = dbUrl.match(regex);
  
  if (!match) {
    throw new Error('Format DATABASE_URL invalide');
  }
  
  const [, user, password, host, port, database] = match;
  
  // Créer la connexion
  const connection = await mysql.createConnection({
    host,
    user,
    password,
    database,
    port: parseInt(port)
  });
  
  try {
    console.log('Connexion établie. Récupération des visiteurs...');
    
    // Récupérer les 10 premiers visiteurs
    const [visitors] = await connection.execute(`
      SELECT id, badge_number, first_name, last_name, company, status, 
             access_count, first_seen, last_seen, created_at, updated_at
      FROM visitors
      ORDER BY last_seen DESC
      LIMIT 10
    `);
    
    // Récupérer le nombre total de visiteurs
    const [countResult] = await connection.execute('SELECT COUNT(*) as total FROM visitors');
    const total = countResult[0].total;
    
    // Récupérer les entreprises
    const [companies] = await connection.execute(`
      SELECT DISTINCT company 
      FROM visitors 
      ORDER BY company
    `);
    
    // Récupérer les badges partagés (utilisés par plusieurs visiteurs)
    const [sharedBadges] = await connection.execute(`
      SELECT badge_number, COUNT(*) as user_count
      FROM visitors
      GROUP BY badge_number
      HAVING COUNT(*) > 1
    `);
    
    // Afficher les résultats
    console.log(`\nTrouvé ${total} visiteurs au total. Voici les 10 plus récents:`);
    
    if (visitors.length === 0) {
      console.log('Aucun visiteur trouvé dans la base de données.');
    } else {
      console.table(visitors.map(v => ({
        id: v.id,
        badge: v.badge_number,
        nom: `${v.first_name} ${v.last_name}`,
        entreprise: v.company,
        statut: v.status,
        accès: v.access_count,
        dernière_visite: v.last_seen ? new Date(v.last_seen).toLocaleString() : 'Jamais'
      })));
    }
    
    // Afficher les entreprises
    console.log('\nEntreprises:');
    console.log(companies.map(c => c.company));
    
    // Afficher les badges partagés
    console.log('\nBadges partagés:');
    
    if (sharedBadges.length === 0) {
      console.log('Aucun badge partagé trouvé.');
    } else {
      console.table(sharedBadges);
    }
    
    return {
      visitors,
      total,
      companies: companies.map(c => c.company),
      sharedBadges
    };
    
  } catch (error) {
    console.error('Erreur lors de la récupération des données:', error);
    throw error;
  } finally {
    await connection.end();
    console.log('Connexion à la base de données fermée.');
  }
}

// Exécuter la fonction
getVisitorsFromDB()
  .then(() => {
    console.log('\nTerminé.');
    process.exit(0);
  })
  .catch(error => {
    console.error('Erreur non gérée:', error);
    process.exit(1);
  }); 