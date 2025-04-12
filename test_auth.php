<?php
/**
 * Script pour tester directement l'authentification à l'application SENATOR
 */

// Configuration
$username = 'admin';
$password = 'password';
$baseUrl = 'http://localhost:8080';
$loginUrl = $baseUrl . '/login';
$userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';

// Fonction pour suivre les redirections
function followRedirects($ch, $redirections = 10) {
    $data = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    
    if ($httpCode >= 300 && $httpCode < 400 && $redirections > 0) {
        $location = curl_getinfo($ch, CURLINFO_REDIRECT_URL);
        echo "Redirection vers: {$location}\n";
        
        curl_setopt($ch, CURLOPT_URL, $location);
        return followRedirects($ch, $redirections - 1);
    }
    
    return [
        'data' => $data,
        'httpCode' => $httpCode,
        'lastUrl' => curl_getinfo($ch, CURLINFO_EFFECTIVE_URL)
    ];
}

echo "Début du test d'authentification SENATOR\n";
echo "----------------------------------------\n\n";

// Nettoyer le fichier de cookies s'il existe
if (file_exists('cookies.txt')) {
    unlink('cookies.txt');
    echo "Ancien fichier de cookies supprimé\n";
}

// Essayer aussi en se connectant directement à la base de données
try {
    $pdo = new PDO('mysql:host=localhost;dbname=senator_db', 'root', '');
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    echo "Connexion à la base de données réussie\n";
    
    // Vérifier si l'utilisateur admin existe
    $stmt = $pdo->prepare("SELECT * FROM users WHERE username = ?");
    $stmt->execute(['admin']);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$user) {
        echo "⚠ L'utilisateur 'admin' n'existe pas dans la base de données!\n";
        
        // Créer l'utilisateur admin
        $passwordHash = password_hash('password', PASSWORD_DEFAULT);
        $stmt = $pdo->prepare("
            INSERT INTO users (
                username, password, email, role, is_active,
                created_at, updated_at
            ) VALUES (
                'admin',
                :password,
                'admin@senator-investech.com',
                'admin',
                1,
                NOW(),
                NOW()
            )
        ");
        
        $stmt->execute(['password' => $passwordHash]);
        echo "✓ Utilisateur admin créé avec succès\n";
    } else {
        echo "✓ Utilisateur 'admin' trouvé dans la base de données\n";
        
        // Tester la vérification du mot de passe
        if (password_verify($password, $user['password'])) {
            echo "✓ Vérification du mot de passe réussie!\n";
        } else {
            echo "⚠ Le mot de passe est incorrect!\n";
            
            // Mettre à jour le mot de passe dans la base de données
            $correctHash = password_hash($password, PASSWORD_DEFAULT);
            $stmt = $pdo->prepare("UPDATE users SET password = ? WHERE username = 'admin'");
            $stmt->execute([$correctHash]);
            echo "✓ Le mot de passe de l'utilisateur 'admin' a été mis à jour\n";
        }
    }
} catch (PDOException $e) {
    echo "⚠ Erreur de base de données: " . $e->getMessage() . "\n";
}

// 1. Initialiser cURL
$ch = curl_init();
curl_setopt($ch, CURLOPT_USERAGENT, $userAgent);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
curl_setopt($ch, CURLOPT_COOKIEJAR, 'cookies.txt');
curl_setopt($ch, CURLOPT_COOKIEFILE, 'cookies.txt');
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
// Ajouter plus d'informations de débogage
curl_setopt($ch, CURLOPT_VERBOSE, true);

// Tester d'abord l'accès à la racine du site
echo "\nÉtape 1: Accès à la page principale (racine) du site...\n";
curl_setopt($ch, CURLOPT_URL, $baseUrl);
$indexPageResponse = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$lastUrl = curl_getinfo($ch, CURLINFO_EFFECTIVE_URL);

if ($httpCode == 200) {
    echo "✓ Page principale accessible (HTTP 200)\n";
    echo "  Dernière URL: {$lastUrl}\n";
    
    if ($lastUrl == $loginUrl) {
        echo "✓ Redirection vers la page de connexion (comportement attendu pour un utilisateur non authentifié)\n";
    }
    
} else {
    echo "✗ Impossible d'accéder à la page principale (HTTP {$httpCode})\n";
    echo "  URL actuelle: " . curl_getinfo($ch, CURLINFO_EFFECTIVE_URL) . "\n";
    echo "  Raison possible: Le serveur n'est pas en cours d'exécution ou est mal configuré\n";
    curl_close($ch);
    echo "\nTest terminé avec erreur.\n";
    exit(1);
}

// 2. Accéder à la page de connexion
echo "\nÉtape 2: Accès à la page de connexion...\n";
curl_setopt($ch, CURLOPT_URL, $loginUrl);
$loginPageResponse = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);

