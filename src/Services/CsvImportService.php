<?php

namespace App\Services;

class CsvImportService
{
    private const REQUIRED_COLUMNS = [
        'Numéro de badge',
        'Date évènements',
        'Heure évènements',
        'Centrale',
        'Nature Evenement',
        'Nom',
        'Prénom',
        'Statut',
        'Groupe',
        'Date de début de validité',
        'Date de création'
    ];

    // Ajout d'un mapping pour permettre la correspondance avec des noms de colonnes alternatifs
    private const COLUMN_MAPPING = [
        'Numéro de badge' => ['numero de badge', 'badge', 'id badge', 'badge id', 'numbadge'],
        'Date évènements' => ['date evenements', 'date evenement', 'date', 'date event'],
        'Heure évènements' => ['heure evenements', 'heure evenement', 'heure', 'time', 'heure event'],
        'Centrale' => ['centrale', 'central', 'controller'],
        'Nature Evenement' => ['nature evenement', 'nature', 'event type', 'type', 'evenement', 'evenement type'],
        'Nom' => ['nom', 'name', 'lastname', 'last name'],
        'Prénom' => ['prenom', 'firstname', 'first name'],
        'Statut' => ['statut', 'status', 'etat'],
        'Groupe' => ['groupe', 'group', 'service', 'department'],
        'Date de début de validité' => ['date de debut de validite', 'debut validite', 'start date'],
        'Date de création' => ['date de creation', 'creation date', 'date creation']
    ];

    /**
     * Lit un fichier CSV et retourne ses données en traitant les problèmes de multilignes
     */
    public function readCSV(string $filePath, string $separator = ';', bool $hasHeader = true): array
    {
        // Vérification minimale
        if (!file_exists($filePath)) {
            throw new \RuntimeException('Le fichier n\'existe pas');
        }

        // S'assurer que le séparateur n'est jamais vide
        if (empty($separator)) {
            $separator = ';';
        }

        try {
            // Utiliser la fonction native fgetcsv à la place de SplFileObject
            error_log("CsvImportService::readCSV - Lecture du fichier avec fgetcsv");
            $handle = fopen($filePath, "r");
            
            if ($handle === false) {
                throw new \RuntimeException('Impossible d\'ouvrir le fichier CSV');
            }
            
            $data = [];
            $header = [];
            $lineNumber = 0;
            
            // Lecture de l'en-tête
            $headerRow = fgetcsv($handle, 0, $separator, '"', '\\');
            
            if ($headerRow !== false) {
                $lineNumber++;
                
                // Supprimer le BOM UTF-8 si présent dans le premier élément
                if (!empty($headerRow[0]) && substr($headerRow[0], 0, 3) === "\xEF\xBB\xBF") {
                    $headerRow[0] = substr($headerRow[0], 3);
                    error_log("CsvImportService::readCSV - BOM UTF-8 détecté et supprimé");
                }
                
                // Nettoyer les en-têtes (trim)
                $header = array_map('trim', $headerRow);
                
                // Filtrer les en-têtes vides
                $header = array_filter($header, function($value) {
                    return !empty(trim($value));
                });
                
                // Réindexer le tableau après le filtrage
                $header = array_values($header);
                error_log("CsvImportService::readCSV - En-têtes détectés: " . implode(", ", $header));
                
                // Si pas d'en-tête, on considère la première ligne comme des données
                if (!$hasHeader) {
                    // Rewind to start and read the first line again as data
                    rewind($handle);
                }
            } else {
                error_log("CsvImportService::readCSV - Aucun en-tête détecté");
                throw new \RuntimeException('Aucun en-tête détecté dans le fichier CSV');
            }
            
            // Lecture des données
            $rowCount = 0;
            $maxRows = 1000000; // Limite pour éviter les problèmes de mémoire
            
            while (($row = fgetcsv($handle, 0, $separator, '"', '\\')) !== false && $rowCount < $maxRows) {
                // Ignorer l'en-tête si nécessaire
                if ($hasHeader && $lineNumber === 1) {
                    $lineNumber++;
                    continue;
                }
                
                $lineNumber++;
                
                // Ignorer les lignes vides
                if (empty($row) || (count($row) === 1 && empty($row[0]))) {
                    continue;
                }
                
                // Normaliser la taille des lignes
                if (count($row) < count($header)) {
                    $row = array_pad($row, count($header), '');
                } elseif (count($row) > count($header)) {
                    $row = array_slice($row, 0, count($header));
                }
                
                // Combiner les en-têtes et les valeurs
                $rowData = array_combine($header, $row);
                if ($rowData !== false) {
                    $data[] = $rowData;
                    $rowCount++;
                    
                    // Journaliser la première ligne pour le débogage
                    if ($rowCount === 1) {
                        error_log("CsvImportService::readCSV - Exemple de ligne: " . json_encode($rowData, JSON_UNESCAPED_UNICODE));
                    }
                } else {
                    error_log("CsvImportService::readCSV - Impossible de combiner l'en-tête et les données de la ligne $lineNumber");
                    error_log("CsvImportService::readCSV - En-têtes: " . count($header) . ", Valeurs: " . count($row));
                }
            }
            
            fclose($handle);
            
            error_log("CsvImportService::readCSV - Lecture terminée: $rowCount lignes trouvées");
            
            // Normaliser les noms de colonnes
            if (!empty($data)) {
                $normalizedRows = [];
                foreach ($data as $row) {
                    $normalizedRow = [];
                    foreach ($row as $key => $value) {
                        $normalizedKey = $this->normalizeColumnName($key);
                        $normalizedRow[$normalizedKey] = $value;
                    }
                    $normalizedRows[] = $normalizedRow;
                }
                return $normalizedRows;
            }
            
            return $data;
            
        } catch (\Exception $e) {
            error_log("CsvImportService::readCSV - Erreur: " . $e->getMessage());
            error_log("CsvImportService::readCSV - Trace: " . $e->getTraceAsString());
            throw new \RuntimeException('Erreur lors de la lecture du fichier CSV: ' . $e->getMessage());
        }
    }
    
