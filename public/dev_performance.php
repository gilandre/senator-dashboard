<?php
/**
 * Page de diagnostic de performance pour les développeurs
 * Ce script offre des outils pour optimiser l'application en environnement de développement
 */

// Charger bootstrap.php pour avoir accès aux classes de l'application
require_once __DIR__ . '/../bootstrap.php';

// Classe pour les diagnostics de performance
class PerformanceDiagnostic
{
    /**
     * Exécute tous les diagnostics
     */
    public static function runAll()
    {
        echo "<h1>Diagnostics de Performance - SENATOR</h1>";
        echo "<p>Utilisez ces outils pour optimiser l'application en environnement de développement.</p>";
        
        self::checkPHPConfig();
        self::checkDatabase();
        self::checkFileSystem();
        self::checkMemoryUsage();
        self::provideOptimizationTools();
    }
    
    /**
     * Vérifie la configuration PHP
     */
    public static function checkPHPConfig()
    {
        echo "<h2>Configuration PHP</h2>";
        echo "<table border='1' cellpadding='5'>";
        echo "<tr><th>Paramètre</th><th>Valeur actuelle</th><th>Recommandée</th><th>Statut</th></tr>";
        
        // Liste des paramètres à vérifier
        $parameters = [
            'memory_limit' => ['current' => ini_get('memory_limit'), 'recommended' => '512M', 'compare' => 'memory'],
            'max_execution_time' => ['current' => ini_get('max_execution_time'), 'recommended' => '300', 'compare' => 'higher'],
            'post_max_size' => ['current' => ini_get('post_max_size'), 'recommended' => '64M', 'compare' => 'memory'],
            'upload_max_filesize' => ['current' => ini_get('upload_max_filesize'), 'recommended' => '32M', 'compare' => 'memory'],
            'display_errors' => ['current' => ini_get('display_errors'), 'recommended' => 'On', 'compare' => 'equal'],
            'error_reporting' => ['current' => ini_get('error_reporting'), 'recommended' => E_ALL, 'compare' => 'equal'],
            'opcache.enable' => ['current' => ini_get('opcache.enable'), 'recommended' => '1', 'compare' => 'equal'],
            'opcache.memory_consumption' => ['current' => ini_get('opcache.memory_consumption'), 'recommended' => '256', 'compare' => 'higher']
        ];
        
        foreach ($parameters as $name => $data) {
            $status = self::compareSettings($data['current'], $data['recommended'], $data['compare']);
            $color = $status ? 'green' : 'red';
            
            echo "<tr>";
            echo "<td>{$name}</td>";
            echo "<td>{$data['current']}</td>";
            echo "<td>{$data['recommended']}</td>";
            echo "<td style='color:{$color}'>" . ($status ? "OK" : "À optimiser") . "</td>";
            echo "</tr>";
        }
        
        echo "</table>";
    }
    
