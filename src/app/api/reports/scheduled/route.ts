import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// Interface pour les rapports programmés
interface ScheduledReport {
  id: string;
  title: string;
  reportType: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  schedule: {
    days?: number[];   // Jours de la semaine (0-6, dimanche=0)
    time: string;      // Heure au format HH:MM
    dayOfMonth?: number; // Jour du mois pour les rapports mensuels
  };
  recipients: string[];
  formats: string[];   // 'pdf', 'excel', etc.
  parameters: Record<string, any>;
  lastGenerated?: string;
  nextGeneration?: string;
  status: 'active' | 'paused' | 'error';
  createdAt: string;
  updatedAt: string;
}

// Récupérer la liste des rapports programmés depuis la base de données
async function getScheduledReports(): Promise<ScheduledReport[]> {
  try {
    const scheduledReportsDb = await prisma.report_schedule.findMany({
      include: {
        report: true
      }
    });
    
    return scheduledReportsDb.map(report => ({
      id: report.id.toString(),
      title: report.title,
      reportType: report.report.report_type,
      frequency: report.frequency as 'daily' | 'weekly' | 'monthly',
      schedule: report.schedule as any,
      recipients: (report.recipients as any)?.emails || [],
      formats: (report.formats as any)?.formats || ['pdf'],
      parameters: report.parameters as Record<string, any> || {},
      lastGenerated: report.last_run?.toISOString(),
      nextGeneration: report.next_run?.toISOString(),
      status: report.status as 'active' | 'paused' | 'error',
      createdAt: report.created_at.toISOString(),
      updatedAt: report.updated_at.toISOString()
    }));
  } catch (error) {
    console.error('Error fetching scheduled reports:', error);
    // Fallback to static data in case of error
    return getStaticScheduledReports();
  }
}

// Récupérer un rapport programmé spécifique par ID
async function getScheduledReportById(id: string): Promise<ScheduledReport | null> {
  try {
    const reportId = parseInt(id, 10);
    if (isNaN(reportId)) {
      return null;
    }
    
    const report = await prisma.report_schedule.findUnique({
      where: { id: reportId },
      include: { report: true }
    });
    
    if (!report) {
      return null;
    }
    
    return {
      id: report.id.toString(),
      title: report.title,
      reportType: report.report.report_type,
      frequency: report.frequency as 'daily' | 'weekly' | 'monthly',
      schedule: report.schedule as any,
      recipients: (report.recipients as any)?.emails || [],
      formats: (report.formats as any)?.formats || ['pdf'],
      parameters: report.parameters as Record<string, any> || {},
      lastGenerated: report.last_run?.toISOString(),
      nextGeneration: report.next_run?.toISOString(),
      status: report.status as 'active' | 'paused' | 'error',
      createdAt: report.created_at.toISOString(),
      updatedAt: report.updated_at.toISOString()
    };
  } catch (error) {
    console.error(`Error fetching scheduled report with ID ${id}:`, error);
    return null;
  }
}

