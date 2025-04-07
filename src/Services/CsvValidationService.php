<?php

namespace App\Services;

class CsvValidationService
{
    private const DATE_FORMAT = 'Y-m-d';
    private const TIME_FORMAT = 'H:i:s';
    
    private array $errors = [];
    private array $warnings = [];
    private array $correctedData = [];
    
    /**
     * Valide les données du CSV et retourne les erreurs et avertissements
     */
    public function validateImportData(array $data): void
    {
        $this->resetValidation();
        
        if (empty($data)) {
            $this->addError(0, 'Le fichier ne contient aucune donnée valide');
            return;
        }
        
        try {
            foreach ($data as $index => $row) {
                $rowId = $row['row_id'] ?? $index;
                
                // S'assurer que les champs requis sont présents dans la ligne
                $this->validateRow($row, $rowId);
            }
        } catch (\Exception $e) {
            // En cas d'erreur inattendue, l'ajouter comme erreur
            $this->addError(0, 'Erreur lors de la validation : ' . $e->getMessage());
            
            // Enregistrer l'erreur dans les logs pour le debugging
            if (function_exists('error_log')) {
                error_log('Erreur dans CsvValidationService::validateImportData : ' . $e->getMessage());
                error_log($e->getTraceAsString());
            }
        }
    }
    
    /**
     * Réinitialise les validations
     */
    private function resetValidation(): void
    {
        $this->errors = [];
        $this->warnings = [];
        $this->correctedData = [];
    }
    
    /**
     * Valide une ligne de données
     */
    private function validateRow(array $row, int $rowId): void
    {
        // Vérifier si c'est une ligne vide
        $nonEmptyFields = array_filter($row, function($value) {
            return !empty(trim((string)$value)) && $value !== 'row_id';
        });
        
        if (empty($nonEmptyFields)) {
            $this->addWarning($rowId, 'Ligne vide ou sans données significatives');
            return;
        }
        
        // Valider la date
        if (isset($row['Date évènements'])) {
            $dateValue = $row['Date évènements'];
            // Vérifier si la date contient aussi l'heure
            if (preg_match('/(\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{2,4})\s+(\d{1,2}:\d{1,2}(:\d{1,2})?)/', $dateValue, $matches)) {
                // Extraire la date et l'heure
                $extractedDate = $matches[1];
                $extractedTime = $matches[2];
                
                // Valider la date extraite
                $this->validateDateFormat($extractedDate, 'Date évènements', $rowId);
                
                // Si l'heure n'est pas définie, utiliser celle extraite
                if (!isset($row['Heure évènements']) || empty(trim($row['Heure évènements']))) {
                    $this->validateTimeFormat($extractedTime, 'Heure évènements', $rowId);
                    // Ajouter une correction pour l'heure
                    $this->addCorrection($rowId, 'Heure évènements', '', $extractedTime);
                }
            } else {
                $this->validateDateFormat($dateValue, 'Date évènements', $rowId);
            }
        } else {
            $this->addError($rowId, 'Le champ "Date évènements" est manquant');
        }
        
        // Valider l'heure
        if (isset($row['Heure évènements']) && !empty(trim($row['Heure évènements']))) {
            $this->validateTimeFormat($row['Heure évènements'], 'Heure évènements', $rowId);
        } else if (!isset($row['Date évènements']) || !preg_match('/\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{2,4}\s+\d{1,2}:\d{1,2}/', $row['Date évènements'] ?? '')) {
            $this->addError($rowId, 'Le champ "Heure évènements" est manquant');
        }
        
        // Valider les autres champs obligatoires
        $requiredFields = [
            'Numéro de badge',
            'Centrale',
            'Lecteur',
            'Nature Evenement',
            'Nom',
            'Prénom'
        ];
        
        foreach ($requiredFields as $field) {
            if (!isset($row[$field]) || trim((string)$row[$field]) === '') {
                $this->addWarning($rowId, "Le champ \"{$field}\" est vide ou manquant");
            }
        }
        
        // Valider le format du numéro de badge
        if (isset($row['Numéro de badge']) && !empty(trim((string)$row['Numéro de badge']))) {
            if (!preg_match('/^\d+$/', $row['Numéro de badge'])) {
                $this->addWarning($rowId, 'Le numéro de badge doit être numérique');
                
                // Correction: supprimer les caractères non numériques
                $correctedValue = preg_replace('/[^0-9]/', '', (string)$row['Numéro de badge']);
                $this->addCorrection($rowId, 'Numéro de badge', (string)$row['Numéro de badge'], $correctedValue);
            }
        }
        
        // Valider la nature de l'événement
        if (isset($row['Nature Evenement']) && !empty(trim((string)$row['Nature Evenement']))) {
            $validEvents = ['Entrée', 'Sortie', 'Accès refusé', 'Utilisateur accepté', 'Utilisateur rejeté', 'Utilisateur inconnu'];
            if (!in_array($row['Nature Evenement'], $validEvents)) {
                $this->addWarning($rowId, "La nature de l'événement \"{$row['Nature Evenement']}\" est invalide, valeurs attendues: " . implode(', ', $validEvents));
                
                // Suggestion de correction
                $closestMatch = $this->findClosestMatch((string)$row['Nature Evenement'], $validEvents);
                if ($closestMatch) {
                    $this->addCorrection($rowId, 'Nature Evenement', (string)$row['Nature Evenement'], $closestMatch);
                }
            }
        }
    }
    
