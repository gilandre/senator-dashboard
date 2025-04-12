<?php
/**
 * Test simple d'importation directe
 */
require_once __DIR__ . '/bootstrap.php';

// Chemins des fichiers
$csvFilePath = __DIR__ . '/Exportation 1.csv';
$logFile = __DIR__ . '/simple_import_log.txt';

// Vérifier si le fichier existe
if (!file_exists($csvFilePath)) {
    die("ERREUR: Le fichier CSV n'existe pas à l'emplacement: {$csvFilePath}\n");
}

// Initialiser le journal
file_put_contents($logFile, "=== TEST SIMPLE D'IMPORTATION ===\n");
file_put_contents($logFile, "Date: " . date('Y-m-d H:i:s') . "\n\n", FILE_APPEND);

try {
    // Lecture du fichier CSV
    $csvImportService = new App\Services\CsvImportService();
    
    file_put_contents($logFile, "Lecture du fichier CSV...\n", FILE_APPEND);
    $data = $csvImportService->readCSV($csvFilePath, ';', true);
    file_put_contents($logFile, "Nombre de lignes lues: " . count($data) . "\n", FILE_APPEND);
    
    // Connexion directe à la base de données
    $pdo = new PDO('mysql:host=localhost;dbname=senator_db', 'root', '');
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    // Compter les enregistrements existants
    $stmt = $pdo->query("SELECT COUNT(*) FROM access_logs");
    $existingCount = (int)$stmt->fetchColumn();
    file_put_contents($logFile, "Enregistrements existants: {$existingCount}\n", FILE_APPEND);
    
    // Importer les données directement
    file_put_contents($logFile, "Début d'importation...\n", FILE_APPEND);
    $startTime = microtime(true);
    
    $insertCount = 0;
    $duplicateCount = 0;
    $errorCount = 0;
    
    $pdo->beginTransaction();
    
    foreach ($data as $index => $row) {
        try {
            // Vérification de base
            if (empty($row['Numéro de badge'])) {
                throw new Exception("Badge manquant à la ligne " . ($index + 1));
            }
            
            $badgeNumber = $row['Numéro de badge'];
            $eventDate = !empty($row['Date évènements']) ? date('Y-m-d', strtotime(str_replace('/', '-', $row['Date évènements']))) : date('Y-m-d');
            $eventTime = !empty($row['Heure évènements']) ? $row['Heure évènements'] : '00:00:00';
            $eventType = !empty($row['Nature Evenement']) ? $row['Nature Evenement'] : 'Inconnu';
            $controller = !empty($row['Centrale']) ? $row['Centrale'] : null;
            $name = !empty($row['Nom']) ? $row['Nom'] : null;
            $firstName = !empty($row['Prénom']) ? $row['Prénom'] : null;
            $status = !empty($row['Statut']) ? $row['Statut'] : null;
            $group = !empty($row['Groupe']) ? $row['Groupe'] : null;
            
            // Vérifier si c'est un doublon
            $checkStmt = $pdo->prepare("SELECT COUNT(*) FROM access_logs WHERE badge_number = ? AND event_date = ? AND event_time = ?");
            $checkStmt->execute([$badgeNumber, $eventDate, $eventTime]);
            if ((int)$checkStmt->fetchColumn() > 0) {
                $duplicateCount++;
                if ($index < 5) {
                    file_put_contents($logFile, "Doublon détecté: Badge {$badgeNumber} à {$eventDate} {$eventTime}\n", FILE_APPEND);
                }
                continue;
            }
            
            // Insérer dans la base de données
            $insertStmt = $pdo->prepare("
                INSERT INTO access_logs (
                    badge_number, event_date, event_time, event_type, central,
                    first_name, last_name, status, group_name,
                    created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
            ");
            
            $insertStmt->execute([
                $badgeNumber, $eventDate, $eventTime, $eventType, $controller,
                $firstName, $name, $status, $group
            ]);
            
            $insertCount++;
            
            // Log quelques exemples
            if ($index < 5) {
                file_put_contents($logFile, "Insertion réussie: Badge {$badgeNumber} à {$eventDate} {$eventTime}\n", FILE_APPEND);
            }
            
        } catch (Exception $e) {
            $errorCount++;
            file_put_contents($logFile, "Erreur à la ligne " . ($index + 1) . ": " . $e->getMessage() . "\n", FILE_APPEND);
        }
    }
    
    $pdo->commit();
    
    $endTime = microtime(true);
    $duration = round($endTime - $startTime, 2);
    
    // Compter les nouveaux enregistrements
    $stmt = $pdo->query("SELECT COUNT(*) FROM access_logs");
    $newCount = (int)$stmt->fetchColumn();
    $actualInserted = $newCount - $existingCount;
    
    file_put_contents($logFile, "\n=== RÉSULTATS ===\n", FILE_APPEND);
    file_put_contents($logFile, "Durée: {$duration} secondes\n", FILE_APPEND);
    file_put_contents($logFile, "Lignes lues: " . count($data) . "\n", FILE_APPEND);
    file_put_contents($logFile, "Insérées: {$insertCount}\n", FILE_APPEND);
    file_put_contents($logFile, "Doublons: {$duplicateCount}\n", FILE_APPEND);
    file_put_contents($logFile, "Erreurs: {$errorCount}\n", FILE_APPEND);
    file_put_contents($logFile, "Nouveaux enregistrements (réels): {$actualInserted}\n", FILE_APPEND);
    
    echo "Test d'importation terminé. Consultez le fichier journal pour plus de détails: {$logFile}\n";
    echo "Résumé: " . count($data) . " lignes lues, {$insertCount} insérées, {$duplicateCount} doublons, {$errorCount} erreurs\n";
    
} catch (Exception $e) {
    file_put_contents($logFile, "\n=== ERREUR FATALE ===\n", FILE_APPEND);
    file_put_contents($logFile, $e->getMessage() . "\n", FILE_APPEND);
    file_put_contents($logFile, $e->getTraceAsString() . "\n", FILE_APPEND);
    
    echo "ERREUR: " . $e->getMessage() . "\n";
} 