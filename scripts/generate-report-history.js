// Script pour générer des exemples d'historiques de rapports
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Formats de fichiers disponibles
const FILE_FORMATS = ['pdf', 'xlsx', 'csv'];

// Statuts possibles
const STATUSES = ['completed', 'failed', 'processing', 'pending'];

// Tailles de fichiers réalistes
const FILE_SIZES = [145289, 276432, 512000, 98745, 1024000, 389652];

// Fonction pour générer une date aléatoire dans les 30 derniers jours
function getRandomRecentDate() {
  const now = new Date();
  const daysAgo = Math.floor(Math.random() * 30);
  const result = new Date(now);
  result.setDate(result.getDate() - daysAgo);
  
  // Ajouter une heure aléatoire
  result.setHours(
    Math.floor(Math.random() * 24),
    Math.floor(Math.random() * 60),
    Math.floor(Math.random() * 60)
  );
  
  return result;
}

// Fonction pour générer un exemple de paramètres en fonction du type de rapport
function generateParametersForReportType(reportType) {
  const baseDate = new Date();
  
  switch (reportType) {
    case 'daily-access':
      return {
        date: new Date(
          baseDate.getFullYear(),
          baseDate.getMonth(),
          baseDate.getDate() - Math.floor(Math.random() * 30)
        ).toISOString().split('T')[0]
      };
    
    case 'weekly-access':
      return {
        startDate: new Date(
          baseDate.getFullYear(),
          baseDate.getMonth(),
          baseDate.getDate() - (7 * (1 + Math.floor(Math.random() * 4)))
        ).toISOString().split('T')[0],
        endDate: new Date(
          baseDate.getFullYear(),
          baseDate.getMonth(),
          baseDate.getDate() - (7 * Math.floor(Math.random() * 4))
        ).toISOString().split('T')[0]
      };
    
    case 'monthly-access':
      return {
        year: baseDate.getFullYear(),
        month: 1 + Math.floor(Math.random() * 12)
      };
    
    case 'security-incidents':
      return {
        startDate: new Date(
          baseDate.getFullYear(),
          baseDate.getMonth() - 3,
          1
        ).toISOString().split('T')[0],
        endDate: new Date(
          baseDate.getFullYear(),
          baseDate.getMonth(),
          baseDate.getDate()
        ).toISOString().split('T')[0],
        severityFilter: Math.random() > 0.5 ? ['critical', 'warning'] : ['all']
      };
    
    case 'visitors':
      return {
        startDate: new Date(
          baseDate.getFullYear(),
          baseDate.getMonth() - 1,
          1
        ).toISOString().split('T')[0],
        endDate: new Date(
          baseDate.getFullYear(),
          baseDate.getMonth(),
          0
        ).toISOString().split('T')[0]
      };
    
    case 'department-presence':
      return {
        departments: ['IT', 'HR', 'Finance', 'Marketing'],
        date: new Date(
          baseDate.getFullYear(),
          baseDate.getMonth(),
          baseDate.getDate() - Math.floor(Math.random() * 30)
        ).toISOString().split('T')[0]
      };
    
    case 'employee-presence':
      return {
        employees: [123, 456, 789],
        startDate: new Date(
          baseDate.getFullYear(),
          baseDate.getMonth() - 1,
          1
        ).toISOString().split('T')[0],
        endDate: new Date(
          baseDate.getFullYear(),
          baseDate.getMonth(),
          0
        ).toISOString().split('T')[0]
      };
    
    case 'anomalies':
      return {
        startDate: new Date(
          baseDate.getFullYear(),
          baseDate.getMonth() - 2,
          1
        ).toISOString().split('T')[0],
        endDate: new Date(
          baseDate.getFullYear(),
          baseDate.getMonth(),
          0
        ).toISOString().split('T')[0],
        severityFilter: ['high', 'medium']
      };
    
    default:
      return {};
  }
}

async function generateReportHistory() {
  console.log('🔄 Génération d\'exemples d\'historiques de rapports...');
  
  try {
    // 1. Récupérer tous les rapports disponibles
    const allReports = await prisma.reports.findMany();
    
    if (allReports.length === 0) {
      console.log('❌ Aucun rapport trouvé dans la table reports. Veuillez d\'abord ajouter des rapports.');
      return;
    }
    
    console.log(`📊 Nombre de rapports disponibles: ${allReports.length}`);
    
    // 2. Récupérer tous les utilisateurs (pour les associer aux rapports)
    const users = await prisma.user.findMany({
      select: { id: true },
      where: { role: { in: ['admin', 'operator'] } }
    });
    
    if (users.length === 0) {
      console.log('⚠️ Aucun utilisateur admin ou operator trouvé. Les rapports seront créés sans utilisateur associé.');
    }
    
    // 3. Générer plusieurs entrées d'historique pour chaque rapport
    const historyEntries = [];
    
    for (const report of allReports) {
      // Générer entre 1 et 5 entrées d'historique pour chaque rapport
      const entriesCount = 1 + Math.floor(Math.random() * 5);
      
      for (let i = 0; i < entriesCount; i++) {
        const status = STATUSES[Math.floor(Math.random() * STATUSES.length)];
        const fileFormat = FILE_FORMATS[Math.floor(Math.random() * FILE_FORMATS.length)];
        const generatedAt = getRandomRecentDate();
        
        // Déterminer si l'entrée a un utilisateur associé
        const userId = users.length > 0 
          ? users[Math.floor(Math.random() * users.length)].id 
          : null;
        
        // Créer une entrée d'historique
        const entry = {
          report_id: report.id,
          user_id: userId,
          title: `${report.title} - ${generatedAt.toLocaleDateString('fr-FR')}`,
          parameters: generateParametersForReportType(report.report_type),
          status,
          generated_at: generatedAt,
          file_format: fileFormat
        };
        
        // Ajouter des champs spécifiques en fonction du statut
        if (status === 'completed') {
          const completedAt = new Date(generatedAt);
          completedAt.setMinutes(completedAt.getMinutes() + Math.floor(Math.random() * 10) + 1);
          
          const fileName = `rapport_${report.report_type}_${generatedAt.getTime()}.${fileFormat}`;
          
          Object.assign(entry, {
            completed_at: completedAt,
            file_url: `/reports/${fileName}`,
            file_name: fileName,
            file_size: FILE_SIZES[Math.floor(Math.random() * FILE_SIZES.length)]
          });
        } else if (status === 'failed') {
          const completedAt = new Date(generatedAt);
          completedAt.setMinutes(completedAt.getMinutes() + Math.floor(Math.random() * 5) + 1);
          
          Object.assign(entry, {
            completed_at: completedAt,
            error_message: 'Erreur lors de la génération du rapport : données incompatibles ou incomplètes'
          });
        } else if (status === 'processing') {
          // Ne rien ajouter de plus
        } else {
          // Statut pending
        }
        
        historyEntries.push(entry);
      }
    }
    
    // 4. Insérer les entrées dans la base de données
    console.log(`🔄 Insertion de ${historyEntries.length} entrées d'historique...`);
    
    await prisma.report_history.createMany({
      data: historyEntries,
      skipDuplicates: true
    });
    
    console.log('✅ Génération des historiques de rapports terminée avec succès!');
    console.log(`📊 ${historyEntries.length} entrées d'historique générées.`);
    
  } catch (error) {
    console.error('❌ Erreur lors de la génération des historiques de rapports:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Exécuter la fonction de génération
generateReportHistory(); 