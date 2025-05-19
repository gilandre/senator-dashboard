const mysql = require('mysql2/promise');

// Configuration de la connexion MySQL
const MYSQL_CONFIG = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'senator_investech',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

/**
 * Initialise la connexion à MySQL
 */
async function connect() {
  try {
    return await mysql.createPool(MYSQL_CONFIG);
  } catch (error) {
    console.error('Erreur de connexion à MySQL:', error);
    throw error;
  }
}

/**
 * Génère un nombre aléatoire entre min et max inclus
 */
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Génère une date aléatoire entre deux dates
 */
function randomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

/**
 * Génère un badge aléatoire
 */
function randomBadgeNumber() {
  return `B${randomInt(1000, 9999)}`;
}

/**
 * Génère un lecteur aléatoire
 */
function randomReader() {
  const zones = ['Entrée', 'Sortie', 'Salle de réunion', 'Bureau', 'Cafétéria', 'Parking', 'Salle serveur'];
  const floors = ['RDC', '1er étage', '2ème étage', 'Sous-sol'];
  
  return `${zones[randomInt(0, zones.length - 1)]} - ${floors[randomInt(0, floors.length - 1)]}`;
}

/**
 * Génère une direction aléatoire
 */
function randomDirection() {
  const directions = ['in', 'out', 'unknown'];
  const weights = [0.45, 0.45, 0.1]; // Pondération pour favoriser in/out
  
  const rand = Math.random();
  let sum = 0;
  for (let i = 0; i < weights.length; i++) {
    sum += weights[i];
    if (rand < sum) return directions[i];
  }
  return directions[0];
}

/**
 * Génère un type d'événement aléatoire
 */
function randomEventType() {
  const types = ['Accès autorisé', 'Accès refusé', 'Badge inconnu', 'Porte forcée', 'Alarme'];
  const weights = [0.85, 0.1, 0.025, 0.015, 0.01]; // Pondération pour des données réalistes
  
  const rand = Math.random();
  let sum = 0;
  for (let i = 0; i < weights.length; i++) {
    sum += weights[i];
    if (rand < sum) return types[i];
  }
  return types[0];
}

/**
 * Génère un nom aléatoire
 */
function randomName() {
  const firstNames = ['Jean', 'Marie', 'Pierre', 'Sophie', 'Thomas', 'Isabelle', 'David', 'Camille', 'Alexandre', 'Amélie'];
  const lastNames = ['Martin', 'Bernard', 'Dubois', 'Petit', 'Leroy', 'Moreau', 'Simon', 'Laurent', 'Michel', 'Lefebvre'];
  
  return `${firstNames[randomInt(0, firstNames.length - 1)]} ${lastNames[randomInt(0, lastNames.length - 1)]}`;
}

/**
 * Génère un log d'accès aléatoire
 */
