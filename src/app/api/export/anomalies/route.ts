import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { AuthLogger } from '@/lib/security/authLogger';
import ExcelJS from 'exceljs';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { generatePdfReport } from '@/lib/services/pdf-export-service';
import { logExportEvent } from '@/lib/services/export-service';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import { APP_CONFIG } from '@/config/app';

// Fonction principale pour traiter les requêtes d'export
export async function GET(req: NextRequest) {
  const startTime = Date.now();
  console.log(`[EXPORT_ANOMALIES] Démarrage de l'export d'anomalies`);
  
  try {
    // Vérification d'authentification
    const bypassAuth = process.env.NODE_ENV === 'development' && 
                      req.headers.get('x-test-bypass-auth') === 'admin';
    
    if (!bypassAuth) {
      const session = await getServerSession(authOptions);
      
      if (!session) {
        console.log(`[EXPORT_ANOMALIES] Tentative d'export non autorisée`);
        return NextResponse.json(
          { error: "Non autorisé" },
          { status: 401 }
        );
      }
    }
    
    // Récupérer les paramètres de la requête
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const format = searchParams.get('format') || 'pdf';
    const exportType = searchParams.get('exportType') || 'detailed';
    
    console.log(`[EXPORT_ANOMALIES] Paramètres d'export reçus: format=${format}, exportType=${exportType}, startDate=${startDate}, endDate=${endDate}`);
    
    if (!startDate || !endDate) {
      console.log(`[EXPORT_ANOMALIES] Paramètres manquants: startDate ou endDate`);
      return NextResponse.json(
        { error: "Les dates de début et de fin sont requises" },
        { status: 400 }
      );
    }
    
    // Récupérer les données d'anomalie
    console.log(`[EXPORT_ANOMALIES] Récupération des données d'anomalies du ${startDate} au ${endDate}`);
    const anomalyData = await fetchAnomalyDataForExport(startDate, endDate);
    console.log(`[EXPORT_ANOMALIES] ${anomalyData.anomalies.length} anomalies récupérées`);
    
    // Vérifier si des données sont disponibles
    if (anomalyData.anomalies.length === 0) {
      console.log(`[EXPORT_ANOMALIES] Aucune anomalie trouvée pour la période`);
      return NextResponse.json(
        { error: "Aucune anomalie trouvée pour la période spécifiée" },
        { status: 404 }
      );
    }
    
    // Générer le rapport dans le format demandé
    console.log(`[EXPORT_ANOMALIES] Génération du rapport au format ${format}`);
    let response;
    
    switch (format.toLowerCase()) {
      case 'pdf':
        // PDF is disabled in the UI, but in case it's requested directly via API, return a clear error
        console.log(`[EXPORT_ANOMALIES] Export PDF désactivé`);
        return NextResponse.json(
          { 
            error: "L'export PDF est temporairement désactivé pour les anomalies",
            details: "Veuillez utiliser les formats Excel ou CSV",
            timestamp: new Date().toISOString()
          },
          { status: 400 }
        );
      case 'xlsx':
      case 'excel':
        response = await generateExcelReport(anomalyData, startDate, endDate);
        break;
      case 'csv':
        response = generateCsvReport(anomalyData, startDate, endDate);
        break;
      default:
        console.log(`[EXPORT_ANOMALIES] Format non pris en charge: ${format}`);
        return NextResponse.json(
          { error: "Format d'export non pris en charge" },
          { status: 400 }
        );
    }
    
    const duration = Date.now() - startTime;
    console.log(`[EXPORT_ANOMALIES] Export terminé en ${duration}ms`);
    return response;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
    console.error(`[EXPORT_ANOMALIES] Erreur lors de l'exportation des anomalies: ${errorMessage}`, error);
    
    // Retourner une réponse d'erreur structurée
    return NextResponse.json(
      { 
        error: "Erreur lors de l'exportation des anomalies",
        details: errorMessage,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

// Récupérer les données d'anomalie formatées pour l'export
async function fetchAnomalyDataForExport(startDate: string, endDate: string) {
  // Convertir les chaînes de date en objets Date
  const startDateTime = new Date(startDate);
  const endDateTime = new Date(endDate);
  
  // Récupérer les anomalies
  const anomalies = await prisma.$queryRaw`
    SELECT 
      id,
      badge_number as badgeNumber,
      event_date as eventDate,
      event_time as eventTime,
      event_type as eventType,
      raw_event_type as rawEventType,
      reader,
      group_name as groupName,
      full_name as userName,
      terminal,
      direction
    FROM access_logs
    WHERE event_date BETWEEN ${startDateTime} AND ${endDateTime}
    AND event_type != 'user_accepted'
    AND badge_number IS NOT NULL
    ORDER BY event_date DESC, event_time DESC
  `;
  
  // Récupérer les statistiques
  const totalAnomaliesResult = await prisma.$queryRaw`
    SELECT COUNT(*) as total
    FROM access_logs
    WHERE event_date BETWEEN ${startDateTime} AND ${endDateTime}
    AND event_type != 'user_accepted'
    AND badge_number IS NOT NULL
  `;
  
  // Récupérer le total des accès pour calculer le taux d'anomalies
  const totalAccessesResult = await prisma.$queryRaw`
    SELECT COUNT(*) as total
    FROM access_logs
    WHERE event_date BETWEEN ${startDateTime} AND ${endDateTime}
  `;
  
  // Récupérer les types d'anomalies
  const anomalyTypes = await prisma.$queryRaw`
    SELECT 
      event_type as eventType,
      COUNT(*) as count
    FROM access_logs
    WHERE event_date BETWEEN ${startDateTime} AND ${endDateTime}
    AND event_type != 'user_accepted'
    AND badge_number IS NOT NULL
    GROUP BY event_type
    ORDER BY count DESC
  `;
  
  // Récupérer les anomalies par jour
  const dailyAnomalies = await prisma.$queryRaw`
    SELECT 
      DATE(event_date) as date,
      COUNT(*) as count
    FROM access_logs
    WHERE event_date BETWEEN ${startDateTime} AND ${endDateTime}
    AND event_type != 'user_accepted'
    AND badge_number IS NOT NULL
    GROUP BY DATE(event_date)
    ORDER BY date DESC
  `;
  
  // Compter les accès refusés
  const accessDeniedResult = await prisma.$queryRaw`
    SELECT COUNT(*) as total
    FROM access_logs
    WHERE event_date BETWEEN ${startDateTime} AND ${endDateTime}
    AND event_type = 'user_denied'
    AND badge_number IS NOT NULL
  `;
  
  // Compter les badges invalides
  const invalidBadgesResult = await prisma.$queryRaw`
    SELECT COUNT(*) as total
    FROM access_logs
    WHERE event_date BETWEEN ${startDateTime} AND ${endDateTime}
    AND event_type = 'invalid_badge'
    AND badge_number IS NOT NULL
  `;
  
  // Extraire les totaux
  const totalAnomalies = Number((totalAnomaliesResult as any[])[0].total);
  const totalAccesses = Number((totalAccessesResult as any[])[0].total);
  const accessDenied = Number((accessDeniedResult as any[])[0].total);
  const invalidBadges = Number((invalidBadgesResult as any[])[0].total);
  
  // Calculer le taux d'anomalies
  const anomalyRate = totalAccesses > 0 ? totalAnomalies / totalAccesses : 0;
  
  // Formater les données pour l'export
  return {
    anomalies: (anomalies as any[]).map(a => ({
      id: Number(a.id),
      badgeNumber: a.badgeNumber,
      eventDate: a.eventDate ? new Date(a.eventDate) : null,
      eventTime: a.eventTime ? new Date(a.eventTime).toLocaleTimeString('fr-FR') : null,
      eventType: a.eventType,
      rawEventType: a.rawEventType,
      reader: a.reader,
      terminal: a.terminal,
      groupName: a.groupName,
      userName: a.userName,
      direction: a.direction
    })),
    totalAnomalies,
    totalAccesses,
    anomalyRate,
    accessDenied,
    invalidBadges,
    anomalyTypes: (anomalyTypes as any[]).map(t => ({
      eventType: t.eventType,
      count: Number(t.count)
    })),
    dailyAnomalies: (dailyAnomalies as any[]).map(d => ({
      date: d.date,
      count: Number(d.count)
    })),
    startDate: startDateTime,
    endDate: endDateTime
  };
}

// Générer un rapport PDF en utilisant le service centralisé
async function generatePdfReportWithService(data: any, startDate: string, endDate: string, exportType: string) {
  logExportEvent(`Génération du rapport PDF d'anomalies pour la période ${startDate} au ${endDate}`);
  
  try {
    // Créer un dossier temporaire pour le fichier PDF
    const tempDir = path.join(os.tmpdir(), `export_anomalies_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`);
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    // Générer un nom de fichier unique
    const dateStr = format(new Date(), 'yyyy-MM-dd_HH-mm');
    const fileName = `rapport_anomalies_${exportType}_${dateStr}.pdf`;
    const filePath = path.join(tempDir, fileName);
    
    // Configurer les options du rapport pour le service centralisé
    const reportOptions = {
      startDate,
      endDate,
      reportType: exportType === 'summary' ? 'summary' : 'detailed' as 'summary' | 'detailed',
      source: 'anomalies' as 'anomalies' | 'presence' | 'access',
      includeCharts: true,
      includeDetails: exportType === 'detailed',
      logoUrl: APP_CONFIG.export.defaultLogo
    };
    
    // Générer le PDF en utilisant le service
    const pdfBuffer = await generatePdfReport(data, reportOptions, filePath);
    
    // Retourner le PDF
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=${fileName}`
      }
    });
  } catch (error) {
    console.error(`[EXPORT_ANOMALIES] Erreur lors de la génération du rapport PDF:`, error);
    throw error; // Propager l'erreur pour le gestionnaire central
  }
}

// Générer un rapport Excel
async function generateExcelReport(data: any, startDate: string, endDate: string) {
  const { anomalies, totalAnomalies, anomalyTypes } = data;
  
  // Créer un nouveau classeur Excel
  const workbook = new ExcelJS.Workbook();
  workbook.creator = APP_CONFIG.name;
  workbook.lastModifiedBy = APP_CONFIG.name;
  workbook.created = new Date();
  workbook.modified = new Date();
  
  // Feuille principale des anomalies
  const worksheet = workbook.addWorksheet('Anomalies');
  
  // Configurer la mise en page
  worksheet.pageSetup.paperSize = 9; // A4
  worksheet.pageSetup.orientation = 'portrait';
  worksheet.pageSetup.margins = {
    left: 0.7, right: 0.7,
    top: 0.75, bottom: 0.75,
    header: 0.3, footer: 0.3
  };
  
  // Titre
  worksheet.mergeCells('A1:I1');
  const titleCell = worksheet.getCell('A1');
  titleCell.value = 'Rapport d\'anomalies d\'accès';
  titleCell.font = {
    size: 16,
    bold: true,
    color: { argb: '007B65' }
  };
  titleCell.alignment = { horizontal: 'center' };
  
  // Période
  worksheet.mergeCells('A2:I2');
  const periodCell = worksheet.getCell('A2');
  periodCell.value = `Période: ${new Date(startDate).toLocaleDateString('fr-FR')} - ${new Date(endDate).toLocaleDateString('fr-FR')}`;
  periodCell.font = {
    size: 12,
    color: { argb: '666666' }
  };
  periodCell.alignment = { horizontal: 'center' };
  
  // En-têtes de colonnes pour les anomalies
  const headers = [
    'Date',
    'Heure',
    'Badge',
    'Nom',
    'Lecteur',
    'Type d\'anomalie',
    'Terminal',
    'Direction',
    'Département'
  ];
  
  const headerRow = worksheet.addRow(headers);
  headerRow.font = { bold: true };
  headerRow.eachCell(cell => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'F5F5F5' }
    };
    cell.border = {
      top: { style: 'thin', color: { argb: 'DDDDDD' } },
      left: { style: 'thin', color: { argb: 'DDDDDD' } },
      bottom: { style: 'thin', color: { argb: 'DDDDDD' } },
      right: { style: 'thin', color: { argb: 'DDDDDD' } }
    };
  });
  
  // Ajouter les données
  anomalies.forEach((anomaly) => {
    const row = worksheet.addRow([
      anomaly.eventDate ? new Date(anomaly.eventDate).toLocaleDateString('fr-FR') : 'N/A',
      anomaly.eventTime || 'N/A',
      anomaly.badgeNumber || 'N/A',
      anomaly.userName || 'Inconnu',
      anomaly.reader || 'N/A',
      anomaly.eventType || 'N/A',
      anomaly.terminal || 'N/A',
      anomaly.direction || 'N/A',
      anomaly.groupName || 'N/A'
    ]);
    
    // Appliquer les bordures à toutes les cellules
    row.eachCell(cell => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'DDDDDD' } },
        left: { style: 'thin', color: { argb: 'DDDDDD' } },
        bottom: { style: 'thin', color: { argb: 'DDDDDD' } },
        right: { style: 'thin', color: { argb: 'DDDDDD' } }
      };
    });
    
    // Colorer les lignes en fonction du type d'anomalie
    const eventType = anomaly.eventType?.toLowerCase() || '';
    if (eventType.includes('denied') || eventType.includes('refused')) {
      row.eachCell(cell => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFDE5E5' } // Light red
        };
      });
    } else if (eventType.includes('invalid') || eventType.includes('expired')) {
      row.eachCell(cell => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFF8E5' } // Light yellow
        };
      });
    }
  });
  
  // Ajuster les largeurs des colonnes
  worksheet.getColumn('A').width = 12; // Date
  worksheet.getColumn('B').width = 10; // Heure
  worksheet.getColumn('C').width = 12; // Badge
  worksheet.getColumn('D').width = 25; // Nom
  worksheet.getColumn('E').width = 20; // Lecteur
  worksheet.getColumn('F').width = 25; // Type d'anomalie
  worksheet.getColumn('G').width = 15; // Terminal
  worksheet.getColumn('H').width = 12; // Direction
  worksheet.getColumn('I').width = 20; // Département
  
  // Feuille de résumé
  const summarySheet = workbook.addWorksheet('Résumé');
  
  // Configurer la mise en page
  summarySheet.pageSetup.paperSize = 9; // A4
  summarySheet.pageSetup.orientation = 'portrait';
  summarySheet.pageSetup.margins = {
    left: 0.7, right: 0.7,
    top: 0.75, bottom: 0.75,
    header: 0.3, footer: 0.3
  };
  
  // Titre du résumé
  summarySheet.mergeCells('A1:C1');
  const summaryTitleCell = summarySheet.getCell('A1');
  summaryTitleCell.value = 'Résumé des anomalies';
  summaryTitleCell.font = {
    size: 16,
    bold: true,
    color: { argb: '007B65' }
  };
  summaryTitleCell.alignment = { horizontal: 'center' };
  
  // Période
  summarySheet.mergeCells('A2:C2');
  const summaryPeriodCell = summarySheet.getCell('A2');
  summaryPeriodCell.value = `Période: ${new Date(startDate).toLocaleDateString('fr-FR')} - ${new Date(endDate).toLocaleDateString('fr-FR')}`;
  summaryPeriodCell.font = {
    size: 12,
    color: { argb: '666666' }
  };
  summaryPeriodCell.alignment = { horizontal: 'center' };
  
  // Total des anomalies
  summarySheet.addRow([]);
  const totalRow = summarySheet.addRow(['Total des anomalies', totalAnomalies]);
  totalRow.getCell('A').font = { bold: true };
  totalRow.getCell('A').fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'F5F5F5' }
  };
  totalRow.getCell('B').fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'F5F5F5' }
  };
  
  // En-têtes pour les types d'anomalies
  summarySheet.addRow([]);
  const typesHeaderRow = summarySheet.addRow(['Type d\'anomalie', 'Nombre', 'Pourcentage']);
  typesHeaderRow.font = { bold: true };
  typesHeaderRow.eachCell(cell => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'F5F5F5' }
    };
    cell.border = {
      top: { style: 'thin', color: { argb: 'DDDDDD' } },
      left: { style: 'thin', color: { argb: 'DDDDDD' } },
      bottom: { style: 'thin', color: { argb: 'DDDDDD' } },
      right: { style: 'thin', color: { argb: 'DDDDDD' } }
    };
  });
  
  // Données des types d'anomalies
  anomalyTypes.forEach((type) => {
    const percentage = ((type.count / totalAnomalies) * 100).toFixed(1);
    const row = summarySheet.addRow([
      type.eventType,
      type.count,
      `${percentage}%`
    ]);
    
    row.eachCell(cell => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'DDDDDD' } },
        left: { style: 'thin', color: { argb: 'DDDDDD' } },
        bottom: { style: 'thin', color: { argb: 'DDDDDD' } },
        right: { style: 'thin', color: { argb: 'DDDDDD' } }
      };
    });
  });
  
  // Ajuster les largeurs des colonnes
  summarySheet.getColumn('A').width = 30; // Type d'anomalie
  summarySheet.getColumn('B').width = 15; // Nombre
  summarySheet.getColumn('C').width = 15; // Pourcentage
  
  // Générer le fichier Excel
  const buffer = await workbook.xlsx.writeBuffer();
  
  // Retourner la réponse avec le fichier Excel
  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="anomalies_${startDate.replace(/-/g, '')}_${endDate.replace(/-/g, '')}.xlsx"`
    }
  });
}

// Générer un rapport CSV
function generateCsvReport(data: any, startDate: string, endDate: string) {
  const { anomalies } = data;
  
  // En-têtes du CSV
  const headers = [
    'Date',
    'Heure',
    'Badge',
    'Nom',
    'Lecteur',
    'Terminal',
    'Type d\'anomalie',
    'Type d\'événement brut',
    'Direction',
    'Département'
  ];
  
  // Lignes de données
  const rows = anomalies.map(anomaly => {
    return [
      anomaly.eventDate ? new Date(anomaly.eventDate).toLocaleDateString('fr-FR') : 'N/A',
      anomaly.eventTime || 'N/A',
      anomaly.badgeNumber || 'N/A',
      formatCsvField(anomaly.userName || 'Inconnu'),
      formatCsvField(anomaly.reader || 'N/A'),
      formatCsvField(anomaly.terminal || 'N/A'),
      formatCsvField(anomaly.eventType || 'N/A'),
      formatCsvField(anomaly.rawEventType || 'N/A'),
      formatCsvField(anomaly.direction || 'N/A'),
      formatCsvField(anomaly.groupName || 'N/A')
    ];
  });
  
  // Assembler le contenu CSV avec BOM pour Excel
  const csvContent = '\ufeff' + [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  
  // Retourner la réponse avec le fichier CSV
  return new NextResponse(csvContent, {
    headers: {
      'Content-Type': 'text/csv;charset=utf-8',
      'Content-Disposition': `attachment; filename="anomalies_${startDate.replace(/-/g, '')}_${endDate.replace(/-/g, '')}.csv"`
    }
  });
}

// Fonction utilitaire pour formater les champs CSV
function formatCsvField(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    // Échapper les guillemets en les doublant et entourer de guillemets
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}