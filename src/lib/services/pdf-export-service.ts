import * as fs from 'fs';
import * as path from 'path';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import puppeteer from 'puppeteer';
import handlebars from 'handlebars';
import { logExportEvent } from './export-service';
import { isWeekend } from 'date-fns';
import { formatHours, formatPercentage } from '@/lib/utils/presence-calculations';
import { APP_CONFIG } from '@/config/app';

// Interfaces pour les données des rapports
export interface ReportOptions {
  startDate: string;
  endDate: string;
  reportType: 'detailed' | 'summary';
  source: 'presence' | 'anomalies' | 'access';
  filters?: Record<string, any>;
  includeCharts?: boolean;
  includeDetails?: boolean;
  logoUrl?: string;
}

// Registre des templates pour chaque type de rapport
const TEMPLATE_REGISTRY = {
  presence: 'presence-report-template.html',
  anomalies: 'anomalies-report-template.html',
  access: 'access-report-template.html',
};

/**
 * Initialisation de Handlebars avec les helpers et les partials
 */
function initializeHandlebars() {
  // Enregistrer les partials (composants réutilisables)
  const baseStylesPath = path.join(process.cwd(), 'src/templates/export/common/base-styles.css');
  const baseStyles = fs.readFileSync(baseStylesPath, 'utf8');
  handlebars.registerPartial('common/base-styles', baseStyles);
  
  // Enregistrer le partial de la page de couverture
  try {
    const coverPagePath = path.join(process.cwd(), 'src/templates/export/common/cover-page.html');
    const coverPageTemplate = fs.readFileSync(coverPagePath, 'utf8');
    handlebars.registerPartial('common/cover-page', coverPageTemplate);
    logExportEvent('Template de page de couverture chargé avec succès');
  } catch (error) {
    logExportEvent(`Erreur lors du chargement de la page de couverture: ${error}`);
  }
  
  // Helper pour les comparaisons d'égalité dans les templates
  handlebars.registerHelper('ifEquals', function(this: any, arg1: any, arg2: any, options: any) {
    return (arg1 == arg2) ? options.fn(this) : options.inverse(this);
  });
  
  // Helpers pour le formatage des dates
  handlebars.registerHelper('formatDate', function(date: Date) {
    if (!date) return '';
    return format(new Date(date), 'dd/MM/yyyy', { locale: fr });
  });
  
  handlebars.registerHelper('formatTime', function(date: Date) {
    if (!date) return '';
    return format(new Date(date), 'HH:mm:ss', { locale: fr });
  });
  
  handlebars.registerHelper('formatDayName', function(date: Date) {
    if (!date) return '';
    return format(new Date(date), 'EEEE', { locale: fr });
  });
  
  // Helper pour détecter les week-ends
  handlebars.registerHelper('isWeekend', function(date: Date) {
    if (!date) return false;
    return isWeekend(new Date(date));
  });
  
  // Helpers pour le formatage des valeurs
  handlebars.registerHelper('formatHours', function(minutes: number) {
    return formatHours(minutes);
  });
  
  handlebars.registerHelper('formatPercentage', function(value: number) {
    return formatPercentage(value);
  });
  
  // Helper pour les types d'anomalies
  handlebars.registerHelper('formatAnomalyType', function(eventType: string) {
    switch (eventType) {
      case 'user_denied':
        return 'Accès Refusé';
      case 'invalid_badge':
        return 'Badge Invalide';
      case 'unusual_time':
        return 'Horaire Inhabituel';
      default:
        return eventType;
    }
  });
  
  handlebars.registerHelper('anomalyTypeClass', function(eventType: string) {
    switch (eventType) {
      case 'user_denied':
        return 'access-denied';
      case 'invalid_badge':
        return 'invalid-badge';
      case 'unusual_time':
        return 'unusual-time';
      default:
        return '';
    }
  });
  
  // Helper pour calculer la moyenne des heures par employé
  handlebars.registerHelper('calculateAverageHoursPerEmployee', function(this: any) {
    const data = this.data;
    if (!data?.daily || data.daily.length === 0) return "0 h";
    
    let totalEmployeeHours = 0;
    let totalEmployeeCount = 0;
    
    data.daily.forEach((day: any) => {
      if (day?.count && day?.duration) {
        totalEmployeeHours += day.duration;
        totalEmployeeCount += day.count;
      }
    });
    
    if (totalEmployeeCount === 0) return "0 h";
    return ((totalEmployeeHours / 60) / totalEmployeeCount).toFixed(1) + " h";
  });
  
  // Helper pour afficher le nom de l'application
  handlebars.registerHelper('getAppName', function() {
    return APP_CONFIG.name;
  });
}