function generateRandomAccessLog(date = null) {
  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1); // 3 mois avant
  
  const logDate = date || randomDate(startDate, now);
  const formattedDate = logDate.toISOString().split('T')[0];
  
  // Générer une heure aléatoire, avec plus de probabilités aux heures ouvrables (8h-18h)
  let hour;
  const hourRand = Math.random();
  if (hourRand < 0.7) {
    // 70% de chances d'avoir une heure entre 8h et 18h
    hour = randomInt(8, 17);
  } else if (hourRand < 0.9) {
    // 20% de chances d'avoir une heure entre 6h et 8h ou 18h et 20h
    hour = randomInt(0, 1) ? randomInt(6, 7) : randomInt(18, 19);
  } else {
    // 10% de chances d'avoir une heure entre 20h et 6h
    hour = randomInt(20, 23);
    if (hour === 23 && Math.random() < 0.5) {
      hour = randomInt(0, 5);
    }
  }
  
  const minute = randomInt(0, 59);
  const second = randomInt(0, 59);
  const formattedTime = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:${second.toString().padStart(2, '0')}`;
  
  const isVisitor = Math.random() < 0.1; // 10% de visiteurs
  const badgeNumber = randomBadgeNumber();
  const reader = randomReader();
  const direction = randomDirection();
  const eventType = randomEventType();
  const fullName = randomName();
  
  return {
    badge_number: badgeNumber,
    person_type: isVisitor ? 'visitor' : 'employee',
    event_date: formattedDate,
    event_time: formattedTime,
    terminal: `Contrôleur-${randomInt(1, 5)}`,
    reader: reader,
    event_type: eventType,
    direction: direction,
    full_name: fullName,
    created_at: new Date()
  };
}

/**
 * Génère des logs pour une journée typique
 * Avec des schémas réalistes (entrées le matin, sorties le soir, etc.)
 */
function generateDailyLogs(date, numberOfEmployees = 20, numberOfVisitors = 3) {
  const logs = [];
  const badges = new Map();
  
  // Préparer des badges uniques pour les employés et visiteurs
  for (let i = 0; i < numberOfEmployees; i++) {
    const badge = `E${randomInt(1000, 9999)}`;
    badges.set(badge, {
      type: 'employee',
      name: randomName(),
      hasEntered: false
    });
  }
  
  for (let i = 0; i < numberOfVisitors; i++) {
    const badge = `V${randomInt(1000, 9999)}`;
    badges.set(badge, {
      type: 'visitor',
      name: randomName(),
      hasEntered: false
    });
  }
  
  // Générer les entrées du matin (entre 7h30 et 9h30)
  badges.forEach((person, badge) => {
    const entryDate = new Date(date);
    entryDate.setHours(randomInt(7, 9));
    entryDate.setMinutes(randomInt(0, 59));
    entryDate.setSeconds(randomInt(0, 59));
    
    logs.push({
      badge_number: badge,
      person_type: person.type,
      event_date: entryDate.toISOString().split('T')[0],
      event_time: entryDate.toTimeString().split(' ')[0],
      terminal: `Contrôleur-${randomInt(1, 3)}`,
      reader: 'Entrée principale',
      event_type: 'Accès autorisé',
      direction: 'in',
      full_name: person.name,
      created_at: new Date()
    });
    
    person.hasEntered = true;
    
    // Ajouter quelques mouvements en journée pour certains badges (20% de chances)
    if (Math.random() < 0.2) {
      const middayDate = new Date(date);
      middayDate.setHours(randomInt(11, 14));
      middayDate.setMinutes(randomInt(0, 59));
      middayDate.setSeconds(randomInt(0, 59));
      
      logs.push({
        badge_number: badge,
        person_type: person.type,
        event_date: middayDate.toISOString().split('T')[0],
        event_time: middayDate.toTimeString().split(' ')[0],
        terminal: `Contrôleur-${randomInt(1, 3)}`,
        reader: 'Cafétéria',
        event_type: 'Accès autorisé',
        direction: 'in',
        full_name: person.name,
        created_at: new Date()
      });
    }
  });
  
  // Générer les sorties du soir (entre 16h et 19h)
  badges.forEach((person, badge) => {
    if (person.hasEntered) {
      const exitDate = new Date(date);
      exitDate.setHours(randomInt(16, 19));
      exitDate.setMinutes(randomInt(0, 59));
      exitDate.setSeconds(randomInt(0, 59));
      
      logs.push({
        badge_number: badge,
        person_type: person.type,
        event_date: exitDate.toISOString().split('T')[0],
        event_time: exitDate.toTimeString().split(' ')[0],
        terminal: `Contrôleur-${randomInt(1, 3)}`,
        reader: 'Sortie principale',
        event_type: 'Accès autorisé',
        direction: 'out',
        full_name: person.name,
        created_at: new Date()
      });
    }
  });
  
  // Ajouter quelques événements d'erreur ou refus (5% des logs)
  const totalErrorLogs = Math.floor(logs.length * 0.05);
  for (let i = 0; i < totalErrorLogs; i++) {
    const errorDate = new Date(date);
    errorDate.setHours(randomInt(0, 23));
    errorDate.setMinutes(randomInt(0, 59));
    errorDate.setSeconds(randomInt(0, 59));
    
    logs.push({
      badge_number: `X${randomInt(1000, 9999)}`,
      person_type: Math.random() < 0.5 ? 'employee' : 'visitor',
      event_date: errorDate.toISOString().split('T')[0],
      event_time: errorDate.toTimeString().split(' ')[0],
      terminal: `Contrôleur-${randomInt(1, 3)}`,
      reader: randomReader(),
      event_type: 'Accès refusé',
      direction: 'unknown',
      full_name: randomName(),
      created_at: new Date()
    });
  }
  
  return logs;
}

/**
 * Insère les logs dans la base de données
 */
async function insertAccessLogs(pool, logs) {
  console.log(`Insertion de ${logs.length} logs d'accès...`);
  
  try {
    // Insertion par lots pour de meilleures performances
    const batchSize = 100;
    for (let i = 0; i < logs.length; i += batchSize) {
      const batch = logs.slice(i, i + batchSize);
      
      // Préparer les requêtes SQL d'insertion
      const placeholders = batch.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
      const values = [];
      
      batch.forEach(log => {
        values.push(
          log.badge_number,
          log.person_type,
          log.event_date,
          log.event_time,
          log.reader,
          log.terminal, // remappé vers terminal
          log.event_type === 'Accès autorisé' ? 'entry' : 
            log.event_type === 'Accès refusé' ? 'exit' : 'unknown',
          log.direction,
          log.full_name,
          'Default Group', // group_name
          false, // processed
          log.created_at
        );
      });
      
      const sql = `
        INSERT INTO access_logs (
          badge_number, person_type, event_date, event_time, 
          reader, terminal, event_type, direction, full_name, 
          group_name, processed, created_at
        ) VALUES ${placeholders}
      `;
      
      await pool.execute(sql, values);
      console.log(`Insertion de ${batch.length} logs terminée (${i + batch.length}/${logs.length})`);
    }
    
    console.log('Insertion des logs d\'accès terminée avec succès');
  } catch (error) {
    console.error('Erreur lors de l\'insertion des logs d\'accès:', error);
    throw error;
  }
}

