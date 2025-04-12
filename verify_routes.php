<?php
/**
 * Script de vérification des routes
 * Ce script teste le fonctionnement du routeur avec des paramètres dynamiques
 */

// Inclusion des fichiers nécessaires
require_once __DIR__ . '/bootstrap.php';

// Créer un fichier de log
$logFile = __DIR__ . '/routes_verification.log';
file_put_contents($logFile, "=== VÉRIFICATION DES ROUTES ===\n");
file_put_contents($logFile, "Date: " . date('Y-m-d H:i:s') . "\n\n", FILE_APPEND);

// Créer une instance du routeur
$router = new App\Core\Router();

// Afficher les routes enregistrées
file_put_contents($logFile, "Routes enregistrées:\n", FILE_APPEND);

// Récupérer les routes (accéder aux propriétés privées via Reflection)
$routesProperty = new ReflectionProperty('App\Core\Router', 'routes');
$routesProperty->setAccessible(true);
$routes = $routesProperty->getValue($router);

// Afficher les routes par méthode
foreach ($routes as $method => $methodRoutes) {
    file_put_contents($logFile, "\n--- {$method} ---\n", FILE_APPEND);
    foreach ($methodRoutes as $path => $handler) {
        if (is_array($handler)) {
            $handlerStr = implode('@', $handler);
        } else {
            $handlerStr = $handler;
        }
        file_put_contents($logFile, "{$path} => {$handlerStr}\n", FILE_APPEND);
    }
}

// Tester la correspondance des routes avec des paramètres dynamiques
file_put_contents($logFile, "\n=== TEST DE CORRESPONDANCE DE ROUTES ===\n", FILE_APPEND);

// Liste des routes à tester
$testRoutes = [
    '/import/preview/123456789' => [
        'should_match' => '/import/preview/{id}',
        'params' => ['id' => '123456789']
    ],
    '/users/42' => [
        'should_match' => '/users/{id}',
        'params' => ['id' => '42']
    ],
    '/users/42/edit' => [
        'should_match' => '/users/{id}/edit',
        'params' => ['id' => '42']
    ],
    '/reports/789' => [
        'should_match' => '/reports/{id}',
        'params' => ['id' => '789']
    ],
    '/not/a/valid/route' => [
        'should_match' => null,
        'params' => []
    ]
];

// Fonction pour tester une route
function testRoute($route, $expectedMatch, $expectedParams) {
    global $logFile, $routes;
    
    file_put_contents($logFile, "\nTest de la route: {$route}\n", FILE_APPEND);
    file_put_contents($logFile, "  Devrait correspondre à: " . ($expectedMatch ?: "aucune correspondance") . "\n", FILE_APPEND);
    
    $matched = false;
    $params = [];
    
    // Boucler sur toutes les routes GET pour trouver une correspondance
    foreach ($routes['GET'] as $routePattern => $routeHandler) {
        // Vérifier si le chemin contient des paramètres (marqués par {param})
        if (strpos($routePattern, '{') !== false) {
            // Convertir le modèle de route en expression régulière
            $pattern = preg_replace('/\{([a-zA-Z0-9_]+)\}/', '([^/]+)', $routePattern);
            $pattern = str_replace('/', '\/', $pattern);
            $pattern = '/^' . $pattern . '$/';
            
            // Tester la correspondance
            if (preg_match($pattern, $route, $matches)) {
                file_put_contents($logFile, "  Correspond à: {$routePattern}\n", FILE_APPEND);
                
                // Extraire les paramètres de l'URL
                $extractedParams = [];
                preg_match_all('/\{([a-zA-Z0-9_]+)\}/', $routePattern, $paramNames);
                
                // Décaler les correspondances pour supprimer la correspondance complète
                array_shift($matches);
                
                // Combiner les noms de paramètres avec leurs valeurs
                foreach ($paramNames[1] as $index => $name) {
                    $extractedParams[$name] = $matches[$index] ?? null;
                }
                
                file_put_contents($logFile, "  Paramètres extraits: " . json_encode($extractedParams) . "\n", FILE_APPEND);
                
                $matched = $routePattern;
                $params = $extractedParams;
                break;
            }
        } elseif ($route === $routePattern) {
            // Correspondance exacte
            file_put_contents($logFile, "  Correspond exactement à: {$routePattern}\n", FILE_APPEND);
            $matched = $routePattern;
            break;
        }
    }
    
    // Vérifier si la correspondance est celle attendue
    $success = ($matched === $expectedMatch);
    $paramsMatch = ($params == $expectedParams);
    
    file_put_contents($logFile, "  Résultat: " . ($success ? "SUCCÈS" : "ÉCHEC") . "\n", FILE_APPEND);
    if (!$success) {
        file_put_contents($logFile, "  Trouvé: " . ($matched ?: "aucune correspondance") . ", Attendu: " . ($expectedMatch ?: "aucune correspondance") . "\n", FILE_APPEND);
    }
    
    file_put_contents($logFile, "  Paramètres: " . ($paramsMatch ? "CORRECTS" : "INCORRECTS") . "\n", FILE_APPEND);
    if (!$paramsMatch) {
        file_put_contents($logFile, "  Paramètres trouvés: " . json_encode($params) . ", Attendus: " . json_encode($expectedParams) . "\n", FILE_APPEND);
    }
    
    return $success && $paramsMatch;
}

// Exécuter les tests
$successCount = 0;
$totalTests = count($testRoutes);

foreach ($testRoutes as $route => $testCase) {
    if (testRoute($route, $testCase['should_match'], $testCase['params'])) {
        $successCount++;
    }
}

// Afficher le résumé
file_put_contents($logFile, "\n=== RÉSUMÉ ===\n", FILE_APPEND);
file_put_contents($logFile, "Tests réussis: {$successCount}/{$totalTests}\n", FILE_APPEND);
file_put_contents($logFile, "Pourcentage de réussite: " . round(($successCount / $totalTests) * 100) . "%\n", FILE_APPEND);

echo "Vérification des routes terminée. Consultez le journal pour les détails: {$logFile}\n";
echo "Résumé: {$successCount}/{$totalTests} tests réussis\n"; 