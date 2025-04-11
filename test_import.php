<?php
require_once __DIR__ . '/vendor/autoload.php';

// Chargement des variables d'environnement
$dotenv = Dotenv\Dotenv::createImmutable(__DIR__);
$dotenv->load();

echo "Script de test pour l'importation de CSV\n";

// Simuler un fichier CSV avec quelques lignes
$testData = "Numéro de badge;Date évènements;Heure évènements;Centrale;Lecteur;Nature Evenement;Nom;Prénom;Statut;Groupe;Début validité;Date création\n";
$testData .= "123456;06/04/2025;08:30:00;Entrée principale;Lecteur1;Utilisateur accepté;Dupont;Jean;Actif;Administration;01/01/2025;01/01/2025\n";
$testData .= "789012;06/04/2025;09:15:00;Entrée secondaire;Lecteur2;Utilisateur accepté;Martin;Marie;Actif;Direction;01/01/2025;01/01/2025\n";
$testData .= "345678;06/04/2025;08:45:00;Entrée garage;Lecteur3;Utilisateur accepté;Durand;Pierre;Actif;IT;01/01/2025;01/01/2025\n";

// Créer un fichier temporaire
$tempFile = __DIR__ . '/tmp/test_import.csv';
if (!is_dir(dirname($tempFile))) {
    mkdir(dirname($tempFile), 0777, true);
}
file_put_contents($tempFile, $testData);
echo "Fichier CSV de test créé : $tempFile\n";

try {
    // Créer une instance du service d'importation
    $csvImportService = new App\Services\CsvImportService();
    
    // Lire les données du CSV
    $separator = ';';
    $hasHeader = true;
    $data = $csvImportService->readCSV($tempFile, $separator, $hasHeader);
    
    echo "Données lues du CSV : " . count($data) . " lignes\n";
    
    // Tenter d'importer les données
    $imported = 0;
    $errors = 0;
    
    foreach ($data as $row) {
        try {
            // Vérifier les données obligatoires
            if (empty($row['Numéro de badge']) || empty($row['Date évènements']) || empty($row['Nature Evenement'])) {
                echo "Données manquantes dans la ligne\n";
                $errors++;
                continue;
            }
            
            // Créer un nouvel enregistrement AccessLog
            $accessLog = new App\Models\AccessLog();
            
            // Convertir la date du format DD/MM/YYYY au format YYYY-MM-DD
            $dateEvt = $row['Date évènements'];
            $dateParts = explode('/', $dateEvt);
            if (count($dateParts) === 3) {
                $formattedDate = $dateParts[2] . '-' . $dateParts[1] . '-' . $dateParts[0];
            } else {
                $formattedDate = date('Y-m-d');
            }
            
            // Assigner les valeurs
            $accessLog->event_date = $formattedDate;
            $accessLog->event_time = $row['Heure évènements'] ?? '00:00:00';
            $accessLog->badge_number = $row['Numéro de badge'];
            $accessLog->event_type = $row['Nature Evenement'];
            $accessLog->central = $row['Centrale'] ?? null;
            $accessLog->group_name = $row['Groupe'] ?? null;
            
            // Tenter l'insertion
            $result = $accessLog->insert();
            
            if ($result) {
                $imported++;
                echo "Ligne importée avec succès\n";
            } else {
                $errors++;
                echo "Erreur lors de l'insertion\n";
            }
            
        } catch (Exception $e) {
            $errors++;
            echo "Erreur : " . $e->getMessage() . "\n";
        }
    }
    
    echo "\nRésultats de l'importation :\n";
    echo "- Total traité : " . count($data) . "\n";
    echo "- Importés : $imported\n";
    echo "- Erreurs : $errors\n";
    
} catch (Exception $e) {
    echo "Erreur globale : " . $e->getMessage() . "\n";
}

// Nettoyer le fichier temporaire
unlink($tempFile);
echo "Fichier temporaire supprimé\n"; 