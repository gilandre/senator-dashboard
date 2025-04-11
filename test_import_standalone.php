<?php
/**
 * Script de test autonome pour l'importation de données avec gestion améliorée des erreurs
 */

require_once __DIR__ . '/vendor/autoload.php';
$dotenv = Dotenv\Dotenv::createImmutable(__DIR__);
$dotenv->load();

use App\Core\Database;
use App\Models\AccessLog;

// Fonction utilitaire pour le log
function log_message($message) {
    echo "[" . date('H:i:s') . "] $message\n";
}

// Créer un fichier CSV temporaire avec des données problématiques
function createTestCsvFile() {
    $tempDir = __DIR__ . '/tmp';
    if (!is_dir($tempDir)) {
        mkdir($tempDir, 0777, true);
    }
    
    $filename = $tempDir . '/test_standalone_' . uniqid() . '.csv';
    $file = fopen($filename, 'w');
    
    // Écrire l'en-tête
    $header = [
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
    
    fputcsv($file, $header, ';', '"', '\\');
    
    // Données de test avec divers cas problématiques
    $testData = [
        // Données valides
        [
            'badge' => '111111',
            'date' => '02/05/2025',
            'time' => '08:00:00',
            'centrale' => 'Entrée A',
            'lecteur' => 'Lecteur 1',
            'event_type' => 'Entrée',
            'nom' => 'Dupont',
            'prenom' => 'Jean',
            'statut' => 'Actif',
            'groupe' => 'Direction',
            'validite' => '01/01/2025',
            'creation' => '01/01/2025'
        ],
        // Date au format américain
        [
            'badge' => '222222',
            'date' => '2025-05-03',
            'time' => '09:15:00',
            'centrale' => 'Entrée B',
            'lecteur' => 'Lecteur 2',
            'event_type' => 'Entrée',
            'nom' => 'Martin',
            'prenom' => 'Sophie',
            'statut' => 'Actif',
            'groupe' => 'IT',
            'validite' => '2025-01-01',
            'creation' => '2025-01-01'
        ],
        // Date invalide
        [
            'badge' => '333333',
            'date' => '35/13/2025',
            'time' => '10:30:00',
            'centrale' => 'Entrée C',
            'lecteur' => 'Lecteur 3',
            'event_type' => 'Entrée',
            'nom' => 'Bernard',
            'prenom' => 'Pierre',
            'statut' => 'Actif',
            'groupe' => 'Maintenance',
            'validite' => '01/01/2025',
            'creation' => '01/01/2025'
        ],
        // Heure invalide
        [
            'badge' => '444444',
            'date' => '04/05/2025',
            'time' => '25:61:99',
            'centrale' => 'Entrée D',
            'lecteur' => 'Lecteur 4',
            'event_type' => 'Entrée',
            'nom' => 'Robert',
            'prenom' => 'Marie',
            'statut' => 'Actif',
            'groupe' => 'Accueil',
            'validite' => '01/01/2025',
            'creation' => '01/01/2025'
        ],
        // Badge vide (devrait générer une erreur)
        [
            'badge' => '',
            'date' => '05/05/2025',
            'time' => '12:00:00',
            'centrale' => 'Entrée E',
            'lecteur' => 'Lecteur 5',
            'event_type' => 'Entrée',
            'nom' => 'Petit',
            'prenom' => 'François',
            'statut' => 'Actif',
            'groupe' => 'RH',
            'validite' => '01/01/2025',
            'creation' => '01/01/2025'
        ],
        // Date vide (devrait générer une erreur)
        [
            'badge' => '555555',
            'date' => '',
            'time' => '14:30:00',
            'centrale' => 'Entrée F',
            'lecteur' => 'Lecteur 6',
            'event_type' => 'Entrée',
            'nom' => 'Dubois',
            'prenom' => 'Julie',
            'statut' => 'Actif',
            'groupe' => 'Comptabilité',
            'validite' => '01/01/2025',
            'creation' => '01/01/2025'
        ],
        // Heure vide (devrait utiliser 00:00:00)
        [
            'badge' => '666666',
            'date' => '06/05/2025',
            'time' => '',
            'centrale' => 'Entrée G',
            'lecteur' => 'Lecteur 7',
            'event_type' => 'Entrée',
            'nom' => 'Leroy',
            'prenom' => 'Thomas',
            'statut' => 'Actif',
            'groupe' => 'Direction',
            'validite' => '01/01/2025',
            'creation' => '01/01/2025'
        ],
        // Type d'événement vide (devrait utiliser 'Inconnu')
        [
            'badge' => '777777',
            'date' => '07/05/2025',
            'time' => '16:45:00',
            'centrale' => 'Entrée H',
            'lecteur' => 'Lecteur 8',
            'event_type' => '',
            'nom' => 'Moreau',
            'prenom' => 'Laura',
            'statut' => 'Actif',
            'groupe' => 'Commercial',
            'validite' => '01/01/2025',
            'creation' => '01/01/2025'
        ],
        // Date et heure dans des formats particuliers
        [
            'badge' => '888888',
            'date' => '08.05.2025',
            'time' => '18h30',
            'centrale' => 'Entrée I',
            'lecteur' => 'Lecteur 9',
            'event_type' => 'Entrée',
            'nom' => 'Fournier',
            'prenom' => 'Stéphane',
            'statut' => 'Actif',
            'groupe' => 'Production',
            'validite' => '01/01/2025',
            'creation' => '01/01/2025'
        ],
        // Doublon du premier enregistrement
        [
            'badge' => '111111',
            'date' => '02/05/2025',
            'time' => '08:00:00',
            'centrale' => 'Entrée A',
            'lecteur' => 'Lecteur 1',
            'event_type' => 'Entrée',
            'nom' => 'Dupont',
            'prenom' => 'Jean',
            'statut' => 'Actif',
            'groupe' => 'Direction',
            'validite' => '01/01/2025',
            'creation' => '01/01/2025'
        ]
    ];
    
    // Écrire les données
    foreach ($testData as $row) {
        fputcsv($file, [
            $row['badge'],
            $row['date'],
            $row['time'],
            $row['centrale'],
            $row['lecteur'],
            $row['event_type'],
            $row['nom'],
            $row['prenom'],
            $row['statut'],
            $row['groupe'],
            $row['validite'],
            $row['creation']
        ], ';', '"', '\\');
    }
    
    fclose($file);
    return $filename;
}

/**
 * Formatte la date et l'heure pour l'insertion dans la base de données
 */
function formatDateTime($date, $time): array
{
    // Gérer le cas où date est NULL ou vide
    if (empty($date)) {
        log_message("FormatDateTime - Date vide, utilisation de la date du jour");
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
            log_message("FormatDateTime - Format de date détecté automatiquement pour: " . $date);
        } catch (\Exception $e) {
            log_message("FormatDateTime - Format de date invalide: " . $date . ", utilisation de la date du jour");
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
                    log_message("FormatDateTime - Heure nettoyée et reformatée: " . $time . " -> " . $validTime);
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
                        log_message("FormatDateTime - Heure reconstituée manuellement: " . $time . " -> " . $validTime);
                    }
                } catch (\Exception $e) {
                    log_message("FormatDateTime - Format d'heure invalide après nettoyage: " . $time . ", utilisation de 00:00:00");
                }
            }
        }
    }
    
    return [$validDate, $validTime];
}

