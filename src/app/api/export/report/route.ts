import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import * as ExcelJS from 'exceljs';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import path from 'path';
import fs from 'fs';
import JSZip from 'jszip';
import prisma from '@/lib/prisma';
import { calculatePresenceStats, formatHours, formatPercentage } from '@/lib/utils/presence-calculations';

// Constantes pour le design
const COLORS = {
  primary: { r: 0.15, g: 0.55, b: 0.47 }, // Couleur principale (vert émeraude)
  secondary: { r: 0.5, g: 0.7, b: 0.65 }, // Couleur secondaire
  lightGray: { r: 0.9, g: 0.9, b: 0.9 }, // Gris clair
  darkGray: { r: 0.3, g: 0.3, b: 0.3 }, // Gris foncé
  text: { r: 0.2, g: 0.2, b: 0.2 }, // Couleur du texte
};

// Constantes pour les marges
const MARGINS = {
  pdf: {
    left: 50,     // Augmenté pour plus d'espace à gauche
    right: 50,    // Augmenté pour plus d'espace à droite
    top: 60,      // Marge du haut
    bottom: 60,   // Marge du bas
    pageWidth: 595.28,  // Largeur A4 en points
    pageHeight: 841.89  // Hauteur A4 en points
  },
  excel: {
    cellPadding: 5,
    rowHeight: 25
  },
  html: {
    page: '30px',    // Marge de la page entière
    section: '20px', // Marge entre les sections
    table: '15px'    // Marge interne des cellules de tableau
  }
};

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // Vérifier l'authentification (sauf en mode développement avec bypass)
    const headers = req.headers;
    const bypassAuth = headers.get('x-test-bypass-auth');
    
    if (!session && (!bypassAuth || process.env.NODE_ENV !== 'development')) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }
    
    // Analyser le corps de la requête
    const body = await req.json();
    const { format, data, dateRange, filters, options } = body;
    
    // Vérifier les paramètres requis
    if (!format || !data || !dateRange || !options) {
      return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 });
    }
    
    // Récupérer les paramètres d'assiduité pour les pauses déjeuner et horaires de travail
    const attendanceParams = await prisma.attendance_parameters.findFirst();
    
    // Calculer les statistiques avec les options appropriées
    const stats = calculatePresenceStats(
      data,
      attendanceParams,
      options.netStatistics !== false
    );
    
    // Construire le titre du rapport
    const title = `Rapport de temps de présence (${
      dateRange.from && dateRange.to
        ? `${new Date(dateRange.from).toLocaleDateString('fr-FR')} - ${new Date(dateRange.to).toLocaleDateString('fr-FR')}`
        : 'Toutes les périodes'
    })`;
    
    // Ajouter les images des graphiques si elles sont fournies
    const hasChartImages = body.chartImages && Array.isArray(body.chartImages) && body.chartImages.length > 0;
    
    // Gérer le format d'export
    let blob;
    let contentType;
    let fileName;
    
    switch (format) {
      case 'pdf':
        const pdfResult = await generatePdfReport(title, { ...data, stats }, options, attendanceParams, hasChartImages ? body.chartImages : null);
        blob = new Blob([pdfResult.buffer], { type: 'application/pdf' });
        contentType = 'application/pdf';
        fileName = `rapport_presence_${formatDateForFileName(new Date())}.pdf`;
        break;

      case 'xlsx':
        const excelResult = await generateExcelReport(title, { ...data, stats }, options, attendanceParams);
        blob = new Blob([excelResult.buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        fileName = `rapport_presence_${formatDateForFileName(new Date())}.xlsx`;
        break;

      case 'csv':
        const csvData = generateCsvReport({ ...data, stats }, options, attendanceParams);
        blob = new Blob([csvData], { type: 'text/csv;charset=utf-8' });
        contentType = 'text/csv';
        fileName = `rapport_presence_${formatDateForFileName(new Date())}.csv`;
        break;

      case 'docx':
        const docxResult = await generateDocxReport(title, { ...data, stats }, options, attendanceParams);
        blob = new Blob([docxResult.buffer], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
        contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        fileName = `rapport_presence_${formatDateForFileName(new Date())}.docx`;
        break;

      default:
        return NextResponse.json({ error: "Format non pris en charge" }, { status: 400 });
    }

    // Convertir le blob en buffer pour la réponse
    const buffer = await blob.arrayBuffer();
    
    // Renvoyer le fichier avec les en-têtes appropriés
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${fileName}"`
      }
    });
  } catch (error) {
    console.error('Erreur lors de l\'exportation:', error);
    return NextResponse.json(
      { error: 'Erreur lors de l\'exportation', details: error instanceof Error ? error.message : 'Erreur inconnue' },
      { status: 500 }
    );
  }
}

// Fonction pour formater une date pour un nom de fichier
function formatDateForFileName(date: Date): string {
  return date.toISOString().split('T')[0].replace(/-/g, '');
}

