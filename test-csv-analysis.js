/**
 * Script de test pour l'API csv-analysis
 * Ce script demande des données pour la période du 01/02/2025 au 31/03/2025
 */

const http = require('http');
const fs = require('fs');

// Configuration
const HOST = 'localhost';
const PORT = 3010;
const START_DATE = '2025-03-01';
const END_DATE = '2025-03-14';

/**
 * Test de l'API csv-analysis avec la plage de dates spécifiée
 */
async function testCsvAnalysis() {
  console.log(`\n=== Test de l'API: /api/csv-analysis avec dates: ${START_DATE} à ${END_DATE} ===`);
  
  // Obtenir d'abord la date maximale
  console.log("1. Récupération de la date maximale des logs d'accès...");
  await testMaxDate();
  
  // Tenter d'appeler l'API csv-analysis avec authentification
  console.log("\n2. Test de l'API csv-analysis avec la période basée sur la date maximale");
  
  const options = {
    hostname: HOST,
    port: PORT,
    path: `/api/csv-analysis?startDate=${START_DATE}&endDate=${END_DATE}`,
    method: 'GET',
    headers: {
      'x-test-bypass-auth': 'admin'
    }
  };

  return new Promise((resolve) => {
    const req = http.request(options, (res) => {
      console.log(`\nStatus de l'API csv-analysis: ${res.statusCode} ${res.statusMessage}`);
      
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log("Réponse reçue:");
        try {
          const parsed = JSON.parse(data);
          console.log(JSON.stringify(parsed, null, 2));
          
          if (parsed.totalEvents !== undefined) {
            console.log("\nRésumé des statistiques:");
            console.log(`- Événements totaux: ${parsed.totalEvents}`);
            console.log(`- Lecteurs uniques: ${parsed.readerStats?.length || 0}`);
            console.log(`- Types d'événements: ${parsed.eventTypeStats?.length || 0}`);
            console.log(`- Groupes: ${parsed.groupStats?.length || 0}`);
          }
        } catch (e) {
          console.log(data);
        }
        resolve();
      });
    });
    
    req.on('error', (error) => {
      console.error(`Erreur lors de la requête: ${error.message}`);
      resolve();
    });
    
    req.end();
  });
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
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          console.log(`Date maximale détectée: ${parsed.maxDate}`);
          console.log(`Période optimale: ${new Date(new Date(parsed.maxDate).getTime() - 14*24*60*60*1000).toISOString().split('T')[0]} à ${new Date(parsed.maxDate).toISOString().split('T')[0]}`);
          resolve(parsed.maxDate);
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

// Exécuter le test
(async () => {
  await testCsvAnalysis();
  console.log("\nTest terminé!");
})(); 