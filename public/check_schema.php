<?php
// Activation du mode debug
ini_set('display_errors', 1);
error_reporting(E_ALL);

// En-tête pour JSON
header('Content-Type: application/json');

try {
    // Connexion à la base de données
    $dsn = "sqlite:" . __DIR__ . "/../database.sqlite";
    $options = [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ];
    $pdo = new PDO($dsn, null, null, $options);
    
    // Structure de la table access_logs
    $tableStructure = $pdo->query("PRAGMA table_info(access_logs)")->fetchAll();
    
    // Vérifier les colonnes et leurs contraintes
    $columns = [];
    foreach ($tableStructure as $column) {
        $columns[$column['name']] = [
            'type' => $column['type'],
            'notnull' => $column['notnull'] == 1, // Convertir en booléen
            'default' => $column['dflt_value'],
            'primary_key' => $column['pk'] == 1  // Convertir en booléen
        ];
    }
    
    // Liste des contraintes de la table
    $tableConstraints = $pdo->query("PRAGMA index_list(access_logs)")->fetchAll();
    $constraints = [];
    
    foreach ($tableConstraints as $constraint) {
        $indexName = $constraint['name'];
        $isUnique = $constraint['unique'] == 1;
        
        // Obtenir les colonnes impliquées dans cette contrainte
        $indexInfo = $pdo->query("PRAGMA index_info($indexName)")->fetchAll();
        $constraintColumns = [];
        
        foreach ($indexInfo as $indexColumn) {
            $constraintColumns[] = $indexColumn['name'];
        }
        
        $constraints[] = [
            'name' => $indexName,
            'unique' => $isUnique,
            'columns' => $constraintColumns
        ];
    }
    
    // Vérifier si des colonnes NOT NULL sans valeur par défaut
    $problematicColumns = [];
    foreach ($columns as $name => $column) {
        if ($column['notnull'] && $column['default'] === null && !$column['primary_key']) {
            $problematicColumns[] = $name;
        }
    }
    
    echo json_encode([
        'success' => true,
        'table_exists' => true,
        'columns' => $columns,
        'constraints' => $constraints,
        'problematic_columns' => $problematicColumns,
        'recommendation' => !empty($problematicColumns) 
            ? "Les colonnes suivantes sont NOT NULL sans valeur par défaut: " . implode(", ", $problematicColumns) 
            : "Toutes les colonnes sont configurées correctement pour accepter des valeurs NULL ou ont des valeurs par défaut."
    ], JSON_PRETTY_PRINT);
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'trace' => $e->getTraceAsString()
    ], JSON_PRETTY_PRINT);
} 