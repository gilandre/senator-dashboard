<?php
// Liste des fichiers de test à supprimer
$filesToDelete = [
    'test.csv',
    'test_app.sh',
    'test_dashboard.php',
    'test_data.csv',
    'test_database.php',
    'test_dates.csv',
    'test_export1.csv',
    'test_import.csv',
    'test_import.php',
    'test_import.sh',
    'test_import_controller.php',
    'test_import_improved.php',
    'test_import_scenarios.php',
    'test_import_standalone.php',
    'test_invalid.csv',
    'test_layout.php',
    'test_null_import.php',
    'test_path.php',
    'test_valid.csv',
    'direct_import_test.php',
    'direct_import_test_v2.php',
    'direct_import_log.txt',
    'direct_import_log_v2.txt',
    'doublons.csv',
    'duplicates.csv',
];

// Compteurs pour les statistiques
$deletedCount = 0;
$errorCount = 0;
$skippedCount = 0;

echo "Nettoyage des fichiers de test en cours...\n";

// Supprimer les fichiers
foreach ($filesToDelete as $file) {
    if (file_exists($file)) {
        try {
            if (unlink($file)) {
                echo "✓ Supprimé: {$file}\n";
                $deletedCount++;
            } else {
                echo "✗ Échec de la suppression: {$file}\n";
                $errorCount++;
            }
        } catch (Exception $e) {
            echo "✗ Erreur lors de la suppression de {$file}: " . $e->getMessage() . "\n";
            $errorCount++;
        }
    } else {
        echo "⚠ Ignoré (n'existe pas): {$file}\n";
        $skippedCount++;
    }
}

// Supprimer le répertoire test_files s'il existe
if (is_dir('test_files')) {
    try {
        // Fonction récursive pour supprimer un répertoire et son contenu
        function rrmdir($dir) {
            if (is_dir($dir)) {
                $objects = scandir($dir);
                foreach ($objects as $object) {
                    if ($object != "." && $object != "..") {
                        if (is_dir($dir . "/" . $object))
                            rrmdir($dir . "/" . $object);
                        else
                            unlink($dir . "/" . $object);
                    }
                }
                rmdir($dir);
                return true;
            }
            return false;
        }
        
        if (rrmdir('test_files')) {
            echo "✓ Supprimé le répertoire: test_files\n";
            $deletedCount++;
        } else {
            echo "✗ Échec de la suppression du répertoire: test_files\n";
            $errorCount++;
        }
    } catch (Exception $e) {
        echo "✗ Erreur lors de la suppression du répertoire test_files: " . $e->getMessage() . "\n";
        $errorCount++;
    }
} else {
    echo "⚠ Ignoré (n'existe pas): répertoire test_files\n";
    $skippedCount++;
}

echo "\nRécapitulatif du nettoyage:\n";
echo "- {$deletedCount} fichier(s) supprimé(s)\n";
echo "- {$skippedCount} fichier(s) ignoré(s)\n";
echo "- {$errorCount} erreur(s)\n";
echo "\nNettoyage terminé.\n";
?> 