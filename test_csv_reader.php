<?php
// Script de diagnostic pour l'importation CSV

// Définir le chemin du fichier à tester
$csvFile = __DIR__ . '/Exportation 1.csv';
echo "Test de lecture du fichier: {$csvFile}\n";

// Vérifier que le fichier existe
if (!file_exists($csvFile)) {
    die("ERREUR: Le fichier CSV n'existe pas.\n");
}

// Afficher la taille du fichier
$size = filesize($csvFile);
echo "Taille du fichier: {$size} octets\n";

// Vérifier l'encodage du fichier
$content = file_get_contents($csvFile, false, null, 0, min($size, 1000));
$hasBOM = substr($content, 0, 3) === "\xEF\xBB\xBF";
echo "BOM UTF-8 détecté: " . ($hasBOM ? "Oui" : "Non") . "\n";

// Tester différents séparateurs
$separators = [';', ',', "\t", '|'];
$counts = [];

foreach ($separators as $sep) {
    $counts[$sep] = substr_count(substr($content, 0, 500), $sep);
    echo "Séparateur '{$sep}': {$counts[$sep]} occurrences dans les 500 premiers caractères\n";
}

arsort($counts);
$bestSeparator = key($counts);
echo "Meilleur séparateur détecté: '{$bestSeparator}'\n";

// Utiliser SplFileObject pour lire le fichier
echo "\nLecture avec SplFileObject:\n";
try {
    $file = new SplFileObject($csvFile, 'r');
    $file->setFlags(SplFileObject::READ_CSV | SplFileObject::READ_AHEAD | SplFileObject::SKIP_EMPTY);
    $file->setCsvControl($bestSeparator, '"', '\\');
    
    $lineCount = 0;
    $rowCount = 0;
    $headers = [];
    
    // Lire l'en-tête
    if ($file->valid()) {
        $headers = $file->fgetcsv();
        
        // Supprimer le BOM UTF-8 si présent
        if ($hasBOM && !empty($headers[0])) {
            $headers[0] = substr($headers[0], 3);
        }
        
        // Nettoyer et compter les en-têtes
        $headers = array_map('trim', $headers);
        $headerCount = count($headers);
        echo "En-têtes trouvés: {$headerCount}\n";
        
        if ($headerCount > 0) {
            echo "Premier en-tête: '{$headers[0]}', Dernier en-tête: '{$headers[$headerCount-1]}'\n";
            echo "Tous les en-têtes: " . implode(", ", $headers) . "\n";
        }
        
        $lineCount++;
    }
    
    // Lire les 5 premières lignes de données
    echo "\nExemple de données (5 premières lignes):\n";
    while ($file->valid() && $rowCount < 5) {
        $row = $file->fgetcsv();
        $lineCount++;
        
        if ($row !== false) {
            $rowCount++;
            echo "Ligne {$rowCount}: " . count($row) . " champs\n";
            
            // Vérifier si le nombre de champs correspond au nombre d'en-têtes
            if (count($row) != count($headers)) {
                echo "ATTENTION: Nombre de champs différent du nombre d'en-têtes\n";
            }
            
            // Afficher quelques champs importants
            if (count($headers) > 0 && count($row) > 0) {
                $badgeNumber = array_search('Numéro de badge', $headers);
                $date = array_search('Date évènements', $headers);
                
                if ($badgeNumber !== false && isset($row[$badgeNumber])) {
                    echo "  Numéro de badge: '{$row[$badgeNumber]}'\n";
                }
                
                if ($date !== false && isset($row[$date])) {
                    echo "  Date évènements: '{$row[$date]}'\n";
                }
            }
        }
    }
    
    // Compter le nombre total de lignes
    $file->rewind();
    $totalRows = iterator_count($file) - 1; // -1 pour l'en-tête
    
    echo "\nNombre total de lignes: {$totalRows}\n";
    echo "Nombre de lignes lues avec succès: {$rowCount}\n";
    
} catch (Exception $e) {
    echo "ERREUR: " . $e->getMessage() . "\n";
    echo "Trace: " . $e->getTraceAsString() . "\n";
}

// Lecture alternative avec fgetcsv
echo "\nLecture alternative avec fgetcsv:\n";
try {
    $handle = fopen($csvFile, 'r');
    if ($handle === false) {
        throw new Exception("Impossible d'ouvrir le fichier");
    }
    
    $lineCount = 0;
    $rowCount = 0;
    
    // Lire l'en-tête
    $headers = fgetcsv($handle, 0, $bestSeparator, '"', '\\');
    
    if ($headers !== false) {
        // Supprimer le BOM UTF-8 si présent
        if ($hasBOM && !empty($headers[0])) {
            $headers[0] = substr($headers[0], 3);
        }
        
        $headerCount = count($headers);
        echo "En-têtes trouvés avec fgetcsv: {$headerCount}\n";
        $lineCount++;
    }
    
    // Lire les 5 premières lignes de données
    echo "\nExemple de données avec fgetcsv (5 premières lignes):\n";
    while (($row = fgetcsv($handle, 0, $bestSeparator, '"', '\\')) !== false && $rowCount < 5) {
        $lineCount++;
        $rowCount++;
        
        echo "Ligne {$rowCount}: " . count($row) . " champs\n";
        
        // Afficher quelques champs importants
        if (count($headers) > 0 && count($row) > 0) {
            $badgeNumber = array_search('Numéro de badge', $headers);
            $date = array_search('Date évènements', $headers);
            
            if ($badgeNumber !== false && isset($row[$badgeNumber])) {
                echo "  Numéro de badge: '{$row[$badgeNumber]}'\n";
            }
            
            if ($date !== false && isset($row[$date])) {
                echo "  Date évènements: '{$row[$date]}'\n";
            }
        }
    }
    
    // Fermer le fichier
    fclose($handle);
    
} catch (Exception $e) {
    echo "ERREUR: " . $e->getMessage() . "\n";
    echo "Trace: " . $e->getTraceAsString() . "\n";
}

// Suggestions basées sur les résultats
echo "\n=== DIAGNOSTIQUE ET SOLUTIONS ===\n";
echo "1. Utilisez le séparateur: '{$bestSeparator}'\n";
echo "2. Assurez-vous que 'has_header' est coché dans l'interface\n";
echo "3. Si l'erreur persiste, vérifiez les permissions du dossier temporaire\n";
echo "4. Essayez d'enlever le BOM UTF-8 si présent\n";
echo "5. Vérifiez si les noms de colonnes correspondent à ceux attendus par l'application\n"; 