import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { AuthLogger } from '@/lib/security/authLogger';
import PDFDocument from 'pdfkit';
import { format, isWeekend } from 'date-fns';
import { fr } from 'date-fns/locale';
import { calculatePresenceStats, formatHours, formatPercentage } from '@/lib/utils/presence-calculations';
import * as fs from 'fs';
import * as path from 'path';
import puppeteer from 'puppeteer';
import handlebars from 'handlebars';
import { generatePdfReport } from '@/lib/services/pdf-export-service';
import { logExportEvent } from '@/lib/services/export-service';
import * as os from 'os';

// Types de rapports disponibles
type ReportType = 'presence' | 'attendance' | 'access';

// Interface pour les options de rapport
interface ReportOptions {
  type: ReportType;
  startDate: string;
  endDate: string;
  employeeId?: string;
  department?: string;
  includeStats?: boolean;
}

// Define route segment config with proper format
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Fonction simple pour formater une date
function formatDate(dateString) {
  if (!dateString) return '';
  return format(new Date(dateString), 'dd MMMM yyyy', { locale: fr });
}

// Fonction simple pour formater un nombre
function formatNumber(value) {
  if (value === undefined || value === null) return '0';
  return parseFloat(value).toFixed(1);
}

// Générer des recommandations basées sur les données
function generateRecommendations(data: any): string[] {
  const recommendations: string[] = [];
  
  if (data?.summary) {
    const presenceRate = data.summary.avgEmployeePerDay * 100 / Math.max(1, data.summary.totalEmployees);
    if (presenceRate < 70) {
      recommendations.push("Le taux de présence moyen est inférieur à 70%. Envisagez une analyse des facteurs d'absences et des mesures pour améliorer la présence.");
    }
  }
  
  if (recommendations.length === 0) {
    recommendations.push("Les indicateurs de présence sont dans les normes attendues. Continuez le suivi régulier pour maintenir cette performance.");
  }
  
  return recommendations;
}

// Fonction pour générer un template HTML par défaut si le fichier de template n'existe pas
function generateDefaultTemplate(): string {
  return `
  <!DOCTYPE html>
  <html>
    <head>
      <meta charset="utf-8">
      <title>Rapport de Présence</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        h1 { color: #007B65; }
        .summary { margin: 20px 0; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f5f5f5; }
      </style>
    </head>
    <body>
      <h1>Rapport de Présence</h1>
      <p>Période: {{dateRange.from}} - {{dateRange.to}}</p>
      
      <div class="summary">
        <h2>Résumé</h2>
        <p>Total des employés: {{data.summary.totalEmployees}}</p>
        <p>Moyenne de présence: {{data.summary.avgEmployeePerDay}}</p>
        <p>Heures totales: {{data.summary.totalHours}}</p>
      </div>
      
      {{#if data.detailedLogs}}
      <h2>Données Détaillées</h2>
      <table>
        <tr>
          <th>Date</th>
          <th>Employé</th>
          <th>Badge</th>
          <th>Groupe</th>
          <th>Entrée</th>
          <th>Sortie</th>
          <th>Durée</th>
        </tr>
        {{#each data.detailedLogs}}
        <tr>
          <td>{{this.date}}</td>
          <td>{{this.name}}</td>
          <td>{{this.badge_number}}</td>
          <td>{{this.groupe}}</td>
          <td>{{this.first_badge}}</td>
          <td>{{this.last_badge}}</td>
          <td>{{this.duration}}</td>
        </tr>
        {{/each}}
      </table>
      {{/if}}
    </body>
  </html>
  `;
}

/**
 * Génère un rapport PDF
 */
