<?php
// Définir les variables de page
$pageTitle = 'Historique des Importations';
$currentPage = 'import';

// Commencer la capture du contenu
ob_start();
?>

<div class="container-fluid py-3">
    <div class="row mb-3">
        <div class="col">
            <h1 class="h3 mb-0">Historique des importations</h1>
        </div>
        <div class="col text-end">
            <a href="/import" class="btn btn-secondary">
                <i class="fas fa-arrow-left"></i> Retour à l'importation
            </a>
        </div>
    </div>
    
    <!-- Formulaire de filtrage par date -->
    <div class="card mb-4 shadow-sm">
        <div class="card-header bg-light">
            <h5 class="card-title mb-0">Filtrer par date</h5>
        </div>
        <div class="card-body">
            <form method="get" action="/import/history" class="row g-3 align-items-end">
                <div class="col-md-4">
                    <label for="start_date" class="form-label">Date de début</label>
                    <input type="date" class="form-control" id="start_date" name="start_date" value="<?= htmlspecialchars($start_date) ?>">
                </div>
                <div class="col-md-4">
                    <label for="end_date" class="form-label">Date de fin</label>
                    <input type="date" class="form-control" id="end_date" name="end_date" value="<?= htmlspecialchars($end_date) ?>">
                </div>
                <div class="col-md-4">
                    <button type="submit" class="btn btn-primary w-100">
                        <i class="fas fa-filter"></i> Filtrer
                    </button>
                </div>
            </form>
        </div>
    </div>
    
    <!-- Liste des importations -->
    <div class="card shadow-sm">
        <div class="card-header bg-white">
            <h5 class="card-title mb-0">Liste des importations récentes</h5>
        </div>
        <div class="card-body p-0">
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
                    <tbody>
                        <?php if (empty($history)): ?>
                            <tr>
                                <td colspan="8" class="text-center py-5">
                                    <div class="text-muted">
                                        <i class="fas fa-info-circle me-2"></i>
                                        Aucun historique d'importation disponible pour cette période.
                                    </div>
                                </td>
                            </tr>
                        <?php else: ?>
                            <?php foreach ($history as $entry): ?>
                                <tr>
                                    <td><?= htmlspecialchars(date('d/m/Y H:i', strtotime($entry->import_date))) ?></td>
                                    <td class="text-truncate" style="max-width: 200px;" title="<?= htmlspecialchars($entry->filename) ?>">
                                        <i class="fas fa-file-csv me-1 text-primary"></i>
                                        <?= htmlspecialchars($entry->filename) ?>
                                    </td>
                                    <td><?= htmlspecialchars($entry->username) ?></td>
                                    <td class="text-center"><?= number_format($entry->total_records) ?></td>
                                    <td class="text-center text-success"><?= number_format($entry->imported_records) ?></td>
                                    <td class="text-center text-warning"><?= number_format($entry->duplicate_records) ?></td>
                                    <td class="text-center text-danger"><?= number_format($entry->error_records) ?></td>
                                    <td class="text-center">
                                        <div class="progress" style="height: 6px; width: 80px;">
                                            <div class="progress-bar bg-<?= $entry->success_rate > 90 ? 'success' : ($entry->success_rate > 70 ? 'warning' : 'danger') ?>" 
                                                 style="width: <?= $entry->success_rate ?>%" 
                                                 title="<?= $entry->success_rate ?>%">
                                            </div>
                                        </div>
                                        <span class="small"><?= $entry->success_rate ?>%</span>
                                    </td>
                                </tr>
                            <?php endforeach; ?>
                        <?php endif; ?>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
</div>

<?php
// Récupérer le contenu généré
$content = ob_get_clean();

// Inclure le layout avec le contenu
require_once __DIR__ . '/../layouts/app.php';
?> 