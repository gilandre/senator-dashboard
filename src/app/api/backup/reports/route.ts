import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

interface ReportListItem {
  id: string;
  title: string;
  description: string;
  category: string;
  lastGenerated: string;
  icon: string;
  link?: string;
}

interface ReportStatsResponse {
  totalReports: number;
  scheduledReports: number;
  recentReports: ReportSummary[];
  reportCategories: { category: string; count: number }[];
}

interface ReportSummary {
  id: string;
  title: string;
  generatedAt: string;
  status: 'completed' | 'failed' | 'pending';
  downloadUrl?: string;
  reportType: string;
}

/**
 * Récupérer la liste des rapports disponibles depuis la base de données
 */
async function getReportsList(): Promise<ReportListItem[]> {
  try {
    // Récupérer les rapports depuis la base de données
    const dbReports = await prisma.reports.findMany({
      orderBy: { created_at: 'desc' },
      include: {
        histories: {
          orderBy: { generated_at: 'desc' },
          take: 1
        }
      }
    });
    
    // Transformer les données pour correspondre à l'interface attendue
    const reports: ReportListItem[] = dbReports.map(report => {
      const lastGenerated = report.histories.length > 0 
        ? report.histories[0].generated_at.toISOString() 
        : report.updated_at.toISOString();
      
      return {
        id: report.id.toString(),
        title: report.title,
        description: report.description || '',
        category: report.category,
        lastGenerated,
        icon: report.icon || 'file-text',
        link: report.link
      };
    });
    
    return reports;
  } catch (error) {
    console.error('Error fetching reports from database:', error);
    // Utiliser la fonction locale au lieu de la version importée
    return getStaticReportsList();
  }
}

/**
 * Générer une liste de rapports statiques (fallback)
 */
function getStaticReportsList(): ReportListItem[] {
  return [
    {
      id: "presence-time",
      title: "Rapport de temps de présence",
      description: "Heures d'entrée et de sortie des employés",
      icon: "clock",
      lastGenerated: new Date().toISOString(),
      category: "Ressources Humaines",
      link: "/reports/presence-report"
    }
  ];
}

/**
 * Récupérer les statistiques des rapports générés depuis la base de données
 */
async function getReportStats(): Promise<ReportStatsResponse> {
  try {
    // Récupérer le nombre total de rapports
    const totalReports = await prisma.reports.count();
    
    // Récupérer le nombre de rapports programmés
    const scheduledReports = await prisma.report_schedule.count({
      where: { status: 'active' }
    });
    
    // Récupérer les rapports récents générés
    const recentHistories = await prisma.report_history.findMany({
      take: 5,
      orderBy: { generated_at: 'desc' },
      include: { report: true }
    });
    
    // Transformer les données des rapports récents
    const recentReports: ReportSummary[] = recentHistories.map(history => ({
      id: history.id.toString(),
      title: history.title,
      generatedAt: history.generated_at.toISOString(),
      status: history.status as 'completed' | 'failed' | 'pending',
      downloadUrl: history.file_url || undefined,
      reportType: history.report.title
    }));
    
    // Récupérer les catégories de rapports et leurs décomptes
    const categories = await prisma.reports.groupBy({
      by: ['category'],
      _count: { id: true }
    });
    
    // Transformer les données des catégories
    const reportCategories = categories.map(category => ({
      category: category.category,
      count: category._count.id
    }));
    
    return {
      totalReports,
      scheduledReports,
      recentReports,
      reportCategories
    };
  } catch (error) {
    console.error('Error fetching report stats from database:', error);
    return getStaticReportStats(); // Fallback to static data if database query fails
  }
}

/**
 * Générer des statistiques de rapport statiques (fallback)
 */
