<?php
/**
 * Page de confirmation d'importation
 */

// Récupérer le titre de la page et la page courante pour le menu
$pageTitle = "Confirmation d'importation";
$currentPage = "import";

// Récupérer les statistiques d'importation
$stats = $_SESSION['import_stats'] ?? null;

// Si pas de stats, rediriger
if (!$stats) {
    header('Location: /import');
    exit;
}

// Inclure l'en-tête
include __DIR__ . '/../../templates/header.php';
?>

<div class="container-fluid">
    <div class="row">
        <!-- Inclure la sidebar -->
        <?php include __DIR__ . '/../../templates/sidebar.php'; ?>
        
        <!-- Contenu principal -->
        <main class="col-md-9 ms-sm-auto col-lg-10 px-md-4">
            <div class="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
                <h1 class="h2">Confirmation d'importation</h1>
            </div>
            
            <div class="card mb-4 shadow-sm">
                <div class="card-header">
                    <h4 class="my-0 font-weight-normal">Résumé de l'importation</h4>
                </div>
                <div class="card-body">
                    <div class="alert alert-info">
                        <p>Les données ont été analysées et sont prêtes à être importées. Veuillez vérifier les informations ci-dessous et confirmer l'importation.</p>
                    </div>
                    
                    <div class="row">
                        <div class="col-md-6">
                            <h5>Statistiques</h5>
                            <ul class="list-group mb-3">
                                <li class="list-group-item d-flex justify-content-between align-items-center">
                                    Lignes traitées
                                    <span class="badge bg-primary rounded-pill"><?= number_format($stats['total']) ?></span>
                                </li>
                                <li class="list-group-item d-flex justify-content-between align-items-center">
                                    Lignes valides
                                    <span class="badge bg-success rounded-pill"><?= number_format($stats['imported']) ?></span>
                                </li>
                                <li class="list-group-item d-flex justify-content-between align-items-center">
                                    Doublons détectés
                                    <span class="badge bg-warning rounded-pill"><?= number_format($stats['duplicates']) ?></span>
                                </li>
                                <li class="list-group-item d-flex justify-content-between align-items-center">
                                    Erreurs
                                    <span class="badge bg-danger rounded-pill"><?= number_format($stats['errors']) ?></span>
                                </li>
                            </ul>
                        </div>
                        
                        <div class="col-md-6">
                            <h5>Validation</h5>
                            <?php if ($stats['errors'] > 0): ?>
                                <div class="alert alert-warning">
                                    <p><strong>Attention :</strong> <?= $stats['errors'] ?> ligne(s) contiennent des erreurs et ne seront pas importées.</p>
                                </div>
                            <?php else: ?>
                                <div class="alert alert-success">
                                    <p><strong>Excellent !</strong> Toutes les lignes sont valides.</p>
                                </div>
                            <?php endif; ?>
                            
                            <?php if ($stats['duplicates'] > 0): ?>
                                <div class="alert alert-info">
                                    <p><strong>Information :</strong> <?= $stats['duplicates'] ?> ligne(s) sont des doublons et seront ignorées.</p>
                                </div>
                            <?php endif; ?>
                        </div>
                    </div>
                    
                    <div class="row mt-4">
                        <div class="col-12">
                            <div class="d-grid gap-2 d-sm-flex justify-content-sm-center">
                                <a href="/import" class="btn btn-outline-secondary btn-lg px-4">Annuler</a>
                                <a href="/import/finish" class="btn btn-primary btn-lg px-4">Continuer</a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    </div>
</div>

<?php
// Inclure le pied de page
include __DIR__ . '/../../templates/footer.php';
?> 