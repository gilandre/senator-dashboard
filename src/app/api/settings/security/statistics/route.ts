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
 * GET /api/settings/security/statistics
 * Récupérer les statistiques de sécurité pour l'interface client
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // Vérifier si l'utilisateur a les droits d'administration
    const user = await prisma.users.findUnique({
      where: { id: parseInt(session.user.id) },
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
    const [incidents, accessLogs, authLogs] = await Promise.all([
      // Statistiques des incidents de sécurité
      type === 'all' || type === 'incidents' ? prisma.security_incidents.findMany({
        where: {
          occurred_at: {
            gte: start,
            lte: end
          }
        },
        select: {
          occurred_at: true,
          type: true,
          status: true
        },
        orderBy: {
          occurred_at: 'asc'
        }
      }) : [],

      // Statistiques des accès
      type === 'all' || type === 'access' ? prisma.access_logs.findMany({
        where: {
          event_date: {
            gte: start,
            lte: end
          }
        },
        select: {
          event_date: true,
          event_time: true,
          event_type: true,
          direction: true,
          person_type: true
        },
        orderBy: {
          event_date: 'asc'
        }
      }) : [],

      // Statistiques d'authentification
      type === 'all' || type === 'auth' ? prisma.auth_log.findMany({
        where: {
          timestamp: {
            gte: start,
            lte: end
          }
        },
        select: {
          timestamp: true,
          event_type: true,
          details: true
        },
        orderBy: {
          timestamp: 'asc'
        }
      }) : []
    ]);

    // Agréger les données par période
    const aggregateData = (data: any[], dateField: string, groupBy: string) => {
      const aggregated = new Map();
      data.forEach(record => {
        const date = formatDate(new Date(record[dateField]));
        const key = `${date}`;
        if (!aggregated.has(key)) {
          aggregated.set(key, {
            date,
            count: 0,
            details: {}
          });
        }
        const entry = aggregated.get(key);
        entry.count++;

        // Agréger les détails selon le type de données
        if (record.type) {
          entry.details.types = entry.details.types || {};
          entry.details.types[record.type] = (entry.details.types[record.type] || 0) + 1;
        }
        if (record.event_type) {
          entry.details.event_types = entry.details.event_types || {};
          entry.details.event_types[record.event_type] = (entry.details.event_types[record.event_type] || 0) + 1;
        }
        if (record.status) {
          entry.details.statuses = entry.details.statuses || {};
          entry.details.statuses[record.status] = (entry.details.statuses[record.status] || 0) + 1;
        }
        if (record.direction) {
          entry.details.directions = entry.details.directions || {};
          entry.details.directions[record.direction] = (entry.details.directions[record.direction] || 0) + 1;
        }
        if (record.person_type) {
          entry.details.personTypes = entry.details.personTypes || {};
          entry.details.personTypes[record.person_type] = (entry.details.personTypes[record.person_type] || 0) + 1;
        }
      });
      return Array.from(aggregated.values());
    };

    // Logger l'activité
    try {
      await AuthLogger.logActivity(
        session.user.id,
        'GET',
        '/api/settings/security/statistics',
        { filters: { startDate, endDate, groupBy, type } }
      );
    } catch (logError) {
      console.error('Error logging activity:', logError);
      // Continue execution even if logging fails
    }

    return NextResponse.json({
      timeSeries: {
        incidents: aggregateData(incidents, 'occurred_at', groupBy),
        access: aggregateData(accessLogs, 'event_date', groupBy),
        auth: aggregateData(authLogs, 'timestamp', groupBy)
      },
      summary: {
        totalIncidents: incidents.length,
        totalAccess: accessLogs.length,
        totalAuth: authLogs.length,
        // Map status counts
        incidentsByStatus: incidents.reduce((acc, curr) => {
          acc[curr.status] = (acc[curr.status] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        accessByType: accessLogs.reduce((acc, curr) => {
          acc[curr.event_type || 'unknown'] = (acc[curr.event_type || 'unknown'] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        authByType: authLogs.reduce((acc, curr) => {
          acc[curr.event_type || 'unknown'] = (acc[curr.event_type || 'unknown'] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
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