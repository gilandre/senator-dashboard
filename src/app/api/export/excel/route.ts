import { NextRequest, NextResponse } from 'next/server';
import ExcelJS from 'exceljs';

interface ExportDataItem {
  date: string;
  weekday: string;
  badgeNumber: string;
  lastName: string;
  firstName: string;
  arrivalTime: string;
  departureTime: string;
  totalHours: string;
  reader: string;
  status: string;
  dayType: string;
}

interface ExportRequest {
  data: ExportDataItem[];
  filename?: string;
  sheetName?: string;
  title?: string;
}

export async function POST(request: NextRequest) {
  try {
    const requestData: ExportRequest = await request.json();
    
    // Validate request data
    if (!requestData.data || !Array.isArray(requestData.data) || requestData.data.length === 0) {
      return NextResponse.json(
        { error: 'Aucune donnée à exporter' },
        { status: 400 }
      );
    }

    const { 
      data,
      filename = 'export',
      sheetName = 'Données',
      title = 'Rapport d\'exportation'
    } = requestData;

    // Create Excel workbook and worksheet
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Senator InvesTech';
    workbook.created = new Date();
    
    const worksheet = workbook.addWorksheet(sheetName);

    // Add title
    worksheet.mergeCells('A1:K1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = title;
    titleCell.font = {
      size: 16,
      bold: true,
    };
    titleCell.alignment = { horizontal: 'center' };

    // Define columns
    worksheet.columns = [
      { header: 'Date', key: 'date', width: 12 },
      { header: 'Jour', key: 'weekday', width: 12 },
      { header: 'Badge', key: 'badgeNumber', width: 12 },
      { header: 'Nom', key: 'lastName', width: 15 },
      { header: 'Prénom', key: 'firstName', width: 15 },
      { header: 'Arrivée', key: 'arrivalTime', width: 10 },
      { header: 'Départ', key: 'departureTime', width: 10 },
      { header: 'Heures Totales', key: 'totalHours', width: 15 },
      { header: 'Lecteur', key: 'reader', width: 15 },
      { header: 'Statut', key: 'status', width: 15 },
      { header: 'Type de jour', key: 'dayType', width: 15 }
    ];

    // Style header row
    worksheet.getRow(2).font = { bold: true };
    worksheet.getRow(2).alignment = { horizontal: 'center' };
    worksheet.getRow(2).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    // Add data rows
    const dataRowStart = 3;
    data.forEach((item, index) => {
      const row = worksheet.addRow({
        date: item.date,
        weekday: item.weekday,
        badgeNumber: item.badgeNumber,
        lastName: item.lastName,
        firstName: item.firstName,
        arrivalTime: item.arrivalTime,
        departureTime: item.departureTime,
        totalHours: item.totalHours,
        reader: item.reader,
        status: item.status,
        dayType: item.dayType
      });

      // Apply conditional formatting based on day type
      const rowIndex = dataRowStart + index;
      if (item.dayType === 'Férié') {
        worksheet.getRow(rowIndex).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFDE5E5' } // Light red
        };
      } else if (item.dayType === 'Weekend') {
        worksheet.getRow(rowIndex).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF5F5F5' } // Light gray
        };
      } else if (item.dayType === 'Continue') {
        worksheet.getRow(rowIndex).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE5F2FF' } // Light blue
        };
      }
    });

    // Calculate totals and summary
    const totalRows = data.length;
    const uniqueBadges = new Set(data.map(item => item.badgeNumber)).size;
    const uniqueDates = new Set(data.map(item => item.date)).size;
    
    // Get total hours - need to handle time format conversion
    let totalHours = 0;
    data.forEach(item => {
      const hoursStr = item.totalHours.replace('h', '').replace(',', '.').trim();
      const hours = parseFloat(hoursStr);
      if (!isNaN(hours)) {
        totalHours += hours;
      }
    });

    // Add summary section
    const summaryStart = dataRowStart + totalRows + 2;
    worksheet.mergeCells(`A${summaryStart}:K${summaryStart}`);
    worksheet.getCell(`A${summaryStart}`).value = 'Résumé';
    worksheet.getCell(`A${summaryStart}`).font = { bold: true, size: 14 };
    
    worksheet.mergeCells(`A${summaryStart + 1}:B${summaryStart + 1}`);
    worksheet.getCell(`A${summaryStart + 1}`).value = 'Nombre d\'enregistrements';
    worksheet.getCell(`C${summaryStart + 1}`).value = totalRows;
    
    worksheet.mergeCells(`A${summaryStart + 2}:B${summaryStart + 2}`);
    worksheet.getCell(`A${summaryStart + 2}`).value = 'Période couverte';
    worksheet.getCell(`C${summaryStart + 2}`).value = `${uniqueDates} jours`;
    
    worksheet.mergeCells(`A${summaryStart + 3}:B${summaryStart + 3}`);
    worksheet.getCell(`A${summaryStart + 3}`).value = 'Employés concernés';
    worksheet.getCell(`C${summaryStart + 3}`).value = uniqueBadges;
    
    worksheet.mergeCells(`A${summaryStart + 4}:B${summaryStart + 4}`);
    worksheet.getCell(`A${summaryStart + 4}`).value = 'Total des heures';
    worksheet.getCell(`C${summaryStart + 4}`).value = `${totalHours.toFixed(2)}h`;

    // Generate Excel file
    const buffer = await workbook.xlsx.writeBuffer();
    
    // Return the Excel file
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}.xlsx"`
      }
    });
    
  } catch (error) {
    console.error('Error generating Excel file:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la génération du fichier Excel' },
      { status: 500 }
    );
  }
} 