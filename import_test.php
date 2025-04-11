<?php

require_once __DIR__ . '/vendor/autoload.php';
require_once __DIR__ . '/src/Core/Controller.php';
require_once __DIR__ . '/src/controllers/ImportController.php';
require_once __DIR__ . '/src/services/CsvImportService.php';
require_once __DIR__ . '/src/services/CsvValidationService.php';

use App\Controllers\ImportController;
use App\Services\CsvImportService;
use App\Services\CsvValidationService;

// Start session and set user data
session_start();
$_SESSION['user_id'] = 1;
$_SESSION['username'] = 'admin';
$_SESSION['role'] = 'admin';

// Override the redirect method to prevent actual redirects
class TestImportController extends ImportController {
    protected $csvImportService;
    protected $csvValidationService;
    
    public function __construct() {
        parent::__construct();
        $this->csvImportService = new CsvImportService();
        $this->csvValidationService = new CsvValidationService();
    }
    
    protected function redirect(string $url): void {
        echo "Would redirect to: $url\n";
    }
    
    protected function setFlash(string $type, string $message): void {
        echo "Flash message ($type): $message\n";
    }
    
    public function upload() {
        try {
            error_log("ImportController::upload - Début du processus");
            error_log("ImportController::upload - POST data: " . print_r($_POST, true));
            error_log("ImportController::upload - FILES data: " . print_r($_FILES, true));
            
            // Vérifier si le formulaire a été soumis
            if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
                error_log("ImportController::upload - Méthode non POST");
                $this->redirect('/import');
                return;
            }
            
            // Vérifier si un fichier a été téléchargé
            if (!isset($_FILES['csv_file']) || $_FILES['csv_file']['error'] !== UPLOAD_ERR_OK) {
                error_log("ImportController::upload - Aucun fichier ou erreur de téléchargement");
                $this->setFlash('error', 'Aucun fichier n\'a été téléchargé ou une erreur s\'est produite');
                $this->redirect('/import');
                return;
            }
            
            // Récupérer les options d'importation et s'assurer qu'elles sont définies
            $separator = isset($_POST['separator']) && !empty($_POST['separator']) ? $_POST['separator'] : ';';
            error_log("ImportController::upload - Séparateur après vérification: '$separator'");
            
            $hasHeader = isset($_POST['has_header']) && $_POST['has_header'] === 'on';
            $validateData = isset($_POST['validate_data']) && $_POST['validate_data'] === 'on';
            
            error_log("ImportController::upload - Options: separator=$separator, hasHeader=" . ($hasHeader ? 'true' : 'false') . ", validateData=" . ($validateData ? 'true' : 'false'));
            
            // Lire le contenu du CSV directement depuis le fichier temporaire
            $data = $this->csvImportService->readCSV($_FILES['csv_file']['tmp_name'], $separator, $hasHeader);
            error_log("ImportController::upload - Lecture CSV terminée, " . count($data) . " lignes trouvées");
            
            // Si validation activée, valider les données
            if ($validateData) {
                error_log("ImportController::upload - Validation demandée, traitement en cours");
                $this->csvValidationService->validateImportData($data);
                
                $errorCount = $this->csvValidationService->getErrorCount();
                $warningCount = $this->csvValidationService->getWarningCount();
                error_log("ImportController::upload - Validation terminée: $errorCount erreurs, $warningCount avertissements");
                
                // Stocker les résultats de validation en session
                $_SESSION['validation'] = [
                    'errors' => $this->csvValidationService->getErrors(),
                    'warnings' => $this->csvValidationService->getWarnings(),
                    'corrections' => $this->csvValidationService->getCorrections(),
                    'error_count' => $errorCount,
                    'warning_count' => $warningCount
                ];
                
                // Stocker les données en session
                $_SESSION['import_data'] = [
                    'data' => $data,
                    'temp_file' => $_FILES['csv_file']['tmp_name'],
                    'separator' => $separator,
                    'has_header' => $hasHeader
                ];
                
                // Vérifier s'il y a des erreurs bloquantes
                $hasBlockingErrors = $this->csvValidationService->hasBlockingErrors();
                error_log("ImportController::upload - Erreurs bloquantes: " . ($hasBlockingErrors ? 'oui' : 'non'));
                
                if ($hasBlockingErrors) {
                    error_log("ImportController::upload - Redirection vers /import à cause des erreurs bloquantes");
                    $this->setFlash('error', 'Des erreurs ont été détectées dans le fichier. Veuillez les corriger avant de continuer.');
                    $this->redirect('/import');
                    return;
                }
                
                // Rediriger vers la page de validation
                error_log("ImportController::upload - Redirection vers /import/validate pour validation");
                $this->redirect('/import/validate');
                return;
            }
            
            error_log("ImportController::upload - Pas de validation demandée, importation directe");
            // Si pas de validation, importer directement les données
            $result = $this->csvImportService->importData($data);
            
            error_log("ImportController::upload - Importation terminée avec succès");
            $this->setFlash('success', 'Les données ont été importées avec succès.');
            $this->redirect('/dashboard');
            
            return $result;
            
        } catch (\Exception $e) {
            error_log("ImportController::upload - Erreur: " . $e->getMessage());
            error_log("ImportController::upload - Trace: " . $e->getTraceAsString());
            $this->setFlash('error', 'Erreur lors de l\'importation: ' . $e->getMessage());
            $this->redirect('/import');
            throw $e;
        }
    }
}

// Ensure the source file exists
$sourceFile = __DIR__ . '/test_valid.csv';
if (!file_exists($sourceFile)) {
    die("Source file not found: $sourceFile\n");
}

// Use system temp directory
$tempDir = sys_get_temp_dir();
$tempFile = $tempDir . '/test_valid_' . uniqid() . '.csv';

// Copy the file directly to system temp
if (!copy($sourceFile, $tempFile)) {
    die("Failed to copy source file to temporary location\n");
}

// Verify the temporary file exists and is readable
if (!file_exists($tempFile) || !is_readable($tempFile)) {
    die("Temporary file not accessible: $tempFile\n");
}

// Initialize the controller
$controller = new TestImportController();

// Set up $_FILES array to simulate file upload
$_FILES['csv_file'] = [
    'name' => 'test_valid.csv',
    'type' => 'text/csv',
    'tmp_name' => $tempFile,
    'error' => 0,
    'size' => filesize($tempFile)
];

// Set up $_POST data for import options
$_POST = [
    'separator' => ';',
    'has_header' => 'on',
    'validate_data' => 'off' // Turn off validation for direct import
];

// Set up $_SERVER data to simulate a POST request
$_SERVER['REQUEST_METHOD'] = 'POST';
$_SERVER['HTTP_HOST'] = 'localhost';
$_SERVER['REQUEST_URI'] = '/import/upload';

// Call the import method
try {
    $result = $controller->upload();
    echo "Import completed\n";
} catch (Exception $e) {
    echo "Error during import: " . $e->getMessage() . "\n";
    echo "Stack trace: " . $e->getTraceAsString() . "\n";
} finally {
    // Clean up the temporary file
    if (file_exists($tempFile)) {
        unlink($tempFile);
    }
} 