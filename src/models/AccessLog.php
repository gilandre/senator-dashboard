<?php

namespace App\Models;

use App\Core\Model;
use PDO;

class AccessLog extends Model
{
    // Nom de la table associée
    protected static $table = 'access_logs';
    
    // Propriétés du modèle correspondant aux colonnes de la table
    public $id;
    public $event_date; // Date de l'événement (séparée du temps)
    public $event_time; // Heure de l'événement (séparée de la date)
    public $badge_number; // Numéro de badge, anciennement badge_id
    public $event_type; // Type d'événement (Entrée, Sortie, etc.)
    public $central; // Centrale, anciennement controller/location
    public $group_name; // Groupe, anciennement group/user_group
    public $created_at;
    public $updated_at;
    
    // Ces propriétés ne sont pas dans la base de données mais sont utilisées pour les objets temporaires
    protected $temp_name; // Nom temporaire (non stocké en base)
    protected $temp_firstname; // Prénom temporaire (non stocké en base)
    protected $temp_reader; // Lecteur temporaire (non stocké en base)
    protected $temp_status; // Statut temporaire (non stocké en base)
    
    /**
     * Récupère les logs d'accès pour une date spécifique
     */
    public static function getByDate(string $date): array
    {
        $db = self::getConnection();
        $stmt = $db->prepare("SELECT * FROM access_logs WHERE event_date = :date ORDER BY event_time ASC");
        $stmt->bindValue(':date', $date);
        $stmt->execute();
        
        return $stmt->fetchAll(PDO::FETCH_CLASS, self::class);
    }
    
    /**
     * Récupère les logs d'accès pour une période spécifique
     */
    public static function getByDateRange(string $startDate, string $endDate): array
    {
        $db = self::getConnection();
        $stmt = $db->prepare("SELECT * FROM access_logs WHERE event_date BETWEEN :start_date AND :end_date ORDER BY event_date ASC, event_time ASC");
        $stmt->bindValue(':start_date', $startDate);
        $stmt->bindValue(':end_date', $endDate);
        $stmt->execute();
        
        return $stmt->fetchAll(PDO::FETCH_CLASS, self::class);
    }
    
    /**
     * Récupère les logs d'accès pour un badge spécifique
     */
    public static function getByBadgeId(string $badgeId): array
    {
        $db = self::getConnection();
        $stmt = $db->prepare("SELECT * FROM access_logs WHERE badge_number = :badge_id ORDER BY event_date DESC, event_time DESC");
        $stmt->bindValue(':badge_id', $badgeId);
        $stmt->execute();
        
        return $stmt->fetchAll(PDO::FETCH_CLASS, self::class);
    }
    
    /**
     * Récupère la dernière date disponible dans les logs
     */
    public static function getLatestDate(): ?string
    {
        $db = self::getConnection();
        $stmt = $db->query("SELECT MAX(event_date) as latest_date FROM access_logs");
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        
        return $result['latest_date'] ?? null;
    }
    
