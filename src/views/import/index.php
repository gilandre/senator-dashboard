<?php
// Définir les variables de page
$pageTitle = 'Importation de Données';
$currentPage = 'import';

// Commencer la capture du contenu
ob_start();
?>

<div class="container-fluid py-3">
    <div class="row mb-3">
        <div class="col">
            <h1 class="h3 mb-0">Import de données</h1>
        </div>
        <div class="col text-end">
            <button type="button" class="btn btn-outline-secondary me-2" id="toggleHistory">
                <i class="fas fa-history"></i> Historique
            </button>
            <button type="button" class="btn btn-outline-info me-2" id="toggleInstructions">
                <i class="fas fa-info-circle"></i> Instructions
            </button>
            <a href="/dashboard" class="btn btn-secondary">
                <i class="fas fa-arrow-left"></i> Retour
            </a>
        </div>
    </div>
    
    <!-- Historique des importations (masqué par défaut) -->
    <div class="card mb-4 shadow-sm" id="historySection" style="display: none;">
        <div class="card-header bg-light d-flex justify-content-between align-items-center">
            <h5 class="card-title mb-0">Historique des importations</h5>
            <button type="button" class="btn-close" id="closeHistory" aria-label="Fermer"></button>
        </div>
        <div class="card-body p-0">
            <!-- Formulaire de filtrage par date -->
            <div class="bg-light p-3 border-bottom">
                <form id="historyFilterForm" class="row g-3 align-items-end">
                    <div class="col-md-4">
                        <label for="start_date" class="form-label">Date de début</label>
                        <input type="date" class="form-control" id="start_date" name="start_date" value="<?= date('Y-m-d', strtotime('-30 days')) ?>">
                    </div>
                    <div class="col-md-4">
                        <label for="end_date" class="form-label">Date de fin</label>
                        <input type="date" class="form-control" id="end_date" name="end_date" value="<?= date('Y-m-d') ?>">
                    </div>
                    <div class="col-md-4">
                        <button type="submit" class="btn btn-primary w-100">
                            <i class="fas fa-filter"></i> Filtrer
                        </button>
                    </div>
                </form>
            </div>
            
            <!-- Tableau d'historique -->
            <div class="table-responsive">
                <table class="table table-hover table-striped mb-0">
                    <thead class="table-light">
                        <tr>
                            <th>Date</th>
                            <th>Fichier</th>
                            <th>Utilisateur</th>
                            <th>Total</th>
                            <th>Importés</th>
                            <th>Doublons</th>
                            <th>Erreurs</th>
                            <th>Taux</th>
                        </tr>
                    </thead>
                    <tbody id="historyTableBody">
                        <tr>
                            <td colspan="8" class="text-center py-5">
                                <div class="spinner-border text-primary" role="status">
                                    <span class="visually-hidden">Chargement...</span>
                                </div>
                                <p class="mt-2">Chargement de l'historique...</p>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
            
            <!-- Pagination -->
            <div class="d-flex justify-content-between align-items-center p-3 bg-light border-top" id="historyPagination">
                <div class="text-muted small">
                    <span id="pagination-info">Chargement...</span>
                </div>
                <div>
                    <div class="btn-group" role="group">
                        <button type="button" class="btn btn-sm btn-outline-secondary" id="prevPageBtn" disabled>
                            <i class="fas fa-chevron-left"></i> Précédent
                        </button>
                        <button type="button" class="btn btn-sm btn-outline-secondary" id="nextPageBtn" disabled>
                            Suivant <i class="fas fa-chevron-right"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
    
    <?php if (isset($_SESSION['import_stats'])): ?>
    <!-- Résumé de la dernière importation -->
    <div class="card mb-4 border-0 shadow-sm overflow-hidden" id="statsComponent">
        <div class="card-header bg-gradient-success-to-primary text-white py-3">
            <div class="d-flex align-items-center justify-content-between">
                <div class="d-flex align-items-center">
                    <i class="fas fa-check-circle me-3 fs-3"></i>
                    <h5 class="mb-0 fw-bold">Importation réussie</h5>
                </div>
                <div>
                    <button type="button" class="btn-close btn-close-white" aria-label="Fermer" id="hideStatsBtn" title="Masquer les statistiques"></button>
                </div>
            </div>
        </div>
        <div class="card-body p-0">
            <!-- Statistiques sommaires -->
            <div class="row g-0 border-bottom">
                <?php 
                // Pré-calculer les variables pour réduire l'utilisation de mémoire et optimiser l'affichage
                $total = $_SESSION['import_stats']['total'];
                $imported = $_SESSION['import_stats']['imported'];
                $duplicates = $_SESSION['import_stats']['duplicates'];
                $errors = $_SESSION['import_stats']['errors'];
                $successRate = $total > 0 ? round(($imported / $total) * 100) : 0;
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
            <div class="d-flex justify-content-end p-3">
                <form action="/import/finish" method="post" class="d-inline me-2">
                    <button type="submit" class="btn btn-sm btn-outline-secondary">
                        <i class="fas fa-broom me-1"></i> Effacer ce résumé
                    </button>
                </form>
                
                <button type="button" class="btn btn-sm btn-primary" id="toggleDetailsBtn">
                    <i class="fas fa-chart-pie me-1"></i> Détails
                </button>
            </div>
            
            <!-- Détails (lazy loading) -->
            <div class="collapse" id="importDetails">
                <div class="border-top p-3 bg-light">
                    <!-- Le contenu sera chargé via AJAX lors du clic -->
                    <div id="detailsContent">
                        <div class="text-center py-3">
                            <div class="spinner-border text-primary" role="status">
                                <span class="visually-hidden">Chargement...</span>
                            </div>
                            <p class="mt-2">Chargement des détails...</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    <?php endif; ?>

    <!-- Instructions (masquées par défaut) -->
    <div class="card mb-3" id="instructionsCard" style="display: none;">
        <div class="card-header bg-light d-flex justify-content-between align-items-center">
            <h5 class="card-title mb-0">Instructions d'import</h5>
            <button type="button" class="btn-close" id="closeInstructions" aria-label="Fermer"></button>
        </div>
        <div class="card-body">
            <p>Le fichier CSV doit respecter le format suivant :</p>
            <ul>
                <li>Utiliser le point-virgule (;) comme séparateur</li>
                <li>La première ligne doit contenir les en-têtes des colonnes</li>
                <li>Les colonnes requises sont :</li>
            </ul>
            <div class="table-responsive mb-3">
                <table class="table table-sm table-bordered">
                    <thead class="table-light">
                        <tr>
                            <th>Colonne</th>
                            <th>Description</th>
                            <th>Format</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>Numéro de badge</td>
                            <td>Identifiant unique de la personne</td>
                            <td>Numérique</td>
                        </tr>
                        <tr>
                            <td>Date évènements</td>
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
                            <td>Nom de l'unité centrale</td>
                            <td>Texte</td>
                        </tr>
                        <tr>
                            <td>Lecteur</td>
                            <td>Identifiant du lecteur de badge</td>
                            <td>Texte</td>
                        </tr>
                        <tr>
                            <td>Nature Evenement</td>
                            <td>Type d'événement</td>
                            <td>Entrée, Sortie, etc.</td>
                        </tr>
                        <tr>
                            <td>Nom</td>
                            <td>Nom de famille</td>
                            <td>Texte</td>
                        </tr>
                        <tr>
                            <td>Prénom</td>
                            <td>Prénom</td>
                            <td>Texte</td>
                        </tr>
                    </tbody>
                </table>
            </div>
            <div class="alert alert-info py-2">
                <i class="fas fa-info-circle"></i> Le système validera les données avant l'importation et vous permettra de corriger les erreurs détectées.
            </div>
        </div>
    </div>

    <div class="row main-content">
        <!-- Formulaire d'importation -->
        <div class="col-lg-5 mb-3">
            <div class="card mb-4 shadow-sm">
                <div class="card-header bg-primary text-white">
                    <h5 class="card-title mb-0">Importer un fichier CSV</h5>
                </div>
                <div class="card-body">
                    <form action="/import/upload" method="post" enctype="multipart/form-data" id="importForm">
                        <div class="mb-3">
                            <label for="csv_file" class="form-label">Fichier CSV</label>
                            <input type="file" class="form-control" name="csv_file" id="csv_file" accept=".csv" required>
                        </div>
                        
                        <div class="row mb-3">
                            <div class="col-md-6">
                                <label for="separator" class="form-label">Séparateur</label>
                                <select class="form-select" name="separator" id="separator">
                                    <option value=";">Point-virgule (;)</option>
                                    <option value=",">Virgule (,)</option>
                                    <option value="\t">Tabulation</option>
                                    <option value="|">Pipe (|)</option>
                                </select>
                            </div>
                            <div class="col-md-6">
                                <div class="form-check mt-4">
                                    <input class="form-check-input" type="checkbox" name="has_header" id="has_header" checked>
                                    <label class="form-check-label" for="has_header">
                                        Le fichier contient une ligne d'en-tête
                                    </label>
                                </div>
                            </div>
                        </div>
                        
                        <div class="mb-4">
                            <div class="form-check">
                                <input class="form-check-input" type="checkbox" name="validate_data" id="validate_data" checked>
                                <label class="form-check-label" for="validate_data">
                                    Valider les données avant l'importation
                                </label>
                                <small class="form-text text-muted d-block">
                                    Vérifie les données et affiche un aperçu avant d'importer
                                </small>
                            </div>
                        </div>
                        
                        <div class="d-grid">
                            <button type="submit" class="btn btn-primary" id="importButton">
                                <i class="fas fa-upload me-2"></i> Importer
                            </button>
                        </div>
                    </form>
                    
                    <!-- Indicateur de progression (masqué par défaut) -->
                    <div id="uploadProgress" class="mt-4" style="display: none;">
                        <div class="progress mb-3">
                            <div class="progress-bar progress-bar-striped progress-bar-animated" role="progressbar" style="width: 0%" id="progressBar"></div>
                        </div>
                        <div class="d-flex justify-content-between">
                            <p class="text-muted mb-0" id="progressMessage">Initialisation de l'importation...</p>
                            <p class="text-muted mb-0" id="progressPercentage">0%</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Aperçu des données (élargi pour une meilleure visibilité) -->
        <div class="col-lg-7 mb-3">
            <div class="card h-100 shadow-sm">
                <div class="card-header bg-success text-white">
                    <h5 class="card-title mb-0"><i class="fas fa-table me-2"></i>Aperçu des données</h5>
                </div>
                <div class="card-body">
                    <div id="previewContainer" class="table-responsive">
                        <div class="text-center py-4">
                            <i class="fas fa-file-csv fa-3x text-muted mb-3"></i>
                            <p class="text-muted">Sélectionnez un fichier pour voir l'aperçu</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>

