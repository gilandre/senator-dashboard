<?php
// Inclure l'autoloader
require_once 'vendor/autoload.php';

// Créer une instance du modèle User
$userModel = new \App\Models\User();

// Rechercher l'utilisateur admin
$admin = $userModel->findByUsername('admin');

echo "Recherche de l'utilisateur admin...\n";

if ($admin) {
    echo "L'utilisateur admin existe dans la base de données.\n";
    echo "ID : " . $admin->getId() . "\n";
    echo "Nom d'utilisateur : " . $admin->getUsername() . "\n";
    echo "Email : " . $admin->getEmail() . "\n";
    echo "Rôle : " . $admin->getRole() . "\n";
    echo "Actif : " . ($admin->getIsActive() ? 'Oui' : 'Non') . "\n";
    echo "Verrouillé : " . ($admin->getIsLocked() ? 'Oui' : 'Non') . "\n";
    
    // Vérifier si l'utilisateur peut se connecter
    $canLogin = $admin->getIsActive() && !$admin->getIsLocked();
    echo "Peut se connecter : " . ($canLogin ? 'Oui' : 'Non') . "\n";
} else {
    echo "L'utilisateur admin n'existe pas dans la base de données.\n";
    
    // Créer l'utilisateur admin s'il n'existe pas
    echo "Création de l'utilisateur admin par défaut...\n";
    \App\Models\User::createDefaultAdminIfNecessary();
    
    // Vérifier à nouveau
    $admin = $userModel->findByUsername('admin');
    if ($admin) {
        echo "L'utilisateur admin a été créé avec succès.\n";
        echo "ID : " . $admin->getId() . "\n";
        echo "Nom d'utilisateur : " . $admin->getUsername() . "\n";
        echo "Email : " . $admin->getEmail() . "\n";
        echo "Rôle : " . $admin->getRole() . "\n";
    } else {
        echo "Échec de la création de l'utilisateur admin.\n";
    }
} 