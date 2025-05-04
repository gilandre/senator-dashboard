import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import mongoose from 'mongoose';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Define the schema for user activities
const userActivitySchema = new mongoose.Schema({
  userId: { type: String, required: true },
  userName: { type: String, required: true },
  action: { type: String, required: true },
  details: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  ipAddress: { type: String }
});

// Get the model (creating it if it doesn't exist)
const UserActivity = mongoose.models.UserActivity || 
  mongoose.model('UserActivity', userActivitySchema);

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // Check if user is authenticated
    if (!session) {
      return NextResponse.json(
        { error: 'Vous devez être connecté pour accéder à cette ressource' },
        { status: 401 }
      );
    }
    
    // Connect to the database
    await connectToDatabase();
    
    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50');
    const userId = searchParams.get('userId');
    const action = searchParams.get('action');
    
    // Build the query
    const query: any = {};
    if (userId) query.userId = userId;
    if (action) query.action = action;
    
    // Fetch activities with pagination
    const activities = await UserActivity.find(query)
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean();
    
    return NextResponse.json(activities);
  } catch (error) {
    console.error('Erreur lors de la récupération des activités:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des activités' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // Check if user is authenticated
    if (!session) {
      return NextResponse.json(
        { error: 'Vous devez être connecté pour accéder à cette ressource' },
        { status: 401 }
      );
    }
    
    // Connect to the database
    await connectToDatabase();
    
    // Get the request body
    const body = await request.json();
    
    // Validate required fields
    if (!body.userId || !body.userName || !body.action || !body.details) {
      return NextResponse.json(
        { error: 'Champs obligatoires manquants' },
        { status: 400 }
      );
    }
    
    // Get IP address from headers
    const ipAddress = request.headers.get('x-forwarded-for') || 
                      request.headers.get('x-real-ip') || 
                      'unknown';
    
    // Create the activity
    const activity = new UserActivity({
      userId: body.userId,
      userName: body.userName,
      action: body.action,
      details: body.details,
      ipAddress
    });
    
    // Save the activity
    await activity.save();
    
    return NextResponse.json({ success: true, activity });
  } catch (error) {
    console.error('Erreur lors de l\'enregistrement de l\'activité:', error);
    return NextResponse.json(
      { error: 'Erreur lors de l\'enregistrement de l\'activité' },
      { status: 500 }
    );
  }
} 