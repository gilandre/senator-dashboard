import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import Papa from 'papaparse';
import { AccessRecord } from './csv-parser';

const readFile = promisify(fs.readFile);
const fileExists = promisify(fs.exists);

// Générer des données simulées pour le développement
function generateMockData(): {
  employees: AccessRecord[];
  visitors: AccessRecord[];
} {
  const employees: AccessRecord[] = [];
  const visitors: AccessRecord[] = [];
  
  // Générer quelques enregistrements fictifs pour les employés
  for (let i = 0; i < 50; i++) {
    const date = new Date();
    date.setDate(date.getDate() - Math.floor(Math.random() * 30));
    
    employees.push({
      badgeNumber: `E${10000 + i}`,
      eventDate: date,
      eventTime: `${Math.floor(Math.random() * 24)}:${Math.floor(Math.random() * 60)}`,
      central: 'Centrale 1',
      reader: `Lecteur ${Math.floor(Math.random() * 5) + 1}`,
      eventType: Math.random() > 0.5 ? 'Entrée' : 'Sortie',
      lastName: `Nom${i}`,
      firstName: `Prénom${i}`,
      status: 'Employé',
      group: `Département ${Math.floor(Math.random() * 5) + 1}`,
      validityStartDate: new Date(),
      creationDate: new Date()
    });
  }
  
  // Générer quelques enregistrements fictifs pour les visiteurs
  for (let i = 0; i < 20; i++) {
    const date = new Date();
    date.setDate(date.getDate() - Math.floor(Math.random() * 15));
    
    visitors.push({
      badgeNumber: `V${10000 + i}`,
      eventDate: date,
      eventTime: `${Math.floor(Math.random() * 24)}:${Math.floor(Math.random() * 60)}`,
      central: 'Centrale 1',
      reader: `Lecteur ${Math.floor(Math.random() * 5) + 1}`,
      eventType: Math.random() > 0.5 ? 'Entrée' : 'Sortie',
      lastName: `Visiteur${i}`,
      firstName: `Prénom${i}`,
      status: 'Visiteur',
      group: 'Visiteurs',
      validityStartDate: date,
      creationDate: date
    });
  }
  
  return { employees, visitors };
}

// Charger les données depuis les fichiers CSV locaux
export async function loadLocalCSVData(): Promise<{
  employees: AccessRecord[];
  visitors: AccessRecord[];
}> {
  try {
    const employeesPath = path.join(process.cwd(), 'Exportation 1.csv');
    const visitorsPath = path.join(process.cwd(), 'Exportation 12.csv');
    
    // Vérifier si les fichiers existent
    const employeesExist = await fileExists(employeesPath).catch(() => false);
    const visitorsExist = await fileExists(visitorsPath).catch(() => false);
    
    // Si l'un des fichiers n'existe pas, utiliser des données simulées
    if (!employeesExist || !visitorsExist) {
      console.log('CSV files not found, using mock data');
      return generateMockData();
    }
    
    const employeesData = await readFile(employeesPath, 'utf8');
    const visitorsData = await readFile(visitorsPath, 'utf8');
    
    const employees = parseCSVString(employeesData);
    const visitors = parseCSVString(visitorsData);
    
    return { employees, visitors };
  } catch (error) {
    console.error('Error loading CSV data:', error);
    // Utiliser des données simulées en cas d'erreur
    console.log('Error loading CSV data, using mock data instead');
    return generateMockData();
  }
}

// Analyser une chaîne CSV
function parseCSVString(csvString: string): AccessRecord[] {
  const results = Papa.parse(csvString, {
    header: true,
    delimiter: ';',
    skipEmptyLines: true,
    transformHeader: (header) => {
      const headerMap: { [key: string]: string } = {
        'Numéro de badge': 'badgeNumber',
        'Date évènements': 'eventDate',
        'Heure évènements': 'eventTime',
        'Centrale': 'central',
        'Lecteur': 'reader',
        'Nature Evenement': 'eventType',
        'Nom': 'lastName',
        'Prénom': 'firstName',
        'Statut': 'status',
        'Groupe': 'group',
        'Date de début de validité': 'validityStartDate',
        'Date de création': 'creationDate',
      };
      return headerMap[header] || header;
    }
  });
  
  return results.data.map((item: any) => {
    // Convertir les dates
    const eventDateParts = item.eventDate ? item.eventDate.split(' ')[0].split('/') : null;
    const validityDateParts = item.validityStartDate ? item.validityStartDate.split(' ')[0].split('/') : null;
    const creationDateParts = item.creationDate ? item.creationDate.split(' ')[0].split('/') : null;
    
    return {
      ...item,
      eventDate: eventDateParts ? new Date(`${eventDateParts[2]}-${eventDateParts[1]}-${eventDateParts[0]}`) : null,
      validityStartDate: validityDateParts ? new Date(`${validityDateParts[2]}-${validityDateParts[1]}-${validityDateParts[0]}`) : null,
      creationDate: creationDateParts ? new Date(`${creationDateParts[2]}-${creationDateParts[1]}-${creationDateParts[0]}`) : null,
    };
  });
} 