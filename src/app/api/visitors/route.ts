import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { AuthLogger } from '@/lib/security/authLogger';
import { z } from 'zod';

// Schéma de validation pour les visiteurs (adapté au modèle Prisma)
const visitorSchema = z.object({
  badge_number: z.string().min(1, "Le numéro de badge est requis"),
  first_name: z.string().min(1, "Le prénom est requis"),
  last_name: z.string().min(1, "Le nom est requis"),
  company: z.string().min(1, "La société est requise"),
  reason: z.string().optional().nullable(),
  status: z.enum(['active', 'inactive']).default('active'),
  // Les champs suivants sont gérés automatiquement
  // created_at, updated_at, access_count, first_seen, last_seen
});

// GET /api/visitors - Récupérer la liste des visiteurs
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    // Construire la requête de base
    const where: any = {};
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { first_name: { contains: search } },
        { last_name: { contains: search } },
        { badge_number: { contains: search } },
        { company: { contains: search } }
      ];
    }

    // Exclure les badges qui pourraient être des employés
    // Récupérer tous les badges d'employés
    const employeeBadges = await prisma.employees.findMany({
      select: {
        badge_number: true
      }
    });
    
    const employeeBadgeNumbers = employeeBadges.map(e => e.badge_number);
    
    // Ajouter la condition pour exclure les badges d'employés
    if (employeeBadgeNumbers.length > 0) {
      where.badge_number = {
        notIn: employeeBadgeNumbers
      };
    }

    // Récupérer les visiteurs avec pagination
    const [visitors, total] = await Promise.all([
      prisma.visitors.findMany({
        where,
        orderBy: [
          { last_seen: 'desc' },
          { last_name: 'asc' }
        ],
        skip,
        take: limit
      }),
      prisma.visitors.count({ where })
    ]);

    // Formater les résultats pour l'API
    const formattedVisitors = visitors.map(visitor => ({
      id: visitor.id,
      badge_number: visitor.badge_number,
      first_name: visitor.first_name,
      last_name: visitor.last_name,
      company: visitor.company,
      reason: visitor.reason,
      status: visitor.status,
      created_at: visitor.created_at,
      updated_at: visitor.updated_at,
      access_count: visitor.access_count,
      first_seen: visitor.first_seen,
      last_seen: visitor.last_seen
    }));

    // Logger l'activité
    await AuthLogger.logActivity(session.user.id, 'GET', '/api/visitors', {
      filters: { status, search },
      pagination: { page, limit }
    });

    return NextResponse.json({
      visitors: formattedVisitors,
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        currentPage: page,
        limit
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des visiteurs:', error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des visiteurs" },
      { status: 500 }
    );
  }
}

// POST /api/visitors - Créer un nouveau visiteur
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const body = await req.json();
    
    // Valider les données
    const validationResult = visitorSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Données invalides", details: validationResult.error.errors },
        { status: 400 }
      );
    }

    // Vérifier si le badge est déjà utilisé
    const existingVisitor = await prisma.visitors.findUnique({
      where: { badge_number: body.badge_number }
    });

    if (existingVisitor) {
      return NextResponse.json(
        { error: "Ce badge est déjà utilisé par un visiteur" },
        { status: 400 }
      );
    }

    // Créer le visiteur
    const visitor = await prisma.visitors.create({
      data: {
        badge_number: body.badge_number,
        first_name: body.first_name,
        last_name: body.last_name,
        company: body.company,
        reason: body.reason,
        status: body.status || 'active'
      }
    });

    // Formater la réponse pour l'API
    const formattedVisitor = {
      id: visitor.id,
      badge_number: visitor.badge_number,
      first_name: visitor.first_name,
      last_name: visitor.last_name,
      company: visitor.company,
      reason: visitor.reason,
      status: visitor.status,
      created_at: visitor.created_at,
      updated_at: visitor.updated_at,
      access_count: visitor.access_count,
      first_seen: visitor.first_seen,
      last_seen: visitor.last_seen,
      badgeNumber: visitor.badge_number,
      firstName: visitor.first_name,
      lastName: visitor.last_name,
      createdAt: visitor.created_at,
      updatedAt: visitor.updated_at,
      accessCount: visitor.access_count,
      firstSeen: visitor.first_seen,
      lastSeen: visitor.last_seen
    };

    // Logger l'activité
    await AuthLogger.logActivity(session.user.id, 'POST', '/api/visitors', {
      visitorId: visitor.id,
      badge_number: visitor.badge_number
    });

    return NextResponse.json(formattedVisitor, { status: 201 });
  } catch (error) {
    console.error('Erreur lors de la création du visiteur:', error);
    return NextResponse.json(
      { error: "Erreur lors de la création du visiteur" },
      { status: 500 }
    );
  }
}