<style>
    /* Ajustement de la hauteur pour les écrans de différentes tailles */
    @media (min-height: 800px) {
        .main-content {
            min-height: calc(100vh - 350px);
        }
    }
    
    @media (min-height: 600px) and (max-height: 799px) {
        .main-content {
            min-height: calc(100vh - 300px);
        }
    }
    
    /* Ajout d'ombre légère aux cartes pour un meilleur effet visuel */
    .card {
        transition: all 0.2s ease-in-out;
    }
    
    .card:hover {
        box-shadow: 0 5px 15px rgba(0,0,0,0.1);
    }
</style>

<script>
document.getElementById('csv_file').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const content = e.target.result;
        const lines = content.split('\n');
        const separator = document.getElementById('separator').value;
        const hasHeader = document.getElementById('has_header').checked;

        let html = '<table class="table table-striped table-hover table-bordered">';
        
        // En-têtes
        if (hasHeader && lines.length > 0) {
            html += '<thead class="table-light"><tr>';
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
        
        if (lines.length > maxLines) {
            html += `<div class="text-muted mt-2">Affichage des 5 premières lignes sur ${lines.length - (hasHeader ? 1 : 0)} lignes au total</div>`;
        }

        document.getElementById('previewContainer').innerHTML = html;
    };
    reader.readAsText(file);
});

