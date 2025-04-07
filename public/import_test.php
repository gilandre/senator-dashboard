<?php
// Activation du mode debug
ini_set('display_errors', 1);
error_reporting(E_ALL);

// En-tête pour JSON
header('Content-Type: application/json');

try {
    // Démarrer la session
    session_start();
    
    // Chemin vers le fichier CSV de test
    $csvFile = __DIR__ . '/../test_data.csv';
    
    if (!file_exists($csvFile)) {
        throw new Exception("Le fichier CSV de test n'existe pas: $csvFile");
    }
    
    // Préparer les données pour l'importation
    $tempDir = __DIR__ . '/../tmp';
    if (!is_dir($tempDir)) {
        mkdir($tempDir, 0777, true);
    }
    
    $tempFile = $tempDir . '/test_import_' . uniqid() . '.csv';
    copy($csvFile, $tempFile);
    
    // Lire le contenu du CSV
    $separator = ';';
    $hasHeader = true;
    $data = [];
    
    if (($handle = fopen($tempFile, "r")) !== FALSE) {
        // Lire la première ligne (en-têtes) si nécessaire
        if ($hasHeader) {
            $headers = fgetcsv($handle, 0, $separator, '"', '\\');
            // Convertir les en-têtes en UTF-8 si nécessaire
            $headers = array_map(function($header) {
                return trim($header);
            }, $headers);
        }
        
        $rowId = 0;
        while (($row = fgetcsv($handle, 0, $separator, '"', '\\')) !== FALSE) {
            $rowId++;
            $rowData = [];
            
            // Associer les en-têtes aux valeurs
            if ($hasHeader) {
                foreach ($headers as $index => $header) {
                    $rowData[$header] = isset($row[$index]) ? $row[$index] : '';
                }
            } else {
                $rowData = $row;
            }
            
            // Ajouter un ID pour chaque ligne pour le suivi
            $rowData['row_id'] = $rowId;
            $data[] = $rowData;
        }
        fclose($handle);
    }
    
    // Stocker les données en session
    $_SESSION['import_data'] = [
        'data' => $data,
        'temp_file' => $tempFile,
        'separator' => $separator,
        'has_header' => $hasHeader
    ];
    
    // Signaler que les données sont prêtes pour l'importation
    echo json_encode([
        'success' => true,
        'message' => 'Données prêtes pour l\'importation',
        'count' => count($data),
        'next_step' => '/import/process',
        'test_url' => '/test_ajax.php'
    ]);
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
} 