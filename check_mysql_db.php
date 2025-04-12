<?php
// Script pour vérifier la structure de la base de données MySQL

echo "=== Vérification de la base de données MySQL ===\n";

try {
    // Charger les variables d'environnement à partir du fichier .env
    $envFile = __DIR__ . '/.env';
    if (file_exists($envFile)) {
        $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        foreach ($lines as $line) {
            if (strpos($line, '#') === 0 || !strpos($line, '=')) {
                continue;
            }
            list($key, $value) = explode('=', $line, 2);
            $key = trim($key);
            $value = trim($value);
            if (!empty($key)) {
                putenv("$key=$value");
                $_ENV[$key] = $value;
            }
        }
    } else {
        die("Erreur: Fichier .env introuvable.\n");
    }

    // Récupérer les informations de connexion MySQL
    $host = getenv('DB_HOST') ?: 'localhost';
    $port = getenv('DB_PORT') ?: '3306';
    $dbname = getenv('DB_DATABASE') ?: 'senator_db';
    $username = getenv('DB_USERNAME') ?: 'root';
    $password = getenv('DB_PASSWORD') ?: '';

    echo "Tentative de connexion à MySQL: host=$host, port=$port, dbname=$dbname, user=$username\n";

    // Connexion à MySQL
    $dsn = "mysql:host=$host;port=$port;dbname=$dbname;charset=utf8mb4";
    $db = new PDO($dsn, $username, $password);
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    echo "Connexion à MySQL réussie!\n\n";

    // Lister les tables existantes
    $stmt = $db->query("SHOW TABLES");
    $tables = $stmt->fetchAll(PDO::FETCH_COLUMN);

    echo "Tables existantes dans la base de données '$dbname':\n";
    if (empty($tables)) {
        echo "Aucune table trouvée.\n";
    } else {
        echo "- " . implode("\n- ", $tables) . "\n\n";
    }

    // Vérifier si les tables essentielles existent
    $essentialTables = ['users', 'access_logs', 'import_history'];
    $missingTables = array_diff($essentialTables, $tables);

    if (!empty($missingTables)) {
        echo "Tables essentielles manquantes:\n";
        echo "- " . implode("\n- ", $missingTables) . "\n\n";
    } else {
        echo "Toutes les tables essentielles sont présentes.\n\n";
    }

    // Vérifier la structure de la table access_logs si elle existe
    if (in_array('access_logs', $tables)) {
        $stmt = $db->query("DESCRIBE access_logs");
        $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo "Structure de la table access_logs:\n";
        foreach ($columns as $column) {
            echo "- {$column['Field']} ({$column['Type']})" . 
                 ($column['Null'] === 'NO' ? ' NOT NULL' : '') .
                 ($column['Key'] === 'PRI' ? ' PRIMARY KEY' : '') .
                 (!empty($column['Default']) ? " DEFAULT '{$column['Default']}'" : '') . 
                 "\n";
        }

        // Vérifier le nombre d'enregistrements
        $stmt = $db->query("SELECT COUNT(*) FROM access_logs");
        $count = $stmt->fetchColumn();
        echo "\nNombre d'enregistrements dans access_logs: $count\n";
    }

    // Vérifier la structure de la table import_history si elle existe
    if (in_array('import_history', $tables)) {
        $stmt = $db->query("DESCRIBE import_history");
        $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo "\nStructure de la table import_history:\n";
        foreach ($columns as $column) {
            echo "- {$column['Field']} ({$column['Type']})" . 
                 ($column['Null'] === 'NO' ? ' NOT NULL' : '') .
                 ($column['Key'] === 'PRI' ? ' PRIMARY KEY' : '') .
                 (!empty($column['Default']) ? " DEFAULT '{$column['Default']}'" : '') . 
                 "\n";
        }

        // Vérifier le nombre d'enregistrements
        $stmt = $db->query("SELECT COUNT(*) FROM import_history");
        $count = $stmt->fetchColumn();
        echo "\nNombre d'enregistrements dans import_history: $count\n";
    }

} catch (PDOException $e) {
    die("Erreur de connexion MySQL: " . $e->getMessage() . "\n");
} 