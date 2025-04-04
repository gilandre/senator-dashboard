<?php

namespace App\Core;

class Application
{
    private Router $router;
    private array $config;
    private static ?Application $instance = null;

    public function __construct(Router $router, array $config)
    {
        $this->router = $router;
        $this->config = $config;
        self::$instance = $this;
    }

    public static function getInstance(): ?Application
    {
        return self::$instance;
    }

    public function getConfig(): array
    {
        return $this->config;
    }

    public function run(): void
    {
        try {
            $this->router->dispatch();
        } catch (\Exception $e) {
            if ($this->config['app']['debug']) {
                throw $e;
            }
            // Log l'erreur et affiche une page d'erreur générique
            error_log($e->getMessage());
            header("HTTP/1.1 500 Internal Server Error");
            include __DIR__ . '/../views/errors/500.php';
        }
    }
} 