// Fonction pour générer un rapport PDF
async function generatePdfReport(title: string, data: any, options: any, attendanceParams: any, chartImages?: string[]): Promise<{ buffer: Uint8Array }> {
  const pdfDoc = await PDFDocument.create();
  
  // Si nous avons des images de graphiques, les traiter d'abord
  let chartsPagesAdded = false;
  if (chartImages && chartImages.length > 0 && options.includeCharts) {
    for (const chartImageData of chartImages) {
      try {
        // Vérifier que les données d'image sont valides
        if (!chartImageData || typeof chartImageData !== 'string') {
          console.warn('Format d\'image invalide - ignoré');
          continue;
        }

        // Extraire les données de l'image (supprimer l'en-tête 'data:image/png;base64,')
        let base64Data;
        if (chartImageData.includes('base64,')) {
          base64Data = chartImageData.split('base64,')[1];
        } else {
          base64Data = chartImageData; // Déjà en base64 sans en-tête
        }
        
        if (!base64Data) {
          console.warn('Données d\'image invalides - ignoré');
          continue;
        }
        
        // Décoder et intégrer l'image
        try {
          const imageBytes = Buffer.from(base64Data, 'base64');
          
          // Vérifier si les données sont bien une image PNG
          if (imageBytes.length < 8 || 
              imageBytes[0] !== 0x89 || 
              imageBytes[1] !== 0x50 || // P
              imageBytes[2] !== 0x4E || // N
              imageBytes[3] !== 0x47) { // G
            console.warn('Les données ne semblent pas être un PNG valide - ignoré');
            continue;
          }
          
          const pngImage = await pdfDoc.embedPng(imageBytes);
          
          // Ajouter une page pour chaque graphique
          const chartPage = pdfDoc.addPage([MARGINS.pdf.pageWidth, MARGINS.pdf.pageHeight]);
          
          // Calculer les dimensions pour conserver le ratio
          const imgWidth = pngImage.width;
          const imgHeight = pngImage.height;
          
          if (imgWidth <= 0 || imgHeight <= 0) {
            console.warn('Dimensions d\'image invalides - ignoré');
            continue;
          }
          
          const ratio = imgWidth / imgHeight;
          
          const maxImgWidth = MARGINS.pdf.pageWidth - (MARGINS.pdf.left + MARGINS.pdf.right);
          const maxImgHeight = MARGINS.pdf.pageHeight / 2 - (MARGINS.pdf.top + MARGINS.pdf.bottom);
          
          let finalWidth = maxImgWidth;
          let finalHeight = finalWidth / ratio;
          
          if (finalHeight > maxImgHeight) {
            finalHeight = maxImgHeight;
            finalWidth = finalHeight * ratio;
          }
          
          // Position au centre de la page
          const xPosition = (MARGINS.pdf.pageWidth - finalWidth) / 2;
          const yPosition = MARGINS.pdf.pageHeight - MARGINS.pdf.top - finalHeight;
          
          // Dessiner l'image
          chartPage.drawImage(pngImage, {
            x: xPosition,
            y: yPosition,
            width: finalWidth,
            height: finalHeight
          });
          
          // Ajouter titre au-dessus du graphique
          const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
          chartPage.drawText("Graphique de répartition des temps de présence", {
            x: MARGINS.pdf.left,
            y: MARGINS.pdf.pageHeight - MARGINS.pdf.top / 2,
            size: 14,
            font: font,
            color: rgb(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b),
          });
          
          chartsPagesAdded = true;
        } catch (imageError) {
          console.error('Erreur lors du traitement de l\'image:', imageError);
          // Continuer avec d'autres images
        }
      } catch (error) {
        console.error('Erreur lors du traitement de l\'image du graphique:', error);
        // Continuer avec les autres images malgré l'erreur
      }
    }
  }
  
  // Ajouter la page principale du rapport après les graphiques
  const page = pdfDoc.addPage([MARGINS.pdf.pageWidth, MARGINS.pdf.pageHeight]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const italicFont = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);
  
  // Calcul des dimensions et positions utiles
  const contentWidth = MARGINS.pdf.pageWidth - (MARGINS.pdf.left + MARGINS.pdf.right);
  const headerY = MARGINS.pdf.pageHeight - MARGINS.pdf.top;
  
  // En-tête avec bordure
  page.drawRectangle({
    x: MARGINS.pdf.left,
    y: headerY - 50,
    width: contentWidth,
    height: 50,
    color: rgb(0.95, 0.95, 0.95),
    borderColor: rgb(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b),
    borderWidth: 1,
  });
  
  // Logo (simulé par un rectangle et un texte)
  page.drawRectangle({
    x: MARGINS.pdf.left + 10,
    y: headerY - 40,
    width: 30,
    height: 30,
    color: rgb(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b),
  });
  
  page.drawText("SENATOR", {
    x: MARGINS.pdf.left + 50,
    y: headerY - 23,
    size: 14,
    font: boldFont,
    color: rgb(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b),
  });
  
  page.drawText("INVESTECH", {
    x: MARGINS.pdf.left + 50,
    y: headerY - 38,
    size: 10,
    font: italicFont,
    color: rgb(COLORS.darkGray.r, COLORS.darkGray.g, COLORS.darkGray.b),
  });
  
  // Si des pages de graphiques ont été ajoutées, mentionner cela dans l'en-tête
  if (chartsPagesAdded) {
    page.drawText("(Voir les graphiques en début de document)", {
      x: MARGINS.pdf.left + 200,
      y: headerY - 23,
      size: 10,
      font: italicFont,
      color: rgb(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b),
    });
  }
  
  // Titre du rapport (centré avec gestion des retours à la ligne si nécessaire)
  const titleMaxWidth = contentWidth - 200; // Largeur maximale pour le titre
  const titleFontSize = 14;
  const titleLines = wrapText(title, titleMaxWidth, boldFont, titleFontSize);
  
  // Calculer la position verticale centrée pour le titre (qui peut maintenant avoir plusieurs lignes)
  const titleHeight = titleLines.length * titleFontSize * 1.2; // 1.2 pour l'interligne
  const titleTopY = headerY - 25 + (titleHeight / 2); // Position du haut du texte
  
  // Dessiner chaque ligne du titre
  titleLines.forEach((line, index) => {
    const lineWidth = boldFont.widthOfTextAtSize(line, titleFontSize);
    const lineX = Math.max((MARGINS.pdf.pageWidth - lineWidth) / 2, MARGINS.pdf.left + 150);
    const lineY = titleTopY - (index * titleFontSize * 1.2);
    
    page.drawText(line, {
      x: lineX,
      y: lineY,
      size: titleFontSize,
      font: boldFont,
      color: rgb(COLORS.text.r, COLORS.text.g, COLORS.text.b),
    });
  });

  // Date d'édition
  const currentDate = new Date();
  const dateText = `Édité le ${currentDate.toLocaleDateString('fr-FR')} à ${currentDate.toLocaleTimeString('fr-FR')}`;
  page.drawText(dateText, {
    x: MARGINS.pdf.left + contentWidth - Math.min(230, font.widthOfTextAtSize(dateText, 8) + 10),
    y: headerY - 45,
    size: 8,
    font: italicFont,
    color: rgb(COLORS.darkGray.r, COLORS.darkGray.g, COLORS.darkGray.b),
  });

  // Informations de base - Section Résumé
  let currentY = headerY - 90; // Position après l'en-tête
  drawSection(page, "Résumé", MARGINS.pdf.left, currentY, contentWidth, font, boldFont);
  
  const spacing = 25; // Augmenté pour plus d'espace entre les éléments
  currentY -= 25;

  // Mise en page en deux colonnes pour les informations
  const col1X = MARGINS.pdf.left + 20;
  const col2X = MARGINS.pdf.left + (contentWidth / 2) + 20;
  
  // Colonne 1
  drawInfoItem(page, "Nombre total de jours analysés", `${data.daily.length}`, col1X, currentY, font, boldFont);
  currentY -= spacing;
  
  const maxEmployees = data.daily.reduce((max: number, day: any) => 
    Math.max(max, day.count || 0), 0);
  
  drawInfoItem(page, "Nombre maximum d'employés", `${maxEmployees}`, col1X, currentY, font, boldFont);
  currentY -= spacing;
  
  const totalHours = data.daily.reduce((sum: number, day: any) => 
    sum + ((day.duration || 0) / 60), 0);
  
  drawInfoItem(page, "Heures totales de présence", `${totalHours.toFixed(1)} h`, col1X, currentY, font, boldFont);
  
  // Colonne 2
  currentY = headerY - 115; // Réinitialiser pour la colonne 2
  
  if (data.daily.length > 0) {
    const avgHoursPerDay = totalHours / data.daily.length;
    drawInfoItem(page, "Moyenne d'heures par jour", `${avgHoursPerDay.toFixed(1)} h`, col2X, currentY, font, boldFont);
    currentY -= spacing;
  }
  
  if (data.daily.length > 0) {
    const totalEmployees = data.daily.reduce((sum: number, day: any) => sum + (day.count || 0), 0);
    const avgEmployeesPerDay = totalEmployees / data.daily.length;
    drawInfoItem(page, "Employés en moyenne par jour", `${avgEmployeesPerDay.toFixed(1)}`, col2X, currentY, font, boldFont);
    currentY -= spacing;
  }
  
  // Ajouter les heures de travail et de pause (nouveauté)
  if (attendanceParams) {
    currentY -= spacing;
    drawInfoItem(page, "Heures de travail", `${attendanceParams.start_hour} - ${attendanceParams.end_hour}`, col1X, currentY, font, boldFont);
    currentY -= spacing;
    
    if (attendanceParams.lunch_break && options.netStatistics !== false) {
      drawInfoItem(page, "Pause déjeuner", `${attendanceParams.lunch_break_start} - ${attendanceParams.lunch_break_end} (${attendanceParams.lunch_break_duration} min)`, col1X, currentY, font, boldFont);
      currentY -= spacing;
      
      // Indiquer si les pauses sont déduites
      drawInfoItem(page, "Statistiques", `Temps de pause déduit`, col2X, currentY, font, boldFont);
    } else {
      drawInfoItem(page, "Statistiques", `Temps brut (pauses incluses)`, col2X, currentY, font, boldFont);
    }
  }
  
  // Modifier la gestion des pages pour inclure toutes les lignes du tableau
  let currentPage = page;
  let currentPageNum = 1;
  
  // Début du tableau - Section Détails
  currentY = headerY - 190; // Position après la section résumé
  drawSection(currentPage, "Détails par jour", MARGINS.pdf.left, currentY, contentWidth, font, boldFont);
  currentY -= 30;
  
  // En-tête du tableau
  const headerTableY = currentY;
  currentPage.drawRectangle({
    x: MARGINS.pdf.left,
    y: headerTableY - 20,
    width: contentWidth,
    height: 20,
    color: rgb(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b),
  });
  
  // Colonnes du tableau - répartition plus équilibrée
  const colWidths = [
    contentWidth * 0.30, // Date
    contentWidth * 0.23, // Employés
    contentWidth * 0.23, // Heures totales
    contentWidth * 0.24  // Heures moyennes
  ];
  const colStarts = [
    MARGINS.pdf.left,
    MARGINS.pdf.left + colWidths[0],
    MARGINS.pdf.left + colWidths[0] + colWidths[1],
    MARGINS.pdf.left + colWidths[0] + colWidths[1] + colWidths[2]
  ];
  
  // En-têtes des colonnes (dessinées sur la première page uniquement)
  currentPage.drawText("Date", {
    x: colStarts[0] + 10,
    y: headerTableY - 14,
    size: 10,
    font: boldFont,
    color: rgb(1, 1, 1),
  });
  
  currentPage.drawText("Employés", {
    x: colStarts[1] + 10,
    y: headerTableY - 14,
    size: 10,
    font: boldFont,
    color: rgb(1, 1, 1),
  });
  
  currentPage.drawText("Heures totales", {
    x: colStarts[2] + 10,
    y: headerTableY - 14,
    size: 10,
    font: boldFont,
    color: rgb(1, 1, 1),
  });
  
  currentPage.drawText("Heures moyennes", {
    x: colStarts[3] + 10,
    y: headerTableY - 14,
    size: 10,
    font: boldFont,
    color: rgb(1, 1, 1),
  });
  
  // Données du tableau
  currentY = headerTableY - 20;
  const rowHeight = 25; // Hauteur de ligne
  const rowsPerPage = Math.floor((currentY - MARGINS.pdf.bottom - 40) / rowHeight); // Nombre de lignes par page
  
  // Dessiner les lignes du tableau sur plusieurs pages si nécessaire
  for (let i = 0; i < data.daily.length; i++) {
    // Vérifier si nous avons atteint la fin de la page
    if (i > 0 && i % rowsPerPage === 0) {
      // Ajouter une nouvelle page
      currentPage = pdfDoc.addPage([MARGINS.pdf.pageWidth, MARGINS.pdf.pageHeight]);
      currentPageNum++;
      
      // Réinitialiser la position Y et dessiner l'en-tête
      currentY = MARGINS.pdf.pageHeight - MARGINS.pdf.top - 50;
      
      // Ajouter l'en-tête de la page
      currentPage.drawRectangle({
        x: MARGINS.pdf.left,
        y: MARGINS.pdf.pageHeight - MARGINS.pdf.top,
        width: contentWidth,
        height: 30,
        color: rgb(0.95, 0.95, 0.95),
        borderColor: rgb(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b),
        borderWidth: 1,
      });
      
      currentPage.drawText(`${title} - Page ${currentPageNum}`, {
        x: MARGINS.pdf.left + 10,
        y: MARGINS.pdf.pageHeight - MARGINS.pdf.top - 20,
        size: 12,
        font: boldFont,
        color: rgb(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b),
      });
      
      // Dessiner l'en-tête du tableau sur la nouvelle page
      currentPage.drawRectangle({
        x: MARGINS.pdf.left,
        y: currentY - 20,
        width: contentWidth,
        height: 20,
        color: rgb(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b),
      });
      
      // Redessiner les en-têtes des colonnes
      currentPage.drawText("Date", {
        x: colStarts[0] + 10,
        y: currentY - 14,
        size: 10,
        font: boldFont,
        color: rgb(1, 1, 1),
      });
      
      currentPage.drawText("Employés", {
        x: colStarts[1] + 10,
        y: currentY - 14,
        size: 10,
        font: boldFont,
        color: rgb(1, 1, 1),
      });
      
      currentPage.drawText("Heures totales", {
        x: colStarts[2] + 10,
        y: currentY - 14,
        size: 10,
        font: boldFont,
        color: rgb(1, 1, 1),
      });
      
      currentPage.drawText("Heures moyennes", {
        x: colStarts[3] + 10,
        y: currentY - 14,
        size: 10,
        font: boldFont,
        color: rgb(1, 1, 1),
      });
      
      currentY -= 20;
    }
    
    const day = data.daily[i];
    const date = new Date(day.date).toLocaleDateString('fr-FR');
    const employees = day.count || 0;
    const totalHours = ((day.duration || 0) / 60).toFixed(1);
    const avgHours = employees > 0 
      ? ((day.duration || 0) / 60 / employees).toFixed(1) 
      : "0";
      
    // Fond alterné pour les lignes
    if (i % 2 === 0) {
      currentPage.drawRectangle({
        x: MARGINS.pdf.left,
        y: currentY - rowHeight,
        width: contentWidth,
        height: rowHeight,
        color: rgb(0.95, 0.95, 0.95),
      });
    }
    
    // Bordures de cellule
    for (let j = 0; j <= 4; j++) { // Lignes verticales
      const xPos = j === 0 ? MARGINS.pdf.left : (j === 4 ? MARGINS.pdf.left + contentWidth : colStarts[j]);
      currentPage.drawLine({
        start: { x: xPos, y: currentY },
        end: { x: xPos, y: currentY - rowHeight },
        thickness: 0.5,
        color: rgb(0.7, 0.7, 0.7),
      });
    }
    
    // Ligne horizontale du bas
    currentPage.drawLine({
      start: { x: MARGINS.pdf.left, y: currentY - rowHeight },
      end: { x: MARGINS.pdf.left + contentWidth, y: currentY - rowHeight },
      thickness: 0.5,
      color: rgb(0.7, 0.7, 0.7),
    });
    
    // Données avec positionnement vertical amélioré
    const textY = currentY - (rowHeight / 2) - 4;
    
    currentPage.drawText(date, {
      x: colStarts[0] + 10,
      y: textY,
      size: 9,
      font: font,
      color: rgb(0, 0, 0),
    });
    
    currentPage.drawText(employees.toString(), {
      x: colStarts[1] + 10,
      y: textY,
      size: 9,
      font: font,
      color: rgb(0, 0, 0),
    });
    
    currentPage.drawText(totalHours + " h", {
      x: colStarts[2] + 10,
      y: textY,
      size: 9,
      font: font,
      color: rgb(0, 0, 0),
    });
    
    currentPage.drawText(avgHours + " h", {
      x: colStarts[3] + 10,
      y: textY,
      size: 9,
      font: font,
      color: rgb(0, 0, 0),
    });
    
    currentY -= rowHeight;
  }
  
  // Pied de page avec bordure sur la dernière page
  const footerY = MARGINS.pdf.bottom + 30;
  currentPage.drawRectangle({
    x: MARGINS.pdf.left,
    y: footerY - 30,
    width: contentWidth,
    height: 30,
    color: rgb(0.95, 0.95, 0.95),
    borderColor: rgb(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b),
    borderWidth: 1,
  });
  
  const footerTextX = MARGINS.pdf.left + (contentWidth / 2) - 100; // Centré
  currentPage.drawText("SENATOR INVESTECH - Rapport confidentiel", {
    x: footerTextX,
    y: footerY - 15,
    size: 10,
    font: boldFont,
    color: rgb(COLORS.darkGray.r, COLORS.darkGray.g, COLORS.darkGray.b),
  });
  
  currentPage.drawText(`Exporté le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}`, {
    x: footerTextX,
    y: footerY - 25,
    size: 8,
    font: font,
    color: rgb(0.5, 0.5, 0.5),
  });

  const pdfBytes = await pdfDoc.save();
  return { buffer: pdfBytes };
}