document.getElementById('importForm').addEventListener('submit', function(e) {
    const file = document.getElementById('csv_file').files[0];
    if (!file) {
        e.preventDefault();
        alert('Veuillez sélectionner un fichier CSV à importer.');
        return;
    }
    
    if (file.size > 10 * 1024 * 1024) { // 10 MB
        e.preventDefault();
        alert('Le fichier est trop volumineux. Taille maximale : 10 MB');
    }
});

// Gestion de l'affichage/masquage des instructions
document.getElementById('toggleInstructions').addEventListener('click', function() {
    const instructionsCard = document.getElementById('instructionsCard');
    if (instructionsCard.style.display === 'none') {
        instructionsCard.style.display = 'block';
        this.innerHTML = '<i class="fas fa-times-circle"></i> Masquer les instructions';
        this.classList.replace('btn-outline-info', 'btn-info');
    } else {
        instructionsCard.style.display = 'none';
        this.innerHTML = '<i class="fas fa-info-circle"></i> Instructions';
        this.classList.replace('btn-info', 'btn-outline-info');
    }
});

document.getElementById('closeInstructions').addEventListener('click', function() {
    document.getElementById('instructionsCard').style.display = 'none';
    const toggleBtn = document.getElementById('toggleInstructions');
    toggleBtn.innerHTML = '<i class="fas fa-info-circle"></i> Instructions';
    toggleBtn.classList.replace('btn-info', 'btn-outline-info');
});

