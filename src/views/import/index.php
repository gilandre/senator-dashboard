<?php
// Définir les variables de page
$pageTitle = 'Importation de Données';
$currentPage = 'import';
$hideGlobalTopbar = false; // Activer la topbar globale standard

// Commencer la capture du contenu
ob_start();
?>

<div class="container-fluid">
    <!-- En-tête de la page -->
    <div class="d-flex justify-content-between align-items-center mb-4">
        <!--<h1 class="h3 mb-0">Importation de données d'accès</h1>-->
        <h1 class="h3 mb-0">&nbsp;</h1>
        <div class="action-buttons">
            <button id="showInfoBtn" class="btn btn-info me-2" data-bs-toggle="modal" data-bs-target="#importInfoModal">
                <i class="fas fa-info-circle"></i> Informations
            </button>
            <a href="/import/history" class="btn btn-primary">
                <i class="fas fa-history"></i> Historique des importations
            </a>
        </div>
    </div>

    <!-- Zone de notification -->
    <div id="notificationArea"></div>

    <?php if (isset($_SESSION['flash'])): ?>
    <div class="notification <?= $_SESSION['flash']['type'] ?>" id="flashNotification">
        <span class="close-btn">&times;</span>
        <?= $_SESSION['flash']['message'] ?>
    </div>
    <?php unset($_SESSION['flash']); ?>
    <?php endif; ?>

    <?php if (isset($_SESSION['import_stats'])): ?>
    <!-- Résumé de la dernière importation -->
    <div class="card mb-4">
        <div class="card-header">
            <h5 class="card-title">Résumé de l'importation</h5>
        </div>
        <div class="card-body p-0">
            <!-- Statistiques sommaires -->
            <div class="row g-0 border-bottom">
                <?php 
                $total = $_SESSION['import_stats']['total'];
                $imported = $_SESSION['import_stats']['imported'];
                $duplicates = $_SESSION['import_stats']['duplicates'];
                $errors = $_SESSION['import_stats']['errors'];
                $successRate = $total > 0 ? round(100 * (($imported + $duplicates) / $total)) : 0;
                $duplicateRate = $total > 0 ? round(($duplicates / $total) * 100) : 0;
                $errorRate = $total > 0 ? round(($errors / $total) * 100) : 0;
                ?>
                <div class="col-md-6 col-lg-3 p-3 border-end">
                    <div class="d-flex flex-column align-items-center text-center">
                        <div class="stat-icon bg-light-primary rounded-circle mb-2">
                            <i class="fas fa-file-import text-primary"></i>
                        </div>
                        <h3 class="fs-2 fw-bold text-primary mb-0"><?= $total ?></h3>
                        <span class="text-muted small">Total traité</span>
                    </div>
                </div>
                <div class="col-md-6 col-lg-3 p-3 border-end">
                    <div class="d-flex flex-column align-items-center text-center">
                        <div class="stat-icon bg-light-success rounded-circle mb-2">
                            <i class="fas fa-check text-success"></i>
                        </div>
                        <h3 class="fs-2 fw-bold text-success mb-0"><?= $imported ?></h3>
                        <span class="text-muted small">Importées</span>
                    </div>
                </div>
                <div class="col-md-6 col-lg-3 p-3 border-end">
                    <div class="d-flex flex-column align-items-center text-center">
                        <div class="stat-icon bg-light-warning rounded-circle mb-2">
                            <i class="fas fa-copy text-warning"></i>
                        </div>
                        <h3 class="fs-2 fw-bold text-warning mb-0"><?= $duplicates ?></h3>
                        <span class="text-muted small">Doublons</span>
                    </div>
                </div>
                <div class="col-md-6 col-lg-3 p-3">
                    <div class="d-flex flex-column align-items-center text-center">
                        <div class="stat-icon bg-light-danger rounded-circle mb-2">
                            <i class="fas fa-exclamation-triangle text-danger"></i>
                        </div>
                        <h3 class="fs-2 fw-bold text-danger mb-0"><?= $errors ?></h3>
                        <span class="text-muted small">Erreurs</span>
                    </div>
                </div>
            </div>
            
            <!-- Barre de progression et taux de réussite -->
            <div class="px-3 pt-3">
                <div class="d-flex justify-content-between align-items-center mb-1">
                    <span class="text-muted small">Taux de réussite</span>
                    <span class="badge bg-<?= $successRate > 90 ? 'success' : ($successRate > 70 ? 'warning' : 'danger') ?>"><?= $successRate ?>%</span>
                </div>
                <div class="progress" style="height: 6px;">
                    <div class="progress-bar bg-<?= $successRate > 90 ? 'success' : ($successRate > 70 ? 'warning' : 'danger') ?>" style="width: <?= $successRate ?>%"></div>
                </div>
            </div>
            
            <!-- Actions -->
            <div class="d-flex justify-content-between p-3">
                <div>
                    <?php if ($duplicates > 0): ?>
                    <a href="/import/download-duplicates?id=<?= $_SESSION['import_stats']['history_id'] ?? 0 ?>" class="btn btn-sm btn-warning me-2">
                        <i class="fas fa-download me-1"></i> Télécharger les doublons
                    </a>
                    <?php endif; ?>
                </div>
                <div>
                    <a href="/import/download-report?id=<?= $_SESSION['import_stats']['history_id'] ?? 0 ?>" class="btn btn-sm btn-info me-2">
                        <i class="fas fa-file-download me-1"></i> Rapport
                    </a>
                    <form action="/import/finish" method="post" class="d-inline">
                        <button type="submit" class="btn btn-sm btn-secondary">
                            <i class="fas fa-broom me-1"></i> Effacer ce résumé
                        </button>
                    </form>
                </div>
            </div>
        </div>
    </div>
    <?php endif; ?>

    <!-- Message de résultat d'upload -->
    <div id="uploadResultAlert" class="alert alert-success alert-dismissible fade show" role="alert" style="display: none;">
        <span id="uploadResultMessage">Fichier importé avec succès.</span>
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    </div>

    <!-- Instructions 
    <div class="card mb-4">
        <div class="card-header">
            <h5 class="card-title">Instructions d'import</h5>
        </div>
        <div class="card-body">
            <p>Le fichier CSV doit respecter le format suivant :</p>
            <ul>
                <li>Format CSV avec séparateur point-virgule (;)</li>
                <li>Encodage UTF-8</li>
                <li>La première ligne doit contenir les en-têtes</li>
                <li>Colonnes requises : <strong>Numéro de badge</strong>, <strong>Date évènements</strong>, Heure évènements, Centrale, Nature Evenement, Nom, Prénom, Statut, Groupe</li>
            </ul>
            <p>Exemple de ligne valide :</p>
            <pre class="bg-light p-2">563;17/09/2024;07:21:26;C 2  GUERITE;Sortie;KONATE;MAMADOU;OK;SERVICES INFORMATIQUE</pre>
        </div>
    <!-- Instructions 
    </div>

    <!-- Aperçu du CSV -->
    <div class="card mb-4" id="csvPreviewCard" style="display: none;">
        <div class="card-header d-flex justify-content-between align-items-center">
            <h5 class="card-title mb-0">Aperçu du fichier CSV</h5>
            <button type="button" class="btn-close" aria-label="Close" id="closePreviewBtn"></button>
        </div>
        <div class="card-body p-0">
            <div class="table-responsive">
                <table class="table table-sm table-striped table-hover mb-0" id="csvPreviewTable">
                    <thead class="table-light">
                        <tr id="csvPreviewHeader"></tr>
                    </thead>
                    <tbody id="csvPreviewBody"></tbody>
                </table>
            </div>
        </div>
        <div class="card-footer bg-light d-flex justify-content-between align-items-center">
            <span class="text-muted small" id="csvRowCount">0 lignes détectées</span>
            <div>
                <button type="button" class="btn btn-sm btn-secondary" id="cancelImportBtn">
                    <i class="fas fa-times me-1"></i> Annuler
                </button>
                <button type="button" class="btn btn-sm btn-primary" id="confirmImportBtn">
                    <i class="fas fa-check me-1"></i> Confirmer l'importation
                </button>
            </div>
        </div>
    </div>

    <!-- Formulaire d'importation -->
    <div class="card" id="importFormCard">
        <div class="card-header">
            <h5 class="card-title">Importer un fichier CSV</h5>
        </div>
        <div class="card-body">
            <!-- Aperçu rapide du fichier sélectionné 
            <div class="card mb-3" id="quickPreviewCard" style="display: none;">
                <div class="card-header bg-light">
                    <h6 class="card-title mb-0">Aperçu du fichier</h6>
                </div>
                <div class="card-body p-0">
                    <div class="table-responsive">
                        <table class="table table-sm table-striped table-hover mb-0" style="font-size: 0.85rem;">
                            <thead class="table-light">
                                <tr id="quickPreviewHeader"></tr>
                            </thead>
                            <tbody id="quickPreviewBody"></tbody>
                        </table>
                    </div>
                </div>
                <div class="card-footer bg-light">
                    <span class="text-muted small" id="quickPreviewInfo">0 lignes détectées</span>
                </div>
            </div>-->
            
            <form action="/import/upload" method="post" enctype="multipart/form-data" id="importForm">
                <!-- Ajouter le jeton CSRF pour la sécurité -->
                <input type="hidden" name="csrf_token" value="<?= $csrf_token ?? '' ?>">
                
                <div class="mb-3">
                    <label for="csvFile" class="form-label">Fichier CSV</label>
                    <input type="file" class="form-control" id="csvFile" name="csv_file" accept=".csv" required>
                    <div class="form-text">Taille maximale: 20 Mo</div>
                </div>
                <div class="row mb-3">
                    <div class="col-md-6">
                        <label for="separator" class="form-label">Séparateur</label>
                        <select class="form-select" id="separator" name="separator">
                            <option value=";" selected>Point-virgule (;)</option>
                            <option value=",">Virgule (,)</option>
                            <option value="\t">Tabulation</option>
                        </select>
                    </div>
                    <div class="col-md-6">
                        <div class="form-check mt-4">
                            <input type="checkbox" class="form-check-input" id="hasHeader" name="has_header" value="1" checked>
                            <label class="form-check-label" for="hasHeader">Le fichier contient une ligne d'en-tête</label>
                        </div>
                    </div>
                </div>
                <div class="mb-3 form-check">
                    <input type="checkbox" class="form-check-input" id="skipDuplicates" name="skip_duplicates" value="1" checked>
                    <label class="form-check-label" for="skipDuplicates">Ignorer les doublons</label>
                </div>
                <div class="mb-3 form-check">
                    <input type="checkbox" class="form-check-input" id="clearHashes" name="clear_hashes" value="1">
                    <label class="form-check-label" for="clearHashes">Vider la table des hachages (réimporter les fichiers précédemment importés)</label>
                    <div class="form-text text-muted">Cette option permet de réimporter des fichiers qui ont déjà été traités précédemment.</div>
                </div>
                <div class="mb-4">
                    <div class="form-check">
                        <input type="checkbox" class="form-check-input" id="chunkProcessing" name="chunk_processing" value="1">
                        <label class="form-check-label" for="chunkProcessing">Traitement par lots (recommandé pour les fichiers > 4000 lignes)</label>
                    </div>
                    <div class="form-text text-muted">Cette option permet de traiter les fichiers volumineux en plusieurs étapes pour éviter les dépassements de mémoire.</div>
                </div>
                
                <!-- Barre de progression cachée par défaut -->
                <div id="uploadProgressContainer" style="display: none;">
                    <div class="progress mb-3" style="height: 8px;">
                        <div class="progress-bar progress-bar-striped progress-bar-animated" id="uploadProgressBar" role="progressbar" style="width: 0%" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100"></div>
                    </div>
                    <div class="d-flex justify-content-between align-items-center mb-3">
                        <div class="text-muted small" id="uploadProgressText">Préparation...</div>
                        <div class="text-muted small" id="uploadProgressPercent">0%</div>
                    </div>
                    <div class="text-muted small mb-3" id="uploadProgressDetails">
                        <span id="progressCurrentRows">0</span> lignes traitées sur <span id="progressTotalRows">0</span>
                    </div>
                    <div class="d-flex justify-content-end">
                        <button type="button" class="btn btn-sm btn-danger" id="cancelUploadBtn" style="display: none;">
                            <i class="fas fa-times-circle me-1"></i> Annuler l'importation
                        </button>
                    </div>
                </div>
                
                <div class="d-grid gap-2 d-md-flex justify-content-md-end" id="importButtonsContainer">
                    <button type="button" class="btn btn-secondary me-2" id="previewBtn">
                        <i class="fas fa-eye me-1"></i> Prévisualiser
                    </button>
                    <button type="submit" class="btn btn-primary" id="submitBtn">
                        <i class="fas fa-upload me-1"></i> Importer
                    </button>
                </div>
            </form>
        </div>
    </div>
