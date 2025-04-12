<?php

// Connexion à la base de données
try {
    $db = new PDO('mysql:host=localhost;dbname=senator_db;charset=utf8', 'root', '');
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    echo "Connexion à la base de données réussie.\n";
} catch (PDOException $e) {
    die("Erreur de connexion : " . $e->getMessage() . "\n");
}

// Vérifier la structure complète de la table
try {
    $stmt = $db->query("SHOW TABLES LIKE 'import_history'");
    $tableExists = $stmt->rowCount() > 0;
    
    if (!$tableExists) {
        echo "La table import_history n'existe pas. Création de la table...\n";
        
        $sql = "CREATE TABLE import_history (
            id INT AUTO_INCREMENT PRIMARY KEY,
            import_date DATETIME DEFAULT CURRENT_TIMESTAMP,
            total_records INT NOT NULL,
            imported_records INT NOT NULL,
            duplicate_records INT NOT NULL,
            error_records INT NOT NULL,
            file_name VARCHAR(255),
            user_id INT,
            total_rows INT
        )";
        
        $db->exec($sql);
        echo "Table import_history créée avec succès.\n";
    } else {
        echo "La table import_history existe déjà.\n";
        
        // Vérifier si la colonne file_name existe
        $stmt = $db->query("SHOW COLUMNS FROM import_history LIKE 'file_name'");
        $columnExists = $stmt->rowCount() > 0;
        
        if (!$columnExists) {
            echo "La colonne file_name n'existe pas. Ajout de la colonne...\n";
            $db->exec("ALTER TABLE import_history ADD COLUMN file_name VARCHAR(255)");
            echo "Colonne file_name ajoutée avec succès.\n";
        } else {
            echo "La colonne file_name existe déjà.\n";
        }
        
        // Vérifier si la colonne total_rows existe
        $stmt = $db->query("SHOW COLUMNS FROM import_history LIKE 'total_rows'");
        $columnExists = $stmt->rowCount() > 0;
        
        if (!$columnExists) {
            echo "La colonne total_rows n'existe pas. Ajout de la colonne...\n";
            $db->exec("ALTER TABLE import_history ADD COLUMN total_rows INT");
            echo "Colonne total_rows ajoutée avec succès.\n";
        } else {
            echo "La colonne total_rows existe déjà.\n";
        }
        
        // Vérifier si la colonne imported_rows existe
        $stmt = $db->query("SHOW COLUMNS FROM import_history LIKE 'imported_rows'");
        $columnExists = $stmt->rowCount() > 0;
        
        if (!$columnExists) {
            echo "La colonne imported_rows n'existe pas. Ajout de la colonne...\n";
            $db->exec("ALTER TABLE import_history ADD COLUMN imported_rows INT");
            echo "Colonne imported_rows ajoutée avec succès.\n";
        } else {
            echo "La colonne imported_rows existe déjà.\n";
        }
        
        // Vérifier les noms des colonnes relatives aux statistiques et les renommer si nécessaire
        $stmt = $db->query("SHOW COLUMNS FROM import_history");
        $columns = [];
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $columns[$row['Field']] = $row;
        }
        
        // Mapping des noms de colonnes
        $columnMappings = [
            'total_records' => 'total_records',
            'imported_records' => 'imported_records',
            'duplicate_records' => 'duplicate_records',
            'error_records' => 'error_records'
        ];
        
        foreach ($columnMappings as $expectedName => $actualName) {
            if (!isset($columns[$expectedName]) && isset($columns[$actualName])) {
                echo "Renommage de la colonne {$actualName} en {$expectedName}...\n";
                $db->exec("ALTER TABLE import_history CHANGE {$actualName} {$expectedName} INT");
                echo "Colonne renommée avec succès.\n";
            }
        }
    }
    
    // Afficher la structure de la table
    $stmt = $db->query("DESCRIBE import_history");
    echo "\nStructure de la table import_history :\n";
    echo "------------------------------------\n";
    echo "Colonne\t\tType\t\tNull\tClé\tDéfaut\n";
    echo "------------------------------------\n";
    
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        printf("%s\t\t%s\t\t%s\t%s\t%s\n", 
            $row['Field'], 
            $row['Type'], 
            $row['Null'], 
            $row['Key'], 
            $row['Default'] ?? 'NULL'
        );
    }
    
} catch (PDOException $e) {
    die("Erreur : " . $e->getMessage() . "\n");
} 