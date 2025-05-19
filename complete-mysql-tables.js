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
 * Exécute une requête SQL
 */
async function executeQuery(pool, sql, params = []) {
  try {
    const [results] = await pool.execute(sql, params);
    return results;
  } catch (error) {
    console.error('Erreur lors de l\'exécution de la requête:', error);
    throw error;
  }
}

/**
 * Script principal pour compléter les migrations
 */
async function main() {
  let pool;

  try {
    console.log('Connexion à MySQL...');
    pool = await connect();
    console.log('Connexion établie');

    // 1. Vérifier et créer la table access_logs
    console.log('Création/modification de la table access_logs...');
    await createAccessLogsTable(pool);

    // 2. Vérifier et créer la table holidays
    console.log('Création/modification de la table holidays...');
    await createHolidaysTable(pool);

    // 3. Vérifier et créer la table attendance_parameters
    console.log('Création/modification de la table attendance_parameters...');
    await createAttendanceParametersTable(pool);

    // 4. Vérifier et créer la table security_settings
    console.log('Création/modification de la table security_settings...');
    await createSecuritySettingsTable(pool);

    // 5. Insertion de données d'exemple si nécessaire
    console.log('Insertion de données d\'exemple...');
    await insertSampleData(pool);

    console.log('Migration des tables terminée avec succès!');
  } catch (error) {
    console.error('Erreur lors de la migration des tables:', error);
  } finally {
    if (pool) {
      pool.end();
      console.log('Connexion MySQL fermée');
    }
  }
}

/**
 * Crée ou modifie la table access_logs
 */
