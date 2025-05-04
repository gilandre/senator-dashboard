import Papa from 'papaparse';
import { format, parse } from 'date-fns';
import { fr } from 'date-fns/locale';

type SenatorFXRow = {
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
};

export type ParsedAccessLog = {
  badgeNumber: string;
  eventDate: Date;
  eventTime: string;
  central: string;
  reader: string;
  eventType: string;
  lastName: string;
  firstName: string;
  status: string;
  group: string;
  validityStartDate: Date;
  creationDate: Date;
};

/**
 * Parse un fichier CSV SENATOR FX et retourne les données structurées
 */
export async function parseSenatorCSV(fileContent: string): Promise<ParsedAccessLog[]> {
  return new Promise((resolve, reject) => {
    Papa.parse<SenatorFXRow>(fileContent, {
      header: true,
      delimiter: ';',
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const parsedData = results.data
            .filter(row => row['Numéro de badge'] && row['Date évènements'])
            .map(row => ({
              badgeNumber: row['Numéro de badge'],
              eventDate: parseDate(row['Date évènements']),
              eventTime: row['Heure évènements'],
              central: row['Centrale'],
              reader: row['Lecteur'],
              eventType: row['Nature Evenement'],
              lastName: row['Nom'] || '',
              firstName: row['Prénom'] || '',
              status: row['Statut'],
              group: row['Groupe'],
              validityStartDate: parseDate(row['Date de début de validité']),
              creationDate: parseDate(row['Date de création']),
            }));
          
          resolve(parsedData);
        } catch (error) {
          reject(new Error(`Erreur lors du parsing du CSV: ${error}`));
        }
      },
      error: (error: Error) => {
        reject(new Error(`Erreur PapaParse: ${error.message}`));
      }
    });
  });
}

/**
 * Parse une date au format français (DD/MM/YYYY) en objet Date
 */
function parseDate(dateStr: string): Date {
  if (!dateStr) return new Date();
  
  // Si la date contient une heure, on la supprime
  if (dateStr.includes(' ')) {
    dateStr = dateStr.split(' ')[0];
  }
  
  // Parse la date au format français DD/MM/YYYY
  try {
    const [day, month, year] = dateStr.split('/').map(Number);
    return new Date(year, month - 1, day);
  } catch (error) {
    console.error(`Erreur de parsing de la date: ${dateStr}`, error);
    return new Date();
  }
} 