    /**
     * Vérifie les configurations de la base de données
     */
    public static function checkDatabase()
    {
        echo "<h2>Configuration Base de Données</h2>";
        
        try {
            $db = \App\Core\Database::getInstance();
            $conn = $db->getConnection();
            
            // Vérifier si c'est MySQL ou SQLite
            $dbType = $conn->getAttribute(PDO::ATTR_DRIVER_NAME);
            echo "<p>Type de base de données : <strong>{$dbType}</strong></p>";
            
            if ($dbType === 'mysql') {
                // Récupérer les variables MySQL importantes
                $variables = ['innodb_buffer_pool_size', 'max_connections', 'query_cache_size', 
                              'tmp_table_size', 'max_heap_table_size', 'key_buffer_size'];
                
                $query = "SHOW VARIABLES WHERE Variable_name IN ('" . implode("','", $variables) . "')";
                $stmt = $conn->query($query);
                $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
                
                echo "<table border='1' cellpadding='5'>";
                echo "<tr><th>Variable</th><th>Valeur</th><th>Recommandation</th></tr>";
                
                $recommendations = [
                    'innodb_buffer_pool_size' => '256M',
                    'query_cache_size' => '32M',
                    'tmp_table_size' => '32M',
                    'max_heap_table_size' => '32M',
                    'key_buffer_size' => '32M',
                    'max_connections' => '150'
                ];
                
                foreach ($results as $row) {
                    $value = $row['Value'];
                    $recommendation = $recommendations[$row['Variable_name']] ?? 'N/A';
                    
                    // Formatage des valeurs en octets si nécessaire
                    if (is_numeric($value) && $value > 1024*1024) {
                        $value = number_format($value / 1024 / 1024, 2) . ' MB';
                    }
                    
                    echo "<tr>";
                    echo "<td>{$row['Variable_name']}</td>";
                    echo "<td>{$value}</td>";
                    echo "<td>{$recommendation}</td>";
                    echo "</tr>";
                }
                
                echo "</table>";
                
                // Afficher les statistiques des tables
                echo "<h3>Statistiques des Tables</h3>";
                $tables = ['access_logs', 'users', 'import_history'];
                
                echo "<table border='1' cellpadding='5'>";
                echo "<tr><th>Table</th><th>Nombre de lignes</th><th>Taille (MB)</th><th>Index (MB)</th></tr>";
                
                foreach ($tables as $table) {
                    try {
                        $query = "SHOW TABLE STATUS LIKE '{$table}'";
                        $stmt = $conn->query($query);
                        $tableStatus = $stmt->fetch(PDO::FETCH_ASSOC);
                        
                        if ($tableStatus) {
                            $dataSize = $tableStatus['Data_length'] / 1024 / 1024;
                            $indexSize = $tableStatus['Index_length'] / 1024 / 1024;
                            
                            echo "<tr>";
                            echo "<td>{$table}</td>";
                            echo "<td>{$tableStatus['Rows']}</td>";
                            echo "<td>" . number_format($dataSize, 2) . " MB</td>";
                            echo "<td>" . number_format($indexSize, 2) . " MB</td>";
                            echo "</tr>";
                        }
                    } catch (Exception $e) {
                        echo "<tr><td>{$table}</td><td colspan='3'>Erreur: " . $e->getMessage() . "</td></tr>";
                    }
                }
                
                echo "</table>";
            } else {
                echo "<p>Base de données SQLite: Aucune configuration avancée disponible.</p>";
                
                // Afficher les informations sur le fichier SQLite
                $stmt = $conn->query("PRAGMA page_count");
                $pageCount = $stmt->fetchColumn();
                
                $stmt = $conn->query("PRAGMA page_size");
                $pageSize = $stmt->fetchColumn();
                
                $dbSize = $pageCount * $pageSize / 1024 / 1024;
                
                echo "<p>Taille de la base SQLite: " . number_format($dbSize, 2) . " MB</p>";
            }
            
        } catch (Exception $e) {
            echo "<p style='color:red'>Erreur de connexion à la base de données: " . $e->getMessage() . "</p>";
        }
    }
    
    /**
     * Vérifie le système de fichiers
     */
    public static function checkFileSystem()
    {
        echo "<h2>Vérification du Système de Fichiers</h2>";
        
        // Vérifier les droits d'accès aux dossiers clés
        $directories = [
            'public' => __DIR__,
            'views' => __DIR__ . '/../src/views',
            'logs' => __DIR__ . '/../src/logs',
            'tmp' => __DIR__ . '/../tmp'
        ];
        
        echo "<table border='1' cellpadding='5'>";
        echo "<tr><th>Dossier</th><th>Chemin</th><th>Accès en écriture</th><th>Taille</th></tr>";
        
        foreach ($directories as $name => $path) {
            $isWritable = is_writable($path) ? 'Oui' : 'Non';
            $color = is_writable($path) ? 'green' : 'red';
            $dirSize = self::getDirSize($path);
            
            echo "<tr>";
            echo "<td>{$name}</td>";
            echo "<td>{$path}</td>";
            echo "<td style='color:{$color}'>{$isWritable}</td>";
            echo "<td>" . self::formatBytes($dirSize) . "</td>";
            echo "</tr>";
        }
        
        echo "</table>";
        
        // Vérifier les fichiers de log volumineux
        $logFiles = glob(__DIR__ . '/../*.log');
        
        if (count($logFiles) > 0) {
            echo "<h3>Fichiers de Log Volumineux</h3>";
            echo "<table border='1' cellpadding='5'>";
            echo "<tr><th>Fichier</th><th>Taille</th><th>Dernière modification</th><th>Action</th></tr>";
            
            foreach ($logFiles as $logFile) {
                $size = filesize($logFile);
                $lastModified = date("Y-m-d H:i:s", filemtime($logFile));
                
                echo "<tr>";
                echo "<td>" . basename($logFile) . "</td>";
                echo "<td>" . self::formatBytes($size) . "</td>";
                echo "<td>{$lastModified}</td>";
                echo "<td>";
                if ($size > 10 * 1024 * 1024) { // Si plus de 10 Mo
                    echo "<button onclick=\"truncateLog('" . basename($logFile) . "')\">Tronquer</button>";
                }
                echo "</td>";
                echo "</tr>";
            }
            
            echo "</table>";
        }
    }
    
