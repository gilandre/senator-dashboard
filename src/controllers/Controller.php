<?php

namespace App\Controllers;

class Controller
{
    protected function view(string $view, array $data = []): void
    {
        // Extract data to make variables available in the view
        extract($data);
        
        // Include the view file
        require_once __DIR__ . '/../Views/' . $view . '.php';
    }
    
    protected function redirect(string $url): void
    {
        header('Location: ' . $url);
        exit;
    }
    
    protected function setError(string $message): void
    {
        $_SESSION['error'] = $message;
    }
    
    protected function setSuccess(string $message): void
    {
        $_SESSION['success'] = $message;
    }
} 