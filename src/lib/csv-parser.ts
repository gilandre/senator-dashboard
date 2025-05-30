import Papa from 'papaparse';

export interface AccessRecord {
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
}

export async function parseCSVFile(file: File): Promise<AccessRecord[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      delimiter: ';',
      skipEmptyLines: true,
      transformHeader: (header) => {
        // Map French headers to our model properties
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
      },
      transform: (value, field) => {
        if (field === 'eventTime') {
          return value;
        }
        if (field === 'eventDate' || field === 'validityStartDate' || field === 'creationDate') {
          if (!value) return null;
          // Parse date from DD/MM/YYYY format
          const dateParts = value.split(' ')[0].split('/');
          if (dateParts.length === 3) {
            return new Date(`${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`);
          }
          return new Date(value);
        }
        return value;
      },
      complete: (results) => {
        resolve(results.data as AccessRecord[]);
      },
      error: (error: Error) => {
        reject(error);
      }
    });
  });
}

export async function parseCSVString(csvString: string): Promise<AccessRecord[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(csvString, {
      header: true,
      delimiter: ';',
      skipEmptyLines: true,
      transformHeader: (header) => {
        // Map French headers to our model properties
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
      },
      transform: (value, field) => {
        if (field === 'eventTime') {
          return value ? value.split(':').slice(0, 2).join(':') : value;
        }
        if (field === 'eventDate' || field === 'validityStartDate' || field === 'creationDate') {
          if (!value) return null;
          // Parse date from DD/MM/YYYY format
          const dateParts = value.split(' ')[0].split('/');
          if (dateParts.length === 3) {
            return new Date(`${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`);
          }
          return new Date(value);
        }
        return value;
      },
      complete: (results) => {
        resolve(results.data as AccessRecord[]);
      },
      error: (error: Error) => {
        reject(error);
      }
    });
  });
}

// Fonction pour compter les entrées par groupe ou département
export function countEntriesByGroup(data: AccessRecord[]): { [key: string]: number } {
  const counts: { [key: string]: number } = {};
  
  data.forEach(record => {
    if (record.group) {
      counts[record.group] = (counts[record.group] || 0) + 1;
    }
  });
  
  return counts;
}

// Fonction pour compter les entrées par jour
export function countEntriesByDay(data: AccessRecord[]): { [key: string]: number } {
  const counts: { [key: string]: number } = {};
  
  data.forEach(record => {
    if (record.eventDate) {
      const dateStr = record.eventDate.toISOString().split('T')[0];
      counts[dateStr] = (counts[dateStr] || 0) + 1;
    }
  });
  
  return counts;
}

// Fonction pour compter les entrées par type d'événement
export function countEntriesByEventType(data: AccessRecord[]): { [key: string]: number } {
  const counts: { [key: string]: number } = {};
  
  data.forEach(record => {
    if (record.eventType) {
      counts[record.eventType] = (counts[record.eventType] || 0) + 1;
    }
  });
  
  return counts;
}

// Fonction pour compter les entrées par lecteur
export function countEntriesByReader(data: AccessRecord[]): { [key: string]: number } {
  const counts: { [key: string]: number } = {};
  
  data.forEach(record => {
    if (record.reader) {
      counts[record.reader] = (counts[record.reader] || 0) + 1;
    }
  });
  
  return counts;
}

// Fonction pour identifier les anomalies (accès refusés, utilisateurs inconnus, etc.)
export function identifyAnomalies(data: AccessRecord[]): AccessRecord[] {
  return data.filter(record => {
    return record.eventType.includes('inconnu') || 
           record.eventType.includes('invalide') || 
           record.eventType.includes('refusé');
  });
}

