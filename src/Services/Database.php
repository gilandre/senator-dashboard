<?php

namespace App\Services;

use PDO;
use PDOException;
use Exception;
use App\Config\Database as DatabaseConfig;

class Database
{
    private static ?PDO $instance = null;
    private static array $config;

    private function __construct()
    {
        try {
            self::$config = DatabaseConfig::getConfig();

            $dsn = "mysql:host=" . self::$config['host'] . 
                   ";dbname=" . self::$config['dbname'] . 
                   ";charset=" . self::$config['charset'];

            $options = [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
                PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci"
            ];

            self::$instance = new PDO(
                $dsn,
                self::$config['username'],
                self::$config['password'],
                $options
            );
        } catch (PDOException $e) {
            throw new PDOException("Erreur de connexion à la base de données MySQL : " . $e->getMessage());
        }
    }

    public static function getInstance(): PDO
    {
        if (self::$instance === null) {
            new self();
        }
        return self::$instance;
    }

    public static function setConfig(array $config): void
    {
        self::$config = array_merge(self::$config ?? [], $config);
    }

    // Empêcher le clonage de l'instance
    private function __clone() {}

    // Empêcher la désérialisation de l'instance
    public function __wakeup()
    {
        throw new Exception("Cannot unserialize singleton");
    }
} 