// Générer des rapports programmés statiques (fallback)
function getStaticScheduledReports(): ScheduledReport[] {
  return [
    {
      id: "sched_001",
      title: "Rapport d'accès quotidien",
      reportType: "daily-access",
      frequency: "daily",
      schedule: {
        time: "08:00"
      },
      recipients: ["direction@entreprise.com"],
      formats: ["pdf", "excel"],
      parameters: {
        includeWeekends: false
      },
      lastGenerated: "2025-05-14T08:00:00Z",
      nextGeneration: "2025-05-15T08:00:00Z",
      status: "active",
      createdAt: "2025-01-01T00:00:00Z",
      updatedAt: "2025-01-01T00:00:00Z"
    },
    {
      id: "sched_002",
      title: "Rapport d'anomalies",
      reportType: "anomalies",
      frequency: "daily",
      schedule: {
        time: "08:00"
      },
      recipients: ["securite@entreprise.com"],
      formats: ["pdf"],
      parameters: {
        severity: "high",
        includeResolved: false
      },
      lastGenerated: "2025-05-14T08:00:00Z",
      nextGeneration: "2025-05-15T08:00:00Z",
      status: "active",
      createdAt: "2025-01-01T00:00:00Z",
      updatedAt: "2025-01-01T00:00:00Z"
    },
    {
      id: "sched_003",
      title: "Rapport d'accès hebdomadaire",
      reportType: "weekly-access",
      frequency: "weekly",
      schedule: {
        days: [1], // Lundi
        time: "09:00"
      },
      recipients: ["direction@entreprise.com", "rh@entreprise.com"],
      formats: ["pdf", "excel"],
      parameters: {
        includeWeekends: true,
        groupByDepartment: true
      },
      lastGenerated: "2025-05-13T09:00:00Z",
      nextGeneration: "2025-05-20T09:00:00Z",
      status: "active",
      createdAt: "2025-01-01T00:00:00Z",
      updatedAt: "2025-01-01T00:00:00Z"
    },
    {
      id: "sched_004",
      title: "Rapport de présence par département",
      reportType: "department-presence",
      frequency: "weekly",
      schedule: {
        days: [1], // Lundi
        time: "09:00"
      },
      recipients: ["rh@entreprise.com"],
      formats: ["pdf", "excel"],
      parameters: {
        includeWeekends: false,
        calculateAverages: true
      },
      lastGenerated: "2025-05-13T09:00:00Z",
      nextGeneration: "2025-05-20T09:00:00Z",
      status: "active",
      createdAt: "2025-01-01T00:00:00Z",
      updatedAt: "2025-01-01T00:00:00Z"
    }
  ];
}

