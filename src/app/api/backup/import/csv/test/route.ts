import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { access_logs_event_type, access_logs_person_type } from '@prisma/client';

export async function POST(request: Request) {
  try {
    // 1. Test de la connexion à la base de données
    console.log('Test 1: Connexion à la base de données');
    const testConnection = await prisma.$queryRaw`SELECT 1`;
    console.log('Résultat test connexion:', testConnection);

    // 2. Test de la structure de la table access_logs
    console.log('Test 2: Structure de la table access_logs');
    const tableInfo = await prisma.$queryRaw`
      DESCRIBE access_logs
    `;
    console.log('Structure de la table:', tableInfo);

    // 3. Test d'insertion d'une ligne de test
    console.log('Test 3: Insertion d\'une ligne de test');
    const testData = {
      badge_number: 'TEST123',
      person_type: access_logs_person_type.employee,
      event_date: new Date(),
      event_time: new Date().toTimeString().split(' ')[0],
      reader: 'Test Reader',
      terminal: 'Test Terminal',
      event_type: access_logs_event_type.entry,
      direction: 'in',
      full_name: 'Test User',
      group_name: 'Test Group',
      processed: false,
      created_at: new Date(),
      raw_event_type: 'Test Event'
    };

    const insertedRecord = await prisma.access_logs.create({
      data: testData
    });
    console.log('Ligne de test insérée:', insertedRecord);

    // 4. Vérification de l'insertion
    console.log('Test 4: Vérification de l\'insertion');
    const verifyRecord = await prisma.access_logs.findUnique({
      where: { id: insertedRecord.id }
    });
    console.log('Enregistrement vérifié:', verifyRecord);

    // 5. Nettoyage de la ligne de test
    console.log('Test 5: Nettoyage de la ligne de test');
    await prisma.access_logs.delete({
      where: { id: insertedRecord.id }
    });

    return NextResponse.json({
      message: 'Tests terminés avec succès',
      results: {
        connection: 'OK',
        tableStructure: tableInfo,
        testInsert: insertedRecord,
        verifyInsert: verifyRecord,
        cleanup: 'OK'
      }
    });

  } catch (error) {
    console.error('Erreur lors des tests:', error);
    return NextResponse.json(
      { 
        error: 'Erreur lors des tests',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 