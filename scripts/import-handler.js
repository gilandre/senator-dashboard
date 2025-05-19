/**
 * Gestionnaire d'importation
 * 
 * Ce script peut être exécuté après l'importation de données d'accès
 * pour synchroniser automatiquement les tables de référence.
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Configuration
const CONFIG = {
  batchScript: path.join(__dirname, 'batch-processor.js'),
  logDirectory: path.join(__dirname, '../logs'),
  runSync: true, // Exécuter de façon synchrone (attendre la fin)
};

// S'assurer que le répertoire de logs existe
if (!fs.existsSync(CONFIG.logDirectory)) {
  fs.mkdirSync(CONFIG.logDirectory, { recursive: true });
}

/**
 * Fonction pour écrire dans un fichier de log
 */
function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  
  console.log(logMessage.trim());
  
  // Écrire dans le journal d'importation
  const logFile = path.join(CONFIG.logDirectory, `import-${new Date().toISOString().slice(0, 10)}.log`);
  fs.appendFileSync(logFile, logMessage);
}

/**
 * Exécute le script de traitement batch après l'importation
 */
function runBatchAfterImport() {
  log('Démarrage du processus de synchronisation après importation...');
  
  // Exécuter le script de batch
  const batchProcess = spawn('node', [CONFIG.batchScript], {
    stdio: 'pipe',
  });
  
  batchProcess.stdout.on('data', (data) => {
    process.stdout.write(data.toString());
  });
  
  batchProcess.stderr.on('data', (data) => {
    process.stderr.write(data.toString());
  });
  
  batchProcess.on('close', (code) => {
    if (code === 0) {
      log('Synchronisation terminée avec succès.');
    } else {
      log(`⚠️ La synchronisation s'est terminée avec le code ${code}`);
    }
    
    if (!CONFIG.runSync) {
      process.exit(code);
    }
  });
  
  // Si nous exécutons de façon synchrone, attendre la fin du processus
  if (CONFIG.runSync) {
    return new Promise((resolve, reject) => {
      batchProcess.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Le processus s'est terminé avec le code ${code}`));
        }
      });
    });
  }
}

/**
 * Fonction principale
 */
async function main() {
  log("Gestionnaire d'importation démarré");
  
  try {
    // Marquer les logs d'accès nouvellement importés
    log("Marquage des nouveaux logs d'accès...");
    // Cette partie dépend de votre logique d'importation
    // À implémenter selon votre processus
    
    // Exécuter la synchronisation
    log("Démarrage de la synchronisation des tables de référence...");
    await runBatchAfterImport();
    
    log("Traitement après importation terminé avec succès.");
    process.exit(0);
    
  } catch (error) {
    log(`Erreur lors du traitement après importation: ${error.message}`);
    process.exit(1);
  }
}

// Exécuter le script
main(); 