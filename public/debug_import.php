<?php
// Activation du mode debug
ini_set('display_errors', 1);
error_reporting(E_ALL);

// En-tête pour JSON
header('Content-Type: application/json');

try {
    // Connexion à la base de données
    $dsn = "sqlite:" . __DIR__ . "/../database.sqlite";
    $options = [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ];
    $pdo = new PDO($dsn, null, null, $options);
    
    // Vérifier si le serveur est en cours d'exécution avec PHP intégré
    $server_software = $_SERVER['SERVER_SOFTWARE'] ?? '';
    $php_version = PHP_VERSION;
    $session_path = session_save_path();
    $upload_tmp_dir = ini_get('upload_tmp_dir');
    
    // Vérifier les sessions
    session_start();
    $_SESSION['test'] = 'Test session';
    $session_working = isset($_SESSION['test']);
    
    echo json_encode([
        'success' => true,
        'php_info' => [
            'version' => $php_version,
            'server_software' => $server_software,
            'session_path' => $session_path,
            'upload_tmp_dir' => $upload_tmp_dir,
            'session_working' => $session_working
        ],
        'database' => [
            'connected' => true,
            'count_access_logs' => $pdo->query("SELECT COUNT(*) FROM access_logs")->fetchColumn()
        ],
        'request' => [
            'is_ajax' => isset($_SERVER['HTTP_X_REQUESTED_WITH']) && $_SERVER['HTTP_X_REQUESTED_WITH'] === 'XMLHttpRequest'
        ],
        'message' => 'Diagnostic successful'
    ]);
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'trace' => $e->getTraceAsString()
    ]);
} 