// Fonction pour analyser les heures de pointe
export function analyzeHourlyTraffic(data: AccessRecord[]): { [key: string]: number } {
  const hourly: { [key: string]: number } = {};
  
  // Initialiser toutes les heures à 0
  for (let i = 0; i < 24; i++) {
    hourly[i.toString().padStart(2, '0')] = 0;
  }
  
  data.forEach(record => {
    if (record.eventTime) {
      const hour = record.eventTime.split(':')[0];
      hourly[hour] = (hourly[hour] || 0) + 1;
    }
  });
  
  return hourly;
}

// Fonction pour calculer le temps moyen passé dans les locaux
export function calculateAverageTimeSpent(data: AccessRecord[]): { [key: string]: number } {
  const entriesExits: { [key: string]: { entry: Date | null, exit: Date | null }[] } = {};
  const averages: { [key: string]: number } = {};
  
  // Grouper les entrées et sorties par badge
  data.forEach(record => {
    if (!record.badgeNumber) return;
    
    if (!entriesExits[record.badgeNumber]) {
      entriesExits[record.badgeNumber] = [];
    }
    
    const isEntry = record.eventType.includes('ENTREE') || 
                    record.reader.includes('ENTREE') || 
                    record.central.includes('ENTREE');
    
    const isExit = record.eventType.includes('SORTIE') || 
                   record.reader.includes('SORTIE') || 
                   record.central.includes('SORTIE');
    
    if (isEntry) {
      // Nouvelle entrée
      entriesExits[record.badgeNumber].push({
        entry: new Date(`${record.eventDate.toISOString().split('T')[0]}T${record.eventTime}`),
        exit: null
      });
    } else if (isExit && entriesExits[record.badgeNumber].length > 0) {
      // Trouver la dernière entrée sans sortie
      for (let i = entriesExits[record.badgeNumber].length - 1; i >= 0; i--) {
        const pair = entriesExits[record.badgeNumber][i];
        if (pair.entry && !pair.exit) {
          pair.exit = new Date(`${record.eventDate.toISOString().split('T')[0]}T${record.eventTime}`);
          break;
        }
      }
    }
  });
  
  // Calculer les moyennes par badge
  Object.keys(entriesExits).forEach(badge => {
    let totalMinutes = 0;
    let count = 0;
    
    entriesExits[badge].forEach(pair => {
      if (pair.entry && pair.exit) {
        const diffMinutes = (pair.exit.getTime() - pair.entry.getTime()) / (1000 * 60);
        if (diffMinutes > 0 && diffMinutes < 24 * 60) { // Exclure les valeurs aberrantes (> 24h)
          totalMinutes += diffMinutes;
          count++;
        }
      }
    });
    
    if (count > 0) {
      averages[badge] = totalMinutes / count;
    }
  });
  
  return averages;
}

// Fonction pour calculer les heures de présence quotidiennes
export function calculateDailyPresence(data: AccessRecord[]): { 
  date: string; 
  totalHours: number; 
  employeeCount: number;
  averageHours: number;
}[] {
  // Grouper par date
  const presenceByDay: { [key: string]: { totalMinutes: number; employeeSet: Set<string> } } = {};
  
  // Filtrer les paires d'entrée/sortie
  const entriesExits = getPairedEntriesExits(data);
  
  // Calculer les heures par jour
  Object.keys(entriesExits).forEach(badge => {
    entriesExits[badge].forEach(pair => {
      if (pair.entry && pair.exit) {
        const dateStr = pair.entry.toISOString().split('T')[0];
        const minutes = (pair.exit.getTime() - pair.entry.getTime()) / (1000 * 60);
        
        // Ignorer les valeurs aberrantes (+ de 16h ou moins de 1 min)
        if (minutes > 0 && minutes < 16 * 60) {
          if (!presenceByDay[dateStr]) {
            presenceByDay[dateStr] = { totalMinutes: 0, employeeSet: new Set() };
          }
          presenceByDay[dateStr].totalMinutes += minutes;
          presenceByDay[dateStr].employeeSet.add(badge);
        }
      }
    });
  });
  
  // Convertir en tableau pour le résultat
  return Object.keys(presenceByDay).map(date => {
    const employeeCount = presenceByDay[date].employeeSet.size;
    const totalHours = presenceByDay[date].totalMinutes / 60;
    return {
      date,
      totalHours,
      employeeCount,
      averageHours: employeeCount > 0 ? totalHours / employeeCount : 0
    };
  }).sort((a, b) => a.date.localeCompare(b.date));
}