// Fonction pour gérer le retour à la ligne automatique lorsque le texte est trop long
function wrapText(text: string, maxWidth: number, font: any, fontSize: number): string[] {
  if (!text) return [];
  
  // Si le texte entier tient dans la largeur maximale, le retourner tel quel
  if (font.widthOfTextAtSize(text, fontSize) <= maxWidth) {
    return [text];
  }
  
  // Diviser le texte en mots
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';
  
  // Construire les lignes mot par mot
  words.forEach(word => {
    // Calculer la largeur de la ligne actuelle + le nouveau mot
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const testWidth = font.widthOfTextAtSize(testLine, fontSize);
    
    // Si la ligne actuelle + le nouveau mot dépasse la largeur maximale,
    // ajouter la ligne actuelle aux lignes et commencer une nouvelle ligne
    if (testWidth > maxWidth && currentLine !== '') {
      lines.push(currentLine);
      currentLine = word;
    } else {
      // Sinon, ajouter le mot à la ligne actuelle
      currentLine = testLine;
    }
  });
  
  // Ajouter la dernière ligne
  if (currentLine) {
    lines.push(currentLine);
  }
  
  return lines;
}

// Fonction helper pour dessiner un élément d'information avec gestion des retours à la ligne
function drawInfoItem(page: any, label: string, value: string, x: number, y: number, font: any, boldFont: any) {
  // Dessiner l'étiquette
  page.drawText(label + " :", {
    x,
    y,
    size: 10,
    font,
    color: rgb(COLORS.darkGray.r, COLORS.darkGray.g, COLORS.darkGray.b),
  });
  
  // Gérer les retours à la ligne pour la valeur si elle est trop longue
  const valueMaxWidth = 150; // Largeur maximale pour la valeur
  const valueFontSize = 10;
  
  // Si la valeur est courte, l'afficher directement
  if (boldFont.widthOfTextAtSize(value, valueFontSize) <= valueMaxWidth) {
    page.drawText(value, {
      x: x + 160, // Un peu moins que les 180 précédents pour donner plus d'espace
      y,
      size: valueFontSize,
      font: boldFont,
      color: rgb(COLORS.text.r, COLORS.text.g, COLORS.text.b),
    });
  } else {
    // Sinon, gérer les retours à la ligne
    const valueLines = wrapText(value, valueMaxWidth, boldFont, valueFontSize);
    valueLines.forEach((line, index) => {
      page.drawText(line, {
        x: x + 160,
        y: y - (index * valueFontSize * 1.2),
        size: valueFontSize,
        font: boldFont,
        color: rgb(COLORS.text.r, COLORS.text.g, COLORS.text.b),
      });
    });
  }
}

