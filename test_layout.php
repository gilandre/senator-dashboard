<?php
/**
 * Test de la fonctionnalité de layout
 */
require_once __DIR__ . '/bootstrap.php';

// Classe de test qui simule le comportement du contrôleur
class LayoutTest
{
    public function layout($layoutName, $data = [])
    {
        // Récupérer le contenu de la vue
        $content = ob_get_clean();
        
        // Nouveau buffer pour le layout
        ob_start();
        
        // Rendre les variables disponibles
        extract($data);
        
        // Inclure le layout
        include_once __DIR__ . "/src/views/layouts/{$layoutName}.php";
        
        // Afficher le résultat
        echo ob_get_clean();
        exit;
    }
    
    public function run()
    {
        ob_start();
        
        // Contenu de notre "vue"
        echo "<h2>Ceci est le contenu de la vue</h2>";
        echo "<p>Ce contenu devrait être inséré dans le layout principal.</p>";
        
        // Appliquer le layout
        $this->layout('main', [
            'title' => 'Test de Layout',
            'pageTitle' => 'Test de Layout',
            'currentPage' => 'test'
        ]);
    }
}

// Exécuter le test
$test = new LayoutTest();
$test->run(); 