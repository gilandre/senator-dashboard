import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { AuthLogger } from '@/lib/security/authLogger';
import { z } from 'zod';

// Schéma de validation pour les départements
const departmentSchema = z.object({
  name: z.string().min(1, "Le nom du département est requis"),
  description: z.string().optional().nullable(),
  code: z.string().min(1, "Le code du département est requis"),
  manager: z.string().optional().nullable(),
  parentId: z.string().optional().nullable(),
  status: z.enum(['active', 'inactive']).default('active')
});

// GET /api/departments - Récupérer la liste des départements
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const includeEmployees = searchParams.get('includeEmployees') === 'true';

    // Construire la requête de base
    const where: any = {};
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Récupérer les départements
    const departments = await prisma.departments.findMany({
      where,
      orderBy: [
        { name: 'asc' }
      ],
      include: {
        parent: {
          select: {
            id: true,
            name: true,
            code: true
          }
        },
        children: {
          select: {
            id: true,
            name: true,
            code: true
          }
        },
        ...(includeEmployees ? {
          employees: {
            where: { status: 'active' },
            select: {
              id: true,
              firstName: true,
              lastName: true,
              badgeNumber: true,
              position: true
            }
          }
        } : {})
      }
    });

    // Logger l'activité
    await AuthLogger.logActivity(session.user.id, 'GET', '/api/departments', {
      filters: { status, search, includeEmployees }
    });

    return NextResponse.json(departments);
  } catch (error) {
    console.error('Erreur lors de la récupération des départements:', error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des départements" },
      { status: 500 }
    );
  }
}

// POST /api/departments - Créer un nouveau département
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const body = await req.json();
    
    // Valider les données
    const validationResult = departmentSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Données invalides", details: validationResult.error.errors },
        { status: 400 }
      );
    }

    // Vérifier si le code existe déjà
    const existingDepartment = await prisma.departments.findFirst({
      where: { code: body.code }
    });

    if (existingDepartment) {
      return NextResponse.json(
        { error: "Un département avec ce code existe déjà" },
        { status: 400 }
      );
    }

    // Créer le département
    const department = await prisma.departments.create({
      data: {
        ...body,
        parentId: body.parentId || null
      },
      include: {
        parent: {
          select: {
            id: true,
            name: true,
            code: true
          }
        }
      }
    });

    // Logger l'activité
    await AuthLogger.logActivity(session.user.id, 'POST', '/api/departments', {
      departmentId: department.id,
      code: department.code
    });

    return NextResponse.json(department, { status: 201 });
  } catch (error) {
    console.error('Erreur lors de la création du département:', error);
    return NextResponse.json(
      { error: "Erreur lors de la création du département" },
      { status: 500 }
    );
  }
}

// PUT /api/departments - Mettre à jour un département
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const body = await req.json();
    
    if (!body.id) {
      return NextResponse.json(
        { error: "ID du département requis" },
        { status: 400 }
      );
    }

    // Valider les données
    const validationResult = departmentSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Données invalides", details: validationResult.error.errors },
        { status: 400 }
      );
    }

    // Vérifier si le département existe
    const existingDepartment = await prisma.departments.findUnique({
      where: { id: body.id }
    });

    if (!existingDepartment) {
      return NextResponse.json(
        { error: "Département non trouvé" },
        { status: 404 }
      );
    }

    // Vérifier si le code est déjà utilisé par un autre département
    if (body.code !== existingDepartment.code) {
      const codeExists = await prisma.departments.findFirst({
        where: { code: body.code }
      });

      if (codeExists) {
        return NextResponse.json(
          { error: "Un département avec ce code existe déjà" },
          { status: 400 }
        );
      }
    }

    // Vérifier les références circulaires dans la hiérarchie
    if (body.parentId) {
      let currentParentId = body.parentId;
      const visited = new Set([body.id]);

      while (currentParentId) {
        if (visited.has(currentParentId)) {
          return NextResponse.json(
            { error: "Référence circulaire détectée dans la hiérarchie des départements" },
            { status: 400 }
          );
        }

        visited.add(currentParentId);
        const parent = await prisma.departments.findUnique({
          where: { id: currentParentId },
          select: { parentId: true }
        });

        if (!parent) break;
        currentParentId = parent.parentId;
      }
    }

    // Mettre à jour le département
    const department = await prisma.departments.update({
      where: { id: body.id },
      data: {
        ...body,
        parentId: body.parentId || null
      },
      include: {
        parent: {
          select: {
            id: true,
            name: true,
            code: true
          }
        }
      }
    });

    // Logger l'activité
    await AuthLogger.logActivity(session.user.id, 'PUT', '/api/departments', {
      departmentId: department.id,
      code: department.code
    });

    return NextResponse.json(department);
  } catch (error) {
    console.error('Erreur lors de la mise à jour du département:', error);
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour du département" },
      { status: 500 }
    );
  }
}

// DELETE /api/departments - Supprimer un département
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
        { error: "ID du département requis" },
        { status: 400 }
      );
    }

    // Vérifier si le département existe
    const existingDepartment = await prisma.departments.findUnique({
      where: { id },
      include: {
        employees: {
          where: { status: 'active' },
          select: { id: true }
        },
        children: {
          select: { id: true }
        }
      }
    });

    if (!existingDepartment) {
      return NextResponse.json(
        { error: "Département non trouvé" },
        { status: 404 }
      );
    }

    // Vérifier si le département a des employés actifs
    if (existingDepartment.employees.length > 0) {
      return NextResponse.json(
        { error: "Impossible de supprimer un département avec des employés actifs" },
        { status: 400 }
      );
    }

    // Vérifier si le département a des sous-départements
    if (existingDepartment.children.length > 0) {
      return NextResponse.json(
        { error: "Impossible de supprimer un département avec des sous-départements" },
        { status: 400 }
      );
    }

    // Supprimer le département
    await prisma.departments.delete({
      where: { id }
    });

    // Logger l'activité
    await AuthLogger.logActivity(session.user.id, 'DELETE', '/api/departments', {
      departmentId: id,
      code: existingDepartment.code
    });

    return NextResponse.json({ message: "Département supprimé avec succès" });
  } catch (error) {
    console.error('Erreur lors de la suppression du département:', error);
    return NextResponse.json(
      { error: "Erreur lors de la suppression du département" },
      { status: 500 }
    );
  }
} 