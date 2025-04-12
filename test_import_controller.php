<?php
/**
 * Script pour tester le contrôleur d'importation directement
 */

// Inclusion du bootstrap pour charger l'autoloader
require_once __DIR__ . '/bootstrap.php';

// Créer un fichier temporaire pour simuler un téléchargement
$sourceFilePath = __DIR__ . '/Exportation 1.csv';
$tempDir = __DIR__ . '/tmp';
$tempFilePath = $tempDir . '/temp_import_' . uniqid() . '.csv';

// Vérifier si le fichier source existe
if (!file_exists($sourceFilePath)) {
    die("ERREUR: Le fichier CSV source n'existe pas: {$sourceFilePath}\n");
}

// S'assurer que le répertoire temporaire existe
if (!is_dir($tempDir)) {
    mkdir($tempDir, 0755, true);
}

// Copier le fichier vers le répertoire temporaire
if (!copy($sourceFilePath, $tempFilePath)) {
    die("ERREUR: Impossible de copier le fichier vers le répertoire temporaire\n");
}

echo "Fichier source copié vers {$tempFilePath}\n";

// Démarrer une session si elle n'est pas déjà active
if (session_status() == PHP_SESSION_NONE) {
    session_start();
}

// Initialiser les variables nécessaires pour le contrôleur
$_SESSION['user_id'] = 1; // Supposer que nous avons un utilisateur avec ID 1
$_SESSION['username'] = 'admin';
$_SESSION['role'] = 'admin';

// Configurer manuellement le jeton CSRF (normalement généré par l'application)
$csrfToken = bin2hex(random_bytes(32));
$_SESSION['csrf_token'] = $csrfToken;

echo "Session initialisée: user_id={$_SESSION['user_id']}, username={$_SESSION['username']}, role={$_SESSION['role']}\n";

// Créer un fichier de log pour suivre le processus
$logFile = __DIR__ . '/import_controller_test.log';
file_put_contents($logFile, "=== TEST DU CONTRÔLEUR D'IMPORTATION ===\n");
file_put_contents($logFile, "Date: " . date('Y-m-d H:i:s') . "\n", FILE_APPEND);
file_put_contents($logFile, "Fichier: {$sourceFilePath}\n", FILE_APPEND);

try {
    // Instancier le contrôleur d'importation
    $importController = new \App\Controllers\ImportController();
    
    // Propriétés pour le test
    $separator = ';';
    $hasHeader = true;
    $skipDuplicates = true;
    
    // Simuler une requête HTTP POST pour upload
    $_SERVER['REQUEST_METHOD'] = 'POST';
    $_POST['csrf_token'] = $csrfToken;
    $_POST['separator'] = $separator;
    $_POST['has_header'] = 'on'; // Le formulaire envoie 'on' quand la case est cochée
    $_POST['skip_duplicates'] = 'on'; // Le formulaire envoie 'on' quand la case est cochée
    $_FILES['csv_file'] = [
        'name' => 'Exportation 1.csv',
        'type' => 'text/csv',
        'tmp_name' => $tempFilePath,
        'error' => UPLOAD_ERR_OK,
        'size' => filesize($tempFilePath)
    ];
    
    file_put_contents($logFile, "\n--- PHASE 1: TÉLÉCHARGEMENT DU FICHIER ---\n", FILE_APPEND);
    file_put_contents($logFile, "POST: " . print_r($_POST, true) . "\n", FILE_APPEND);
    file_put_contents($logFile, "FILES: " . print_r($_FILES, true) . "\n", FILE_APPEND);
    
    // Début du test: capture de la sortie pour éviter les redirections
    ob_start();
    $importController->upload();
    $output = ob_get_clean();
    
    if (isset($_SESSION['temp_uploads']) && !empty($_SESSION['temp_uploads'])) {
        $fileIds = array_keys($_SESSION['temp_uploads']);
        $fileId = reset($fileIds);
        file_put_contents($logFile, "Téléchargement réussi: ID={$fileId}\n", FILE_APPEND);
        
        // Maintenant, on teste la prévisualisation du fichier
        file_put_contents($logFile, "\n--- PHASE 2: PRÉVISUALISATION DU FICHIER ---\n", FILE_APPEND);
        
        // Simuler une requête HTTP GET pour preview
        $_SERVER['REQUEST_METHOD'] = 'GET';
        
        ob_start();
        // Appel direct à la méthode sans passer par la route normale
        $importController->previewFile($fileId);
        $output = ob_get_clean();
        
        file_put_contents($logFile, "Prévisualisation: " . (strlen($output) > 0 ? "Générée" : "Échec") . "\n", FILE_APPEND);
        
        // Si nous avons des données d'importation en session, nous pouvons passer à l'étape suivante
        if (isset($_SESSION['import_data'])) {
            file_put_contents($logFile, "Données d'importation en session: " . print_r($_SESSION['import_data'], true) . "\n", FILE_APPEND);
            
            // Test de la phase de validation
            file_put_contents($logFile, "\n--- PHASE 3: TRAITEMENT ET VALIDATION ---\n", FILE_APPEND);
            
            // Simuler une requête HTTP POST pour process
            $_SERVER['REQUEST_METHOD'] = 'POST';
            $_POST['csrf_token'] = $csrfToken;
            
            ob_start();
            $importController->process();
            $output = ob_get_clean();
            
            if (isset($_SESSION['validation'])) {
                file_put_contents($logFile, "Validation: Réussie\n", FILE_APPEND);
                file_put_contents($logFile, "Résultats de validation: " . print_r($_SESSION['validation'], true) . "\n", FILE_APPEND);
                
                // Test de la phase finale d'importation
                file_put_contents($logFile, "\n--- PHASE 4: IMPORTATION FINALE ---\n", FILE_APPEND);
                
                // Simuler une requête HTTP POST pour finish
                $_SERVER['REQUEST_METHOD'] = 'POST';
                $_POST['csrf_token'] = $csrfToken;
                $_POST['confirm'] = 'yes';
                
                ob_start();
                $importController->finish();
                $output = ob_get_clean();
                
                file_put_contents($logFile, "Importation: Terminée\n", FILE_APPEND);
                if (isset($_SESSION['import_result'])) {
                    file_put_contents($logFile, "Résultats d'importation: " . print_r($_SESSION['import_result'], true) . "\n", FILE_APPEND);
                } else {
                    file_put_contents($logFile, "Aucun résultat d'importation en session\n", FILE_APPEND);
                }
            } else {
                file_put_contents($logFile, "Validation: Échec - Aucune donnée de validation en session\n", FILE_APPEND);
            }
        } else {
            file_put_contents($logFile, "Prévisualisation: Échec - Aucune donnée d'importation en session\n", FILE_APPEND);
        }
    } else {
        file_put_contents($logFile, "Téléchargement: Échec - Aucun fichier temporaire en session\n", FILE_APPEND);
    }
    
    echo "Test du contrôleur d'importation terminé. Résultats dans {$logFile}\n";
    
} catch (\Exception $e) {
    file_put_contents($logFile, "ERREUR: " . $e->getMessage() . "\n", FILE_APPEND);
    file_put_contents($logFile, "Trace: " . $e->getTraceAsString() . "\n", FILE_APPEND);
    
    echo "Une erreur est survenue: " . $e->getMessage() . "\n";
}

// Nettoyage du fichier temporaire
if (file_exists($tempFilePath)) {
    unlink($tempFilePath);
    echo "Fichier temporaire supprimé\n";
} 