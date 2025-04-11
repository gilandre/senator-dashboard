<?php
/**
 * Script de test pour démontrer les améliorations du système d'importation
 * Ce script peut être exécuté indépendamment pour tester la robustesse
 * des nouvelles méthodes d'importation face à différents scénarios.
 */

echo "==== TEST DES AMÉLIORATIONS DU SYSTÈME D'IMPORTATION ====\n\n";

// Créer une classe de test qui émule le comportement de ImportController
class TestImportController {
    public $db;
    public $duplicates = [];
    
    public function __construct() {
        // Simuler une connexion à la base de données
        echo "Initialisation de la connexion à la base de données...\n";
        $this->db = new MockDatabase();
        echo "Connexion établie avec succès.\n\n";
    }
    
    /**
     * Méthode améliorée pour formater les dates et heures
     */
    private function formatDateTime($date, $time): array
    {
        echo "formatDateTime() appelée avec: date='$date', time='$time'\n";
        
        // Gérer le cas où date est NULL ou vide
        if (empty($date)) {
            echo "  - Date vide, utilisation de la date du jour\n";
            return [date('Y-m-d'), '00:00:00'];
        }
        
        // Convertir les formats de date possibles en Y-m-d
        $dateFormats = ['d/m/Y', 'Y-m-d', 'd-m-Y', 'Y/m/d', 'd.m.Y'];
        $validDate = null;
        
        // Nettoyer la date (supprimer les caractères non numériques sauf les séparateurs)
        $date = trim($date);
        echo "  - Date après nettoyage: '$date'\n";
        
        foreach ($dateFormats as $format) {
            $dateObj = \DateTime::createFromFormat($format, $date);
            if ($dateObj && $dateObj->format($format) === $date) {
                $validDate = $dateObj->format('Y-m-d');
                echo "  - Format de date détecté: $format -> $validDate\n";
                break;
            }
        }
        
        // Si aucun format ne correspond, essayer de détecter et convertir
        if ($validDate === null) {
            // Essayer de détecter le format automatiquement
            try {
                $dateObj = new \DateTime($date);
                $validDate = $dateObj->format('Y-m-d');
                echo "  - Format de date détecté automatiquement: $date -> $validDate\n";
            } catch (\Exception $e) {
                echo "  - Format de date invalide: $date, utilisation de la date du jour\n";
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
                    echo "  - Format d'heure détecté: $format -> $validTime\n";
                    break;
                }
            }
            
            // Si aucun format ne correspond, essayer de nettoyer et reformater
            if ($validTime === "00:00:00" && $time !== "00:00:00") {
                // Nettoyer l'heure (garder uniquement les chiffres et les :)
                $cleanTime = preg_replace('/[^0-9:]/', '', $time);
                echo "  - Heure après nettoyage: '$time' -> '$cleanTime'\n";
                
                // Essayer différents formats après nettoyage
                foreach ($timeFormats as $format) {
                    $timeObj = \DateTime::createFromFormat($format, $cleanTime);
                    if ($timeObj) {
                        $validTime = $timeObj->format('H:i:s');
                        echo "  - Heure nettoyée et reformatée: $time -> $validTime\n";
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
                            echo "  - Heure reconstituée manuellement: $time -> $validTime\n";
                        }
                    } catch (\Exception $e) {
                        echo "  - Format d'heure invalide après nettoyage: $time, utilisation de 00:00:00\n";
                    }
                }
            }
        } else {
            echo "  - Heure vide, utilisation de 00:00:00\n";
        }
        
        echo "  - Résultat final: [$validDate, $validTime]\n";
        return [$validDate, $validTime];
    }
    
    /**
     * Méthode améliorée pour vérifier les doublons
     */
    private function isDuplicate(string $badgeNumber, string $eventDate, ?string $eventTime = null, ?string $eventType = null): bool
    {
        echo "isDuplicate() appelée pour: badge=$badgeNumber, date=$eventDate" . 
             ($eventTime ? ", time=$eventTime" : "") . 
             ($eventType ? ", type=$eventType" : "") . "\n";
        
        // Simuler la vérification de doublons
        $key = "$badgeNumber-$eventDate";
        if ($eventTime) $key .= "-$eventTime";
        if ($eventType) $key .= "-$eventType";
        
        $isDuplicate = $this->db->isDuplicate($key);
        echo "  - Résultat: " . ($isDuplicate ? "DOUBLON TROUVÉ" : "Pas de doublon") . "\n";
        
        return $isDuplicate;
    }
    
    /**
     * Méthode améliorée pour insérer un enregistrement
     */
    private function insertAccessLog(array $data): void
    {
        echo "insertAccessLog() appelée\n";
        
        try {
            // Vérifier et préparer les données pour event_date et event_time
            if (isset($data['date_time']) && isset($data['time'])) {
                $eventDate = $data['date_time'];
                $eventTime = $data['time'];
                echo "  - Données de date/heure fournies directement\n";
            } else {
                // Cas de compatibilité avec l'ancien format
                if (isset($data['date_time'])) {
                    try {
                        $dateTime = new \DateTime($data['date_time']);
                        $eventDate = $dateTime->format('Y-m-d');
                        $eventTime = $dateTime->format('H:i:s');
                        echo "  - Date/heure extraites de date_time: $eventDate $eventTime\n";
                    } catch (\Exception $e) {
                        list($eventDate, $eventTime) = $this->formatDateTime($data['date_time'], '00:00:00');
                        echo "  - Conversion de date_time via formatDateTime\n";
                    }
                } else {
                    // Si aucune date n'est fournie, utiliser la date du jour
                    $eventDate = date('Y-m-d');
                    $eventTime = '00:00:00';
                    echo "  - Aucune date fournie, utilisation de la date du jour: $eventDate $eventTime\n";
                }
            }
            
            // Vérifier les données obligatoires
            if (empty($data['badge_id'])) {
                throw new \InvalidArgumentException("Le numéro de badge est obligatoire");
            }
            
            if (empty($eventDate)) {
                $eventDate = date('Y-m-d');
                echo "  - Date vide après traitement, utilisation de la date du jour: $eventDate\n";
            }
            
            if (empty($eventTime)) {
                $eventTime = '00:00:00';
                echo "  - Heure vide après traitement, utilisation de 00:00:00\n";
            }
            
            // S'assurer que event_type a une valeur (obligatoire)
            $eventType = !empty($data['event_type']) ? $data['event_type'] : 'Inconnu';
            
            // Simuler l'insertion dans la base de données
            echo "  - Insertion de l'enregistrement:\n";
            echo "    * badge_number: " . $data['badge_id'] . "\n";
            echo "    * event_date: $eventDate\n";
            echo "    * event_time: $eventTime\n";
            echo "    * event_type: $eventType\n";
            echo "    * central: " . ($data['controller'] ?? 'NULL') . "\n";
            echo "    * group_name: " . ($data['group'] ?? 'NULL') . "\n";
            
            // Insérer l'enregistrement simulé dans la base de données
            $key = $data['badge_id'] . "-" . $eventDate;
            if ($eventTime) $key .= "-" . $eventTime;
            if ($eventType) $key .= "-" . $eventType;
            
            $result = $this->db->insert($key, [
                'badge_number' => $data['badge_id'],
                'event_date' => $eventDate,
                'event_time' => $eventTime,
                'event_type' => $eventType,
                'central' => $data['controller'] ?? null,
                'group_name' => $data['group'] ?? null
            ]);
            
            if (!$result) {
                echo "  - ERREUR: Échec de l'insertion sans erreur spécifique\n";
                throw new \RuntimeException("Échec de l'insertion sans erreur spécifique");
            }
            
            echo "  - Insertion réussie pour le badge " . $data['badge_id'] . " à la date " . $eventDate . "\n";
            
        } catch (\PDOException $e) {
            echo "  - ERREUR PDO: " . $e->getMessage() . "\n";
            throw $e; // Relayer l'exception pour traitement par l'appelant
        } catch (\Exception $e) {
            echo "  - ERREUR: " . $e->getMessage() . "\n";
            throw $e; // Relayer l'exception pour traitement par l'appelant
        }
    }
    
    /**
     * Méthode principale pour importer des données
     */
    public function importDataSimple(array $data): array
    {
        $result = [
            'total' => count($data),
            'imported' => 0,
            'duplicates' => 0,
            'errors' => 0,
            'error_details' => []
        ];

        if (empty($data)) {
            echo "Aucune donnée à importer\n";
            return $result;
        }

        echo "Début de l'importation de " . count($data) . " lignes\n";

        foreach ($data as $index => $row) {
            echo "\n--- Traitement de la ligne " . ($index + 1) . " ---\n";
            try {
                // S'assurer que les champs minimaux sont présents
                if (empty($row['Numéro de badge'])) {
                    echo "ERREUR: Le numéro de badge est manquant\n";
                    throw new \InvalidArgumentException("Ligne ".($index+1).": Le numéro de badge est manquant");
                }

                // Gérer le cas où la date est vide
                $dateEvt = !empty($row['Date évènements']) ? $row['Date évènements'] : null;
                if (empty($dateEvt)) {
                    echo "ERREUR: La date d'événement est manquante\n";
                    throw new \InvalidArgumentException("Ligne ".($index+1).": La date d'événement est manquante");
                }

                // Gérer le cas où l'heure est vide - utiliser 00:00:00 comme heure par défaut
                $heureEvt = !empty($row['Heure évènements']) ? $row['Heure évènements'] : '00:00:00';
                
                // Gérer le cas où la nature d'événement est vide
                $eventType = !empty($row['Nature Evenement']) ? $row['Nature Evenement'] : 'Inconnu';
                
                echo "Données brutes:\n";
                echo "  - Badge: " . $row['Numéro de badge'] . "\n";
                echo "  - Date: " . $dateEvt . "\n";
                echo "  - Heure: " . $heureEvt . "\n";
                echo "  - Type: " . $eventType . "\n";
                
                // Convertir la date et l'heure au format souhaité
                list($formattedDate, $formattedTime) = $this->formatDateTime($dateEvt, $heureEvt);
                
                // Vérifier si un enregistrement similaire existe déjà (éviter les doublons)
                if ($this->isDuplicate($row['Numéro de badge'], $formattedDate, $formattedTime, $eventType)) {
                    echo "Doublon détecté pour badge " . $row['Numéro de badge'] . " à la date " . $formattedDate . "\n";
                    $result['duplicates']++;
                    
                    // Mémoriser le doublon pour l'afficher à la fin
                    $this->duplicates[] = [
                        'row_id' => $index + 1,
                        'badge_number' => $row['Numéro de badge'],
                        'date' => $formattedDate,
                        'time' => $formattedTime,
                        'event_type' => $eventType
                    ];
                    
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
                echo "Ligne $index importée avec succès - badge " . $row['Numéro de badge'] . "\n";
                
            } catch (\InvalidArgumentException $e) {
                echo "ERREUR: " . $e->getMessage() . "\n";
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
                    echo "Contrainte d'unicité violée - badge " . $row['Numéro de badge'] . "\n";
                    $result['duplicates']++;
                    
                    // Mémoriser le doublon pour l'afficher à la fin
                    $this->duplicates[] = [
                        'row_id' => $index + 1,
                        'badge_number' => $row['Numéro de badge'],
                        'date' => $formattedDate ?? date('Y-m-d'),
                        'time' => $formattedTime ?? '00:00:00',
                        'event_type' => $eventType ?? 'Inconnu',
                        'error' => 'Contrainte d\'unicité violée'
                    ];
                } else {
                    echo "Erreur SQL: " . $e->getMessage() . "\n";
                    $result['errors']++;
                    $result['error_details'][] = [
                        'row' => $index + 1,
                        'error' => "Erreur SQL: " . $e->getMessage(),
                        'data' => json_encode($row)
                    ];
                }
            } catch (\Exception $e) {
                // Journaliser l'erreur et continuer avec les autres lignes
                echo "Erreur générique: " . $e->getMessage() . "\n";
                $result['errors']++;
                $result['error_details'][] = [
                    'row' => $index + 1,
                    'error' => "Erreur: " . $e->getMessage(),
                    'data' => json_encode($row)
                ];
            }
        }
        
        echo "\nFin de l'importation\n";
        
        // Calculer le taux de succès en tenant compte des doublons comme des succès
        $successRate = ($result['total'] > 0) ? round(100 * (($result['imported'] + $result['duplicates']) / $result['total'])) : 0;
        $result['success_rate'] = $successRate;
        
        return $result;
    }
    
    /**
     * Exécuter des tests avec différents scénarios
     */
    public function runTests() {
        echo "==== DÉBUT DES TESTS ====\n\n";
        
        // Créer des données de test variées
        $testData = [
            [
                'Numéro de badge' => '123456',
                'Date évènements' => '06/04/2025',
                'Heure évènements' => '09:45:30',
                'Nature Evenement' => 'Entrée',
                'Centrale' => 'Entrée principale',
                'Groupe' => 'Employés'
            ],
            [
                'Numéro de badge' => '789012',
                'Date évènements' => '2025-04-07',
                'Heure évènements' => '14h30m',
                'Nature Evenement' => 'Sortie',
                'Centrale' => NULL,
                'Groupe' => NULL
            ],
            [
                'Numéro de badge' => '345678',
                'Date évènements' => '08.04.2025',
                'Heure évènements' => NULL,
                'Nature Evenement' => 'Entrée',
                'Centrale' => 'Entrée secondaire',
                'Groupe' => 'Visiteurs'
            ],
            [
                'Numéro de badge' => '123456',  // Doublon intentionnel
                'Date évènements' => '06/04/2025',
                'Heure évènements' => '09:45:30',
                'Nature Evenement' => 'Entrée',
                'Centrale' => 'Entrée principale',
                'Groupe' => 'Employés'
            ],
            [
                'Numéro de badge' => '901234',
                'Date évènements' => '09-04-2025',
                'Heure évènements' => '18:45',
                'Nature Evenement' => 'Sortie',
                'Centrale' => 'Sortie principale',
                'Groupe' => 'Employés'
            ],
            [
                'Numéro de badge' => '',  // Badge vide -> erreur
                'Date évènements' => '10/04/2025',
                'Heure évènements' => '10:30:00',
                'Nature Evenement' => 'Entrée',
                'Centrale' => 'Entrée principale',
                'Groupe' => 'Employés'
            ],
            [
                'Numéro de badge' => '567890',
                'Date évènements' => '',  // Date vide -> erreur
                'Heure évènements' => '11:15:00',
                'Nature Evenement' => 'Entrée',
                'Centrale' => 'Entrée principale',
                'Groupe' => 'Visiteurs'
            ]
        ];
        
        // Exécuter l'importation et analyser les résultats
        $results = $this->importDataSimple($testData);
        
        echo "\n==== RÉSULTATS DES TESTS ====\n\n";
        echo "Total des enregistrements: " . $results['total'] . "\n";
        echo "Enregistrements importés: " . $results['imported'] . "\n";
        echo "Doublons détectés: " . $results['duplicates'] . "\n";
        echo "Erreurs rencontrées: " . $results['errors'] . "\n";
        echo "Taux de succès: " . $results['success_rate'] . "%\n\n";
        
        if (count($this->duplicates) > 0) {
            echo "Liste des doublons détectés:\n";
            foreach ($this->duplicates as $duplicate) {
                echo "  - Ligne " . $duplicate['row_id'] . " | Badge: " . $duplicate['badge_number'] 
                     . " | Date: " . $duplicate['date'] . " | Heure: " . $duplicate['time'] . "\n";
            }
            echo "\n";
        }
        
        if (count($results['error_details']) > 0) {
            echo "Détails des erreurs:\n";
            foreach ($results['error_details'] as $error) {
                echo "  - Ligne " . $error['row'] . " | Erreur: " . $error['error'] . "\n";
            }
            echo "\n";
        }
        
        echo "==== FIN DES TESTS ====\n";
    }
}

/**
 * Mock de base de données pour les tests
 */
class MockDatabase {
    private $data = [];
    private $duplicates = [
        '123456-2025-04-06-09:45:30-Entrée' => true  // Simuler un doublon pré-existant
    ];
    
    public function query($sql, $params) {
        // Simuler une exécution de requête SQL
        return new MockStatement(0); // Simuler aucun résultat par défaut
    }
    
    public function isDuplicate($key) {
        return isset($this->duplicates[$key]);
    }
    
    public function insert($key, $data) {
        if (isset($this->data[$key])) {
            return false; // Simuler un échec si la clé existe déjà
        }
        
        $this->data[$key] = $data;
        $this->duplicates[$key] = true; // Marquer comme existant pour les vérifications futures
        
        return true;
    }
    
    public function getInsertedData() {
        return $this->data;
    }
}

/**
 * Mock de PDOStatement pour les tests
 */
class MockStatement {
    private $count;
    
    public function __construct($count) {
        $this->count = $count;
    }
    
    public function fetchColumn() {
        return $this->count;
    }
}

// Exécuter les tests
$tester = new TestImportController();
$tester->runTests(); 