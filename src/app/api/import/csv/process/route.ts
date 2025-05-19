import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import fs from 'fs';
import { parse } from 'csv-parse';
import { PrismaClient } from '@prisma/client';
import { validateCSVRecord } from '@/lib/schemas/csv-schema';
import { NormalizedRecord, AccessLogData, ProcessingStats, ProcessingError, ProcessingOptions } from '@/types/csv-import';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { afterImport } from '../process-hooks';

const prismaClient = new PrismaClient();

// Types pour les enums qui causent des erreurs de linter
type AccessLogsPersonType = 'employee' | 'visitor' | 'contractor';
type AccessLogsEventType = 
  'entry' | 'exit' | 'access_denied' | 'user_accepted' | 'user_rejected' | 
  'alarm' | 'system' | 'door_forced' | 'door_held' | 'door_locked' | 
  'door_unlocked' | 'door_opened' | 'door_closed' | 'unknown';

// Fonction pour logger les activités
async function logActivity(data: { action: string, details: string, ipAddress: string }) {
  try {
    await prismaClient.user_activities.create({
      data: {
        action: data.action,
        details: data.details,
        ip_address: data.ipAddress,
        timestamp: new Date()
      }
    });
  } catch (error) {
    console.error('Error logging activity:', error);
  }
}

// Convertir une date française en format ISO
const convertFrenchDateToISO = (dateStr: string): string => {
  const [day, month, year] = dateStr.split('/');
  return `${year}-${month}-${day}`;
};

// Normaliser et valider un enregistrement
const normalizeRecord = (record: any): NormalizedRecord => {
  // Vérifier que le record est un objet valide
  if (!record || typeof record !== 'object') {
    console.warn('Invalid record received:', record);
    return {
      badgeNumber: 'INVALID',
      eventDate: new Date().toISOString().split('T')[0],
      eventTime: new Date().toISOString().split('T')[1].substring(0, 8),
      isVisitor: false,
      direction: 'unknown',
      eventType: 'unknown',
      rawData: record
    };
  }

  // Fonctions d'extraction avec gestion des variations de noms de colonnes
  const getBadgeNumber = () => {
    return record['Numéro de badge'] || record['Badge Number'] || record['badge_number'] || '';
  };

  const getEventDate = () => {
    const dateStr = record['Date'] || record['Event Date'] || record['event_date'] || '';
    return dateStr ? convertFrenchDateToISO(dateStr) : new Date().toISOString().split('T')[0];
  };

  const getEventTime = () => {
    return record['Heure'] || record['Time'] || record['event_time'] || '00:00:00';
  };

  const getFirstName = () => {
    return record['Prénom'] || record['First Name'] || record['first_name'] || '';
  };

  const getLastName = () => {
    return record['Nom'] || record['Last Name'] || record['last_name'] || '';
  };

  const getFullName = () => {
    const firstName = getFirstName();
    const lastName = getLastName();
    return firstName && lastName ? `${firstName} ${lastName}` : '';
  };

  const getController = () => {
    return record['Contrôleur'] || record['Controller'] || record['controller'] || '';
  };

  const getReader = () => {
    return record['Lecteur'] || record['Reader'] || record['reader'] || '';
  };

  const getEventType = () => {
    return record['Nature Evenement'] || record['Event Type'] || record['event_type'] || 'unknown';
  };

  const getDepartment = () => {
    return record['Département'] || record['Department'] || record['department'] || '';
  };

  const getGroup = () => {
    return record['Groupe'] || record['Group'] || record['group'] || '';
  };

  const isVisitor = () => {
    const type = record['Type'] || record['Person Type'] || record['person_type'] || '';
    return type.toLowerCase().includes('visitor') || type.toLowerCase().includes('visiteur');
  };

  const getDirection = () => {
    const direction = record['Direction'] || record['direction'] || '';
    return direction.toLowerCase().includes('in') || direction.toLowerCase().includes('entrée') ? 'in' : 'out';
  };

  const getStatus = () => {
    return record['Statut'] || record['Status'] || record['status'] || '';
  };

  // Retourner l'enregistrement normalisé
  return {
    badgeNumber: getBadgeNumber(),
    firstName: getFirstName(),
    lastName: getLastName(),
    fullName: getFullName(),
    eventDate: getEventDate(),
    eventTime: getEventTime(),
    controller: getController(),
    reader: getReader(),
    eventType: getEventType(),
    department: getDepartment(),
    group: getGroup(),
    isVisitor: isVisitor(),
    direction: getDirection(),
    status: getStatus(),
    rawData: record
  };
};

