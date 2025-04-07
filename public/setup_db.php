<?php
// Script pour créer ou mettre à jour la structure de la base de données

// Configuration
$dbFile = __DIR__ . '/../database.sqlite';

// Vérifier si la base de données existe déjà
$dbExists = file_exists($dbFile);

// Connexion à la base de données SQLite
try {
    $db = new PDO("sqlite:$dbFile");
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    echo "Connexion à la base de données réussie.\n";
} catch (PDOException $e) {
    die("Erreur de connexion à la base de données: " . $e->getMessage() . "\n");
}

// Création des tables si elles n'existent pas
$tables = [
    // Table des utilisateurs
    "CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        email TEXT UNIQUE,
        role TEXT NOT NULL DEFAULT 'user',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )",
    
    // Table des journaux d'accès
    "CREATE TABLE IF NOT EXISTS access_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_date DATE NOT NULL,
        event_time TIME NOT NULL,
        badge_number TEXT NOT NULL,
        event_type TEXT NOT NULL,
        central TEXT,
        group_name TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )",
    
    // Table des paramètres
    "CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key TEXT NOT NULL UNIQUE,
        value TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )",
    
    // Table des rapports
    "CREATE TABLE IF NOT EXISTS reports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        type TEXT NOT NULL,
        parameters TEXT,
        user_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
    )",
    
    // Table d'historique des importations
    "CREATE TABLE IF NOT EXISTS import_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        filename TEXT NOT NULL,
        import_date DATETIME NOT NULL,
        user_id INTEGER,
        username TEXT,
        total_records INTEGER NOT NULL DEFAULT 0,
        imported_records INTEGER NOT NULL DEFAULT 0,
        duplicate_records INTEGER NOT NULL DEFAULT 0,
        error_records INTEGER NOT NULL DEFAULT 0,
        success_rate INTEGER NOT NULL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
    )"
];

// Exécution des requêtes de création de tables
foreach ($tables as $sql) {
    try {
        $db->exec($sql);
        echo "Table créée avec succès.\n";
    } catch (PDOException $e) {
        echo "Erreur lors de la création de la table: " . $e->getMessage() . "\n";
    }
}

// Création d'un utilisateur admin par défaut si la base de données vient d'être créée
if (!$dbExists) {
    try {
        $adminExists = $db->query("SELECT COUNT(*) FROM users WHERE username = 'admin'")->fetchColumn();
        
        if (!$adminExists) {
            $password = password_hash('admin123', PASSWORD_DEFAULT);
            $db->exec("INSERT INTO users (username, password, email, role) VALUES ('admin', '$password', 'admin@example.com', 'admin')");
            echo "Utilisateur admin créé avec succès. Identifiant: admin, Mot de passe: admin123\n";
        }
    } catch (PDOException $e) {
        echo "Erreur lors de la création de l'utilisateur admin: " . $e->getMessage() . "\n";
    }
}

echo "Configuration de la base de données terminée.\n"; 