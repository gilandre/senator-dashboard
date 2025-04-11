<?php

// Disable caching
header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
header("Cache-Control: post-check=0, pre-check=0", false);
header("Pragma: no-cache");

// Inclure l'autoloader
include __DIR__ . '/../vendor/autoload.php';

// Import des contrôleurs
use App\Controllers\AuthController;
use App\Controllers\DashboardController;
use App\Controllers\UserController;
use App\Controllers\ReportController;
use App\Controllers\ImportController;
use App\Controllers\ProfileController;

// Démarrer la session
session_start();

// Charger les variables d'environnement
$dotenv = \Dotenv\Dotenv::createImmutable(__DIR__ . '/..');
$dotenv->load();

// Initialiser la base de données
$db = \App\Core\Database::getInstance();

// Initialize router
$router = new \App\Core\Router();

// Register routes

// Auth routes
$router->get('/login', [AuthController::class, 'showLogin']);
$router->post('/login', [AuthController::class, 'login']);
$router->get('/logout', [AuthController::class, 'logout']);
$router->get('/forgot-password', [AuthController::class, 'showForgotPassword']);
$router->post('/forgot-password', [AuthController::class, 'sendResetLink']);
$router->get('/reset-password', [AuthController::class, 'showResetPassword']);
$router->post('/reset-password', [AuthController::class, 'resetPassword']);

// Dashboard routes
$router->get('/', [DashboardController::class, 'index']);
$router->get('/dashboard', [DashboardController::class, 'index']);
$router->get('/dashboard/data', [DashboardController::class, 'getData']);
$router->get('/dashboard/all-data', [DashboardController::class, 'getAllData']);

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
$router->post('/import/upload', [ImportController::class, 'upload']);
$router->get('/import/validate', [ImportController::class, 'validateView']);
$router->post('/import/process', [ImportController::class, 'process']);
$router->get('/import/confirmation', [ImportController::class, 'confirmation']);
$router->get('/import/finish', [ImportController::class, 'finish']);
$router->post('/import/finish', [ImportController::class, 'finish']);
$router->get('/import/get-history', [ImportController::class, 'getHistory']);
$router->get('/import/history', [ImportController::class, 'history']);
$router->get('/import/check-async', [ImportController::class, 'checkAsyncImport']);
$router->get('/import/export-duplicates', [ImportController::class, 'exportDuplicates']);
$router->post('/import/preview', [ImportController::class, 'preview']);

// Profile routes
$router->get('/profile', [ProfileController::class, 'index']);
$router->post('/profile/update', [ProfileController::class, 'update']);
$router->post('/profile/changePassword', [ProfileController::class, 'changePassword']);

// Run the application
$router->dispatch(); 