<?php

// Chemin vers la base de données SQLite
$dbPath = __DIR__ . '/database/senator.sqlite';

// Vérifier si le dossier database existe, sinon le créer
if (!file_exists(__DIR__ . '/database')) {
    mkdir(__DIR__ . '/database', 0777, true);
    echo "Dossier database créé.\n";
}

try {
    // Connexion à la base de données SQLite
    $db = new PDO('sqlite:' . $dbPath);
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    echo "Connexion à la base de données SQLite réussie.\n";
    
    // Définir les requêtes de création de tables
    $tables = [
        'access_logs' => "CREATE TABLE IF NOT EXISTS access_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            event_date TEXT NOT NULL,
            event_time TEXT NOT NULL,
            badge_number TEXT NOT NULL,
            event_type TEXT,
            central TEXT,
            group_name TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )",
        
        'import_history' => "CREATE TABLE IF NOT EXISTS import_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            import_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            total_records INTEGER DEFAULT 0,
            imported_records INTEGER DEFAULT 0,
            duplicate_records INTEGER DEFAULT 0,
            error_records INTEGER DEFAULT 0,
            file_name TEXT,
            user_id INTEGER,
            username TEXT,
            success_rate REAL DEFAULT 0,
            total_rows INTEGER DEFAULT 0,
            imported_rows INTEGER DEFAULT 0,
            filename TEXT
        )",
        
        'users' => "CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            password TEXT NOT NULL,
            email TEXT UNIQUE,
            role TEXT DEFAULT 'user',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )"
    ];
    
    // Créer les tables
    foreach ($tables as $tableName => $createStatement) {
        $db->exec($createStatement);
        echo "Table {$tableName} créée avec succès ou déjà existante.\n";
    }
    
    // Vérifier si la table users a des enregistrements
    $count = $db->query("SELECT COUNT(*) FROM users")->fetchColumn();
    if ($count == 0) {
        // Ajouter un utilisateur admin par défaut
        $hashedPassword = password_hash('admin', PASSWORD_DEFAULT);
        $db->exec("INSERT INTO users (username, password, email, role) VALUES ('admin', '{$hashedPassword}', 'admin@example.com', 'admin')");
        echo "Utilisateur admin créé avec le mot de passe 'admin'.\n";
    } else {
        echo "Des utilisateurs existent déjà dans la table users.\n";
    }
    
    echo "\nInitialisation de la base de données SQLite terminée avec succès.\n";
    
} catch (PDOException $e) {
    die("Erreur lors de l'initialisation de la base de données : " . $e->getMessage() . "\n");
} 