const mysql = require('mysql2/promise');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

// Configuration MySQL
const MYSQL_CONFIG = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'senator_investech'
};

// Données d'exemple pour simuler la migration depuis MongoDB
const sampleData = {
  users: [
    { name: 'Administrateur', email: 'admin@senator.com', password: bcrypt.hashSync('admin123', 10), role: 'admin', firstLogin: false },
    { name: 'Opérateur', email: 'operator@senator.com', password: bcrypt.hashSync('operator123', 10), role: 'operator', firstLogin: true },
    { name: 'Utilisateur', email: 'user@senator.com', password: bcrypt.hashSync('user123', 10), role: 'user', firstLogin: true },
  ],
  profiles: [
    { name: 'Administrateur', description: 'Accès complet à toutes les fonctionnalités' },
    { name: 'Opérateur', description: 'Gestion des accès et des employés' },
    { name: 'Visiteur', description: 'Consultation des rapports uniquement' }
  ],
  permissions: [
    { name: 'access.read', description: 'Consulter les logs d\'accès', module: 'access', action: 'read' },
    { name: 'access.write', description: 'Modifier les logs d\'accès', module: 'access', action: 'write' },
    { name: 'employee.read', description: 'Consulter les employés', module: 'employee', action: 'read' },
    { name: 'employee.write', description: 'Modifier les employés', module: 'employee', action: 'write' },
    { name: 'settings.read', description: 'Consulter les paramètres', module: 'settings', action: 'read' },
    { name: 'settings.write', description: 'Modifier les paramètres', module: 'settings', action: 'write' }
  ],
  employees: [
    { badgeNumber: 'E001', employeeId: 'EMP001', firstName: 'Jean', lastName: 'Dupont', email: 'jean.dupont@example.com', department: 'IT', position: 'Développeur', status: 'active' },
    { badgeNumber: 'E002', employeeId: 'EMP002', firstName: 'Marie', lastName: 'Martin', email: 'marie.martin@example.com', department: 'RH', position: 'Responsable RH', status: 'active' },
    { badgeNumber: 'E003', employeeId: 'EMP003', firstName: 'Pierre', lastName: 'Bernard', email: 'pierre.bernard@example.com', department: 'Finance', position: 'Comptable', status: 'active' },
    { badgeNumber: 'E004', employeeId: 'EMP004', firstName: 'Sophie', lastName: 'Dubois', email: 'sophie.dubois@example.com', department: 'Marketing', position: 'Chef de produit', status: 'active' },
    { badgeNumber: 'E005', employeeId: 'EMP005', firstName: 'Paul', lastName: 'Thomas', email: 'paul.thomas@example.com', department: 'IT', position: 'Administrateur système', status: 'inactive' }
  ],
  visitors: [
    { badgeNumber: 'V001', firstName: 'Alexandre', lastName: 'Petit', company: 'ABC Corp', reason: 'Réunion', status: 'active' },
    { badgeNumber: 'V002', firstName: 'Céline', lastName: 'Richard', company: 'XYZ Industries', reason: 'Entretien', status: 'active' },
    { badgeNumber: 'V003', firstName: 'David', lastName: 'Robert', company: 'Tech Solutions', reason: 'Maintenance', status: 'inactive' }
  ],
  accessLogs: [
    { badgeNumber: 'E001', personType: 'employee', eventDate: new Date('2024-04-01'), eventTime: '08:30:00', reader: 'Entrée principale', terminal: 'Terminal 1', eventType: 'entry', direction: 'in', fullName: 'Jean Dupont', groupName: 'Employés', processed: true },
    { badgeNumber: 'E001', personType: 'employee', eventDate: new Date('2024-04-01'), eventTime: '17:15:00', reader: 'Entrée principale', terminal: 'Terminal 1', eventType: 'exit', direction: 'out', fullName: 'Jean Dupont', groupName: 'Employés', processed: true },
    { badgeNumber: 'E002', personType: 'employee', eventDate: new Date('2024-04-01'), eventTime: '09:00:00', reader: 'Entrée secondaire', terminal: 'Terminal 2', eventType: 'entry', direction: 'in', fullName: 'Marie Martin', groupName: 'Employés', processed: true },
    { badgeNumber: 'E002', personType: 'employee', eventDate: new Date('2024-04-01'), eventTime: '18:00:00', reader: 'Entrée secondaire', terminal: 'Terminal 2', eventType: 'exit', direction: 'out', fullName: 'Marie Martin', groupName: 'Employés', processed: true },
    { badgeNumber: 'V001', personType: 'visitor', eventDate: new Date('2024-04-01'), eventTime: '10:30:00', reader: 'Accueil visiteurs', terminal: 'Terminal 3', eventType: 'entry', direction: 'in', fullName: 'Alexandre Petit', groupName: 'Visiteurs', processed: true },
    { badgeNumber: 'V001', personType: 'visitor', eventDate: new Date('2024-04-01'), eventTime: '15:45:00', reader: 'Accueil visiteurs', terminal: 'Terminal 3', eventType: 'exit', direction: 'out', fullName: 'Alexandre Petit', groupName: 'Visiteurs', processed: true }
  ],
  anomalies: [
    { badgeNumber: 'E005', description: 'Tentative d\'accès avec un badge inactif', severity: 'medium', status: 'new', detectedAt: new Date('2024-04-01 14:22:10') },
    { badgeNumber: 'V003', description: 'Accès en dehors des heures de bureau', severity: 'high', status: 'investigating', detectedAt: new Date('2024-04-01 22:15:30') }
  ]
};

