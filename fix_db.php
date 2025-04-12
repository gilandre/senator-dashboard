<?php
try {
    $pdo = new PDO('mysql:host=localhost;dbname=senator_db', 'root', '');
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    echo "Connexion à la base de données réussie.\n";
    
    // Lire le fichier fix_schema.sql
    $sql = file_get_contents('fix_schema.sql');
    
    // Exécuter le script complet
    $pdo->exec($sql);
    
    echo "Correction appliquée avec succès.\n";
    
    // Créer un utilisateur admin par défaut
    $checkStmt = $pdo->query("SELECT COUNT(*) FROM users WHERE username = 'admin'");
    $count = $checkStmt->fetchColumn();
    
    if ($count == 0) {
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
        echo "Utilisateur admin créé avec succès.\n";
    } else {
        echo "Utilisateur admin existe déjà.\n";
    }
    
} catch (PDOException $e) {
    echo "Erreur: " . $e->getMessage() . "\n";
}
?> 