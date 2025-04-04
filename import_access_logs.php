<?php
// Script pour importer les données du fichier CSV "Exportation 12.csv" vers la table access_logs

// Configuration 
$csvFile = __DIR__ . '/Exportation 12.csv';
$dbFile = __DIR__ . '/database/database.sqlite';

// Vérifier si le fichier CSV existe
if (!file_exists($csvFile)) {
    die("Erreur: Le fichier CSV '$csvFile' n'existe pas.\n");
}

// Vérifier si la base de données existe
if (!file_exists($dbFile)) {
    die("Erreur: La base de données SQLite '$dbFile' n'existe pas.\n");
}

// Connexion à la base de données SQLite
try {
    $db = new PDO("sqlite:$dbFile");
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    echo "Connexion à la base de données réussie.\n";
} catch (PDOException $e) {
    die("Erreur de connexion à la base de données: " . $e->getMessage() . "\n");
}

// Vider la table avant l'importation
try {
    $db->exec("DELETE FROM access_logs");
    echo "Table access_logs vidée.\n";
} catch (PDOException $e) {
    echo "Erreur lors du vidage de la table: " . $e->getMessage() . "\n";
}

// Préparer la requête d'insertion
$insertQuery = "INSERT INTO access_logs (
                    badge_number, 
                    event_date, 
                    event_time, 
                    location, 
                    event_type,
                    action,
                    status, 
                    user_group,
                    created_at
                ) VALUES (
                    :badge_number, 
                    :event_date, 
                    :event_time, 
                    :location, 
                    :event_type,
                    :action,
                    :status,
                    :user_group,
                    :created_at
                )";

$stmt = $db->prepare($insertQuery);

// Ouvrir le fichier CSV
$handle = fopen($csvFile, 'r');
if (!$handle) {
    die("Erreur: Impossible d'ouvrir le fichier CSV.\n");
}

// Lire l'en-tête
$header = fgetcsv($handle, 0, ';', '"', "\\");
if (!$header) {
    die("Erreur: Impossible de lire l'en-tête du CSV.\n");
}

// Compteurs
$totalRows = 0;
$successRows = 0;
$errorRows = 0;

// Parcourir chaque ligne du CSV
while (($data = fgetcsv($handle, 0, ';', '"', "\\")) !== FALSE) {
    $totalRows++;
    
    try {
        // Convertir la date du format FR (JJ/MM/YYYY) au format SQL (YYYY-MM-DD)
        $dateStr = isset($data[1]) ? $data[1] : '';
        $formattedDate = '';
        
        if (preg_match('/(\d{2})\/(\d{2})\/(\d{4})/', $dateStr, $matches)) {
            $formattedDate = $matches[3] . '-' . $matches[2] . '-' . $matches[1];
        } else {
            // Si la date contient une heure, l'extraire
            if (preg_match('/(\d{2})\/(\d{2})\/(\d{4})\s+\d{2}:\d{2}:\d{2}/', $dateStr, $matches)) {
                $formattedDate = $matches[3] . '-' . $matches[2] . '-' . $matches[1];
            }
        }
        
        // Si la date est vide, utiliser la date actuelle
        if (empty($formattedDate)) {
            $formattedDate = date('Y-m-d');
        }
        
        // Déterminer le statut et l'action en fonction du texte de l'événement
        $eventType = isset($data[5]) && !empty($data[5]) ? $data[5] : '';
        $status = 'unknown';
        $action = 'access';
        
        if (strpos($eventType, 'Utilisateur accepté') !== false) {
            $status = 'success';
        } elseif (strpos($eventType, 'invalide') !== false || strpos($eventType, 'refusé') !== false) {
            $status = 'failed';
        }
        
        // Préparer les valeurs pour l'insertion
        $params = [
            ':badge_number' => isset($data[0]) && !empty($data[0]) ? $data[0] : null,
            ':event_date' => $formattedDate,
            ':event_time' => isset($data[2]) && !empty($data[2]) ? $data[2] : null,
            ':location' => isset($data[4]) && !empty($data[4]) ? $data[4] : null,
            ':event_type' => $eventType,
            ':action' => $action,
            ':status' => $status,
            ':user_group' => isset($data[9]) && !empty($data[9]) ? $data[9] : null,
            ':created_at' => date('Y-m-d H:i:s') // Horodatage actuel
        ];
        
        $stmt->execute($params);
        $successRows++;
        
        // Afficher une progression
        if ($successRows % 100 === 0) {
            echo "Progression: $successRows lignes importées.\n";
        }
    } catch (Exception $e) {
        $errorRows++;
        echo "Erreur à la ligne $totalRows: " . $e->getMessage() . "\n";
    }
}

fclose($handle);

// Afficher un résumé
echo "\nImportation terminée!\n";
echo "Total des lignes traitées: $totalRows\n";
echo "Lignes importées avec succès: $successRows\n";
echo "Lignes en erreur: $errorRows\n";

// Vérifier les données importées
$countQuery = $db->query("SELECT COUNT(*) FROM access_logs");
$count = $countQuery->fetchColumn();
echo "Nombre d'enregistrements dans la table access_logs: $count\n"; 