// Sauvegarder les données de la personne
const savePersonData = async (record: NormalizedRecord) => {
  try {
    if (record.isVisitor) {
      await prismaClient.visitors.upsert({
        where: { badge_number: record.badgeNumber },
        update: {
          first_name: record.firstName || '',
          last_name: record.lastName || '',
          company: record.department || '',
          last_seen: new Date(),
          access_count: { increment: 1 },
          updated_at: new Date()
        },
        create: {
          badge_number: record.badgeNumber,
          first_name: record.firstName || '',
          last_name: record.lastName || '',
          company: record.department || '',
          first_seen: new Date(),
          last_seen: new Date(),
          access_count: 1,
          status: 'active'
        }
      });
    } else {
      await prismaClient.employees.upsert({
        where: { badge_number: record.badgeNumber },
        update: {
          first_name: record.firstName || '',
          last_name: record.lastName || '',
          department: record.department || '',
          updated_at: new Date()
        },
        create: {
          badge_number: record.badgeNumber,
          first_name: record.firstName || '',
          last_name: record.lastName || '',
          department: record.department || '',
          status: 'active'
        }
      });
    }
  } catch (error) {
    console.error('Error saving person data:', error);
    throw error;
  }
};

// Fonction pour mapper les valeurs de event_type vers l'enum
const mapEventType = (rawType: string): AccessLogsEventType => {
  const normalizedType = rawType.toLowerCase().trim();
  
  switch (normalizedType) {
    case 'utilisateur inconnu':
      return 'user_rejected';
    case 'utilisateur accepté':
      return 'user_accepted';
    case 'entrée':
    case 'entree':
      return 'entry';
    case 'sortie':
      return 'exit';
    case 'accès refusé':
    case 'acces refuse':
      return 'access_denied';
    case 'alarme':
      return 'alarm';
    case 'système':
    case 'systeme':
      return 'system';
    case 'porte forcée':
    case 'porte forcee':
      return 'door_forced';
    case 'porte maintenue':
      return 'door_held';
    case 'porte verrouillée':
    case 'porte verrouillee':
      return 'door_locked';
    case 'porte déverrouillée':
    case 'porte deverrouillee':
      return 'door_unlocked';
    case 'porte ouverte':
      return 'door_opened';
    case 'porte fermée':
    case 'porte fermee':
      return 'door_closed';
    default:
      return 'unknown';
  }
};

// Fonction pour traiter les enregistrements par lots
async function processBatch(
  records: NormalizedRecord[],
  prisma: PrismaClient
): Promise<{ success: number; errors: ProcessingError[] }> {
  const errors: ProcessingError[] = [];
  let success = 0;

  try {
    await prisma.$transaction(async (tx) => {
      for (const record of records) {
        try {
          // Créer l'enregistrement d'accès
          const accessLogData = {
            badge_number: record.badgeNumber,
            person_type: record.isVisitor ? 'visitor' : 'employee',
            event_date: new Date(record.eventDate),
            event_time: new Date(`1970-01-01T${record.eventTime}`),
            reader: record.reader || null,
            terminal: record.controller || null,
            event_type: mapEventType(record.eventType || 'unknown'),
            direction: record.direction || null,
            full_name: record.fullName || null,
            group_name: record.group || null,
            processed: false,
            created_at: new Date(),
            raw_event_type: record.eventType || null
          };

          await tx.access_logs.create({ data: accessLogData });
          await savePersonData(record);
          success++;
        } catch (error) {
          console.error('Error processing record:', error);
          errors.push({
            record,
            error: error instanceof Error ? error : new Error('Unknown error'),
            timestamp: new Date()
          });
        }
      }
    });
  } catch (error) {
    console.error('Transaction failed:', error);
    throw error;
  }

  return { success, errors };
}