    /**
     * Vérifie l'utilisation de la mémoire
     */
    public static function checkMemoryUsage()
    {
        echo "<h2>Utilisation de la Mémoire</h2>";
        
        $memoryUsage = memory_get_usage(true);
        $memoryLimit = self::convertToBytes(ini_get('memory_limit'));
        $percentage = ($memoryUsage / $memoryLimit) * 100;
        
        echo "<p>Utilisation actuelle: <strong>" . self::formatBytes($memoryUsage) . "</strong> sur " . 
             self::formatBytes($memoryLimit) . " (" . number_format($percentage, 2) . "%)</p>";
        
        echo "<div style='width:100%; background-color:#f3f3f3; height:20px; margin-bottom: 20px;'>";
        echo "<div style='width:{$percentage}%; background-color:" . 
             ($percentage > 70 ? 'red' : 'green') . "; height:20px;'></div>";
        echo "</div>";
        
        echo "<p>Peak Memory: <strong>" . self::formatBytes(memory_get_peak_usage(true)) . "</strong></p>";
    }
    
    /**
     * Fournit des outils d'optimisation
     */
    public static function provideOptimizationTools()
    {
        echo "<h2>Outils d'Optimisation</h2>";
        
        echo "<div style='display:flex; flex-wrap:wrap; gap:20px;'>";
        
        // Nettoyage des logs
        echo "<div style='border:1px solid #ccc; padding:15px; border-radius:5px; width:300px;'>";
        echo "<h3>Nettoyage des Logs</h3>";
        echo "<p>Supprimer les fichiers de log volumineux pour libérer de l'espace.</p>";
        echo "<button onclick=\"cleanupLogs()\">Nettoyer les logs</button>";
        echo "</div>";
        
        // Optimisation des tables
        echo "<div style='border:1px solid #ccc; padding:15px; border-radius:5px; width:300px;'>";
        echo "<h3>Optimisation de Base de Données</h3>";
        echo "<p>Analyser et optimiser les tables de la base de données.</p>";
        echo "<button onclick=\"optimizeTables()\">Optimiser les tables</button>";
        echo "</div>";
        
        // Cache des requêtes
        echo "<div style='border:1px solid #ccc; padding:15px; border-radius:5px; width:300px;'>";
        echo "<h3>Cache des Requêtes</h3>";
        echo "<p>Gérer le cache de requêtes pour le développement.</p>";
        echo "<button onclick=\"toggleQueryCache(true)\">Activer le cache</button> ";
        echo "<button onclick=\"toggleQueryCache(false)\">Désactiver le cache</button> ";
        echo "<button onclick=\"clearQueryCache()\">Vider le cache</button>";
        echo "</div>";
        
        echo "</div>";
    }
    
    /**
     * Compare les paramètres pour déterminer si l'optimisation est nécessaire
     */
    private static function compareSettings($current, $recommended, $type)
    {
        switch ($type) {
            case 'memory':
                return self::convertToBytes($current) >= self::convertToBytes($recommended);
            case 'higher':
                return (int)$current >= (int)$recommended;
            case 'lower':
                return (int)$current <= (int)$recommended;
            case 'equal':
                return $current == $recommended;
            default:
                return false;
        }
    }
    
    /**
     * Convertit une taille mémoire en octets
     */
    private static function convertToBytes($memoryString)
    {
        $memoryString = trim($memoryString);
        $last = strtolower($memoryString[strlen($memoryString)-1]);
        $value = (int)$memoryString;
        
        switch($last) {
            case 'g':
                $value *= 1024;
            case 'm':
                $value *= 1024;
            case 'k':
                $value *= 1024;
        }
        
        return $value;
    }
    
    /**
     * Formate les octets en une chaîne lisible
     */
    private static function formatBytes($bytes, $precision = 2)
    {
        $units = ['B', 'KB', 'MB', 'GB', 'TB'];
        
        $bytes = max($bytes, 0);
        $pow = floor(($bytes ? log($bytes) : 0) / log(1024));
        $pow = min($pow, count($units) - 1);
        
        $bytes /= (1 << (10 * $pow));
        
        return round($bytes, $precision) . ' ' . $units[$pow];
    }
    