/**
 * Vérifie si un enregistrement est un doublon
 */
function isDuplicate($db, string $badgeNumber, string $eventDate, ?string $eventTime = null, ?string $eventType = null): bool
{
    try {
        // Log pour le débogage
        log_message("IsDuplicate: Vérification pour badge=$badgeNumber, date=$eventDate" . 
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
        $stmt = $db->query($sql, $params);
        $count = $stmt->fetchColumn();
        
        // Log du résultat
        log_message("IsDuplicate: Résultat = " . ($count > 0 ? "Oui (doublon trouvé)" : "Non (pas de doublon)"));
        
        return $count > 0;
    } catch (\Exception $e) {
        // En cas d'erreur, log et retourner false pour continuer l'importation
        log_message("IsDuplicate: Erreur lors de la vérification - " . $e->getMessage());
        return false;
    }
}

/**
 * Insère un enregistrement d'accès dans la base de données
 */
function insertAccessLog($db, array $data): bool
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
                    list($eventDate, $eventTime) = formatDateTime($data['date_time'], '00:00:00');
                }
            } else {
                // Si aucune date n'est fournie, utiliser la date du jour
                $eventDate = date('Y-m-d');
                $eventTime = '00:00:00';
                log_message("InsertAccessLog: Aucune date fournie, utilisation de la date du jour");
            }
        }
        
        // Vérifier les données obligatoires
        if (empty($data['badge_id'])) {
            throw new \InvalidArgumentException("Le numéro de badge est obligatoire");
        }
        
        if (empty($eventDate)) {
            $eventDate = date('Y-m-d');
            log_message("InsertAccessLog: Date vide après traitement, utilisation de la date du jour");
        }
        
        if (empty($eventTime)) {
            $eventTime = '00:00:00';
            log_message("InsertAccessLog: Heure vide après traitement, utilisation de 00:00:00");
        }
        
        // S'assurer que event_type a une valeur (obligatoire)
        $eventType = !empty($data['event_type']) ? $data['event_type'] : 'Inconnu';
        
        // Utiliser le modèle AccessLog pour l'insertion
        $accessLog = new AccessLog();
        $accessLog->event_date = $eventDate;
        $accessLog->event_time = $eventTime;
        $accessLog->badge_number = $data['badge_id'];
        $accessLog->event_type = $eventType;
        $accessLog->central = $data['controller'] ?? null;    // Transformé de controller à central
        $accessLog->group_name = $data['group'] ?? null;      // Transformé de group à group_name
        
        // Insérer l'enregistrement
        $result = $accessLog->insert();
        
        if (!$result) {
            log_message("InsertAccessLog: Échec de l'insertion sans erreur spécifique");
            return false;
        }
        
        // Log de l'insertion réussie
        log_message("InsertAccessLog: Insertion réussie pour le badge " . $data['badge_id'] . " à la date " . $eventDate);
        return true;
        
    } catch (\PDOException $e) {
        log_message("InsertAccessLog: Erreur PDO lors de l'insertion - " . $e->getMessage());
        throw $e; // Relayer l'exception pour traitement par l'appelant
    } catch (\Exception $e) {
        log_message("InsertAccessLog: Exception lors de l'insertion - " . $e->getMessage());
        throw $e; // Relayer l'exception pour traitement par l'appelant
    }
}

