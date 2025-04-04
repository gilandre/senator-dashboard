<?php

namespace App\Controllers;

use App\Core\Controller;
use App\Services\DashboardService;

class DashboardController extends Controller
{
    private DashboardService $dashboardService;

    public function __construct()
    {
        parent::__construct();
        $this->dashboardService = new DashboardService();
        $this->layout = 'layouts/app'; // Définir explicitement le layout à utiliser
    }

    public function index(): void
    {
        // Vérifier que l'utilisateur est connecté
        $this->requireLogin();
        
        // En mode développement
        putenv('APP_ENV=development');
        
        // Récupération de la dernière date disponible dans la base de données
        $latestDate = $this->dashboardService->getLatestDate();
        error_log("Controller - Date la plus récente disponible: " . $latestDate);
        
        // Récupération de la date sélectionnée (par défaut la dernière date disponible)
        $selectedDate = $_GET['date'] ?? $latestDate;
        error_log("Controller - Date sélectionnée pour l'affichage: " . $selectedDate);
        
        // Calcul des dates pour la semaine
        $startDate = date('Y-m-d', strtotime($selectedDate . ' -6 days'));
        $endDate = $selectedDate;

        // Récupération des statistiques
        $dailyStats = $this->dashboardService->getDailyStats($selectedDate);
        error_log("Controller - Statistiques récupérées pour le jour: " . json_encode($dailyStats));
        
        $weeklyStats = $this->dashboardService->getWeeklyStats($startDate, $endDate);
        $topLocations = $this->dashboardService->getTopLocations($selectedDate);
        $groupStats = $this->dashboardService->getGroupStats($selectedDate);
        $peakHours = $this->dashboardService->getPeakHours($selectedDate);

        // Préparation des données pour les graphiques
        $chartData = [
            'weekly' => [
                'labels' => array_column($weeklyStats, 'event_date'),
                'people' => array_column($weeklyStats, 'daily_people'),
                'entries' => array_column($weeklyStats, 'daily_entries')
            ],
            'peakHours' => [
                'labels' => array_map(function($hour) {
                    return sprintf('%02d:00', $hour);
                }, array_column($peakHours, 'hour')),
                'entries' => array_column($peakHours, 'entry_count')
            ],
            'locations' => [
                'labels' => array_column($topLocations, 'location'),
                'entries' => array_column($topLocations, 'entry_count')
            ],
            'groups' => [
                'labels' => array_column($groupStats, 'action_type'),
                'users' => array_column($groupStats, 'user_count'),
                'actions' => array_column($groupStats, 'action_count')
            ]
        ];

        // Passage des données à la vue
        $this->view('dashboard/index', [
            'currentPage' => 'dashboard',
            'selectedDate' => $selectedDate,
            'latestDate' => $latestDate,
            'dailyStats' => $dailyStats,
            'weeklyStats' => $weeklyStats,
            'topLocations' => $topLocations,
            'groupStats' => $groupStats,
            'peakHours' => $peakHours,
            'chartData' => $chartData
        ]);

        // Log pour déboguer
        $logMessage = "Données passées à la vue dashboard:\n";
        $logMessage .= "- selectedDate: " . $selectedDate . "\n";
        $logMessage .= "- latestDate: " . $latestDate . "\n";
        $logMessage .= "- dailyStats: " . json_encode($dailyStats) . "\n";
        $logMessage .= "- chartData weekly labels: " . json_encode($chartData['weekly']['labels']) . "\n";
        $logMessage .= "- chartData weekly entries: " . json_encode($chartData['weekly']['entries']) . "\n";
        error_log($logMessage);
    }

    public function getData(): void
    {
        header('Content-Type: application/json');
        
        // Utiliser la dernière date disponible par défaut
        $latestDate = $this->dashboardService->getLatestDate();
        $date = $_GET['date'] ?? $latestDate;
        $type = $_GET['type'] ?? 'daily';

        $data = match($type) {
            'daily' => $this->dashboardService->getDailyStats($date),
            'locations' => $this->dashboardService->getTopLocations($date),
            'groups' => $this->dashboardService->getGroupStats($date),
            'peakHours' => $this->dashboardService->getPeakHours($date),
            default => throw new \RuntimeException('Type de données invalide')
        };

        echo json_encode($data);
        exit;
    }
} 