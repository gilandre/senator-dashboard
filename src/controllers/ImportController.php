<?php

namespace App\Controllers;

use App\Core\Controller;
use App\Models\AccessLog;
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
            // Vérifier si le formulaire a été soumis
            if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
                $this->redirect('/import');
                return;
            }
            
            // Vérifier si un fichier a été téléchargé
            if (!isset($_FILES['csv_file']) || $_FILES['csv_file']['error'] !== UPLOAD_ERR_OK) {
                $this->setFlash('error', 'Aucun fichier n\'a été téléchargé ou une erreur s\'est produite');
                $this->redirect('/import');
                return;
            }
            
            // Récupérer les options d'importation
            $separator = $_POST['separator'] ?? ';';
            $hasHeader = isset($_POST['has_header']) && $_POST['has_header'] === 'on';
            $validateData = isset($_POST['validate_data']) && $_POST['validate_data'] === 'on';
            
            // Stocker le fichier téléchargé temporairement
            $tempFile = $this->storeTempFile($_FILES['csv_file']);
            
            // Lire le contenu du CSV
            $data = $this->csvImportService->readCSV($tempFile, $separator, $hasHeader);
            
            // Si validation activée, valider les données
            if ($validateData) {
                $this->csvValidationService->validateImportData($data);
                
                // Stocker les résultats de validation en session
                $_SESSION['validation'] = [
                    'errors' => $this->csvValidationService->getErrors(),
                    'warnings' => $this->csvValidationService->getWarnings(),
                    'corrections' => $this->csvValidationService->getCorrections(),
                    'error_count' => $this->csvValidationService->getErrorCount(),
                    'warning_count' => $this->csvValidationService->getWarningCount()
                ];
                
                // Stocker les données en session
                $_SESSION['import_data'] = [
                    'data' => $data,
                    'temp_file' => $tempFile,
                    'separator' => $separator,
                    'has_header' => $hasHeader
                ];
                
                // Vérifier s'il y a des erreurs bloquantes
                if ($this->csvValidationService->hasBlockingErrors()) {
                    $this->setFlash('error', 'Des erreurs ont été détectées dans le fichier. Veuillez les corriger avant de continuer.');
                    $this->redirect('/import');
                    return;
                }
                
                // Rediriger vers la page de validation
                $this->redirect('/import/validate');
                return;
            }
            
            // Si pas de validation, importer directement les données
            $this->importData($data);
            
            // Nettoyer le fichier temporaire
            @unlink($tempFile);
            
            $this->setFlash('success', 'Les données ont été importées avec succès.');
            $this->redirect('/dashboard');
            
        } catch (\Exception $e) {
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
        // Vérifier si des données d'importation existent en session
        if (!isset($_SESSION['import_data'])) {
            $this->setFlash('error', 'Aucune donnée d\'importation disponible.');
            $this->redirect('/import');
            return;
        }
        
        try {
            $importData = $_SESSION['import_data'];
            $data = $importData['data'];
            
            // Si des corrections ont été soumises, les appliquer
            $selectedCorrections = [];
            if (isset($_POST['apply_corrections']) && is_array($_POST['apply_corrections'])) {
                foreach ($_POST['apply_corrections'] as $key => $value) {
                    list($rowId, $field) = explode(':', $key);
                    $selectedCorrections[$rowId][] = $field;
                }
            }
            
            // Appliquer les corrections sélectionnées
            if (isset($_SESSION['validation'])) {
                $data = $this->csvValidationService->applyCorrections($data, $selectedCorrections);
            }
            
            // Début de la transaction
            $this->db->beginTransaction();
            
            // Importer les données
            $this->importData($data);
            
            // Valider la transaction
            $this->db->commit();
            
            // Nettoyer le fichier temporaire et les données de session
            if (isset($importData['temp_file'])) {
                @unlink($importData['temp_file']);
            }
            unset($_SESSION['import_data']);
            unset($_SESSION['validation']);
            
            $this->setFlash('success', 'Les données ont été importées avec succès.');
            $this->redirect('/dashboard');
            
        } catch (\Exception $e) {
            // Annuler la transaction en cas d'erreur
            $this->db->rollBack();
            
            $this->setFlash('error', 'Erreur lors de l\'importation: ' . $e->getMessage());
            $this->redirect('/import/validate');
        }
    }
    
    /**
     * Stocke temporairement le fichier téléchargé
     */
    private function storeTempFile(array $file): string
    {
        $tempDir = sys_get_temp_dir();
        $tempFile = $tempDir . '/' . uniqid('import_', true) . '.csv';
        
        if (!move_uploaded_file($file['tmp_name'], $tempFile)) {
            throw new \RuntimeException('Impossible de déplacer le fichier téléchargé');
        }
        
        return $tempFile;
    }
    
    /**
     * Importe les données dans la base de données
     */
    private function importData(array $data): void
    {
        foreach ($data as $row) {
            // Vérifier que les champs obligatoires sont présents
            if (isset($row['Date évènements']) && isset($row['Heure évènements']) && 
                isset($row['Numéro de badge']) && isset($row['Nature Evenement'])) {
                
                // Fusionner la date et l'heure
                $dateTime = $this->validateDateTime($row['Date évènements'], $row['Heure évènements']);
                
                // Insérer l'accès
                $this->insertAccessLog([
                    'date_time' => $dateTime,
                    'badge_id' => $row['Numéro de badge'],
                    'event_type' => $row['Nature Evenement'],
                    'controller' => $row['Centrale'] ?? null,
                    'reader' => $row['Lecteur'] ?? null,
                    'name' => $row['Nom'] ?? null,
                    'firstname' => $row['Prénom'] ?? null,
                    'status' => $row['Statut'] ?? null,
                    'group' => $row['Groupe'] ?? null
                ]);
            }
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
            throw new \RuntimeException("Format d'heure invalide: {$time}");
        }
        
        return $validDate . ' ' . $validTime;
    }
    
    /**
     * Insère un enregistrement d'accès dans la base de données
     */
    private function insertAccessLog(array $data): void
    {
        // Create a direct SQL insert to bypass AccessLog model
        $sql = "INSERT INTO access_logs (event_date, event_time, badge_number, event_type, central, group_name) 
                VALUES (?, ?, ?, ?, ?, ?)";
        
        // Extract date and time
        $dateTime = new \DateTime($data['date_time']);
        $eventDate = $dateTime->format('Y-m-d');
        $eventTime = $dateTime->format('H:i:s');
        
        // Prepare values
        $values = [
            $eventDate,                      // event_date
            $eventTime,                      // event_time
            $data['badge_id'],               // badge_number
            $data['event_type'],             // event_type
            $data['controller'] ?? null,         // central
            $data['group'] ?? null           // group_name
        ];
        
        // Execute direct SQL query
        $this->db->query($sql, $values);
    }
} 