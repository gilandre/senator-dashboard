import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/holidays - Récupérer tous les jours fériés
export async function GET() {
  try {
    const holidays = await prisma.holidays.findMany({
      orderBy: { date: 'asc' }
    });
    
    // Formater les données pour l'API
    const formattedHolidays = holidays.map((holiday) => ({
      id: holiday.id.toString(),
      name: holiday.name,
      date: holiday.date.toISOString().split('T')[0], // Format YYYY-MM-DD
      type: holiday.type,
      description: holiday.description || ''
    }));
    
    return NextResponse.json(formattedHolidays);
  } catch (error) {
    console.error('Erreur lors de la récupération des jours fériés:', error);
    
    return NextResponse.json(
      { error: 'Une erreur s\'est produite lors de la récupération des jours fériés' },
      { status: 500 }
    );
  }
}

// POST /api/holidays - Ajouter un nouveau jour férié
export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Valider les données reçues
    if (!body.name || !body.date || !body.type) {
      return NextResponse.json(
        { error: 'Les champs name, date et type sont requis' },
        { status: 400 }
      );
    }
    
    // Vérifier si un jour férié existe déjà à cette date
    const dateObj = new Date(body.date);
    const startOfDay = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate());
    const endOfDay = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate() + 1);
    
    const existingHoliday = await prisma.holidays.findFirst({
      where: {
        date: {
          gte: startOfDay,
          lt: endOfDay
        }
      }
    });
    
    if (existingHoliday) {
      return NextResponse.json(
        { error: 'Un jour férié existe déjà à cette date', existingHoliday },
        { status: 409 }
      );
    }
    
    // Créer un nouveau jour férié
    const newHoliday = await prisma.holidays.create({
      data: {
        name: body.name,
        date: new Date(body.date),
        type: body.type,
        description: body.description || '',
        repeats_yearly: body.repeatsYearly || false
      }
    });
    
    return NextResponse.json(
      { 
        id: newHoliday.id.toString(),
        name: newHoliday.name,
        date: newHoliday.date.toISOString().split('T')[0],
        type: newHoliday.type,
        description: newHoliday.description,
        repeatsYearly: newHoliday.repeats_yearly
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Erreur lors de la création du jour férié:', error);
    
    return NextResponse.json(
      { error: 'Une erreur s\'est produite lors de la création du jour férié' },
      { status: 500 }
    );
  }
} 