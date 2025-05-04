import { NextResponse } from 'next/server';
import { parseSenatorCSV } from '@/lib/csv-parser/index';
import { connectToDatabase } from '@/lib/database';
import AccessLog from '@/models/AccessLog';

export async function POST(request: Request) {
  try {
    // Vérifier que la requête contient un fichier
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'Aucun fichier fourni' },
        { status: 400 }
      );
    }

    // Vérifier que le fichier est un CSV
    if (!file.name.endsWith('.csv')) {
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
      return NextResponse.json(
        { error: 'Aucune donnée valide trouvée dans le fichier' },
        { status: 400 }
      );
    }

    // Se connecter à MongoDB
    await connectToDatabase();
    
    // Insérer les données dans la base
    await AccessLog.insertMany(parsedData);

    return NextResponse.json({
      message: `Importation réussie : ${parsedData.length} entrées importées pour EMERAUDE DASHI`,
      count: parsedData.length
    });
    
  } catch (error) {
    console.error('Erreur lors de l\'importation CSV:', error);
    return NextResponse.json(
      { error: 'Erreur lors du traitement du fichier CSV' },
      { status: 500 }
    );
  }
} 