    /**
     * Valide le format de la date
     */
    private function validateDateFormat(string $date, string $field, int $rowId): void
    {
        $date = trim($date);
        
        // Si la date est vide, ne pas la valider
        if (empty($date)) {
            return;
        }
        
        // Essayer avec strtotime d'abord
        $timestamp = strtotime($date);
        if ($timestamp !== false) {
            $standardizedDate = date(self::DATE_FORMAT, $timestamp);
            
            if ($standardizedDate !== $date && $field === 'Date évènements') {
                $this->addWarning($rowId, "Le format de la date \"{$date}\" a été standardisé");
                $this->addCorrection($rowId, $field, $date, $standardizedDate);
            }
            
            return; // Date valide
        }
        
        // Essayer avec différents formats de date
        $formats = ['d/m/Y', 'd-m-Y', 'Y-m-d', 'd.m.Y', 'Y.m.d', 'Y/m/d', 'm/d/Y', 'j/n/Y'];
        $valid = false;
        $standardizedDate = '';
        
        foreach ($formats as $format) {
            $dateObj = \DateTime::createFromFormat($format, $date);
            if ($dateObj && $dateObj->format($format) === $date) {
                $valid = true;
                $standardizedDate = $dateObj->format(self::DATE_FORMAT);
                break;
            }
        }
        
        if (!$valid) {
            $this->addError($rowId, "Le format de la date dans le champ \"{$field}\" est invalide (format attendu: JJ/MM/AAAA)");
        } elseif ($standardizedDate !== $date && $field === 'Date évènements') {
            $this->addWarning($rowId, "Le format de la date \"{$date}\" a été standardisé");
            $this->addCorrection($rowId, $field, $date, $standardizedDate);
        }
    }
    
    /**
     * Valide le format de l'heure
     */
    private function validateTimeFormat(string $time, string $field, int $rowId): void
    {
        $time = trim($time);
        
        // Si l'heure est vide, ne pas la valider
        if (empty($time)) {
            return;
        }
        
        // Vérifier si c'est une combinaison date+heure
        if (preg_match('/\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{2,4}\s+(\d{1,2}:\d{1,2}(:\d{1,2})?)/', $time, $matches)) {
            // Extraire uniquement la partie heure
            $time = $matches[1];
        }
        
        // Vérifier si l'heure est au format valide
        if (preg_match('/^([01]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/', $time)) {
            $formats = ['H:i:s', 'H:i'];
            foreach ($formats as $format) {
                $timeObj = \DateTime::createFromFormat($format, $time);
                if ($timeObj && $timeObj->format($format) === $time) {
                    $standardizedTime = $timeObj->format(self::TIME_FORMAT);
                    
                    if ($standardizedTime !== $time && $field === 'Heure évènements') {
                        $this->addWarning($rowId, "Le format de l'heure \"{$time}\" a été standardisé");
                        $this->addCorrection($rowId, $field, $time, $standardizedTime);
                    }
                    
                    return; // Heure valide
                }
            }
        }
        
        // Essayer avec strtotime
        $timestamp = strtotime("1970-01-01 $time");
        if ($timestamp !== false) {
            $standardizedTime = date(self::TIME_FORMAT, $timestamp);
            
            $this->addWarning($rowId, "Le format de l'heure \"{$time}\" a été standardisé");
            $this->addCorrection($rowId, $field, $time, $standardizedTime);
            
            return; // Heure valide
        }
        
        $this->addError($rowId, "Le format de l'heure dans le champ \"{$field}\" est invalide (format attendu: HH:MM:SS)");
    }
    
