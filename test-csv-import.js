const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

// Configuration
const CSV_FILE = 'Exportation 12.csv';
const OUTPUT_FILE = 'imported_data.json';

async function importCsv() {
  try {
    console.log(`Lecture du fichier ${CSV_FILE}...`);
    const fileContent = fs.readFileSync(CSV_FILE, 'utf-8');
    
    console.log('Parsing du fichier CSV...');
    const records = parse(fileContent, {
      delimiter: ';',
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });
    
    console.log(`${records.length} enregistrements trouvés dans le fichier CSV.`);
    
    // Traitement des enregistrements
    const importedRecords = [];
    const errors = [];
    
    for (const record of records) {
      try {
        // Vérification de la présence des champs requis
        if (!record['Numéro de badge'] || !record['Date évènements']) {
          throw new Error('Champs requis manquants');
        }
        
        // Formatage de la date
        const eventDateParts = record['Date évènements'].split(' ')[0].split('/');
        const formattedDate = `${eventDateParts[2]}-${eventDateParts[1]}-${eventDateParts[0]}`;
        
        // Créer un objet AccessLog
        const accessLog = {
          badgeNumber: record['Numéro de badge'].trim(),
          eventDate: formattedDate,
          eventTime: record['Heure évènements'] ? record['Heure évènements'].trim() : '',
          central: record['Centrale'] ? record['Centrale'].trim() : '',
          reader: record['Lecteur'] ? record['Lecteur'].trim() : '',
          eventType: record['Nature Evenement'] ? record['Nature Evenement'].trim() : '',
          lastName: record['Nom'] ? record['Nom'].trim() : '',
          firstName: record['Prénom'] ? record['Prénom'].trim() : '',
          status: record['Statut'] ? record['Statut'].trim() : '',
          group: record['Groupe'] ? record['Groupe'].trim() : '',
        };
        
        importedRecords.push(accessLog);
      } catch (error) {
        console.error('Erreur lors du traitement de l\'enregistrement:', error, record);
        errors.push(record);
      }
    }
    
    console.log(`${importedRecords.length} enregistrements traités avec succès.`);
    console.log(`${errors.length} erreurs.`);
    
    // Sauvegarder les données traitées dans un fichier JSON
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(importedRecords, null, 2));
    console.log(`Données sauvegardées dans ${OUTPUT_FILE}`);
    
    // Afficher des statistiques sur les données
    const uniqueBadges = new Set(importedRecords.map(r => r.badgeNumber));
    const uniqueDates = new Set(importedRecords.map(r => r.eventDate));
    
    console.log('\nStatistiques:');
    console.log(`- Nombre total d'enregistrements: ${importedRecords.length}`);
    console.log(`- Nombre de badges uniques: ${uniqueBadges.size}`);
    console.log(`- Nombre de jours uniques: ${uniqueDates.size}`);
    
    // Afficher les 5 premiers enregistrements
    console.log('\nAperçu des données:');
    console.log(JSON.stringify(importedRecords.slice(0, 5), null, 2));
    
  } catch (error) {
    console.error('Erreur lors de l\'importation du fichier CSV:', error);
  }
}

importCsv(); 