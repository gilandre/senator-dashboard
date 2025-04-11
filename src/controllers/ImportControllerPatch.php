<?php
/**
 * Ce fichier contient des exemples de code pour améliorer l'ImportController.
 * ATTENTION: Ce fichier n'est pas destiné à être utilisé directement.
 * Il s'agit d'un exemple de code à copier dans la classe ImportController existante.
 * 
 * Les méthodes ci-dessous doivent être copiées et intégrées dans la classe ImportController
 * en tant que méthodes privées. Les références à $this fonctionneront correctement 
 * une fois intégrées dans la classe.
 */

// ==================================================================
// DÉBUT DE L'EXEMPLE - À COPIER DANS LA CLASSE ImportController
// ==================================================================

/**
 * Méthode améliorée pour formater les dates et heures
 * Remplacer la méthode existante par celle-ci
 * 
 * @param string|null $date La date à formater
 * @param string|null $time L'heure à formater
 * @return array Tableau contenant [date_formatée, heure_formatée]
 */
function formatDateTime($date, $time): array
{
    // Gérer le cas où date est NULL ou vide
    if (empty($date)) {
        error_log("ImportController::formatDateTime - Date vide, utilisation de la date du jour");
        return [date('Y-m-d'), '00:00:00'];
    }
    
    // Convertir les formats de date possibles en Y-m-d
    $dateFormats = ['d/m/Y', 'Y-m-d', 'd-m-Y', 'Y/m/d', 'd.m.Y'];
    $validDate = null;
    
    // Nettoyer la date (supprimer les caractères non numériques sauf les séparateurs)
    $date = trim($date);
    
    foreach ($dateFormats as $format) {
        $dateObj = \DateTime::createFromFormat($format, $date);
        if ($dateObj && $dateObj->format($format) === $date) {
            $validDate = $dateObj->format('Y-m-d');
            break;
        }
    }
    
    // Si aucun format ne correspond, essayer de détecter et convertir
    if ($validDate === null) {
        // Essayer de détecter le format automatiquement
        try {
            $dateObj = new \DateTime($date);
            $validDate = $dateObj->format('Y-m-d');
            error_log("ImportController::formatDateTime - Format de date détecté automatiquement pour: " . $date);
        } catch (\Exception $e) {
            error_log("ImportController::formatDateTime - Format de date invalide: " . $date . ", utilisation de la date du jour");
            $validDate = date('Y-m-d');
        }
    }
    
    // Valider et formater l'heure (permettre NULL ou vide)
    $validTime = "00:00:00"; // Valeur par défaut
    if (!empty($time)) {
        $timeFormats = ['H:i:s', 'H:i', 'h:i:s A', 'h:i A'];
        foreach ($timeFormats as $format) {
            $timeObj = \DateTime::createFromFormat($format, $time);
            if ($timeObj && $timeObj->format($format) === $time) {
                $validTime = $timeObj->format('H:i:s');
                break;
            }
        }
        
        // Si aucun format ne correspond, essayer de nettoyer et reformater
        if ($validTime === "00:00:00" && $time !== "00:00:00") {
            // Nettoyer l'heure (garder uniquement les chiffres et les :)
            $cleanTime = preg_replace('/[^0-9:]/', '', $time);
            
            // Essayer différents formats après nettoyage
            foreach ($timeFormats as $format) {
                $timeObj = \DateTime::createFromFormat($format, $cleanTime);
                if ($timeObj) {
                    $validTime = $timeObj->format('H:i:s');
                    error_log("ImportController::formatDateTime - Heure nettoyée et reformatée: " . $time . " -> " . $validTime);
                    break;
                }
            }
            
            // Si toujours pas de correspondance, essayer de détecter le format automatiquement
            if ($validTime === "00:00:00" && $time !== "00:00:00") {
                try {
                    $parts = explode(':', $cleanTime);
                    if (count($parts) >= 2) {
                        $hours = min(23, max(0, intval($parts[0])));
                        $minutes = min(59, max(0, intval($parts[1])));
                        $seconds = isset($parts[2]) ? min(59, max(0, intval($parts[2]))) : 0;
                        $validTime = sprintf('%02d:%02d:%02d', $hours, $minutes, $seconds);
                        error_log("ImportController::formatDateTime - Heure reconstituée manuellement: " . $time . " -> " . $validTime);
                    }
                } catch (\Exception $e) {
                    error_log("ImportController::formatDateTime - Format d'heure invalide après nettoyage: " . $time . ", utilisation de 00:00:00");
                }
            }
        }
    }
    
    return [$validDate, $validTime];
}

/**
 * Méthode améliorée pour vérifier les doublons
 * À ajouter dans la classe ImportController
 * 
 * @param string $badgeNumber Numéro de badge
 * @param string $eventDate Date de l'événement (format Y-m-d)
 * @param string|null $eventTime Heure de l'événement (format H:i:s)
 * @param string|null $eventType Type d'événement
 * @return bool True si un doublon existe, False sinon
 */
