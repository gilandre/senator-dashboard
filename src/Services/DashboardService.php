<?php

namespace App\Services;

use App\Core\Database;
use PDO;

class DashboardService
{
    private $db;

    public function __construct()
    {
        $this->db = Database::getInstance()->getConnection();
    }

    public function getDailyStats(string $date): array
    {
        $sql = "SELECT 
                    COUNT(DISTINCT badge_number) as total_people,
                    COUNT(CASE WHEN event_type = 'Utilisateur accepté' THEN 1 END) as total_entries,
                    COUNT(CASE WHEN event_type = 'Utilisateur inconnu' THEN 1 END) as failed_entries,
                    COUNT(DISTINCT CASE WHEN event_type = 'Utilisateur accepté' THEN badge_number END) as unique_entries
                FROM access_logs 
                WHERE event_date = ?";

        $stmt = $this->db->prepare($sql);
        $stmt->execute([$date]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    public function getWeeklyStats(string $startDate, string $endDate): array
    {
        $sql = "SELECT 
                    event_date,
                    COUNT(DISTINCT badge_number) as daily_people,
                    COUNT(CASE WHEN event_type = 'Utilisateur accepté' THEN 1 END) as daily_entries
                FROM access_logs 
                WHERE event_date BETWEEN ? AND ?
                GROUP BY event_date
                ORDER BY event_date";

        $stmt = $this->db->prepare($sql);
        $stmt->execute([$startDate, $endDate]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getTopLocations(string $date): array
    {
        $sql = "SELECT 
                    central as location,
                    COUNT(CASE WHEN event_type = 'Utilisateur accepté' THEN 1 END) as entry_count
                FROM access_logs 
                WHERE event_date = ?
                GROUP BY central
                ORDER BY entry_count DESC
                LIMIT 5";

        $stmt = $this->db->prepare($sql);
        $stmt->execute([$date]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getGroupStats(string $date): array
    {
        $sql = "SELECT 
                    group_name as action_type,
                    COUNT(DISTINCT badge_number) as user_count,
                    COUNT(*) as action_count
                FROM access_logs 
                WHERE event_date = ?
                GROUP BY group_name
                ORDER BY user_count DESC";

        $stmt = $this->db->prepare($sql);
        $stmt->execute([$date]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getPeakHours(string $date): array
    {
        $sql = "SELECT 
                    HOUR(event_time) as hour,
                    COUNT(CASE WHEN event_type = 'Utilisateur accepté' THEN 1 END) as entry_count
                FROM access_logs 
                WHERE event_date = ?
                GROUP BY HOUR(event_time)
                ORDER BY hour";

        $stmt = $this->db->prepare($sql);
        $stmt->execute([$date]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
} 