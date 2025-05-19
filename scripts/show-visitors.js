// Script pour afficher les données des visiteurs
require('dotenv').config();

const { PrismaClient } = require('@prisma/client');

// Override des paramètres de connexion pour éviter les problèmes d'authentification
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || "mysql://root:password@localhost:3306/senator_db"
    },
  },
});

async function showVisitors() {
  try {
    console.log('Récupération des visiteurs...');
    console.log('URL de la base de données:', process.env.DATABASE_URL);
    
    // Récupérer les 10 premiers visiteurs
    const visitors = await prisma.visitors.findMany({
      take: 10,
      orderBy: {
        last_seen: 'desc'
      }
    });
    
    console.log('Visiteurs dans la base de données:');
    if (visitors.length === 0) {
      console.log('Aucun visiteur trouvé dans la base de données.');
    } else {
      console.table(visitors.map(v => ({
        id: v.id,
        badge_number: v.badge_number,
        name: `${v.first_name} ${v.last_name}`,
        company: v.company,
        status: v.status,
        access_count: v.access_count,
        last_seen: v.last_seen ? new Date(v.last_seen).toLocaleString() : null
      })));
    }
    
    // Vérifier les badges partagés
    const badgeCounts = await prisma.$queryRaw`
      SELECT badge_number, COUNT(*) as count 
      FROM visitors 
      GROUP BY badge_number 
      HAVING count > 1
    `;
    
    console.log('\nBadges partagés:');
    console.table(badgeCounts);
    
    // Récupérer la liste des entreprises
    const companies = await prisma.visitors.findMany({
      select: { company: true },
      distinct: ['company'],
      orderBy: { company: 'asc' },
    });
    
    console.log('\nEntreprises:');
    console.log(companies.map(c => c.company));
    
  } catch (error) {
    console.error('Erreur lors de la récupération des visiteurs:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Exécuter la fonction
showVisitors()
  .then(() => {
    console.log('Terminé.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Erreur lors de l\'exécution du script:', error);
    process.exit(1);
  }); 