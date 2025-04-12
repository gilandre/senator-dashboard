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
        // Définir explicitement le layout à utiliser (comme dans ImportController)
        $this->layout = 'layouts/app';
        $this->dashboardService = new DashboardService();
    }

    /**
     * Affiche le tableau de bord
     * 
     * @return void
     */
    public function index(): void
    {
        // Ajouter des instructions de débogage
        $logFile = __DIR__ . '/../../dashboard_debug.log';
        file_put_contents($logFile, "=== ACCÈS AU TABLEAU DE BORD ===\n", FILE_APPEND);
        file_put_contents($logFile, "Date: " . date('Y-m-d H:i:s') . "\n", FILE_APPEND);
        file_put_contents($logFile, "Session ID: " . session_id() . "\n", FILE_APPEND);
        file_put_contents($logFile, "Session status: " . session_status() . "\n", FILE_APPEND);
        file_put_contents($logFile, "Session data: " . print_r($_SESSION, true) . "\n", FILE_APPEND);
        file_put_contents($logFile, "Is logged in: " . ($this->auth->isLoggedIn() ? "OUI" : "NON") . "\n", FILE_APPEND);
        file_put_contents($logFile, "User ID: " . ($this->auth->getUserId() ?? "non défini") . "\n", FILE_APPEND);
        
        // Vérifier l'authentification
        if (!isset($_SESSION['user_id']) || empty($_SESSION['user_id'])) {
            header('Location: /login');
            return;
        }

        // Rendre la vue du tableau de bord
        $this->view('dashboard/index', [
            'title' => 'Tableau de bord RH',
            'current_page' => 'dashboard'
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

        // Cache key basé sur le type et la date pour réduire les requêtes redondantes
        $cacheKey = "dashboard_{$type}_{$date}";
        
        // Vérifier si la donnée est en cache
        if (isset($_SESSION[$cacheKey]) && !empty($_SESSION[$cacheKey])) {
            echo $_SESSION[$cacheKey];
            exit;
        }

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

        // Mettre en cache la réponse pour les requêtes futures
        $_SESSION[$cacheKey] = json_encode($data);
        
        echo $_SESSION[$cacheKey];
        exit;
    }
    
    /**
     * Récupère toutes les données du tableau de bord en une seule requête
     * Cette méthode améliore les performances en évitant les multiples requêtes Ajax
     * 
     * @return void
     */
    public function getAllData(): void
    {
        header('Content-Type: application/json');
        
        $latestDate = $this->dashboardService->getLatestDate();
        $date = $_GET['date'] ?? $latestDate;
        
        // Cache key basé sur la date pour réduire les requêtes redondantes
        $cacheKey = "dashboard_all_{$date}";
        
        // Vérifier si les données sont en cache
        if (isset($_SESSION[$cacheKey]) && !empty($_SESSION[$cacheKey])) {
            echo $_SESSION[$cacheKey];
            exit;
        }
        
        // Récupérer toutes les données en une seule fois
        $data = [
            'date' => $latestDate,
            'stats' => $this->dashboardService->getDailyStats($date),
            'locations' => $this->dashboardService->getTopLocations($date),
            'groups' => $this->dashboardService->getGroupStats($date),
            'peakHours' => $this->dashboardService->getPeakHours($date),
            'attendance' => $this->dashboardService->getAttendanceStats($date),
            'workingHours' => $this->dashboardService->getWorkingHoursData($date),
            'arrivalDistribution' => $this->dashboardService->getArrivalDistribution($date),
            'departureDistribution' => $this->dashboardService->getDepartureDistribution($date)
        ];
        
        // Mettre en cache la réponse pour les requêtes futures
        $_SESSION[$cacheKey] = json_encode($data);
        
        echo $_SESSION[$cacheKey];
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