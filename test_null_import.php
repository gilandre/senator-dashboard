<?php
require_once __DIR__ . '/vendor/autoload.php';

// Chargement des variables d'environnement
$dotenv = Dotenv\Dotenv::createImmutable(__DIR__);
$dotenv->load();

echo "Script de test pour l'importation avec des valeurs NULL\n\n";

// Simuler un fichier CSV avec valeurs NULL/vides
$testData = "Numéro de badge;Date évènements;Heure évènements;Centrale;Lecteur;Nature Evenement;Nom;Prénom;Statut;Groupe;Début validité;Date création\n";
$testData .= "123456;06/04/2025;;Entrée principale;;Utilisateur accepté;Dupont;Jean;Actif;;;01/01/2025\n"; // Heure vide, Lecteur vide, validité vide
$testData .= "789012;06/04/2025;09:15:00;;;Utilisateur accepté;Martin;Marie;;;01/01/2025;01/01/2025\n"; // Centrale vide, Lecteur vide, Statut vide, Groupe vide
$testData .= "345678;06/04/2025;08:45:00;;;;Durand;Pierre;Actif;IT;01/01/2025;01/01/2025\n"; // Centrale vide, Lecteur vide, Nature événement vide

// Créer un fichier temporaire
$tempFile = __DIR__ . '/tmp/test_null_import.csv';
if (!is_dir(dirname($tempFile))) {
    mkdir(dirname($tempFile), 0777, true);
}
file_put_contents($tempFile, $testData);
echo "Fichier CSV de test avec valeurs nulles créé : $tempFile\n";

try {
    // Créer une instance du service d'importation
    $csvImportService = new App\Services\CsvImportService();
    
    // Lire les données du CSV
    $separator = ';';
    $hasHeader = true;
    $data = $csvImportService->readCSV($tempFile, $separator, $hasHeader);
    
    echo "Données lues du CSV : " . count($data) . " lignes\n";
    
    // Afficher le contenu des lignes pour débugger
    echo "Contenu des lignes:\n";
    foreach ($data as $index => $row) {
        echo "Ligne " . ($index + 1) . ":\n";
        foreach ($row as $key => $value) {
            echo "  - $key: " . (empty($value) ? "<vide>" : $value) . "\n";
        }
        echo "\n";
    }
    
    // Vérifier la structure de la table access_logs
    echo "Structure de la table access_logs :\n";
    $db = \App\Core\Database::getInstance()->getConnection();
    $stmt = $db->query("DESCRIBE access_logs");
    $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);
    foreach ($columns as $column) {
        echo "  - " . $column['Field'] . ": " . $column['Type'] . ", Null: " . $column['Null'] . ", Key: " . $column['Key'] . "\n";
    }
    
    echo "\nTentative d'importation des données avec valeurs nulles :\n";
    
    // Tenter d'importer les données
    $imported = 0;
    $errors = 0;
    
    foreach ($data as $index => $row) {
        try {
            // Vérifier les données obligatoires
            if (empty($row['Numéro de badge']) || empty($row['Date évènements'])) {
                echo "Ligne " . ($index + 1) . ": Données obligatoires manquantes\n";
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
            
            // Assigner les valeurs avec gestion explicite des valeurs NULL ou vides
            $accessLog->event_date = $formattedDate;
            $accessLog->event_time = !empty($row['Heure évènements']) ? $row['Heure évènements'] : '00:00:00';
            $accessLog->badge_number = $row['Numéro de badge'];
            $accessLog->event_type = !empty($row['Nature Evenement']) ? $row['Nature Evenement'] : 'Inconnu';
            $accessLog->central = !empty($row['Centrale']) ? $row['Centrale'] : null;
            $accessLog->group_name = !empty($row['Groupe']) ? $row['Groupe'] : null;
            
            // Tenter l'insertion avec gestion d'erreur détaillée
            try {
                $result = $accessLog->insert();
                
                if ($result) {
                    $imported++;
                    echo "Ligne " . ($index + 1) . ": Importée avec succès\n";
                } else {
                    $errors++;
                    echo "Ligne " . ($index + 1) . ": Erreur lors de l'insertion (aucune erreur spécifique)\n";
                }
            } catch (\PDOException $e) {
                $errors++;
                echo "Ligne " . ($index + 1) . ": Erreur PDO: " . $e->getMessage() . "\n";
                
                // Afficher les valeurs qui posent problème
                echo "  Valeurs qui posent problème:\n";
                echo "  - event_date: " . var_export($accessLog->event_date, true) . "\n";
                echo "  - event_time: " . var_export($accessLog->event_time, true) . "\n";
                echo "  - badge_number: " . var_export($accessLog->badge_number, true) . "\n";
                echo "  - event_type: " . var_export($accessLog->event_type, true) . "\n";
                echo "  - central: " . var_export($accessLog->central, true) . "\n";
                echo "  - group_name: " . var_export($accessLog->group_name, true) . "\n";
            }
            
        } catch (Exception $e) {
            $errors++;
            echo "Ligne " . ($index + 1) . ": Exception: " . $e->getMessage() . "\n";
        }
    }
    
    echo "\nRésultats de l'importation :\n";
    echo "- Total traité : " . count($data) . "\n";
    echo "- Importés : $imported\n";
    echo "- Erreurs : $errors\n";
    
    // Vérifier les données insérées
    echo "\nVérification des données insérées :\n";
    $stmt = $db->query("SELECT * FROM access_logs WHERE badge_number IN ('123456', '789012', '345678') ORDER BY id DESC LIMIT 5");
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    foreach ($rows as $row) {
        echo "ID: " . $row['id'] . ", Badge: " . $row['badge_number'] . ", Date: " . $row['event_date'] . 
             ", Heure: " . $row['event_time'] . ", Type: " . $row['event_type'] . 
             ", Central: " . ($row['central'] ?? '<NULL>') . ", Groupe: " . ($row['group_name'] ?? '<NULL>') . "\n";
    }
    
} catch (Exception $e) {
    echo "Erreur globale : " . $e->getMessage() . "\n";
    echo "Trace : " . $e->getTraceAsString() . "\n";
}

// Nettoyer le fichier temporaire
unlink($tempFile);
echo "\nFichier temporaire supprimé\n"; 