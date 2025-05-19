import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Schéma de validation pour la création d'une entrée de feuille de temps
const createTimesheetEntrySchema = z.object({
  date: z.string().refine(value => !isNaN(Date.parse(value)), {
    message: "Date invalide"
  }),
  start_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: "Format d'heure invalide (HH:MM)"
  }),
  end_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: "Format d'heure invalide (HH:MM)"
  }),
  break_duration: z.number().min(0).optional(),
  activity_type: z.string(),
  project_id: z.number().optional(),
  task_id: z.number().optional(),
  description: z.string().optional(),
  status: z.enum(['draft', 'submitted', 'approved', 'rejected']).default('draft')
});

// Schéma de validation pour la mise à jour d'une entrée de feuille de temps
const updateTimesheetEntrySchema = z.object({
  date: z.string().refine(value => !isNaN(Date.parse(value)), {
    message: "Date invalide"
  }).optional(),
  start_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: "Format d'heure invalide (HH:MM)"
  }).optional(),
  end_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: "Format d'heure invalide (HH:MM)"
  }).optional(),
  break_duration: z.number().min(0).optional(),
  activity_type: z.string().optional(),
  project_id: z.number().optional().nullable(),
  task_id: z.number().optional().nullable(),
  description: z.string().optional(),
  status: z.enum(['draft', 'submitted', 'approved', 'rejected']).optional()
});

/**
 * GET /api/timesheet
 * Récupérer les entrées de feuille de temps de l'utilisateur
 */
