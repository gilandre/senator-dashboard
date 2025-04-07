<?php
// Démarrer la session
session_start();
?>
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Test d'importation CSV</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; }
        h1, h2, h3 { color: #333; }
        form { max-width: 600px; margin: 20px 0; padding: 20px; border: 1px solid #ddd; border-radius: 5px; }
        label { display: block; margin-bottom: 5px; font-weight: bold; }
        input[type="file"], select { width: 100%; padding: 8px; margin-bottom: 15px; border: 1px solid #ddd; border-radius: 3px; }
        .checkbox-group { margin-bottom: 15px; }
        button { padding: 10px 20px; background: #0275d8; color: white; border: none; border-radius: 5px; cursor: pointer; }
        .success { color: green; font-weight: bold; }
        .error { color: red; font-weight: bold; }
        .modal { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); }
        .modal-content { background: white; margin: 10% auto; padding: 20px; width: 60%; border-radius: 5px; }
        .progress { height: 20px; background: #f5f5f5; border-radius: 5px; margin-bottom: 15px; }
        .progress-bar { height: 100%; background: #0275d8; border-radius: 5px; color: white; text-align: center; line-height: 20px; }
        .log { margin-top: 20px; background: #f5f5f5; padding: 10px; border-radius: 5px; max-height: 300px; overflow: auto; }
    </style>
</head>
<body>
    <h1>Test d'importation CSV</h1>
    
    <?php if (isset($_SESSION['flash'])): ?>
        <div class="<?php echo $_SESSION['flash']['type']; ?>">
            <?php echo $_SESSION['flash']['message']; ?>
        </div>
        <?php unset($_SESSION['flash']); ?>
    <?php endif; ?>
    
    <form id="importForm" action="/import/upload" method="post" enctype="multipart/form-data">
        <div>
            <label for="csv_file">Fichier CSV :</label>
            <input type="file" id="csv_file" name="csv_file" accept=".csv" required>
        </div>
        
        <div>
            <label for="separator">Séparateur :</label>
            <select id="separator" name="separator">
                <option value=";">Point-virgule (;)</option>
                <option value=",">Virgule (,)</option>
                <option value="\t">Tabulation</option>
            </select>
        </div>
        
        <div class="checkbox-group">
            <input type="checkbox" id="has_header" name="has_header" checked>
            <label for="has_header" style="display: inline;">Le fichier contient une ligne d'en-tête</label>
        </div>
        
        <div class="checkbox-group">
            <input type="checkbox" id="validate_data" name="validate_data" checked>
            <label for="validate_data" style="display: inline;">Valider les données avant importation</label>
        </div>
        
        <button type="submit">Importer le fichier</button>
    </form>
    
    <div class="log">
        <h3>Journal de test</h3>
        <p>Structure des tables :</p>
        <?php
        try {
            // Connexion à la base de données
            $dsn = "sqlite:" . __DIR__ . "/../database.sqlite";
            $options = [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ];
            $pdo = new PDO($dsn, null, null, $options);
            
            // Structure de la table access_logs
            $tableStructure = $pdo->query("PRAGMA table_info(access_logs)")->fetchAll();
            
            echo '<p>Structure de la table access_logs :</p>';
            echo '<ul>';
            foreach ($tableStructure as $column) {
                echo '<li>' . $column['name'] . ' (' . $column['type'] . ')' . ($column['pk'] ? ' - Clé primaire' : '') . '</li>';
            }
            echo '</ul>';
            
            // Nombre d'enregistrements dans la table
            $count = $pdo->query("SELECT COUNT(*) FROM access_logs")->fetchColumn();
            echo '<p>Nombre d\'enregistrements dans la table access_logs : ' . $count . '</p>';
        } catch (Exception $e) {
            echo '<p class="error">Erreur : ' . $e->getMessage() . '</p>';
        }
        ?>
    </div>
    
    <div id="progressModal" class="modal">
        <div class="modal-content">
            <h2>Progression de l'importation</h2>
            
            <div class="progress">
                <div class="progress-bar" style="width: 0%;" role="progressbar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100">0%</div>
            </div>
            
            <p class="progress-message">Initialisation de l'importation...</p>
            
            <div class="import-error" style="display:none; color: red; margin-top: 15px;">
                <p class="error-message">Une erreur s'est produite.</p>
            </div>
            
            <div class="import-stats" style="display:none; margin-top: 15px;">
                <p>Statistiques :</p>
                <ul>
                    <li>Lignes importées : <span class="stats-imported">0</span></li>
                    <li>Doublons ignorés : <span class="stats-duplicates">0</span></li>
                    <li>Erreurs : <span class="stats-errors">0</span></li>
                    <li>Total de lignes : <span class="stats-total">0</span></li>
                </ul>
            </div>
            
            <div style="margin-top: 20px; text-align: center;">
                <a href="#" class="cancel-import" style="display:none; margin-right: 10px;">Annuler</a>
                <a href="/import" class="view-results" style="display:none; background-color: #0275d8; color: white; padding: 8px 15px; text-decoration: none; border-radius: 4px;">Voir les résultats</a>
            </div>
        </div>
    </div>
    
    <script>
    document.addEventListener('DOMContentLoaded', function() {
        const importForm = document.getElementById('importForm');
        const progressModal = document.getElementById('progressModal');
        
        // Capturer la soumission du formulaire
        importForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Afficher la modale de progression
            progressModal.style.display = 'block';
            
            // Récupérer les données du formulaire
            const formData = new FormData(importForm);
            
            // Soumettre le formulaire normalement
            this.submit();
        });
    });
    </script>
</body>
</html> 