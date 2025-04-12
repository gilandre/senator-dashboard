<?php
// Script de test pour l'importation avec MySQL uniquement

// Activer l'affichage des erreurs
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

echo "=== Test d'importation avec MySQL ===\n";

// Charger les variables d'environnement
$envFile = __DIR__ . '/.env';
if (file_exists($envFile)) {
    $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos($line, '#') === 0 || !strpos($line, '=')) {
            continue;
        }
        list($key, $value) = explode('=', $line, 2);
        $key = trim($key);
        $value = trim($value);
        if (!empty($key)) {
            putenv("$key=$value");
            $_ENV[$key] = $value;
        }
    }
} else {
    die("Erreur: Fichier .env introuvable.\n");
}

// Obtenir les informations de connexion
$host = getenv('DB_HOST') ?: 'localhost';
$port = getenv('DB_PORT') ?: '3306';
$dbname = getenv('DB_DATABASE') ?: 'senator_db';
$username = getenv('DB_USERNAME') ?: 'root';
$password = getenv('DB_PASSWORD') ?: '';

try {
    // Connexion à MySQL
    $dsn = "mysql:host=$host;port=$port;dbname=$dbname;charset=utf8mb4";
    $db = new PDO($dsn, $username, $password);
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    echo "Connexion à MySQL réussie.\n";
    
    // Vérifier le nombre d'enregistrements avant l'importation
    $stmt = $db->query("SELECT COUNT(*) FROM access_logs");
    $countBefore = $stmt->fetchColumn();
    echo "Nombre d'enregistrements avant l'importation: $countBefore\n";
    
    // Effectuer un nettoyage préalable dans la table historique
    $db->exec("DELETE FROM import_history WHERE id > 0");
    echo "Historique d'importation nettoyé.\n";
    
    // Choisir un fichier CSV à importer
    $csvFile = __DIR__ . '/Exportation 1.csv';
    if (!file_exists($csvFile)) {
        die("Erreur: Fichier CSV introuvable: $csvFile\n");
    }
    
    echo "Fichier à importer: $csvFile\n";
    
    // Récupérer les données du CSV
    $startTime = microtime(true);
    $separator = ';';  // Utiliser le point-virgule comme séparateur
    $hasHeader = true;
    
    // Utiliser la méthode native fgetcsv pour une meilleure compatibilité
    echo "Tentative d'ouverture du fichier CSV...\n";
    $handle = fopen($csvFile, "r");
    
    if ($handle === false) {
        die("Erreur: Impossible d'ouvrir le fichier CSV.\n");
    }
    
    $data = [];
    $lineNumber = 0;
    $header = [];
    
    // Lecture de l'en-tête
    $header = fgetcsv($handle, 0, $separator);
    
    if ($header !== false) {
        $lineNumber++;
        
        // Supprimer le BOM UTF-8 si présent
        if (!empty($header[0]) && substr($header[0], 0, 3) === "\xEF\xBB\xBF") {
            $header[0] = substr($header[0], 3);
            echo "BOM UTF-8 détecté et supprimé.\n";
        }
        
        // Nettoyer les en-têtes
        $header = array_map('trim', $header);
        
        // Supprimer les en-têtes vides ou qui contiennent uniquement des espaces
        $header = array_filter($header, function($value) {
            return !empty(trim($value));
        });
        
        // Réindexer le tableau
        $header = array_values($header);
        
        // Afficher le nombre d'en-têtes
        echo "Nombre d'en-têtes après nettoyage: " . count($header) . "\n";
        echo "En-têtes du CSV: " . implode(", ", $header) . "\n";
        
        // Lecture des données
        $rowCount = 0;
        $maxRows = 1000000; // Augmenter la limite pour importer tout le fichier
        
        while (($row = fgetcsv($handle, 0, $separator)) !== false && $rowCount < $maxRows) {
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
            
            $rowData = array_combine($header, $row);
            if ($rowData !== false) {
                $data[] = $rowData;
                $rowCount++;
                
                // Afficher la première ligne pour débogage
                if ($rowCount === 1) {
                    echo "Exemple de ligne importée:\n";
                    foreach ($rowData as $key => $value) {
                        echo "  $key: $value\n";
                    }
                }
            } else {
                echo "Erreur: Impossible de combiner l'en-tête et les données de la ligne $lineNumber.\n";
                echo "Nombre d'en-têtes: " . count($header) . ", Nombre de colonnes: " . count($row) . "\n";
            }
        }
        
        fclose($handle);
        
        $loadTime = microtime(true) - $startTime;
        echo "Lecture du CSV terminée en " . round($loadTime, 2) . " secondes. $rowCount lignes lues.\n";
    } else {
        echo "ERREUR: Impossible de lire l'en-tête du fichier CSV.\n";
        // Afficher des informations sur le fichier
        echo "Taille du fichier: " . filesize($csvFile) . " octets\n";
        echo "Contenu brut des premières lignes:\n";
        $rawContent = file_get_contents($csvFile, false, null, 0, 500);
        echo $rawContent . "\n";
        fclose($handle);
    }
    
    // Fonction pour formater la date et l'heure
    function formatDateTime($date, $time) {
        // Gérer les dates vides
        if (empty($date)) {
            return [date('Y-m-d'), '00:00:00'];
        }
        
        // Cas où la date contient également l'heure (format "dd/mm/yyyy hh:mm:ss")
        if (preg_match('/^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2}):(\d{2})$/', $date, $matches)) {
            $formattedDate = "{$matches[3]}-{$matches[2]}-{$matches[1]}";
            $formattedTime = "{$matches[4]}:{$matches[5]}:{$matches[6]}";
            return [$formattedDate, $formattedTime];
        }
        
        // Format le plus courant d'abord
        if (preg_match('/^(\d{2})\/(\d{2})\/(\d{4})$/', $date, $matches)) {
            $formattedDate = "{$matches[3]}-{$matches[2]}-{$matches[1]}";
        } elseif (preg_match('/^(\d{4})-(\d{2})-(\d{2})$/', $date, $matches)) {
            $formattedDate = $date;
        } elseif (preg_match('/^(\d{2})-(\d{2})-(\d{4})$/', $date, $matches)) {
            $formattedDate = "{$matches[3]}-{$matches[2]}-{$matches[1]}";
        } elseif (preg_match('/^(\d{2})\.(\d{2})\.(\d{4})$/', $date, $matches)) {
            $formattedDate = "{$matches[3]}-{$matches[2]}-{$matches[1]}";
        } else {
            $timestamp = strtotime($date);
            $formattedDate = $timestamp ? date('Y-m-d', $timestamp) : date('Y-m-d');
        }
        
        // Formater l'heure
        if (empty($time)) {
            $formattedTime = '00:00:00';
        } elseif (preg_match('/^(\d{2}):(\d{2}):(\d{2})$/', $time)) {
            $formattedTime = $time;
        } elseif (preg_match('/^(\d{2}):(\d{2})$/', $time)) {
            $formattedTime = $time . ':00';
        } elseif (preg_match('/^(\d{1,2})[^0-9]+(\d{1,2})/', $time, $matches)) {
            $hours = min(23, max(0, intval($matches[1])));
            $minutes = min(59, max(0, intval($matches[2])));
            $formattedTime = sprintf('%02d:%02d:00', $hours, $minutes);
        } else {
            $timestamp = strtotime($time);
            $formattedTime = $timestamp ? date('H:i:s', $timestamp) : '00:00:00';
        }
        
        return [$formattedDate, $formattedTime];
    }
    
    // Préparer le tableau des entrées existantes pour vérifier les doublons
    $existingEntries = [];
    $thirtyDaysAgo = date('Y-m-d', strtotime('-30 days'));
    $stmt = $db->prepare("SELECT badge_number, event_date, event_time, event_type FROM access_logs WHERE event_date >= ?");
    $stmt->execute([$thirtyDaysAgo]);
    
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        $key = $row['badge_number'] . '|' . $row['event_date'] . '|' . $row['event_time'] . '|' . $row['event_type'];
        $existingEntries[$key] = true;
    }
    
    echo "Vérification des doublons préparée avec " . count($existingEntries) . " entrées existantes.\n";
    
    // Traiter et insérer les données
    $startTime = microtime(true);
    $recordsToInsert = [];
    $duplicateCount = 0;
    $errorCount = 0;
    
    foreach ($data as $index => $row) {
        try {
            // Vérifier les champs obligatoires - adaptation pour les noms sans accents
            $badgeFieldFound = false;
            $dateFieldFound = false;
            
            // Chercher les champs avec ou sans accents
            foreach ($row as $key => $value) {
                if (in_array(strtolower(str_replace(' ', '', $key)), ['numerodbadge', 'numérodebadge', 'numerodebadge', 'numérodebadge'])) {
                    $badgeNumber = $value;
                    $badgeFieldFound = true;
                }
                if (in_array(strtolower(str_replace(' ', '', $key)), ['dateevenements', 'dateévènements', 'dateevenement', 'dateévènement'])) {
                    $dateEvt = $value;
                    $dateFieldFound = true;
                }
            }
            
            if (!$badgeFieldFound || !$dateFieldFound || empty($badgeNumber) || empty($dateEvt)) {
                echo "Erreur ligne " . ($index + 1) . ": Champs obligatoires manquants.\n";
                if (!$badgeFieldFound || empty($badgeNumber)) echo "  - Numéro de badge manquant\n";
                if (!$dateFieldFound || empty($dateEvt)) echo "  - Date évènements manquant\n";
                $errorCount++;
                continue;
            }
            
            // Récupérer les autres données avec flexibilité
            $heureEvt = '';
            $eventType = '';
            $centrale = '';
            $groupe = '';
            $prenom = '';
            $nom = '';
            $statut = '';
            
            foreach ($row as $key => $value) {
                $keyLower = strtolower(str_replace(' ', '', $key));
                if (in_array($keyLower, ['heureevènements', 'heureevenements', 'heureevènement', 'heureevenement', 'heure'])) {
                    $heureEvt = $value;
                }
                if (in_array($keyLower, ['natureévenement', 'natureevenement', 'type', 'evenementtype', 'événementtype'])) {
                    $eventType = $value;
                }
                if (in_array($keyLower, ['centrale', 'central', 'controller'])) {
                    $centrale = $value;
                }
                if (in_array($keyLower, ['groupe', 'group', 'groupname'])) {
                    $groupe = $value;
                }
                if (in_array($keyLower, ['prénom', 'prenom', 'firstname'])) {
                    $prenom = $value;
                }
                if (in_array($keyLower, ['nom', 'name', 'lastname'])) {
                    $nom = $value;
                }
                if (in_array($keyLower, ['statut', 'status'])) {
                    $statut = $value;
                }
            }
            
            // Utiliser des valeurs par défaut si nécessaire
            if (empty($heureEvt)) $heureEvt = '00:00:00';
            if (empty($eventType)) $eventType = 'Inconnu';
            
            // Formater la date et l'heure
            list($formattedDate, $formattedTime) = formatDateTime($dateEvt, $heureEvt);
            
            // Vérifier si c'est un doublon
            $entryKey = $badgeNumber . '|' . $formattedDate . '|' . $formattedTime . '|' . $eventType;
            if (isset($existingEntries[$entryKey])) {
                $duplicateCount++;
                continue;
            }
            
            // Marquer comme existant pour les vérifications suivantes
            $existingEntries[$entryKey] = true;
            
            // Ajouter à la liste des enregistrements à insérer
            $recordsToInsert[] = [
                'badge_number' => $badgeNumber,
                'event_date' => $formattedDate,
                'event_time' => $formattedTime,
                'event_type' => $eventType,
                'central' => !empty($centrale) ? $centrale : null,
                'group_name' => !empty($groupe) ? $groupe : null,
                'first_name' => !empty($prenom) ? $prenom : null,
                'last_name' => !empty($nom) ? $nom : null,
                'status' => !empty($statut) ? $statut : null
            ];
        } catch (Exception $e) {
            echo "Erreur ligne " . ($index + 1) . ": " . $e->getMessage() . "\n";
            $errorCount++;
        }
    }
    
    // Effectuer l'insertion en lot
    $insertedCount = 0;
    if (!empty($recordsToInsert)) {
        try {
            // Commencer une transaction
            $db->beginTransaction();
            
            // Construire la requête d'insertion multiple
            $valuesSql = [];
            $params = [];
            
            foreach ($recordsToInsert as $record) {
                $valuesSql[] = "(?, ?, ?, ?, ?, ?, ?, ?, ?)";
                $params[] = $record['badge_number'];
                $params[] = $record['event_date'];
                $params[] = $record['event_time'];
                $params[] = $record['event_type'];
                $params[] = $record['central'];
                $params[] = $record['group_name'];
                $params[] = $record['first_name'];
                $params[] = $record['last_name'];
                $params[] = $record['status'];
            }
            
            $sql = "INSERT INTO access_logs 
                   (badge_number, event_date, event_time, event_type, central, group_name, first_name, last_name, status) 
                   VALUES " . implode(', ', $valuesSql);
            
            $stmt = $db->prepare($sql);
            $stmt->execute($params);
            
            // Valider la transaction
            $db->commit();
            
            $insertedCount = count($recordsToInsert);
            echo "Insertion en lot réussie: $insertedCount enregistrements insérés.\n";
        } catch (Exception $e) {
            // Annuler la transaction en cas d'erreur
            $db->rollBack();
            echo "Erreur lors de l'insertion en lot: " . $e->getMessage() . "\n";
        }
    }
    
    $importTime = microtime(true) - $startTime;
    echo "Importation terminée en " . round($importTime, 2) . " secondes.\n";
    
    // Créer un enregistrement d'historique
    try {
        $stmt = $db->prepare("
            INSERT INTO import_history 
            (filename, total_records, imported_records, duplicate_records, error_records, user_id, success_rate) 
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ");
        
        $filename = basename($csvFile);
        $total = count($data);
        $successRate = $total > 0 ? round(($insertedCount / $total) * 100, 2) : 0;
        
        $stmt->execute([
            $filename,
            $total,
            $insertedCount,
            $duplicateCount,
            $errorCount,
            1, // User ID fixe pour le test
            $successRate
        ]);
        
        $historyId = $db->lastInsertId();
        echo "Historique d'importation créé avec ID: $historyId\n";
    } catch (Exception $e) {
        echo "Erreur lors de la création de l'historique: " . $e->getMessage() . "\n";
    }
    
    // Vérifier le nombre d'enregistrements après l'importation
    $stmt = $db->query("SELECT COUNT(*) FROM access_logs");
    $countAfter = $stmt->fetchColumn();
    echo "Nombre d'enregistrements après l'importation: $countAfter\n";
    echo "Différence: " . ($countAfter - $countBefore) . " nouveaux enregistrements\n";
    
    // Résumé
    echo "\n=== Résumé de l'importation ===\n";
    echo "Lignes lues: $rowCount\n";
    echo "Enregistrements importés: $insertedCount\n";
    echo "Doublons ignorés: $duplicateCount\n";
    echo "Erreurs: $errorCount\n";
    echo "Temps de lecture: " . round($loadTime, 2) . " secondes\n";
    echo "Temps d'importation: " . round($importTime, 2) . " secondes\n";
    echo "Temps total: " . round($loadTime + $importTime, 2) . " secondes\n";
    
} catch (PDOException $e) {
    die("Erreur de connexion MySQL: " . $e->getMessage() . "\n");
} 