async function generatePDF(options: ReportOptions): Promise<Buffer> {
  const doc = new PDFDocument({
    size: 'A4',
    margin: 50,
    info: {
      Title: `Rapport ${options.type}`,
      Author: 'SENATOR INVESTECH',
      Subject: `Rapport de ${options.type}`,
      Keywords: 'rapport, presence, attendance, access',
      CreationDate: new Date()
    }
  });

  // Collecter les données en fonction du type de rapport
  let data;
  let stats;
  let title;

  switch (options.type) {
    case 'presence':
      // Récupérer les logs d'accès pour le rapport de présence
      data = await prisma.access_logs.findMany({
        where: {
          event_date: {
            gte: new Date(options.startDate),
            lte: new Date(options.endDate)
          },
          person_type: 'employee',
          ...(options.employeeId && { badge_number: options.employeeId }),
          ...(options.department && { group_name: options.department })
        },
        orderBy: [
          { event_date: 'desc' },
          { event_time: 'desc' }
        ]
      });
      title = 'Rapport de Présence';
      break;

    case 'attendance':
      // Pour le rapport d'assiduité, utiliser également les logs d'accès
      data = await prisma.access_logs.findMany({
        where: {
          event_date: {
            gte: new Date(options.startDate),
            lte: new Date(options.endDate)
          },
          person_type: 'employee',
          ...(options.employeeId && { badge_number: options.employeeId }),
          ...(options.department && { group_name: options.department })
        },
        orderBy: [
          { event_date: 'desc' },
          { event_time: 'desc' }
        ]
      });

      if (options.includeStats) {
        stats = await calculateAttendanceStats(data);
      }
      title = 'Rapport d\'Assiduité';
      break;

    case 'access':
      data = await prisma.access_logs.findMany({
        where: {
          event_date: {
            gte: new Date(options.startDate),
            lte: new Date(options.endDate)
          },
          ...(options.department && { group_name: options.department })
        },
        orderBy: [
          { event_date: 'desc' },
          { event_time: 'desc' }
        ]
      });
      title = 'Rapport d\'Accès';
      break;
  }

  // En-tête du document
  doc.fontSize(20).text(title, { align: 'center' });
  doc.moveDown();
  doc.fontSize(12).text(`Période : du ${format(new Date(options.startDate), 'dd MMMM yyyy', { locale: fr })} au ${format(new Date(options.endDate), 'dd MMMM yyyy', { locale: fr })}`, { align: 'center' });
  doc.moveDown();

  // Filtrer par département si spécifié
  if (options.department) {
    doc.text(`Département : ${options.department}`);
    doc.moveDown();
  }

  // Filtrer par employé si spécifié
  if (options.employeeId) {
    const employee = await prisma.employees.findFirst({
      where: { badge_number: options.employeeId }
    });
    if (employee) {
      doc.text(`Employé : ${employee.first_name} ${employee.last_name} (${employee.badge_number})`);
      doc.moveDown();
    }
  }

  // Tableau des données
  const tableTop = 200;
  let currentTop = tableTop;

  // En-têtes du tableau selon le type de rapport
  const headers = options.type === 'access' 
    ? ['Date', 'Heure', 'Personne', 'Type', 'Lecteur', 'Groupe']
    : ['Date', 'Employé', 'Type', 'Heure', 'Notes'];

  // Dessiner les en-têtes
  doc.fontSize(10);
  headers.forEach((header, i) => {
    doc.text(header, 50 + (i * 100), currentTop);
  });
  currentTop += 20;

  // Ligne de séparation
  doc.moveTo(50, currentTop).lineTo(550, currentTop).stroke();
  currentTop += 10;

  // Données du tableau
  if (options.type === 'access') {
    // Pour les rapports d'accès, utiliser les données brutes
  data.forEach((item: any) => {
    if (currentTop > 700) {
      doc.addPage();
      currentTop = 50;
    }

      const row = [
          format(new Date(item.event_date), 'dd/MM/yyyy'),
          format(new Date(item.event_time), 'HH:mm'),
        item.full_name || item.badge_number,
          item.person_type,
        item.reader || 'Non spécifié',
        item.group_name || 'Non spécifié'
        ];

    row.forEach((cell, i) => {
      doc.text(cell?.toString() || '', 50 + (i * 100), currentTop);
    });

    currentTop += 20;
  });
  } else {
    // Pour les autres types de rapports, agréger les données par employé et par jour
    // Récupérer les paramètres de configuration de l'assiduité
    const attendanceParams = await prisma.attendance_parameters.findFirst();
    
    // Récupérer les jours définis comme journées continues
    const continuousDays = ((attendanceParams as any)?.continuous_days || '')
      .split(',')
      .map(Number)
      .filter(n => !isNaN(n));
    
    // Organiser les logs par badge et par jour
    const logsByBadgeAndDate: Record<string, Record<string, any[]>> = {};
    
    data.forEach((log: any) => {
      const badge = log.badge_number;
      const dateStr = format(log.event_date, 'yyyy-MM-dd');
      
      if (!logsByBadgeAndDate[badge]) {
        logsByBadgeAndDate[badge] = {};
      }
      
      if (!logsByBadgeAndDate[badge][dateStr]) {
        logsByBadgeAndDate[badge][dateStr] = [];
      }
      
      logsByBadgeAndDate[badge][dateStr].push(log);
    });
    
    // Récupérer les employés correspondants
    const badgeNumbers = Object.keys(logsByBadgeAndDate);
    const employees = await prisma.employees.findMany({
      where: {
        badge_number: {
          in: badgeNumbers
        }
      }
    });
    
    // Récupérer les jours fériés
    const holidays = await prisma.holidays.findMany({
      where: {
        date: {
          gte: new Date(options.startDate),
          lte: new Date(options.endDate)
        }
      }
    });
    
    const holidayDates = holidays.reduce((acc, holiday) => {
      const dateStr = format(holiday.date, 'yyyy-MM-dd');
      acc[dateStr] = holiday.name;
      return acc;
    }, {} as Record<string, string>);
    
    // Paramètres de pause déjeuner
    const lunchBreakEnabled = attendanceParams?.lunch_break === true;
    const lunchBreakStart = attendanceParams?.lunch_break_start || '12:00';
    const lunchBreakEnd = attendanceParams?.lunch_break_end || '13:00';
    const lunchDuration = attendanceParams?.lunch_break_duration || 60;
    
    // Convertir les heures en minutes pour les calculs
    const lunchStartMinutes = convertTimeToMinutes(lunchBreakStart);
    const lunchEndMinutes = convertTimeToMinutes(lunchBreakEnd);
    
    // Traiter chaque badge et chaque jour
    for (const badge in logsByBadgeAndDate) {
      const employee = employees.find(e => e.badge_number === badge);
      const employeeName = employee 
        ? `${employee.first_name} ${employee.last_name}`
        : data.find((log: any) => log.badge_number === badge)?.full_name || badge;
      
      for (const dateStr in logsByBadgeAndDate[badge]) {
        if (currentTop > 700) {
          doc.addPage();
          currentTop = 50;
        }
        
        const logsForDay = logsByBadgeAndDate[badge][dateStr];
        
        // Trier les logs par heure
        logsForDay.sort((a: any, b: any) => {
          return new Date(a.event_time).getTime() - new Date(b.event_time).getTime();
        });
        
        // Déterminer l'heure d'arrivée et de départ
        const firstLog = logsForDay[0];
        const lastLog = logsForDay[logsForDay.length - 1];
        
        // Vérifier si le jour est un weekend, un jour férié ou une journée continue
        const date = new Date(dateStr);
        const dayOfWeek = date.getDay();
        const configDayOfWeek = dayOfWeek === 0 ? 7 : dayOfWeek;
        const isContinuousDay = continuousDays.includes(configDayOfWeek);
        const isWeekendDay = isWeekend(date);
        const isHolidayDay = !!holidayDates[dateStr];
        
        // Calculer la durée de présence
        const firstTime = format(new Date(firstLog.event_time), 'HH:mm');
        const lastTime = format(new Date(lastLog.event_time), 'HH:mm');
        
        let duration = calculateDuration(firstTime, lastTime);
        
        // Déduire la pause déjeuner si nécessaire
        let adjustedDuration = duration;
        if (lunchBreakEnabled && !isWeekendDay && !isHolidayDay && !isContinuousDay) {
          const firstMinutes = convertTimeToMinutes(firstTime);
          const lastMinutes = convertTimeToMinutes(lastTime);
          
          // Vérifier si la présence chevauche la pause déjeuner
          let pauseDeducted = 0;
          
          if (firstMinutes <= lunchStartMinutes && lastMinutes >= lunchEndMinutes) {
            // Présent pendant toute la pause déjeuner
            pauseDeducted = lunchEndMinutes - lunchStartMinutes;
          } else if (firstMinutes < lunchEndMinutes && lastMinutes > lunchStartMinutes) {
            // Chevauche partiellement la pause
            const overlapStart = Math.max(firstMinutes, lunchStartMinutes);
            const overlapEnd = Math.min(lastMinutes, lunchEndMinutes);
            pauseDeducted = Math.max(0, overlapEnd - overlapStart);
          }
          
          // Déduire la pause du temps total
          adjustedDuration = Math.max(0, (duration * 60 - pauseDeducted) / 60);
        }
        
        // Déterminer le type d'entrée en fonction des conditions
        let type = 'PRESENT';
        if (isHolidayDay) {
          type = 'HOLIDAY';
        } else if (isWeekendDay) {
          type = 'WEEKEND';
        } else if (isContinuousDay) {
          type = 'CONTINUOUS';
        }
        
        // Ajouter la ligne au rapport
        const row = [
          format(date, 'dd/MM/yyyy'),
          employeeName,
          type,
          `${firstTime} - ${lastTime}`,
          isContinuousDay ? 'Journée continue' : 
            isHolidayDay ? holidayDates[dateStr] : 
            isWeekendDay ? 'Weekend' : 
            `Durée: ${formatHours(adjustedDuration)}`
        ];

        row.forEach((cell, i) => {
          doc.text(cell?.toString() || '', 50 + (i * 100), currentTop);
        });

        currentTop += 20;
      }
    }
  }

  // Ajouter les statistiques si demandées
  if (options.includeStats && stats) {
    doc.addPage();
    doc.fontSize(16).text('Statistiques', { align: 'center' });
    doc.moveDown();

    doc.fontSize(12);
    doc.text(`Taux de présence : ${stats.presenceRate.toFixed(2)}%`);
    doc.text(`Taux d'absence : ${stats.absenceRate.toFixed(2)}%`);
    doc.text(`Taux de retard : ${stats.tardinessRate.toFixed(2)}%`);
    doc.text(`Taux d'absence excusée : ${stats.excusedAbsenceRate.toFixed(2)}%`);
    doc.moveDown();

    if (stats.departmentStats) {
      doc.text('Statistiques par département :');
      doc.moveDown();
      Object.entries(stats.departmentStats).forEach(([dept, deptStats]: [string, any]) => {
        doc.text(`Département ${dept}:`);
        doc.text(`  - Présence : ${deptStats.presenceRate.toFixed(2)}%`);
        doc.text(`  - Absence : ${deptStats.absenceRate.toFixed(2)}%`);
        doc.text(`  - Retard : ${deptStats.tardinessRate.toFixed(2)}%`);
        doc.moveDown();
      });
    }
  }

  // Pied de page
  const pageCount = doc.bufferedPageRange().count;
  for (let i = 0; i < pageCount; i++) {
    doc.switchToPage(i);
    doc.fontSize(10).text(
      `Page ${i + 1} sur ${pageCount}`,
      50,
      800,
      { align: 'center' }
    );
    doc.text(
      `Généré le ${format(new Date(), 'dd/MM/yyyy à HH:mm', { locale: fr })}`,
      50,
      820,
      { align: 'center' }
    );
  }

  // Finaliser le PDF
  doc.end();

  // Retourner le buffer
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });
}

