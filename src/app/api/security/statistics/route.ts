import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { AuthLogger } from "@/lib/auth-logger";
import { z } from "zod";

// Schéma de validation pour les paramètres de requête
const querySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  groupBy: z.enum(['hour', 'day', 'week', 'month']).optional().default('day'),
  type: z.enum(['all', 'incidents', 'access', 'auth']).optional().default('all')
});

/**
 * GET /api/security/statistics
 * Récupérer les statistiques détaillées de sécurité
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // Vérifier si l'utilisateur a les droits d'administration
    const user = await prisma.users.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    });

    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: "Accès non autorisé" }, { status: 403 });
    }

    // Récupérer et valider les paramètres de requête
    const { searchParams } = new URL(req.url);
    const queryParams = {
      startDate: searchParams.get('startDate'),
      endDate: searchParams.get('endDate'),
      groupBy: searchParams.get('groupBy') || 'day',
      type: searchParams.get('type') || 'all'
    };

    const validationResult = querySchema.safeParse(queryParams);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Paramètres invalides", details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { startDate, endDate, groupBy, type } = validationResult.data;
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 jours par défaut
    const end = endDate ? new Date(endDate) : new Date();

    // Fonction pour formater la date selon le groupement
    const formatDate = (date: Date) => {
      switch (groupBy) {
        case 'hour':
          return date.toISOString().slice(0, 13);
        case 'day':
          return date.toISOString().slice(0, 10);
        case 'week':
          const week = Math.ceil((date.getDate() + date.getDay()) / 7);
          return `${date.getFullYear()}-W${week}`;
        case 'month':
          return date.toISOString().slice(0, 7);
        default:
          return date.toISOString().slice(0, 10);
      }
    };

    // Récupérer les statistiques selon le type demandé
    const statistics = await Promise.all([
      // Statistiques des incidents de sécurité
      type === 'all' || type === 'incidents' ? prisma.security_incidents.groupBy({
        by: ['type', 'severity'],
        where: {
          createdAt: {
            gte: start,
            lte: end
          }
        },
        _count: true
      }) : [],
      
      // Statistiques des accès
      type === 'all' || type === 'access' ? prisma.access_logs.groupBy({
        by: ['status', 'direction'],
        where: {
          timestamp: {
            gte: start,
            lte: end
          }
        },
        _count: true
      }) : [],

      // Statistiques d'authentification
      type === 'all' || type === 'auth' ? prisma.auth_logs.groupBy({
        by: ['action', 'status'],
        where: {
          timestamp: {
            gte: start,
            lte: end
          }
        },
        _count: true
      }) : []
    ]);

    // Statistiques temporelles (évolution dans le temps)
    const timeSeriesData = await Promise.all([
      // Incidents dans le temps
      type === 'all' || type === 'incidents' ? prisma.security_incidents.findMany({
        where: {
          createdAt: {
            gte: start,
            lte: end
          }
        },
        select: {
          createdAt: true,
          type: true,
          severity: true
        },
        orderBy: {
          createdAt: 'asc'
        }
      }) : [],

      // Accès dans le temps
      type === 'all' || type === 'access' ? prisma.access_logs.findMany({
        where: {
          timestamp: {
            gte: start,
            lte: end
          }
        },
        select: {
          timestamp: true,
          status: true,
          direction: true
        },
        orderBy: {
          timestamp: 'asc'
        }
      }) : [],

      // Authentifications dans le temps
      type === 'all' || type === 'auth' ? prisma.auth_logs.findMany({
        where: {
          timestamp: {
            gte: start,
            lte: end
          }
        },
        select: {
          timestamp: true,
          action: true,
          status: true
        },
        orderBy: {
          timestamp: 'asc'
        }
      }) : []
    ]);

    // Agréger les données temporelles
    const aggregateTimeSeries = (data: any[], dateField: string) => {
      const aggregated = new Map();
      data.forEach(record => {
        const date = formatDate(new Date(record[dateField]));
        const key = `${date}`;
        if (!aggregated.has(key)) {
          aggregated.set(key, { date, count: 0 });
        }
        aggregated.get(key).count++;
      });
      return Array.from(aggregated.values());
    };

    // Logger l'activité
    await AuthLogger.logActivity(session.user.id, 'GET', '/api/security/statistics', {
      action: 'view_security_statistics',
      filters: { startDate, endDate, groupBy, type }
    });

    return NextResponse.json({
      summary: {
        incidents: statistics[0],
        access: statistics[1],
        auth: statistics[2]
      },
      timeSeries: {
        incidents: aggregateTimeSeries(timeSeriesData[0], 'createdAt'),
        access: aggregateTimeSeries(timeSeriesData[1], 'timestamp'),
        auth: aggregateTimeSeries(timeSeriesData[2], 'timestamp')
      },
      filters: {
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        groupBy,
        type
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques de sécurité:', error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des statistiques de sécurité" },
      { status: 500 }
    );
  }
} 