function isDuplicate(string $badgeNumber, string $eventDate, ?string $eventTime = null, ?string $eventType = null): bool
{
    try {
        // Log pour le débogage
        error_log("isDuplicate: Vérification pour badge=$badgeNumber, date=$eventDate" . 
                 ($eventTime ? ", time=$eventTime" : "") . 
                 ($eventType ? ", type=$eventType" : ""));
        
        // Construire la requête SQL de base
        $sql = "SELECT COUNT(*) FROM access_logs WHERE badge_number = ? AND event_date = ?";
        $params = [$badgeNumber, $eventDate];
        
        // Ajouter l'heure si elle est fournie
        if ($eventTime !== null) {
            $sql .= " AND event_time = ?";
            $params[] = $eventTime;
        }
        
        // Ajouter le type d'événement s'il est fourni
        if ($eventType !== null) {
            $sql .= " AND event_type = ?";
            $params[] = $eventType;
        }
        
        // Exécuter la requête
        $stmt = $this->db->query($sql, $params);
        $count = $stmt->fetchColumn();
        
        // Log du résultat
        error_log("isDuplicate: Résultat = " . ($count > 0 ? "Oui (doublon trouvé)" : "Non (pas de doublon)"));
        
        return $count > 0;
    } catch (\Exception $e) {
        // En cas d'erreur, log et retourner false pour continuer l'importation
        error_log("isDuplicate: Erreur lors de la vérification - " . $e->getMessage());
        return false;
    }
}

/**
 * Méthode améliorée pour insérer un enregistrement
 * À remplacer dans la classe ImportController
 * 
 * @param array $data Données à insérer
 * @throws \InvalidArgumentException Si les données obligatoires sont manquantes
 * @throws \PDOException En cas d'erreur SQL
 * @throws \RuntimeException En cas d'échec d'insertion
 */
function insertAccessLog(array $data): void
{
    try {
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
                // Si aucune date n'est fournie, utiliser la date du jour
                $eventDate = date('Y-m-d');
                $eventTime = '00:00:00';
                error_log("InsertAccessLog: Aucune date fournie, utilisation de la date du jour");
            }
        }
        
        // Vérifier les données obligatoires
        if (empty($data['badge_id'])) {
            throw new \InvalidArgumentException("Le numéro de badge est obligatoire");
        }
        
        if (empty($eventDate)) {
            $eventDate = date('Y-m-d');
            error_log("InsertAccessLog: Date vide après traitement, utilisation de la date du jour");
        }
        
        if (empty($eventTime)) {
            $eventTime = '00:00:00';
            error_log("InsertAccessLog: Heure vide après traitement, utilisation de 00:00:00");
        }
        
        // S'assurer que event_type a une valeur (obligatoire)
        $eventType = !empty($data['event_type']) ? $data['event_type'] : 'Inconnu';
        
        // Utiliser le modèle AccessLog pour l'insertion
        $accessLog = new \App\Models\AccessLog();  // Assurez-vous d'ajuster le namespace si nécessaire
        $accessLog->event_date = $eventDate;
        $accessLog->event_time = $eventTime;
        $accessLog->badge_number = $data['badge_id'];
        $accessLog->event_type = $eventType;
        $accessLog->central = $data['controller'] ?? null;    // Transformé de controller à central
        $accessLog->group_name = $data['group'] ?? null;      // Transformé de group à group_name
        
        // Insérer l'enregistrement
        $result = $accessLog->insert();
        
        if (!$result) {
            error_log("InsertAccessLog: Échec de l'insertion sans erreur spécifique");
            throw new \RuntimeException("Échec de l'insertion sans erreur spécifique");
        }
        
        // Log de l'insertion réussie
        error_log("InsertAccessLog: Insertion réussie pour le badge " . $data['badge_id'] . " à la date " . $eventDate);
        
    } catch (\PDOException $e) {
        error_log("InsertAccessLog: Erreur PDO lors de l'insertion - " . $e->getMessage());
        throw $e; // Relayer l'exception pour traitement par l'appelant
    } catch (\Exception $e) {
        error_log("InsertAccessLog: Exception lors de l'insertion - " . $e->getMessage());
        throw $e; // Relayer l'exception pour traitement par l'appelant
    }
}

/**
 * Proposition pour une version simplifiée de importData
 * Peut être utilisée comme alternative à la méthode existante
 * 
 * @param array $data Données à importer (format tableau de lignes)
 * @return array Résultats de l'importation avec les statistiques
 */
