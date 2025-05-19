import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import ExcelJS from 'exceljs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

// Fonction principale pour traiter les requêtes d'export
export async function GET(req: NextRequest) {
  try {
    // Vérification d'authentification
    const bypassAuth = process.env.NODE_ENV === 'development' && 
                      req.headers.get('x-test-bypass-auth') === 'admin';
    
    if (!bypassAuth) {
      const session = await getServerSession(authOptions);
      
      if (!session) {
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
    
    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: "Les dates de début et de fin sont requises" },
        { status: 400 }
      );
    }
    
    // Récupérer les données d'anomalie
    const anomalyData = await fetchAnomalyDataForExport(startDate, endDate);
    
    // Générer le rapport dans le format demandé
    switch (format.toLowerCase()) {
      case 'pdf':
        return await generatePdfReport(anomalyData, startDate, endDate);
      case 'xlsx':
        return await generateExcelReport(anomalyData, startDate, endDate);
      case 'csv':
        return generateCsvReport(anomalyData, startDate, endDate);
      default:
        return NextResponse.json(
          { error: "Format d'export non pris en charge" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Erreur lors de l\'exportation des anomalies:', error);
    return NextResponse.json(
      { error: "Erreur lors de l'exportation des anomalies" },
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
    totalAnomalies: Number((totalAnomaliesResult as any[])[0].total),
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

// Générer un rapport PDF
async function generatePdfReport(data: any, startDate: string, endDate: string) {
  const { anomalies, totalAnomalies, anomalyTypes, dailyAnomalies } = data;
  
  // Créer un nouveau document PDF
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });
  
  // Définir des constantes pour les marges
  const marginLeft = 20;
  const marginRight = 20;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = pageWidth - marginLeft - marginRight;
  
  // Fonction pour les en-têtes et pieds de page
  const addHeaderFooter = (doc: any, pageInfo: any) => {
    // En-tête
    doc.setFillColor(240, 240, 240);
    doc.rect(0, 0, pageWidth, 20, 'F');
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(60, 60, 60);
    doc.text('Senator InvesTech - Rapport d\'anomalies', marginLeft, 13);
    
    // Date de génération en haut à droite
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`Généré le: ${new Date().toLocaleDateString('fr-FR')}`, pageWidth - marginRight, 13, { align: 'right' });
    
    // Pied de page
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.line(marginLeft, pageHeight - 15, pageWidth - marginRight, pageHeight - 15);
    
    // Numéro de page
    doc.setFontSize(8);
    doc.text(`Page ${pageInfo.pageNumber}/${doc.getNumberOfPages()}`, pageWidth - marginRight, pageHeight - 10, { align: 'right' });
  };
  
  // Ajouter l'en-tête à la première page
  addHeaderFooter(doc, { pageNumber: 1 });
  
  // Titre principal
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(`Rapport d'anomalies d'accès`, marginLeft, 35);
  
  // Période
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`Période: ${new Date(startDate).toLocaleDateString('fr-FR')} - ${new Date(endDate).toLocaleDateString('fr-FR')}`, marginLeft, 45);
  
  // Ajouter une ligne de séparation
  doc.setDrawColor(150, 150, 150);
  doc.setLineWidth(0.5);
  doc.line(marginLeft, 50, pageWidth - marginRight, 50);
  
  // Statistiques
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Résumé des anomalies', marginLeft, 60);
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`Nombre total d'anomalies: ${totalAnomalies}`, marginLeft, 70);
  
  // Tableau des types d'anomalies
  const typesTableData = anomalyTypes.map(type => {
    const percentage = ((type.count / totalAnomalies) * 100).toFixed(1);
    return [type.eventType, type.count.toString(), `${percentage}%`];
  });
  
  // Créer une table pour les types d'anomalies
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Distribution des types d\'anomalies', marginLeft, 80);
  
  autoTable(doc, {
    startY: 85,
    head: [['Type d\'anomalie', 'Nombre', 'Pourcentage']],
    body: typesTableData,
    headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [240, 240, 240] },
    margin: { left: marginLeft, right: marginRight, bottom: 15 },
    styles: { fontSize: 10, cellPadding: 3 },
    didDrawPage: (data) => {
      // Ajouter l'en-tête et le pied de page sur chaque page
      addHeaderFooter(doc, data);
    }
  });
  
  // Position Y après le tableau
  const finalY = (doc as any).lastAutoTable.finalY;
  
  // Vérifier s'il y a assez d'espace pour le graphique sur la page actuelle
  if (finalY > pageHeight - 120) {
    doc.addPage();
  }
  
  // Graphique à barres pour les types d'anomalies
  const barStartY = finalY > pageHeight - 120 ? 30 : finalY + 15;
  const barStartX = marginLeft;
  const barMaxWidth = contentWidth - 80; // Espace pour le texte à gauche et les valeurs à droite
  const barHeight = 10;
  const barSpacing = 5;
  
  // Titre du graphique
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Visualisation des anomalies', barStartX, barStartY);
  
  // Légende
  doc.setFillColor(41, 128, 185);
  doc.rect(barStartX, barStartY + 5, 5, 5, 'F');
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Nombre d\'anomalies', barStartX + 10, barStartY + 9);
  
  // Dessiner les barres (limité aux 6 premiers types pour économiser de l'espace)
  let currentY = barStartY + 20;
  anomalyTypes.slice(0, 6).forEach((type, index) => {
    const percentage = type.count / totalAnomalies;
    const barWidth = Math.max(percentage * barMaxWidth, 5); // Au moins 5mm de largeur
    
    // Dessiner la barre
    doc.setFillColor(41, 128, 185);
    doc.rect(barStartX + 65, currentY, barWidth, barHeight, 'F');
    
    // Label du type d'anomalie (tronqué si trop long)
    let typeLabel = type.eventType;
    if (typeLabel.length > 10) {
      typeLabel = typeLabel.substring(0, 9) + '...';
    }
    doc.setFontSize(9);
    doc.text(typeLabel, barStartX, currentY + barHeight/2 + 1);
    
    // Valeur et pourcentage
    doc.text(`${type.count} (${(percentage * 100).toFixed(1)}%)`, barStartX + 65 + barWidth + 5, currentY + barHeight/2 + 1);
    
    currentY += barHeight + barSpacing;
  });
  
  // Déterminer si nous avons besoin d'une nouvelle page pour le tableau des anomalies
  const trendEndY = currentY + 20;
  if (trendEndY > pageHeight - 80) {
    doc.addPage();
    currentY = 30;
  } else {
    currentY = trendEndY;
  }
  
  // Graphique de tendance des anomalies par jour
  if (dailyAnomalies && dailyAnomalies.length > 0) {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Tendance quotidienne des anomalies', marginLeft, currentY);
    
    // Dessiner un petit tableau pour la tendance au lieu d'un graphique
    const trendData = dailyAnomalies.slice(0, 7).reverse(); // 7 derniers jours
    
    const trendTableRows = trendData.map(day => {
      const dateObj = new Date(day.date);
      return [
        dateObj.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' }),
        day.count.toString()
      ];
    });
    
    // Ajouter un tableau compact pour les tendances
    autoTable(doc, {
      startY: currentY + 5,
      head: [['Date', 'Nombre d\'anomalies']],
      body: trendTableRows,
      headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [240, 240, 240] },
      margin: { left: marginLeft, right: marginRight, bottom: 15 },
      styles: { fontSize: 10, cellPadding: 3 },
      didDrawPage: (data) => {
        // Ajouter l'en-tête et le pied de page sur chaque page
        addHeaderFooter(doc, data);
      }
    });
    
    currentY = (doc as any).lastAutoTable.finalY + 15;
  }
  
  // Liste des anomalies - sur une nouvelle page si nécessaire
  if (currentY > pageHeight - 100) {
    doc.addPage();
    currentY = 30;
  }
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Liste des anomalies récentes', marginLeft, currentY);
  
  // Préparer les données pour le tableau des anomalies
  const anomalyTableData = anomalies.slice(0, 20).map(a => [
    a.eventDate ? new Date(a.eventDate).toLocaleDateString('fr-FR') : 'N/A',
    a.eventTime || 'N/A',
    a.badgeNumber || 'N/A',
    a.userName || 'Inconnu',
    a.reader || 'N/A',
    a.eventType || 'N/A'
  ]);
  
  // Créer un tableau pour les anomalies
  autoTable(doc, {
    startY: currentY + 5,
    head: [['Date', 'Heure', 'Badge', 'Utilisateur', 'Lecteur', 'Type']],
    body: anomalyTableData,
    headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [240, 240, 240] },
    margin: { left: marginLeft, right: marginRight, bottom: 15 },
    styles: { fontSize: 9, cellPadding: 2 },
    // Note de bas de page sur la dernière page
    didDrawPage: (data) => {
      // Ajouter l'en-tête et le pied de page sur chaque page
      addHeaderFooter(doc, data);
      
      if (data.pageNumber === doc.getNumberOfPages()) {
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text('Note: Ce rapport ne présente que les 20 premières anomalies. Exportez en Excel ou CSV pour la liste complète.', marginLeft, pageHeight - 10);
      }
    }
  });
  
  // Convertir le document en ArrayBuffer
  const pdfBytes = doc.output('arraybuffer');
  
  // Retourner la réponse avec le fichier PDF
  return new NextResponse(pdfBytes, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="anomalies_${startDate.replace(/-/g, '')}_${endDate.replace(/-/g, '')}.pdf"`
    }
  });
}

// Générer un rapport Excel
async function generateExcelReport(data: any, startDate: string, endDate: string) {
  const { anomalies, totalAnomalies, anomalyTypes } = data;
  
  // Créer un nouveau classeur Excel
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Senator InvesTech';
  workbook.lastModifiedBy = 'Senator InvesTech';
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