import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { AuthLogger } from '@/lib/auth-logger';
import { z } from 'zod';

// Schéma de validation pour les paramètres d'audit
const auditSchema = z.object({
  type: z.enum([
    'security_settings',
    'user_access',
    'authentication',
    'incidents',
    'system_health',
    'compliance'
  ]),
  scope: z.enum(['full', 'partial', 'targeted']),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  targetUsers: z.array(z.string()).optional(),
  targetResources: z.array(z.string()).optional(),
  includeDetails: z.boolean().optional().default(true)
});

/**
 * POST /api/security/audit
 * Déclencher un audit de sécurité
 */
export async function POST(req: NextRequest) {
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

    const body = await req.json();
    const validationResult = auditSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Données invalides", details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { type, scope, startDate, endDate, targetUsers, targetResources, includeDetails } = validationResult.data;

    // Créer l'incident d'audit
    const audit = await prisma.security_incidents.create({
      data: {
        type: 'security_audit',
        severity: 'medium',
        description: `Audit de sécurité: ${type} - ${scope}`,
        details: {
          auditType: type,
          scope,
          startDate: startDate ? new Date(startDate) : null,
          endDate: endDate ? new Date(endDate) : null,
          targetUsers,
          targetResources,
          includeDetails,
          requestedBy: session.user.id,
          status: 'in_progress'
        },
        status: 'in_progress',
        assignedTo: session.user.id
      }
    });

    // Logger l'activité
    await AuthLogger.logActivity(session.user.id, 'POST', '/api/security/audit', {
      action: 'trigger_security_audit',
      auditId: audit.id,
      type,
      scope
    });

    // Lancer l'audit en arrière-plan
    // Note: Dans un environnement de production, cela devrait être géré par une file d'attente
    setTimeout(async () => {
      try {
        let auditResults: any = {};

        switch (type) {
          case 'security_settings':
            auditResults = await auditSecuritySettings(startDate, endDate);
            break;
          case 'user_access':
            auditResults = await auditUserAccess(startDate, endDate, targetUsers);
            break;
          case 'authentication':
            auditResults = await auditAuthentication(startDate, endDate);
            break;
          case 'incidents':
            auditResults = await auditIncidents(startDate, endDate);
            break;
          case 'system_health':
            auditResults = await auditSystemHealth();
            break;
          case 'compliance':
            auditResults = await auditCompliance(startDate, endDate);
            break;
        }

        // Mettre à jour l'incident avec les résultats
        await prisma.security_incidents.update({
          where: { id: audit.id },
          data: {
            status: 'resolved',
            details: {
              ...audit.details,
              results: auditResults,
              completedAt: new Date()
            }
          }
        });

        // Logger la fin de l'audit
        await AuthLogger.logActivity(session.user.id, 'AUDIT', '/api/security/audit', {
          action: 'complete_security_audit',
          auditId: audit.id,
          type,
          scope
        });
      } catch (error) {
        console.error('Erreur lors de l\'audit de sécurité:', error);
        
        // Mettre à jour l'incident en cas d'erreur
        await prisma.security_incidents.update({
          where: { id: audit.id },
          data: {
            status: 'closed',
            details: {
              ...audit.details,
              error: error instanceof Error ? error.message : 'Erreur inconnue',
              completedAt: new Date()
            }
          }
        });
      }
    }, 0);

    return NextResponse.json({
      message: "Audit de sécurité initié",
      audit
    }, { status: 202 });
  } catch (error) {
    console.error('Erreur lors de l\'initiation de l\'audit de sécurité:', error);
    return NextResponse.json(
      { error: "Erreur lors de l'initiation de l'audit de sécurité" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/security/audit
 * Récupérer les résultats d'un audit spécifique ou la liste des audits
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

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    
    // Use user_activities table for audit information
    try {
      const audits = await prisma.user_activities.findMany({
        where: {
          action: { contains: 'security' }
        },
        orderBy: { timestamp: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          users: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });
      
      const total = await prisma.user_activities.count({
        where: {
          action: { contains: 'security' }
        }
      });

      // Log the activity
      try {
        await AuthLogger.logActivity(
          session.user.id,
          'GET',
          '/api/security/audit',
          { page, limit }
        );
      } catch (logError) {
        console.error('Error logging activity:', logError);
      }

      return NextResponse.json({
        audits,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      return NextResponse.json(
        { error: "Erreur lors de la récupération des journaux d'audit" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Erreur lors de la récupération des audits:', error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des audits" },
      { status: 500 }
    );
  }
}

// Fonctions d'audit spécifiques
async function auditSecuritySettings(startDate?: string | null, endDate?: string | null) {
  const settings = await prisma.security_settings.findMany({
    where: {
      updatedAt: {
        gte: startDate ? new Date(startDate) : undefined,
        lte: endDate ? new Date(endDate) : undefined
      }
    },
    include: {
      updatedByUser: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true
        }
      }
    },
    orderBy: { updatedAt: 'desc' }
  });

  return {
    settings,
    changes: settings.length,
    lastUpdate: settings[0]?.updatedAt || null
  };
}

async function auditUserAccess(startDate?: string | null, endDate?: string | null, targetUsers?: string[]) {
  const where: any = {
    timestamp: {
      gte: startDate ? new Date(startDate) : undefined,
      lte: endDate ? new Date(endDate) : undefined
    }
  };

  if (targetUsers?.length) {
    where.userId = { in: targetUsers };
  }

  const [accessLogs, uniqueUsers] = await Promise.all([
    prisma.access_logs.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    }),
    prisma.access_logs.groupBy({
      by: ['userId'],
      where,
      _count: true
    })
  ]);

  return {
    totalAccess: accessLogs.length,
    uniqueUsers: uniqueUsers.length,
    accessLogs,
    byStatus: accessLogs.reduce((acc, log) => {
      acc[log.status] = (acc[log.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  };
}

async function auditAuthentication(startDate?: string | null, endDate?: string | null) {
  const where = {
    timestamp: {
      gte: startDate ? new Date(startDate) : undefined,
      lte: endDate ? new Date(endDate) : undefined
    }
  };

  const [authLogs, failedAttempts] = await Promise.all([
    prisma.auth_logs.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    }),
    prisma.auth_logs.count({
      where: {
        ...where,
        action: 'login_failed'
      }
    })
  ]);

  return {
    totalAuth: authLogs.length,
    failedAttempts,
    authLogs,
    byAction: authLogs.reduce((acc, log) => {
      acc[log.action] = (acc[log.action] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  };
}

async function auditIncidents(startDate?: string | null, endDate?: string | null) {
  const where = {
    createdAt: {
      gte: startDate ? new Date(startDate) : undefined,
      lte: endDate ? new Date(endDate) : undefined
    }
  };

  const [incidents, bySeverity, byStatus] = await Promise.all([
    prisma.security_incidents.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        assignedToUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    }),
    prisma.security_incidents.groupBy({
      by: ['severity'],
      where,
      _count: true
    }),
    prisma.security_incidents.groupBy({
      by: ['status'],
      where,
      _count: true
    })
  ]);

  return {
    totalIncidents: incidents.length,
    incidents,
    bySeverity: bySeverity.reduce((acc, curr) => {
      acc[curr.severity] = curr._count;
      return acc;
    }, {} as Record<string, number>),
    byStatus: byStatus.reduce((acc, curr) => {
      acc[curr.status] = curr._count;
      return acc;
    }, {} as Record<string, number>)
  };
}

async function auditSystemHealth() {
  const [
    activeSessions,
    recentErrors,
    systemMetrics
  ] = await Promise.all([
    prisma.sessions.count({
      where: {
        expires: { gt: new Date() }
      }
    }),
    prisma.system_logs.findMany({
      where: {
        level: 'error',
        timestamp: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
        }
      },
      orderBy: { timestamp: 'desc' },
      take: 100
    }),
    prisma.system_metrics.findFirst({
      orderBy: { timestamp: 'desc' }
    })
  ]);

  return {
    activeSessions,
    recentErrors,
    systemMetrics,
    health: {
      status: recentErrors.length > 10 ? 'warning' : 'healthy',
      lastCheck: new Date(),
      metrics: systemMetrics
    }
  };
}

async function auditCompliance(startDate?: string | null, endDate?: string | null) {
  const where = {
    timestamp: {
      gte: startDate ? new Date(startDate) : undefined,
      lte: endDate ? new Date(endDate) : undefined
    }
  };

  const [
    securitySettings,
    passwordChanges,
    roleChanges,
    accessDenials
  ] = await Promise.all([
    prisma.security_settings.findFirst({
      orderBy: { updatedAt: 'desc' }
    }),
    prisma.auth_logs.count({
      where: {
        ...where,
        action: 'password_change'
      }
    }),
    prisma.user_roles.count({
      where: {
        ...where,
        action: { in: ['role_added', 'role_removed'] }
      }
    }),
    prisma.access_logs.count({
      where: {
        ...where,
        status: 'denied'
      }
    })
  ]);

  return {
    securitySettings,
    passwordChanges,
    roleChanges,
    accessDenials,
    compliance: {
      passwordPolicy: securitySettings?.passwordMinLength >= 12,
      twoFactorAuth: securitySettings?.require2FA,
      sessionTimeout: securitySettings?.sessionTimeout <= 30,
      auditLogging: securitySettings?.enableAuditLog
    }
  };
} 