// Changer le format d'aperçu lorsque le séparateur change
document.getElementById('separator').addEventListener('change', function() {
    const fileInput = document.getElementById('csv_file');
    if (fileInput.files.length > 0) {
        const event = new Event('change');
        fileInput.dispatchEvent(event);
    }
});
</script>

<!-- Script pour masquer les statistiques et charger les détails à la demande -->
<script>
document.addEventListener('DOMContentLoaded', function() {
    // Gestion du bouton pour masquer les statistiques
    const hideStatsBtn = document.getElementById('hideStatsBtn');
    const statsComponent = document.getElementById('statsComponent');
    
    // Auto-masquage après 2-3 minutes (entre 120000 et 180000 ms)
    if (statsComponent) {
        const autoHideDelay = Math.floor(Math.random() * (180000 - 120000 + 1)) + 120000;
        const autoHideTimer = setTimeout(function() {
            if (statsComponent && statsComponent.style.display !== 'none') {
                statsComponent.style.display = 'none';
            }
        }, autoHideDelay);
        
        // Si l'utilisateur clique sur le bouton, annuler le timer
        if (hideStatsBtn) {
            hideStatsBtn.addEventListener('click', function() {
                clearTimeout(autoHideTimer);
                if (statsComponent) {
                    statsComponent.style.display = 'none';
                }
            });
        }
    }
    
    // Gestion du bouton pour afficher/masquer les détails
    const toggleDetailsBtn = document.getElementById('toggleDetailsBtn');
    const importDetails = document.getElementById('importDetails');
    const detailsContent = document.getElementById('detailsContent');
    
    if (toggleDetailsBtn && importDetails) {
        toggleDetailsBtn.addEventListener('click', function() {
            const isCollapsed = !importDetails.classList.contains('show');
            
            if (isCollapsed) {
                // Afficher le collapse
                importDetails.classList.add('show');
                
                // Charger les détails si ce n'est pas déjà fait
                if (!detailsContent.getAttribute('data-loaded')) {
                    // Contenu HTML des détails
                    let details = `
                    <h6 class="text-muted mb-3"><i class="fas fa-info-circle me-2"></i>Détails de l'importation</h6>
                    
                    <!-- Statistiques détaillées -->
                    <div class="row g-3">
                        <div class="col-md-6">
                            <div class="bg-white rounded p-3 h-100 shadow-sm">
                                <h6 class="text-muted mb-2">Répartition</h6>
                                <div class="d-flex flex-column">
                                    <div class="d-flex justify-content-between align-items-center mb-2">
                                        <span><i class="fas fa-check text-success me-2"></i>Importées</span>
                                        <span class="badge bg-light text-success">${<?= $imported ?>} (${<?= $successRate ?>}%)</span>
                                    </div>
                                    <div class="d-flex justify-content-between align-items-center mb-2">
                                        <span><i class="fas fa-copy text-warning me-2"></i>Doublons</span>
                                        <span class="badge bg-light text-warning">${<?= $duplicates ?>} (${<?= $duplicateRate ?>}%)</span>
                                    </div>
                                    <div class="d-flex justify-content-between align-items-center">
                                        <span><i class="fas fa-exclamation-triangle text-danger me-2"></i>Erreurs</span>
                                        <span class="badge bg-light text-danger">${<?= $errors ?>} (${<?= $errorRate ?>}%)</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="bg-white rounded p-3 h-100 shadow-sm">
                                <h6 class="text-muted mb-2">Informations</h6>
                                <ul class="list-unstyled mb-0">
                                    <li class="mb-2"><i class="far fa-calendar-alt me-2 text-primary"></i>Date: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}</li>
                                    <li class="mb-2"><i class="far fa-clock me-2 text-primary"></i>Durée: <span class="badge bg-light text-primary">N/A</span></li>
                                    <li><i class="fas fa-server me-2 text-primary"></i>Base: <span class="badge bg-light text-primary">SQLite</span></li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    <!-- Graphique -->
                    <div class="bg-white rounded p-3 mt-3 shadow-sm">
                        <div class="import-chart" style="height: 150px;">
                            <canvas id="importChart"></canvas>
                        </div>
                    </div>
                    `;
                    
                    // Mettre à jour le contenu
                    detailsContent.innerHTML = details;
                    detailsContent.setAttribute('data-loaded', 'true');
                    
                    // Initialiser le graphique
                    const ctx = document.getElementById('importChart').getContext('2d');
                    if (ctx) {
                        // Données
                        const importData = {
                            labels: ['Importées', 'Doublons', 'Erreurs'],
                            datasets: [{
                                data: [
                                    <?= $imported ?>, 
                                    <?= $duplicates ?>, 
                                    <?= $errors ?>
                                ],
                                backgroundColor: [
                                    'rgba(40, 167, 69, 0.7)',
                                    'rgba(255, 193, 7, 0.7)',
                                    'rgba(220, 53, 69, 0.7)'
                                ],
                                borderColor: [
                                    'rgb(40, 167, 69)',
                                    'rgb(255, 193, 7)',
                                    'rgb(220, 53, 69)'
                                ],
                                borderWidth: 1
                            }]
                        };
                        
                        // Créer le graphique
                        new Chart(ctx, {
                            type: 'doughnut',
                            data: importData,
                            options: {
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: {
                                    legend: {
                                        position: 'bottom'
                                    }
                                }
                            }
                        });
                    }
                }
            } else {
                // Masquer le collapse
                importDetails.classList.remove('show');
            }
        });
    }
});
</script>