// Connexion à MySQL
async function connectToMySQL() {
  try {
    const connection = await mysql.createConnection(MYSQL_CONFIG);
    console.log('Connecté à MySQL');
    return connection;
  } catch (error) {
    console.error('Erreur de connexion à MySQL:', error);
    process.exit(1);
  }
}

// Fonction pour peupler la table des utilisateurs
async function seedUsers(mysqlConn) {
  console.log('Peuplement de la table des utilisateurs...');
  
  // Mapping pour stocker les ID des utilisateurs
  const userIdMap = {};
  
  for (const user of sampleData.users) {
    try {
      const [result] = await mysqlConn.execute(
        'INSERT INTO users (name, email, password, role, first_login, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [
          user.name,
          user.email,
          user.password,
          user.role,
          user.firstLogin,
          new Date(),
          new Date()
        ]
      );
      
      userIdMap[user.email] = result.insertId;
      console.log(`Utilisateur créé: ${user.name} (ID: ${result.insertId})`);
    } catch (error) {
      console.error(`Erreur lors de la création de l'utilisateur ${user.email}:`, error);
    }
  }
  
  return userIdMap;
}

// Fonction pour peupler la table des profils
async function seedProfiles(mysqlConn) {
  console.log('Peuplement de la table des profils...');
  
  // Mapping pour stocker les ID des profils
  const profileIdMap = {};
  
  for (const profile of sampleData.profiles) {
    try {
      const [result] = await mysqlConn.execute(
        'INSERT INTO profiles (name, description, created_at, updated_at) VALUES (?, ?, ?, ?)',
        [
          profile.name,
          profile.description,
          new Date(),
          new Date()
        ]
      );
      
      profileIdMap[profile.name] = result.insertId;
      console.log(`Profil créé: ${profile.name} (ID: ${result.insertId})`);
    } catch (error) {
      console.error(`Erreur lors de la création du profil ${profile.name}:`, error);
    }
  }
  
  return profileIdMap;
}

// Fonction pour peupler la table des permissions
async function seedPermissions(mysqlConn) {
  console.log('Peuplement de la table des permissions...');
  
  // Mapping pour stocker les ID des permissions
  const permissionIdMap = {};
  
  for (const permission of sampleData.permissions) {
    try {
      const [result] = await mysqlConn.execute(
        'INSERT INTO permissions (name, description, module, action, created_at) VALUES (?, ?, ?, ?, ?)',
        [
          permission.name,
          permission.description,
          permission.module,
          permission.action,
          new Date()
        ]
      );
      
      permissionIdMap[permission.name] = result.insertId;
      console.log(`Permission créée: ${permission.name} (ID: ${result.insertId})`);
    } catch (error) {
      console.error(`Erreur lors de la création de la permission ${permission.name}:`, error);
    }
  }
  
  return permissionIdMap;
}

// Fonction pour lier les profils et les permissions
async function linkProfilesPermissions(mysqlConn, profileIdMap, permissionIdMap) {
  console.log('Liaison des profils et des permissions...');
  
  // Mapping des permissions pour chaque profil
  const profilePermissions = {
    'Administrateur': ['access.read', 'access.write', 'employee.read', 'employee.write', 'settings.read', 'settings.write'],
    'Opérateur': ['access.read', 'access.write', 'employee.read'],
    'Visiteur': ['access.read']
  };
  
  for (const profileName in profilePermissions) {
    const profileId = profileIdMap[profileName];
    const permissions = profilePermissions[profileName];
    
    for (const permissionName of permissions) {
      const permissionId = permissionIdMap[permissionName];
      
      try {
        await mysqlConn.execute(
          'INSERT INTO profile_permissions (profile_id, permission_id) VALUES (?, ?)',
          [profileId, permissionId]
        );
        console.log(`Liaison créée: ${profileName} -> ${permissionName}`);
      } catch (error) {
        console.error(`Erreur lors de la liaison du profil ${profileName} à la permission ${permissionName}:`, error);
      }
    }
  }
}

