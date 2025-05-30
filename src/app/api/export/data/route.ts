import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { AuthLogger } from '@/lib/security/authLogger';
import { format, isWeekend } from 'date-fns';
import { fr } from 'date-fns/locale';
import ExcelJS from 'exceljs';

// Define route segment config with proper format
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * GET /api/export/data - Exporter les données de présence en CSV ou Excel
 */
export async function GET(req: NextRequest) {
  try {
    // Vérification de l'authentification
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Authentification requise" }, { status: 401 });
    }

    // Récupérer les paramètres de la requête
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const employeeId = searchParams.get('employeeId');
    const department = searchParams.get('department');
    const searchQuery = searchParams.get('searchQuery');
    const filterType = searchParams.get('filterType') as 'name' | 'badge' | 'both' || 'both';
    const exportFormat = searchParams.get('format') || 'csv'; // 'csv' ou 'excel'

    // Valider les dates
    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: "Les dates de début et de fin sont requises" },
        { status: 400 }
      );
    }

    console.log(`[DEBUG] Export de données: startDate=${startDate}, endDate=${endDate}, format=${exportFormat}, employeeId=${employeeId}, searchQuery=${searchQuery}`);

    // Récupérer les paramètres de présence
    const attendanceParams = await prisma.attendance_parameters.findFirst();
    
    // Récupérer les jours définis comme journées continues
    const continuousDays = ((attendanceParams as any)?.continuous_days || '')
      .split(',')
      .map(Number)
      .filter(n => !isNaN(n));
    
    // Récupérer les jours fériés
    const holidays = await prisma.holidays.findMany({
      where: {
        date: {
          gte: new Date(startDate),
          lte: new Date(endDate)
        }
      }
    });
    
    const holidayDates = holidays.reduce((acc, holiday) => {
      const dateStr = format(holiday.date, 'yyyy-MM-dd');
      acc[dateStr] = holiday.name;
      return acc;
    }, {} as Record<string, string>);

    // Récupérer TOUS les logs d'accès pour la période, sans filtrer sur le type d'événement
    const accessLogs = await prisma.access_logs.findMany({
      where: {
        event_date: {
          gte: new Date(startDate),
          lte: new Date(endDate)
        },
        person_type: 'employee',
        ...(employeeId && { badge_number: employeeId }),
        ...(department && { group_name: department })
      },
      orderBy: [
        { event_date: 'asc' },
        { badge_number: 'asc' },
        { event_time: 'asc' }
      ]
    });
    
    console.log(`[DEBUG] Nombre de logs récupérés: ${accessLogs.length}`);
    
    // Récupérer les employés concernés
    const badgeNumbers = Array.from(new Set(accessLogs.map(log => log.badge_number)));
    const employees = await prisma.employees.findMany({
      where: {
        badge_number: {
          in: badgeNumbers
        }
      }
    });
    
    // Préparer les données pour l'export
    let exportData = accessLogs.map(log => {
      const employee = employees.find(e => e.badge_number === log.badge_number);
      const dateStr = format(log.event_date, 'yyyy-MM-dd');
      const timeStr = format(new Date(log.event_time), 'HH:mm:ss');
      
      // Déterminer le type de jour
      const date = new Date(dateStr);
      const dayOfWeek = date.getDay();
      const configDayOfWeek = dayOfWeek === 0 ? 7 : dayOfWeek;
      const isContinuousDay = continuousDays.includes(configDayOfWeek);
      const isWeekendDay = isWeekend(date);
      const isHolidayDay = !!holidayDates[dateStr];
      
      let dayType = 'NORMAL';
      if (isHolidayDay) dayType = 'FÉRIÉ';
      else if (isWeekendDay) dayType = 'WEEKEND';
      else if (isContinuousDay) dayType = 'CONTINU';
      
      return {
        date: dateStr,
        jour_semaine: format(date, 'EEEE', { locale: fr }),
        type_jour: dayType,
        jour_ferie: isHolidayDay ? holidayDates[dateStr] : '',
        badge: log.badge_number,
        nom: employee ? `${employee.first_name} ${employee.last_name}` : log.full_name || log.badge_number,
        departement: employee?.department || log.group_name || '',
        heure: timeStr,
        type_evenement: log.event_type || log.direction || 'INCONNU',
        lecteur: log.reader || '',
        terminal: log.terminal || '',
        statut: log.processed ? 'Traité' : 'Non traité',
        description: log.raw_event_type || ''
      };
    });
    
    // Appliquer les filtres de recherche si nécessaire
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      exportData = exportData.filter(item => {
        if (filterType === 'name' || filterType === 'both') {
          if (item.nom.toLowerCase().includes(query)) {
            return true;
          }
        }
        
        if (filterType === 'badge' || filterType === 'both') {
          if (item.badge.toLowerCase().includes(query)) {
            return true;
          }
        }
        
        return false;
      });
    }
    
    // Enregistrer l'activité
    await AuthLogger.logActivity(
      session.user.id,
      'export_presence_data',
      `Export des données de présence du ${startDate} au ${endDate} au format ${exportFormat}`
    );
    
    // Générer et retourner le fichier selon le format demandé
    if (exportFormat.toLowerCase() === 'excel') {
      return generateExcelFile(exportData, startDate, endDate);
    } else {
      return generateCsvFile(exportData, startDate, endDate);
    }
  } catch (error) {
    console.error('Erreur lors de l\'export des données:', error);
    return NextResponse.json(
      { error: "Erreur lors de l'export des données" },
      { status: 500 }
    );
  }
}

/**
 * Génère un fichier CSV à partir des données
 */
