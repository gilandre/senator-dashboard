<?php
/**
 * Script pour vérifier et réparer les enregistrements avec des valeurs NULL problématiques
 * 
 * Ce script:
 * 1. Vérifie les enregistrements de la table access_logs avec des valeurs NULL
 * 2. Identifie les champs obligatoires sans valeur
 * 3. Corrige les enregistrements en remplaçant les valeurs NULL par des valeurs par défaut
 */

// Charger l'environnement
require_once __DIR__ . '/vendor/autoload.php';
$dotenv = Dotenv\Dotenv::createImmutable(__DIR__);
$dotenv->load();

// Connexion à la base de données
try {
    $dsn = "mysql:host={$_ENV['DB_HOST']};dbname={$_ENV['DB_DATABASE']};charset=utf8";
    $options = [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ];
    $pdo = new PDO($dsn, $_ENV['DB_USERNAME'], $_ENV['DB_PASSWORD'], $options);
    echo "Connexion à la base de données réussie.\n";
} catch (PDOException $e) {
    die("Erreur de connexion: " . $e->getMessage() . "\n");
}

// Vérifier la structure de la table access_logs
echo "Vérification de la structure de la table access_logs...\n";
$stmt = $pdo->query("DESCRIBE access_logs");
$columns = $stmt->fetchAll(PDO::FETCH_ASSOC);

$columnInfo = [];
foreach ($columns as $column) {
    $isNullable = $column['Null'] === 'YES';
    $columnInfo[$column['Field']] = [
        'nullable' => $isNullable,
        'type' => $column['Type'],
        'default' => $column['Default']
    ];
    echo "- {$column['Field']}: " . 
         ($isNullable ? "NULL autorisé" : "NOT NULL") . 
         ", Type: {$column['Type']}" . 
         ($column['Default'] !== null ? ", Défaut: {$column['Default']}" : "") . "\n";
}

// Rechercher les enregistrements avec des valeurs NULL pour les champs obligatoires
echo "\nRecherche d'enregistrements problématiques...\n";

$requiredNullFields = [];
foreach ($columnInfo as $field => $info) {
    if (!$info['nullable']) {
        $requiredNullFields[] = "$field IS NULL";
    }
}

if (empty($requiredNullFields)) {
    echo "Aucun champ obligatoire (NOT NULL) dans la table.\n";
} else {
    $nullCondition = implode(' OR ', $requiredNullFields);
    $stmt = $pdo->query("SELECT COUNT(*) FROM access_logs WHERE $nullCondition");
    $nullCount = $stmt->fetchColumn();
    
    echo "Nombre d'enregistrements avec des champs obligatoires NULL: $nullCount\n";
    
    if ($nullCount > 0) {
        echo "\nRécupération des enregistrements problématiques...\n";
        $stmt = $pdo->query("SELECT * FROM access_logs WHERE $nullCondition LIMIT 100");
        $problematicRecords = $stmt->fetchAll();
        
        echo "Exemples de $nullCount enregistrements problématiques (limité à 100):\n";
        foreach ($problematicRecords as $index => $record) {
            echo "\nEnregistrement #" . ($index + 1) . " (ID: {$record['id']}):\n";
            foreach ($record as $field => $value) {
                $isNull = $value === null ? "NULL" : $value;
                $isRequired = !$columnInfo[$field]['nullable'] ? " (Obligatoire)" : "";
                echo "  - $field: $isNull$isRequired\n";
            }
        }
        
        // Proposer de réparer les enregistrements
        echo "\nSouhaitez-vous réparer ces enregistrements? (o/n): ";
        $handle = fopen("php://stdin", "r");
        $line = trim(fgets($handle));
        fclose($handle);
        
        if (strtolower($line) === 'o' || strtolower($line) === 'oui') {
            echo "\nRéparation des enregistrements...\n";
            
            // Préparation des valeurs par défaut
            $defaults = [
                'event_date' => date('Y-m-d'),
                'event_time' => '00:00:00',
                'badge_number' => '000000', // Une valeur par défaut fictive
                'event_type' => 'Inconnu'
            ];
            
            $repaired = 0;
            $errors = 0;
            
            // Parcourir les champs obligatoires
            foreach ($columnInfo as $field => $info) {
                if (!$info['nullable']) {
                    $defaultValue = $defaults[$field] ?? '';
                    echo "Réparation du champ $field avec la valeur par défaut: $defaultValue\n";
                    
                    try {
                        // Mettre à jour les enregistrements avec NULL dans ce champ
                        $stmt = $pdo->prepare("UPDATE access_logs SET $field = ? WHERE $field IS NULL");
                        $stmt->execute([$defaultValue]);
                        $affectedRows = $stmt->rowCount();
                        $repaired += $affectedRows;
                        echo "- $affectedRows enregistrements mis à jour pour $field\n";
                    } catch (PDOException $e) {
                        echo "- Erreur lors de la mise à jour de $field: " . $e->getMessage() . "\n";
                        $errors++;
                    }
                }
            }
            
            echo "\nRésumé de la réparation:\n";
            echo "- Enregistrements traités: $nullCount\n";
            echo "- Champs réparés: $repaired\n";
            echo "- Erreurs rencontrées: $errors\n";
            
            // Vérifier s'il reste des enregistrements problématiques
            $stmt = $pdo->query("SELECT COUNT(*) FROM access_logs WHERE $nullCondition");
            $remainingNull = $stmt->fetchColumn();
            echo "- Enregistrements problématiques restants: $remainingNull\n";
        } else {
            echo "Réparation annulée.\n";
        }
    }
}