function getStaticReportStats(): ReportStatsResponse {
  const recentReports: ReportSummary[] = [
    {
      id: "rep_001",
      title: "Rapport d'accès quotidien - 15/05/2025",
      generatedAt: new Date().toISOString(),
      status: "completed",
      downloadUrl: "/api/reports/download/rep_001",
      reportType: "Accès quotidien"
    },
    {
      id: "rep_002",
      title: "Rapport d'anomalies - 15/05/2025",
      generatedAt: new Date().toISOString(),
      status: "completed",
      downloadUrl: "/api/reports/download/rep_002",
      reportType: "Anomalies"
    },
    {
      id: "rep_003",
      title: "Rapport de présence par département - Mai 2025",
      generatedAt: new Date().toISOString(),
      status: "pending",
      reportType: "Présence département"
    }
  ];

  const reportCategories = [
    { category: "Quotidien", count: 15 },
    { category: "Hebdomadaire", count: 8 },
    { category: "Mensuel", count: 3 },
    { category: "Sécurité", count: 10 },
    { category: "Ressources Humaines", count: 7 },
    { category: "Accueil", count: 5 }
  ];

  return {
    totalReports: 48,
    scheduledReports: 4,
    recentReports,
    reportCategories
  };
}

/**
 * Initialiser les données de rapports si la table est vide
 */
