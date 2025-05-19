/**
 * Script pour vérifier les valeurs de group_name dans les logs d'accès
 */

// Charger les variables d'environnement
require('dotenv').config();

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAccessLogs() {
  try {
    console.log('Vérification des logs d\'accès...');
    
    // 1. Récupérer les différentes valeurs de group_name et leur nombre
    const groupNames = await prisma.$queryRaw`
      SELECT group_name, COUNT(*) as count 
      FROM access_logs 
      WHERE group_name IS NOT NULL 
      GROUP BY group_name 
      ORDER BY count DESC
    `;
    
    console.log('Valeurs de group_name et leurs occurrences :');
    console.table(groupNames);
    
    // 2. Vérifier les logs pour les visiteurs (contenant "Visiteur")
    const visitorLogs = await prisma.access_logs.findMany({
      where: {
        group_name: {
          contains: 'Visiteur'
        }
      },
      distinct: ['badge_number'],
      select: {
        badge_number: true,
        full_name: true,
        group_name: true
      },
      take: 10 // Limiter à 10 résultats pour ne pas surcharger la console
    });
    
    console.log('\nExemples de logs de visiteurs :');
    console.table(visitorLogs);
    
    // 3. Vérifier si des visiteurs existent déjà dans la table visitors
    const visitors = await prisma.visitors.findMany({
      take: 10,
      orderBy: {
        updated_at: 'desc'
      }
    });
    
    console.log('\nVisiteurs existants dans la table visitors :');
    console.table(visitors.map(v => ({
      id: v.id,
      badge_number: v.badge_number,
      name: `${v.first_name} ${v.last_name}`,
      status: v.status,
      last_seen: v.last_seen
    })));
    
  } catch (error) {
    console.error('Erreur lors de la vérification des logs :', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Exécuter la fonction
checkAccessLogs()
  .then(() => {
    console.log('Vérification terminée.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Erreur lors de l\'exécution du script :', error);
    process.exit(1);
  }); 