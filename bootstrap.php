<?php
// Définir le chemin de base
define('BASE_PATH', __DIR__);

// Ajouter l'autoloader
require_once __DIR__ . '/vendor/autoload.php';

// Charger les variables d'environnement
if (file_exists(__DIR__ . '/.env')) {
    $dotenv = Dotenv\Dotenv::createImmutable(__DIR__);
    $dotenv->load();
}

// Configuration de la base de données
use App\Core\Database;
$db = Database::getInstance();

// Configuration des sessions
session_start(); 