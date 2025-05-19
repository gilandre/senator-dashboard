import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// Interface pour l'historique des rapports
interface ReportHistoryEntry {
  id: string;
  title: string;
  reportType: string;
  generatedAt: string;
  completedAt?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  fileUrl?: string;
  fileName?: string;
  fileFormat?: string;
  fileSize?: string;
  generatedBy: {
    id: string;
    name: string;
    email: string;
  };
  parameters?: Record<string, any>;
  error?: string;
}

// Interface pour la pagination
interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  }
}

// Récupérer l'historique des rapports depuis la base de données
async function getReportHistory(
  page = 1, 
  pageSize = 10, 
  filters?: { 
    reportType?: string,
    status?: string,
    startDate?: string,
    endDate?: string,
    userId?: string
  }
): Promise<PaginatedResponse<ReportHistoryEntry>> {
  try {
    // Construire les filtres pour Prisma
    const where: any = {};
    
    if (filters?.reportType) {
      where.report = {
        report_type: filters.reportType
      };
    }
    
    if (filters?.status) {
      where.status = filters.status;
    }
    
    // Filtres de dates
    if (filters?.startDate || filters?.endDate) {
      where.generated_at = {};
      
      if (filters?.startDate) {
        where.generated_at.gte = new Date(filters.startDate);
      }
      
      if (filters?.endDate) {
        where.generated_at.lte = new Date(filters.endDate);
      }
    }
    
    // Filtrer par utilisateur
    if (filters?.userId) {
      where.user_id = parseInt(filters.userId);
    }
    
    // Compter le nombre total d'éléments pour la pagination
    const totalItems = await prisma.report_history.count({ where });
    const totalPages = Math.ceil(totalItems / pageSize);
    
    // Récupérer les éléments pour la page actuelle
    const items = await prisma.report_history.findMany({
      where,
      include: {
        report: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: {
        generated_at: 'desc'
      }
    });
    
    // Convertir les résultats de la base de données au format attendu
    const data = items.map(item => ({
      id: item.id.toString(),
      title: item.title,
      reportType: item.report.report_type,
      generatedAt: item.generated_at.toISOString(),
      completedAt: item.completed_at?.toISOString(),
      status: item.status as 'pending' | 'processing' | 'completed' | 'failed',
      fileUrl: item.file_url ?? undefined,
      fileName: item.file_name ?? undefined,
      fileFormat: item.file_format ?? undefined,
      fileSize: item.file_size ? `${item.file_size}` : undefined,
      generatedBy: {
        id: item.user_id.toString(),
        name: item.user?.name || 'Utilisateur inconnu',
        email: item.user?.email || 'email@inconnu.com'
      },
      parameters: item.parameters as Record<string, any> || {},
      error: item.error_message ?? undefined
    }));
    
    return {
      data,
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages
      }
    };
  } catch (error) {
    console.error('Error fetching report history:', error);
    // En cas d'erreur, retourner une réponse paginée vide
    return {
      data: [],
      pagination: {
        page,
        pageSize,
        totalItems: 0,
        totalPages: 0
      }
    };
  }
}

// Obtenir les détails d'un rapport spécifique de l'historique
async function getReportHistoryById(id: string): Promise<ReportHistoryEntry | null> {
  try {
    const reportId = parseInt(id, 10);
    if (isNaN(reportId)) {
      return null;
    }
    
    const item = await prisma.report_history.findUnique({
      where: { id: reportId },
      include: {
        report: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });
    
    if (!item) {
      return null;
    }
    
    return {
      id: item.id.toString(),
      title: item.title,
      reportType: item.report.report_type,
      generatedAt: item.generated_at.toISOString(),
      completedAt: item.completed_at?.toISOString(),
      status: item.status as 'pending' | 'processing' | 'completed' | 'failed',
      fileUrl: item.file_url ?? undefined,
      fileName: item.file_name ?? undefined,
      fileFormat: item.file_format ?? undefined,
      fileSize: item.file_size ? `${item.file_size}` : undefined,
      generatedBy: {
        id: item.user_id.toString(),
        name: item.user?.name || 'Utilisateur inconnu',
        email: item.user?.email || 'email@inconnu.com'
      },
      parameters: item.parameters as Record<string, any> || {},
      error: item.error_message ?? undefined
    };
  } catch (error) {
    console.error(`Error fetching report history with ID ${id}:`, error);
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
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');
    const startIndex = (page - 1) * pageSize;
    const status = searchParams.get('status');
    const reportId = searchParams.get('reportId');
    const userId = searchParams.get('userId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    
    // Construire les filtres
    const filters: any = {};
    
    if (status) {
      filters.status = status;
    }
    
    if (reportId) {
      filters.report_id = parseInt(reportId);
    }
    
    if (userId) {
      filters.user_id = parseInt(userId);
    }
    
    // Filtre par date
    if (startDate || endDate) {
      filters.generated_at = {};
      
      if (startDate) {
        filters.generated_at.gte = new Date(startDate);
      }
      
      if (endDate) {
        const endDateObj = new Date(endDate);
        endDateObj.setHours(23, 59, 59, 999);
        filters.generated_at.lte = endDateObj;
      }
    }
    
    // Récupérer le nombre total d'éléments pour la pagination
    const totalItems = await prisma.report_history.count({
      where: filters
    });
    
    // Calculer le nombre total de pages
    const totalPages = Math.ceil(totalItems / pageSize);
    
    // Récupérer les éléments de l'historique avec les rapports associés
    const historyItems = await prisma.report_history.findMany({
      where: filters,
      include: {
        report: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        generated_at: 'desc'
      },
      skip: startIndex,
      take: pageSize
    });
    
    // Formater les données pour le client
    const formattedItems = historyItems.map(item => ({
      id: item.id.toString(),
      reportId: item.report_id.toString(),
      reportName: item.report.title,
      reportType: item.report.report_type,
      title: item.title,
      status: item.status,
      generatedAt: item.generated_at.toISOString(),
      completedAt: item.completed_at ? item.completed_at.toISOString() : null,
      fileUrl: item.file_url,
      fileName: item.file_name,
      fileSize: item.file_size,
      fileFormat: item.file_format,
      parameters: item.parameters,
      error: item.error_message,
      user: item.user ? {
        id: item.user.id.toString(),
        name: item.user.name,
        email: item.user.email
      } : null
    }));
    
    return NextResponse.json({
      data: formattedItems,
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages
      }
    });
    
  } catch (error) {
    console.error('Error in report history API:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération de l\'historique des rapports' },
      { status: 500 }
    );
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
    const existingReport = await prisma.report_history.findUnique({
      where: { id: reportId }
    });
    
    if (!existingReport) {
      return NextResponse.json({ 
        error: 'Rapport non trouvé dans l\'historique' 
      }, { status: 404 });
    }
    
    // Supprimer le rapport de la base de données
    await prisma.report_history.delete({
      where: { id: reportId }
    });
    
    return NextResponse.json({
      success: true,
      id,
      message: 'Rapport supprimé de l\'historique avec succès'
    });
    
  } catch (error) {
    console.error('Error deleting report from history:', error);
    return NextResponse.json({ 
      error: 'Erreur lors de la suppression du rapport de l\'historique' 
    }, { status: 500 });
  }
} 