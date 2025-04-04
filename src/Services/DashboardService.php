<?php

namespace App\Services;

use App\Core\Database;
use PDO;
use PDOException;

class DashboardService
{
    private $db;

    public function __construct()
    {
        $this->db = Database::getInstance()->getConnection();
    }

    /**
     * Récupère la date la plus récente disponible dans la base de données
     * 
     * @return string La date au format Y-m-d
     */
    public function getLatestDate(): string 
    {
        try {
            $query = "SELECT MAX(event_date) as latest_date FROM access_logs";
            $stmt = $this->db->query($query);
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            
            // Si aucune date n'est trouvée, on renvoie la date du jour
            if (!$result || empty($result['latest_date']) || $result['latest_date'] === null) {
                $today = date('Y-m-d');
                error_log("Aucune date trouvée dans la base de données ou valeur NULL, utilisation de la date actuelle: " . $today);
                return $today;
            }
            
            error_log("Date la plus récente trouvée: " . $result['latest_date']);
            return $result['latest_date'];
        } catch (PDOException $e) {
            $today = date('Y-m-d');
            error_log("Erreur lors de la récupération de la date la plus récente: " . $e->getMessage());
            error_log("Utilisation de la date actuelle par défaut: " . $today);
            return $today;
        }
    }

    /**
     * Récupère les statistiques quotidiennes pour une date donnée
     * 
     * @param string $date La date au format Y-m-d
     * @return array Les statistiques quotidiennes
     */
    public function getDailyStats(string $date): array
    {
        try {
            // Récupération des statistiques adaptées à la structure actuelle de access_logs
            $query = "
                SELECT 
                    COUNT(DISTINCT badge_number) as total_people,
                    COUNT(*) as total_entries,
                    SUM(CASE WHEN event_type = 'Utilisateur inconnu' THEN 1 ELSE 0 END) as failed_entries,
                    COUNT(DISTINCT CASE WHEN event_type = 'Utilisateur accepté' THEN badge_number ELSE NULL END) as unique_entries,
                    SUM(CASE WHEN event_type = 'Utilisateur accepté' THEN 1 ELSE 0 END) as validated_entries
                FROM access_logs
                WHERE event_date = :date
            ";
            
            $stmt = $this->db->prepare($query);
            $stmt->execute(['date' => $date]);
            $stats = $stmt->fetch(PDO::FETCH_ASSOC);
            
            // Assurer que toutes les clés sont présentes avec une valeur par défaut de 0
            $defaultStats = [
                'total_people' => 0,
                'total_entries' => 0,
                'failed_entries' => 0,
                'unique_entries' => 0,
                'validated_entries' => 0,
                'failed_attempts' => 0 // Pour compatibilité avec le code existant
            ];
            
            // Fusionner les statistiques obtenues avec les valeurs par défaut
            $stats = array_merge($defaultStats, $stats ? $stats : []);
            
            // Pour compatibilité, assurer que failed_attempts est synchronisé avec failed_entries
            $stats['failed_attempts'] = $stats['failed_entries'];
            
            error_log("Statistiques quotidiennes récupérées pour le " . $date . ": " . json_encode($stats));
            return $stats;
        } catch (PDOException $e) {
            error_log("Erreur lors de la récupération des statistiques quotidiennes: " . $e->getMessage());
            return [
                'total_people' => 0,
                'total_entries' => 0,
                'failed_entries' => 0,
                'unique_entries' => 0,
                'validated_entries' => 0,
                'failed_attempts' => 0
            ];
        }
    }

