import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions, isAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Schéma de validation pour la création d'un projet
const createProjectSchema = z.object({
  name: z.string().min(3, "Le nom doit contenir au moins 3 caractères"),
  code: z.string().min(2, "Le code doit contenir au moins 2 caractères"),
  description: z.string().optional(),
  status: z.enum(['active', 'completed', 'paused', 'cancelled']).default('active'),
  start_date: z.string().refine(value => !isNaN(Date.parse(value)), {
    message: "Date de début invalide"
  }).optional(),
  end_date: z.string().refine(value => !isNaN(Date.parse(value)), {
    message: "Date de fin invalide"
  }).optional(),
  client_id: z.number().optional()
});

// Schéma de validation pour la mise à jour d'un projet
const updateProjectSchema = z.object({
  name: z.string().min(3, "Le nom doit contenir au moins 3 caractères").optional(),
  code: z.string().min(2, "Le code doit contenir au moins 2 caractères").optional(),
  description: z.string().optional(),
  status: z.enum(['active', 'completed', 'paused', 'cancelled']).optional(),
  start_date: z.string().refine(value => !isNaN(Date.parse(value)), {
    message: "Date de début invalide"
  }).optional().nullable(),
  end_date: z.string().refine(value => !isNaN(Date.parse(value)), {
    message: "Date de fin invalide"
  }).optional().nullable(),
  client_id: z.number().optional().nullable()
});

/**
 * GET /api/projects
 * Récupérer la liste des projets
 */
export async function GET(req: NextRequest) {
  try {
    // Vérifier l'authentification
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: "Authentification requise" }, { status: 401 });
    }

    // Extraire les paramètres de requête
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const search = url.searchParams.get('search') || '';
    const status = url.searchParams.get('status') || '';
    
    // Calculer le décalage pour la pagination
    const skip = (page - 1) * limit;
    
    // Construire la requête avec les filtres
    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { code: { contains: search } },
        { description: { contains: search } }
      ];
    }
    
    if (status) {
      where.status = status;
    }
    
    // Récupérer les projets avec pagination
    const projects = await prisma.project.findMany({
      where,
      include: {
        _count: {
          select: {
            tasks: true,
            timesheet_entries: true
          }
        }
      },
      skip,
      take: limit,
      orderBy: [
        { status: 'asc' },
        { name: 'asc' }
      ]
    });
    
    // Compter le nombre total de projets pour la pagination
    const total = await prisma.project.count({ where });
    
    // Récupérer la liste des statuts distincts pour les filtres
    const statuses = await prisma.project.findMany({
      select: {
        status: true
      },
      distinct: ['status'],
      orderBy: {
        status: 'asc'
      }
    });
    
    return NextResponse.json({
      projects,
      statuses: statuses.map(s => s.status),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error: any) {
    console.error('Erreur lors de la récupération des projets:', error);
    return NextResponse.json(
      { error: "Erreur serveur lors de la récupération des projets" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/projects
 * Créer un nouveau projet
 */
export async function POST(req: NextRequest) {
  try {
    // Vérifier l'authentification et les permissions
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: "Authentification requise" }, { status: 401 });
    }
    
    // Seuls les admins et les managers peuvent créer des projets
    if (!(isAdmin(session) || session.user.role === 'manager')) {
      return NextResponse.json({ error: "Permission refusée" }, { status: 403 });
    }
    
    // Extraire et valider les données
    const body = await req.json();
    const validationResult = createProjectSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Données invalides", details: validationResult.error.format() },
        { status: 400 }
      );
    }
    
    const { name, code, description, status, start_date, end_date, client_id } = validationResult.data;
    
    // Vérifier si le code est déjà utilisé (doit être unique)
    const existingProject = await prisma.project.findFirst({
      where: { code }
    });
    
    if (existingProject) {
      return NextResponse.json(
        { error: "Un projet avec ce code existe déjà" },
        { status: 400 }
      );
    }
    
    // Si les dates sont spécifiées, vérifier que la date de fin est après la date de début
    if (start_date && end_date) {
      const startDateObj = new Date(start_date);
      const endDateObj = new Date(end_date);
      
      if (endDateObj < startDateObj) {
        return NextResponse.json(
          { error: "La date de fin doit être après la date de début" },
          { status: 400 }
        );
      }
    }
    
    // Créer le projet
    const project = await prisma.project.create({
      data: {
        name,
        code,
        description,
        status,
        start_date: start_date ? new Date(start_date) : null,
        end_date: end_date ? new Date(end_date) : null,
        client_id,
        created_at: new Date(),
        updated_at: new Date()
      }
    });
    
    return NextResponse.json(project, { status: 201 });
  } catch (error: any) {
    console.error('Erreur lors de la création du projet:', error);
    return NextResponse.json(
      { error: "Erreur serveur lors de la création du projet" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/projects
 * Mise à jour massive de projets
 */
export async function PATCH(req: NextRequest) {
  try {
    // Vérifier l'authentification et les permissions
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: "Authentification requise" }, { status: 401 });
    }
    
    // Seuls les admins et les managers peuvent mettre à jour les projets
    if (!(isAdmin(session) || session.user.role === 'manager')) {
      return NextResponse.json({ error: "Permission refusée" }, { status: 403 });
    }
    
    // Extraire les données
    const body = await req.json();
    const { projectIds, action, data } = body;
    
    if (!projectIds || !Array.isArray(projectIds) || projectIds.length === 0) {
      return NextResponse.json(
        { error: "Liste d'IDs de projets requise" },
        { status: 400 }
      );
    }
    
    if (!action) {
      return NextResponse.json(
        { error: "Action requise" },
        { status: 400 }
      );
    }
    
    let result;
    
    switch (action) {
      case 'updateStatus':
        if (!data?.status || !['active', 'completed', 'paused', 'cancelled'].includes(data.status)) {
          return NextResponse.json(
            { error: "Statut valide requis" },
            { status: 400 }
          );
        }
        
        result = await prisma.project.updateMany({
          where: { id: { in: projectIds.map(Number) } },
          data: {
            status: data.status,
            updated_at: new Date()
          }
        });
        break;
      
      case 'delete':
        // Vérifier si les projets ont des entrées de feuille de temps
        const projectsWithEntries = await prisma.timesheet_entry.findMany({
          where: {
            project_id: { in: projectIds.map(Number) }
          },
          select: {
            project_id: true
          },
          distinct: ['project_id']
        });
        
        if (projectsWithEntries.length > 0) {
          return NextResponse.json({
            error: "Certains projets ont des entrées de feuille de temps et ne peuvent pas être supprimés",
            projectIds: projectsWithEntries.map(p => p.project_id)
          }, { status: 400 });
        }
        
        // Supprimer d'abord les tâches associées
        await prisma.task.deleteMany({
          where: {
            project_id: { in: projectIds.map(Number) }
          }
        });
        
        // Puis supprimer les projets
        result = await prisma.project.deleteMany({
          where: {
            id: { in: projectIds.map(Number) }
          }
        });
        break;
        
      default:
        return NextResponse.json(
          { error: "Action non reconnue" },
          { status: 400 }
        );
    }
    
    return NextResponse.json({
      success: true,
      action,
      affected: result.count
    });
  } catch (error: any) {
    console.error('Erreur lors de la mise à jour des projets:', error);
    return NextResponse.json(
      { error: "Erreur serveur lors de la mise à jour des projets" },
      { status: 500 }
    );
  }
} 