/**
 * Vérifier que le template existe, sinon utiliser un template par défaut
 */
function getTemplateContent(templateName: string): string {
  const templatePath = path.join(process.cwd(), `src/templates/export/pdf/${templateName}`);
  
  try {
    if (fs.existsSync(templatePath)) {
      return fs.readFileSync(templatePath, 'utf8');
    } else {
      logExportEvent(`Template introuvable: ${templateName}, utilisation du template par défaut`);
      return generateDefaultTemplate(templateName);
    }
  } catch (error) {
    logExportEvent(`Erreur lors de la lecture du template ${templateName}: ${error}`);
    return generateDefaultTemplate(templateName);
  }
}

/**
 * Génère un template par défaut si le fichier n'existe pas
 */
function generateDefaultTemplate(type: string): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Rapport - ${APP_CONFIG.name}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; color: #333; }
          h1 { color: ${APP_CONFIG.colors.primary}; text-align: center; margin-bottom: 20px; }
          .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; }
          .logo { height: 50px; }
          .date-range { font-style: italic; text-align: center; margin-bottom: 30px; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th { background-color: #f3f4f6; text-align: left; padding: 10px; }
          td { padding: 10px; border-bottom: 1px solid #e5e7eb; }
          .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #6b7280; }
        </style>
      </head>
      <body>
        {{> common/cover-page}}
        
        <div class="header">
          <img src="{{logoUrl}}" alt="Logo" class="logo">
          <h1>{{reportTitle}}</h1>
        </div>
        
        <div class="date-range">
          Période : du {{formattedStartDate}} au {{formattedEndDate}}
        </div>
        
        <p>Ce rapport a été généré automatiquement.</p>
        
        {{#if data}}
          <table>
            <thead>
              <tr>
                {{#each data.[0]}}
                  <th>{{@key}}</th>
                {{/each}}
              </tr>
            </thead>
            <tbody>
              {{#each data}}
                <tr>
                  {{#each this}}
                    <td>{{this}}</td>
                  {{/each}}
                </tr>
              {{/each}}
            </tbody>
          </table>
        {{else}}
          <p>Aucune donnée disponible pour cette période.</p>
        {{/if}}
        
        <div class="footer">
          <p>Généré le {{generationDate}}</p>
          <p>&copy; {{currentYear}} ${APP_CONFIG.name} - Tous droits réservés</p>
        </div>
      </body>
    </html>
  `;
}

/**
 * Créer un template complet avec page de couverture
 */
function createTemplateWithCoverPage(mainTemplateContent: string): string {
  // Vérifier si le template contient déjà un partial de page de couverture
  if (mainTemplateContent.includes('{{> common/cover-page}}')) {
    return mainTemplateContent;
  }
  
  // Injecter la page de couverture juste après la balise <body>
  return mainTemplateContent.replace(
    /<body>/i,
    '<body>\n  {{> common/cover-page}}'
  );
}

/**
 * Génère un rapport PDF basé sur les données et le template spécifié
 */
export async function generatePdfReport(
  data: any,
  options: ReportOptions,
  outputPath: string
): Promise<Buffer> {
  logExportEvent(`Génération du rapport PDF pour ${options.source}`);
  logExportEvent(`Type de rapport: ${options.reportType}, includeDetails: ${options.includeDetails}`);
  
  // Vérification de sécurité: si c'est un rapport de synthèse, on ne veut pas de données détaillées
  if (options.reportType === 'summary' && data && data.daily) {
    logExportEvent(`[DEBUG-PDF] data.daily existe dans le service PDF pour un rapport de synthèse`);
    logExportEvent(`[DEBUG-PDF] Contenu: ${data.daily.length} éléments`);
    
    // Analyser le contenu pour détecter des données détaillées
    if (data.daily.length > 0) {
      const sample = data.daily[0];
      logExportEvent(`[DEBUG-PDF] Structure d'un jour: ${Object.keys(sample).join(', ')}`);
      
      // Vérifier si les données sont déjà agrégées ou détaillées
      if (sample.date && sample.count && sample.duration) {
        logExportEvent(`[DEBUG-PDF] Les données quotidiennes semblent être agrégées correctement`);
      } else if (sample.badge_number || sample.badgeNumber || sample.employeeId) {
        logExportEvent(`[DEBUG-PDF] ALERTE: Les données quotidiennes contiennent des détails par employé!`);
        // Suppression forcée
        delete data.daily;
        data.daily = [];
      } else {
        logExportEvent(`[DEBUG-PDF] Structure des données quotidiennes non reconnue`);
      }
    }
    
    // Si on voulait supprimer complètement daily, décommenter cette partie
    // delete data.daily;
    // data.daily = [];
    
    options.includeDetails = false;
    logExportEvent(`[DEBUG-PDF] Options mises à jour: includeDetails=${options.includeDetails}`);
  }
  
  // Initialiser Handlebars
  initializeHandlebars();
  
  try {
    // Déterminer le template à utiliser
    const templateName = TEMPLATE_REGISTRY[options.source];
    
    if (!templateName) {
      throw new Error(`Type de rapport non supporté: ${options.source}`);
    }
    
    // Obtenir le contenu du template
    let templateSource = getTemplateContent(templateName);
    
    // Ajouter la page de couverture si elle n'existe pas déjà
    templateSource = createTemplateWithCoverPage(templateSource);
    
    const template = handlebars.compile(templateSource);
    
    // Préparer les données pour le template
    const reportTitle = {
      presence: 'Rapport de Temps de Présence',
      anomalies: 'Rapport d\'Anomalies d\'Accès',
      access: 'Rapport de Contrôle d\'Accès',
    }[options.source];
    
    logExportEvent(`Préparation des données du template`);
    
    const templateData = {
      data,
      reportTitle,
      appName: APP_CONFIG.name,
      reportType: options.reportType === 'detailed' ? 'Données détaillées' : 'Rapport de synthèse',
      formattedStartDate: format(new Date(options.startDate), 'dd MMMM yyyy', { locale: fr }),
      formattedEndDate: format(new Date(options.endDate), 'dd MMMM yyyy', { locale: fr }),
      generationDate: format(new Date(), 'dd/MM/yyyy à HH:mm', { locale: fr }),
      currentYear: new Date().getFullYear(),
      logoUrl: options.logoUrl || APP_CONFIG.export.defaultLogo,
      totalRecords: Array.isArray(data) ? data.length : (data?.summary?.totalRecords || 0),
      totalEmployees: data?.summary?.totalEmployees || 0,
      totalDays: data?.daily?.length || 0,
      // Contrôle strict des sections à afficher
      showDetailedData: options.includeDetails === true && options.reportType === 'detailed',
      showCharts: options.includeCharts === true,
      // Ajout du support pour les images de graphiques
      chartImage: data?.chartImage || null,
      hasMoreResults: Array.isArray(data) && data.length > 0 && 
        (!(data as any).summary ? false : data.length < ((data as any).summary?.totalRecords || 0)),
    };
    
    logExportEvent(`[DEBUG-PDF] Configuration du template terminée, showDetailedData=${templateData.showDetailedData}`);
    logExportEvent(`[DEBUG-PDF] totalDays=${templateData.totalDays}, reportType=${options.reportType}`);
    if (data.daily) {
      logExportEvent(`[DEBUG-PDF] data.daily contient ${data.daily.length} éléments dans le template`);
    }
    
    // Générer le HTML du rapport
    const html = template(templateData);
    
    // Pour le débogage, écrire le HTML dans un fichier temporaire
    const debugDir = path.dirname(outputPath);
    const htmlDebugPath = path.join(debugDir, `${path.basename(outputPath, '.pdf')}.debug.html`);
    fs.writeFileSync(htmlDebugPath, html);
    logExportEvent(`HTML du rapport écrit pour débogage: ${htmlDebugPath}`);
    
    // Générer le PDF avec Puppeteer
    logExportEvent(`Lancement de Puppeteer pour la génération PDF`);
    
    let browser;
    try {
      browser = await puppeteer.launch({
        headless: true, // Utiliser le mode headless standard
        args: [
          '--no-sandbox', 
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu',
          '--window-size=1280,1696' // Format A4 en pixels avec une densité de pixels raisonnable
        ]
      });
      
      logExportEvent(`Puppeteer lancé avec succès`);
      
      const page = await browser.newPage();
      
      // Configurer la page pour l'impression PDF
      await page.setViewport({ width: 1280, height: 1696 });
      
      // Augmenter le timeout pour le chargement du contenu (30 secondes)
      await page.setDefaultNavigationTimeout(30000);
      
      logExportEvent(`Chargement du contenu HTML dans Puppeteer`);
      await page.setContent(html, { 
        waitUntil: ['networkidle0', 'domcontentloaded', 'load'] 
      });
      
      // Attendre que les polices et images soient chargées
      await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 1000)));
      
      logExportEvent(`Génération du PDF...`);
      const pdfBuffer = await page.pdf({
        path: outputPath,
        format: 'A4',
        printBackground: true,
        margin: APP_CONFIG.export.formats.pdf.defaultMargins,
        displayHeaderFooter: true,
        footerTemplate: `
          <div style="width: 100%; text-align: center; font-size: 10px; color: #777;">
            <span>Page <span class="pageNumber"></span> sur <span class="totalPages"></span></span>
          </div>
        `,
        headerTemplate: ' '
      });
      
      logExportEvent(`Fermeture de Puppeteer`);
      await browser.close();
      
      logExportEvent(`Rapport PDF généré avec succès: ${outputPath} (${pdfBuffer.byteLength} octets)`);
      return pdfBuffer as Buffer;
    } catch (puppeteerError) {
      // Si le navigateur a été lancé, tenter de le fermer
      if (browser) {
        try {
          await browser.close();
        } catch (closeError) {
          logExportEvent(`Erreur lors de la fermeture de Puppeteer: ${closeError}`);
        }
      }
      throw new Error(`Erreur Puppeteer: ${puppeteerError}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logExportEvent(`Erreur lors de la génération du rapport PDF: ${errorMessage}`);
    
    // Tenter de générer un PDF d'erreur basique
    try {
      const errorPdf = await generateErrorPdf(
        `Erreur de génération du rapport PDF: ${errorMessage}`,
        options,
        outputPath
      );
      logExportEvent(`PDF d'erreur généré comme solution de secours`);
      return errorPdf;
    } catch (fallbackError) {
      logExportEvent(`Échec de génération du PDF d'erreur: ${fallbackError}`);
      throw error; // Remonter l'erreur originale
    }
  }
}

/**
 * Génère un PDF d'erreur simple en cas d'échec
 */
async function generateErrorPdf(errorMessage: string, options: ReportOptions, outputPath: string): Promise<Buffer> {
  try {
    // Générer un HTML d'erreur simple
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Erreur de Génération du Rapport</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; }
            h1 { color: #e53e3e; }
            .error-box { 
              border: 1px solid #e53e3e; 
              padding: 20px; 
              background-color: #fff5f5; 
              border-radius: 4px;
              margin: 20px 0;
            }
            .footer { margin-top: 40px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <h1>Erreur de Génération du Rapport</h1>
          <p>Une erreur est survenue lors de la génération du rapport PDF.</p>
          
          <div class="error-box">
            <strong>Message d'erreur:</strong><br>
            ${errorMessage}
          </div>
          
          <p><strong>Informations sur le rapport demandé:</strong></p>
          <ul>
            <li>Type de rapport: ${options.source}</li>
            <li>Période: ${options.startDate} au ${options.endDate}</li>
            <li>Format: ${options.reportType}</li>
          </ul>
          
          <p>Veuillez réessayer ultérieurement ou contacter le support technique si le problème persiste.</p>
          
          <div class="footer">
            <p>Date et heure: ${new Date().toLocaleString()}</p>
            <p>${APP_CONFIG.name}</p>
          </div>
        </body>
      </html>
    `;
    
    // Utilisér PDFKit comme solution de secours si Puppeteer échoue
    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument({
      size: 'A4',
      margin: 50,
      info: {
        Title: 'Erreur de génération de rapport',
        Author: APP_CONFIG.name,
        Subject: 'Erreur',
        Keywords: 'erreur, rapport, pdf',
        CreationDate: new Date()
      }
    });
    
    // Écrire le contenu
    doc.fontSize(20).text('Erreur de Génération du Rapport', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text('Une erreur est survenue lors de la génération du rapport PDF.');
    doc.moveDown();
    
    doc.rect(50, doc.y, 500, 100).fillAndStroke('#fff5f5', '#e53e3e');
    doc.fillColor('#000').text('Message d\'erreur:', 70, doc.y + 20);
    doc.text(errorMessage, 70, doc.y + 20, { width: 460 });
    
    doc.moveDown(2);
    doc.text('Informations sur le rapport demandé:');
    doc.moveDown();
    doc.text(`• Type de rapport: ${options.source}`);
    doc.text(`• Période: ${options.startDate} au ${options.endDate}`);
    doc.text(`• Format: ${options.reportType}`);
    
    doc.moveDown();
    doc.text('Veuillez réessayer ultérieurement ou contacter le support technique si le problème persiste.');
    
    doc.moveDown(2);
    doc.fontSize(10).fillColor('#666').text(`Date et heure: ${new Date().toLocaleString()}`);
    doc.text(APP_CONFIG.name);
    
    // Finaliser le PDF
    doc.end();
    
    // Capturer le buffer
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    
    return new Promise((resolve, reject) => {
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(chunks);
        fs.writeFileSync(outputPath, pdfBuffer);
        resolve(pdfBuffer);
      });
      
      doc.on('error', reject);
    });
  } catch (error) {
    logExportEvent(`Échec complet de la génération du PDF d'erreur: ${error}`);
    // Créer un buffer vide comme dernier recours
    return Buffer.from('Erreur de génération PDF');
  }
} 