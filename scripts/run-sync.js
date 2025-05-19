/**
 * Script de test pour la synchronisation des départements
 * 
 * Ce script teste le processus de synchronisation des départements
 * en exécutant directement le script batch-processor.js
 */

const { exec } = require('child_process');
const path = require('path');

// Chemin vers le script batch
const batchScript = path.join(__dirname, 'batch-processor.js');

console.log('=== TEST DE SYNCHRONISATION DES DÉPARTEMENTS ===');
console.log(`Exécution du script: ${batchScript}`);
console.log('----------------------------------------------');

// Exécuter le script batch
const process = exec(`node ${batchScript}`, (error, stdout, stderr) => {
  if (error) {
    console.error(`Erreur d'exécution: ${error.message}`);
    return;
  }
  
  if (stderr) {
    console.error(`Erreurs: ${stderr}`);
  }
});

// Rediriger la sortie du processus vers la console
process.stdout.on('data', (data) => {
  console.log(data.toString().trim());
});

process.stderr.on('data', (data) => {
  console.error(data.toString().trim());
});

process.on('close', (code) => {
  console.log('----------------------------------------------');
  if (code === 0) {
    console.log('✅ Test terminé avec succès!');
  } else {
    console.log(`❌ Test terminé avec un code d'erreur: ${code}`);
  }
}); 