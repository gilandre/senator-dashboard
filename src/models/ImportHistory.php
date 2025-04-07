<?php

namespace App\Models;

use App\Core\Model;
use PDO;

class ImportHistory extends Model
{
    // Nom de la table associée
    protected static $table = 'import_history';
    
    // Propriétés du modèle correspondant aux colonnes de la table
    public $id;
    public $filename;
    public $import_date;
    public $user_id;
    public $username;
    public $total_records;
    public $imported_records;
    public $duplicate_records;
    public $error_records;
    public $success_rate;
    public $created_at;
    
    /**
     * Sauvegarde l'historique d'une importation
     */
    public static function saveImportHistory(array $stats, string $filename = 'import.csv'): bool
    {
        $db = self::getConnection();
        $stmt = $db->prepare("
            INSERT INTO import_history 
            (filename, import_date, user_id, username, total_records, imported_records, 
             duplicate_records, error_records, success_rate, created_at) 
            VALUES 
            (:filename, :import_date, :user_id, :username, :total_records, :imported_records, 
             :duplicate_records, :error_records, :success_rate, :created_at)
        ");
        
        $userId = $_SESSION['user_id'] ?? 0;
        $username = $_SESSION['username'] ?? 'systeme';
        $successRate = ($stats['total'] > 0) ? round(($stats['imported'] / $stats['total']) * 100) : 0;
        
        $params = [
            ':filename' => $filename,
            ':import_date' => date('Y-m-d H:i:s'),
            ':user_id' => $userId,
            ':username' => $username,
            ':total_records' => $stats['total'],
            ':imported_records' => $stats['imported'],
            ':duplicate_records' => $stats['duplicates'],
            ':error_records' => $stats['errors'],
            ':success_rate' => $successRate,
            ':created_at' => date('Y-m-d H:i:s')
        ];
        
        return $stmt->execute($params);
    }
    
    /**
     * Récupère l'historique des importations, avec limite et pagination
     */
    public static function getHistory(int $limit = 10, int $offset = 0): array
    {
        $db = self::getConnection();
        $stmt = $db->prepare("
            SELECT * FROM import_history 
            ORDER BY import_date DESC 
            LIMIT :limit OFFSET :offset
        ");
        
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();
        
        return $stmt->fetchAll(PDO::FETCH_CLASS, self::class);
    }
    
    /**
     * Récupère l'historique des importations dans une plage de dates
     */
    public static function getHistoryByDateRange(string $startDate, string $endDate, int $limit = 10, int $offset = 0): array
    {
        $db = self::getConnection();
        $stmt = $db->prepare("
            SELECT * FROM import_history 
            WHERE DATE(import_date) BETWEEN :start_date AND :end_date 
            ORDER BY import_date DESC 
            LIMIT :limit OFFSET :offset
        ");
        
        $stmt->bindValue(':start_date', $startDate);
        $stmt->bindValue(':end_date', $endDate);
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();
        
        return $stmt->fetchAll(PDO::FETCH_CLASS, self::class);
    }
    
    /**
     * Compte le nombre total d'enregistrements d'historique d'importation
     */
    public static function countAll(): int
    {
        $db = self::getConnection();
        $stmt = $db->query("SELECT COUNT(*) FROM import_history");
        return (int)$stmt->fetchColumn();
    }
    
    /**
     * Compte le nombre d'enregistrements d'historique dans une plage de dates
     */
    public static function countByDateRange(string $startDate, string $endDate): int
    {
        $db = self::getConnection();
        $stmt = $db->prepare("
            SELECT COUNT(*) FROM import_history 
            WHERE DATE(import_date) BETWEEN :start_date AND :end_date
        ");
        
        $stmt->bindValue(':start_date', $startDate);
        $stmt->bindValue(':end_date', $endDate);
        $stmt->execute();
        
        return (int)$stmt->fetchColumn();
    }
    
    /**
     * Obtient la connexion à la base de données
     */
    private static function getConnection(): PDO
    {
        return self::getDB()->getConnection();
    }
} 