    /**
     * Calcule la taille d'un dossier
     */
    private static function getDirSize($path)
    {
        $size = 0;
        
        if (!is_dir($path)) {
            return 0;
        }
        
        $files = scandir($path);
        
        foreach ($files as $file) {
            if ($file == '.' || $file == '..') continue;
            
            $filePath = $path . '/' . $file;
            
            if (is_dir($filePath)) {
                $size += self::getDirSize($filePath);
            } else {
                $size += filesize($filePath);
            }
        }
        
        return $size;
    }
}

?>
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Diagnostic de Performance - SENATOR</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            line-height: 1.6;
        }
        table {
            border-collapse: collapse;
            width: 100%;
            margin-bottom: 20px;
        }
        th, td {
            text-align: left;
            padding: 8px;
        }
        th {
            background-color: #f2f2f2;
        }
        h1, h2, h3 {
            color: #333;
        }
        h2 {
            border-bottom: 1px solid #eee;
            padding-bottom: 10px;
            margin-top: 30px;
        }
        button {
            background-color: #4CAF50;
            border: none;
            color: white;
            padding: 8px 16px;
            text-align: center;
            text-decoration: none;
            display: inline-block;
            font-size: 14px;
            margin: 4px 2px;
            cursor: pointer;
            border-radius: 4px;
        }
        button:hover {
            background-color: #45a049;
        }
        #result {
            padding: 15px;
            margin-top: 20px;
            border: 1px solid #ddd;
            border-radius: 4px;
            display: none;
        }
    </style>
</head>
<body>
    <?php PerformanceDiagnostic::runAll(); ?>
    
    <div id="result"></div>
    
    <script>
        function showResult(message, isSuccess = true) {
            const resultDiv = document.getElementById('result');
            resultDiv.style.display = 'block';
            resultDiv.style.backgroundColor = isSuccess ? '#dff0d8' : '#f2dede';
            resultDiv.style.color = isSuccess ? '#3c763d' : '#a94442';
            resultDiv.innerHTML = message;
            
            // Faire défiler jusqu'au résultat
            resultDiv.scrollIntoView({ behavior: 'smooth' });
            
            // Masquer après 5 secondes
            setTimeout(() => {
                resultDiv.style.display = 'none';
            }, 5000);
        }
        
        function cleanupLogs() {
            fetch('dev_performance_ajax.php?action=cleanup_logs')
                .then(response => response.json())
                .then(data => {
                    showResult(data.message, data.success);
                    if (data.success) {
                        setTimeout(() => {
                            window.location.reload();
                        }, 2000);
                    }
                })
                .catch(error => {
                    showResult('Erreur: ' + error.message, false);
                });
        }
        
        function optimizeTables() {
            fetch('dev_performance_ajax.php?action=optimize_tables')
                .then(response => response.json())
                .then(data => {
                    showResult(data.message, data.success);
                })
                .catch(error => {
                    showResult('Erreur: ' + error.message, false);
                });
        }
        
        function toggleQueryCache(enable) {
            fetch(`dev_performance_ajax.php?action=toggle_query_cache&enable=${enable ? 1 : 0}`)
                .then(response => response.json())
                .then(data => {
                    showResult(data.message, data.success);
                })
                .catch(error => {
                    showResult('Erreur: ' + error.message, false);
                });
        }
        
        function clearQueryCache() {
            fetch('dev_performance_ajax.php?action=clear_query_cache')
                .then(response => response.json())
                .then(data => {
                    showResult(data.message, data.success);
                })
                .catch(error => {
                    showResult('Erreur: ' + error.message, false);
                });
        }
        
        function truncateLog(filename) {
            if (confirm(`Êtes-vous sûr de vouloir tronquer le fichier ${filename}?`)) {
                fetch(`dev_performance_ajax.php?action=truncate_log&filename=${encodeURIComponent(filename)}`)
                    .then(response => response.json())
                    .then(data => {
                        showResult(data.message, data.success);
                        if (data.success) {
                            setTimeout(() => {
                                window.location.reload();
                            }, 2000);
                        }
                    })
                    .catch(error => {
                        showResult('Erreur: ' + error.message, false);
                    });
            }
        }
    </script>
</body>
</html> 