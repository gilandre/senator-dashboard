<?php

namespace App\Core;

use PDO;
use PDOException;
use RuntimeException;

class Database
{
    private static $instance = null;
    private $connection;

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
} 