function importDataSimple(array $data): array
{
    $result = [
        'total' => count($data),
        'imported' => 0,
        'duplicates' => 0,
        'errors' => 0,
        'error_details' => []
    ];

    if (empty($data)) {
        error_log("ImportData: Aucune donnée à importer");
        return $result;
    }

    error_log("ImportData: Début de l'importation de " . count($data) . " lignes");

    foreach ($data as $index => $row) {
        try {
            // S'assurer que les champs minimaux sont présents
            if (empty($row['Numéro de badge'])) {
                throw new \InvalidArgumentException("Ligne ".($index+1).": Le numéro de badge est manquant");
            }

            // Gérer le cas où la date est vide
            $dateEvt = !empty($row['Date évènements']) ? $row['Date évènements'] : null;
            if (empty($dateEvt)) {
                throw new \InvalidArgumentException("Ligne ".($index+1).": La date d'événement est manquante");
            }

            // Gérer le cas où l'heure est vide - utiliser 00:00:00 comme heure par défaut
            $heureEvt = !empty($row['Heure évènements']) ? $row['Heure évènements'] : '00:00:00';
            
            // Gérer le cas où la nature d'événement est vide
            $eventType = !empty($row['Nature Evenement']) ? $row['Nature Evenement'] : 'Inconnu';
            
            // Convertir la date et l'heure au format souhaité
            list($formattedDate, $formattedTime) = $this->formatDateTime($dateEvt, $heureEvt);
            
            // Vérifier si un enregistrement similaire existe déjà (éviter les doublons)
            if ($this->isDuplicate($row['Numéro de badge'], $formattedDate, $formattedTime, $eventType)) {
                error_log("ImportData: Doublon détecté pour badge " . $row['Numéro de badge'] . " à la date " . $formattedDate);
                $result['duplicates']++;
                
                // Ajouter aux doublons pour extraction future si la session existe
                if (isset($_SESSION)) {
                    if (!isset($_SESSION['duplicate_records'])) {
                        $_SESSION['duplicate_records'] = [];
                    }
                    $_SESSION['duplicate_records'][] = [
                        'row_id' => $index + 1,
                        'badge_number' => $row['Numéro de badge'],
                        'date' => $formattedDate,
                        'time' => $formattedTime,
                        'event_type' => $eventType
                    ];
                }
                
                continue;
            }
            
            // Insérer l'enregistrement
            $this->insertAccessLog([
                'date_time' => $formattedDate,
                'time' => $formattedTime,
                'badge_id' => $row['Numéro de badge'],
                'event_type' => $eventType,
                'controller' => !empty($row['Centrale']) ? $row['Centrale'] : null,
                'group' => !empty($row['Groupe']) ? $row['Groupe'] : null
            ]);
            
            $result['imported']++;
            error_log("ImportData: Ligne $index importée avec succès - badge " . $row['Numéro de badge']);
            
        } catch (\InvalidArgumentException $e) {
            error_log("ImportData: " . $e->getMessage());
            $result['errors']++;
            $result['error_details'][] = [
                'row' => $index + 1,
                'error' => $e->getMessage(),
                'data' => json_encode($row)
            ];
        } catch (\PDOException $e) {
            // Vérifier si c'est une erreur de doublon via contrainte unique
            if (strpos($e->getMessage(), 'UNIQUE constraint failed') !== false || 
                strpos($e->getMessage(), 'Duplicate entry') !== false) {
                error_log("ImportData: Contrainte d'unicité violée - badge " . $row['Numéro de badge']);
                $result['duplicates']++;
                
                // Ajouter aux doublons pour extraction future si la session existe
                if (isset($_SESSION)) {
                    if (!isset($_SESSION['duplicate_records'])) {
                        $_SESSION['duplicate_records'] = [];
                    }
                    $_SESSION['duplicate_records'][] = [
                        'row_id' => $index + 1,
                        'badge_number' => $row['Numéro de badge'],
                        'date' => $formattedDate ?? date('Y-m-d'),
                        'time' => $formattedTime ?? '00:00:00',
                        'event_type' => $eventType ?? 'Inconnu',
                        'error' => 'Contrainte d\'unicité violée'
                    ];
                }
            } else {
                error_log("ImportData: Erreur PDO: " . $e->getMessage());
                $result['errors']++;
                $result['error_details'][] = [
                    'row' => $index + 1,
                    'error' => "Erreur SQL: " . $e->getMessage(),
                    'data' => json_encode($row)
                ];
            }
        } catch (\Exception $e) {
            // Journaliser l'erreur et continuer avec les autres lignes
            error_log("ImportData: Erreur lors de l'importation d'une ligne: " . $e->getMessage());
            $result['errors']++;
            $result['error_details'][] = [
                'row' => $index + 1,
                'error' => "Erreur: " . $e->getMessage(),
                'data' => json_encode($row)
            ];
        }
    }
    
    error_log("ImportData: Fin de l'importation - {$result['imported']} importés, {$result['duplicates']} doublons, {$result['errors']} erreurs");
    
    // Calculer le taux de succès en tenant compte des doublons comme des succès
    $successRate = ($result['total'] > 0) ? round(100 * (($result['imported'] + $result['duplicates']) / $result['total'])) : 0;
    $result['success_rate'] = $successRate;
    
    error_log("ImportData: Statistiques finales - Total: {$result['total']}, Importés: {$result['imported']}, Doublons: {$result['duplicates']}, Erreurs: {$result['errors']}, Taux de succès: {$result['success_rate']}%");
    
    return $result;
}

// ==================================================================
// FIN DE L'EXEMPLE - NE PAS COPIER CETTE LIGNE
// ================================================================== 