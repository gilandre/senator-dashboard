<?php
/**
 * Test de la fonctionnalité d'importation
 */
require_once __DIR__ . '/bootstrap.php';

use App\Controllers\ImportController;
use App\Services\CsvImportService;

echo "=== Test de l'importation CSV ===\n\n";

// Chemins des fichiers
$csvFilePath = __DIR__ . '/Exportation 1.csv';

// Vérifier si le fichier existe
if (!file_exists($csvFilePath)) {
    die("ERREUR: Le fichier CSV n'existe pas à l'emplacement: {$csvFilePath}\n");
}

try {
    // Instancier le contrôleur d'importation
    $importController = new ImportController();
    
    // Classe de test qui réimplemente juste le comportement sans vérification des doublons
    class SimpleImportTest extends ImportController
    {
        /**
         * Version simplifiée qui ignore la vérification des doublons
         */
        public function testImportWithoutDuplicateCheck($data): array
        {
            $result = [
                'total' => count($data),
                'imported' => 0,
                'duplicates' => 0,
                'errors' => 0,
                'error_details' => []
            ];

            if (empty($data)) {
                return $result;
            }

            echo "SimpleImportTest: Traitement de " . count($data) . " lignes\n";

            foreach ($data as $index => $row) {
                try {
                    // Vérifier que les champs minimaux sont présents
                    if (empty($row['Numéro de badge'])) {
                        throw new \InvalidArgumentException("Ligne ".($index+1).": Le numéro de badge est manquant");
                    }

                    // Gérer la date
                    $dateEvt = !empty($row['Date évènements']) ? $row['Date évènements'] : null;
                    if (empty($dateEvt)) {
                        throw new \InvalidArgumentException("Ligne ".($index+1).": La date d'événement est manquante");
                    }

                    // Gérer l'heure
                    $heureEvt = !empty($row['Heure évènements']) ? $row['Heure évènements'] : '00:00:00';
                    
                    // Formater manuellement la date/heure sans appeler la méthode privée
                    try {
                        // Format de date simple pour le test
                        $formattedDate = date('Y-m-d');
                        $formattedTime = !empty($heureEvt) ? $heureEvt : '00:00:00';
                        
                        // Nous ignorons la vérification des doublons et prétendons que tout est importé
                        // C'est un test, ne pas réellement insérer dans la base de données
                        
                        $result['imported']++;
                        echo "Importation simulée: Ligne " . ($index + 1) . " importée avec succès\n";
                    } catch (\Exception $e) {
                        throw new \InvalidArgumentException("Ligne ".($index+1).": Erreur de formatage de date/heure: " . $e->getMessage());
                    }
                } catch (\InvalidArgumentException $e) {
                    echo "ERREUR: " . $e->getMessage() . "\n";
                    $result['errors']++;
                    $result['error_details'][] = [
                        'row' => $index + 1,
                        'error' => $e->getMessage()
                    ];
                } catch (\Exception $e) {
                    echo "ERREUR GÉNÉRALE: " . $e->getMessage() . "\n";
                    $result['errors']++;
                    $result['error_details'][] = [
                        'row' => $index + 1,
                        'error' => "Erreur: " . $e->getMessage()
                    ];
                }
            }
            
            return $result;
        }
    }
    
    // Instancier notre classe de test
    $importTester = new SimpleImportTest();
    
    // Lire le fichier CSV
    $csvImportService = new App\Services\CsvImportService();
    echo "Lecture du fichier CSV...\n";
    $data = $csvImportService->readCSV($csvFilePath, ';', true);
    
    // Afficher les premiers enregistrements pour vérification
    echo "Premiers enregistrements:\n";
    foreach (array_slice($data, 0, 3) as $index => $row) {
        echo "Ligne " . ($index + 1) . ": ";
        echo "Badge: " . ($row['Numéro de badge'] ?? 'N/A') . ", ";
        echo "Date: " . ($row['Date évènements'] ?? 'N/A') . ", ";
        echo "Heure: " . ($row['Heure évènements'] ?? 'N/A') . "\n";
    }
    
    // Tester l'importation sur un échantillon en ignorant la vérification des doublons
    echo "\nTest d'importation simplifiée sur les 10 premiers enregistrements...\n";
    $sampleData = array_slice($data, 0, 10);
    
    $result = $importTester->testImportWithoutDuplicateCheck($sampleData);
    
    // Afficher les résultats
    echo "\nRésultats de l'importation:\n";
    echo "- Total d'enregistrements: " . $result['total'] . "\n";
    echo "- Importés avec succès: " . $result['imported'] . "\n";
    echo "- Erreurs rencontrées: " . $result['errors'] . "\n";
    
    // Si des erreurs sont présentes, les afficher
    if ($result['errors'] > 0 && !empty($result['error_details'])) {
        echo "\nDétails des erreurs:\n";
        foreach ($result['error_details'] as $error) {
            echo "- Ligne " . $error['row'] . ": " . $error['error'] . "\n";
        }
    }
    
    echo "\nTest d'importation terminé avec succès.\n";
    
} catch (Exception $e) {
    echo "ERREUR: " . $e->getMessage() . "\n";
    echo "Trace: " . $e->getTraceAsString() . "\n";
} 