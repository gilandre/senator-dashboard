import { startScheduledSync } from './sync-data';

async function start() {
  try {
    console.log('Démarrage des services...');
    
    // Démarrer la synchronisation planifiée
    await startScheduledSync();
    
    console.log('Services démarrés avec succès');
  } catch (error) {
    console.error('Erreur lors du démarrage des services:', error);
    process.exit(1);
  }
}

start(); 