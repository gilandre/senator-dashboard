// Script pour déboguer l'API des rapports
const http = require('http');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

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

async function debugReportsAPI() {
  console.log('🔍 Débogage de l\'API des rapports');
  console.log('================================');

  try {
    // 0. Récupérer directement les données complètes depuis la base de données
    console.log('\n0. Récupération des rapports depuis la base de données');
    const dbReports = await prisma.reports.findMany({
      orderBy: { id: 'asc' }
    });
    
    console.log(`   Nombre de rapports en base: ${dbReports.length}`);
    console.log('   Rapport #1 depuis la base de données:');
    if (dbReports.length > 0) {
      console.log(`   ID: ${dbReports[0].id}, Titre: ${dbReports[0].title}, Type: ${dbReports[0].report_type}`);
    }
    
    // 1. Récupérer la liste des rapports via l'API
    console.log('\n1. GET /api/reports - Liste des rapports');
    const reportsResult = await makeRequest('/api/reports');
    
    console.log(`   Status: ${reportsResult.statusCode}`);
    console.log(`   Nombre de rapports: ${reportsResult.data.length}`);
    
    // 2. Sélectionner le premier rapport et obtenir son type depuis la base de données
    if (reportsResult.data.length > 0) {
      const apiReport = reportsResult.data[0];
      console.log(`\n2. Rapport sélectionné: ${apiReport.title} (ID: ${apiReport.id})`);
      
      // Récupérer les détails complets du rapport depuis la base de données
      const dbReport = await prisma.reports.findUnique({
        where: { id: parseInt(apiReport.id) }
      });
      
      if (!dbReport) {
        console.error(`   ❌ Rapport avec ID ${apiReport.id} non trouvé dans la base de données!`);
        return;
      }
      
      console.log(`   Détails du rapport depuis la DB:`);
      console.log(`   - ID: ${dbReport.id}`);
      console.log(`   - Titre: ${dbReport.title}`);
      console.log(`   - Type: ${dbReport.report_type}`);
      console.log(`   - Catégorie: ${dbReport.category}`);
      
      // 3. Essayer de générer un rapport avec les détails complets
      console.log(`\n3. POST /api/reports/generate - Génération d'un rapport`);
      
      const now = new Date();
      const parameters = {
        date: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
          .toISOString().split('T')[0]
      };
      
      const generateData = {
        reportType: dbReport.report_type,
        parameters,
        format: 'pdf',
        title: `Debug - ${dbReport.title} - ${new Date().toLocaleString('fr-FR')}`
      };
      
      console.log('   Données envoyées:');
      console.log(JSON.stringify(generateData, null, 2));
      
      const generateResult = await makeRequest('/api/reports/generate', 'POST', generateData);
      
      console.log(`   Status: ${generateResult.statusCode}`);
      console.log('   Réponse:');
      console.log(JSON.stringify(generateResult.data, null, 2));
      
      if (generateResult.statusCode === 200 && generateResult.data.reportId) {
        console.log(`\n4. Surveillance de l'état du rapport...`);
        
        const reportId = generateResult.data.reportId;
        
        // Attendre 5 secondes
        console.log('   Attente de 5 secondes...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Vérifier l'état du rapport
        const statusResult = await makeRequest(`/api/reports/generate?id=${reportId}`);
        
        console.log(`   Status: ${statusResult.statusCode}`);
        console.log('   Réponse:');
        console.log(JSON.stringify(statusResult.data, null, 2));
      }
    }
    
    // 5. Vérifier l'API des statistiques
    console.log('\n5. GET /api/reports?action=stats - Statistiques');
    const statsResult = await makeRequest('/api/reports?action=stats');
    
    console.log(`   Status: ${statsResult.statusCode}`);
    console.log(`   Total des rapports: ${statsResult.data.totalReports}`);
    console.log(`   Nombre de rapports récents: ${statsResult.data.recentReports.length}`);
    
    // 6. Vérifier l'API de l'historique
    console.log('\n6. GET /api/reports/history - Historique');
    const historyResult = await makeRequest('/api/reports/history');
    
    console.log(`   Status: ${historyResult.statusCode}`);
    console.log(`   Nombre d'entrées d'historique: ${historyResult.data.pagination.totalItems}`);
    
  } catch (error) {
    console.error('\n❌ Erreur lors du débogage:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Exécuter le débogage
debugReportsAPI();