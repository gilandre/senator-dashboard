/**
 * Script pour analyser les group_name dans access_logs et identifier
 * les groupes d'employés vs visiteurs
 */
require('dotenv').config();

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || "mysql://root:password@localhost:3306/senator_db"
    },
  },
});

async function analyzeGroups() {
  try {
    console.log('Analyse des groupes (group_name) dans access_logs...');
    
    // 1. Récupérer toutes les valeurs uniques de group_name et leur nombre d'occurrences
    const allGroups = await prisma.$queryRaw`
      SELECT group_name, COUNT(*) as count 
      FROM access_logs 
      WHERE group_name IS NOT NULL 
      GROUP BY group_name 
      ORDER BY count DESC
    `;
    
    console.log('\nToutes les valeurs de group_name et leurs occurrences :');
    console.table(allGroups);
    
    // 2. Analyser les groupes associés aux employés (person_type = 'employee')
    const employeeGroups = await prisma.$queryRaw`
      SELECT group_name, COUNT(*) as count 
      FROM access_logs 
      WHERE person_type = 'employee' AND group_name IS NOT NULL 
      GROUP BY group_name 
      ORDER BY count DESC
    `;
    
    console.log('\nGroupes associés aux employés :');
    console.table(employeeGroups);
    
    // 3. Analyser les groupes associés aux visiteurs (person_type = 'visitor' ou group_name contient 'visiteur')
    const visitorGroups = await prisma.$queryRaw`
      SELECT group_name, COUNT(*) as count 
      FROM access_logs 
      WHERE (person_type = 'visitor' OR group_name LIKE '%visiteur%' OR group_name LIKE '%Visiteur%') 
            AND group_name IS NOT NULL 
      GROUP BY group_name 
      ORDER BY count DESC
    `;
    
    console.log('\nGroupes associés aux visiteurs :');
    console.table(visitorGroups);
    
    // 4. Identifier les personnes dans les groupes contenant "Visiteur"
    const visitorsBadges = await prisma.$queryRaw`
      SELECT badge_number, full_name, group_name, COUNT(*) as access_count
      FROM access_logs 
      WHERE group_name LIKE '%visiteur%' OR group_name LIKE '%Visiteur%'
      GROUP BY badge_number, full_name, group_name
      ORDER BY access_count DESC
      LIMIT 20
    `;
    
    console.log('\nExemples de badges identifiés comme visiteurs :');
    console.table(visitorsBadges);
    
    // 5. Vérifier les badges qui ont été utilisés à la fois comme employé ET comme visiteur
    const mixedBadges = await prisma.$queryRaw`
      SELECT al.badge_number, al.full_name, 
             COUNT(DISTINCT CASE WHEN al.person_type = 'employee' OR (al.group_name NOT LIKE '%visiteur%' AND al.group_name NOT LIKE '%Visiteur%') THEN al.id END) as employee_count,
             COUNT(DISTINCT CASE WHEN al.person_type = 'visitor' OR al.group_name LIKE '%visiteur%' OR al.group_name LIKE '%Visiteur%' THEN al.id END) as visitor_count
      FROM access_logs al
      GROUP BY al.badge_number, al.full_name
      HAVING employee_count > 0 AND visitor_count > 0
      ORDER BY employee_count + visitor_count DESC
      LIMIT 20
    `;
    
    console.log('\nBadges utilisés à la fois comme employé ET visiteur :');
    console.table(mixedBadges);
    
  } catch (error) {
    console.error('Erreur lors de l\'analyse des groupes :', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Exécuter la fonction
analyzeGroups()
  .then(() => {
    console.log('\nAnalyse terminée.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Erreur lors de l\'exécution du script :', error);
    process.exit(1);
  }); 