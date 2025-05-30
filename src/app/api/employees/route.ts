import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { AuthLogger } from '@/lib/security/authLogger';
import { z } from 'zod';

// Schéma de validation pour les employés
const employeeSchema = z.object({
  badgeNumber: z.string().min(1, "Le numéro de badge est requis"),
  firstName: z.string().min(1, "Le prénom est requis"),
  lastName: z.string().min(1, "Le nom est requis"),
  email: z.string().email("Email invalide").optional().nullable(),
  phone: z.string().optional().nullable(),
  department: z.string().min(1, "Le département est requis"),
  position: z.string().optional().nullable(),
  hireDate: z.string().datetime("Date d'embauche invalide"),
  endDate: z.string().datetime("Date de fin invalide").optional().nullable(),
  status: z.enum(['active', 'inactive', 'on_leave']),
  groupName: z.string().min(1, "Le groupe est requis"),
  notes: z.string().optional().nullable()
});

// GET /api/employees - Récupérer la liste des employés
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const department = searchParams.get('department');
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    // Construire la requête de base
    const where: any = {};
    if (department) where.department = department;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { first_name: { contains: search, mode: 'insensitive' } },
        { last_name: { contains: search, mode: 'insensitive' } },
        { badge_number: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Exclure les badges qui pourraient être des visiteurs
    // Récupérer tous les badges de visiteurs
    const visitorBadges = await prisma.visitors.findMany({
      select: {
        badge_number: true
      }
    });
    
    const visitorBadgeNumbers = visitorBadges.map(v => v.badge_number);
    
    // Ajouter la condition pour exclure les badges de visiteurs
    if (visitorBadgeNumbers.length > 0) {
      where.badge_number = {
        notIn: visitorBadgeNumbers
      };
    }

    // Récupérer les employés avec pagination
    const [employees, total, departments] = await Promise.all([
      prisma.employees.findMany({
        where,
        orderBy: { last_name: 'asc' },
        skip,
        take: limit,
        include: {
          dept: true
        }
      }),
      prisma.employees.count({ where }),
      prisma.departments.findMany({
        select: {
          id: true,
          name: true
        },
        orderBy: {
          name: 'asc'
        }
      })
    ]);

    // Logger l'activité
    await AuthLogger.logActivity(session.user.id, 'GET', '/api/employees', {
      filters: { department, status, search },
      pagination: { page, limit }
    });

    return NextResponse.json({
      employees,
      departments,
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        currentPage: page,
        limit
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des employés:', error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des employés" },
      { status: 500 }
    );
  }
}

// POST /api/employees - Créer un nouvel employé
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const body = await req.json();
    
    // Valider les données
    const validationResult = employeeSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Données invalides", details: validationResult.error.errors },
        { status: 400 }
      );
    }

    // Vérifier si le badge existe déjà
    const existingEmployee = await prisma.employees.findUnique({
      where: { badge_number: body.badgeNumber }
    });

    if (existingEmployee) {
      return NextResponse.json(
        { error: "Un employé avec ce numéro de badge existe déjà" },
        { status: 400 }
      );
    }

    // Créer l'employé
    const employee = await prisma.employees.create({
      data: {
        badge_number: body.badgeNumber,
        first_name: body.firstName,
        last_name: body.lastName,
        email: body.email,
        department: body.department,
        position: body.position,
        status: body.status,
        created_at: new Date(),
        updated_at: new Date()
      },
      include: {
        dept: true
      }
    });

    // Logger l'activité
    await AuthLogger.logActivity(session.user.id, 'POST', '/api/employees', {
      employeeId: employee.id,
      badgeNumber: employee.badge_number
    });

    return NextResponse.json(employee, { status: 201 });
  } catch (error) {
    console.error('Erreur lors de la création de l\'employé:', error);
    return NextResponse.json(
      { error: "Erreur lors de la création de l'employé" },
      { status: 500 }
    );
  }
}

// PUT /api/employees - Mettre à jour un employé
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const body = await req.json();
    
    if (!body.id) {
      return NextResponse.json(
        { error: "ID de l'employé requis" },
        { status: 400 }
      );
    }

    // Valider les données
    const validationResult = employeeSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Données invalides", details: validationResult.error.errors },
        { status: 400 }
      );
    }

    // Vérifier si l'employé existe
    const existingEmployee = await prisma.employees.findUnique({
      where: { id: body.id }
    });

    if (!existingEmployee) {
      return NextResponse.json(
        { error: "Employé non trouvé" },
        { status: 404 }
      );
    }

    // Vérifier si le badge est déjà utilisé par un autre employé
    if (body.badgeNumber !== existingEmployee.badge_number) {
      const badgeExists = await prisma.employees.findUnique({
        where: { badge_number: body.badgeNumber }
      });

      if (badgeExists) {
        return NextResponse.json(
          { error: "Un employé avec ce numéro de badge existe déjà" },
          { status: 400 }
        );
      }
    }

    // Mettre à jour l'employé
    const employee = await prisma.employees.update({
      where: { id: body.id },
      data: {
        badge_number: body.badgeNumber,
        first_name: body.firstName,
        last_name: body.lastName,
        email: body.email,
        department: body.department,
        position: body.position,
        status: body.status,
        updated_at: new Date()
      },
      include: {
        dept: true
      }
    });

    // Logger l'activité
    await AuthLogger.logActivity(session.user.id, 'PUT', '/api/employees', {
      employeeId: employee.id,
      badgeNumber: employee.badge_number
    });

    return NextResponse.json(employee);
  } catch (error) {
    console.error('Erreur lors de la mise à jour de l\'employé:', error);
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour de l'employé" },
      { status: 500 }
    );
  }
}

// DELETE /api/employees - Supprimer un employé
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
        { error: "ID de l'employé requis" },
        { status: 400 }
      );
    }

    // Vérifier si l'employé existe
    const existingEmployee = await prisma.employees.findUnique({
      where: { id }
    });

    if (!existingEmployee) {
      return NextResponse.json(
        { error: "Employé non trouvé" },
        { status: 404 }
      );
    }

    // Supprimer l'employé
    await prisma.employees.delete({
      where: { id }
    });

    // Logger l'activité
    await AuthLogger.logActivity(session.user.id, 'DELETE', '/api/employees', {
      employeeId: id,
      badgeNumber: existingEmployee.badge_number
    });

    return NextResponse.json({ message: "Employé supprimé avec succès" });
  } catch (error) {
    console.error('Erreur lors de la suppression de l\'employé:', error);
    return NextResponse.json(
      { error: "Erreur lors de la suppression de l'employé" },
      { status: 500 }
    );
  }
} 