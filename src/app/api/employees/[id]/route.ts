import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// GET /api/employees/:id - Récupérer un employé par ID
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json({ error: 'ID invalide' }, { status: 400 });
    }

    const employee = await prisma.employees.findUnique({
      where: { id },
      include: {
        dept: {
          select: {
            id: true,
            name: true,
            description: true
          }
        }
      }
    });

    if (!employee) {
      return NextResponse.json({ error: 'Employé non trouvé' }, { status: 404 });
    }

    return NextResponse.json({
      id: employee.id,
      badge_number: employee.badge_number,
      employee_id: employee.employee_id,
      first_name: employee.first_name,
      last_name: employee.last_name,
      email: employee.email,
      department: employee.department,
      department_id: employee.department_id,
      position: employee.position,
      status: employee.status,
      created_at: employee.created_at,
      updated_at: employee.updated_at,
      dept: employee.dept,
      firstName: employee.first_name, // Pour la compatibilité avec les composants existants
      lastName: employee.last_name     // Pour la compatibilité avec les composants existants
    });
  } catch (error) {
    console.error('Error retrieving employee:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// PUT /api/employees/:id - Mettre à jour un employé
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json({ error: 'ID invalide' }, { status: 400 });
    }

    const employeeData = await req.json();

    // Vérifier si l'employé existe
    const existingEmployee = await prisma.employees.findUnique({
      where: { id }
    });

    if (!existingEmployee) {
      return NextResponse.json({ error: 'Employé non trouvé' }, { status: 404 });
    }

    // Vérifier si le badge_number ou email sont déjà utilisés par un autre employé
    if (employeeData.badge_number !== existingEmployee.badge_number) {
      const badgeExists = await prisma.employees.findFirst({
        where: {
          badge_number: employeeData.badge_number,
          id: { not: id }
        }
      });

      if (badgeExists) {
        return NextResponse.json(
          { error: 'Ce numéro de badge est déjà utilisé par un autre employé' },
          { status: 400 }
        );
      }
    }

    if (employeeData.email && employeeData.email !== existingEmployee.email) {
      const emailExists = await prisma.employees.findFirst({
        where: {
          email: employeeData.email,
          id: { not: id }
        }
      });

      if (emailExists) {
        return NextResponse.json(
          { error: 'Cette adresse email est déjà utilisée par un autre employé' },
          { status: 400 }
        );
      }
    }

    if (employeeData.employee_id && employeeData.employee_id !== existingEmployee.employee_id) {
      const employeeIdExists = await prisma.employees.findFirst({
        where: {
          employee_id: employeeData.employee_id,
          id: { not: id }
        }
      });

      if (employeeIdExists) {
        return NextResponse.json(
          { error: 'Cet ID employé est déjà utilisé par un autre employé' },
          { status: 400 }
        );
      }
    }

    // Mettre à jour l'employé
    const updatedEmployee = await prisma.employees.update({
      where: { id },
      data: {
        badge_number: employeeData.badge_number,
        employee_id: employeeData.employee_id || null,
        first_name: employeeData.first_name,
        last_name: employeeData.last_name,
        email: employeeData.email || null,
        department_id: employeeData.department_id ? parseInt(employeeData.department_id.toString()) : null,
        position: employeeData.position || null,
        status: employeeData.status,
        updated_at: new Date()
      }
    });

    return NextResponse.json(updatedEmployee);
  } catch (error) {
    console.error('Error updating employee:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// DELETE /api/employees/:id - Supprimer un employé
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json({ error: 'ID invalide' }, { status: 400 });
    }

    // Vérifier si l'employé existe
    const existingEmployee = await prisma.employees.findUnique({
      where: { id }
    });

    if (!existingEmployee) {
      return NextResponse.json({ error: 'Employé non trouvé' }, { status: 404 });
    }

    // Supprimer l'employé
    await prisma.employees.delete({
      where: { id }
    });

    return NextResponse.json({ message: 'Employé supprimé avec succès' });
  } catch (error) {
    console.error('Error deleting employee:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
} 