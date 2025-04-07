<?php
// Afficher les chemins importants
echo "Chemin courant (getcwd): " . getcwd() . "\n";
echo "Chemin du script (__DIR__): " . __DIR__ . "\n";
echo "Chemin du fichier database.sqlite: " . __DIR__ . "/database.sqlite\n";
echo "Existence du fichier database.sqlite: " . (file_exists(__DIR__ . "/database.sqlite") ? "Oui" : "Non") . "\n";

// Essayer de se connecter à la base de données
try {
    $dsn = "sqlite:" . __DIR__ . "/database.sqlite";
    $pdo = new PDO($dsn);
    echo "Connexion à la base de données réussie\n";
    
    $stmt = $pdo->query("SELECT COUNT(*) FROM access_logs");
    $count = $stmt->fetchColumn();
    echo "Nombre d'enregistrements dans access_logs: " . $count . "\n";
} catch (PDOException $e) {
    echo "Erreur de connexion à la base de données: " . $e->getMessage() . "\n";
}

// Vérifier les dossiers temporaires
echo "\nDossiers temporaires:\n";
echo "sys_get_temp_dir(): " . sys_get_temp_dir() . "\n";
echo "Existence du dossier tmp: " . (is_dir(__DIR__ . "/tmp") ? "Oui" : "Non") . "\n";
echo "Permissions du dossier tmp: " . substr(sprintf('%o', fileperms(__DIR__ . "/tmp")), -4) . "\n";

// Vérifier les dossiers de sessions
echo "\nDossiers de sessions:\n";
echo "session.save_path: " . ini_get('session.save_path') . "\n";
echo "Existence du dossier sessions: " . (is_dir(__DIR__ . "/sessions") ? "Oui" : "Non") . "\n";
echo "Permissions du dossier sessions: " . substr(sprintf('%o', fileperms(__DIR__ . "/sessions")), -4) . "\n"; 