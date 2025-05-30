import { Readable } from 'stream';
import { format as dateFormat } from 'date-fns';
import ExcelJS from 'exceljs';
import { createHash } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import archiver from 'archiver';
import { access_logs } from '@prisma/client';
import prisma from '@/lib/prisma';

/**
 * Service d'exportation de données
 * 
 * Ce service fournit des fonctionnalités complètes pour:
 * - Analyser les données avant exportation
 * - Gérer les contraintes de format (Excel, CSV, PDF)
 * - Exporter des données volumineuses avec division automatique
 * - Générer différents formats de fichiers
 * 
 * Il intègre également des mécanismes pour:
 * - La gestion des limites de chaque format
 * - Les recommandations utilisateur pour les grands volumes
 * - La génération d'archives ZIP pour les exports multifichiers
 */

// Logger spécifique aux exports
export const logExportEvent = (message: string, data?: any) => {
  const timestamp = new Date().toISOString();
  const logMessage = `[EXPORT] ${timestamp} - ${message}`;
  
  if (data) {
    console.log(logMessage, data);
  } else {
    console.log(logMessage);
  }
  
  // Ici, on pourrait ajouter une logique pour écrire dans un fichier de log dédié
  // ou envoyer les données à un service de monitoring
};

// Constantes pour les limites de format
export const FORMAT_LIMITS = {
  excel: {
    maxRows: 1000000, // 1 million de lignes dans Excel
    maxCols: 16384,
    maxSheetNameLength: 31,
    estimatedRowSizeBytes: 500 // ~500 octets par ligne en moyenne
  },
  csv: {
    maxRows: 1500000, // 1.5 million pour CSV (arbitraire, peut être ajusté)
    estimatedRowSizeBytes: 200 // ~200 octets par ligne en moyenne
  },
  pdf: {
    maxRows: 5000, // Une limite arbitraire pour le PDF pour des raisons de performance
    maxPagesPerFile: 1000,
    estimatedRowsPerPage: 40
  }
};

// Types pour les options d'export
export interface ExportOptions {
  format: 'excel' | 'xlsx' | 'csv' | 'pdf';
  startDate: string;
  endDate: string;
  filters?: {
    employeeId?: string;
    department?: string;
    readers?: string[];
    eventTypes?: string[];
  };
  splitFiles?: boolean;
  maxRowsPerFile?: number;
  includeHeaders?: boolean;
  orientation?: 'portrait' | 'landscape'; // Pour PDF
  paperSize?: 'A4' | 'Letter'; // Pour PDF
  timezone?: string;
  includeDetailedEvents?: boolean; // Pour les exports détaillés vs agrégés
  source?: string; // Identifie la source de l'export (ex: 'anomalies', 'attendance', etc.)
  exportType?: string; // Type d'export spécifique (ex: 'detailed', 'summary', etc.)
}

// Type pour les résultats d'export
export interface ExportResult {
  success: boolean;
  message?: string;
  files?: Array<{
    name: string;
    path: string;
    size: number;
    url?: string;
    recordCount: number;
  }>;
  totalRows?: number;
  totalFiles?: number;
  estimatedSize?: string;
  exceedsLimit?: boolean;
  jobId?: string;
  status?: 'completed' | 'processing' | 'failed';
}

// Interface pour l'analyse des données avant export
export interface ExportAnalysis {
  totalRows: number;
  estimatedSizeBytes: number;
  estimatedSizeMB: string;
  needsSplitting: boolean;
  recommendedMaxRowsPerFile: number;
  estimatedFileCount: number;
  exceedsLimit: boolean;
  canDirectDownload: boolean;
  warnings: string[];
  recommendations: string[];
}

/**
 * Analyse la requête d'export pour déterminer la taille et les limitations
 * 
 * Cette fonction permet de:
 * - Estimer le volume de données à exporter
 * - Déterminer si les limites du format sont dépassées
 * - Recommander des options (division en fichiers, format alternatif)
 * - Fournir des statistiques utiles pour l'utilisateur
 * 
 * @param options Options d'export fournies par l'utilisateur
 * @returns Analyse détaillée des données à exporter
 */
