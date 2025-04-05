<?php
// Définir les variables de page
$pageTitle = 'Validation des données';
$currentPage = 'import';

// Commencer la capture du contenu
ob_start();
?>

<div class="container-fluid py-4">
    <div class="row">
        <div class="col-12">
            <div class="card mb-4">
                <div class="card-header pb-0 d-flex justify-content-between align-items-center">
                    <h6>Validation des données importées</h6>
                    <a href="/import" class="btn btn-sm btn-outline-primary">Retour à l'importation</a>
                </div>
                <div class="card-body">
                    <div class="row mb-3">
                        <?php if ($error_count > 0): ?>
                            <div class="col-md-4">
                                <div class="alert alert-danger py-2" role="alert">
                                    <div class="d-flex align-items-center">
                                        <i class="fa fa-exclamation-triangle me-2"></i>
                                        <div>
                                            <strong>Erreurs: <?= $error_count ?></strong>
                                            <div class="small">Les lignes avec erreurs ne seront pas importées</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        <?php endif; ?>
                        
                        <?php if ($warning_count > 0): ?>
                            <div class="col-md-4">
                                <div class="alert alert-warning py-2" role="alert">
                                    <div class="d-flex align-items-center">
                                        <i class="fa fa-exclamation-circle me-2"></i>
                                        <div>
                                            <strong>Avertissements: <?= $warning_count ?></strong>
                                            <div class="small">Vérifiez ces lignes avant l'import</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        <?php endif; ?>
                        
                        <?php if ($error_count === 0 && $warning_count === 0): ?>
                            <div class="col-md-4">
                                <div class="alert alert-success py-2" role="alert">
                                    <div class="d-flex align-items-center">
                                        <i class="fa fa-check-circle me-2"></i>
                                        <div>
                                            <strong>Validation réussie !</strong>
                                            <div class="small">Aucune erreur détectée</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        <?php endif; ?>

                        <div class="col-md-<?= ($error_count > 0 || $warning_count > 0) ? '8' : '8' ?> d-flex align-items-center justify-content-between">
                            <div>
                                <span class="badge bg-primary me-2"><?= count($data) ?></span> 
                                <span>lignes à valider</span>
                            </div>
                            
                            <?php if (!empty($corrections)): ?>
                            <div class="form-check form-switch">
                                <input class="form-check-input" type="checkbox" id="apply-all-corrections" checked>
                                <label class="form-check-label" for="apply-all-corrections">Appliquer toutes les corrections</label>
                            </div>
                            <?php endif; ?>
                            
                            <?php if ($error_count === 0): ?>
                            <button type="button" id="start-import-btn" class="btn btn-primary">
                                <i class="fa fa-database me-2"></i>Importer les données
                            </button>
                            <?php endif; ?>
                        </div>
                    </div>
                    
                    <form action="/import/process" method="post" id="validation-form">
                        <!-- Input caché pour assurer le fonctionnement même sans corrections -->
                        <input type="hidden" name="confirm_import" value="1">
                        
                        <!-- Tableau des données avec validation -->
                        <div class="table-responsive">
                            <table id="validation-table" class="table table-striped table-bordered hover">
                                <thead class="thead-light">
                                    <tr>
                                        <th scope="col" style="width: 50px;">#</th>
                                        <?php foreach (array_keys(reset($data)) as $column): ?>
                                            <?php if ($column !== 'row_id'): ?>
                                                <th scope="col"><?= htmlspecialchars($column) ?></th>
                                            <?php endif; ?>
                                        <?php endforeach; ?>
                                        <th scope="col" style="width: 300px;">Validation</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <?php foreach ($data as $index => $row): ?>
                                        <?php 
                                        $rowId = $row['row_id'] ?? $index;
                                        $hasErrors = isset($errors[$rowId]) && !empty($errors[$rowId]);
                                        $hasWarnings = isset($warnings[$rowId]) && !empty($warnings[$rowId]);
                                        $rowClass = $hasErrors ? 'table-danger' : ($hasWarnings ? 'table-warning' : '');
                                        ?>
                                        <tr class="<?= $rowClass ?>">
                                            <td><?= $index + 1 ?></td>
                                            <?php foreach ($row as $column => $value): ?>
                                                <?php if ($column !== 'row_id'): ?>
                                                    <td>
                                                        <?php 
                                                        $hasCorrection = isset($corrections[$rowId][$column]);
                                                        if ($hasCorrection): 
                                                            $originalValue = $corrections[$rowId][$column]['original'];
                                                            $correctedValue = $corrections[$rowId][$column]['corrected'];
                                                        ?>
                                                            <div class="corrected-value">
                                                                <div class="original-value"><?= htmlspecialchars($originalValue) ?></div>
                                                                <div class="suggestion">
                                                                    <i class="fas fa-arrow-right text-primary"></i> 
                                                                    <span class="text-primary"><?= htmlspecialchars($correctedValue) ?></span>
                                                                    <div class="form-check">
                                                                        <input class="form-check-input correction-checkbox" type="checkbox" 
                                                                            name="apply_corrections[<?= $rowId ?>:<?= $column ?>]" 
                                                                            id="correction_<?= $rowId ?>_<?= $column ?>" 
                                                                            value="1" checked>
                                                                        <label class="form-check-label" for="correction_<?= $rowId ?>_<?= $column ?>">
                                                                            Appliquer
                                                                        </label>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        <?php else: ?>
                                                            <?= htmlspecialchars($value) ?>
                                                        <?php endif; ?>
                                                    </td>
                                                <?php endif; ?>
                                            <?php endforeach; ?>
                                            <td>
                                                <?php if ($hasErrors): ?>
                                                    <div class="errors">
                                                        <strong class="text-danger">Erreurs:</strong>
                                                        <ul class="mb-0 ps-3">
                                                            <?php foreach ($errors[$rowId] as $error): ?>
                                                                <li class="text-danger"><?= htmlspecialchars($error) ?></li>
                                                            <?php endforeach; ?>
                                                        </ul>
                                                    </div>
                                                <?php endif; ?>
                                                
                                                <?php if ($hasWarnings): ?>
                                                    <div class="warnings mt-2">
                                                        <strong class="text-warning">Avertissements:</strong>
                                                        <ul class="mb-0 ps-3">
                                                            <?php foreach ($warnings[$rowId] as $warning): ?>
                                                                <li class="text-warning"><?= htmlspecialchars($warning) ?></li>
                                                            <?php endforeach; ?>
                                                        </ul>
                                                    </div>
                                                <?php endif; ?>
                                                
                                                <?php if (!$hasErrors && !$hasWarnings): ?>
                                                    <span class="text-success"><i class="fa fa-check-circle"></i> Ligne valide</span>
                                                <?php endif; ?>
                                            </td>
                                        </tr>
                                    <?php endforeach; ?>
                                </tbody>
                            </table>
                        </div>
                        
                        <?php if ($error_count === 0): ?>
                            <div class="text-end mt-3">
                                <button type="button" id="start-import-btn" class="btn btn-primary">
                                    <i class="fa fa-database me-2"></i>Importer les données
                                </button>
                            </div>
                        <?php else: ?>
                            <div class="alert alert-info mt-3 p-2 small">
                                <p class="mb-0"><i class="fa fa-info-circle me-2"></i>Veuillez corriger toutes les erreurs avant de pouvoir importer les données.</p>
                                <a href="/import" class="btn btn-sm btn-info mt-2">Retourner à l'importation</a>
                            </div>
                        <?php endif; ?>
                    </form>
                </div>
            </div>
        </div>
    </div>
