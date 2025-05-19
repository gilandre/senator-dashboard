import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Vérifier que l'employé existe
    const employee = await prisma.employees.findUnique({
      where: { badge_number: params.id }
    });
    
    if (!employee) {
      return NextResponse.json(
        { error: 'Employé non trouvé' },
        { status: 404 }
      );
    }

    // Récupérer les pauses déjeuner
    const lunchBreaks = await prisma.lunch_breaks.findMany({
      where: {
        employee_id: employee.id,
        ...(startDate && endDate ? {
          date: {
            gte: new Date(startDate),
            lte: new Date(endDate)
          }
        } : {})
      },
      orderBy: { date: 'desc' }
    });

    return NextResponse.json(lunchBreaks);
  } catch (error) {
    console.error('Error fetching lunch breaks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch lunch breaks' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { date, start_time, end_time } = body;

    // Vérifier que l'employé existe
    const employee = await prisma.employees.findUnique({
      where: { badge_number: params.id }
    });
    
    if (!employee) {
      return NextResponse.json(
        { error: 'Employé non trouvé' },
        { status: 404 }
      );
    }

    // Calculer la durée en minutes
    const startDateTime = new Date(`${date}T${start_time}`);
    const endDateTime = new Date(`${date}T${end_time}`);
    const duration = Math.round((endDateTime.getTime() - startDateTime.getTime()) / (1000 * 60));

    // Créer ou mettre à jour la pause déjeuner
    const lunchBreak = await prisma.lunch_breaks.upsert({
      where: {
        unique_employee_date: {
          employee_id: employee.id,
          date: new Date(date)
        }
      },
      update: {
        start_time: startDateTime,
        end_time: endDateTime,
        duration
      },
      create: {
        employee_id: employee.id,
        date: new Date(date),
        start_time: startDateTime,
        end_time: endDateTime,
        duration
      }
    });

    return NextResponse.json(lunchBreak);
  } catch (error) {
    console.error('Error creating/updating lunch break:', error);
    return NextResponse.json(
      { error: 'Failed to create/update lunch break' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');

    if (!date) {
      return NextResponse.json(
        { error: 'Date parameter is required' },
        { status: 400 }
      );
    }

    // Vérifier que l'employé existe
    const employee = await prisma.employees.findUnique({
      where: { badge_number: params.id }
    });
    
    if (!employee) {
      return NextResponse.json(
        { error: 'Employé non trouvé' },
        { status: 404 }
      );
    }

    // Supprimer la pause déjeuner
    await prisma.lunch_breaks.delete({
      where: {
        unique_employee_date: {
          employee_id: employee.id,
          date: new Date(date)
        }
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting lunch break:', error);
    return NextResponse.json(
      { error: 'Failed to delete lunch break' },
      { status: 500 }
    );
  }
} 