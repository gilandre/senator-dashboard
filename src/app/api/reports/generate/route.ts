import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import path from 'path';
import fs from 'fs';
import { PassThrough } from 'stream';

// Types de rapports disponibles
export enum ReportType {
  DAILY_ACCESS = "daily-access",
  WEEKLY_ACCESS = "weekly-access",
  MONTHLY_ACCESS = "monthly-access",
  DEPARTMENT_PRESENCE = "department-presence",
  ANOMALIES = "anomalies",
  VISITORS = "visitors",
  SECURITY_INCIDENTS = "security-incidents",
  EMPLOYEE_PRESENCE = "employee-presence"
}

// Langages disponibles pour le format PDF
export enum PdfLanguage {
  FR = "fr",
  EN = "en"
}

// Formats de fichier disponibles
export enum FileFormat {
  PDF = "pdf",
  EXCEL = "xlsx",
  CSV = "csv"
}

// Interface pour le statut d'un rapport
export interface ReportGenerationStatus {
  id: string;
  reportId: string;
  reportType: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  startedAt: string;
  completedAt?: string;
  fileUrl?: string;
  fileSize?: number;
  fileName?: string;
  fileFormat?: string;
  error?: string;
}

// Fonction pour générer un rapport
async function generateReport(
  reportHistoryId: number, 
  reportType: string, 
  parameters: Record<string, any>,
  format: string = 'pdf'
): Promise<ReportGenerationStatus> {
  try {
    // Récupérer l'entrée d'historique
    const historyEntry = await prisma.report_history.findUnique({
      where: { id: reportHistoryId },
      include: { report: true }
    });
    
    if (!historyEntry) {
      throw new Error('Historique de rapport non trouvé');
    }
    
    // Mettre à jour le statut pour indiquer que le rapport est en cours de traitement
    const processingUpdate = await prisma.report_history.update({
      where: { id: reportHistoryId },
      data: {
        status: 'processing'
      }
    });
    
    // Simuler un délai de traitement (entre 3 et 8 secondes)
    const processingTime = Math.floor(Math.random() * 5000) + 3000;
    await new Promise(resolve => setTimeout(resolve, processingTime));
    
    // Simuler une chance d'échec de 5%
    const isSuccess = Math.random() > 0.05;
    
    if (!isSuccess) {
      // Si la génération échoue
      const failureUpdate = await prisma.report_history.update({
        where: { id: reportHistoryId },
        data: {
          status: 'failed',
          error_message: 'Erreur lors de la génération du rapport : données incompatibles ou incomplètes',
          completed_at: new Date()
        }
      });
      
      return {
        id: failureUpdate.id.toString(),
        reportId: failureUpdate.report_id.toString(),
        reportType: historyEntry.report.report_type,
        status: 'failed',
        startedAt: failureUpdate.generated_at.toISOString(),
        completedAt: failureUpdate.completed_at?.toISOString(),
        error: failureUpdate.error_message || undefined
      };
    }
    
    // Créer le répertoire pour les rapports s'il n'existe pas
    const reportsDir = path.join(process.cwd(), 'public', 'reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
    
    // Générer un nom de fichier unique
    const timestamp = new Date().getTime();
    const fileName = `report_${reportType}_${timestamp}.${format}`;
    const filePath = path.join(reportsDir, fileName);
    const fileUrl = `/reports/${fileName}`;
    
    // Créer un fichier fictif pour la démonstration
    // Dans une implémentation réelle, nous génèrerions le rapport ici
    let fileContent: Buffer;
    let fileSize: number;
    
    if (format === 'pdf') {
      // Générer un PDF factice
      fileContent = Buffer.from('%PDF-1.5\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /Resources 4 0 R /MediaBox [0 0 612 792] /Contents 5 0 R >>\nendobj\n4 0 obj\n<< /Font << /F1 6 0 R >> >>\nendobj\n5 0 obj\n<< /Length 68 >>\nstream\nBT\n/F1 24 Tf\n100 700 Td\n(SenatorFX - Rapport généré) Tj\nET\nendstream\nendobj\n6 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\nxref\n0 7\n0000000000 65535 f\n0000000010 00000 n\n0000000059 00000 n\n0000000118 00000 n\n0000000217 00000 n\n0000000262 00000 n\n0000000380 00000 n\ntrailer\n<< /Size 7 /Root 1 0 R >>\nstartxref\n447\n%%EOF\n', 'utf-8');
    } else if (format === 'xlsx') {
      // Générer un XLSX factice
      fileContent = Buffer.from('PK\u0003\u0004\u0014\u0000\u0000\u0000\u0000\u0000\u0000\u0000!\u0000\u0002\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000[Content_Types].xml', 'utf-8');
    } else {
      // Générer un CSV factice
      const lines = [
        'Date,Entrée,Sortie,Utilisateur,Département',
        '2023-01-01,08:30,17:30,Jean Dupont,IT',
        '2023-01-01,08:45,17:15,Marie Martin,RH',
        '2023-01-02,08:20,18:00,Julien Dubois,Finance',
        '2023-01-02,09:00,17:00,Sophie Leclerc,Marketing'
      ];
      fileContent = Buffer.from(lines.join('\n'), 'utf-8');
    }
    
    fileSize = fileContent.length;
    
    // Écrire le fichier
    fs.writeFileSync(filePath, fileContent);
    
    // Mettre à jour l'entrée d'historique pour indiquer que le rapport est terminé
    const successUpdate = await prisma.report_history.update({
      where: { id: reportHistoryId },
      data: {
        status: 'completed',
        completed_at: new Date(),
        file_url: fileUrl,
        file_name: fileName,
        file_format: format,
        file_size: fileSize
      }
    });
    
    return {
      id: successUpdate.id.toString(),
      reportId: successUpdate.report_id.toString(),
      reportType: historyEntry.report.report_type,
      status: 'completed',
      startedAt: successUpdate.generated_at.toISOString(),
      completedAt: successUpdate.completed_at?.toISOString(),
      fileUrl,
      fileSize,
      fileName,
      fileFormat: format
    };
  } catch (error) {
    console.error('Error generating report:', error);
    
    // Mettre à jour l'entrée d'historique pour indiquer que la génération a échoué
    try {
      const failureUpdate = await prisma.report_history.update({
        where: { id: reportHistoryId },
        data: {
          status: 'failed',
          error_message: `Erreur lors de la génération du rapport: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
          completed_at: new Date()
        },
        include: { report: true }
      });
      
      return {
        id: failureUpdate.id.toString(),
        reportId: failureUpdate.report_id.toString(),
        reportType: failureUpdate.report.report_type,
        status: 'failed',
        startedAt: failureUpdate.generated_at.toISOString(),
        completedAt: failureUpdate.completed_at?.toISOString(),
        error: failureUpdate.error_message || undefined
      };
    } catch (updateError) {
      console.error('Error updating report status:', updateError);
      throw error;
    }
  }
}

// Fonction pour récupérer le statut d'un rapport
async function getReportStatus(id: string): Promise<ReportGenerationStatus | null> {
  try {
    const reportId = parseInt(id, 10);
    if (isNaN(reportId)) {
      return null;
    }
    
    const report = await prisma.report_history.findUnique({
      where: { id: reportId },
      include: { report: true }
    });
    
    if (!report) {
      return null;
    }
    
    return {
      id: report.id.toString(),
      reportId: report.report_id.toString(),
      reportType: report.report.report_type,
      status: report.status as 'pending' | 'processing' | 'completed' | 'failed',
      startedAt: report.generated_at.toISOString(),
      completedAt: report.completed_at?.toISOString(),
      fileUrl: report.file_url || undefined,
      fileSize: report.file_size || undefined,
      fileName: report.file_name || undefined,
      fileFormat: report.file_format || undefined,
      error: report.error_message || undefined
    };
  } catch (error) {
    console.error('Error fetching report status:', error);
    return null;
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
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'ID de rapport manquant' }, { status: 400 });
    }
    
    const status = await getReportStatus(id);
    
    if (!status) {
      return NextResponse.json({ error: 'Rapport non trouvé' }, { status: 404 });
    }
    
    return NextResponse.json(status);
  } catch (error) {
    console.error('Error in get report status API:', error);
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

    const data = await request.json();
    
    // Valider les données requises
    if (!data.reportType) {
      return NextResponse.json(
        { error: 'Type de rapport manquant' },
        { status: 400 }
      );
    }
    
    // Récupérer le rapport en fonction du type
    const report = await prisma.reports.findFirst({
      where: { report_type: data.reportType }
    });
    
    if (!report) {
      return NextResponse.json(
        { error: 'Type de rapport non trouvé' },
        { status: 404 }
      );
    }
    
    // Créer une entrée dans l'historique des rapports
    const reportHistory = await prisma.report_history.create({
      data: {
        report_id: report.id,
        user_id: session?.user ? parseInt(session.user.id as string) : null,
        title: data.title || `${report.title} - ${new Date().toLocaleDateString('fr-FR')}`,
        parameters: data.parameters || {},
        status: 'pending',
        generated_at: new Date(),
        file_format: data.format || 'pdf'
      }
    });
    
    // Lancer la génération du rapport (asynchrone)
    generateReport(
      reportHistory.id, 
      data.reportType, 
      data.parameters || {}, 
      data.format || 'pdf'
    ).catch(error => {
      console.error('Error during report generation:', error);
    });
    
    return NextResponse.json({
      success: true,
      reportId: reportHistory.id.toString(),
      message: 'Rapport en cours de génération',
      status: 'pending'
    });
    
  } catch (error) {
    console.error('Error in generate report API:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la génération du rapport' },
      { status: 500 }
    );
  }
} 