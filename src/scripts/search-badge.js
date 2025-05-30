/**
 * Script pour rechercher les entrées d'un badge spécifique dans la table access_logs
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function searchBadgeEntries(badgeNumber) {
  try {
    console.log(`Recherche des entrées pour le badge ${badgeNumber} dans access_logs...`);
    
    // Récupérer les enregistrements
    const entries = await prisma.access_logs.findMany({
      where: {
        badge_number: badgeNumber
      },
      orderBy: {
        event_date: 'desc'
      },
      take: 100 // Limiter à 100 résultats pour éviter un volume trop important
    });

    console.log(`Trouvé ${entries.length} entrées pour le badge ${badgeNumber}`);
    
    if (entries.length > 0) {
      // Afficher quelques informations sur le type de personne
      const firstEntry = entries[0];
      console.log(`Type de personne: ${firstEntry.person_type || 'Non spécifié'}`);
      console.log(`Nom: ${firstEntry.full_name || 'Non spécifié'}`);
      console.log(`Groupe: ${firstEntry.group_name || 'Non spécifié'}`);
      
      // Afficher les entrées
      console.log('\nDétails des entrées:');
      console.log('-'.repeat(80));
      console.log('| Date       | Heure   | Lecteur                 | Type d\'événement   | Direction |');
      console.log('-'.repeat(80));
      
      entries.forEach(entry => {
        const date = entry.event_date ? entry.event_date.toISOString().split('T')[0] : 'N/A';
        const time = entry.event_time || 'N/A';
        const reader = (entry.reader || 'N/A').padEnd(24);
        const eventType = (entry.event_type || 'N/A').padEnd(18);
        const direction = (entry.direction || 'N/A').padEnd(9);
        
        console.log(`| ${date} | ${time} | ${reader} | ${eventType} | ${direction} |`);
      });
      
      console.log('-'.repeat(80));
      
      // Vérifier si le badge est associé à un visiteur
      const visitor = await prisma.visitors.findUnique({
        where: {
          badge_number: badgeNumber
        }
      });
      
      if (visitor) {
        console.log('\nCe badge est associé à un visiteur:');
        console.log(`ID: ${visitor.id}`);
        console.log(`Nom: ${visitor.first_name} ${visitor.last_name}`);
        console.log(`Société: ${visitor.company || 'Non spécifiée'}`);
        console.log(`Statut: ${visitor.status}`);
        console.log(`Première visite: ${visitor.first_seen ? new Date(visitor.first_seen).toLocaleDateString() : 'Inconnue'}`);
        console.log(`Dernière visite: ${visitor.last_seen ? new Date(visitor.last_seen).toLocaleDateString() : 'Inconnue'}`);
        console.log(`Nombre d'accès: ${visitor.access_count || 0}`);
      } else {
        console.log('\nCe badge n\'est pas associé à un visiteur dans la table visitors.');
        
        // Vérifier si le badge est associé à un employé
        const employee = await prisma.employees.findFirst({
          where: {
            badge_number: badgeNumber
          }
        });
        
        if (employee) {
          console.log('Ce badge est associé à un employé:');
          console.log(`ID: ${employee.id}`);
          console.log(`Nom: ${employee.first_name} ${employee.last_name}`);
          console.log(`Département: ${employee.department || 'Non spécifié'}`);
          console.log(`Poste: ${employee.position || 'Non spécifié'}`);
        } else {
          console.log('Ce badge n\'est pas non plus associé à un employé dans la table employees.');
        }
      }
    }
  } catch (error) {
    console.error('Erreur lors de la recherche:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Badge à rechercher
const badgeNumber = '147';

// Exécuter la recherche
searchBadgeEntries(badgeNumber)
  .then(() => console.log('\nRecherche terminée'))
  .catch(err => console.error('Erreur globale:', err)); 