import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions, isAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { SecurityIncidentService } from '@/lib/security/incidentService';

// Schéma de validation pour la création d'un profil
const createProfileSchema = z.object({
  name: z.string().min(3, "Le nom doit contenir au moins 3 caractères"),
  description: z.string().min(3, "La description doit contenir au moins 3 caractères"),
  permissions: z.array(z.string()).optional(),
});

// Schéma de validation pour la mise à jour d'un profil
const updateProfileSchema = z.object({
  name: z.string().min(3, "Le nom doit contenir au moins 3 caractères").optional(),
  description: z.string().min(3, "La description doit contenir au moins 3 caractères").optional(),
  permissions: z.array(z.string()).optional(),
});

/**
 * GET /api/profiles
 * Récupérer la liste des profils
 */
export async function GET(req: NextRequest) {
  try {
    // Vérifier l'authentification
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: "Authentification requise" }, { status: 401 });
    }

    // Extraire les paramètres de requête pour la pagination et les filtres
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const search = url.searchParams.get('search') || '';
    
    // Calculer le décalage pour la pagination
    const skip = (page - 1) * limit;
    
    // Construire la requête avec les filtres
    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { description: { contains: search } }
      ];
    }
    
    // Récupérer les profils avec pagination
    const profiles = await prisma.profile.findMany({
      where,
      include: {
        _count: {
          select: {
            user_profiles: true // Compter le nombre d'utilisateurs par profil
          }
        },
        profile_permissions: {
          include: {
            permission: true
          }
        }
      },
      skip,
      take: limit,
      orderBy: { name: 'asc' }
    });
    
    // Compter le nombre total de profils pour la pagination
    const total = await prisma.profile.count({ where });
    
    // Transformer les données pour le retour
    const formattedProfiles = profiles.map(profile => ({
      id: profile.id,
      name: profile.name,
      description: profile.description,
      userCount: profile._count.user_profiles,
      permissions: profile.profile_permissions.map(pp => ({
        id: pp.permission.id,
        name: pp.permission.name,
        code: pp.permission.code,
      }))
    }));
    
    // Journaliser l'accès à la liste des profils pour les admins
    if (isAdmin(session)) {
      await SecurityIncidentService.logIncident(
        'admin_action',
        `Liste des profils consultée`,
        req.headers.get('x-forwarded-for') || 'unknown',
        'info',
        session.user?.id ? String(session.user.id) : undefined,
        session.user?.email || ''
      );
    }
    
    return NextResponse.json({
      profiles: formattedProfiles,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error: any) {
    console.error('Erreur lors de la récupération des profils:', error);
    return NextResponse.json(
      { error: "Erreur serveur lors de la récupération des profils" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/profiles
 * Créer un nouveau profil
 */
export async function POST(req: NextRequest) {
  try {
    // Vérifier l'authentification et les permissions
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: "Authentification requise" }, { status: 401 });
    }
    
    // Seuls les admins peuvent créer des profils
    if (!isAdmin(session)) {
      return NextResponse.json({ error: "Permission refusée" }, { status: 403 });
    }
    
    // Extraire et valider les données
    const body = await req.json();
    const validationResult = createProfileSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Données invalides", details: validationResult.error.format() },
        { status: 400 }
      );
    }
    
    const { name, description, permissions } = validationResult.data;
    
    // Vérifier si le nom est déjà utilisé
    const existingProfile = await prisma.profile.findFirst({
      where: { name }
    });
    
    if (existingProfile) {
      return NextResponse.json(
        { error: "Un profil avec ce nom existe déjà" },
        { status: 400 }
      );
    }
    
    // Créer le profil
    const profile = await prisma.profile.create({
      data: {
        name,
        description,
        created_at: new Date(),
        updated_at: new Date()
      }
    });
    
    // Associer les permissions si fournies
    if (permissions && permissions.length > 0) {
      const permissionEntities = await prisma.permission.findMany({
        where: {
          code: {
            in: permissions
          }
        }
      });
      
      if (permissionEntities.length > 0) {
        await Promise.all(permissionEntities.map(perm => 
          prisma.profilePermission.create({
            data: {
              profile_id: profile.id,
              permission_id: perm.id
            }
          })
        ));
      }
    }
    
    // Journaliser la création du profil
    await SecurityIncidentService.logIncident(
      'admin_action',
      `Profil créé: ${name}`,
      req.headers.get('x-forwarded-for') || 'unknown',
      'info',
      session.user?.id ? String(session.user.id) : undefined,
      session.user?.email || ''
    );
    
    return NextResponse.json({
      id: profile.id,
      name: profile.name,
      description: profile.description,
      created_at: profile.created_at
    }, { status: 201 });
  } catch (error: any) {
    console.error('Erreur lors de la création du profil:', error);
    return NextResponse.json(
      { error: "Erreur serveur lors de la création du profil" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/profiles
 * Mise à jour massive de profils
 */
export async function PATCH(req: NextRequest) {
  try {
    // Vérifier l'authentification et les permissions
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: "Authentification requise" }, { status: 401 });
    }
    
    // Seuls les admins peuvent mettre à jour plusieurs profils
    if (!isAdmin(session)) {
      return NextResponse.json({ error: "Permission refusée" }, { status: 403 });
    }
    
    // Extraire les données
    const body = await req.json();
    const { profileIds, action, data } = body;
    
    if (!profileIds || !Array.isArray(profileIds) || profileIds.length === 0) {
      return NextResponse.json(
        { error: "Liste d'IDs de profils requise" },
        { status: 400 }
      );
    }
    
    if (!action) {
      return NextResponse.json(
        { error: "Action requise" },
        { status: 400 }
      );
    }
    
    let result;
    
    switch (action) {
      case 'addPermission':
        if (!data?.permissionId) {
          return NextResponse.json(
            { error: "ID de permission requis" },
            { status: 400 }
          );
        }
        
        // Pour chaque profil, ajouter l'association à la permission si elle n'existe pas déjà
        const createPromises = profileIds.map(async (profileId) => {
          // Vérifier si l'association existe déjà
          const existing = await prisma.profilePermission.findUnique({
            where: {
              profile_id_permission_id: {
                profile_id: Number(profileId),
                permission_id: Number(data.permissionId)
              }
            }
          });
          
          // Si elle n'existe pas, la créer
          if (!existing) {
            return prisma.profilePermission.create({
              data: {
                profile_id: Number(profileId),
                permission_id: Number(data.permissionId)
              }
            });
          }
          
          return null;
        });
        
        await Promise.all(createPromises);
        
        result = { count: profileIds.length };
        break;
        
      case 'removePermission':
        if (!data?.permissionId) {
          return NextResponse.json(
            { error: "ID de permission requis" },
            { status: 400 }
          );
        }
        
        // Supprimer les associations profil-permission spécifiées
        result = await prisma.profilePermission.deleteMany({
          where: {
            profile_id: { in: profileIds.map(Number) },
            permission_id: Number(data.permissionId)
          }
        });
        break;
        
      case 'delete':
        // Supprimer d'abord les associations avec les permissions
        await prisma.profilePermission.deleteMany({
          where: {
            profile_id: { in: profileIds.map(Number) }
          }
        });
        
        // Supprimer ensuite les associations avec les utilisateurs
        await prisma.userProfile.deleteMany({
          where: {
            profile_id: { in: profileIds.map(Number) }
          }
        });
        
        // Enfin, supprimer les profils
        result = await prisma.profile.deleteMany({
          where: { id: { in: profileIds.map(Number) } }
        });
        break;
        
      default:
        return NextResponse.json(
          { error: "Action non reconnue" },
          { status: 400 }
        );
    }
    
    // Journaliser l'action collective
    await SecurityIncidentService.logIncident(
      'admin_action',
      `Action collective sur profils: ${action} (${profileIds.length} profils)`,
      req.headers.get('x-forwarded-for') || 'unknown',
      'info',
      session.user?.id ? String(session.user.id) : undefined,
      session.user?.email || ''
    );
    
    return NextResponse.json({
      success: true,
      action,
      affected: result?.count || 0
    });
  } catch (error: any) {
    console.error('Erreur lors de la mise à jour collective des profils:', error);
    return NextResponse.json(
      { error: "Erreur serveur lors de la mise à jour collective des profils" },
      { status: 500 }
    );
  }
} 