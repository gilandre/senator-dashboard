<?php

class Router
{
    public function handleRequest()
    {
        try {
            $method = $_SERVER['REQUEST_METHOD'];
            $path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
            
            // Normaliser le chemin
            $path = rtrim($path, '/');
            if (empty($path)) {
                $path = '/';
            }
            
            // Vérifier si c'est une route avec paramètres
            $route = $this->findRoute($method, $path);
            
            if ($route) {
                $controllerClass = $route[0];
                $action = $route[1];
                
                // Initialiser les variables globales pour le layout
                $GLOBALS['currentPage'] = $path;
                $GLOBALS['pageTitle'] = ucfirst(str_replace('/', ' ', trim($path, '/')));
                $GLOBALS['hideGlobalTopbar'] = false;
                
                // Créer une instance du contrôleur
                $controller = new $controllerClass();
                
                // Appeler la méthode du contrôleur
                $controller->$action();
            } else {
                // Route non trouvée
                header("HTTP/1.0 404 Not Found");
                include __DIR__ . '/views/errors/404.php';
            }
        } catch (Exception $e) {
            error_log("Erreur dans le routeur: " . $e->getMessage());
            header("HTTP/1.0 500 Internal Server Error");
            include __DIR__ . '/views/errors/500.php';
        }
    }
} 