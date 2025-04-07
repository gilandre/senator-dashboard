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
    <title>Test d'importation complet</title>
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
    <h1>Test d'importation complet</h1>
    
<?php
// Démarrer la session
session_start();

try {
    echo '<div class="step">';
    echo '<h2>1. Nettoyage des données précédentes</h2>';
    
    // Nettoyer les données de session précédentes
    unset($_SESSION['import_data']);
    unset($_SESSION['validation']);
    unset($_SESSION['import_stats']);
    unset($_SESSION['import_progress']);
    unset($_SESSION['import_status']);
    unset($_SESSION['import_message']);
    
    echo '<p class="success">Données de session nettoyées avec succès.</p>';
    echo '</div>';
    
    echo '<div class="step">';
    echo '<h2>2. Préparation du fichier CSV de test</h2>';
    
    // Chemin vers le fichier CSV de test
    $csvFile = __DIR__ . '/../test_data.csv';
    
    if (!file_exists($csvFile)) {
        throw new Exception("Le fichier CSV de test n'existe pas: $csvFile");
    }
    
    echo '<p>Fichier CSV trouvé: ' . $csvFile . '</p>';
    
    // Préparer les données pour l'importation
    $tempDir = __DIR__ . '/../tmp';
    if (!is_dir($tempDir)) {
        mkdir($tempDir, 0777, true);
        echo '<p>Répertoire temporaire créé: ' . $tempDir . '</p>';
    } else {
        echo '<p>Répertoire temporaire existe déjà: ' . $tempDir . '</p>';
    }
    
    $tempFile = $tempDir . '/test_import_' . uniqid() . '.csv';
    copy($csvFile, $tempFile);
    
    echo '<p class="success">Fichier temporaire créé: ' . $tempFile . '</p>';
    echo '</div>';
    
    echo '<div class="step">';
    echo '<h2>3. Lecture du contenu CSV</h2>';
    
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
    echo '<h2>4. Stockage des données en session</h2>';
    
    // Stocker les données en session
    $_SESSION['import_data'] = [
        'data' => $data,
        'temp_file' => $tempFile,
        'separator' => $separator,
        'has_header' => $hasHeader
    ];
    
    echo '<p class="success">Données stockées en session avec succès.</p>';
    echo '<pre>' . print_r($_SESSION['import_data'], true) . '</pre>';
    echo '</div>';
    
    echo '<div class="step">';
    echo '<h2>5. Simulation de l\'importation</h2>';
    
    // Initialiser la progression
    $_SESSION['import_progress'] = 0;
    $_SESSION['import_status'] = 'processing';
    $_SESSION['import_message'] = 'Initialisation de l\'importation...';
    
    echo '<p>Statut de l\'importation: ' . $_SESSION['import_status'] . '</p>';
    echo '<p>Message: ' . $_SESSION['import_message'] . '</p>';
    echo '<p>Progression: ' . $_SESSION['import_progress'] . '%</p>';
    
    // Charger le contrôleur d'importation
    require_once __DIR__ . '/../src/controllers/ImportController.php';
    require_once __DIR__ . '/../src/Services/CsvImportService.php';
    require_once __DIR__ . '/../src/Services/CsvValidationService.php';
    
    // Préparer les données POST pour simuler le formulaire
    $_POST['confirm_import'] = '1';
    $_SERVER['HTTP_X_REQUESTED_WITH'] = 'XMLHttpRequest';
    
    echo '<p class="success">Environnement préparé pour l\'importation.</p>';
    
    // Exécuter le processus d'importation
    echo '<h3>Initialisation de l\'importation...</h3>';
    
    try {
        // Connexion à la base de données pour validation
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
        
        // Ici, nous ne pouvons pas appeler directement le contrôleur car il utilise des méthodes de la classe parente
        // Nous allons donc simuler l'importation directement
        
        echo '<h3>Importation simulée...</h3>';
        
        // Insérer les données dans la base de données
        $pdo->beginTransaction();
        
        $stmt = $pdo->prepare("
            INSERT INTO access_logs (
                event_date, 
                event_time, 
                badge_number, 
                event_type, 
                central, 
                reader, 
                status, 
                user_group,
                name,
                firstname
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        
        $importStats = [
            'total' => count($data),
            'imported' => 0,
            'duplicates' => 0,
            'errors' => 0
        ];
        
        foreach ($data as $index => $row) {
            try {
                // Mettre à jour la progression
                $_SESSION['import_progress'] = (int)(($index + 1) / count($data) * 100);
                $_SESSION['import_message'] = 'Importation ' . ($index + 1) . ' sur ' . count($data) . '...';
                
                // Extraire et formater les données
                $dateEvt = $row['Date évènements'] ?? null;
                $heureEvt = $row['Heure évènements'] ?? '00:00:00';
                $badgeId = $row['Numéro de badge'] ?? null;
                $eventType = $row['Nature Evenement'] ?? 'Inconnu';
                $controller = $row['Centrale'] ?? null;
                $reader = $row['Lecteur'] ?? null;
                $status = $row['Statut'] ?? null;
                $group = $row['Groupe'] ?? null;
                $name = $row['Nom'] ?? null;
                $firstname = $row['Prénom'] ?? null;
                
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
                    $reader,
                    $status,
                    $group,
                    $name,
                    $firstname
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
        
        // Finaliser l'importation
        $_SESSION['import_progress'] = 100;
        $_SESSION['import_status'] = 'completed';
        $_SESSION['import_message'] = 'Importation terminée avec succès!';
        $_SESSION['import_stats'] = $importStats;
        
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
    
    echo '<div class="step">';
    echo '<h2>6. Nettoyage</h2>';
    
    // Nettoyer le fichier temporaire
    if (file_exists($tempFile)) {
        unlink($tempFile);
        echo '<p class="success">Fichier temporaire supprimé: ' . $tempFile . '</p>';
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