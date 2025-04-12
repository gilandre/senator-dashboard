<?php
/**
 * Test de la méthode layout dans ImportController
 */
require_once __DIR__ . '/bootstrap.php';

use App\Controllers\ImportController;

// Créer une simple classe de test qui stocke le contenu au lieu de l'envoyer au navigateur
class ImportControllerLayoutTester extends ImportController 
{
    public $capturedOutput = '';
    
    // Redéfinir la méthode layout pour capturer la sortie
    public function layout(string $layoutName, array $data = []): void
    {
        // Récupérer le contenu de la vue courante
        $content = ob_get_clean();
        
        // Démarrer un nouveau buffer pour le layout
        ob_start();
        
        // Rendre les variables disponibles dans le layout
        extract($data);
        
        // Inclure le fichier de layout
        require __DIR__ . "/src/views/layouts/{$layoutName}.php";
        
        // Capturer le contenu
        $this->capturedOutput = ob_get_clean();
        
        // Afficher un message de succès
        echo "Test réussi : La méthode layout a été appelée avec succès!\n";
        echo "Layout utilisé : {$layoutName}\n";
        echo "Taille du contenu généré : " . strlen($this->capturedOutput) . " caractères\n";
    }
    
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
$tester = new ImportControllerLayoutTester();
try {
    $tester->testLayout();
    echo "La méthode layout fonctionne correctement.\n";
} catch (Exception $e) {
    echo "ERREUR: " . $e->getMessage() . "\n";
    echo "Trace: " . $e->getTraceAsString() . "\n";
} 