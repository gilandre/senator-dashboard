<?php
// Script pour trouver les doublons dans un fichier CSV sans l'importer
$csvFile = 'Exportation 1.csv';

function processCSV($file, $separator = ';', $hasHeader = true) {
    echo "Analyse du fichier CSV: $file\n";
    $handle = fopen($file, 'r');
    if (!$handle) {
        die("Impossible d'ouvrir le fichier $file");
    }

    $lines = [];
    $rowNum = 0;
    $duplicateCount = 0;
    $uniqueLines = [];

    while (($data = fgetcsv($handle, 0, $separator, '"', "\\")) !== false) {
        $rowNum++;
        
        // Skip header if needed
        if ($hasHeader && $rowNum === 1) {
            echo "Ligne 1: En-tête (ignorée pour la détection des doublons)\n";
            continue;
        }
        
        // Normalize data and create a hash for comparison
        $normalizedData = [];
        foreach ($data as $value) {
            $normalizedData[] = trim(strtolower((string)($value ?? '')));
        }
        
        $lineHash = md5(implode('|', $normalizedData));
        
        if (isset($uniqueLines[$lineHash])) {
            $duplicateCount++;
            echo "Ligne $rowNum: Doublon de la ligne {$uniqueLines[$lineHash]['rowNum']}\n";
        } else {
            $uniqueLines[$lineHash] = [
                'rowNum' => $rowNum,
                'data' => $data
            ];
        }
        
        $lines[] = $data;
    }
    
    fclose($handle);
    
    echo "\nRésultats de l'analyse:\n";
    echo "Total de lignes: " . count($lines) . "\n";
    echo "Lignes uniques: " . count($uniqueLines) . "\n";
    echo "Doublons trouvés: $duplicateCount\n";
    
    if ($hasHeader) {
        echo "Total avec en-tête: " . (count($lines) + 1) . "\n";
    }
    
    return [
        'total' => count($lines) + ($hasHeader ? 1 : 0),
        'unique' => count($uniqueLines),
        'duplicates' => $duplicateCount
    ];
}

// Analyser le fichier
$results = processCSV($csvFile);

echo "\nVérification: " . ($results['unique'] + $results['duplicates'] + ($results['total'] > 0 ? 1 : 0)) . " devrait être égal à " . $results['total'] . "\n"; 