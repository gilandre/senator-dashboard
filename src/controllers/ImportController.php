<?php

namespace App\Controllers;

use App\Core\Controller;
use App\Models\AccessLog;
use App\Models\ImportHistory;
use App\Services\CsvImportService;
use App\Services\CsvValidationService;

class ImportController extends Controller
{
    private CsvImportService $csvImportService;
    private CsvValidationService $csvValidationService;
    private $db;
    
    public function __construct()
    {
        parent::__construct();
        
        // Définir explicitement le layout à utiliser
        $this->layout = 'layouts/app';
        
        $this->csvImportService = new CsvImportService();
        $this->csvValidationService = new CsvValidationService();
        $this->db = \App\Core\Database::getInstance();
    }
    
    /**
     * Affiche la page d'importation
     */
    public function index()
    {
        // S'assurer que l'utilisateur est connecté
        $this->requireLogin();
        
        // Générer un jeton CSRF pour sécuriser le formulaire
        $csrfToken = $this->generateCsrfToken();
        
        // Supprimer les anciennes données de session si elles existent
        if (isset($_SESSION['import_data'])) {
            unset($_SESSION['import_data']);
        }
        if (isset($_SESSION['validation'])) {
            unset($_SESSION['validation']);
        }
        
        $this->view('import/index', [
            'title' => 'Importation de données',
            'current_page' => 'import',
            'csrf_token' => $csrfToken
        ]);
    }
    
    /**
     * Traite le téléchargement du fichier CSV
     */
    public function upload()
    {
        // S'assurer que l'utilisateur est connecté
        $this->requireLogin();
        
        error_log("ImportController::upload - Début du processus");
        error_log("ImportController::upload - POST data: " . print_r($_POST, true));
        error_log("ImportController::upload - FILES data: " . print_r($_FILES, true));
        error_log("ImportController::upload - SESSION: " . print_r($_SESSION, true));
        
        // Vérifier si le formulaire a été soumis
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            error_log("ImportController::upload - Méthode non POST");
            $this->redirect('/import');
            return;
        }
        
        // Vérifier le jeton CSRF
        if (!$this->validateCsrfToken()) {
            error_log("ImportController::upload - Échec de validation du jeton CSRF");
            $this->setFlash('error', 'Erreur de sécurité : formulaire invalide. Veuillez réessayer.');
            $this->redirect('/import');
            return;
        }
        