    /**
     * Normalise un nom de colonne pour le faire correspondre aux noms attendus
     */
    private function normalizeColumnName(string $columnName): string
    {
        // Nettoyer le nom de colonne
        $normalized = mb_strtolower(trim($columnName), 'UTF-8');
        $normalized = preg_replace('/\s+/', ' ', $normalized); // Normaliser les espaces
        $normalized = iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $normalized); // Supprimer les accents
        
        // Chercher une correspondance dans le mapping
        foreach (self::COLUMN_MAPPING as $standardName => $alternativeNames) {
            $normalizedStandard = mb_strtolower(trim($standardName), 'UTF-8');
            $normalizedStandard = preg_replace('/\s+/', ' ', $normalizedStandard);
            $normalizedStandard = iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $normalizedStandard);
            
            // Si le nom correspond directement au nom standard
            if ($normalized === $normalizedStandard) {
                return $standardName;
            }
            
            // Sinon, vérifier les noms alternatifs
            foreach ($alternativeNames as $altName) {
                $normalizedAlt = mb_strtolower(trim($altName), 'UTF-8');
                $normalizedAlt = preg_replace('/\s+/', ' ', $normalizedAlt);
                $normalizedAlt = iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $normalizedAlt);
                
                if ($normalized === $normalizedAlt) {
                    return $standardName;
                }
            }
        }
        
        // Si aucune correspondance n'est trouvée, utiliser le nom d'origine
        return $columnName;
    }
    
    /**
     * Trouve l'index d'une colonne dans l'en-tête en tenant compte des noms alternatifs
     */
    private function findColumnIndex(array $header, string $columnName): int|false
    {
        // Recherche directe
        $index = array_search($columnName, $header);
        if ($index !== false) {
            return $index;
        }
        
        // Recherche normalisée
        $normalized = mb_strtolower(trim($columnName), 'UTF-8');
        $normalized = preg_replace('/\s+/', ' ', $normalized);
        $normalized = iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $normalized);
        
        foreach ($header as $i => $headerCol) {
            $normalizedHeader = mb_strtolower(trim($headerCol), 'UTF-8');
            $normalizedHeader = preg_replace('/\s+/', ' ', $normalizedHeader);
            $normalizedHeader = iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $normalizedHeader);
            
            if ($normalizedHeader === $normalized) {
                return $i;
            }
            
            // Vérifier les noms alternatifs
            if (isset(self::COLUMN_MAPPING[$columnName])) {
                foreach (self::COLUMN_MAPPING[$columnName] as $altName) {
                    $normalizedAlt = mb_strtolower(trim($altName), 'UTF-8');
                    $normalizedAlt = preg_replace('/\s+/', ' ', $normalizedAlt);
                    $normalizedAlt = iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $normalizedAlt);
                    
                    if ($normalizedHeader === $normalizedAlt) {
                        return $i;
                    }
                }
            }
        }
        
        return false;
    }

    /**
     * Traite le fichier CSV et valide son contenu
     * @param string $filePath Chemin du fichier CSV
     * @param string $separator Séparateur utilisé dans le fichier
     * @param bool $hasHeader Indique si le fichier a une ligne d'en-tête
     * @param bool $processInChunks Traiter le fichier par lots pour économiser la mémoire
     * @param int $chunkSize Taille des lots de traitement
     * @return array Données du fichier CSV
     */
    public function processFile(
        string $filePath, 
        string $separator = ';', 
        bool $hasHeader = true, 
        bool $processInChunks = false, 
        int $chunkSize = 1000
    ): array {
        if ($processInChunks) {
            // Traitement par lots pour les fichiers volumineux
            return $this->processFileInChunks($filePath, $separator, $hasHeader, $chunkSize);
        }
        
        // Traitement standard
        $data = $this->readCSV($filePath, $separator, $hasHeader);
        
        // Validation de chaque ligne
        foreach ($data as $index => $row) {
            $this->validateRow($row, $index + 2); // +2 car ligne 1 = en-tête, et index commence à 0
        }
        
        return $data;
    }
    
    /**
     * Traite un fichier CSV volumineux en lots pour économiser la mémoire
     * @param string $filePath Chemin du fichier CSV
     * @param string $separator Séparateur utilisé dans le fichier
     * @param bool $hasHeader Indique si le fichier a une ligne d'en-tête
     * @param int $chunkSize Taille des lots de traitement
     * @return array Données du fichier CSV
     */
    private function processFileInChunks(
        string $filePath, 
        string $separator = ';', 
        bool $hasHeader = true, 
        int $chunkSize = 1000
    ): array {
        // Cette fonction est juste un placeholder pour le moment
        // Dans une implémentation complète, elle traiterait le fichier par lots
        // Pour l'instant, on utilise simplement la méthode standard comme fallback
        error_log("Traitement par lots demandé, mais non implémenté. Utilisation du traitement standard.");
        return $this->readCSV($filePath, $separator, $hasHeader);
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
            'Numéro de badge' 
            // Seul le numéro de badge est vraiment critique
        ];
        
        $missingEssentials = [];
        foreach ($essentialColumns as $column) {
            // Vérifier si la colonne est présente et a une valeur non vide
            if (!isset($row[$column]) || trim($row[$column]) === '') {
                $missingEssentials[] = $column;
            }
        }
        
        // Vérifier les colonnes importantes mais non bloquantes
        $importantColumns = [
            'Date évènements',
            'Centrale'
        ];
        
        $missingImportant = [];
        foreach ($importantColumns as $column) {
            if (!isset($row[$column]) || trim($row[$column]) === '') {
                $missingImportant[] = $column;
            }
        }
        
        if (!empty($missingImportant)) {
            // Logger l'avertissement
            error_log("Avertissement: Données importantes manquantes à la ligne {$lineNumber} pour les colonnes : " . 
                implode(', ', $missingImportant));
        }
        
        if (!empty($missingEssentials)) {
            // Logger l'erreur
            error_log("Erreur: Données critiques manquantes à la ligne {$lineNumber} pour les colonnes : " . 
                implode(', ', $missingEssentials));
            
            // Bloquer uniquement si le numéro de badge est manquant
                throw new \RuntimeException(
                    "Données critiques manquantes à la ligne {$lineNumber} pour les colonnes : " . 
                    implode(', ', $missingEssentials)
                );
        }

        // Validation des dates si présentes
        if (isset($row['Date évènements']) && !empty($row['Date évènements'])) {
            try {
                $this->validateDate($row['Date évènements'], 'Date évènements', $lineNumber);
            } catch (\Exception $e) {
                // Simple avertissement au lieu d'une erreur bloquante
                error_log("Avertissement: " . $e->getMessage());
            }
        }
        
        if (isset($row['Date de début de validité']) && !empty($row['Date de début de validité'])) {
            try {
                $this->validateDate($row['Date de début de validité'], 'Date de début de validité', $lineNumber);
            } catch (\Exception $e) {
                // Simple avertissement pour cette date
                error_log("Avertissement: " . $e->getMessage());
            }
        }
        
        if (isset($row['Date de création']) && !empty($row['Date de création'])) {
            try {
                $this->validateDate($row['Date de création'], 'Date de création', $lineNumber);
            } catch (\Exception $e) {
                // Simple avertissement pour cette date
                error_log("Avertissement: " . $e->getMessage());
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
        
        // Essayer avec différents formats de date (incluant les formats utilisés dans Exportation 1.csv)
        $formats = [
            'd/m/Y', 'd-m-Y', 'Y-m-d', 'd.m.Y', 'Y.m.d', 'Y/m/d',
            'd/m/Y H:i:s', 'd/m/Y H:i', 'Y-m-d H:i:s', 'Y-m-d H:i'
        ];
        
        foreach ($formats as $format) {
            $dateObj = \DateTime::createFromFormat($format, $date);
            if ($dateObj && $dateObj->format($format) === $date) {
                return; // Date valide
            }
        }
        
        // Essayer un cas spécial pour les dates au format "dd/mm/yyyy hh:mm:ss"
        if (preg_match('/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2}):(\d{2})$/', $date)) {
            return; // Format spécial valide
        }
        
        // Si aucun format ne fonctionne, émettre un avertissement mais ne pas bloquer l'importation
        error_log("Avertissement: La date '{$date}' dans le champ '{$field}' à la ligne {$lineNumber} est dans un format non reconnu");
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
        
        // Format standard HH:MM:SS
        if (preg_match('/^([01]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/', $time)) {
            return; // Heure valide
        }
        
        // Format HH.MM.SS ou HH.MM
        if (preg_match('/^([01]?[0-9]|2[0-3])\.([0-5][0-9])(\.([0-5][0-9]))?$/', $time)) {
            return; // Heure valide avec points
        }
        
        // Format HHMMSS ou HHMM
        if (preg_match('/^([01][0-9]|2[0-3])([0-5][0-9])([0-5][0-9])?$/', $time)) {
            return; // Heure valide sans séparateurs
        }
        
        // Essayer de convertir avec strtotime
        $timestamp = strtotime($time);
        if ($timestamp !== false) {
            return; // Heure valide selon strtotime
        }
        
        // Si on arrive ici, le format n'est pas reconnu, mais on ne bloque pas l'importation
        error_log("Avertissement: L'heure '{$time}' dans le champ '{$field}' à la ligne {$lineNumber} est dans un format non reconnu. Elle sera remplacée par la valeur par défaut (00:00:00).");
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
     * Obtenir un aperçu du contenu du fichier CSV
     * @param string $filePath Chemin du fichier CSV
     * @param string $separator Séparateur utilisé dans le fichier (par défaut ';')
     * @param bool $hasHeader Indique si le fichier a une ligne d'en-tête
     * @param int $maxLines Nombre maximum de lignes à retourner pour l'aperçu
     * @return array Tableau avec les en-têtes, les données et le nombre total de lignes
     */
    public function getPreview(string $filePath, string $separator = ';', bool $hasHeader = true, int $maxLines = 10): array
    {
        try {
            // Vérifier que le fichier existe
            if (!file_exists($filePath)) {
                throw new \RuntimeException('Le fichier n\'existe pas');
            }
            
            // S'assurer que le séparateur n'est jamais vide
            if (empty($separator)) {
                error_log('Séparateur vide détecté, utilisation du point-virgule par défaut');
                $separator = ';';
            }
            
            $handle = fopen($filePath, 'r');
            if ($handle === false) {
                throw new \RuntimeException('Impossible d\'ouvrir le fichier');
            }
            
            // Lire le contenu du fichier pour déterminer le nombre total de lignes
            $content = file_get_contents($filePath);
            if ($content === false) {
                throw new \RuntimeException('Impossible de lire le contenu du fichier');
            }
            
            // Compter le nombre total de lignes non vides
            $lines = explode("\n", str_replace(["\r\n", "\r"], "\n", $content));
            $totalRows = count(array_filter($lines, function($line) {
                return trim($line) !== '';
            }));
            
            // Si le fichier a un en-tête, réduire de 1 le nombre de lignes de données
            if ($hasHeader && $totalRows > 0) {
                $totalRows--;
            }
            
            // Lire les en-têtes et les lignes pour l'aperçu
            $headers = [];
            $rows = [];
            $rowCount = 0;
            
            // Lire l'en-tête si présent
            if ($hasHeader && ($headerRow = fgetcsv($handle, 0, $separator, '"', '\\')) !== false) {
                $headers = array_map('trim', $headerRow);
                
                // Lire les lignes de données pour l'aperçu
                while (($row = fgetcsv($handle, 0, $separator, '"', '\\')) !== false && $rowCount < $maxLines) {
                    $rows[] = array_map('trim', $row);
                    $rowCount++;
                }
            } else {
                // Pas d'en-tête, retourner au début du fichier
                rewind($handle);
                
                // Lire les données
                while (($row = fgetcsv($handle, 0, $separator, '"', '\\')) !== false && $rowCount < $maxLines) {
                    $rows[] = array_map('trim', $row);
                    $rowCount++;
                }
                
                // Générer des en-têtes génériques basés sur le nombre de colonnes de la première ligne
                if (!empty($rows) && count($rows[0]) > 0) {
                    $columnCount = count($rows[0]);
                    for ($i = 0; $i < $columnCount; $i++) {
                        $headers[] = 'Colonne ' . ($i + 1);
                    }
                }
            }
            
            fclose($handle);
            
            return [
                'headers' => $headers,
                'rows' => $rows,
                'totalRows' => $totalRows
            ];
            
        } catch (\Exception $e) {
            error_log("CsvImportService::getPreview - Erreur: " . $e->getMessage());
            throw $e;
        }
    }
} 