</div>

<!-- Modal de progression d'importation -->
<div class="modal fade" id="importProgressModal" data-bs-backdrop="static" data-bs-keyboard="false" tabindex="-1" aria-labelledby="importProgressModalLabel" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered modal-lg">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title" id="importProgressModalLabel">Importation en cours</h5>
            </div>
            <div class="modal-body">
                <div class="text-center mb-4">
                    <div class="progress-message fs-5 mb-3">Préparation des données...</div>
                    <div class="mb-3 progress-visual">
                        <div class="progress" style="height: 24px;">
                            <div class="progress-bar progress-bar-striped progress-bar-animated" role="progressbar" style="width: 0%;" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100">0%</div>
                        </div>
                    </div>
                    <div class="small progress-details text-muted">
                        <strong><span class="processed-count">0</span></strong> / <strong><span class="total-count"><?= count($data) ?></span></strong> lignes traitées
                    </div>
                </div>
                
                <div class="import-stats d-none">
                    <h6 class="border-bottom pb-2 mb-3">Statistiques d'importation</h6>
                    <div class="row text-center">
                        <div class="col-6 col-md-3 mb-2">
                            <div class="stats-imported fw-bold text-success fs-4">0</div>
                            <div class="small text-muted">Importées</div>
                        </div>
                        <div class="col-6 col-md-3 mb-2">
                            <div class="stats-duplicates fw-bold text-warning fs-4">0</div>
                            <div class="small text-muted">Doublons</div>
                        </div>
                        <div class="col-6 col-md-3 mb-2">
                            <div class="stats-errors fw-bold text-danger fs-4">0</div>
                            <div class="small text-muted">Erreurs</div>
                        </div>
                        <div class="col-6 col-md-3 mb-2">
                            <div class="stats-total fw-bold text-primary fs-4">0</div>
                            <div class="small text-muted">Total</div>
                        </div>
                    </div>
                </div>
                
                <div class="import-error d-none alert alert-danger mt-3">
                    <i class="fas fa-exclamation-circle me-2"></i>
                    <span class="error-message"></span>
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary cancel-import d-none">Annuler</button>
                <a href="/import" class="btn btn-success view-results d-none">Retour à l'importation</a>
            </div>
        </div>
    </div>
