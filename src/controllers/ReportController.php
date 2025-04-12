<?php

namespace App\Controllers;

use App\Services\ReportService;
use App\Core\Controller;

class ReportController extends Controller
{
    private ReportService $reportService;

    public function __construct()
    {
        parent::__construct();
        // Définir explicitement le layout à utiliser (comme dans les autres contrôleurs)
        $this->layout = 'layouts/app';
        $this->reportService = new ReportService();
    }

    public function index(): void
    {
        // Récupération des paramètres de filtrage
        $startDate = $_GET['start_date'] ?? $_GET['date'] ?? date('Y-m-d', strtotime('-7 days'));
        $endDate = $_GET['end_date'] ?? $_GET['date'] ?? date('Y-m-d');
        $group = $_GET['group'] ?? null;
        $status = $_GET['status'] ?? null;
        $reportType = $_GET['type'] ?? 'catalog'; // Default is now 'catalog'
        $metric = $_GET['metric'] ?? null;
        
        // Si on vient du dashboard avec un KPI spécifique, configurer le filtre approprié
        if ($metric) {
            switch ($metric) {
                case 'total':
                    $reportType = 'attendance';
                    break;
                case 'ontime':
                    $reportType = 'worktime';
                    $filter = 'ontime';
                    break;
                case 'late':
                    $reportType = 'worktime';
                    $filter = 'late';
                    break;
                case 'hours':
                    $reportType = 'worktime';
                    break;
                case 'security':
                    $reportType = 'security';
                    break;
            }
            
            // Si on vient du dashboard avec une date précise, utiliser celle-ci comme période
            if (isset($_GET['date'])) {
                $startDate = $endDate = $_GET['date'];
            }
        }

        // Initialiser les données
        $data = [];
        $errorMessage = null;

        // Si un type spécifique de rapport est demandé, générer les données
        if ($reportType !== 'catalog') {
            try {
                switch ($reportType) {
                    case 'attendance':
                        $data = $this->reportService->generateAttendanceReport($startDate, $endDate, $group, $status);
                        break;
                    case 'worktime':
                        $data = $this->reportService->generateWorkingHoursReport($startDate, $endDate, $group);
                        break;
                    case 'security':
                        $data = $this->getSecurityData($startDate, $endDate);
                        break;
                    case 'custom':
                        $data = [];
                        break;
                    default:
                        throw new \RuntimeException('Type de rapport non supporté');
                }
            } catch (\Exception $e) {
                $errorMessage = "Impossible de générer le rapport : " . $e->getMessage();
            }
        }

        // Récupération des données pour les graphiques si nécessaire
        $chartData = [];
        if ($reportType !== 'catalog') {
            try {
                $statusStats = $this->reportService->getStatusStatistics($startDate, $endDate);
                $statusAttendance = $this->reportService->getStatusAttendanceByDay($startDate, $endDate);
                $statusPeakHours = $this->reportService->getStatusPeakHours($startDate, $endDate);

                $chartData = [
                    'statusStats' => $statusStats,
                    'statusAttendance' => $this->prepareStatusAttendanceData($statusAttendance),
                    'statusPeakHours' => $this->prepareStatusPeakHoursData($statusPeakHours)
                ];
            } catch (\Exception $e) {
                // Si une erreur se produit lors de la génération des graphiques, ne pas bloquer la page
                $chartData = [];
            }
        }

        // Préparation des données pour la vue
        $viewData = [
            'title' => 'Rapports',
            'current_page' => 'reports',
            'data' => $data,
            'startDate' => $startDate,
            'endDate' => $endDate,
            'group' => $group,
            'status' => $status,
            'reportType' => $reportType,
            'groups' => $this->getAvailableGroups(),
            'statuses' => $this->reportService->getAvailableStatuses(),
            'chartData' => $chartData,
            'errorMessage' => $errorMessage
        ];

        // Utiliser la méthode view() pour appliquer le layout commun
        $this->view('reports/index', $viewData);
    }

    private function getAvailableGroups(): array
    {
        $sql = "SELECT DISTINCT group_name FROM access_logs ORDER BY group_name";
        return array_column($this->reportService->getDatabase()->fetchAll($sql), 'group_name');
    }

    private function prepareStatusAttendanceData(array $data): array
    {
        $dates = [];
        $statuses = [];
        $formattedData = [];

        // Extraction des dates et statuts uniques
        foreach ($data as $row) {
            $dates[$row['event_date']] = true;
            $statuses[$row['status']] = true;
        }

        // Initialisation des données
        foreach ($statuses as $status => $_) {
            $formattedData[$status] = array_fill_keys(array_keys($dates), 0);
        }

        // Remplissage des données
        foreach ($data as $row) {
            $formattedData[$row['status']][$row['event_date']] = $row['total_people'];
        }

        return [
            'dates' => array_keys($dates),
            'statuses' => array_keys($statuses),
            'data' => $formattedData
        ];
    }

    private function prepareStatusPeakHoursData(array $data): array
    {
        $hours = range(0, 23);
        $statuses = [];
        $formattedData = [];

        // Extraction des statuts uniques
        foreach ($data as $row) {
            $statuses[$row['status']] = true;
        }

        // Initialisation des données
        foreach ($statuses as $status => $_) {
            $formattedData[$status] = array_fill_keys($hours, 0);
        }

        // Remplissage des données
        foreach ($data as $row) {
            $formattedData[$row['status']][$row['hour']] = $row['total_entries'];
        }

        return [
            'hours' => $hours,
            'statuses' => array_keys($statuses),
            'data' => $formattedData
        ];
    }

    /**
     * Récupère les données de sécurité
     */
    private function getSecurityData(string $startDate, string $endDate): array
    {
        $sql = "SELECT 
                    event_date,
                    central,
                    event_type,
                    badge_number,
                    first_name,
                    last_name,
                    group_name,
                    event_time
                FROM access_logs 
                WHERE event_date BETWEEN ? AND ?
                AND event_type IN ('Utilisateur rejeté', 'Utilisateur inconnu', 'Tentative non autorisée')
                ORDER BY event_date DESC, event_time DESC";
        
        return $this->reportService->getDatabase()->fetchAll($sql, [$startDate, $endDate]);
    }
} 