<!-- Script pour gérer l'affichage de l'historique -->
<script>
document.addEventListener('DOMContentLoaded', function() {
    const toggleHistoryBtn = document.getElementById('toggleHistory');
    const historySection = document.getElementById('historySection');
    const closeHistoryBtn = document.getElementById('closeHistory');
    const historyFilterForm = document.getElementById('historyFilterForm');
    const historyTableBody = document.getElementById('historyTableBody');
    const prevPageBtn = document.getElementById('prevPageBtn');
    const nextPageBtn = document.getElementById('nextPageBtn');
    const paginationInfo = document.getElementById('pagination-info');
    
    // État de l'historique
    const historyState = {
        page: 1,
        limit: 10,
        startDate: document.getElementById('start_date').value,
        endDate: document.getElementById('end_date').value,
        totalPages: 1
    };
    
    // Fonction pour charger l'historique depuis l'API
    function loadHistory() {
        // Afficher le spinner
        historyTableBody.innerHTML = `
        <tr>
            <td colspan="8" class="text-center py-5">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Chargement...</span>
                </div>
                <p class="mt-2">Chargement de l'historique...</p>
            </td>
        </tr>
        `;
        
        // Désactiver les boutons de pagination pendant le chargement
        prevPageBtn.disabled = true;
        nextPageBtn.disabled = true;
        
        // Construire l'URL de l'API avec les paramètres
        const apiUrl = `/import/get-history?page=${historyState.page}&limit=${historyState.limit}&start_date=${historyState.startDate}&end_date=${historyState.endDate}`;
        
        // Effectuer la requête AJAX
        fetch(apiUrl)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Erreur réseau: ' + response.status);
                }
                return response.json();
            })
            .then(data => {
                if (data.success) {
                    // Mettre à jour l'état
                    historyState.totalPages = data.pagination.last_page;
                    
                    // Mettre à jour la pagination
                    updatePagination(data.pagination);
                    
                    // Afficher les données
                    displayHistoryData(data.data);
                } else {
                    throw new Error(data.error || 'Erreur lors du chargement des données');
                }
            })
            .catch(error => {
                console.error('Erreur:', error);
                // Afficher le message d'erreur
                historyTableBody.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center py-5">
                        <div class="text-danger">
                            <i class="fas fa-exclamation-circle me-2"></i>
                            ${error.message}
                        </div>
                        <button class="btn btn-sm btn-outline-secondary mt-3" onclick="loadHistory()">
                            <i class="fas fa-sync-alt me-1"></i> Réessayer
                        </button>
                    </td>
                </tr>
                `;
            });
    }
    
    // Fonction pour afficher les données d'historique
    function displayHistoryData(historyData) {
        if (!historyData || historyData.length === 0) {
            historyTableBody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center py-5">
                    <div class="text-muted">
                        <i class="fas fa-info-circle me-2"></i>
                        Aucun historique d'importation disponible pour cette période.
                    </div>
                </td>
            </tr>
            `;
            return;
        }
        
        let html = '';
        
        // Parcourir les données et générer les lignes du tableau
        historyData.forEach(entry => {
            // Formater la date
            const date = new Date(entry.import_date);
            const formattedDate = new Intl.DateTimeFormat('fr-FR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            }).format(date);
            
            // Calculer le taux de réussite
            const successRate = entry.success_rate || 0;
            
            html += `
            <tr>
                <td>${formattedDate}</td>
                <td class="text-truncate" style="max-width: 200px;" title="${entry.filename}">
                    <i class="fas fa-file-csv me-1 text-primary"></i>
                    ${entry.filename}
                </td>
                <td>${entry.username || 'Système'}</td>
                <td class="text-center">${entry.total_records}</td>
                <td class="text-center text-success">${entry.imported_records}</td>
                <td class="text-center text-warning">${entry.duplicate_records}</td>
                <td class="text-center text-danger">${entry.error_records}</td>
                <td class="text-center">
                    <div class="progress" style="height: 6px; width: 80px;">
                        <div class="progress-bar bg-${successRate > 90 ? 'success' : (successRate > 70 ? 'warning' : 'danger')}" 
                             style="width: ${successRate}%" 
                             title="${successRate}%">
                        </div>
                    </div>
                    <span class="small">${successRate}%</span>
                </td>
            </tr>
            `;
        });
        
        historyTableBody.innerHTML = html;
    }
    
    // Fonction pour mettre à jour la pagination
    function updatePagination(pagination) {
        // Mettre à jour l'information de pagination
        paginationInfo.textContent = `Affichage ${pagination.from} à ${pagination.to} sur ${pagination.total} entrées`;
        
        // Mettre à jour les boutons de pagination
        prevPageBtn.disabled = pagination.current_page <= 1;
        nextPageBtn.disabled = pagination.current_page >= pagination.last_page;
    }
    
    // Gestion des événements de pagination
    prevPageBtn.addEventListener('click', function() {
        if (historyState.page > 1) {
            historyState.page--;
            loadHistory();
        }
    });
    
    nextPageBtn.addEventListener('click', function() {
        if (historyState.page < historyState.totalPages) {
            historyState.page++;
            loadHistory();
        }
    });
    
    // Bouton pour afficher/masquer l'historique
    if (toggleHistoryBtn) {
        toggleHistoryBtn.addEventListener('click', function() {
            if (historySection.style.display === 'none') {
                historySection.style.display = 'block';
                // Charger l'historique avec les valeurs actuelles
                loadHistory();
            } else {
                historySection.style.display = 'none';
            }
        });
    }
    
    // Bouton pour fermer l'historique
    if (closeHistoryBtn) {
        closeHistoryBtn.addEventListener('click', function() {
            historySection.style.display = 'none';
        });
    }
    
    // Formulaire de filtrage
    if (historyFilterForm) {
        historyFilterForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Mettre à jour les filtres
            historyState.startDate = document.getElementById('start_date').value;
            historyState.endDate = document.getElementById('end_date').value;
            historyState.page = 1; // Réinitialiser à la première page
            
            // Charger l'historique avec les nouvelles valeurs
            loadHistory();
        });
    }
});
</script>

