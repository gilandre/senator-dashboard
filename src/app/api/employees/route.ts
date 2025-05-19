import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const department = searchParams.get('department') || '';
    const status = searchParams.get('status') || '';
    const badge = searchParams.get('badge') || '';

    // Obtenir tous les badges identifiés comme employés dans access_logs
    const employeeBadges = await prisma.access_logs.findMany({
      where: {
        person_type: 'employee'
      },
      select: {
        badge_number: true
      },
      distinct: ['badge_number']
    });

    // Extraire les numéros de badges
    const validEmployeeBadges = employeeBadges.map(b => b.badge_number);

    // Construire la requête avec les filtres
    const where = {
      AND: [
        // Filtre principal: seulement les badges identifiés comme employés
        { badge_number: { in: validEmployeeBadges } },
        // Recherche par nom, prénom, badge ou email
        search ? {
          OR: [
            { first_name: { contains: search } },
            { last_name: { contains: search } },
            { badge_number: { contains: search } },
            { email: { contains: search } }
          ]
        } : {},
        // Filtre par département
        department ? { department: department } : {},
        // Filtre par statut
        status ? { status: status as any } : {},
        // Filtre par badge
        badge ? { badge_number: badge } : {}
      ]
    };

    // Récupérer le nombre total d'employés (pour la pagination)
    const total = await prisma.employees.count({ where });

    // Récupérer les employés avec pagination
    const employees = await prisma.employees.findMany({
      where,
      include: {
        dept: {
          select: {
            name: true,
            description: true
          }
        }
      },
      orderBy: [
        { updated_at: 'desc' },
        { last_name: 'asc' },
        { first_name: 'asc' }
      ],
      skip: (page - 1) * limit,
      take: limit
    });

    // Pour chaque badge, vérifier s'il est partagé et récupérer l'historique
    const badgeNumbers = Array.from(new Set(employees.map(e => e.badge_number)));
    
    const badgeHistories = await Promise.all(
      badgeNumbers.map(async (badge_number) => {
        const history = await prisma.employees.findMany({
          where: { badge_number },
          include: {
            dept: {
              select: {
                name: true,
                description: true
              }
            }
          },
          orderBy: { updated_at: 'desc' },
        });
        
        // Si le badge est utilisé par plusieurs employés,
        // marquer le premier (le plus récent) comme actif, les autres comme inactifs
        if (history.length > 1) {
          const [mostRecent, ...others] = history;
          
          // Mettre à jour le statut dans la base de données si nécessaire
          if (mostRecent.status !== 'active') {
            await prisma.employees.update({
              where: { id: mostRecent.id },
              data: { status: 'active' }
            });
          }
          
          // Mettre à jour les statuts des autres utilisateurs du badge
          for (const other of others) {
            if (other.status !== 'inactive') {
              await prisma.employees.update({
                where: { id: other.id },
                data: { status: 'inactive' }
              });
            }
          }
          
          return {
            badge_number,
            isShared: true,
            history: [
              { ...mostRecent, status: 'active' },
              ...others.map(o => ({ ...o, status: 'inactive' }))
            ]
          };
        }
        
        return {
          badge_number,
          isShared: false,
          history: history
        };
      })
    );

    // Structurer les données pour intégrer l'historique des badges
    const enrichedEmployees = employees.map(employee => {
      const badgeInfo = badgeHistories.find(bh => bh.badge_number === employee.badge_number);
      return {
        ...employee,
        isSharedBadge: badgeInfo?.isShared || false,
        badgeHistory: badgeInfo?.history || []
      };
    });

    // Récupérer la liste des départements pour les filtres
    const departments = await prisma.departments.findMany({
      select: {
        id: true,
        name: true
      },
      orderBy: {
        name: 'asc'
      }
    });

    return NextResponse.json({
      employees: enrichedEmployees,
      badgeHistories,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      },
      departments,
      filters: {
        search,
        department,
        status
      }
    });
  } catch (error) {
    console.error('Error in employees API:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// POST /api/employees - Créer un nouvel employé
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const employeeData = await req.json();

    // Validation des données requises
    if (!employeeData.badge_number) {
      return NextResponse.json({ error: 'Le numéro de badge est requis' }, { status: 400 });
    }
    
    if (!employeeData.first_name) {
      return NextResponse.json({ error: 'Le prénom est requis' }, { status: 400 });
    }
    
    if (!employeeData.last_name) {
      return NextResponse.json({ error: 'Le nom est requis' }, { status: 400 });
    }

    // Vérifier si le badge est déjà utilisé et définir les anciens comme inactifs
    const existingEmployeesWithBadge = await prisma.employees.findMany({
      where: { badge_number: employeeData.badge_number }
    });

    // Si le badge est déjà utilisé, mettre à jour les employés existants comme inactifs
    if (existingEmployeesWithBadge.length > 0) {
      for (const emp of existingEmployeesWithBadge) {
        await prisma.employees.update({
          where: { id: emp.id },
          data: { status: 'inactive' }
        });
      }
    }

    // Vérifier si l'email est déjà utilisé (si fourni)
    if (employeeData.email) {
      const emailExists = await prisma.employees.findFirst({
        where: { email: employeeData.email }
      });

      if (emailExists) {
        return NextResponse.json(
          { error: 'Cette adresse email est déjà utilisée' },
          { status: 400 }
        );
      }
    }

    // Vérifier si l'ID employé est déjà utilisé (si fourni)
    if (employeeData.employee_id) {
      const employeeIdExists = await prisma.employees.findFirst({
        where: { employee_id: employeeData.employee_id }
      });

      if (employeeIdExists) {
        return NextResponse.json(
          { error: 'Cet ID employé est déjà utilisé' },
          { status: 400 }
        );
      }
    }

    // Créer l'employé avec statut actif
    const newEmployee = await prisma.employees.create({
      data: {
        badge_number: employeeData.badge_number,
        employee_id: employeeData.employee_id || null,
        first_name: employeeData.first_name,
        last_name: employeeData.last_name,
        email: employeeData.email || null,
        department_id: employeeData.department_id ? parseInt(employeeData.department_id.toString()) : null,
        position: employeeData.position || null,
        status: 'active', // Toujours actif à la création
        created_at: new Date(),
        updated_at: new Date()
      }
    });

    return NextResponse.json(newEmployee, { status: 201 });
  } catch (error) {
    console.error('Error creating employee:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
} 