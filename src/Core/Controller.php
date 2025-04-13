<?php

namespace App\Core;

use App\Core\Auth;
use App\Core\LayoutManager;

abstract class Controller
{
    protected Auth $auth;
    protected array $data = [];
    protected string $layout = 'default';
    protected LayoutManager $layoutManager;
    protected array $pageData = [];

    /**
     * Indique si le monitoring de performance est activé
     * @var bool
     */
    protected $performanceMonitoring = true;

    public function __construct()
    {
        $this->auth = new Auth();
        $this->layoutManager = new LayoutManager();
        
        // Initialisation des composants par défaut
        $this->initializeComponents();

        $this->layout = 'default';
        $this->pageData = [
            'pageTitle' => 'SENATOR Dashboard',
            'currentPage' => 'dashboard', // Valeur par défaut
            'meta_description' => 'SENATOR Dashboard - Système de gestion d\'accès'
        ];
    }
    
    /**
     * Initialise les composants d'interface réutilisables
     */
    protected function initializeComponents(): void
    {
        // Composants communs
        $this->layoutManager->addComponent('alert', 'components/alert.php');
        $this->layoutManager->addComponent('card', 'components/card.php');
        $this->layoutManager->addComponent('stat_card', 'components/stat_card.php');
        
        // Partials de layout
        $this->layoutManager->addComponent('header', 'layouts/partials/header.php');
        $this->layoutManager->addComponent('footer', 'layouts/partials/footer.php');
        $this->layoutManager->addComponent('sidebar', 'layouts/partials/sidebar.php');
        $this->layoutManager->addComponent('navbar', 'layouts/partials/navbar.php');
        
        // Variables partagées communes
        $this->layoutManager->addSharedDataBatch([
            'app_name' => $_ENV['APP_NAME'] ?? 'SENATOR',
            'app_version' => $_ENV['APP_VERSION'] ?? '1.0.0',
            'debug_mode' => $_ENV['APP_DEBUG'] ?? false
        ]);
    }

    /**
     * Définit le nom de la page courante (pour l'état actif du menu)
     * @param string $page Nom de la page courante
     * @return $this
     */
    public function setCurrentPage(string $page)
    {
        $this->pageData['currentPage'] = $page;
        return $this;
    }

    /**
     * Définit le titre de la page
     * @param string $title Titre de la page
     * @return $this
     */
    public function setPageTitle(string $title)
    {
        $this->pageData['pageTitle'] = $title;
        return $this;
    }

    /**
     * Méthode pour appliquer un layout à une vue
     * Cette méthode peut être utilisée de deux façons:
     * 1. Comme setter pour définir le layout à utiliser ultérieurement: $this->layout('auth');
     * 2. Pour appliquer immédiatement un layout au contenu déjà rendu
     * 
     * @param string $layoutName Nom du layout
     * @param array $data Données à passer au layout
     */
    public function layout(string $layoutName, array $data = []): void
    {
        // Si on passe des données, on assume qu'on veut appliquer le layout immédiatement
        if (!empty($data)) {
            $this->applyLayout($layoutName, $data);
            return;
        }
        
        // Sinon, on définit le layout à utiliser ultérieurement
        $this->layout = $layoutName;
    }

    /**
     * Affiche une vue en appliquant un layout si défini
     */
    public function view(string $view, array $data = []): void
    {
        // Priorité aux données définies via les méthodes spécifiques
        $data['pageTitle'] = $this->pageData['pageTitle'] ?? $data['pageTitle'] ?? null;
        $data['currentPage'] = $this->pageData['currentPage'] ?? $data['currentPage'] ?? null;
        
        // Ajout automatique des informations utilisateur
        if (isset($_SESSION['user'])) {
            $data['user'] = $_SESSION['user'];
        }
        
        // Ajout des messages flash
        if (isset($_SESSION['success'])) {
            $data['success'] = $_SESSION['success'];
        }
        if (isset($_SESSION['error'])) {
            $data['error'] = $_SESSION['error'];
        }
        
        // Démarrer le timer de performance s'il est activé
        if ($this->performanceMonitoring && class_exists('\App\Helpers\PerformanceHelper')) {
            \App\Helpers\PerformanceHelper::startTimer('view-render');
        }
        
        // Ajouter des informations communes à toutes les vues
        $data['current_user'] = $_SESSION['user'] ?? null;
        $data['is_authenticated'] = isset($_SESSION['user']);
        $data['flash_messages'] = $this->getFlashMessages();
        $data['current_route'] = $_SERVER['REQUEST_URI'];
        
        // Ajouter ces données au LayoutManager
        $this->layoutManager->addSharedDataBatch($data);
        
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
        
        // Utiliser le LayoutManager pour rendre la vue avec le layout spécifié
        if ($this->layout) {
            $this->layoutManager->setLayout($this->layout);
            $content = $this->layoutManager->render($content, $data);
        }
        
        // Ajouter le rapport de performance si activé
        if ($this->performanceMonitoring && class_exists('\App\Helpers\PerformanceHelper')) {
            \App\Helpers\PerformanceHelper::stopTimer('view-render');
            \App\Helpers\PerformanceHelper::appendToResponse($content);
        }
        
        // Afficher le contenu final
        echo $content;
    }
    
    /**
     * Rend un composant et retourne son contenu HTML
     *
     * @param string $name Nom du composant
     * @param array $data Données à passer au composant
     * @return string HTML du composant
     */
    public function component(string $name, array $data = []): string
    {
        // Vérifier si le composant existe
        $componentPath = __DIR__ . "/../views/components/{$name}.php";
        
        if (!file_exists($componentPath)) {
            error_log("Composant non trouvé: $componentPath");
            return "<!-- Composant '$name' non trouvé -->";
        }
        
        // Extraire les données pour les rendre disponibles dans le composant
        extract($data);
        
        // Capturer la sortie du rendu
        ob_start();
        include $componentPath;
        return ob_get_clean();
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
            $this->redirect('/dashboard');
        }
    }
    
    protected function getFlashMessages(): array
    {
        $messages = $_SESSION['flash_messages'] ?? [];
        unset($_SESSION['flash_messages']);
        return $messages;
    }
    
    protected function setFlash(string $type, string $message): void
    {
        $_SESSION['flash_messages'][] = [
            'type' => $type,
            'message' => $message
        ];
    }

    protected function applyLayout(string $layoutName, array $data): void
    {
        // Sinon, récupérer le contenu de la vue courante et appliquer le layout
        $content = ob_get_clean();
        
        // Définir le layout dans le LayoutManager
        $this->layoutManager->setLayout($layoutName);
        
        // Rendre la page avec le LayoutManager
        echo $this->layoutManager->render($content, $data);
        exit;
    }
} 