/**
 * Version autonome améliorée de l'importation de données
 */
function importDataImproved($db, $data): array
{
    $result = [
        'total' => count($data),
        'imported' => 0,
        'duplicates' => 0,
        'errors' => 0,
        'error_details' => []
    ];

    if (empty($data)) {
        log_message("ImportDataImproved: Aucune donnée à importer");
        return $result;
    }

    log_message("ImportDataImproved: Début de l'importation de " . count($data) . " lignes");

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
            list($formattedDate, $formattedTime) = formatDateTime($dateEvt, $heureEvt);
            
            // Vérifier si un enregistrement similaire existe déjà (éviter les doublons)
            if (isDuplicate($db, $row['Numéro de badge'], $formattedDate, $formattedTime, $eventType)) {
                log_message("ImportDataImproved: Doublon détecté pour badge " . $row['Numéro de badge'] . " à la date " . $formattedDate);
                $result['duplicates']++;
                continue;
            }
            
            // Insérer l'enregistrement
            insertAccessLog($db, [
                'date_time' => $formattedDate,
                'time' => $formattedTime,
                'badge_id' => $row['Numéro de badge'],
                'event_type' => $eventType,
                'controller' => !empty($row['Centrale']) ? $row['Centrale'] : null,
                'group' => !empty($row['Groupe']) ? $row['Groupe'] : null
            ]);
            
            $result['imported']++;
            log_message("ImportDataImproved: Ligne $index importée avec succès - badge " . $row['Numéro de badge']);
            
        } catch (\InvalidArgumentException $e) {
            log_message("ImportDataImproved: " . $e->getMessage());
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
                log_message("ImportDataImproved: Contrainte d'unicité violée - badge " . $row['Numéro de badge']);
                $result['duplicates']++;
            } else {
                log_message("ImportDataImproved: Erreur PDO: " . $e->getMessage());
                $result['errors']++;
                $result['error_details'][] = [
                    'row' => $index + 1,
                    'error' => "Erreur SQL: " . $e->getMessage(),
                    'data' => json_encode($row)
                ];
            }
        } catch (\Exception $e) {
            // Journaliser l'erreur et continuer avec les autres lignes
            log_message("ImportDataImproved: Erreur lors de l'importation d'une ligne: " . $e->getMessage());
            $result['errors']++;
            $result['error_details'][] = [
                'row' => $index + 1,
                'error' => "Erreur: " . $e->getMessage(),
                'data' => json_encode($row)
            ];
        }
    }
    
    log_message("ImportDataImproved: Fin de l'importation - {$result['imported']} importés, {$result['duplicates']} doublons, {$result['errors']} erreurs");
    
    // Calculer le taux de succès en tenant compte des doublons comme des succès
    $successRate = ($result['total'] > 0) ? round(100 * (($result['imported'] + $result['duplicates']) / $result['total'])) : 0;
    $result['success_rate'] = $successRate;
    
    log_message("ImportDataImproved: Statistiques finales - Total: {$result['total']}, Importés: {$result['imported']}, Doublons: {$result['duplicates']}, Erreurs: {$result['errors']}, Taux de succès: {$result['success_rate']}%");
    
    return $result;
}

