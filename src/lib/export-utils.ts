/**
 * Utilitaires d'exportation standardisés pour l'application Senator InvesTech
 * 
 * Ce module fournit des fonctions communes pour formater et générer des exports
 * dans différents formats (CSV, Excel, PDF) avec un style cohérent.
 */

import type { PDFDocument } from 'pdf-lib';

/**
 * Formate une valeur pour l'inclusion dans un fichier CSV
 * - Échappe les guillemets en les doublant
 * - Entoure de guillemets si nécessaire
 */
export function formatCsvField(value: string | number | null | undefined): string {
  // Convertir en chaîne de caractères et gérer les valeurs nulles/undefined
  const stringValue = value === null || value === undefined 
    ? 'N/A' 
    : String(value);
  
  // Si la valeur contient une virgule, un guillemet ou un saut de ligne,
  // elle doit être échappée et entourée de guillemets
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    // Échapper les guillemets en les doublant et entourer de guillemets
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  
  return stringValue;
}

/**
 * Génère le contenu CSV avec en-tête, métadonnées et formatage standard
 */
export function generateStandardCsvContent(
  headers: string[],
  data: any[],
  metaData?: { [key: string]: string },
  config?: { 
    includeMetadata?: boolean, 
    dateFormat?: Intl.DateTimeFormatOptions,
    locale?: string
  }
): string {
  const options = {
    includeMetadata: true,
    dateFormat: { day: '2-digit' as const, month: '2-digit' as const, year: 'numeric' as const },
    locale: 'fr-FR',
    ...config
  };
  
  // Lignes de métadonnées (commentaires)
  const metadataLines: string[] = [];
  if (options.includeMetadata) {
    metadataLines.push(`# Export Senator InvesTech - ${new Date().toLocaleDateString(options.locale)}`);
    
    if (metaData) {
      Object.entries(metaData).forEach(([key, value]) => {
        metadataLines.push(`# ${key}: ${value}`);
      });
    }
    
    metadataLines.push('#');
  }
  
  // En-tête CSV
  const headerRow = headers.map(h => formatCsvField(h)).join(',');
  
  // Données
  const dataRows = data.map(row => {
    // Si row est un objet, extraire les valeurs correspondant aux en-têtes
    if (typeof row === 'object' && row !== null && !Array.isArray(row)) {
      return headers.map(header => {
        // Conversion automatique des dates si nécessaire
        if (row[header] instanceof Date) {
          return formatCsvField(row[header].toLocaleDateString(options.locale, options.dateFormat));
        }
        return formatCsvField(row[header]);
      }).join(',');
    }
    
    // Si row est déjà un tableau
    if (Array.isArray(row)) {
      return row.map(value => formatCsvField(value)).join(',');
    }
    
    // Si row est une autre valeur (peu probable)
    return formatCsvField(row);
  });
  
  // Assembler tout le contenu
  const csvContent = [
    ...metadataLines,
    headerRow,
    ...dataRows
  ].join('\n');
  
  return csvContent;
}

/**
 * Type pour les données de graphique à inclure dans les rapports
 */
export interface ChartDataForExport {
  title: string;
  type: 'bar' | 'pie' | 'line';
  data: Array<{
    name: string;
    value: number;
    [key: string]: any;
  }>;
  options?: {
    categoryField?: string;
    valueField?: string;
    summary?: string;
  };
}

/**
 * Génère une représentation textuelle d'un graphique pour l'inclusion dans un CSV
 */
export function chartToTextTable(chartData: ChartDataForExport): string {
  const { title, data, type, options } = chartData;
  
  // Créer un tableau texte représentant le graphique
  let textTable = `# ${title}\n#\n`;
  
  // Ajouter une description si disponible
  if (options?.summary) {
    textTable += `# ${options.summary}\n#\n`;
  }
  
  // En-têtes du tableau
  textTable += `# Catégorie,Valeur\n`;
  
  // Ajouter les données
  data.forEach(item => {
    const name = options?.categoryField ? item[options.categoryField] : item.name;
    const value = options?.valueField ? item[options.valueField] : item.value;
    textTable += `# ${name},${value}\n`;
  });
  
  // Ajouter une ligne vide
  textTable += '#\n';
  
  return textTable;
}

/**
 * Ajoute des représentations textuelles des graphiques au contenu CSV
 */
export function addChartsToCSV(csvContent: string, charts: ChartDataForExport[]): string {
  if (!charts || charts.length === 0) {
    return csvContent;
  }
  
  // Convertir chaque graphique en texte
  const chartsText = charts.map(chart => chartToTextTable(chart)).join('');
  
  // Ajouter les graphiques au début du CSV (après les métadonnées)
  const lines = csvContent.split('\n');
  
  // Trouver l'index de la ligne d'en-tête (première ligne qui ne commence pas par #)
  const headerIndex = lines.findIndex(line => !line.startsWith('#'));
  
  if (headerIndex > 0) {
    // Insérer les graphiques juste avant l'en-tête
    return [
      ...lines.slice(0, headerIndex),
      chartsText,
      ...lines.slice(headerIndex)
    ].join('\n');
  } else {
    // Aucun en-tête trouvé, ajouter à la fin
    return `${csvContent}\n${chartsText}`;
  }
}

/**
 * Renvoie un objet de configuration standard pour les couleurs et le style
 * des rapports et exports
 */
export const EXPORT_STYLES = {
  colors: {
    primary: { r: 0.05, g: 0.48, b: 0.40 }, // #007B65
    secondary: { r: 0.23, g: 0.51, b: 0.89 }, // #3B82F6
    accent: { r: 0.94, g: 0.48, b: 0.19 }, // #F07B31
    lightGray: { r: 0.95, g: 0.95, b: 0.95 },
    darkGray: { r: 0.4, g: 0.4, b: 0.4 },
    success: { r: 0.15, g: 0.68, b: 0.38 }, // #28AE60
    warning: { r: 0.95, g: 0.77, b: 0.21 }, // #F2C335
    error: { r: 0.91, g: 0.30, b: 0.24 } // #E84E3D
  },
  margins: {
    pdf: {
      pageWidth: 595.28,
      pageHeight: 841.89,
      left: 50,
      right: 50, 
      top: 50,
      bottom: 50
    }
  },
  fonts: {
    size: {
      title: 18,
      subtitle: 14,
      body: 10,
      small: 8
    }
  }
};

export default {
  formatCsvField,
  generateStandardCsvContent,
  chartToTextTable,
  addChartsToCSV,
  EXPORT_STYLES
}; 