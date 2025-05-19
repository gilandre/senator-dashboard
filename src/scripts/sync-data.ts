import { PrismaClient } from '@prisma/client';
import cron from 'node-cron';
import { parse } from 'cron-parser';

const prisma = new PrismaClient();

interface SyncResult {
  success: boolean;
  message: string;
  details?: any;
}

async function getUnprocessedRecords(personType: 'employee' | 'visitor') {
  return prisma.access_logs.findMany({
    where: {
      person_type: personType,
      processed: false,
    },
    orderBy: {
      event_date: 'asc',
    },
  });
}

async function getMostRecentData(badgeNumber: string, personType: 'employee' | 'visitor') {
  return prisma.access_logs.findFirst({
    where: {
      person_id: badgeNumber,
      person_type: personType,
    },
    orderBy: {
      event_date: 'desc',
    },
  });
}

async function cleanText(text: string | null): string {
  if (!text) return 'N/A';
  return text.trim() || 'N/A';
}

async function splitFullName(fullName: string): Promise<{ firstName: string; lastName: string }> {
  const parts = fullName.split(' ');
  if (parts.length >= 2) {
    const lastName = parts.pop() || 'N/A';
    const firstName = parts.join(' ');
    return {
      firstName: await cleanText(firstName),
      lastName: await cleanText(lastName),
    };
  }
  return {
    firstName: await cleanText(fullName),
    lastName: 'N/A',
  };
}

async function syncEmployees(): Promise<SyncResult> {
  try {
    const records = await getUnprocessedRecords('employee');
    console.log(`Traitement de ${records.length} enregistrements employés`);

    for (const record of records) {
      const mostRecent = await getMostRecentData(record.person_id, 'employee');
      if (!mostRecent) continue;

      const { firstName, lastName } = await splitFullName(mostRecent.person_name);
      const department = await cleanText(mostRecent.group_name);

      // Vérifier si l'employé existe déjà
      const existingEmployee = await prisma.employees.findUnique({
        where: { badge_number: record.person_id },
      });

      if (existingEmployee) {
        // Mise à jour
        await prisma.employees.update({
          where: { badge_number: record.person_id },
          data: {
            first_name: firstName,
            last_name: lastName,
            department,
            last_seen: mostRecent.event_date,
            access_count: {
              increment: 1,
            },
            updated_at: new Date(),
          },
        });
      } else {
        // Création
        await prisma.employees.create({
          data: {
            badge_number: record.person_id,
            first_name: firstName,
            last_name: lastName,
            department,
            status: 'active',
            first_seen: record.event_date,
            last_seen: mostRecent.event_date,
            access_count: 1,
          },
        });
      }

      // Marquer comme traité
      await prisma.access_logs.update({
        where: { id: record.id },
        data: { processed: true },
      });
    }

    return {
      success: true,
      message: `Synchronisation des employés terminée : ${records.length} enregistrements traités`,
    };
  } catch (error) {
    console.error('Erreur lors de la synchronisation des employés:', error);
    return {
      success: false,
      message: 'Erreur lors de la synchronisation des employés',
      details: error,
    };
  }
}

async function syncVisitors(): Promise<SyncResult> {
  try {
    const records = await getUnprocessedRecords('visitor');
    console.log(`Traitement de ${records.length} enregistrements visiteurs`);

    for (const record of records) {
      const mostRecent = await getMostRecentData(record.person_id, 'visitor');
      if (!mostRecent) continue;

      const { firstName, lastName } = await splitFullName(mostRecent.person_name);
      const company = await cleanText(mostRecent.group_name);

      // Vérifier si le visiteur existe déjà
      const existingVisitor = await prisma.visitors.findUnique({
        where: { badge_number: record.person_id },
      });

      if (existingVisitor) {
        // Mise à jour
        await prisma.visitors.update({
          where: { badge_number: record.person_id },
          data: {
            first_name: firstName,
            last_name: lastName,
            company,
            last_seen: mostRecent.event_date,
            access_count: {
              increment: 1,
            },
            updated_at: new Date(),
          },
        });
      } else {
        // Création
        await prisma.visitors.create({
          data: {
            badge_number: record.person_id,
            first_name: firstName,
            last_name: lastName,
            company,
            status: 'active',
            first_seen: record.event_date,
            last_seen: mostRecent.event_date,
            access_count: 1,
          },
        });
      }

      // Marquer comme traité
      await prisma.access_logs.update({
        where: { id: record.id },
        data: { processed: true },
      });
    }

    return {
      success: true,
      message: `Synchronisation des visiteurs terminée : ${records.length} enregistrements traités`,
    };
  } catch (error) {
    console.error('Erreur lors de la synchronisation des visiteurs:', error);
    return {
      success: false,
      message: 'Erreur lors de la synchronisation des visiteurs',
      details: error,
    };
  }
}

async function updateSyncConfig(syncType: 'employee' | 'visitor') {
  const config = await prisma.syncConfig.findUnique({
    where: { sync_type: syncType },
  });

  if (config) {
    const interval = parse(config.cron_expression);
    const nextRun = interval.next().toDate();

    await prisma.syncConfig.update({
      where: { sync_type: syncType },
      data: {
        last_run: new Date(),
        next_run: nextRun,
      },
    });
  }
}

async function runSync() {
  console.log('Démarrage de la synchronisation...');

  // Synchroniser les employés
  const employeeResult = await syncEmployees();
  console.log(employeeResult.message);
  await updateSyncConfig('employee');

  // Synchroniser les visiteurs
  const visitorResult = await syncVisitors();
  console.log(visitorResult.message);
  await updateSyncConfig('visitor');

  console.log('Synchronisation terminée');
}

// Fonction pour démarrer la synchronisation planifiée
export async function startScheduledSync() {
  try {
    // Récupérer les configurations de synchronisation
    const configs = await prisma.syncConfig.findMany({
      where: { is_active: true },
    });

    // Configurer les tâches planifiées
    for (const config of configs) {
      cron.schedule(config.cron_expression, async () => {
        console.log(`Exécution de la synchronisation ${config.sync_type} selon la planification`);
        if (config.sync_type === 'employee') {
          await syncEmployees();
        } else if (config.sync_type === 'visitor') {
          await syncVisitors();
        }
        await updateSyncConfig(config.sync_type as 'employee' | 'visitor');
      });
    }

    // Exécuter une synchronisation initiale
    await runSync();
  } catch (error) {
    console.error('Erreur lors du démarrage de la synchronisation planifiée:', error);
  }
}

// Fonction pour exécuter la synchronisation immédiatement
export async function runImmediateSync() {
  await runSync();
}

// Si le script est exécuté directement
if (require.main === module) {
  runImmediateSync()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Erreur lors de l\'exécution du script:', error);
      process.exit(1);
    });
} 