<?php
// Script de test pour isoler le problème AJAX
session_start();

// Vérifier si c'est une requête AJAX
$isAjaxRequest = isset($_SERVER['HTTP_X_REQUESTED_WITH']) && $_SERVER['HTTP_X_REQUESTED_WITH'] == 'XMLHttpRequest';

// Si c'est une requête AJAX ou si le paramètre json=1 est présent, retourner du JSON
if ($isAjaxRequest || isset($_GET['json'])) {
    // Nettoyer tout buffer de sortie existant
    if (ob_get_level()) {
        ob_end_clean();
    }
    
    // Définir l'en-tête Content-Type
    header('Content-Type: application/json');
    
    // Envoyer une réponse JSON simple
    echo json_encode([
        'success' => true,
        'message' => 'Test de réponse JSON',
        'is_ajax' => $isAjaxRequest ? 'oui' : 'non',
        'method' => $_SERVER['REQUEST_METHOD'],
        'time' => date('H:i:s')
    ]);
    exit;
}

// Sinon, afficher une page HTML simple avec un bouton pour tester AJAX
?>
<!DOCTYPE html>
<html>
<head>
    <title>Test AJAX</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .button { padding: 10px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; }
        .response { margin-top: 20px; padding: 10px; border: 1px solid #ddd; border-radius: 4px; min-height: 100px; }
        .error { color: red; }
        .success { color: green; }
        pre { background: #f8f9fa; padding: 10px; overflow: auto; }
    </style>
</head>
<body>
    <h1>Test de requête AJAX</h1>
    
    <p>Ce script teste si le serveur peut retourner correctement des réponses JSON aux requêtes AJAX.</p>
    
    <button id="testBtn" class="button">Tester AJAX</button>
    <a href="?json=1" class="button" style="text-decoration: none; display: inline-block; margin-left: 10px;">Tester JSON Direct</a>
    
    <div id="response" class="response">
        <p>La réponse s'affichera ici...</p>
    </div>
    
    <script>
        document.getElementById('testBtn').addEventListener('click', function() {
            const responseDiv = document.getElementById('response');
            responseDiv.innerHTML = '<p>Envoi de la requête AJAX...</p>';
            
            fetch('/ajax_test.php', {
                method: 'POST',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest'
                }
            })
            .then(response => {
                const contentType = response.headers.get('content-type');
                responseDiv.innerHTML = `<p>Type de contenu reçu: ${contentType}</p>`;
                
                return response.text().then(text => {
                    try {
                        // Tenter de parser en JSON
                        const data = JSON.parse(text);
                        responseDiv.innerHTML += `
                            <p class="success">✓ La réponse est un JSON valide</p>
                            <pre>${JSON.stringify(data, null, 2)}</pre>
                        `;
                    } catch (e) {
                        // Si le parsing échoue, afficher le texte brut
                        responseDiv.innerHTML += `
                            <p class="error">✗ La réponse n'est pas un JSON valide: ${e.message}</p>
                            <p>Début de la réponse:</p>
                            <pre>${text.substring(0, 200)}${text.length > 200 ? '...' : ''}</pre>
                        `;
                    }
                });
            })
            .catch(error => {
                responseDiv.innerHTML += `
                    <p class="error">Erreur lors de la requête: ${error.message}</p>
                `;
            });
        });
    </script>
</body>
</html> 