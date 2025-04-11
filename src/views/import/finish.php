<?php
// Récupérer le titre de la page et la page courante pour le menu
$pageTitle = "Finalisation de l'importation";
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
                <h1 class="h2">Finalisation de l'importation</h1>
            </div>
            
            <div class="alert alert-success">
                <h4>Importation terminée avec succès</h4>
                <p>Votre fichier a été traité. Voici un résumé des résultats.</p>
            </div>
            
            <div class="row mb-4">
                <div class="col-md-6">
                    <div class="card">
                        <div class="card-header bg-primary text-white">
                            <h5 class="card-title mb-0">Statistiques d'importation</h5>
                        </div>
                        <div class="card-body">
                            <table class="table">
                                <tbody>
                                    <tr>
                                        <th scope="row">Enregistrements traités</th>
                                        <td><?= number_format($stats['total']) ?></td>
                                    </tr>
                                    <tr>
                                        <th scope="row">Enregistrements importés</th>
                                        <td><?= number_format($stats['imported']) ?></td>
                                    </tr>
                                    <tr>
                                        <th scope="row">Doublons ignorés</th>
                                        <td><?= number_format($stats['duplicates']) ?></td>
                                    </tr>
                                    <tr>
                                        <th scope="row">Erreurs</th>
                                        <td><?= number_format($stats['errors']) ?></td>
                                    </tr>
                                    <tr>
                                        <th scope="row">Taux de réussite</th>
                                        <td><?= number_format(($stats['imported'] / $stats['total']) * 100, 1) ?>%</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
                
                <div class="col-md-6">
                    <div class="card">
                        <div class="card-header bg-info text-white">
                            <h5 class="card-title mb-0">Actions disponibles</h5>
                        </div>
                        <div class="card-body">
                            <div class="d-grid gap-3">
                                <?php if ($stats['duplicates'] > 0 && isset($stats['history_id'])): ?>
                                    <a href="/import/export-duplicates?id=<?= $stats['history_id'] ?>" class="btn btn-warning">
                                        <i class="bi bi-download"></i> Télécharger les doublons (<?= $stats['duplicates'] ?>)
                                    </a>
                                <?php endif; ?>
                                
                                <?php if (isset($stats['history_id'])): ?>
                                    <a href="/import/history" class="btn btn-info">
                                        <i class="bi bi-clock-history"></i> Voir l'historique d'importation
                                    </a>
                                <?php endif; ?>
                                
                                <form action="/import/finish" method="post">
                                    <button type="submit" class="btn btn-success btn-lg w-100">
                                        <i class="bi bi-check-circle"></i> Terminer le processus
                                    </button>
                                </form>
                                
                                <a href="/import" class="btn btn-outline-secondary">
                                    <i class="bi bi-arrow-repeat"></i> Nouvelle importation
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <?php if ($stats['errors'] > 0): ?>
                <div class="alert alert-warning">
                    <h5><i class="bi bi-exclamation-triangle"></i> Attention</h5>
                    <p>Certains enregistrements n'ont pas pu être importés en raison d'erreurs. Vous pouvez consulter le journal d'importation pour plus de détails.</p>
                </div>
            <?php endif; ?>
            
        </main>
    </div>
</div>

<?php
// Inclure le pied de page
include __DIR__ . '/../../templates/footer.php';
?>
