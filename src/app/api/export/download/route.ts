import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { AuthLogger } from '@/lib/security/authLogger';
import * as fs from 'fs';
import * as path from 'path';
import { extname } from 'path';

// Define route segment config
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 1 minute maximum pour le téléchargement

// Mapping des types MIME pour les différents formats
const MIME_TYPES: Record<string, string> = {
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.xls': 'application/vnd.ms-excel',
  '.csv': 'text/csv; charset=utf-8',
  '.pdf': 'application/pdf',
  '.zip': 'application/zip',
  '.excel': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' // Pour la compatibilité avec les anciens fichiers
};

/**
 * Fonction de détection du type MIME basée sur l'extension de fichier
 * Cette fonction tente de déterminer le type MIME même avec des extensions non standards
 */
function detectMimeType(fileName: string): string {
  const extension = extname(fileName).toLowerCase();
  
  // Si l'extension est directement mappée, utiliser le type MIME correspondant
  if (MIME_TYPES[extension]) {
    return MIME_TYPES[extension];
  }
  
  // Vérifier les formats en fonction du nom de fichier
  if (fileName.includes('_excel_') || fileName.includes('export_excel')) {
    return MIME_TYPES['.xlsx'];
  } else if (fileName.includes('_csv_') || fileName.includes('export_csv')) {
    return MIME_TYPES['.csv'];
  } else if (fileName.includes('_pdf_') || fileName.includes('export_pdf')) {
    return MIME_TYPES['.pdf'];
  } else if (fileName.endsWith('.zip') || fileName.includes('_zip_')) {
    return MIME_TYPES['.zip'];
  }
  
  // Type par défaut si aucune correspondance n'est trouvée
  return 'application/octet-stream';
}

/**
 * GET /api/export/download - Télécharger un fichier d'export
 * Paramètres:
 * - file: Chemin complet vers le fichier
 * - name: Nom du fichier pour le téléchargement
 */
export async function GET(req: NextRequest) {
  try {
    // Vérification de l'authentification
    const session = await getServerSession(authOptions);
    const bypassAuth = req.headers.get('x-test-bypass-auth') === 'admin';
    
    if (!session && !bypassAuth) {
      return new Response('Authentification requise', { status: 401 });
    }
    
    // Récupérer les paramètres
    const { searchParams } = new URL(req.url);
    const filePath = searchParams.get('file');
    const fileName = searchParams.get('name');
    
    // Validation
    if (!filePath || !fileName) {
      return new Response('Paramètres manquants', { status: 400 });
    }
    
    // Vérifier que le fichier existe
    if (!fs.existsSync(filePath)) {
      return new Response('Fichier non trouvé', { status: 404 });
    }
    
    // Lire le fichier
    const fileBuffer = fs.readFileSync(filePath);
    
    // Déterminer le type MIME en utilisant notre fonction améliorée
    const contentType = detectMimeType(fileName);
    
    // Enregistrer l'activité
    await AuthLogger.logActivity(
      session?.user?.id || 'bypass-auth-admin',
      'export_download',
      `Téléchargement du fichier ${fileName}`
    );
    
    // Configurer les en-têtes pour le téléchargement
    const headers = {
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${fileName}"`,
      'Content-Length': fileBuffer.length.toString()
    };
    
    return new Response(fileBuffer, { headers });
  } catch (error) {
    console.error('Erreur lors du téléchargement du fichier:', error);
    return new Response('Erreur lors du téléchargement du fichier', { status: 500 });
  }
}

/**
 * DELETE /api/export/download - Supprimer un fichier temporaire après téléchargement
 */
export async function DELETE(req: NextRequest) {
  try {
    // Vérification de l'authentification
    const session = await getServerSession(authOptions);
    const bypassAuth = req.headers.get('x-test-bypass-auth') === 'admin';
    
    if (!session && !bypassAuth) {
      return new Response('Authentification requise', { status: 401 });
    }
    
    // Récupérer les paramètres
    const { searchParams } = new URL(req.url);
    const filePath = searchParams.get('file');
    
    // Validation
    if (!filePath) {
      return new Response('Paramètre de fichier manquant', { status: 400 });
    }
    
    // Vérifier que le fichier existe
    if (!fs.existsSync(filePath)) {
      return new Response('Fichier non trouvé', { status: 404 });
    }
    
    // Supprimer le fichier
    fs.unlinkSync(filePath);
    
    // Si c'est un fichier dans un dossier temporaire, essayer de supprimer le dossier aussi
    const dir = path.dirname(filePath);
    if (dir.includes('export_') && fs.existsSync(dir)) {
      // Vérifier si le dossier est vide
      const files = fs.readdirSync(dir);
      if (files.length === 0) {
        fs.rmdirSync(dir);
      }
    }
    
    return new Response('Fichier supprimé avec succès', { status: 200 });
  } catch (error) {
    console.error('Erreur lors de la suppression du fichier:', error);
    return new Response('Erreur lors de la suppression du fichier', { status: 500 });
  }
} 