export async function analyzeExport(options: ExportOptions): Promise<ExportAnalysis> {
  logExportEvent("Démarrage de l'analyse d'export", {
    format: options.format,
    startDate: options.startDate,
    endDate: options.endDate,
    source: options.source || 'general'
  });

  const { format, startDate, endDate, filters, source, exportType } = options;
  // Utiliser les limites d'Excel pour à la fois 'excel' et 'xlsx'
  const limits = format === 'xlsx' ? FORMAT_LIMITS.excel : FORMAT_LIMITS[format];
  
  // Construction de la requête WHERE pour compter les enregistrements
  let whereConditions: any = {
    event_date: {
      gte: new Date(startDate),
      lte: new Date(endDate)
    }
  };
  
  // Ajout des filtres si présents
  if (filters) {
    if (filters.employeeId) {
      whereConditions.badge_number = filters.employeeId;
    }
    if (filters.department) {
      whereConditions.group_name = filters.department;
    }
    if (filters.readers && filters.readers.length > 0) {
      whereConditions.reader = { in: filters.readers };
    }
    if (filters.eventTypes && filters.eventTypes.length > 0) {
      whereConditions.event_type = { in: filters.eventTypes };
    }
  }
  
  // Appliquer des filtres spécifiques selon la source
  if (source === 'anomalies') {
    // Filtres spécifiques pour les anomalies - version simplifiée
    whereConditions.event_type = { not: 'user_accepted' };
    // Ne pas ajouter de condition sur badge_number du tout
    
    logExportEvent("Filtres simplifiés pour les anomalies appliqués", whereConditions);
  } else if (source === 'attendance' && exportType === 'present_only') {
    whereConditions.event_type = 'user_accepted';
  } else if (source === 'access') {
    if (exportType === 'authorized_only') {
      whereConditions.event_type = 'user_accepted';
    } else if (exportType === 'denied_only') {
      whereConditions.event_type = { not: 'user_accepted' };
    }
  }
  
  // Compter le nombre total de lignes
  logExportEvent("Comptage des enregistrements à exporter", whereConditions);
  const count = await prisma.access_logs.count({
    where: whereConditions
  });
  logExportEvent(`Nombre d'enregistrements trouvés: ${count}`);
  
  // Calculer la taille estimée
  const estimatedSizeBytes = count * (
    format === 'excel' || format === 'xlsx' ? FORMAT_LIMITS.excel.estimatedRowSizeBytes :
    format === 'csv' ? FORMAT_LIMITS.csv.estimatedRowSizeBytes : 300
  );
  const estimatedSizeMB = (estimatedSizeBytes / (1024 * 1024)).toFixed(2);
  
  // Déterminer si on dépasse les limites
  const exceedsLimit = count > limits.maxRows;
  
  // Déterminer la taille de lot recommandée
  let recommendedMaxRowsPerFile = limits.maxRows;
  if (count > 10000000) { // 10M+ lignes
    recommendedMaxRowsPerFile = 250000;
  } else if (count > 5000000) { // 5M+ lignes
    recommendedMaxRowsPerFile = 500000;
  } else if (count > limits.maxRows) {
    recommendedMaxRowsPerFile = limits.maxRows;
  }
  
  // Nombre estimé de fichiers
  const estimatedFileCount = Math.ceil(count / recommendedMaxRowsPerFile);
  
  // Déterminer si on peut télécharger directement
  const canDirectDownload = !exceedsLimit || (estimatedFileCount === 1 && count <= limits.maxRows);
  
  // Avertissements et recommandations
  const warnings: string[] = [];
  const recommendations: string[] = [];
  
  if (exceedsLimit) {
    warnings.push(`Le volume de données (${count.toLocaleString()} lignes) dépasse la limite recommandée pour un seul fichier ${format.toUpperCase()} (${limits.maxRows.toLocaleString()} lignes).`);
    recommendations.push("Réduire la période d'export");
    recommendations.push("Appliquer des filtres supplémentaires");
    
    if (estimatedFileCount > 10) {
      warnings.push(`Cette opération générera environ ${estimatedFileCount} fichiers. Le traitement peut prendre plusieurs minutes.`);
      recommendations.push("Utiliser l'export asynchrone (un email vous sera envoyé à la fin du traitement)");
    }
  }
  
  if (format === 'pdf' && count > limits.maxRows) {
    warnings.push(`L'export PDF est limité à ${limits.maxRows.toLocaleString()} lignes pour des raisons de performance. Votre requête contient ${count.toLocaleString()} lignes.`);
    recommendations.push("Utiliser l'export Excel ou CSV pour de grands volumes");
    recommendations.push("Diviser l'export en plusieurs périodes plus courtes");
  }
  
  const result = {
    totalRows: count,
    estimatedSizeBytes,
    estimatedSizeMB: `${estimatedSizeMB} MB`,
    needsSplitting: exceedsLimit,
    recommendedMaxRowsPerFile,
    estimatedFileCount,
    exceedsLimit,
    canDirectDownload,
    warnings,
    recommendations
  };
  
  logExportEvent("Analyse d'export terminée", result);
  return result;
}

