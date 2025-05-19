const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const { MongoClient } = require('mongodb');

// Configuration
const CSV_FILE = 'uploads/fixed_exportation.csv';
const MONGODB_URI = 'mongodb://localhost:27017/';
const DB_NAME = 'senatorDb';
const COLLECTION_NAME = 'accesslogs';

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
      relax_column_count: true  // Ignorer les erreurs de nombre de colonnes
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
        
        // Extraction de la date et l'heure
        const eventDateTimeStr = record['Date évènements'];
        const eventDateStr = eventDateTimeStr.split(' ')[0];
        const eventDateParts = eventDateStr.split('/');
        
        // Formatage de la date au format ISO (YYYY-MM-DD)
        // Important : les mois dans JavaScript sont 0-based, donc on soustrait 1 du mois
        const eventDate = new Date(
          parseInt(eventDateParts[2]), 
          parseInt(eventDateParts[1]) - 1, 
          parseInt(eventDateParts[0])
        );
        
        // Créer un objet AccessLog
        const accessLog = {
          badgeNumber: record['Numéro de badge'].trim(),
          eventDate: eventDate,
          eventTime: record['Heure évènements'] ? record['Heure évènements'].trim() : '',
          central: record['Centrale'] ? record['Centrale'].trim() : '',
          reader: record['Lecteur'] ? record['Lecteur'].trim() : '',
          eventType: record['Nature Evenement'] ? record['Nature Evenement'].trim() : '',
          lastName: record['Nom'] ? record['Nom'].trim() : '',
          firstName: record['Prénom'] ? record['Prénom'].trim() : '',
          status: record['Statut'] ? record['Statut'].trim() : '',
          group: record['Groupe'] ? record['Groupe'].trim() : '',
          validityStartDate: record['Date de début de validité'] ? parseDate(record['Date de début de validité']) : null,
          creationDate: record['Date de création'] ? parseDate(record['Date de création']) : null,
        };
        
        importedRecords.push(accessLog);
      } catch (error) {
        console.error('Erreur lors du traitement de l\'enregistrement:', record, error);
        errors.push(record);
      }
    }
    
    console.log(`${importedRecords.length} enregistrements traités avec succès.`);
    console.log(`${errors.length} erreurs.`);
    
    // Connexion à MongoDB et import des données
    console.log('Connexion à MongoDB...');
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    console.log('Connecté à MongoDB.');
    
    const db = client.db(DB_NAME);
    const collection = db.collection(COLLECTION_NAME);
    
    // Vérifier si la collection existe déjà et la nettoyer si nécessaire
    const count = await collection.countDocuments();
    if (count > 0) {
      console.log(`La collection ${COLLECTION_NAME} contient déjà ${count} documents.`);
      console.log('Suppression des données existantes...');
      await collection.deleteMany({});
      console.log('Données existantes supprimées.');
    }
    
    // Insertion des documents dans MongoDB
    console.log(`Insertion de ${importedRecords.length} documents dans MongoDB...`);
    if (importedRecords.length > 0) {
      const result = await collection.insertMany(importedRecords);
      console.log(`${result.insertedCount} documents insérés dans MongoDB.`);
    }
    
    // Créer des index pour améliorer les performances des requêtes
    console.log('Création des index...');
    await collection.createIndex({ badgeNumber: 1 });
    await collection.createIndex({ eventDate: 1 });
    await collection.createIndex({ lastName: 1, firstName: 1 });
    console.log('Index créés avec succès.');
    
    // Fermer la connexion
    await client.close();
    console.log('Connexion à MongoDB fermée.');
    
    // Afficher des statistiques sur les données
    const uniqueBadges = new Set(importedRecords.map(r => r.badgeNumber));
    const uniqueDates = new Set(importedRecords.map(r => r.eventDate.toISOString().split('T')[0]));
    
    console.log('\nStatistiques:');
    console.log(`- Nombre total d'enregistrements: ${importedRecords.length}`);
    console.log(`- Nombre de badges uniques: ${uniqueBadges.size}`);
    console.log(`- Nombre de jours uniques: ${uniqueDates.size}`);
    
  } catch (error) {
    console.error('Erreur lors de l\'importation du fichier CSV:', error);
  }
}

function parseDate(dateStr) {
  if (!dateStr) return null;
  
  // Si la date contient une heure, on la supprime
  if (dateStr.includes(' ')) {
    dateStr = dateStr.split(' ')[0];
  }
  
  // Parse la date au format français DD/MM/YYYY
  try {
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      return new Date(
        parseInt(parts[2]), 
        parseInt(parts[1]) - 1, 
        parseInt(parts[0])
      );
    }
  } catch (error) {
    console.error(`Erreur de parsing de la date: ${dateStr}`, error);
  }
  
  return null;
}

// Exécuter l'importation
importCsv().then(() => {
  console.log('Processus d\'importation terminé.');
}).catch(error => {
  console.error('Erreur lors de l\'importation:', error);
}); 