// Fonction helper pour dessiner une section avec titre et gestion des retours à la ligne
function drawSection(page: any, title: string, x: number, y: number, width: number, font: any, boldFont: any) {
  // Ligne de section
  page.drawLine({
    start: { x, y: y + 5 },
    end: { x: x + width, y: y + 5 },
    thickness: 1,
    color: rgb(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b),
  });
  
  // Gérer les retours à la ligne pour le titre si nécessaire
  const titleMaxWidth = width - 20; // Marge pour le titre
  const titleFontSize = 12;
  
  // Si le titre est court, l'afficher directement
  if (boldFont.widthOfTextAtSize(title, titleFontSize) <= titleMaxWidth) {
    page.drawText(title, {
      x: x + 10,
      y: y + 15,
      size: titleFontSize,
      font: boldFont,
      color: rgb(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b),
    });
  } else {
    // Sinon, gérer les retours à la ligne
    const titleLines = wrapText(title, titleMaxWidth, boldFont, titleFontSize);
    titleLines.forEach((line, index) => {
      page.drawText(line, {
        x: x + 10,
        y: y + 15 - (index * titleFontSize * 1.2),
        size: titleFontSize,
        font: boldFont,
        color: rgb(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b),
      });
    });
  }
}

// Fonction pour générer un rapport Excel
async function generateExcelReport(title: string, data: any, options: any, attendanceParams: any): Promise<{ buffer: ArrayBuffer }> {
  const workbook = new ExcelJS.Workbook();
  
  // Propriétés du document
  workbook.creator = 'SENATOR INVESTECH';
  workbook.lastModifiedBy = 'Système de rapports';
  workbook.created = new Date();
  workbook.modified = new Date();
  
  const worksheet = workbook.addWorksheet('Rapport de présence', {
    pageSetup: {
      paperSize: 9, // A4
      orientation: 'portrait',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: {
        left: 0.7,
        right: 0.7,
        top: 0.75,
        bottom: 0.75,
        header: 0.3,
        footer: 0.3
      }
    }
  });

  // Styles
  const titleStyle = {
    font: { size: 16, bold: true, color: { argb: '007B65' } },
    alignment: { horizontal: 'center', vertical: 'middle' }
  };
  
  const headerStyle = {
    font: { bold: true, color: { argb: 'FFFFFF' } },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: '007B65' } },
    alignment: { horizontal: 'center', vertical: 'middle' },
    border: {
      top: { style: 'thin', color: { argb: 'BBBBBB' } },
      left: { style: 'thin', color: { argb: 'BBBBBB' } },
      bottom: { style: 'thin', color: { argb: 'BBBBBB' } },
      right: { style: 'thin', color: { argb: 'BBBBBB' } }
    }
  };
  
  const cellStyle = {
    alignment: { horizontal: 'center', vertical: 'middle' },
    border: {
      top: { style: 'thin', color: { argb: 'DDDDDD' } },
      left: { style: 'thin', color: { argb: 'DDDDDD' } },
      bottom: { style: 'thin', color: { argb: 'DDDDDD' } },
      right: { style: 'thin', color: { argb: 'DDDDDD' } }
    }
  };
  
  const alternateRowStyle = {
    alignment: { horizontal: 'center', vertical: 'middle' },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F3F3F3' } },
    border: {
      top: { style: 'thin', color: { argb: 'DDDDDD' } },
      left: { style: 'thin', color: { argb: 'DDDDDD' } },
      bottom: { style: 'thin', color: { argb: 'DDDDDD' } },
      right: { style: 'thin', color: { argb: 'DDDDDD' } }
    }
  };
  
  const sectionStyle = {
    font: { size: 14, bold: true, color: { argb: '007B65' } },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F5F5F5' } }
  };
  
  const labelStyle = {
    font: { bold: true },
    alignment: { horizontal: 'left', vertical: 'middle' }
  };
  
  const valueStyle = {
    alignment: { horizontal: 'left', vertical: 'middle' }
  };
  
  const summaryValueStyle = {
    font: { bold: true, color: { argb: '007B65' } },
    alignment: { horizontal: 'left', vertical: 'middle' }
  };

  const infoStyle = {
    font: { italic: true, size: 9, color: { argb: '555555' } },
    alignment: { horizontal: 'left', vertical: 'middle' }
  };

  // Configuration des colonnes avec largeurs optimisées
  worksheet.columns = [
    { header: 'Date', key: 'date', width: 25 },
    { header: 'Employés', key: 'employees', width: 15 },
    { header: 'Heures totales', key: 'totalHours', width: 20 },
    { header: 'Heures moyennes', key: 'avgHours', width: 20 }
  ];
  
  // Définir une hauteur de ligne uniformément plus grande
  worksheet.properties.defaultRowHeight = MARGINS.excel.rowHeight;
  
  // Logo et informations d'en-tête
  worksheet.mergeCells('A1:D1');
  const titleCell = worksheet.getCell('A1');
  titleCell.value = 'SENATOR INVESTECH';
  titleCell.font = { size: 16, bold: true, color: { argb: '007B65' } };
  titleCell.alignment = { horizontal: 'left' };
  
  worksheet.mergeCells('A2:D2');
  const subtitleCell = worksheet.getCell('A2');
  subtitleCell.value = 'Système de gestion et de reporting';
  subtitleCell.font = { size: 10, italic: true };
  subtitleCell.alignment = { horizontal: 'left' };
  
  // Titre du rapport
  worksheet.mergeCells('A4:D4');
  const reportTitleCell = worksheet.getCell('A4');
  reportTitleCell.value = title;
  Object.assign(reportTitleCell, titleStyle);
  worksheet.getRow(4).height = 30; // Hauteur augmentée pour le titre
  
  // Date d'édition
  worksheet.mergeCells('A5:D5');
  const dateCell = worksheet.getCell('A5');
  dateCell.value = `Édité le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}`;
  dateCell.font = { italic: true, size: 9 };
  dateCell.alignment = { horizontal: 'right' };
  
  // Section Résumé
  worksheet.mergeCells('A7:D7');
  const summaryCell = worksheet.getCell('A7');
  summaryCell.value = 'Résumé';
  Object.assign(summaryCell, sectionStyle);
  worksheet.getRow(7).height = 25;
  
  // Informations résumées avec style amélioré et formatage
  const summaryData = [
    { label: 'Jours analysés', value: data.daily.length },
    { 
      label: 'Employés maximum', 
      value: data.daily.reduce((max: number, day: any) => Math.max(max, day.count || 0), 0) 
    },
    { 
      label: 'Heures totales', 
      value: data.daily.reduce((sum: number, day: any) => sum + ((day.duration || 0) / 60), 0).toFixed(1) + ' h'
    }
  ];
  
  if (data.daily.length > 0) {
    const totalHours = data.daily.reduce((sum: number, day: any) => sum + ((day.duration || 0) / 60), 0);
    const avgHoursPerDay = totalHours / data.daily.length;
    summaryData.push({ 
      label: 'Heures moyennes par jour', 
      value: avgHoursPerDay.toFixed(1) + ' h'
    });
  }
  
  // Ajouter les informations sur les horaires de travail et pauses
  if (attendanceParams) {
    summaryData.push({ 
      label: 'Horaires de travail', 
      value: `${attendanceParams.start_hour} - ${attendanceParams.end_hour}` 
    });
    
    if (attendanceParams.lunch_break) {
      summaryData.push({ 
        label: 'Pause déjeuner', 
        value: `${attendanceParams.lunch_break_start} - ${attendanceParams.lunch_break_end} (${attendanceParams.lunch_break_duration} min)` 
      });
    }
  }
  
  // Ajouter une note sur le traitement des statistiques (brut ou net)
  if (options.netStatistics !== false && attendanceParams?.lunch_break) {
    summaryData.push({ 
      label: 'Note', 
      value: 'Les temps de pause déjeuner ont été déduits des durées totales de présence.' 
    });
  } else {
    summaryData.push({ 
      label: 'Note', 
      value: 'Les statistiques incluent les temps de pause' 
    });
  }
  
  summaryData.forEach((item, index) => {
    const rowNum = 8 + index;
    
    // Créer les cellules avec les bons styles
    const labelCell = worksheet.getCell(`A${rowNum}`);
    labelCell.value = item.label;
    Object.assign(labelCell, labelStyle);
    
    const valueCell = worksheet.getCell(`B${rowNum}`);
    valueCell.value = item.value;
    
    // Style différent pour la note
    if (item.label === 'Note') {
      Object.assign(valueCell, infoStyle);
      worksheet.mergeCells(`B${rowNum}:D${rowNum}`);
    } else {
      Object.assign(valueCell, summaryValueStyle);
    }
    
    worksheet.getRow(rowNum).height = 22;
  });
  
  // Calcul de la ligne de départ pour la section détails
  const detailsStartRow = 8 + summaryData.length + 2;
  
  // Section Détails
  worksheet.mergeCells(`A${detailsStartRow}:D${detailsStartRow}`);
  const detailsCell = worksheet.getCell(`A${detailsStartRow}`);
  detailsCell.value = 'Détails par jour';
  Object.assign(detailsCell, sectionStyle);
  worksheet.getRow(detailsStartRow).height = 25;
  
  // En-tête du tableau
  const headerRowNum = detailsStartRow + 1;
  const headerRow = worksheet.getRow(headerRowNum);
  
  // Configurer les en-têtes avec style
  worksheet.getCell(`A${headerRowNum}`).value = 'Date';
  worksheet.getCell(`B${headerRowNum}`).value = 'Employés';
  worksheet.getCell(`C${headerRowNum}`).value = 'Heures totales';
  worksheet.getCell(`D${headerRowNum}`).value = 'Heures moyennes';
  
  // Appliquer le style à toutes les cellules d'en-tête
  for (let col = 1; col <= 4; col++) {
    const cell = headerRow.getCell(col);
    Object.assign(cell, headerStyle);
  }
  
  headerRow.height = 20;
  
  // Données avec formatage amélioré
  data.daily.forEach((day: any, index: number) => {
    const rowNum = headerRowNum + 1 + index;
    const row = worksheet.getRow(rowNum);
    
    // Formatage de la date
    const dateVal = new Date(day.date);
    const dateCell = row.getCell(1);
    dateCell.value = dateVal;
    dateCell.numFmt = 'dd/mm/yyyy';
    
    // Employés (nombre entier)
    const employeeCount = day.count || 0;
    row.getCell(2).value = employeeCount;
    
    // Heures totales (décimales avec 1 chiffre après la virgule)
    const totalHours = ((day.duration || 0) / 60);
    const totalHoursCell = row.getCell(3);
    totalHoursCell.value = totalHours;
    totalHoursCell.numFmt = '0.0 "h"';
    
    // Heures moyennes (décimales avec 1 chiffre après la virgule)
    const avgHours = employeeCount > 0 ? (totalHours / employeeCount) : 0;
    const avgHoursCell = row.getCell(4);
    avgHoursCell.value = avgHours;
    avgHoursCell.numFmt = '0.0 "h"';
    
    // Appliquer le style alterné aux lignes
    row.eachCell((cell) => {
      Object.assign(cell, index % 2 === 0 ? cellStyle : alternateRowStyle);
    });
    
    row.height = 20;
  });
  
  // Ajouter une bordure autour du tableau entier
  const tableEndRow = headerRowNum + data.daily.length;
  ['A', 'B', 'C', 'D'].forEach(col => {
    // Bordure du haut pour la première ligne (déjà stylée par headerStyle)
    // Bordures latérales pour toutes les lignes
    for (let row = headerRowNum; row <= tableEndRow; row++) {
      const cell = worksheet.getCell(`${col}${row}`);
      
      if (col === 'A') {
        cell.border = {
          ...cell.border,
          left: { style: 'medium', color: { argb: 'BBBBBB' } }
        };
      }
      
      if (col === 'D') {
        cell.border = {
          ...cell.border,
          right: { style: 'medium', color: { argb: 'BBBBBB' } }
        };
      }
      
      if (row === tableEndRow) {
        cell.border = {
          ...cell.border,
          bottom: { style: 'medium', color: { argb: 'BBBBBB' } }
        };
      }
    }
  });
  
  // Ajouter une légende pour les statistiques si les pauses ont été déduites
  if (options.netStatistics !== false && attendanceParams?.lunch_break) {
    const legendRow = tableEndRow + 2;
    worksheet.mergeCells(`A${legendRow}:D${legendRow}`);
    const legendCell = worksheet.getCell(`A${legendRow}`);
    legendCell.value = '* Les temps de pause déjeuner ont été déduits des durées totales de présence.';
    legendCell.font = { italic: true, size: 8, color: { argb: '666666' } };
    legendCell.alignment = { horizontal: 'left' };
  }
  
  // Pied de page
  const footerRowNum = tableEndRow + 3;
  worksheet.mergeCells(`A${footerRowNum}:D${footerRowNum}`);
  const footerCell = worksheet.getCell(`A${footerRowNum}`);
  footerCell.value = 'SENATOR INVESTECH - Document confidentiel';
  footerCell.font = { bold: true, size: 10, color: { argb: '333333' } };
  footerCell.alignment = { horizontal: 'center' };
  
  // Ajouter une date d'exportation en petit dans le pied de page
  worksheet.mergeCells(`A${footerRowNum + 1}:D${footerRowNum + 1}`);
  const exportDateCell = worksheet.getCell(`A${footerRowNum + 1}`);
  exportDateCell.value = `Exporté le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}`;
  exportDateCell.font = { italic: true, size: 8, color: { argb: '666666' } };
  exportDateCell.alignment = { horizontal: 'center' };
  
  // Écrire dans un buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return { buffer };
}

