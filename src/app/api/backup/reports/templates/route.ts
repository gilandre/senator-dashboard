import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { z } from 'zod';

// Interface pour les modèles de rapports
interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  reportType: string;
  reportId: string;
  parameters: Record<string, any>;
  isDefault: boolean;
  createdBy: {
    id: string;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
}

// Schéma de validation pour la création/mise à jour de modèles de rapports
const reportTemplateSchema = z.object({
  name: z.string().min(1, "Le nom est requis"),
  description: z.string().optional(),
  reportType: z.string().min(1, "Le type de rapport est requis"),
  parameters: z.record(z.any()).optional(),
  isDefault: z.boolean().optional()
});

// Récupérer les modèles de rapports
async function getReportTemplates(
  reportType?: string,
  includeDefaults: boolean = true,
  userId?: string
): Promise<ReportTemplate[]> {
  try {
    // Construire les filtres pour Prisma
    const where: any = {};
    
    if (reportType) {
      // Rechercher le rapport par son type
      const report = await prisma.reports.findFirst({
        where: { report_type: reportType }
      });
      
      if (report) {
        where.report_id = report.id;
      } else {
        // Si le type de rapport n'existe pas, retourner un tableau vide
        return [];
      }
    }
    
    // Filtrer par utilisateur si spécifié et inclure/exclure les modèles par défaut
    if (userId) {
      const parsedUserId = parseInt(userId, 10);
      if (!isNaN(parsedUserId)) {
        if (includeDefaults) {
          // Inclure les modèles par défaut et ceux de l'utilisateur
          where.OR = [
            { created_by: parsedUserId },
            { is_default: true }
          ];
        } else {
          // Uniquement les modèles de l'utilisateur
          where.created_by = parsedUserId;
        }
      }
    } else if (!includeDefaults) {
      // Si on n'inclut pas les modèles par défaut et qu'aucun utilisateur n'est spécifié
      // ... ce qui est un cas étrange, mais on le traite quand même
      where.is_default = false;
    }
    
    // Récupérer les modèles de la base de données
    const templates = await prisma.report_templates.findMany({
      where,
      include: {
        report: true,
        user: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: [
        { is_default: 'desc' },
        { name: 'asc' }
      ]
    });
    
    // Convertir les résultats au format attendu
    return templates.map(template => ({
      id: template.id.toString(),
      name: template.name,
      description: template.description || '',
      reportType: template.report.report_type,
      reportId: template.report_id.toString(),
      parameters: template.parameters as Record<string, any> || {},
      isDefault: template.is_default,
      createdBy: {
        id: template.created_by?.toString() || '0',
        name: template.user?.name || 'Système'
      },
      createdAt: template.created_at.toISOString(),
      updatedAt: template.updated_at.toISOString()
    }));
  } catch (error) {
    console.error('Error fetching report templates:', error);
    return [];
  }
}

// Récupérer un modèle de rapport spécifique par ID
async function getReportTemplateById(id: string): Promise<ReportTemplate | null> {
  try {
    const templateId = parseInt(id, 10);
    if (isNaN(templateId)) {
      return null;
    }
    
    const template = await prisma.report_templates.findUnique({
      where: { id: templateId },
      include: {
        report: true,
        user: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });
    
    if (!template) {
      return null;
    }
    
    return {
      id: template.id.toString(),
      name: template.name,
      description: template.description || '',
      reportType: template.report.report_type,
      reportId: template.report_id.toString(),
      parameters: template.parameters as Record<string, any> || {},
      isDefault: template.is_default,
      createdBy: {
        id: template.created_by?.toString() || '0',
        name: template.user?.name || 'Système'
      },
      createdAt: template.created_at.toISOString(),
      updatedAt: template.updated_at.toISOString()
    };
  } catch (error) {
    console.error(`Error fetching report template with ID ${id}:`, error);
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
    
    if (id) {
      // Récupérer un modèle de rapport spécifique
      const template = await getReportTemplateById(id);
      
      if (!template) {
        return NextResponse.json({ error: 'Modèle de rapport non trouvé' }, { status: 404 });
      }
      
      return NextResponse.json(template);
    } else {
      // Récupérer tous les modèles de rapports avec les filtres
      const reportType = searchParams.get('reportType') || undefined;
      const includeDefaults = searchParams.get('includeDefaults') !== 'false';
      const userId = session?.user?.id || searchParams.get('userId') || undefined;
      
      const templates = await getReportTemplates(reportType, includeDefaults, userId as string);
      return NextResponse.json(templates);
    }
  } catch (error) {
    console.error('Error in report templates API:', error);
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

    // Récupérer les données de la requête
    const data = await request.json();
    
    // Valider les données avec Zod
    const validationResult = reportTemplateSchema.safeParse(data);
    if (!validationResult.success) {
      return NextResponse.json({ 
        error: 'Données invalides',
        details: validationResult.error.format()
      }, { status: 400 });
    }
    
    const validatedData = validationResult.data;
    
    // Rechercher le rapport par son type
    const report = await prisma.reports.findFirst({
      where: { report_type: validatedData.reportType }
    });
    
    if (!report) {
      return NextResponse.json({ 
        error: 'Type de rapport non trouvé' 
      }, { status: 404 });
    }
    
    // Créer le modèle de rapport dans la base de données
    const newTemplate = await prisma.report_templates.create({
      data: {
        name: validatedData.name,
        description: validatedData.description || '',
        report_id: report.id,
        parameters: validatedData.parameters || {},
        is_default: validatedData.isDefault || false,
        created_by: session?.user ? parseInt(session.user.id as string) : null
      },
      include: {
        report: true,
        user: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });
    
    // Convertir le résultat au format attendu
    const result: ReportTemplate = {
      id: newTemplate.id.toString(),
      name: newTemplate.name,
      description: newTemplate.description || '',
      reportType: newTemplate.report.report_type,
      reportId: newTemplate.report_id.toString(),
      parameters: newTemplate.parameters as Record<string, any> || {},
      isDefault: newTemplate.is_default,
      createdBy: {
        id: newTemplate.created_by?.toString() || '0',
        name: newTemplate.user?.name || session?.user?.name || 'Utilisateur actuel'
      },
      createdAt: newTemplate.created_at.toISOString(),
      updatedAt: newTemplate.updated_at.toISOString()
    };
    
    return NextResponse.json({
      success: true,
      id: result.id,
      message: 'Modèle de rapport créé avec succès',
      template: result
    });
    
  } catch (error) {
    console.error('Error creating report template:', error);
    return NextResponse.json({ 
      error: 'Erreur lors de la création du modèle de rapport' 
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

    // Récupérer les données de la requête
    const data = await request.json();
    
    // Vérifier la présence de l'ID
    if (!data.id) {
      return NextResponse.json({ 
        error: 'ID de modèle manquant' 
      }, { status: 400 });
    }
    
    // Valider le reste des données avec Zod
    const validationSchema = reportTemplateSchema.partial();
    const validationResult = validationSchema.safeParse(data);
    
    if (!validationResult.success) {
      return NextResponse.json({ 
        error: 'Données invalides',
        details: validationResult.error.format()
      }, { status: 400 });
    }
    
    const validatedData = validationResult.data;
    
    // Convertir l'ID en entier
    const templateId = parseInt(data.id, 10);
    if (isNaN(templateId)) {
      return NextResponse.json({ 
        error: 'ID de modèle invalide' 
      }, { status: 400 });
    }
    
    // Vérifier que le modèle existe et que l'utilisateur a le droit de le modifier
    const existingTemplate = await prisma.report_templates.findUnique({
      where: { id: templateId }
    });
    
    if (!existingTemplate) {
      return NextResponse.json({ 
        error: 'Modèle de rapport non trouvé' 
      }, { status: 404 });
    }
    
    // Vérifier que l'utilisateur a le droit de modifier ce modèle
    // (sauf si c'est un modèle par défaut et que l'utilisateur a des droits spéciaux)
    const userId = session?.user ? parseInt(session.user.id as string) : null;
    if (
      !existingTemplate.is_default && 
      existingTemplate.created_by !== null && 
      existingTemplate.created_by !== userId
    ) {
      return NextResponse.json({ 
        error: 'Vous n\'êtes pas autorisé à modifier ce modèle' 
      }, { status: 403 });
    }
    
    // Préparer les données à mettre à jour
    const updateData: any = {};
    
    if (validatedData.name) updateData.name = validatedData.name;
    if (validatedData.description !== undefined) updateData.description = validatedData.description;
    if (validatedData.parameters) updateData.parameters = validatedData.parameters;
    if (validatedData.isDefault !== undefined) updateData.is_default = validatedData.isDefault;
    
    // Si le type de rapport a changé, mettre à jour le report_id
    if (validatedData.reportType) {
      const report = await prisma.reports.findFirst({
        where: { report_type: validatedData.reportType }
      });
      
      if (!report) {
        return NextResponse.json({ 
          error: 'Type de rapport non trouvé' 
        }, { status: 404 });
      }
      
      updateData.report_id = report.id;
    }
    
    // Mettre à jour le modèle dans la base de données
    await prisma.report_templates.update({
      where: { id: templateId },
      data: updateData
    });
    
    return NextResponse.json({
      success: true,
      id: data.id,
      message: 'Modèle de rapport mis à jour avec succès'
    });
    
  } catch (error) {
    console.error('Error updating report template:', error);
    return NextResponse.json({ 
      error: 'Erreur lors de la mise à jour du modèle de rapport' 
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
        error: 'ID de modèle manquant' 
      }, { status: 400 });
    }
    
    // Convertir l'ID en entier
    const templateId = parseInt(id, 10);
    if (isNaN(templateId)) {
      return NextResponse.json({ 
        error: 'ID de modèle invalide' 
      }, { status: 400 });
    }
    
    // Vérifier que le modèle existe et que l'utilisateur a le droit de le supprimer
    const existingTemplate = await prisma.report_templates.findUnique({
      where: { id: templateId }
    });
    
    if (!existingTemplate) {
      return NextResponse.json({ 
        error: 'Modèle de rapport non trouvé' 
      }, { status: 404 });
    }
    
    // Vérifier que l'utilisateur a le droit de supprimer ce modèle
    const userId = session?.user ? parseInt(session.user.id as string) : null;
    if (
      existingTemplate.is_default || 
      (existingTemplate.created_by !== null && existingTemplate.created_by !== userId)
    ) {
      return NextResponse.json({ 
        error: 'Vous n\'êtes pas autorisé à supprimer ce modèle' 
      }, { status: 403 });
    }
    
    // Supprimer le modèle de la base de données
    await prisma.report_templates.delete({
      where: { id: templateId }
    });
    
    return NextResponse.json({
      success: true,
      id,
      message: 'Modèle de rapport supprimé avec succès'
    });
    
  } catch (error) {
    console.error('Error deleting report template:', error);
    return NextResponse.json({ 
      error: 'Erreur lors de la suppression du modèle de rapport' 
    }, { status: 500 });
  }
} 