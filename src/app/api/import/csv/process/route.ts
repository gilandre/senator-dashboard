import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { connectToDatabase } from '@/lib/mongodb';
import AccessLog from '@/models/AccessLog';
import Employee from '@/models/Employee';
import Visitor from '@/models/Visitor';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Fonction pour convertir les dates au format français DD/MM/YYYY en format ISO
const convertFrenchDateToISO = (dateStr: string): string => {
  if (!dateStr) return '';
  
  // Vérifier si la date est au format DD/MM/YYYY
  const dateMatch = dateStr.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (dateMatch) {
    const [_, day, month, year] = dateMatch;
    return `${year}-${month}-${day}`;
  }
  
  return dateStr;
};

// Normaliser et valider un enregistrement
const normalizeRecord = (record: any) => {
  // Vérifier que le record est un objet valide
  if (!record || typeof record !== 'object') {
    console.warn('Invalid record received:', record);
    return {
      badgeNumber: 'INVALID',
      eventDate: new Date().toISOString().split('T')[0],
      eventTime: new Date().toISOString().split('T')[1].substring(0, 8),
      isVisitor: false,
      direction: 'unknown',
    };
  }

  // Normaliser les noms des champs (insensible à la casse)
  const normalizedRecord: Record<string, any> = {};
  Object.entries(record).forEach(([key, value]) => {
    // Ne pas inclure les champs vides ou non définis
    if (value !== undefined && value !== null && value !== '') {
      normalizedRecord[key.toLowerCase().trim()] = value;
    }
  });

  // Extraire les champs avec prise en charge de différentes variantes
  const getBadgeNumber = () => {
    return normalizedRecord.badgenumber || normalizedRecord.badge || normalizedRecord['numéro de badge'] || 
           normalizedRecord.numérobadge || normalizedRecord.numéro || normalizedRecord.numero || 
           normalizedRecord.cardnumber || normalizedRecord.badgeid || 'UNKNOWN';
  };

  const getEventDate = () => {
    // Trouver la date dans différents formats possibles
    let dateValue = normalizedRecord.eventdate || normalizedRecord['date évènements'] || normalizedRecord.date || 
                    normalizedRecord.jour || normalizedRecord.datetime?.split(' ')[0] || 
                    normalizedRecord.dateevt;
    
    // Si la date n'est pas trouvée, utiliser la date actuelle
    if (!dateValue) {
      return new Date().toISOString().split('T')[0];
    }
    
    // Si la date inclut l'heure (comme "02/12/2024 10:34:02"), extraire seulement la partie date
    if (dateValue.includes(' ')) {
      dateValue = dateValue.split(' ')[0];
    }
    
    // Normaliser la date au format YYYY-MM-DD
    try {
      if (dateValue.includes('/')) {
        const parts = dateValue.split('/');
        if (parts.length === 3) {
          const [day, month, year] = parts;
          return `${year.length === 2 ? '20'+year : year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        }
      } else if (dateValue.includes('-')) {
        // Vérifier si c'est déjà au format YYYY-MM-DD
        const parts = dateValue.split('-');
        if (parts.length === 3) {
          if (parts[0].length === 4) {
            return dateValue; // Déjà au bon format
          } else {
            // Format DD-MM-YYYY
            const [day, month, year] = parts;
            return `${year.length === 2 ? '20'+year : year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
          }
        }
      }
      
      // Si on arrive ici, le format n'est pas reconnu, retourner la valeur telle quelle
      return dateValue;
    } catch (error) {
      console.warn('Error normalizing date:', dateValue, error);
      return new Date().toISOString().split('T')[0]; // Date par défaut en cas d'erreur
    }
  };

  const getEventTime = () => {
    // Trouver l'heure dans différents formats possibles
    let timeValue = normalizedRecord.eventtime || normalizedRecord['heure évènements'] || normalizedRecord.time || 
                    normalizedRecord.heure || normalizedRecord.datetime?.split(' ')[1] || 
                    normalizedRecord.timeevt;
    
    // Si l'heure n'est pas trouvée, utiliser l'heure actuelle
    if (!timeValue) {
      return new Date().toISOString().split('T')[1].substring(0, 8);
    }
    
    return timeValue;
  };

  const getFirstName = () => {
    return normalizedRecord.firstname || normalizedRecord.prénom || normalizedRecord.prenom || '';
  };

  const getLastName = () => {
    return normalizedRecord.lastname || normalizedRecord.nom || '';
  };

  const getFullName = () => {
    const firstName = getFirstName();
    const lastName = getLastName();
    if (firstName && lastName) {
      return `${firstName} ${lastName}`;
    } else if (firstName) {
      return firstName;
    } else if (lastName) {
      return lastName;
    } else {
      return normalizedRecord.fullname || normalizedRecord.name || normalizedRecord.nom_complet || '';
    }
  };

  // Extraire les autres champs avec gestion des cas non définis
  const getController = () => {
    return normalizedRecord.controller || normalizedRecord.centrale || 
           normalizedRecord.contrôleur || normalizedRecord.controleur || '';
  };

  const getReader = () => {
    return normalizedRecord.reader || normalizedRecord.lecteur || '';
  };

  const getEventType = () => {
    const type = normalizedRecord.eventtype || normalizedRecord['nature evenement'] || 
                 normalizedRecord.type || normalizedRecord.event || '';
    // Normaliser le type d'événement
    if (/entr[ée]e|arrival|in|input/i.test(type)) {
      return 'entry';
    } else if (/sortie|departure|out|output/i.test(type)) {
      return 'exit';
    }
    return type;
  };

  const getDepartment = () => {
    return normalizedRecord.department || normalizedRecord.département || normalizedRecord.service || '';
  };

  const getGroup = () => {
    return normalizedRecord.group || normalizedRecord.groupe || '';
  };

  // Déterminer si c'est un visiteur basé sur le groupe ou autre champ
  const isVisitor = () => {
    const group = getGroup().toLowerCase();
    return group.includes('visit') || group.includes('extern') || 
           normalizedRecord.isvisitor === true || normalizedRecord.visitor === true ||
           normalizedRecord.isvisitor === 'true' || normalizedRecord.visitor === 'true' ||
           normalizedRecord.statut?.toLowerCase().includes('visiteur');
  };

  // Déterminer la direction (entrée/sortie) basée sur le type d'événement
  const getDirection = () => {
    const type = getEventType().toLowerCase();
    if (type === 'entry' || /entr[ée]e|in|input|arriv[ée]e/i.test(type)) {
      return 'in';
    } else if (type === 'exit' || /sortie|out|output|d[ée]part/i.test(type)) {
      return 'out';
    }
    return 'unknown';
  };

  // Données normalisées
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
    rawData: record,
  };
};

