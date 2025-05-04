// This script runs the database seeder to create initial admin user
const { execSync } = require('child_process');

console.log('Running database seeder...');

try {
  // Execute the seeder using ts-node
  execSync('npx ts-node src/lib/seed.ts', { stdio: 'inherit' });
  console.log('Database seeding completed successfully');
} catch (error) {
  console.error('Error running database seeder:', error);
  process.exit(1);
} 