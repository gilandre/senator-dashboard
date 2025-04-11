<?php
/**
 * Script de nettoyage des fichiers temporaires d'importation
 * Ce script supprime les fichiers d'importation temporaires dans le dossier tmp/ 
 * qui ont plus de 24 heures (configurable)
 */

// Configuration
$tmp_dir = __DIR__ . '/tmp';  // Chemin du dossier tmp
$max_age = 24 * 3600;         // Âge maximum des fichiers en secondes (24 heures)
$file_patterns = [            // Modèles de noms de fichiers à supprimer
    'import_*.csv',
    'test_*.csv'
];

// Fonction pour le logging
function log_message($message) {
    echo date('Y-m-d H:i:s') . " - $message\n";
}

// Vérifier si le dossier tmp existe
if (!is_dir($tmp_dir)) {
    log_message("Erreur: Le dossier $tmp_dir n'existe pas.");
    exit(1);
}

// Compte des fichiers supprimés
$deleted_count = 0;
$total_size = 0;

// Obtenir l'heure actuelle
$now = time();

// Parcourir les modèles de fichiers
foreach ($file_patterns as $pattern) {
    $files = glob("$tmp_dir/$pattern");
    
    if (!$files) {
        log_message("Aucun fichier correspondant au modèle $pattern trouvé.");
        continue;
    }
    
    // Parcourir les fichiers correspondant au modèle
    foreach ($files as $file) {
        // Vérifier l'âge du fichier
        $file_time = filemtime($file);
        $file_age = $now - $file_time;
        
        // Si le fichier est plus ancien que l'âge maximum
        if ($file_age > $max_age) {
            $file_size = filesize($file);
            $total_size += $file_size;
            
            // Supprimer le fichier
            if (unlink($file)) {
                $deleted_count++;
                $size_mb = round($file_size / 1024 / 1024, 2);
                log_message("Supprimé: " . basename($file) . " (âge: " . round($file_age / 3600, 1) . " heures, taille: $size_mb MB)");
            } else {
                log_message("Erreur: Impossible de supprimer " . basename($file));
            }
        }
    }
}

// Afficher le résumé
$total_size_mb = round($total_size / 1024 / 1024, 2);
log_message("Nettoyage terminé: $deleted_count fichiers supprimés, $total_size_mb MB d'espace libéré."); 