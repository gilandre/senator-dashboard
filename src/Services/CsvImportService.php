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

    /**
     * Lit un fichier CSV et retourne ses données en traitant les problèmes de multilignes
     */
    public function readCSV(string $filePath, string $separator = ';', bool $hasHeader = true): array
    {
        error_log("CsvImportService::readCSV - Début de la lecture du fichier {$filePath}");
        error_log("CsvImportService::readCSV - Paramètres: separator={$separator}, hasHeader=" . ($hasHeader ? 'true' : 'false'));
        
        // Vérification minimale
        if (!file_exists($filePath)) {
            error_log("CsvImportService::readCSV - Erreur: Le fichier n'existe pas: {$filePath}");
            throw new \RuntimeException('Le fichier n\'existe pas');
        }

        // S'assurer que le séparateur n'est jamais vide
        if (empty($separator)) {
            $separator = ';';
        }

        try {
            // Optimisé: utiliser un tampon pour lire le fichier par morceaux 
            // au lieu de charger tout le contenu en mémoire
            $handle = fopen($filePath, 'r');
            if ($handle === false) {
                throw new \RuntimeException('Impossible d\'ouvrir le fichier');
            }
            
            // Lire l'en-tête si présent
            $header = [];
            $rows = [];
            
            // La première ligne est potentiellement l'en-tête
            if (($firstLine = fgets($handle)) !== false) {
                // Supprimer le BOM UTF-8 si présent
                if (substr($firstLine, 0, 3) === "\xEF\xBB\xBF") {
                    $firstLine = substr($firstLine, 3);
                }
                
                // Normalisation des fins de ligne
                $firstLine = rtrim(str_replace(["\r\n", "\r"], "\n", $firstLine));
                
                // Extraire les colonnes d'en-tête
                $header = str_getcsv($firstLine, $separator, '"', '\\');
                
                // Nettoyer les en-têtes (trim uniquement)
                $header = array_map('trim', $header);
                
                // Si pas d'en-tête, considérer la première ligne comme une donnée
                if (!$hasHeader) {
                    $rows[] = array_combine(
                        range(0, count($header) - 1),
                        $header
                    );
                    $header = range(0, count($header) - 1);
                }
            }
            
            // Identifier l'index de la colonne contenant le numéro de badge (pour détecter les nouvelles lignes)
            $badgeNumberIndex = array_search('Numéro de badge', $header);
            
            // Variable pour suivre la ligne en cours de construction (pour les lignes multiples)
            $currentRow = null;
            $lastBadgeNumber = null;
            
            // Lire le reste du fichier
            $bufferSize = 8192; // Taille du tampon de lecture (8 Ko)
            $lineBuffer = '';
            
            // Traiter le fichier par morceaux pour économiser la mémoire
            while (!feof($handle)) {
                $chunk = fread($handle, $bufferSize);
                if ($chunk === false) {
                    break;
                }
                
                // Ajouter au tampon de ligne
                $lineBuffer .= $chunk;
                
                // Traiter les lignes complètes dans le tampon
                while (($pos = strpos($lineBuffer, "\n")) !== false) {
                    $line = substr($lineBuffer, 0, $pos);
                    $lineBuffer = substr($lineBuffer, $pos + 1);
                    
                    // Normaliser les fins de ligne
                    $line = rtrim(str_replace(["\r\n", "\r"], "\n", $line));
                    
                    // Ignorer les lignes vides
                    if (trim($line) === '') {
                        continue;
                    }
                    
                    // Extraire les colonnes
                    $columns = str_getcsv($line, $separator, '"', '\\');
                    
                    // Vérifier si c'est une nouvelle ligne ou une continuation
                    if ($badgeNumberIndex !== false && isset($columns[$badgeNumberIndex]) && trim($columns[$badgeNumberIndex]) !== '') {
                        // C'est une nouvelle ligne
                        if ($currentRow !== null) {
                            // S'assurer que les tableaux ont la même longueur avant de les combiner
                            if (count($header) !== count($currentRow)) {
                                // Ajuster la taille des tableaux
                                if (count($header) > count($currentRow)) {
                                    // Ajouter des valeurs vides si nécessaire
                                    $currentRow = array_pad($currentRow, count($header), '');
                                } else {
                                    // Tronquer si trop de colonnes
                                    $currentRow = array_slice($currentRow, 0, count($header));
                                }
                            }
                            $rows[] = array_combine($header, $currentRow);
                        }
                        
                        $currentRow = $columns;
                        $lastBadgeNumber = $columns[$badgeNumberIndex];
                    } else {
                        // C'est une continuation de la ligne précédente
                        if ($currentRow !== null) {
                            // Fusionner les colonnes supplémentaires avec la ligne courante
                            for ($i = 0; $i < count($columns) && $i < count($currentRow); $i++) {
                                if (trim($columns[$i]) !== '') {
                                    $currentRow[$i] .= ' ' . $columns[$i];
                                }
                            }
                        }
                    }
                }
            }
            
            // Ajouter la dernière ligne en cours
            if ($currentRow !== null) {
                // S'assurer que les tableaux ont la même longueur avant de les combiner
                if (count($header) !== count($currentRow)) {
                    // Ajuster la taille des tableaux
                    if (count($header) > count($currentRow)) {
                        // Ajouter des valeurs vides si nécessaire
                        $currentRow = array_pad($currentRow, count($header), '');
                    } else {
                        // Tronquer si trop de colonnes
                        $currentRow = array_slice($currentRow, 0, count($header));
                    }
                }
                $rows[] = array_combine($header, $currentRow);
            }
            
            // Traiter les lignes restantes dans le tampon
            if (!empty(trim($lineBuffer))) {
                $columns = str_getcsv($lineBuffer, $separator, '"', '\\');
                
                if ($badgeNumberIndex !== false && isset($columns[$badgeNumberIndex]) && trim($columns[$badgeNumberIndex]) !== '') {
                    // C'est une nouvelle ligne
                    // S'assurer que les tableaux ont la même longueur avant de les combiner
                    if (count($header) !== count($columns)) {
                        // Ajuster la taille des tableaux
                        if (count($header) > count($columns)) {
                            // Ajouter des valeurs vides si nécessaire
                            $columns = array_pad($columns, count($header), '');
                        } else {
                            // Tronquer si trop de colonnes
                            $columns = array_slice($columns, 0, count($header));
                        }
                    }
                    $rows[] = array_combine($header, $columns);
                } else if ($currentRow !== null) {
                    // C'est une continuation de la ligne précédente
                    for ($i = 0; $i < count($columns) && $i < count($currentRow); $i++) {
                        if (trim($columns[$i]) !== '') {
                            $currentRow[$i] .= ' ' . $columns[$i];
                        }
                    }
                    // S'assurer que les tableaux ont la même longueur avant de les combiner
                    if (count($header) !== count($currentRow)) {
                        // Ajuster la taille des tableaux
                        if (count($header) > count($currentRow)) {
                            // Ajouter des valeurs vides si nécessaire
                            $currentRow = array_pad($currentRow, count($header), '');
                        } else {
                            // Tronquer si trop de colonnes
                            $currentRow = array_slice($currentRow, 0, count($header));
                        }
                    }
                    $rows[] = array_combine($header, $currentRow);
                }
            }
            
            fclose($handle);
            
            error_log("CsvImportService::readCSV - Lecture terminée avec succès. " . count($rows) . " lignes traitées.");
            return $rows;
            
        } catch (\Exception $e) {
            error_log("CsvImportService::readCSV - Erreur: " . $e->getMessage());
            throw new \RuntimeException('Erreur lors de la lecture du fichier CSV: ' . $e->getMessage());
        }
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