// Fonction pour générer un rapport CSV
function generateCsvReport(data: any, options: any, attendanceParams: any): string {
  // En-tête
  let csv = 'Date,Employés,Heures totales,Heures moyennes\n';

  // Données
  data.daily.forEach((day: any) => {
    const date = new Date(day.date).toLocaleDateString('fr-FR');
    const employees = day.count || 0;
    const totalHours = ((day.duration || 0) / 60).toFixed(1);
    const avgHours = employees > 0 
      ? ((day.duration || 0) / 60 / employees).toFixed(1) 
      : "0";

    csv += `${date},${employees},${totalHours},${avgHours}\n`;
  });

  // Résumé
  csv += '\nRésumé\n';
  csv += `Jours analysés,${data.daily.length}\n`;
  
  const maxEmployees = data.daily.reduce((max: number, day: any) => 
    Math.max(max, day.count || 0), 0);
  
  csv += `Employés max,${maxEmployees}\n`;
  
  const totalHours = data.daily.reduce((sum: number, day: any) => 
    sum + ((day.duration || 0) / 60), 0);
  
  csv += `Heures totales,${totalHours.toFixed(1)}\n`;
  
  if (data.daily.length > 0) {
    const avgHoursPerDay = totalHours / data.daily.length;
    csv += `Heures moyennes par jour,${avgHoursPerDay.toFixed(1)}\n`;
  }
  
  // Ajouter les informations sur les horaires et pauses
  if (attendanceParams) {
    csv += `\nParamètres\n`;
    csv += `Horaires de travail,${attendanceParams.start_hour} - ${attendanceParams.end_hour}\n`;
    
    if (attendanceParams.lunch_break) {
      csv += `Pause déjeuner,${attendanceParams.lunch_break_start} - ${attendanceParams.lunch_break_end}\n`;
      csv += `Durée pause,${attendanceParams.lunch_break_duration} minutes\n`;
    }
    
    // Indiquer si les pauses ont été déduites
    if (options.netStatistics !== false && attendanceParams.lunch_break) {
      csv += `Note,Les temps de pause déjeuner ont été déduits des durées totales de présence.\n`;
    } else {
      csv += `Note,Les statistiques incluent les temps de pause\n`;
    }
  }

  return csv;
}

