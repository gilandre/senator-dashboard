<?php
// Essayons d'inclure le bootstrap
try {
    require_once __DIR__ . '/../bootstrap.php';
} catch (Exception $e) {
    echo "<p>Erreur de chargement du bootstrap: " . $e->getMessage() . "</p>";
    
    // Chargement manuel des classes nécessaires
    require_once __DIR__ . '/../src/Core/Database.php';
    require_once __DIR__ . '/../src/Core/Model.php';
    require_once __DIR__ . '/../src/models/AccessLog.php';
}

// Utiliser les classes nécessaires
use App\Core\Database;
use App\Models\AccessLog;

// Démarrer la session si elle n'est pas déjà active
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Vérifier la structure de la table access_logs
echo "<h1>Test d'import CSV</h1>";
echo "<h2>Structure de la base de données</h2>";

try {
    $db = Database::getInstance()->getConnection();
    
    // Récupérer la structure de la table
    $stmt = $db->query("PRAGMA table_info(access_logs)");
    $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo "<h3>Colonnes de la table access_logs</h3>";
    echo "<ul>";
    foreach ($columns as $column) {
        echo "<li>" . $column['name'] . " (" . $column['type'] . ")" . 
             ($column['notnull'] ? " NOT NULL" : "") . "</li>";
    }
    echo "</ul>";
    
    // Compter les enregistrements
    $count = AccessLog::countAll();
    echo "<p>Nombre d'enregistrements dans access_logs: $count</p>";
    
    // Tester l'insertion d'un enregistrement
    echo "<h2>Test d'insertion d'un enregistrement</h2>";
    
    $accessLog = new AccessLog();
    $accessLog->event_date = date('Y-m-d');
    $accessLog->event_time = date('H:i:s');
    $accessLog->badge_number = 'TEST001';
    $accessLog->event_type = 'Test Import';
    $accessLog->central = 'Test Central';
    $accessLog->group_name = 'Test Group';
    
    $result = $accessLog->insert();
    
    if ($result) {
        echo "<p style='color:green'>✓ Insertion réussie</p>";
        
        // Vérifier que l'enregistrement a bien été inséré
        $stmt = $db->prepare("SELECT * FROM access_logs WHERE badge_number = :badge ORDER BY id DESC LIMIT 1");
        $stmt->bindValue(':badge', 'TEST001');
        $stmt->execute();
        $inserted = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($inserted) {
            echo "<h3>Données insérées:</h3>";
            echo "<ul>";
            foreach ($inserted as $key => $value) {
                echo "<li>$key: $value</li>";
            }
            echo "</ul>";
        }
    } else {
        echo "<p style='color:red'>✗ Échec de l'insertion</p>";
    }
    
    // Simuler l'importation d'un petit jeu de données CSV
    echo "<h2>Test d'importation de données CSV</h2>";
    
    // Données CSV simulées
    $csvData = [
        ['date' => '01/05/2023', 'time' => '08:30:00', 'badge' => 'B123', 'type' => 'Entrée', 'central' => 'A', 'group' => 'Admin'],
        ['date' => '01/05/2023', 'time' => '12:15:00', 'badge' => 'B123', 'type' => 'Sortie', 'central' => 'A', 'group' => 'Admin'],
        ['date' => '01/05/2023', 'time' => '13:10:00', 'badge' => 'B123', 'type' => 'Entrée', 'central' => 'A', 'group' => 'Admin'],
        ['date' => '01/05/2023', 'time' => '17:45:00', 'badge' => 'B123', 'type' => 'Sortie', 'central' => 'A', 'group' => 'Admin'],
    ];
    
    $success = 0;
    $errors = 0;
    
    foreach ($csvData as $row) {
        try {
            // Convertir la date du format JJ/MM/AAAA au format AAAA-MM-JJ
            $dateParts = explode('/', $row['date']);
            $formattedDate = $dateParts[2] . '-' . $dateParts[1] . '-' . $dateParts[0];
            
            $accessLog = new AccessLog();
            $accessLog->event_date = $formattedDate;
            $accessLog->event_time = $row['time'];
            $accessLog->badge_number = $row['badge'];
            $accessLog->event_type = $row['type'];
            $accessLog->central = $row['central'];
            $accessLog->group_name = $row['group'];
            
            if ($accessLog->insert()) {
                $success++;
            } else {
                $errors++;
            }
        } catch (Exception $e) {
            echo "<p style='color:red'>Erreur: " . $e->getMessage() . "</p>";
            $errors++;
        }
    }
    
    echo "<p>Résultats de l'import: $success réussis, $errors échoués</p>";
    
    // Vérifier les données importées
    $stmt = $db->prepare("SELECT * FROM access_logs WHERE badge_number = :badge AND event_date = :date ORDER BY event_time");
    $stmt->bindValue(':badge', 'B123');
    $stmt->bindValue(':date', '2023-05-01');
    $stmt->execute();
    $importedData = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    if (count($importedData) > 0) {
        echo "<h3>Données importées pour le badge B123 le 2023-05-01:</h3>";
        echo "<table border='1' cellpadding='5'>";
        echo "<tr><th>ID</th><th>Date</th><th>Heure</th><th>Badge</th><th>Type</th><th>Centrale</th><th>Groupe</th></tr>";
        
        foreach ($importedData as $row) {
            echo "<tr>";
            echo "<td>" . $row['id'] . "</td>";
            echo "<td>" . $row['event_date'] . "</td>";
            echo "<td>" . $row['event_time'] . "</td>";
            echo "<td>" . $row['badge_number'] . "</td>";
            echo "<td>" . $row['event_type'] . "</td>";
            echo "<td>" . $row['central'] . "</td>";
            echo "<td>" . $row['group_name'] . "</td>";
            echo "</tr>";
        }
        
        echo "</table>";
    } else {
        echo "<p>Aucune donnée trouvée pour le badge B123.</p>";
    }
    
} catch (Exception $e) {
    echo "<p style='color:red'>Erreur: " . $e->getMessage() . "</p>";
    echo "<pre>" . $e->getTraceAsString() . "</pre>";
} 