if ($httpCode == 200) {
    echo "✓ Page de connexion accessible (HTTP 200)\n";
    
    // Analyser le contenu pour vérifier si c'est bien une page de connexion
    if (strpos($loginPageResponse, '<form') !== false && 
        (strpos($loginPageResponse, 'username') !== false || 
         strpos($loginPageResponse, 'login') !== false || 
         strpos($loginPageResponse, 'email') !== false)) {
        echo "✓ Contenu de la page de connexion validé\n";
    } else {
        echo "⚠ Le contenu de la page ne ressemble pas à un formulaire de connexion\n";
        echo "  Premiers 200 caractères: " . substr($loginPageResponse, 0, 200) . "...\n";
    }
    
    // Extraire le token CSRF s'il existe
    $csrfToken = '';
    if (preg_match('/<input[^>]*name=["\']csrf_token["\'][^>]*value=["\'](.*?)["\']/i', $loginPageResponse, $matches)) {
        $csrfToken = $matches[1];
        echo "✓ Token CSRF trouvé: {$csrfToken}\n";
    } else {
        echo "⚠ Aucun token CSRF trouvé\n";
    }
    
    // Rechercher la structure exacte du formulaire
    echo "\nInspection du formulaire de connexion:\n";
    if (preg_match('/<form[^>]*action=["\'](.*?)["\']/i', $loginPageResponse, $formMatches)) {
        echo "  Action du formulaire: " . $formMatches[1] . "\n";
        
        // Extraire toutes les entrées du formulaire
        preg_match_all('/<input[^>]*name=["\'](.*?)["\']/i', $loginPageResponse, $inputMatches);
        echo "  Champs du formulaire trouvés: " . implode(", ", $inputMatches[1]) . "\n";
    } else {
        echo "⚠ Impossible de déterminer l'action du formulaire\n";
    }
    
    // 3. Envoyer le formulaire de connexion
    echo "\nÉtape 3: Tentative de connexion avec les identifiants...\n";
    
    // Construire les données de formulaire
    $postData = [
        'username' => $username,
        'password' => $password
    ];
    
    if (!empty($csrfToken)) {
        $postData['csrf_token'] = $csrfToken;
    }
    
    // Utiliser l'action du formulaire si disponible
    $formAction = $loginUrl;
    if (isset($formMatches) && !empty($formMatches[1])) {
        // Si l'action est relative, la convertir en URL absolue
        if (strpos($formMatches[1], 'http') !== 0) {
            if ($formMatches[1][0] === '/') {
                $formAction = $baseUrl . $formMatches[1];
            } else {
                $formAction = $baseUrl . '/' . $formMatches[1];
            }
        } else {
            $formAction = $formMatches[1];
        }
    }
    
    echo "  URL de soumission: {$formAction}\n";
    
    curl_setopt($ch, CURLOPT_URL, $formAction);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($postData));
    curl_setopt($ch, CURLOPT_HEADER, true);
    
    $response = followRedirects($ch);
    
    if ($response['httpCode'] == 200 || $response['httpCode'] == 302) {
        echo "✓ Requête de connexion envoyée (HTTP {$response['httpCode']})\n";
        
        // 4. Vérifier si la connexion a réussi (vérifier si nous sommes redirigés vers le tableau de bord)
        if (strpos($response['lastUrl'], 'dashboard') !== false) {
            echo "✓ Connexion réussie! Redirigé vers: {$response['lastUrl']}\n";
            
            // Essayer d'accéder au tableau de bord
            echo "\nÉtape 4: Accès au tableau de bord après connexion...\n";
            curl_setopt($ch, CURLOPT_URL, $baseUrl . '/dashboard');
            curl_setopt($ch, CURLOPT_POST, false);
            $dashboardResponse = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            
            if ($httpCode == 200) {
                echo "✓ Tableau de bord accessible (HTTP 200)\n";
                echo "✓ Test de connexion réussi\n";
            } else {
                echo "✗ Impossible d'accéder au tableau de bord (HTTP {$httpCode})\n";
            }
        } else {
            echo "✗ Connexion échouée. URL actuelle: {$response['lastUrl']}\n";
            
            // Vérifier si un message d'erreur est présent
            if (strpos($response['data'], 'Identifiants incorrects') !== false) {
                echo "  Raison: Identifiants incorrects\n";
            } elseif (strpos($response['data'], 'CSRF token') !== false) {
                echo "  Raison: Problème de validation CSRF\n";
            }
            
            // Afficher plus d'informations de débogage
            echo "\nInformations de débogage:\n";
            echo "-------------------\n";
            echo "1. Données envoyées:\n";
            print_r($postData);
            echo "\n2. Fragment de la réponse HTML:\n";
            echo substr($response['data'], 0, 500) . "...\n";
            
            // Examiner les cookies
            echo "\n3. Cookies enregistrés:\n";
            if (file_exists('cookies.txt')) {
                echo file_get_contents('cookies.txt') . "\n";
            } else {
                echo "  Aucun cookie enregistré\n";
            }
            
            // Vérifier les en-têtes de la réponse pour les messages flash
            echo "\n4. En-têtes de réponse:\n";
            $headerSize = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
            $header = substr($response['data'], 0, $headerSize);
            echo $header . "\n";
        }
    } else {
        echo "✗ Erreur lors de l'envoi du formulaire de connexion (HTTP {$response['httpCode']})\n";
    }
} else {
    echo "✗ Impossible d'accéder à la page de connexion (HTTP {$httpCode})\n";
    echo "  URL actuelle: " . curl_getinfo($ch, CURLINFO_EFFECTIVE_URL) . "\n";
}

// Fermer la session cURL
curl_close($ch);

echo "\nTest terminé.\n";
?> 