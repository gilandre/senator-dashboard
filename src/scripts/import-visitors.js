/**
 * Script pour importer les visiteurs à partir des logs d'accès
 * Ce script utilise directement Prisma sans passer par l'API
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function importVisitors() {
  try {
    console.log('Démarrage de l\'importation des visiteurs depuis les logs d\'accès...');
    
    const startTime = Date.now();
    
    // 1. Récupérer tous les logs d'accès avec group_name contenant 'Visiteurs' et qui ont un nom complet
    console.log('Recherche des logs avec group_name contenant "Visiteurs"...');
    
    // D'abord, récupérons quelques exemples de group_name pour vérifier
    const groupNameSamples = await prisma.access_logs.findMany({
      select: {
        group_name: true
      },
      distinct: ['group_name'],
      take: 10
    });
    
    console.log('Exemples de group_name disponibles:', groupNameSamples.map(g => g.group_name));
    
    const uniqueVisitorLogs = await prisma.access_logs.findMany({
      where: {
        group_name: {
          contains: 'Visiteurs'
        },
        full_name: {
          not: '',
        },
        badge_number: {
          not: '',
        },
      },
      distinct: ['badge_number'],
      orderBy: {
        event_date: 'desc',
      },
    });

    console.log(`Trouvé ${uniqueVisitorLogs.length} visiteurs uniques dans les logs d'accès.`);
    
    // 2. Traiter chaque visiteur
    let created = 0;
    let updated = 0;
    let skipped = 0;
    let errors = 0;
    
    for (const log of uniqueVisitorLogs) {
      try {
        const { badge_number, full_name } = log;
        
        if (!badge_number || !full_name) {
          console.log(`Visiteur ignoré: badge ${badge_number} nom ${full_name}`);
          skipped++;
          continue;
        }

        // 3. Extraire les informations du visiteur
        // Compter le nombre d'accès
        const accessCount = await prisma.access_logs.count({
          where: {
            badge_number,
            person_type: 'visitor'
          }
        });
        
        // Trouver la première et dernière visite
        const firstSeen = await prisma.access_logs.findFirst({
          where: {
            badge_number,
            person_type: 'visitor'
          },
          orderBy: {
            event_date: 'asc'
          },
          select: {
            event_date: true
          }
        });
        
        const lastSeen = await prisma.access_logs.findFirst({
          where: {
            badge_number,
            person_type: 'visitor'
          },
          orderBy: {
            event_date: 'desc'
          },
          select: {
            event_date: true
          }
        });

        // 4. Traitement du nom
        // Diviser le nom complet en prénom/nom
        const nameParts = full_name.split(' ');
        let firstName = nameParts[0] || '';
        let lastName = nameParts.slice(1).join(' ') || 'VISITEUR';
        
        // Vérifier si le visiteur existe déjà
        const existingVisitor = await prisma.visitors.findUnique({
          where: {
            badge_number
          }
        });
        
        if (existingVisitor) {
          // Mettre à jour le visiteur existant
          await prisma.visitors.update({
            where: {
              badge_number,
            },
            data: {
              access_count: accessCount,
              first_seen: firstSeen?.event_date,
              last_seen: lastSeen?.event_date,
              updated_at: new Date()
            },
          });
          console.log(`Visiteur mis à jour: ${badge_number} - ${firstName} ${lastName}`);
          updated++;
          continue;
        }

        // Créer le visiteur
        await prisma.visitors.create({
          data: {
            badge_number,
            first_name: firstName,
            last_name: lastName,
            company: 'Inconnu', // Valeur par défaut
            status: 'active',
            access_count: accessCount,
            first_seen: firstSeen?.event_date,
            last_seen: lastSeen?.event_date,
            created_at: new Date(),
            updated_at: new Date(),
          },
        });
        console.log(`Visiteur créé: ${badge_number} - ${firstName} ${lastName}`);
        created++;
      } catch (error) {
        console.error('Erreur lors de la création d\'un visiteur:', error);
        errors++;
      }
    }

    const duration = (Date.now() - startTime) / 1000;

    // Afficher le résumé
    console.log('\nRésumé de l\'importation:');
    console.log(`Total traité: ${uniqueVisitorLogs.length}`);
    console.log(`Créés: ${created}`);
    console.log(`Mis à jour: ${updated}`);
    console.log(`Ignorés: ${skipped}`);
    console.log(`Erreurs: ${errors}`);
    console.log(`Durée: ${duration.toFixed(2)} secondes`);

  } catch (error) {
    console.error('Erreur lors de l\'importation des visiteurs:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Exécuter la fonction
importVisitors()
  .then(() => console.log('Script terminé'))
  .catch(err => console.error('Erreur globale:', err)); 