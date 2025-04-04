<?php

namespace App\Middleware;

use App\Services\AuthService;

class AuthMiddleware
{
    private AuthService $authService;

    public function __construct()
    {
        $this->authService = new AuthService();
    }

    public function handle($request, $next)
    {
        // Vérifier si l'utilisateur est connecté via la session
        if (isset($_SESSION['user_id'])) {
            return $next($request);
        }

        // Vérifier si un token "Se souvenir de moi" est présent
        if (isset($_COOKIE['remember_token'])) {
            $result = $this->authService->checkRememberToken($_COOKIE['remember_token']);
            
            if ($result['success']) {
                $_SESSION['user_id'] = $result['user_id'];
                $_SESSION['username'] = $result['username'];
                $_SESSION['role'] = $result['role'];
                
                return $next($request);
            } else {
                // Token invalide, on le supprime
                setcookie('remember_token', '', time() - 3600, '/');
            }
        }

        // Rediriger vers la page de connexion
        header('Location: /login');
        exit;
    }
} 