// Fonction pour convertir une heure au format HH:MM en minutes depuis minuit
function convertTimeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

// Calculer la durée entre deux heures au format HH:MM en heures décimales
function calculateDuration(startTime: string, endTime: string): number {
  const startMinutes = convertTimeToMinutes(startTime);
  let endMinutes = convertTimeToMinutes(endTime);
  
  // Si l'heure de fin est avant l'heure de début, considérer qu'elle est le jour suivant
  if (endMinutes < startMinutes) {
    endMinutes += 24 * 60; // Ajouter 24h en minutes
  }
  
  return (endMinutes - startMinutes) / 60;
}

/**
 * Calcule les statistiques d'assiduité
 */
async function calculateAttendanceStats(data: any[]) {
  const total = data.length;
  const stats = {
    total,
    presence: 0,
    absence: 0,
    tardiness: 0,
    excusedAbsence: 0,
    presenceRate: 0,
    absenceRate: 0,
    tardinessRate: 0,
    excusedAbsenceRate: 0,
    departmentStats: {} as Record<string, any>
  };

  // Calculer les totaux
  data.forEach((record) => {
    switch (record.type) {
      case 'PRESENT':
        stats.presence++;
        break;
      case 'ABSENT':
        stats.absence++;
        break;
      case 'TARDY':
        stats.tardiness++;
        break;
      case 'EXCUSED':
        stats.excusedAbsence++;
        break;
    }

    // Statistiques par département
    const dept = record.employee.department;
    if (!stats.departmentStats[dept]) {
      stats.departmentStats[dept] = {
        total: 0,
        presence: 0,
        absence: 0,
        tardiness: 0,
        presenceRate: 0,
        absenceRate: 0,
        tardinessRate: 0
      };
    }

    stats.departmentStats[dept].total++;
    switch (record.type) {
      case 'PRESENT':
        stats.departmentStats[dept].presence++;
        break;
      case 'ABSENT':
        stats.departmentStats[dept].absence++;
        break;
      case 'TARDY':
        stats.departmentStats[dept].tardiness++;
        break;
    }
  });

  // Calculer les taux
  if (total > 0) {
    stats.presenceRate = (stats.presence / total) * 100;
    stats.absenceRate = (stats.absence / total) * 100;
    stats.tardinessRate = (stats.tardiness / total) * 100;
    stats.excusedAbsenceRate = (stats.excusedAbsence / total) * 100;

    // Calculer les taux par département
    Object.values(stats.departmentStats).forEach((deptStats) => {
      if (deptStats.total > 0) {
        deptStats.presenceRate = (deptStats.presence / deptStats.total) * 100;
        deptStats.absenceRate = (deptStats.absence / deptStats.total) * 100;
        deptStats.tardinessRate = (deptStats.tardiness / deptStats.total) * 100;
      }
    });
  }

  return stats;
}

