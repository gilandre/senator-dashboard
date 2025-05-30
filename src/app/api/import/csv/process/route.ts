import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import fs from 'fs';
import { parse } from 'csv-parse';
import { PrismaClient, access_logs_person_type } from '@prisma/client';
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

// Convertir une date française en format ISO avec gestion d'erreurs
const convertFrenchDateToISO = (dateStr: string): string => {
  try {
    // Vérifier si le format est déjà ISO (YYYY-MM-DD)
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return dateStr;
    }
    
    // Format français DD/MM/YYYY
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
      const [day, month, year] = dateStr.split('/');
      // Vérifier que les valeurs sont valides
      const dayNum = parseInt(day, 10);
      const monthNum = parseInt(month, 10);
      const yearNum = parseInt(year, 10);
      
      if (dayNum < 1 || dayNum > 31 || monthNum < 1 || monthNum > 12 || yearNum < 2000 || yearNum > 2100) {
        console.warn(`Date invalide: ${dateStr}, utilisation de la date courante`);
        return new Date().toISOString().split('T')[0];
      }
      
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    
    // Format américain MM/DD/YYYY
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
      const parts = dateStr.split('/');
      // Déterminer si c'est DD/MM ou MM/DD en fonction des valeurs
      // Si le premier nombre est > 12, c'est probablement un jour
      const firstNum = parseInt(parts[0], 10);
      if (firstNum > 12) {
        // Format DD/MM/YYYY
        return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      } else {
        // Format MM/DD/YYYY
        return `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
      }
    }
    
    // Autres formats de date possibles: YYYY/MM/DD
    if (/^\d{4}\/\d{2}\/\d{2}$/.test(dateStr)) {
      const [year, month, day] = dateStr.split('/');
      return `${year}-${month}-${day}`;
    }
    
    // Si aucun format reconnu, logger et utiliser la date courante
    console.warn(`Format de date non reconnu: ${dateStr}, utilisation de la date courante`);
    return new Date().toISOString().split('T')[0];
  } catch (error) {
    console.error(`Erreur lors de la conversion de la date: ${dateStr}`, error);
    return new Date().toISOString().split('T')[0];
  }
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
    // Rechercher la date dans différents champs possibles
    const dateStr = 
      record['Date évènements'] || 
      record['Date'] || 
      record['Event Date'] || 
      record['event_date'] || '';
    
    // Vérifier si la date contient aussi l'heure
    if (dateStr.includes(' ')) {
      // Format DD/MM/YYYY HH:MM:SS ou similaire
      const [datePart] = dateStr.split(' ');
      return convertFrenchDateToISO(datePart);
    }
    
    return dateStr ? convertFrenchDateToISO(dateStr) : new Date().toISOString().split('T')[0];
  };

  const getEventTime = () => {
    // Rechercher l'heure dans différents champs possibles
    let rawTime = 
      record['Heure évènements'] || 
      record['Heure'] || 
      record['Time'] || 
      record['event_time'];
    
    // Vérifier si la date contient aussi l'heure
    const dateTimeStr = 
      record['Date évènements'] || 
      record['Date'] || 
      record['Event Date'] || 
      record['event_date'] || '';
    
    if (dateTimeStr.includes(' ')) {
      // Extraire la partie heure
      const parts = dateTimeStr.split(' ');
      if (parts.length > 1 && !rawTime) {
        rawTime = parts[1];
      }
    }
    
    // Si aucune heure trouvée, utiliser 00:00:00
    if (!rawTime) {
      console.warn('Aucune heure trouvée dans l\'enregistrement, utilisation de 00:00:00');
      return '00:00:00';
    }
    
    // Normaliser le format avec secondes
    const timeWithSeconds = rawTime.includes(':') 
      ? rawTime.split(':').length === 2
        ? `${rawTime}:00` // Ajouter les secondes si absentes
        : rawTime
      : '00:00:00';
    
    return timeWithSeconds;
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

  const getStatus = () => {
    return record['Statut'] || record['Status'] || record['status'] || '';
  };

  const isVisitor = () => {
    // Règles améliorées pour la détection des visiteurs
    // 1. Vérifier si le champ type est explicitement défini
    const type = record['Type'] || record['Person Type'] || record['person_type'] || '';
    if (type.toLowerCase().includes('visitor') || type.toLowerCase().includes('visiteur')) {
      return true;
    }
    
    // 2. Vérifier le statut (souvent utilisé pour distinguer les visiteurs)
    const status = getStatus();
    if (status.toLowerCase().includes('visiteur') || status.toLowerCase().includes('visitor') || 
        status.toLowerCase().includes('extern') || status.toLowerCase().includes('temp')) {
      return true;
    }
    
    // 3. Vérifier les préfixes de badge (souvent V-xxxx pour les visiteurs)
    const badge = getBadgeNumber();
    if (badge.startsWith('V-') || badge.startsWith('VIS-') || badge.startsWith('VISIT-')) {
      return true;
    }
    
    // 4. Vérifier le groupe/département
    const group = getGroup();
    if (group.toLowerCase().includes('visit') || group.toLowerCase().includes('extern') || 
        group.toLowerCase().includes('prestataire')) {
      return true;
    }
    
    // Par défaut, considérer comme employé
    return false;
  };

  const getDirection = () => {
    // Règles améliorées pour la détection des entrées/sorties
    // 1. Vérifier le champ direction explicite
    const direction = record['Direction'] || record['direction'] || '';
    if (direction.toLowerCase().includes('in') || direction.toLowerCase().includes('entrée') || 
        direction.toLowerCase().includes('entree')) {
      return 'in';
    }
    if (direction.toLowerCase().includes('out') || direction.toLowerCase().includes('sortie')) {
      return 'out';
    }
    
    // 2. Vérifier le type d'événement qui peut indiquer la direction
    const eventType = getEventType().toLowerCase();
    if (eventType.includes('entrée') || eventType.includes('entree') || eventType.includes('entry')) {
      return 'in';
    }
    if (eventType.includes('sortie') || eventType.includes('exit')) {
      return 'out';
    }
    
    // 3. Analyser le nom du lecteur (par convention, les lecteurs d'entrée/sortie sont souvent identifiés)
    const reader = getReader().toLowerCase();
    if (reader.includes('entrée') || reader.includes('entree') || reader.includes('entry') || 
        reader.includes('in_') || reader.includes('_in') || reader.endsWith('in')) {
      return 'in';
    }
    if (reader.includes('sortie') || reader.includes('exit') || reader.includes('out_') || 
        reader.includes('_out') || reader.endsWith('out')) {
      return 'out';
    }
    
    // Par défaut, considérer comme entrée (plus courant)
    return 'in';
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
          // Créer l'enregistrement d'accès avec une gestion améliorée des dates
          const eventDateObj = (() => {
            try {
              // S'assurer que la date est bien formatée
              if (!record.eventDate || !record.eventDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
                console.warn(`Format de date invalide: "${record.eventDate}", utilisation de la date courante`);
                return new Date();
              }
              // Créer un objet Date à partir de la date (en milieu de journée pour éviter les problèmes de fuseau horaire)
              return new Date(`${record.eventDate}T12:00:00.000Z`);
            } catch (error) {
              console.error(`Erreur lors de la création de l'objet Date pour la date: ${record.eventDate}`, error);
              return new Date();
            }
          })();
          
          // Créer un objet Date pour l'heure avec gestion des erreurs
          const eventTimeObj = (() => {
            try {
              // Vérifier le format de l'heure
              if (!record.eventTime || !record.eventTime.match(/^\d{2}:\d{2}(:\d{2})?$/)) {
                console.warn(`Format d'heure invalide: "${record.eventTime}", utilisation de 00:00:00`);
                return new Date('1970-01-01T00:00:00.000Z');
              }
              
              // Normaliser le format avec secondes si nécessaire
              const timeWithSeconds = record.eventTime.split(':').length === 2 
                ? `${record.eventTime}:00` 
                : record.eventTime;
              
              // Utiliser une date fixe (1970-01-01) et UTC pour éviter les problèmes de fuseau horaire
              return new Date(`1970-01-01T${timeWithSeconds}.000Z`);
            } catch (error) {
              console.error(`Erreur lors de la création de l'objet Date pour l'heure: ${record.eventTime}`, error);
              return new Date('1970-01-01T00:00:00.000Z');
            }
          })();
          
          const accessLogData = {
            badge_number: record.badgeNumber,
            person_type: record.isVisitor ? ('visitor' as access_logs_person_type) : ('employee' as access_logs_person_type),
            event_date: eventDateObj,
            event_time: eventTimeObj,
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

          // Afficher des logs détaillés pour le débogage
          console.log(`[DEBUG] Insertion: Badge=${record.badgeNumber}, Date=${record.eventDate}, Time=${record.eventTime}`);
          console.log(`[DEBUG] Objets Date: event_date=${eventDateObj.toISOString()}, event_time=${eventTimeObj.toISOString()}`);

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
  const requiredColumns = ['Numéro de badge', 'Badge Number', 'badge_number', 'Date', 'Event Date', 'event_date', 'Heure évènements'];
  const hasRequiredColumns = requiredColumns.some(col => 
    header.some(h => h.trim().toLowerCase() === col.toLowerCase())
  );
  
  // Additional time format validation
  const timeColumns = ['Heure évènements', 'Event Time'];
  const hasValidTimeFormat = header.some(h => 
    timeColumns.includes(h) && 
    content.split('\n').slice(1).every(line => 
      /^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/.test(line.split(delimiter)[header.indexOf(h)])
    )
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
    employees: 0,
    visitors: 0,
    entriesCount: 0,
    exitsCount: 0,
    totalRecords: 0,
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
          
          // Incrémenter les compteurs pour les types
          if (normalizedRecord.isVisitor) {
            stats.visitors++;
          } else {
            stats.employees++;
          }
          
          // Incrémenter les compteurs pour les directions
          if (normalizedRecord.direction === 'in') {
            stats.entriesCount++;
          } else if (normalizedRecord.direction === 'out') {
            stats.exitsCount++;
          }
          
          currentBatch.push(normalizedRecord);
          stats.totalRecords++;

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
  let datePart = '';
  let timePart = '';
  
  // Vérifier si la date contient également l'heure (format: "DD/MM/YYYY HH:MM:SS")
  if (row['Date évènements'].includes(' ')) {
    const parts = row['Date évènements'].split(' ');
    datePart = parts[0];
    timePart = parts[1];
  } else {
    // Si la date et l'heure sont dans des champs séparés
    datePart = row['Date évènements'];
    timePart = row['Heure évènements'] || '00:00:00';
  }
  
  if (!datePart) {
    console.warn('Ligne ignorée: partie date manquante', row);
    return false;
  }

  // Valider le format de la date
  let isValidDate = false;
  
  // Format français (DD/MM/YYYY)
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(datePart)) {
    isValidDate = true;
  }
  // Format ISO (YYYY-MM-DD)
  else if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
    isValidDate = true;
  }
  // Format américain (MM/DD/YYYY) - plus difficile à détecter avec certitude
  else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(datePart)) {
    isValidDate = true;
  }
  
  if (!isValidDate) {
    console.warn(`Ligne ignorée: format de date invalide (${datePart})`, row);
    return false;
  }

  // Valider le format de l'heure
  if (timePart) {
    const timeRegex = /^(\d{2}:\d{2})(:\d{2})?$/;
    if (!timeRegex.test(timePart)) {
      console.warn(`Ligne ignorée: format d'heure invalide (${timePart})`, row);
      return false;
    }

    // Normaliser le format d'heure si nécessaire (ajouter les secondes si absentes)
    if (timePart.split(':').length === 2) {
      row['Heure évènements'] = `${timePart}:00`;
    } else {
      row['Heure évènements'] = timePart;
    }
  } else {
    // Si aucune heure fournie, utiliser 00:00:00 par défaut
    row['Heure évènements'] = '00:00:00';
  }

  // Convertir la date en format ISO pour validation
  let isoDate = '';
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(datePart)) {
    // Format français
    const [day, month, year] = datePart.split('/');
    isoDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  } else if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
    // Format ISO
    isoDate = datePart;
  } else {
    // Autre format, tenter une conversion approximative
    try {
      const parts = datePart.split('/');
      if (parts.length === 3) {
        if (parts[2].length === 4) {
          // Probablement DD/MM/YYYY ou MM/DD/YYYY
          const year = parts[2];
          // Si le premier nombre est > 12, c'est probablement un jour
          if (parseInt(parts[0], 10) > 12) {
            isoDate = `${year}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
          } else {
            isoDate = `${year}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
          }
        }
      }
    } catch (error) {
      console.warn(`Impossible de convertir la date: ${datePart}`, error);
      return false;
    }
  }
  
  // Valider que la date n'est pas dans le futur
  if (isoDate) {
    try {
      const fullTimeFormatted = timePart.split(':').length === 2 ? `${timePart}:00` : timePart;
      const eventDate = new Date(`${isoDate}T${fullTimeFormatted}.000Z`);
      
      if (eventDate > new Date()) {
        console.warn(`Ligne ignorée: date dans le futur (${isoDate} ${fullTimeFormatted})`, row);
        return false;
      }
    } catch (error) {
      console.warn(`Erreur lors de la validation de la date: ${isoDate}`, error);
      return false;
    }
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
    // Vérifier le Content-Type
    const contentType = request.headers.get('Content-Type');
    if (!contentType?.includes('application/json')) {
      return Response.json({ error: 'Content-Type must be application/json' }, { status: 415 });
    }

    // Essayer de parser le JSON
    let body;
    try {
      body = await request.json();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid JSON format';
      return Response.json({ 
        error: 'Invalid request body', 
        details: message 
      }, { status: 400 });
    }

    const { filePath, fileContent } = body;
    if (typeof filePath !== 'string' || typeof fileContent !== 'string') {
      return Response.json({
        error: 'Invalid field types',
        details: 'Both filePath and fileContent must be strings'
      }, { status: 400 });
    }
    
    if (!filePath || !fileContent || typeof fileContent !== 'string' || fileContent.trim().length === 0) {
      return Response.json({ 
        error: 'Invalid CSV content', 
        details: 'File content must be a non-empty CSV string' 
      }, { status: 400 });
    }

    // Validate CSV header format
    const firstLine = fileContent.split('\n')[0];
    if (!firstLine || !firstLine.includes(';')) {
      return Response.json({
        error: 'Invalid CSV format',
        details: 'CSV header is missing or incorrect delimiter used (expected semicolon)'
      }, { status: 400 });
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

// Cette fonction n'est pas utilisée actuellement mais conservée pour référence
// Si besoin de la réactiver, décommenter et corriger les imports manquants
/*
const processCSV = async (filePath: string) => {
  const results = [];
  
  await new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(parse({ delimiter: ';', columns: true }))
      .on('data', (row) => {
        try {
          const processedRow = {
            'Numéro de badge': row['Numéro de badge']?.trim() || null,
            'Date évènements': row['Date évènements']?.trim() || null,
            'Heure évènements': row['Heure évènements']?.trim() || null,
            'Lecteur': row['Lecteur']?.trim() || null,
            'Nom': row['Nom']?.trim() || '',
            'Prénom': row['Prénom']?.trim() || '',
            'Statut': row['Statut']?.trim() || 'Inconnu',
            'Groupe': row['Groupe']?.trim() || 'Non spécifié'
          };

          validateCSVRecord(processedRow);
          results.push(processedRow);
        } catch (error) {
          console.error('Erreur ligne CSV:', { row, error });
        }
      })
      .on('end', resolve);
  });

  return results;
};
*/