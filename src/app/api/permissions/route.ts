import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions, isAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { SecurityIncidentService } from '@/lib/security/incidentService';

// Schéma de validation pour la création d'une permission
const createPermissionSchema = z.object({
  name: z.string().min(3, "Le nom doit contenir au moins 3 caractères"),
  code: z.string().min(2, "Le code doit contenir au moins 2 caractères"),
  description: z.string().optional(),
  module: z.string().min(2, "Le module doit contenir au moins 2 caractères"),
});

// Schéma de validation pour la mise à jour d'une permission
const updatePermissionSchema = z.object({
  name: z.string().min(3, "Le nom doit contenir au moins 3 caractères").optional(),
  code: z.string().min(2, "Le code doit contenir au moins 2 caractères").optional(),
  description: z.string().optional(),
  module: z.string().min(2, "Le module doit contenir au moins 2 caractères").optional(),
});

/**
 * GET /api/permissions
 * Récupérer la liste des permissions
 */
export async function GET(req: NextRequest) {
  try {
    // Vérifier l'authentification
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: "Authentification requise" }, { status: 401 });
    }

    // Seuls les admins peuvent voir la liste des permissions
    if (!isAdmin(session)) {
      return NextResponse.json({ error: "Permission refusée" }, { status: 403 });
    }

    // Extraire les paramètres de requête pour la pagination et les filtres
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '50'); // Plus élevé car souvent on veut voir toutes les permissions
    const search = url.searchParams.get('search') || '';
    const module = url.searchParams.get('module') || '';
    
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
    
    if (module) {
      where.module = module;
    }
    
    // Récupérer les permissions avec pagination
    const permissions = await prisma.permission.findMany({
      where,
      include: {
        _count: {
          select: {
            profile_permissions: true // Compter le nombre de profils par permission
          }
        }
      },
      skip,
      take: limit,
      orderBy: [
        { module: 'asc' },
        { name: 'asc' }
      ]
    });
    
    // Compter le nombre total de permissions pour la pagination
    const total = await prisma.permission.count({ where });
    
    // Récupérer la liste des modules distincts pour les filtres
    const modules = await prisma.permission.findMany({
      select: {
        module: true
      },
      distinct: ['module'],
      orderBy: {
        module: 'asc'
      }
    });
    
    // Transformer les données pour le retour
    const formattedPermissions = permissions.map(permission => ({
      id: permission.id,
      name: permission.name,
      code: permission.code,
      description: permission.description || '',
      module: permission.module,
      profileCount: permission._count.profile_permissions
    }));
    
    // Journaliser l'accès à la liste des permissions
    await SecurityIncidentService.logIncident(
      'admin_action',
      `Liste des permissions consultée`,
      req.headers.get('x-forwarded-for') || 'unknown',
      'info',
      session.user?.id ? String(session.user.id) : undefined,
      session.user?.email || ''
    );
    
    return NextResponse.json({
      permissions: formattedPermissions,
      modules: modules.map(m => m.module),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error: any) {
    console.error('Erreur lors de la récupération des permissions:', error);
    return NextResponse.json(
      { error: "Erreur serveur lors de la récupération des permissions" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/permissions
 * Créer une nouvelle permission
 */
export async function POST(req: NextRequest) {
  try {
    // Vérifier l'authentification et les permissions
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: "Authentification requise" }, { status: 401 });
    }
    
    // Seuls les admins peuvent créer des permissions
    if (!isAdmin(session)) {
      return NextResponse.json({ error: "Permission refusée" }, { status: 403 });
    }
    
    // Extraire et valider les données
    const body = await req.json();
    const validationResult = createPermissionSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Données invalides", details: validationResult.error.format() },
        { status: 400 }
      );
    }
    
    const { name, code, description, module } = validationResult.data;
    
    // Vérifier si le code est déjà utilisé (doit être unique)
    const existingPermission = await prisma.permission.findFirst({
      where: { code }
    });
    
    if (existingPermission) {
      return NextResponse.json(
        { error: "Une permission avec ce code existe déjà" },
        { status: 400 }
      );
    }
    
    // Créer la permission
    const permission = await prisma.permission.create({
      data: {
        name,
        code,
        description,
        module
      }
    });
    
    // Journaliser la création de la permission
    await SecurityIncidentService.logIncident(
      'admin_action',
      `Permission créée: ${code} (${name})`,
      req.headers.get('x-forwarded-for') || 'unknown',
      'info',
      session.user?.id ? String(session.user.id) : undefined,
      session.user?.email || ''
    );
    
    return NextResponse.json({
      id: permission.id,
      name: permission.name,
      code: permission.code,
      description: permission.description,
      module: permission.module
    }, { status: 201 });
  } catch (error: any) {
    console.error('Erreur lors de la création de la permission:', error);
    return NextResponse.json(
      { error: "Erreur serveur lors de la création de la permission" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/permissions
 * Supprimer des permissions
 */
export async function DELETE(req: NextRequest) {
  try {
    // Vérifier l'authentification et les permissions
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: "Authentification requise" }, { status: 401 });
    }
    
    // Seuls les admins peuvent supprimer des permissions
    if (!isAdmin(session)) {
      return NextResponse.json({ error: "Permission refusée" }, { status: 403 });
    }
    
    // Extraire les données
    const url = new URL(req.url);
    const ids = url.searchParams.get('ids');
    
    if (!ids) {
      return NextResponse.json(
        { error: "IDs de permissions requis" },
        { status: 400 }
      );
    }
    
    const permissionIds = ids.split(',').map(Number);
    
    // Supprimer d'abord les associations avec les profils
    await prisma.profilePermission.deleteMany({
      where: {
        permission_id: { in: permissionIds }
      }
    });
    
    // Puis supprimer les permissions
    const result = await prisma.permission.deleteMany({
      where: {
        id: { in: permissionIds }
      }
    });
    
    // Journaliser la suppression
    await SecurityIncidentService.logIncident(
      'admin_action',
      `Permissions supprimées: ${permissionIds.length} permissions`,
      req.headers.get('x-forwarded-for') || 'unknown',
      'warning',
      session.user?.id ? String(session.user.id) : undefined,
      session.user?.email || ''
    );
    
    return NextResponse.json({
      success: true,
      deleted: result.count
    });
  } catch (error: any) {
    console.error('Erreur lors de la suppression des permissions:', error);
    return NextResponse.json(
      { error: "Erreur serveur lors de la suppression des permissions" },
      { status: 500 }
    );
  }
} 