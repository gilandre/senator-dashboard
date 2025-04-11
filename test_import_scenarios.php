<?php
/**
 * Script de test pour l'importation de données avec différents scénarios problématiques
 */

require_once __DIR__ . '/vendor/autoload.php';
$dotenv = Dotenv\Dotenv::createImmutable(__DIR__);
$dotenv->load();

use App\Controllers\ImportController;
use App\Services\CsvImportService;
use App\Core\Database;

// Fonction utilitaire pour le log
function log_message($message) {
    echo "[" . date('H:i:s') . "] $message\n";
}

// Créer un fichier CSV temporaire avec des données problématiques
function createTestCsvFile($scenarios = []) {
    $tempDir = __DIR__ . '/tmp';
    if (!is_dir($tempDir)) {
        mkdir($tempDir, 0777, true);
    }
    
    $filename = $tempDir . '/test_scenarios_' . uniqid() . '.csv';
    $file = fopen($filename, 'w');
    
    // Écrire l'en-tête
    $header = [
        'Numéro de badge', 
        'Date évènements', 
        'Heure évènements', 
        'Centrale', 
        'Lecteur', 
        'Nature Evenement', 
        'Nom', 
        'Prénom', 
        'Statut', 
        'Groupe', 
        'Date de début de validité', 
        'Date de création'
    ];
    
    fputcsv($file, $header, ';');
    
    // Si aucun scénario n'est spécifié, utiliser un ensemble par défaut
    if (empty($scenarios)) {
        $scenarios = [
            // Scénario 1: Données normales
            [
                'badge' => '123456',
                'date' => '05/04/2025',
                'time' => '08:30:00',
                'centrale' => 'Entrée principale',
                'lecteur' => 'Lecteur 1',
                'type' => 'Entrée autorisée',
                'nom' => 'Dupont',
                'prenom' => 'Jean',
                'statut' => 'Actif',
                'groupe' => 'Personnel',
                'validite' => '01/01/2025',
                'creation' => '01/01/2025'
            ],
            // Scénario 2: Date au format différent
            [
                'badge' => '234567',
                'date' => '2025-04-05',
                'time' => '09:15:00',
                'centrale' => 'Entrée secondaire',
                'lecteur' => 'Lecteur 2',
                'type' => 'Entrée autorisée',
                'nom' => 'Martin',
                'prenom' => 'Sophie',
                'statut' => 'Actif',
                'groupe' => 'Visiteur',
                'validite' => '2025-01-02',
                'creation' => '2025-01-02'
            ],
            // Scénario 3: Date invalide
            [
                'badge' => '345678',
                'date' => '32/13/2025',
                'time' => '10:45:00',
                'centrale' => 'Entrée garage',
                'lecteur' => 'Lecteur 3',
                'type' => 'Entrée autorisée',
                'nom' => 'Petit',
                'prenom' => 'Marie',
                'statut' => 'Actif',
                'groupe' => 'Administrateur',
                'validite' => '03/01/2025',
                'creation' => '03/01/2025'
            ],
            // Scénario 4: Heure invalide
            [
                'badge' => '456789',
                'date' => '05/04/2025',
                'time' => '25:70:99',
                'centrale' => 'Sortie principale',
                'lecteur' => 'Lecteur 4',
                'type' => 'Sortie autorisée',
                'nom' => 'Robert',
                'prenom' => 'Paul',
                'statut' => 'Actif',
                'groupe' => 'Maintenance',
                'validite' => '04/01/2025',
                'creation' => '04/01/2025'
            ],
            // Scénario 5: Champs obligatoires vides
            [
                'badge' => '',
                'date' => '05/04/2025',
                'time' => '12:30:00',
                'centrale' => 'Sortie secondaire',
                'lecteur' => 'Lecteur 5',
                'type' => 'Sortie autorisée',
                'nom' => 'Leroy',
                'prenom' => 'Julie',
                'statut' => 'Actif',
                'groupe' => 'Direction',
                'validite' => '05/01/2025',
                'creation' => '05/01/2025'
            ],
            // Scénario 6: Date et heure vides
            [
                'badge' => '567890',
                'date' => '',
                'time' => '',
                'centrale' => 'Entrée livraison',
                'lecteur' => 'Lecteur 6',
                'type' => 'Entrée autorisée',
                'nom' => 'Bernard',
                'prenom' => 'Thomas',
                'statut' => 'Actif',
                'groupe' => 'Livraison',
                'validite' => '06/01/2025',
                'creation' => '06/01/2025'
            ],
            // Scénario 7: Doublon (même badge et date que scénario 1)
            [
                'badge' => '123456',
                'date' => '05/04/2025',
                'time' => '16:45:00',
                'centrale' => 'Entrée principale',
                'lecteur' => 'Lecteur 1',
                'type' => 'Entrée autorisée',
                'nom' => 'Dupont',
                'prenom' => 'Jean',
                'statut' => 'Actif',
                'groupe' => 'Personnel',
                'validite' => '01/01/2025',
                'creation' => '01/01/2025'
            ],
            // Scénario 8: Données avec caractères spéciaux
            [
                'badge' => '678901',
                'date' => '05/04/2025',
                'time' => '17:30:00',
                'centrale' => 'Entrée-VIP',
                'lecteur' => 'Lecteur VIP',
                'type' => 'Entrée autorisée',
                'nom' => 'Müller',
                'prenom' => 'François',
                'statut' => 'Actif',
                'groupe' => 'VIP & Invités',
                'validite' => '07/01/2025',
                'creation' => '07/01/2025'
            ]
        ];
    }
    
    // Écrire les données
    foreach ($scenarios as $scenario) {
        $row = [
            $scenario['badge'],
            $scenario['date'],
            $scenario['time'],
            $scenario['centrale'],
            $scenario['lecteur'],
            $scenario['type'],
            $scenario['nom'],
            $scenario['prenom'],
            $scenario['statut'],
            $scenario['groupe'],
            $scenario['validite'],
            $scenario['creation']
        ];
        
        fputcsv($file, $row, ';');
    }
    
    fclose($file);
    return $filename;
}

