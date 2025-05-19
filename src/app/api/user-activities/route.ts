import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import UserActivity, { IUserActivity } from '@/models/UserActivity';
import { connectToDatabase } from '@/lib/mongodb';

// GET /api/user-activities - Récupérer les activités récentes
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const userId = searchParams.get('userId');

    await connectToDatabase();
    
    // Construire la requête
    const query: any = {};
    if (userId) {
      query.userId = userId;
    }
    
    // Récupérer les activités récentes
    const activities = await UserActivity.find(query)
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean();
    
    // Formater les données pour l'API
    const formattedActivities = activities.map((activity: any) => ({
      id: activity._id.toString(),
      userId: activity.userId.toString(),
      userName: activity.userName,
      action: activity.action,
      timestamp: activity.timestamp.toISOString(),
      details: activity.details || null,
    }));
    
    return NextResponse.json(formattedActivities);
  } catch (error) {
    console.error('Erreur lors de la récupération des activités:', error);
    
    if (error instanceof mongoose.Error || error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { error: 'Une erreur s\'est produite lors de la récupération des activités' },
      { status: 500 }
    );
  }
}

// POST /api/user-activities - Enregistrer une nouvelle activité
export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Valider les données reçues
    if (!body.userId || !body.userName || !body.action) {
      return NextResponse.json(
        { error: 'Les champs userId, userName et action sont requis' },
        { status: 400 }
      );
    }
    
    await connectToDatabase();
    
    // Créer une nouvelle activité
    const newActivity = new UserActivity({
      userId: body.userId,
      userName: body.userName,
      action: body.action,
      details: body.details || null,
    });
    
    // Sauvegarder dans la base de données
    await newActivity.save();
    
    return NextResponse.json(
      { 
        id: newActivity._id.toString(),
        userId: newActivity.userId.toString(),
        userName: newActivity.userName,
        action: newActivity.action,
        timestamp: newActivity.timestamp.toISOString(),
        details: newActivity.details || null,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Erreur lors de l\'enregistrement de l\'activité:', error);
    
    if (error instanceof mongoose.Error || error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { error: 'Une erreur s\'est produite lors de l\'enregistrement de l\'activité' },
      { status: 500 }
    );
  }
}