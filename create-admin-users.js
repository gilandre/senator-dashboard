const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

// Configuration MySQL
const MYSQL_CONFIG = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'senator_investech'
};

// Utilisateurs administrateurs à créer
const adminUsers = [
  { name: 'Admin Principal', email: 'admin@senator.com', role: 'admin' },
  { name: 'Admin Opérationnel', email: 'admin.op@senator.com', role: 'admin' },
  { name: 'Admin Système', email: 'admin.sys@senator.com', role: 'admin' }
];

// Mot de passe commun
const password = 'P@ssw0rd';
// Hash du mot de passe
const hashedPassword = bcrypt.hashSync(password, 10);

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

// Fonction pour créer un utilisateur
async function createUser(mysqlConn, userData) {
  try {
    // Vérifier si l'utilisateur existe déjà
    const [existingUsers] = await mysqlConn.execute(
      'SELECT * FROM users WHERE email = ?',
      [userData.email]
    );
    
    if (existingUsers.length > 0) {
      console.log(`L'utilisateur ${userData.email} existe déjà.`);
      
      // Mettre à jour l'utilisateur existant
      const [result] = await mysqlConn.execute(
        'UPDATE users SET password = ?, role = ?, updated_at = ? WHERE email = ?',
        [hashedPassword, userData.role, new Date(), userData.email]
      );
      
      console.log(`Utilisateur ${userData.email} mis à jour avec succès.`);
      return existingUsers[0].id;
    } else {
      // Créer un nouvel utilisateur
      const [result] = await mysqlConn.execute(
        'INSERT INTO users (name, email, password, role, first_login, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [
          userData.name,
          userData.email,
          hashedPassword,
          userData.role,
          false,
          new Date(),
          new Date()
        ]
      );
      
      console.log(`Utilisateur ${userData.email} créé avec succès (ID: ${result.insertId})`);
      return result.insertId;
    }
  } catch (error) {
    console.error(`Erreur lors de la création/mise à jour de l'utilisateur ${userData.email}:`, error);
    return null;
  }
}

// Fonction pour lier un utilisateur à un profil administrateur
async function linkUserToAdminProfile(mysqlConn, userId) {
  try {
    // Trouver l'ID du profil administrateur
    const [adminProfiles] = await mysqlConn.execute(
      'SELECT id FROM profiles WHERE name = ?',
      ['Administrateur']
    );
    
    if (adminProfiles.length === 0) {
      console.log('Profil Administrateur non trouvé. Création du profil...');
      
      // Créer le profil Administrateur s'il n'existe pas
      const [profileResult] = await mysqlConn.execute(
        'INSERT INTO profiles (name, description, created_at, updated_at) VALUES (?, ?, ?, ?)',
        ['Administrateur', 'Accès complet à toutes les fonctionnalités', new Date(), new Date()]
      );
      
      const adminProfileId = profileResult.insertId;
      console.log(`Profil Administrateur créé avec ID: ${adminProfileId}`);
      
      // Lier l'utilisateur au profil
      await mysqlConn.execute(
        'INSERT INTO user_profiles (user_id, profile_id) VALUES (?, ?)',
        [userId, adminProfileId]
      );
      
      console.log(`Utilisateur ID ${userId} lié au profil Administrateur ID ${adminProfileId}`);
    } else {
      const adminProfileId = adminProfiles[0].id;
      
      // Vérifier si la liaison existe déjà
      const [existingLinks] = await mysqlConn.execute(
        'SELECT * FROM user_profiles WHERE user_id = ? AND profile_id = ?',
        [userId, adminProfileId]
      );
      
      if (existingLinks.length > 0) {
        console.log(`Utilisateur ID ${userId} déjà lié au profil Administrateur`);
      } else {
        // Lier l'utilisateur au profil
        await mysqlConn.execute(
          'INSERT INTO user_profiles (user_id, profile_id) VALUES (?, ?)',
          [userId, adminProfileId]
        );
        
        console.log(`Utilisateur ID ${userId} lié au profil Administrateur ID ${adminProfileId}`);
      }
    }
  } catch (error) {
    console.error(`Erreur lors de la liaison de l'utilisateur ID ${userId} au profil Administrateur:`, error);
  }
}

// Fonction principale
async function main() {
  const mysqlConn = await connectToMySQL();
  
  try {
    console.log('Création des utilisateurs administrateurs...');
    
    for (const userData of adminUsers) {
      const userId = await createUser(mysqlConn, userData);
      
      if (userId) {
        await linkUserToAdminProfile(mysqlConn, userId);
      }
    }
    
    console.log('Création des utilisateurs administrateurs terminée!');
  } catch (error) {
    console.error('Erreur:', error);
  } finally {
    await mysqlConn.end();
    console.log('Connexion fermée');
  }
}

// Exécution du script
main().catch(console.error); 