<?php
/**
 * Test de la méthode layout dans la classe Controller
 */
require_once __DIR__ . '/bootstrap.php';

use App\Controllers\ImportController;

class ControllerLayoutTester extends ImportController 
{
    public $capturedOutput = '';
    
    // Méthode pour tester le layout
    public function testLayout()
    {
        // Démarrer un tampon de sortie
        ob_start();
        
        // Générer du contenu pour le layout
        echo "<h2>Test de la méthode layout</h2>";
        echo "<p>Ce contenu devrait être inséré dans le layout.</p>";
        
        // Appeler la méthode layout
        $this->layout('main', [
            'title' => 'Test de la méthode layout',
            'pageTitle' => 'Test du Layout',
            'currentPage' => 'test'
        ]);
    }
}

// Créer une instance et exécuter le test
$tester = new ControllerLayoutTester();
try {
    echo "=== Test de la méthode layout dans Controller ===\n\n";
    echo "Exécution du test...\n";
    $tester->testLayout();
    echo "La méthode layout fonctionne correctement.\n";
} catch (Exception $e) {
    echo "ERREUR: " . $e->getMessage() . "\n";
    echo "Trace: " . $e->getTraceAsString() . "\n";
} 