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

    /**
     * Lit un fichier CSV et retourne ses données
     */
    public function readCSV(string $filePath, string $separator = ';', bool $hasHeader = true): array
    {
        if (!file_exists($filePath)) {
            throw new \RuntimeException('Le fichier n\'existe pas');
        }

        // S'assurer que le séparateur n'est jamais vide
        if (empty($separator)) {
            error_log("CsvImportService::readCSV - Séparateur vide, utilisation de ';' par défaut");
            $separator = ';';
        }

        // Ouvrir le fichier avec détection du BOM UTF-8
        $content = file_get_contents($filePath);
        
        // Supprimer le BOM UTF-8 si présent
        if (substr($content, 0, 3) === "\xEF\xBB\xBF") {
            $content = substr($content, 3);
            // Réécrire temporairement le fichier sans BOM
            file_put_contents($filePath, $content);
        }
        
        $handle = fopen($filePath, 'r');
        if ($handle === false) {
            throw new \RuntimeException('Impossible d\'ouvrir le fichier');
        }

        try {
            $data = [];
            $lineNumber = 0;
            $header = [];

            // Lire l'en-tête si présent
            if ($hasHeader && ($row = fgetcsv($handle, 0, $separator, '"', '\\')) !== false) {
                // Nettoyer les en-têtes (éliminer espaces, retours à la ligne, etc.)
                $header = array_map(function($column) {
                    // Normaliser le texte en supprimant les espaces et retours chariots
                    $column = trim($column);
                    // Convertir explicitement en UTF-8 si nécessaire
                    if (!mb_check_encoding($column, 'UTF-8')) {
                        $column = mb_convert_encoding($column, 'UTF-8');
                    }
                    return $column;
                }, $row);
                
                $lineNumber++;
                
                // Vérifier les colonnes requises avec tolérance
                try {
                    $this->validateColumns($header);
                } catch (\RuntimeException $e) {
                    // Journaliser l'erreur mais continuer l'importation
                    error_log("Avertissement lors de la validation des colonnes: " . $e->getMessage());
                }
            }

            // Lire les données
            while (($row = fgetcsv($handle, 0, $separator, '"', '\\')) !== false) {
                // Ignorer les lignes vides
                if (count($row) === 1 && empty($row[0])) {
                    continue;
                }
                
                // Si pas d'en-tête, utiliser les colonnes par défaut
                if (!$hasHeader && empty($header)) {
                    // Créer des noms de colonnes dynamiques
                    $header = array_map(function($index) {
                        return "column_" . ($index + 1);
                    }, range(0, count($row) - 1));
                }
                
                // S'assurer que nous avons le bon nombre de colonnes
                if (count($row) > count($header)) {
                    // Truncate row if it has more columns than the header
                    $row = array_slice($row, 0, count($header));
                } elseif (count($row) < count($header)) {
                    // Pad row if it has fewer columns than the header
                    $row = array_pad($row, count($header), '');
                }
                
                // Nettoyer et convertir les données si nécessaire
                $rowCleaned = array_map(function($value) {
                    $value = trim($value);
                    if (!mb_check_encoding($value, 'UTF-8')) {
                        $value = mb_convert_encoding($value, 'UTF-8');
                    }
                    return $value;
                }, $row);
                
                // Associer les valeurs aux noms de colonnes
                $rowData = array_combine($header, $rowCleaned);
                $rowData['row_id'] = $lineNumber;  // Ajout d'un identifiant de ligne
                $data[] = $rowData;
                $lineNumber++;
            }

            if (empty($data)) {
                throw new \RuntimeException('Le fichier ne contient aucune donnée valide');
            }

            return $data;
        } finally {
            fclose($handle);
        }
    }

    /**
     * Traite le fichier CSV et valide son contenu
     */
    public function processFile(string $filePath): array
    {
        $data = $this->readCSV($filePath);
        
        // Validation de chaque ligne
        foreach ($data as $index => $row) {
            $this->validateRow($row, $index + 2); // +2 car ligne 1 = en-tête, et index commence à 0
        }
        
        return $data;
    }

    /**
     * Valide les colonnes du fichier
     */
    public function validateColumns(array $header): void
    {
        // Normaliser les noms des colonnes pour la comparaison
        $normalizedHeader = array_map(function($column) {
            // Convertir en minuscules, supprimer les espaces, accents et autres caractères spéciaux
            $normalized = mb_strtolower(trim($column), 'UTF-8');
            $normalized = preg_replace('/\s+/', '', $normalized); // Supprimer les espaces
            $normalized = iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $normalized); // Supprimer les accents
            return $normalized;
        }, $header);
        
        // Normaliser les colonnes requises de la même manière
        $normalizedRequired = array_map(function($column) {
            $normalized = mb_strtolower(trim($column), 'UTF-8');
            $normalized = preg_replace('/\s+/', '', $normalized);
            $normalized = iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $normalized);
            return $normalized;
        }, self::REQUIRED_COLUMNS);
        
        // Vérifier les correspondances entre les colonnes normalisées
        $missingColumns = [];
        foreach (self::REQUIRED_COLUMNS as $index => $requiredColumn) {
            $normalizedRequired = mb_strtolower(trim($requiredColumn), 'UTF-8');
            $normalizedRequired = preg_replace('/\s+/', '', $normalizedRequired);
            $normalizedRequired = iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $normalizedRequired);
            
            if (!in_array($normalizedRequired, $normalizedHeader)) {
                // Essayer de trouver une correspondance approximative
                $found = false;
                foreach ($header as $csvColumn) {
                    $similarity = similar_text(
                        $normalizedRequired, 
                        mb_strtolower(preg_replace('/\s+/', '', $csvColumn)), 
                        $percent
                    );
                    if ($percent > 80) { // Si la similarité est supérieure à 80%
                        $found = true;
                        break;
                    }
                }
                
                if (!$found) {
                    $missingColumns[] = $requiredColumn;
                }
            }
        }
        
        if (!empty($missingColumns)) {
            throw new \RuntimeException('Colonnes manquantes dans le fichier CSV : ' . 
                implode(', ', $missingColumns));
        }
    }

    /**
     * Valide une ligne de données
     */
    public function validateRow(array $row, int $lineNumber): void
    {
        // Vérifier que les colonnes essentielles sont présentes
        $essentialColumns = [
            'Numéro de badge', 
            'Date évènements'
        ];
        
        $missingEssentials = [];
        foreach ($essentialColumns as $column) {
            // Vérifier si la colonne est présente et a une valeur non vide
            if (!isset($row[$column]) || trim($row[$column]) === '') {
                $missingEssentials[] = $column;
            }
        }
        
        if (!empty($missingEssentials)) {
            // Logger l'avertissement au lieu de lancer une exception
            error_log("Avertissement: Données manquantes à la ligne {$lineNumber} pour les colonnes : " . 
                implode(', ', $missingEssentials));
            
            // Ne pas bloquer l'importation pour les colonnes comme Heure évènements ou Nature Evenement
            if (in_array('Numéro de badge', $missingEssentials) || in_array('Date évènements', $missingEssentials)) {
                throw new \RuntimeException(
                    "Données critiques manquantes à la ligne {$lineNumber} pour les colonnes : " . 
                    implode(', ', $missingEssentials)
                );
            }
        }

        // Validation des dates si présentes
        if (isset($row['Date évènements']) && !empty($row['Date évènements'])) {
            try {
                $this->validateDate($row['Date évènements'], 'Date évènements', $lineNumber);
            } catch (\Exception $e) {
                error_log("Erreur de validation de date à la ligne {$lineNumber}: " . $e->getMessage());
                throw $e; // Relancer car c'est une erreur critique
            }
        }
        
        if (isset($row['Date de début de validité']) && !empty($row['Date de début de validité'])) {
            try {
                $this->validateDate($row['Date de début de validité'], 'Date de début de validité', $lineNumber);
            } catch (\Exception $e) {
                // Simple avertissement pour cette date
                error_log("Avertissement: format de Date de début de validité invalide à la ligne {$lineNumber}: " . $e->getMessage());
            }
        }
        
        if (isset($row['Date de création']) && !empty($row['Date de création'])) {
            try {
                $this->validateDate($row['Date de création'], 'Date de création', $lineNumber);
            } catch (\Exception $e) {
                // Simple avertissement pour cette date
                error_log("Avertissement: format de Date de création invalide à la ligne {$lineNumber}: " . $e->getMessage());
            }
        }

        // Validation de l'heure si présente
        if (isset($row['Heure évènements']) && !empty($row['Heure évènements'])) {
            try {
                $this->validateTime($row['Heure évènements'], 'Heure évènements', $lineNumber);
            } catch (\Exception $e) {
                // Avertissement pour l'heure, on utilisera 00:00:00 par défaut
                error_log("Avertissement: format d'heure invalide à la ligne {$lineNumber}: " . $e->getMessage());
            }
        }
    }

    /**
     * Valide une date
     */
    public function validateDate(string $date, string $field, int $lineNumber): void
    {
        // Ignorer les dates vides
        if (empty(trim($date))) {
            return;
        }
        
        // Vérifier si c'est une combinaison date+heure
        if (preg_match('/(\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{2,4})\s+(\d{1,2}:\d{1,2}(:\d{1,2})?)/', $date, $matches)) {
            // Extraire uniquement la partie date
            $date = $matches[1];
        }
        
        // Essayer avec strtotime d'abord
        $timestamp = strtotime($date);
        if ($timestamp !== false) {
            return; // Date valide
        }
        
        // Essayer avec différents formats de date
        $formats = ['d/m/Y', 'd-m-Y', 'Y-m-d', 'd.m.Y', 'Y.m.d', 'Y/m/d'];
        foreach ($formats as $format) {
            $dateObj = \DateTime::createFromFormat($format, $date);
            if ($dateObj && $dateObj->format($format) === $date) {
                return; // Date valide
            }
        }
        
        // Si aucun format ne fonctionne, la date est invalide
        throw new \RuntimeException("La date dans le champ '{$field}' à la ligne {$lineNumber} est invalide");
    }

    /**
     * Valide une heure
     */
    public function validateTime(string $time, string $field, int $lineNumber): void
    {
        // Ignorer les heures vides
        if (empty(trim($time))) {
            return;
        }
        
        // Vérifier si c'est une combinaison date+heure
        if (preg_match('/\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{2,4}\s+(\d{1,2}:\d{1,2}(:\d{1,2})?)/', $time, $matches)) {
            // Extraire uniquement la partie heure
            $time = $matches[1];
        }
        
        // Vérifier si l'heure est au format valide
        if (preg_match('/^([01]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/', $time)) {
            return; // Heure valide
        }
        
        throw new \RuntimeException("L'heure dans le champ '{$field}' à la ligne {$lineNumber} est invalide");
    }

    /**
     * Retourne les colonnes requises
     */
    public function getRequiredColumns(): array
    {
        return self::REQUIRED_COLUMNS;
    }

    /**
     * Détecte le séparateur utilisé dans un fichier CSV
     */
    public function detectSeparator(string $filePath): string
    {
        $firstLine = '';
        $handle = fopen($filePath, 'r');
        
        if ($handle !== false) {
            $firstLine = fgets($handle);
            fclose($handle);
        }
        
        if (empty($firstLine)) {
            return ';'; // Séparateur par défaut
        }
        
        $separators = [';', ',', "\t", '|'];
        $counts = [];
        
        foreach ($separators as $sep) {
            $counts[$sep] = substr_count($firstLine, $sep);
        }
        
        // Retourner le séparateur le plus fréquent
        arsort($counts);
        return key($counts);
    }

    /**
     * Génère un aperçu du fichier CSV
     */
    public function getPreview(string $filePath, string $separator = ';', bool $hasHeader = true, int $maxLines = 5): array
    {
        $handle = fopen($filePath, 'r');
        $preview = [];
        $lineCount = 0;
        
        if ($handle !== false) {
            // Lire l'en-tête si présent
            if ($hasHeader && ($header = fgetcsv($handle, 0, $separator, '"', '\\')) !== false) {
                $preview['header'] = array_map('trim', $header);
                $preview['rows'] = [];
                
                // Lire les lignes de données
                while (($row = fgetcsv($handle, 0, $separator, '"', '\\')) !== false && $lineCount < $maxLines) {
                    $preview['rows'][] = array_map('trim', $row);
                    $lineCount++;
                }
            } else {
                // Pas d'en-tête, lire directement les données
                rewind($handle);
                $preview['header'] = [];
                $preview['rows'] = [];
                
                while (($row = fgetcsv($handle, 0, $separator, '"', '\\')) !== false && $lineCount < $maxLines) {
                    if (empty($preview['header']) && count($row) > 0) {
                        // Créer des noms de colonnes dynamiques
                        $preview['header'] = array_map(function($index) {
                            return "Colonne " . ($index + 1);
                        }, range(0, count($row) - 1));
                    }
                    
                    $preview['rows'][] = array_map('trim', $row);
                    $lineCount++;
                }
            }
            
            fclose($handle);
        }
        
        return $preview;
    }
} 