const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
require('dotenv').config();

const BACKUP_DIR = path.join(__dirname, '../backups/daily');
const DB_URL = process.env.DATABASE_URL;

async function runBackup() {
  try {
    // Create backup directory if not exists
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }

    // Extract database credentials
    const dbParams = new URL(DB_URL);
    const backupFile = path.join(BACKUP_DIR, `backup-${Date.now()}.sql`);
    
    // Run mysqldump
    await exec(`mysqldump --single-transaction -h ${dbParams.hostname} -u ${dbParams.username} -p${dbParams.password} ${dbParams.pathname.slice(1)} > ${backupFile}`, 
      (error, stdout, stderr) => {
        if (error) throw error;
        
        // Compress backup
        const gzip = zlib.createGzip();
        const input = fs.createReadStream(backupFile);
        const output = fs.createWriteStream(`${backupFile}.gz`);
        
        input.pipe(gzip).pipe(output).on('finish', () => {
          // Delete uncompressed file
          fs.unlinkSync(backupFile);
          console.log(`Backup created: ${backupFile}.gz`);
          
          // Clean old backups (keep 7 days)
          const files = fs.readdirSync(BACKUP_DIR)
            .filter(f => f.endsWith('.gz'))
            .sort()
            .reverse();
          
          if (files.length > 7) {
            files.slice(7).forEach(f => {
              fs.unlinkSync(path.join(BACKUP_DIR, f));
              console.log(`Deleted old backup: ${f}`);
            });
          }
        });
      });
  } catch (err) {
    console.error('Backup failed:', err);
    process.exit(1);
  }
}

runBackup();