// Programme principal
try {
    log_message("Début du test d'importation avec scénarios problématiques");
    
    // 1. Créer le fichier de test
    $csvFile = createTestCsvFile();
    log_message("Fichier de test créé: $csvFile");
    
    // 2. Initialiser le service d'import et lire le fichier
    $importService = new CsvImportService();
    $data = $importService->readCSV($csvFile, ';', true);
    log_message("Lecture du fichier CSV: " . count($data) . " lignes trouvées");
    
    // 3. Initialiser un controller d'import (accès à la méthode privée via Reflection)
    $importController = new ImportController();
    $reflectionMethod = new ReflectionMethod(ImportController::class, 'importData');
    $reflectionMethod->setAccessible(true);
    
    // 4. Exécuter l'importation
    log_message("Exécution de l'importation...");
    $result = $reflectionMethod->invoke($importController, $data);
    
    // 5. Afficher les résultats
    log_message("Importation terminée avec les résultats suivants:");
    log_message("- Total de lignes: " . $result['total']);
    log_message("- Lignes importées: " . $result['imported']);
    log_message("- Doublons détectés: " . $result['duplicates']);
    log_message("- Erreurs rencontrées: " . $result['errors']);
    log_message("- Taux de réussite: " . $result['success_rate'] . "%");
    
    // 6. Vérifier les données dans la base
    $db = Database::getInstance();
    $badgesToCheck = ['123456', '234567', '345678', '456789', '567890', '678901'];
    
    log_message("\nVérification des données importées:");
    foreach ($badgesToCheck as $badge) {
        $sql = "SELECT * FROM access_logs WHERE badge_number = ? ORDER BY id DESC LIMIT 1";
        $stmt = $db->query($sql, [$badge]);
        $record = $stmt->fetch(\PDO::FETCH_ASSOC);
        
        if ($record) {
            log_message("Badge $badge: Trouvé - ID: {$record['id']}, Date: {$record['event_date']}, Heure: {$record['event_time']}");
        } else {
            log_message("Badge $badge: Non trouvé");
        }
    }
    
    // 7. Nettoyer
    unlink($csvFile);
    log_message("Fichier temporaire supprimé");
    log_message("Test terminé avec succès");
    
} catch (Exception $e) {
    log_message("ERREUR: " . $e->getMessage());
    log_message("Trace: " . $e->getTraceAsString());
} 