<?php
$pageTitle = 'Importation de Données';
$currentPage = 'import';
require_once __DIR__ . '/../layouts/app.php';
?>

<div class="container-fluid">
    <div class="row mb-4">
        <div class="col">
            <h1 class="h3 mb-0">Import de données</h1>
        </div>
        <div class="col text-end">
            <a href="/dashboard" class="btn btn-secondary">
                <i class="fas fa-arrow-left"></i> Retour au tableau de bord
            </a>
        </div>
    </div>

    <!-- Instructions -->
    <div class="card mb-4">
        <div class="card-header">
            <h5 class="card-title mb-0">Instructions d'import</h5>
        </div>
        <div class="card-body">
            <p>Le fichier CSV doit respecter le format suivant :</p>
            <ul>
                <li>Utiliser le point-virgule (;) comme séparateur</li>
                <li>La première ligne doit contenir les en-têtes des colonnes</li>
                <li>Les colonnes requises sont :</li>
                <ul>
                    <li>date_heure</li>
                    <li>identifiant</li>
                    <li>action</li>
                    <li>localisation</li>
                    <li>resultat</li>
                </ul>
            </ul>
        </div>
    </div>

    <!-- Formulaire d'import -->
    <div class="card">
        <div class="card-header">
            <h5 class="card-title mb-0">Importer un fichier</h5>
        </div>
        <div class="card-body">
            <form action="/import/process" method="post" enctype="multipart/form-data" id="importForm">
                <div class="mb-3">
                    <label for="csvFile" class="form-label">Fichier CSV</label>
                    <input type="file" class="form-control" id="csvFile" name="csvFile" accept=".csv" required>
                    <div class="form-text">Taille maximale : 10 MB</div>
                </div>

                <div class="mb-3">
                    <label for="separator" class="form-label">Séparateur</label>
                    <select class="form-select" id="separator" name="separator" required>
                        <option value=";">Point-virgule (;)</option>
                        <option value=",">Virgule (,)</option>
                        <option value="\t">Tabulation (\t)</option>
                    </select>
                </div>

                <div class="mb-3">
                    <div class="form-check">
                        <input class="form-check-input" type="checkbox" id="hasHeader" name="hasHeader" checked>
                        <label class="form-check-label" for="hasHeader">
                            Le fichier contient des en-têtes
                        </label>
                    </div>
                </div>

                <div class="mb-3">
                    <div class="form-check">
                        <input class="form-check-input" type="checkbox" id="validateData" name="validateData" checked>
                        <label class="form-check-label" for="validateData">
                            Valider les données avant l'import
                        </label>
                    </div>
                </div>

                <button type="submit" class="btn btn-primary">
                    <i class="fas fa-upload"></i> Importer
                </button>
            </form>
        </div>
    </div>

    <!-- Aperçu des données -->
    <div class="card mt-4">
        <div class="card-header">
            <h5 class="card-title mb-0">Aperçu des données</h5>
        </div>
        <div class="card-body">
            <div id="previewContainer" class="table-responsive">
                <p class="text-muted">Sélectionnez un fichier pour voir l'aperçu</p>
            </div>
        </div>
    </div>
</div>

<script>
document.getElementById('csvFile').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const content = e.target.result;
        const lines = content.split('\n');
        const separator = document.getElementById('separator').value;
        const hasHeader = document.getElementById('hasHeader').checked;

        let html = '<table class="table table-striped table-hover">';
        
        // En-têtes
        if (hasHeader && lines.length > 0) {
            html += '<thead><tr>';
            const headers = lines[0].split(separator);
            headers.forEach(header => {
                html += `<th>${header.trim()}</th>`;
            });
            html += '</tr></thead>';
        }

        // Données
        html += '<tbody>';
        const startLine = hasHeader ? 1 : 0;
        const maxLines = Math.min(lines.length, startLine + 5); // Afficher max 5 lignes
        for (let i = startLine; i < maxLines; i++) {
            if (!lines[i].trim()) continue;
            html += '<tr>';
            const cells = lines[i].split(separator);
            cells.forEach(cell => {
                html += `<td>${cell.trim()}</td>`;
            });
            html += '</tr>';
        }
        html += '</tbody></table>';

        document.getElementById('previewContainer').innerHTML = html;
    };
    reader.readAsText(file);
});

document.getElementById('importForm').addEventListener('submit', function(e) {
    const file = document.getElementById('csvFile').files[0];
    if (file && file.size > 10 * 1024 * 1024) { // 10 MB
        e.preventDefault();
        alert('Le fichier est trop volumineux. Taille maximale : 10 MB');
    }
});
</script>

<?php require_once __DIR__ . '/../layouts/footer.php'; ?> 