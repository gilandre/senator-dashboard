<?php
/**
 * Script pour tester l'importation via cURL
 * Ce script simule l'importation d'un fichier CSV via l'interface HTTP
 */

// Chemins des fichiers
$csvFilePath = __DIR__ . '/Exportation 1.csv';
$cookieFile = __DIR__ . '/import_cookies.txt';
$logFile = __DIR__ . '/import_curl_test.log';

// Vérifier si le fichier existe
if (!file_exists($csvFilePath)) {
    die("ERREUR: Le fichier CSV n'existe pas à l'emplacement spécifié: {$csvFilePath}\n");
}

// Initialiser le journal
file_put_contents($logFile, "=== TEST D'IMPORTATION CSV VIA CURL ===\n");
file_put_contents($logFile, "Date: " . date('Y-m-d H:i:s') . "\n", FILE_APPEND);
file_put_contents($logFile, "Fichier: {$csvFilePath}\n", FILE_APPEND);

// Configuration de l'URL de base
$baseUrl = 'http://localhost:8080';

// Fonction pour effectuer une requête cURL
function request($url, $method = 'GET', $postFields = [], $fileUpload = null, $cookies = true) {
    global $cookieFile, $logFile;
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($ch, CURLOPT_HEADER, true);
    
    if ($cookies) {
        curl_setopt($ch, CURLOPT_COOKIEJAR, $cookieFile);
        curl_setopt($ch, CURLOPT_COOKIEFILE, $cookieFile);
    }
    
    if ($method === 'POST') {
        curl_setopt($ch, CURLOPT_POST, true);
        
        if ($fileUpload) {
            // Créer un tableau pour l'upload de fichier
            $postFields['csv_file'] = curl_file_create(
                $fileUpload['path'],
                $fileUpload['mime'] ?? 'text/csv',
                $fileUpload['name'] ?? basename($fileUpload['path'])
            );
            curl_setopt($ch, CURLOPT_POSTFIELDS, $postFields);
        } else {
            curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($postFields));
        }
    }
    
    $response = curl_exec($ch);
    $info = curl_getinfo($ch);
    $error = curl_error($ch);
    
    // Analyse de la réponse
    $headerSize = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
    $header = substr($response, 0, $headerSize);
    $body = substr($response, $headerSize);
    
    // Journalisation
    file_put_contents($logFile, "\n--- {$method} {$url} ---\n", FILE_APPEND);
    file_put_contents($logFile, "Status: {$info['http_code']}\n", FILE_APPEND);
    file_put_contents($logFile, "Headers envoyés:\n", FILE_APPEND);
    foreach ($postFields as $key => $value) {
        if (!is_object($value) && !is_array($value)) {
            file_put_contents($logFile, "  {$key}: {$value}\n", FILE_APPEND);
        } else {
            file_put_contents($logFile, "  {$key}: [OBJET/TABLEAU]\n", FILE_APPEND);
        }
    }
    if ($error) {
        file_put_contents($logFile, "Erreur cURL: {$error}\n", FILE_APPEND);
    }
    
    curl_close($ch);
    
    return [
        'status' => $info['http_code'],
        'headers' => $header,
        'body' => $body,
        'error' => $error
    ];
}

// Fonction pour extraire le jeton CSRF d'une page HTML
function extractCsrfToken($html) {
    if (preg_match('/<input[^>]*name=["\']csrf_token["\'][^>]*value=["\']([^"\']+)["\']/', $html, $matches)) {
        return $matches[1];
    }
    return null;
}

