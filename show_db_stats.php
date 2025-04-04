<?php
// Script pour déboguer les statistiques de la base de données

echo "==== Statistiques de la base de données pour le dashboard ====\n\n";

try {
    // Connexion à la base de données
    $pdo = new PDO('sqlite:database.sqlite');
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    // 1. Dates disponibles
    echo "1. Dates disponibles dans access_logs:\n";
    $result = $pdo->query('SELECT event_date, COUNT(*) as count FROM access_logs GROUP BY event_date ORDER BY event_date DESC');
    while ($row = $result->fetch(PDO::FETCH_ASSOC)) {
        echo "   - {$row['event_date']}: {$row['count']} entrées\n";
    }
    echo "\n";
    
    // 2. Statistiques quotidiennes pour la date la plus récente
    $latestDate = $pdo->query('SELECT MAX(event_date) as latest_date FROM access_logs')->fetch(PDO::FETCH_ASSOC)['latest_date'];
    echo "2. Statistiques quotidiennes pour {$latestDate}:\n";
    
    $sql = "SELECT 
            COUNT(DISTINCT badge_number) as total_people,
            COUNT(CASE WHEN event_type = 'Utilisateur accepté' THEN 1 END) as validated_entries,
            COUNT(DISTINCT CASE WHEN event_type = 'Utilisateur accepté' THEN badge_number END) as unique_entries,
            COUNT(CASE WHEN event_type = 'Utilisateur inconnu' THEN 1 END) as failed_attempts
        FROM access_logs 
        WHERE event_date = ?";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$latestDate]);
    $stats = $stmt->fetch(PDO::FETCH_ASSOC);
    
    echo "   - Total personnes: {$stats['total_people']}\n";
    echo "   - Entrées validées: {$stats['validated_entries']}\n";
    echo "   - Entrées uniques: {$stats['unique_entries']}\n";
    echo "   - Tentatives échouées: {$stats['failed_attempts']}\n";
    echo "\n";
    
    // 3. Heures de pointe
    echo "3. Heures de pointe pour {$latestDate}:\n";
    
    $sql = "SELECT 
            strftime('%H', event_time) as hour,
            COUNT(CASE WHEN event_type = 'Utilisateur accepté' THEN 1 END) as entry_count
        FROM access_logs 
        WHERE event_date = ?
        GROUP BY hour
        ORDER BY hour";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$latestDate]);
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        echo "   - {$row['hour']}h: {$row['entry_count']} entrées\n";
    }
    echo "\n";
    
    // 4. Top localisations
    echo "4. Top localisations pour {$latestDate}:\n";
    
    $sql = "SELECT 
            central as location,
            COUNT(CASE WHEN event_type = 'Utilisateur accepté' THEN 1 END) as entry_count
        FROM access_logs 
        WHERE event_date = ?
        GROUP BY central
        ORDER BY entry_count DESC
        LIMIT 5";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$latestDate]);
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        echo "   - {$row['location']}: {$row['entry_count']} entrées\n";
    }
    echo "\n";
    
    // 5. Statistiques par groupe
    echo "5. Statistiques par groupe pour {$latestDate}:\n";
    
    $sql = "SELECT 
            group_name as action_type,
            COUNT(DISTINCT badge_number) as user_count,
            COUNT(*) as action_count
        FROM access_logs 
        WHERE event_date = ? AND group_name != ''
        GROUP BY group_name
        ORDER BY user_count DESC";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$latestDate]);
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        echo "   - {$row['action_type']}: {$row['user_count']} utilisateurs, {$row['action_count']} actions\n";
    }
    echo "\n";

    echo "Script terminé avec succès.\n";
} catch (PDOException $e) {
    echo "Erreur : " . $e->getMessage() . "\n";
    exit(1);
} 