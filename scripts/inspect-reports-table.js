// Script pour inspecter la table reports
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function inspectReportsTable() {
  console.log('🔍 Inspection de la table reports...');
  
  try {
    // Récupérer tous les rapports
    const allReports = await prisma.reports.findMany({
      orderBy: { id: 'asc' }
    });
    
    console.log(`📊 Nombre total de rapports: ${allReports.length}\n`);
    
    // Afficher les détails de chaque rapport
    for (const report of allReports) {
      console.log(`ID: ${report.id}`);
      console.log(`Titre: ${report.title}`);
      console.log(`Type: ${report.report_type}`);
      console.log(`Catégorie: ${report.category}`);
      console.log(`Icône: ${report.icon || 'Non définie'}`);
      console.log(`Lien: ${report.link || 'Non défini'}`);
      console.log(`Créé le: ${report.created_at.toLocaleString('fr-FR')}`);
      console.log(`Mis à jour le: ${report.updated_at.toLocaleString('fr-FR')}`);
      console.log('-------------------------------------------');
    }
    
    // Liste des types de rapports disponibles
    const reportTypes = allReports.map(r => r.report_type);
    console.log('\n📋 Types de rapports disponibles:');
    console.log(reportTypes.join(', '));
    
    // Liste des catégories
    const categories = [...new Set(allReports.map(r => r.category))];
    console.log('\n📋 Catégories disponibles:');
    console.log(categories.join(', '));
    
  } catch (error) {
    console.error('❌ Erreur lors de l\'inspection de la table reports:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Exécuter la fonction d'inspection
inspectReportsTable(); 