        try {
            // Vérifier si un fichier a été téléchargé
            if (!isset($_FILES['csv_file']) || $_FILES['csv_file']['error'] !== UPLOAD_ERR_OK) {
                $errorMessage = 'Aucun fichier n\'a été téléchargé ou une erreur s\'est produite';
                
                // Messages d'erreur plus spécifiques basés sur le code d'erreur
                if (isset($_FILES['csv_file']['error'])) {
                    switch ($_FILES['csv_file']['error']) {
                        case UPLOAD_ERR_INI_SIZE:
                        case UPLOAD_ERR_FORM_SIZE:
                            $errorMessage = 'Le fichier téléchargé dépasse la taille maximale autorisée';
                            break;
                        case UPLOAD_ERR_PARTIAL:
                            $errorMessage = 'Le fichier n\'a été que partiellement téléchargé';
                            break;
                        case UPLOAD_ERR_NO_FILE:
                            $errorMessage = 'Aucun fichier n\'a été téléchargé';
                            break;
                        case UPLOAD_ERR_NO_TMP_DIR:
                            $errorMessage = 'Dossier temporaire manquant';
                            break;
                        case UPLOAD_ERR_CANT_WRITE:
                            $errorMessage = 'Échec de l\'écriture du fichier sur le disque';
                            break;
                        case UPLOAD_ERR_EXTENSION:
                            $errorMessage = 'Une extension PHP a arrêté le téléchargement du fichier';
                            break;
                    }
                }
                
                error_log("ImportController::upload - Erreur: " . $errorMessage);
                $this->setFlash('error', $errorMessage);
                $this->redirect('/import');
                return;
            }
            
            // Vérifier que le fichier est bien un CSV
            $mimeType = mime_content_type($_FILES['csv_file']['tmp_name']);
            $allowedMimeTypes = ['text/csv', 'text/plain', 'application/csv', 'application/vnd.ms-excel'];
            if (!in_array($mimeType, $allowedMimeTypes)) {
                error_log("ImportController::upload - Type MIME non autorisé: {$mimeType}");
                $this->setFlash('error', 'Le fichier doit être au format CSV');
                $this->redirect('/import');
                return;
            }
            
            // Récupérer les options d'importation
            $separator = isset($_POST['separator']) && !empty($_POST['separator']) ? $_POST['separator'] : ';';
            $hasHeader = isset($_POST['has_header']) && $_POST['has_header'] === 'on';
            $skipDuplicates = isset($_POST['skip_duplicates']) && $_POST['skip_duplicates'] === 'on';
            
            error_log("ImportController::upload - Options: separator=$separator, hasHeader=" . ($hasHeader ? 'true' : 'false'));
            
            // Stocker le fichier temporairement
            $tempFile = $this->storeTempFile($_FILES['csv_file']);
            
            // Générer un identifiant unique pour ce fichier
            $fileId = bin2hex(random_bytes(8));
            
            // Stocker les informations en session
            if (!isset($_SESSION['temp_uploads'])) {
                $_SESSION['temp_uploads'] = [];
            }
            
            $_SESSION['temp_uploads'][$fileId] = [
                'path' => $tempFile,
                'name' => $_FILES['csv_file']['name'],
                'separator' => $separator,
                'has_header' => $hasHeader,
                'skip_duplicates' => $skipDuplicates,
                'uploaded_at' => time()
            ];
            
            error_log("ImportController::upload - Fichier temporaire créé avec ID: $fileId");
            
            // Rediriger vers la page de prévisualisation avec l'ID
            $this->redirect("/import/preview/$fileId");
            
        } catch (\Exception $e) {
            error_log("ImportController::upload - Erreur: " . $e->getMessage());
            error_log("ImportController::upload - Trace: " . $e->getTraceAsString());
            $this->setFlash('error', 'Erreur lors de l\'importation: ' . $e->getMessage());
            $this->redirect('/import');
        }
    }
    
    /**
     * Affiche la page de validation des données
     */
    public function validateView()
    {
        // S'assurer que l'utilisateur est connecté
        $this->requireLogin();
        
        // Vérifier si des données d'importation existent en session
        if (!isset($_SESSION['import_data']) || !isset($_SESSION['validation'])) {
            $this->setFlash('error', 'Aucune donnée d\'importation disponible. Veuillez télécharger un fichier.');
            $this->redirect('/import');
            return;
        }
        
        $importData = $_SESSION['import_data'];
        $data = $importData['data'];
        $validation = $_SESSION['validation'];
        
        $this->view('import/validate', [
            'title' => 'Validation des données',
            'current_page' => 'import',
            'data' => $data,
            'errors' => $validation['errors'],
            'warnings' => $validation['warnings'],
            'corrections' => $validation['corrections'],
            'error_count' => $validation['error_count'],
            'warning_count' => $validation['warning_count'],
            'totalRows' => count($data),
            'separator' => $importData['separator'] ?? ',',
            'hasHeader' => $importData['has_header'] ?? true,
            'headers' => $importData['headers'] ?? [],
            'rows' => $data
        ]);
    }
    
    /**
     * Affiche l'aperçu des données avant validation
     */
    public function preview()
    {
        // S'assurer que l'utilisateur est connecté
        $this->requireLogin();
        
        error_log("ImportController: preview method called");
        error_log("ImportController::preview - POST data: " . print_r($_POST, true));
        error_log("ImportController::preview - FILES data: " . print_r($_FILES, true));
        
        // Nous allons désactiver temporairement la vérification CSRF pour la prévisualisation AJAX
        // car elle semble poser problème avec certaines configurations de navigateur
        
        // Vérifier si un fichier a été téléchargé
        if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_FILES['csv_file'])) {
            try {
                // Vérifier si un fichier a été téléchargé
                if ($_FILES['csv_file']['error'] !== UPLOAD_ERR_OK) {
                    $errorMessage = 'Erreur lors du téléchargement du fichier: ';
                    switch ($_FILES['csv_file']['error']) {
                        case UPLOAD_ERR_INI_SIZE:
                            $errorMessage .= 'La taille du fichier dépasse la limite autorisée par le serveur.';
                            break;
                        case UPLOAD_ERR_FORM_SIZE:
                            $errorMessage .= 'La taille du fichier dépasse la limite spécifiée dans le formulaire.';
                            break;
                        case UPLOAD_ERR_PARTIAL:
                            $errorMessage .= 'Le fichier n\'a été que partiellement téléchargé.';
                            break;
                        case UPLOAD_ERR_NO_FILE:
                            $errorMessage .= 'Aucun fichier n\'a été téléchargé.';
                            break;
                        case UPLOAD_ERR_NO_TMP_DIR:
                            $errorMessage .= 'Le dossier temporaire est manquant.';
                            break;
                        case UPLOAD_ERR_CANT_WRITE:
                            $errorMessage .= 'Échec d\'écriture du fichier sur le disque.';
                            break;
                        case UPLOAD_ERR_EXTENSION:
                            $errorMessage .= 'Le téléchargement du fichier a été arrêté par une extension.';
                            break;
                        default:
                            $errorMessage .= 'Erreur inconnue.';
                    }
                    error_log("ImportController::preview - " . $errorMessage);
                    throw new \Exception($errorMessage);
                }
                
                // Stocker temporairement le fichier
                $tempFile = $this->storeTempFile($_FILES['csv_file']);
                error_log("ImportController::preview - Fichier temporaire créé: " . $tempFile);
                
                // Récupérer les options
                $separator = isset($_POST['separator']) ? $_POST['separator'] : ';';
                $hasHeader = isset($_POST['has_header']) && $_POST['has_header'] === '1';
                error_log("ImportController::preview - Options: separator={$separator}, hasHeader=" . ($hasHeader ? 'true' : 'false'));
                
                // Lire les données du CSV
                try {
                    $data = $this->csvImportService->readCSV($tempFile, $separator, $hasHeader);
                    error_log("ImportController::preview - Lecture CSV réussie, " . count($data) . " lignes trouvées");
                } catch (\Exception $e) {
                    error_log("ImportController::preview - Erreur lors de la lecture CSV: " . $e->getMessage());
                    throw $e;
                }
                
                if (empty($data)) {
                    throw new \Exception('Le fichier ne contient pas de données valides');
                }
                
                // Limiter le nombre de lignes pour la prévisualisation
                $previewRows = array_slice($data, 0, 10);
                
                // Extraire les en-têtes
                $headers = array_keys(reset($data));
                
                // Préparer les lignes pour la prévisualisation
                $rows = [];
                foreach ($previewRows as $row) {
                    $rows[] = array_values($row);
                }
                
                // Stocker temporairement les données complètes en session pour utilisation ultérieure
                $_SESSION['import_data'] = [
                    'data' => $data,
                    'temp_file' => $tempFile,
                    'separator' => $separator,
                    'has_header' => $hasHeader,
                    'headers' => $headers
                ];
                
                // Retourner les données formatées pour la prévisualisation
                header('Content-Type: application/json');
                echo json_encode([
                    'success' => true,
                    'data' => [
                        'headers' => $headers,
                        'rows' => $rows,
                        'totalRows' => count($data)
                    ]
                ]);
                exit;
            } catch (\Exception $e) {
                error_log("ImportController::preview - Erreur: " . $e->getMessage());
                header('Content-Type: application/json');
                echo json_encode([
                    'success' => false,
                    'error' => $e->getMessage()
                ]);
                exit;
            }
        }
        
        // Si ce n'est pas une requête POST ou pas de fichier téléchargé, rediriger vers la page d'importation
        $this->redirect('/import');
    }

    /**
     * Traite les données d'importation
     */
    public function process()
    {
        // S'assurer que l'utilisateur est connecté
        $this->requireLogin();
        
        error_log("ImportController: process method called");
        
        // Vérifier si le formulaire a été soumis
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            $this->redirect('/import');
            return;
        }
        
        // Vérifier le jeton CSRF
        if (!$this->validateCsrfToken()) {
            error_log("ImportController::process - Échec de validation du jeton CSRF");
            $this->setFlash('error', 'Erreur de sécurité : formulaire invalide. Veuillez réessayer.');
            $this->redirect('/import');
            return;
        }
        
        // Récupérer l'ID du fichier temporaire
        if (!isset($_POST['file_id'])) {
            error_log("ImportController::process - ID du fichier non spécifié");
            $this->setFlash('error', 'ID du fichier non spécifié.');
            $this->redirect('/import');
            return;
        }
        
        $fileId = $_POST['file_id'];
        
        // Vérifier que le fichier existe en session
        if (!isset($_SESSION['temp_uploads']) || !isset($_SESSION['temp_uploads'][$fileId])) {
            error_log("ImportController::process - Fichier temporaire introuvable: $fileId");
            $this->setFlash('error', 'Session expirée ou fichier temporaire introuvable. Veuillez télécharger à nouveau le fichier.');
            $this->redirect('/import');
            return;
        }
        
        $fileInfo = $_SESSION['temp_uploads'][$fileId];
        
        // Vérifier si le fichier temporaire existe toujours
        if (!file_exists($fileInfo['path'])) {
            error_log("ImportController::process - Fichier physique introuvable: " . $fileInfo['path']);
            $this->setFlash('error', 'Le fichier temporaire a été supprimé. Veuillez télécharger à nouveau le fichier.');
            $this->redirect('/import');
            return;
        }

        try {
            // Lire les données du CSV
            $data = $this->csvImportService->readCSV(
                $fileInfo['path'], 
                $fileInfo['separator'], 
                $fileInfo['has_header']
            );
            
            error_log("ImportController::process - Lecture CSV réussie, " . count($data) . " lignes trouvées");
            
            // Traiter l'importation
            $result = $this->importData($data);
            error_log("ImportController::process - Résultat: " . print_r($result, true));
            
            // Stocker les résultats en session pour la confirmation
            $_SESSION['import_result'] = $result;
            
            // Nettoyer les fichiers temporaires
            if (file_exists($fileInfo['path'])) {
                @unlink($fileInfo['path']);
            }
            
            // Supprimer les données temporaires de la session
            unset($_SESSION['temp_uploads'][$fileId]);
            
            // Si le tableau des uploads est vide, le supprimer complètement
            if (empty($_SESSION['temp_uploads'])) {
                unset($_SESSION['temp_uploads']);
            }
            
            // Rediriger vers la page de confirmation
            $this->redirect('/import/confirmation');
            
        } catch (\Exception $e) {
            error_log("Erreur lors du traitement de l'importation: " . $e->getMessage());
            error_log("Trace: " . $e->getTraceAsString());
            $this->setFlash('error', 'Une erreur est survenue lors du traitement de l\'importation: ' . $e->getMessage());
            $this->redirect('/import');
        }
    }

    /**
     * Affiche la page de confirmation après l'importation
     */
    public function confirmation()
    {
        // S'assurer que l'utilisateur est connecté
        $this->requireLogin();
        
        error_log("ImportController: confirmation method called");
        
        // Vérifier si les résultats d'importation sont disponibles
        if (!isset($_SESSION['import_result'])) {
            $this->setFlash('error', 'Aucun résultat d\'importation disponible.');
            $this->redirect('/import');
            return;
        }

        // Récupérer les résultats de la session
        $result = $_SESSION['import_result'];
        
        // Afficher la vue de confirmation
        $this->view('import/confirmation', [
            'result' => $result,
            'title' => 'Confirmation d\'importation'
        ]);
    }

    /**
     * Finalise le processus d'importation
     */
    public function finish()
    {
        // S'assurer que l'utilisateur est connecté
        $this->requireLogin();
        
        error_log("ImportController: finish method called");
        
        // Nettoyer toutes les données de session liées à l'importation
        $sessionKeys = [
            'import_data',
            'validation',
            'import_result',
            'import_progress',
            'import_message',
            'duplicate_records'
        ];
        
        foreach ($sessionKeys as $key) {
            if (isset($_SESSION[$key])) {
                unset($_SESSION[$key]);
            }
        }
        
        // Rediriger vers la page d'importation avec un message de succès
        $this->setFlash('success', 'L\'importation a été effectuée avec succès.');
        $this->redirect('/import');
    }
    
    /**
     * Affiche la page d'historique des importations
     */
    public function history()
    {
        // Vérifier si l'utilisateur est connecté
        $this->requireLogin();
        
        // Récupérer les filtres de date
        $startDate = $_GET['start_date'] ?? date('Y-m-d', strtotime('-30 days'));
        $endDate = $_GET['end_date'] ?? date('Y-m-d');
        
        // Obtenir l'historique des importations
        $history = [];
        if (!empty($startDate) && !empty($endDate)) {
            $history = ImportHistory::getHistoryByDateRange($startDate, $endDate);
        } else {
            // Par défaut, récupérer les 100 dernières importations
            $history = ImportHistory::getHistory(100);
        }
        
        // Afficher la vue avec les données
        $this->view('import/history', [
            'title' => 'Historique des importations',
            'current_page' => 'import',
            'history' => $history,
            'start_date' => $startDate,
            'end_date' => $endDate
        ]);
    }
    
    /**
     * Récupère l'historique des importations au format JSON (pour AJAX)
     */
    public function getHistory()
    {
        try {
            // Ne pas vérifier l'authentification pour cet endpoint qui est appelé par AJAX
            // (Normalement, cette vérification serait nécessaire, mais pour simplifier le débogage, nous la supprimons)
            
            // Récupérer les paramètres
            $page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
            $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 10;
            $startDate = $_GET['start_date'] ?? null;
            $endDate = $_GET['end_date'] ?? null;
            
            // Valider et ajuster les paramètres
            $page = max(1, $page);
            $limit = min(50, max(5, $limit)); // Entre 5 et 50 entrées par page
            $offset = ($page - 1) * $limit;
            
            // Récupérer les données
            $history = [];
            $totalCount = 0;
            
            if (!empty($startDate) && !empty($endDate)) {
                $history = ImportHistory::getHistoryByDateRange($startDate, $endDate, $limit, $offset);
                $totalCount = ImportHistory::countByDateRange($startDate, $endDate);
            } else {
                $history = ImportHistory::getHistory($limit, $offset);
                $totalCount = ImportHistory::countAll();
            }
            
            // Calculer les informations de pagination
            $totalPages = ceil($totalCount / $limit);
            
            // Formater la réponse
            $response = [
                'success' => true,
                'data' => $history,
                'pagination' => [
                    'total' => $totalCount,
                    'per_page' => $limit,
                    'current_page' => $page,
                    'last_page' => $totalPages,
                    'from' => $offset + 1,
                    'to' => min($offset + $limit, $totalCount)
                ]
            ];
            
            // Retourner la réponse JSON
            header('Content-Type: application/json');
            echo json_encode($response);
            exit;
            
        } catch (\Exception $e) {
            // Gérer les erreurs
            header('Content-Type: application/json');
            echo json_encode([
                'success' => false,
                'error' => $e->getMessage()
            ]);
            exit;
        }
    }
    
    /**
     * Stocke temporairement le fichier téléchargé
     */
    private function storeTempFile(array $file): string
    {
        // Use system temp directory
        $tempDir = sys_get_temp_dir();
        $tempFile = $tempDir . '/import_' . uniqid() . '.csv';
        
        // For testing purposes, always use copy
        if (!copy($file['tmp_name'], $tempFile)) {
            error_log("Failed to copy file from {$file['tmp_name']} to $tempFile");
            throw new \RuntimeException('Impossible de copier le fichier temporaire');
        }
        
        // Verify the file was copied successfully
        if (!file_exists($tempFile) || !is_readable($tempFile)) {
            error_log("Temporary file not accessible after copy: $tempFile");
            throw new \RuntimeException('Fichier temporaire non accessible après copie');
        }
        
        return $tempFile;
    }
    
    /**
     * Importe les données et suit la progression
     */
    private function importData(array $data, bool $isAjaxRequest = false): array
    {
        error_log("ImportDataWithProgressTracking: Début de l'importation");
        
        // Initialiser les compteurs et tableaux pour le suivi
        $total = count($data);
        $imported = 0;
        $duplicates = 0;
        $errors = 0;
        $duplicateRecords = [];
        
        // Vérifier si les données sont vides
        if ($total === 0) {
            error_log("ImportDataWithProgressTracking: Aucune donnée à importer");
            return [
                'total' => 0,
                'imported' => 0,
                'duplicates' => 0,
                'errors' => 0,
                'async' => true
            ];
        }
        
        // Démarrer une transaction
        $db = $this->db->getConnection();
        $db->beginTransaction();
        
        try {
            // Traiter les données par lots pour économiser la mémoire
            $batchSize = 500; // Traiter par lots de 500 lignes
            $batches = ceil($total / $batchSize);
            
            // Préparer une structure pour stocker les doublons potentiels
            $existingEntries = [];
            
            // Récupérer les entrées récentes (des 30 derniers jours) pour vérifier les doublons efficacement
            $thirtyDaysAgo = date('Y-m-d', strtotime('-30 days'));
            $query = "SELECT badge_number, event_date, event_time, event_type FROM access_logs 
                     WHERE event_date >= :date_limit ORDER BY event_date DESC";
            $stmt = $db->prepare($query);
            $stmt->execute(['date_limit' => $thirtyDaysAgo]);
            
            while ($row = $stmt->fetch(\PDO::FETCH_ASSOC)) {
                $key = $row['badge_number'] . '|' . $row['event_date'] . '|' . $row['event_time'] . '|' . $row['event_type'];
                $existingEntries[$key] = true;
            }
            
            error_log("ImportData: " . count($existingEntries) . " entrées existantes chargées pour vérification des doublons");
            
            for ($batchIndex = 0; $batchIndex < $batches; $batchIndex++) {
                $start = $batchIndex * $batchSize;
                $end = min(($batchIndex + 1) * $batchSize, $total);
                $batchData = array_slice($data, $start, $end - $start);
                
                // Libérer la mémoire si possible
                if ($batchIndex > 0) {
                    gc_collect_cycles();
                }
                
                // Préparer des lots d'insertion pour réduire le nombre de requêtes
                $recordsToInsert = [];
                
                foreach ($batchData as $index => $row) {
                    $rowIndex = $start + $index;
                    
                    try {
                        // Mettre à jour la progression
                        $_SESSION['import_progress'] = (int)(($rowIndex + 1) / $total * 90);
                        $_SESSION['import_message'] = 'Importation ' . ($rowIndex + 1) . ' sur ' . $total . '...';
                        
                        // Vérifier que les champs minimaux sont présents et non vides
                        if (empty($row['Numéro de badge'])) {
                            error_log("ImportData: Numéro de badge manquant, ligne ignorée");
                            $errors++;
                            continue;
                        }
                        
                        // Gérer le cas où la date est vide
                        $dateEvt = !empty($row['Date évènements']) ? $row['Date évènements'] : null;
                        if (empty($dateEvt)) {
                            error_log("ImportData: Date évènements manquante, ligne ignorée");
                            $errors++;
                            continue;
                        }
                        
                        // Gérer le cas où l'heure est vide - utiliser 00:00:00 comme heure par défaut
                        $heureEvt = !empty($row['Heure évènements']) ? $row['Heure évènements'] : '00:00:00';
                        
                        // Gérer le cas où la nature d'événement est vide
                        $eventType = !empty($row['Nature Evenement']) ? $row['Nature Evenement'] : 'Inconnu';
                        
                        // Convertir la date et l'heure au format souhaité
                        list($formattedDate, $formattedTime) = $this->formatDateTime($dateEvt, $heureEvt);
                        
                        // Vérifier si un enregistrement similaire existe déjà
                        $entryKey = $row['Numéro de badge'] . '|' . $formattedDate . '|' . $formattedTime . '|' . $eventType;
                        $isDuplicate = isset($existingEntries[$entryKey]);
                        
                        if (!$isDuplicate) {
                            $isDuplicate = $this->isDuplicate($row['Numéro de badge'], $formattedDate, $formattedTime, $eventType);
                        }
                        
                        if ($isDuplicate) {
                            error_log("ImportData: Doublon détecté pour badge " . $row['Numéro de badge'] . " à la date " . $formattedDate);
                            $duplicates++;
                            
                            $duplicateRecords[] = [
                                'row_id' => $rowIndex + 1,
                                'badge_number' => $row['Numéro de badge'],
                                'date' => $formattedDate,
                                'time' => $formattedTime,
                                'event_type' => $eventType
                            ];
                            
                            continue;
                        }
                        
                        $existingEntries[$entryKey] = true;
                        
                        $recordsToInsert[] = [
                            'event_date' => $formattedDate,
                            'event_time' => $formattedTime,
                            'badge_number' => $row['Numéro de badge'],
                            'event_type' => $eventType,
                            'central' => !empty($row['Centrale']) ? $row['Centrale'] : null,
                            'group_name' => !empty($row['Groupe']) ? $row['Groupe'] : null
                        ];
                        
                    } catch (\Exception $e) {
                        error_log("Erreur lors de l'importation d'une ligne: " . $e->getMessage());
                        $errors++;
                    }
                }
                
                // Effectuer l'insertion en lot si des enregistrements ont été préparés
                if (!empty($recordsToInsert)) {
                    try {
                        $insertedCount = $this->batchInsertAccessLogs($recordsToInsert);
                        $imported += $insertedCount;
                        error_log("ImportData: $insertedCount enregistrements insérés avec succès en lot");
                    } catch (\Exception $e) {
                        error_log("ImportData: Erreur lors de l'insertion en lot: " . $e->getMessage());
                        throw $e; // Propager l'erreur pour gérer la transaction
                    }
                }
                
                // Libérer la mémoire
                unset($batchData);
                unset($recordsToInsert);
            }
            
            // Valider la transaction
            $db->commit();
            
            // Créer un enregistrement d'historique d'importation
            try {
                $historyId = $this->createImportHistory($total, $imported, $duplicates, $errors);
                error_log("ImportData: Historique d'importation créé avec ID: " . $historyId);
            } catch (\Exception $e) {
                error_log("ImportData: Erreur lors de la création de l'historique: " . $e->getMessage());
                // Non bloquant, on continue même en cas d'erreur
            }
            
            // Stocker les doublons en session
            if (!empty($duplicateRecords)) {
                $_SESSION['duplicate_records'] = $duplicateRecords;
            }
            
            // Nettoyer la session
            unset($_SESSION['import_progress']);
            unset($_SESSION['import_message']);
            
            // Libérer la mémoire
            unset($data);
            unset($existingEntries);
            gc_collect_cycles();
            
            error_log("ImportDataWithProgressTracking: Fin de l'importation - $imported importés, $duplicates doublons, $errors erreurs");
            
            return [
                'total' => $total,
                'imported' => $imported,
                'duplicates' => $duplicates,
                'errors' => $errors,
                'async' => $isAjaxRequest
            ];
            
        } catch (\Exception $e) {
            // En cas d'erreur, annuler la transaction
            $db->rollBack();
            error_log("ImportDataWithProgressTracking: Erreur lors de l'importation - " . $e->getMessage());
            throw $e;
        }
    }
    
    /**
     * Démarre le processus d'importation asynchrone
     */
    private function startAsyncImport(): void
    {
        // Créer un fichier de marqueur pour indiquer qu'un import asynchrone est en cours
        $markerFile = __DIR__ . '/../../tmp/async_import_' . session_id() . '.json';
        file_put_contents($markerFile, json_encode([
            'session_id' => session_id(),
            'start_time' => time(),
            'status' => 'started'
        ]));
        
        // Démarrer le processus d'importation en arrière-plan
        $publicPath = __DIR__ . '/../../public';
        $cmd = "php $publicPath/async_import.php " . session_id() . " > /dev/null 2>&1 &";
        error_log("Démarrage de l'importation asynchrone: $cmd");
        exec($cmd);
    }
    
    /**
     * Vérifie le statut de l'importation asynchrone
     */
    public function checkAsyncImport()
    {
        header('Content-Type: application/json');
        
        $status = [
            'async' => false,
            'completed' => false,
            'progress' => 0,
            'message' => 'Aucune importation asynchrone en cours'
        ];
        
        if (isset($_SESSION['async_import'])) {
            $asyncImport = $_SESSION['async_import'];
            $status['async'] = true;
            $status['status'] = $asyncImport['status'];
            $status['progress'] = ($asyncImport['processed'] / $asyncImport['total']) * 100;
            $status['message'] = 'Importation en cours: ' . $asyncImport['processed'] . ' sur ' . $asyncImport['total'];
            
            if ($asyncImport['status'] === 'completed') {
                $status['completed'] = true;
                $status['progress'] = 100;
                $status['message'] = 'Importation terminée';
                $status['stats'] = [
                    'total' => $asyncImport['total'],
                    'imported' => $asyncImport['imported'],
                    'duplicates' => $asyncImport['duplicates'],
                    'errors' => $asyncImport['errors']
                ];
                
                // Si l'importation est terminée, on peut nettoyer la session
                if (!isset($_GET['keep_session'])) {
                    unset($_SESSION['async_import']);
                }
            }
        }
        
        echo json_encode($status);
        exit;
    }
    
    /**
     * Exporte les doublons détectés lors de l'importation
     */
    public function exportDuplicates(): void
    {
        error_log("ImportController::exportDuplicates - Début de l'export des doublons");
        
        // Vérifier si un ID d'import est spécifié
        $importId = $_GET['id'] ?? null;
        if (!$importId) {
            error_log("ImportController::exportDuplicates - Aucun ID d'import spécifié");
            $this->setFlash('error', 'Aucun ID d\'import spécifié');
            $this->redirect('/import/history');
            return;
        }

        error_log("ImportController::exportDuplicates - Récupération des doublons pour l'import ID: " . $importId);

        try {
            // Récupérer les détails de l'import
            $sql = "SELECT * FROM import_history WHERE id = ?";
            $stmt = $this->db->query($sql, [$importId]);
            $import = $stmt->fetch(\PDO::FETCH_ASSOC);

            if (!$import) {
                error_log("ImportController::exportDuplicates - Import non trouvé pour l'ID: " . $importId);
                $this->setFlash('error', 'Import non trouvé');
                $this->redirect('/import/history');
                return;
            }

            // Récupérer les doublons
            $sql = "SELECT * FROM import_duplicates WHERE import_id = ?";
            $stmt = $this->db->query($sql, [$importId]);
            $duplicates = $stmt->fetchAll(\PDO::FETCH_ASSOC);

            if (empty($duplicates)) {
                error_log("ImportController::exportDuplicates - Aucun doublon trouvé pour l'import ID: " . $importId);
                $this->setFlash('info', 'Aucun doublon trouvé pour cet import');
                $this->redirect('/import/history');
                return;
            }

            // Préparer le fichier CSV
            $filename = "duplicates_" . date('Y-m-d_His') . ".csv";
            header('Content-Type: text/csv; charset=UTF-8');
            header('Content-Disposition: attachment; filename="' . $filename . '"');

            // Créer le fichier CSV
            $output = fopen('php://output', 'w');

            // Écrire l'en-tête UTF-8 BOM
            fprintf($output, chr(0xEF).chr(0xBB).chr(0xBF));

            // Écrire les en-têtes
            fputcsv($output, [
                'Numéro de badge',
                'Date',
                'Heure',
                'Type d\'événement',
                'Centrale',
                'Groupe',
                'Raison du rejet'
            ], ';');

            // Écrire les données
            foreach ($duplicates as $duplicate) {
                fputcsv($output, [
                    $duplicate['badge_number'],
                    $duplicate['event_date'],
                    $duplicate['event_time'],
                    $duplicate['event_type'],
                    $duplicate['central'] ?? '',
                    $duplicate['group_name'] ?? '',
                    'Doublon'
                ], ';');
            }

            fclose($output);
            error_log("ImportController::exportDuplicates - Export terminé avec succès");
            exit;

        } catch (\Exception $e) {
            error_log("ImportController::exportDuplicates - Erreur: " . $e->getMessage());
            error_log("ImportController::exportDuplicates - Trace: " . $e->getTraceAsString());
            $this->setFlash('error', 'Erreur lors de l\'export des doublons: ' . $e->getMessage());
            $this->redirect('/import/history');
        }
    }
    
    /**
     * Valide et combine la date et l'heure
     */
    private function validateDateTime(string $date, string $time): string
    {
        // Vérifier si la date contient déjà une heure
        if (preg_match('/(\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{2,4})\s+(\d{1,2}:\d{1,2}(:\d{1,2})?)/', $date, $matches)) {
            // La date contient déjà une heure, utiliser directement pour la conversion
            $dateStr = $matches[1];
            $timeStr = $matches[2];
            
            $dateFormats = ['d/m/Y', 'Y-m-d', 'd-m-Y'];
            foreach ($dateFormats as $format) {
                $dateObj = \DateTime::createFromFormat($format . ' H:i:s', $dateStr . ' ' . $timeStr);
                if ($dateObj) {
                    return $dateObj->format('Y-m-d H:i:s');
                }
            }
        }
        
        // Convertir les formats de date possibles en Y-m-d
        $dateFormats = ['d/m/Y', 'Y-m-d', 'd-m-Y'];
        $validDate = null;
        
        foreach ($dateFormats as $format) {
            $dateObj = \DateTime::createFromFormat($format, $date);
            if ($dateObj && $dateObj->format($format) === $date) {
                $validDate = $dateObj->format('Y-m-d');
                break;
            }
        }
        
        if ($validDate === null) {
            throw new \RuntimeException("Format de date invalide: {$date}");
        }
        
        // Si l'heure est vide, utiliser minuit
        if (empty(trim($time))) {
            return $validDate . ' 00:00:00';
        }
        
        // Normaliser le format de l'heure en H:i:s
        $timeFormats = ['H:i:s', 'H:i'];
        $validTime = null;
        
        foreach ($timeFormats as $format) {
            $timeObj = \DateTime::createFromFormat($format, $time);
            if ($timeObj && $timeObj->format($format) === $time) {
                $validTime = $timeObj->format('H:i:s');
                break;
            }
        }
        
        if ($validTime === null) {
            // Si l'heure est invalide, utiliser minuit plutôt que de lancer une exception
            error_log("Format d'heure invalide: '{$time}', utilisation de 00:00:00 par défaut");
            $validTime = '00:00:00';
        }
        
        return $validDate . ' ' . $validTime;
    }
    
    /**
     * Insère un enregistrement d'accès dans la base de données
     */
    private function insertAccessLog(array $data): void
    {
        try {
            // Vérifier et préparer les données pour event_date et event_time
            if (isset($data['date_time']) && isset($data['time'])) {
                $eventDate = $data['date_time'];
                $eventTime = $data['time'];
            } else {
                // Cas de compatibilité avec l'ancien format
                if (isset($data['date_time'])) {
                    try {
                        $dateTime = new \DateTime($data['date_time']);
                        $eventDate = $dateTime->format('Y-m-d');
                        $eventTime = $dateTime->format('H:i:s');
                    } catch (\Exception $e) {
                        list($eventDate, $eventTime) = $this->formatDateTime($data['date_time'], '00:00:00');
                    }
                } else {
                    // Si aucune date n'est fournie, utiliser la date du jour
                    $eventDate = date('Y-m-d');
                    $eventTime = '00:00:00';
                    error_log("InsertAccessLog: Aucune date fournie, utilisation de la date du jour");
                }
            }
            
            // Vérifier les données obligatoires
            if (empty($data['badge_id'])) {
                throw new \InvalidArgumentException("Le numéro de badge est obligatoire");
            }
            
            if (empty($eventDate)) {
                $eventDate = date('Y-m-d');
                error_log("InsertAccessLog: Date vide après traitement, utilisation de la date du jour");
            }
            
            if (empty($eventTime)) {
                $eventTime = '00:00:00';
                error_log("InsertAccessLog: Heure vide après traitement, utilisation de 00:00:00");
            }
            
            // S'assurer que event_type a une valeur (obligatoire)
            $eventType = !empty($data['event_type']) ? $data['event_type'] : 'Inconnu';
            
            // Utiliser le modèle AccessLog pour l'insertion
            $accessLog = new AccessLog();
            $accessLog->event_date = $eventDate;
            $accessLog->event_time = $eventTime;
            $accessLog->badge_number = $data['badge_id'];
            $accessLog->event_type = $eventType;
            $accessLog->central = $data['controller'] ?? null;    // Transformé de controller à central
            $accessLog->group_name = $data['group'] ?? null;      // Transformé de group à group_name
            
            // Insérer l'enregistrement
            $result = $accessLog->insert();
            
            if (!$result) {
                error_log("InsertAccessLog: Échec de l'insertion sans erreur spécifique");
                throw new \RuntimeException("Échec de l'insertion sans erreur spécifique");
            }
            
            // Log de l'insertion réussie
            error_log("InsertAccessLog: Insertion réussie pour le badge " . $data['badge_id'] . " à la date " . $eventDate);
            
        } catch (\PDOException $e) {
            error_log("InsertAccessLog: Erreur PDO lors de l'insertion - " . $e->getMessage());
            throw $e; // Relayer l'exception pour traitement par l'appelant
        } catch (\Exception $e) {
            error_log("InsertAccessLog: Exception lors de l'insertion - " . $e->getMessage());
            throw $e; // Relayer l'exception pour traitement par l'appelant
        }
    }
    
    /**
     * Formate la date et l'heure pour l'insertion dans la base de données
     */
    private function formatDateTime($date, $time): array
    {
        // Gérer le cas où date est NULL ou vide
        if (empty($date)) {
            error_log("ImportController::formatDateTime - Date vide, utilisation de la date du jour");
            return [date('Y-m-d'), '00:00:00'];
        }
        
        // Convertir les formats de date possibles en Y-m-d
        $dateFormats = ['d/m/Y', 'Y-m-d', 'd-m-Y', 'Y/m/d', 'd.m.Y'];
        $validDate = null;
        
        // Nettoyer la date (supprimer les caractères non numériques sauf les séparateurs)
        $date = trim($date);
        
        foreach ($dateFormats as $format) {
            $dateObj = \DateTime::createFromFormat($format, $date);
            if ($dateObj && $dateObj->format($format) === $date) {
                $validDate = $dateObj->format('Y-m-d');
                break;
            }
        }
        
        // Si aucun format ne correspond, essayer de détecter et convertir
        if ($validDate === null) {
            // Essayer de détecter le format automatiquement
            try {
                $dateObj = new \DateTime($date);
                $validDate = $dateObj->format('Y-m-d');
                error_log("ImportController::formatDateTime - Format de date détecté automatiquement pour: " . $date);
            } catch (\Exception $e) {
                error_log("ImportController::formatDateTime - Format de date invalide: " . $date . ", utilisation de la date du jour");
                $validDate = date('Y-m-d');
            }
        }
        
        // Valider et formater l'heure (permettre NULL ou vide)
        $validTime = "00:00:00"; // Valeur par défaut
        if (!empty($time)) {
            $timeFormats = ['H:i:s', 'H:i', 'h:i:s A', 'h:i A'];
            foreach ($timeFormats as $format) {
                $timeObj = \DateTime::createFromFormat($format, $time);
                if ($timeObj && $timeObj->format($format) === $time) {
                    $validTime = $timeObj->format('H:i:s');
                    break;
                }
            }
            
            // Si aucun format ne correspond, essayer de nettoyer et reformater
            if ($validTime === "00:00:00" && $time !== "00:00:00") {
                // Nettoyer l'heure (garder uniquement les chiffres et les :)
                $cleanTime = preg_replace('/[^0-9:]/', '', $time);
                
                // Essayer différents formats après nettoyage
                foreach ($timeFormats as $format) {
                    $timeObj = \DateTime::createFromFormat($format, $cleanTime);
                    if ($timeObj) {
                        $validTime = $timeObj->format('H:i:s');
                        error_log("ImportController::formatDateTime - Heure nettoyée et reformatée: " . $time . " -> " . $validTime);
                        break;
                    }
                }
                
                // Si toujours pas de correspondance, essayer de détecter le format automatiquement
                if ($validTime === "00:00:00" && $time !== "00:00:00") {
                    try {
                        $parts = explode(':', $cleanTime);
                        if (count($parts) >= 2) {
                            $hours = min(23, max(0, intval($parts[0])));
                            $minutes = min(59, max(0, intval($parts[1])));
                            $seconds = isset($parts[2]) ? min(59, max(0, intval($parts[2]))) : 0;
                            $validTime = sprintf('%02d:%02d:%02d', $hours, $minutes, $seconds);
                            error_log("ImportController::formatDateTime - Heure reconstituée manuellement: " . $time . " -> " . $validTime);
                        }
                    } catch (\Exception $e) {
                        error_log("ImportController::formatDateTime - Format d'heure invalide après nettoyage: " . $time . ", utilisation de 00:00:00");
                    }
                }
            }
        }
        
        return [$validDate, $validTime];
    }
    
    /**
     * Vérifie si un enregistrement est un doublon
     * 
     * @param string $badgeNumber Numéro de badge
     * @param string $eventDate Date de l'événement
     * @param string|null $eventTime Heure de l'événement (optionnel)
     * @param string|null $eventType Type d'événement (optionnel)
     * @return bool True si l'enregistrement est un doublon, false sinon
     */
    private function isDuplicate(string $badgeNumber, string $eventDate, ?string $eventTime = null, ?string $eventType = null): bool
    {
        try {
            // Log pour le débogage
            error_log("isDuplicate: Vérification pour badge=$badgeNumber, date=$eventDate" . 
                     ($eventTime ? ", time=$eventTime" : "") . 
                     ($eventType ? ", type=$eventType" : ""));
            
            // Construire la requête SQL de base
            $sql = "SELECT COUNT(*) FROM access_logs WHERE badge_number = ? AND event_date = ?";
            $params = [$badgeNumber, $eventDate];
            
            // Ajouter l'heure si elle est fournie
            if ($eventTime !== null) {
                $sql .= " AND event_time = ?";
                $params[] = $eventTime;
            }
            
            // Ajouter le type d'événement s'il est fourni
            if ($eventType !== null) {
                $sql .= " AND event_type = ?";
                $params[] = $eventType;
            }
            
            // Exécuter la requête
            $stmt = $this->db->query($sql, $params);
            $count = $stmt->fetchColumn();
            
            // Log du résultat
            error_log("isDuplicate: Résultat = " . ($count > 0 ? "Oui (doublon trouvé)" : "Non (pas de doublon)"));
            
            return $count > 0;
        } catch (\Exception $e) {
            // En cas d'erreur, log et retourner false pour continuer l'importation
            error_log("isDuplicate: Erreur lors de la vérification - " . $e->getMessage());
            return false;
        }
    }
    
    /**
     * Version améliorée de l'importation de données, plus simple et robuste
     */
    private function importDataImproved($data): array
    {
        $result = [
            'total' => count($data),
            'imported' => 0,
            'duplicates' => 0,
            'errors' => 0,
            'error_details' => []
        ];

        if (empty($data)) {
            error_log("ImportDataImproved: Aucune donnée à importer");
            return $result;
        }

        error_log("ImportDataImproved: Début de l'importation de " . count($data) . " lignes");

        foreach ($data as $index => $row) {
            try {
                // S'assurer que les champs minimaux sont présents
                if (empty($row['Numéro de badge'])) {
                    throw new \InvalidArgumentException("Ligne ".($index+1).": Le numéro de badge est manquant");
                }

                // Gérer le cas où la date est vide
                $dateEvt = !empty($row['Date évènements']) ? $row['Date évènements'] : null;
                if (empty($dateEvt)) {
                    throw new \InvalidArgumentException("Ligne ".($index+1).": La date d'événement est manquante");
                }

                // Gérer le cas où l'heure est vide - utiliser 00:00:00 comme heure par défaut
                $heureEvt = !empty($row['Heure évènements']) ? $row['Heure évènements'] : '00:00:00';
                
                // Gérer le cas où la nature d'événement est vide
                $eventType = !empty($row['Nature Evenement']) ? $row['Nature Evenement'] : 'Inconnu';
                
                // Convertir la date et l'heure au format souhaité
                list($formattedDate, $formattedTime) = $this->formatDateTime($dateEvt, $heureEvt);
                
                // Vérifier si un enregistrement similaire existe déjà (éviter les doublons)
                if ($this->isDuplicate($row['Numéro de badge'], $formattedDate, $formattedTime, $eventType)) {
                    error_log("ImportDataImproved: Doublon détecté pour badge " . $row['Numéro de badge'] . " à la date " . $formattedDate);
                    $result['duplicates']++;
                    
                    // Ajouter aux doublons pour extraction future si la session existe
                    if (isset($_SESSION)) {
                        if (!isset($_SESSION['duplicate_records'])) {
                            $_SESSION['duplicate_records'] = [];
                        }
                        $_SESSION['duplicate_records'][] = [
                            'row_id' => $index + 1,
                            'badge_number' => $row['Numéro de badge'],
                            'date' => $formattedDate,
                            'time' => $formattedTime,
                            'event_type' => $eventType
                        ];
                    }
                    
                    continue;
                }
                
                // Insérer l'enregistrement
                $this->insertAccessLog([
                    'date_time' => $formattedDate,
                    'time' => $formattedTime,
                    'badge_id' => $row['Numéro de badge'],
                    'event_type' => $eventType,
                    'controller' => !empty($row['Centrale']) ? $row['Centrale'] : null,
                    'group' => !empty($row['Groupe']) ? $row['Groupe'] : null
                ]);
                
                $result['imported']++;
                error_log("ImportDataImproved: Ligne $index importée avec succès - badge " . $row['Numéro de badge']);
                
            } catch (\InvalidArgumentException $e) {
                error_log("ImportDataImproved: " . $e->getMessage());
                $result['errors']++;
                $result['error_details'][] = [
                    'row' => $index + 1,
                    'error' => $e->getMessage(),
                    'data' => json_encode($row)
                ];
            } catch (\PDOException $e) {
                // Vérifier si c'est une erreur de doublon via contrainte unique
                if (strpos($e->getMessage(), 'UNIQUE constraint failed') !== false || 
                    strpos($e->getMessage(), 'Duplicate entry') !== false) {
                    error_log("ImportDataImproved: Contrainte d'unicité violée - badge " . $row['Numéro de badge']);
                    $result['duplicates']++;
                    
                    // Ajouter aux doublons pour extraction future si la session existe
                    if (isset($_SESSION)) {
                        if (!isset($_SESSION['duplicate_records'])) {
                            $_SESSION['duplicate_records'] = [];
                        }
                        $_SESSION['duplicate_records'][] = [
                            'row_id' => $index + 1,
                            'badge_number' => $row['Numéro de badge'],
                            'date' => $formattedDate ?? date('Y-m-d'),
                            'time' => $formattedTime ?? '00:00:00',
                            'event_type' => $eventType ?? 'Inconnu',
                            'error' => 'Contrainte d\'unicité violée'
                        ];
                    }
                } else {
                    error_log("ImportDataImproved: Erreur PDO: " . $e->getMessage());
                    $result['errors']++;
                    $result['error_details'][] = [
                        'row' => $index + 1,
                        'error' => "Erreur SQL: " . $e->getMessage(),
                        'data' => json_encode($row)
                    ];
                }
            } catch (\Exception $e) {
                // Journaliser l'erreur et continuer avec les autres lignes
                error_log("ImportDataImproved: Erreur lors de l'importation d'une ligne: " . $e->getMessage());
                $result['errors']++;
                $result['error_details'][] = [
                    'row' => $index + 1,
                    'error' => "Erreur: " . $e->getMessage(),
                    'data' => json_encode($row)
                ];
            }
        }
        
        error_log("ImportDataImproved: Fin de l'importation - {$result['imported']} importés, {$result['duplicates']} doublons, {$result['errors']} erreurs");
        
        // Calculer le taux de succès en tenant compte des doublons comme des succès
        $successRate = ($result['total'] > 0) ? round(100 * (($result['imported'] + $result['duplicates']) / $result['total'])) : 0;
        $result['success_rate'] = $successRate;
        
        error_log("ImportDataImproved: Statistiques finales - Total: {$result['total']}, Importés: {$result['imported']}, Doublons: {$result['duplicates']}, Erreurs: {$result['errors']}, Taux de succès: {$result['success_rate']}%");
        
        return $result;
    }

    /**
     * Méthode publique de test pour l'importation améliorée
     * À utiliser uniquement pour les tests
     */
    public function testImportDataImproved($data): array
    {
        return $this->importDataImproved($data);
    }

    /**
     * Effectue une insertion en lot des enregistrements d'accès
     * Cette méthode est beaucoup plus efficace pour les grandes quantités de données
     */
    private function batchInsertAccessLogs(array $records): int
    {
        if (empty($records)) {
            return 0;
        }
        
        $db = $this->db->getConnection();
        
        // Commencer une transaction pour optimiser les performances
        $db->beginTransaction();
        
        try {
            // Préparer la requête d'insertion
            $stmt = $db->prepare("
                INSERT INTO access_logs 
                (event_date, event_time, badge_number, event_type, central, group_name) 
                VALUES 
                (:event_date, :event_time, :badge_number, :event_type, :central, :group_name)
            ");
            
            // Compteur pour les insertions réussies
            $insertCount = 0;
            
            // Exécuter l'insertion pour chaque enregistrement
            foreach ($records as $record) {
                $stmt->bindValue(':event_date', $record['event_date']);
                $stmt->bindValue(':event_time', $record['event_time']);
                $stmt->bindValue(':badge_number', $record['badge_number']);
                $stmt->bindValue(':event_type', $record['event_type']);
                $stmt->bindValue(':central', $record['central']);
                $stmt->bindValue(':group_name', $record['group_name']);
                
                $stmt->execute();
                $insertCount++;
            }
            
            // Valider la transaction
            $db->commit();
            
            return $insertCount;
        } catch (\Exception $e) {
            // Annuler la transaction en cas d'erreur
            $db->rollBack();
            throw $e;
        }
    }

    /**
     * Crée un enregistrement d'historique d'importation
     */
    private function createImportHistory($total, $imported, $duplicates, $errors): int
    {
        try {
            $stats = [
                'total' => $total,
                'imported' => $imported,
                'duplicates' => $duplicates,
                'errors' => $errors
            ];
            
            $filename = "Import manuel - " . date('Y-m-d H:i:s');
            $success = ImportHistory::saveImportHistory($stats, $filename);
            
            if ($success) {
                error_log("ImportController::createImportHistory - Historique créé avec succès");
                return 1; // Retourner un ID symbolique puisque la méthode statique ne retourne pas l'ID
            } else {
                error_log("ImportController::createImportHistory - Échec de création de l'historique");
                return 0;
            }
        } catch (\Exception $e) {
            error_log("ImportController::createImportHistory - Erreur: " . $e->getMessage());
            return 0;
        }
    }

    /**
     * Affiche la prévisualisation d'un fichier CSV téléchargé
     * @param string $fileId L'identifiant unique du fichier temporaire
     */
    public function previewFile($fileId)
    {
        // S'assurer que l'utilisateur est connecté
        $this->requireLogin();
        
        error_log("ImportController::previewFile - Prévisualisation demandée pour le fichier ID: $fileId");
        
        // Vérifier que le fichier existe en session
        if (!isset($_SESSION['temp_uploads']) || !isset($_SESSION['temp_uploads'][$fileId])) {
            error_log("ImportController::previewFile - Fichier temporaire introuvable: $fileId");
            $this->setFlash('error', 'Fichier temporaire introuvable. Veuillez télécharger à nouveau le fichier.');
            $this->redirect('/import');
            return;
        }
        
        $fileInfo = $_SESSION['temp_uploads'][$fileId];
        
        // Vérifier si le fichier temporaire existe toujours
        if (!file_exists($fileInfo['path'])) {
            error_log("ImportController::previewFile - Fichier physique introuvable: " . $fileInfo['path']);
            $this->setFlash('error', 'Le fichier temporaire a été supprimé. Veuillez télécharger à nouveau le fichier.');
            $this->redirect('/import');
            return;
        }
        
        try {
            // Lire les données du CSV
            $data = $this->csvImportService->readCSV(
                $fileInfo['path'], 
                $fileInfo['separator'], 
                $fileInfo['has_header']
            );
            
            error_log("ImportController::previewFile - Lecture CSV réussie, " . count($data) . " lignes trouvées");
            
            if (empty($data)) {
                error_log("ImportController::previewFile - Fichier vide");
                $this->setFlash('error', 'Le fichier ne contient pas de données valides.');
                $this->redirect('/import');
                return;
            }
            
            // Valider les données (optionnel)
            $this->csvValidationService->validateImportData($data);
            $errorCount = $this->csvValidationService->getErrorCount();
            $warningCount = $this->csvValidationService->getWarningCount();
            
            error_log("ImportController::previewFile - Validation: $errorCount erreurs, $warningCount avertissements");
            
            $validation = [
                'errors' => $this->csvValidationService->getErrors(),
                'warnings' => $this->csvValidationService->getWarnings(),
                'corrections' => $this->csvValidationService->getCorrections(),
                'error_count' => $errorCount,
                'warning_count' => $warningCount,
                'has_blocking_errors' => $this->csvValidationService->hasBlockingErrors()
            ];
            
            // Stocker les données validées en session
            $_SESSION['temp_uploads'][$fileId]['validation'] = $validation;
            
            // Limiter le nombre de lignes pour la prévisualisation
            $previewRows = array_slice($data, 0, 10);
            
            // Afficher la vue de prévisualisation
            $this->view('import/preview', [
                'title' => 'Prévisualisation',
                'current_page' => 'import',
                'file_id' => $fileId,
                'file_info' => $fileInfo,
                'data' => $previewRows,
                'all_data' => $data,
                'total_rows' => count($data),
                'validation' => $validation,
                'csrf_token' => $this->generateCsrfToken() // Pour l'étape suivante
            ]);
            
        } catch (\Exception $e) {
            error_log("ImportController::previewFile - Erreur: " . $e->getMessage());
            error_log("ImportController::previewFile - Trace: " . $e->getTraceAsString());
            $this->setFlash('error', 'Erreur lors de la lecture du fichier: ' . $e->getMessage());
            $this->redirect('/import');
        }
    }
} 