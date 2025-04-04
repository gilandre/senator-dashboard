<?php

namespace App\Controllers;

use App\Services\ValidationService;
use App\Services\LogService;

abstract class BaseController
{
    protected ValidationService $validationService;
    protected LogService $logService;

    public function __construct()
    {
        $this->validationService = new ValidationService();
        $this->logService = new LogService();
    }

    protected function redirect(string $url): void
    {
        header("Location: {$url}");
        exit();
    }

    protected function setFlash(string $type, string $message): void
    {
        $_SESSION['flash'] = [
            'type' => $type,
            'message' => $message
        ];
    }

    protected function getFlash(): ?array
    {
        $flash = $_SESSION['flash'] ?? null;
        unset($_SESSION['flash']);
        return $flash;
    }

    protected function json(array $data, int $status = 200): void
    {
        header('Content-Type: application/json');
        http_response_code($status);
        echo json_encode($data);
        exit();
    }

    protected function view(string $template, array $data = []): void
    {
        extract($data);
        require_once __DIR__ . "/../views/{$template}.php";
    }
} 