// Fonction pour calculer les heures de présence hebdomadaires
export function calculateWeeklyPresence(data: AccessRecord[]): { 
  weekStart: string; 
  weekEnd: string;
  totalHours: number; 
  employeeCount: number;
  averageHours: number;
}[] {
  // D'abord, calculer la présence quotidienne
  const dailyPresence = calculateDailyPresence(data);
  
  // Grouper par semaine
  const presenceByWeek: { [key: string]: { 
    weekStart: string;
    weekEnd: string;
    totalHours: number;
    employeeSet: Set<string>;
  } } = {};
  
  // Filtrer les paires d'entrée/sortie
  const entriesExits = getPairedEntriesExits(data);
  
  // Pour chaque badge et chaque paire d'entrée/sortie
  Object.keys(entriesExits).forEach(badge => {
    entriesExits[badge].forEach(pair => {
      if (pair.entry && pair.exit) {
        const minutes = (pair.exit.getTime() - pair.entry.getTime()) / (1000 * 60);
        
        // Ignorer les valeurs aberrantes
        if (minutes > 0 && minutes < 16 * 60) {
          // Calculer la semaine (lundi-dimanche)
          const date = new Date(pair.entry);
          const day = date.getDay() || 7; // Convertir 0 (dimanche) en 7
          const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Ajuster pour commencer le lundi
          
          const weekStart = new Date(date.setDate(diff));
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekStart.getDate() + 6);
          
          const weekKey = weekStart.toISOString().split('T')[0];
          
          if (!presenceByWeek[weekKey]) {
            presenceByWeek[weekKey] = { 
              weekStart: weekStart.toISOString().split('T')[0],
              weekEnd: weekEnd.toISOString().split('T')[0],
              totalHours: 0,
              employeeSet: new Set()
            };
          }
          
          presenceByWeek[weekKey].totalHours += minutes / 60;
          presenceByWeek[weekKey].employeeSet.add(badge);
        }
      }
    });
  });
  
  // Convertir en tableau pour le résultat
  return Object.values(presenceByWeek).map(week => {
    const employeeCount = week.employeeSet.size;
    return {
      weekStart: week.weekStart,
      weekEnd: week.weekEnd,
      totalHours: week.totalHours,
      employeeCount,
      averageHours: employeeCount > 0 ? week.totalHours / employeeCount : 0
    };
  }).sort((a, b) => a.weekStart.localeCompare(b.weekStart));
}

// Fonction pour calculer les heures de présence mensuelles
export function calculateMonthlyPresence(data: AccessRecord[]): { 
  month: string; 
  totalHours: number; 
  employeeCount: number;
  averageHours: number;
}[] {
  // Grouper par mois
  const presenceByMonth: { [key: string]: { 
    totalHours: number;
    employeeSet: Set<string>;
  } } = {};
  
  // Filtrer les paires d'entrée/sortie
  const entriesExits = getPairedEntriesExits(data);
  
  // Pour chaque badge et chaque paire d'entrée/sortie
  Object.keys(entriesExits).forEach(badge => {
    entriesExits[badge].forEach(pair => {
      if (pair.entry && pair.exit) {
        const minutes = (pair.exit.getTime() - pair.entry.getTime()) / (1000 * 60);
        
        // Ignorer les valeurs aberrantes
        if (minutes > 0 && minutes < 16 * 60) {
          const date = new Date(pair.entry);
          const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
          
          if (!presenceByMonth[monthKey]) {
            presenceByMonth[monthKey] = { 
              totalHours: 0,
              employeeSet: new Set()
            };
          }
          
          presenceByMonth[monthKey].totalHours += minutes / 60;
          presenceByMonth[monthKey].employeeSet.add(badge);
        }
      }
    });
  });
  
  // Convertir en tableau pour le résultat
  return Object.keys(presenceByMonth).map(month => {
    const employeeCount = presenceByMonth[month].employeeSet.size;
    return {
      month,
      totalHours: presenceByMonth[month].totalHours,
      employeeCount,
      averageHours: employeeCount > 0 ? presenceByMonth[month].totalHours / employeeCount : 0
    };
  }).sort((a, b) => a.month.localeCompare(b.month));
}

