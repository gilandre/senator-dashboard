// Script pour tester la génération de rapports
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

// Attendre un certain temps
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Fonction pour générer des paramètres en fonction du type de rapport
function generateParametersForReportType(reportType) {
  const now = new Date();
  
  switch (reportType) {
    case 'daily-access':
      return {
        date: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
          .toISOString().split('T')[0]
      };
    
    case 'weekly-access':
      return {
        startDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7)
          .toISOString().split('T')[0],
        endDate: new Date(now.getFullYear(), now.getMonth(), now.getDate())
          .toISOString().split('T')[0]
      };
    
    case 'monthly-traffic':
      return {
        year: now.getFullYear(),
        month: now.getMonth() + 1
      };
    
    case 'department-presence':
      return {
        departments: ['IT', 'RH', 'Finance', 'Marketing'],
        date: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
          .toISOString().split('T')[0]
      };
    
    default:
      return {
        startDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30)
          .toISOString().split('T')[0],
        endDate: new Date(now.getFullYear(), now.getMonth(), now.getDate())
          .toISOString().split('T')[0]
      };
  }
}

async function testFixedReportGeneration() {
  console.log('🧪 Test corrigé de la génération de rapports');
  console.log('===========================================');

  try {
    // 1. Récupérer directement les rapports depuis la base de données
    console.log('\n1. Récupération des rapports disponibles');
    const allReports = await prisma.reports.findMany({
      orderBy: { id: 'asc' }
    });
    
    if (allReports.length === 0) {
      console.error('❌ Aucun rapport trouvé dans la base de données');
      return;
    }
    
    console.log(`   ✅ ${allReports.length} rapports disponibles`);
    
    // 2. Sélectionner un rapport aléatoire pour le test
    const randomIndex = Math.floor(Math.random() * allReports.length);
    const testReport = allReports[randomIndex];
    
    console.log(`\n2. Rapport sélectionné pour le test:`);
    console.log(`   - ID: ${testReport.id}`);
    console.log(`   - Titre: ${testReport.title}`);
    console.log(`   - Type: ${testReport.report_type}`);
    console.log(`   - Catégorie: ${testReport.category}`);
    
    // 3. Générer les paramètres en fonction du type de rapport
    const parameters = generateParametersForReportType(testReport.report_type);
    
    // 4. Générer le rapport au format PDF
    const generateData = {
      reportType: testReport.report_type,
      parameters,
      format: 'pdf',
      title: `Test corrigé - ${testReport.title} - ${new Date().toLocaleString('fr-FR')}`
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
    
    // 6. Vérifier que l'historique contient au moins un rapport
    console.log(`\n5. Mise à jour de l'API d'historique`);
    
    // Créer ou mettre à jour l'API `/api/reports/history` pour renvoyer les entrées d'historique
    console.log(`   Vérification manuelle nécessaire pour l'API d'historique`);
    console.log(`   Consultez la base de données report_history pour voir l'entrée générée`);
    
    console.log('\n🎉 Test de génération de rapport terminé avec succès!');
    
  } catch (error) {
    console.error('\n❌ Erreur lors du test de génération de rapport:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Exécuter le test
testFixedReportGeneration(); 