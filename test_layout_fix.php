<?php
/**
 * Test de la correction de la méthode layout
 */
require_once __DIR__ . '/bootstrap.php';

use App\Controllers\ImportController;

class LayoutFixTester extends ImportController 
{
    public function testBothPaths()
    {
        echo "=== Test des deux formats de chemin pour layout ===\n\n";
        
        // Tester avec 'main'
        try {
            echo "1. Test de layout('main')\n";
            ob_start();
            echo "<h2>Test avec main</h2>";
            $this->layout('main', ['title' => 'Test avec main']);
        } catch (Exception $e) {
            echo "ERREUR: " . $e->getMessage() . "\n";
        }
        
        // Tester avec 'layouts/main'
        try {
            echo "2. Test de layout('layouts/main')\n";
            ob_start();
            echo "<h2>Test avec layouts/main</h2>";
            $this->layout('layouts/main', ['title' => 'Test avec layouts/main']);
        } catch (Exception $e) {
            echo "ERREUR: " . $e->getMessage() . "\n";
        }
    }
}

// Créer une instance et exécuter le test
$tester = new LayoutFixTester();
$tester->testBothPaths(); 