import ExcelJS from 'exceljs';
import { Readable } from 'stream';

/**
 * Classe utilitaire moderne pour manipuler les fichiers Excel
 * Encapsule la bibliothèque exceljs pour éviter les dépendances dépréciées
 */
export class ExcelUtility {
  private workbook: ExcelJS.Workbook;

  constructor() {
    this.workbook = new ExcelJS.Workbook();
    this.workbook.creator = 'Senator InvesTech';
    this.workbook.lastModifiedBy = 'Senator InvesTech';
    this.workbook.created = new Date();
    this.workbook.modified = new Date();
  }

  /**
   * Ajoute une feuille de calcul au workbook
   * @param name Nom de la feuille
   * @returns La feuille créée
   */
  addWorksheet(name: string): ExcelJS.Worksheet {
    return this.workbook.addWorksheet(name);
  }

  /**
   * Configure la mise en page d'une feuille
   * @param worksheet La feuille à configurer
   */
  setupPageLayout(worksheet: ExcelJS.Worksheet): void {
    worksheet.pageSetup.paperSize = 9; // A4
    worksheet.pageSetup.orientation = 'portrait';
    worksheet.pageSetup.margins = {
      left: 0.7, right: 0.7,
      top: 0.75, bottom: 0.75,
      header: 0.3, footer: 0.3
    };
  }

  /**
   * Ajoute un titre à une feuille
   * @param worksheet La feuille
   * @param cell La cellule (ex: 'A1:G1')
   * @param title Le texte du titre
   */
  addTitle(worksheet: ExcelJS.Worksheet, cell: string, title: string): void {
    worksheet.mergeCells(cell);
    const titleCell = worksheet.getCell(cell.split(':')[0]);
    titleCell.value = title;
    titleCell.font = {
      size: 16,
      bold: true,
      color: { argb: '007B65' }
    };
    titleCell.alignment = { horizontal: 'center' };
  }

  /**
   * Ajoute une ligne d'en-tête à une feuille
   * @param worksheet La feuille
   * @param headers Les en-têtes
   * @returns La ligne créée
   */
  addHeaderRow(worksheet: ExcelJS.Worksheet, headers: string[]): ExcelJS.Row {
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
    return headerRow;
  }

  /**
   * Génère le fichier Excel en buffer
   * @returns Un buffer contenant le fichier Excel
   */
  async toBuffer(): Promise<Buffer> {
    return await this.workbook.xlsx.writeBuffer() as unknown as Buffer;
  }

  /**
   * Génère le fichier Excel en stream
   * @returns Un stream lisible contenant le fichier Excel
   */
  async toStream(): Promise<Readable> {
    const buffer = await this.toBuffer();
    const stream = new Readable();
    stream.push(buffer);
    stream.push(null);
    return stream;
  }
} 