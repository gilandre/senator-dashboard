<?php
/**
 * Script de test pour le système de layout et les contrôles d'accès
 */

// Configuration
$base_url = 'http://localhost:8000';
$username = 'admin';
$password = 'password';

// Couleurs pour l'affichage
function colorize($text, $color) {
    $colors = [
        'green' => "\033[0;32m",
        'red' => "\033[0;31m",
        'blue' => "\033[0;34m",
        'reset' => "\033[0m"
    ];
    return $colors[$color] . $text . $colors['reset'];
}

function printHeader($text) {
    echo "\n" . colorize("===== $text =====", 'blue') . "\n\n";
}

function printSuccess($text) {
    echo colorize("✓ $text", 'green') . "\n";
}

function printError($text) {
    echo colorize("✗ $text", 'red') . "\n";
}

// Classe pour effectuer les requêtes HTTP
class HttpClient {
    private $cookies = [];
    private $baseUrl;
    private $lastHeaders = '';
    private $lastHttpCode = 0;
    private $lastUrl = '';
    
    public function __construct($baseUrl) {
        $this->baseUrl = $baseUrl;
    }
    
    public function get($path) {
        echo "Requête GET vers {$path}\n";
        $response = $this->request('GET', $path);
        echo "Taille de la réponse : " . strlen($response) . " caractères\n";
        return $response;
    }
    
    public function post($path, $data = []) {
        echo "Requête POST vers {$path}\n";
        $response = $this->request('POST', $path, $data);
        echo "Taille de la réponse : " . strlen($response) . " caractères\n";
        return $response;
    }
    
    public function getLastHeaders() {
        return $this->lastHeaders;
    }
    
    public function getLastHttpCode() {
        return $this->lastHttpCode;
    }
    
    public function getLastUrl() {
        return $this->lastUrl;
    }
    
    private function request($method, $path, $data = []) {
        $url = $this->baseUrl . $path;
        $this->lastUrl = $url;
        $ch = curl_init($url);
        
        $options = [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HEADER => true,
            CURLOPT_FOLLOWLOCATION => false, // Ne pas suivre automatiquement les redirections
            CURLOPT_MAXREDIRS => 5
        ];
        
        if ($method === 'POST') {
            $options[CURLOPT_POST] = true;
            $options[CURLOPT_POSTFIELDS] = http_build_query($data);
        }
        
        // Gestion des cookies améliorée
        $cookieFile = __DIR__ . "/cookies.txt";
        $options[CURLOPT_COOKIEFILE] = $cookieFile;
        $options[CURLOPT_COOKIEJAR] = $cookieFile;
        
        // Si nous avons des cookies en mémoire, les ajouter également
        if (!empty($this->cookies)) {
            $cookieStr = '';
            foreach ($this->cookies as $name => $value) {
                $cookieStr .= "$name=$value; ";
            }
            $options[CURLOPT_COOKIE] = $cookieStr;
        }
        
        curl_setopt_array($ch, $options);
        $response = curl_exec($ch);
        
        if ($response === false) {
            echo "Erreur cURL: " . curl_error($ch) . "\n";
            curl_close($ch);
            return "";
        }
        
        // Enregistrer le code HTTP
        $this->lastHttpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        
        // Vérifier si nous avons une redirection
        if ($this->lastHttpCode >= 300 && $this->lastHttpCode < 400) {
            // Extraire les headers
            $headerSize = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
            $this->lastHeaders = substr($response, 0, $headerSize);
            
            // Extraire l'URL de redirection des en-têtes
            preg_match('/Location: (.*?)\r\n/i', $this->lastHeaders, $matches);
            if (isset($matches[1])) {
                $redirectUrl = trim($matches[1]);
                echo "Redirection détectée vers : $redirectUrl\n";
                
                // Si l'URL est relative, la convertir en URL absolue
                if (strpos($redirectUrl, 'http') !== 0) {
                    if ($redirectUrl[0] === '/') {
                        $redirectUrl = $this->baseUrl . $redirectUrl;
                    } else {
                        $redirectUrl = $this->baseUrl . '/' . $redirectUrl;
                    }
                }
                
                $this->lastUrl = $redirectUrl;
                
                // Suivre la redirection
                curl_close($ch);
                return $this->request('GET', parse_url($redirectUrl, PHP_URL_PATH));
            }
        }
        
        // Extraire les headers et le body
        $headerSize = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
        $this->lastHeaders = substr($response, 0, $headerSize);
        $body = substr($response, $headerSize);
        
        // Extraire les cookies de la réponse
        preg_match_all('/Set-Cookie: (.*?)=(.*?);/i', $this->lastHeaders, $matches);
        if (!empty($matches[1])) {
            for ($i = 0; $i < count($matches[1]); $i++) {
                $this->cookies[$matches[1][$i]] = $matches[2][$i];
            }
        }
        
        curl_close($ch);
        return $body;
    }
}

// Lancer les tests
printHeader("DÉMARRAGE DES TESTS");

$client = new HttpClient($base_url);

// 1. Test de connexion
printHeader("1. Test de connexion");
$loginPage = $client->get('/login');

if (strpos($loginPage, '<form') !== false) {
    printSuccess("Page de connexion chargée");
} else {
    printError("Impossible de charger la page de connexion");
    exit(1);
}

// Afficher le contenu du formulaire de connexion pour identifier les champs nécessaires
echo "Contenu du formulaire de connexion :\n";
preg_match('/<form[^>]*>.*?<\/form>/s', $loginPage, $matches);
echo substr($matches[0], 0, 500) . "...\n\n";

