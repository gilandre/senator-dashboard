<?php

namespace App\Core;

class Router
{
    private array $routes = [];
    private string $currentRoute = "";
    private array $params = [];

    public function get(string $path, array|string $controller): void
    {
        $this->routes["GET"][$path] = $controller;
        $this->routes["HEAD"][$path] = $controller;
        error_log("Registered GET/HEAD route: {$path} => " . (is_array($controller) ? implode('@', $controller) : $controller));
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
        error_log("Available routes: " . print_r($this->routes, true));

        if ($method === 'POST' && isset($_POST['_method'])) {
            $method = strtoupper($_POST['_method']);
        }

        if ($method === 'HEAD' && isset($this->routes['GET'][$path])) {
            $method = 'GET';
        }

        if (!isset($this->routes[$method][$path])) {
            error_log("No route found for {$method} {$path}");
            http_response_code(404);
            echo "404 Not Found";
            return;
        }

        $controller = $this->routes[$method][$path];
        error_log("Found controller: " . (is_array($controller) ? implode('@', $controller) : $controller));

        if (is_array($controller)) {
            [$class, $method] = $controller;
        } else {
            if (strpos($controller, "@") === false) {
                throw new \RuntimeException("Invalid controller format. Expected Controller@method");
            }
            [$class, $method] = explode("@", $controller);
            $class = "App\\Controllers\\{$class}";
        }

        if (!class_exists($class)) {
            error_log("Controller class not found: {$class}");
            throw new \RuntimeException("Controller class {$class} not found");
        }

        $instance = new $class();

        if (!method_exists($instance, $method)) {
            error_log("Method not found: {$method} in controller {$class}");
            throw new \RuntimeException("Method {$method} not found in controller {$class}");
        }

        // Autoriser l'accès aux routes publiques sans authentification
        if (
            $path === '/login' || 
            $path === '/logout' || 
            $path === '/forgot-password' || 
            $path === '/reset-password' || 
            $path === '/import/get-history'
        ) {
            $accessAllowed = true;
        } 
        // Sinon vérifier si l'utilisateur est connecté
        else {
            $auth = new \App\Core\Auth();
            $accessAllowed = $auth->isLoggedIn();
        }

        if (!$accessAllowed) {
            error_log("Access denied for {$method} {$path}: User not logged in");
            // Rediriger vers la page de connexion
            header('Location: /login');
            exit;
        }

        error_log("Calling {$class}::{$method}");
        $instance->$method();
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
        $this->get("/login", ["AuthController", "showLogin"]);
        $this->post("/login", ["AuthController", "login"]);
        $this->get("/logout", ["AuthController", "logout"]);
        $this->get("/forgot-password", ["AuthController", "showForgotPassword"]);
        $this->post("/forgot-password", ["AuthController", "sendResetLink"]);
        $this->get("/reset-password", ["AuthController", "showResetPassword"]);
        $this->post("/reset-password", ["AuthController", "resetPassword"]);
        $this->get("/", ["DashboardController", "index"]);
        $this->get("/dashboard", ["DashboardController", "index"]);
        $this->get("/dashboard/data", ["DashboardController", "getData"]);
        $this->get("/import", ["ImportController", "index"]);
        $this->post("/import/upload", ["ImportController", "upload"]);
        $this->get("/import/validate", ["ImportController", "validateView"]);
        $this->post("/import/process", ["ImportController", "process"]);
        $this->get("/import/confirmation", ["ImportController", "confirmation"]);
        $this->post("/import/finish", ["ImportController", "finish"]);
        $this->get("/import/history", ["ImportController", "history"]);
        $this->get("/import/get-history", ["ImportController", "getHistory"]);
        $this->get("/reports", ["ReportController", "index"]);
        $this->get("/reports/create", ["ReportController", "create"]);
        $this->post("/reports", ["ReportController", "store"]);
        $this->get("/reports/{id}", ["ReportController", "show"]);
        $this->get("/reports/{id}/edit", ["ReportController", "edit"]);
        $this->put("/reports/{id}", ["ReportController", "update"]);
        $this->delete("/reports/{id}", ["ReportController", "delete"]);
        $this->get("/users", ["UserController", "index"]);
        $this->get("/users/create", ["UserController", "create"]);
        $this->post("/users", ["UserController", "store"]);
        $this->get("/users/{id}", ["UserController", "show"]);
        $this->get("/users/{id}/edit", ["UserController", "edit"]);
        $this->put("/users/{id}", ["UserController", "update"]);
        $this->delete("/users/{id}", ["UserController", "delete"]);
        $this->get("/settings", ["SettingsController", "index"]);
        $this->post("/settings/update", ["SettingsController", "update"]);
        $this->get("/profile", ["ProfileController", "index"]);
        $this->post("/profile/update", ["ProfileController", "update"]);
        $this->post("/profile/changePassword", ["ProfileController", "changePassword"]);
    }

    public function getParams()
    {
        return $this->params;
    }
} 