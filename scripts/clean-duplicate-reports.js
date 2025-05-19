// Script pour nettoyer les entrées dupliquées dans la table reports
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanDuplicateReports() {
  console.log('🧹 Nettoyage des rapports dupliqués...');
  
  try {
    // 1. Récupérer tous les rapports
    const allReports = await prisma.reports.findMany({
      orderBy: { id: 'asc' }
    });
    
    console.log(`📊 Nombre total de rapports: ${allReports.length}`);
    
    // 2. Identifier les groupes de rapports ayant le même titre et type
    const reportGroups = {};
    
    allReports.forEach(report => {
      const key = `${report.title}_${report.report_type}`;
      if (!reportGroups[key]) {
        reportGroups[key] = [];
      }
      reportGroups[key].push(report);
    });
    
    // 3. Filtrer pour ne garder que les groupes avec des doublons
    const duplicateGroups = Object.entries(reportGroups)
      .filter(([_, reports]) => reports.length > 1);
    
    console.log(`🔍 Nombre de groupes avec doublons: ${duplicateGroups.length}`);
    
    if (duplicateGroups.length === 0) {
      console.log('✅ Aucun doublon trouvé, rien à nettoyer');
      return;
    }
    
    // 4. Pour chaque groupe de doublons, garder le premier et supprimer les autres
    let totalDuplicatesRemoved = 0;
    
    for (const [key, reports] of duplicateGroups) {
      console.log(`\n🔄 Traitement des doublons pour: ${key}`);
      console.log(`   Reports concernés: ${reports.map(r => r.id).join(', ')}`);
      
      // Garder le premier rapport (le plus ancien basé sur l'ID)
      const [keepReport, ...duplicatesToRemove] = reports;
      
      console.log(`   ✅ Conservation du rapport ID: ${keepReport.id}`);
      console.log(`   🗑️ Suppression des rapports IDs: ${duplicatesToRemove.map(r => r.id).join(', ')}`);
      
      if (duplicatesToRemove.length > 0) {
        // Transaction pour s'assurer que toutes les opérations réussissent ou échouent ensemble
        await prisma.$transaction(async (tx) => {
          // Pour chaque rapport à supprimer
          for (const dupReport of duplicatesToRemove) {
            // Mettre à jour les références dans report_history
            await tx.report_history.updateMany({
              where: { report_id: dupReport.id },
              data: { report_id: keepReport.id }
            });
            
            // Mettre à jour les références dans report_templates
            await tx.report_templates.updateMany({
              where: { report_id: dupReport.id },
              data: { report_id: keepReport.id }
            });
            
            // Mettre à jour les références dans report_schedule
            await tx.report_schedule.updateMany({
              where: { report_id: dupReport.id },
              data: { report_id: keepReport.id }
            });
            
            // Supprimer le rapport dupliqué
            await tx.reports.delete({
              where: { id: dupReport.id }
            });
          }
        });
        
        totalDuplicatesRemoved += duplicatesToRemove.length;
      }
    }
    
    console.log(`\n🎉 Nettoyage terminé avec succès!`);
    console.log(`   📊 Rapports dupliqués supprimés: ${totalDuplicatesRemoved}`);
    
  } catch (error) {
    console.error('❌ Erreur lors du nettoyage des rapports dupliqués:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Exécuter la fonction de nettoyage
cleanDuplicateReports(); 