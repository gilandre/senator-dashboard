<?php

// Disable caching
header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
header("Cache-Control: post-check=0, pre-check=0", false);
header("Pragma: no-cache");

require_once __DIR__ . '/../vendor/autoload.php';

use App\Core\Router;
use App\Core\Database;
use App\Controllers\AuthController;
use App\Controllers\DashboardController;
use App\Controllers\UserController;
use App\Controllers\ReportController;
use App\Controllers\ImportController;

// Start session
session_start();

// Load environment variables
$dotenv = Dotenv\Dotenv::createImmutable(__DIR__ . '/..');
$dotenv->load();

// Initialize database connection
$db = Database::getInstance([
    'host' => $_ENV['DB_HOST'],
    'dbname' => $_ENV['DB_DATABASE'],
    'username' => $_ENV['DB_USERNAME'],
    'password' => $_ENV['DB_PASSWORD'],
    'charset' => $_ENV['DB_CHARSET'] ?? 'utf8mb4'
]);

// Initialize router
$router = new Router();

// Auth routes
$router->get('/login', [AuthController::class, 'showLogin']);
$router->post('/login', [AuthController::class, 'login']);
$router->get('/logout', [AuthController::class, 'logout']);
$router->get('/forgot-password', [AuthController::class, 'showForgotPassword']);
$router->post('/forgot-password', [AuthController::class, 'sendResetLink']);
$router->get('/reset-password', [AuthController::class, 'showResetPassword']);
$router->post('/reset-password', [AuthController::class, 'resetPassword']);

// Dashboard routes
$router->get('/dashboard', [DashboardController::class, 'index']);
$router->get('/dashboard/data', [DashboardController::class, 'getData']);

// User routes
$router->get('/users', [UserController::class, 'index']);
$router->get('/users/create', [UserController::class, 'create']);
$router->post('/users', [UserController::class, 'store']);
$router->get('/users/{id}', [UserController::class, 'show']);
$router->get('/users/{id}/edit', [UserController::class, 'edit']);
$router->put('/users/{id}', [UserController::class, 'update']);
$router->delete('/users/{id}', [UserController::class, 'delete']);

// Report routes
$router->get('/reports', [ReportController::class, 'index']);
$router->get('/reports/create', [ReportController::class, 'create']);
$router->post('/reports', [ReportController::class, 'store']);
$router->get('/reports/{id}', [ReportController::class, 'show']);
$router->get('/reports/{id}/edit', [ReportController::class, 'edit']);
$router->put('/reports/{id}', [ReportController::class, 'update']);
$router->delete('/reports/{id}', [ReportController::class, 'delete']);

// Import routes
$router->get('/import', [ImportController::class, 'index']);
$router->post('/import', [ImportController::class, 'import']);

// Run the application
$router->dispatch(); 