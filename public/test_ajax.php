<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Test d'importation AJAX</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .error { color: red; }
        .success { color: green; }
        pre { background: #f5f5f5; padding: 10px; border-radius: 5px; overflow: auto; }
    </style>
</head>
<body>
    <h1>Test d'importation AJAX</h1>
    
    <div id="result"></div>
    
    <div>
        <button id="testBtn">Tester la requête AJAX</button>
    </div>
    
    <script>
        document.getElementById('testBtn').addEventListener('click', function() {
            const resultDiv = document.getElementById('result');
            resultDiv.innerHTML = '<p>Envoi de la requête AJAX...</p>';
            
            // Créer un formulaire avec confirm_import
            const formData = new FormData();
            formData.append('confirm_import', '1');
            
            // Envoyer la requête AJAX
            fetch('/import/process', {
                method: 'POST',
                body: formData,
                headers: {
                    'X-Requested-With': 'XMLHttpRequest'
                }
            })
            .then(response => {
                // Traitement de la réponse
                const contentType = response.headers.get('content-type');
                resultDiv.innerHTML += `<p>Type de contenu de la réponse: ${contentType}</p>`;
                
                // Récupérer le texte brut de la réponse
                return response.text().then(text => {
                    try {
                        // Essayer de parser en JSON
                        const jsonData = JSON.parse(text);
                        resultDiv.innerHTML += `
                            <p class="success">La réponse est un JSON valide ✓</p>
                            <h3>Réponse JSON</h3>
                            <pre>${JSON.stringify(jsonData, null, 2)}</pre>
                        `;
                        return { json: jsonData, text, isJson: true };
                    } catch (e) {
                        // Si le parsing échoue, afficher le texte brut
                        resultDiv.innerHTML += `
                            <p class="error">La réponse n'est pas un JSON valide ✗</p>
                            <p>Erreur: ${e.message}</p>
                            <h3>Réponse brute</h3>
                            <pre>${text.length > 1000 ? text.substring(0, 1000) + '...' : text}</pre>
                            <h3>Premiers 100 caractères</h3>
                            <pre>${text.substring(0, 100)}</pre>
                        `;
                        return { text, isJson: false, error: e.message };
                    }
                });
            })
            .catch(error => {
                resultDiv.innerHTML += `
                    <p class="error">Erreur lors de la requête: ${error.message}</p>
                `;
            });
        });
    </script>
    
    <?php
    // Si on ajoute le paramètre ?php=1, exécuter également le test côté serveur
    if (isset($_GET['php']) && $_GET['php'] == '1') {
        // Démarrer la session si elle n'est pas déjà démarrée
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }

        // Simuler une requête AJAX
        $url = 'http://localhost:8000/import/process';
        $data = [
            'confirm_import' => '1'
        ];

        // Configuration de la requête cURL
        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($data));
        curl_setopt($ch, CURLOPT_COOKIE, session_name() . '=' . session_id());
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'X-Requested-With: XMLHttpRequest',
            'Content-Type: application/x-www-form-urlencoded'
        ]);

        // Exécuter la requête
        $response = curl_exec($ch);
        $info = curl_getinfo($ch);
        curl_close($ch);

        // Afficher les informations de la requête
        echo '<h2>Test PHP côté serveur</h2>';
        echo '<h3>Informations de la requête</h3>';
        echo '<pre>';
        print_r($info);
        echo '</pre>';

        // Afficher la réponse brute
        echo '<h3>Réponse brute</h3>';
        echo '<pre>';
        echo htmlspecialchars($response);
        echo '</pre>';

        // Tenter de décoder la réponse JSON
        echo '<h3>Réponse décodée</h3>';
        $decoded = json_decode($response, true);
        if ($decoded !== null) {
            echo '<div class="success">Le format JSON est valide ✓</div>';
            echo '<pre>';
            print_r($decoded);
            echo '</pre>';
        } else {
            echo '<div class="error">Erreur: La réponse n\'est pas au format JSON valide ✗</div>';
            echo '<p>Erreur JSON: ' . json_last_error_msg() . '</p>';
            
            // Afficher les 100 premiers caractères pour voir le début de la réponse
            echo '<p>Début de la réponse: <code>' . htmlspecialchars(substr($response, 0, 100)) . '...</code></p>';
        }
    }
    ?>
    
</body>
</html> 