// Fonction pour détecter le délimiteur CSV
const detectDelimiter = (content: string): string => {
  const firstLine = content.split('\n')[0];
  const delimiters = [',', ';', '\t'];
  const counts = delimiters.map(d => ({
    delimiter: d,
    count: (firstLine.match(new RegExp(d, 'g')) || []).length
  }));
  return counts.reduce((a, b) => a.count > b.count ? a : b).delimiter;
};

// Fonction pour valider le format du fichier CSV
const validateCSVFormat = (content: string, delimiter: string): boolean => {
  const lines = content.split('\n').filter(line => line.trim());
  if (lines.length < 2) return false; // Au moins l'en-tête et une ligne de données

  const header = lines[0].split(delimiter);
  const requiredColumns = ['Numéro de badge', 'Badge Number', 'badge_number', 'Date', 'Event Date', 'event_date'];
  const hasRequiredColumns = requiredColumns.some(col => 
    header.some(h => h.trim().toLowerCase() === col.toLowerCase())
  );

  return hasRequiredColumns;
};

// Fonction principale de traitement optimisée
export async function processCSVFile(
  filePath: string,
  fileContent: string,
  options: ProcessingOptions = {}
): Promise<ProcessingStats> {
  const {
    batchSize = 100,
    validateData = true,
    skipDuplicates = true,
    maxErrors = 1000
  } = options;

  const stats: ProcessingStats = {
    successfullyProcessed: 0,
    errorRecords: 0,
    skippedRecords: 0,
    duplicates: 0,
    warnings: []
  };

  // Détecter le délimiteur
  const delimiter = detectDelimiter(fileContent);
  console.log(`Detected delimiter: ${delimiter}`);

  // Valider le format du fichier
  if (!validateCSVFormat(fileContent, delimiter)) {
    throw new Error('Invalid CSV format: missing required columns');
  }

  const records: NormalizedRecord[] = [];
  let currentBatch: NormalizedRecord[] = [];

  return new Promise<ProcessingStats>((resolve, reject) => {
    const parser = parse({
      delimiter,
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true,
      encoding: 'utf-8'
    });

    parser.on('readable', async function() {
      let record;
      while ((record = parser.read()) !== null) {
        try {
          if (validateData) {
            validateCSVRecord(record);
          }

          const normalizedRecord = normalizeRecord(record);
          currentBatch.push(normalizedRecord);

          if (currentBatch.length >= batchSize) {
            const { success, errors } = await processBatch(currentBatch, prismaClient);
            stats.successfullyProcessed += success;
            stats.errorRecords += errors.length;
            stats.warnings.push(...errors.map(e => e.error.message));
            currentBatch = [];

            if (stats.errorRecords >= maxErrors) {
              parser.end();
              resolve(stats);
              return;
            }
          }
        } catch (error) {
          stats.errorRecords++;
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          stats.warnings.push(`Error processing record: ${errorMessage}`);
          console.error('Error processing record:', error);
        }
      }
    });

    parser.on('error', function(err) {
      console.error('Error parsing CSV:', err);
      stats.errorRecords++;
      stats.warnings.push(`CSV parsing error: ${err.message}`);
      reject(err);
    });

    parser.on('end', async function() {
      try {
        if (currentBatch.length > 0) {
          const { success, errors } = await processBatch(currentBatch, prismaClient);
          stats.successfullyProcessed += success;
          stats.errorRecords += errors.length;
          stats.warnings.push(...errors.map(e => e.error.message));
        }

        resolve(stats);
      } catch (error) {
        reject(error);
      }
    });

    parser.write(fileContent);
    parser.end();
  });
}

interface CSVRow {
  'Numéro de badge': string;
  'Date évènements': string;
  'Heure évènements': string;
  'Centrale': string;
  'Lecteur': string;
  'Nature Evenement': string;
  'Nom': string;
  'Prénom': string;
  'Statut': string;
  'Groupe': string;
  'Date de début de validité': string;
  'Date de création': string;
}