</div>

<!-- Modal d'informations sur l'importation -->
<div class="modal fade" id="importInfoModal" tabindex="-1" aria-labelledby="importInfoModalLabel" aria-hidden="true">
    <div class="modal-dialog modal-lg">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title" id="importInfoModalLabel">Informations sur l'importation</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Fermer"></button>
            </div>
            <div class="modal-body">
                <div class="mb-4">
                    <h6 class="fw-bold">Format attendu</h6>
                    <p>L'importation des données d'accès accepte les fichiers CSV avec les caractéristiques suivantes :</p>
                    <ul>
                        <li>Encodage UTF-8</li>
                        <li>Séparateur point-virgule (;) par défaut (configurable)</li>
                        <li>Première ligne d'en-tête (optionnelle)</li>
                    </ul>
                </div>
                
                <div class="mb-4">
                    <h6 class="fw-bold">Colonnes requises</h6>
                    <p>Les colonnes suivantes sont obligatoires :</p>
                    <div class="table-responsive">
                        <table class="table table-sm">
                            <thead class="table-light">
                                <tr>
                                    <th>Colonne</th>
                                    <th>Description</th>
                                    <th>Format attendu</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td><strong>Numéro de badge</strong></td>
                                    <td>Identifiant unique de l'employé</td>
                                    <td>Numérique</td>
                                </tr>
                                <tr>
                                    <td><strong>Date évènements</strong></td>
                                    <td>Date de l'événement</td>
                                    <td>JJ/MM/AAAA ou AAAA-MM-JJ</td>
                                </tr>
                                <tr>
                                    <td>Heure évènements</td>
                                    <td>Heure de l'événement</td>
                                    <td>HH:MM:SS</td>
                                </tr>
                                <tr>
                                    <td>Centrale</td>
                                    <td>Lieu ou dispositif de pointage</td>
                                    <td>Texte</td>
                                </tr>
                                <tr>
                                    <td>Nature Evenement</td>
                                    <td>Type d'événement (Entrée/Sortie)</td>
                                    <td>Texte</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
                
                <div class="mb-4">
                    <h6 class="fw-bold">Traitement des fichiers volumineux</h6>
                    <p>Pour les fichiers contenant plus de 4000 lignes, nous recommandons d'activer l'option "Traitement par lots" qui permet :</p>
                    <ul>
                        <li>Une consommation réduite de mémoire</li>
                        <li>Un suivi en temps réel de la progression</li>
                        <li>La possibilité d'annuler l'opération</li>
                    </ul>
                </div>
                
                <div class="mb-4">
                    <h6 class="fw-bold">Gestion des doublons</h6>
                    <p>Le système détecte automatiquement les doublons basés sur la comparaison des lignes entières:</p>
                    <ul>
                        <li>Une ligne est considérée comme un doublon si elle est strictement identique à une autre ligne du fichier ou déjà présente en base de données</li>
                        <li>Tous les champs sont pris en compte dans la comparaison (badge, date, heure, centrale, nom, prénom, etc.)</li>
                        <li>La comparaison est insensible à la casse pour assurer la cohérence</li>
                    </ul>
                    <p>Les doublons peuvent être ignorés (option par défaut) ou téléchargés après l'importation.</p>
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Fermer</button>
            </div>
        </div>
    </div>
