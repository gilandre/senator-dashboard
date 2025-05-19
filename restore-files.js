const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// List of files with ESLint errors
const filesToRestore = [
  './src/app/access/page.tsx',
  './src/app/access-history/page.tsx',
  './src/app/anomalies/page.tsx',
  './src/app/employees/page.tsx',
  './src/app/export/page.tsx',
  './src/app/import/page.tsx',
  './src/app/settings/page.tsx',
  './src/app/settings/profiles/page.tsx',
  './src/app/settings/security/page.tsx',
  './src/app/visitors/page.tsx'
];

// Restore all files using git checkout
try {
  filesToRestore.forEach(file => {
    console.log(`Restoring ${file}...`);
    execSync(`git checkout -- ${file}`);
    console.log(`Restored ${file}`);
  });

  console.log('All files restored to their original state.');
} catch (error) {
  console.error('Error restoring files:', error.message);
} 