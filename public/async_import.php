<?php
/**
 * Traitement asynchrone des importations volumineuses
 * Ce script est exécuté en arrière-plan via exec()
 * Ne pas appeler directement depuis le navigateur
 */

// Limiter le temps d'exécution à 30 minutes
set_time_limit(1800);

// Inclusion des fichiers nécessaires
require_once __DIR__ . '/../vendor/autoload.php';
require_once __DIR__ . '/../src/Core/Database.php';
require_once __DIR__ . '/../src/Core/Model.php';
require_once __DIR__ . '/../src/models/AccessLog.php';
require_once __DIR__ . '/../src/models/ImportHistory.php';

// Fonction de log pour suivre le traitement
function log_async($message) {
    $logFile = __DIR__ . '/../tmp/async_import.log';
    $timestamp = date('Y-m-d H:i:s');
    file_put_contents($logFile, "[$timestamp] $message" . PHP_EOL, FILE_APPEND);
}

// Vérifier si un ID de session a été fourni
if (empty($argv[1])) {
    log_async("Erreur: Aucun ID de session fourni");
    exit(1);
}

$sessionId = $argv[1];
$markerFile = __DIR__ . '/../tmp/async_import_' . $sessionId . '.json';

// Vérifier si le fichier de marqueur existe
if (!file_exists($markerFile)) {
    log_async("Erreur: Aucun fichier de marqueur trouvé pour la session $sessionId");
    exit(1);
}

// Démarrer la session avec l'ID spécifié
session_id($sessionId);
session_start();

// Vérifier si les données d'importation sont disponibles
if (!isset($_SESSION['async_import']) || !isset($_SESSION['async_import']['data'])) {
    log_async("Erreur: Aucune donnée d'importation trouvée dans la session $sessionId");
    updateMarkerFile($markerFile, 'error', 'Aucune donnée d\'importation trouvée');
    exit(1);
}

