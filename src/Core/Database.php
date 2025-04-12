<?php

namespace App\Core;

use PDO;
use PDOException;
use RuntimeException;

class Database
{
    private static $instance = null;
    private $connection;

    /**
     * Cache simple pour les requêtes fréquentes
     * Utilisation : uniquement pour le développement
     */
    private static $queryCache = [];
    private static $cacheEnabled = true;
    private static $cacheTTL = 60; // 60 secondes par défaut
    private static $cacheHits = 0;
    private static $cacheMisses = 0;

    private function __construct()
    {
        try {
            // Try MySQL first
            $this->tryMySQLConnection();
        } catch (PDOException $mysqlError) {
            error_log("MySQL connection failed: " . $mysqlError->getMessage());
            error_log("Falling back to SQLite...");
            
            try {
                // Fall back to SQLite if MySQL fails
                $this->trySQLiteConnection();
            } catch (PDOException $sqliteError) {
                error_log("SQLite connection also failed: " . $sqliteError->getMessage());
                throw new PDOException("All database connections failed. Last error: " . $sqliteError->getMessage());
            }
        }
    }

    public static function getInstance()
    {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    public function getConnection()
    {
        return $this->connection;
    }

    public function query($sql, $params = [])
    {
        try {
            $stmt = $this->connection->prepare($sql);
            $stmt->execute($params);
            
            // For SELECT queries, return the result
            if (stripos(trim($sql), 'SELECT') === 0) {
                return $stmt->fetchAll();
            }
            
            return $stmt;
        } catch (PDOException $e) {
            error_log("Erreur lors de l'exécution de la requête : " . $e->getMessage());
            throw $e;
        }
    }

    public function fetch($sql, $params = [])
    {
        return $this->query($sql, $params)->fetch();
    }

    public function fetchAll($sql, $params = [])
    {
        try {
            $stmt = $this->connection->prepare($sql);
            $stmt->execute($params);
            return $stmt->fetchAll();
        } catch (PDOException $e) {
            error_log("Erreur lors de l'exécution de la requête : " . $e->getMessage());
            throw $e;
        }
    }

    public function insert($table, $data)
    {
        $fields = array_keys($data);
        $placeholders = array_fill(0, count($fields), '?');
        
        $sql = "INSERT INTO {$table} (" . implode(', ', $fields) . ") 
                VALUES (" . implode(', ', $placeholders) . ")";
        
        $this->query($sql, array_values($data));
        return $this->connection->lastInsertId();
    }

    public function update($table, $data, $where, $whereParams = [])
    {
        $fields = array_map(function($field) {
            return "{$field} = ?";
        }, array_keys($data));
        
        $sql = "UPDATE {$table} SET " . implode(', ', $fields) . " WHERE {$where}";
        
        $params = array_merge(array_values($data), $whereParams);
        return $this->query($sql, $params)->rowCount();
    }

    public function delete($table, $where, $params = [])
    {
        $sql = "DELETE FROM {$table} WHERE {$where}";
        return $this->query($sql, $params)->rowCount();
    }

    public function beginTransaction()
    {
        return $this->connection->beginTransaction();
    }

    public function commit()
    {
        return $this->connection->commit();
    }

    public function rollBack()
    {
        return $this->connection->rollBack();
    }

    /**
     * Vérifie si une transaction est en cours
     */
    public function inTransaction()
    {
        return $this->connection->inTransaction();
    }

    /**
     * Get the ID of the last inserted record
     *
     * @return int Last inserted ID
     */
    public function lastInsertId(): int
    {
        return (int)$this->connection->lastInsertId();
    }

    /**
     * Try to connect to MySQL
     */
    private function tryMySQLConnection()
    {
        $dbConfig = [
            'host' => $_ENV['DB_HOST'] ?? '127.0.0.1',
            'port' => $_ENV['DB_PORT'] ?? '3306',
            'dbname' => $_ENV['DB_DATABASE'] ?? 'senator_db',
            'username' => $_ENV['DB_USERNAME'] ?? 'root',
            'password' => $_ENV['DB_PASSWORD'] ?? '',
            'charset' => $_ENV['DB_CHARSET'] ?? 'utf8mb4'
        ];
        
        error_log("Attempting MySQL connection: host={$dbConfig['host']}, port={$dbConfig['port']}, dbname={$dbConfig['dbname']}");
        
        $dsn = "mysql:host={$dbConfig['host']};port={$dbConfig['port']};dbname={$dbConfig['dbname']};charset={$dbConfig['charset']}";
        $options = [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
            PDO::ATTR_TIMEOUT => 3
        ];
        
        $this->connection = new PDO($dsn, $dbConfig['username'], $dbConfig['password'], $options);
        error_log("MySQL connection successful");
    }
    
    /**
     * Try to connect to SQLite
     */
    private function trySQLiteConnection()
    {
        // Ensure the database directory exists
        $dbDir = __DIR__ . '/../../database';
        if (!file_exists($dbDir)) {
            mkdir($dbDir, 0755, true);
        }
        
        $dbFile = $dbDir . '/senator.sqlite';
        error_log("Attempting SQLite connection: " . $dbFile);
        
        $dsn = "sqlite:{$dbFile}";
        $options = [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false
        ];
        
        $this->connection = new PDO($dsn, null, null, $options);
        error_log("SQLite connection successful");
        
        // Create tables if they don't exist
        $this->createSQLiteTables();
    }
    
    /**
     * Create necessary tables for SQLite
     */
    private function createSQLiteTables()
    {
        // Create import_history table
        $this->connection->exec("CREATE TABLE IF NOT EXISTS import_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            filename TEXT NOT NULL,
            import_date DATETIME NOT NULL,
            user_id INTEGER,
            username TEXT,
            total_records INTEGER DEFAULT 0,
            imported_records INTEGER DEFAULT 0,
            duplicate_records INTEGER DEFAULT 0,
            error_records INTEGER DEFAULT 0,
            success_rate REAL DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )");
        
        // Create import_duplicates table
        $this->connection->exec("CREATE TABLE IF NOT EXISTS import_duplicates (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            import_id INTEGER NOT NULL,
            badge_number TEXT NOT NULL,
            event_date TEXT NOT NULL,
            row_data TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )");
        
        // Create import_row_hashes table
        $this->connection->exec("CREATE TABLE IF NOT EXISTS import_row_hashes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            import_id INTEGER NOT NULL,
            row_hash TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )");
        
        error_log("SQLite tables created/verified");
    }

    /**
     * Active ou désactive le cache de requêtes
     * @param bool $enabled État du cache
     */
    public static function enableQueryCache(bool $enabled = true): void
    {
        self::$cacheEnabled = $enabled;
        error_log("Cache de requêtes " . ($enabled ? "activé" : "désactivé"));
    }

    /**
     * Configure le TTL du cache
     * @param int $seconds Durée de vie en secondes
     */
    public static function setQueryCacheTTL(int $seconds): void
    {
        self::$cacheTTL = max(1, $seconds);
    }

    /**
     * Récupère des statistiques sur l'utilisation du cache
     * @return array Statistiques du cache
     */
    public static function getQueryCacheStats(): array
    {
        return [
            'enabled' => self::$cacheEnabled,
            'ttl' => self::$cacheTTL,
            'size' => count(self::$queryCache),
            'hits' => self::$cacheHits,
            'misses' => self::$cacheMisses,
            'ratio' => self::$cacheHits + self::$cacheMisses > 0 
                ? round(self::$cacheHits / (self::$cacheHits + self::$cacheMisses) * 100, 2) 
                : 0
        ];
    }

    /**
     * Version optimisée de la méthode fetchAll avec cache
     * @param string $sql Requête SQL
     * @param array $params Paramètres
     * @param bool $useCache Utiliser le cache ou non
     * @return array Résultats de la requête
     */
    public function fetchAllWithCache(string $sql, array $params = [], bool $useCache = true): array
    {
        if (!self::$cacheEnabled || !$useCache) {
            return $this->fetchAll($sql, $params);
        }

        $cacheKey = md5($sql . json_encode($params));
        
        if (isset(self::$queryCache[$cacheKey]) && 
            (time() - self::$queryCache[$cacheKey]['time'] < self::$cacheTTL)) {
            self::$cacheHits++;
            return self::$queryCache[$cacheKey]['data'];
        }
        
        self::$cacheMisses++;
        $result = $this->fetchAll($sql, $params);
        
        self::$queryCache[$cacheKey] = [
            'time' => time(),
            'data' => $result
        ];
        
        // Limiter la taille du cache pour éviter des problèmes de mémoire
        if (count(self::$queryCache) > 100) {
            // Supprimer l'entrée la plus ancienne
            uasort(self::$queryCache, function($a, $b) {
                return $a['time'] <=> $b['time'];
            });
            array_shift(self::$queryCache);
        }
        
        return $result;
    }

    /**
     * Exécute plusieurs requêtes en utilisant une seule transaction
     * @param array $queries Tableau de requêtes [['sql' => '...', 'params' => [...]]]
     * @return bool Succès de l'opération
     */
    public function executeInTransaction(array $queries): bool
    {
        $this->connection->beginTransaction();
        
        try {
            foreach ($queries as $query) {
                $stmt = $this->connection->prepare($query['sql']);
                $stmt->execute($query['params'] ?? []);
            }
            
            $this->connection->commit();
            return true;
        } catch (PDOException $e) {
            $this->connection->rollBack();
            error_log("Erreur d'exécution de requêtes en lot: " . $e->getMessage());
            throw $e;
        }
    }
    
    /**
     * Exécute un batch d'insertions en une seule requête
     * @param string $table Nom de la table
     * @param array $columns Colonnes à insérer
     * @param array $valuesBatch Tableau de tableaux de valeurs
     * @return int Nombre d'enregistrements insérés
     */
    public function batchInsert(string $table, array $columns, array $valuesBatch): int
    {
        if (empty($valuesBatch)) {
            return 0;
        }
        
        try {
            // Préparer les placeholders pour chaque ensemble de valeurs
            $placeholders = [];
            $allValues = [];
            
            foreach ($valuesBatch as $values) {
                $rowPlaceholders = [];
                
                foreach ($values as $value) {
                    $rowPlaceholders[] = '?';
                    $allValues[] = $value;
                }
                
                $placeholders[] = '(' . implode(', ', $rowPlaceholders) . ')';
            }
            
            $sql = "INSERT INTO {$table} (" . implode(', ', $columns) . ") 
                    VALUES " . implode(', ', $placeholders);
            
            $stmt = $this->connection->prepare($sql);
            $stmt->execute($allValues);
            
            return count($valuesBatch);
        } catch (PDOException $e) {
            error_log("Erreur lors de l'insertion en lot: " . $e->getMessage());
            
            // Si l'erreur est liée à la taille de la requête, diviser le lot
            if (strpos($e->getMessage(), 'too many parameters') !== false || 
                strpos($e->getMessage(), 'packet too large') !== false) {
                
                // Diviser le lot en deux et réessayer récursivement
                $halfSize = ceil(count($valuesBatch) / 2);
                $firstBatch = array_slice($valuesBatch, 0, $halfSize);
                $secondBatch = array_slice($valuesBatch, $halfSize);
                
                $count = 0;
                if (!empty($firstBatch)) {
                    $count += $this->batchInsert($table, $columns, $firstBatch);
                }
                if (!empty($secondBatch)) {
                    $count += $this->batchInsert($table, $columns, $secondBatch);
                }
                
                return $count;
            }
            
            throw $e;
        }
    }

    /**
     * Optimise la table spécifiée (ANALYZE TABLE)
     * @param string $table Nom de la table
     * @return bool Succès de l'opération
     */
    public function optimizeTable(string $table): bool
    {
        try {
            $this->connection->exec("ANALYZE TABLE {$table}");
            return true;
        } catch (PDOException $e) {
            error_log("Erreur lors de l'optimisation de la table {$table}: " . $e->getMessage());
            return false;
        }
    }
    
    /**
     * Nettoie le cache de la base de données
     */
    public static function clearQueryCache(): void
    {
        self::$queryCache = [];
        error_log("Cache de requêtes vidé");
    }
} 