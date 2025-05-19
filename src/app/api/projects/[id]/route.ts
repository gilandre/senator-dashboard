import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions, isAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

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
 * GET /api/projects/[id]
 * Récupérer un projet spécifique
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Vérifier l'authentification
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: "Authentification requise" }, { status: 401 });
    }

    const projectId = Number(params.id);
    if (isNaN(projectId)) {
      return NextResponse.json({ error: "ID de projet invalide" }, { status: 400 });
    }

    // Récupérer le projet
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        tasks: {
          orderBy: {
            status: 'asc'
          }
        },
        _count: {
          select: {
            timesheet_entries: true
          }
        }
      }
    });

    if (!project) {
      return NextResponse.json({ error: "Projet non trouvé" }, { status: 404 });
    }

    // Récupérer les statistiques sur les heures de travail
    const timeEntries = await prisma.timesheet_entry.findMany({
      where: {
        project_id: projectId
      },
      select: {
        id: true,
        start_time: true,
        end_time: true,
        break_duration: true,
        date: true,
        status: true
      }
    });

    // Calculer les statistiques
    const totalHours = timeEntries.reduce((total, entry) => {
      const startTime = new Date(`1970-01-01T${entry.start_time}:00Z`);
      const endTime = new Date(`1970-01-01T${entry.end_time}:00Z`);
      const durationMs = endTime.getTime() - startTime.getTime();
      const breakDurationMs = (entry.break_duration || 0) * 60 * 1000;
      const workDurationHours = (durationMs - breakDurationMs) / (1000 * 60 * 60);
      return total + workDurationHours;
    }, 0);

    // Compter les entrées par statut
    const entryCounts = {
      draft: timeEntries.filter(e => e.status === 'draft').length,
      submitted: timeEntries.filter(e => e.status === 'submitted').length,
      approved: timeEntries.filter(e => e.status === 'approved').length,
      rejected: timeEntries.filter(e => e.status === 'rejected').length
    };

    // Ajouter les statistiques au résultat
    const result = {
      ...project,
      statistics: {
        totalHours,
        entryCounts
      }
    };

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Erreur lors de la récupération du projet:', error);
    return NextResponse.json(
      { error: "Erreur serveur lors de la récupération du projet" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/projects/[id]
 * Mettre à jour un projet spécifique
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Vérifier l'authentification
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: "Authentification requise" }, { status: 401 });
    }

    // Seuls les admins et les managers peuvent mettre à jour les projets
    if (!(isAdmin(session) || session.user.role === 'manager')) {
      return NextResponse.json({ error: "Permission refusée" }, { status: 403 });
    }

    const projectId = Number(params.id);
    if (isNaN(projectId)) {
      return NextResponse.json({ error: "ID de projet invalide" }, { status: 400 });
    }

    // Vérifier si le projet existe
    const existingProject = await prisma.project.findUnique({
      where: { id: projectId }
    });

    if (!existingProject) {
      return NextResponse.json({ error: "Projet non trouvé" }, { status: 404 });
    }

    // Récupérer et valider les données
    const body = await req.json();
    const validationResult = updateProjectSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Données invalides", details: validationResult.error.format() },
        { status: 400 }
      );
    }

    const {
      name,
      code,
      description,
      status,
      start_date,
      end_date,
      client_id
    } = validationResult.data;

    // Si le code est modifié, vérifier qu'il n'est pas déjà utilisé
    if (code && code !== existingProject.code) {
      const codeExists = await prisma.project.findFirst({
        where: { 
          code,
          NOT: { id: projectId }
        }
      });

      if (codeExists) {
        return NextResponse.json(
          { error: "Un projet avec ce code existe déjà" },
          { status: 400 }
        );
      }
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

    // Préparer les données pour la mise à jour
    const updateData: any = {};
    
    if (name !== undefined) updateData.name = name;
    if (code !== undefined) updateData.code = code;
    if (description !== undefined) updateData.description = description;
    if (status !== undefined) updateData.status = status;
    if (start_date !== undefined) updateData.start_date = start_date ? new Date(start_date) : null;
    if (end_date !== undefined) updateData.end_date = end_date ? new Date(end_date) : null;
    if (client_id !== undefined) updateData.client_id = client_id;
    
    // Toujours mettre à jour la date de modification
    updateData.updated_at = new Date();

    // Mettre à jour le projet
    const updatedProject = await prisma.project.update({
      where: { id: projectId },
      data: updateData,
      include: {
        tasks: {
          orderBy: {
            status: 'asc'
          }
        }
      }
    });

    return NextResponse.json(updatedProject);
  } catch (error: any) {
    console.error('Erreur lors de la mise à jour du projet:', error);
    return NextResponse.json(
      { error: "Erreur serveur lors de la mise à jour du projet" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/projects/[id]
 * Supprimer un projet spécifique
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Vérifier l'authentification
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: "Authentification requise" }, { status: 401 });
    }

    // Seuls les admins et les managers peuvent supprimer des projets
    if (!(isAdmin(session) || session.user.role === 'manager')) {
      return NextResponse.json({ error: "Permission refusée" }, { status: 403 });
    }

    const projectId = Number(params.id);
    if (isNaN(projectId)) {
      return NextResponse.json({ error: "ID de projet invalide" }, { status: 400 });
    }

    // Vérifier si le projet existe
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        _count: {
          select: {
            timesheet_entries: true
          }
        }
      }
    });

    if (!project) {
      return NextResponse.json({ error: "Projet non trouvé" }, { status: 404 });
    }

    // Vérifier si le projet a des entrées de feuille de temps
    if (project._count.timesheet_entries > 0) {
      return NextResponse.json(
        { error: "Ce projet a des entrées de feuille de temps et ne peut pas être supprimé" },
        { status: 400 }
      );
    }

    // Supprimer d'abord les tâches associées
    await prisma.task.deleteMany({
      where: {
        project_id: projectId
      }
    });

    // Puis supprimer le projet
    await prisma.project.delete({
      where: { id: projectId }
    });

    return NextResponse.json({
      success: true,
      message: "Projet supprimé avec succès"
    });
  } catch (error: any) {
    console.error('Erreur lors de la suppression du projet:', error);
    return NextResponse.json(
      { error: "Erreur serveur lors de la suppression du projet" },
      { status: 500 }
    );
  }
} 