    /**
     * Récupère les statistiques hebdomadaires
     * 
     * @param string $startDate Date de début au format Y-m-d
     * @param string $endDate Date de fin au format Y-m-d
     * @return array Statistiques par jour de la semaine
     */
    public function getWeeklyStats(string $startDate, string $endDate): array
    {
        try {
            $query = "
                SELECT 
                    event_date,
                    COUNT(DISTINCT badge_number) as daily_people,
                    COUNT(*) as daily_entries
                FROM access_logs
                WHERE event_date BETWEEN :start_date AND :end_date
                GROUP BY event_date
                ORDER BY event_date
            ";
            
            $stmt = $this->db->prepare($query);
            $stmt->execute([
                'start_date' => $startDate,
                'end_date' => $endDate
            ]);
            $result = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            error_log("Statistiques hebdomadaires récupérées pour la période du " . $startDate . " au " . $endDate . ": " . json_encode($result));
            return $result;
        } catch (PDOException $e) {
            error_log("Erreur lors de la récupération des statistiques hebdomadaires: " . $e->getMessage());
            return [];
        }
    }

    /**
     * Récupère les top emplacements pour une date donnée
     * 
     * @param string $date La date au format Y-m-d
     * @return array Les top emplacements
     */
    public function getTopLocations(string $date): array
    {
        try {
            $query = "
                SELECT 
                    location,
                    COUNT(*) as entry_count
                FROM access_logs
                WHERE event_date = :date
                GROUP BY location
                ORDER BY entry_count DESC
            ";
            
            $stmt = $this->db->prepare($query);
            $stmt->execute(['date' => $date]);
            $result = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            error_log("Top locations récupérés pour le " . $date . ": " . json_encode($result));
            return $result;
        } catch (PDOException $e) {
            error_log("Erreur lors de la récupération des top locations: " . $e->getMessage());
            return [];
        }
    }

    /**
     * Récupère les statistiques par groupes pour une date donnée
     * 
     * @param string $date La date au format Y-m-d
     * @return array Les statistiques par groupe
     */
    public function getGroupStats(string $date): array
    {
        try {
            $query = "
                SELECT 
                    user_group as action_type,
                    COUNT(DISTINCT badge_number) as user_count,
                    COUNT(*) as action_count
                FROM access_logs
                WHERE event_date = :date
                  AND event_type = 'Utilisateur accepté'
                  AND user_group IS NOT NULL
                GROUP BY user_group
            ";
            
            $stmt = $this->db->prepare($query);
            $stmt->execute(['date' => $date]);
            $result = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            error_log("Statistiques par groupe récupérées pour le " . $date . ": " . json_encode($result));
            return $result;
        } catch (PDOException $e) {
            error_log("Erreur lors de la récupération des statistiques par groupe: " . $e->getMessage());
            return [];
        }
    }

    /**
     * Récupère les statistiques des heures de pointe pour une date donnée
     * 
     * @param string $date La date au format Y-m-d
     * @return array Les statistiques des heures de pointe
     */
    public function getPeakHours(string $date): array
    {
        try {
            // Utilisation de strftime compatible avec SQLite pour extraire l'heure
            $query = "
                SELECT 
                    CAST(strftime('%H', event_time) AS INTEGER) as hour,
                    COUNT(*) as entry_count
                FROM access_logs
                WHERE event_date = :date
                GROUP BY hour
                ORDER BY hour ASC
            ";
            
            $stmt = $this->db->prepare($query);
            $stmt->execute(['date' => $date]);
            $result = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Assurer que toutes les heures sont représentées (0-23)
            $peakHours = [];
            for ($h = 0; $h < 24; $h++) {
                $peakHours[$h] = ['hour' => $h, 'entry_count' => 0];
            }
            
            // Remplir avec les données réelles
            foreach ($result as $row) {
                $hour = (int)$row['hour'];
                $peakHours[$hour] = $row;
            }
            
            // Convertir en tableau indexé
            return array_values($peakHours);
        } catch (PDOException $e) {
            error_log("Erreur lors de la récupération des heures de pointe: " . $e->getMessage());
            return array_map(function ($h) {
                return ['hour' => $h, 'entry_count' => 0];
            }, range(0, 23));
        }
    }
} 