export async function GET(req: NextRequest) {
  try {
    // Vérifier l'authentification
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: "Authentification requise" }, { status: 401 });
    }

    // Récupérer les paramètres de requête
    const url = new URL(req.url);
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');
    const userId = url.searchParams.get('userId');
    const projectId = url.searchParams.get('projectId');
    const status = url.searchParams.get('status');
    
    // Construire la requête de filtrage
    let where: any = {};
    
    // Filtrer par utilisateur (l'utilisateur courant par défaut)
    if (userId && (session.user.role === 'admin' || session.user.role === 'manager')) {
      where.user_id = parseInt(userId);
    } else {
      where.user_id = session.user.id;
    }
    
    // Filtrer par date
    if (startDate || endDate) {
      where.date = {};
      if (startDate) {
        where.date.gte = new Date(startDate);
      }
      if (endDate) {
        where.date.lte = new Date(endDate);
      }
    }
    
    // Filtrer par projet
    if (projectId) {
      where.project_id = parseInt(projectId);
    }
    
    // Filtrer par statut
    if (status) {
      where.status = status;
    }
    
    // Récupérer les entrées
    const timeEntries = await prisma.timesheet_entry.findMany({
      where,
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
      },
      orderBy: {
        date: 'desc'
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
    
    return NextResponse.json({
      entries: timeEntries,
      statistics: {
        totalHours,
        count: timeEntries.length
      }
    });
  } catch (error: any) {
    console.error('Erreur lors de la récupération des feuilles de temps:', error);
    return NextResponse.json(
      { error: "Erreur serveur lors de la récupération des feuilles de temps" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/timesheet
 * Créer une nouvelle entrée de feuille de temps
 */
export async function POST(req: NextRequest) {
  try {
    // Vérifier l'authentification
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: "Authentification requise" }, { status: 401 });
    }
    
    // Récupérer les données
    const body = await req.json();
    
    // Valider les données
    const validationResult = createTimesheetEntrySchema.safeParse(body);
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
    
    // Vérifier que l'heure de fin est après l'heure de début
    const startTimeObj = new Date(`1970-01-01T${start_time}:00Z`);
    const endTimeObj = new Date(`1970-01-01T${end_time}:00Z`);
    
    if (endTimeObj <= startTimeObj) {
      return NextResponse.json(
        { error: "L'heure de fin doit être après l'heure de début" },
        { status: 400 }
      );
    }
    
    // Vérifier s'il y a déjà une entrée qui chevauche cette période pour cet utilisateur
    const existingEntry = await prisma.timesheet_entry.findFirst({
      where: {
        user_id: session.user.id,
        date: new Date(date),
        OR: [
          {
            // Début dans une période existante
            start_time: {
              gte: start_time,
              lte: end_time
            }
          },
          {
            // Fin dans une période existante
            end_time: {
              gte: start_time,
              lte: end_time
            }
          },
          {
            // Englobe une période existante
            AND: [
              { start_time: { lte: start_time } },
              { end_time: { gte: end_time } }
            ]
          }
        ]
      }
    });
    
    if (existingEntry) {
      return NextResponse.json(
        { error: "Il existe déjà une entrée qui chevauche cette période" },
        { status: 409 }
      );
    }
    
    // Créer l'entrée de feuille de temps
    const entry = await prisma.timesheet_entry.create({
      data: {
        user_id: session.user.id,
        date: new Date(date),
        start_time,
        end_time,
        break_duration: break_duration || 0,
        activity_type,
        project_id: project_id || null,
        task_id: task_id || null,
        description: description || "",
        status,
        created_at: new Date(),
        updated_at: new Date()
      }
    });
    
    return NextResponse.json(entry, { status: 201 });
  } catch (error: any) {
    console.error('Erreur lors de la création de l\'entrée de feuille de temps:', error);
    return NextResponse.json(
      { error: "Erreur serveur lors de la création de l'entrée de feuille de temps" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/timesheet
 * Mise à jour groupée des entrées de feuille de temps
 */
export async function PATCH(req: NextRequest) {
  try {
    // Vérifier l'authentification
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: "Authentification requise" }, { status: 401 });
    }
    
    // Récupérer les données
    const body = await req.json();
    const { entryIds, action, status } = body;
    
    if (!entryIds || !Array.isArray(entryIds) || entryIds.length === 0) {
      return NextResponse.json(
        { error: "Liste d'IDs d'entrées requise" },
        { status: 400 }
      );
    }
    
    if (!action) {
      return NextResponse.json(
        { error: "Action requise" },
        { status: 400 }
      );
    }
    
    // Vérifier que l'utilisateur a accès à ces entrées
    const entries = await prisma.timesheet_entry.findMany({
      where: {
        id: { in: entryIds.map(Number) }
      },
      select: {
        id: true,
        user_id: true,
        status: true
      }
    });
    
    if (entries.length !== entryIds.length) {
      return NextResponse.json(
        { error: "Certaines entrées spécifiées n'existent pas" },
        { status: 404 }
      );
    }
    
    // Vérifier les permissions
    const isAdmin = session.user.role === 'admin';
    const isManager = session.user.role === 'manager';
    
    if (!isAdmin && !isManager) {
      // Les utilisateurs normaux ne peuvent modifier que leurs propres entrées
      const unauthorizedEntries = entries.filter(entry => entry.user_id !== session.user.id);
      if (unauthorizedEntries.length > 0) {
        return NextResponse.json(
          { error: "Vous n'avez pas la permission de modifier certaines entrées spécifiées" },
          { status: 403 }
        );
      }
    }
    
    let result;
    
    switch (action) {
      case 'updateStatus':
        if (!status || !['draft', 'submitted', 'approved', 'rejected'].includes(status)) {
          return NextResponse.json(
            { error: "Statut valide requis" },
            { status: 400 }
          );
        }
        
        // Vérifier les permissions pour le changement de statut
        if (status === 'approved' && !isAdmin && !isManager) {
          return NextResponse.json(
            { error: "Seuls les administrateurs et les managers peuvent approuver les entrées" },
            { status: 403 }
          );
        }
        
        result = await prisma.timesheet_entry.updateMany({
          where: {
            id: { in: entryIds.map(Number) }
          },
          data: {
            status,
            updated_at: new Date()
          }
        });
        break;
        
      case 'delete':
        // Seul l'utilisateur qui a créé l'entrée ou un admin peut la supprimer
        if (!isAdmin) {
          // Vérifier que toutes les entrées appartiennent à l'utilisateur
          const unauthorizedEntries = entries.filter(entry => entry.user_id !== session.user.id);
          if (unauthorizedEntries.length > 0) {
            return NextResponse.json(
              { error: "Vous n'avez pas la permission de supprimer certaines entrées spécifiées" },
              { status: 403 }
            );
          }
          
          // Les entrées approuvées ne peuvent plus être supprimées par l'utilisateur
          const approvedEntries = entries.filter(entry => entry.status === 'approved');
          if (approvedEntries.length > 0) {
            return NextResponse.json(
              { error: "Les entrées approuvées ne peuvent pas être supprimées" },
              { status: 403 }
            );
          }
        }
        
        result = await prisma.timesheet_entry.deleteMany({
          where: {
            id: { in: entryIds.map(Number) }
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
    console.error('Erreur lors de la mise à jour des entrées de feuille de temps:', error);
    return NextResponse.json(
      { error: "Erreur serveur lors de la mise à jour des entrées de feuille de temps" },
      { status: 500 }
    );
  }
} 