const mysql = require('mysql2/promise');
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

// Configuration MySQL
const MYSQL_CONFIG = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'senator_investech'
};

// Configuration MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://quentin:investTech2024@senatoriot-db.a5a0hde.mongodb.net/?retryWrites=true&w=majority';

// Données de secours si MongoDB est inaccessible
const FALLBACK_PERMISSIONS = [
  { _id: 'perm1', name: 'Lecture des accès', description: 'Permet de consulter l\'historique des accès', module: 'access', action: 'read' },
  { _id: 'perm2', name: 'Gestion des accès', description: 'Permet de gérer les autorisations d\'accès', module: 'access', action: 'write' },
  { _id: 'perm3', name: 'Lecture des employés', description: 'Permet de consulter la liste des employés', module: 'employees', action: 'read' },
  { _id: 'perm4', name: 'Gestion des employés', description: 'Permet d\'ajouter et modifier des employés', module: 'employees', action: 'write' },
  { _id: 'perm5', name: 'Lecture des paramètres', description: 'Permet de consulter les paramètres système', module: 'settings', action: 'read' },
  { _id: 'perm6', name: 'Gestion des paramètres', description: 'Permet de modifier les paramètres système', module: 'settings', action: 'write' }
];

// Mapper les codes de permission aux noms de permission
const PERMISSION_CODE_TO_NAME = {
  'access.read': 'Lecture des accès',
  'access.write': 'Gestion des accès',
  'employees.read': 'Lecture des employés',
  'employees.write': 'Gestion des employés',
  'settings.read': 'Lecture des paramètres',
  'settings.write': 'Gestion des paramètres'
};

const FALLBACK_PROFILES = [
  { _id: 'prof1', name: 'Administrateur', description: 'Accès complet à toutes les fonctionnalités', permissions: ['access.read', 'access.write', 'employees.read', 'employees.write', 'settings.read', 'settings.write'] },
  { _id: 'prof2', name: 'Opérateur', description: 'Gestion des accès et employés', permissions: ['access.read', 'access.write', 'employees.read'] },
  { _id: 'prof3', name: 'Visiteur', description: 'Consultation uniquement', permissions: ['access.read', 'employees.read'] }
];

// Définition des schémas MongoDB (seulement pour la récupération de données)
const profileSchema = new mongoose.Schema({
  name: String,
  description: String,
  permissions: Array
});

const permissionSchema = new mongoose.Schema({
  name: String,
  description: String,
  module: String,
  action: String
});

let Profile, Permission;

