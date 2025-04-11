<?php

namespace App\Controllers;

use App\Core\Controller;
use App\Services\DashboardService;
use Exception;

class DashboardController extends Controller
{
    private DashboardService $dashboardService;

    public function __construct()
    {
        parent::__construct();
        $this->dashboardService = new DashboardService();
    }

    /**
     * Affiche le tableau de bord
     * 
     * @return void
     */
    public function index(): void
    {
        // Vérifier l'authentification
        if (!isset($_SESSION['user_id']) || empty($_SESSION['user_id'])) {
            header('Location: /login');
            return;
        }

        // Rendre la vue du tableau de bord
        $this->view('dashboard/index', [
            'title' => 'Tableau de bord RH',
            'activeMenu' => 'dashboard'
        ]);
    }

    /**
     * Récupère les données pour le tableau de bord via AJAX
     * 
     * @return void
     */
    public function getData(): void
    {
        header('Content-Type: application/json');
        
        $latestDate = $this->dashboardService->getLatestDate();
        $date = $_GET['date'] ?? $latestDate;
        $type = $_GET['type'] ?? 'daily';

        // Nouvelle implémentation de match avec tous les types
        $data = match($type) {
            'daily' => [
                'date' => $latestDate,
                'stats' => $this->dashboardService->getDailyStats($date)
            ],
            'locations' => $this->dashboardService->getTopLocations($date),
            'groups' => $this->dashboardService->getGroupStats($date),
            'peakHours' => $this->dashboardService->getPeakHours($date),
            'attendance' => $this->dashboardService->getAttendanceStats($date),
            'workingHours' => $this->dashboardService->getWorkingHoursData($date),
            'arrivalDistribution' => $this->dashboardService->getArrivalDistribution($date),
            'departureDistribution' => $this->dashboardService->getDepartureDistribution($date),
            default => ['error' => 'Type de données non reconnu']
        };

        echo json_encode($data);
        exit;
    }

    /**
     * Vérifie si la date est valide
     * 
     * @param string $date Date au format Y-m-d
     * @return bool
     */
    private function validateDate(string $date): bool
    {
        $d = \DateTime::createFromFormat('Y-m-d', $date);
        return $d && $d->format('Y-m-d') === $date;
    }
} 