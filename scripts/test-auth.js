/**
 * Script de test de l'authentification sur l'application SENATOR INVESTECH
 * Ce script utilise axios pour tester les API d'authentification.
 */

const axios = require('axios');
const readline = require('readline');

// Configuration
const baseUrl = 'http://localhost:3010';
const credentials = {
  email: 'admin@senator.com',
  password: 'P@ssw0rd123'
};

// Créer une interface readline pour l'interaction
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

let authCookie = '';
const axiosInstance = axios.create({
  baseURL: baseUrl,
  withCredentials: true
});

/**
 * Teste l'API de login
 */
async function testLogin() {
  console.log(`\n[TEST] Connexion à ${baseUrl}/api/auth/login avec ${credentials.email}`);
  
  try {
    const response = await axiosInstance.post('/api/auth/login', credentials);
    
    if (response.headers['set-cookie']) {
      authCookie = response.headers['set-cookie'][0];
      console.log('Cookie obtenu:', authCookie);
    }
    
    console.log('✅ Connexion réussie!');
    console.log('Utilisateur:', response.data.user);
    return response.data.user;
  } catch (error) {
    if (error.response) {
      console.log('❌ Échec de la connexion:', error.response.data);
    } else {
      console.error('❌ Erreur lors de la connexion:', error.message);
    }
    return null;
  }
}

/**
 * Teste l'accès à la liste des utilisateurs
 */
async function testGetUsers() {
  console.log(`\n[TEST] Accès à ${baseUrl}/api/users avec cookie d'authentification`);
  
  try {
    const response = await axiosInstance.get('/api/users', {
      headers: {
        Cookie: authCookie
      }
    });
    
    console.log('✅ Accès réussi!');
    console.log(`Nombre d'utilisateurs: ${response.data.users?.length || 0}`);
    return response.data;
  } catch (error) {
    if (error.response) {
      console.log('❌ Échec de l\'accès:', error.response.data);
    } else {
      console.error('❌ Erreur lors de l\'accès:', error.message);
    }
    return null;
  }
}

/**
 * Fonction principale qui exécute les tests
 */
async function runTests() {
  console.log('=== TEST D\'AUTHENTIFICATION ===');
  console.log(`Application: ${baseUrl}`);
  
  // Test de login
  const user = await testLogin();
  
  if (user) {
    // Test d'accès aux utilisateurs
    await testGetUsers();
  }
  
  console.log('\n=== FIN DES TESTS ===');
  rl.close();
}

// Exécuter les tests
runTests(); 