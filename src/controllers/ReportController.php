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
        $this->reportService = new ReportService();
    }

    public function index(): void
    {
        // Récupération des paramètres de filtrage
        $startDate = $_GET['start_date'] ?? date('Y-m-d', strtotime('-7 days'));
        $endDate = $_GET['end_date'] ?? date('Y-m-d');
        $group = $_GET['group'] ?? null;
        $status = $_GET['status'] ?? null;
        $reportType = $_GET['type'] ?? 'attendance';

        // Génération des données du rapport
        $data = match ($reportType) {
            'attendance' => $this->reportService->generateAttendanceReport($startDate, $endDate, $group, $status),
            'location' => $this->reportService->generateLocationReport($startDate),
            'status' => $this->reportService->getStatusStatistics($startDate, $endDate),
            default => throw new \RuntimeException('Type de rapport non supporté')
        };

        // Si une exportation Excel est demandée
        if (isset($_GET['export']) && $_GET['export'] === 'excel') {
            $filename = $this->reportService->generateExcelReport($data, $reportType);
            
            // Envoi du fichier au navigateur
            header('Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            header('Content-Disposition: attachment;filename="' . basename($filename) . '"');
            header('Cache-Control: max-age=0');
            readfile($filename);
            
            // Suppression du fichier temporaire
            unlink($filename);
            exit;
        }

        // Récupération des données pour les graphiques
        $statusStats = $this->reportService->getStatusStatistics($startDate, $endDate);
        $statusAttendance = $this->reportService->getStatusAttendanceByDay($startDate, $endDate);
        $statusPeakHours = $this->reportService->getStatusPeakHours($startDate, $endDate);

        // Préparation des données pour les graphiques
        $chartData = [
            'statusStats' => $statusStats,
            'statusAttendance' => $this->prepareStatusAttendanceData($statusAttendance),
            'statusPeakHours' => $this->prepareStatusPeakHoursData($statusPeakHours)
        ];

        // Préparation des données pour la vue
        $viewData = [
            'data' => $data,
            'startDate' => $startDate,
            'endDate' => $endDate,
            'group' => $group,
            'status' => $status,
            'reportType' => $reportType,
            'groups' => $this->getAvailableGroups(),
            'statuses' => $this->reportService->getAvailableStatuses(),
            'chartData' => $chartData
        ];

        // Extraction des variables pour la vue
        extract($viewData);

        // Inclusion de la vue
        include __DIR__ . '/../views/reports/index.php';
    }

    private function getAvailableGroups(): array
    {
        $sql = "SELECT DISTINCT group_name FROM access_logs ORDER BY group_name";
        return array_column($this->reportService->getDatabase()->query($sql)->fetchAll(), 'group_name');
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
} 