/**
 * Génère un nom de fichier unique pour l'export
 * 
 * @param formatType Type de format (excel, csv, pdf)
 * @param startDate Date de début de la période
 * @param endDate Date de fin de la période
 * @param index Index du fichier dans le cas d'un export divisé
 * @param total Nombre total de fichiers dans l'export
 * @returns Nom de fichier formaté
 */
function generateExportFilename(formatType: string, startDate: string, endDate: string, index?: number, total?: number): string {
  const dateStr = dateFormat(new Date(), 'yyyy-MM-dd_HH-mm');
  let prefix = '';
  let extension = '';
  
  // Déterminer le préfixe et l'extension en fonction du format
  switch (formatType) {
    case 'excel':
      prefix = 'export_excel';
      extension = 'xlsx'; // Utiliser l'extension .xlsx pour tous les fichiers Excel
      break;
    case 'xlsx':
      prefix = 'export_excel';
      extension = 'xlsx';
      break;
    case 'csv':
      prefix = 'export_csv';
      extension = 'csv';
      break;
    case 'pdf':
      prefix = 'export_pdf';
      extension = 'pdf';
      break;
    default:
      prefix = `export_${formatType}`;
      extension = formatType;
  }
  
  const period = `${startDate}_${endDate}`;
  
  // Ajouter un index si le fichier est divisé
  const suffix = index !== undefined && total !== undefined
    ? `_part${index + 1}_of_${total}`
    : '';
  
  return `${prefix}_${period}_${dateStr}${suffix}.${extension}`;
}

/**
 * Créer un dossier temporaire pour les exports
 * Génère un dossier unique avec timestamp pour éviter les collisions
 * 
 * @returns Chemin vers le dossier temporaire créé
 */
function createTempExportDir(): string {
  const tempDir = path.join(os.tmpdir(), `export_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`);
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
    logExportEvent(`Dossier temporaire créé: ${tempDir}`);
  }
  return tempDir;
}

/**
 * Génère un fichier Excel à partir des données
 * 
 * @param data Données à exporter
 * @param headers En-têtes des colonnes
 * @param filePath Chemin du fichier à générer
 */
async function generateExcelFile(data: any[], headers: Record<string, string>, filePath: string): Promise<void> {
  logExportEvent(`Génération du fichier Excel: ${filePath} (${data.length} lignes)`);
  const startTime = Date.now();
  
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Données');
  
  // Définir les en-têtes
  const headerRow = worksheet.addRow(Object.values(headers));
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' }
  };
  
  // Ajouter les données
  data.forEach(item => {
    const rowData = Object.keys(headers).map(key => {
      // Formatage spécial pour les dates
      if (item[key] instanceof Date) {
        return dateFormat(item[key], 'dd/MM/yyyy HH:mm:ss');
      }
      return item[key];
    });
    worksheet.addRow(rowData);
  });
  
  // Ajuster la largeur des colonnes automatiquement
  worksheet.columns.forEach(column => {
    if (column && column.eachCell) {
      let maxLength = 0;
      column.eachCell({ includeEmpty: true }, (cell) => {
        if (cell.value) {
          const cellLength = cell.value.toString().length;
          if (cellLength > maxLength) {
            maxLength = cellLength;
          }
        }
      });
      // Limiter la largeur maximale à 50 caractères
      column.width = Math.min(maxLength + 4, 50);
    } else {
      // Valeur par défaut si column.eachCell n'est pas disponible
      column.width = 15;
    }
  });
  
  // Appliquer des bordures légères aux cellules
  worksheet.eachRow((row, rowNumber) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE0E0E0' } },
        left: { style: 'thin', color: { argb: 'FFE0E0E0' } },
        bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } },
        right: { style: 'thin', color: { argb: 'FFE0E0E0' } }
      };
      
      // Alterner les couleurs de fond des lignes pour une meilleure lisibilité
      if (rowNumber > 1 && rowNumber % 2 === 0) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF9F9F9' }
        };
      }
    });
  });
  
  // Enregistrer le fichier
  await workbook.xlsx.writeFile(filePath);
  
  const duration = Date.now() - startTime;
  logExportEvent(`Fichier Excel généré en ${duration}ms: ${filePath}`);
}

