<?php
/**
 * Script de surveillance des performances de l'application SENATOR
 * Ce script collecte les métriques MySQL et les temps de réponse des pages principales
 */

// Configuration de la base de données
$dbHost = 'localhost';
$dbUser = 'root';
$dbPass = '';
$dbName = 'senator_db';

// Configuration des URLs à surveiller
$endpoints = [
    'dashboard' => 'http://localhost:8080/dashboard',
    'api_all_data' => 'http://localhost:8080/dashboard/all-data',
    'users' => 'http://localhost:8080/users',
    'import' => 'http://localhost:8080/import'
];

// Fonction pour le logging
function log_message($message) {
    echo date('Y-m-d H:i:s') . " - $message\n";
}

// Connexion à la base de données
try {
    $db = new PDO("mysql:host=$dbHost;dbname=$dbName", $dbUser, $dbPass);
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    log_message("Connexion à la base de données réussie");
} catch (PDOException $e) {
    log_message("Erreur de connexion à la base de données: " . $e->getMessage());
    exit(1);
}

// Vérifier les variables de performance MySQL
function check_mysql_performance($db) {
    log_message("\n=== MÉTRIQUES MYSQL ===");
    
    // Liste des variables à vérifier
    $variables = [
        'innodb_buffer_pool_size',
        'tmp_table_size',
        'max_heap_table_size',
        'key_buffer_size',
        'max_connections'
    ];
    
    $query = "SHOW VARIABLES WHERE Variable_name IN ('" . implode("','", $variables) . "')";
    $stmt = $db->query($query);
    $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    foreach ($results as $row) {
        $value = $row['Value'];
        
        // Formater la taille en MB pour certaines variables
        if (in_array($row['Variable_name'], ['innodb_buffer_pool_size', 'tmp_table_size', 'max_heap_table_size', 'key_buffer_size'])) {
            $value = round($value / 1024 / 1024, 2) . ' MB';
        }
        
        log_message($row['Variable_name'] . ": " . $value);
    }
    
    // Vérifier l'utilisation du buffer pool
    $query = "SHOW ENGINE INNODB STATUS";
    $stmt = $db->query($query);
    $innodbStatus = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (preg_match('/Buffer pool hit rate\s+(\d+)\s+\/\s+(\d+)/', $innodbStatus['Status'], $matches)) {
        $hitRate = round($matches[1] / $matches[2] * 100, 2);
        log_message("Buffer pool hit rate: $hitRate%");
    }
}

// Vérifier les performances de la table access_logs
function check_table_performance($db) {
    log_message("\n=== MÉTRIQUES DE LA TABLE ACCESS_LOGS ===");
    
    $query = "SHOW TABLE STATUS LIKE 'access_logs'";
    $stmt = $db->query($query);
    $tableStatus = $stmt->fetch(PDO::FETCH_ASSOC);
    
    log_message("Nombre de lignes: " . $tableStatus['Rows']);
    log_message("Taille des données: " . round($tableStatus['Data_length'] / 1024 / 1024, 2) . " MB");
    log_message("Taille des index: " . round($tableStatus['Index_length'] / 1024 / 1024, 2) . " MB");
    log_message("Taille moyenne des lignes: " . $tableStatus['Avg_row_length'] . " bytes");
}

// Mesurer le temps de réponse des endpoints
function check_response_times($endpoints) {
    log_message("\n=== TEMPS DE RÉPONSE DES ENDPOINTS ===");
    
    foreach ($endpoints as $name => $url) {
        $start = microtime(true);
        
        // Ouvrir la connexion
        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HEADER, false);
        curl_setopt($ch, CURLOPT_NOBODY, false);
        curl_setopt($ch, CURLOPT_TIMEOUT, 10);
        
        // Exécuter la requête
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $time = microtime(true) - $start;
        curl_close($ch);
        
        log_message(
            sprintf(
                "Endpoint %s (%s): %s - %.4f secondes", 
                $name, 
                $url, 
                $httpCode == 200 ? "OK" : "ERREUR ($httpCode)", 
                $time
            )
        );
    }
}

// Exécuter les vérifications
try {
    check_mysql_performance($db);
    check_table_performance($db);
    check_response_times($endpoints);
    
    log_message("\nSurveillance des performances terminée avec succès.");
} catch (Exception $e) {
    log_message("Erreur lors de la surveillance des performances: " . $e->getMessage());
} 