</div>

<!-- Notification d'importation asynchrone -->
<div id="asyncNotification" class="toast position-fixed top-0 end-0 p-3 mt-5" style="z-index: 1100; display: none;" role="alert" aria-live="assertive" aria-atomic="true">
    <div class="toast-header bg-info text-white">
        <i class="fas fa-sync-alt me-2"></i>
        <strong class="me-auto">Importation volumineuse</strong>
        <small class="text-white-50 asyncTime">à l'instant</small>
        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast" aria-label="Fermer"></button>
    </div>
    <div class="toast-body">
        <p class="asyncMessage mb-2">Une importation volumineuse est en cours de traitement.</p>
        <div class="progress mb-2" style="height: 5px;">
            <div class="progress-bar bg-info asyncProgressBar" role="progressbar" style="width: 0%;" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100"></div>
        </div>
        <div class="d-flex justify-content-between align-items-center">
            <span class="asyncProgressText small">0%</span>
            <a href="/import/confirmation" class="btn btn-sm btn-primary asyncCheckLink">
                <i class="fas fa-external-link-alt me-1"></i> Voir les détails
            </a>
        </div>
    </div>
</div>

<script src="/assets/js/import.js"></script>

<script>
document.addEventListener('DOMContentLoaded', function() {
    const csvFileInput = document.getElementById('csvFile');
    const previewBtn = document.getElementById('previewBtn');
    const submitBtn = document.getElementById('submitBtn');
    const importForm = document.getElementById('importForm');
    const csvPreviewCard = document.getElementById('csvPreviewCard');
    const importFormCard = document.getElementById('importFormCard');
    const csvPreviewHeader = document.getElementById('csvPreviewHeader');
    const csvPreviewBody = document.getElementById('csvPreviewBody');
    const csvRowCount = document.getElementById('csvRowCount');
    const closePreviewBtn = document.getElementById('closePreviewBtn');
    const cancelImportBtn = document.getElementById('cancelImportBtn');
    const confirmImportBtn = document.getElementById('confirmImportBtn');
    const uploadProgressContainer = document.getElementById('uploadProgressContainer');
    const importButtonsContainer = document.getElementById('importButtonsContainer');
    const uploadProgressBar = document.getElementById('uploadProgressBar');
    const uploadProgressText = document.getElementById('uploadProgressText');
    const uploadProgressPercent = document.getElementById('uploadProgressPercent');
    const progressCurrentRows = document.getElementById('progressCurrentRows');
    const progressTotalRows = document.getElementById('progressTotalRows');
    const cancelUploadBtn = document.getElementById('cancelUploadBtn');
    const chunkProcessingCheckbox = document.getElementById('chunkProcessing');
    const uploadResultAlert = document.getElementById('uploadResultAlert');
    const uploadResultMessage = document.getElementById('uploadResultMessage');
    
    // Cache pour les données prévisualisées
    let previewData = null;
    let uploadInProgress = false;
    
    // Fermer la prévisualisation et revenir au formulaire
    closePreviewBtn.addEventListener('click', function() {
        csvPreviewCard.style.display = 'none';
        importFormCard.style.display = 'block';
    });
    
    cancelImportBtn.addEventListener('click', function() {
        csvPreviewCard.style.display = 'none';
        importFormCard.style.display = 'block';
    });
    
    // Gérer le bouton de prévisualisation
    previewBtn.addEventListener('click', function() {
        if (!csvFileInput.files || csvFileInput.files.length === 0) {
            alert('Veuillez sélectionner un fichier CSV à importer.');
            return;
        }
        
        const file = csvFileInput.files[0];
        const separator = document.getElementById('separator').value;
        const hasHeader = document.getElementById('hasHeader').checked;
        
        // Afficher l'indicateur de chargement
        uploadProgressContainer.style.display = 'block';
        importButtonsContainer.style.display = 'none';
        uploadProgressText.textContent = 'Analyse du fichier en cours...';
        
        // Créer un FormData pour envoyer le fichier
        const formData = new FormData();
        formData.append('csv_file', file);
        formData.append('separator', separator);
        if (hasHeader) formData.append('has_header', '1');
        
        // Nous n'ajoutons plus le jeton CSRF car il est désactivé côté serveur pour la prévisualisation
        
        // Envoyer la requête au serveur
        fetch('/import/preview', {
            method: 'POST',
            body: formData,
            // Ne pas définir Content-Type car FormData le définit automatiquement avec la boundary
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
                'Accept': 'application/json'
            },
            credentials: 'same-origin' // S'assurer que les cookies sont envoyés
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`Erreur réseau: ${response.status} ${response.statusText}`);
            }
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                throw new Error('Réponse non JSON reçue du serveur');
            }
            return response.json();
        })
        .then(data => {
            // Masquer l'indicateur de chargement
            uploadProgressContainer.style.display = 'none';
            importButtonsContainer.style.display = 'flex';
            
            console.log('Réponse du serveur:', data); // Déboguer la réponse
            
            if (data.success) {
                // Afficher l'aperçu
                displayServerPreview(data.data);
            } else {
                // Afficher l'erreur
                const errorMessage = data.error || 'Erreur inconnue lors de l\'analyse du fichier';
                console.error('Erreur de prévisualisation:', errorMessage);
                alert('Erreur lors de l\'analyse du fichier: ' + errorMessage);
            }
        })
        .catch(error => {
            console.error('Erreur lors de la prévisualisation:', error);
            
            // Masquer l'indicateur de chargement et rétablir les boutons
            uploadProgressContainer.style.display = 'none';
            importButtonsContainer.style.display = 'flex';
            
            // Créer un message d'erreur précis basé sur le type d'erreur
            let errorMessage = 'Erreur lors de la communication avec le serveur: ';
            
            if (error.name === 'SyntaxError') {
                errorMessage += 'Réponse invalide du serveur (erreur de syntaxe JSON)';
            } else if (error.message && error.message.includes('JSON')) {
                errorMessage += 'Format de réponse incorrect';
            } else if (error.name === 'TypeError') {
                errorMessage += 'Problème de connexion au serveur';
            } else if (error.message) {
                errorMessage += error.message;
            } else {
                errorMessage += 'Erreur inconnue';
            }
            
            alert(errorMessage);
        });
    });
    
    // Afficher l'aperçu à partir des données du serveur
    function displayServerPreview(data) {
        // Vider les conteneurs existants
        csvPreviewHeader.innerHTML = '';
        csvPreviewBody.innerHTML = '';
        
        // Vérifier si nous avons des données
        if (!data || !data.headers || !data.rows) {
            alert('Pas de données disponibles pour l\'aperçu');
            return;
        }
        
        // Mettre à jour le décompte des lignes
        csvRowCount.textContent = `${data.totalRows} lignes détectées`;
        
        // Créer la ligne d'en-tête
        data.headers.forEach(header => {
            const th = document.createElement('th');
            th.textContent = header;
            csvPreviewHeader.appendChild(th);
        });
        
        // Créer les lignes de données
        data.rows.forEach(row => {
            const tr = document.createElement('tr');
            
            row.forEach(cell => {
                const td = document.createElement('td');
                td.textContent = cell;
                tr.appendChild(td);
            });
            
            csvPreviewBody.appendChild(tr);
        });
        
        // Afficher la carte de prévisualisation et masquer le formulaire
        csvPreviewCard.style.display = 'block';
        importFormCard.style.display = 'none';
    }
    
    // Gestion du formulaire d'import
    importForm.addEventListener('submit', function(e) {
        if (!csvFileInput.files || csvFileInput.files.length === 0) {
            alert('Veuillez sélectionner un fichier CSV à importer.');
            e.preventDefault();
            return;
        }
        
        if (uploadInProgress) {
            e.preventDefault();
            return;
        }
        
        // Vérifier que le jeton CSRF est présent
        const csrfToken = document.querySelector('input[name="csrf_token"]').value;
        if (!csrfToken) {
            alert('Erreur de sécurité: jeton manquant. Veuillez actualiser la page et réessayer.');
            e.preventDefault();
            return;
        }
        
        // Si le traitement par lots est activé pour les fichiers volumineux
        const useChunks = chunkProcessingCheckbox.checked;
        
        if (useChunks) {
            e.preventDefault();
            uploadInProgress = true;
            startChunkedUpload();
        } else {
            // Montrer la barre de progression simple pour l'upload standard
            uploadProgressContainer.style.display = 'block';
            importButtonsContainer.style.display = 'none';
            uploadProgressText.textContent = 'Téléchargement du fichier...';
        }
    });
    
    // Fonction pour démarrer un upload par lots
    function startChunkedUpload() {
        const file = csvFileInput.files[0];
        const separator = document.getElementById('separator').value;
        const hasHeader = document.getElementById('hasHeader').checked;
        const skipDuplicates = document.getElementById('skipDuplicates').checked;
        
        // Afficher la barre de progression
        uploadProgressContainer.style.display = 'block';
        importButtonsContainer.style.display = 'none';
        cancelUploadBtn.style.display = 'block';
        
        // Lire le fichier pour compter les lignes
        const reader = new FileReader();
        
        reader.onload = function(e) {
            const content = e.target.result;
            // Compter les lignes (pour estimer la progression)
            const lines = content.split(/\r\n|\n/).filter(line => line.trim().length > 0);
            const totalRows = hasHeader ? lines.length - 1 : lines.length;
            
            // Mettre à jour l'affichage de la progression
            progressTotalRows.textContent = totalRows;
            
            // Simuler la progression en lots (à remplacer par le vrai traitement par lots)
            uploadFileInChunks(file, separator, hasHeader, skipDuplicates, totalRows);
        };
        
        reader.onerror = function() {
            alert('Erreur lors de la lecture du fichier');
            resetUploadForm();
        };
        
        reader.readAsText(file);
    }
    
    // Fonction qui simule le téléchargement par lots
    function uploadFileInChunks(file, separator, hasHeader, skipDuplicates, totalRows) {
        const formData = new FormData();
        formData.append('csv_file', file);
        formData.append('separator', separator);
        if (hasHeader) formData.append('has_header', '1');
        if (skipDuplicates) formData.append('skip_duplicates', '1');
        formData.append('chunk_processing', '1');
        
        // Ajouter le jeton CSRF pour sécuriser la requête AJAX
        const csrfToken = document.querySelector('input[name="csrf_token"]').value;
        formData.append('csrf_token', csrfToken);
        
        // Faire une requête AJAX
        const xhr = new XMLHttpRequest();
        let processedRows = 0;
        
        xhr.upload.addEventListener('progress', function(e) {
            if (e.lengthComputable) {
                const percentComplete = Math.round((e.loaded / e.total) * 100);
                
                // Mettre à jour la barre de progression du téléchargement
                uploadProgressBar.style.width = percentComplete + '%';
                uploadProgressBar.setAttribute('aria-valuenow', percentComplete);
                uploadProgressPercent.textContent = percentComplete + '%';
                
                if (percentComplete < 100) {
                    uploadProgressText.textContent = 'Téléchargement du fichier...';
                } else {
                    uploadProgressText.textContent = 'Traitement des données...';
                }
            }
        });
        
        xhr.addEventListener('load', function(e) {
            if (xhr.status >= 200 && xhr.status < 300) {
                try {
                    const response = JSON.parse(xhr.responseText);
                    
                    // Si le serveur répond avec succès
                    uploadProgressBar.style.width = '100%';
                    uploadProgressBar.setAttribute('aria-valuenow', 100);
                    uploadProgressPercent.textContent = '100%';
                    progressCurrentRows.textContent = totalRows;
                    uploadProgressText.textContent = 'Import terminé avec succès!';
                    
                    // Cacher la barre de progression après un délai
                    setTimeout(function() {
                        uploadProgressContainer.style.display = 'none';
                        importButtonsContainer.style.display = 'flex';
                        resetUploadForm();
                        
                        // Afficher le message de résultat
                        uploadResultAlert.className = 'alert alert-success alert-dismissible fade show';
                        uploadResultMessage.textContent = `Import terminé avec succès! ${response.stats.inserted} enregistrements importés, ${response.stats.skipped} doublons ignorés.`;
                        uploadResultAlert.style.display = 'block';
                        
                        // Recharger la page si nécessaire pour afficher les résultats
                        if (response.redirect) {
                            window.location.href = response.redirect;
                        }
                    }, 1500);
                } catch (error) {
                    handleUploadError('Erreur de traitement de la réponse du serveur.');
                }
            } else {
                handleUploadError('Erreur lors du téléchargement: ' + xhr.statusText);
            }
        });
        
        xhr.addEventListener('error', function() {
            handleUploadError('Erreur de connexion au serveur.');
        });
        
        xhr.addEventListener('abort', function() {
            handleUploadError('Le téléchargement a été annulé.');
        });
        
        // Simuler les mises à jour périodiques de progression
        const progressInterval = setInterval(function() {
            // Cette partie serait idéalement mise à jour par le serveur avec la progression réelle
            processedRows += Math.floor(totalRows * 0.05);
            if (processedRows > totalRows) processedRows = totalRows;
            
            progressCurrentRows.textContent = processedRows;
            const percentComplete = Math.round((processedRows / totalRows) * 100);
            
            // Après le téléchargement initial, mettre à jour la progression du traitement
            if (percentComplete > 0) {
                uploadProgressBar.style.width = percentComplete + '%';
                uploadProgressBar.setAttribute('aria-valuenow', percentComplete);
                uploadProgressPercent.textContent = percentComplete + '%';
                uploadProgressText.textContent = 'Traitement des données...';
            }
            
            if (processedRows >= totalRows) {
                clearInterval(progressInterval);
            }
        }, 1000);
        
        // Annulation de l'upload
        cancelUploadBtn.addEventListener('click', function() {
            xhr.abort();
            clearInterval(progressInterval);
            resetUploadForm();
            alert('L\'importation a été annulée.');
        });
        
        // Envoyer la requête
        xhr.open('POST', '/import/upload', true);
        xhr.send(formData);
    }
    
    // Gérer les erreurs d'upload
    function handleUploadError(message) {
        uploadResultAlert.className = 'alert alert-danger alert-dismissible fade show';
        uploadResultMessage.textContent = message;
        uploadResultAlert.style.display = 'block';
        resetUploadForm();
    }
    
    // Réinitialiser le formulaire d'upload
    function resetUploadForm() {
        uploadInProgress = false;
        uploadProgressContainer.style.display = 'none';
        importButtonsContainer.style.display = 'flex';
        cancelUploadBtn.style.display = 'none';
        uploadProgressBar.style.width = '0%';
        uploadProgressBar.setAttribute('aria-valuenow', 0);
        uploadProgressPercent.textContent = '0%';
        uploadProgressText.textContent = 'Préparation...';
        progressCurrentRows.textContent = '0';
        progressTotalRows.textContent = '0';
    }

    // Ajouter la gestion du clic sur le bouton de confirmation d'importation
    confirmImportBtn.addEventListener('click', function() {
        // Soumettre le formulaire d'importation
        const hiddenCsrfInput = document.createElement('input');
        hiddenCsrfInput.type = 'hidden';
        hiddenCsrfInput.name = 'csrf_token';
        hiddenCsrfInput.value = document.querySelector('input[name="csrf_token"]').value;
        
        const hiddenAction = document.createElement('input');
        hiddenAction.type = 'hidden';
        hiddenAction.name = 'action';
        hiddenAction.value = 'process';
        
        // Ajouter les champs cachés au formulaire
        importForm.appendChild(hiddenCsrfInput);
        importForm.appendChild(hiddenAction);
        
        // Soumettre le formulaire
        importForm.submit();
    });
});
</script>

<?php
// Fin de la capture du contenu
$content = ob_get_clean();

// Inclure le layout principal
include __DIR__ . '/../layouts/main.php';
?> 