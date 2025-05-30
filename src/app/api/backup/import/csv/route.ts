import { NextResponse } from 'next/server';
import { parseSenatorCSV } from '@/lib/csv-parser/index';
import { connectToDatabase } from '@/lib/database';
import AccessLog from '@/models/AccessLog';
import { logActivity } from '@/lib/activity-logger';
import { headers } from 'next/headers';

export async function POST(request: Request) {
  try {
    // Récupérer l'adresse IP du client
    const headersList = headers();
    const ipAddress = headersList.get('x-forwarded-for') || 'unknown';

    // Vérifier que la requête contient un fichier
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      // Journaliser l'échec
      await logActivity({
        action: 'Import de fichier CSV',
        details: 'Échec: Aucun fichier fourni',
        ipAddress: ipAddress as string
      });

      return NextResponse.json(
        { error: 'Aucun fichier fourni' },
        { status: 400 }
      );
    }

    // Vérifier que le fichier est un CSV
    if (!file.name.endsWith('.csv')) {
      // Journaliser l'échec
      await logActivity({
        action: 'Import de fichier CSV',
        details: `Échec: Le fichier "${file.name}" n'est pas au format CSV`,
        ipAddress: ipAddress as string
      });

      return NextResponse.json(
        { error: 'Le fichier doit être au format CSV' },
        { status: 400 }
      );
    }

    // Lire le contenu du fichier
    const fileContent = await file.text();
    
    // Parser le CSV
    const parsedData = await parseSenatorCSV(fileContent);
    
    if (!parsedData || parsedData.length === 0) {
      // Journaliser l'échec
      await logActivity({
        action: 'Import de fichier CSV',
        details: `Échec: Aucune donnée valide trouvée dans le fichier "${file.name}"`,
        ipAddress: ipAddress as string
      });

      return NextResponse.json(
        { error: 'Aucune donnée valide trouvée dans le fichier' },
        { status: 400 }
      );
    }

    // Se connecter à MongoDB
    await connectToDatabase();
    
    // Insérer les données dans la base
    await AccessLog.insertMany(parsedData);

    // Journaliser le succès
    await logActivity({
      action: 'Import de fichier CSV',
      details: `Succès: ${parsedData.length} entrées importées depuis "${file.name}"`,
      ipAddress: ipAddress as string
    });

    return NextResponse.json({
      message: `Importation réussie : ${parsedData.length} entrées importées pour EMERAUDE DASHI`,
      count: parsedData.length
    });
    
  } catch (error) {
    console.error('Erreur lors de l\'importation CSV:', error);

    // Journaliser l'erreur
    await logActivity({
      action: 'Import de fichier CSV',
      details: `Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
      ipAddress: headers().get('x-forwarded-for') || 'unknown'
    });

    return NextResponse.json(
      { error: 'Erreur lors du traitement du fichier CSV' },
      { status: 500 }
    );
  }
} 