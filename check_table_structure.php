<?php
/**
 * Script pour vérifier la structure de la table access_logs
 */
require_once __DIR__ . '/bootstrap.php';

// Connexion à la base de données
try {
    $pdo = new PDO('mysql:host=localhost;dbname=senator_db', 'root', '');
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    echo "Connexion à la base de données réussie.\n";
    
    // Vérifier si la table existe
    $tables = $pdo->query("SHOW TABLES LIKE 'access_logs'")->fetchAll();
    if (count($tables) === 0) {
        echo "La table access_logs n'existe pas.\n";
        exit;
    }
    
    // Récupérer la structure de la table
    $columns = $pdo->query("DESCRIBE access_logs")->fetchAll(PDO::FETCH_ASSOC);
    
    echo "Structure de la table access_logs:\n";
    echo str_repeat('-', 60) . "\n";
    echo sprintf("%-20s | %-15s | %-10s | %-10s\n", "Colonne", "Type", "Null", "Key");
    echo str_repeat('-', 60) . "\n";
    
    foreach ($columns as $column) {
        echo sprintf("%-20s | %-15s | %-10s | %-10s\n", 
            $column['Field'], 
            $column['Type'], 
            $column['Null'], 
            $column['Key']
        );
    }
    
    // Récupérer le nombre d'enregistrements
    $count = $pdo->query("SELECT COUNT(*) FROM access_logs")->fetchColumn();
    echo "\nNombre d'enregistrements dans la table: " . $count . "\n";
    
    // Afficher quelques exemples d'enregistrements
    if ($count > 0) {
        $rows = $pdo->query("SELECT * FROM access_logs LIMIT 3")->fetchAll(PDO::FETCH_ASSOC);
        echo "\nExemples d'enregistrements:\n";
        
        foreach ($rows as $index => $row) {
            echo "Enregistrement " . ($index + 1) . ":\n";
            foreach ($row as $key => $value) {
                echo "  - {$key}: " . (is_null($value) ? "NULL" : $value) . "\n";
            }
            echo "\n";
        }
    }
    
} catch (PDOException $e) {
    echo "Erreur de connexion à la base de données: " . $e->getMessage() . "\n";
}