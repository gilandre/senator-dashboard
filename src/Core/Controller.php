<?php

namespace App\Core;

use App\Core\Auth;

abstract class Controller
{
    protected Auth $auth;
    protected array $data = [];
    protected string $layout = 'layouts/default';

    public function __construct()
    {
        $this->auth = new Auth();
    }

    protected function view(string $view, array $data = []): void
    {
        // Passer l'objet auth aux données pour le layout
        $data['auth'] = $this->auth;
        
        extract($data);
        $this->data = $data;
        
        $viewFile = __DIR__ . "/../views/{$view}.php";
        if (!file_exists($viewFile)) {
            throw new \Exception("View file not found: {$viewFile}");
        }

        ob_start();
        require_once $viewFile;
        $content = ob_get_clean();

        // Si le layout est déjà géré dans la vue (usage de ob_start/ob_get_clean)
        if (isset($content) && strpos($content, '<!DOCTYPE html>') !== false) {
            echo $content;
            return;
        }
        
        if ($this->layout === 'layouts/auth') {
            require_once __DIR__ . "/../views/{$this->layout}.php";
        } else {
            $layoutFile = __DIR__ . "/../views/{$this->layout}.php";
            if (!file_exists($layoutFile)) {
                throw new \Exception("Layout file not found: {$layoutFile}");
            }
            require_once $layoutFile;
        }
    }

    protected function redirect(string $url): void
    {
        header("Location: {$url}");
        exit;
    }

    protected function json(array $data, int $statusCode = 200): void
    {
        http_response_code($statusCode);
        header('Content-Type: application/json');
        echo json_encode($data);
        exit;
    }

    protected function isPost(): bool
    {
        return $_SERVER['REQUEST_METHOD'] === 'POST';
    }

    protected function isGet(): bool
    {
        return $_SERVER['REQUEST_METHOD'] === 'GET';
    }

    protected function getPostData(): array
    {
        return $_POST;
    }

    protected function getQueryParams(): array
    {
        return $_GET;
    }

    protected function validateCsrfToken(): bool
    {
        if (!isset($_POST['csrf_token']) || !isset($_SESSION['csrf_token'])) {
            return false;
        }
        return hash_equals($_SESSION['csrf_token'], $_POST['csrf_token']);
    }

    protected function generateCsrfToken(): string
    {
        if (!isset($_SESSION['csrf_token'])) {
            $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
        }
        return $_SESSION['csrf_token'];
    }

    protected function requireLogin(): void
    {
        if (!$this->auth->isLoggedIn()) {
            $this->redirect('/login');
        }
    }

    protected function requireAdmin(): void
    {
        $this->requireLogin();
        if (!$this->auth->isAdmin()) {
            $this->redirect('/');
        }
    }

    protected function flash(string $key, string $message): void
    {
        $_SESSION['flash'][$key] = $message;
    }

    protected function getFlash(string $key): ?string
    {
        if (isset($_SESSION['flash'][$key])) {
            $message = $_SESSION['flash'][$key];
            unset($_SESSION['flash'][$key]);
            return $message;
        }
        return null;
    }
} 