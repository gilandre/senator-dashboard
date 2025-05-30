import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { generatePdfReport } from '@/lib/services/pdf-export-service';
import { logExportEvent } from '@/lib/services/export-service';
import { APP_CONFIG } from '@/config/app';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import html2canvas from 'html2canvas';

// Define route segment config
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * POST /api/export/presence-summary
 * Endpoint spécifique pour les exports PDF de rapport de synthèse de présence
 * Utilise l'API dédiée à la synthèse pour garantir l'absence de données détaillées
 */
export async function POST(request: NextRequest) {
  try {
    // IMPORTANT: Supprimer le cache pour forcer une nouvelle requête
    console.log('***************************************************************************');
    console.log('[EXPORT-SUMMARY] NOUVEAU DÉMARRAGE - Version avec nettoyage radical v2.0');
    console.log('***************************************************************************');
    
    // Vérification de l'authentification
    const session = await getServerSession(authOptions);
    const bypassAuth = process.env.NODE_ENV === 'development' && 
                      request.headers.get('x-test-bypass-auth') === 'admin';
    
    if (!session && !bypassAuth) {
      return NextResponse.json(
        { error: 'Authentification requise' },
        { status: 401 }
      );
    }
    
    // Récupérer les données de la requête
    const requestData = await request.json();
    const { options, chartImage } = requestData;
    
    if (!options) {
      return NextResponse.json(
        { error: 'Options manquantes' },
        { status: 400 }
      );
    }
    
    // Récupérer les données depuis l'API de synthèse spécifique
    console.log('[EXPORT-SUMMARY] Début export PDF de synthèse - version 2');
    logExportEvent('Récupération des données de synthèse pour export PDF');
    
    // Construire l'URL de l'API avec les paramètres
    const apiUrl = new URL('/api/presence/summary', 'http://localhost');
    if (options.startDate) apiUrl.searchParams.append('startDate', options.startDate);
    if (options.endDate) apiUrl.searchParams.append('endDate', options.endDate);
    if (options.filters?.department) apiUrl.searchParams.append('department', options.filters.department);
    if (options.filters?.personType) apiUrl.searchParams.append('personType', options.filters.personType);
    
    console.log(`[EXPORT-SUMMARY] Appel à l'API de synthèse: ${apiUrl.toString()}`);
    
    // Appel à l'API interne pour récupérer les données de synthèse
    // Ajouter un timestamp pour contourner le cache
    const timestamp = Date.now();
    const response = await fetch(`${apiUrl.toString()}&_=${timestamp}`, {
      headers: {
        'x-test-bypass-auth': 'admin', // Pour le développement
        'Cache-Control': 'no-cache, no-store, must-revalidate', // Désactiver le cache
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Erreur lors de la récupération des données: ${response.status}`);
    }
    
    // Récupérer les données de synthèse
    let data = await response.json();
    
    // RESTRUCTURATION FORCÉE: Reconstruire l'objet de données pour n'inclure que ce dont nous avons besoin
    // Ceci élimine tout risque que des données détaillées passent à travers
    console.log('[EXPORT-SUMMARY] RESTRUCTURATION COMPLÈTE DES DONNÉES');
    
    // Créer un nouvel objet avec seulement les données agrégées
    const cleanData = {
      summary: {
        totalEmployees: data.summary?.totalEmployees || 0,
        totalHours: data.summary?.totalHours || 0,
        totalDays: data.summary?.totalDays || 0,
        avgDailyHours: data.summary?.avgDailyHours || 0,
        avgEmployeePerDay: data.summary?.avgEmployeePerDay || 0,
        attendanceRate: data.summary?.attendanceRate || 0
      },
      // Données quotidiennes AGRÉGÉES seulement si elles ont le bon format
      daily: Array.isArray(data.daily) ? data.daily.map(day => {
        // Vérifier que c'est bien une structure agrégée
        if (day && typeof day === 'object' && 'date' in day && 'count' in day && 'duration' in day) {
          return {
            date: day.date,
            count: Number(day.count),
            duration: Number(day.duration)
          };
        }
        return null;
      }).filter(Boolean) : [],
      // Données hebdomadaires
      weekly: Array.isArray(data.weekly) ? data.weekly.map(week => ({
        day: week.day,
        count: Number(week.count),
        avgDuration: Number(week.avgDuration || 0)
      })) : [],
      // Données mensuelles  
      monthly: Array.isArray(data.monthly) ? data.monthly.map(month => ({
        week: month.week,
        count: Number(month.count),
        avgDuration: Number(month.avgDuration || 0)
      })) : []
    };
    
    // Remplacer l'objet original par notre version nettoyée
    data = cleanData;
    
    // DEBUG: Vérifier le contenu des données reçues après nettoyage
    console.log(`[EXPORT-SUMMARY] Structure des données après nettoyage: ${Object.keys(data).join(', ')}`);
    console.log(`[EXPORT-SUMMARY] Nombre d'éléments dans data.daily: ${data.daily?.length || 0}`);
    
    // Vérifier qu'aucune propriété indésirable n'existe
    const forbiddenProps = ['detailedLogs', 'employeeLogs', 'accessLogs', 'details'];
    forbiddenProps.forEach(prop => {
      if (prop in data) {
        console.log(`[EXPORT-SUMMARY] Suppression de la propriété interdite: ${prop}`);
        delete data[prop];
      }
    });
    
    // Ajouter l'image du graphique si disponible
    if (chartImage) {
      data.chartImage = chartImage;
      console.log(`[EXPORT-SUMMARY] Image de graphique ajoutée aux données`);
    }
    
    // Créer un dossier temporaire pour le fichier PDF
    const tempDir = path.join(os.tmpdir(), `export_presence_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`);
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    // Générer un nom de fichier unique
    const dateStr = format(new Date(), 'yyyy-MM-dd_HH-mm');
    const fileName = `rapport_presence_synthese_${dateStr}.pdf`;
    const filePath = path.join(tempDir, fileName);
    
    // Configurer les options du rapport pour le service PDF
    const reportOptions = {
      startDate: options.startDate,
      endDate: options.endDate,
      reportType: 'summary' as 'summary',
      source: 'presence' as 'presence',
      filters: options.filters,
      includeCharts: true,
      includeDetails: false, // IMPORTANT: Toujours false pour les rapports de synthèse
      logoUrl: APP_CONFIG.export.defaultLogo
    };
    
    console.log(`[EXPORT-SUMMARY] Options du rapport: ${JSON.stringify(reportOptions)}`);
    
    // ÉTAPE DE VÉRIFICATION FINALE AVANT GÉNÉRATION
    if (data.daily && Array.isArray(data.daily)) {
      console.log(`[EXPORT-SUMMARY] Données quotidiennes agrégées disponibles: ${data.daily.length} jours`);
    }
    
    // Vérifier si daily contient des données détaillées (ce qui serait anormal)
    if (data.daily && Array.isArray(data.daily) && data.daily.length > 0) {
      const firstDay = data.daily[0];
      if (firstDay && typeof firstDay === 'object') {
        console.log(`[EXPORT-SUMMARY] Structure d'un jour: ${Object.keys(firstDay).join(', ')}`);
        
        // Vérifier si les données semblent détaillées ou agrégées
        if (firstDay.badge_number || firstDay.badgeNumber || firstDay.employeeId) {
          console.log(`[EXPORT-SUMMARY] ALERTE: Les données quotidiennes semblent contenir des données détaillées par employé!`);
          // Si c'est le cas, vider le tableau pour la sécurité
          data.daily = [];
        }
      }
    }
    
    // Générer le PDF à partir des données de synthèse
    logExportEvent(`Génération du rapport PDF de synthèse: ${fileName}`);
    const pdfBuffer = await generatePdfReport(data, reportOptions, filePath);
    
    console.log(`[EXPORT-SUMMARY] Génération PDF terminée, taille: ${pdfBuffer.length} octets`);
    console.log('***************************************************************************');
    console.log('[EXPORT-SUMMARY] FIN DU PROCESSUS');
    console.log('***************************************************************************');
    
    // Retourner le PDF
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=${fileName}`
      }
    });
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Erreur lors de la génération du rapport PDF de synthèse:', errorMessage);
    
    return NextResponse.json(
      { 
        error: 'Erreur lors de la génération du rapport PDF', 
        details: errorMessage
      },
      { status: 500 }
    );
  }
} 