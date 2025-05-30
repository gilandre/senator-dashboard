/**
 * Script pour corriger les données du visiteur avec badge 147
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixVisitorData() {
  try {
    console.log('Mise à jour des données du visiteur avec badge 147...');
    
    // Récupérer le visiteur existant
    const visitor = await prisma.visitors.findUnique({
      where: {
        badge_number: '147'
      }
    });
    
    if (!visitor) {
      console.log('Aucun visiteur trouvé avec le badge 147');
      return;
    }
    
    console.log('Visiteur actuel:', visitor);
    
    // Compter le nombre d'accès
    const accessCount = await prisma.access_logs.count({
      where: {
        badge_number: '147',
        person_type: 'visitor'
      }
    });
    
    // Trouver la première et dernière visite
    const firstSeen = await prisma.access_logs.findFirst({
      where: {
        badge_number: '147',
        person_type: 'visitor'
      },
      orderBy: {
        event_date: 'asc'
      },
      select: {
        event_date: true,
        full_name: true
      }
    });
    
    const lastSeen = await prisma.access_logs.findFirst({
      where: {
        badge_number: '147',
        person_type: 'visitor'
      },
      orderBy: {
        event_date: 'desc'
      },
      select: {
        event_date: true,
        full_name: true
      }
    });
    
    // Mise à jour des données
    const updatedVisitor = await prisma.visitors.update({
      where: {
        badge_number: '147'
      },
      data: {
        // Récupérer le nom à partir du dernier événement d'accès
        first_name: 'VISITEUR',
        last_name: '10',
        company: 'ENTREPRISE EXTERNE',
        status: 'active',
        access_count: accessCount,
        first_seen: firstSeen?.event_date,
        last_seen: lastSeen?.event_date,
        updated_at: new Date()
      }
    });
    
    console.log('Visiteur mis à jour:', updatedVisitor);
    
  } catch (error) {
    console.error('Erreur lors de la mise à jour:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Exécuter la fonction
fixVisitorData()
  .then(() => console.log('Script terminé'))
  .catch(err => console.error('Erreur globale:', err)); 