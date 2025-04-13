<?php

require_once 'src/Core/Database.php';
use App\Core\Database;

try {
    // Connexion à la base de données
    $db = Database::getInstance()->getConnection();
    
    echo "Connexion à la base de données réussie\n";
    
    // Vérifier si l'utilisateur admin existe
    $stmt = $db->prepare("SELECT * FROM users WHERE username = ?");
    $stmt->execute(['admin']);
    $admin = $stmt->fetch(PDO::FETCH_ASSOC);
    
    // Mot de passe hashé pour 'admin123'
    $hashedPassword = password_hash('admin123', PASSWORD_DEFAULT);
    
    if ($admin) {
        // Mettre à jour l'utilisateur admin existant
        $updateStmt = $db->prepare("
            UPDATE users 
            SET password = ?,
                is_active = 1,
                is_locked = 0,
                failed_attempts = 0,
                updated_at = NOW()
            WHERE username = ?
        ");
        
        $updateStmt->execute([$hashedPassword, 'admin']);
        echo "Mot de passe de l'administrateur réinitialisé avec succès\n";
        echo "Identifiants : admin / admin123\n";
    } else {
        // Créer un nouvel utilisateur admin
        $createStmt = $db->prepare("
            INSERT INTO users (
                username, email, password, role, is_active, is_locked,
                failed_attempts, created_at, updated_at
            ) VALUES (
                ?, ?, ?, 'admin', 1, 0, 0, NOW(), NOW()
            )
        ");
        
        $createStmt->execute(['admin', 'admin@senator.com', $hashedPassword]);
        echo "Compte administrateur créé avec succès\n";
        echo "Identifiants : admin / admin123\n";
    }
    
} catch (Exception $e) {
    echo "Erreur : " . $e->getMessage() . "\n";
} 