    /**
     * Ajoute une erreur pour une ligne donnée
     */
    private function addError(int $rowId, string $message): void
    {
        if (!isset($this->errors[$rowId])) {
            $this->errors[$rowId] = [];
        }
        $this->errors[$rowId][] = $message;
    }
    
    /**
     * Ajoute un avertissement pour une ligne donnée
     */
    private function addWarning(int $rowId, string $message): void
    {
        if (!isset($this->warnings[$rowId])) {
            $this->warnings[$rowId] = [];
        }
        $this->warnings[$rowId][] = $message;
    }
    
    /**
     * Ajoute une correction pour une valeur
     */
    private function addCorrection(int $rowId, string $field, string $originalValue, string $correctedValue): void
    {
        if (!isset($this->correctedData[$rowId])) {
            $this->correctedData[$rowId] = [];
        }
        $this->correctedData[$rowId][$field] = [
            'original' => $originalValue,
            'corrected' => $correctedValue
        ];
    }
    
    /**
     * Trouve la chaîne la plus proche dans un tableau
     */
    private function findClosestMatch(string $input, array $possibilities): ?string
    {
        $input = strtolower($input);
        $closest = null;
        $minDistance = PHP_INT_MAX;
        
        foreach ($possibilities as $possibility) {
            $distance = levenshtein(strtolower($possibility), $input);
            if ($distance < $minDistance) {
                $minDistance = $distance;
                $closest = $possibility;
            }
        }
        
        // Si la distance est trop grande, ne pas suggérer de correction
        return ($minDistance <= 3) ? $closest : null;
    }
    
    /**
     * Retourne les erreurs de validation
     */
    public function getErrors(): array
    {
        return $this->errors;
    }
    
    /**
     * Retourne les avertissements de validation
     */
    public function getWarnings(): array
    {
        return $this->warnings;
    }
    
    /**
     * Retourne les corrections suggérées
     */
    public function getCorrections(): array
    {
        return $this->correctedData;
    }
    
    /**
     * Retourne le nombre total d'erreurs
     */
    public function getErrorCount(): int
    {
        $count = 0;
        foreach ($this->errors as $rowErrors) {
            $count += count($rowErrors);
        }
        return $count;
    }
    
    /**
     * Retourne le nombre total d'avertissements
     */
    public function getWarningCount(): int
    {
        $count = 0;
        foreach ($this->warnings as $rowWarnings) {
            $count += count($rowWarnings);
        }
        return $count;
    }
    
    /**
     * Applique les corrections et retourne les données corrigées
     */
    public function applyCorrections(array $data, array $selectedCorrections = []): array
    {
        $correctedData = $data;
        
        // Si aucune correction spécifique n'est sélectionnée, appliquer toutes les corrections
        if (empty($selectedCorrections)) {
            foreach ($this->correctedData as $rowId => $corrections) {
                foreach ($corrections as $field => $correction) {
                    foreach ($correctedData as $index => $row) {
                        if (($row['row_id'] ?? $index) == $rowId) {
                            $correctedData[$index][$field] = $correction['corrected'];
                            break;
                        }
                    }
                }
            }
        } else {
            // Appliquer uniquement les corrections sélectionnées
            foreach ($selectedCorrections as $rowId => $fields) {
                foreach ($fields as $field) {
                    if (isset($this->correctedData[$rowId][$field])) {
                        foreach ($correctedData as $index => $row) {
                            if (($row['row_id'] ?? $index) == $rowId) {
                                $correctedData[$index][$field] = $this->correctedData[$rowId][$field]['corrected'];
                                break;
                            }
                        }
                    }
                }
            }
        }
        
        return $correctedData;
    }
    
    /**
     * Vérifie s'il y a des erreurs bloquantes
     */
    public function hasBlockingErrors(): bool
    {
        // Vérifier s'il y a des erreurs qui ne sont pas des avertissements
        foreach ($this->errors as $rowId => $rowErrors) {
            // Si cette ligne a des erreurs mais pas d'avertissements, c'est une erreur bloquante
            if (!empty($rowErrors) && (!isset($this->warnings[$rowId]) || count($rowErrors) > count($this->warnings[$rowId]))) {
                return true;
            }
        }
        
        // Aucune erreur bloquante trouvée
        return false;
    }
} 