/**
 * Script de test des API
 * 
 * Ce script permet de tester les API sans avoir besoin d'authentification
 * en utilisant un header spécial qui n'est disponible qu'en mode développement.
 */

const http = require('http');

// Configuration
const API_HOST = 'localhost';
const API_PORT = 3010;
const TEST_APIS = [
  '/api/statistics',
  '/api/departments/statistics',
  '/api/activities/recent?limit=5',
  '/api/csv-analysis',
  '/api/presence',
  '/api/readers/usage'
];

/**
 * Effectue une requête GET vers une API avec bypass d'authentification
 */
function testApi(endpoint) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: API_HOST,
      port: API_PORT,
      path: endpoint,
      method: 'GET',
      headers: {
        'x-test-bypass-auth': 'admin' // Header spécial pour contourner l'authentification
      }
    };

    console.log(`\n=== Test de l'API: ${endpoint} ===`);
    
    const req = http.request(options, (res) => {
      console.log(`Status: ${res.statusCode} ${res.statusMessage}`);
      
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          // Essayer de parser la réponse comme du JSON
          const jsonData = JSON.parse(data);
          console.log('Réponse reçue:');
          console.log(JSON.stringify(jsonData, null, 2).slice(0, 1000) + (JSON.stringify(jsonData).length > 1000 ? '...' : ''));
          resolve(jsonData);
        } catch (e) {
          console.log('Réponse non-JSON reçue:', data.slice(0, 200) + (data.length > 200 ? '...' : ''));
          resolve(data);
        }
      });
    });
    
    req.on('error', (error) => {
      console.error(`Erreur lors de la requête: ${error.message}`);
      reject(error);
    });
    
    req.end();
  });
}

/**
 * Fonction principale
 */
async function main() {
  console.log('=== TEST DES API ===');
  console.log('Note: Ces tests utilisent un header spécial pour contourner l\'authentification.');
  console.log('Ce header ne fonctionne qu\'en mode développement.\n');
  
  try {
    for (const api of TEST_APIS) {
      try {
        await testApi(api);
      } catch (error) {
        console.error(`Erreur lors du test de ${api}:`, error.message);
      }
    }
    
    console.log('\nTests des API terminés!');
  } catch (error) {
    console.error('Erreur non gérée:', error);
  }
}

// Exécuter le script
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Erreur fatale:', error);
    process.exit(1);
  }); 