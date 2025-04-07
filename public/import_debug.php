<?php
// Activation du mode debug
ini_set('display_errors', 1);
error_reporting(E_ALL);

// En-tête pour JSON
header('Content-Type: application/json');

try {
    // Définir les en-têtes HTTP pour simuler une requête AJAX
    $_SERVER['HTTP_X_REQUESTED_WITH'] = 'XMLHttpRequest';
    
    // Démarrer la session
    session_start();
    
    // Créer des données d'importation fictives en session
    $_SESSION['import_data'] = [
        'data' => [
            [
                'Numéro de badge' => 'TEST001',
                'Date évènements' => '01/01/2025',
                'Heure évènements' => '08:00:00',
                'Centrale' => 'Test Central',
                'Lecteur' => 'Test Reader',
                'Nature Evenement' => 'Test Event',
                'Nom' => 'Test',
                'Prénom' => 'User',
                'Statut' => 'Test',
                'Groupe' => 'Test Group',
                'row_id' => 1
            ]
        ],
        'temp_file' => __DIR__ . '/../tmp/test_import.csv',
        'separator' => ';',
        'has_header' => true
    ];
    
    // Créer un petit fichier CSV de test
    $tempDir = __DIR__ . '/../tmp';
    if (!is_dir($tempDir)) {
        mkdir($tempDir, 0777, true);
    }
    $testFile = $tempDir . '/test_import.csv';
    file_put_contents($testFile, "Numéro de badge;Date évènements;Heure évènements;Centrale;Lecteur;Nature Evenement;Nom;Prénom;Statut;Groupe\nTEST001;01/01/2025;08:00:00;Test Central;Test Reader;Test Event;Test;User;Test;Test Group");
    
    // Définir un POST pour simuler la confirmation d'importation
    $_POST['confirm_import'] = '1';
    
    // Initialiser le statut pour la vérification ultérieure
    $_SESSION['import_status'] = 'pending';
    $_SESSION['import_progress'] = 0;
    
    // Charger les classes nécessaires manuellement
    require_once __DIR__ . '/../src/Core/Database.php';
    
    // Établir une connexion à la base pour tester
    $dsn = "sqlite:" . __DIR__ . "/../database.sqlite";
    $options = [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ];
    $pdo = new PDO($dsn, null, null, $options);
    
    // Renvoyer les informations de diagnostic
    echo json_encode([
        'success' => true,
        'session' => [
            'import_data_set' => isset($_SESSION['import_data']),
            'import_status' => $_SESSION['import_status'],
            'import_progress' => $_SESSION['import_progress'],
        ],
        'filesystem' => [
            'temp_file_created' => file_exists($testFile),
            'temp_file_path' => $testFile,
            'temp_dir_writable' => is_writable($tempDir)
        ],
        'database' => [
            'connected' => true,
            'count_access_logs' => $pdo->query("SELECT COUNT(*) FROM access_logs")->fetchColumn()
        ],
        'request' => [
            'is_ajax' => isset($_SERVER['HTTP_X_REQUESTED_WITH']) && $_SERVER['HTTP_X_REQUESTED_WITH'] === 'XMLHttpRequest',
            'post_data' => $_POST
        ],
        'message' => 'L\'environnement semble correctement configuré pour l\'importation'
    ]);
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'trace' => $e->getTraceAsString()
    ]);
} 