import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { AuthLogger } from '@/lib/security/authLogger';
import { z } from 'zod';
import PDFDocument from 'pdfkit';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

// Schéma de validation pour les paramètres d'export
const exportSchema = z.object({
  type: z.enum(['audit']),
  auditId: z.string(),
  includeDetails: z.boolean().optional().default(true)
});

/**
 * POST /api/export/[format]
 * Exporter les résultats d'un audit au format PDF ou JSON
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { format: string } }
) {
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
    const validationResult = exportSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Données invalides", details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { type, auditId, includeDetails } = validationResult.data;

    // Récupérer l'audit
    const audit = await prisma.security_incidents.findUnique({
      where: {
        id: auditId,
        type: 'security_audit'
      },
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
    });

    if (!audit) {
      return NextResponse.json({ error: "Audit non trouvé" }, { status: 404 });
    }

    if (audit.status !== 'resolved') {
      return NextResponse.json(
        { error: "L'audit doit être résolu pour être exporté" },
        { status: 400 }
      );
    }

    // Logger l'activité
    await AuthLogger.logActivity(session.user.id, 'POST', `/api/export/${params.format}`, {
      action: 'export_audit',
      auditId,
      format: params.format
    });

    // Générer l'export selon le format demandé
    if (params.format === 'json') {
      const exportData = {
        audit: {
          id: audit.id,
          type: audit.type,
          severity: audit.severity,
          description: audit.description,
          status: audit.status,
          createdAt: audit.createdAt,
          updatedAt: audit.updatedAt,
          details: audit.details,
          assignedTo: audit.assignedToUser
        }
      };

      return new NextResponse(JSON.stringify(exportData, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="audit-${audit.id}-donnees.json"`
        }
      });
    } else if (params.format === 'pdf') {
      // Créer un nouveau document PDF
      const doc = new PDFDocument({
        size: 'A4',
        margin: 50,
        info: {
          Title: `Rapport d'audit - ${audit.id}`,
          Author: `${audit.assignedToUser?.firstName} ${audit.assignedToUser?.lastName}`,
          Subject: `Audit de sécurité - ${audit.details.auditType}`,
          Keywords: 'audit, sécurité, rapport',
          CreationDate: new Date()
        }
      });

      // En-tête
      doc.fontSize(20).text('Rapport d\'audit de sécurité', { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).text(`Type: ${audit.details.auditType.replace('_', ' ')}`, { align: 'center' });
      doc.text(`Portée: ${audit.details.scope}`, { align: 'center' });
      doc.text(`Date: ${format(new Date(audit.createdAt), 'dd/MM/yyyy HH:mm', { locale: fr })}`, { align: 'center' });
      doc.moveDown();

      // Informations générales
      doc.fontSize(14).text('Informations générales');
      doc.moveDown();
      doc.fontSize(12);
      doc.text(`ID: ${audit.id}`);
      doc.text(`Description: ${audit.description}`);
      doc.text(`Statut: ${audit.status.replace('_', ' ')}`);
      doc.text(`Sévérité: ${audit.severity}`);
      doc.text(`Demandé par: ${audit.assignedToUser?.firstName} ${audit.assignedToUser?.lastName}`);
      if (audit.details.completedAt) {
        doc.text(`Terminé le: ${format(new Date(audit.details.completedAt), 'dd/MM/yyyy HH:mm', { locale: fr })}`);
      }
      doc.moveDown();

      // Résultats de l'audit
      if (audit.details.results) {
        doc.fontSize(14).text('Résultats de l\'audit');
        doc.moveDown();
        doc.fontSize(12);

        // Afficher les résultats selon le type d'audit
        switch (audit.details.auditType) {
          case 'security_settings':
            doc.text(`Nombre de modifications: ${audit.details.results.changes}`);
            doc.text(`Dernière mise à jour: ${format(new Date(audit.details.results.lastUpdate), 'dd/MM/yyyy HH:mm', { locale: fr })}`);
            doc.moveDown();
            doc.text('Dernières modifications:');
            audit.details.results.settings.slice(0, 5).forEach((setting: any) => {
              doc.text(`- ${setting.key} (par ${setting.updatedByUser.firstName} ${setting.updatedByUser.lastName})`);
            });
            break;

          case 'user_access':
            doc.text(`Total des accès: ${audit.details.results.totalAccess}`);
            doc.text(`Utilisateurs uniques: ${audit.details.results.uniqueUsers}`);
            doc.moveDown();
            doc.text('Répartition par statut:');
            Object.entries(audit.details.results.byStatus).forEach(([status, count]: [string, any]) => {
              doc.text(`- ${status}: ${count}`);
            });
            break;

          case 'authentication':
            doc.text(`Total des authentifications: ${audit.details.results.totalAuth}`);
            doc.text(`Tentatives échouées: ${audit.details.results.failedAttempts}`);
            doc.moveDown();
            doc.text('Répartition par action:');
            Object.entries(audit.details.results.byAction).forEach(([action, count]: [string, any]) => {
              doc.text(`- ${action.replace('_', ' ')}: ${count}`);
            });
            break;

          case 'incidents':
            doc.text(`Total des incidents: ${audit.details.results.totalIncidents}`);
            doc.moveDown();
            doc.text('Par sévérité:');
            Object.entries(audit.details.results.bySeverity).forEach(([severity, count]: [string, any]) => {
              doc.text(`- ${severity}: ${count}`);
            });
            doc.moveDown();
            doc.text('Par statut:');
            Object.entries(audit.details.results.byStatus).forEach(([status, count]: [string, any]) => {
              doc.text(`- ${status.replace('_', ' ')}: ${count}`);
            });
            break;

          case 'system_health':
            doc.text(`Sessions actives: ${audit.details.results.activeSessions}`);
            doc.text(`Erreurs récentes: ${audit.details.results.recentErrors.length}`);
            doc.text(`État de santé: ${audit.details.results.health.status === 'healthy' ? 'Sain' : 'Attention'}`);
            if (audit.details.results.health.metrics) {
              doc.moveDown();
              doc.text('Métriques système:');
              Object.entries(audit.details.results.health.metrics).forEach(([key, value]: [string, any]) => {
                doc.text(`- ${key.replace('_', ' ')}: ${value}`);
              });
            }
            break;

          case 'compliance':
            doc.text(`Changements de mot de passe: ${audit.details.results.passwordChanges}`);
            doc.text(`Modifications de rôles: ${audit.details.results.roleChanges}`);
            doc.moveDown();
            doc.text('État de conformité:');
            Object.entries(audit.details.results.compliance).forEach(([key, value]: [string, any]) => {
              doc.text(`- ${key.replace(/([A-Z])/g, ' $1').trim()}: ${value ? 'Conforme' : 'Non conforme'}`);
            });
            break;
        }
      }

      // Pied de page
      const pageCount = doc.bufferedPageRange().count;
      for (let i = 0; i < pageCount; i++) {
        doc.switchToPage(i);
        doc.fontSize(10).text(
          `Page ${i + 1} sur ${pageCount} - Généré le ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: fr })}`,
          { align: 'center' }
        );
      }

      // Finaliser le PDF
      doc.end();

      // Retourner le PDF
      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      
      return new Promise((resolve) => {
        doc.on('end', () => {
          const pdfBuffer = Buffer.concat(chunks);
          resolve(new NextResponse(pdfBuffer, {
            headers: {
              'Content-Type': 'application/pdf',
              'Content-Disposition': `attachment; filename="audit-${audit.id}-rapport.pdf"`
            }
          }));
        });
      });
    } else {
      return NextResponse.json(
        { error: "Format d'export non supporté" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Erreur lors de l\'export:', error);
    return NextResponse.json(
      { error: "Erreur lors de l'export" },
      { status: 500 }
    );
  }
} 