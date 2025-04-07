<?php
try {
    $dsn = "sqlite:" . __DIR__ . "/database.sqlite";
    $options = [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ];
    $pdo = new PDO($dsn, null, null, $options);
    echo "Connexion réussie\n";
    $stmt = $pdo->query("SELECT COUNT(*) FROM access_logs");
    $count = $stmt->fetchColumn();
    echo "Nombre d'enregistrements : " . $count . "\n";
} catch (PDOException $e) {
    echo "Erreur : " . $e->getMessage() . "\n";
} 