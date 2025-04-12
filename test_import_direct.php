<?php
/**
 * Script de test d'importation directe
 * Ce script utilise directement les services d'importation pour insérer les données dans la base
 */

// Inclusion du bootstrap pour charger l'autoloader
require_once __DIR__ . '/bootstrap.php';

// Chemins des fichiers
$csvFilePath = __DIR__ . '/Exportation 1.csv';
$logFile = __DIR__ . '/import_direct_test.log';

// Vérifier si le fichier existe
if (!file_exists($csvFilePath)) {
    die("ERREUR: Le fichier CSV n'existe pas à l'emplacement spécifié: {$csvFilePath}\n");
}

// Initialiser le journal
file_put_contents($logFile, "=== TEST D'IMPORTATION DIRECTE ===\n");
file_put_contents($logFile, "Date: " . date('Y-m-d H:i:s') . "\n", FILE_APPEND);
file_put_contents($logFile, "Fichier: {$csvFilePath}\n", FILE_APPEND);

try {
    // Créer une instance du service d'importation CSV
    $csvImportService = new \App\Services\CsvImportService();
    
    // Détecter le séparateur
    $separator = $csvImportService->detectSeparator($csvFilePath);
    file_put_contents($logFile, "Séparateur détecté: {$separator}\n", FILE_APPEND);
    
    // Lire le fichier CSV
    echo "Lecture du fichier CSV...\n";
    $data = $csvImportService->readCSV($csvFilePath, $separator, true);
    
    file_put_contents($logFile, "Nombre de lignes lues: " . count($data) . "\n", FILE_APPEND);
    echo "Nombre de lignes lues: " . count($data) . "\n";
    
    // Compter le nombre d'enregistrements avant l'importation
    $countBefore = \App\Models\AccessLog::countAll();
    file_put_contents($logFile, "Nombre d'enregistrements avant importation: {$countBefore}\n", FILE_APPEND);
    echo "Nombre d'enregistrements avant importation: {$countBefore}\n";

    // Transformation et validation des données
    echo "Transformation et validation des données...\n";
    $processedData = [];
    $errors = [];
    $duplicates = [];

    // Obtenir une instance de la base de données
    $db = \App\Core\Database::getInstance();
    $pdo = $db->getConnection();

    foreach ($data as $index => $row) {
        try {
            // Vérifier les colonnes requises
            if (empty($row['Numéro de badge']) || empty($row['Date évènements']) || empty($row['Heure évènements'])) {
                $errors[] = "Ligne " . ($index + 1) . ": Données obligatoires manquantes";
                continue;
            }

            // Formater les données pour l'insertion
            $record = [
                'badge_number' => trim($row['Numéro de badge']),
                'event_date' => trim($row['Date évènements']),
                'event_time' => trim($row['Heure évènements']),
                'event_type' => trim($row['Nature Evenement'] ?? ''),
                'central' => trim($row['Centrale'] ?? ''),
                'group_name' => trim($row['Groupe'] ?? '')
            ];

            // Vérifier si c'est un doublon
            $isDuplicate = false;
            try {
                $query = "SELECT COUNT(*) FROM access_logs WHERE badge_number = ? AND event_date = ? AND event_time = ?";
                $params = [
                    $record['badge_number'],
                    $record['event_date'],
                    $record['event_time']
                ];
                
                $result = $db->query($query, $params);
                $count = $result[0]['COUNT(*)'] ?? 0;
                
                if ($count > 0) {
                    $duplicates[] = "Ligne " . ($index + 1) . ": Doublon détecté pour badge " . $record['badge_number'];
                    $isDuplicate = true;
                }
            } catch (\Exception $e) {
                file_put_contents($logFile, "Erreur lors de la vérification des doublons: " . $e->getMessage() . "\n", FILE_APPEND);
            }

            if (!$isDuplicate) {
                $processedData[] = $record;
            }
        } catch (\Exception $e) {
            $errors[] = "Ligne " . ($index + 1) . ": " . $e->getMessage();
        }
    }

    file_put_contents($logFile, "Lignes valides pour importation: " . count($processedData) . "\n", FILE_APPEND);
    file_put_contents($logFile, "Doublons détectés: " . count($duplicates) . "\n", FILE_APPEND);
    file_put_contents($logFile, "Erreurs détectées: " . count($errors) . "\n", FILE_APPEND);

    echo "Lignes valides pour importation: " . count($processedData) . "\n";
    echo "Doublons détectés: " . count($duplicates) . "\n";
    echo "Erreurs détectées: " . count($errors) . "\n";

    // Afficher les 5 premières erreurs si elles existent
    if (!empty($errors)) {
        file_put_contents($logFile, "\nExemples d'erreurs:\n", FILE_APPEND);
        foreach (array_slice($errors, 0, 5) as $error) {
            file_put_contents($logFile, "- {$error}\n", FILE_APPEND);
        }
    }

    // Afficher les 5 premiers doublons si ils existent
    if (!empty($duplicates)) {
        file_put_contents($logFile, "\nExemples de doublons:\n", FILE_APPEND);
        foreach (array_slice($duplicates, 0, 5) as $duplicate) {
            file_put_contents($logFile, "- {$duplicate}\n", FILE_APPEND);
        }
    }

    // Insérer les données dans la base
    if (!empty($processedData)) {
        echo "Insertion des données dans la base...\n";
        $startTime = microtime(true);
        $inserted = 0;
        $insertErrors = 0;

        // Utiliser des transactions pour améliorer les performances
        $db->beginTransaction();

        try {
            foreach ($processedData as $record) {
                try {
                    $db->insert('access_logs', [
                        'badge_number' => $record['badge_number'],
                        'event_date' => $record['event_date'],
                        'event_time' => $record['event_time'],
                        'event_type' => $record['event_type'],
                        'central' => $record['central'],
                        'group_name' => $record['group_name'],
                        'created_at' => date('Y-m-d H:i:s')
                    ]);
                    $inserted++;
                } catch (\Exception $e) {
                    $insertErrors++;
                    file_put_contents($logFile, "Erreur d'insertion: " . $e->getMessage() . "\n", FILE_APPEND);
                }
            }

            $db->commit();
        } catch (\Exception $e) {
            $db->rollBack();
            throw $e;
        }

        $endTime = microtime(true);
        $processingTime = number_format($endTime - $startTime, 2);

        file_put_contents($logFile, "\nInsertion terminée en {$processingTime} secondes\n", FILE_APPEND);
        file_put_contents($logFile, "Enregistrements insérés: {$inserted}\n", FILE_APPEND);
        file_put_contents($logFile, "Erreurs d'insertion: {$insertErrors}\n", FILE_APPEND);

        echo "Insertion terminée en {$processingTime} secondes\n";
        echo "Enregistrements insérés: {$inserted}\n";
        echo "Erreurs d'insertion: {$insertErrors}\n";
    }

    // Compter le nombre d'enregistrements après l'importation
    $countAfter = \App\Models\AccessLog::countAll();
    file_put_contents($logFile, "Nombre d'enregistrements après importation: {$countAfter}\n", FILE_APPEND);
    echo "Nombre d'enregistrements après importation: {$countAfter}\n";
    echo "Différence: " . ($countAfter - $countBefore) . " nouveaux enregistrements\n";

    // Créer un enregistrement dans l'historique des importations
    try {
        // Insertion directe dans la table import_history
        $historyInserted = $db->insert('import_history', [
            'file_name' => basename($csvFilePath),
            'total_rows' => count($data),
            'imported_rows' => $inserted ?? 0,
            'duplicate_rows' => count($duplicates),
            'error_rows' => count($errors) + ($insertErrors ?? 0),
            'import_date' => date('Y-m-d H:i:s'),
            'user_id' => 1, // Admin par défaut
            'status' => 'completed'
        ]);
        
        if ($historyInserted) {
            file_put_contents($logFile, "Enregistrement ajouté à l'historique des importations\n", FILE_APPEND);
            echo "Enregistrement ajouté à l'historique des importations\n";
        } else {
            file_put_contents($logFile, "Erreur lors de l'ajout à l'historique des importations\n", FILE_APPEND);
            echo "Erreur lors de l'ajout à l'historique des importations\n";
        }
    } catch (\Exception $e) {
        file_put_contents($logFile, "Erreur d'historique: " . $e->getMessage() . "\n", FILE_APPEND);
    }
    
    echo "\nTest d'importation directe terminé. Résultats disponibles dans {$logFile}\n";
    
} catch (\Exception $e) {
    file_put_contents($logFile, "ERREUR FATALE: " . $e->getMessage() . "\n", FILE_APPEND);
    file_put_contents($logFile, "Trace: " . $e->getTraceAsString() . "\n", FILE_APPEND);
    
    echo "Une erreur est survenue: " . $e->getMessage() . "\n";
} 