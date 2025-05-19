const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const fetch = require('node-fetch');

async function testImport() {
  try {
    // Lire le fichier CSV
    const csvPath = path.join(__dirname, 'test-import.csv');
    const fileBuffer = fs.readFileSync(csvPath);
    
    // Créer le FormData
    const formData = new FormData();
    formData.append('file', fileBuffer, {
      filename: 'test-import.csv',
      contentType: 'text/csv',
    });

    // Envoyer la requête
    console.log('Envoi de la requête d\'import...');
    const response = await fetch('http://localhost:3000/api/import/csv/process', {
      method: 'POST',
      body: formData,
    });

    // Lire la réponse
    const result = await response.json();
    console.log('Résultat de l\'import:', result);

    if (!response.ok) {
      throw new Error(`Erreur HTTP: ${response.status}`);
    }

    console.log('Test terminé avec succès!');
  } catch (error) {
    console.error('Erreur lors du test:', error);
  }
}

testImport(); 