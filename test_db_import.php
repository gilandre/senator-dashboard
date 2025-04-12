<?php
/**
 * Script de test pour l'importation directe des données dans la base
 * Ce script utilise directement le service d'importation pour tester le processus complet
 */

// Inclusion des fichiers nécessaires
require_once __DIR__ . '/bootstrap.php';

// Chemins des fichiers
$csvFilePath = __DIR__ . '/Exportation 1.csv';
$logFile = __DIR__ . '/import_direct_test_log.txt';

// Vérifier si le fichier existe
if (!file_exists($csvFilePath)) {
    die("ERREUR: Le fichier CSV n'existe pas à l'emplacement: {$csvFilePath}\n");
}

// Initialiser le journal
file_put_contents($logFile, "=== TEST D'IMPORTATION DIRECTE ===\n");
file_put_contents($logFile, "Date: " . date('Y-m-d H:i:s') . "\n", FILE_APPEND);
file_put_contents($logFile, "Fichier: {$csvFilePath}\n\n", FILE_APPEND);

try {
    // Créer une instance du service d'importation
    $csvImportService = new App\Services\CsvImportService();
    
    // Paramètres d'importation
    $separator = ';';
    $hasHeader = true;
    
    file_put_contents($logFile, "Paramètres: separator={$separator}, hasHeader=" . ($hasHeader ? 'true' : 'false') . "\n", FILE_APPEND);
    
    // Étape 1: Lecture du fichier CSV
    file_put_contents($logFile, "\n=== ÉTAPE 1: LECTURE DU FICHIER CSV ===\n", FILE_APPEND);
    $startTime = microtime(true);
    
    $data = $csvImportService->readCSV($csvFilePath, $separator, $hasHeader);
    
    $endTime = microtime(true);
    $duration = round($endTime - $startTime, 2);
    
    $rowCount = count($data);
    file_put_contents($logFile, "Lecture terminée en {$duration} secondes\n", FILE_APPEND);
    file_put_contents($logFile, "Nombre total de lignes: {$rowCount}\n", FILE_APPEND);
    
    if ($rowCount > 0) {
        // Afficher les en-têtes
        $headers = array_keys($data[0]);
        file_put_contents($logFile, "En-têtes détectés: " . implode(', ', $headers) . "\n", FILE_APPEND);
        
        // Afficher quelques exemples de données
        file_put_contents($logFile, "\nExemple de données (3 premières lignes):\n", FILE_APPEND);
        for ($i = 0; $i < min(3, $rowCount); $i++) {
            file_put_contents($logFile, "Ligne " . ($i + 1) . ": " . json_encode($data[$i], JSON_UNESCAPED_UNICODE) . "\n", FILE_APPEND);
        }
    }
    
    // Étape 2: Validation des données
    file_put_contents($logFile, "\n=== ÉTAPE 2: VALIDATION DES DONNÉES ===\n", FILE_APPEND);
    $startTime = microtime(true);
    
    $validationService = new App\Services\CsvValidationService();
    $validationService->validateImportData($data);
    
    $endTime = microtime(true);
    $duration = round($endTime - $startTime, 2);
    
    $errorCount = $validationService->getErrorCount();
    $warningCount = $validationService->getWarningCount();
    
    file_put_contents($logFile, "Validation terminée en {$duration} secondes\n", FILE_APPEND);
    file_put_contents($logFile, "Erreurs: {$errorCount}, Avertissements: {$warningCount}\n", FILE_APPEND);
    
    if ($errorCount > 0) {
        file_put_contents($logFile, "\nErreurs détectées:\n", FILE_APPEND);
        foreach ($validationService->getErrors() as $rowIndex => $errors) {
            file_put_contents($logFile, "Ligne {$rowIndex}: " . implode(', ', $errors) . "\n", FILE_APPEND);
        }
    }
    
    // Étape 3: Importation dans la base de données
    file_put_contents($logFile, "\n=== ÉTAPE 3: IMPORTATION DANS LA BASE DE DONNÉES ===\n", FILE_APPEND);
    
    // Créer une instance de la base de données
    $db = App\Core\Database::getInstance();
    
    // Vider la table d'accès si nécessaire pour un test propre
    if (isset($argv[1]) && $argv[1] === '--clean') {
        file_put_contents($logFile, "Nettoyage de la table d'accès...\n", FILE_APPEND);
        $db->query("TRUNCATE TABLE access_logs");
    }
    
    // Pour le GET, Database::query() retourne le tableau de résultats, pas un objet statement
    // Compter les enregistrements existants directement via PDO
    $pdo = $db->getConnection();
    $stmt = $pdo->query("SELECT COUNT(*) FROM access_logs");
    $existingCount = (int)$stmt->fetchColumn();
    file_put_contents($logFile, "Nombre d'enregistrements existants: {$existingCount}\n", FILE_APPEND);
    
    // Importation réelle
    $startTime = microtime(true);
    
    // Créer une instance du contrôleur d'importation pour accéder à ses méthodes
    $importController = new App\Controllers\ImportController();
    
    // Essayer la méthode importDataImproved si elle existe, sinon utiliser importData
    try {
        $importMethod = new ReflectionMethod('App\Controllers\ImportController', 'importDataImproved');
        $methodName = 'importDataImproved';
    } catch (ReflectionException $e) {
        $importMethod = new ReflectionMethod('App\Controllers\ImportController', 'importData');
        $methodName = 'importData';
    }
    
    file_put_contents($logFile, "Utilisation de la méthode: {$methodName}\n", FILE_APPEND);
    $importMethod->setAccessible(true);
    
    // Appeler la méthode d'importation
    $result = $importMethod->invoke($importController, $data);
    
    $endTime = microtime(true);
    $duration = round($endTime - $startTime, 2);
    
    file_put_contents($logFile, "Importation terminée en {$duration} secondes\n", FILE_APPEND);
    file_put_contents($logFile, "Résultat de l'importation: " . json_encode($result, JSON_UNESCAPED_UNICODE) . "\n", FILE_APPEND);
    
    // Vérifier le nombre d'enregistrements après importation, directement via PDO
    $stmt = $pdo->query("SELECT COUNT(*) FROM access_logs");
    $newCount = (int)$stmt->fetchColumn();
    $importedCount = $newCount - $existingCount;
    
    file_put_contents($logFile, "\nNombre d'enregistrements après importation: {$newCount}\n", FILE_APPEND);
    file_put_contents($logFile, "Nombre d'enregistrements importés: {$importedCount}\n", FILE_APPEND);
    
    // Vérifier si le nombre d'enregistrements importés correspond au nombre attendu
    if ($importedCount == $result['inserted']) {
        file_put_contents($logFile, "\nLe nombre d'enregistrements importés correspond au résultat attendu. Importation réussie!\n", FILE_APPEND);
    } else {
        file_put_contents($logFile, "\nATTENTION: Le nombre d'enregistrements importés ({$importedCount}) ne correspond pas au résultat attendu ({$result['inserted']})\n", FILE_APPEND);
    }
    
    // Afficher un message de résumé
    echo "Test d'importation terminé. Consultez le fichier journal pour plus de détails: {$logFile}\n";
    echo "Résumé: {$rowCount} lignes lues, {$result['inserted']} insérées, {$result['duplicates']} doublons, {$result['errors']} erreurs\n";
    
} catch (Exception $e) {
    file_put_contents($logFile, "\n=== ERREUR ===\n", FILE_APPEND);
    file_put_contents($logFile, "Message: " . $e->getMessage() . "\n", FILE_APPEND);
    file_put_contents($logFile, "Trace: " . $e->getTraceAsString() . "\n", FILE_APPEND);
    
    echo "ERREUR: " . $e->getMessage() . "\n";
} 