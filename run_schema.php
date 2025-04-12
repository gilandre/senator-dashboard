<?php
// Récupérer les informations de connexion depuis le fichier .env
$envFile = file_get_contents('.env');
preg_match('/DB_HOST=(.*)/', $envFile, $hostMatches);
preg_match('/DB_USERNAME=(.*)/', $envFile, $usernameMatches);
preg_match('/DB_PASSWORD=(.*)/', $envFile, $passwordMatches);
preg_match('/DB_DATABASE=(.*)/', $envFile, $databaseMatches);

$host = trim($hostMatches[1]);
$username = trim($usernameMatches[1]);
$password = trim($passwordMatches[1]);
$database = trim($databaseMatches[1]);

try {
    // Créer la connexion à la base de données
    $pdo = new PDO("mysql:host=$host;dbname=$database", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    echo "Connexion à la base de données réussie.\n";
    
    // Lire le fichier schema.sql
    $sql = file_get_contents('schema.sql');
    
    // Diviser les requêtes SQL (séparées par des points-virgules)
    $queries = explode(';', $sql);
    
    // Exécuter chaque requête
    foreach ($queries as $query) {
        $query = trim($query);
        if (!empty($query)) {
            try {
                $pdo->exec($query);
                echo "Requête exécutée avec succès.\n";
            } catch (PDOException $e) {
                echo "Erreur dans la requête : " . $e->getMessage() . "\n";
                // Afficher la requête qui pose problème
                echo "Requête problématique : " . $query . "\n";
            }
        }
    }
    
    echo "Toutes les requêtes ont été exécutées.\n";
    
} catch (PDOException $e) {
    echo "Erreur de connexion à la base de données : " . $e->getMessage() . "\n";
}
?> 