async function createAccessLogsTable(pool) {
  const sql = `
    CREATE TABLE IF NOT EXISTS access_logs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      badge_number VARCHAR(50) NOT NULL,
      person_id VARCHAR(50),
      person_type ENUM('Employee', 'Visitor') DEFAULT 'Employee',
      event_date DATE NOT NULL,
      event_time TIME NOT NULL,
      controller VARCHAR(100),
      reader VARCHAR(100),
      event_type VARCHAR(50),
      direction ENUM('in', 'out', 'unknown') DEFAULT 'unknown',
      is_visitor BOOLEAN DEFAULT FALSE,
      full_name VARCHAR(255),
      raw_data JSON,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      
      INDEX idx_badge_date_time (badge_number, event_date, event_time),
      INDEX idx_reader_date (reader, event_date),
      INDEX idx_person_date (person_id, event_date),
      INDEX idx_visitor_date (is_visitor, event_date),
      INDEX idx_direction_date (direction, event_date)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;

  await executeQuery(pool, sql);
  console.log('Table access_logs créée ou modifiée avec succès');
}

/**
 * Crée ou modifie la table holidays
 */
async function createHolidaysTable(pool) {
  // Vérifier si la table existe déjà
  try {
    const [rows] = await pool.execute("SHOW TABLES LIKE 'holidays'");
    if (rows.length > 0) {
      console.log('La table holidays existe déjà, aucune modification nécessaire');
      return;
    }
  } catch (error) {
    console.error('Erreur lors de la vérification de la table holidays:', error);
  }

  // Si la table n'existe pas, la créer
  const sql = `
    CREATE TABLE IF NOT EXISTS holidays (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      date DATE NOT NULL,
      description TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      created_by INT,
      INDEX idx_date (date)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;

  await executeQuery(pool, sql);
  console.log('Table holidays créée ou modifiée avec succès');
}

/**
 * Crée ou modifie la table attendance_parameters
 */
async function createAttendanceParametersTable(pool) {
  const sql = `
    CREATE TABLE IF NOT EXISTS attendance_parameters (
      id INT AUTO_INCREMENT PRIMARY KEY,
      start_hour VARCHAR(5) NOT NULL DEFAULT '08:00',
      end_hour VARCHAR(5) NOT NULL DEFAULT '17:00',
      daily_hours DECIMAL(4,2) NOT NULL DEFAULT 8.00,
      count_weekends BOOLEAN DEFAULT FALSE,
      count_holidays BOOLEAN DEFAULT FALSE,
      
      lunch_break BOOLEAN DEFAULT TRUE,
      lunch_break_duration INT DEFAULT 60,
      lunch_break_start VARCHAR(5) DEFAULT '12:00',
      lunch_break_end VARCHAR(5) DEFAULT '13:00',
      allow_other_breaks BOOLEAN DEFAULT TRUE,
      max_break_time INT DEFAULT 30,
      
      absence_request_deadline INT DEFAULT 3,
      overtime_request_deadline INT DEFAULT 5,
      
      round_attendance_time BOOLEAN DEFAULT FALSE,
      rounding_interval INT DEFAULT 15,
      rounding_direction ENUM('up', 'down', 'nearest') DEFAULT 'nearest',
      
      last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_by VARCHAR(100) DEFAULT 'system'
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;

  await executeQuery(pool, sql);
  console.log('Table attendance_parameters créée ou modifiée avec succès');
}

/**
 * Crée ou modifie la table security_settings
 */
async function createSecuritySettingsTable(pool) {
  // Vérifier si la table existe déjà
  try {
    const [rows] = await pool.execute("SHOW TABLES LIKE 'security_settings'");
    if (rows.length > 0) {
      console.log('La table security_settings existe déjà, aucune modification nécessaire');
      return;
    }
  } catch (error) {
    console.error('Erreur lors de la vérification de la table security_settings:', error);
  }

  // Si la table n'existe pas, la créer
  const sql = `
    CREATE TABLE IF NOT EXISTS security_settings (
      id INT AUTO_INCREMENT PRIMARY KEY,
      
      /* Politique de mot de passe */
      min_password_length INT DEFAULT 8,
      require_special_chars BOOLEAN DEFAULT TRUE,
      require_numbers BOOLEAN DEFAULT TRUE,
      require_uppercase BOOLEAN DEFAULT TRUE,
      password_history_count INT DEFAULT 3,
      
      /* Politique de compte */
      max_login_attempts INT DEFAULT 5,
      lock_duration_minutes INT DEFAULT 30,
      
      /* Authentification à deux facteurs */
      two_factor_auth_enabled BOOLEAN DEFAULT FALSE,
      
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      updated_by INT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;

  await executeQuery(pool, sql);
  console.log('Table security_settings créée ou modifiée avec succès');
}

/**
 * Insère des données d'exemple dans les tables
 */
async function insertSampleData(pool) {
  // Vérifier si des données existent déjà dans les tables
  const tables = ['holidays', 'attendance_parameters', 'security_settings'];
  
  for (const table of tables) {
    const [rows] = await pool.execute(`SELECT COUNT(*) as count FROM ${table}`);
    if (rows[0].count === 0) {
      console.log(`Insertion de données d'exemple dans la table ${table}...`);
      
      switch (table) {
        case 'holidays':
          await insertSampleHolidays(pool);
          break;
        case 'attendance_parameters':
          await insertSampleAttendanceParameters(pool);
          break;
        case 'security_settings':
          await insertSampleSecuritySettings(pool);
          break;
      }
    } else {
      console.log(`La table ${table} contient déjà des données`);
    }
  }
}

/**
 * Insère des jours fériés d'exemple
 */
async function insertSampleHolidays(pool) {
  const holidays = [
    {
      name: 'Jour de l\'An',
      date: '2023-01-01',
      description: 'Jour férié national'
    },
    {
      name: 'Fête du Travail',
      date: '2023-05-01',
      description: 'Jour férié national'
    },
    {
      name: 'Fête Nationale',
      date: '2023-07-14',
      description: 'Jour férié national'
    },
    {
      name: 'Noël',
      date: '2023-12-25',
      description: 'Jour férié religieux'
    }
  ];

  for (const holiday of holidays) {
    await executeQuery(
      pool,
      'INSERT INTO holidays (name, date, description) VALUES (?, ?, ?)',
      [holiday.name, holiday.date, holiday.description]
    );
  }
  
  console.log('Données d\'exemple insérées dans la table holidays');
}

/**
 * Insère des paramètres de présence d'exemple
 */
async function insertSampleAttendanceParameters(pool) {
  await executeQuery(
    pool,
    'INSERT INTO attendance_parameters (start_hour, end_hour, daily_hours) VALUES (?, ?, ?)',
    ['08:30', '17:30', 8.0]
  );
  
  console.log('Données d\'exemple insérées dans la table attendance_parameters');
}

/**
 * Insère des paramètres de sécurité d'exemple
 */
async function insertSampleSecuritySettings(pool) {
  await executeQuery(
    pool,
    `INSERT INTO security_settings (
      min_password_length, 
      require_uppercase, 
      require_numbers, 
      require_special_chars,
      password_history_count,
      max_login_attempts,
      lock_duration_minutes,
      two_factor_auth_enabled
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [8, true, true, true, 3, 5, 30, false]
  );
  
  console.log('Données d\'exemple insérées dans la table security_settings');
}

// Exécution du script principal
main().catch(console.error); 