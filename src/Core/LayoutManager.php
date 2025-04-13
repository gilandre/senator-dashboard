<?php

namespace App\Core;

/**
 * Gestionnaire de layout pour l'application
 * Cette classe permet une approche modulaire pour les interfaces utilisateur
 */
class LayoutManager
{
    /**
     * @var string Chemin vers le répertoire des vues
     */
    private string $viewsPath;
    
    /**
     * @var array Liste des parties de layouts chargées
     */
    private array $components = [];
    
    /**
     * @var array Variables partagées entre toutes les vues
     */
    private array $sharedData = [];
    
    /**
     * @var string Layout actuel
     */
    private string $currentLayout = 'default';
    
    /**
     * @var array Layouts disponibles
     */
    private array $availableLayouts = [
        'default' => 'layouts/default.php',
        'app' => 'layouts/app.php',
        'auth' => 'layouts/auth.php',
        'main' => 'layouts/main.php',
        'blank' => 'layouts/blank.php'
    ];
    
    /**
     * Constructeur du gestionnaire de layout
     * 
     * @param string $viewsPath Chemin vers le répertoire des vues
     */
    public function __construct(string $viewsPath = null)
    {
        // Définir le chemin vers les vues
        $this->viewsPath = $viewsPath ?? dirname(__DIR__) . '/views';
        
        // Ajouter des variables partagées par défaut
        $this->addSharedData('app_name', 'SENATOR Dashboard');
        $this->addSharedData('app_version', '1.0.0');
    }
    
    /**
     * Définir le layout actuel
     *
     * @param string $layoutName Nom du layout à utiliser
     * @return LayoutManager Instance pour chaînage
     */
    public function setLayout(string $layoutName): self
    {
        if (isset($this->availableLayouts[$layoutName])) {
            $this->currentLayout = $layoutName;
        } else {
            // Fallback au layout par défaut si non trouvé
            $this->currentLayout = 'default';
        }
        
        return $this;
    }
    
    /**
     * Ajouter un composant de layout
     *
     * @param string $name Nom du composant
     * @param string $path Chemin vers le fichier
     * @return LayoutManager Instance pour chaînage
     */
    public function addComponent(string $name, string $path): self
    {
        $this->components[$name] = $path;
        return $this;
    }
    
    /**
     * Récupérer un composant de layout
     *
     * @param string $name Nom du composant
     * @param array $data Données à passer au composant
     * @return string HTML rendu
     */
    public function getComponent(string $name, array $data = []): string
    {
        if (!isset($this->components[$name])) {
            return '<!-- Composant non trouvé: ' . htmlspecialchars($name) . ' -->';
        }
        
        $path = $this->components[$name];
        
        // Fusionner avec les données partagées
        $data = array_merge($this->sharedData, $data);
        
        // Capturer la sortie du composant
        ob_start();
        extract($data);
        include $this->viewsPath . '/' . $path;
        return ob_get_clean();
    }
    
    /**
     * Rendre le layout actuel avec le contenu
     *
     * @param string $content Contenu à injecter dans le layout
     * @param array $data Données à passer au layout
     * @return string HTML complet
     */
    public function render(string $content, array $data = []): string
    {
        // Fusionner les données avec les données partagées
        $data = array_merge($this->sharedData, $data);
        $data['content'] = $content;
        
        $layoutPath = $this->availableLayouts[$this->currentLayout];
        
        // Capturer la sortie du layout
        ob_start();
        extract($data);
        include $this->viewsPath . '/' . $layoutPath;
        return ob_get_clean();
    }
    
    /**
     * Ajouter une variable de données partagée
     *
     * @param string $key Clé de la variable
     * @param mixed $value Valeur de la variable
     * @return LayoutManager Instance pour chaînage
     */
    public function addSharedData(string $key, $value): self
    {
        $this->sharedData[$key] = $value;
        return $this;
    }
    
    /**
     * Ajouter plusieurs variables de données partagées
     *
     * @param array $data Tableau associatif de données
     * @return LayoutManager Instance pour chaînage
     */
    public function addSharedDataBatch(array $data): self
    {
        $this->sharedData = array_merge($this->sharedData, $data);
        return $this;
    }
} 