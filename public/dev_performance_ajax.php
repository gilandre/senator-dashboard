<?php
/**
 * Script AJAX pour les actions de l'outil de diagnostic de performance
 */

// Charger bootstrap.php pour avoir accès aux classes de l'application
require_once __DIR__ . '/../bootstrap.php';

// Vérifier si l'environnement est de développement
if (!isset($_ENV['APP_ENV']) || $_ENV['APP_ENV'] !== 'local') {
    header('Content-Type: application/json');
    echo json_encode(['success' => false, 'message' => 'Cette fonctionnalité n\'est disponible qu\'en environnement de développement']);
    exit;
}

// Vérifier si une action est spécifiée
if (!isset($_GET['action'])) {
    header('Content-Type: application/json');
    echo json_encode(['success' => false, 'message' => 'Aucune action spécifiée']);
    exit;
}

// Traiter l'action demandée
$action = $_GET['action'];

// Définir le type de contenu pour toutes les réponses
header('Content-Type: application/json');

try {
    switch ($action) {
        case 'cleanup_logs':
            // Nettoyer les fichiers de log volumineux
            $cleaned = cleanupLogs();
            echo json_encode(['success' => true, 'message' => "Nettoyage terminé: {$cleaned} fichiers traités"]);
            break;
            
        case 'optimize_tables':
            // Optimiser les tables de la base de données
            $optimized = optimizeTables();
            echo json_encode(['success' => true, 'message' => "Optimisation terminée: {$optimized} tables optimisées"]);
            break;
            
        case 'toggle_query_cache':
            // Activer ou désactiver le cache de requêtes
            $enable = isset($_GET['enable']) && $_GET['enable'] == '1';
            toggleQueryCache($enable);
            echo json_encode(['success' => true, 'message' => "Cache de requêtes " . ($enable ? "activé" : "désactivé")]);
            break;
            
        case 'clear_query_cache':
            // Vider le cache de requêtes
            clearQueryCache();
            echo json_encode(['success' => true, 'message' => "Cache de requêtes vidé"]);
            break;
            
        case 'truncate_log':
            // Tronquer un fichier de log spécifique
            if (!isset($_GET['filename'])) {
                echo json_encode(['success' => false, 'message' => "Nom de fichier non spécifié"]);
                break;
            }
            
            $filename = $_GET['filename'];
            $truncated = truncateLog($filename);
            
            if ($truncated) {
                echo json_encode(['success' => true, 'message' => "Fichier {$filename} tronqué avec succès"]);
            } else {
                echo json_encode(['success' => false, 'message' => "Impossible de tronquer le fichier {$filename}"]);
            }
            break;
            
        default:
            echo json_encode(['success' => false, 'message' => "Action inconnue: {$action}"]);
    }
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => "Erreur: " . $e->getMessage()]);
}

/**
 * Nettoie les fichiers de log volumineux
 * 
 * @return int Nombre de fichiers traités
 */
function cleanupLogs(): int
{
    $count = 0;
    $logFiles = glob(__DIR__ . '/../*.log');
    
    foreach ($logFiles as $logFile) {
        $size = filesize($logFile);
        
        // Si le fichier est plus grand que 10 Mo
        if ($size > 10 * 1024 * 1024) {
            // Tronquer le fichier en gardant les 1000 dernières lignes
            $lines = file($logFile);
            $lastLines = array_slice($lines, -1000);
            
            file_put_contents($logFile, implode('', $lastLines));
            $count++;
        }
    }
    
    return $count;
}

/**
 * Optimise les tables de la base de données
 * 
 * @return int Nombre de tables optimisées
 */
function optimizeTables(): int
{
    $db = \App\Core\Database::getInstance();
    $conn = $db->getConnection();
    $count = 0;
    
    // Vérifier si c'est MySQL
    $dbType = $conn->getAttribute(PDO::ATTR_DRIVER_NAME);
    
    if ($dbType === 'mysql') {
        // Liste des tables à optimiser
        $tables = ['access_logs', 'users', 'import_history', 'import_duplicates', 'audit_logs'];
        
        foreach ($tables as $table) {
            try {
                // Exécuter OPTIMIZE TABLE
                $conn->exec("OPTIMIZE TABLE {$table}");
                // Exécuter ANALYZE TABLE pour mettre à jour les statistiques
                $conn->exec("ANALYZE TABLE {$table}");
                $count++;
            } catch (Exception $e) {
                error_log("Erreur lors de l'optimisation de la table {$table}: " . $e->getMessage());
            }
        }
    } elseif ($dbType === 'sqlite') {
        // Pour SQLite, exécuter VACUUM
        try {
            $conn->exec("VACUUM");
            // Exécuter ANALYZE pour mettre à jour les statistiques
            $conn->exec("ANALYZE");
            $count = 1; // Compter la base comme une seule unité
        } catch (Exception $e) {
            error_log("Erreur lors de l'optimisation de la base SQLite: " . $e->getMessage());
        }
    }
    
    return $count;
}

/**
 * Active ou désactive le cache de requêtes
 * 
 * @param bool $enable True pour activer, False pour désactiver
 */
function toggleQueryCache(bool $enable): void
{
    if (method_exists('\App\Core\Database', 'enableQueryCache')) {
        \App\Core\Database::enableQueryCache($enable);
    } else {
        throw new Exception("La fonctionnalité de cache de requêtes n'est pas disponible");
    }
}

/**
 * Vide le cache de requêtes
 */
function clearQueryCache(): void
{
    if (method_exists('\App\Core\Database', 'clearQueryCache')) {
        \App\Core\Database::clearQueryCache();
    } else {
        throw new Exception("La fonctionnalité de cache de requêtes n'est pas disponible");
    }
}

/**
 * Tronque un fichier de log
 * 
 * @param string $filename Nom du fichier à tronquer
 * @return bool True si le fichier a été tronqué, False sinon
 */
function truncateLog(string $filename): bool
{
    // Pour des raisons de sécurité, vérifier que le fichier est bien un fichier de log
    if (!preg_match('/^[a-zA-Z0-9_-]+\.log$/', $filename)) {
        return false;
    }
    
    $logFile = __DIR__ . '/../' . $filename;
    
    // Vérifier que le fichier existe et est un fichier régulier
    if (!file_exists($logFile) || !is_file($logFile)) {
        return false;
    }
    
    // Tronquer le fichier en gardant un en-tête minimal
    $content = "*** Fichier tronqué le " . date('Y-m-d H:i:s') . " ***\n";
    return (bool)file_put_contents($logFile, $content);
} 