// Fonction pour calculer les heures de présence annuelles
export function calculateYearlyPresence(data: AccessRecord[]): { 
  year: string; 
  totalHours: number; 
  employeeCount: number;
  averageHours: number;
}[] {
  // Grouper par année
  const presenceByYear: { [key: string]: { 
    totalHours: number;
    employeeSet: Set<string>;
  } } = {};
  
  // Filtrer les paires d'entrée/sortie
  const entriesExits = getPairedEntriesExits(data);
  
  // Pour chaque badge et chaque paire d'entrée/sortie
  Object.keys(entriesExits).forEach(badge => {
    entriesExits[badge].forEach(pair => {
      if (pair.entry && pair.exit) {
        const minutes = (pair.exit.getTime() - pair.entry.getTime()) / (1000 * 60);
        
        // Ignorer les valeurs aberrantes
        if (minutes > 0 && minutes < 16 * 60) {
          const year = pair.entry.getFullYear().toString();
          
          if (!presenceByYear[year]) {
            presenceByYear[year] = { 
              totalHours: 0,
              employeeSet: new Set()
            };
          }
          
          presenceByYear[year].totalHours += minutes / 60;
          presenceByYear[year].employeeSet.add(badge);
        }
      }
    });
  });
  
  // Convertir en tableau pour le résultat
  return Object.keys(presenceByYear).map(year => {
    const employeeCount = presenceByYear[year].employeeSet.size;
    return {
      year,
      totalHours: presenceByYear[year].totalHours,
      employeeCount,
      averageHours: employeeCount > 0 ? presenceByYear[year].totalHours / employeeCount : 0
    };
  }).sort((a, b) => a.year.localeCompare(b.year));
}

// Fonction utilitaire pour obtenir les paires entrée/sortie
function getPairedEntriesExits(data: AccessRecord[]): { 
  [key: string]: { entry: Date | null, exit: Date | null }[] 
} {
  const entriesExits: { [key: string]: { entry: Date | null, exit: Date | null }[] } = {};
  
  // Grouper les entrées et sorties par badge
  data.forEach(record => {
    if (!record.badgeNumber) return;
    
    if (!entriesExits[record.badgeNumber]) {
      entriesExits[record.badgeNumber] = [];
    }
    
    const isEntry = record.eventType.includes('ENTREE') || 
                    record.reader.includes('ENTREE') || 
                    record.central.includes('ENTREE');
    
    const isExit = record.eventType.includes('SORTIE') || 
                   record.reader.includes('SORTIE') || 
                   record.central.includes('SORTIE');
    
    if (isEntry) {
      // Nouvelle entrée
      entriesExits[record.badgeNumber].push({
        entry: new Date(`${record.eventDate.toISOString().split('T')[0]}T${record.eventTime}`),
        exit: null
      });
    } else if (isExit && entriesExits[record.badgeNumber].length > 0) {
      // Trouver la dernière entrée sans sortie
      for (let i = entriesExits[record.badgeNumber].length - 1; i >= 0; i--) {
        const pair = entriesExits[record.badgeNumber][i];
        if (pair.entry && !pair.exit) {
          pair.exit = new Date(`${record.eventDate.toISOString().split('T')[0]}T${record.eventTime}`);
          break;
        }
      }
    }
  });
  
  return entriesExits;
}