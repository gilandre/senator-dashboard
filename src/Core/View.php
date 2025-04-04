<?php

namespace App\Core;

class View
{
    public static function render($view, $data = [])
    {
        extract($data);
        
        $viewPath = __DIR__ . '/../views/' . $view . '.php';
        
        if (!file_exists($viewPath)) {
            throw new \Exception("La vue {$view} n'existe pas");
        }
        
        require $viewPath;
    }
} 