const mysql = require('mysql2/promise');

// Configuration MySQL
const MYSQL_CONFIG = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'senator_investech'
};

/**
 * Connexion à MySQL
 */
async function connectToMySQL() {
  try {
    const connection = await mysql.createConnection(MYSQL_CONFIG);
    console.log('Connexion à MySQL établie');
    return connection;
  } catch (error) {
    console.error('Erreur de connexion à MySQL:', error);
    process.exit(1);
  }
}

/**
 * Crée la table access_records si elle n'existe pas
 */
async function createAccessRecordsTable(mysqlConn) {
  try {
    // Vérifier si la table existe déjà
    const [tables] = await mysqlConn.query(`SHOW TABLES LIKE 'access_records'`);
    if (tables.length > 0) {
      console.log('La table access_records existe déjà, aucune modification nécessaire');
      return;
    }

    // Créer la table access_records
    await mysqlConn.query(`
      CREATE TABLE access_records (
        id INT AUTO_INCREMENT PRIMARY KEY,
        person_id INT NOT NULL,
        person_type ENUM('employee', 'visitor') NOT NULL,
        direction ENUM('in', 'out') NOT NULL,
        location VARCHAR(255) NOT NULL,
        device_id VARCHAR(100) NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        status ENUM('valid', 'invalid', 'pending') DEFAULT 'valid',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_person (person_id, person_type),
        INDEX idx_location_timestamp (location, timestamp),
        INDEX idx_timestamp (timestamp),
        INDEX idx_person_type_timestamp (person_type, timestamp)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    
    console.log('Table access_records créée avec succès');
    
    // Insérer quelques données d'exemple
    await insertSampleAccessRecords(mysqlConn);
  } catch (error) {
    console.error('Erreur lors de la création de la table access_records:', error);
  }
}

/**
 * Crée la table roles si elle n'existe pas
 */
async function createRolesTable(mysqlConn) {
  try {
    // Vérifier si la table existe déjà
    const [tables] = await mysqlConn.query(`SHOW TABLES LIKE 'roles'`);
    if (tables.length > 0) {
      console.log('La table roles existe déjà, aucune modification nécessaire');
      return;
    }

    // Créer la table roles
    await mysqlConn.query(`
      CREATE TABLE roles (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        description TEXT,
        is_active TINYINT(1) DEFAULT 1,
        is_default TINYINT(1) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_name (name),
        INDEX idx_is_active (is_active)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    
    console.log('Table roles créée avec succès');

    // Créer la table de relation role_permissions
    await mysqlConn.query(`
      CREATE TABLE role_permissions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        role_id INT NOT NULL,
        permission_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY idx_role_permission (role_id, permission_id),
        FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
        FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    
    console.log('Table role_permissions créée avec succès');
    
    // Insérer quelques données d'exemple pour les rôles
    await insertSampleRoles(mysqlConn);
  } catch (error) {
    console.error('Erreur lors de la création des tables roles et role_permissions:', error);
  }
}

/**
 * Insère des données d'exemple dans la table access_records
 */
async function insertSampleAccessRecords(mysqlConn) {
  try {
    // Récupérer quelques IDs d'employés pour les utiliser dans nos exemples
    const [employees] = await mysqlConn.query('SELECT id FROM employees LIMIT 5');
    
    // Si aucun employé trouvé, ne pas insérer de données
    if (employees.length === 0) {
      console.log('Aucun employé trouvé pour créer des exemples de access_records');
      return;
    }
    
    // Générer 20 records d'accès pour les employés existants
    const records = [];
    const today = new Date();
    const locations = ['Entrée principale', 'Entrée secondaire', 'Cafétéria', 'Salle de réunion', 'Parking'];
    const devices = ['Device001', 'Device002', 'Device003', 'Device004'];
    
    for (let i = 0; i < 20; i++) {
      const randomEmployee = employees[Math.floor(Math.random() * employees.length)];
      const recordDate = new Date(today);
      recordDate.setDate(today.getDate() - Math.floor(Math.random() * 30)); // Date aléatoire dans les 30 derniers jours
      
      records.push([
        randomEmployee.id,
        'employee',
        Math.random() > 0.5 ? 'in' : 'out',
        locations[Math.floor(Math.random() * locations.length)],
        devices[Math.floor(Math.random() * devices.length)],
        recordDate,
        Math.random() > 0.9 ? 'invalid' : 'valid' // 10% de chance d'être invalide
      ]);
    }
    
    // Insérer les données
    await mysqlConn.query(`
      INSERT INTO access_records 
      (person_id, person_type, direction, location, device_id, timestamp, status) 
      VALUES ?
    `, [records]);
    
    console.log(`${records.length} enregistrements d'accès insérés avec succès`);
  } catch (error) {
    console.error('Erreur lors de l\'insertion des données dans access_records:', error);
  }
}

/**
 * Insère des données d'exemple dans la table roles
 */
async function insertSampleRoles(mysqlConn) {
  try {
    // Définir les rôles de base
    const roles = [
      ['Administrateur', 'Accès complet à toutes les fonctionnalités du système', 0, 1],
      ['Superviseur', 'Gestion des employés et des accès', 1, 0],
      ['Opérateur', 'Gestion quotidienne des accès et des visiteurs', 1, 0],
      ['Lecteur', 'Accès en lecture seule aux données', 1, 0]
    ];
    
    // Insérer les rôles
    await mysqlConn.query(`
      INSERT INTO roles 
      (name, description, is_default, is_active) 
      VALUES ?
    `, [roles]);
    
    console.log(`${roles.length} rôles insérés avec succès`);
    
    // Récupérer les IDs des rôles et permissions insérés
    const [rolesData] = await mysqlConn.query('SELECT id, name FROM roles');
    const [permissions] = await mysqlConn.query('SELECT id, module, action FROM permissions');
    
    if (permissions.length === 0) {
      console.log('Aucune permission trouvée pour créer des relations role_permissions');
      return;
    }
    
    // Mapper les rôles par nom pour faciliter l'accès
    const roleMap = {};
    rolesData.forEach(role => {
      roleMap[role.name] = role.id;
    });
    
    // Mapper les permissions par code (module.action) pour faciliter l'accès
    const permissionMap = {};
    permissions.forEach(permission => {
      const code = `${permission.module}.${permission.action}`;
      permissionMap[code] = permission.id;
    });
    
    // Définir les permissions pour chaque rôle
    const rolePermissions = [];
    
    // Administrateur - toutes les permissions
    permissions.forEach(permission => {
      if (roleMap['Administrateur']) {
        rolePermissions.push([roleMap['Administrateur'], permission.id]);
      }
    });
    
    // Superviseur - permissions de lecture et écriture pour les employés et les accès
    ['employees.read', 'employees.write', 'access.read', 'access.write'].forEach(code => {
      if (roleMap['Superviseur'] && permissionMap[code]) {
        rolePermissions.push([roleMap['Superviseur'], permissionMap[code]]);
      }
    });
    
    // Opérateur - permissions de lecture pour les employés et lecture/écriture pour les accès
    ['employees.read', 'access.read', 'access.write'].forEach(code => {
      if (roleMap['Opérateur'] && permissionMap[code]) {
        rolePermissions.push([roleMap['Opérateur'], permissionMap[code]]);
      }
    });
    
    // Lecteur - uniquement des permissions de lecture
    ['employees.read', 'access.read', 'settings.read'].forEach(code => {
      if (roleMap['Lecteur'] && permissionMap[code]) {
        rolePermissions.push([roleMap['Lecteur'], permissionMap[code]]);
      }
    });
    
    // Insérer les relations rôles-permissions
    if (rolePermissions.length > 0) {
      await mysqlConn.query(`
        INSERT INTO role_permissions 
        (role_id, permission_id) 
        VALUES ?
      `, [rolePermissions]);
      
      console.log(`${rolePermissions.length} relations rôle-permission insérées avec succès`);
    }
  } catch (error) {
    console.error('Erreur lors de l\'insertion des données dans roles:', error);
  }
}

/**
 * Fonction principale
 */
async function main() {
  let connection;
  try {
    connection = await connectToMySQL();
    
    // Créer les tables manquantes
    await createAccessRecordsTable(connection);
    await createRolesTable(connection);
    
    console.log('Migration des tables restantes terminée avec succès');
  } catch (error) {
    console.error('Erreur lors de la migration des tables restantes:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('Connexion MySQL fermée');
    }
  }
}

// Exécuter le script
main(); 