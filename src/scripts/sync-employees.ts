import prisma from '@/lib/prisma';

async function syncEmployees() {
  try {
    console.log('Starting employee synchronization...');

    // Récupérer les employés uniques depuis access_logs qui n'ont pas encore été traités
    const newEmployees = await prisma.access_logs.findMany({
      where: {
        person_type: 'employee',
        processed: false
      },
      distinct: ['badge_number'],
      select: {
        badge_number: true,
        full_name: true,
        group_name: true
      }
    });

    console.log(`Found ${newEmployees.length} new employees to process`);

    // Pour chaque nouvel employé
    for (const employee of newEmployees) {
      try {
        // Vérifier si l'employé existe déjà
        const existingEmployee = await prisma.employees.findUnique({
          where: { badge_number: employee.badge_number }
        });

        if (!existingEmployee) {
          // Séparer le nom complet en prénom et nom
          const nameParts = employee.full_name?.split(' ') || ['', ''];
          const firstName = nameParts[0] || '';
          const lastName = nameParts.slice(1).join(' ') || '';

          // Créer le nouvel employé
          await prisma.employees.create({
            data: {
              badge_number: employee.badge_number,
              first_name: firstName,
              last_name: lastName,
              department: employee.group_name || null,
              status: 'active'
            }
          });

          console.log(`Created new employee: ${employee.full_name} (${employee.badge_number})`);
        }

        // Marquer les entrées comme traitées
        await prisma.access_logs.updateMany({
          where: { badge_number: employee.badge_number },
          data: { processed: true }
        });
      } catch (error) {
        console.error(`Error processing employee ${employee.badge_number}:`, error);
      }
    }

    // Mettre à jour les départements des employés existants
    const employeesWithDepartments = await prisma.access_logs.findMany({
      where: {
        person_type: 'employee',
        group_name: { not: null }
      },
      distinct: ['badge_number'],
      select: {
        badge_number: true,
        group_name: true
      }
    });

    for (const employee of employeesWithDepartments) {
      if (employee.group_name) {
        try {
          await prisma.employees.updateMany({
            where: { badge_number: employee.badge_number },
            data: { department: employee.group_name }
          });
        } catch (error) {
          console.error(`Error updating department for employee ${employee.badge_number}:`, error);
        }
      }
    }

    console.log('Employee synchronization completed successfully');
  } catch (error) {
    console.error('Error during employee synchronization:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Exporter la fonction pour pouvoir l'utiliser dans un cron job
export default syncEmployees;

// Si le script est exécuté directement
if (require.main === module) {
  syncEmployees()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Error running sync script:', error);
      process.exit(1);
    });
} 