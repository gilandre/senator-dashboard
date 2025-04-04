<?php

require_once __DIR__ . '/../vendor/autoload.php';

use App\Core\Application;
use App\Core\Router;
use App\Core\Database;

// Chargement des variables d'environnement
$dotenv = Dotenv\Dotenv::createImmutable(__DIR__ . '/..');
$dotenv->load();

// Configuration de l'application
$config = require_once __DIR__ . '/config/config.php';

// Initialisation de la session
session_start();

// Configuration du fuseau horaire
date_default_timezone_set($config['app']['timezone']);

// Initialisation de la base de données
$database = new Database($config['database']);

// Initialisation du routeur
$router = new Router();

// Définition des routes
$router->get('/', 'HomeController@index');
$router->get('/dashboard', 'DashboardController@index');
$router->get('/import', 'ImportController@index');
$router->post('/import/upload', 'ImportController@upload');
$router->get('/reports', 'ReportController@index');
$router->get('/api/attendance', 'ApiController@getAttendanceData');

// Initialisation et démarrage de l'application
$app = new Application($router, $config);
$app->run();