// Rechercher d'autres problèmes potentiels
echo "\nRecherche d'autres anomalies...\n";

// 1. Vérifier les dates invalides (en utilisant STR_TO_DATE pour éviter l'erreur)
$stmt = $pdo->query("SELECT COUNT(*) FROM access_logs WHERE event_date IS NULL");
$invalidDatesNull = $stmt->fetchColumn();
echo "- Dates NULL: $invalidDatesNull\n";

try {
    // Utiliser une approche plus sûre pour détecter les dates invalides
    $stmt = $pdo->query("SELECT COUNT(*) FROM access_logs WHERE event_date < '1000-01-01' OR event_date > '2100-01-01'");
    $invalidDatesRange = $stmt->fetchColumn();
    echo "- Dates hors plage valide: $invalidDatesRange\n";
} catch (PDOException $e) {
    echo "- Erreur lors de la vérification des dates invalides: " . $e->getMessage() . "\n";
}

// 2. Vérifier les numéros de badge vides
$stmt = $pdo->query("SELECT COUNT(*) FROM access_logs WHERE badge_number = '' OR badge_number IS NULL");
$emptyBadges = $stmt->fetchColumn();
echo "- Numéros de badge vides: $emptyBadges\n";

// 3. Vérifier les types d'événements vides
$stmt = $pdo->query("SELECT COUNT(*) FROM access_logs WHERE event_type = '' OR event_type IS NULL");
$emptyEventTypes = $stmt->fetchColumn();
echo "- Types d'événements vides: $emptyEventTypes\n";

// 4. Afficher quelques exemples d'enregistrements problématiques
try {
    $stmt = $pdo->query("SELECT * FROM access_logs WHERE 
                         event_date < '1000-01-01' OR 
                         event_date > '2100-01-01' OR 
                         badge_number = '' OR 
                         event_type = '' LIMIT 5");
    $examples = $stmt->fetchAll();
    
    if (count($examples) > 0) {
        echo "\nExemples d'enregistrements problématiques:\n";
        foreach ($examples as $index => $record) {
            echo "\nEnregistrement #" . ($index + 1) . " (ID: {$record['id']}):\n";
            foreach ($record as $field => $value) {
                echo "  - $field: " . ($value === null ? "NULL" : $value) . "\n";
            }
        }
    }
} catch (PDOException $e) {
    echo "Erreur lors de la récupération des exemples: " . $e->getMessage() . "\n";
}

echo "\nAnalyse terminée.\n"; 