// Fonction pour lier les utilisateurs et les profils
async function linkUsersProfiles(mysqlConn, userIdMap, profileIdMap) {
  console.log('Liaison des utilisateurs et des profils...');
  
  // Mapping des profils pour chaque utilisateur
  const userProfiles = {
    'admin@senator.com': ['Administrateur'],
    'operator@senator.com': ['Opérateur'],
    'user@senator.com': ['Visiteur']
  };
  
  for (const userEmail in userProfiles) {
    const userId = userIdMap[userEmail];
    const profiles = userProfiles[userEmail];
    
    for (const profileName of profiles) {
      const profileId = profileIdMap[profileName];
      
      try {
        await mysqlConn.execute(
          'INSERT INTO user_profiles (user_id, profile_id) VALUES (?, ?)',
          [userId, profileId]
        );
        console.log(`Liaison créée: ${userEmail} -> ${profileName}`);
      } catch (error) {
        console.error(`Erreur lors de la liaison de l'utilisateur ${userEmail} au profil ${profileName}:`, error);
      }
    }
  }
}

// Fonction pour peupler la table des employés
async function seedEmployees(mysqlConn) {
  console.log('Peuplement de la table des employés...');
  
  for (const employee of sampleData.employees) {
    try {
      const [result] = await mysqlConn.execute(
        'INSERT INTO employees (badge_number, employee_id, first_name, last_name, email, department, position, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          employee.badgeNumber,
          employee.employeeId,
          employee.firstName,
          employee.lastName,
          employee.email,
          employee.department,
          employee.position,
          employee.status,
          new Date(),
          new Date()
        ]
      );
      console.log(`Employé créé: ${employee.firstName} ${employee.lastName} (ID: ${result.insertId})`);
    } catch (error) {
      console.error(`Erreur lors de la création de l'employé ${employee.firstName} ${employee.lastName}:`, error);
    }
  }
}

// Fonction pour peupler la table des visiteurs
async function seedVisitors(mysqlConn) {
  console.log('Peuplement de la table des visiteurs...');
  
  for (const visitor of sampleData.visitors) {
    try {
      const [result] = await mysqlConn.execute(
        'INSERT INTO visitors (badge_number, first_name, last_name, company, reason, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [
          visitor.badgeNumber,
          visitor.firstName,
          visitor.lastName,
          visitor.company,
          visitor.reason,
          visitor.status,
          new Date(),
          new Date()
        ]
      );
      console.log(`Visiteur créé: ${visitor.firstName} ${visitor.lastName} (ID: ${result.insertId})`);
    } catch (error) {
      console.error(`Erreur lors de la création du visiteur ${visitor.firstName} ${visitor.lastName}:`, error);
    }
  }
}

// Fonction pour peupler la table des logs d'accès
async function seedAccessLogs(mysqlConn) {
  console.log('Peuplement de la table des logs d\'accès...');
  
  for (const log of sampleData.accessLogs) {
    try {
      // Formatage des dates et heures
      const eventDate = log.eventDate.toISOString().split('T')[0];
      
      await mysqlConn.execute(
        'INSERT INTO access_logs (badge_number, person_type, event_date, event_time, reader, terminal, event_type, direction, full_name, group_name, processed, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          log.badgeNumber,
          log.personType,
          eventDate,
          log.eventTime,
          log.reader,
          log.terminal,
          log.eventType,
          log.direction,
          log.fullName,
          log.groupName,
          log.processed,
          new Date()
        ]
      );
      console.log(`Log d'accès créé pour ${log.fullName} le ${eventDate} à ${log.eventTime}`);
    } catch (error) {
      console.error(`Erreur lors de la création du log d'accès:`, error);
    }
  }
}

// Fonction pour peupler la table des anomalies
async function seedAnomalies(mysqlConn, userIdMap) {
  console.log('Peuplement de la table des anomalies...');
  
  for (const anomaly of sampleData.anomalies) {
    try {
      await mysqlConn.execute(
        'INSERT INTO anomalies (badge_number, description, severity, status, detected_at, resolved_at, resolved_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [
          anomaly.badgeNumber,
          anomaly.description,
          anomaly.severity,
          anomaly.status,
          anomaly.detectedAt,
          null,
          null
        ]
      );
      console.log(`Anomalie créée: ${anomaly.description}`);
    } catch (error) {
      console.error(`Erreur lors de la création de l'anomalie:`, error);
    }
  }
}

