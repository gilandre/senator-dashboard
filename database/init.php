<?php

require_once __DIR__ . '/../vendor/autoload.php';

// Chargement des variables d'environnement
$dotenv = Dotenv\Dotenv::createImmutable(__DIR__ . '/..');
$dotenv->load();

// Configuration de la base de données
$config = require __DIR__ . '/../config/database.php';

try {
    // Connexion à MySQL sans sélectionner de base de données
    $pdo = new PDO(
        "mysql:host={$config['host']}",
        $config['username'],
        $config['password'],
        $config['options']
    );

    // Lecture du fichier schema.sql
    $sql = file_get_contents(__DIR__ . '/schema.sql');

    // Exécution des requêtes SQL
    $pdo->exec($sql);

    echo "Base de données initialisée avec succès !\n";
} catch (PDOException $e) {
    echo "Erreur lors de l'initialisation de la base de données : " . $e->getMessage() . "\n";
    exit(1);
} 