// Calculer la prochaine date d'exécution en fonction de la fréquence
function calculateNextRunDate(frequency: string, schedule: any): Date {
  const now = new Date();
  let nextGeneration = new Date();
  
  switch (frequency) {
    case 'daily':
      // Prochaine génération demain à l'heure spécifiée
      nextGeneration.setDate(now.getDate() + 1);
      break;
    case 'weekly':
      // Prochaine génération la semaine prochaine au jour et à l'heure spécifiés
      const targetDay = schedule.days ? schedule.days[0] : 1; // Par défaut lundi
      const daysToAdd = (targetDay + 7 - now.getDay()) % 7 || 7; // Si c'est déjà ce jour, +7 jours
      nextGeneration.setDate(now.getDate() + daysToAdd);
      break;
    case 'monthly':
      // Prochaine génération le mois prochain au jour et à l'heure spécifiés
      nextGeneration.setMonth(now.getMonth() + 1);
      if (schedule.dayOfMonth) {
        nextGeneration.setDate(schedule.dayOfMonth);
      }
      break;
  }
  
  // Définir l'heure spécifiée
  if (schedule.time) {
    const [hours, minutes] = schedule.time.split(':').map(Number);
    nextGeneration.setHours(hours, minutes, 0, 0);
  }
  
  return nextGeneration;
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
    const id = searchParams.get('id');

    if (id) {
      // Récupérer un rapport programmé spécifique
      const report = await getScheduledReportById(id);
      
      if (!report) {
        return NextResponse.json({ error: 'Rapport programmé non trouvé' }, { status: 404 });
      }
      
      return NextResponse.json(report);
    } else {
      // Récupérer tous les rapports programmés
      const reports = await getScheduledReports();
      return NextResponse.json(reports);
    }
  } catch (error) {
    console.error('Error in scheduled reports API:', error);
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

    // Récupérer et valider les données du rapport programmé
    const data = await request.json();
    
    // Vérifier les champs obligatoires
    if (!data.title || !data.reportType || !data.frequency || !data.schedule || !data.recipients) {
      return NextResponse.json({ 
        error: 'Données incomplètes. Les champs title, reportType, frequency, schedule et recipients sont obligatoires' 
      }, { status: 400 });
    }

    // Récupérer l'ID du rapport à partir du type
    const report = await prisma.reports.findFirst({
      where: { report_type: data.reportType }
    });
    
    if (!report) {
      return NextResponse.json({ 
        error: 'Type de rapport non trouvé' 
      }, { status: 404 });
    }
    
    // Calculer la prochaine date d'exécution
    const nextRunDate = calculateNextRunDate(data.frequency, data.schedule);
    
    // Créer le rapport programmé dans la base de données
    const newScheduledReport = await prisma.report_schedule.create({
      data: {
        report_id: report.id,
        title: data.title,
        frequency: data.frequency,
        schedule: data.schedule as any,
        recipients: { emails: data.recipients } as any,
        formats: { formats: data.formats || ['pdf'] } as any,
        parameters: data.parameters || {},
        status: 'active',
        created_by: session?.user ? parseInt(session.user.id as string) : null,
        next_run: nextRunDate
      },
      include: {
        report: true
      }
    });
    
    // Transformer le résultat pour correspondre à l'interface attendue
    const result: ScheduledReport = {
      id: newScheduledReport.id.toString(),
      title: newScheduledReport.title,
      reportType: newScheduledReport.report.report_type,
      frequency: newScheduledReport.frequency as 'daily' | 'weekly' | 'monthly',
      schedule: newScheduledReport.schedule as any,
      recipients: (newScheduledReport.recipients as any)?.emails || [],
      formats: (newScheduledReport.formats as any)?.formats || ['pdf'],
      parameters: newScheduledReport.parameters as Record<string, any> || {},
      nextGeneration: newScheduledReport.next_run?.toISOString(),
      status: newScheduledReport.status as 'active',
      createdAt: newScheduledReport.created_at.toISOString(),
      updatedAt: newScheduledReport.updated_at.toISOString()
    };
    
    return NextResponse.json({
      success: true,
      id: result.id,
      message: 'Rapport programmé créé avec succès',
      report: result
    });
    
  } catch (error) {
    console.error('Error creating scheduled report:', error);
    return NextResponse.json({ 
      error: 'Erreur lors de la création du rapport programmé' 
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
    const existingReport = await prisma.report_schedule.findUnique({
      where: { id: reportId }
    });
    
    if (!existingReport) {
      return NextResponse.json({ 
        error: 'Rapport programmé non trouvé' 
      }, { status: 404 });
    }
    
    // Préparer les données à mettre à jour
    const updateData: any = {};
    
    if (data.title) updateData.title = data.title;
    if (data.frequency) updateData.frequency = data.frequency;
    if (data.schedule) updateData.schedule = data.schedule;
    if (data.recipients) updateData.recipients = { emails: data.recipients };
    if (data.formats) updateData.formats = { formats: data.formats };
    if (data.parameters) updateData.parameters = data.parameters;
    if (data.status) updateData.status = data.status;
    
    // Recalculer la prochaine date d'exécution si la fréquence ou le planning a changé
    if (data.frequency || data.schedule) {
      const schedule = data.schedule || existingReport.schedule;
      const frequency = data.frequency || existingReport.frequency;
      updateData.next_run = calculateNextRunDate(frequency, schedule);
    }
    
    // Mettre à jour le rapport dans la base de données
    await prisma.report_schedule.update({
      where: { id: reportId },
      data: updateData
    });
    
    return NextResponse.json({
      success: true,
      id: data.id,
      message: 'Rapport programmé mis à jour avec succès'
    });
    
  } catch (error) {
    console.error('Error updating scheduled report:', error);
    return NextResponse.json({ 
      error: 'Erreur lors de la mise à jour du rapport programmé' 
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
    const existingReport = await prisma.report_schedule.findUnique({
      where: { id: reportId }
    });
    
    if (!existingReport) {
      return NextResponse.json({ 
        error: 'Rapport programmé non trouvé' 
      }, { status: 404 });
    }
    
    // Supprimer le rapport de la base de données
    await prisma.report_schedule.delete({
      where: { id: reportId }
    });
    
    return NextResponse.json({
      success: true,
      id,
      message: 'Rapport programmé supprimé avec succès'
    });
    
  } catch (error) {
    console.error('Error deleting scheduled report:', error);
    return NextResponse.json({ 
      error: 'Erreur lors de la suppression du rapport programmé' 
    }, { status: 500 });
  }
} 