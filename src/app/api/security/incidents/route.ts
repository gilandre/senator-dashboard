import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { SecurityIncidentService } from "@/lib/security/incidentService";
import prisma from '@/lib/prisma';
import { AuthLogger } from '@/lib/security/authLogger';
import { z } from 'zod';

/**
 * GET /api/security/incidents
 * Récupérer les incidents de sécurité avec pagination et filtres
 */
export async function GET(req: NextRequest) {
  try {
    // Vérifier l'authentification
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    // Vérifier que l'utilisateur est administrateur
    // @ts-ignore
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    // Récupérer les paramètres de recherche
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const type = searchParams.get('type') || undefined;
    const status = searchParams.get('status') || undefined;
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    const userId = searchParams.get('userId') || undefined;

    // Récupérer les incidents
    const incidents = await SecurityIncidentService.getIncidents({
      page,
      limit,
      filters: {
        type,
        status,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        userId
      }
    });

    return NextResponse.json(incidents);
  } catch (error: any) {
    console.error('Erreur lors de la récupération des incidents de sécurité:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des incidents de sécurité' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/security/incidents
 * Créer un nouvel incident de sécurité
 */
export async function POST(req: NextRequest) {
  try {
    // Vérifier l'authentification
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    // Autoriser les administrateurs et le système à créer des incidents
    // @ts-ignore
    const isAdmin = session.user.role === 'admin';
    // @ts-ignore
    const isSystem = session.user.role === 'system';
    
    if (!isAdmin && !isSystem) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    // Récupérer les données de la requête
    const data = await req.json();
    
    // Extraire l'IP de la requête si non fournie
    if (!data.ipAddress) {
      data.ipAddress = req.headers.get('x-forwarded-for') || 
                        req.headers.get('x-real-ip') || 
                        '127.0.0.1';
    }
    
    // Ajouter l'utilisateur connecté si non spécifié
    if (!data.userId && session.user.id) {
      data.userId = session.user.id;
    }
    
    if (!data.userEmail && session.user.email) {
      data.userEmail = session.user.email;
    }

    // Créer l'incident
    const newIncident = await SecurityIncidentService.createIncident(data);
    
    return NextResponse.json(newIncident, { status: 201 });
  } catch (error: any) {
    console.error('Erreur lors de la création d\'un incident de sécurité:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la création d\'un incident de sécurité' },
      { status: 500 }
    );
  }
}

// Schéma de validation pour les incidents
const incidentSchema = z.object({
  type: z.enum([
    'unauthorized_access',
    'multiple_failures',
    'suspicious_activity',
    'system_error',
    'settings_change',
    'security_audit',
    'other'
  ]),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  description: z.string().min(1).max(500),
  details: z.record(z.any()).optional(),
  status: z.enum(['open', 'in_progress', 'resolved', 'closed']).default('open'),
  assignedTo: z.string().optional(),
  resolution: z.string().optional()
});

// Schéma de validation pour les paramètres de requête
const querySchema = z.object({
  page: z.string().optional().transform(val => parseInt(val || '1', 10)),
  limit: z.string().optional().transform(val => parseInt(val || '10', 10)),
  status: z.enum(['open', 'in_progress', 'resolved', 'closed', 'all']).optional().default('all'),
  severity: z.enum(['low', 'medium', 'high', 'critical', 'all']).optional().default('all'),
  type: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  assignedTo: z.string().optional(),
  search: z.string().optional()
});

// GET /api/security/incidents - Récupérer la liste des incidents
export async function GET_prisma(req: NextRequest) {
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

    // Récupérer et valider les paramètres de requête
    const { searchParams } = new URL(req.url);
    const queryParams = {
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
      status: searchParams.get('status') || 'all',
      severity: searchParams.get('severity') || 'all',
      type: searchParams.get('type'),
      startDate: searchParams.get('startDate'),
      endDate: searchParams.get('endDate'),
      assignedTo: searchParams.get('assignedTo'),
      search: searchParams.get('search')
    };

    const validationResult = querySchema.safeParse(queryParams);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Paramètres invalides", details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { page, limit, status, severity, type, startDate, endDate, assignedTo, search } = validationResult.data;

    // Construire les conditions de filtrage
    const where: any = {};
    if (status !== 'all') where.status = status;
    if (severity !== 'all') where.severity = severity;
    if (type) where.type = type;
    if (assignedTo) where.assignedTo = assignedTo;
    if (search) {
      where.OR = [
        { description: { contains: search, mode: 'insensitive' } },
        { details: { path: ['$'], string_contains: search } }
      ];
    }
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    // Récupérer les incidents avec pagination
    const [incidents, total] = await Promise.all([
      prisma.security_incidents.findMany({
        where,
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
          }
        },
        orderBy: [
          { severity: 'desc' },
          { createdAt: 'desc' }
        ],
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.security_incidents.count({ where })
    ]);

    // Logger l'activité
    await AuthLogger.logActivity(session.user.id, 'GET', '/api/security/incidents', {
      action: 'view_security_incidents',
      filters: queryParams
    });

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

// POST /api/security/incidents - Créer un nouvel incident
export async function POST_prisma(req: NextRequest) {
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
    const incident = await prisma.security_incidents.create({
      data: {
        ...validationResult.data,
        createdBy: session.user.id
      },
      include: {
        assignedToUser: {
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
    await AuthLogger.logActivity(session.user.id, 'POST', '/api/security/incidents', {
      action: 'create_security_incident',
      incidentId: incident.id
    });

    return NextResponse.json(incident, { status: 201 });
  } catch (error) {
    console.error('Erreur lors de la création de l\'incident:', error);
    return NextResponse.json(
      { error: "Erreur lors de la création de l'incident" },
      { status: 500 }
    );
  }
}

// PUT /api/security/incidents/:id - Mettre à jour un incident
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
        }
      }
    });

    // Logger l'activité
    await AuthLogger.logActivity(session.user.id, 'PUT', '/api/security/incidents', {
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

// DELETE /api/security/incidents/:id - Supprimer un incident
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
    await AuthLogger.logActivity(session.user.id, 'DELETE', '/api/security/incidents', {
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