async function initializeReportsData() {
  const reportsCount = await prisma.reports.count();
  
  if (reportsCount === 0) {
    // Si la table est vide, initialiser avec les données statiques
    const staticReports = getStaticReportsList();
    
    for (const report of staticReports) {
      await prisma.reports.create({
        data: {
          title: report.title,
          description: report.description,
          report_type: report.id,
          category: report.category,
          icon: report.icon,
          link: report.link
        }
      });
    }
    
    console.log('Initialized reports data with static values');
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    // Si nous sommes en dev et que nous avons un header de bypass, nous contournons l'authentification
    const headers = request.headers;
    const bypassAuth = headers.get('x-test-bypass-auth');
    
    if (!session && (!bypassAuth || process.env.NODE_ENV !== 'development')) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    // Initialiser les données de rapports par défaut si elles n'existent pas
    await initializeReportsData();

    if (action === 'stats') {
      // Récupérer les statistiques des rapports
      const stats = await getReportStats();
      return NextResponse.json(stats);
    } else {
      // Action par défaut : récupérer la liste des rapports
      const reports = await getReportsList();
      return NextResponse.json(reports);
    }
  } catch (error) {
    console.error('Error in reports API:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    // Si nous sommes en dev et que nous avons un header de bypass, nous contournons l'authentification
    const headers = request.headers;
    const bypassAuth = headers.get('x-test-bypass-auth');
    
    if (!session && (!bypassAuth || process.env.NODE_ENV !== 'development')) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    // Récupérer et valider les données du rapport
    const data = await request.json();
    
    // Vérifier les champs obligatoires
    if (!data.title || !data.report_type || !data.category) {
      return NextResponse.json({ 
        error: 'Données incomplètes. Les champs title, report_type, et category sont obligatoires' 
      }, { status: 400 });
    }
    
    // Vérifier si un rapport avec le même type existe déjà
    const existingReport = await prisma.reports.findFirst({
      where: { report_type: data.report_type }
    });
    
    if (existingReport) {
      return NextResponse.json({ 
        error: 'Un rapport avec ce type existe déjà' 
      }, { status: 409 });
    }
    
    // Créer le nouveau rapport dans la base de données
    const newReport = await prisma.reports.create({
      data: {
        title: data.title,
        description: data.description || '',
        report_type: data.report_type,
        category: data.category,
        icon: data.icon || '',
        link: data.link || null
      }
    });
    
    return NextResponse.json({
      success: true,
      id: newReport.id,
      message: 'Rapport créé avec succès'
    });
    
  } catch (error) {
    console.error('Error creating report:', error);
    return NextResponse.json({ 
      error: 'Erreur lors de la création du rapport' 
    }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    // Si nous sommes en dev et que nous avons un header de bypass, nous contournons l'authentification
    const headers = request.headers;
    const bypassAuth = headers.get('x-test-bypass-auth');
    
    if (!session && (!bypassAuth || process.env.NODE_ENV !== 'development')) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    // Récupérer et valider les données du rapport
    const data = await request.json();
    
    // Vérifier la présence de l'ID
    if (!data.id) {
      return NextResponse.json({ 
        error: 'ID de rapport manquant' 
      }, { status: 400 });
    }
    
    // Convertir l'ID en entier
    const reportId = parseInt(data.id, 10);
    if (isNaN(reportId)) {
      return NextResponse.json({ 
        error: 'ID de rapport invalide' 
      }, { status: 400 });
    }
    
    // Vérifier que le rapport existe
    const existingReport = await prisma.reports.findUnique({
      where: { id: reportId }
    });
    
    if (!existingReport) {
      return NextResponse.json({ 
        error: 'Rapport non trouvé' 
      }, { status: 404 });
    }
    
    // Vérifier si le type de rapport est unique si modifié
    if (data.report_type && data.report_type !== existingReport.report_type) {
      const typeExists = await prisma.reports.findFirst({
        where: { 
          report_type: data.report_type,
          id: { not: reportId }
        }
      });
      
      if (typeExists) {
        return NextResponse.json({ 
          error: 'Un rapport avec ce type existe déjà' 
        }, { status: 409 });
      }
    }
    
    // Préparer les données à mettre à jour
    const updateData: any = {};
    
    if (data.title) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.report_type) updateData.report_type = data.report_type;
    if (data.category) updateData.category = data.category;
    if (data.icon !== undefined) updateData.icon = data.icon;
    if (data.link !== undefined) updateData.link = data.link;
    
    // Mettre à jour le rapport dans la base de données
    await prisma.reports.update({
      where: { id: reportId },
      data: updateData
    });
    
    return NextResponse.json({
      success: true,
      id: data.id,
      message: 'Rapport mis à jour avec succès'
    });
    
  } catch (error) {
    console.error('Error updating report:', error);
    return NextResponse.json({ 
      error: 'Erreur lors de la mise à jour du rapport' 
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    // Si nous sommes en dev et que nous avons un header de bypass, nous contournons l'authentification
    const headers = request.headers;
    const bypassAuth = headers.get('x-test-bypass-auth');
    
    if (!session && (!bypassAuth || process.env.NODE_ENV !== 'development')) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ 
        error: 'ID de rapport manquant' 
      }, { status: 400 });
    }
    
    // Convertir l'ID en entier
    const reportId = parseInt(id, 10);
    if (isNaN(reportId)) {
      return NextResponse.json({ 
        error: 'ID de rapport invalide' 
      }, { status: 400 });
    }
    
    // Vérifier que le rapport existe
    const existingReport = await prisma.reports.findUnique({
      where: { id: reportId }
    });
    
    if (!existingReport) {
      return NextResponse.json({ 
        error: 'Rapport non trouvé' 
      }, { status: 404 });
    }
    
    // Vérifier s'il existe des dépendances (historique, modèles, etc.)
    const hasHistory = await prisma.report_history.count({
      where: { report_id: reportId }
    });
    
    const hasTemplates = await prisma.report_templates.count({
      where: { report_id: reportId }
    });
    
    const hasSchedules = await prisma.report_schedule.count({
      where: { report_id: reportId }
    });
    
    if (hasHistory > 0 || hasTemplates > 0 || hasSchedules > 0) {
      return NextResponse.json({ 
        error: 'Impossible de supprimer ce rapport car il est utilisé par d\'autres entités',
        dependencies: {
          history: hasHistory > 0,
          templates: hasTemplates > 0,
          schedules: hasSchedules > 0
        }
      }, { status: 409 });
    }
    
    // Supprimer le rapport de la base de données
    await prisma.reports.delete({
      where: { id: reportId }
    });
    
    return NextResponse.json({
      success: true,
      id,
      message: 'Rapport supprimé avec succès'
    });
    
  } catch (error) {
    console.error('Error deleting report:', error);
    return NextResponse.json({ 
      error: 'Erreur lors de la suppression du rapport' 
    }, { status: 500 });
  }
} 