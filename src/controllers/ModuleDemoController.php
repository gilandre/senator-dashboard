<?php

namespace App\Controllers;

use App\Core\Controller;
use App\Models\AccessLog;

/**
 * Contrôleur de démonstration pour l'approche modulaire
 */
class ModuleDemoController extends Controller
{
    /**
     * Constructeur
     */
    public function __construct()
    {
        parent::__construct();
        $this->layout = 'app'; // Utiliser le layout app
        $this->setCurrentPage('module_demo');
        $this->setPageTitle('Démo d\'Interface Modulaire');
    }
    
    /**
     * Page d'accueil de la démo modulaire
     */
    public function index()
    {
        // Récupérer quelques statistiques pour la démo
        $totalUsers = 42; // Exemple de données statiques
        $totalBadges = 150;
        $averageTime = '08:34';
        $totalAlerts = 5;
        
        // Préparer les données pour la vue
        $data = [
            'stats' => [
                'total_users' => $totalUsers,
                'total_badges' => $totalBadges,
                'average_time' => $averageTime,
                'total_alerts' => $totalAlerts
            ],
            'activities' => $this->getRecentActivities()
        ];
        
        // Afficher la vue
        $this->view('dashboard/modulaire', $data);
    }
    
    /**
     * Récupère les activités récentes pour la démonstration
     * 
     * @return array Liste des activités
     */
    private function getRecentActivities(): array
    {
        // Essayer de récupérer de vraies données si possible
        try {
            $accessLogs = AccessLog::getRecent(5);
            
            if (!empty($accessLogs)) {
                $activities = [];
                foreach ($accessLogs as $log) {
                    $activities[] = [
                        'date' => $log['event_date'] . ' ' . $log['event_time'],
                        'badge' => $log['badge_number'],
                        'type' => $log['event_type'],
                        'central' => $log['central'] ?? 'N/A'
                    ];
                }
                return $activities;
            }
        } catch (\Exception $e) {
            // En cas d'erreur, utiliser des données fictives
        }
        
        // Données fictives pour la démonstration
        return [
            ['date' => '2025-04-12 09:30', 'badge' => '12345', 'type' => 'Entrée', 'central' => 'C1 ENTREE'],
            ['date' => '2025-04-12 09:15', 'badge' => '54321', 'type' => 'Sortie', 'central' => 'C1 SORTIE'],
            ['date' => '2025-04-12 08:45', 'badge' => '98765', 'type' => 'Entrée', 'central' => 'C2 ENTREE'],
            ['date' => '2025-04-12 08:30', 'badge' => '65432', 'type' => 'Entrée', 'central' => 'C1 ENTREE'],
            ['date' => '2025-04-12 08:00', 'badge' => '13579', 'type' => 'Entrée', 'central' => 'C2 ENTREE']
        ];
    }
} 