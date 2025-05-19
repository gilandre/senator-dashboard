const http = require('http');

// Configuration
const HOST = 'localhost';
const PORT = 3010;
const AUTH_HEADER = 'x-test-bypass-auth';
const AUTH_VALUE = 'admin';

// Fonction pour effectuer des requêtes HTTP
function makeRequest(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: HOST,
      port: PORT,
      path,
      method,
      headers: {
        [AUTH_HEADER]: AUTH_VALUE
      }
    };

    if (data) {
      options.headers['Content-Type'] = 'application/json';
      options.headers['Content-Length'] = Buffer.byteLength(JSON.stringify(data));
    }

    const req = http.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        try {
          const parsedData = responseData ? JSON.parse(responseData) : {};
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: parsedData
          });
        } catch (error) {
          reject(new Error(`Erreur lors du parsing de la réponse: ${error.message}, données: ${responseData}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

// Fonction principale pour tester les APIs
async function testReportsAPI() {
  console.log('🔍 Test de l\'API des rapports');
  console.log('============================');

  try {
    // 1. Tester l'API principale des rapports
    console.log('\n1. GET /api/reports - Liste des rapports');
    const reportsResult = await makeRequest('/api/reports');
    console.log(`   Status: ${reportsResult.statusCode}`);
    console.log(`   Nombre de rapports: ${reportsResult.data.length}`);
    
    // 2. Tester l'API des statistiques
    console.log('\n2. GET /api/reports?action=stats - Statistiques des rapports');
    const statsResult = await makeRequest('/api/reports?action=stats');
    console.log(`   Status: ${statsResult.statusCode}`);
    console.log(`   Total des rapports: ${statsResult.data.totalReports}`);
    console.log(`   Catégories: ${statsResult.data.reportCategories.length}`);
    
    // 3. Tester l'API de l'historique
    console.log('\n3. GET /api/reports/history - Historique des rapports');
    const historyResult = await makeRequest('/api/reports/history');
    console.log(`   Status: ${historyResult.statusCode}`);
    console.log(`   Total des entrées: ${historyResult.data.pagination.totalItems}`);
    
    // 4. Tester l'API des rapports programmés
    console.log('\n4. GET /api/reports/scheduled - Rapports programmés');
    const scheduledResult = await makeRequest('/api/reports/scheduled');
    console.log(`   Status: ${scheduledResult.statusCode}`);
    console.log(`   Nombre de rapports programmés: ${scheduledResult.data.length}`);
    
    // 5. Tester l'API des modèles de rapports
    console.log('\n5. GET /api/reports/templates - Modèles de rapports');
    const templatesResult = await makeRequest('/api/reports/templates');
    console.log(`   Status: ${templatesResult.statusCode}`);
    console.log(`   Nombre de modèles: ${templatesResult.data.length}`);
    
    // 6. Tester la génération d'un rapport (création)
    console.log('\n6. POST /api/reports/generate - Génération d\'un rapport');
    const generateData = {
      reportType: 'daily-access',
      parameters: {
        date: '2025-05-14'
      },
      format: 'pdf',
      title: 'Test de génération de rapport'
    };
    const generateResult = await makeRequest('/api/reports/generate', 'POST', generateData);
    console.log(`   Status: ${generateResult.statusCode}`);
    console.log(`   ID du rapport: ${generateResult.data.reportId}`);
    console.log(`   Message: ${generateResult.data.message}`);
    
    // 7. Vérifier le statut du rapport généré
    if (generateResult.data.reportId) {
      console.log('\n7. GET /api/reports/generate?id=... - Statut du rapport généré');
      const statusResult = await makeRequest(`/api/reports/generate?id=${generateResult.data.reportId}`);
      console.log(`   Status: ${statusResult.statusCode}`);
      console.log(`   État du rapport: ${statusResult.data.status}`);
    }
    
    console.log('\n✅ Tests terminés avec succès');
  } catch (error) {
    console.error('\n❌ Erreur lors des tests:', error);
  }
}

// Exécuter les tests
testReportsAPI(); 