const parseCSV = (content: string): CSVRow[] => {
  const lines = content.split('\n');
  const headers = lines[0].split(';').map(h => h.trim());
  
  return lines.slice(1).map(line => {
    const values = line.split(';').map(v => v.trim());
    const row: any = {};
    
    headers.forEach((header, index) => {
      row[header] = values[index] || null;
    });
    
    return row as CSVRow;
  }).filter(row => row['Numéro de badge'] && row['Date évènements'] && row['Nature Evenement']);
};

const validateRow = (row: CSVRow): boolean => {
  // Vérifier les champs requis
  if (!row['Numéro de badge'] || !row['Date évènements'] || !row['Nature Evenement']) {
    console.warn('Ligne ignorée: champs requis manquants', row);
    return false;
  }

  // Extraire la date et l'heure
  const [datePart, timePart] = row['Date évènements'].split(' ');
  if (!datePart || !timePart) {
    console.warn('Ligne ignorée: format de date/heure invalide', row);
    return false;
  }

  // Valider le format de la date
  const dateRegex = /^\d{2}\/\d{2}\/\d{4}$/;
  if (!dateRegex.test(datePart)) {
    console.warn('Ligne ignorée: format de date invalide', row);
    return false;
  }

  // Valider le format de l'heure
  const timeRegex = /^\d{2}:\d{2}:\d{2}$/;
  if (!timeRegex.test(timePart)) {
    console.warn('Ligne ignorée: format d\'heure invalide', row);
    return false;
  }

  // Valider que la date n'est pas dans le futur
  const [day, month, year] = datePart.split('/');
  const eventDate = new Date(`${year}-${month}-${day}T${timePart}`);
  if (eventDate > new Date()) {
    console.warn('Ligne ignorée: date dans le futur', row);
    return false;
  }

  return true;
};

const mapPersonType = (type: string | undefined): AccessLogsPersonType => {
  if (!type) return 'employee';
  
  const normalizedType = type.toLowerCase().trim();
  switch (normalizedType) {
    case 'employee':
    case 'employé':
      return 'employee';
    case 'visitor':
    case 'visiteur':
      return 'visitor';
    default:
      return 'employee';
  }
};

// Fonction pour générer une signature unique d'un enregistrement pour détecter les doublons
const generateRecordSignature = (row: CSVRow): string => {
  // Utiliser tous les champs importants pour générer une signature unique
  // qui identifiera de manière fiable les entrées identiques
  const [datePart, timePart] = row['Date évènements'].split(' ');
  
  // Normaliser les valeurs pour éviter les faux négatifs dans la détection
  const badge = row['Numéro de badge']?.trim() || '';
  const terminal = row['Centrale']?.trim() || '';
  const reader = row['Lecteur']?.trim() || '';
  const eventType = row['Nature Evenement']?.trim() || '';
  const lastName = row['Nom']?.trim() || '';
  const firstName = row['Prénom']?.trim() || '';
  
  // Construire une signature exhaustive qui couvre tous les champs critiques
  return `${badge}|${datePart}|${timePart}|${terminal}|${reader}|${eventType}|${lastName}|${firstName}`;
};

export async function POST(request: Request) {
  console.log('CSV processing API called');
  
  try {
    // Extraire le corps de la requête
    const body = await request.json();
    const { filePath, fileContent } = body;
    
    if (!filePath || !fileContent) {
      return Response.json({ error: 'File path and content are required' }, { status: 400 });
    }
    
    console.log(`Processing CSV file: ${filePath}`);
    
    // Traiter le fichier CSV
    const stats = await processCSVFile(filePath, fileContent, {
      batchSize: 100,
      validateData: true,
      skipDuplicates: true
    });
    
    // Appliquer les hooks de post-traitement
    console.log('Applying post-import hooks...');
    const hooksResult = await afterImport();
    
    // Enregistrer l'activité d'importation
    await logActivity({
      action: 'CSV_IMPORT',
      details: JSON.stringify({
        filePath,
        stats,
        hooksResult
      }),
      ipAddress: 'API'
    });
    
    return Response.json({
      success: true,
      message: 'CSV processing completed successfully',
      stats,
      postProcessing: hooksResult
    });
    
  } catch (error) {
    console.error('Error processing CSV:', error);
    
    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
} 