</div>

<style>
    .corrected-value {
        position: relative;
    }
    .original-value {
        text-decoration: line-through;
        color: #dc3545;
    }
    .suggestion {
        margin-top: 5px;
        font-weight: 500;
    }
    
    /* Styles pour DataTables */
    div.dataTables_wrapper div.dataTables_filter {
        text-align: right;
        margin-bottom: 10px;
    }
    div.dataTables_wrapper div.dataTables_length {
        text-align: left;
        margin-bottom: 10px;
    }
    div.dataTables_wrapper div.dataTables_info {
        padding-top: 0.85em;
    }
    div.dataTables_wrapper div.dataTables_paginate {
        margin-top: 0.5em;
    }
</style>

<script>
document.addEventListener('DOMContentLoaded', function() {
    // Initialisation de DataTables
    $('#validation-table').DataTable({
        "pageLength": 25,
        "lengthMenu": [[10, 25, 50, 100, -1], [10, 25, 50, 100, "Tout"]],
        "language": {
            "url": "//cdn.datatables.net/plug-ins/1.10.24/i18n/French.json"
        },
        "order": [[ 0, "asc" ]],
        "columnDefs": [
            { "orderable": false, "targets": -1 } // Désactiver le tri sur la dernière colonne (validation)
        ],
        "responsive": true
    });
    
    // Gestion des cases à cocher pour les corrections
    const applyAllCheckbox = document.getElementById('apply-all-corrections');
    const correctionCheckboxes = document.querySelectorAll('.correction-checkbox');
    
    if (applyAllCheckbox) {
        applyAllCheckbox.addEventListener('change', function() {
            correctionCheckboxes.forEach(checkbox => {
                checkbox.checked = this.checked;
            });
        });
    }
    
    // Gestion de l'importation avec suivi de progression
    const startImportBtn = document.getElementById('start-import-btn');
    const importForm = document.getElementById('validation-form');
    const progressModal = new bootstrap.Modal(document.getElementById('importProgressModal'), {
        backdrop: 'static',
        keyboard: false
    });
    
    if (startImportBtn) {
        startImportBtn.addEventListener('click', function() {
            // Afficher le modal de progression
            progressModal.show();
            
            // Récupérer les données du formulaire
            const formData = new FormData(importForm);
            
            // Soumettre le formulaire en AJAX en utilisant le script de remplacement
            fetch('/fix_import.php', {
                method: 'POST',
                body: formData,
                headers: {
                    'X-Requested-With': 'XMLHttpRequest'
                }
            })
            .then(response => {
                // Vérifier si la réponse est OK
                if (!response.ok) {
                    throw new Error(`Erreur HTTP ${response.status}: ${response.statusText}`);
                }
                
                // Essayer de lire la réponse comme JSON
                return response.text().then(text => {
                    try {
                        console.log("Contenu brut de la réponse:", text);
                        // Vérifier si la réponse commence par des caractères qui ne sont pas JSON
                        // comme <!DOCTYPE ou <html>
                        const trimmedText = text.trim();
                        if (trimmedText.startsWith('<')) {
                            throw new Error("La réponse commence par du HTML");
                        }
                        return JSON.parse(text);
                    } catch (e) {
                        console.error('Erreur de parsing JSON:', e);
                        console.error('Contenu de la réponse:', text);
                        throw new Error('La réponse du serveur n\'est pas un JSON valide: ' + e.message);
                    }
                });
            })
            .then(data => {
                if (data.success) {
                    // L'importation a été initiée avec succès, commencer à vérifier la progression
                    checkImportProgress();
                } else {
                    // Afficher l'erreur
                    document.querySelector('.import-error').classList.remove('d-none');
                    document.querySelector('.error-message').textContent = "Erreur: " + (data.error || "Une erreur inconnue s'est produite") + ". Veuillez réessayer.";
                    document.querySelector('.cancel-import').classList.remove('d-none');
                }
            })
            .catch(error => {
                console.error('Erreur lors de la soumission du formulaire:', error);
                document.querySelector('.import-error').classList.remove('d-none');
                document.querySelector('.error-message').textContent = "Erreur: " + error.message + ". Veuillez réessayer.";
                document.querySelector('.cancel-import').classList.remove('d-none');
            });
        });
    }
    
    // Fonction pour vérifier la progression de l'importation
    function checkImportProgress() {
        fetch('/fix_import.php?check_progress=1')
            .then(response => response.json())
            .then(data => {
                // Mettre à jour la barre de progression
                const progressBar = document.querySelector('.progress-bar');
                const progress = Math.round(data.progress);
                progressBar.style.width = progress + '%';
                progressBar.setAttribute('aria-valuenow', progress);
                progressBar.textContent = progress + '%';
                
                // Mettre à jour le message
                document.querySelector('.progress-message').textContent = data.message || 'Importation en cours...';
                
                // Mettre à jour les statistiques si disponibles
                if (data.stats) {
                    document.querySelector('.import-stats').classList.remove('d-none');
                    document.querySelector('.stats-imported').textContent = data.stats.imported;
                    document.querySelector('.stats-duplicates').textContent = data.stats.duplicates;
                    document.querySelector('.stats-errors').textContent = data.stats.errors;
                    document.querySelector('.stats-total').textContent = data.stats.total;
                    
                    // Mettre à jour le compteur de lignes traitées
                    const processedCount = data.stats.imported + data.stats.duplicates + data.stats.errors;
                    document.querySelector('.processed-count').textContent = processedCount;
                }
                
                // Vérifier si l'importation est terminée
                if (data.status === 'completed') {
                    // Afficher le bouton pour voir les résultats
                    document.querySelector('.view-results').classList.remove('d-none');
                    document.querySelector('.progress-bar').classList.remove('progress-bar-animated');
                    document.querySelector('.progress-bar').classList.add('bg-success');
                    
                    // Changer le titre du modal
                    document.getElementById('importProgressModalLabel').textContent = 'Importation terminée avec succès';
                    
                    // Mettre à jour le texte et le lien du bouton de résultats
                    document.querySelector('.view-results').textContent = 'Retour à l\'importation';
                    document.querySelector('.view-results').href = '/import';
                } else if (data.status === 'error') {
                    // Afficher l'erreur
                    document.querySelector('.import-error').classList.remove('d-none');
                    document.querySelector('.error-message').textContent = "Erreur: " + data.message + ". Veuillez réessayer.";
                    document.querySelector('.cancel-import').classList.remove('d-none');
                    document.querySelector('.progress-bar').classList.add('bg-danger');
                } else {
                    // Continuer à vérifier la progression
                    setTimeout(checkImportProgress, 1000);
                }
            })
            .catch(error => {
                console.error('Erreur lors de la vérification de la progression:', error);
                setTimeout(checkImportProgress, 3000); // Réessayer après un délai plus long en cas d'erreur
            });
    }
    
    // Gérer le bouton d'annulation
    document.querySelector('.cancel-import').addEventListener('click', function() {
        progressModal.hide();
    });
});
</script>

<?php
// Récupérer le contenu généré
$content = ob_get_clean();

// Inclure le layout avec le contenu
require_once __DIR__ . '/../layouts/app.php';
?> 