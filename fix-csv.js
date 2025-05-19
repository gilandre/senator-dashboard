const fs = require('fs');
const path = require('path');

// Configuration
const CSV_FILE = 'uploads/1a0a9d01-76ca-4849-9644-2e99e6882251-Exportation 12.csv';
const FIXED_CSV_FILE = 'uploads/fixed_exportation.csv';

async function fixCsvFile() {
  try {
    console.log(`Lecture du fichier ${CSV_FILE}...`);
    const fileContent = fs.readFileSync(CSV_FILE);
    
    // Vérifier si le fichier commence par un BOM (Byte Order Mark) UTF-8
    let normalizedContent;
    if (fileContent[0] === 0xEF && fileContent[1] === 0xBB && fileContent[2] === 0xBF) {
      console.log('BOM UTF-8 détecté, normalisation du fichier...');
      normalizedContent = fileContent.slice(3);
    } else {
      normalizedContent = fileContent;
    }
    
    // Convertir le buffer en texte
    let textContent = normalizedContent.toString('utf8');
    
    // Remplacer les fins de ligne Windows (CRLF) par des fins de ligne Unix (LF)
    textContent = textContent.replace(/\r\n/g, '\n');
    
    // Supprimer le point-virgule à la fin des lignes s'il existe
    textContent = textContent.replace(/;\n/g, '\n');
    
    // S'assurer que les lignes sont bien formées et ont le bon nombre de champs (12)
    const lines = textContent.split('\n');
    const header = lines[0];
    const headerColumns = header.split(';');
    
    console.log(`En-tête détecté avec ${headerColumns.length} colonnes: ${header}`);
    
    // Traiter chaque ligne pour s'assurer qu'elle a le bon nombre de colonnes
    const processedLines = [];
    processedLines.push(header); // Garder l'en-tête original
    
    let validCount = 0;
    let invalidCount = 0;
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue; // Ignorer les lignes vides
      
      const columns = line.split(';');
      
      // Vérifier si la ligne a tous les champs requis
      if (columns.length >= headerColumns.length - 1) {
        // Ajouter la ligne (en complétant si nécessaire)
        while (columns.length < headerColumns.length) {
          columns.push('');
        }
        processedLines.push(columns.join(';'));
        validCount++;
      } else {
        console.log(`Ligne ${i+1} ignorée: seulement ${columns.length} colonnes`);
        invalidCount++;
      }
    }
    
    // Écrire le contenu normalisé dans un nouveau fichier
    fs.writeFileSync(FIXED_CSV_FILE, processedLines.join('\n'));
    
    console.log(`Fichier CSV normalisé écrit dans ${FIXED_CSV_FILE}`);
    console.log(`Lignes valides: ${validCount}, Lignes ignorées: ${invalidCount}`);
    
    return {
      originalFile: CSV_FILE,
      fixedFile: FIXED_CSV_FILE,
      validCount,
      invalidCount
    };
  } catch (error) {
    console.error('Erreur lors de la normalisation du fichier CSV:', error);
    throw error;
  }
}

// Exécuter la fonction principale
fixCsvFile().then(() => {
  console.log('Normalisation du fichier terminée.');
}).catch(error => {
  console.error('Erreur lors de l\'exécution:', error);
  process.exit(1);
}); 