// Fonction pour générer un véritable document DOCX
async function generateDocxReport(title: string, data: any, options: any, attendanceParams: any): Promise<{ buffer: Uint8Array }> {
  // Utilisation de JSZip pour créer un document DOCX basique
  const zip = new JSZip();
  
  // Ajout des fichiers essentiels pour un DOCX valide
  // 1. [Content_Types].xml
  zip.file('[Content_Types].xml', 
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
    '<Default Extension="xml" ContentType="application/xml"/>' +
    '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
    '</Types>');
  
  // 2. _rels/.rels
  zip.folder('_rels')?.file('.rels',
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
    '</Relationships>');
  
  // 3. word/document.xml (contenu principal)
  const maxEmployees = data.daily.reduce((max: number, day: any) => 
    Math.max(max, day.count || 0), 0);
  
  const totalHours = data.daily.reduce((sum: number, day: any) => 
    sum + ((day.duration || 0) / 60), 0);
  
  let avgHoursPerDay = 0;
  if (data.daily.length > 0) {
    avgHoursPerDay = totalHours / data.daily.length;
  }
  
  // Construire le tableau de données récapitulatives
  let summaryData = [
    { label: 'Jours analysés', value: data.daily.length.toString() },
    { label: 'Employés maximum', value: maxEmployees.toString() },
    { label: 'Heures totales', value: `${totalHours.toFixed(1)} h` },
    { label: 'Heures moyennes par jour', value: `${avgHoursPerDay.toFixed(1)} h` }
  ];
  
  // Ajouter les informations sur les horaires et pauses
  if (attendanceParams) {
    summaryData.push({
      label: 'Horaires de travail',
      value: `${attendanceParams.start_hour} - ${attendanceParams.end_hour}`
    });
    
    if (attendanceParams.lunch_break) {
      summaryData.push({
        label: 'Pause déjeuner',
        value: `${attendanceParams.lunch_break_start} - ${attendanceParams.lunch_break_end} (${attendanceParams.lunch_break_duration} min)`
      });
    }
  }
  
  // Ajouter une note sur le traitement des statistiques
  if (options.netStatistics !== false && attendanceParams?.lunch_break) {
    summaryData.push({
      label: 'Note',
      value: 'Les temps de pause déjeuner ont été déduits des durées totales de présence.'
    });
  } else {
    summaryData.push({
      label: 'Note',
      value: 'Les statistiques incluent les temps de pause'
    });
  }
  
  // Construire les lignes du tableau récapitulatif
  let summaryRows = '';
  summaryData.forEach(item => {
    summaryRows += `
      <w:tr>
        <w:tc><w:p><w:r><w:rPr><w:b/></w:rPr><w:t>${item.label}</w:t></w:r></w:p></w:tc>
        <w:tc><w:p><w:r><w:t>${item.value}</w:t></w:r></w:p></w:tc>
      </w:tr>
    `;
  });
  
  // Construire le tableau de détails
  let tableRows = '';
  data.daily.forEach((day: any) => {
    const date = new Date(day.date).toLocaleDateString('fr-FR');
    const employees = day.count || 0;
    const totalHours = ((day.duration || 0) / 60).toFixed(1);
    const avgHours = employees > 0 
      ? ((day.duration || 0) / 60 / employees).toFixed(1) 
      : "0";
    
    tableRows += `
      <w:tr>
        <w:tc><w:p><w:r><w:t>${date}</w:t></w:r></w:p></w:tc>
        <w:tc><w:p><w:r><w:t>${employees}</w:t></w:r></w:p></w:tc>
        <w:tc><w:p><w:r><w:t>${totalHours} h</w:t></w:r></w:p></w:tc>
        <w:tc><w:p><w:r><w:t>${avgHours} h</w:t></w:r></w:p></w:tc>
      </w:tr>
    `;
  });
  
  // Document complet avec mise en forme Word
  const documentXml = `
    <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
      <w:body>
        <w:p>
          <w:pPr><w:jc w:val="center"/><w:spacing w:after="200"/></w:pPr>
          <w:r><w:rPr><w:b/><w:sz w:val="36"/><w:color w:val="007B65"/></w:rPr><w:t>${title}</w:t></w:r>
        </w:p>
        
        <w:p>
          <w:pPr><w:spacing w:after="200"/></w:pPr>
          <w:r><w:rPr><w:i/><w:sz w:val="20"/></w:rPr><w:t>Édité le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}</w:t></w:r>
        </w:p>
        
        <w:p>
          <w:pPr><w:spacing w:after="120"/></w:pPr>
          <w:r><w:rPr><w:b/><w:sz w:val="28"/><w:color w:val="007B65"/></w:rPr><w:t>RÉSUMÉ</w:t></w:r>
        </w:p>
        
        <w:tbl>
          ${summaryRows}
        </w:tbl>
        
        <w:p>
          <w:pPr><w:spacing w:before="360" w:after="120"/></w:pPr>
          <w:r><w:rPr><w:b/><w:sz w:val="28"/><w:color w:val="007B65"/></w:rPr><w:t>DÉTAILS PAR JOUR</w:t></w:r>
        </w:p>
        
        <w:tbl>
          <w:tr>
            <w:tc><w:p><w:pPr><w:shd w:fill="007B65"/></w:pPr><w:r><w:rPr><w:b/><w:color w:val="FFFFFF"/></w:rPr><w:t>Date</w:t></w:r></w:p></w:tc>
            <w:tc><w:p><w:pPr><w:shd w:fill="007B65"/></w:pPr><w:r><w:rPr><w:b/><w:color w:val="FFFFFF"/></w:rPr><w:t>Employés</w:t></w:r></w:p></w:tc>
            <w:tc><w:p><w:pPr><w:shd w:fill="007B65"/></w:pPr><w:r><w:rPr><w:b/><w:color w:val="FFFFFF"/></w:rPr><w:t>Heures totales</w:t></w:r></w:p></w:tc>
            <w:tc><w:p><w:pPr><w:shd w:fill="007B65"/></w:pPr><w:r><w:rPr><w:b/><w:color w:val="FFFFFF"/></w:rPr><w:t>Heures moyennes</w:t></w:r></w:p></w:tc>
          </w:tr>
          ${tableRows}
        </w:tbl>
        
        <w:p>
          <w:pPr><w:spacing w:before="360"/><w:jc w:val="center"/></w:pPr>
          <w:r><w:rPr><w:b/><w:sz w:val="20"/></w:rPr><w:t>SENATOR INVESTECH - Document confidentiel</w:t></w:r>
        </w:p>
        
        <w:p>
          <w:pPr><w:jc w:val="center"/></w:pPr>
          <w:r><w:rPr><w:i/><w:sz w:val="18"/></w:rPr><w:t>Exporté le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}</w:t></w:r>
        </w:p>
      </w:body>
    </w:document>
  `;
  
  const wordFolder = zip.folder('word');
  if (wordFolder) {
    wordFolder.file('document.xml', documentXml);
  }
  
  // Générer le fichier DOCX (ZIP)
  const buffer = await zip.generateAsync({ type: 'uint8array' });
  return { buffer };
}