<!-- Script pour gérer la barre de progression -->
<script>
document.addEventListener('DOMContentLoaded', function() {
    const importForm = document.getElementById('importForm');
    const importButton = document.getElementById('importButton');
    const fileInput = document.getElementById('csv_file');
    const uploadProgress = document.getElementById('uploadProgress');
    const progressBar = document.getElementById('progressBar');
    const progressMessage = document.getElementById('progressMessage');
    const progressPercentage = document.getElementById('progressPercentage');
    
    // Fonction pour vérifier et mettre à jour la progression
    function checkProgress() {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', '/import/process?check_progress=1', true);
        xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
        
        xhr.onload = function() {
            if (xhr.status === 200) {
                try {
                    const response = JSON.parse(xhr.responseText);
                    
                    // Mettre à jour la barre de progression
                    const progress = response.progress || 0;
                    progressBar.style.width = progress + '%';
                    progressPercentage.textContent = progress + '%';
                    
                    // Mettre à jour le message
                    if (response.message) {
                        progressMessage.textContent = response.message;
                    }
                    
                    // Si le traitement est terminé
                    if (response.status === 'completed') {
                        progressBar.classList.remove('progress-bar-animated');
                        progressBar.classList.add('bg-success');
                        
                        // Rediriger vers la page de validation si des statistiques sont disponibles
                        if (response.stats) {
                            setTimeout(function() {
                                window.location.href = '/import/validate';
                            }, 1000);
                        }
                    } else if (response.status === 'error') {
                        progressBar.classList.remove('progress-bar-animated');
                        progressBar.classList.add('bg-danger');
                    } else {
                        // Continuer à vérifier la progression si le traitement n'est pas terminé
                        setTimeout(checkProgress, 1000);
                    }
                } catch (error) {
                    console.error('Erreur de parsing JSON:', error);
                }
            }
        };
        
        xhr.onerror = function() {
            console.error('Erreur de connexion');
        };
        
        xhr.send();
    }
    
    // Gestion de la soumission du formulaire
    importForm.addEventListener('submit', function(e) {
        // Vérifier qu'un fichier a été sélectionné
        if (!fileInput.files.length) {
            return true; // Permettre la soumission normale
        }
        
        // Afficher la barre de progression
        importButton.disabled = true;
        importButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Importation en cours...';
        uploadProgress.style.display = 'block';
        
        // Pour les fichiers volumineux, commencer à vérifier la progression
        setTimeout(checkProgress, 1000);
        
        // Permettre au formulaire de se soumettre normalement
        return true;
    });
});
</script>

<?php
// Récupérer le contenu généré
$content = ob_get_clean();

// Inclure le layout avec le contenu
require_once __DIR__ . '/../layouts/app.php';
?> 