// Enregistrer ou mettre à jour un employé/visiteur
const savePersonData = async (record: any) => {
  try {
    // Si le badge n'existe pas, on ne peut pas associer l'enregistrement
    if (!record.badgeNumber) return null;
    
    // Données communes pour employés et visiteurs
    const personData = {
      badgeNumber: record.badgeNumber,
      firstName: record.firstName || '',
      lastName: record.lastName || '',
      fullName: record.fullName || '',
      department: record.department || '',
      status: record.status || '',
      group: record.group || '',
      updatedAt: new Date()
    };
    
    // Si c'est un visiteur
    if (record.isVisitor) {
      // Rechercher un visiteur existant par numéro de badge
      const existingVisitor = await Visitor.findOne({ badgeNumber: record.badgeNumber });
      
      if (existingVisitor) {
        // Mettre à jour le visiteur existant
        await Visitor.findByIdAndUpdate(existingVisitor._id, personData);
        return existingVisitor._id;
      } else {
        // Créer un nouveau visiteur
        const newVisitor = new Visitor({
          ...personData,
          createdAt: new Date()
        });
        const savedVisitor = await newVisitor.save();
        return savedVisitor._id;
      }
    } 
    // Si c'est un employé
    else {
      // Rechercher un employé existant par numéro de badge
      const existingEmployee = await Employee.findOne({ badgeNumber: record.badgeNumber });
      
      if (existingEmployee) {
        // Mettre à jour l'employé existant
        await Employee.findByIdAndUpdate(existingEmployee._id, personData);
        return existingEmployee._id;
      } else {
        // Créer un nouvel employé
        const newEmployee = new Employee({
          ...personData,
          createdAt: new Date()
        });
        const savedEmployee = await newEmployee.save();
        return savedEmployee._id;
      }
    }
  } catch (error) {
    console.error('Error saving person data:', error);
    return null;
  }
};

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Décodez les données JSON du corps de la requête
    const { filePath } = await req.json();

    if (!filePath) {
      return NextResponse.json({ error: 'File path is required' }, { status: 400 });
    }

    // Vérifiez si le fichier existe
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // Traitez le fichier CSV
    const stats = await processCSVFile(filePath);

    // Retournez un message de succès
    return NextResponse.json({
      message: 'CSV file processed successfully',
      stats,
    });

  } catch (error) {
    console.error('Error processing CSV file:', error);
    return NextResponse.json({ 
      error: 'Failed to process CSV file',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Traitement du fichier CSV
async function processCSVFile(filePath: string) {
  // Connexion à la base de données
  await connectToDatabase();

  // Lisez le contenu du fichier
  const fileContent = fs.readFileSync(filePath, { encoding: 'utf-8' });

  // Statistiques pour le rapport
  const stats = {
    totalRecords: 0,
    successfullyProcessed: 0,
    skippedRecords: 0,
    errorRecords: 0,
    duplicates: 0,
    employees: 0,
    visitors: 0,
    entriesCount: 0,
    exitsCount: 0,
    warnings: [] as string[],
  };

  // Analysez le CSV
  return new Promise<typeof stats>((resolve, reject) => {
    const records: any[] = [];
    try {
      // Limiter à 12 colonnes max
      const MAX_COLUMNS = 12;

      // Prétraiter le contenu pour s'assurer qu'il n'y a que 12 colonnes
      const lines = fileContent.split('\n');
      const cleanedLines: string[] = [];
      
      if (lines.length > 0) {
        // Traiter l'en-tête - limiter à 12 colonnes
        const headerLine = lines[0];
        const headerColumns = headerLine.split(';');
        const trimmedHeader = headerColumns.slice(0, MAX_COLUMNS).join(';');
        cleanedLines.push(trimmedHeader);
        
        // Traiter les lignes de données - limiter à 12 colonnes
        for (let i = 1; i < lines.length; i++) {
          if (lines[i].trim() === '') continue;
          const dataColumns = lines[i].split(';');
          const trimmedData = dataColumns.slice(0, MAX_COLUMNS).join(';');
          cleanedLines.push(trimmedData);
        }
      }
      
      // Réunir les lignes nettoyées
      const cleanedContent = cleanedLines.join('\n');

      const parser = parse(cleanedContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        relax_column_count: true, // Permet des lignes avec un nombre de colonnes différent
        delimiter: ';', // Explicitement définir le délimiteur
        from_line: 1, // Commencer à la première ligne
        // Ignorer les erreurs et essayer de continuer
        on_record: (record, { lines }) => {
          try {
            stats.totalRecords++;
            
            // Vérifier si le record est un objet valide
            if (!record || typeof record !== 'object' || Object.keys(record).length === 0) {
              stats.skippedRecords++;
              stats.warnings.push(`Ligne ${lines}: Format de ligne invalide`);
              return null; // Ignorer cet enregistrement
            }
            
            // Vérifier si le record contient les champs requis
            const badgeNumber = record.badgeNumber || record.Badge || record.badge || record['Numéro de badge'];
            const eventDate = record.eventDate || record.date || record.Date || record['Date évènements'];
            const eventTime = record.eventTime || record.time || record.Time || record.heure || record.Heure || record['Heure évènements'];
            
            // Si certains champs requis sont manquants, les signaler mais continuer
            if (!badgeNumber) {
              stats.skippedRecords++;
              stats.warnings.push(`Ligne ${lines}: Numéro de badge manquant`);
              return null; // Ignorer cet enregistrement
            }
            
            if (!eventDate) {
              stats.skippedRecords++;
              stats.warnings.push(`Ligne ${lines}: Date d'événement manquante`);
              return null; // Ignorer cet enregistrement
            }
            
            if (!eventTime) {
              stats.skippedRecords++;
              stats.warnings.push(`Ligne ${lines}: Heure d'événement manquante`);
              return null; // Ignorer cet enregistrement
            }
            
            // Nettoyer les données - enlever les champs vides ou non définis
            Object.keys(record).forEach(key => {
              if (record[key] === '' || record[key] === undefined || record[key] === null) {
                delete record[key];
              }
            });
            
            return record; // Retourner l'enregistrement pour qu'il soit traité
          } catch (error) {
            stats.errorRecords++;
            stats.warnings.push(`Ligne ${lines}: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
            return null; // Ignorer cet enregistrement en cas d'erreur
          }
        }
      });

      parser.on('readable', function () {
        let record;
        while ((record = parser.read())) {
          try {
            if (record === null) continue; // Ignorer les enregistrements déjà marqués comme invalides
            
            const normalizedRecord = normalizeRecord(record);
            if (!normalizedRecord) continue; // Ignorer si la normalisation échoue
            
            records.push(normalizedRecord);
            
            // Mettre à jour les statistiques
            if (normalizedRecord.isVisitor) {
              stats.visitors++;
            } else {
              stats.employees++;
            }
            
            if (normalizedRecord.direction === 'in') {
              stats.entriesCount++;
            } else if (normalizedRecord.direction === 'out') {
              stats.exitsCount++;
            }
            
            stats.successfullyProcessed++;
          } catch (error) {
            console.error('Error processing record:', record, error);
            stats.errorRecords++;
            stats.warnings.push(`Erreur de traitement: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
          }
        }
      });

      parser.on('error', function (err) {
        console.error('Error parsing CSV:', err);
        // Ne pas rejeter, mais ajouter aux statistiques et continuer
        stats.errorRecords++;
        stats.warnings.push(`Erreur de parsing CSV: ${err.message}`);
      });

      parser.on('end', async function () {
        try {
          if (records.length > 0) {
            // Limiter les warnings à 10 pour éviter une réponse trop volumineuse
            stats.warnings = stats.warnings.slice(0, 10);
            if (stats.warnings.length < stats.skippedRecords + stats.errorRecords) {
              stats.warnings.push(`... et ${stats.skippedRecords + stats.errorRecords - stats.warnings.length} autres avertissements non affichés`);
            }
          
            // Insérer les enregistrements dans la base de données
            try {
              const result = await AccessLog.insertMany(records, { ordered: false });
              console.log(`${result.length} records inserted successfully`);
            } catch (error: any) {
              // Gérer les erreurs de duplication MongoDB
              if (error.code === 11000 && error.writeErrors) {
                const duplicateCount = error.writeErrors.length;
                stats.duplicates = duplicateCount;
                stats.successfullyProcessed -= duplicateCount;
                console.log(`${duplicateCount} duplicate records found and skipped.`);
              } else {
                console.error('Error inserting records:', error);
                stats.errorRecords += records.length - stats.successfullyProcessed;
                stats.warnings.push(`Erreur d'insertion en base de données: ${error.message}`);
              }
            }
            
            // Supprimer le fichier temporaire après traitement
            try {
              fs.unlinkSync(filePath);
            } catch (error) {
              console.error('Error deleting temporary file:', error);
            }
            
            return resolve(stats);
          } else {
            console.log('No valid records to insert');
            stats.warnings.push('Aucun enregistrement valide à insérer');
            
            // Supprimer le fichier temporaire
            try {
              fs.unlinkSync(filePath);
            } catch (error) {
              console.error('Error deleting temporary file:', error);
            }
            
            return resolve(stats);
          }
        } catch (error: any) {
          console.error('Error in CSV processing:', error);
          stats.errorRecords++;
          stats.warnings.push(`Erreur générale: ${error.message}`);
          return resolve(stats);
        }
      });
    } catch (error) {
      console.error('Error parsing CSV:', error);
      stats.errorRecords++;
      stats.warnings.push(`Erreur de parsing CSV: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
      return resolve(stats);
    }
  });
} 