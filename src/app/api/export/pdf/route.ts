import { NextRequest, NextResponse } from 'next/server';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { calculatePresenceStats, formatHours, formatPercentage } from '@/lib/utils/presence-calculations';

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

// Générer le PDF avec jsPDF
async function generatePDF(data: any, dateRange: any, recommendations: string[]) {
  // Calculer les statistiques en utilisant notre fonction centralisée
  const stats = calculatePresenceStats(data);

  // Créer un nouveau document PDF
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  // Constantes pour la mise en page
  const marginLeft = 20;
  const marginRight = 20;
  const marginTop = 30; // Marge supérieure pour le corps du document
  const marginBottom = 20;
  const headerHeight = 20;
  const footerHeight = 15;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = pageWidth - marginLeft - marginRight;
  const contentHeight = pageHeight - marginTop - marginBottom - headerHeight - footerHeight;

  // Fonction pour les en-têtes et pieds de page
  const addHeaderFooter = (doc: any, pageInfo: any) => {
    // En-tête
    doc.setFillColor(240, 240, 240);
    doc.rect(0, 0, pageWidth, headerHeight, 'F');
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(60, 60, 60);
    doc.text('Senator InvesTech - Rapport de Temps de Présence', marginLeft, 13);
    
    // Date de génération en haut à droite
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`Généré le: ${format(new Date(), 'dd/MM/yyyy')}`, pageWidth - marginRight, 13, { align: 'right' });
    
    // Pied de page
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.line(marginLeft, pageHeight - footerHeight, pageWidth - marginRight, pageHeight - footerHeight);
    
    // Numéro de page
    doc.setFontSize(8);
    doc.text(`Page ${pageInfo.pageNumber}/${doc.getNumberOfPages()}`, pageWidth - marginRight, pageHeight - 10, { align: 'right' });
  };

  // Fonction utilitaire pour vérifier si on doit passer à une nouvelle page
  const checkNewPage = (requiredSpace: number, currentY: number) => {
    const availableSpace = pageHeight - currentY - marginBottom - footerHeight;
    if (availableSpace < requiredSpace) {
      doc.addPage();
      addHeaderFooter(doc, { pageNumber: doc.getNumberOfPages() });
      return marginTop; // Retourner la nouvelle position Y
    }
    return currentY;
  };

  // Fonction pour ajouter un espace vertical
  const addVerticalSpace = (currentY: number, space: number) => {
    return checkNewPage(space, currentY + space);
  };

  // Ajouter l'en-tête à la première page
  addHeaderFooter(doc, { pageNumber: 1 });
  let currentY = marginTop;

  // Titre principal
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('Rapport de Temps de Présence', marginLeft, currentY);
  currentY += 15;

  // Période
  const dateFrom = dateRange?.from ? formatDate(dateRange.from) : 'Non spécifiée';
  const dateTo = dateRange?.to ? formatDate(dateRange.to) : 'Non spécifiée';
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`Période: ${dateFrom} - ${dateTo}`, marginLeft, currentY);
  currentY += 15;

  // Ajouter une ligne de séparation
  doc.setDrawColor(150, 150, 150);
  doc.setLineWidth(0.5);
  doc.line(marginLeft, currentY, pageWidth - marginRight, currentY);
  currentY += 10;

  // Vue d'ensemble
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Vue d\'ensemble', marginLeft, currentY);
  currentY += 10;

  // Utiliser les statistiques calculées
  const presenceRate = stats.presenceRate;
  const totalHours = stats.totalHours;
  const avgHoursPerEmployee = stats.avgHoursPerEmployee;
  const daysCount = stats.totalDays;

  // Créer un tableau pour les statistiques
  autoTable(doc, {
    startY: currentY,
    head: [['Indicateur', 'Valeur', 'Description']],
    body: [
      ['Taux de présence moyen', formatPercentage(presenceRate), `${stats.maxEmployees} employés maximum sur ${daysCount} jours`],
      ['Temps total de présence', formatHours(totalHours), `Sur une période de ${daysCount} jours`],
      ['Temps moyen par employé', formatHours(avgHoursPerEmployee), 'Moyenne journalière par personne']
    ],
    headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [240, 240, 240] },
    margin: { left: marginLeft, right: marginRight, bottom: 15 },
    styles: { fontSize: 10, cellPadding: 5 },
    didDrawPage: (data) => {
      addHeaderFooter(doc, data);
    }
  });

  // Mettre à jour la position Y après le tableau
  currentY = (doc as any).lastAutoTable.finalY + 15;

  // Recommandations
  currentY = checkNewPage(50, currentY); // Vérifier l'espace pour le titre et le tableau des recommandations
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Recommandations', marginLeft, currentY);
  currentY += 10;

  // Créer un tableau pour les recommandations
  autoTable(doc, {
    startY: currentY,
    body: recommendations.map(rec => [rec]),
    headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [240, 240, 240] },
    margin: { left: marginLeft, right: marginRight, bottom: 15 },
    styles: { fontSize: 10, cellPadding: 5 },
    didDrawPage: (data) => {
      addHeaderFooter(doc, data);
    }
  });

  // Mettre à jour la position Y après le tableau des recommandations
  currentY = (doc as any).lastAutoTable.finalY + 20;

  // Données détaillées quotidiennes
  if (data?.daily && data.daily.length > 0) {
    // Vérifier l'espace nécessaire pour le titre et le tableau
    currentY = checkNewPage(100, currentY);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Données détaillées quotidiennes', marginLeft, currentY);
    currentY += 10;

    // Préparer les données pour le tableau en utilisant les calculs centralisés
    const dailyData = data.daily.map(day => {
      const dayStats = calculatePresenceStats({ daily: [day] });
      return [
        format(new Date(day.date), 'dd/MM/yyyy', { locale: fr }),
        formatNumber(day.count), // Nombre d'employés
        formatHours(dayStats.totalHours), // Total des heures
        formatHours(dayStats.avgHoursPerEmployee) // Moyenne par employé
      ];
    });

    // Créer un tableau pour les données quotidiennes
    autoTable(doc, {
      startY: currentY,
      head: [['Date', 'Nombre d\'employés', 'Heures totales', 'Moyenne par employé']],
      body: dailyData,
      headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [240, 240, 240] },
      margin: { left: marginLeft, right: marginRight, bottom: 15 },
      styles: { fontSize: 9, cellPadding: 3 },
      didDrawPage: (data) => {
        addHeaderFooter(doc, data);
      }
    });

    // Mettre à jour la position Y après le tableau
    currentY = (doc as any).lastAutoTable.finalY + 20;
  }

  // Convertir le document en ArrayBuffer
  const pdfBytes = doc.output('arraybuffer');

  // Retourner la réponse avec le fichier PDF
  return new NextResponse(pdfBytes, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="presence_${format(new Date(), 'yyyyMMdd')}.pdf"`
    }
  });
}

// Route POST
export async function POST(req: NextRequest) {
  try {
    // Récupérer les données du rapport depuis la requête
    const { data, dateRange } = await req.json();
    
    // Convertir les chaînes de date en objets Date pour les dateRange
    const formattedDateRange = {
      from: dateRange?.from ? new Date(dateRange.from) : undefined,
      to: dateRange?.to ? new Date(dateRange.to) : undefined
    };
    
    // Générer les recommandations
    const recommendations = generateRecommendations(data);
    
    // Générer le PDF
    return await generatePDF(data, formattedDateRange, recommendations);
  } catch (error) {
    console.error('Erreur lors de la génération du rapport:', error);
    return NextResponse.json({ 
      error: 'Erreur lors de la génération du rapport', 
      details: String(error),
      stack: (error as Error).stack
    }, { status: 500 });
  }
}

// Route GET simple pour les tests
export async function GET() {
  return Response.json({ message: "API d'exportation PDF - Utiliser la méthode POST pour générer un rapport" });
}
