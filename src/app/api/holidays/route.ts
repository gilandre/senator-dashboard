import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import Holiday, { IHoliday } from '@/models/Holiday';
import { connectToDatabase } from '@/lib/mongodb';

// GET /api/holidays - Récupérer tous les jours fériés
export async function GET() {
  try {
    await connectToDatabase();
    
    const holidays = await Holiday.find().sort({ date: 1 }).lean();
    
    // Formater les données pour l'API
    const formattedHolidays = holidays.map((holiday: any) => ({
      id: holiday._id.toString(),
      name: holiday.name,
      date: holiday.date.toISOString().split('T')[0], // Format YYYY-MM-DD
      type: holiday.type,
      description: holiday.description || ''
    }));
    
    return NextResponse.json(formattedHolidays);
  } catch (error) {
    console.error('Erreur lors de la récupération des jours fériés:', error);
    
    if (error instanceof mongoose.Error || error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
    
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
    
    await connectToDatabase();
    
    // Vérifier si un jour férié existe déjà à cette date
    const dateObj = new Date(body.date);
    const existingHoliday = await Holiday.findOne({ 
      date: {
        $gte: new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate()),
        $lt: new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate() + 1)
      }
    });
    
    if (existingHoliday) {
      return NextResponse.json(
        { error: 'Un jour férié existe déjà à cette date', existingHoliday },
        { status: 409 }
      );
    }
    
    // Créer un nouveau jour férié
    const newHoliday = new Holiday({
      name: body.name,
      date: new Date(body.date),
      type: body.type,
      description: body.description || '',
      repeatsYearly: body.repeatsYearly || false
    });
    
    // Sauvegarder dans la base de données
    await newHoliday.save();
    
    return NextResponse.json(
      { 
        id: newHoliday._id.toString(),
        name: newHoliday.name,
        date: newHoliday.date.toISOString().split('T')[0],
        type: newHoliday.type,
        description: newHoliday.description,
        repeatsYearly: newHoliday.repeatsYearly
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Erreur lors de la création du jour férié:', error);
    
    if (error instanceof mongoose.Error || error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { error: 'Une erreur s\'est produite lors de la création du jour férié' },
      { status: 500 }
    );
  }
} 