import cron from 'node-cron';
import axios from 'axios';

const BACKUP_ENDPOINTS = [
  '/api/backup/reports/scheduled',
  '/api/backup/config/attendance',
  '/api/backup/user-activities'
];

async function triggerBackup(endpoint: string) {
  try {
    const response = await axios.post(`http://localhost:3000${endpoint}`);
    console.log(`Backup successful for ${endpoint}:`, response.status);
  } catch (error) {
    console.error(`Backup failed for ${endpoint}:`, error.response?.status || error.message);
  }
}

function setupBackupCron() {
  // Schedule daily at 2 AM
  cron.schedule('0 2 * * *', async () => {
    console.log('Starting scheduled database backups...');
    
    for (const endpoint of BACKUP_ENDPOINTS) {
      await triggerBackup(endpoint);
    }

    console.log('Completed all backup operations');
  }, {
    scheduled: true,
    timezone: 'Europe/Paris'
  });

  console.log('Backup cron jobs initialized');
}

setupBackupCron();