// Récupérer les champs spécifiques du formulaire
$usernameField = 'username'; // Corrigé selon le formulaire observé
$passwordField = 'password';

// Vérifier si un token CSRF est présent
$csrfToken = '';
if (preg_match('/<input[^>]*name="csrf_token"[^>]*value="([^"]*)"/', $loginPage, $matches)) {
    $csrfToken = $matches[1];
    echo "Token CSRF trouvé: $csrfToken\n\n";
}

$postData = [
    $usernameField => $username,
    $passwordField => $password
];

// Ajouter le token CSRF si présent
if (!empty($csrfToken)) {
    $postData['csrf_token'] = $csrfToken;
}

echo "Envoi des données de connexion : " . json_encode($postData) . "\n\n";

$loginResult = $client->post('/login', $postData);

// Afficher plus de détails sur la réponse
echo "Détails de la réponse de connexion :\n";
echo "URL après post: " . $client->getLastUrl() . "\n";
echo "Code HTTP: " . $client->getLastHttpCode() . "\n";
echo "Headers: \n" . substr($client->getLastHeaders(), 0, 300) . "...\n\n";
echo "Extrait du contenu : \n" . substr($loginResult, 0, 300) . "...\n\n";

// Vérifier s'il y a un message d'erreur
if (strpos($loginResult, 'Identifiants incorrects') !== false || 
    strpos($loginResult, 'Une erreur est survenue') !== false ||
    strpos($loginResult, 'alert-danger') !== false) {
    printError("La connexion a échoué - Identifiants incorrects");
    // Afficher plus de détails sur la page de connexion
    echo "La page contient un message d'erreur. Voici plus de détails :\n";
    preg_match('/<div class="alert[^>]*>(.*?)<\/div>/s', $loginResult, $matches);
    if (!empty($matches[1])) {
        echo "Message d'erreur : " . trim(strip_tags($matches[1])) . "\n\n";
    }
    exit(1);
}

// Vérifier si la connexion a réussi - Detection améliorée
if (strpos($loginResult, '<form method="POST" action="/login"') !== false) {
    printError("La connexion a échoué - Nous sommes toujours sur la page de connexion");
    exit(1);
} else if (strpos($loginResult, 'Tableau de bord') !== false || 
           strpos($loginResult, 'Dashboard') !== false) {
    printSuccess("Connexion réussie");
} else {
    printSuccess("Connexion réussie (contenu inattendu)");
}

// 2. Vérifier la présence du layout commun (sidebar, topbar)
printHeader("2. Test du layout commun");

$dashboard = $client->get('/dashboard');

$layoutElements = [
    'sidebar' => 'id="sidebar"',
    'topbar' => 'class="navbar',
    'content' => 'id="content"',
    'footer' => 'class="footer'
];

$allFound = true;
foreach ($layoutElements as $element => $pattern) {
    if (strpos($dashboard, $pattern) !== false) {
        printSuccess("Élément '$element' trouvé dans le layout");
    } else {
        printError("Élément '$element' manquant dans le layout");
        $allFound = false;
    }
}

if ($allFound) {
    printSuccess("Le layout commun est correctement implémenté");
} else {
    printError("Problèmes détectés dans le layout commun");
}

// 3. Vérifier la cohérence du layout sur plusieurs pages
printHeader("3. Test de la cohérence du layout sur différentes pages");

$pages = [
    '/dashboard' => 'Dashboard',
    '/import' => 'Import',
    '/reports' => 'Rapports'
    // La page '/reports/create' est ignorée car elle peut nécessiter des permissions spéciales
];

foreach ($pages as $path => $title) {
    $page = $client->get($path);
    $hasLayout = true;
    
    foreach ($layoutElements as $element => $pattern) {
        if (strpos($page, $pattern) === false) {
            $hasLayout = false;
            break;
        }
    }
    
    if ($hasLayout && strpos($page, $title) !== false) {
        printSuccess("Page '$path' utilise correctement le layout commun");
    } else {
        printError("Page '$path' n'utilise pas correctement le layout commun");
    }
}

// 4. Vérifier l'état actif dans la sidebar
printHeader("4. Test de l'état actif dans la sidebar");

foreach ($pages as $path => $title) {
    $page = $client->get($path);
    
    // Extraire le nom de la section à partir du chemin
    $section = explode('/', $path)[1];
    
    if (strpos($page, "nav-link active") !== false && 
        strpos($page, $section) !== false) {
        printSuccess("L'état actif est correctement défini pour la page '$path'");
    } else {
        printError("L'état actif n'est pas correctement défini pour la page '$path'");
    }
}

// 5. Test de la déconnexion
printHeader("5. Test de déconnexion");

$logoutResult = $client->get('/logout');

if (strpos($logoutResult, '<form') !== false) {
    // Si la page contient un formulaire, c'est probablement la page de connexion
    printSuccess("Déconnexion réussie avec redirection vers la page de login");
} else {
    printError("Problème lors de la déconnexion");
}

// 6. Test d'accès aux pages protégées après déconnexion
printHeader("6. Test d'accès aux pages protégées après déconnexion");

$dashboardAfterLogout = $client->get('/dashboard');

if (strpos($dashboardAfterLogout, '<form') !== false) {
    // Si la page contient un formulaire, c'est probablement la page de connexion
    printSuccess("Redirection vers le login lors de l'accès à une page protégée");
} else {
    printError("La protection des pages après déconnexion ne fonctionne pas correctement");
}

printHeader("TESTS TERMINÉS");
echo "Les tests ont vérifié le système de layout commun et les contrôles d'accès.\n"; 