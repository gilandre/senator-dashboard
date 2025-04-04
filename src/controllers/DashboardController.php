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
    }

    public function index(): void
    {
        // Récupération de la date sélectionnée (par défaut aujourd'hui)
        $selectedDate = $_GET['date'] ?? date('Y-m-d');
        
        // Calcul des dates pour la semaine
        $startDate = date('Y-m-d', strtotime($selectedDate . ' -6 days'));
        $endDate = $selectedDate;

        // Récupération des statistiques
        $dailyStats = $this->dashboardService->getDailyStats($selectedDate);
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
            'dailyStats' => $dailyStats,
            'weeklyStats' => $weeklyStats,
            'topLocations' => $topLocations,
            'groupStats' => $groupStats,
            'peakHours' => $peakHours,
            'chartData' => $chartData
        ]);
    }

    public function getData(): void
    {
        header('Content-Type: application/json');
        
        $date = $_GET['date'] ?? date('Y-m-d');
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