/**
 * GET /api/export/pdf - Générer un rapport PDF
 */
export async function GET(req: NextRequest) {
  try {
    // Vérification de l'authentification
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Authentification requise" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') as ReportType;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const employeeId = searchParams.get('employeeId');
    const department = searchParams.get('department');
    const includeStats = searchParams.get('includeStats') === 'true';

    // Valider les paramètres requis
    if (!type || !startDate || !endDate) {
      return NextResponse.json(
        { error: "Type de rapport, date de début et date de fin requis" },
        { status: 400 }
      );
    }

    // Valider le type de rapport
    if (!['presence', 'attendance', 'access'].includes(type)) {
      return NextResponse.json(
        { error: "Type de rapport invalide" },
        { status: 400 }
      );
    }

    // Valider les dates
    if (isNaN(Date.parse(startDate)) || isNaN(Date.parse(endDate))) {
      return NextResponse.json(
        { error: "Dates invalides" },
        { status: 400 }
      );
    }

    // Générer le PDF
    const pdfBuffer = await generatePDF({
      type,
      startDate,
      endDate,
      employeeId: employeeId || undefined,
      department: department || undefined,
      includeStats: includeStats || false
    });

    // Enregistrer l'activité
    await AuthLogger.logActivity(
      session.user.id,
      'pdf_export',
      `Export PDF du rapport ${type} du ${startDate} au ${endDate}`
    );

    // Retourner le PDF
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=rapport-${type}-${format(new Date(), 'yyyy-MM-dd')}.pdf`
      }
    });
  } catch (error) {
    console.error('Erreur lors de la génération du PDF:', error);
    return NextResponse.json(
      { error: "Erreur lors de la génération du PDF" },
      { status: 500 }
    );
  }
}

// Enregistrer les helpers Handlebars pour le formatage
function registerHandlebarsHelpers() {
  handlebars.registerHelper('formatDate', function(date) {
    if (!date) return '';
    return format(new Date(date), 'dd MMMM yyyy', { locale: fr });
  });

  handlebars.registerHelper('formatCurrentDate', function() {
    return format(new Date(), 'dd MMMM yyyy à HH:mm', { locale: fr });
  });

  handlebars.registerHelper('currentYear', function() {
    return new Date().getFullYear();
  });

  handlebars.registerHelper('formatNumber', function(value) {
    if (value === undefined || value === null) return '0';
    return parseFloat(value).toFixed(1);
  });

  handlebars.registerHelper('divide', function(a, b) {
    if (b === 0) return 0;
    return a / b;
  });

  handlebars.registerHelper('multiply', function(a, b) {
    return a * b;
  });

  handlebars.registerHelper('subtract', function(a, b) {
    return a - b;
  });

  handlebars.registerHelper('lessThan', function(a, b) {
    return a < b;
  });

  handlebars.registerHelper('greaterThan', function(a, b) {
    return a > b;
  });

  handlebars.registerHelper('greaterThanOrEqual', function(a, b) {
    return a >= b;
  });

  handlebars.registerHelper('and', function(a, b) {
    return a && b;
  });

  // Helper pour calculer la moyenne des heures par employé
  handlebars.registerHelper('calculateAverageHoursPerEmployee', function(this: any) {
    const data = this.data;
    if (!data?.daily || data.daily.length === 0) return "0 h";
    
    let totalEmployeeHours = 0;
    let totalEmployeeCount = 0;
    
    data.daily.forEach(day => {
      if (day?.count && day?.duration) {
        totalEmployeeHours += day.duration;
        totalEmployeeCount += day.count;
      }
    });
    
    if (totalEmployeeCount === 0) return "0 h";
    return ((totalEmployeeHours / 60) / totalEmployeeCount).toFixed(1) + " h";
  });
}

/**
 * Route POST pour générer un rapport PDF
 */
export async function POST(request: NextRequest) {
  // Vérifier l'authentification
  const session = await getServerSession(authOptions);
  if (!session) {
    return new NextResponse(JSON.stringify({ error: 'Accès non autorisé' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    // Récupérer les données de la requête
    const requestData = await request.json();
    const { data, options } = requestData;
    
    if (!data || !options) {
      return new NextResponse(JSON.stringify({ error: 'Données manquantes' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Créer un dossier temporaire pour le fichier PDF
    const tempDir = path.join(os.tmpdir(), `export_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`);
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    // Générer un nom de fichier unique
    const dateStr = format(new Date(), 'yyyy-MM-dd_HH-mm');
    const fileName = `rapport_${options.source}_${options.reportType}_${dateStr}.pdf`;
    const filePath = path.join(tempDir, fileName);
    
    // Configurer les options du rapport
    const reportType = options.reportType === 'summary' ? 'summary' : 'detailed';
    
    // Déterminer la source du rapport
    let source: 'presence' | 'anomalies' | 'access' = 'access';
    if (options.source === 'anomalies') {
      source = 'anomalies';
    } else if (options.source === 'attendance' || options.source === 'presence') {
      source = 'presence';
    }
    
    // Configurer les options du rapport
    const reportOptions = {
      startDate: options.startDate,
      endDate: options.endDate,
      reportType: reportType as 'summary' | 'detailed',
      source: source as 'presence' | 'anomalies' | 'access',
      filters: options.filters,
      includeCharts: options.includeCharts !== false,
      includeDetails: reportType === 'detailed' ? (options.includeDetails !== false) : false,
      logoUrl: options.logoUrl
    };
    
    // Prétraitement des données pour les rapports de synthèse
    if (data && reportType === 'summary') {
      // Si c'est un rapport de synthèse, SUPPRIMER COMPLÈTEMENT les données détaillées
      if (data.daily && Array.isArray(data.daily)) {
        // Conserver une copie pour les graphiques seulement si spécifiquement demandé
        if (options.includeCharts) {
          data.dailySummary = [...data.daily];
        }
        
        // Pour un rapport de synthèse, on supprime TOUTES les données détaillées, sans exception
        data.daily = [];
        
        // Forcer la non-inclusion des détails dans les options également
        reportOptions.includeDetails = false;
      }
    }
    
    // Générer le PDF
    logExportEvent(`Génération du rapport PDF ${fileName}`);
    
    // Vérification de sécurité finale pour les rapports de synthèse
    if (reportType === 'summary' && data && data.daily) {
      // S'assurer que les données détaillées sont bien vides
      logExportEvent(`Vérification finale des données pour le rapport de synthèse`);
      logExportEvent(`Avant suppression: data.daily contient ${data.daily.length} éléments`);
      
      // FORCE: Suppression radicale des données détaillées
      delete data.daily;
      // Créer un tableau vide au cas où le template y accéderait quand même
      data.daily = [];
      reportOptions.includeDetails = false;
      
      logExportEvent(`Après suppression: data.daily supprimé ou vidé`);
      logExportEvent(`Options finales: ${JSON.stringify(reportOptions)}`);
    }
    
    // Imprimer un log détaillé des données envoyées au générateur PDF
    logExportEvent(`Structure des données envoyées au générateur PDF: ${Object.keys(data).join(', ')}`);
    if (data.daily) {
      logExportEvent(`data.daily existe toujours et contient ${data.daily.length} éléments`);
    } else {
      logExportEvent(`data.daily a été correctement supprimé`);
    }
    
    const pdfBuffer = await generatePdfReport(data, reportOptions, filePath);
    
    // Retourner le PDF
    return new NextResponse(pdfBuffer, {
          headers: {
            'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=${fileName}`
          }
    });
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Erreur lors de la génération du PDF:', errorMessage);
    
    return new NextResponse(JSON.stringify({ error: `Erreur lors de la génération du PDF: ${errorMessage}` }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
