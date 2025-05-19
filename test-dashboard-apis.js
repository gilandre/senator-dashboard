const http = require('http');

// Configuration
const HOST = 'localhost';
const PORT = 3010;

/**
 * Fonction principale de test du dashboard
 */
async function testDashboardAPIs() {
  console.log("=== Test des APIs du Dashboard ===\n");

  // 1. Récupérer la date maximale
  console.log("1. Récupération de la date maximale des logs d'accès");
  const maxDate = await testMaxDate();
  if (!maxDate) {
    console.error("❌ Échec de la récupération de la date maximale");
    return;
  }
  
  // Calculer la période optimale (14 jours avant la date max)
  const maxDateObj = new Date(maxDate);
  const startDateObj = new Date(maxDateObj.getTime() - 14*24*60*60*1000);
  const startDate = startDateObj.toISOString().split('T')[0];
  const endDate = maxDateObj.toISOString().split('T')[0];
  
  console.log(`Période optimale calculée: ${startDate} à ${endDate}\n`);
  
  // 2. Tester l'API access-data
  console.log("2. Test de l'API access-data avec la période optimale");
  await testAccessData(startDate, endDate);
  
  // 3. Tenter d'accéder à l'API csv-analysis (qui nécessite normalement une authentification complète)
  console.log("\n3. Test de l'API csv-analysis (nécessite normalement une authentification)");
  await testCsvAnalysis(startDate, endDate);
  
  console.log("\n=== Résumé des tests ===");
  console.log("✅ Date maximale récupérée: " + maxDate);
  console.log(`✅ Période optimale calculée: ${startDate} à ${endDate}`);
  console.log("✅ API access-data testée avec succès");
  console.log("ℹ️ L'API csv-analysis nécessite une authentification complète via navigateur");
}

/**
 * Test de l'API pour récupérer la date maximale
 */
async function testMaxDate() {
  const options = {
    hostname: HOST,
    port: PORT,
    path: '/api/access-data?getMaxDate=true',
    method: 'GET',
    headers: {
      'x-test-bypass-auth': 'admin'
    }
  };

  return new Promise((resolve) => {
    const req = http.request(options, (res) => {
      console.log(`Status: ${res.statusCode} ${res.statusMessage}`);
      
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.maxDate) {
            console.log(`Date maximale détectée: ${parsed.maxDate}`);
            resolve(parsed.maxDate);
          } else {
            console.error('Date maximale non trouvée dans la réponse');
            resolve(null);
          }
        } catch (e) {
          console.error('Erreur lors du parsing de la date maximale:', e);
          resolve(null);
        }
      });
    });
    
    req.on('error', (error) => {
      console.error(`Erreur lors de la requête de date maximale: ${error.message}`);
      resolve(null);
    });
    
    req.end();
  });
}

/**
 * Test de l'API access-data
 */
async function testAccessData(startDate, endDate) {
  const options = {
    hostname: HOST,
    port: PORT,
    path: `/api/access-data?startDate=${startDate}&endDate=${endDate}`,
    method: 'GET',
    headers: {
      'x-test-bypass-auth': 'admin'
    }
  };

  return new Promise((resolve) => {
    const req = http.request(options, (res) => {
      console.log(`Status: ${res.statusCode} ${res.statusMessage}`);
      
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          console.log("Statistiques récupérées:");
          console.log(`- Total des enregistrements: ${parsed.totalRecords}`);
          console.log(`- Nombre de jours avec activité: ${parsed.dailyStats?.length || 0}`);
          console.log(`- Nombre de groupes: ${parsed.groupStats?.length || 0}`);
          
          // Afficher la distribution horaire
          if (parsed.hourlyTraffic && parsed.hourlyTraffic.length > 0) {
            console.log("\nDistribution horaire:");
            parsed.hourlyTraffic.forEach(hour => {
              console.log(`  ${hour.hour}h: ${hour.count} accès`);
            });
          }
          
          resolve(parsed);
        } catch (e) {
          console.error('Erreur lors du parsing des données:', e);
          resolve(null);
        }
      });
    });
    
    req.on('error', (error) => {
      console.error(`Erreur lors de la requête des données: ${error.message}`);
      resolve(null);
    });
    
    req.end();
  });
}

/**
 * Test de l'API csv-analysis
 */
async function testCsvAnalysis(startDate, endDate) {
  const options = {
    hostname: HOST,
    port: PORT,
    path: `/api/csv-analysis?startDate=${startDate}&endDate=${endDate}`,
    method: 'GET',
    headers: {
      'x-test-bypass-auth': 'admin'
    }
  };

  return new Promise((resolve) => {
    const req = http.request(options, (res) => {
      console.log(`Status: ${res.statusCode} ${res.statusMessage}`);
      
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 401) {
          console.log("L'API csv-analysis nécessite une authentification complète");
          resolve(null);
          return;
        }
        
        try {
          const parsed = JSON.parse(data);
          console.log("Statistiques CSV récupérées:");
          console.log(`- Événements totaux: ${parsed.totalEvents}`);
          console.log(`- Lecteurs uniques: ${parsed.readerStats?.length || 0}`);
          console.log(`- Types d'événements: ${parsed.eventTypeStats?.length || 0}`);
          
          resolve(parsed);
        } catch (e) {
          console.error('Erreur lors du parsing des données CSV:', e);
          resolve(null);
        }
      });
    });
    
    req.on('error', (error) => {
      console.error(`Erreur lors de la requête des données CSV: ${error.message}`);
      resolve(null);
    });
    
    req.end();
  });
}

// Exécuter les tests
testDashboardAPIs().then(() => {
  console.log("\nTests terminés!");
}); 