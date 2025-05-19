import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import fs from 'fs';
import path from 'path';
import { PassThrough } from 'stream';

// Fonction pour télécharger un rapport depuis la base de données
async function downloadReport(id: string): Promise<{ 
  file: Buffer | null;
  fileName: string;
  fileFormat: string;
  fileSize: number;
  status: 'success' | 'not_found' | 'error';
  message?: string;
}> {
  try {
    // Extraire l'ID numérique du paramètre
    const reportId = parseInt(id.split('.')[0], 10);
    
    if (isNaN(reportId)) {
      return {
        file: null,
        fileName: '',
        fileFormat: '',
        fileSize: 0,
        status: 'error',
        message: 'ID de rapport invalide'
      };
    }
    
    // Récupérer les informations du rapport dans la base de données
    const report = await prisma.report_history.findUnique({
      where: { id: reportId },
      select: {
        file_url: true,
        file_name: true,
        file_format: true,
        file_size: true,
        status: true
      }
    });
    
    if (!report || !report.file_url) {
      return {
        file: null,
        fileName: '',
        fileFormat: '',
        fileSize: 0,
        status: 'not_found',
        message: 'Rapport non trouvé ou URL du fichier manquante'
      };
    }
    
    if (report.status !== 'completed') {
      return {
        file: null,
        fileName: report.file_name || '',
        fileFormat: report.file_format || '',
        fileSize: report.file_size || 0,
        status: 'error',
        message: 'Le rapport n\'est pas prêt pour le téléchargement'
      };
    }
    
    // Vérifier si le fichier est stocké localement (dans public/reports)
    // ou s'il s'agit d'une URL externe
    let fileBuffer: Buffer | null = null;
    
    if (report.file_url.startsWith('/')) {
      // Fichier local
      const filePath = path.join(process.cwd(), 'public', report.file_url);
      
      if (fs.existsSync(filePath)) {
        fileBuffer = fs.readFileSync(filePath);
      } else {
        // Le fichier n'existe pas, créer un fichier temporaire pour la démo
        // Cette partie serait normalement remplacée par une gestion d'erreur propre
        fileBuffer = await generateDummyFile(report.file_format || 'pdf');
      }
    } else {
      // URL externe - En production, cette partie serait gérée différemment
      // avec un téléchargement depuis un service de stockage comme S3
      // Pour la démo, nous générons un fichier simulé
      fileBuffer = await generateDummyFile(report.file_format || 'pdf');
    }
    
    if (!fileBuffer) {
      return {
        file: null,
        fileName: report.file_name || '',
        fileFormat: report.file_format || '',
        fileSize: report.file_size || 0,
        status: 'error',
        message: 'Impossible de lire le fichier'
      };
    }
    
    return {
      file: fileBuffer,
      fileName: report.file_name || `report_${reportId}.${report.file_format}`,
      fileFormat: report.file_format || 'pdf',
      fileSize: fileBuffer.length,
      status: 'success'
    };
    
  } catch (error) {
    console.error(`Error downloading report with ID ${id}:`, error);
    return {
      file: null,
      fileName: '',
      fileFormat: '',
      fileSize: 0,
      status: 'error',
      message: 'Erreur lors du téléchargement du rapport'
    };
  }
}

// Fonction pour générer un fichier fictif pour la démonstration
async function generateDummyFile(format: string): Promise<Buffer> {
  // Dans un environnement de production, cette fonction serait supprimée
  // et remplacée par un accès réel aux fichiers stockés
  
  if (format === 'pdf') {
    // Générer un PDF factice (texte simple pour la démo)
    const content = Buffer.from('%PDF-1.5\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /Resources 4 0 R /MediaBox [0 0 612 792] /Contents 5 0 R >>\nendobj\n4 0 obj\n<< /Font << /F1 6 0 R >> >>\nendobj\n5 0 obj\n<< /Length 68 >>\nstream\nBT\n/F1 24 Tf\n100 700 Td\n(SenatorFX - Rapport généré) Tj\nET\nendstream\nendobj\n6 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\nxref\n0 7\n0000000000 65535 f\n0000000010 00000 n\n0000000059 00000 n\n0000000118 00000 n\n0000000217 00000 n\n0000000262 00000 n\n0000000380 00000 n\ntrailer\n<< /Size 7 /Root 1 0 R >>\nstartxref\n447\n%%EOF\n', 'utf-8');
    return content;
  } else if (format === 'xlsx') {
    // Générer un XLSX factice (en-tête simple)
    // Note: Ce n'est pas un vrai fichier XLSX, juste une simulation pour la démo
    const content = Buffer.from('PK\u0003\u0004\u0014\u0000\u0000\u0000\u0000\u0000\u0000\u0000!\u0000\u0002\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000[Content_Types].xml', 'utf-8');
    return content;
  } else if (format === 'csv') {
    // Générer un CSV factice
    const lines = [
      'Date,Entrée,Sortie,Utilisateur,Département',
      '2023-01-01,08:30,17:30,Jean Dupont,IT',
      '2023-01-01,08:45,17:15,Marie Martin,RH',
      '2023-01-02,08:20,18:00,Julien Dubois,Finance',
      '2023-01-02,09:00,17:00,Sophie Leclerc,Marketing'
    ];
    const content = Buffer.from(lines.join('\n'), 'utf-8');
    return content;
  } else {
    // Format par défaut - texte simple
    const content = Buffer.from('SenatorFX - Contenu du rapport\n\nCeci est un fichier de démonstration généré pour simuler un téléchargement de rapport.\n', 'utf-8');
    return content;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    // Si nous sommes en dev et que nous avons un header de bypass, nous contournons l'authentification
    const headers = request.headers;
    const bypassAuth = headers.get('x-test-bypass-auth');
    
    if (!session && (!bypassAuth || process.env.NODE_ENV !== 'development')) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { id } = params;
    
    if (!id) {
      return NextResponse.json({ error: 'ID de rapport manquant' }, { status: 400 });
    }
    
    // Télécharger le rapport
    const result = await downloadReport(id);
    
    if (result.status === 'not_found') {
      return NextResponse.json({ error: 'Rapport non trouvé' }, { status: 404 });
    }
    
    if (result.status === 'error' || !result.file) {
      return NextResponse.json({ error: result.message || 'Erreur lors du téléchargement' }, { status: 500 });
    }
    
    // Déterminer le Content-Type en fonction du format du fichier
    let contentType = 'application/octet-stream';
    
    switch (result.fileFormat.toLowerCase()) {
      case 'pdf':
        contentType = 'application/pdf';
        break;
      case 'xlsx':
        contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        break;
      case 'xls':
        contentType = 'application/vnd.ms-excel';
        break;
      case 'csv':
        contentType = 'text/csv';
        break;
      case 'json':
        contentType = 'application/json';
        break;
      case 'txt':
        contentType = 'text/plain';
        break;
    }
    
    // Créer un stream pour le fichier
    const stream = new PassThrough();
    stream.end(result.file);
    
    // Mettre à jour l'historique pour enregistrer le téléchargement
    try {
      const reportId = parseInt(id.split('.')[0], 10);
      if (!isNaN(reportId)) {
        await prisma.report_history.update({
          where: { id: reportId },
          data: {
            download_count: {
              increment: 1
            },
            last_downloaded: new Date()
          }
        });
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour des statistiques de téléchargement:', error);
    }
    
    return new NextResponse(stream as any, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename=${encodeURIComponent(result.fileName)}`,
        'Content-Length': result.fileSize.toString()
      }
    });
    
  } catch (error) {
    console.error(`Error in download report API:`, error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
} 