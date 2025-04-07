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
        // Supprimer les anciennes données de session si elles existent
        if (isset($_SESSION['import_data'])) {
            unset($_SESSION['import_data']);
        }
        if (isset($_SESSION['validation'])) {
            unset($_SESSION['validation']);
        }
        
        $this->view('import/index', [
            'title' => 'Importation de données',
            'current_page' => 'import'
        ]);
    }
    
    /**
     * Traite le téléchargement du fichier CSV
     */
    public function upload()
    {
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
            
            // Stocker le fichier téléchargé temporairement
            $tempFile = $this->storeTempFile($_FILES['csv_file']);
            error_log("ImportController::upload - Fichier temporaire créé: $tempFile");
            
            // Lire le contenu du CSV
            $data = $this->csvImportService->readCSV($tempFile, $separator, $hasHeader);
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
                    'temp_file' => $tempFile,
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
            $this->importData($data);
            
            // Nettoyer le fichier temporaire
            @unlink($tempFile);
            
            error_log("ImportController::upload - Importation terminée avec succès");
            $this->setFlash('success', 'Les données ont été importées avec succès.');
            $this->redirect('/dashboard');
            
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
        // Vérifier si des données d'importation existent en session
        if (!isset($_SESSION['import_data']) || !isset($_SESSION['validation'])) {
            $this->setFlash('error', 'Aucune donnée d\'importation disponible. Veuillez télécharger un fichier.');
            $this->redirect('/import');
            return;
        }
        
        $data = $_SESSION['import_data']['data'];
        $validation = $_SESSION['validation'];
        
        $this->view('import/validate', [
            'title' => 'Validation des données',
            'current_page' => 'import',
            'data' => $data,
            'errors' => $validation['errors'],
            'warnings' => $validation['warnings'],
            'corrections' => $validation['corrections'],
            'error_count' => $validation['error_count'],
            'warning_count' => $validation['warning_count']
        ]);
    }
    
    /**
     * Traite l'importation finale après validation
     */
    public function process()
    {
        try {
            error_log("ImportController::process - Début du traitement");
            
            // Vérifier si la requête est de type AJAX
            $isAjaxRequest = isset($_SERVER['HTTP_X_REQUESTED_WITH']) && $_SERVER['HTTP_X_REQUESTED_WITH'] == 'XMLHttpRequest';
            error_log("ImportController::process - Est une requête AJAX: " . ($isAjaxRequest ? 'Oui' : 'Non'));
            
            // Vérifier si c'est une requête AJAX pour obtenir la progression
            if (isset($_GET['check_progress'])) {
                error_log("ImportController::process - Vérification de la progression");
                echo json_encode([
                    'progress' => $_SESSION['import_progress'] ?? 0,
                    'status' => $_SESSION['import_status'] ?? 'pending',
                    'message' => $_SESSION['import_message'] ?? 'Initialisation de l\'importation...',
                    'stats' => $_SESSION['import_stats'] ?? null
                ]);
                exit;
            }
            
            // Vérifier si des données d'importation existent en session
            if (!isset($_SESSION['import_data'])) {
                error_log("ImportController::process - Aucune donnée d'importation disponible");
                
                // Pour les requêtes AJAX, retourner une erreur JSON
                if ($isAjaxRequest) {
                    header('Content-Type: application/json');
                    echo json_encode(['success' => false, 'error' => 'Aucune donnée d\'importation disponible']);
                    exit;
                }
                
                $this->setFlash('error', 'Aucune donnée d\'importation disponible.');
                $this->redirect('/import');
                return;
            }
            
            error_log("ImportController::process - Données d'importation trouvées en session");
            
            $importData = $_SESSION['import_data'];
            $tempFile = $importData['temp_file'] ?? null;
            
            // Vérifier que le fichier temporaire existe
            if ($tempFile && !file_exists($tempFile)) {
                error_log("ImportController::process - Fichier temporaire non trouvé: $tempFile");
                
                // Pour les requêtes AJAX, retourner une erreur JSON
                if ($isAjaxRequest) {
                    header('Content-Type: application/json');
                    echo json_encode(['success' => false, 'error' => 'Fichier temporaire non trouvé']);
                    exit;
                }
                
                $this->setFlash('error', 'Fichier temporaire non trouvé.');
                $this->redirect('/import');
                return;
            }
            
            // Initialiser le suivi de progression
            $_SESSION['import_progress'] = 0;
            $_SESSION['import_status'] = 'processing';
            $_SESSION['import_message'] = 'Préparation du fichier...';
            
            // Importer les données
            $data = $importData['data'];
            $totalRows = count($data);
            $importStats = $this->importData($data, true);
            
            // Nettoyer le fichier temporaire
            @unlink($tempFile);
            
            // Enregistrer les statistiques en session pour la page de confirmation
            $_SESSION['import_stats'] = $importStats;
            $_SESSION['import_progress'] = 100;
            $_SESSION['import_status'] = 'completed';
            $_SESSION['import_message'] = 'Importation terminée avec succès!';
            
            // Sauvegarder l'historique d'importation dans la base de données
            $filename = basename($tempFile);
            error_log("ImportController::process - Sauvegarde des statistiques d'importation pour le fichier $filename");
            try {
                ImportHistory::saveImportHistory($importStats, $filename);
                error_log("ImportController::process - Sauvegarde réussie dans import_history");
            } catch (\Exception $e) {
                error_log("ImportController::process - Erreur lors de la sauvegarde dans import_history: " . $e->getMessage());
            }
            
            // Si c'est une requête AJAX, retourner une réponse JSON
            if ($isAjaxRequest) {
                header('Content-Type: application/json');
                echo json_encode([
                    'success' => true,
                    'stats' => $importStats,
                    'progress' => 100,
                    'status' => 'completed',
                    'message' => 'Importation terminée avec succès!'
                ]);
                exit;
            }
            
            // Rediriger vers la page de confirmation
            $this->redirect('/import/confirmation');
            
        } catch (\Exception $e) {
            error_log("ImportController::process - Erreur: " . $e->getMessage());
            error_log("ImportController::process - Trace: " . $e->getTraceAsString());
            
            // Mettre à jour le statut de progression en cas d'erreur
            $_SESSION['import_status'] = 'error';
            $_SESSION['import_message'] = 'Erreur: ' . $e->getMessage();
            
            // Si c'est une requête AJAX, retourner une réponse JSON
            if (isset($isAjaxRequest) && $isAjaxRequest) {
                header('Content-Type: application/json');
                echo json_encode([
                    'success' => false,
                    'error' => $e->getMessage(),
                    'status' => 'error',
                    'message' => 'Erreur: ' . $e->getMessage()
                ]);
                exit;
            }
            
            $this->setFlash('error', 'Erreur lors de l\'importation: ' . $e->getMessage());
            $this->redirect('/import');
        }
    }
    
    /**
     * Affiche la page de confirmation après importation réussie
     */
    public function confirmation()
    {
        // Vérifier si des statistiques d'importation existent en session
        if (!isset($_SESSION['import_stats'])) {
            $this->setFlash('error', 'Aucune statistique d\'importation disponible.');
            $this->redirect('/import');
            return;
        }
        
        $stats = $_SESSION['import_stats'];
        
        $this->view('import/confirmation', [
            'title' => 'Importation terminée',
            'current_page' => 'import',
            'stats' => $stats
        ]);
    }
    
    /**
     * Termine l'importation et nettoie les données de session
     */
    public function finish()
    {
        // Nettoyer les données de session
        unset($_SESSION['import_data']);
        unset($_SESSION['validation']);
        unset($_SESSION['import_stats']);
        unset($_SESSION['import_progress']);
        unset($_SESSION['import_status']);
        unset($_SESSION['import_message']);
        
        // Définir un message
        $this->setFlash('success', 'Les données d\'importation ont été nettoyées.');
        
        // Rediriger vers la page d'importation
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
        $tempDir = __DIR__ . '/../../tmp';
        if (!is_dir($tempDir)) {
            mkdir($tempDir, 0777, true);
        }
        $tempFile = $tempDir . '/' . uniqid('import_', true) . '.csv';
        
        if (!move_uploaded_file($file['tmp_name'], $tempFile)) {
            throw new \RuntimeException('Impossible de déplacer le fichier téléchargé');
        }
        
        return $tempFile;
    }
    
    /**
     * Importe les données dans la base de données
     */
    private function importData(array $data, bool $isAjaxRequest = false): array
    {
        $total = count($data);
        $imported = 0;
        $duplicates = 0;
        $errors = 0;
        
        error_log("ImportDataWithProgressTracking: Début de l'importation de $total lignes");
        
        foreach ($data as $index => $row) {
            try {
                // Mettre à jour la progression
                $_SESSION['import_progress'] = (int)(($index + 1) / $total * 90);
                $_SESSION['import_message'] = 'Importation ' . ($index + 1) . ' sur ' . $total . '...';
                
                // Vérifier que les champs minimaux sont présents et non vides
                if (empty($row['Numéro de badge'])) {
                    error_log("ImportData: Numéro de badge manquant, ligne ignorée");
                    $errors++;
                    continue; // Ignorer cette ligne
                }
                
                // Gérer le cas où la date est vide
                $dateEvt = !empty($row['Date évènements']) ? $row['Date évènements'] : null;
                if (empty($dateEvt)) {
                    error_log("ImportData: Date évènements manquante, ligne ignorée");
                    $errors++;
                    continue; // Ignorer cette ligne
                }
                
                // Gérer le cas où l'heure est vide - utiliser 00:00:00 comme heure par défaut
                $heureEvt = !empty($row['Heure évènements']) ? $row['Heure évènements'] : '00:00:00';
                
                // Gérer le cas où la nature d'événement est vide
                $eventType = !empty($row['Nature Evenement']) ? $row['Nature Evenement'] : 'Inconnu';
                
                // Convertir la date et l'heure au format souhaité
                list($formattedDate, $formattedTime) = $this->formatDateTime($dateEvt, $heureEvt);
                
                // Vérifier si un enregistrement similaire existe déjà (éviter les doublons)
                $sql = "SELECT COUNT(*) FROM access_logs WHERE 
                        badge_number = ? AND 
                        event_date = ? AND 
                        event_time = ? AND 
                        event_type = ?";
                
                $stmt = $this->db->query($sql, [
                    $row['Numéro de badge'],
                    $formattedDate,
                    $formattedTime,
                    $eventType
                ]);
                
                if ($stmt->fetchColumn() > 0) {
                    error_log("ImportData: Doublon détecté pour badge " . $row['Numéro de badge'] . " à la date " . $formattedDate);
                    $duplicates++;
                    continue;
                }
                
                // Insérer l'accès avec gestion des champs vides
                try {
                    $this->insertAccessLog([
                        'date_time' => $formattedDate,
                        'time' => $formattedTime,
                        'badge_id' => $row['Numéro de badge'],
                        'event_type' => $eventType,
                        'controller' => !empty($row['Centrale']) ? $row['Centrale'] : null,
                        'group' => !empty($row['Groupe']) ? $row['Groupe'] : null
                    ]);
                    $imported++;
                    error_log("ImportData: Ligne $index importée avec succès - badge " . $row['Numéro de badge']);
                } catch (\PDOException $e) {
                    // Vérifier si c'est une erreur de doublon via contrainte unique
                    if (strpos($e->getMessage(), 'UNIQUE constraint failed') !== false) {
                        error_log("ImportData: Contrainte d'unicité violée - badge " . $row['Numéro de badge']);
                        $duplicates++;
                    } else {
                        error_log("ImportData: Erreur PDO: " . $e->getMessage());
                        throw $e; // Relancer pour d'autres erreurs
                    }
                }
            } catch (\Exception $e) {
                // Journaliser l'erreur et continuer avec les autres lignes
                error_log("Erreur lors de l'importation d'une ligne: " . $e->getMessage());
                $errors++;
            }
        }
        
        error_log("ImportDataWithProgressTracking: Fin de l'importation - $imported importés, $duplicates doublons, $errors erreurs");
        
        return [
            'total' => $total,
            'imported' => $imported,
            'duplicates' => $duplicates,
            'errors' => $errors
        ];
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
                $eventDate = null;
                $eventTime = null;
            }
        }
        
        // Utiliser le modèle AccessLog pour l'insertion
        $accessLog = new AccessLog();
        $accessLog->event_date = $eventDate;
        $accessLog->event_time = $eventTime;
        $accessLog->badge_number = $data['badge_id'] ?? null;
        $accessLog->event_type = $data['event_type'] ?? null;
        $accessLog->central = $data['controller'] ?? null;    // Transformé de controller à central
        $accessLog->group_name = $data['group'] ?? null;      // Transformé de group à group_name
        
        // Insérer l'enregistrement
        $accessLog->insert();
    }
    
    /**
     * Formate la date et l'heure pour l'insertion dans la base de données
     */
    private function formatDateTime($date, $time): array
    {
        // Gérer le cas où date ou time sont NULL
        if (empty($date)) {
            return [null, null];
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
            throw new \RuntimeException('Format de date invalide: ' . $date);
        }
        
        // Valider et formater l'heure (permettre NULL ou vide)
        $validTime = "00:00:00"; // Valeur par défaut
        if (!empty($time)) {
            $timeFormats = ['H:i:s', 'H:i'];
            foreach ($timeFormats as $format) {
                $timeObj = \DateTime::createFromFormat($format, $time);
                if ($timeObj && $timeObj->format($format) === $time) {
                    $validTime = $timeObj->format('H:i:s');
                    break;
                }
            }
        }
        
        return [$validDate, $validTime];
    }
} 