<?php

namespace App\Core;

class Router
{
    private array $routes = [];
    private string $currentRoute = "";
    private array $params = [];

    public function __construct()
    {
        // Enregistrer les routes au démarrage
        $this->registerRoutes();
        
        // Log all registered routes
        error_log("All registered routes: " . json_encode($this->routes));
    }

    public function get(string $path, array|string $controller): void
    {
        error_log("Registering GET route: {$path} => " . (is_array($controller) ? implode('@', $controller) : $controller));
        $this->routes["GET"][$path] = $controller;
        $this->routes["HEAD"][$path] = $controller;
    }

    public function post(string $path, array|string $controller): void
    {
        $this->routes["POST"][$path] = $controller;
        error_log("Registered POST route: {$path} => " . (is_array($controller) ? implode('@', $controller) : $controller));
    }

    public function put(string $path, array|string $controller): void
    {
        $this->routes["PUT"][$path] = $controller;
        error_log("Registered PUT route: {$path} => " . (is_array($controller) ? implode('@', $controller) : $controller));
    }

    public function delete(string $path, array|string $controller): void
    {
        $this->routes["DELETE"][$path] = $controller;
        error_log("Registered DELETE route: {$path} => " . (is_array($controller) ? implode('@', $controller) : $controller));
    }

    public function dispatch(): void
    {
        $method = $_SERVER["REQUEST_METHOD"];
        $path = parse_url($_SERVER["REQUEST_URI"], PHP_URL_PATH);
        
        error_log("Dispatching request: {$method} {$path}");
        error_log("Available routes for {$method}: " . json_encode(array_keys($this->routes[$method] ?? [])));
        error_log("All routes: " . json_encode($this->routes));
        
        // Appliquer les règles spéciales pour certaines routes
        $this->handleSpecialRoutes($path, $method);
        
        $controllerFound = false;
        
        // D'abord, essayer les routes exactes
        if (isset($this->routes[$method][$path])) {
            $controller = $this->routes[$method][$path];
            error_log("Found exact route controller: " . (is_array($controller) ? implode('@', $controller) : $controller));
            $controllerFound = true;
        } else {
            // Si aucune correspondance exacte, essayer les routes avec paramètres
            foreach ($this->routes[$method] as $routePattern => $routeController) {
                // Vérifier si le chemin contient des paramètres (marqués par {param})
                if (strpos($routePattern, '{') !== false) {
                    // Convertir le modèle de route en expression régulière
                    $pattern = preg_replace('/\{([a-zA-Z0-9_]+)\}/', '([^/]+)', $routePattern);
                    $pattern = str_replace('/', '\/', $pattern);
                    $pattern = '/^' . $pattern . '$/';
                    
                    // Tester la correspondance
                    if (preg_match($pattern, $path, $matches)) {
                        error_log("Found parameter route match for: {$routePattern}");
                        
                        // Extraire les paramètres de l'URL
                        $params = [];
                        preg_match_all('/\{([a-zA-Z0-9_]+)\}/', $routePattern, $paramNames);
                        
                        // Décaler les correspondances pour supprimer la correspondance complète
                        array_shift($matches);
                        
                        // Combiner les noms de paramètres avec leurs valeurs
                        foreach ($paramNames[1] as $index => $name) {
                            $params[$name] = $matches[$index] ?? null;
                        }
                        
                        error_log("Route parameters: " . json_encode($params));
                        
                        // Stocker les paramètres pour utilisation dans le contrôleur
                        $this->params = $params;
                        
                        // Sélectionner ce contrôleur
                        $controller = $routeController;
                        $controllerFound = true;
                        break;
                    }
                }
            }
        }
        
        if ($controllerFound) {
            if (is_array($controller)) {
                // Handle array format ["Controller", "method"]
                $controllerName = $controller[0];
                $method = $controller[1];
                
                // Check if the controller name already has a namespace
                $class = strpos($controllerName, '\\') !== false 
                    ? $controllerName 
                    : "App\\Controllers\\" . $controllerName;
            } else if (is_string($controller) && strpos($controller, '@') !== false) {
                // Handle string format "Controller@method"
                list($controllerName, $method) = explode('@', $controller);
                
                // Check if the controller name already has a namespace
                $class = strpos($controllerName, '\\') !== false 
                    ? $controllerName 
                    : "App\\Controllers\\" . $controllerName;
            } else {
                throw new \RuntimeException("Invalid controller format. Expected Controller@method or [Controller, method]");
            }

            error_log("Resolved class: {$class}, method: {$method}");
            
            if (!class_exists($class)) {
                throw new \RuntimeException("Controller class {$class} not found");
            }
            
            $instance = new $class();
            
            if (!method_exists($instance, $method)) {
                throw new \RuntimeException("Method {$method} not found in controller {$class}");
            }
            
            error_log("Calling {$class}::{$method}");
            // Si nous avons des paramètres, les passer à la méthode du contrôleur
            if (!empty($this->params)) {
                $instance->$method(...array_values($this->params));
            } else {
                $instance->$method();
            }
        } else {
            error_log("No route found for {$method} {$path}");
            
            http_response_code(404);
            echo "404 Not Found";
            return;
        }
    }

