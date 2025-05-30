import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { AuthLogger } from '@/lib/security/authLogger';
import { z } from 'zod';

// Schéma de validation pour les journaux d'accès
const accessLogSchema = z.object({
  badgeNumber: z.string().min(1, "Le numéro de badge est requis"),
  personType: z.enum(['employee', 'visitor', 'contractor']),
  direction: z.enum(['in', 'out']),
  timestamp: z.string().datetime("Horodatage invalide"),
  deviceId: z.string().min(1, "L'identifiant du dispositif est requis"),
  deviceName: z.string().min(1, "Le nom du dispositif est requis"),
  location: z.string().min(1, "L'emplacement est requis"),
  status: z.enum(['success', 'denied', 'error']).default('success'),
  notes: z.string().optional().nullable()
});

// GET /api/access-logs - Récupérer la liste des journaux d'accès
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const personType = searchParams.get('personType');
    const direction = searchParams.get('direction');
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = (page - 1) * limit;

    // Construire la requête de base
    const where: any = {};
    if (startDate && endDate) {
      where.timestamp = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    }
    if (personType) where.personType = personType;
    if (direction) where.direction = direction;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { badgeNumber: { contains: search, mode: 'insensitive' } },
        { deviceName: { contains: search, mode: 'insensitive' } },
        { location: { contains: search, mode: 'insensitive' } },
        { notes: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Récupérer les journaux avec pagination
    const [logs, total] = await Promise.all([
      prisma.access_logs.findMany({
        where,
        orderBy: [
          { timestamp: 'desc' },
          { badgeNumber: 'asc' }
        ],
        skip,
        take: limit
      }),
      prisma.access_logs.count({ where })
    ]);

    // Logger l'activité
    await AuthLogger.logActivity(session.user.id, 'GET', '/api/access-logs', {
      filters: { startDate, endDate, personType, direction, status, search },
      pagination: { page, limit }
    });

    return NextResponse.json({
      logs,
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        currentPage: page,
        limit
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des journaux d\'accès:', error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des journaux d'accès" },
      { status: 500 }
    );
  }
}

// POST /api/access-logs - Créer un nouveau journal d'accès
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const body = await req.json();
    
    // Valider les données
    const validationResult = accessLogSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Données invalides", details: validationResult.error.errors },
        { status: 400 }
      );
    }

    // Vérifier si la personne existe selon son type
    let personExists = false;
    if (body.personType === 'employee') {
      const employee = await prisma.employees.findFirst({
        where: { badgeNumber: body.badgeNumber }
      });
      personExists = !!employee;
    } else if (body.personType === 'visitor') {
      const visitor = await prisma.visitors.findFirst({
        where: {
          badgeNumber: body.badgeNumber,
          status: {
            in: ['expected', 'arrived']
          }
        }
      });
      personExists = !!visitor;
    }

    if (!personExists) {
      return NextResponse.json(
        { error: `${body.personType === 'employee' ? 'Employé' : 'Visiteur'} non trouvé avec ce badge` },
        { status: 404 }
      );
    }

    // Créer le journal d'accès
    const log = await prisma.access_logs.create({
      data: {
        ...body,
        timestamp: new Date(body.timestamp)
      }
    });

    // Mettre à jour le statut du visiteur si nécessaire
    if (body.personType === 'visitor' && body.direction === 'in') {
      await prisma.visitors.updateMany({
        where: {
          badgeNumber: body.badgeNumber,
          status: 'expected'
        },
        data: {
          status: 'arrived',
          actualArrival: new Date(body.timestamp)
        }
      });
    } else if (body.personType === 'visitor' && body.direction === 'out') {
      await prisma.visitors.updateMany({
        where: {
          badgeNumber: body.badgeNumber,
          status: 'arrived'
        },
        data: {
          status: 'departed',
          actualDeparture: new Date(body.timestamp)
        }
      });
    }

    // Logger l'activité
    await AuthLogger.logActivity(session.user.id, 'POST', '/api/access-logs', {
      logId: log.id,
      badgeNumber: log.badgeNumber,
      personType: log.personType,
      direction: log.direction
    });

    return NextResponse.json(log, { status: 201 });
  } catch (error) {
    console.error('Erreur lors de la création du journal d\'accès:', error);
    return NextResponse.json(
      { error: "Erreur lors de la création du journal d'accès" },
      { status: 500 }
    );
  }
}

// PUT /api/access-logs - Mettre à jour un journal d'accès
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const body = await req.json();
    
    if (!body.id) {
      return NextResponse.json(
        { error: "ID du journal d'accès requis" },
        { status: 400 }
      );
    }

    // Valider les données
    const validationResult = accessLogSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Données invalides", details: validationResult.error.errors },
        { status: 400 }
      );
    }

    // Vérifier si le journal existe
    const existingLog = await prisma.access_logs.findUnique({
      where: { id: body.id }
    });

    if (!existingLog) {
      return NextResponse.json(
        { error: "Journal d'accès non trouvé" },
        { status: 404 }
      );
    }

    // Vérifier si la personne existe selon son type
    let personExists = false;
    if (body.personType === 'employee') {
      const employee = await prisma.employees.findFirst({
        where: { badgeNumber: body.badgeNumber }
      });
      personExists = !!employee;
    } else if (body.personType === 'visitor') {
      const visitor = await prisma.visitors.findFirst({
        where: {
          badgeNumber: body.badgeNumber,
          status: {
            in: ['expected', 'arrived']
          }
        }
      });
      personExists = !!visitor;
    }

    if (!personExists) {
      return NextResponse.json(
        { error: `${body.personType === 'employee' ? 'Employé' : 'Visiteur'} non trouvé avec ce badge` },
        { status: 404 }
      );
    }

    // Mettre à jour le journal
    const log = await prisma.access_logs.update({
      where: { id: body.id },
      data: {
        ...body,
        timestamp: new Date(body.timestamp)
      }
    });

    // Logger l'activité
    await AuthLogger.logActivity(session.user.id, 'PUT', '/api/access-logs', {
      logId: log.id,
      badgeNumber: log.badgeNumber,
      personType: log.personType,
      direction: log.direction
    });

    return NextResponse.json(log);
  } catch (error) {
    console.error('Erreur lors de la mise à jour du journal d\'accès:', error);
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour du journal d'accès" },
      { status: 500 }
    );
  }
}

// DELETE /api/access-logs - Supprimer un journal d'accès
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: "ID du journal d'accès requis" },
        { status: 400 }
      );
    }

    // Vérifier si le journal existe
    const existingLog = await prisma.access_logs.findUnique({
      where: { id }
    });

    if (!existingLog) {
      return NextResponse.json(
        { error: "Journal d'accès non trouvé" },
        { status: 404 }
      );
    }

    // Supprimer le journal
    await prisma.access_logs.delete({
      where: { id }
    });

    // Logger l'activité
    await AuthLogger.logActivity(session.user.id, 'DELETE', '/api/access-logs', {
      logId: id,
      badgeNumber: existingLog.badgeNumber,
      personType: existingLog.personType
    });

    return NextResponse.json({ message: "Journal d'accès supprimé avec succès" });
  } catch (error) {
    console.error('Erreur lors de la suppression du journal d\'accès:', error);
    return NextResponse.json(
      { error: "Erreur lors de la suppression du journal d'accès" },
      { status: 500 }
    );
  }
} 