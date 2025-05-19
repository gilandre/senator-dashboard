const mongoose = require('mongoose');
const mysql = require('mysql2/promise');
const { v4: uuidv4 } = require('uuid');

// Configuration
// Utilisation d'une connexion directe au lieu de SRV
const MONGODB_URI = 'mongodb://quentin:investTech2024@ac-qsfjdol-shard-00-00.a5a0hde.mongodb.net:27017,ac-qsfjdol-shard-00-01.a5a0hde.mongodb.net:27017,ac-qsfjdol-shard-00-02.a5a0hde.mongodb.net:27017/senatoriot-db?ssl=true&replicaSet=atlas-dwl0gj-shard-0&authSource=admin&retryWrites=true&w=majority';
const MYSQL_CONFIG = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'senator_investech'
};

// Mapper pour stocker les relations entre les anciens IDs MongoDB et les nouveaux IDs MySQL
const idMapper = {
  users: {},
  employees: {},
  visitors: {},
  profiles: {},
  permissions: {}
};

// Connexion à MongoDB avec des options supplémentaires
async function connectToMongo() {
  try {
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000, // Timeout après 5 secondes
      socketTimeoutMS: 45000, // Timeout de socket après 45 secondes
    });
    console.log('Connecté à MongoDB');
  } catch (error) {
    console.error('Erreur de connexion à MongoDB:', error);
    process.exit(1);
  }
}

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

// Fonction pour migrer les utilisateurs
async function migrateUsers(mysqlConn) {
  console.log('Migration des utilisateurs...');
  
  try {
    // Récupération des utilisateurs depuis MongoDB
    const users = await mongoose.connection.db.collection('users').find({}).toArray();
    console.log(`${users.length} utilisateurs trouvés dans MongoDB`);
    
    // Pour chaque utilisateur, insertion dans MySQL
    for (const user of users) {
      try {
        const [result] = await mysqlConn.execute(
          'INSERT INTO users (name, email, password, role, first_login, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [
            user.name || 'Utilisateur sans nom',
            user.email,
            user.password || '$2a$10$5OpFrS.eoLJ5ULdhbXVNOeWFR/aOOk4St1LR1fvQNF9MKjYm3vKHa', // Mot de passe par défaut
            user.role || 'user',
            user.firstLogin !== undefined ? user.firstLogin : true,
            user.createdAt ? new Date(user.createdAt) : new Date(),
            user.updatedAt ? new Date(user.updatedAt) : new Date()
          ]
        );
        
        // Stockage de la relation entre l'ancien ID MongoDB et le nouvel ID MySQL
        idMapper.users[user._id.toString()] = result.insertId;
      } catch (error) {
        console.error(`Erreur lors de la migration de l'utilisateur ${user.email}:`, error);
      }
    }
    
    console.log('Migration des utilisateurs terminée');
  } catch (error) {
    console.error('Erreur lors de la récupération des utilisateurs:', error);
  }
}

// Fonction pour migrer les profils
async function migrateProfiles(mysqlConn) {
  console.log('Migration des profils...');
  
  // Récupération des profils depuis MongoDB
  const profiles = await mongoose.connection.db.collection('profiles').find({}).toArray();
  console.log(`${profiles.length} profils trouvés dans MongoDB`);
  
  // Pour chaque profil, insertion dans MySQL
  for (const profile of profiles) {
    try {
      const [result] = await mysqlConn.execute(
        'INSERT INTO profiles (name, description, created_at, updated_at) VALUES (?, ?, ?, ?)',
        [
          profile.name,
          profile.description || '',
          profile.createdAt ? new Date(profile.createdAt) : new Date(),
          profile.updatedAt ? new Date(profile.updatedAt) : new Date()
        ]
      );
      
      // Stockage de la relation entre l'ancien ID MongoDB et le nouvel ID MySQL
      idMapper.profiles[profile._id.toString()] = result.insertId;
      
      // Si le profil a des utilisateurs associés
      if (profile.users && Array.isArray(profile.users)) {
        for (const userId of profile.users) {
          const mysqlUserId = idMapper.users[userId.toString()];
          if (mysqlUserId) {
            try {
              await mysqlConn.execute(
                'INSERT INTO user_profiles (user_id, profile_id) VALUES (?, ?)',
                [mysqlUserId, result.insertId]
              );
            } catch (error) {
              console.error(`Erreur lors de l'association utilisateur-profil:`, error);
            }
          }
        }
      }
    } catch (error) {
      console.error(`Erreur lors de la migration du profil ${profile.name}:`, error);
    }
  }
  
  console.log('Migration des profils terminée');
}

