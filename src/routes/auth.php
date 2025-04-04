<?php

use App\Controllers\AuthController;
use App\Middleware\AuthMiddleware;

// Routes d'authentification
$router->get('/login', [AuthController::class, 'login']);
$router->post('/login', [AuthController::class, 'login']);
$router->get('/logout', [AuthController::class, 'logout']);

// Routes de gestion du mot de passe
$router->get('/forgot-password', [AuthController::class, 'forgotPassword']);
$router->post('/forgot-password', [AuthController::class, 'forgotPassword']);
$router->get('/reset-password', [AuthController::class, 'resetPassword']);
$router->post('/reset-password', [AuthController::class, 'resetPassword']);

// Route de réactivation du compte
$router->get('/reactivate-account', [AuthController::class, 'reactivateAccount']);
$router->post('/reactivate-account', [AuthController::class, 'reactivateAccount']);

// Routes protégées (nécessitant une authentification)
$router->group(['middleware' => [AuthMiddleware::class]], function($router) {
    $router->get('/dashboard', [DashboardController::class, 'index']);
    $router->get('/profile', [ProfileController::class, 'index']);
    $router->post('/profile/update', [ProfileController::class, 'update']);
    $router->post('/profile/change-password', [ProfileController::class, 'changePassword']);
}); 