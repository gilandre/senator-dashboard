<?php

namespace App\Helpers;

/**
 * Helper pour optimiser et surveiller les performances en environnement de développement
 */
class PerformanceHelper
{
    private static $timers = [];
    private static $memoryUsage = [];
    private static $queryCount = 0;
    private static $slowQueries = [];
    private static $enabled = true;
    
    /**
     * Active ou désactive le monitoring des performances
     */
    public static function enable(bool $enabled = true): void
    {
        self::$enabled = $enabled;
    }
    
    /**
     * Démarre un timer pour mesurer le temps d'exécution
     */
    public static function startTimer(string $name): void
    {
        if (!self::$enabled) return;
        
        self::$timers[$name] = [
            'start' => microtime(true),
            'end' => null,
            'duration' => null
        ];
        
        self::$memoryUsage[$name] = [
            'start' => memory_get_usage(true),
            'end' => null,
            'peak' => memory_get_peak_usage(true)
        ];
    }
    
    /**
     * Arrête un timer et calcule la durée
     */
    public static function stopTimer(string $name): float
    {
        if (!self::$enabled || !isset(self::$timers[$name])) return 0;
        
        self::$timers[$name]['end'] = microtime(true);
        self::$timers[$name]['duration'] = self::$timers[$name]['end'] - self::$timers[$name]['start'];
        
        self::$memoryUsage[$name]['end'] = memory_get_usage(true);
        self::$memoryUsage[$name]['peak'] = memory_get_peak_usage(true);
        
        return self::$timers[$name]['duration'];
    }
    
    /**
     * Enregistre une requête SQL avec son temps d'exécution
     */
    public static function logQuery(string $sql, float $duration): void
    {
        if (!self::$enabled) return;
        
        self::$queryCount++;
        
        // Enregistrer les requêtes lentes (> 100ms)
        if ($duration > 0.1) {
            self::$slowQueries[] = [
                'sql' => $sql,
                'duration' => $duration,
                'time' => date('Y-m-d H:i:s')
            ];
        }
    }
    
    /**
     * Retourne un tableau des statistiques de performance
     */
    public static function getStats(): array
    {
        if (!self::$enabled) return [];
        
        $stats = [
            'timers' => [],
            'memory' => [],
            'queries' => [
                'count' => self::$queryCount,
                'slow_count' => count(self::$slowQueries),
                'slow_queries' => self::$slowQueries
            ]
        ];
        
        foreach (self::$timers as $name => $timer) {
            $stats['timers'][$name] = [
                'duration' => $timer['duration'] ?? 0,
                'formatted' => self::formatDuration($timer['duration'] ?? 0)
            ];
        }
        
        foreach (self::$memoryUsage as $name => $memory) {
            $stats['memory'][$name] = [
                'start' => self::formatBytes($memory['start']),
                'end' => self::formatBytes($memory['end'] ?? 0),
                'peak' => self::formatBytes($memory['peak']),
                'difference' => self::formatBytes(($memory['end'] ?? 0) - $memory['start'])
            ];
        }
        
        return $stats;
    }
    
    /**
     * Génère un rapport HTML des performances
     */
    public static function generateReport(): string
    {
        if (!self::$enabled) return '';
        
        $stats = self::getStats();
        
        $html = '<div class="performance-report" style="position:fixed; bottom:0; right:0; background:#fff; border:1px solid #ccc; padding:10px; max-height:300px; overflow:auto; font-size:12px; z-index:9999;">';
        $html .= '<h4>Performance Report</h4>';
        
        // Timers
        $html .= '<div class="timers">';
        $html .= '<strong>Timers:</strong><br>';
        foreach ($stats['timers'] as $name => $timer) {
            $color = $timer['duration'] > 1 ? 'red' : ($timer['duration'] > 0.1 ? 'orange' : 'green');
            $html .= "<span style=\"color:{$color}\">{$name}: {$timer['formatted']}</span><br>";
        }
        $html .= '</div>';
        
        // Memory
        $html .= '<div class="memory">';
        $html .= '<strong>Memory:</strong><br>';
        foreach ($stats['memory'] as $name => $memory) {
            $html .= "{$name}: {$memory['difference']} (Peak: {$memory['peak']})<br>";
        }
        $html .= '</div>';
        
        // Queries
        $html .= '<div class="queries">';
        $html .= "<strong>Queries:</strong> {$stats['queries']['count']} (Slow: {$stats['queries']['slow_count']})<br>";
        
        if (!empty($stats['queries']['slow_queries'])) {
            $html .= '<strong>Slow Queries:</strong><br>';
            foreach ($stats['queries']['slow_queries'] as $query) {
                $html .= "<span style=\"color:red\">{$query['duration']}s: " . htmlspecialchars(substr($query['sql'], 0, 100)) . "...</span><br>";
            }
        }
        
        $html .= '</div>';
        
        // Cache info
        if (method_exists('\App\Core\Database', 'getQueryCacheStats')) {
            $cacheStats = \App\Core\Database::getQueryCacheStats();
            $html .= '<div class="cache">';
            $html .= "<strong>Query Cache:</strong> " . ($cacheStats['enabled'] ? 'Enabled' : 'Disabled') . "<br>";
            $html .= "Size: {$cacheStats['size']} entries, TTL: {$cacheStats['ttl']}s<br>";
            $html .= "Hits: {$cacheStats['hits']}, Misses: {$cacheStats['misses']}, Ratio: {$cacheStats['ratio']}%<br>";
            $html .= '</div>';
        }
        
        $html .= '</div>';
        
        return $html;
    }
    
    /**
     * Ajoute le rapport à la réponse HTML
     */
    public static function appendToResponse(string &$html): void
    {
        if (!self::$enabled) return;
        
        $report = self::generateReport();
        
        // Insérer le rapport avant la fermeture de la balise body
        $html = str_replace('</body>', $report . '</body>', $html);
    }
    
    /**
     * Formate la durée en millisecondes ou secondes
     */
    private static function formatDuration(float $seconds): string
    {
        if ($seconds < 0.001) {
            return round($seconds * 1000000) . 'μs';
        }
        
        if ($seconds < 1) {
            return round($seconds * 1000, 2) . 'ms';
        }
        
        return round($seconds, 2) . 's';
    }
    
    /**
     * Formate les octets en une chaîne lisible
     */
    private static function formatBytes(int $bytes): string
    {
        $units = ['B', 'KB', 'MB', 'GB'];
        
        $bytes = max($bytes, 0);
        $pow = floor(($bytes ? log($bytes) : 0) / log(1024));
        $pow = min($pow, count($units) - 1);
        
        $bytes /= (1 << (10 * $pow));
        
        return round($bytes, 2) . ' ' . $units[$pow];
    }
    
    /**
     * Réinitialise toutes les statistiques
     */
    public static function reset(): void
    {
        self::$timers = [];
        self::$memoryUsage = [];
        self::$queryCount = 0;
        self::$slowQueries = [];
    }
} 