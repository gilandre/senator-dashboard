<?php

namespace App\Core;

use App\Core\Auth;

abstract class Controller
{
    protected Auth $auth;
    protected array $data = [];
    protected string $layout = 'layouts/default';

    /**
     * Indique si le monitoring de performance est activé
     * @var bool
     */
    protected $performanceMonitoring = true;

    public function __construct()
    {
        $this->auth = new Auth();
    }

    /**
     * Méthode pour appliquer un layout à une vue
     * @param string $layoutName Nom du layout
     * @param array $data Données à passer au layout
     */
    public function layout(string $layoutName, array $data = []): void
    {
        // Récupérer le contenu de la vue courante
        $content = ob_get_clean();
        
        // Démarrer un nouveau buffer pour le layout
        ob_start();
        
        // Rendre les variables disponibles dans le layout
        extract($data);
        
        // Vérifier si le nom du layout commence déjà par "layouts/"
        if (strpos($layoutName, 'layouts/') === 0) {
            // Si oui, utiliser le chemin directement
            require __DIR__ . "/../views/{$layoutName}.php";
        } else {
            // Sinon, ajouter "layouts/" au chemin
            require __DIR__ . "/../views/layouts/{$layoutName}.php";
        }
        
        // Envoyer le contenu au navigateur
        echo ob_get_clean();
        exit;
    }

    /**
     * Affiche une vue
     *
     * @param string $view Le nom de la vue à afficher
     * @param array $data Les données à transmettre à la vue
     */
    public function view(string $view, array $data = [])
    {
        // Démarrer le timer de performance s'il est activé
        if ($this->performanceMonitoring && class_exists('\App\Helpers\PerformanceHelper')) {
            \App\Helpers\PerformanceHelper::startTimer('view-render');
        }
        
        // Ajouter automatiquement le titre si non spécifié
        if (!isset($data['title'])) {
            $data['title'] = ucfirst(str_replace('_', ' ', $view));
        }
        
        // Ajouter des informations communes à toutes les vues
        $data['current_user'] = $_SESSION['user'] ?? null;
        $data['is_authenticated'] = isset($_SESSION['user']);
        $data['flash_messages'] = $this->getFlashMessages();
        $data['current_route'] = $_SERVER['REQUEST_URI'];
        $data['app_name'] = $_ENV['APP_NAME'] ?? 'SENATOR';
        $data['debug_mode'] = $_ENV['APP_DEBUG'] ?? false;
        
        // Préparer le chemin du fichier de vue
        $viewPath = str_replace('.', '/', $view);
        $viewFile = __DIR__ . "/../views/$viewPath.php";
        
        // Vérifier que le fichier de vue existe
        if (!file_exists($viewFile)) {
            throw new \Exception("Vue '$viewPath' introuvable.");
        }
        
        // Extraire les données pour qu'elles soient disponibles dans la vue
        extract($data);
        
        // Démarrer la capture de sortie
        ob_start();
        
        // Inclure le fichier de vue
        include $viewFile;
        
        // Récupérer le contenu de la vue
        $content = ob_get_clean();
        
        // Inclure le layout si spécifié
        if (isset($this->layout) && $this->layout) {
            $layoutFile = __DIR__ . "/../views/$this->layout.php";
            
            if (!file_exists($layoutFile)) {
                throw new \Exception("Layout '$this->layout' introuvable.");
            }
            
            // Extraire à nouveau les données pour qu'elles soient disponibles dans le layout
            extract($data);
            
            // Démarrer une nouvelle capture pour le layout
            ob_start();
            
            // Inclure le fichier de layout
            include $layoutFile;
            
            // Remplacer le contenu original par le contenu avec layout
            $content = ob_get_clean();
        }
        
        // Ajouter le rapport de performance si activé
        if ($this->performanceMonitoring && class_exists('\App\Helpers\PerformanceHelper')) {
            \App\Helpers\PerformanceHelper::stopTimer('view-render');
            \App\Helpers\PerformanceHelper::appendToResponse($content);
        }
        
        // Afficher le contenu final
        echo $content;
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
        error_log("validateCsrfToken: POST token = " . ($_POST['csrf_token'] ?? 'non défini'));
        error_log("validateCsrfToken: SESSION token = " . ($_SESSION['csrf_token'] ?? 'non défini'));
        
        if (!isset($_POST['csrf_token']) || !isset($_SESSION['csrf_token'])) {
            error_log("validateCsrfToken: Échec - Un ou plusieurs jetons manquants");
            return false;
        }
        
        $result = hash_equals($_SESSION['csrf_token'], $_POST['csrf_token']);
        error_log("validateCsrfToken: Résultat = " . ($result ? 'OK' : 'Échec'));
        
        return $result;
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

    // Pour compatibilité avec le code existant
    protected function setFlash(string $type, string $message): void
    {
        $_SESSION['flash'] = [
            'type' => $type,
            'message' => $message
        ];
    }

    /**
     * Récupère les messages flash et les supprime de la session
     *
     * @return array Messages flash par type
     */
    protected function getFlashMessages(): array
    {
        $messages = [];
        
        if (isset($_SESSION['flash_messages'])) {
            $messages = $_SESSION['flash_messages'];
            unset($_SESSION['flash_messages']);
        }
        
        return $messages;
    }
} 