function generateCsvFile(data: any[], startDate: string, endDate: string): NextResponse {
  // Définir les en-têtes CSV
  const headers = [
    'Date', 'Jour', 'Type de jour', 'Jour férié', 'Badge', 'Nom', 'Département',
    'Heure', 'Type d\'événement', 'Lecteur', 'Terminal', 'Statut', 'Description'
  ];
  
  // Générer le contenu CSV
  const csvContent = [
    headers.join(','),
    ...data.map(row => [
      row.date,
      row.jour_semaine,
      row.type_jour,
      `"${row.jour_ferie}"`,
      row.badge,
      `"${row.nom}"`,
      `"${row.departement}"`,
      row.heure,
      `"${row.type_evenement}"`,
      `"${row.lecteur}"`,
      `"${row.terminal}"`,
      `"${row.statut}"`,
      `"${row.description}"`
    ].join(','))
  ].join('\n');
  
  return new NextResponse(csvContent, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename=presence_data_${startDate}_${endDate}.csv`
    }
  });
}

/**
 * Génère un fichier Excel à partir des données
 */
async function generateExcelFile(data: any[], startDate: string, endDate: string): Promise<NextResponse> {
  // Créer un nouveau classeur Excel
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'SENATOR INVESTECH';
  workbook.created = new Date();
  
  // Créer une feuille pour les données détaillées
  const detailsSheet = workbook.addWorksheet('Détails de présence');
  
  // Définir les colonnes
  detailsSheet.columns = [
    { header: 'Date', key: 'date', width: 12 },
    { header: 'Jour', key: 'jour_semaine', width: 15 },
    { header: 'Type de jour', key: 'type_jour', width: 12 },
    { header: 'Jour férié', key: 'jour_ferie', width: 20 },
    { header: 'Badge', key: 'badge', width: 12 },
    { header: 'Nom', key: 'nom', width: 25 },
    { header: 'Département', key: 'departement', width: 20 },
    { header: 'Heure', key: 'heure', width: 10 },
    { header: 'Type d\'événement', key: 'type_evenement', width: 15 },
    { header: 'Lecteur', key: 'lecteur', width: 20 },
    { header: 'Terminal', key: 'terminal', width: 20 },
    { header: 'Statut', key: 'statut', width: 10 },
    { header: 'Description', key: 'description', width: 30 }
  ];
  
  // Ajouter les styles à l'en-tête
  detailsSheet.getRow(1).font = { bold: true };
  detailsSheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFD3D3D3' } // Gris clair
  };
  
  // Ajouter les données
  detailsSheet.addRows(data);
  
  // Ajouter des styles conditionnels
  data.forEach((row, index) => {
    const rowIndex = index + 2; // +2 car l'en-tête est à la ligne 1
    
    // Appliquer un style selon le type de jour
    if (row.type_jour === 'FÉRIÉ') {
      detailsSheet.getRow(rowIndex).font = { color: { argb: 'FFFF0000' } }; // Rouge
    } else if (row.type_jour === 'WEEKEND') {
      detailsSheet.getRow(rowIndex).font = { color: { argb: 'FF0000FF' } }; // Bleu
    } else if (row.type_jour === 'CONTINU') {
      detailsSheet.getRow(rowIndex).font = { color: { argb: 'FF008000' } }; // Vert
    }
  });
  
  // Créer une deuxième feuille avec des statistiques récapitulatives
  const statsSheet = workbook.addWorksheet('Statistiques');
  
  // Regrouper les données par employé et par jour
  const employeeStats: Record<string, Record<string, number>> = {};
  const daysStats: Record<string, number> = {};
  
  data.forEach(row => {
    // Compter les jours uniques
    daysStats[row.date] = (daysStats[row.date] || 0) + 1;
    
    // Compter les événements par employé et par jour
    if (!employeeStats[row.badge]) {
      employeeStats[row.badge] = {};
    }
    if (!employeeStats[row.badge][row.date]) {
      employeeStats[row.badge][row.date] = 0;
    }
    employeeStats[row.badge][row.date]++;
  });
  
  // Ajouter les statistiques par jour
  statsSheet.addRow(['Période', `Du ${startDate} au ${endDate}`]);
  statsSheet.addRow(['Total des événements', data.length.toString()]);
  statsSheet.addRow(['Nombre de jours', Object.keys(daysStats).length.toString()]);
  statsSheet.addRow(['Nombre d\'employés', Object.keys(employeeStats).length.toString()]);
  statsSheet.addRow([]);
  
  // Titre pour les statistiques par employé
  statsSheet.addRow(['Statistiques par employé']);
  statsSheet.addRow(['Badge', 'Nom', 'Département', 'Jours de présence', 'Total des événements']);
  
  // Calculer et ajouter les statistiques par employé
  Object.keys(employeeStats).forEach(badge => {
    const employee = data.find(row => row.badge === badge);
    const daysCount = Object.keys(employeeStats[badge]).length;
    const eventsCount = Object.values(employeeStats[badge]).reduce((sum, count) => sum + count, 0);
    
    statsSheet.addRow([
      badge,
      employee?.nom || badge,
      employee?.departement || 'N/A',
      daysCount.toString(),
      eventsCount.toString()
    ]);
  });
  
  // Définir des styles pour la feuille de statistiques
  statsSheet.getColumn(1).width = 20;
  statsSheet.getColumn(2).width = 25;
  statsSheet.getColumn(3).width = 20;
  statsSheet.getColumn(4).width = 20;
  statsSheet.getColumn(5).width = 20;
  
  // Mettre en gras les titres
  [1, 2, 3, 4, 6, 7].forEach(rowIndex => {
    statsSheet.getRow(rowIndex).font = { bold: true };
  });
  
  // Générer le fichier Excel
  const buffer = await workbook.xlsx.writeBuffer();
  
  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename=presence_data_${startDate}_${endDate}.xlsx`
    }
  });
} 