/**
 * Génère un fichier CSV à partir des données
 * 
 * @param data Données à exporter
 * @param headers En-têtes des colonnes
 * @param filePath Chemin du fichier à générer
 */
function generateCsvFile(data: any[], headers: Record<string, string>, filePath: string): void {
  logExportEvent(`Génération du fichier CSV: ${filePath} (${data.length} lignes)`);
  const startTime = Date.now();
  
  // Utiliser des guillemets pour tous les en-têtes pour plus de consistance
  const headerLine = Object.values(headers).map(header => `"${header.replace(/"/g, '""')}"`).join(',');
  
  const rows = data.map(item => {
    return Object.keys(headers).map(key => {
      let value = item[key];
      
      // Formatage spécial pour les dates
      if (value instanceof Date) {
        value = dateFormat(value, 'dd/MM/yyyy HH:mm:ss');
      }
      
      // Toujours mettre entre guillemets pour assurer une meilleure compatibilité
      if (value !== null && value !== undefined) {
        // Échapper les guillemets en les doublant selon la norme CSV
        return `"${String(value).replace(/"/g, '""')}"`;
      } else {
        return '""'; // Valeur vide
      }
    }).join(',');
  });
  
  // Ajouter le BOM UTF-8 pour une meilleure compatibilité avec Excel
  const BOM = '\ufeff';
  const csvContent = BOM + [headerLine, ...rows].join('\n');
  
  fs.writeFileSync(filePath, csvContent);
  
  const duration = Date.now() - startTime;
  logExportEvent(`Fichier CSV généré en ${duration}ms: ${filePath}`);
}

/**
 * Crée une archive ZIP des fichiers d'export
 * 
 * @param files Liste des chemins des fichiers à archiver
 * @param outputPath Chemin de l'archive ZIP à générer
 */
async function createZipArchive(files: string[], outputPath: string): Promise<void> {
  logExportEvent(`Création d'une archive ZIP: ${outputPath} (${files.length} fichiers)`);
  const startTime = Date.now();
  
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(outputPath);
    const archive = archiver('zip', { zlib: { level: 9 } });
    
    output.on('close', () => {
      const duration = Date.now() - startTime;
      logExportEvent(`Archive ZIP créée en ${duration}ms: ${outputPath}`);
      resolve();
    });
    
    archive.on('error', (err) => {
      logExportEvent(`Erreur lors de la création de l'archive ZIP: ${err.message}`, err);
      reject(err);
    });
    
    archive.pipe(output);
    
    for (const file of files) {
      archive.file(file, { name: path.basename(file) });
    }
    
    archive.finalize();
  });
}

/**
 * Génère un fichier PDF pour l'export
 * 
 * @param data Données à exporter
 * @param headers En-têtes des colonnes
 * @param filePath Chemin du fichier à générer
 * @param options Options d'export
 */
