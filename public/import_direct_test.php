<?php
// Activation du mode debug
ini_set('display_errors', 1);
error_reporting(E_ALL);

// Commencer à capturer la sortie
ob_start();

// En-têtes HTML
?>
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Test d'importation direct</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; }
        h1, h2, h3 { color: #333; }
        pre { background: #f5f5f5; padding: 10px; border-radius: 5px; overflow: auto; }
        .success { color: green; font-weight: bold; }
        .error { color: red; font-weight: bold; }
        .step { margin-bottom: 20px; border-bottom: 1px solid #ddd; padding-bottom: 10px; }
        table { border-collapse: collapse; width: 100%; margin: 10px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
    </style>
</head>
<body>
    <h1>Test d'importation direct</h1>
    
<?php
// Démarrer la session
session_start();

try {
    echo '<div class="step">';
    echo '<h2>1. Préparation des données</h2>';
    
    // Chemin vers le fichier CSV de test
    $csvFile = __DIR__ . '/../test_data.csv';
    
    if (!file_exists($csvFile)) {
        throw new Exception("Le fichier CSV de test n'existe pas: $csvFile");
    }
    
    echo '<p>Fichier CSV trouvé: ' . $csvFile . '</p>';
    
    // Lire le contenu du CSV
    $separator = ';';
    $hasHeader = true;
    $data = [];
    
    if (($handle = fopen($csvFile, "r")) !== FALSE) {
        // Lire la première ligne (en-têtes) si nécessaire
        if ($hasHeader) {
            $headers = fgetcsv($handle, 0, $separator, '"', '\\');
            // Convertir les en-têtes en UTF-8 si nécessaire
            $headers = array_map(function($header) {
                return trim($header);
            }, $headers);
            
            echo '<p>En-têtes trouvés: ' . implode(', ', $headers) . '</p>';
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
    
    echo '<p class="success">' . count($data) . ' lignes trouvées dans le fichier CSV.</p>';
    
    // Afficher les données lues
    echo '<h3>Données lues:</h3>';
    echo '<table>';
    echo '<tr>';
    foreach ($headers as $header) {
        echo '<th>' . htmlspecialchars($header) . '</th>';
    }
    echo '</tr>';
    
    foreach ($data as $row) {
        echo '<tr>';
        foreach ($headers as $header) {
            echo '<td>' . htmlspecialchars($row[$header] ?? '') . '</td>';
        }
        echo '</tr>';
    }
    echo '</table>';
    echo '</div>';
    
    echo '<div class="step">';
    echo '<h2>2. Importation directe dans la base de données</h2>';
    
    try {
        // Connexion à la base de données
        $dsn = "sqlite:" . __DIR__ . "/../database.sqlite";
        $options = [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ];
        $pdo = new PDO($dsn, null, null, $options);
        
        echo '<p class="success">Connexion à la base de données établie.</p>';
        
        // Obtenir le nombre d'enregistrements avant l'importation
        $countBefore = $pdo->query("SELECT COUNT(*) FROM access_logs")->fetchColumn();
        echo '<p>Nombre d\'enregistrements avant importation: ' . $countBefore . '</p>';
        
        // Structure de la table access_logs
        $tableStructure = $pdo->query("PRAGMA table_info(access_logs)")->fetchAll();
        echo '<h3>Structure de la table access_logs:</h3>';
        echo '<table>';
        echo '<tr><th>CID</th><th>Nom</th><th>Type</th><th>NotNull</th><th>Default</th><th>PK</th></tr>';
        foreach ($tableStructure as $column) {
            echo '<tr>';
            echo '<td>' . $column['cid'] . '</td>';
            echo '<td>' . $column['name'] . '</td>';
            echo '<td>' . $column['type'] . '</td>';
            echo '<td>' . $column['notnull'] . '</td>';
            echo '<td>' . $column['dflt_value'] . '</td>';
            echo '<td>' . $column['pk'] . '</td>';
            echo '</tr>';
        }
        echo '</table>';
        
        // Insérer les données dans la base de données
        $pdo->beginTransaction();
        
        $stmt = $pdo->prepare("
            INSERT INTO access_logs (
                event_date, 
                event_time, 
                badge_number, 
                event_type, 
                central,
                group_name
            ) VALUES (?, ?, ?, ?, ?, ?)
        ");
        
        $importStats = [
            'total' => count($data),
            'imported' => 0,
            'duplicates' => 0,
            'errors' => 0
        ];
        
        foreach ($data as $index => $row) {
            try {
                // Extraire et formater les données
                $dateEvt = $row['Date évènements'] ?? null;
                $heureEvt = $row['Heure évènements'] ?? '00:00:00';
                $badgeId = $row['Numéro de badge'] ?? null;
                $eventType = $row['Nature Evenement'] ?? 'Inconnu';
                $controller = $row['Centrale'] ?? null;
                $group = $row['Groupe'] ?? null;
                
                // Vérifier les données obligatoires
                if (empty($badgeId) || empty($dateEvt)) {
                    echo '<p class="error">Ligne ' . ($index + 1) . ': Données obligatoires manquantes.</p>';
                    $importStats['errors']++;
                    continue;
                }
                
                // Insertion
                $stmt->execute([
                    $dateEvt,
                    $heureEvt,
                    $badgeId,
                    $eventType,
                    $controller,
                    $group
                ]);
                
                $importStats['imported']++;
                echo '<p>Ligne ' . ($index + 1) . ' importée.</p>';
                
            } catch (PDOException $e) {
                if (strpos($e->getMessage(), 'UNIQUE constraint failed') !== false) {
                    echo '<p class="error">Ligne ' . ($index + 1) . ': Doublon détecté.</p>';
                    $importStats['duplicates']++;
                } else {
                    echo '<p class="error">Ligne ' . ($index + 1) . ': Erreur: ' . $e->getMessage() . '</p>';
                    $importStats['errors']++;
                }
            }
        }
        
        $pdo->commit();
        
        // Obtenir le nombre d'enregistrements après l'importation
        $countAfter = $pdo->query("SELECT COUNT(*) FROM access_logs")->fetchColumn();
        
        echo '<h3 class="success">Importation terminée!</h3>';
        echo '<p>Nombre d\'enregistrements après importation: ' . $countAfter . '</p>';
        echo '<p>Différence: ' . ($countAfter - $countBefore) . ' nouveaux enregistrements</p>';
        echo '<p>Statistiques:</p>';
        echo '<ul>';
        echo '<li>Total de lignes: ' . $importStats['total'] . '</li>';
        echo '<li>Importées: ' . $importStats['imported'] . '</li>';
        echo '<li>Doublons: ' . $importStats['duplicates'] . '</li>';
        echo '<li>Erreurs: ' . $importStats['errors'] . '</li>';
        echo '</ul>';
        
    } catch (Exception $e) {
        echo '<h3 class="error">Erreur lors de l\'importation</h3>';
        echo '<p>' . $e->getMessage() . '</p>';
        echo '<pre>' . $e->getTraceAsString() . '</pre>';
    }
    
    echo '</div>';
    
} catch (Exception $e) {
    echo '<h3 class="error">Erreur lors du test</h3>';
    echo '<p>' . $e->getMessage() . '</p>';
    echo '<pre>' . $e->getTraceAsString() . '</pre>';
}
?>

<p><a href="/import">Retourner à la page d'importation</a></p>

</body>
</html>

<?php
// Envoyer la sortie
ob_end_flush();
?> 