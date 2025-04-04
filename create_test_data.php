<?php
echo "Création ou mise à jour de la table access_logs...\n";
try {
    $pdo = new PDO('sqlite:database.sqlite');
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // Vérifier si la table access_logs existe déjà
    $stmt = $pdo->query("SELECT name FROM sqlite_master WHERE type='table' AND name='access_logs'");
    if (!$stmt->fetch()) {
        // Créer la table access_logs
        $pdo->exec('CREATE TABLE access_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            event_date DATE,
            event_time TIME,
            badge_number VARCHAR(50),
            event_type VARCHAR(100),
            central VARCHAR(100),
            group_name VARCHAR(100)
        )');
        echo "Table access_logs créée avec succès.\n";
    } else {
        echo "La table access_logs existe déjà.\n";
    }

    // Insérer des données de test
    $today = date('Y-m-d');
    $yesterday = date('Y-m-d', strtotime('-1 day'));
    $twoDaysAgo = date('Y-m-d', strtotime('-2 days'));

    // Générer 3 jours de données
    $dates = [
        $twoDaysAgo => 3,  // 3 entrées pour il y a deux jours
        $yesterday => 10,  // 10 entrées pour hier
        $today => 6        // 6 entrées pour aujourd'hui
    ];

    $eventTypes = ['Utilisateur accepté', 'Utilisateur inconnu'];
    $centrals = ['Central A', 'Central B', 'Central C', 'Central D'];
    $groupNames = ['Admin', 'User', 'Manager', 'Tech', 'Guest'];
    $badges = ['B001', 'B002', 'B003', 'B004', 'B005', 'B006', 'B007', 'B008', 'B009', 'B010'];

    // Supprimer les anciennes données
    $pdo->exec('DELETE FROM access_logs');
    echo "Anciennes données supprimées.\n";

    // Préparer la requête d'insertion
    $stmt = $pdo->prepare('INSERT INTO access_logs (event_date, event_time, badge_number, event_type, central, group_name) VALUES (?, ?, ?, ?, ?, ?)');
    
    $count = 0;
    // Pour chaque date
    foreach ($dates as $date => $numEntries) {
        echo "Génération de $numEntries entrées pour $date...\n";
        
        // Générer le nombre d'entrées spécifié pour cette date
        for ($i = 0; $i < $numEntries; $i++) {
            $hour = rand(8, 17);
            $minute = rand(0, 59);
            $time = sprintf('%02d:%02d:00', $hour, $minute);
            
            $badgeNumber = $badges[array_rand($badges)];
            $eventType = $eventTypes[array_rand($eventTypes)];
            $central = $centrals[array_rand($centrals)];
            $groupName = ($eventType === 'Utilisateur accepté') ? $groupNames[array_rand($groupNames)] : '';
            
            $stmt->execute([$date, $time, $badgeNumber, $eventType, $central, $groupName]);
            $count++;
        }
    }
    
    echo "$count entrées insérées au total.\n";

    // Vérifier les données insérées
    $result = $pdo->query('SELECT event_date, COUNT(*) as count FROM access_logs GROUP BY event_date ORDER BY event_date DESC');
    echo "Entrées par date :\n";
    while ($row = $result->fetch(PDO::FETCH_ASSOC)) {
        echo "- {$row['event_date']}: {$row['count']} entrées\n";
    }

    echo "\nScript terminé avec succès.\n";
} catch (PDOException $e) {
    echo "Erreur : " . $e->getMessage() . "\n";
    exit(1);
} 