// Fonction simplifiée pour générer un contenu Word (ancienne méthode, maintenant remplacée)
function generateDocxContent(title: string, data: any, options: any): string {
  // Cette fonction est maintenant obsolète et remplacée par generateDocxReport
  // Conservée pour compatibilité rétroactive
  let content = `${title}\n\n`;
  
  content += "RÉSUMÉ\n";
  content += `Jours analysés: ${data.daily.length}\n`;
  
  const maxEmployees = data.daily.reduce((max: number, day: any) => 
    Math.max(max, day.count || 0), 0);
  content += `Employés maximum: ${maxEmployees}\n`;
  
  const totalHours = data.daily.reduce((sum: number, day: any) => 
    sum + ((day.duration || 0) / 60), 0);
  content += `Heures totales: ${totalHours.toFixed(1)} h\n`;
  
  if (data.daily.length > 0) {
    const avgHoursPerDay = totalHours / data.daily.length;
    content += `Heures moyennes par jour: ${avgHoursPerDay.toFixed(1)} h\n\n`;
  }
  
  content += "DÉTAILS PAR JOUR\n";
  content += "Date\tEmployés\tHeures totales\tHeures moyennes\n";
  
  data.daily.forEach((day: any) => {
    const date = new Date(day.date).toLocaleDateString('fr-FR');
    const employees = day.count || 0;
    const totalHours = ((day.duration || 0) / 60).toFixed(1);
    const avgHours = employees > 0 
      ? ((day.duration || 0) / 60 / employees).toFixed(1) 
      : "0";
    
    content += `${date}\t${employees}\t${totalHours} h\t${avgHours} h\n`;
  });
  
  content += "\n\nSENATOR INVESTECH - Document confidentiel\n";
  content += `Exporté le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}`;
  
  return content;
} 