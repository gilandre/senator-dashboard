<?php

namespace App\Core;

use App\Models\User;
use Dotenv\Dotenv;

class App
{
    private Router $router;
    
    public function __construct()
    {
        // Start session if not already started
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }
        
        // Load environment variables
        $dotenv = \Dotenv\Dotenv::createImmutable(__DIR__ . '/../../');
        $dotenv->load();
        
        // Initialize database connection
        Database::getInstance();
        
        // Create default admin user if necessary
        User::createDefaultAdminIfNecessary();
        
        // Initialize router
        $this->router = new Router();
    }
    
    public function run(): void
    {
        $this->router->dispatch();
    }
} 