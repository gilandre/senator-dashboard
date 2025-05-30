import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Schéma de validation pour la mise à jour d'une entrée de feuille de temps
const updateTimesheetEntrySchema = z.object({
  date: z.string().refine(value => !isNaN(Date.parse(value)), {
    message: "Date invalide"
  }).optional(),
  start_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/, {
    message: "Format d'heure invalide (HH:MM:SS)"
  }).optional(),
  end_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/, {
    message: "Format d'heure invalide (HH:MM:SS)"
  }).optional(),
  break_duration: z.number().min(0).optional(),
  activity_type: z.string().optional(),
  project_id: z.number().optional().nullable(),
  task_id: z.number().optional().nullable(),
  description: z.string().optional(),
  status: z.enum(['draft', 'submitted', 'approved', 'rejected']).optional()
});

/**
 * GET /api/timesheet/[id]
 * Récupérer une entrée de feuille de temps spécifique
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

    const entryId = Number(params.id);
    if (isNaN(entryId)) {
      return NextResponse.json({ error: "ID d'entrée invalide" }, { status: 400 });
    }

    // Récupérer l'entrée
    const entry = await prisma.timesheet_entry.findUnique({
      where: { id: entryId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        project: {
          select: {
            id: true,
            name: true,
            code: true
          }
        },
        task: {
          select: {
            id: true,
            name: true,
            code: true
          }
        }
      }
    });

    if (!entry) {
      return NextResponse.json({ error: "Entrée non trouvée" }, { status: 404 });
    }

    // Vérifier les permissions
    const isAdmin = session.user.role === 'admin';
    const isManager = session.user.role === 'manager';
    const isOwner = entry.user_id === session.user.id;

    if (!isAdmin && !isManager && !isOwner) {
      return NextResponse.json({ error: "Permission refusée" }, { status: 403 });
    }

    return NextResponse.json(entry);
  } catch (error: any) {
    console.error('Erreur lors de la récupération de l\'entrée de feuille de temps:', error);
    return NextResponse.json(
      { error: "Erreur serveur lors de la récupération de l'entrée de feuille de temps" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/timesheet/[id]
 * Mettre à jour une entrée de feuille de temps spécifique
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

    const entryId = Number(params.id);
    if (isNaN(entryId)) {
      return NextResponse.json({ error: "ID d'entrée invalide" }, { status: 400 });
    }

    // Récupérer l'entrée
    const entry = await prisma.timesheet_entry.findUnique({
      where: { id: entryId },
      select: {
        user_id: true,
        status: true
      }
    });

    if (!entry) {
      return NextResponse.json({ error: "Entrée non trouvée" }, { status: 404 });
    }

    // Vérifier les permissions
    const isAdmin = session.user.role === 'admin';
    const isManager = session.user.role === 'manager';
    const isOwner = entry.user_id === session.user.id;

    if (!isAdmin && !isManager && !isOwner) {
      return NextResponse.json({ error: "Permission refusée" }, { status: 403 });
    }

    // Les entrées approuvées ne peuvent être modifiées que par les admins ou les managers
    if (entry.status === 'approved' && !isAdmin && !isManager) {
      return NextResponse.json(
        { error: "Les entrées approuvées ne peuvent pas être modifiées" },
        { status: 403 }
      );
    }

    // Récupérer et valider les données
    const body = await req.json();
    const validationResult = updateTimesheetEntrySchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Données invalides", details: validationResult.error.format() },
        { status: 400 }
      );
    }

    const {
      date,
      start_time,
      end_time,
      break_duration,
      activity_type,
      project_id,
      task_id,
      description,
      status
    } = validationResult.data;

    // Vérifier que l'heure de fin est après l'heure de début si les deux sont fournis
    if (start_time && end_time) {
      const startTimeObj = new Date(`1970-01-01T${start_time}:00Z`);
      const endTimeObj = new Date(`1970-01-01T${end_time}:00Z`);
      
      if (endTimeObj <= startTimeObj) {
        return NextResponse.json(
          { error: "L'heure de fin doit être après l'heure de début" },
          { status: 400 }
        );
      }
    }

    // Si le statut est modifié à "approved", vérifier les permissions
    if (status === 'approved' && !isAdmin && !isManager) {
      return NextResponse.json(
        { error: "Seuls les administrateurs et les managers peuvent approuver les entrées" },
        { status: 403 }
      );
    }

    // Préparer les données pour la mise à jour
    const updateData: any = {};
    
    if (date !== undefined) updateData.date = new Date(date);
    if (start_time !== undefined) updateData.start_time = start_time;
    if (end_time !== undefined) updateData.end_time = end_time;
    if (break_duration !== undefined) updateData.break_duration = break_duration;
    if (activity_type !== undefined) updateData.activity_type = activity_type;
    if (project_id !== undefined) updateData.project_id = project_id;
    if (task_id !== undefined) updateData.task_id = task_id;
    if (description !== undefined) updateData.description = description;
    if (status !== undefined) updateData.status = status;
    
    // Toujours mettre à jour la date de modification
    updateData.updated_at = new Date();

    // Mettre à jour l'entrée
    const updatedEntry = await prisma.timesheet_entry.update({
      where: { id: entryId },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        project: {
          select: {
            id: true,
            name: true,
            code: true
          }
        },
        task: {
          select: {
            id: true,
            name: true,
            code: true
          }
        }
      }
    });

    return NextResponse.json(updatedEntry);
  } catch (error: any) {
    console.error('Erreur lors de la mise à jour de l\'entrée de feuille de temps:', error);
    return NextResponse.json(
      { error: "Erreur serveur lors de la mise à jour de l'entrée de feuille de temps" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/timesheet/[id]
 * Supprimer une entrée de feuille de temps spécifique
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

    const entryId = Number(params.id);
    if (isNaN(entryId)) {
      return NextResponse.json({ error: "ID d'entrée invalide" }, { status: 400 });
    }

    // Récupérer l'entrée
    const entry = await prisma.timesheet_entry.findUnique({
      where: { id: entryId },
      select: {
        user_id: true,
        status: true
      }
    });

    if (!entry) {
      return NextResponse.json({ error: "Entrée non trouvée" }, { status: 404 });
    }

    // Vérifier les permissions
    const isAdmin = session.user.role === 'admin';
    const isManager = session.user.role === 'manager';
    const isOwner = entry.user_id === session.user.id;

    if (!isAdmin && !isOwner) {
      return NextResponse.json({ error: "Permission refusée" }, { status: 403 });
    }

    // Les entrées approuvées ne peuvent être supprimées que par les admins
    if (entry.status === 'approved' && !isAdmin) {
      return NextResponse.json(
        { error: "Les entrées approuvées ne peuvent pas être supprimées" },
        { status: 403 }
      );
    }

    // Supprimer l'entrée
    await prisma.timesheet_entry.delete({
      where: { id: entryId }
    });

    return NextResponse.json({
      success: true,
      message: "Entrée supprimée avec succès"
    });
  } catch (error: any) {
    console.error('Erreur lors de la suppression de l\'entrée de feuille de temps:', error);
    return NextResponse.json(
      { error: "Erreur serveur lors de la suppression de l'entrée de feuille de temps" },
      { status: 500 }
    );
  }
}