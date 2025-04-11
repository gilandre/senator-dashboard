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

        return $this->database->fetchAll($sql, $params);
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

        return $this->database->fetchAll($sql, [$date]);
    }

    public function getAvailableStatuses(): array
    {
        $sql = "SELECT DISTINCT status FROM access_logs WHERE status IS NOT NULL ORDER BY status";
        return array_column($this->database->fetchAll($sql), 'status');
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
            COALESCE(AVG(TIMESTAMPDIFF(SECOND, first_entry, last_entry)) / 3600, 0) as avg_duration_hours
        FROM daily_stats
        GROUP BY status
        ORDER BY status";

        return $this->database->fetchAll($sql, [$startDate, $endDate]);
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

        return $this->database->fetchAll($sql, [$startDate, $endDate]);
    }

    public function getStatusPeakHours(string $startDate, string $endDate): array
    {
        $sql = "SELECT 
                    HOUR(event_time) as hour,
                    status,
                    COUNT(DISTINCT badge_number) as total_people,
                    COUNT(CASE WHEN event_type = 'Utilisateur accepté' THEN 1 END) as total_entries
                FROM access_logs 
                WHERE event_date BETWEEN ? AND ?
                AND status IS NOT NULL
                GROUP BY HOUR(event_time), status
                ORDER BY hour, status";

        return $this->database->fetchAll($sql, [$startDate, $endDate]);
    }

    /**
     * Génère un rapport détaillé sur les heures de travail
     * 
     * @param string $startDate Date de début au format Y-m-d
     * @param string $endDate Date de fin au format Y-m-d
     * @param string|null $group Groupe à filtrer (optionnel)
     * @return array Données du rapport
     */
    public function generateWorkingHoursReport(string $startDate, string $endDate, ?string $group = null): array
    {
        $params = [$startDate, $endDate];
        $groupCondition = '';
        
        if ($group) {
            $groupCondition = 'AND group_name = ?';
            $params[] = $group;
        }

        $sql = "WITH daily_entries AS (
                    SELECT
                        badge_number,
                        first_name,
                        last_name,
                        group_name,
                        event_date,
                        MIN(CASE WHEN event_type = 'Utilisateur accepté' THEN TIME(event_time) END) as first_entry,
                        MAX(CASE WHEN event_type = 'Utilisateur accepté' THEN TIME(event_time) END) as last_exit,
                        TIMEDIFF(
                            MAX(CASE WHEN event_type = 'Utilisateur accepté' THEN event_time END),
                            MIN(CASE WHEN event_type = 'Utilisateur accepté' THEN event_time END)
                        ) as duration
                    FROM access_logs
                    WHERE event_date BETWEEN ? AND ?
                    {$groupCondition}
                    GROUP BY badge_number, first_name, last_name, group_name, event_date
                )
                SELECT
                    badge_number,
                    first_name,
                    last_name,
                    group_name,
                    event_date,
                    first_entry,
                    last_exit,
                    duration,
                    COALESCE(TIME_TO_SEC(duration) / 3600, 0) as hours_worked,
                    CASE
                        WHEN TIME_TO_SEC(duration) / 3600 < 4 THEN '< 4h'
                        WHEN TIME_TO_SEC(duration) / 3600 < 6 THEN '4-6h'
                        WHEN TIME_TO_SEC(duration) / 3600 < 8 THEN '6-8h'
                        WHEN TIME_TO_SEC(duration) / 3600 < 9 THEN '8-9h'
                        ELSE '> 9h'
                    END as duration_category,
                    CASE
                        WHEN TIME(first_entry) < '09:00:00' THEN 'À l''heure'
                        ELSE 'En retard'
                    END as punctuality
                FROM daily_entries
                ORDER BY event_date, group_name, last_name, first_name";

        return $this->database->fetchAll($sql, $params);
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
            case 'workinghours':
                $this->formatWorkingHoursReport($sheet, $data);
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

    /**
     * Formate un rapport d'heures de travail pour Excel
     *
     * @param Worksheet $sheet La feuille Excel à formater
     * @param array $data Les données à inclure dans le rapport
     */
    private function formatWorkingHoursReport(Worksheet $sheet, array $data): void
    {
        // En-têtes
        $sheet->setCellValue('A1', 'Badge');
        $sheet->setCellValue('B1', 'Nom');
        $sheet->setCellValue('C1', 'Prénom');
        $sheet->setCellValue('D1', 'Groupe');
        $sheet->setCellValue('E1', 'Date');
        $sheet->setCellValue('F1', 'Première entrée');
        $sheet->setCellValue('G1', 'Dernière sortie');
        $sheet->setCellValue('H1', 'Durée');
        $sheet->setCellValue('I1', 'Heures');
        $sheet->setCellValue('J1', 'Catégorie');
        $sheet->setCellValue('K1', 'Ponctualité');

        // Style des en-têtes
        $headerStyle = [
            'font' => ['bold' => true],
            'fill' => [
                'fillType' => Fill::FILL_SOLID,
                'startColor' => ['rgb' => 'E2EFDA']
            ]
        ];
        $sheet->getStyle('A1:K1')->applyFromArray($headerStyle);

        // Données
        $row = 2;
        foreach ($data as $record) {
            $sheet->setCellValue('A' . $row, $record['badge_number']);
            $sheet->setCellValue('B' . $row, $record['last_name']);
            $sheet->setCellValue('C' . $row, $record['first_name']);
            $sheet->setCellValue('D' . $row, $record['group_name']);
            $sheet->setCellValue('E' . $row, $record['event_date']);
            $sheet->setCellValue('F' . $row, $record['first_entry']);
            $sheet->setCellValue('G' . $row, $record['last_exit']);
            $sheet->setCellValue('H' . $row, $record['duration']);
            $sheet->setCellValue('I' . $row, round($record['hours_worked'], 2));
            $sheet->setCellValue('J' . $row, $record['duration_category']);
            $sheet->setCellValue('K' . $row, $record['punctuality']);
            
            // Coloration conditionnelle
            if ($record['punctuality'] === 'En retard') {
                $sheet->getStyle('F' . $row)->getFont()->getColor()->setRGB('FF0000');
            }
            
            if ($record['hours_worked'] > 9) {
                $sheet->getStyle('I' . $row)->getFont()->getColor()->setRGB('008800');
            } elseif ($record['hours_worked'] < 7) {
                $sheet->getStyle('I' . $row)->getFont()->getColor()->setRGB('FF8800');
            }
            
            $row++;
        }

        // Ajustement automatique des colonnes
        foreach (range('A', 'K') as $col) {
            $sheet->getColumnDimension($col)->setAutoSize(true);
        }
    }
} 