/**
 * Script principal
 */
async function main() {
  let pool;
  
  try {
    console.log('Connexion à MySQL...');
    pool = await connect();
    console.log('Connexion établie');
    
    // Vérifier si des données existent déjà
    const [rows] = await pool.execute('SELECT COUNT(*) as count FROM access_logs');
    
    if (rows[0].count > 0) {
      console.log(`La table access_logs contient déjà ${rows[0].count} enregistrements`);
      const proceed = process.argv.includes('--force');
      
      if (!proceed) {
        console.log('Utilisez --force pour ajouter des logs supplémentaires');
        return;
      }
    }
    
    // Générer des logs pour les 30 derniers jours
    const logs = [];
    const today = new Date();
    const startDate = new Date();
    startDate.setDate(today.getDate() - 30);
    
    // Générer des logs réalistes jour par jour
    for (let d = new Date(startDate); d <= today; d.setDate(d.getDate() + 1)) {
      const dailyLogs = generateDailyLogs(new Date(d), 20, 3);
      logs.push(...dailyLogs);
    }
    
    // Ajouter quelques logs complètement aléatoires
    for (let i = 0; i < 50; i++) {
      logs.push(generateRandomAccessLog());
    }
    
    // Trier les logs par date et heure
    logs.sort((a, b) => {
      const dateA = `${a.event_date} ${a.event_time}`;
      const dateB = `${b.event_date} ${b.event_time}`;
      return dateA.localeCompare(dateB);
    });
    
    await insertAccessLogs(pool, logs);
    
    console.log(`${logs.length} logs d'accès ont été insérés avec succès`);
  } catch (error) {
    console.error('Erreur lors de l\'exécution du script:', error);
  } finally {
    if (pool) {
      pool.end();
      console.log('Connexion MySQL fermée');
    }
  }
}

// Exécution du script principal
main().catch(console.error); 