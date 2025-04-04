<?php

namespace App\Controllers;

use App\Core\Database;
use App\Services\CsvImportService;
use App\Services\ValidationService;
use App\Core\Controller;

class ImportController extends Controller
{
    private CsvImportService $csvService;
    private ValidationService $validationService;
    private Database $database;
    private $db;

    public function __construct()
    {
        parent::__construct();
        $this->database = Database::getInstance();
        $this->csvService = new CsvImportService();
        $this->validationService = new ValidationService();
        $this->db = Database::getInstance()->getConnection();
    }

    public function index(): void
    {
        include __DIR__ . '/../views/import/index.php';
    }

    public function upload(): void
    {
        try {
            if (!isset($_FILES['csv_file'])) {
                throw new \RuntimeException('Aucun fichier n\'a été uploadé');
            }

            $file = $_FILES['csv_file'];
            
            // Validation du fichier
            $this->validationService->validateFile($file);

            // Traitement du fichier CSV
            $data = $this->csvService->processFile($file['tmp_name']);

            // Début de la transaction
            $this->database->beginTransaction();

            // Insertion des données dans la base
            foreach ($data as $row) {
                $this->insertAccessLog($row);
            }

            // Commit de la transaction
            $this->database->commit();

            $_SESSION['success'] = 'Le fichier a été importé avec succès';
            header('Location: /import');
            exit;

        } catch (\Exception $e) {
            // Rollback en cas d'erreur
            if ($this->database->inTransaction()) {
                $this->database->rollBack();
            }

            $_SESSION['error'] = $e->getMessage();
            header('Location: /import');
            exit;
        }
    }

    private function insertAccessLog(array $row): void
    {
        $sql = "INSERT INTO access_logs (
            badge_number, event_date, event_time, central, reader,
            event_type, first_name, last_name, status, group_name,
            validity_start_date, creation_date
        ) VALUES (
            ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?,
            ?, ?
        )";

        $this->database->query($sql, [
            $row['Numéro de badge'],
            date('Y-m-d', strtotime($row['Date évènements'])),
            $row['Heure évènements'],
            $row['Centrale'],
            $row['Lecteur'],
            $row['Nature Evenement'],
            $row['Prénom'],
            $row['Nom'],
            $row['Statut'],
            $row['Groupe'],
            date('Y-m-d', strtotime($row['Date de début de validité'])),
            date('Y-m-d', strtotime($row['Date de création']))
        ]);
    }
} 