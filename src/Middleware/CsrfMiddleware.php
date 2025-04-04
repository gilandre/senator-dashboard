<?php

namespace App\Middleware;

class CsrfMiddleware
{
    public function handle($request, $next)
    {
        // Générer un token CSRF si non existant
        if (!isset($_SESSION['csrf_token'])) {
            $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
        }

        // Vérifier le token pour les requêtes POST
        if ($_SERVER['REQUEST_METHOD'] === 'POST') {
            $token = $_POST['csrf_token'] ?? null;
            
            if (!$token || $token !== $_SESSION['csrf_token']) {
                http_response_code(403);
                die('Token CSRF invalide');
            }
        }

        return $next($request);
    }

    public static function generateToken(): string
    {
        if (!isset($_SESSION['csrf_token'])) {
            $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
        }
        return $_SESSION['csrf_token'];
    }
} 