try {
    // Récupérer les données d'importation
    $asyncImport = &$_SESSION['async_import'];
    $data = $asyncImport['data'];
    $total = count($data);
    $imported = 0;
    $duplicates = 0;
    $errors = 0;
    $duplicateRecords = [];
    
    log_async("Démarrage du traitement asynchrone pour {$total} lignes");
    
    // Mettre à jour le statut
    $asyncImport['status'] = 'processing';
    updateMarkerFile($markerFile, 'processing');
    
    // Initialiser la connexion à la base de données
    $db = \App\Core\Database::getInstance()->getConnection();
    
    // Traitement des données par lots de 100 pour limiter l'utilisation de la mémoire
    $batchSize = 100;
    $batches = ceil($total / $batchSize);
    
    for ($batchIndex = 0; $batchIndex < $batches; $batchIndex++) {
        $start = $batchIndex * $batchSize;
        $end = min(($batchIndex + 1) * $batchSize, $total);
        $batchData = array_slice($data, $start, $end - $start);
        
        log_async("Traitement du lot " . ($batchIndex + 1) . "/$batches");
        
        foreach ($batchData as $index => $row) {
            $rowIndex = $start + $index;
            
            try {
                // Mettre à jour la progression
                $asyncImport['processed'] = $rowIndex + 1;
                
                // Traitement similaire à ImportController::importData
                if (empty($row['Numéro de badge'])) {
                    log_async("Ligne " . ($rowIndex + 1) . ": Numéro de badge manquant");
                    $errors++;
                    continue;
                }
                
                $dateEvt = !empty($row['Date évènements']) ? $row['Date évènements'] : null;
                if (empty($dateEvt)) {
                    log_async("Ligne " . ($rowIndex + 1) . ": Date événements manquante");
                    $errors++;
                    continue;
                }
                
                $heureEvt = !empty($row['Heure évènements']) ? $row['Heure évènements'] : '00:00:00';
                $eventType = !empty($row['Nature Evenement']) ? $row['Nature Evenement'] : 'Inconnu';
                
                // Formater la date et l'heure
                $formattedDate = formatDate($dateEvt);
                $formattedTime = formatTime($heureEvt);
                
                // Vérifier s'il s'agit d'un doublon
                $sql = "SELECT COUNT(*) FROM access_logs WHERE 
                        badge_number = ? AND 
                        event_date = ? AND 
                        event_time = ? AND 
                        event_type = ?";
                
                $stmt = $db->prepare($sql);
                $stmt->execute([
                    $row['Numéro de badge'],
                    $formattedDate,
                    $formattedTime,
                    $eventType
                ]);
                
                if ($stmt->fetchColumn() > 0) {
                    log_async("Ligne " . ($rowIndex + 1) . ": Doublon détecté");
                    $duplicates++;
                    
                    // Ajouter aux doublons pour extraction future
                    $duplicateRecords[] = [
                        'row_id' => $rowIndex + 1,
                        'badge_number' => $row['Numéro de badge'],
                        'date' => $formattedDate,
                        'time' => $formattedTime,
                        'event_type' => $eventType,
                        'original_data' => $row
                    ];
                    
                    continue;
                }
                
                // Insérer l'enregistrement
                try {
                    $accessLog = new \App\Models\AccessLog();
                    $accessLog->event_date = $formattedDate;
                    $accessLog->event_time = $formattedTime;
                    $accessLog->badge_number = $row['Numéro de badge'];
                    $accessLog->event_type = $eventType;
                    $accessLog->central = !empty($row['Centrale']) ? $row['Centrale'] : null;
                    $accessLog->group_name = !empty($row['Groupe']) ? $row['Groupe'] : null;
                    
                    $accessLog->insert();
                    $imported++;
                } catch (\PDOException $e) {
                    if (strpos($e->getMessage(), 'UNIQUE constraint failed') !== false) {
                        log_async("Ligne " . ($rowIndex + 1) . ": Contrainte d'unicité violée");
                        $duplicates++;
                        
                        // Ajouter aux doublons
                        $duplicateRecords[] = [
                            'row_id' => $rowIndex + 1,
                            'badge_number' => $row['Numéro de badge'],
                            'date' => $formattedDate,
                            'time' => $formattedTime,
                            'event_type' => $eventType,
                            'original_data' => $row,
                            'error' => 'Contrainte d\'unicité violée'
                        ];
                    } else {
                        throw $e;
                    }
                }
            } catch (\Exception $e) {
                log_async("Erreur lors du traitement de la ligne " . ($rowIndex + 1) . ": " . $e->getMessage());
                $errors++;
            }
            
            // Mise à jour du fichier de marqueur toutes les 100 lignes
            if (($rowIndex + 1) % 100 === 0) {
                updateMarkerFile($markerFile, 'processing', '', [
                    'processed' => $rowIndex + 1,
                    'total' => $total,
                    'imported' => $imported,
                    'duplicates' => $duplicates,
                    'errors' => $errors
                ]);
                
                // Mettre à jour les statistiques dans la session
                $asyncImport['imported'] = $imported;
                $asyncImport['duplicates'] = $duplicates;
                $asyncImport['errors'] = $errors;
                
                // Écrire les changements de session sur le disque
                session_write_close();
                session_id($sessionId);
                session_start();
            }
        }
    }
    
    // Stocker les résultats finaux
    $asyncImport['imported'] = $imported;
    $asyncImport['duplicates'] = $duplicates;
    $asyncImport['errors'] = $errors;
    $asyncImport['status'] = 'completed';
    $asyncImport['end_time'] = time();
    
    // Stocker les doublons pour extraction future
    if (!empty($duplicateRecords)) {
        $_SESSION['duplicate_records'] = $duplicateRecords;
    }
    
    // Enregistrer les statistiques dans l'historique d'importation
    $stats = [
        'total' => $total,
        'imported' => $imported,
        'duplicates' => $duplicates,
        'errors' => $errors,
        'success_rate' => ($total > 0) ? round(100 * (($imported + $duplicates) / $total)) : 0
    ];
    
    \App\Models\ImportHistory::saveImportHistory($stats, $asyncImport['filename']);
    
    log_async("Traitement asynchrone terminé. Importé: $imported, Doublons: $duplicates, Erreurs: $errors, Taux de succès: {$stats['success_rate']}%");
    updateMarkerFile($markerFile, 'completed', '', $stats);
    
} catch (\Exception $e) {
    log_async("Erreur fatale: " . $e->getMessage());
    log_async($e->getTraceAsString());
    
    // Mettre à jour le statut
    if (isset($_SESSION['async_import'])) {
        $_SESSION['async_import']['status'] = 'error';
        $_SESSION['async_import']['error'] = $e->getMessage();
    }
    
    updateMarkerFile($markerFile, 'error', $e->getMessage());
}

// Fonctions utilitaires
function updateMarkerFile($file, $status, $message = '', $stats = []) {
    $data = [
        'session_id' => session_id(),
        'status' => $status,
        'last_update' => time()
    ];
    
    if (!empty($message)) {
        $data['message'] = $message;
    }
    
    if (!empty($stats)) {
        $data['stats'] = $stats;
    }
    
    file_put_contents($file, json_encode($data));
}

function formatDate($date) {
    if (empty($date)) return null;
    
    $formats = ['d/m/Y', 'Y-m-d', 'd-m-Y'];
    foreach ($formats as $format) {
        $dateObj = \DateTime::createFromFormat($format, $date);
        if ($dateObj && $dateObj->format($format) === $date) {
            return $dateObj->format('Y-m-d');
        }
    }
    
    // Si aucun format ne correspond, essayer de parser la date
    try {
        $dateObj = new \DateTime($date);
        return $dateObj->format('Y-m-d');
    } catch (\Exception $e) {
        return null;
    }
}

function formatTime($time) {
    if (empty(trim($time))) {
        return '00:00:00';
    }
    
    $formats = ['H:i:s', 'H:i'];
    foreach ($formats as $format) {
        $timeObj = \DateTime::createFromFormat($format, $time);
        if ($timeObj && $timeObj->format($format) === $time) {
            return $timeObj->format('H:i:s');
        }
    }
    
    // Si aucun format ne correspond, utiliser la valeur par défaut
    return '00:00:00';
} 