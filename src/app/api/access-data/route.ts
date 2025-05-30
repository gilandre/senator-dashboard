import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { AuthLogger } from '@/lib/security/authLogger';

/**
 * GET /api/access-data - Récupérer les données d'accès
 */
export async function GET(req: NextRequest) {
  try {
    // Vérification de l'authentification
    const session = await getServerSession(authOptions);
    // Vérifier si la requête a l'en-tête de bypass d'authentification pour le développement
    const bypassAuth = req.headers.get('x-test-bypass-auth') === 'admin';
    
    if (!session && !bypassAuth) {
      return NextResponse.json({ error: "Authentification requise" }, { status: 401 });
    }

    // Récupérer les paramètres de la requête
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const personType = searchParams.get('personType');
    const department = searchParams.get('department');
    const getMaxDate = searchParams.get('getMaxDate') === 'true';
    const type = searchParams.get('type');

    // Si on demande la date maximale
    if (getMaxDate) {
      const maxDate = await prisma.access_logs.findFirst({
        orderBy: {
          event_date: 'desc'
        },
        select: {
          event_date: true
        }
      });

      return NextResponse.json({
        maxDate: maxDate?.event_date || new Date()
      });
    }

    // Traitement des données horaires pour le graphique
    if (type === 'hourly') {
      try {
        // Vérifier les dates
        const startDateTime = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const endDateTime = endDate ? new Date(endDate) : new Date();

        // Récupérer les statistiques horaires
        const hourlyStats = await prisma.$queryRaw`
          SELECT 
            HOUR(event_time) as hour,
            COUNT(*) as count
          FROM access_logs
          WHERE event_time IS NOT NULL 
            AND event_date BETWEEN ${startDateTime} AND ${endDateTime}
            ${personType ? `AND person_type = '${personType}'` : ''}
            ${department ? `AND group_name = '${department}'` : ''}
          GROUP BY HOUR(event_time)
          ORDER BY hour
        `;

        // Enregistrer l'activité
        await AuthLogger.logActivity(
          session?.user?.id || 'bypass-auth-admin',
          'access_data_view',
          `Consultation des données d'accès horaires du ${startDate} au ${endDate}`
        );

        return NextResponse.json({
          hourlyTraffic: (hourlyStats as any[]).map((stat: any) => ({
            hour: Number(stat.hour),
            count: Number(stat.count)
          }))
        });
      } catch (error) {
        console.error('Erreur lors de la récupération des données horaires:', error);
        return NextResponse.json(
          { error: "Erreur lors de la récupération des données horaires" },
          { status: 500 }
        );
      }
    }

    // Valider les dates
    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: "Les dates de début et de fin sont requises" },
        { status: 400 }
      );
    }

    // Construire la requête
    const where = {
      event_date: {
        gte: new Date(startDate),
        lte: new Date(endDate)
      },
      ...(personType && { person_type: personType }),
      ...(department && { group_name: department })
    };

    // Récupérer les données d'accès
    const accessLogs = await prisma.access_logs.findMany({
      where,
      orderBy: [
        { event_date: 'desc' },
        { event_time: 'desc' }
      ]
    });

    // Enregistrer l'activité
    await AuthLogger.logActivity(
      session?.user?.id || 'bypass-auth-admin',
      'access_data_view',
      `Consultation des données d'accès du ${startDate} au ${endDate}`
    );

    return NextResponse.json({ accessLogs });
  } catch (error) {
    console.error('Erreur lors de la récupération des données d\'accès:', error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des données d'accès" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/access-data - Enregistrer une nouvelle donnée d'accès
 */
export async function POST(req: NextRequest) {
  try {
    // Vérification de l'authentification
    const session = await getServerSession(authOptions);
    // Vérifier si la requête a l'en-tête de bypass d'authentification pour le développement
    const bypassAuth = req.headers.get('x-test-bypass-auth') === 'admin';
    
    if (!session && !bypassAuth) {
      return NextResponse.json({ error: "Authentification requise" }, { status: 401 });
    }

    const body = await req.json();
    const {
      badgeNumber,
      personType,
      eventType,
      eventDate,
      eventTime,
      reader,
      groupName,
      notes
    } = body;

    // Valider les données requises
    if (!badgeNumber || !personType || !eventType || !eventDate || !eventTime || !reader) {
      return NextResponse.json(
        { error: "Tous les champs obligatoires doivent être remplis" },
        { status: 400 }
      );
    }

    // Vérifier si la personne existe
    let person;
    if (personType === 'employee') {
      person = await prisma.employee.findFirst({
        where: { badge_number: badgeNumber }
      });
    } else {
      person = await prisma.visitor.findFirst({
        where: { badge_number: badgeNumber }
      });
    }

    if (!person) {
      return NextResponse.json(
        { error: `${personType === 'employee' ? 'Employé' : 'Visiteur'} non trouvé` },
        { status: 404 }
      );
    }

    // Créer l'enregistrement d'accès
    const accessLog = await prisma.access_logs.create({
      data: {
        badge_number: badgeNumber,
        person_type: personType,
        event_type: eventType,
        event_date: new Date(eventDate),
        event_time: new Date(`${eventDate}T${eventTime}`),
        reader,
        group_name: groupName,
        notes,
        created_by: session.user.id
      }
    });

    // Enregistrer l'activité
    await AuthLogger.logActivity(
      session?.user?.id || 'bypass-auth-admin',
      'access_data_create',
      `Enregistrement d'une donnée d'accès pour ${person.name}`
    );

    return NextResponse.json({ accessLog }, { status: 201 });
  } catch (error) {
    console.error('Erreur lors de l\'enregistrement de la donnée d\'accès:', error);
    return NextResponse.json(
      { error: "Erreur lors de l'enregistrement de la donnée d'accès" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/access-data - Mettre à jour une donnée d'accès
 */
export async function PUT(req: NextRequest) {
  try {
    // Vérification de l'authentification
    const session = await getServerSession(authOptions);
    // Vérifier si la requête a l'en-tête de bypass d'authentification pour le développement
    const bypassAuth = req.headers.get('x-test-bypass-auth') === 'admin';
    
    if (!session && !bypassAuth) {
      return NextResponse.json({ error: "Authentification requise" }, { status: 401 });
    }

    const body = await req.json();
    const {
      id,
      eventType,
      eventTime,
      reader,
      groupName,
      notes
    } = body;

    if (!id) {
      return NextResponse.json(
        { error: "ID de donnée d'accès requis" },
        { status: 400 }
      );
    }

    // Vérifier si la donnée d'accès existe
    const existingLog = await prisma.access_logs.findUnique({
      where: { id: Number(id) }
    });

    if (!existingLog) {
      return NextResponse.json(
        { error: "Donnée d'accès non trouvée" },
        { status: 404 }
      );
    }

    // Mettre à jour la donnée d'accès
    const accessLog = await prisma.access_logs.update({
      where: { id: Number(id) },
      data: {
        event_type: eventType,
        event_time: eventTime ? new Date(eventTime) : undefined,
        reader,
        group_name: groupName,
        notes,
        updated_at: new Date(),
        updated_by: session.user.id
      }
    });

    // Enregistrer l'activité
    await AuthLogger.logActivity(
      session?.user?.id || 'bypass-auth-admin',
      'access_data_update',
      `Mise à jour d'une donnée d'accès pour badge ${existingLog.badge_number}`
    );

    return NextResponse.json({ accessLog });
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la donnée d\'accès:', error);
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour de la donnée d'accès" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/access-data - Supprimer une donnée d'accès
 */
export async function DELETE(req: NextRequest) {
  try {
    // Vérification de l'authentification
    const session = await getServerSession(authOptions);
    // Vérifier si la requête a l'en-tête de bypass d'authentification pour le développement
    const bypassAuth = req.headers.get('x-test-bypass-auth') === 'admin';
    
    if (!session && !bypassAuth) {
      return NextResponse.json({ error: "Authentification requise" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: "ID de donnée d'accès requis" },
        { status: 400 }
      );
    }

    // Vérifier si la donnée d'accès existe
    const accessLog = await prisma.access_logs.findUnique({
      where: { id: Number(id) }
    });

    if (!accessLog) {
      return NextResponse.json(
        { error: "Donnée d'accès non trouvée" },
        { status: 404 }
      );
    }

    // Supprimer la donnée d'accès
    await prisma.access_logs.delete({
      where: { id: Number(id) }
    });

    // Enregistrer l'activité
    await AuthLogger.logActivity(
      session?.user?.id || 'bypass-auth-admin',
      'access_data_delete',
      `Suppression d'une donnée d'accès pour badge ${accessLog.badge_number}`
    );

    return NextResponse.json({ message: "Donnée d'accès supprimée avec succès" });
  } catch (error) {
    console.error('Erreur lors de la suppression de la donnée d\'accès:', error);
    return NextResponse.json(
      { error: "Erreur lors de la suppression de la donnée d'accès" },
      { status: 500 }
    );
  }
} 