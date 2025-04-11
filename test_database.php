<?php
try {
    $host = 'localhost';
    $db   = 'senator_db';
    $user = 'root';
    $pass = '';
    $charset = 'utf8mb4';
    
    $dsn = "mysql:host=$host;dbname=$db;charset=$charset";
    $options = [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ];
    $pdo = new PDO($dsn, $user, $pass, $options);
    echo "Connexion réussie à MySQL\n";
    $stmt = $pdo->query("SELECT COUNT(*) FROM access_logs");
    $count = $stmt->fetchColumn();
    echo "Nombre d'enregistrements : " . $count . "\n";
} catch (PDOException $e) {
    echo "Erreur : " . $e->getMessage() . "\n";
} 