<?php
require_once __DIR__ . '/vendor/autoload.php';

// Chargement des variables d'environnement
$dotenv = Dotenv\Dotenv::createImmutable(__DIR__);
$dotenv->load();

// Créer une instance du service de dashboard
$dashboardService = new App\Services\DashboardService();

// Récupérer la date la plus récente
$latestDate = $dashboardService->getLatestDate();
echo "Date la plus récente : " . $latestDate . "\n";

// Récupérer les statistiques quotidiennes
$dailyStats = $dashboardService->getDailyStats($latestDate);
echo "Statistiques quotidiennes : \n";
print_r($dailyStats);

// Récupérer les statistiques de présence
$topLocations = $dashboardService->getTopLocations($latestDate);
echo "Top des emplacements : \n";
print_r($topLocations);

// Récupérer les statistiques par groupe
$groupStats = $dashboardService->getGroupStats($latestDate);
echo "Statistiques par groupe : \n";
print_r($groupStats);

// Vérifier que les données viennent bien de MySQL
try {
    $db = App\Core\Database::getInstance()->getConnection();
    echo "Type de connexion à la base de données : " . get_class($db) . "\n";
    echo "Pilote de base de données : " . $db->getAttribute(PDO::ATTR_DRIVER_NAME) . "\n";
} catch (Exception $e) {
    echo "Erreur de connexion à la base de données : " . $e->getMessage() . "\n";
} 