    /**
     * Récupère les statistiques d'entrées/sorties pour une date spécifique
     */
    public static function getDailyStats(string $date): array
    {
        $db = self::getConnection();
        $query = "SELECT 
                    event_type,
                    COUNT(*) as count,
                    strftime('%H:%M', event_time) as hour_minute
                  FROM access_logs
                  WHERE event_date = :date
                  GROUP BY event_type, hour_minute
                  ORDER BY hour_minute";
        
        $stmt = $db->prepare($query);
        $stmt->bindValue(':date', $date);
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    /**
     * Récupère les statistiques d'entrées/sorties pour le graphique d'événements quotidiens
     */
    public static function getDailyEventStats(string $date): array
    {
        $query = "SELECT 
                    HOUR(date_time) as hour,
                    event_type,
                    COUNT(*) as count
                  FROM " . static::$table . "
                  WHERE DATE(date_time) = ?
                  GROUP BY HOUR(date_time), event_type
                  ORDER BY HOUR(date_time)";
        
        return self::query($query, [$date]);
    }
    
    /**
     * Récupère la distribution des heures d'arrivée pour une date spécifique
     */
    public static function getArrivalDistribution(string $date): array
    {
        $query = "SELECT 
                    FLOOR(HOUR(MIN(date_time))/2)*2 as hour_range,
                    COUNT(DISTINCT badge_id) as count
                  FROM " . static::$table . "
                  WHERE DATE(date_time) = ? 
                  AND event_type = 'Entrée'
                  GROUP BY FLOOR(HOUR(MIN(date_time))/2)
                  ORDER BY hour_range";
        
        return self::query($query, [$date]);
    }
    
    /**
     * Calcule les heures de travail pour chaque badge pour une date spécifique
     */
    public static function getWorkingHours(string $date): array
    {
        $query = "SELECT 
                    a.badge_id,
                    a.name,
                    a.firstname,
                    MIN(CASE WHEN a.event_type = 'Entrée' THEN a.date_time END) as first_entry,
                    MAX(CASE WHEN a.event_type = 'Sortie' THEN a.date_time END) as last_exit
                  FROM " . static::$table . " a
                  WHERE DATE(a.date_time) = ?
                  GROUP BY a.badge_id, a.name, a.firstname
                  HAVING first_entry IS NOT NULL AND last_exit IS NOT NULL
                  ORDER BY first_entry";
        
        return self::query($query, [$date]);
    }
    
    /**
     * Récupère les données d'accès au format CSV
     */
    public static function exportToCSV(string $startDate, string $endDate): array
    {
        $logs = self::getByDateRange($startDate, $endDate);
        
        $csvData = [];
        // En-têtes du CSV correspondant aux colonnes de la base de données
        $csvData[] = ["Date", "Heure", "Numéro de Badge", "Type d'événement", "Centrale", "Groupe"];
        
        foreach ($logs as $log) {
            $csvData[] = [
                $log->event_date,
                $log->event_time,
                $log->badge_number,
                $log->event_type,
                $log->central,
                $log->group_name
            ];
        }
        
        return $csvData;
    }
    
    /**
     * Supprime les données avant une date spécifiée
     */
    public static function deleteBeforeDate(string $date): int
    {
        $db = self::getConnection();
        $query = "DELETE FROM access_logs WHERE event_date < :date";
        $stmt = $db->prepare($query);
        $stmt->bindValue(':date', $date);
        $stmt->execute();
        return $stmt->rowCount();
    }
    
    /**
     * Compte le nombre total d'enregistrements
     */
    public static function countAll(): int
    {
        $db = self::getConnection();
        $stmt = $db->query("SELECT COUNT(*) FROM access_logs");
        return (int)$stmt->fetchColumn();
    }
    
    /**
     * Compte le nombre d'enregistrements pour une date spécifique
     */
    public static function countByDate(string $date): int
    {
        $db = self::getConnection();
        $query = "SELECT COUNT(*) FROM access_logs WHERE event_date = :date";
        $stmt = $db->prepare($query);
        $stmt->bindValue(':date', $date);
        $stmt->execute();
        return (int)$stmt->fetchColumn();
    }
    
    /**
     * Insère un nouvel enregistrement d'accès
     */
    public function insert(): bool
    {
        $db = self::getConnection();
        $stmt = $db->prepare("
            INSERT INTO access_logs 
            (event_date, event_time, badge_number, event_type, central, group_name) 
            VALUES 
            (:event_date, :event_time, :badge_number, :event_type, :central, :group_name)
        ");
        
        $stmt->bindValue(':event_date', $this->event_date);
        $stmt->bindValue(':event_time', $this->event_time);
        $stmt->bindValue(':badge_number', $this->badge_number);
        $stmt->bindValue(':event_type', $this->event_type);
        $stmt->bindValue(':central', $this->central);
        $stmt->bindValue(':group_name', $this->group_name);
        
        return $stmt->execute();
    }

    /**
     * Obtient la connexion à la base de données
     */
    private static function getConnection(): PDO
    {
        return self::getDB()->getConnection();
    }

    public static function getCount(): int
    {
        $db = self::getConnection();
        $stmt = $db->query("SELECT COUNT(*) as count FROM access_logs");
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        return $result['count'] ?? 0;
    }

    public static function countPerController(): array
    {
        $db = self::getConnection();
        $stmt = $db->query("SELECT central, COUNT(*) as count FROM access_logs GROUP BY central");
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
} 