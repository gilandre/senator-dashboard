import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { AuthLogger } from "@/lib/auth-logger";
import { z } from "zod";

// Schéma de validation pour les incidents
const incidentSchema = z.object({
  type: z.string(),
  description: z.string().min(1).max(500),
  status: z.enum(['info', 'alert', 'blocked', 'resolved', 'locked']).default('info'),
});

// Schéma de validation pour les paramètres de requête
const querySchema = z.object({
  page: z.string().optional().transform(val => parseInt(val || '1', 10)),
  limit: z.string().optional().transform(val => parseInt(val || '10', 10)),
  status: z.string().optional(),
  type: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

/**
 * GET /api/settings/security/incidents
 * Récupérer la liste des incidents de sécurité pour l'interface client
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // Vérifier si l'utilisateur a les droits d'administration
    const user = await prisma.users.findUnique({
      where: { id: parseInt(session.user.id) },
      select: { role: true }
    });

    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: "Accès non autorisé" }, { status: 403 });
    }

    // Récupérer et valider les paramètres de requête
    const { searchParams } = new URL(req.url);
    const queryParams = {
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
      status: searchParams.get('status'),
      type: searchParams.get('type'),
      startDate: searchParams.get('startDate'),
      endDate: searchParams.get('endDate'),
    };

    const validationResult = querySchema.safeParse(queryParams);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Paramètres invalides", details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { page, limit, status, type, startDate, endDate } = validationResult.data;

    // Construire les conditions de filtrage
    const where: any = {};
    if (status) where.status = status;
    if (type) where.type = type;
    
    if (startDate || endDate) {
      where.occurred_at = {};
      if (startDate) where.occurred_at.gte = new Date(startDate);
      if (endDate) where.occurred_at.lte = new Date(endDate);
    }

    // Récupérer les incidents avec pagination
    const [incidents, total] = await Promise.all([
      prisma.securityIncident.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          users_security_incidents_resolved_byTousers: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        },
        orderBy: [
          { occurred_at: 'desc' }
        ],
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.securityIncident.count({ where })
    ]);

    // Logger l'activité
    try {
      await AuthLogger.logActivity(
        session.user.id,
        'GET', 
        '/api/settings/security/incidents',
        { filters: queryParams }
      );
    } catch (logError) {
      console.error('Error logging activity:', logError);
    }

    return NextResponse.json({
      incidents,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des incidents:', error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des incidents" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/settings/security/incidents
 * Créer un nouvel incident de sécurité via l'interface client
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // Vérifier si l'utilisateur a les droits d'administration
    const user = await prisma.users.findUnique({
      where: { id: parseInt(session.user.id) },
      select: { role: true }
    });

    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: "Accès non autorisé" }, { status: 403 });
    }

    const body = await req.json();
    
    // Valider les données
    const validationResult = incidentSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Données invalides", details: validationResult.error.errors },
        { status: 400 }
      );
    }

    // Créer l'incident
    const incident = await prisma.securityIncident.create({
      data: {
        type: validationResult.data.type,
        description: validationResult.data.description,
        status: validationResult.data.status,
        user_id: parseInt(session.user.id),
        ip_address: req.headers.get('x-forwarded-for') || req.ip || '0.0.0.0'
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    // Logger l'activité
    try {
      await AuthLogger.logActivity(
        session.user.id,
        'POST',
        '/api/settings/security/incidents',
        { incidentId: incident.id }
      );
    } catch (logError) {
      console.error('Error logging activity:', logError);
    }

    return NextResponse.json(incident, { status: 201 });
  } catch (error) {
    console.error('Erreur lors de la création de l\'incident:', error);
    return NextResponse.json(
      { error: "Erreur lors de la création de l'incident" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/settings/security/incidents/:id
 * Mettre à jour un incident de sécurité via l'interface client
 */
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // Vérifier si l'utilisateur a les droits d'administration
    const user = await prisma.users.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    });

    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: "Accès non autorisé" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json(
        { error: "ID de l'incident requis" },
        { status: 400 }
      );
    }

    const body = await req.json();
    
    // Valider les données
    const validationResult = incidentSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Données invalides", details: validationResult.error.errors },
        { status: 400 }
      );
    }

    // Vérifier si l'incident existe
    const existingIncident = await prisma.security_incidents.findUnique({
      where: { id }
    });

    if (!existingIncident) {
      return NextResponse.json(
        { error: "Incident non trouvé" },
        { status: 404 }
      );
    }

    // Mettre à jour l'incident
    const incident = await prisma.security_incidents.update({
      where: { id },
      data: {
        ...validationResult.data,
        ...(validationResult.data.status === 'resolved' && !existingIncident.resolvedAt ? {
          resolvedAt: new Date(),
          resolvedBy: session.user.id
        } : {})
      },
      include: {
        assignedToUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        resolvedByUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        createdByUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });

    // Logger l'activité
    await AuthLogger.logActivity(session.user.id, 'PUT', '/api/settings/security/incidents', {
      action: 'update_security_incident',
      incidentId: incident.id,
      changes: body
    });

    return NextResponse.json(incident);
  } catch (error) {
    console.error('Erreur lors de la mise à jour de l\'incident:', error);
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour de l'incident" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/settings/security/incidents/:id
 * Supprimer un incident de sécurité via l'interface client
 */
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // Vérifier si l'utilisateur a les droits d'administration
    const user = await prisma.users.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    });

    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: "Accès non autorisé" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json(
        { error: "ID de l'incident requis" },
        { status: 400 }
      );
    }

    // Vérifier si l'incident existe
    const existingIncident = await prisma.security_incidents.findUnique({
      where: { id }
    });

    if (!existingIncident) {
      return NextResponse.json(
        { error: "Incident non trouvé" },
        { status: 404 }
      );
    }

    // Supprimer l'incident
    await prisma.security_incidents.delete({
      where: { id }
    });

    // Logger l'activité
    await AuthLogger.logActivity(session.user.id, 'DELETE', '/api/settings/security/incidents', {
      action: 'delete_security_incident',
      incidentId: id
    });

    return NextResponse.json({ message: "Incident supprimé avec succès" });
  } catch (error) {
    console.error('Erreur lors de la suppression de l\'incident:', error);
    return NextResponse.json(
      { error: "Erreur lors de la suppression de l'incident" },
      { status: 500 }
    );
  }
} 