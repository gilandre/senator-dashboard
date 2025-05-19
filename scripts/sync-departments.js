/**
 * Script de synchronisation des départements
 * 
 * Ce script analyse la table access_logs pour extraire les départements uniques 
 * depuis la colonne group_name et les insère dans la table departments.
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function syncDepartments() {
  console.log('Démarrage de la synchronisation des départements...');

  try {
    // 1. Récupérer tous les group_name uniques et non-null de la table access_logs
    const uniqueGroups = await prisma.$queryRaw`
      SELECT DISTINCT group_name 
      FROM access_logs 
      WHERE group_name IS NOT NULL AND group_name != ''
    `;

    console.log(`Trouvé ${uniqueGroups.length} départements uniques dans les logs d'accès.`);

    // 2. Pour chaque département, vérifier s'il existe déjà et l'ajouter si nécessaire
    let newDepartments = 0;
    
    for (const group of uniqueGroups) {
      const departmentName = group.group_name.trim();
      
      // Ignorer les valeurs vides après trim
      if (!departmentName) continue;
      
      // Vérifier si le département existe déjà
      const existingDepartment = await prisma.departments.findUnique({
        where: { name: departmentName }
      });
      
      // Si le département n'existe pas, le créer
      if (!existingDepartment) {
        await prisma.departments.create({
          data: {
            name: departmentName,
            description: `Département ${departmentName}`,
            location: 'À définir'
          }
        });
        
        newDepartments++;
        console.log(`✅ Ajout du département: ${departmentName}`);
      } else {
        console.log(`ℹ️ Le département existe déjà: ${departmentName}`);
      }
    }
    
    console.log(`\nSynchronisation terminée. ${newDepartments} nouveaux départements ajoutés.`);
    
    // 3. Mettre à jour les employés avec leur département_id
    console.log('\nMise à jour des associations employés-départements...');
    
    const updatedEmployees = await prisma.$executeRaw`
      UPDATE employees e
      JOIN departments d ON e.department = d.name
      SET e.department_id = d.id
      WHERE e.department_id IS NULL AND e.department IS NOT NULL
    `;
    
    console.log(`${updatedEmployees} employés associés à leur département.`);

  } catch (error) {
    console.error('Erreur lors de la synchronisation des départements:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Exécuter le script
syncDepartments()
  .then(() => {
    console.log('Script terminé avec succès.');
    process.exit(0);
  })
  .catch(error => {
    console.error('Erreur fatale:', error);
    process.exit(1);
  }); 