    private function getCurrentUrl(): string
    {
        $url = $_SERVER["REQUEST_URI"];
        $url = strtok($url, "?");
        return trim($url, "/");
    }

    private function matchRoute(string $route, string $url): bool
    {
        $route = trim($route, "/");
        $routeParts = explode("/", $route);
        $urlParts = explode("/", $url);

        if (count($routeParts) !== count($urlParts)) {
            return false;
        }

        $this->params = [];
        foreach ($routeParts as $key => $part) {
            if (preg_match("/^{([a-zA-Z0-9_]+)}$/", $part, $matches)) {
                $this->params[$matches[1]] = $urlParts[$key];
            } elseif ($part !== $urlParts[$key]) {
                return false;
            }
        }

        return true;
    }

    private function notFound(): void
    {
        header("HTTP/1.0 404 Not Found");
        echo "404 Not Found";
        exit;
    }

    public function init(): void
    {
        // Auth routes
        $this->get("/login", ["AuthController", "showLogin"]);
        $this->post("/login", ["AuthController", "login"]);
        $this->get("/logout", ["AuthController", "logout"]);
        $this->get("/forgot-password", ["AuthController", "showForgotPassword"]);
        $this->post("/forgot-password", ["AuthController", "sendResetLink"]);
        $this->get("/reset-password", ["AuthController", "showResetPassword"]);
        $this->post("/reset-password", ["AuthController", "resetPassword"]);

        // Dashboard routes
        $this->get("/", ["DashboardController", "index"]);
        $this->get("/dashboard", ["DashboardController", "index"]);
        $this->get("/dashboard/data", ["DashboardController", "getData"]);
        $this->get("/dashboard/all-data", ["DashboardController", "getAllData"]);

        // Import routes
        $this->get("/import", ["ImportController", "index"]);
        $this->post("/import/upload", ["ImportController", "upload"]);
        $this->get("/import/preview/{id}", ["ImportController", "previewFile"]);
        $this->get("/import/validate", ["ImportController", "validateView"]);
        $this->post("/import/process", ["ImportController", "process"]);
        $this->get("/import/confirmation", ["ImportController", "confirmation"]);
        $this->get("/import/finish", ["ImportController", "finish"]);
        $this->get("/import/get-history", ["ImportController", "getHistory"]);
        $this->get("/import/history", ["ImportController", "history"]);
        $this->get("/import/check-async", ["ImportController", "checkAsyncImport"]);
        $this->get("/import/export-duplicates", ["ImportController", "exportDuplicates"]);
        $this->get("/import/download-duplicates", ["ImportController", "exportDuplicates"]);
        $this->get("/import/download-report", ["ImportController", "downloadReport"]);
        $this->get("/import/generate-report", ["ImportController", "generateReport"]);
        $this->post("/import/preview", ["ImportController", "preview"]);

        // Users management
        $this->get("/users", ["UserController", "index"]);
        $this->get("/users/create", ["UserController", "create"]);
        $this->post("/users", ["UserController", "store"]);
        $this->get("/users/{id}", ["UserController", "show"]);
        $this->get("/users/{id}/edit", ["UserController", "edit"]);
        $this->put("/users/{id}", ["UserController", "update"]);
        $this->delete("/users/{id}", ["UserController", "delete"]);

        // Reports
        $this->get("/reports", ["ReportController", "index"]);
        $this->get("/reports/create", ["ReportController", "create"]);
        $this->post("/reports", ["ReportController", "store"]);
        $this->get("/reports/{id}", ["ReportController", "show"]);
        $this->get("/reports/{id}/edit", ["ReportController", "edit"]);
        $this->put("/reports/{id}", ["ReportController", "update"]);
        $this->delete("/reports/{id}", ["ReportController", "delete"]);

        // Profile routes
        $this->get("/profile", ["ProfileController", "index"]);
        $this->post("/profile/update", ["ProfileController", "update"]);
        $this->post("/profile/changePassword", ["ProfileController", "changePassword"]);
        
        // Demo modulaire
        $this->get("/module-demo", ["ModuleDemoController", "index"]);
        
        // Test routes - for debugging only
        $this->get("/test", ["TestController", "index"]);
        $this->get("/test/export", ["TestController", "exportCSV"]);
    }

    public function getParams()
    {
        return $this->params;
    }

