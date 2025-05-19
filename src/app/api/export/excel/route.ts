import { NextRequest, NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

// Define route segment config with proper format
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Increased timeout for Excel generation

export async function POST(req: NextRequest) {
  try {
    // Récupérer les données du rapport depuis la requête
    const { data, dateRange } = await req.json();
    
    // Convertir les chaînes de date en objets Date pour les dateRange
    const formattedDateRange = {
      from: dateRange?.from ? new Date(dateRange.from) : undefined,
      to: dateRange?.to ? new Date(dateRange.to) : undefined
    };
    
    // Créer un nouveau workbook
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Senator InvesTech';
    workbook.lastModifiedBy = 'Senator InvesTech';
    workbook.created = new Date();
    workbook.modified = new Date();
    
    // Ajouter une feuille pour le résumé
    const summarySheet = workbook.addWorksheet('Résumé');
    
    // Configurer la mise en page
    summarySheet.pageSetup.paperSize = 9; // A4
    summarySheet.pageSetup.orientation = 'portrait';
    summarySheet.pageSetup.margins = {
      left: 0.7, right: 0.7,
      top: 0.75, bottom: 0.75,
      header: 0.3, footer: 0.3
    };
    
    // Mettre en forme le titre
    summarySheet.mergeCells('A1:G1');
    const titleCell = summarySheet.getCell('A1');
    titleCell.value = 'Rapport de Temps de Présence';
    titleCell.font = {
      size: 16,
      bold: true,
      color: { argb: '007B65' }
    };
    titleCell.alignment = { horizontal: 'center' };
    
    // Mettre en forme la période
    summarySheet.mergeCells('A2:G2');
    const periodCell = summarySheet.getCell('A2');
    if (formattedDateRange.from && formattedDateRange.to) {
      periodCell.value = `Période du ${format(formattedDateRange.from, 'dd MMMM yyyy', { locale: fr })} au ${format(formattedDateRange.to, 'dd MMMM yyyy', { locale: fr })}`;
    } else {
      periodCell.value = 'Période complète';
    }
    periodCell.font = {
      size: 12,
      color: { argb: '666666' }
    };
    periodCell.alignment = { horizontal: 'center' };
    
    // Ajouter les statistiques
    const statsStartRow = 4;
    const stats = [
      ['Taux de présence moyen', data?.summary?.avgPresenceRate || '0%'],
      ['Nombre total d\'employés', data?.summary?.totalEmployees || 0],
      ['Nombre moyen d\'employés par jour', data?.summary?.avgEmployeePerDay || 0],
      ['Temps total de présence', data?.summary?.totalHours || '0h'],
      ['Temps moyen par employé', data?.summary?.avgHoursPerEmployee || '0h']
    ];
    
    stats.forEach((stat, index) => {
      const row = summarySheet.addRow(stat);
      row.getCell(1).font = { bold: true };
      row.getCell(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'F5F5F5' }
      };
      row.getCell(2).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'F5F5F5' }
      };
    });
    
    // Ajouter les données quotidiennes
    if (data?.daily && data.daily.length > 0) {
      // Créer une feuille pour les données quotidiennes
      const dailySheet = workbook.addWorksheet('Données quotidiennes');
      
      // Configurer la mise en page
      dailySheet.pageSetup.paperSize = 9; // A4
      dailySheet.pageSetup.orientation = 'portrait';
      dailySheet.pageSetup.margins = {
        left: 0.7, right: 0.7,
        top: 0.75, bottom: 0.75,
        header: 0.3, footer: 0.3
      };
      
      // Titre
      dailySheet.mergeCells('A1:D1');
      const dailyTitleCell = dailySheet.getCell('A1');
      dailyTitleCell.value = 'Données quotidiennes de présence';
      dailyTitleCell.font = {
        size: 16,
        bold: true,
        color: { argb: '007B65' }
      };
      dailyTitleCell.alignment = { horizontal: 'center' };
      
      // Période
      dailySheet.mergeCells('A2:D2');
      const dailyPeriodCell = dailySheet.getCell('A2');
      if (formattedDateRange.from && formattedDateRange.to) {
        dailyPeriodCell.value = `Période du ${format(formattedDateRange.from, 'dd MMMM yyyy', { locale: fr })} au ${format(formattedDateRange.to, 'dd MMMM yyyy', { locale: fr })}`;
      } else {
        dailyPeriodCell.value = 'Période complète';
      }
      dailyPeriodCell.font = {
        size: 12,
        color: { argb: '666666' }
      };
      dailyPeriodCell.alignment = { horizontal: 'center' };
      
      // En-têtes
      const headers = ['Date', 'Nombre d\'employés', 'Durée totale (h)', 'Temps moyen par employé (h)'];
      const headerRow = dailySheet.addRow(headers);
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
      
      // Données
      data.daily.forEach((day: any) => {
        const date = day.date ? format(new Date(day.date), 'dd/MM/yyyy') : 'N/A';
        const count = day.count || 0;
        const durationHours = day.duration ? (day.duration / 60).toFixed(2) : '0';
        const avgHours = count > 0 ? ((day.duration || 0) / 60 / count).toFixed(2) : '0';
        
        const row = dailySheet.addRow([date, count, durationHours, avgHours]);
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
      dailySheet.getColumn('A').width = 15; // Date
      dailySheet.getColumn('B').width = 20; // Nombre d'employés
      dailySheet.getColumn('C').width = 20; // Durée totale
      dailySheet.getColumn('D').width = 25; // Temps moyen
    }
    
    // Ajouter les données détaillées si disponibles
    if (data?.detailedLogs && data.detailedLogs.length > 0) {
      // Créer une feuille pour les données détaillées
      const detailsSheet = workbook.addWorksheet('Données détaillées');
      
      // Configurer la mise en page
      detailsSheet.pageSetup.paperSize = 9; // A4
      detailsSheet.pageSetup.orientation = 'portrait';
      detailsSheet.pageSetup.margins = {
        left: 0.7, right: 0.7,
        top: 0.75, bottom: 0.75,
        header: 0.3, footer: 0.3
      };
      
      // Titre
      detailsSheet.mergeCells('A1:G1');
      const detailsTitleCell = detailsSheet.getCell('A1');
      detailsTitleCell.value = 'Données détaillées de présence';
      detailsTitleCell.font = {
        size: 16,
        bold: true,
        color: { argb: '007B65' }
      };
      detailsTitleCell.alignment = { horizontal: 'center' };
      
      // Période
      detailsSheet.mergeCells('A2:G2');
      const detailsPeriodCell = detailsSheet.getCell('A2');
      if (formattedDateRange.from && formattedDateRange.to) {
        detailsPeriodCell.value = `Période du ${format(formattedDateRange.from, 'dd MMMM yyyy', { locale: fr })} au ${format(formattedDateRange.to, 'dd MMMM yyyy', { locale: fr })}`;
      } else {
        detailsPeriodCell.value = 'Période complète';
      }
      detailsPeriodCell.font = {
        size: 12,
        color: { argb: '666666' }
      };
      detailsPeriodCell.alignment = { horizontal: 'center' };
      
      // En-têtes
      const headers = ['Date', 'Employé', 'Badge', 'Groupe', 'Entrée', 'Sortie', 'Durée (h)'];
      const headerRow = detailsSheet.addRow(headers);
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
      
      // Données
      data.detailedLogs.forEach((log: any) => {
        const date = log.date ? format(new Date(log.date), 'dd/MM/yyyy') : 'N/A';
        const name = log.name || 'N/A';
        const badge = log.badge_number || 'N/A';
        const groupe = log.groupe || 'N/A';
        const firstBadge = log.first_badge || 'N/A';
        const lastBadge = log.last_badge || 'N/A';
        const duration = log.duration ? (log.duration / 60).toFixed(2) : '0';
        
        const row = detailsSheet.addRow([date, name, badge, groupe, firstBadge, lastBadge, duration]);
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
      detailsSheet.getColumn('A').width = 12; // Date
      detailsSheet.getColumn('B').width = 25; // Employé
      detailsSheet.getColumn('C').width = 15; // Badge
      detailsSheet.getColumn('D').width = 20; // Groupe
      detailsSheet.getColumn('E').width = 15; // Entrée
      detailsSheet.getColumn('F').width = 15; // Sortie
      detailsSheet.getColumn('G').width = 15; // Durée
    }
    
    // Convertir le workbook en buffer
    const buffer = await workbook.xlsx.writeBuffer();
    
    // Renvoyer le fichier Excel généré
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="rapport_presence_${new Date().toISOString().split('T')[0]}.xlsx"`
      }
    });
  } catch (error) {
    console.error('Erreur lors de la génération du fichier Excel:', error);
    return NextResponse.json({ error: 'Erreur lors de la génération du fichier Excel' }, { status: 500 });
  }
} 