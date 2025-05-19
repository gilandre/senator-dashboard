// Script pour tester la génération de rapports
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

// Attendre un certain temps
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Fonction principale pour tester la génération de rapports
async function testReportsGeneration() {
  console.log('🧪 Test de la génération de rapports');
  console.log('==================================');

  try {
    // 1. Récupérer la liste des rapports disponibles
    console.log('\n1. Récupération de la liste des rapports disponibles');
    const reportsResult = await makeRequest('/api/reports');
    
    if (reportsResult.statusCode !== 200 || !reportsResult.data.length) {
      console.error('❌ Impossible de récupérer la liste des rapports ou liste vide');
      return;
    }
    
    console.log(`   ✅ ${reportsResult.data.length} rapports disponibles`);
    
    // 2. Sélectionner un rapport aléatoire pour le test
    const randomIndex = Math.floor(Math.random() * reportsResult.data.length);
    const testReport = reportsResult.data[randomIndex];
    
    console.log(`\n2. Rapport sélectionné pour le test: ${testReport.title} (${testReport.report_type})`);
    
    // 3. Générer les paramètres en fonction du type de rapport
    let parameters = {};
    const now = new Date();
    
    switch (testReport.report_type) {
      case 'daily-access':
        parameters = {
          date: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
            .toISOString().split('T')[0]
        };
        break;
        
      case 'weekly-access':
        parameters = {
          startDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7)
            .toISOString().split('T')[0],
          endDate: new Date(now.getFullYear(), now.getMonth(), now.getDate())
            .toISOString().split('T')[0]
        };
        break;
        
      case 'monthly-traffic':
        parameters = {
          year: now.getFullYear(),
          month: now.getMonth() + 1
        };
        break;
        
      case 'department-presence':
        parameters = {
          departments: ['IT', 'RH', 'Finance', 'Marketing'],
          date: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
            .toISOString().split('T')[0]
        };
        break;
        
      default:
        parameters = {
          startDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30)
            .toISOString().split('T')[0],
          endDate: new Date(now.getFullYear(), now.getMonth(), now.getDate())
            .toISOString().split('T')[0]
        };
    }
    
    // 4. Générer le rapport au format PDF
    const generateData = {
      reportType: testReport.report_type,
      parameters,
      format: 'pdf',
      title: `Test automatique - ${testReport.title} - ${new Date().toLocaleString('fr-FR')}`
    };
    
    console.log('\n3. Lancement de la génération du rapport');
    console.log(`   Type de rapport: ${testReport.report_type}`);
    console.log(`   Paramètres: ${JSON.stringify(parameters)}`);
    
    const generateResult = await makeRequest('/api/reports/generate', 'POST', generateData);
    
    if (generateResult.statusCode !== 200 || !generateResult.data.reportId) {
      console.error(`❌ Erreur lors de la génération du rapport: ${JSON.stringify(generateResult.data)}`);
      return;
    }
    
    console.log(`   ✅ Rapport en cours de génération - ID: ${generateResult.data.reportId}`);
    
    // 5. Surveiller l'état du rapport jusqu'à ce qu'il soit terminé ou en erreur
    const reportId = generateResult.data.reportId;
    console.log('\n4. Surveillance de l\'état du rapport');
    
    let isCompleted = false;
    let maxAttempts = 10;
    let attempt = 0;
    
    while (!isCompleted && attempt < maxAttempts) {
      attempt++;
      await sleep(2000); // Attendre 2 secondes entre chaque vérification
      
      const statusResult = await makeRequest(`/api/reports/generate?id=${reportId}`);
      
      if (statusResult.statusCode !== 200) {
        console.error(`❌ Erreur lors de la récupération du statut: ${JSON.stringify(statusResult.data)}`);
        return;
      }
      
      const status = statusResult.data.status;
      console.log(`   Tentative ${attempt}/${maxAttempts} - Statut: ${status}`);
      
      if (status === 'completed' || status === 'failed') {
        isCompleted = true;
        
        if (status === 'completed') {
          console.log(`   ✅ Rapport généré avec succès!`);
          console.log(`   📊 Informations:`);
          console.log(`   - Nom du fichier: ${statusResult.data.fileName}`);
          console.log(`   - Taille: ${statusResult.data.fileSize} octets`);
          console.log(`   - URL: ${statusResult.data.fileUrl}`);
        } else {
          console.error(`   ❌ Échec de la génération du rapport: ${statusResult.data.error}`);
        }
      }
    }
    
    if (!isCompleted) {
      console.log(`   ⚠️ La génération du rapport prend plus de temps que prévu ou est bloquée.`);
    }
    
    // 6. Vérifier l'historique des rapports
    console.log('\n5. Vérification de l\'historique des rapports');
    const historyResult = await makeRequest('/api/reports/history');
    
    if (historyResult.statusCode !== 200) {
      console.error(`❌ Erreur lors de la récupération de l'historique: ${JSON.stringify(historyResult.data)}`);
      return;
    }
    
    const recentReports = historyResult.data.items || [];
    console.log(`   ✅ Nombre de rapports dans l'historique: ${recentReports.length}`);
    
    const foundInHistory = recentReports.some(item => item.id.toString() === reportId);
    if (foundInHistory) {
      console.log(`   ✅ Le rapport généré est présent dans l'historique.`);
    } else {
      console.log(`   ⚠️ Le rapport généré n'a pas été trouvé dans l'historique.`);
    }
    
    console.log('\n🎉 Test de génération de rapport terminé!');
    
  } catch (error) {
    console.error('\n❌ Erreur lors du test de génération de rapport:', error);
  }
}

// Exécuter le test
testReportsGeneration(); 