// PUT /api/visitors - Mettre à jour un visiteur
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const body = await req.json();
    
    if (!body.id) {
      return NextResponse.json(
        { error: "ID du visiteur requis" },
        { status: 400 }
      );
    }

    // Convertir les données du frontend (camelCase) vers le format de base de données (snake_case)
    const dbData = {
      badge_number: body.badgeNumber || body.badge_number,
      first_name: body.firstName || body.first_name,
      last_name: body.lastName || body.last_name,
      company: body.company,
      reason: body.reason,
      status: body.status
    };

    // Valider les données
    const validationResult = visitorSchema.safeParse(dbData);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Données invalides", details: validationResult.error.errors },
        { status: 400 }
      );
    }

    // Vérifier si le visiteur existe
    const existingVisitor = await prisma.visitors.findUnique({
      where: { id: body.id }
    });

    if (!existingVisitor) {
      return NextResponse.json(
        { error: "Visiteur non trouvé" },
        { status: 404 }
      );
    }

    // Vérifier si le badge est déjà utilisé par un autre visiteur
    if (dbData.badge_number !== existingVisitor.badge_number) {
      const badgeExists = await prisma.visitors.findUnique({
        where: { badge_number: dbData.badge_number }
      });

      if (badgeExists) {
        return NextResponse.json(
          { error: "Ce badge est déjà utilisé par un autre visiteur" },
          { status: 400 }
        );
      }
    }

    // Mettre à jour le visiteur
    const visitor = await prisma.visitors.update({
      where: { id: body.id },
      data: dbData
    });

    // Formater la réponse pour l'API
    const formattedVisitor = {
      id: visitor.id,
      badge_number: visitor.badge_number,
      first_name: visitor.first_name,
      last_name: visitor.last_name,
      company: visitor.company,
      reason: visitor.reason,
      status: visitor.status,
      created_at: visitor.created_at,
      updated_at: visitor.updated_at,
      access_count: visitor.access_count,
      first_seen: visitor.first_seen,
      last_seen: visitor.last_seen,
      badgeNumber: visitor.badge_number,
      firstName: visitor.first_name,
      lastName: visitor.last_name,
      createdAt: visitor.created_at,
      updatedAt: visitor.updated_at,
      accessCount: visitor.access_count,
      firstSeen: visitor.first_seen,
      lastSeen: visitor.last_seen
    };

    // Logger l'activité
    await AuthLogger.logActivity(session.user.id, 'PUT', '/api/visitors', {
      visitorId: visitor.id,
      badge_number: visitor.badge_number
    });

    return NextResponse.json(formattedVisitor);
  } catch (error) {
    console.error('Erreur lors de la mise à jour du visiteur:', error);
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour du visiteur" },
      { status: 500 }
    );
  }
}

// DELETE /api/visitors - Supprimer un visiteur
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = parseInt(searchParams.get('id') || '0');

    if (!id) {
      return NextResponse.json(
        { error: "ID du visiteur requis" },
        { status: 400 }
      );
    }

    // Vérifier si le visiteur existe
    const existingVisitor = await prisma.visitors.findUnique({
      where: { id }
    });

    if (!existingVisitor) {
      return NextResponse.json(
        { error: "Visiteur non trouvé" },
        { status: 404 }
      );
    }

    // Supprimer le visiteur
    await prisma.visitors.delete({
      where: { id }
    });

    // Logger l'activité
    await AuthLogger.logActivity(session.user.id, 'DELETE', '/api/visitors', {
      visitorId: id,
      badge_number: existingVisitor.badge_number
    });

    return NextResponse.json({ message: "Visiteur supprimé avec succès" });
  } catch (error) {
    console.error('Erreur lors de la suppression du visiteur:', error);
    return NextResponse.json(
      { error: "Erreur lors de la suppression du visiteur" },
      { status: 500 }
    );
  }
} 