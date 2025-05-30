import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

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
    
    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50');
    const userId = searchParams.get('userId');
    const action = searchParams.get('action');
    
    // Build the query
    const where: any = {};
    if (userId) where.userId = parseInt(userId);
    if (action) where.action = action;
    
    // Fetch activities with pagination
    const activities = await prisma.user_activities.findMany({
      where,
      orderBy: {
        timestamp: 'desc'
      },
      take: limit
    });
    
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
    
    // Get the request body
    const body = await request.json();
    
    // Validate required fields
    if (!body.userId || !body.action) {
      return NextResponse.json(
        { error: 'Champs obligatoires manquants' },
        { status: 400 }
      );
    }
    
    // Get IP address from headers
    const ipAddress = request.headers.get('x-forwarded-for') || 
                      request.headers.get('x-real-ip') || 
                      'unknown';
    
    // Create the activity using Prisma
    const activity = await prisma.user_activities.create({
      data: {
        user_id: parseInt(body.userId),
        action: body.action,
        details: body.details || null,
        ip_address: ipAddress,
        timestamp: new Date()
      }
    });
    
    return NextResponse.json({ success: true, activity });
  } catch (error) {
    console.error('Erreur lors de l\'enregistrement de l\'activité:', error);
    return NextResponse.json(
      { error: 'Erreur lors de l\'enregistrement de l\'activité' },
      { status: 500 }
    );
  }
} 