// Fonction pour migrer les permissions
async function migratePermissions(mysqlConn) {
  console.log('Migration des permissions...');
  
  // Récupération des permissions depuis MongoDB
  const permissions = await mongoose.connection.db.collection('permissions').find({}).toArray();
  console.log(`${permissions.length} permissions trouvées dans MongoDB`);
  
  // Pour chaque permission, insertion dans MySQL
  for (const permission of permissions) {
    try {
      const [result] = await mysqlConn.execute(
        'INSERT INTO permissions (name, description, module, action, created_at) VALUES (?, ?, ?, ?, ?)',
        [
          permission.name,
          permission.description || '',
          permission.module || '',
          permission.action || '',
          permission.createdAt ? new Date(permission.createdAt) : new Date()
        ]
      );
      
      // Stockage de la relation entre l'ancien ID MongoDB et le nouvel ID MySQL
      idMapper.permissions[permission._id.toString()] = result.insertId;
    } catch (error) {
      console.error(`Erreur lors de la migration de la permission ${permission.name}:`, error);
    }
  }
  
  // Migrer les relations entre profils et permissions
  const profilePermissions = await mongoose.connection.db.collection('profilepermissions').find({}).toArray();
  if (profilePermissions.length > 0) {
    console.log(`${profilePermissions.length} relations profil-permission trouvées dans MongoDB`);
    
    for (const pp of profilePermissions) {
      const mysqlProfileId = idMapper.profiles[pp.profileId.toString()];
      const mysqlPermissionId = idMapper.permissions[pp.permissionId.toString()];
      
      if (mysqlProfileId && mysqlPermissionId) {
        try {
          await mysqlConn.execute(
            'INSERT INTO profile_permissions (profile_id, permission_id) VALUES (?, ?)',
            [mysqlProfileId, mysqlPermissionId]
          );
        } catch (error) {
          console.error(`Erreur lors de l'association profil-permission:`, error);
        }
      }
    }
  }
  
  console.log('Migration des permissions terminée');
}

// Fonction pour migrer les employés
async function migrateEmployees(mysqlConn) {
  console.log('Migration des employés...');
  
  // Récupération des employés depuis MongoDB
  const employees = await mongoose.connection.db.collection('employees').find({}).toArray();
  console.log(`${employees.length} employés trouvés dans MongoDB`);
  
  // Pour chaque employé, insertion dans MySQL
  for (const employee of employees) {
    try {
      const [result] = await mysqlConn.execute(
        'INSERT INTO employees (badge_number, employee_id, first_name, last_name, email, department, position, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          employee.badgeNumber || uuidv4().substring(0, 8),
          employee.employeeId || '',
          employee.firstName || '',
          employee.lastName || '',
          employee.email || '',
          employee.department || '',
          employee.position || '',
          employee.status || 'active',
          employee.createdAt ? new Date(employee.createdAt) : new Date(),
          employee.updatedAt ? new Date(employee.updatedAt) : new Date()
        ]
      );
      
      // Stockage de la relation entre l'ancien ID MongoDB et le nouvel ID MySQL
      idMapper.employees[employee._id.toString()] = result.insertId;
    } catch (error) {
      console.error(`Erreur lors de la migration de l'employé ${employee.badgeNumber}:`, error);
    }
  }
  
  console.log('Migration des employés terminée');
}

// Fonction pour migrer les visiteurs
async function migrateVisitors(mysqlConn) {
  console.log('Migration des visiteurs...');
  
  // Récupération des visiteurs depuis MongoDB
  const visitors = await mongoose.connection.db.collection('visitors').find({}).toArray();
  console.log(`${visitors.length} visiteurs trouvés dans MongoDB`);
  
  // Pour chaque visiteur, insertion dans MySQL
  for (const visitor of visitors) {
    try {
      const [result] = await mysqlConn.execute(
        'INSERT INTO visitors (badge_number, first_name, last_name, company, reason, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [
          visitor.badgeNumber || uuidv4().substring(0, 8),
          visitor.firstName || '',
          visitor.lastName || '',
          visitor.company || '',
          visitor.reason || '',
          visitor.status || 'active',
          visitor.createdAt ? new Date(visitor.createdAt) : new Date(),
          visitor.updatedAt ? new Date(visitor.updatedAt) : new Date()
        ]
      );
      
      // Stockage de la relation entre l'ancien ID MongoDB et le nouvel ID MySQL
      idMapper.visitors[visitor._id.toString()] = result.insertId;
    } catch (error) {
      console.error(`Erreur lors de la migration du visiteur ${visitor.badgeNumber}:`, error);
    }
  }
  
  console.log('Migration des visiteurs terminée');
}

