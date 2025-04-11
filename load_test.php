<?php
/**
 * Script de test de charge pour l'application SENATOR
 * Ce script simule plusieurs requêtes simultanées pour évaluer les performances
 */

// Configuration
$baseUrl = 'http://localhost:8080';
$endpoints = [
    '/dashboard/data?type=daily',
    '/dashboard/data?type=arrivalDistribution',
    '/dashboard/data?type=departureDistribution',
    '/dashboard/data?type=workingHours',
    '/dashboard/all-data'  // Notre nouvel endpoint optimisé
];
$numRequests = 10;  // Nombre de requêtes par endpoint
$concurrency = 3;   // Nombre de requêtes simultanées

// Fonction pour le logging
function log_message($message) {
    echo date('Y-m-d H:i:s') . " - $message\n";
}

// Fonction pour effectuer une requête HTTP
function make_request($url) {
    $start = microtime(true);
    
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['X-Requested-With: XMLHttpRequest']);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $time = microtime(true) - $start;
    $size = strlen($response);
    curl_close($ch);
    
    return [
        'url' => $url,
        'http_code' => $httpCode,
        'time' => $time,
        'size' => $size
    ];
}

// Résultats par endpoint
$results = [];

// Tester chaque endpoint
foreach ($endpoints as $endpoint) {
    $url = $baseUrl . $endpoint;
    log_message("Test de l'endpoint: $url");
    
    $endpointResults = [];
    $totalTime = 0;
    $successCount = 0;
    
    // Effectuer les requêtes
    for ($i = 0; $i < $numRequests; $i++) {
        $result = make_request($url);
        $endpointResults[] = $result;
        
        $totalTime += $result['time'];
        if ($result['http_code'] == 200) {
            $successCount++;
        }
        
        log_message(sprintf(
            "  Requête %d/%d: %s - %.4f secondes, %d bytes",
            $i + 1,
            $numRequests,
            $result['http_code'] == 200 ? "OK" : "ERREUR ({$result['http_code']})",
            $result['time'],
            $result['size']
        ));
        
        // Pause aléatoire pour simuler des utilisateurs réels
        usleep(rand(100000, 300000));  // 100-300ms
    }
    
    // Calculer les statistiques
    $avgTime = $totalTime / $numRequests;
    $successRate = ($successCount / $numRequests) * 100;
    
    // Stocker les résultats
    $results[$endpoint] = [
        'avg_time' => $avgTime,
        'success_rate' => $successRate,
        'results' => $endpointResults
    ];
    
    log_message(sprintf(
        "Statistiques pour %s: Temps moyen %.4f secondes, Taux de succès %.1f%%",
        $endpoint,
        $avgTime,
        $successRate
    ));
    
    log_message("");
}

// Comparer l'endpoint optimisé avec les endpoints individuels
if (isset($results['/dashboard/all-data']) && $results['/dashboard/all-data']['success_rate'] > 0) {
    log_message("\n=== COMPARAISON DES PERFORMANCES ===");
    
    $optimizedTime = $results['/dashboard/all-data']['avg_time'];
    $individualTime = 0;
    
    // Calculer le temps total pour les requêtes individuelles
    foreach ($results as $endpoint => $data) {
        if ($endpoint != '/dashboard/all-data') {
            $individualTime += $data['avg_time'];
        }
    }
    
    $improvement = (1 - ($optimizedTime / $individualTime)) * 100;
    
    log_message(sprintf(
        "Temps total des endpoints individuels: %.4f secondes",
        $individualTime
    ));
    
    log_message(sprintf(
        "Temps de l'endpoint optimisé: %.4f secondes",
        $optimizedTime
    ));
    
    log_message(sprintf(
        "Amélioration des performances: %.1f%%",
        $improvement
    ));
}

log_message("Test de charge terminé."); 