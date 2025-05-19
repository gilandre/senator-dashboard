import cron from 'node-cron';
import syncEmployees from './sync-employees';

// Exécuter la synchronisation toutes les heures
cron.schedule('0 * * * *', async () => {
  console.log('Running scheduled employee synchronization...');
  try {
    await syncEmployees();
    console.log('Scheduled synchronization completed successfully');
  } catch (error) {
    console.error('Error during scheduled synchronization:', error);
  }
});

// Exécuter la synchronisation au démarrage
console.log('Starting initial employee synchronization...');
syncEmployees()
  .then(() => console.log('Initial synchronization completed successfully'))
  .catch(error => console.error('Error during initial synchronization:', error)); 