// Connexion à MongoDB et récupération des données
async function connectToMongo() {
  try {
    console.log('Tentative de connexion à MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000, // Timeout après 5 secondes
      socketTimeoutMS: 30000 // Timeout de socket après 30 secondes
    });
    console.log('Connecté à MongoDB');
    
    // Définir les modèles MongoDB seulement après connexion
    Profile = mongoose.model('Profile', profileSchema);
    Permission = mongoose.model('Permission', permissionSchema);
    
    return true;
  } catch (error) {
    console.error('Erreur de connexion à MongoDB:', error);
    return false;
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

// Récupération des profils depuis MongoDB ou utilisation des données de secours
async function getProfilesFromMongo() {
  if (!Profile) {
    console.log('Utilisation des profils de secours');
    return FALLBACK_PROFILES;
  }
  
  try {
    const profiles = await Profile.find({}).lean();
    if (profiles && profiles.length > 0) {
      console.log(`${profiles.length} profils récupérés depuis MongoDB`);
      return profiles;
    } else {
      console.log('Aucun profil trouvé dans MongoDB, utilisation des profils de secours');
      return FALLBACK_PROFILES;
    }
  } catch (error) {
    console.error('Erreur lors de la récupération des profils depuis MongoDB:', error);
    return FALLBACK_PROFILES;
  }
}

// Récupération des permissions depuis MongoDB ou utilisation des données de secours
async function getPermissionsFromMongo() {
  if (!Permission) {
    console.log('Utilisation des permissions de secours');
    return FALLBACK_PERMISSIONS;
  }
  
  try {
    const permissions = await Permission.find({}).lean();
    if (permissions && permissions.length > 0) {
      console.log(`${permissions.length} permissions récupérées depuis MongoDB`);
      return permissions;
    } else {
      console.log('Aucune permission trouvée dans MongoDB, utilisation des permissions de secours');
      return FALLBACK_PERMISSIONS;
    }
  } catch (error) {
    console.error('Erreur lors de la récupération des permissions depuis MongoDB:', error);
    return FALLBACK_PERMISSIONS;
  }
}

// Insertion des permissions dans MySQL
async function insertPermissions(mysqlConn, permissions) {
  console.log('Insertion des permissions dans MySQL...');
  
  const permissionMap = new Map(); // Pour stocker l'association entre _id MongoDB et id MySQL
  
  for (const perm of permissions) {
    try {
      // Vérifier si la permission existe déjà
      const [existingPerms] = await mysqlConn.execute(
        'SELECT * FROM permissions WHERE name = ?',
        [perm.name]
      );
      
      if (existingPerms.length > 0) {
        console.log(`Permission "${perm.name}" déjà existante (ID: ${existingPerms[0].id})`);
        permissionMap.set(perm._id.toString(), existingPerms[0].id);
      } else {
        // Insérer la nouvelle permission
        const [result] = await mysqlConn.execute(
          'INSERT INTO permissions (name, description, module, action, created_at) VALUES (?, ?, ?, ?, ?)',
          [
            perm.name,
            perm.description,
            perm.module,
            perm.action,
            new Date()
          ]
        );
        
        console.log(`Permission "${perm.name}" créée avec succès (ID: ${result.insertId})`);
        permissionMap.set(perm._id.toString(), result.insertId);
      }
    } catch (error) {
      console.error(`Erreur lors de l'insertion de la permission "${perm.name}":`, error);
    }
  }
  
  return permissionMap;
}

// Insertion des profils dans MySQL
async function insertProfiles(mysqlConn, profiles) {
  console.log('Insertion des profils dans MySQL...');
  
  const profileMap = new Map(); // Pour stocker l'association entre _id MongoDB et id MySQL
  
  for (const profile of profiles) {
    try {
      // Vérifier si le profil existe déjà
      const [existingProfiles] = await mysqlConn.execute(
        'SELECT * FROM profiles WHERE name = ?',
        [profile.name]
      );
      
      if (existingProfiles.length > 0) {
        console.log(`Profil ${profile.name} déjà existant (ID: ${existingProfiles[0].id})`);
        profileMap.set(profile._id.toString(), existingProfiles[0].id);
      } else {
        // Insérer le nouveau profil
        const [result] = await mysqlConn.execute(
          'INSERT INTO profiles (name, description, created_at, updated_at) VALUES (?, ?, ?, ?)',
          [
            profile.name,
            profile.description,
            new Date(),
            new Date()
          ]
        );
        
        console.log(`Profil ${profile.name} créé avec succès (ID: ${result.insertId})`);
        profileMap.set(profile._id.toString(), result.insertId);
      }
    } catch (error) {
      console.error(`Erreur lors de l'insertion du profil ${profile.name}:`, error);
    }
  }
  
  return profileMap;
}

// Liaison des profils et permissions dans MySQL
async function linkProfilesAndPermissions(mysqlConn, profiles, profileMap, permissionMap) {
  console.log('Liaison des profils et permissions dans MySQL...');
  
  for (const profile of profiles) {
    const profileId = profileMap.get(profile._id.toString());
    
    if (!profileId) {
      console.log(`Profil ID ${profile._id} non trouvé dans le mapping, impossible de lier les permissions`);
      continue;
    }
    
    if (!profile.permissions || !Array.isArray(profile.permissions)) {
      console.log(`Profil ${profile.name} n'a pas de permissions ou format invalide`);
      continue;
    }
    
    for (const permCode of profile.permissions) {
      try {
        // Convertir le code de permission en nom
        const permName = PERMISSION_CODE_TO_NAME[permCode];
        
        if (!permName) {
          console.log(`Pas de correspondance trouvée pour le code de permission ${permCode}`);
          continue;
        }
        
        // Trouver l'ID de la permission basé sur le nom
        const [permResult] = await mysqlConn.execute(
          'SELECT id FROM permissions WHERE name = ?',
          [permName]
        );
        
        if (permResult.length === 0) {
          console.log(`Permission "${permName}" non trouvée dans la base de données MySQL`);
          continue;
        }
        
        const permissionId = permResult[0].id;
        
        // Vérifier si la liaison existe déjà
        const [existingLinks] = await mysqlConn.execute(
          'SELECT * FROM profile_permissions WHERE profile_id = ? AND permission_id = ?',
          [profileId, permissionId]
        );
        
        if (existingLinks.length > 0) {
          console.log(`Liaison entre profil ID ${profileId} et permission ID ${permissionId} déjà existante`);
        } else {
          // Créer la liaison
          await mysqlConn.execute(
            'INSERT INTO profile_permissions (profile_id, permission_id) VALUES (?, ?)',
            [profileId, permissionId]
          );
          
          console.log(`Liaison créée entre profil ID ${profileId} et permission "${permName}" (ID: ${permissionId})`);
        }
      } catch (error) {
        console.error(`Erreur lors de la liaison du profil ID ${profileId} avec la permission ${permCode}:`, error);
      }
    }
  }
}

// Liaison des utilisateurs et profils dans MySQL
async function linkUsersAndProfiles(mysqlConn, profileMap) {
  console.log('Liaison des utilisateurs au profil administrateur par défaut...');
  
  try {
    // Récupération des utilisateurs admins
    const [adminUsers] = await mysqlConn.execute(
      'SELECT id FROM users WHERE role = ?',
      ['admin']
    );
    
    // Récupération de l'ID du profil Administrateur
    const [adminProfiles] = await mysqlConn.execute(
      'SELECT id FROM profiles WHERE name = ?',
      ['Administrateur']
    );
    
    if (adminProfiles.length === 0) {
      console.log('Profil Administrateur non trouvé, impossible de lier les utilisateurs');
      return;
    }
    
    const adminProfileId = adminProfiles[0].id;
    
    for (const user of adminUsers) {
      // Vérifier si la liaison existe déjà
      const [existingLinks] = await mysqlConn.execute(
        'SELECT * FROM user_profiles WHERE user_id = ? AND profile_id = ?',
        [user.id, adminProfileId]
      );
      
      if (existingLinks.length > 0) {
        console.log(`Utilisateur ID ${user.id} déjà lié au profil Administrateur`);
      } else {
        // Créer la liaison
        await mysqlConn.execute(
          'INSERT INTO user_profiles (user_id, profile_id) VALUES (?, ?)',
          [user.id, adminProfileId]
        );
        
        console.log(`Utilisateur ID ${user.id} lié au profil Administrateur`);
      }
    }
  } catch (error) {
    console.error('Erreur lors de la liaison des utilisateurs aux profils:', error);
  }
}

// Fonction principale
async function main() {
  let mongoConnected = await connectToMongo();
  const mysqlConn = await connectToMySQL();
  
  try {
    // Récupération des données (depuis MongoDB ou fallback)
    const permissions = await getPermissionsFromMongo();
    const profiles = await getProfilesFromMongo();
    
    // Insertion dans MySQL
    const permissionMap = await insertPermissions(mysqlConn, permissions);
    const profileMap = await insertProfiles(mysqlConn, profiles);
    
    // Liaison des entités
    await linkProfilesAndPermissions(mysqlConn, profiles, profileMap, permissionMap);
    await linkUsersAndProfiles(mysqlConn, profileMap);
    
    console.log('Migration des profils et permissions terminée!');
  } catch (error) {
    console.error('Erreur lors de la migration:', error);
  } finally {
    // Fermeture des connexions
    if (mongoConnected) {
      await mongoose.connection.close();
      console.log('Connexion MongoDB fermée');
    }
    
    await mysqlConn.end();
    console.log('Connexion MySQL fermée');
  }
}

// Exécution du script
main().catch(console.error); 