// Fonction pour migrer les logs d'accès
async function migrateAccessLogs(mysqlConn) {
  console.log('Migration des logs d\'accès...');
  
  // Récupération des logs d'accès depuis MongoDB
  const accessLogs = await mongoose.connection.db.collection('accesslogs').find({}).toArray();
  console.log(`${accessLogs.length} logs d'accès trouvés dans MongoDB`);
  
  // Pour chaque log d'accès, insertion dans MySQL
  for (const log of accessLogs) {
    try {
      // Extraction de la date et de l'heure
      const eventDateTime = log.eventDate ? new Date(log.eventDate) : new Date();
      const eventDate = eventDateTime.toISOString().split('T')[0];
      const eventTime = eventDateTime.toTimeString().split(' ')[0];
      
      await mysqlConn.execute(
        'INSERT INTO access_logs (badge_number, person_type, event_date, event_time, reader, terminal, event_type, direction, full_name, group_name, processed, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          log.badgeNumber || '',
          log.personType || 'employee',
          eventDate,
          eventTime,
          log.reader || '',
          log.terminal || '',
          log.eventType || 'unknown',
          log.direction || '',
          log.fullName || '',
          log.group || '',
          log.processed === true,
          log.createdAt ? new Date(log.createdAt) : new Date()
        ]
      );
    } catch (error) {
      console.error(`Erreur lors de la migration du log d'accès:`, error);
    }
  }
  
  console.log('Migration des logs d\'accès terminée');
}

// Fonction pour migrer les anomalies
async function migrateAnomalies(mysqlConn) {
  console.log('Migration des anomalies...');
  
  // Récupération des anomalies depuis MongoDB
  const anomalies = await mongoose.connection.db.collection('anomalies').find({}).toArray();
  console.log(`${anomalies.length} anomalies trouvées dans MongoDB`);
  
  // Pour chaque anomalie, insertion dans MySQL
  for (const anomaly of anomalies) {
    try {
      // Convertir l'ID de l'utilisateur qui a résolu l'anomalie si présent
      let resolvedBy = null;
      if (anomaly.resolvedBy) {
        resolvedBy = idMapper.users[anomaly.resolvedBy.toString()];
      }
      
      await mysqlConn.execute(
        'INSERT INTO anomalies (badge_number, description, severity, status, detected_at, resolved_at, resolved_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [
          anomaly.badgeNumber || '',
          anomaly.description || '',
          anomaly.severity || 'medium',
          anomaly.status || 'new',
          anomaly.detectedAt ? new Date(anomaly.detectedAt) : new Date(),
          anomaly.resolvedAt ? new Date(anomaly.resolvedAt) : null,
          resolvedBy
        ]
      );
    } catch (error) {
      console.error(`Erreur lors de la migration de l'anomalie:`, error);
    }
  }
  
  console.log('Migration des anomalies terminée');
}

// Fonction principale pour exécuter la migration
async function main() {
  console.log('Début de la migration MongoDB vers MySQL');
  
  await connectToMongo();
  const mysqlConn = await connectToMySQL();
  
  try {
    // Migration des entités principales
    await migrateUsers(mysqlConn);
    await migrateProfiles(mysqlConn);
    await migratePermissions(mysqlConn);
    await migrateEmployees(mysqlConn);
    await migrateVisitors(mysqlConn);
    
    // Migration des données dépendantes
    await migrateAccessLogs(mysqlConn);
    await migrateAnomalies(mysqlConn);
    
    console.log('Migration terminée avec succès!');
  } catch (error) {
    console.error('Erreur durant la migration:', error);
  } finally {
    // Fermeture des connexions
    await mongoose.disconnect();
    await mysqlConn.end();
    console.log('Connexions fermées');
  }
}

// Exécution du script
main().catch(console.error); 