// Fonction de configuration des paramètres
async function seedSecuritySettings(mysqlConn, userIdMap) {
  console.log('Configuration des paramètres de sécurité...');
  
  try {
    const adminId = userIdMap['admin@senator.com'];
    
    await mysqlConn.execute(
      'INSERT INTO security_settings (min_password_length, require_special_chars, require_numbers, require_uppercase, password_history_count, max_login_attempts, lock_duration_minutes, two_factor_auth_enabled, updated_at, updated_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        8,
        true,
        true,
        true,
        3,
        5,
        30,
        false,
        new Date(),
        adminId
      ]
    );
    console.log('Paramètres de sécurité configurés');
  } catch (error) {
    console.error('Erreur lors de la configuration des paramètres de sécurité:', error);
  }
}

// Fonction de configuration des paramètres d'assiduité
async function seedAttendanceConfig(mysqlConn, userIdMap) {
  console.log('Configuration des paramètres d\'assiduité...');
  
  try {
    const adminId = userIdMap['admin@senator.com'];
    
    await mysqlConn.execute(
      'INSERT INTO attendance_config (work_start_time, work_end_time, lunch_start_time, lunch_end_time, work_days, updated_at, updated_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [
        '09:00:00',
        '17:00:00',
        '12:00:00',
        '13:00:00',
        '1,2,3,4,5',
        new Date(),
        adminId
      ]
    );
    console.log('Paramètres d\'assiduité configurés');
  } catch (error) {
    console.error('Erreur lors de la configuration des paramètres d\'assiduité:', error);
  }
}

// Fonction pour peupler la table des jours fériés
async function seedHolidays(mysqlConn, userIdMap) {
  console.log('Peuplement de la table des jours fériés...');
  
  const holidays = [
    { date: '2024-01-01', name: 'Jour de l\'An' },
    { date: '2024-04-01', name: 'Lundi de Pâques' },
    { date: '2024-05-01', name: 'Fête du Travail' },
    { date: '2024-05-08', name: 'Victoire 1945' },
    { date: '2024-05-09', name: 'Ascension' },
    { date: '2024-05-20', name: 'Lundi de Pentecôte' },
    { date: '2024-07-14', name: 'Fête Nationale' },
    { date: '2024-08-15', name: 'Assomption' },
    { date: '2024-11-01', name: 'Toussaint' },
    { date: '2024-11-11', name: 'Armistice' },
    { date: '2024-12-25', name: 'Noël' }
  ];
  
  const adminId = userIdMap['admin@senator.com'];
  
  for (const holiday of holidays) {
    try {
      await mysqlConn.execute(
        'INSERT INTO holidays (date, name, description, created_at, created_by) VALUES (?, ?, ?, ?, ?)',
        [
          holiday.date,
          holiday.name,
          '',
          new Date(),
          adminId
        ]
      );
      console.log(`Jour férié créé: ${holiday.name} (${holiday.date})`);
    } catch (error) {
      console.error(`Erreur lors de la création du jour férié ${holiday.name}:`, error);
    }
  }
}

// Fonction principale pour peupler la base de données
async function main() {
  console.log('Début du peuplement de la base de données MySQL');
  
  const mysqlConn = await connectToMySQL();
  
  try {
    // Peuplement des tables principales
    const userIdMap = await seedUsers(mysqlConn);
    const profileIdMap = await seedProfiles(mysqlConn);
    const permissionIdMap = await seedPermissions(mysqlConn);
    
    // Liaison des tables
    await linkProfilesPermissions(mysqlConn, profileIdMap, permissionIdMap);
    await linkUsersProfiles(mysqlConn, userIdMap, profileIdMap);
    
    // Peuplement des autres tables
    await seedEmployees(mysqlConn);
    await seedVisitors(mysqlConn);
    await seedAccessLogs(mysqlConn);
    await seedAnomalies(mysqlConn, userIdMap);
    await seedSecuritySettings(mysqlConn, userIdMap);
    await seedAttendanceConfig(mysqlConn, userIdMap);
    await seedHolidays(mysqlConn, userIdMap);
    
    console.log('Peuplement de la base de données terminé avec succès!');
  } catch (error) {
    console.error('Erreur durant le peuplement de la base de données:', error);
  } finally {
    // Fermeture de la connexion
    await mysqlConn.end();
    console.log('Connexion fermée');
  }
}

// Exécution du script
main().catch(console.error); 