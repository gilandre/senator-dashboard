<?php

namespace App\Services;

use App\Core\Database;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class ReportService
{
    private Database $database;
    private $db;

    public function __construct()
    {
        $this->database = Database::getInstance();
        $this->db = Database::getInstance()->getConnection();
    }

    public function getDatabase(): Database
    {
        return $this->database;
    }

    public function generateAttendanceReport(string $startDate, string $endDate, ?string $group = null, ?string $status = null): array
    {
        $params = [$startDate, $endDate];
        $conditions = [];
        
        if ($group) {
            $conditions[] = 'group_name = ?';
            $params[] = $group;
        }
        
        if ($status) {
            $conditions[] = 'status = ?';
            $params[] = $status;
        }

        $whereConditions = !empty($conditions) ? 'AND ' . implode(' AND ', $conditions) : '';

        $sql = "SELECT 
                    badge_number,
                    first_name,
                    last_name,
                    group_name,
                    status,
                    COUNT(CASE WHEN event_type = 'Utilisateur accepté' THEN 1 END) as total_entries,
                    COUNT(CASE WHEN event_type = 'Utilisateur inconnu' THEN 1 END) as failed_attempts,
                    MIN(CASE WHEN event_type = 'Utilisateur accepté' THEN TIME(event_time) END) as first_entry,
                    MAX(CASE WHEN event_type = 'Utilisateur accepté' THEN TIME(event_time) END) as last_exit
                FROM access_logs 
                WHERE event_date BETWEEN ? AND ?
                {$whereConditions}
                GROUP BY badge_number, first_name, last_name, group_name, status
                ORDER BY status, group_name, last_name, first_name";

        return $this->database->query($sql, $params)->fetchAll();
    }

    public function generateLocationReport(string $date): array
    {
        $sql = "SELECT 
                    central,
                    COUNT(DISTINCT badge_number) as unique_visitors,
                    COUNT(CASE WHEN event_type = 'Utilisateur accepté' THEN 1 END) as total_entries,
                    COUNT(CASE WHEN event_type = 'Utilisateur inconnu' THEN 1 END) as failed_attempts
                FROM access_logs 
                WHERE event_date = ?
                GROUP BY central
                ORDER BY total_entries DESC";

        return $this->database->query($sql, [$date])->fetchAll();
    }

    public function getAvailableStatuses(): array
    {
        $sql = "SELECT DISTINCT status FROM access_logs WHERE status IS NOT NULL ORDER BY status";
        return array_column($this->database->query($sql)->fetchAll(), 'status');
    }

    public function getStatusStatistics(string $startDate, string $endDate): array
    {
        $sql = "WITH daily_stats AS (
            SELECT 
                status,
                event_date,
                COUNT(DISTINCT badge_number) as daily_people,
                COUNT(CASE WHEN event_type = 'Utilisateur accepté' THEN 1 END) as daily_entries,
                COUNT(CASE WHEN event_type = 'Utilisateur rejeté' THEN 1 END) as daily_rejected,
                MIN(CASE WHEN event_type = 'Utilisateur accepté' THEN event_time END) as first_entry,
                MAX(CASE WHEN event_type = 'Utilisateur accepté' THEN event_time END) as last_entry
            FROM access_logs
            WHERE event_date BETWEEN ? AND ?
            AND status IS NOT NULL
            GROUP BY status, event_date
        )
        SELECT 
            status,
            COUNT(DISTINCT daily_people) as total_people,
            SUM(daily_entries) as total_entries,
            SUM(daily_rejected) as total_rejected,
            AVG(TIMESTAMPDIFF(SECOND, first_entry, last_entry)) / 3600 as avg_duration_hours
        FROM daily_stats
        GROUP BY status
        ORDER BY status";

        return $this->database->query($sql, [$startDate, $endDate])->fetchAll();
    }

    public function getStatusAttendanceByDay(string $startDate, string $endDate): array
    {
        $sql = "SELECT 
                    event_date,
                    status,
                    COUNT(DISTINCT badge_number) as total_people,
                    COUNT(CASE WHEN event_type = 'Utilisateur accepté' THEN 1 END) as total_entries
                FROM access_logs 
                WHERE event_date BETWEEN ? AND ?
                AND status IS NOT NULL
                GROUP BY event_date, status
                ORDER BY event_date, status";

        return $this->database->query($sql, [$startDate, $endDate])->fetchAll();
    }

    public function getStatusPeakHours(string $startDate, string $endDate): array
    {
        $sql = "SELECT 
                    status,
                    HOUR(event_time) as hour,
                    COUNT(CASE WHEN event_type = 'Utilisateur accepté' THEN 1 END) as total_entries
                FROM access_logs 
                WHERE event_date BETWEEN ? AND ?
                AND status IS NOT NULL
                GROUP BY status, HOUR(event_time)
                ORDER BY status, hour";

        return $this->database->query($sql, [$startDate, $endDate])->fetchAll();
    }

    public function generateExcelReport(array $data, string $type): string
    {
        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();

        switch ($type) {
            case 'attendance':
                $this->formatAttendanceReport($sheet, $data);
                break;
            case 'location':
                $this->formatLocationReport($sheet, $data);
                break;
            case 'status':
                $this->formatStatusReport($sheet, $data);
                break;
            default:
                throw new \RuntimeException('Type de rapport non supporté');
        }

        // Création du dossier temporaire si nécessaire
        $tempDir = __DIR__ . '/../../storage/temp';
        if (!is_dir($tempDir)) {
            mkdir($tempDir, 0755, true);
        }

        // Génération du nom de fichier unique
        $filename = sprintf(
            '%s/report_%s_%s.xlsx',
            $tempDir,
            $type,
            date('Y-m-d_His')
        );

        // Sauvegarde du fichier
        $writer = new Xlsx($spreadsheet);
        $writer->save($filename);

        return $filename;
    }

    private function formatAttendanceReport(Worksheet $sheet, array $data): void
    {
        // En-têtes
        $sheet->setCellValue('A1', 'Badge');
        $sheet->setCellValue('B1', 'Nom');
        $sheet->setCellValue('C1', 'Prénom');
        $sheet->setCellValue('D1', 'Statut');
        $sheet->setCellValue('E1', 'Groupe');
        $sheet->setCellValue('F1', 'Total entrées');
        $sheet->setCellValue('G1', 'Tentatives échouées');
        $sheet->setCellValue('H1', 'Première entrée');
        $sheet->setCellValue('I1', 'Dernière sortie');

        // Style des en-têtes
        $headerStyle = [
            'font' => ['bold' => true],
            'fill' => [
                'fillType' => Fill::FILL_SOLID,
                'startColor' => ['rgb' => 'E2EFDA']
            ]
        ];
        $sheet->getStyle('A1:I1')->applyFromArray($headerStyle);

        // Données
        $row = 2;
        foreach ($data as $record) {
            $sheet->setCellValue('A' . $row, $record['badge_number']);
            $sheet->setCellValue('B' . $row, $record['last_name']);
            $sheet->setCellValue('C' . $row, $record['first_name']);
            $sheet->setCellValue('D' . $row, $record['status']);
            $sheet->setCellValue('E' . $row, $record['group_name']);
            $sheet->setCellValue('F' . $row, $record['total_entries']);
            $sheet->setCellValue('G' . $row, $record['failed_attempts']);
            $sheet->setCellValue('H' . $row, $record['first_entry']);
            $sheet->setCellValue('I' . $row, $record['last_exit']);
            $row++;
        }

        // Ajustement automatique des colonnes
        foreach (range('A', 'I') as $col) {
            $sheet->getColumnDimension($col)->setAutoSize(true);
        }
    }

    private function formatLocationReport(Worksheet $sheet, array $data): void
    {
        // En-têtes
        $sheet->setCellValue('A1', 'Location');
        $sheet->setCellValue('B1', 'Visiteurs uniques');
        $sheet->setCellValue('C1', 'Total entrées');
        $sheet->setCellValue('D1', 'Tentatives échouées');

        // Style des en-têtes
        $headerStyle = [
            'font' => ['bold' => true],
            'fill' => [
                'fillType' => Fill::FILL_SOLID,
                'startColor' => ['rgb' => 'E2EFDA']
            ]
        ];
        $sheet->getStyle('A1:D1')->applyFromArray($headerStyle);

        // Données
        $row = 2;
        foreach ($data as $record) {
            $sheet->setCellValue('A' . $row, $record['central']);
            $sheet->setCellValue('B' . $row, $record['unique_visitors']);
            $sheet->setCellValue('C' . $row, $record['total_entries']);
            $sheet->setCellValue('D' . $row, $record['failed_attempts']);
            $row++;
        }

        // Ajustement automatique des colonnes
        foreach (range('A', 'D') as $col) {
            $sheet->getColumnDimension($col)->setAutoSize(true);
        }
    }

    private function formatStatusReport(Worksheet $sheet, array $data): void
    {
        // En-têtes
        $sheet->setCellValue('A1', 'Statut');
        $sheet->setCellValue('B1', 'Total personnes');
        $sheet->setCellValue('C1', 'Total entrées');
        $sheet->setCellValue('D1', 'Tentatives échouées');
        $sheet->setCellValue('E1', 'Durée moyenne (heures)');

        // Style des en-têtes
        $headerStyle = [
            'font' => ['bold' => true],
            'fill' => [
                'fillType' => Fill::FILL_SOLID,
                'startColor' => ['rgb' => 'E2EFDA']
            ]
        ];
        $sheet->getStyle('A1:E1')->applyFromArray($headerStyle);

        // Données
        $row = 2;
        foreach ($data as $record) {
            $sheet->setCellValue('A' . $row, $record['status']);
            $sheet->setCellValue('B' . $row, $record['total_people']);
            $sheet->setCellValue('C' . $row, $record['total_entries']);
            $sheet->setCellValue('D' . $row, $record['total_rejected']);
            $sheet->setCellValue('E' . $row, round($record['avg_duration_hours'], 2));
            $row++;
        }

        // Ajustement automatique des colonnes
        foreach (range('A', 'E') as $col) {
            $sheet->getColumnDimension($col)->setAutoSize(true);
        }
    }
} 