    /**
     * Special handling for route rewrites before dispatch
     */
    private function handleSpecialRoutes(string &$path, string &$method): void
    {
        // Special handling for download-duplicates and export-duplicates routes
        if ($path === '/import/download-duplicates' || $path === '/import/export-duplicates') {
            error_log("Special handling for duplicates export: {$path}");
            
            // Make sure we have the id parameter
            if (strpos($_SERVER['REQUEST_URI'], '?id=') === false && isset($_GET['id'])) {
                error_log("Adding id parameter to path: id=" . $_GET['id']);
                $path .= (strpos($path, '?') === false ? '?' : '&') . 'id=' . $_GET['id'];
            }
            
            // Verify user is logged in
            $auth = new \App\Core\Auth();
            if ($auth->isLoggedIn()) {
                error_log("User is logged in, handling duplicates export");
                try {
                    $controller = new \App\Controllers\ImportController();
                    if (method_exists($controller, 'exportDuplicates')) {
                        error_log("Calling exportDuplicates method");
                        $controller->exportDuplicates();
                        exit;
                    } else {
                        error_log("ERROR: exportDuplicates method not found in ImportController");
                        http_response_code(500);
                        echo "500 Internal Server Error: Method not found";
                        exit;
                    }
                } catch (\Exception $e) {
                    error_log("Error handling duplicates export: " . $e->getMessage());
                    error_log("Stack trace: " . $e->getTraceAsString());
                    http_response_code(500);
                    echo "500 Internal Server Error: " . $e->getMessage();
                    exit;
                }
            } else {
                error_log("User not logged in, redirecting to login");
                header('Location: /login');
                exit;
            }
        }
        
        // Special handling for file uploading with specific URL patterns
        if (strpos($path, '/upload/') === 0) {
            $path = '/upload';
        }
        
        // Special handling for API endpoints
        if (strpos($path, '/api/') === 0) {
            error_log("API request detected: {$method} {$path}");
        }
    }

    /**
     * Register the routes for the application
     */
    public function registerRoutes(): void
    {
        // Auth routes
        $this->get("/login", ["AuthController", "showLogin"]);
        $this->post("/login", ["AuthController", "login"]);
        $this->get("/logout", ["AuthController", "logout"]);
        $this->get("/forgot-password", ["AuthController", "showForgotPassword"]);
        $this->post("/forgot-password", ["AuthController", "sendResetLink"]);
        $this->get("/reset-password", ["AuthController", "showResetPassword"]);
        $this->post("/reset-password", ["AuthController", "resetPassword"]);

        // Dashboard routes
        $this->get("/", ["DashboardController", "index"]);
        $this->get("/dashboard", ["DashboardController", "index"]);
        $this->get("/dashboard/data", ["DashboardController", "getData"]);
        $this->get("/dashboard/all-data", ["DashboardController", "getAllData"]);

        // Import routes
        $this->get("/import", ["ImportController", "index"]);
        $this->post("/import/upload", ["ImportController", "upload"]);
        $this->get("/import/preview/{id}", ["ImportController", "previewFile"]);
        $this->get("/import/validate", ["ImportController", "validateView"]);
        $this->post("/import/process", ["ImportController", "process"]);
        $this->get("/import/confirmation", ["ImportController", "confirmation"]);
        $this->get("/import/finish", ["ImportController", "finish"]);
        $this->get("/import/get-history", ["ImportController", "getHistory"]);
        $this->get("/import/history", ["ImportController", "history"]);
        $this->get("/import/check-async", ["ImportController", "checkAsyncImport"]);
        $this->get("/import/export-duplicates", ["ImportController", "exportDuplicates"]);
        $this->get("/import/download-duplicates", ["ImportController", "exportDuplicates"]);
        $this->get("/import/download-report", ["ImportController", "downloadReport"]);
        $this->get("/import/generate-report", ["ImportController", "generateReport"]);
        $this->post("/import/preview", ["ImportController", "preview"]);

        // Users management
        $this->get("/users", ["UserController", "index"]);
        $this->get("/users/create", ["UserController", "create"]);
        $this->post("/users", ["UserController", "store"]);
        $this->get("/users/{id}", ["UserController", "show"]);
        $this->get("/users/{id}/edit", ["UserController", "edit"]);
        $this->put("/users/{id}", ["UserController", "update"]);
        $this->delete("/users/{id}", ["UserController", "delete"]);

        // Reports
        $this->get("/reports", ["ReportController", "index"]);
        $this->get("/reports/create", ["ReportController", "create"]);
        $this->post("/reports", ["ReportController", "store"]);
        $this->get("/reports/{id}", ["ReportController", "show"]);
        $this->get("/reports/{id}/edit", ["ReportController", "edit"]);
        $this->put("/reports/{id}", ["ReportController", "update"]);
        $this->delete("/reports/{id}", ["ReportController", "delete"]);

        // Profile routes
        $this->get("/profile", ["ProfileController", "index"]);
        $this->post("/profile/update", ["ProfileController", "update"]);
        $this->post("/profile/changePassword", ["ProfileController", "changePassword"]);
        
        // Demo modulaire
        $this->get("/module-demo", ["ModuleDemoController", "index"]);
        
        // Test routes - for debugging only
        $this->get("/test", ["TestController", "index"]);
        $this->get("/test/export", ["TestController", "exportCSV"]);
    }
} 