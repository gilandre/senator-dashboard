<?php

return [
    'app' => [
        'name' => 'SENATOR Dashboard',
        'env' => $_ENV['APP_ENV'] ?? 'production',
        'debug' => $_ENV['APP_DEBUG'] ?? false,
        'url' => $_ENV['APP_URL'] ?? 'http://localhost',
        'timezone' => 'Europe/Paris',
        'locale' => 'fr_FR',
        'key' => $_ENV['APP_KEY'] ?? '',
        'cipher' => 'AES-256-CBC',
    ],
    'database' => [
        'driver' => 'mysql',
        'host' => $_ENV['DB_HOST'] ?? 'localhost',
        'database' => $_ENV['DB_DATABASE'] ?? 'senator_dashboard',
        'username' => $_ENV['DB_USERNAME'] ?? 'root',
        'password' => $_ENV['DB_PASSWORD'] ?? '',
        'charset' => 'utf8mb4',
        'collation' => 'utf8mb4_unicode_ci',
        'prefix' => '',
    ],
    'security' => [
        'session_lifetime' => 120,
        'password_min_length' => 8,
        'password_hash_algo' => PASSWORD_BCRYPT,
        'csrf_token_lifetime' => 7200,
    ],
    'upload' => [
        'max_file_size' => 10485760, // 10MB
        'allowed_extensions' => ['csv'],
        'upload_path' => __DIR__ . '/../../storage/uploads/',
    ],
];
