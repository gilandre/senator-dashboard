const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Vérifier les dates disponibles
  const dates = await prisma.$queryRaw`SELECT MIN(event_date) as min_date, MAX(event_date) as max_date FROM access_logs`;
  console.log('Plage de dates disponibles:', dates);
  
  // Vérifier le nombre total d'entrées
  const totalCount = await prisma.$queryRaw`SELECT COUNT(*) as count FROM access_logs`;
  console.log('Nombre total d\'entrées:', totalCount);
  
  // Vérifier les types de personnes disponibles
  const personTypes = await prisma.$queryRaw`SELECT DISTINCT person_type FROM access_logs`;
  console.log('Types de personnes disponibles:', personTypes);
  
  // Vérifier les types d'événements
  const eventTypes = await prisma.$queryRaw`SELECT DISTINCT event_type FROM access_logs`;
  console.log('Types d\'événements disponibles:', eventTypes);
  
  // Vérifier si le champ 'department' existe
  try {
    const departmentCheck = await prisma.$queryRaw`SELECT department FROM access_logs LIMIT 1`;
    console.log('Le champ department existe:', departmentCheck);
  } catch (e) {
    console.log('Le champ department n\'existe pas dans la table access_logs');
  }
  
  // Examiner la structure complète d'un enregistrement
  const sampleRecord = await prisma.$queryRaw`SELECT * FROM access_logs LIMIT 1`;
  console.log('Exemple d\'enregistrement:', sampleRecord);
}

main()
  .then(() => prisma.$disconnect())
  .catch(e => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
