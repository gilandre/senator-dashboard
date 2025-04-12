<?php
// Inclure le fichier bootstrap
require_once __DIR__ . '/bootstrap.php';

// Inclure les fichiers nécessaires
require_once __DIR__ . '/src/Core/Auth.php';
require_once __DIR__ . '/src/Models/User.php';

echo "Test de connexion à l'application SENATOR\n";
echo "----------------------------------------\n\n";

try {
    // Tester la connexion à la base de données
    $db = new PDO('mysql:host=localhost;dbname=senator_db', 'root', '');
    echo "Connexion à la base de données réussie\n";
    
    // Vérifier si l'utilisateur admin existe
    $stmt = $db->prepare("SELECT * FROM users WHERE username = ?");
    $stmt->execute(['admin']);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$user) {
        echo "Erreur: L'utilisateur 'admin' n'existe pas dans la base de données\n";
        exit;
    }
    
    echo "Utilisateur 'admin' trouvé dans la base de données\n";
    echo "  - ID: " . $user['id'] . "\n";
    echo "  - Nom d'utilisateur: " . $user['username'] . "\n";
    echo "  - Email: " . $user['email'] . "\n";
    echo "  - Rôle: " . $user['role'] . "\n";
    echo "  - Actif: " . ($user['is_active'] ? 'Oui' : 'Non') . "\n";
    
    // Tester la vérification du mot de passe
    $password = 'password';
    if (password_verify($password, $user['password'])) {
        echo "Vérification du mot de passe réussie!\n";
    } else {
        echo "Erreur: Le mot de passe est incorrect\n";
        echo "Le mot de passe hashé stocké est: " . $user['password'] . "\n";
        
        // Créer un hash pour le mot de passe fourni
        $correctHash = password_hash($password, PASSWORD_DEFAULT);
        echo "Le hash pour 'password' est: " . $correctHash . "\n";
        
        // Mettre à jour le mot de passe dans la base de données
        $stmt = $db->prepare("UPDATE users SET password = ? WHERE username = 'admin'");
        $stmt->execute([$correctHash]);
        echo "Le mot de passe de l'utilisateur 'admin' a été mis à jour\n";
    }
    
    // Tester la connexion avec session manuelle
    echo "\nTest de connexion avec session manuelle:\n";
    
    // Créer une session
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }
    
    // Simuler une connexion réussie
    $_SESSION['user_id'] = $user['id'];
    $_SESSION['username'] = $user['username'];
    $_SESSION['role'] = $user['role'];
    
    // Vérifier l'état de la session
    echo "Session créée avec succès:\n";
    echo "  - user_id: " . $_SESSION['user_id'] . "\n";
    echo "  - username: " . $_SESSION['username'] . "\n";
    echo "  - role: " . $_SESSION['role'] . "\n";
    
    // Vérifier si le fichier CSV existe
    $csvPath = __DIR__ . '/SENATOR_INVESTECH/Exploitation 1.csv';
    if (file_exists($csvPath)) {
        echo "\nLe fichier CSV 'Exploitation 1.csv' existe et est accessible\n";
        
        // Lire les premières lignes pour vérifier
        $handle = fopen($csvPath, 'r');
        $header = fgetcsv($handle, 0, ';');
        echo "En-tête du CSV: " . implode(', ', $header) . "\n";
        
        fclose($handle);
    } else {
        echo "\nErreur: Le fichier CSV 'Exploitation 1.csv' n'existe pas dans le dossier SENATOR_INVESTECH\n";
    }
    
    echo "\nTest terminé avec succès!\n";
    
} catch (Exception $e) {
    echo "Erreur: " . $e->getMessage() . "\n";
    echo "Trace: " . $e->getTraceAsString() . "\n";
}
?> 