// Programme principal
try {
    log_message("Début du test d'importation autonome");
    
    // 1. Créer le fichier de test
    $csvFile = createTestCsvFile();
    log_message("Fichier de test créé: $csvFile");
    
    // 2. Lire le fichier CSV
    // Fonction simplifiée de lecture CSV
    $data = [];
    $handle = fopen($csvFile, 'r');
    $headers = fgetcsv($handle, 0, ';', '"', '\\');
    
    while (($row = fgetcsv($handle, 0, ';', '"', '\\')) !== false) {
        $assocRow = [];
        foreach ($headers as $i => $header) {
            $assocRow[$header] = $row[$i] ?? '';
        }
        $data[] = $assocRow;
    }
    fclose($handle);
    
    log_message("Lecture du fichier CSV: " . count($data) . " lignes trouvées");
    
    // Afficher les données lues
    log_message("Aperçu des données:");
    foreach (array_slice($data, 0, 3) as $index => $row) {
        log_message("  Ligne " . ($index + 1) . ": Badge=" . ($row['Numéro de badge'] ?? 'N/A') . 
                   ", Date=" . ($row['Date évènements'] ?? 'N/A') . 
                   ", Heure=" . ($row['Heure évènements'] ?? 'N/A'));
    }
    
    // 3. Initialiser la connexion à la base de données
    $db = Database::getInstance();
    
    // 4. Exécuter l'importation
    log_message("Exécution de l'importation améliorée...");
    $result = importDataImproved($db, $data);
    
    // 5. Afficher les résultats
    log_message("Importation terminée avec les résultats suivants:");
    log_message("- Total de lignes: " . $result['total']);
    log_message("- Lignes importées: " . $result['imported']);
    log_message("- Doublons détectés: " . $result['duplicates']);
    log_message("- Erreurs rencontrées: " . $result['errors']);
    log_message("- Taux de réussite: " . $result['success_rate'] . "%");
    
    // 6. Afficher les détails des erreurs s'il y en a
    if (!empty($result['error_details'])) {
        log_message("\nDétails des erreurs:");
        foreach ($result['error_details'] as $error) {
            log_message("- Ligne " . $error['row'] . ": " . $error['error']);
        }
    }
    
    // 7. Vérifier les données dans la base
    $badgesToCheck = ['111111', '222222', '333333', '444444', '555555', '666666', '777777', '888888'];
    
    log_message("\nVérification des données importées:");
    foreach ($badgesToCheck as $badge) {
        $sql = "SELECT * FROM access_logs WHERE badge_number = ? ORDER BY id DESC LIMIT 1";
        $stmt = $db->query($sql, [$badge]);
        $record = $stmt->fetch(\PDO::FETCH_ASSOC);
        
        if ($record) {
            log_message("Badge $badge: Trouvé - ID: {$record['id']}, Date: {$record['event_date']}, Heure: {$record['event_time']}, Type: {$record['event_type']}");
        } else {
            log_message("Badge $badge: Non trouvé");
        }
    }
    
    // 8. Nettoyer
    unlink($csvFile);
    log_message("Fichier temporaire supprimé");
    log_message("Test terminé avec succès");
    
} catch (Exception $e) {
    log_message("ERREUR: " . $e->getMessage());
    log_message("Trace: " . $e->getTraceAsString());
} 