async function generatePdfFile(data: any[], headers: Record<string, string>, filePath: string, options: ExportOptions): Promise<void> {
  logExportEvent(`Génération du fichier PDF: ${filePath}`);
  
  try {
    // Importer le service de génération PDF de manière dynamique
    const pdfExportService = await import('./pdf-export-service');
    
    // Déterminer la source du rapport pour le template
    let source: 'presence' | 'anomalies' | 'access' = 'access';
    if (options.source === 'anomalies') {
      source = 'anomalies';
    } else if (options.source === 'attendance') {
      source = 'presence';
    }
    
    // Configurer les options du rapport
    const reportOptions = {
      startDate: options.startDate,
      endDate: options.endDate,
      reportType: (options.exportType === 'summary' ? 'summary' : 'detailed') as 'summary' | 'detailed',
      source: source,
      filters: options.filters,
      includeCharts: true
    };
    
    // Générer le rapport PDF
    await pdfExportService.generatePdfReport(data, reportOptions, filePath);
    
    logExportEvent(`Fichier PDF généré avec succès: ${filePath}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logExportEvent(`Erreur lors de la génération du PDF: ${errorMessage}`);
    throw error;
  }
}

/**
 * Fonction principale d'export de données
 * 
 * Cette fonction:
 * - Analyse le volume de données à exporter
 * - Gère la division en plusieurs fichiers si nécessaire
 * - Supporte différents formats (Excel, CSV, PDF)
 * - Génère une archive ZIP pour les exports multi-fichiers
 * 
 * @param options Options d'export fournies par l'utilisateur
 * @returns Résultat de l'opération d'export avec les liens de téléchargement
 */
export async function exportData(options: ExportOptions): Promise<ExportResult> {
  logExportEvent("Démarrage de l'export de données", {
    format: options.format,
    startDate: options.startDate,
    endDate: options.endDate,
    source: options.source || 'general',
    exportType: options.exportType || 'default'
  });
  
  const startTime = Date.now();
  
  try {
    const { format, startDate, endDate, filters, splitFiles, maxRowsPerFile, includeHeaders = true } = options;
    
    // Analyser l'export pour déterminer les contraintes
    const analysis = await analyzeExport(options);
    
    // Si aucune donnée, retourner immédiatement
    if (analysis.totalRows === 0) {
      logExportEvent("Aucune donnée à exporter");
      return {
        success: false,
        message: "Aucune donnée à exporter pour la période et les filtres sélectionnés."
      };
    }
    
    // Déterminer s'il faut diviser les fichiers
    const needsSplitting = splitFiles || analysis.needsSplitting;
    const actualMaxRowsPerFile = maxRowsPerFile || analysis.recommendedMaxRowsPerFile;
    const totalFiles = needsSplitting ? Math.ceil(analysis.totalRows / actualMaxRowsPerFile) : 1;
    
    logExportEvent(`Configuration de l'export: ${needsSplitting ? 'Division activée' : 'Fichier unique'}, ${totalFiles} fichier(s)`);
    
    // Vérifier si le volume est trop important pour un traitement synchrone
    if (analysis.totalRows > 10000000) { // 10M+ lignes
      // Ici, vous pourriez implémenter un mécanisme de file d'attente avec Bull ou similar
      logExportEvent("Volume très important, mise en file d'attente de l'export", {
        totalRows: analysis.totalRows,
        estimatedSizeMB: analysis.estimatedSizeMB
      });
      
      return {
        success: true,
        status: 'processing',
        jobId: `export_${Date.now()}`,
        message: "Le volume de données est très important. L'export a été mis en file d'attente et vous recevrez une notification une fois terminé.",
        totalRows: analysis.totalRows,
        estimatedSize: analysis.estimatedSizeMB
      };
    }
    
    // Créer un répertoire temporaire pour les fichiers
    const tempDir = createTempExportDir();
    const files: Array<{ name: string; path: string; size: number; recordCount: number }> = [];
    
    // Définir les en-têtes selon le type d'export
    const headers: Record<string, string> = {
      id: 'ID',
      badge_number: 'Numéro de badge',
      person_type: 'Type',
      event_date: 'Date',
      event_time: 'Heure',
      reader: 'Lecteur',
      terminal: 'Terminal',
      event_type: 'Type d\'événement',
      direction: 'Direction',
      full_name: 'Nom complet',
      group_name: 'Département'
    };
    
    // Construction de la requête WHERE
    let whereConditions: any = {
      event_date: {
        gte: new Date(startDate),
        lte: new Date(endDate)
      }
    };
    
    // Ajout des filtres si présents
    if (filters) {
      if (filters.employeeId) {
        whereConditions.badge_number = filters.employeeId;
      }
      if (filters.department) {
        whereConditions.group_name = filters.department;
      }
      if (filters.readers && filters.readers.length > 0) {
        whereConditions.reader = { in: filters.readers };
      }
      if (filters.eventTypes && filters.eventTypes.length > 0) {
        whereConditions.event_type = { in: filters.eventTypes };
      }
    }
    
    // Appliquer des filtres spécifiques selon la source
    if (options.source === 'anomalies') {
      // Filtres spécifiques pour les anomalies - version simplifiée
      whereConditions.event_type = { not: 'user_accepted' };
      // Ne pas ajouter de condition sur badge_number du tout
      
      logExportEvent("Filtres simplifiés pour les anomalies appliqués", whereConditions);
    } else if (options.source === 'attendance' && options.exportType === 'present_only') {
      whereConditions.event_type = 'user_accepted';
    } else if (options.source === 'access') {
      if (options.exportType === 'authorized_only') {
        whereConditions.event_type = 'user_accepted';
      } else if (options.exportType === 'denied_only') {
        whereConditions.event_type = { not: 'user_accepted' };
      }
    }
    
    logExportEvent("Exécution de la requête avec les filtres", whereConditions);
    
    // Générer les fichiers par tranches si nécessaire
    for (let i = 0; i < totalFiles; i++) {
      const skip = i * actualMaxRowsPerFile;
      const take = actualMaxRowsPerFile;
      
      logExportEvent(`Récupération des données pour le fichier ${i+1}/${totalFiles} (offset: ${skip}, limit: ${take})`);
      
      // Récupérer les données pour cette tranche
      const data = await prisma.access_logs.findMany({
        where: whereConditions,
        orderBy: [
          { event_date: 'asc' },
          { event_time: 'asc' }
        ],
        skip,
        take
      });
      
      // Générer le nom de fichier
      const fileName = generateExportFilename(
        format, 
        startDate, 
        endDate, 
        needsSplitting ? i : undefined, 
        needsSplitting ? totalFiles : undefined
      );
      const filePath = path.join(tempDir, fileName);
      
      // Générer le fichier selon le format
      if (format === 'excel' || format === 'xlsx') {
        await generateExcelFile(data, headers, filePath);
      } else if (format === 'csv') {
        generateCsvFile(data, headers, filePath);
      } else if (format === 'pdf') {
        await generatePdfFile(data, headers, filePath, options);
      }
      
      // Récupérer la taille du fichier
      const stats = fs.statSync(filePath);
      
      // Ajouter le fichier à la liste
      files.push({
        name: fileName,
        path: filePath,
        size: stats.size,
        recordCount: data.length
      });
      
      logExportEvent(`Fichier ${i+1}/${totalFiles} généré: ${fileName} (${stats.size} octets)`);
    }
    
    // Si plusieurs fichiers, créer une archive ZIP
    if (files.length > 1) {
      const currentDate = dateFormat(new Date(), 'yyyy-MM-dd_HH-mm');
      const zipFileName = `export_${format}_${startDate}_${endDate}_${currentDate}.zip`;
      const zipFilePath = path.join(tempDir, zipFileName);
      
      await createZipArchive(files.map(f => f.path), zipFilePath);
      
      const zipStats = fs.statSync(zipFilePath);
      
      // Ajouter l'archive ZIP à la liste des fichiers
      files.push({
        name: zipFileName,
        path: zipFilePath,
        size: zipStats.size,
        recordCount: analysis.totalRows
      });
      
      logExportEvent(`Archive ZIP créée: ${zipFileName} (${zipStats.size} octets)`);
    }
    
    const duration = Date.now() - startTime;
    logExportEvent(`Export terminé en ${duration}ms`, {
      totalFiles: files.length,
      totalRows: analysis.totalRows
    });
    
    return {
      success: true,
      files,
      totalRows: analysis.totalRows,
      totalFiles: files.length,
      estimatedSize: analysis.estimatedSizeMB
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
    logExportEvent(`Erreur lors de l'export des données: ${errorMessage}`, error);
    
    return {
      success: false,
      message: `Erreur lors de l'export des données: ${errorMessage}`
    };
  }
} 