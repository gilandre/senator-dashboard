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

    /**
     * Récupère les statistiques d'assiduité (taux de présence)
     * 
     * @param string $date La date au format Y-m-d
     * @param int $totalExpected Nombre total d'employés attendus
     * @return array Taux de présence et statistiques associées
     */
    public function getAttendanceRate(string $date, int $totalExpected = 10): array
    {
        try {
            // Récupération du nombre d'employés présents ce jour
            $query = "
                SELECT 
                    COUNT(DISTINCT badge_number) as present_employees
                FROM access_logs
                WHERE event_date = :date
                AND event_type = 'Utilisateur accepté'
            ";
            
            $stmt = $this->db->prepare($query);
            $stmt->execute(['date' => $date]);
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            
            // Calcul du taux de présence
            $presentEmployees = $result['present_employees'] ?? 0;
            $attendanceRate = ($totalExpected > 0) ? round(($presentEmployees / $totalExpected) * 100) : 0;
            
            return [
                'present_employees' => $presentEmployees,
                'total_expected' => $totalExpected,
                'attendance_rate' => $attendanceRate
            ];
        } catch (PDOException $e) {
            error_log("Erreur lors du calcul du taux de présence: " . $e->getMessage());
            return [
                'present_employees' => 0,
                'total_expected' => $totalExpected,
                'attendance_rate' => 0
            ];
        }
    }

    /**
     * Récupère les statistiques d'heures d'arrivée et de départ
     * 
     * @param string $date La date au format Y-m-d
     * @return array Moyennes des heures d'arrivée et de départ
     */
    public function getWorkingHoursStats(string $date): array
    {
        try {
            // Récupération des premières entrées de la journée (arrivées)
            $arrivalQuery = "
                SELECT 
                    badge_number,
                    MIN(event_time) as first_entry
                FROM access_logs
                WHERE event_date = :date
                AND event_type = 'Utilisateur accepté'
                GROUP BY badge_number
            ";
            
            $stmt = $this->db->prepare($arrivalQuery);
            $stmt->execute(['date' => $date]);
            $arrivals = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Récupération des dernières entrées de la journée (départs)
            $departureQuery = "
                SELECT 
                    badge_number,
                    MAX(event_time) as last_entry
                FROM access_logs
                WHERE event_date = :date
                AND event_type = 'Utilisateur accepté'
                GROUP BY badge_number
            ";
            
            $stmt = $this->db->prepare($departureQuery);
            $stmt->execute(['date' => $date]);
            $departures = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Calcul des statistiques
            $arrivalTimes = [];
            $departureTimes = [];
            $workDurations = [];
            
            foreach ($arrivals as $arrival) {
                $arrivalTime = strtotime($arrival['first_entry']);
                $arrivalTimes[] = $arrivalTime;
                
                // Chercher le départ correspondant
                foreach ($departures as $departure) {
                    if ($departure['badge_number'] === $arrival['badge_number']) {
                        $departureTime = strtotime($departure['last_entry']);
                        $departureTimes[] = $departureTime;
                        
                        // Calculer la durée de présence
                        $duration = $departureTime - $arrivalTime;
                        if ($duration > 0) {
                            $workDurations[] = $duration;
                        }
                        break;
                    }
                }
            }
            
            // Calculer les moyennes
            $avgArrivalTime = !empty($arrivalTimes) ? $this->calculateAverageTime($arrivalTimes) : '00:00';
            $avgDepartureTime = !empty($departureTimes) ? $this->calculateAverageTime($departureTimes) : '00:00';
            $avgWorkDuration = !empty($workDurations) ? $this->formatDuration(array_sum($workDurations) / count($workDurations)) : '00:00';
            
            // Calculer le taux de ponctualité (% d'arrivées avant 9:00)
            $onTimeCount = 0;
            foreach ($arrivalTimes as $time) {
                $hour = intval(date('H', $time));
                $minute = intval(date('i', $time));
                if ($hour < 9 || ($hour == 9 && $minute <= 0)) {
                    $onTimeCount++;
                }
            }
            
            $punctualityRate = !empty($arrivalTimes) ? round(($onTimeCount / count($arrivalTimes)) * 100) : 0;
            
            return [
                'avg_arrival_time' => $avgArrivalTime,
                'avg_departure_time' => $avgDepartureTime,
                'avg_work_duration' => $avgWorkDuration,
                'punctuality_rate' => $punctualityRate,
                'early_departures_rate' => $this->calculateEarlyDeparturesRate($departureTimes)
            ];
        } catch (PDOException $e) {
            error_log("Erreur lors du calcul des statistiques d'heures de travail: " . $e->getMessage());
            return [
                'avg_arrival_time' => '00:00',
                'avg_departure_time' => '00:00',
                'avg_work_duration' => '00:00',
                'punctuality_rate' => 0,
                'early_departures_rate' => 0
            ];
        }
    }

    /**
     * Récupère la distribution des heures d'arrivée
     * 
     * @param string $date La date au format Y-m-d
     * @return array Distribution des arrivées par tranche horaire
     */
    public function getArrivalDistribution(string $date): array
    {
        try {
            // Récupération des premières entrées de la journée (arrivées)
            $query = "
                SELECT 
                    badge_number,
                    MIN(event_time) as first_entry
                FROM access_logs
                WHERE event_date = :date
                AND event_type = 'Utilisateur accepté'
                GROUP BY badge_number
            ";
            
            $stmt = $this->db->prepare($query);
            $stmt->execute(['date' => $date]);
            $arrivals = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Initialiser les tranches horaires (de 6h à 12h)
            $timeSlots = [];
            for ($h = 6; $h <= 12; $h++) {
                $timeSlot = sprintf('%02d:00-%02d:59', $h, $h);
                $timeSlots[$timeSlot] = 0;
            }
            
            // Compter les arrivées par tranche horaire
            foreach ($arrivals as $arrival) {
                if (!isset($arrival['first_entry']) || empty($arrival['first_entry'])) {
                    continue;
                }
                
                $arrivalTime = strtotime($arrival['first_entry']);
                $hour = intval(date('H', $arrivalTime));
                
                if ($hour >= 6 && $hour <= 12) {
                    $timeSlot = sprintf('%02d:00-%02d:59', $hour, $hour);
                    $timeSlots[$timeSlot]++;
                }
            }
            
            // Convertir en format pour le graphique
            $result = [
                'labels' => array_keys($timeSlots),
                'data' => array_values($timeSlots)
            ];
            
            return $result;
        } catch (PDOException $e) {
            error_log("Erreur lors du calcul de la distribution des arrivées: " . $e->getMessage());
            return [
                'labels' => [],
                'data' => []
            ];
        }
    }

    /**
     * Récupère la distribution des heures de départ
     * 
     * @param string $date La date au format Y-m-d
     * @return array Distribution des départs par tranche horaire
     */
    public function getDepartureDistribution(string $date): array
    {
        try {
            // Récupération des dernières entrées de la journée (départs)
            $query = "
                SELECT 
                    badge_number,
                    MAX(event_time) as last_entry
                FROM access_logs
                WHERE event_date = :date
                AND event_type = 'Utilisateur accepté'
                GROUP BY badge_number
            ";
            
            $stmt = $this->db->prepare($query);
            $stmt->execute(['date' => $date]);
            $departures = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Initialiser les tranches horaires (de 15h à 20h)
            $timeSlots = [];
            for ($h = 15; $h <= 20; $h++) {
                $timeSlot = sprintf('%02d:00-%02d:59', $h, $h);
                $timeSlots[$timeSlot] = 0;
            }
            
            // Compter les départs par tranche horaire
            foreach ($departures as $departure) {
                if (!isset($departure['last_entry']) || empty($departure['last_entry'])) {
                    continue;
                }
                
                $departureTime = strtotime($departure['last_entry']);
                $hour = intval(date('H', $departureTime));
                
                if ($hour >= 15 && $hour <= 20) {
                    $timeSlot = sprintf('%02d:00-%02d:59', $hour, $hour);
                    $timeSlots[$timeSlot]++;
                }
            }
            
            // Convertir en format pour le graphique
            $result = [
                'labels' => array_keys($timeSlots),
                'data' => array_values($timeSlots)
            ];
            
            return $result;
        } catch (PDOException $e) {
            error_log("Erreur lors du calcul de la distribution des départs: " . $e->getMessage());
            return [
                'labels' => [],
                'data' => []
            ];
        }
    }

    /**
     * Récupère les données des employés pour un tableau individuel
     * 
     * @param string $date La date au format Y-m-d
     * @return array Données de présence par employé
     */
    public function getEmployeeAttendanceData(string $date): array
    {
        try {
            // Récupérer toutes les entrées/sorties de la journée
            $query = "
                SELECT 
                    badge_number,
                    MIN(event_time) as first_entry,
                    MAX(event_time) as last_entry,
                    COUNT(*) as entry_count
                FROM access_logs
                WHERE event_date = :date
                AND event_type = 'Utilisateur accepté'
                GROUP BY badge_number
                ORDER BY first_entry
            ";
            
            $stmt = $this->db->prepare($query);
            $stmt->execute(['date' => $date]);
            $employees = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Ajouter les calculs spécifiques pour chaque employé
            foreach ($employees as &$employee) {
                $firstEntry = strtotime($employee['first_entry']);
                $lastEntry = strtotime($employee['last_entry']);
                
                // Calculer la durée de présence
                $duration = $lastEntry - $firstEntry;
                $employee['duration'] = $this->formatDuration($duration);
                
                // Vérifier si l'arrivée est à l'heure (avant 9h)
                $arrivalHour = intval(date('H', $firstEntry));
                $arrivalMinute = intval(date('i', $firstEntry));
                $employee['is_late'] = ($arrivalHour > 9 || ($arrivalHour == 9 && $arrivalMinute > 0));
                
                // Vérifier si le départ est anticipé (avant 17h)
                $departureHour = intval(date('H', $lastEntry));
                $departureMinute = intval(date('i', $lastEntry));
                $employee['is_early_departure'] = ($departureHour < 17);
                
                // Formater les heures pour l'affichage
                $employee['arrival_time'] = date('H:i', $firstEntry);
                $employee['departure_time'] = date('H:i', $lastEntry);
            }
            
            return $employees;
        } catch (PDOException $e) {
            error_log("Erreur lors de la récupération des données d'assiduité par employé: " . $e->getMessage());
            return [];
        }
    }

    /**
     * Calcule la moyenne d'une série d'heures
     * 
     * @param array $times Tableau de timestamps
     * @return string Heure moyenne au format HH:MM
     */
    private function calculateAverageTime(array $times): string
    {
        if (empty($times)) {
            return '00:00';
        }
        
        // Convertir les timestamps en minutes depuis minuit
        $minutesArray = [];
        foreach ($times as $time) {
            $hour = intval(date('H', $time));
            $minute = intval(date('i', $time));
            $minutesArray[] = $hour * 60 + $minute;
        }
        
        // Calculer la moyenne
        $avgMinutes = array_sum($minutesArray) / count($minutesArray);
        
        // Convertir en heures:minutes
        $hours = floor($avgMinutes / 60);
        $minutes = $avgMinutes % 60;
        
        return sprintf('%02d:%02d', $hours, round($minutes));
    }

    /**
     * Formate une durée en secondes au format HH:MM
     * 
     * @param int $seconds Durée en secondes
     * @return string Durée formatée au format HH:MM
     */
    private function formatDuration(int $seconds): string
    {
        $hours = floor($seconds / 3600);
        $minutes = floor(($seconds % 3600) / 60);
        
        return sprintf('%02d:%02d', $hours, $minutes);
    }

    /**
     * Calcule le taux de départs anticipés (avant 17h)
     * 
     * @param array $departureTimes Tableau de timestamps de départ
     * @return int Pourcentage de départs anticipés
     */
    private function calculateEarlyDeparturesRate(array $departureTimes): int
    {
        if (empty($departureTimes)) {
            return 0;
        }
        
        $earlyCount = 0;
        foreach ($departureTimes as $time) {
            $hour = intval(date('H', $time));
            if ($hour < 17) {
                $earlyCount++;
            }
        }
        
        return round(($earlyCount / count($departureTimes)) * 100);
    }

    /**
     * Récupère les statistiques d'assiduité pour une date donnée
     * 
     * @param string $date La date au format Y-m-d
     * @return array Statistiques d'assiduité
     */
    public function getAttendanceStats(string $date): array
    {
        try {
            // Requête pour compter les personnes présentes (entrée enregistrée)
            $queryTotal = "
                SELECT COUNT(DISTINCT badge_number) as total
                FROM access_logs
                WHERE event_date = :date
                AND event_type = 'Utilisateur accepté'
            ";
            
            $stmtTotal = $this->db->prepare($queryTotal);
            $stmtTotal->execute(['date' => $date]);
            $result = $stmtTotal->fetch(PDO::FETCH_ASSOC);
            $total = isset($result['total']) ? intval($result['total']) : 0;
            
            // Requête pour les entrées avant 9h
            $queryOnTime = "
                SELECT COUNT(DISTINCT badge_number) as on_time
                FROM access_logs
                WHERE event_date = :date
                AND event_type = 'Utilisateur accepté'
                AND event_time < '09:00:00'
            ";
            
            $stmtOnTime = $this->db->prepare($queryOnTime);
            $stmtOnTime->execute(['date' => $date]);
            $resultOnTime = $stmtOnTime->fetch(PDO::FETCH_ASSOC);
            $onTime = isset($resultOnTime['on_time']) ? intval($resultOnTime['on_time']) : 0;
            
            // Requête pour les entrées après 9h (en retard)
            $queryLate = "
                SELECT COUNT(DISTINCT badge_number) as late
                FROM (
                    SELECT 
                        badge_number,
                        MIN(event_time) as first_entry
                    FROM access_logs
                    WHERE event_date = :date
                    AND event_type = 'Utilisateur accepté'
                    GROUP BY badge_number
                ) as first_entries
                WHERE first_entry >= '09:00:00'
            ";
            
            $stmtLate = $this->db->prepare($queryLate);
            $stmtLate->execute(['date' => $date]);
            $resultLate = $stmtLate->fetch(PDO::FETCH_ASSOC);
            $late = isset($resultLate['late']) ? intval($resultLate['late']) : 0;
            
            // Calcul du temps moyen de présence
            $queryAvgTime = "
                SELECT 
                    badge_number,
                    MIN(event_time) as first_entry,
                    MAX(event_time) as last_entry
                FROM access_logs
                WHERE event_date = :date
                AND event_type = 'Utilisateur accepté'
                GROUP BY badge_number
            ";
            
            $stmtAvgTime = $this->db->prepare($queryAvgTime);
            $stmtAvgTime->execute(['date' => $date]);
            $entries = $stmtAvgTime->fetchAll(PDO::FETCH_ASSOC);
            
            $totalMinutes = 0;
            $validEntries = 0;
            
            foreach ($entries as $entry) {
                if (isset($entry['first_entry']) && isset($entry['last_entry']) 
                    && $entry['first_entry'] != $entry['last_entry']) {
                    $start = strtotime($entry['first_entry']);
                    $end = strtotime($entry['last_entry']);
                    
                    if ($end > $start) {
                        $totalMinutes += ($end - $start) / 60;
                        $validEntries++;
                    }
                }
            }
            
            $avgWorkingHours = ($validEntries > 0) ? round($totalMinutes / $validEntries / 60, 1) : 0;
            
            return [
                'total' => $total,
                'onTime' => $onTime,
                'late' => $late,
                'avgWorkingHours' => $avgWorkingHours
            ];
        } catch (PDOException $e) {
            error_log("Erreur lors de la récupération des statistiques d'assiduité: " . $e->getMessage());
            return [
                'total' => 0,
                'onTime' => 0,
                'late' => 0,
                'avgWorkingHours' => 0
            ];
        }
    }

    /**
     * Récupère les données sur le temps de travail
     * 
     * @param string $date La date au format Y-m-d
     * @return array Répartition des heures de travail
     */
    public function getWorkingHoursData(string $date): array
    {
        try {
            // Requête pour obtenir le temps de travail par employé
            $query = "
                SELECT 
                    badge_number,
                    MIN(event_time) as first_entry,
                    MAX(event_time) as last_entry
                FROM access_logs
                WHERE event_date = :date
                AND event_type = 'Utilisateur accepté'
                GROUP BY badge_number
            ";
            
            $stmt = $this->db->prepare($query);
            $stmt->execute(['date' => $date]);
            $entries = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Initialiser les catégories d'heures de travail
            $categories = [
                '< 4h' => 0,
                '4-6h' => 0,
                '6-8h' => 0,
                '8-9h' => 0,
                '> 9h' => 0
            ];
            
            foreach ($entries as $entry) {
                if (isset($entry['first_entry']) && isset($entry['last_entry']) 
                    && $entry['first_entry'] != $entry['last_entry']) {
                    $start = strtotime($entry['first_entry']);
                    $end = strtotime($entry['last_entry']);
                    
                    if ($end > $start) {
                        $hoursWorked = ($end - $start) / 3600;
                        
                        if ($hoursWorked < 4) {
                            $categories['< 4h']++;
                        } elseif ($hoursWorked < 6) {
                            $categories['4-6h']++;
                        } elseif ($hoursWorked < 8) {
                            $categories['6-8h']++;
                        } elseif ($hoursWorked < 9) {
                            $categories['8-9h']++;
                        } else {
                            $categories['> 9h']++;
                        }
                    }
                }
            }
            
            return [
                'labels' => array_keys($categories),
                'data' => array_values($categories)
            ];
        } catch (PDOException $e) {
            error_log("Erreur lors du calcul de la répartition des heures de travail: " . $e->getMessage());
            return [
                'labels' => [],
                'data' => []
            ];
        }
    }
} 