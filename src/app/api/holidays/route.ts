import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { AuthLogger } from '@/lib/security/authLogger';
import { z } from 'zod';

// Schéma de validation pour les jours fériés
const holidaySchema = z.object({
  date: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: "La date doit être au format valide"
  }),
  name: z.string().min(1, "Le nom est requis"),
  description: z.string().optional(),
  isRecurring: z.boolean().default(false),
  type: z.enum(['NATIONAL', 'REGIONAL', 'LOCAL', 'SPECIAL']).default('NATIONAL')
});

/**
 * GET /api/holidays - Récupérer les jours fériés
 */
export async function GET(req: NextRequest) {
  try {
    // Vérification de l'authentification
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Authentification requise" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const year = searchParams.get('year');
    const type = searchParams.get('type');

    // Construire la requête
    const where = {
      ...(year && {
        date: {
          gte: new Date(`${year}-01-01`),
          lte: new Date(`${year}-12-31`)
        }
      }),
      ...(type && { type })
    };

    // Récupérer les jours fériés
    const holidays = await prisma.holidays.findMany({
      where,
      orderBy: {
        date: 'asc'
      }
    });

    // Enregistrer l'activité
    await AuthLogger.logActivity(
      session.user.id,
      'holidays_view',
      `Consultation des jours fériés${year ? ` pour ${year}` : ''}`
    );

    return NextResponse.json({ holidays });
  } catch (error) {
    console.error('Erreur lors de la récupération des jours fériés:', error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des jours fériés" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/holidays - Créer un nouveau jour férié
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
    const validationResult = holidaySchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Données invalides", details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { date, name, description, isRecurring, type } = validationResult.data;

    // Vérifier si un jour férié existe déjà pour cette date
    const existingHoliday = await prisma.holidays.findFirst({
      where: {
        date: new Date(date)
      }
    });

    if (existingHoliday) {
      return NextResponse.json(
        { error: "Un jour férié existe déjà pour cette date" },
        { status: 400 }
      );
    }

    // Créer le jour férié
    const holiday = await prisma.holidays.create({
      data: {
        date: new Date(date),
        name,
        description,
        is_recurring: isRecurring,
        type,
        created_by: session.user.id
      }
    });

    // Enregistrer l'activité
    await AuthLogger.logActivity(
      session.user.id,
      'holiday_create',
      `Création du jour férié: ${name} (${date})`
    );

    return NextResponse.json({ holiday }, { status: 201 });
  } catch (error) {
    console.error('Erreur lors de la création du jour férié:', error);
    return NextResponse.json(
      { error: "Erreur lors de la création du jour férié" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/holidays - Mettre à jour un jour férié
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
        { error: "ID du jour férié requis" },
        { status: 400 }
      );
    }

    // Valider les données
    const validationResult = holidaySchema.safeParse(updateData);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Données invalides", details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { date, name, description, isRecurring, type } = validationResult.data;

    // Vérifier si le jour férié existe
    const existingHoliday = await prisma.holidays.findUnique({
      where: { id: Number(id) }
    });

    if (!existingHoliday) {
      return NextResponse.json(
        { error: "Jour férié non trouvé" },
        { status: 404 }
      );
    }

    // Vérifier si un autre jour férié existe pour la nouvelle date
    if (date !== existingHoliday.date.toISOString().split('T')[0]) {
      const conflictHoliday = await prisma.holidays.findFirst({
        where: {
          date: new Date(date),
          id: { not: Number(id) }
        }
      });

      if (conflictHoliday) {
        return NextResponse.json(
          { error: "Un jour férié existe déjà pour cette date" },
          { status: 400 }
        );
      }
    }

    // Mettre à jour le jour férié
    const holiday = await prisma.holidays.update({
      where: { id: Number(id) },
      data: {
        date: new Date(date),
        name,
        description,
        is_recurring: isRecurring,
        type,
        updated_at: new Date(),
        updated_by: session.user.id
      }
    });

    // Enregistrer l'activité
    await AuthLogger.logActivity(
      session.user.id,
      'holiday_update',
      `Mise à jour du jour férié: ${name} (${date})`
    );

    return NextResponse.json({ holiday });
  } catch (error) {
    console.error('Erreur lors de la mise à jour du jour férié:', error);
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour du jour férié" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/holidays - Supprimer un jour férié
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
        { error: "ID du jour férié requis" },
        { status: 400 }
      );
    }

    // Vérifier si le jour férié existe
    const holiday = await prisma.holidays.findUnique({
      where: { id: Number(id) }
    });

    if (!holiday) {
      return NextResponse.json(
        { error: "Jour férié non trouvé" },
        { status: 404 }
      );
    }

    // Supprimer le jour férié
    await prisma.holidays.delete({
      where: { id: Number(id) }
    });

    // Enregistrer l'activité
    await AuthLogger.logActivity(
      session.user.id,
      'holiday_delete',
      `Suppression du jour férié: ${holiday.name} (${holiday.date.toISOString().split('T')[0]})`
    );

    return NextResponse.json({ message: "Jour férié supprimé avec succès" });
  } catch (error) {
    console.error('Erreur lors de la suppression du jour férié:', error);
    return NextResponse.json(
      { error: "Erreur lors de la suppression du jour férié" },
      { status: 500 }
    );
  }
} 