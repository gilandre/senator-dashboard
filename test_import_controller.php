<?php
require_once __DIR__ . '/vendor/autoload.php';

// Chargement des variables d'environnement
$dotenv = Dotenv\Dotenv::createImmutable(__DIR__);
$dotenv->load();

echo "Script de test pour la méthode importData du contrôleur\n\n";

// Simuler un fichier CSV simple
$testData = "Numéro de badge;Date évènements;Heure évènements;Centrale;Lecteur;Nature Evenement;Nom;Prénom;Statut;Groupe;Début validité;Date création\n";
$testData .= "123456;06/04/2025;08:30:00;Entrée principale;Lecteur1;Utilisateur accepté;Dupont;Jean;Actif;Administration;01/01/2025;01/01/2025\n";

// Créer un fichier temporaire
$tempFile = __DIR__ . '/tmp/test_controller.csv';
if (!is_dir(dirname($tempFile))) {
    mkdir(dirname($tempFile), 0777, true);
}
file_put_contents($tempFile, $testData);
echo "Fichier CSV de test créé : $tempFile\n";

try {
    // Créer une instance du service d'importation et lire les données
    $csvImportService = new App\Services\CsvImportService();
    $data = $csvImportService->readCSV($tempFile, ';', true);
    
    echo "Données lues du CSV : " . count($data) . " lignes\n";
    
    // Créer une instance du contrôleur d'import
    $importController = new App\Controllers\ImportController();
    
    // Utiliser la réflexion pour accéder à la méthode privée importData
    $reflectionMethod = new ReflectionMethod(App\Controllers\ImportController::class, 'importData');
    $reflectionMethod->setAccessible(true);
    
    // Appeler la méthode importData avec les données
    echo "Appel de la méthode importData...\n";
    $result = $reflectionMethod->invoke($importController, $data, false);
    
    echo "Résultats de l'importation :\n";
    echo "- Total : " . $result['total'] . "\n";
    echo "- Importés : " . $result['imported'] . "\n";
    echo "- Doublons : " . $result['duplicates'] . "\n";
    echo "- Erreurs : " . $result['errors'] . "\n";
    
    // Vérifier les données insérées
    $db = \App\Core\Database::getInstance()->getConnection();
    $stmt = $db->query("SELECT * FROM access_logs WHERE badge_number = '123456' ORDER BY id DESC LIMIT 1");
    $row = $stmt->fetch(\PDO::FETCH_ASSOC);
    
    if ($row) {
        echo "\nDonnée insérée :\n";
        echo "ID: " . $row['id'] . ", Badge: " . $row['badge_number'] . ", Date: " . $row['event_date'] . 
             ", Heure: " . $row['event_time'] . ", Type: " . $row['event_type'] . 
             ", Central: " . ($row['central'] ?? '<NULL>') . ", Groupe: " . ($row['group_name'] ?? '<NULL>') . "\n";
    } else {
        echo "\nAucune donnée insérée trouvée pour le badge 123456.\n";
    }
    
} catch (Exception $e) {
    echo "Erreur : " . $e->getMessage() . "\n";
    echo "Trace : " . $e->getTraceAsString() . "\n";
}

// Nettoyer le fichier temporaire
unlink($tempFile);
echo "\nFichier temporaire supprimé\n"; 