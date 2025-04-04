<?php

namespace App\Services;

class CsvImportService
{
    private const REQUIRED_COLUMNS = [
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

    public function processFile(string $filePath): array
    {
        if (!file_exists($filePath)) {
            throw new \RuntimeException('Le fichier n\'existe pas');
        }

        $handle = fopen($filePath, 'r');
        if ($handle === false) {
            throw new \RuntimeException('Impossible d\'ouvrir le fichier');
        }

        try {
            // Lecture de l'en-tête
            $header = fgetcsv($handle, 0, ';');
            if ($header === false) {
                throw new \RuntimeException('Le fichier est vide ou mal formaté');
            }

            // Vérification des colonnes requises
            $this->validateColumns($header);

            // Lecture des données
            $data = [];
            $lineNumber = 2; // Commence à 2 car la ligne 1 est l'en-tête

            while (($row = fgetcsv($handle, 0, ';')) !== false) {
                $this->validateRow($row, $lineNumber);
                $data[] = array_combine($header, $row);
                $lineNumber++;
            }

            return $data;

        } finally {
            fclose($handle);
        }
    }

    private function validateColumns(array $header): void
    {
        $missingColumns = array_diff(self::REQUIRED_COLUMNS, $header);
        if (!empty($missingColumns)) {
            throw new \RuntimeException('Colonnes manquantes dans le fichier CSV : ' . 
                implode(', ', $missingColumns));
        }
    }

    private function validateRow(array $row, int $lineNumber): void
    {
        // Vérification du nombre de colonnes
        if (count($row) !== count(self::REQUIRED_COLUMNS)) {
            throw new \RuntimeException("La ligne {$lineNumber} ne contient pas le bon nombre de colonnes");
        }

        // Validation des dates
        $this->validateDate($row[1], 'Date évènements', $lineNumber);
        $this->validateDate($row[10], 'Date de début de validité', $lineNumber);
        $this->validateDate($row[11], 'Date de création', $lineNumber);

        // Validation de l'heure
        $this->validateTime($row[2], 'Heure évènements', $lineNumber);
    }

    private function validateDate(string $date, string $field, int $lineNumber): void
    {
        $timestamp = strtotime($date);
        if ($timestamp === false) {
            throw new \RuntimeException("La date dans le champ '{$field}' à la ligne {$lineNumber} est invalide");
        }
    }

    private function validateTime(string $time, string $field, int $lineNumber): void
    {
        if (!preg_match('/^([01]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/', $time)) {
            throw new \RuntimeException("L'heure dans le champ '{$field}' à la ligne {$lineNumber} est invalide");
        }
    }
} 