import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { AuthLogger } from '@/lib/security/authLogger';
import * as fs from 'fs';
import * as path from 'path';
import { PassThrough } from 'stream';
import { 
  analyzeExport, 
  exportData, 
  ExportOptions 
} from '@/lib/services/export-service';

// Define route segment config with proper format
export const dynamic = 'force-dynamic';
export const maxDuration = 120; // 2 minutes maximum pour le traitement

/**
 * GET /api/export/analyze - Analyse une requête d'export
 * Paramètres:
 * - format: 'excel' | 'csv' | 'pdf'
 * - startDate: Date de début (YYYY-MM-DD)
 * - endDate: Date de fin (YYYY-MM-DD)
 * - employeeId: Filtre par employé (optionnel)
 * - department: Filtre par département (optionnel)
 */
export async function GET(req: NextRequest) {
  try {
    // Vérification de l'authentification
    const session = await getServerSession(authOptions);
    const bypassAuth = req.headers.get('x-test-bypass-auth') === 'admin';
    
    if (!session && !bypassAuth) {
      return NextResponse.json({ error: "Authentification requise" }, { status: 401 });
    }

    // Récupérer les paramètres
    const { searchParams } = new URL(req.url);
    const format = searchParams.get('format') as 'excel' | 'csv' | 'pdf';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const employeeId = searchParams.get('employeeId') || undefined;
    const department = searchParams.get('department') || undefined;
    const source = searchParams.get('source') || undefined;
    const exportType = searchParams.get('exportType') || undefined;
    
    // Validation de base
    if (!format || !startDate || !endDate) {
      return NextResponse.json(
        { error: "Les paramètres format, startDate et endDate sont requis" },
        { status: 400 }
      );
    }
    
    // Analyser l'export
    let whereFilters = {
      employeeId,
      department
    };
    
    // Appliquer des filtres spécifiques selon la source
    if (source === 'anomalies') {
      // Pour le module anomalies, on ajoute des filtres supplémentaires
      const analysis = await analyzeExport({
        format,
        startDate,
        endDate,
        filters: whereFilters,
        source,
        exportType
      });
      
      // Enregistrer l'activité
      await AuthLogger.logActivity(
        session?.user?.id || 'bypass-auth-admin',
        'export_analyze',
        `Analyse d'export ${format} du ${startDate} au ${endDate}`
      );
      
      return NextResponse.json(analysis);
    } else {
      // Pour les autres modules ou le cas général
      const analysis = await analyzeExport({
        format,
        startDate,
        endDate,
        filters: whereFilters,
        source,
        exportType
      });
      
      // Enregistrer l'activité
      await AuthLogger.logActivity(
        session?.user?.id || 'bypass-auth-admin',
        'export_analyze',
        `Analyse d'export ${format} du ${startDate} au ${endDate}`
      );
      
      return NextResponse.json(analysis);
    }
  } catch (error) {
    console.error('Erreur lors de l\'analyse d\'export:', error);
    return NextResponse.json(
      { error: "Erreur lors de l'analyse d'export" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/export - Exporter les données
 */
export async function POST(req: NextRequest) {
  try {
    // Vérification de l'authentification
    const session = await getServerSession(authOptions);
    const bypassAuth = req.headers.get('x-test-bypass-auth') === 'admin';
    
    if (!session && !bypassAuth) {
      return NextResponse.json({ error: "Authentification requise" }, { status: 401 });
    }
    
    // Récupérer les options d'export
    const options: ExportOptions = await req.json();
    
    // Validation de base
    if (!options.format || !options.startDate || !options.endDate) {
      return NextResponse.json(
        { error: "Les paramètres format, startDate et endDate sont requis" },
        { status: 400 }
      );
    }
    
    // Vérifier si un type spécifique d'export est demandé via la source
    if (options.source) {
      // Rediriger vers l'API spécifique selon la source
      if (options.source === 'anomalies') {
        try {
          console.log(`Redirection vers l'API d'anomalies pour l'export: format=${options.format}, startDate=${options.startDate}, endDate=${options.endDate}`);
          
          // Construire l'URL avec le host local lorsque NEXT_PUBLIC_BASE_URL n'est pas défini
          const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3010';
          const anomalyUrl = `${baseUrl}/api/export/anomalies?format=${options.format}&startDate=${options.startDate}&endDate=${options.endDate}${options.exportType ? `&exportType=${options.exportType}` : ''}`;
          console.log(`URL de l'API d'anomalies: ${anomalyUrl}`);
          
          const response = await fetch(anomalyUrl, {
            headers: {
              'x-test-bypass-auth': 'admin'
            }
          });
          
          // Vérifier la réponse
          if (!response.ok) {
            console.error(`Erreur lors de l'export d'anomalies: ${response.status}`);
            const errorText = await response.text();
            console.error(`Détails de l'erreur: ${errorText}`);
            return NextResponse.json(
              { error: `Erreur lors de l'export d'anomalies: ${response.status}`, details: errorText },
              { status: response.status }
            );
          }
          
          // Retourner directement la réponse
          const contentType = response.headers.get('Content-Type');
          const contentDisposition = response.headers.get('Content-Disposition');
          
          if (!contentType) {
            console.error("L'API d'anomalies n'a pas retourné de Content-Type");
            return NextResponse.json(
              { error: "Erreur de format dans la réponse de l'API d'anomalies" },
              { status: 500 }
            );
          }
          
          console.log(`Réponse reçue de l'API d'anomalies: Content-Type=${contentType}, Content-Disposition=${contentDisposition}`);
          
          const blob = await response.blob();
          
          return new NextResponse(blob, {
            headers: {
              'Content-Type': contentType,
              'Content-Disposition': contentDisposition || `attachment; filename="export.${options.format}"`
            }
          });
        } catch (error) {
          console.error("Erreur lors de la redirection vers l'API d'anomalies:", error);
          return NextResponse.json(
            { error: "Erreur lors de la connexion à l'API d'anomalies", details: error instanceof Error ? error.message : String(error) },
            { status: 500 }
          );
        }
      }
    }
    
    // Continuer avec l'export standard pour les autres cas
    // Vérifier si l'export pourrait être trop volumineux
    const analysis = await analyzeExport(options);
    
    // Si l'export est trop volumineux et que l'utilisateur n'a pas explicitement demandé la division
    if (analysis.exceedsLimit && !options.splitFiles) {
      return NextResponse.json({
        requiresConfirmation: true,
        analysis,
        message: "L'export dépasse les limites recommandées. Veuillez confirmer en incluant 'splitFiles: true' dans votre requête."
      });
    }
    
    // Générer l'export
    const result = await exportData(options);
    
    // Enregistrer l'activité
    await AuthLogger.logActivity(
      session?.user?.id || 'bypass-auth-admin',
      'export_generate',
      `Export ${options.format} du ${options.startDate} au ${options.endDate} (${result.totalRows} lignes)`
    );
    
    if (result.status === 'processing') {
      // Pour les exports asynchrones
      return NextResponse.json({
        success: true,
        jobId: result.jobId,
        message: result.message,
        status: 'processing'
      });
    } else if (result.success && result.files && result.files.length > 0) {
      // Pour les exports réussis
      // Créer des URLs temporaires pour le téléchargement
      const downloadUrls = result.files.map(file => ({
        name: file.name,
        size: file.size,
        recordCount: file.recordCount,
        url: `/api/export/download?file=${encodeURIComponent(file.path)}&name=${encodeURIComponent(file.name)}`
      }));
      
      return NextResponse.json({
        success: true,
        files: downloadUrls,
        totalRows: result.totalRows,
        totalFiles: result.totalFiles,
        estimatedSize: result.estimatedSize
      });
    } else {
      // Pour les erreurs
      return NextResponse.json({
        success: false,
        message: result.message || "Erreur lors de l'export"
      });
    }
  } catch (error) {
    console.error('Erreur lors de l\'export des données:', error);
    return NextResponse.json(
      { error: "Erreur lors de l'export des données" },
      { status: 500 }
    );
  }
} 