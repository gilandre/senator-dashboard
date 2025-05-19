const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    // Récupérer le nombre total d'enregistrements
    const total = await prisma.access_logs.count();
    console.log('Nombre total d\'enregistrements access_logs:', total);
    
    // Récupérer les dates min et max
    const minDate = await prisma.access_logs.findFirst({
      orderBy: { event_date: 'asc' },
      select: { event_date: true }
    });
    
    const maxDate = await prisma.access_logs.findFirst({
      orderBy: { event_date: 'desc' },
      select: { event_date: true }
    });
    
    console.log('Date min:', minDate?.event_date);
    console.log('Date max:', maxDate?.event_date);
    
    // Récupérer les données par jour
    const dailyData = await prisma.$queryRaw`
      SELECT DATE(event_date) as date, COUNT(DISTINCT badge_number) as count
      FROM access_logs
      WHERE event_date BETWEEN '2024-09-01' AND '2025-03-01'
      GROUP BY DATE(event_date)
      ORDER BY date DESC
      LIMIT 10
    `;
    
    console.log('Données journalières:', dailyData);
  } catch (error) {
    console.error('Erreur:', error);
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(e => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  }); 