import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { AuthLogger } from '@/lib/security/authLogger';
import { z } from 'zod';

// Schéma de validation pour les paramètres de sécurité
const securitySettingsSchema = z.object({
  maxLoginAttempts: z.number().min(1).max(10),
  lockoutDuration: z.number().min(5).max(60),
  sessionTimeout: z.number().min(5).max(120),
  require2FA: z.boolean(),
  passwordMinLength: z.number().min(8).max(32),
  passwordRequireSpecial: z.boolean(),
  passwordRequireNumbers: z.boolean(),
  passwordRequireUppercase: z.boolean(),
  passwordExpiryDays: z.number().min(30).max(365),
  accessLogRetentionDays: z.number().min(30).max(365),
  enableAuditLog: z.boolean(),
  notifyOnIncident: z.boolean(),
  notifyOnAccessDenied: z.boolean(),
  notifyOnMultipleFailures: z.boolean()
});

// GET /api/security - Récupérer les paramètres et statistiques de sécurité
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

    // Récupérer les paramètres de sécurité
    const settings = await prisma.security_settings.findFirst({
      orderBy: { updatedAt: 'desc' }
    });

    // Récupérer les statistiques de sécurité
    const [
      totalIncidents,
      recentIncidents,
      failedLogins,
      activeSessions,
      accessDenials
    ] = await Promise.all([
      // Nombre total d'incidents
      prisma.security_incidents.count(),
      // Incidents récents (24h)
      prisma.security_incidents.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
          }
        }
      }),
      // Tentatives de connexion échouées (24h)
      prisma.auth_logs.count({
        where: {
          action: 'login_failed',
          timestamp: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
          }
        }
      }),
      // Sessions actives
      prisma.sessions.count({
        where: {
          expires: {
            gt: new Date()
          }
        }
      }),
      // Accès refusés (24h)
      prisma.access_logs.count({
        where: {
          status: 'denied',
          timestamp: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
          }
        }
      })
    ]);

    // Logger l'activité
    await AuthLogger.logActivity(session.user.id, 'GET', '/api/security', {
      action: 'view_security_dashboard'
    });

    return NextResponse.json({
      settings: settings || {
        maxLoginAttempts: 5,
        lockoutDuration: 15,
        sessionTimeout: 30,
        require2FA: false,
        passwordMinLength: 12,
        passwordRequireSpecial: true,
        passwordRequireNumbers: true,
        passwordRequireUppercase: true,
        passwordExpiryDays: 90,
        accessLogRetentionDays: 365,
        enableAuditLog: true,
        notifyOnIncident: true,
        notifyOnAccessDenied: true,
        notifyOnMultipleFailures: true
      },
      statistics: {
        totalIncidents,
        recentIncidents,
        failedLogins,
        activeSessions,
        accessDenials
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des données de sécurité:', error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des données de sécurité" },
      { status: 500 }
    );
  }
}

// PUT /api/security - Mettre à jour les paramètres de sécurité
export async function PUT(req: NextRequest) {
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
    
    // Valider les données
    const validationResult = securitySettingsSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Données invalides", details: validationResult.error.errors },
        { status: 400 }
      );
    }

    // Mettre à jour les paramètres de sécurité
    const settings = await prisma.security_settings.create({
      data: {
        ...body,
        updatedBy: session.user.id
      }
    });

    // Logger l'activité
    await AuthLogger.logActivity(session.user.id, 'PUT', '/api/security', {
      action: 'update_security_settings',
      changes: body
    });

    // Créer un incident de sécurité pour la modification des paramètres
    await prisma.security_incidents.create({
      data: {
        type: 'settings_change',
        severity: 'low',
        description: 'Modification des paramètres de sécurité',
        details: {
          updatedBy: session.user.id,
          changes: body
        },
        status: 'resolved',
        resolvedAt: new Date(),
        resolvedBy: session.user.id
      }
    });

    return NextResponse.json(settings);
  } catch (error) {
    console.error('Erreur lors de la mise à jour des paramètres de sécurité:', error);
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour des paramètres de sécurité" },
      { status: 500 }
    );
  }
}

// POST /api/security/audit - Déclencher un audit de sécurité
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
    const { type, scope, startDate, endDate } = body;

    // Valider les paramètres de l'audit
    if (!type || !scope) {
      return NextResponse.json(
        { error: "Type et portée de l'audit requis" },
        { status: 400 }
      );
    }

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
          requestedBy: session.user.id
        },
        status: 'in_progress'
      }
    });

    // Logger l'activité
    await AuthLogger.logActivity(session.user.id, 'POST', '/api/security/audit', {
      action: 'trigger_security_audit',
      auditId: audit.id,
      type,
      scope
    });

    // TODO: Implémenter la logique d'audit en arrière-plan
    // Pour l'instant, on retourne juste l'incident créé
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