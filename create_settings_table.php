<?php

// Charger les variables d'environnement depuis le fichier .env
function loadEnv() {
    $envFile = __DIR__ . '/.env';
    if (!file_exists($envFile)) {
        die("Le fichier .env n'existe pas.\n");
    }

    $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos(trim($line), '#') === 0) {
            continue;
        }

        list($name, $value) = explode('=', $line, 2);
        $name = trim($name);
        $value = trim($value);
        
        // Supprimer les guillemets si présents
        if (strpos($value, '"') === 0 && strrpos($value, '"') === strlen($value) - 1) {
            $value = substr($value, 1, -1);
        }
        
        $_ENV[$name] = $value;
    }
}

// Charger les variables d'environnement
loadEnv();

// Informations de connexion à la base de données
$dbHost = $_ENV['DB_HOST'] ?? 'localhost';
$dbPort = $_ENV['DB_PORT'] ?? '3306';
$dbName = $_ENV['DB_DATABASE'] ?? 'senator_db';
$dbUser = $_ENV['DB_USERNAME'] ?? 'root';
$dbPass = $_ENV['DB_PASSWORD'] ?? '';

try {
    // Connexion à la base de données
    $dsn = "mysql:host={$dbHost};port={$dbPort};dbname={$dbName};charset=utf8mb4";
    $options = [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ];
    
    $pdo = new PDO($dsn, $dbUser, $dbPass, $options);
    
    echo "Connexion à la base de données réussie.\n";
    
    // Vérifier si la table settings existe
    $stmt = $pdo->query("SHOW TABLES LIKE 'settings'");
    $tableExists = $stmt->rowCount() > 0;
    
    if (!$tableExists) {
        echo "La table 'settings' n'existe pas. Création de la table...\n";
        
        // Création de la table settings
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS settings (
                id INT AUTO_INCREMENT PRIMARY KEY,
                setting_key VARCHAR(50) NOT NULL UNIQUE,
                setting_value VARCHAR(255) NOT NULL,
                description TEXT,
                is_public BOOLEAN NOT NULL DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        ");
        
        echo "Table 'settings' créée avec succès.\n";
        
        // Insertion des paramètres par défaut
        $defaultSettings = [
            ['work_day_start_time', '09:00:00', 'Heure de début de la journée de travail', true],
            ['work_day_end_time', '18:00:00', 'Heure de fin de la journée de travail', true],
            ['site_name', 'SENATOR', 'Nom du site', true],
            ['site_description', 'Système de gestion des accès', 'Description du site', true],
            ['timezone', 'Europe/Paris', 'Fuseau horaire', true],
            ['max_login_attempts', '3', 'Nombre maximum de tentatives de connexion', false],
            ['default_language', 'fr', 'Langue par défaut', true],
            ['session_lifetime', '120', 'Durée de vie de la session (minutes)', false],
            ['password_reset_timeout', '3600', 'Délai d\'expiration des liens de réinitialisation de mot de passe (secondes)', false],
            ['file_upload_max_size', '10485760', 'Taille maximale des fichiers téléchargés (octets)', true],
            ['allowed_file_types', 'csv,txt', 'Types de fichiers autorisés pour le téléchargement', true],
            ['backup_enabled', '1', 'Activation des sauvegardes automatiques', false],
            ['backup_frequency', 'daily', 'Fréquence des sauvegardes', false],
            ['backup_retention_days', '30', 'Nombre de jours de conservation des sauvegardes', false],
            ['smtp_host', 'smtp.example.com', 'Serveur SMTP pour l\'envoi d\'emails', false],
            ['smtp_port', '587', 'Port SMTP', false],
            ['smtp_encryption', 'tls', 'Méthode de chiffrement SMTP', false],
            ['smtp_username', 'noreply@example.com', 'Nom d\'utilisateur SMTP', false],
            ['notification_email', 'admin@example.com', 'Adresse email pour les notifications', false]
        ];
        
        $stmt = $pdo->prepare("
            INSERT INTO settings (setting_key, setting_value, description, is_public)
            VALUES (?, ?, ?, ?)
        ");
        
        foreach ($defaultSettings as $setting) {
            $stmt->execute($setting);
        }
        
        echo "Paramètres par défaut insérés dans la table 'settings'.\n";
    } else {
        echo "La table 'settings' existe déjà.\n";
    }
    
    // Vérifier le contenu de la table
    $stmt = $pdo->query("SELECT COUNT(*) as count FROM settings");
    $count = $stmt->fetch()['count'];
    echo "La table 'settings' contient {$count} entrées.\n";
    
    echo "Opération terminée avec succès.\n";
    
} catch (PDOException $e) {
    echo "Erreur de connexion à la base de données: " . $e->getMessage() . "\n";
} 