try {
    // Étape 1: Obtenir la page de connexion pour récupérer un jeton CSRF
    echo "Étape 1: Obtention de la page de connexion...\n";
    $response = request($baseUrl . '/login');
    
    if ($response['status'] !== 200) {
        throw new Exception("Échec de l'accès à la page de connexion: code {$response['status']}");
    }
    
    $csrfToken = extractCsrfToken($response['body']);
    if (!$csrfToken) {
        throw new Exception("Impossible de trouver le jeton CSRF sur la page de connexion");
    }
    
    file_put_contents($logFile, "Jeton CSRF récupéré: {$csrfToken}\n", FILE_APPEND);
    
    // Étape 2: Se connecter à l'application
    echo "Étape 2: Connexion à l'application...\n";
    $response = request($baseUrl . '/login', 'POST', [
        'csrf_token' => $csrfToken,
        'login' => 'admin',
        'password' => 'password'
    ]);
    
    if ($response['status'] !== 200 && $response['status'] !== 302) {
        throw new Exception("Échec de la connexion: code {$response['status']}");
    }
    
    // Étape 3: Accéder à la page d'importation
    echo "Étape 3: Accès à la page d'importation...\n";
    $response = request($baseUrl . '/import');
    
    if ($response['status'] !== 200) {
        throw new Exception("Échec de l'accès à la page d'importation: code {$response['status']}");
    }
    
    $csrfToken = extractCsrfToken($response['body']);
    if (!$csrfToken) {
        throw new Exception("Impossible de trouver le jeton CSRF sur la page d'importation");
    }
    
    file_put_contents($logFile, "Nouveau jeton CSRF récupéré: {$csrfToken}\n", FILE_APPEND);
    
    // Étape 4: Télécharger le fichier CSV
    echo "Étape 4: Téléchargement du fichier CSV...\n";
    $response = request($baseUrl . '/import/upload', 'POST', [
        'csrf_token' => $csrfToken,
        'separator' => ';',
        'has_header' => 'on',
        'skip_duplicates' => 'on'
    ], [
        'path' => $csvFilePath,
        'mime' => 'text/csv',
        'name' => 'Exportation 1.csv'
    ]);
    
    if ($response['status'] !== 200 && $response['status'] !== 302) {
        throw new Exception("Échec du téléchargement du fichier: code {$response['status']}");
    }
    
    // Étape 5: Extraire l'ID du fichier de la redirection
    $fileId = null;
    if (preg_match('/\/import\/preview\/([a-z0-9]+)/', $response['headers'], $matches)) {
        $fileId = $matches[1];
        file_put_contents($logFile, "ID du fichier téléchargé: {$fileId}\n", FILE_APPEND);
        echo "ID du fichier téléchargé: {$fileId}\n";
    } else {
        throw new Exception("Impossible de trouver l'ID du fichier dans la réponse de redirection");
    }
    
    // Étape 6: Accéder à la page de prévisualisation
    echo "Étape 6: Accès à la page de prévisualisation...\n";
    $response = request($baseUrl . '/import/preview/' . $fileId);
    
    if ($response['status'] !== 200) {
        throw new Exception("Échec de l'accès à la page de prévisualisation: code {$response['status']}");
    }
    
    $csrfToken = extractCsrfToken($response['body']);
    if (!$csrfToken) {
        throw new Exception("Impossible de trouver le jeton CSRF sur la page de prévisualisation");
    }
    
    // Étape 7: Traiter et valider le fichier
    echo "Étape 7: Traitement et validation du fichier...\n";
    $response = request($baseUrl . '/import/process', 'POST', [
        'csrf_token' => $csrfToken
    ]);
    
    if ($response['status'] !== 200 && $response['status'] !== 302) {
        throw new Exception("Échec du traitement du fichier: code {$response['status']}");
    }
    
    // Si nous avons été redirigés vers la page de validation
    if (strpos($response['headers'], '/import/validate') !== false) {
        echo "Étape 8: Accès à la page de validation...\n";
        $response = request($baseUrl . '/import/validate');
        
        if ($response['status'] !== 200) {
            throw new Exception("Échec de l'accès à la page de validation: code {$response['status']}");
        }
        
        $csrfToken = extractCsrfToken($response['body']);
        if (!$csrfToken) {
            throw new Exception("Impossible de trouver le jeton CSRF sur la page de validation");
        }
        
        // Étape 9: Finaliser l'importation
        echo "Étape 9: Finalisation de l'importation...\n";
        $response = request($baseUrl . '/import/finish', 'POST', [
            'csrf_token' => $csrfToken,
            'confirm' => 'yes'
        ]);
        
        if ($response['status'] !== 200 && $response['status'] !== 302) {
            throw new Exception("Échec de la finalisation de l'importation: code {$response['status']}");
        }
    }
    
    // Récapitulatif
    echo "Importation terminée avec succès !\n";
    echo "Consultez le fichier de log pour plus de détails: {$logFile}\n";
    
} catch (Exception $e) {
    file_put_contents($logFile, "ERREUR: " . $e->getMessage() . "\n", FILE_APPEND);
    echo "Une erreur est survenue: " . $e->getMessage() . "\n";
} 