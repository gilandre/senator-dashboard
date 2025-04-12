<?php
// Définir le chemin de base
define('BASE_PATH', __DIR__);

// Inclure l'autoloader de Composer
require_once __DIR__ . '/vendor/autoload.php';

// Charger les variables d'environnement à partir du fichier .env
function loadEnvironmentVars() {
    $envFile = __DIR__ . '/.env';
    
    if (file_exists($envFile)) {
        $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        
        foreach ($lines as $line) {
            if (strpos($line, '=') !== false && strpos($line, '#') !== 0) {
                list($key, $value) = explode('=', $line, 2);
                $key = trim($key);
                $value = trim($value);
                
                // Supprimer les guillemets si présents
                if (strpos($value, '"') === 0 && strrpos($value, '"') === strlen($value) - 1) {
                    $value = substr($value, 1, -1);
                }
                
                $_ENV[$key] = $value;
                putenv("$key=$value");
            }
        }
    }
}

// Charger les variables d'environnement
loadEnvironmentVars();

// Configuration de la base de données
use App\Core\Database;
$db = Database::getInstance();

// Configuration des sessions
session_start(); 