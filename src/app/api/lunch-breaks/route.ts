import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { AuthLogger } from '@/lib/security/authLogger';
import { z } from 'zod';

// Schéma de validation pour les pauses déjeuner
const lunchBreakSchema = z.object({
  employeeId: z.number(),
  date: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: "La date doit être au format valide"
  }),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d:[0-5]\d$/, {
    message: "L'heure de début doit être au format HH:MM:SS"
  }),
  endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d:[0-5]\d$/, {
    message: "L'heure de fin doit être au format HH:MM:SS"
  }),
  duration: z.number().min(15, "La durée minimale est de 15 minutes").max(180, "La durée maximale est de 3 heures"),
  notes: z.string().optional()
});

/**
 * GET /api/lunch-breaks - Récupérer les pauses déjeuner
 */
export async function GET(req: NextRequest) {
  try {
    // Vérification de l'authentification
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Authentification requise" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get('employeeId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Valider les dates si elles sont fournies
    if (startDate && endDate) {
      if (isNaN(Date.parse(startDate)) || isNaN(Date.parse(endDate))) {
        return NextResponse.json(
          { error: "Les dates doivent être au format valide" },
          { status: 400 }
        );
      }
    }

    // Construire la requête
    const where = {
      ...(employeeId && { employee_id: Number(employeeId) }),
      ...(startDate && endDate && {
        date: {
          gte: new Date(startDate),
          lte: new Date(endDate)
        }
      })
    };

    // Récupérer les pauses déjeuner
    const lunchBreaks = await prisma.lunch_breaks.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            employee_id: true,
            department: true
          }
        }
      },
      orderBy: [
        { date: 'desc' },
        { start_time: 'desc' }
      ]
    });

    // Enregistrer l'activité
    await AuthLogger.logActivity(
      session.user.id,
      'lunch_breaks_view',
      `Consultation des pauses déjeuner${employeeId ? ` pour l'employé ${employeeId}` : ''}`
    );

    return NextResponse.json({ lunchBreaks });
  } catch (error) {
    console.error('Erreur lors de la récupération des pauses déjeuner:', error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des pauses déjeuner" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/lunch-breaks - Créer une nouvelle pause déjeuner
 */
export async function POST(req: NextRequest) {
  try {
    // Vérification de l'authentification
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Authentification requise" }, { status: 401 });
    }

    const body = await req.json();

    // Valider les données
    const validationResult = lunchBreakSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Données invalides", details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { employeeId, date, startTime, endTime, duration, notes } = validationResult.data;

    // Vérifier si l'employé existe
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId }
    });

    if (!employee) {
      return NextResponse.json(
        { error: "Employé non trouvé" },
        { status: 404 }
      );
    }

    // Vérifier si une pause déjeuner existe déjà pour cette date et cet employé
    const existingBreak = await prisma.lunch_breaks.findFirst({
      where: {
        employee_id: employeeId,
        date: new Date(date)
      }
    });

    if (existingBreak) {
      return NextResponse.json(
        { error: "Une pause déjeuner existe déjà pour cette date" },
        { status: 400 }
      );
    }

    // Créer la pause déjeuner
    const lunchBreak = await prisma.lunch_breaks.create({
      data: {
        employee_id: employeeId,
        date: new Date(date),
        start_time: new Date(`${date}T${startTime}`),
        end_time: new Date(`${date}T${endTime}`),
        duration,
        notes,
        created_by: session.user.id
      }
    });

    // Enregistrer l'activité
    await AuthLogger.logActivity(
      session.user.id,
      'lunch_break_create',
      `Création d'une pause déjeuner pour ${employee.name}`
    );

    return NextResponse.json({ lunchBreak }, { status: 201 });
  } catch (error) {
    console.error('Erreur lors de la création de la pause déjeuner:', error);
    return NextResponse.json(
      { error: "Erreur lors de la création de la pause déjeuner" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/lunch-breaks - Mettre à jour une pause déjeuner
 */
export async function PUT(req: NextRequest) {
  try {
    // Vérification de l'authentification
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Authentification requise" }, { status: 401 });
    }

    const body = await req.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        { error: "ID de la pause déjeuner requis" },
        { status: 400 }
      );
    }

    // Valider les données
    const validationResult = lunchBreakSchema.safeParse(updateData);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Données invalides", details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { employeeId, date, startTime, endTime, duration, notes } = validationResult.data;

    // Vérifier si la pause déjeuner existe
    const existingBreak = await prisma.lunch_breaks.findUnique({
      where: { id: Number(id) },
      include: {
        employee: {
          select: {
            name: true
          }
        }
      }
    });

    if (!existingBreak) {
      return NextResponse.json(
        { error: "Pause déjeuner non trouvée" },
        { status: 404 }
      );
    }

    // Vérifier si une autre pause déjeuner existe pour la même date et le même employé
    if (date !== existingBreak.date.toISOString().split('T')[0] || 
        employeeId !== existingBreak.employee_id) {
      const conflictBreak = await prisma.lunch_breaks.findFirst({
        where: {
          employee_id: employeeId,
          date: new Date(date),
          id: { not: Number(id) }
        }
      });

      if (conflictBreak) {
        return NextResponse.json(
          { error: "Une pause déjeuner existe déjà pour cette date" },
          { status: 400 }
        );
      }
    }

    // Mettre à jour la pause déjeuner
    const lunchBreak = await prisma.lunch_breaks.update({
      where: { id: Number(id) },
      data: {
        employee_id: employeeId,
        date: new Date(date),
        start_time: new Date(`${date}T${startTime}`),
        end_time: new Date(`${date}T${endTime}`),
        duration,
        notes,
        updated_at: new Date(),
        updated_by: session.user.id
      }
    });

    // Enregistrer l'activité
    await AuthLogger.logActivity(
      session.user.id,
      'lunch_break_update',
      `Mise à jour d'une pause déjeuner pour ${existingBreak.employee.name}`
    );

    return NextResponse.json({ lunchBreak });
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la pause déjeuner:', error);
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour de la pause déjeuner" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/lunch-breaks - Supprimer une pause déjeuner
 */
export async function DELETE(req: NextRequest) {
  try {
    // Vérification de l'authentification
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Authentification requise" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: "ID de la pause déjeuner requis" },
        { status: 400 }
      );
    }

    // Vérifier si la pause déjeuner existe
    const lunchBreak = await prisma.lunch_breaks.findUnique({
      where: { id: Number(id) },
      include: {
        employee: {
          select: {
            name: true
          }
        }
      }
    });

    if (!lunchBreak) {
      return NextResponse.json(
        { error: "Pause déjeuner non trouvée" },
        { status: 404 }
      );
    }

    // Supprimer la pause déjeuner
    await prisma.lunch_breaks.delete({
      where: { id: Number(id) }
    });

    // Enregistrer l'activité
    await AuthLogger.logActivity(
      session.user.id,
      'lunch_break_delete',
      `Suppression d'une pause déjeuner pour ${lunchBreak.employee.name}`
    );

    return NextResponse.json({ message: "Pause déjeuner supprimée avec succès" });
  } catch (error) {
    console.error('Erreur lors de la suppression de la pause déjeuner:', error);
    return NextResponse.json(
      { error: "Erreur lors de la suppression de la pause déjeuner" },
      { status: 500 }
    );
  }
}