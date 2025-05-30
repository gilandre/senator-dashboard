import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * @swagger
 * /api/user-activities:
 *   get:
 *     summary: Get user activities
 *     description: Retrieve recent user activities with optional filtering
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Maximum number of activities to return
 *       - in: query
 *         name: userId
 *         schema:
 *           type: integer
 *         description: Filter activities by user ID
 *     responses:
 *       200:
 *         description: List of user activities
 *         content:
 *           application/json:
 *             example:
 *               - id: 1
 *                 userId: 1
 *                 action: LOGIN
 *                 timestamp: '2024-05-20T09:30:00Z'
 *       500:
 *         description: Server error
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const userId = searchParams.get('userId');

    // Construire la requête
    const where: any = {};
    if (userId) {
      where.user_id = parseInt(userId);
    }
    
    // Récupérer les activités récentes avec Prisma
    const activities = await prisma.user_activities.findMany({
      where,
      orderBy: {
        timestamp: 'desc'
      },
      take: limit
    });
    
    // Formater les données pour l'API (assurez-vous que l'API reste compatible)
    const formattedActivities = activities.map(activity => ({
      id: activity.id.toString(),
      userId: activity.user_id.toString(),
      timestamp: activity.timestamp.toISOString(),
      action: activity.action,
      details: activity.details || null,
    }));
    
    return NextResponse.json(formattedActivities);
  } catch (error) {
    console.error('Erreur lors de la récupération des activités:', error);
    
    if (error instanceof Error) {
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

/**
 * @swagger
 * /api/user-activities:
 *   post:
 *     summary: Create new user activity
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - action
 *             properties:
 *               userId:
 *                 type: integer
 *                 example: 1
 *               action:
 *                 type: string
 *                 example: LOGIN
 *               details:
 *                 type: string
 *                 example: User logged in from 192.168.1.1
 *     responses:
 *       201:
 *         description: Activity created successfully
 *         content:
 *           application/json:
 *             example:
 *               id: 1
 *               userId: 1
 *               action: LOGIN
 *               timestamp: '2024-05-20T09:30:00Z'
 *       400:
 *         description: Missing required fields
 *       500:
 *         description: Server error
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Valider les données reçues
    if (!body.userId || !body.action) {
      return NextResponse.json(
        { error: 'Les champs userId et action sont requis' },
        { status: 400 }
      );
    }
    
    // Créer une nouvelle activité avec Prisma
    const newActivity = await prisma.user_activities.create({
      data: {
        user_id: parseInt(body.userId),
        action: body.action,
        details: body.details || null,
        timestamp: new Date(),
        ip_address: null // Si nécessaire, récupérer à partir de request
      }
    });
    
    return NextResponse.json(
      { 
        id: newActivity.id.toString(),
        userId: newActivity.user_id.toString(),
        action: newActivity.action,
        timestamp: newActivity.timestamp.toISOString(),
        details: newActivity.details || null,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Erreur lors de l\'enregistrement de l\'activité:', error);
    
    if (error instanceof Error) {
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