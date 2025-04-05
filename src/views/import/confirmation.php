<?php
/**
 * Page de confirmation d'importation
 */
?>

<div class="container-fluid py-4">
    <div class="row mb-4">
        <div class="col-12">
            <div class="card">
                <div class="card-header bg-success text-white d-flex align-items-center">
                    <i class="fas fa-check-circle me-2"></i>
                    <h5 class="mb-0">Importation terminée</h5>
                </div>
                <div class="card-body">
                    <?php if ($stats['imported'] > 0): ?>
                    <div class="alert alert-success mb-4 py-2">
                        <div class="d-flex align-items-center">
                            <i class="fas fa-info-circle me-2 fs-5"></i>
                            <p class="mb-0">
                                <strong><?= $stats['imported'] ?> enregistrement(s)</strong> importé(s) avec succès.
                            </p>
                        </div>
                    </div>
                    <?php else: ?>
                    <div class="alert alert-warning mb-4 py-2">
                        <div class="d-flex align-items-center">
                            <i class="fas fa-exclamation-circle me-2 fs-5"></i>
                            <p class="mb-0">
                                <strong>Aucune donnée n'a été importée.</strong> Toutes les lignes étaient soit des doublons, soit comportaient des erreurs.
                            </p>
                        </div>
                    </div>
                    <?php endif; ?>
                    
                    <div class="row mb-4">
                        <div class="col-md-3">
                            <div class="card bg-light border-0 shadow-sm">
                                <div class="card-body text-center py-3">
                                    <h5 class="card-title text-muted">Total</h5>
                                    <h2 class="text-primary mb-1"><?= $stats['total'] ?></h2>
                                    <p class="card-text text-muted small">Lignes traitées</p>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="card bg-light border-0 shadow-sm">
                                <div class="card-body text-center py-3">
                                    <h5 class="card-title text-muted">Importées</h5>
                                    <h2 class="text-success mb-1"><?= $stats['imported'] ?></h2>
                                    <p class="card-text text-muted small">Nouvelles lignes</p>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="card bg-light border-0 shadow-sm">
                                <div class="card-body text-center py-3">
                                    <h5 class="card-title text-muted">Doublons</h5>
                                    <h2 class="text-warning mb-1"><?= $stats['duplicates'] ?></h2>
                                    <p class="card-text text-muted small">Lignes ignorées</p>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="card bg-light border-0 shadow-sm">
                                <div class="card-body text-center py-3">
                                    <h5 class="card-title text-muted">Erreurs</h5>
                                    <h2 class="text-danger mb-1"><?= $stats['errors'] ?></h2>
                                    <p class="card-text text-muted small">Lignes en erreur</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="row">
                        <div class="col-md-12">
                            <?php if ($stats['duplicates'] > 0): ?>
                            <div class="alert alert-info py-2 mb-2">
                                <div class="d-flex align-items-center">
                                    <i class="fas fa-info-circle me-2"></i>
                                    <span><strong><?= $stats['duplicates'] ?> doublon(s)</strong> : des lignes déjà présentes dans la base ont été ignorées.</span>
                                </div>
                            </div>
                            <?php endif; ?>
                            
                            <?php if ($stats['errors'] > 0): ?>
                            <div class="alert alert-warning py-2 mb-2">
                                <div class="d-flex align-items-center">
                                    <i class="fas fa-exclamation-triangle me-2"></i>
                                    <span><strong><?= $stats['errors'] ?> erreur(s)</strong> : certaines lignes n'ont pas pu être importées. Consultez les logs pour plus de détails.</span>
                                </div>
                            </div>
                            <?php endif; ?>
                        </div>
                    </div>
                    
                    <div class="text-center mt-4">
                        <a href="/import/finish" class="btn btn-primary">
                            <i class="fas fa-check me-2"></i>Terminer
                        </a>
                        <a href="/dashboard" class="btn btn-outline-secondary ms-2">
                            <i class="fas fa-tachometer-alt me-2"></i>Tableau de bord
                        </a>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div> 